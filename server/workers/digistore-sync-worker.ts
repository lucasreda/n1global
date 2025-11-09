// 🛒 Digistore24 Sync Worker - Polling inteligente para novos pedidos
// Polling adaptativo: 5 minutos (horário comercial 8h-20h UTC), 15 minutos (fora do horário)

import { db } from '../db';
import { digistoreIntegrations, operations } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { DigistoreService } from '../digistore-service';

// Tracking de última sincronização por operação
const lastSyncTracking = new Map<string, {
  lastSyncAt: Date | null;
  lastProcessedOrderId: string | null;
}>();

// Reentrancy guard
let isPollingRunning = false;

/**
 * Verifica se está em horário comercial (8h-20h UTC)
 */
function isBusinessHours(): boolean {
  const now = new Date();
  const hour = now.getUTCHours();
  return hour >= 8 && hour < 20;
}

/**
 * Obtém intervalo de polling baseado no horário
 */
function getPollingInterval(): number {
  return isBusinessHours() ? 5 * 60 * 1000 : 15 * 60 * 1000; // 5 min ou 15 min
}

/**
 * Polling inteligente: busca apenas pedidos novos/modificados
 */
async function pollNewOrders() {
  if (isPollingRunning) {
    return;
  }

  isPollingRunning = true;

  try {
    // Buscar todas as integrações Digistore24 ativas
    const integrations = await db
      .select()
      .from(digistoreIntegrations)
      .where(eq(digistoreIntegrations.status, 'active'));

    for (const integration of integrations) {
      try {
        const tracking = lastSyncTracking.get(integration.operationId) || {
          lastSyncAt: null,
          lastProcessedOrderId: null
        };

        const digistoreService = new DigistoreService({
          apiKey: integration.apiKey
        });

        // Parâmetros para buscar entregas pendentes
        const params: any = {
          type: 'request,in_progress', // Apenas entregas pendentes
        };

        // Se temos lastSyncAt, usar from
        if (tracking.lastSyncAt) {
          const fromDate = new Date(tracking.lastSyncAt);
          params.from = fromDate.toISOString().split('T')[0]; // YYYY-MM-DD
        } else {
          // Se não temos tracking, buscar últimos 7 dias
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          params.from = sevenDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD
        }

        console.log(`🔍 [DIGISTORE POLLING] Buscando entregas pendentes para operação ${integration.operationId}...`);

        const deliveries = await digistoreService.listOrders(params);

        if (!deliveries || deliveries.length === 0) {
          console.log(`ℹ️ Nenhuma entrega pendente para operação ${integration.operationId}`);
          continue;
        }

        console.log(`📦 [DIGISTORE POLLING] Encontradas ${deliveries.length} entregas pendentes para operação ${integration.operationId}`);

        // Importar schema
        const { digistoreOrders: digistoreOrdersTable } = await import('@shared/schema');
        const { and } = await import('drizzle-orm');

        // Processar e salvar entregas na staging table
        let created = 0;
        let updated = 0;

        for (const delivery of deliveries) {
          try {
            // Usar delivery_id como identificador principal
            const deliveryId = delivery.id?.toString() || delivery.delivery_id?.toString();
            const purchaseId = delivery.purchase_id;

            if (!deliveryId || !purchaseId) {
              console.warn(`⚠️ Entrega sem ID válido, pulando:`, delivery);
              continue;
            }

            // Verificar se já existe
            const [existing] = await db
              .select()
              .from(digistoreOrdersTable)
              .where(
                and(
                  eq(digistoreOrdersTable.integrationId, integration.id),
                  eq(digistoreOrdersTable.orderId, deliveryId)
                )
              )
              .limit(1);

            // Extrair dados do endereço de entrega
            const deliveryAddress = delivery.delivery_address || {};
            const recipientName = `${deliveryAddress.first_name || ''} ${deliveryAddress.last_name || ''}`.trim();

            const orderData = {
              integrationId: integration.id,
              orderId: deliveryId, // delivery_id
              transactionId: purchaseId, // purchase_id
              status: delivery.delivery_type || 'request',
              tracking: delivery.tracking?.[0]?.tracking_id || null,
              value: '0', // Digistore24 não retorna valor em listDeliveries
              recipient: {
                name: recipientName || 'N/A',
                email: deliveryAddress.email || '',
                phone: deliveryAddress.phone_no || ''
              },
              items: [],
              rawData: delivery
            };

            if (existing) {
              await db.update(digistoreOrdersTable)
                .set({
                  ...orderData,
                  processedToOrders: false,
                  processedAt: null,
                  updatedAt: new Date()
                })
                .where(eq(digistoreOrdersTable.id, existing.id));
              updated++;
            } else {
              await db.insert(digistoreOrdersTable).values({
                ...orderData,
                processedToOrders: false
              });
              created++;
            }
          } catch (error) {
            console.error(`❌ Erro ao processar entrega:`, error);
          }
        }

        console.log(`✅ [DIGISTORE POLLING] ${created} novos, ${updated} atualizados para operação ${integration.operationId}`);

        if (deliveries.length > 0) {
          lastSyncTracking.set(integration.operationId, {
            lastSyncAt: new Date(),
            lastProcessedOrderId: deliveries[0].id?.toString() || deliveries[0].delivery_id?.toString() || null
          });
        }
      } catch (error) {
        console.error(`❌ Erro no polling Digistore24 para operação ${integration.operationId}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Erro geral no polling Digistore24:', error);
  } finally {
    isPollingRunning = false;
  }
}

/**
 * Inicia o worker de polling Digistore24
 */
export function startDigistoreSyncWorker() {
  console.log('🛍️  Digistore24 Polling Worker iniciado');
  
  // Executar primeira sincronização após 10 segundos
  setTimeout(() => {
    pollNewOrders();
  }, 10000);

  // Configurar polling recorrente com intervalo adaptativo
  setInterval(() => {
    pollNewOrders();
  }, getPollingInterval());
}

