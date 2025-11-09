// 🔔 Digistore24 Webhook Service
// Gerencia webhooks IPN do Digistore24 para sincronização automática em tempo real

import { db } from '../db';
import { digistoreIntegrations, operations, stores, orders } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { DigistoreService } from '../digistore-service';

// Helper function to map Digistore24 payment/delivery status to our order status
function mapDigistoreStatus(status: string): string {
  if (!status) return 'pending';
  
  const statusLower = status.toLowerCase();
  
  switch (statusLower) {
    // Payment statuses
    case 'completed':
    case 'paid':
      return 'confirmed';
    case 'pending':
    case 'processing':
      return 'pending';
    case 'refunded':
      return 'refunded';
    case 'cancelled':
    case 'canceled':
    case 'failed':
      return 'cancelled';
    
    // Delivery statuses
    case 'request':
      return 'pending';
    case 'in_progress':
      return 'confirmed';
    case 'delivery':
    case 'shipped':
      return 'shipped';
    case 'partial_delivery':
      return 'shipped';
    case 'return':
      return 'returned';
    case 'cancel':
      return 'cancelled';
    
    default:
      return 'pending';
  }
}

export interface DigistoreIPNEvent {
  event: string; // 'on_payment', 'on_refund', 'on_chargeback'
  order_id: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  
  // Campos de cliente (flat structure)
  email: string;
  
  // Endereço (flat structure - prefixo address_)
  address_first_name?: string;
  address_last_name?: string;
  address_company?: string;
  address_street?: string;
  address_street2?: string;
  address_street_name?: string;
  address_street_number?: string;
  address_city?: string;
  address_state?: string;
  address_zipcode?: string;
  address_country?: string;
  address_phone_no?: string;
  address_mobile_no?: string;
  
  // Billing (flat structure - prefixo billing_)
  billing_first_name?: string;
  billing_last_name?: string;
  billing_street?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zipcode?: string;
  billing_country?: string;
  billing_phone_no?: string;
  
  // Financeiro
  amount: string | number;
  currency: string;
  payment_status: string;
  billing_status?: string;
  
  // Datas
  created_at?: string;
  order_date?: string;
  order_time?: string;
  
  // Outros
  sha_sign?: string;
  api_mode?: string;
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
      event.email,
      typeof event.amount === 'number' ? event.amount.toString() : event.amount,
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

      // Construir nome do cliente a partir dos campos flat
      const customerFirstName = event.address_first_name || event.billing_first_name || '';
      const customerLastName = event.address_last_name || event.billing_last_name || '';
      const customerName = `${customerFirstName} ${customerLastName}`.trim() || 'Cliente Digistore24';

      // Construir endereço completo
      const street = event.address_street || event.billing_street || '';
      const streetNumber = event.address_street_number || '';
      const street2 = event.address_street2 || '';
      const fullAddress = [street, streetNumber, street2].filter(Boolean).join(' ').trim() || null;

      if (existingOrder) {
        // Atualizar pedido existente
        await db.update(orders)
          .set({
            status: mapDigistoreStatus(event.payment_status || event.billing_status || 'pending'),
            paymentStatus: event.payment_status || event.billing_status || 'pending',
            providerData: event,
            updatedAt: new Date()
          })
          .where(eq(orders.id, existingOrder.id));
        
        console.log(`✅ Pedido Digistore24 atualizado: ${event.order_id}`);
      } else {
        // Criar novo pedido
        const newOrderId = `DS-${event.order_id}`;
        
        console.log(`🔍 [DEBUG] Construindo pedido ${newOrderId}...`);
        console.log(`🔍 [DEBUG] customerName: "${customerName}"`);
        console.log(`🔍 [DEBUG] email: "${event.email}"`);
        console.log(`🔍 [DEBUG] payment_status: "${event.payment_status}"`);
        console.log(`🔍 [DEBUG] billing_status: "${event.billing_status}"`);
        console.log(`🔍 [DEBUG] amount: ${typeof event.amount} = ${event.amount}`);
        
        // Garantir que campos obrigatórios nunca sejam null/undefined
        const safeOrderData = {
          id: newOrderId,
          storeId: operation.storeId,
          operationId: targetOperationId,
          dataSource: 'digistore24' as const,
          digistoreOrderId: event.order_id || null,
          digistoreTransactionId: event.transaction_id || null,
          
          // Dados do cliente (usando campos flat)
          customerName: customerName || 'Cliente Digistore24',
          customerEmail: event.email || '',
          customerPhone: event.address_phone_no || event.billing_phone_no || null,
          customerAddress: fullAddress || null,
          customerCity: event.address_city || event.billing_city || null,
          customerState: event.address_state || event.billing_state || null,
          customerZip: event.address_zipcode || event.billing_zipcode || null,
          customerCountry: event.address_country || event.billing_country || null,
          
          // Status (garantir que nunca seja null/undefined)
          status: mapDigistoreStatus(event.payment_status || event.billing_status || 'pending') || 'pending',
          paymentStatus: event.payment_status || event.billing_status || 'pending',
          
          // Financeiro (garantir que nunca seja null/undefined)
          total: typeof event.amount === 'number' ? event.amount.toString() : (event.amount?.toString() || '0'),
          currency: event.currency || 'EUR',
          
          // Provider
          provider: 'digistore24' as const,
          
          // Metadata
          providerData: event as any,
          orderDate: event.created_at ? new Date(event.created_at) : new Date(),
          
          needsSync: false,
          carrierImported: false,
        };
        
        console.log(`🔍 [DEBUG] safeOrderData.status: "${safeOrderData.status}"`);
        console.log(`🔍 [DEBUG] safeOrderData.total: "${safeOrderData.total}"`);
        console.log(`🔍 [DEBUG] Inserindo no banco...`);
        
        await db.insert(orders).values(safeOrderData);
        
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

