// 🔔 CartPanda Webhook Service
// Gerencia webhooks do CartPanda para sincronização automática em tempo real
// 
// IMPORTANTE: Pedidos CartPanda são criados/atualizados APENAS via webhooks
// Não use polling workers - eles foram desabilitados para melhor performance

import { db } from '../db';
import { cartpandaIntegrations, operations, stores, orders } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { CartPandaService } from '../cartpanda-service';
import { performStagingSync } from './staging-sync-service';
import { invalidateDashboardCache } from './dashboard-cache-service';

export class CartPandaWebhookService {
  /**
   * Obtém a URL base pública do servidor
   * Retorna null se estiver em localhost sem URL pública configurada
   */
  private getWebhookBaseUrl(): string | null {
    const domain = process.env.REPLIT_DEV_DOMAIN || process.env.PUBLIC_URL;
    
    if (!domain) {
      // Em desenvolvimento sem URL pública, retornar null
      // O polling inteligente será usado como fallback automático
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        console.warn('⚠️ Webhooks desabilitados em desenvolvimento - use ngrok ou configure PUBLIC_URL para testar webhooks');
        console.log('ℹ️ O sistema usará polling inteligente como fallback automático');
        return null;
      }
      throw new Error('REPLIT_DEV_DOMAIN ou PUBLIC_URL não configurado. Webhooks precisam de URL pública em produção.');
    }
    
    // Detectar localhost explícito
    if (domain.includes('localhost') || domain.includes('127.0.0.1')) {
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        console.warn('⚠️ URL localhost detectada - webhooks desabilitados em desenvolvimento');
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
   * Verifica assinatura do webhook do CartPanda
   */
  verifyWebhook(req: any, secret?: string): boolean {
    const signatureHeader = req.headers['x-cartpanda-signature'];
    
    if (!signatureHeader) {
      console.warn('⚠️ Webhook CartPanda sem assinatura');
      return false;
    }

    // Se secret não foi fornecido, usar JWT_SECRET como fallback
    const webhookSecret = secret || process.env.JWT_SECRET || '';
    
    if (!webhookSecret) {
      console.warn('⚠️ Nenhum secret configurado para verificar webhook');
      return false; // Em produção, deve retornar false. Em dev, podemos ser mais permissivos
    }

    const rawBody = req.rawBody || JSON.stringify(req.body);
    const calculatedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody, 'utf8')
      .digest('hex');

    const isValid = calculatedSignature === signatureHeader;
    
    if (!isValid) {
      console.warn('⚠️ Assinatura do webhook CartPanda inválida');
    }

    return isValid;
  }

