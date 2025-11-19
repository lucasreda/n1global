// 🔔 Shopify Webhook Service
// Gerencia webhooks do Shopify para sincronização automática em tempo real
// 
// IMPORTANTE: Pedidos Shopify são criados/atualizados APENAS via webhooks
// Não use polling workers - eles foram desabilitados para melhor performance

import { db } from '../db';
import { shopifyIntegrations, operations, stores } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { shopifyService } from './shopify-service';
import { ShopifySyncService } from '../shopify-sync-service';
import { performStagingSync } from './staging-sync-service';
import { invalidateDashboardCache } from './dashboard-cache-service';

export class ShopifyWebhookService {
  /**
   * Obtém a URL base pública do servidor
   * Retorna null se estiver em localhost sem URL pública configurada
   * Método público para ser usado pelo frontend
   */
  getWebhookBaseUrl(): string | null {
    const domain = process.env.REPLIT_DEV_DOMAIN || process.env.PUBLIC_URL;
    
    if (!domain) {
      return null;
    }
    
    // Detectar localhost explícito (mas não ngrok)
    if ((domain.includes('localhost') || domain.includes('127.0.0.1')) && 
        !domain.includes('ngrok')) {
      return null;
    }
    
    // Aceitar domínios ngrok mesmo em desenvolvimento
    if (domain.includes('.ngrok-free.app') || domain.includes('.ngrok-free.dev') || domain.includes('.ngrok.io') || domain.includes('ngrok')) {
      // Garantir HTTPS
      if (domain.startsWith('http://') || domain.startsWith('https://')) {
        return domain.replace('http://', 'https://');
      }
      return `https://${domain}`;
    }
    
    // Garantir HTTPS
    if (domain.startsWith('http://') || domain.startsWith('https://')) {
      return domain.replace('http://', 'https://');
    }
    
    return `https://${domain}`;
  }

  /**
   * Obtém a URL completa do webhook para ser configurada manualmente
   */
  getWebhookUrl(): string | null {
    const baseUrl = this.getWebhookBaseUrl();
    if (!baseUrl) {
      return null;
    }
    return `${baseUrl}/api/webhooks/shopify/orders`;
  }

  /**
   * Obtém os tópicos necessários para configurar o webhook
   */
  getRequiredWebhookTopics(): string[] {
    return ['orders/create', 'orders/updated'];
  }

  /**
   * Configura webhooks do Shopify automaticamente quando integração é criada
   */
  async configureWebhooks(operationId: string): Promise<{ success: boolean; webhooks?: any[]; error?: string }> {
    try {
      const baseUrl = this.getWebhookBaseUrl();
      
      // Se não há URL pública (dev sem ngrok), pular configuração de webhooks
      if (!baseUrl) {
        console.log('ℹ️ Webhooks não configurados - usando polling inteligente como fallback');
        return { success: true, webhooks: [] };
      }
      
      // Buscar integração Shopify
      const [integration] = await db
        .select()
        .from(shopifyIntegrations)
        .where(eq(shopifyIntegrations.operationId, operationId))
        .limit(1);

      if (!integration) {
        return { success: false, error: 'Integração Shopify não encontrada' };
      }

      const webhookUrl = `${baseUrl}/api/webhooks/shopify/orders`;
      
      // Listar webhooks existentes para evitar duplicatas
      const existingWebhooks = await this.listWebhooks(integration.shopName, integration.accessToken);
      
      const topicsToRegister = ['orders/create', 'orders/updated'];
      const configuredWebhooks: any[] = [];

      for (const topic of topicsToRegister) {
        // Verificar se webhook já existe
        const existing = existingWebhooks.find(w => w.topic === topic && w.address === webhookUrl);
        
        if (existing) {
          console.log(`ℹ️ Webhook ${topic} já existe: ${existing.id}`);
          configuredWebhooks.push(existing);
          continue;
        }

        // Criar novo webhook
        const webhook = await this.createWebhook(
          integration.shopName,
          integration.accessToken,
          topic,
          webhookUrl
        );

        if (webhook) {
          configuredWebhooks.push(webhook);
          console.log(`✅ Webhook ${topic} configurado: ${webhook.id}`);
        }
      }

      return { success: true, webhooks: configuredWebhooks };
    } catch (error: any) {
      console.error('❌ Erro ao configurar webhooks Shopify:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cria um webhook no Shopify
   */
  private async createWebhook(shopName: string, accessToken: string, topic: string, address: string): Promise<any | null> {
    try {
      // Normalizar nome da loja (remover http/https se presente)
      const normalizeShopName = (name: string): string => {
        if (!name) return name;
        if (name.includes('.')) return name;
        return `${name}.myshopify.com`;
      };
      const normalizedShopName = normalizeShopName(shopName);
      const url = `https://${normalizedShopName}/admin/api/2023-10/webhooks.json`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook: {
            topic,
            address,
            format: 'json'
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro ao criar webhook ${topic}:`, response.status, errorText);
        return null;
      }

      const data = await response.json();
      return data.webhook;
    } catch (error: any) {
      console.error(`❌ Erro ao criar webhook ${topic}:`, error);
      return null;
    }
  }

  /**
   * Lista webhooks existentes do Shopify
   */
  private async listWebhooks(shopName: string, accessToken: string): Promise<any[]> {
    try {
      // Normalizar nome da loja (remover http/https se presente)
      const normalizeShopName = (name: string): string => {
        if (!name) return name;
        if (name.includes('.')) return name;
        return `${name}.myshopify.com`;
      };
      const normalizedShopName = normalizeShopName(shopName);
      const url = `https://${normalizedShopName}/admin/api/2023-10/webhooks.json`;
      
      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
        }
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.webhooks || [];
    } catch (error) {
      console.error('❌ Erro ao listar webhooks:', error);
      return [];
    }
  }

  /**
   * Verifica assinatura HMAC do webhook do Shopify
   */
  verifyWebhook(req: any, secret?: string): boolean {
    const hmacHeader = req.headers['x-shopify-hmac-sha256'];
    
    if (!hmacHeader) {
      console.warn('⚠️ Webhook sem assinatura HMAC');
      return false;
    }

    // Se secret não foi fornecido, usar JWT_SECRET como fallback
    const webhookSecret = secret || process.env.JWT_SECRET || '';
    
    if (!webhookSecret) {
      console.warn('⚠️ Nenhum secret configurado para verificar webhook');
      return false; // Em produção, deve retornar false. Em dev, podemos ser mais permissivos
    }

    const rawBody = req.rawBody || JSON.stringify(req.body);
    const calculatedHmac = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody, 'utf8')
      .digest('base64');

    const isValid = calculatedHmac === hmacHeader;
    
    if (!isValid) {
      console.warn('⚠️ Assinatura HMAC do webhook inválida');
      // Debug detalhado para investigar diferenças de HMAC em produção
      console.log('🔐 Shopify Webhook Debug:', {
        shopDomain: req.headers['x-shopify-shop-domain'] || null,
        topic: req.headers['x-shopify-topic'] || null,
        secretLength: webhookSecret.length,
        secretPreview: webhookSecret
          ? `${webhookSecret.slice(0, 4)}...${webhookSecret.slice(-4)}`
          : null,
        hmacHeader,
        calculatedHmac,
        rawBodyLength: rawBody ? rawBody.length : 0,
      });
    }

    return isValid;
  }

  /**
   * Processa webhook de pedido criado
   */
  async handleOrderCreated(payload: any, operationId: string): Promise<void> {
    try {
      console.log(`📦 [WEBHOOK] Novo pedido criado: ${payload.name || payload.id}`);
      
      // Processar pedido usando ShopifySyncService
      const shopifySyncService = new ShopifySyncService();
      await shopifySyncService.processShopifyOrderDirectly(operationId, payload);
      
      // Invalidar cache do dashboard para esta operação
      invalidateDashboardCache(operationId);

      // Disparar staging sync automático para fazer matching com transportadora
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
            console.error('❌ Erro no staging sync automático após webhook:', error);
          });
        }
      }
      
