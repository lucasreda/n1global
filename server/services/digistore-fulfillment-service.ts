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

      // 1. Tentar usar valor numérico direto do pedido
      if (order.digistoreOrderId && /^\d+$/.test(order.digistoreOrderId)) {
        deliveryIdForApi = order.digistoreOrderId;
      }

      // 2. Tentar usar transaction_id se for numérico
      if (!deliveryIdForApi && order.digistoreTransactionId && /^\d+$/.test(order.digistoreTransactionId)) {
        deliveryIdForApi = order.digistoreTransactionId;
      }

      // 3. Buscar lista de entregas para mapear ID
      if (!deliveryIdForApi) {
        try {
          const fromDate = order.orderDate
            ? new Date(Math.max(new Date(order.orderDate).getTime() - 7 * 24 * 60 * 60 * 1000, 0))
            : (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })();

          const deliveries = await digistoreService.listOrders({
            from: fromDate.toISOString().split('T')[0],
            type: 'request,in_progress,delivery'
          });

          const matchingDelivery = deliveries.find((delivery: any) => {
            const deliveryIdStr = delivery.id?.toString() || delivery.delivery_id?.toString() || null;
            return (
              deliveryIdStr === order.digistoreOrderId ||
              delivery.purchase_id?.toString() === order.digistoreTransactionId ||
              delivery.order_id === order.digistoreOrderId
            );
          });

          if (matchingDelivery) {
            deliveryIdForApi =
              matchingDelivery.id?.toString() ||
              matchingDelivery.delivery_id?.toString() ||
              matchingDelivery.purchase_id?.toString() ||
              null;
          }
        } catch (error) {
          console.warn('⚠️ Não foi possível mapear delivery_id automaticamente:', error);
        }
      }

      if (!deliveryIdForApi || !/^\d+$/.test(deliveryIdForApi)) {
        const errorMsg = `Não foi possível identificar delivery_id numérico para o pedido ${orderId}`;
        console.error(`❌ ${errorMsg}`);
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

