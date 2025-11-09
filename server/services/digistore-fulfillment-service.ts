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

      // digistoreOrderId é o delivery_id da Digistore24
      const deliveryId = order.digistoreOrderId;
      console.log(`📤 Atualizando entrega Digistore24: delivery_id=${deliveryId} -> ${status}`);

      const digistoreService = new DigistoreService({
        apiKey: integration.apiKey
      });

      const trackingInfo = trackingNumber ? {
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        carrier: carrier
      } : undefined;

      // Usar delivery_id para atualizar
      const result = await digistoreService.updateOrderStatus(
        deliveryId,
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

