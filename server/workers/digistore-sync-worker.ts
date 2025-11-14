// 🛒 Digistore24 Sync Worker - Polling inteligente para novos pedidos
// Polling adaptativo: 5 minutos (horário comercial 8h-20h UTC), 15 minutos (fora do horário)

import { db } from '../db';
import { digistoreIntegrations, operations, orders } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { DigistoreService } from '../digistore-service';

// Helper function to map Digistore24 delivery status to our order status
function mapDigistoreStatus(deliveryType: string): string {
  switch (deliveryType) {
    case 'request': return 'pending';
    case 'in_progress': return 'confirmed';
    case 'delivery': return 'shipped';
    case 'partial_delivery': return 'shipped';
    case 'return': return 'returned';
    case 'cancel': return 'cancelled';
    default: return 'pending';
  }
}

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

        // Buscar operação para pegar storeId
        const [operation] = await db
          .select()
          .from(operations)
          .where(eq(operations.id, integration.operationId))
          .limit(1);

        if (!operation) {
          console.error(`❌ [DIGISTORE POLLING] Operação não encontrada: ${integration.operationId}`);
          continue;
        }

        // Criar pedidos diretamente na tabela orders
        let created = 0;
        let updated = 0;

        for (const delivery of deliveries) {
          try {
            // Usar delivery_id como identificador principal
            const deliveryId = delivery.id?.toString() || delivery.delivery_id?.toString();
            const purchaseId = delivery.purchase_id;

            if (!deliveryId || !purchaseId) {
              console.warn(`⚠️ [DIGISTORE POLLING] Entrega sem ID válido, pulando:`, delivery);
              continue;
            }

            // Verificar se já existe
            const [existingOrder] = await db
              .select()
              .from(orders)
              .where(eq(orders.digistoreOrderId, deliveryId))
              .limit(1);

            // Extrair dados do endereço de entrega
            const deliveryAddress = delivery.delivery_address || {};
            const recipientName = `${deliveryAddress.first_name || ''} ${deliveryAddress.last_name || ''}`.trim();

            if (existingOrder) {
              // Atualizar pedido existente
              await db.update(orders)
                .set({
                  status: mapDigistoreStatus(delivery.delivery_type),
                  trackingNumber: delivery.tracking?.[0]?.tracking_id || null,
                  providerData: delivery,
                  updatedAt: new Date()
                })
                .where(eq(orders.id, existingOrder.id));
              updated++;
              console.log(`✅ [DIGISTORE POLLING] Pedido ${existingOrder.id} atualizado`);
            } else {
              // Criar novo pedido
                const newOrderId = deliveryId;
              await db.insert(orders).values({
                id: newOrderId,
                storeId: operation.storeId,
                operationId: integration.operationId,
                dataSource: 'digistore24',
                digistoreOrderId: deliveryId,
                digistoreTransactionId: purchaseId,
                
                // Dados do cliente
                customerName: recipientName || 'N/A',
                customerEmail: deliveryAddress.email || '',
                customerPhone: deliveryAddress.phone_no || '',
                customerAddress: `${deliveryAddress.street || ''} ${deliveryAddress.street_number || ''}`.trim(),
                customerCity: deliveryAddress.city || '',
                customerState: deliveryAddress.state || '',
                customerCountry: deliveryAddress.country || '',
                customerZip: deliveryAddress.zipcode || '',
                
                // Status
                status: mapDigistoreStatus(delivery.delivery_type),
                paymentStatus: 'paid', // Digistore24 só envia pedidos pagos
                
                // Financeiro
                total: '0', // Digistore24 não retorna valor em listDeliveries
                currency: 'EUR',
                
                // Provider
                provider: 'digistore24',
                trackingNumber: delivery.tracking?.[0]?.tracking_id || null,
                
                // Metadata
                providerData: delivery,
                orderDate: new Date(delivery.purchase_created_at || Date.now()),
                
                needsSync: false, // Já está sincronizado
                carrierImported: false,
              });
              created++;
              console.log(`✅ [DIGISTORE POLLING] Pedido ${newOrderId} criado`);
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

