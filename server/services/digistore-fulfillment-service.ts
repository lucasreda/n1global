import { db } from '../db';
import { orders, digistoreIntegrations } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { DigistoreService } from '../digistore-service';

export class DigistoreFulfillmentService {
  /**
   * Atualiza status de entrega na Digistore24 quando pedido é enviado
   * Busca pedido diretamente na tabela orders pelo digistoreOrderId
   */
  async updateDeliveryStatus(
    orderId: string,
    status: 'shipped' | 'delivered' | 'cancelled',
    trackingNumber?: string,
    trackingUrl?: string,
    carrier?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Buscar pedido diretamente na tabela orders
      const [order] = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.dataSource, 'digistore24')
          )
        )
        .limit(1);

      if (!order || !order.digistoreOrderId) {
        console.log(`ℹ️ Pedido ${orderId} não é da Digistore24`);
        return { success: true }; // Não é erro, apenas não é Digistore24
      }

      // Buscar integração
      const [integration] = await db
        .select()
        .from(digistoreIntegrations)
        .where(eq(digistoreIntegrations.operationId, order.operationId!))
        .limit(1);

      if (!integration) {
        console.error(`❌ Integração Digistore24 não encontrada para operação ${order.operationId}`);
        return { success: false, error: 'Integração não encontrada' };
      }

      const digistoreService = new DigistoreService({
        apiKey: integration.apiKey
      });

      // Determinar delivery_id aceito pela API (inteiro)
      let deliveryIdForApi: string | null = null;

      const providerData = (order.providerData || {}) as Record<string, any>;
      const candidateIds = new Set<string>();

      [
        order.digistoreOrderId,
        order.digistoreTransactionId,
        providerData?.delivery_id,
        providerData?.id,
        providerData?.transaction_id,
        providerData?.purchase_id,
        providerData?.purchase_key,
        providerData?.order_id,
      ]
        .filter((value) => value !== undefined && value !== null)
        .forEach((value) => candidateIds.add(String(value)));

      for (const candidate of candidateIds) {
        if (/^\d+$/.test(candidate)) {
          deliveryIdForApi = candidate;
          break;
        }
      }

      // 3. Buscar lista de entregas para mapear ID
      if (!deliveryIdForApi) {
        console.log('🔍 [DIGISTORE TRACKING] Nenhum delivery_id numérico direto. Tentando mapear via listDeliveries...', {
          candidateIds: Array.from(candidateIds)
        });

        try {
          const searchVariants = [
            {
              order_id: order.digistoreOrderId || undefined,
              purchase_id: order.digistoreTransactionId || undefined,
            },
            {
              order_id: providerData?.order_id,
              purchase_id: providerData?.purchase_id,
              delivery_id: providerData?.delivery_id,
            },
            {
              type: 'all',
              order_id: order.digistoreOrderId || providerData?.order_id,
              purchase_id: order.digistoreTransactionId || providerData?.purchase_id,
              delivery_id: providerData?.delivery_id,
            },
            {
              type: 'all',
            },
          ];

          const allDeliveries: any[] = [];

          for (const variant of searchVariants) {
            const cleanedParams: Record<string, string> = {};
            Object.entries(variant).forEach(([key, value]) => {
              if (typeof value === 'string' && value.trim().length > 0) {
                cleanedParams[key] = value.trim();
              }
            });

            // Evitar chamadas sem parâmetros relevantes nas primeiras tentativas
            if (Object.keys(cleanedParams).length === 0 && variant !== searchVariants[searchVariants.length - 1]) {
              continue;
            }

            const deliveries = await digistoreService.listOrders({
              ...cleanedParams,
              type: cleanedParams.type || variant.type || 'request,in_progress,delivery,partial_delivery,cancel,return'
            });

            if (deliveries.length > 0) {
              allDeliveries.push(...deliveries);
              const matchingDelivery = deliveries.find((delivery: any) => {
                const deliveryIdStr = delivery.id?.toString() || delivery.delivery_id?.toString() || null;
                const purchaseIdStr = delivery.purchase_id?.toString() || delivery.transaction_id?.toString() || null;
                const orderIdStr = delivery.order_id || delivery.orderid || null;

                return (
                  (deliveryIdStr && candidateIds.has(deliveryIdStr)) ||
                  (purchaseIdStr && candidateIds.has(purchaseIdStr)) ||
                  (orderIdStr && candidateIds.has(orderIdStr))
                );
              });

              if (matchingDelivery) {
                deliveryIdForApi =
                  matchingDelivery.id?.toString() ||
                  matchingDelivery.delivery_id?.toString() ||
                  matchingDelivery.purchase_id?.toString() ||
                  null;
                console.log('✅ [DIGISTORE TRACKING] Delivery mapeado via listDeliveries', {
                  deliveryIdForApi,
                  matchingDelivery
                });
                break;
              }
            }
          }

          if (!deliveryIdForApi && allDeliveries.length > 0) {
            console.log('ℹ️ [DIGISTORE TRACKING] Nenhum delivery correspondente encontrado entre os resultados retornados.', {
              totalDeliveries: allDeliveries.length,
              candidates: Array.from(candidateIds),
            });
          }
        } catch (error) {
          console.warn('⚠️ Não foi possível mapear delivery_id automaticamente:', error);
        }
      }

      if (!deliveryIdForApi || !/^\d+$/.test(deliveryIdForApi)) {
        const errorMsg = `Não foi possível identificar delivery_id numérico para o pedido ${orderId}`;
        console.error(`❌ ${errorMsg}`, {
          candidateIds: Array.from(candidateIds)
        });
        return { success: false, error: errorMsg };
      }

      console.log(`📤 Atualizando entrega Digistore24: delivery_id=${deliveryIdForApi} -> ${status}`);

      const trackingInfo = trackingNumber ? {
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        carrier: carrier
      } : undefined;

      // Usar delivery_id para atualizar
      const result = await digistoreService.updateOrderStatus(
        deliveryIdForApi,
        status,
        trackingInfo
      );

      if (result.success) {
        // Atualizar tracking na tabela orders
        await db.update(orders)
          .set({
            trackingNumber: trackingNumber || null,
            updatedAt: new Date()
          })
          .where(eq(orders.id, orderId));
        
        console.log(`✅ Pedido ${orderId} atualizado com tracking`);
      }

      return result;
    } catch (error) {
      console.error(`❌ Erro ao atualizar Digistore24:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
}

export const digistoreFulfillmentService = new DigistoreFulfillmentService();

