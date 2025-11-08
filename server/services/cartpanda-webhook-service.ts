// 🔔 CartPanda Webhook Service
// Gerencia webhooks do CartPanda para sincronização automática em tempo real

import { db } from '../db';
import { cartpandaIntegrations, operations, stores } from '@shared/schema';
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
   */
  async handleOrderPaid(payload: any, operationId: string): Promise<void> {
    try {
      console.log(`💰 [WEBHOOK] Pedido pago: ${payload.order?.id || payload.id}`);
      
      // TODO: Implementar processamento de pedido CartPanda quando sync service estiver pronto
      // Por enquanto, apenas disparar staging sync
      
      // Invalidar cache do dashboard para esta operação
      invalidateDashboardCache(operationId);
      
      const [operation] = await db
        .select({ storeId: operations.storeId })
        .from(operations)
        .where(eq(operations.id, operationId))
        .limit(1);
      
      if (operation?.storeId) {
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
      }
      
      console.log(`✅ Pedido CartPanda processado via webhook: ${payload.order?.id || payload.id}`);
    } catch (error: any) {
      console.error('❌ Erro ao processar webhook de pedido pago CartPanda:', error);
      throw error;
    }
  }
}

export const cartpandaWebhookService = new CartPandaWebhookService();

