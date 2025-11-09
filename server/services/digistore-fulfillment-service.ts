import { db } from '../db';
import { orders, digistoreOrders, digistoreIntegrations } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { DigistoreService } from '../digistore-service';

export class DigistoreFulfillmentService {
  /**
   * Atualiza status de entrega na Digistore24 quando pedido é enviado
   * Usa delivery_id (armazenado em orderId) para atualizar via PUT /updateDelivery
   */
  async updateDeliveryStatus(
    orderId: string,
    status: 'shipped' | 'delivered' | 'cancelled',
    trackingNumber?: string,
    trackingUrl?: string,
    carrier?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Buscar pedido vinculado na staging table
      const [stagingOrder] = await db
        .select({
          order: digistoreOrders,
          integration: digistoreIntegrations,
        })
        .from(digistoreOrders)
        .innerJoin(
          digistoreIntegrations,
          eq(digistoreOrders.integrationId, digistoreIntegrations.id)
        )
        .where(eq(digistoreOrders.linkedOrderId, orderId))
        .limit(1);

      if (!stagingOrder) {
        console.log(`ℹ️ Pedido ${orderId} não é da Digistore24`);
        return { success: true }; // Não é erro, apenas não é Digistore24
      }

      // orderId na staging table é o delivery_id da Digistore24
      const deliveryId = stagingOrder.order.orderId;
      console.log(`📤 Atualizando entrega Digistore24: delivery_id=${deliveryId} -> ${status}`);

      const digistoreService = new DigistoreService({
        apiKey: stagingOrder.integration.apiKey
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
        // Atualizar tracking na staging table
        await db.update(digistoreOrders)
          .set({
            tracking: trackingNumber || null,
            status: status,
            updatedAt: new Date()
          })
          .where(eq(digistoreOrders.id, stagingOrder.order.id));
        
        console.log(`✅ Staging table atualizada para delivery_id=${deliveryId}`);
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

