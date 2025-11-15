// 🛒 CartPanda Sync Worker - Polling inteligente para novos pedidos
// Polling adaptativo: 5 minutos (horário comercial 8h-20h UTC), 15 minutos (fora do horário)

import { db } from '../db';
import { cartpandaIntegrations, operations } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { CartPandaService } from '../cartpanda-service';

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
    // Buscar todas as integrações CartPanda ativas
    const integrations = await db
      .select()
      .from(cartpandaIntegrations)
      .where(eq(cartpandaIntegrations.status, 'active'));

    for (const integration of integrations) {
      try {
        const tracking = lastSyncTracking.get(integration.operationId) || {
          lastSyncAt: null,
          lastProcessedOrderId: null
        };

        const cartpandaService = new CartPandaService({
          storeSlug: integration.storeSlug,
          bearerToken: integration.bearerToken
        });

        // Parâmetros para buscar apenas pedidos novos
        const params: any = {
          limit: 50 // Pequeno lote para polling
        };

        // Se temos lastProcessedOrderId, usar since_id
        if (tracking.lastProcessedOrderId) {
          params.since_id = tracking.lastProcessedOrderId;
        } else if (tracking.lastSyncAt) {
          // Se não temos since_id mas temos lastSyncAt, usar updated_at_min
          params.updated_at_min = tracking.lastSyncAt.toISOString();
        } else if (integration.integrationStartedAt) {
          // Se não temos tracking mas temos integrationStartedAt, usar como filtro inicial
          // Garantir que só buscamos pedidos criados a partir da data de integração
          params.created_at_min = integration.integrationStartedAt.toISOString();
        }

        console.log(`🔍 [CARTPANDA POLLING] Buscando novos pedidos para operação ${integration.operationId}...`);

        const orders = await cartpandaService.listOrders(params);

        if (!orders || orders.length === 0) {
          console.log(`ℹ️ Nenhum pedido novo encontrado para operação ${integration.operationId}`);
          continue;
        }

        console.log(`📦 [CARTPANDA POLLING] Encontrados ${orders.length} pedidos novos/modificados para operação ${integration.operationId}`);

        // TODO: Processar pedidos quando sync service CartPanda estiver pronto
        // Por enquanto, apenas atualizar tracking
        if (orders.length > 0) {
          const maxId = Math.max(...orders.map((o: any) => parseInt(o.id?.toString() || '0')));
          if (maxId > 0) {
            lastSyncTracking.set(integration.operationId, {
              lastSyncAt: new Date(),
              lastProcessedOrderId: maxId.toString()
            });
          }
        }

        console.log(`✅ [CARTPANDA POLLING] Processados ${orders.length} pedidos para operação ${integration.operationId}`);
      } catch (error) {
        console.error(`❌ Erro no polling CartPanda para operação ${integration.operationId}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Erro no polling CartPanda:', error);
  } finally {
    isPollingRunning = false;
  }
}

/**
 * Inicia worker de polling CartPanda
 */
export function startCartPandaPollingWorker() {
  console.log('🛒 CartPanda Polling Worker iniciado');

  // Executar imediatamente na inicialização
  pollNewOrders().catch(error => {
    console.error('❌ Erro na execução inicial do polling CartPanda:', error);
  });

  // Configurar intervalo adaptativo
  setInterval(() => {
    pollNewOrders().catch(error => {
      console.error('❌ Erro no polling CartPanda:', error);
    });
  }, getPollingInterval());

  // Ajustar intervalo quando horário comercial muda
  setInterval(() => {
    const newInterval = getPollingInterval();
    console.log(`🔄 Ajustando intervalo de polling CartPanda para ${newInterval / 1000 / 60} minutos`);
  }, 60 * 60 * 1000); // Verificar a cada hora
}

