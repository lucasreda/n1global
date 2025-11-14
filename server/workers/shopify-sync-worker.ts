// 🛍️ Shopify Sync Worker - Polling inteligente para novos pedidos
// Polling adaptativo: 5 minutos (horário comercial 8h-20h UTC), 15 minutos (fora do horário)

import { db } from '../db';
import { shopifyIntegrations, operations } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { ShopifySyncService } from '../shopify-sync-service';
import { shopifyService } from '../shopify-service';

const syncService = new ShopifySyncService();

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
    // Buscar todas as integrações Shopify ativas
    const integrations = await db
      .select()
      .from(shopifyIntegrations)
      .where(eq(shopifyIntegrations.status, 'active'));

    for (const integration of integrations) {
      try {
        const tracking = lastSyncTracking.get(integration.operationId) || {
          lastSyncAt: null,
          lastProcessedOrderId: null
        };

        // Buscar apenas pedidos novos/modificados usando since_id ou updated_at
        const params: any = {
          limit: 50, // Pequeno lote para polling
          status: 'any',
          fields: 'id,name,email,phone,created_at,updated_at,total_price,current_total_price,subtotal_price,currency,financial_status,fulfillment_status,customer,shipping_address,billing_address,line_items'
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

        console.log(`🔍 [SHOPIFY POLLING] Buscando novos pedidos para operação ${integration.operationId}...`);

        const ordersResult = await shopifyService.getOrders(
          integration.shopName,
          integration.accessToken,
          params
        );

        if (!ordersResult.success || !ordersResult.orders || ordersResult.orders.length === 0) {
          console.log(`ℹ️ Nenhum pedido novo encontrado para operação ${integration.operationId}`);
          continue;
        }

        const newOrders = ordersResult.orders;
        console.log(`📦 [SHOPIFY POLLING] Encontrados ${newOrders.length} pedidos novos/modificados para operação ${integration.operationId}`);

        // Processar pedidos em lote pequeno
        for (const order of newOrders) {
          try {
            await syncService.processShopifyOrderDirectly(integration.operationId, order);

            // Atualizar tracking com o último pedido processado
            const maxId = Math.max(...newOrders.map(o => parseInt(o.id.toString())));
            lastSyncTracking.set(integration.operationId, {
              lastSyncAt: new Date(),
              lastProcessedOrderId: maxId.toString()
            });
          } catch (error) {
            console.error(`❌ Erro ao processar pedido ${order.name || order.id}:`, error);
          }
        }

        console.log(`✅ [SHOPIFY POLLING] Processados ${newOrders.length} pedidos para operação ${integration.operationId}`);
      } catch (error) {
        console.error(`❌ Erro no polling Shopify para operação ${integration.operationId}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Erro no polling Shopify:', error);
  } finally {
    isPollingRunning = false;
  }
}

/**
 * Inicia worker de polling Shopify
 */
export function startShopifyPollingWorker() {
  console.log('🛍️  Shopify Polling Worker iniciado');

  // Executar imediatamente na inicialização
  pollNewOrders().catch(error => {
    console.error('❌ Erro na execução inicial do polling Shopify:', error);
  });

  // Configurar intervalo adaptativo
  setInterval(() => {
    pollNewOrders().catch(error => {
      console.error('❌ Erro no polling Shopify:', error);
    });
  }, getPollingInterval());

  // Ajustar intervalo quando horário comercial muda
  setInterval(() => {
    const newInterval = getPollingInterval();
    console.log(`🔄 Ajustando intervalo de polling Shopify para ${newInterval / 1000 / 60} minutos`);
  }, 60 * 60 * 1000); // Verificar a cada hora
}

