// 🔔 Digistore24 Webhook Service
// Gerencia webhooks IPN do Digistore24 para sincronização automática em tempo real

import { db } from '../db';
import { digistoreIntegrations, operations, stores, orders } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
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

export interface DigistoreIPNEvent {
  event: string; // 'on_payment', 'on_refund', 'on_chargeback', etc
  order_id: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  buyer_email: string;
  buyer_name: string;
  billing_address: {
    first_name: string;
    last_name: string;
    street: string;
    street2?: string;
    city: string;
    state?: string;
    zipcode: string;
    country: string;
    phone?: string;
  };
  shipping_address?: {
    first_name: string;
    last_name: string;
    street: string;
    street2?: string;
    city: string;
    state?: string;
    zipcode: string;
    country: string;
    phone?: string;
  };
  amount: number;
  currency: string;
  payment_status: string;
  created_at: string;
  sha_sign?: string; // Assinatura SHA para validação
}

export class DigistoreWebhookService {
  /**
   * Obtém a URL base pública do servidor para webhooks
   */
  private getWebhookBaseUrl(): string | null {
    const domain = process.env.REPLIT_DEV_DOMAIN || process.env.PUBLIC_URL;
    
    if (!domain) {
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        console.warn('⚠️ Webhooks Digistore24 desabilitados em desenvolvimento - use ngrok ou configure PUBLIC_URL');
        console.log('ℹ️ O sistema usará polling inteligente como fallback automático');
        return null;
      }
      throw new Error('REPLIT_DEV_DOMAIN ou PUBLIC_URL não configurado. Webhooks precisam de URL pública em produção.');
    }
    