  /**
   * Configura webhook do CartPanda automaticamente quando integração é criada
   */
  async configureWebhook(operationId: string, storeSlug: string, bearerToken: string): Promise<{ success: boolean; webhook?: any; error?: string }> {
    try {
      const baseUrl = this.getWebhookBaseUrl();
      
      // Se não há URL pública (dev sem ngrok), pular configuração de webhooks
      if (!baseUrl) {
        console.log('ℹ️ Webhooks não configurados - usando polling inteligente como fallback');
        return { success: true, webhook: null };
      }
      
      const webhookUrl = `${baseUrl}/api/webhooks/cartpanda/orders`;
      
      // Verificar se webhook já existe
      const existingWebhooks = await this.listWebhooks(storeSlug, bearerToken);
      const existing = existingWebhooks.find(w => w.topic === 'order.paid' && w.address === webhookUrl);
      
      if (existing) {
        console.log(`ℹ️ Webhook order.paid já existe: ${existing.id}`);
        return { success: true, webhook: existing };
      }

      // Criar novo webhook
      const webhook = await this.createWebhook(storeSlug, bearerToken, 'order.paid', webhookUrl);
      
      if (webhook) {
        console.log(`✅ Webhook order.paid configurado: ${webhook.id}`);
        return { success: true, webhook };
      }
      
      return { success: false, error: 'Erro ao criar webhook' };
    } catch (error: any) {
      console.error('❌ Erro ao configurar webhook CartPanda:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cria um webhook no CartPanda
   */
  private async createWebhook(storeSlug: string, bearerToken: string, topic: string, address: string): Promise<any | null> {
    try {
      const url = `https://accounts.cartpanda.com/api/${storeSlug}/webhook`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          address
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro ao criar webhook ${topic}:`, response.status, errorText);
        return null;
      }

      const data = await response.json();
      return data.webhook || data;
    } catch (error: any) {
      console.error(`❌ Erro ao criar webhook ${topic}:`, error);
      return null;
    }
  }

  /**
   * Lista webhooks existentes do CartPanda
   */
  private async listWebhooks(storeSlug: string, bearerToken: string): Promise<any[]> {
    try {
      const url = `https://accounts.cartpanda.com/api/${storeSlug}/webhook`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
        }
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return Array.isArray(data) ? data : (data.webhooks || []);
    } catch (error) {
      console.error('❌ Erro ao listar webhooks:', error);
      return [];
    }
  }

  /**
   * Processa webhook de pedido pago
   * Processa pedido CartPanda e cria/atualiza na tabela orders
   */
  async handleOrderPaid(payload: any, operationId: string): Promise<void> {
    try {
      const cartpandaOrder = payload.order || payload;
      const orderId = cartpandaOrder.id;
      
      console.log(`💰 [WEBHOOK] Pedido pago CartPanda: ${orderId}`);
      
      // Buscar operação para obter storeId
      const [operation] = await db
        .select({ storeId: operations.storeId })
        .from(operations)
        .where(eq(operations.id, operationId))
        .limit(1);
      
      if (!operation) {
        throw new Error(`Operação ${operationId} não encontrada`);
      }
      
      // Verificar se o pedido já existe
      const existingOrder = await db
        .select()
        .from(orders)
        .where(eq(orders.id, `cartpanda_${orderId}`))
        .limit(1);
      
      // Funções auxiliares para mapear status
      const mapCartPandaStatus = (status: string): string => {
        const statusMap: Record<string, string> = {
          'pending': 'pending',
          'confirmed': 'confirmed', 
          'processing': 'confirmed',
          'shipped': 'shipped',
          'delivered': 'delivered',
          'cancelled': 'cancelled',
          'returned': 'returned'
        };
        return statusMap[status.toLowerCase()] || 'pending';
      };
      
      const mapCartPandaPaymentStatus = (paymentStatus: string): string => {
        const paymentMap: Record<string, string> = {
          'paid': 'paid',
          'pending': 'unpaid',
          'refunded': 'refunded',
          'partially_refunded': 'paid',
          'unpaid': 'unpaid'
        };
        return paymentMap[paymentStatus.toLowerCase()] || 'unpaid';
      };
      
      // Calcular custos de produto e envio
      const { calculateOrderCosts } = await import('../utils/order-cost-calculator');
      const orderStatus = mapCartPandaStatus(cartpandaOrder.status || 'pending');
      const orderProducts = cartpandaOrder.items || cartpandaOrder.line_items || [];
      const costs = await calculateOrderCosts(orderStatus, orderProducts, operation.storeId);
      
      const orderData = {
        id: `cartpanda_${orderId}`,
        storeId: operation.storeId,
        operationId: operationId,
        dataSource: 'cartpanda' as const,
        
        // Customer information
        customerId: cartpandaOrder.customer?.id?.toString() || null,
        customerName: cartpandaOrder.customer 
          ? `${cartpandaOrder.customer.first_name || ''} ${cartpandaOrder.customer.last_name || ''}`.trim() || 'Cliente CartPanda' 
          : 'Cliente CartPanda',
        customerEmail: cartpandaOrder.email || cartpandaOrder.customer?.email || null,
        customerPhone: cartpandaOrder.customer?.phone || null,
        customerAddress: cartpandaOrder.billing_address ? JSON.stringify(cartpandaOrder.billing_address) : null,
        customerCity: null,
        customerState: null,
        customerCountry: null,
        customerZip: null,
        
        // Order details
        status: orderStatus,
        paymentStatus: mapCartPandaPaymentStatus((cartpandaOrder as any).payment_status || 'unpaid'),
        paymentMethod: (cartpandaOrder as any).payment_method || 'unknown',
        
        // Financial
        total: (cartpandaOrder as any).total || (cartpandaOrder as any).total_price || '0.00',
        currency: (cartpandaOrder as any).currency || 'BRL',
        
        // Products
        products: orderProducts,
        
        // Provider
        provider: 'cartpanda' as const,
        providerOrderId: orderId?.toString(),
        
        // Custos calculados
        productCost: costs.productCost.toFixed(2),
        shippingCost: costs.shippingCost.toFixed(2),
        
        // Timestamps
        orderDate: new Date(cartpandaOrder.created_at || Date.now()),
        lastStatusUpdate: new Date(cartpandaOrder.updated_at || Date.now()),
        
        // Store complete CartPanda data
        providerData: cartpandaOrder,
        
        // Standard timestamps
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      if (existingOrder.length > 0) {
        // Atualizar pedido existente
        await db
          .update(orders)
          .set({
            ...orderData,
            updatedAt: new Date()
          })
          .where(eq(orders.id, `cartpanda_${orderId}`));
        console.log(`✅ [WEBHOOK] Pedido CartPanda ${orderId} atualizado`);
      } else {
        // Criar novo pedido
        await db.insert(orders).values(orderData);
        console.log(`✅ [WEBHOOK] Pedido CartPanda ${orderId} criado`);
      }
      
      // Invalidar cache do dashboard para esta operação
      invalidateDashboardCache(operationId);
      
      // Disparar staging sync automático para fazer matching com transportadora
      const [store] = await db
        .select({ ownerId: stores.ownerId })
        .from(stores)
        .where(eq(stores.id, operation.storeId))
        .limit(1);
      
      if (store?.ownerId) {
        // Disparar staging sync em background (não bloqueia resposta)
        performStagingSync(store.ownerId).catch(error => {
          console.error('❌ Erro no staging sync automático após webhook CartPanda:', error);
        });
      }
      
      console.log(`✅ Pedido CartPanda processado via webhook: ${orderId}`);
    } catch (error: any) {
      console.error('❌ Erro ao processar webhook de pedido pago CartPanda:', error);
      throw error;
    }
  }
}

export const cartpandaWebhookService = new CartPandaWebhookService();