      console.log(`✅ Pedido processado via webhook: ${payload.name || payload.id}`);
    } catch (error: any) {
      console.error('❌ Erro ao processar webhook de pedido criado:', error);
      throw error;
    }
  }

  /**
   * Processa webhook de pedido atualizado
   */
  async handleOrderUpdated(payload: any, operationId: string): Promise<void> {
    try {
      console.log(`🔄 [WEBHOOK] Pedido atualizado: ${payload.name || payload.id}`);
      
      // Processar atualização
      const shopifySyncService = new ShopifySyncService();
      await shopifySyncService.processShopifyOrderDirectly(operationId, payload);
      
      // Invalidar cache do dashboard para esta operação
      invalidateDashboardCache(operationId);
      
      console.log(`✅ Pedido atualizado via webhook: ${payload.name || payload.id}`);
    } catch (error: any) {
      console.error('❌ Erro ao processar webhook de pedido atualizado:', error);
      throw error;
    }
  }

  /**
   * Remove webhooks quando integração é removida
   */
  async removeWebhooks(operationId: string): Promise<void> {
    try {
      const [integration] = await db
        .select()
        .from(shopifyIntegrations)
        .where(eq(shopifyIntegrations.operationId, operationId))
        .limit(1);

      if (!integration) {
        return;
      }

      const baseUrl = this.getWebhookBaseUrl();
      const webhookUrl = `${baseUrl}/api/webhooks/shopify/orders`;
      
      const existingWebhooks = await this.listWebhooks(integration.shopName, integration.accessToken);
      
      for (const webhook of existingWebhooks) {
        if (webhook.address === webhookUrl) {
          await this.deleteWebhook(integration.shopName, integration.accessToken, webhook.id);
          console.log(`🗑️ Webhook removido: ${webhook.id}`);
        }
      }
    } catch (error: any) {
      console.error('❌ Erro ao remover webhooks:', error);
    }
  }

  /**
   * Deleta um webhook do Shopify
   */
  private async deleteWebhook(shopName: string, accessToken: string, webhookId: string): Promise<void> {
    try {
      // Normalizar nome da loja (remover http/https se presente)
      const normalizeShopName = (name: string): string => {
        if (!name) return name;
        if (name.includes('.')) return name;
        return `${name}.myshopify.com`;
      };
      const normalizedShopName = normalizeShopName(shopName);
      const url = `https://${normalizedShopName}/admin/api/2023-10/webhooks/${webhookId}.json`;
      
      await fetch(url, {
        method: 'DELETE',
        headers: {
          'X-Shopify-Access-Token': accessToken,
        }
      });
    } catch (error) {
      console.error(`❌ Erro ao deletar webhook ${webhookId}:`, error);
    }
  }
}

export const shopifyWebhookService = new ShopifyWebhookService();

