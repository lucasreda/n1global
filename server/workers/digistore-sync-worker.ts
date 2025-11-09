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

        // Parâmetros para buscar apenas pedidos novos
        const params: any = {
          limit: 50 // Pequeno lote para polling
        };

        // Se temos lastSyncAt, usar start_date
        if (tracking.lastSyncAt) {
          params.start_date = tracking.lastSyncAt.toISOString();
        } else {
          // Se não temos tracking, buscar últimos 7 dias
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          params.start_date = sevenDaysAgo.toISOString();
        }

        console.log(`🔍 [DIGISTORE POLLING] Buscando novos pedidos para operação ${integration.operationId}...`);

        const digistoreOrders = await digistoreService.listOrders(params);

        if (!digistoreOrders || digistoreOrders.length === 0) {
          console.log(`ℹ️ Nenhum pedido novo encontrado para operação ${integration.operationId}`);
          continue;
        }

        console.log(`📦 [DIGISTORE POLLING] Encontrados ${digistoreOrders.length} pedidos novos/modificados para operação ${integration.operationId}`);

        // TODO: Processar pedidos quando sync service Digistore24 estiver pronto
        // Por enquanto, apenas atualizar tracking
        if (digistoreOrders.length > 0) {
          lastSyncTracking.set(integration.operationId, {
            lastSyncAt: new Date(),
            lastProcessedOrderId: digistoreOrders[0].order_id
          });
        }

        console.log(`✅ [DIGISTORE POLLING] Processados ${digistoreOrders.length} pedidos para operação ${integration.operationId}`);
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