    // Detectar localhost explícito
    if (domain.includes('localhost') || domain.includes('127.0.0.1')) {
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        console.warn('⚠️ URL localhost detectada - webhooks Digistore24 desabilitados em desenvolvimento');
        console.log('ℹ️ Configure PUBLIC_URL com ngrok (ex: https://abc123.ngrok-free.app) para testar webhooks');
        return null;
      }
    }
    
    // Garantir HTTPS
    if (domain.startsWith('http://') || domain.startsWith('https://')) {
      return domain.replace('http://', 'https://');
    }
    
    return `https://${domain}`;
  }

  /**
   * Verifica assinatura SHA do webhook IPN Digistore24
   * Digistore24 usa SHA256 ou SHA512 para assinar os dados
   */
  verifyIPNSignature(event: DigistoreIPNEvent, secret: string): boolean {
    if (!event.sha_sign) {
      console.warn('⚠️ Webhook Digistore24 sem assinatura SHA');
      return false;
    }

    if (!secret) {
      console.warn('⚠️ Nenhum secret configurado para verificar webhook Digistore24');
      return false;
    }

    // Criar string de dados para validação
    // Ordem dos campos é importante conforme documentação Digistore24
    const dataString = [
      event.order_id,
      event.transaction_id,
      event.product_id,
      event.buyer_email,
      event.amount.toString(),
      event.currency,
      secret
    ].join('');

    // Calcular SHA256
    const calculatedSignature = crypto
      .createHash('sha256')
      .update(dataString, 'utf8')
      .digest('hex');

    const isValid = calculatedSignature.toLowerCase() === event.sha_sign.toLowerCase();
    
    if (!isValid) {
      console.warn('⚠️ Assinatura do webhook Digistore24 inválida');
      console.log('🔍 Expected:', calculatedSignature);
      console.log('🔍 Received:', event.sha_sign);
    }

    return isValid;
  }

  /**
   * Processa evento IPN do Digistore24
   */
  async processIPNEvent(event: DigistoreIPNEvent, operationId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`📥 Processando evento IPN Digistore24: ${event.event} - Order: ${event.order_id}`);

      // Se operationId não foi fornecido, tentar encontrar pela integração
      let targetOperationId = operationId;
      
      if (!targetOperationId) {
        // Buscar todas as integrações Digistore24 ativas
        const integrations = await db
          .select()
          .from(digistoreIntegrations)
          .where(eq(digistoreIntegrations.status, 'active'));

        if (integrations.length === 0) {
          console.warn('⚠️ Nenhuma integração Digistore24 ativa encontrada');
          return { success: false, error: 'Nenhuma integração ativa' };
        }

        // Se houver apenas uma integração, usar ela
        if (integrations.length === 1) {
          targetOperationId = integrations[0].operationId;
        } else {
          // Se houver múltiplas integrações, precisamos de mais informação
          console.warn('⚠️ Múltiplas integrações Digistore24 encontradas, operationId é necessário');
          return { success: false, error: 'operationId é necessário quando há múltiplas integrações' };
        }
      }

      // Buscar integração
      const [integration] = await db
        .select()
        .from(digistoreIntegrations)
        .where(eq(digistoreIntegrations.operationId, targetOperationId))
        .limit(1);

      if (!integration) {
        console.warn('⚠️ Integração Digistore24 não encontrada');
        return { success: false, error: 'Integração não encontrada' };
      }

      // Buscar operação para pegar storeId
      const [operation] = await db
        .select()
        .from(operations)
        .where(eq(operations.id, targetOperationId))
        .limit(1);

      if (!operation) {
        console.warn('⚠️ Operação não encontrada');
        return { success: false, error: 'Operação não encontrada' };
      }

      // Verificar se pedido já existe
      const [existingOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.digistoreOrderId, event.order_id))
        .limit(1);

      const shippingAddress = event.shipping_address || event.billing_address;

      if (existingOrder) {
        // Atualizar pedido existente
        await db.update(orders)
          .set({
            status: mapDigistoreStatus(event.payment_status),
            paymentStatus: event.payment_status,
            providerData: event,
            updatedAt: new Date()
          })
          .where(eq(orders.id, existingOrder.id));
        
        console.log(`✅ Pedido Digistore24 atualizado: ${event.order_id}`);
      } else {
        // Criar novo pedido
        const newOrderId = `DS-${event.order_id}`;
        await db.insert(orders).values({
          id: newOrderId,
          storeId: operation.storeId,
          operationId: targetOperationId,
          dataSource: 'digistore24',
          digistoreOrderId: event.order_id,
          digistoreTransactionId: event.transaction_id,
          
          // Dados do cliente
          customerName: event.buyer_name,
          customerEmail: event.buyer_email,
          customerPhone: shippingAddress.phone || null,
          customerAddress: shippingAddress.street + (shippingAddress.street2 ? `, ${shippingAddress.street2}` : ''),
          customerCity: shippingAddress.city,
          customerState: shippingAddress.state || null,
          customerZip: shippingAddress.zipcode,
          customerCountry: shippingAddress.country,
          
          // Status
          status: mapDigistoreStatus(event.payment_status),
          paymentStatus: event.payment_status,
          
          // Financeiro
          total: event.amount?.toString() || '0',
          currency: event.currency,
          
          // Provider
          provider: 'digistore24',
          
          // Metadata
          providerData: event,
          orderDate: new Date(event.created_at || Date.now()),
          
          needsSync: false, // Já está sincronizado
          carrierImported: false,
        });
        
        console.log(`✅ Pedido Digistore24 criado: ${newOrderId}`);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao processar evento IPN Digistore24:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    }
  }

  /**
   * Processa evento de pagamento (novo pedido)
   */
  private async processPaymentEvent(event: DigistoreIPNEvent, operation: any): Promise<void> {
    console.log(`💰 Processando pagamento Digistore24: ${event.order_id}`);

    // Verificar se pedido já existe
    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, event.order_id))
      .limit(1);

    if (existingOrder) {
      console.log(`ℹ️ Pedido já existe: ${event.order_id}`);
      return;
    }

    // Criar novo pedido
    const shippingAddress = event.shipping_address || event.billing_address;
    
    await db.insert(orders).values({
      id: event.order_id,
      storeId: operation.storeId,
      operationId: operation.id,
      dataSource: 'digistore',
      
      // Customer info
      customerName: event.buyer_name,
      customerEmail: event.buyer_email,
      customerPhone: shippingAddress.phone || null,
      customerAddress: shippingAddress.street + (shippingAddress.street2 ? `, ${shippingAddress.street2}` : ''),
      customerCity: shippingAddress.city,
      customerState: shippingAddress.state || null,
      customerZip: shippingAddress.zipcode,
      customerCountry: shippingAddress.country,
      
      // Order details
      totalAmount: event.amount.toString(),
      currency: event.currency,
      status: 'pending',
      paymentStatus: event.payment_status,
      
      // Metadata
      metadata: {
        digistore_transaction_id: event.transaction_id,
        digistore_product_id: event.product_id,
        digistore_product_name: event.product_name,
      },
      
      createdAt: new Date(event.created_at),
    });

    console.log(`✅ Pedido Digistore24 criado: ${event.order_id}`);
  }

  /**
   * Processa evento de reembolso
   */
  private async processRefundEvent(event: DigistoreIPNEvent, operation: any): Promise<void> {
    console.log(`↩️ Processando reembolso Digistore24: ${event.order_id}`);

    // Atualizar status do pedido
    await db
      .update(orders)
      .set({
        status: 'refunded',
        paymentStatus: 'refunded',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, event.order_id));

    console.log(`✅ Pedido Digistore24 reembolsado: ${event.order_id}`);
  }

  /**
   * Processa evento de chargeback
   */
  private async processChargebackEvent(event: DigistoreIPNEvent, operation: any): Promise<void> {
    console.log(`⚠️ Processando chargeback Digistore24: ${event.order_id}`);

    // Atualizar status do pedido
    await db
      .update(orders)
      .set({
        status: 'cancelled',
        paymentStatus: 'chargeback',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, event.order_id));

    console.log(`✅ Pedido Digistore24 marcado como chargeback: ${event.order_id}`);
  }

  /**
   * Retorna a URL do webhook IPN para configurar no Digistore24
   */
  getWebhookUrl(): string | null {
    const baseUrl = this.getWebhookBaseUrl();
    if (!baseUrl) return null;
    return `${baseUrl}/api/integrations/digistore/webhook`;
  }
}

// Singleton instance
export const digistoreWebhookService = new DigistoreWebhookService();

