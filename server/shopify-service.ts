import { db } from "./db";
import { shopifyIntegrations, operations, type InsertShopifyIntegration, type ShopifyIntegration } from "@shared/schema";
import { eq, and } from "drizzle-orm";

interface ShopifyStore {
  id: string;
  name: string;
  email: string;
  domain: string;
  plan_name: string;
  currency: string;
  timezone: string;
  created_at: string;
}

interface ShopifyOrder {
  id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  total_price: string;
  subtotal_price: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string;
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  shipping_address: {
    first_name: string;
    last_name: string;
    address1: string;
    city: string;
    province: string;
    country: string;
    zip: string;
  };
  line_items: Array<{
    id: string;
    title: string;
    quantity: number;
    price: string;
    sku: string;
  }>;
}

interface ShopifyProduct {
  id: string;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  created_at: string;
  updated_at: string;
  status: string;
  variants: Array<{
    id: string;
    title: string;
    price: string;
    sku: string;
    inventory_quantity: number;
    weight: number;
  }>;
  images: Array<{
    id: string;
    src: string;
    alt: string;
  }>;
}

export class ShopifyService {
  
  /**
   * Testa a conexão com a loja Shopify
   */
  async testConnection(shopName: string, accessToken: string): Promise<{ success: boolean; data?: ShopifyStore; error?: string }> {
    try {
      // Limpa o nome da loja se vier com protocolo ou barra
      const cleanShopName = shopName.replace(/^https?:\/\//, '').replace(/\/$/, '');
      
      console.log(`🔗 Testando conexão Shopify: ${cleanShopName}`);
      
      const url = `https://${cleanShopName}/admin/api/2023-10/shop.json`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
          'User-Agent': 'COD-Dashboard/1.0'
        },
        timeout: 30000, // 30 segundos de timeout
      });

      console.log(`📊 Resposta Shopify: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro Shopify: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText || response.statusText}`
        };
      }

      const data = await response.json() as { shop: ShopifyStore };
      console.log(`✅ Loja Shopify conectada: ${data.shop.name}`);
      
      return {
        success: true,
        data: data.shop
      };
    } catch (error) {
      console.error('❌ Erro na conexão Shopify:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return {
        success: false,
        error: `Falha na conexão: ${errorMessage}`
      };
    }
  }

  /**
   * Salva ou atualiza integração Shopify para uma operação
   */
  async saveIntegration(operationId: string, shopName: string, accessToken: string): Promise<ShopifyIntegration> {
    // Testa a conexão primeiro
    const testResult = await this.testConnection(shopName, accessToken);
    
    if (!testResult.success) {
      throw new Error(`Falha na conexão: ${testResult.error}`);
    }

    const storeData = testResult.data!;
    
    // Verifica se já existe integração para essa operação
    const [existingIntegration] = await db
      .select()
      .from(shopifyIntegrations)
      .where(eq(shopifyIntegrations.operationId, operationId))
      .limit(1);

    const integrationData = {
      shopName,
      accessToken,
      status: "active" as const,
      lastSyncAt: new Date(),
      syncErrors: null,
      metadata: {
        storeName: storeData.name,
        storeEmail: storeData.email,
        plan: storeData.plan_name,
        currency: storeData.currency,
        timezone: storeData.timezone,
      },
      updatedAt: new Date(),
    };

    if (existingIntegration) {
      // Atualiza integração existente
      const [updated] = await db
        .update(shopifyIntegrations)
        .set(integrationData)
        .where(eq(shopifyIntegrations.id, existingIntegration.id))
        .returning();
      
      return updated;
    } else {
      // Cria nova integração
      const [created] = await db
        .insert(shopifyIntegrations)
        .values({
          operationId,
          ...integrationData,
        })
        .returning();
      
      return created;
    }
  }

  /**
   * Obtém integração Shopify para uma operação
   */
  async getIntegration(operationId: string): Promise<ShopifyIntegration | null> {
    const [integration] = await db
      .select()
      .from(shopifyIntegrations)
      .where(eq(shopifyIntegrations.operationId, operationId))
      .limit(1);

    return integration || null;
  }

  /**
   * Lista todas as integrações de uma loja (todas as operações da loja)
   */
  async getIntegrationsByStore(storeId: string): Promise<ShopifyIntegration[]> {
    const integrations = await db
      .select({
        integration: shopifyIntegrations,
        operation: operations,
      })
      .from(shopifyIntegrations)
      .innerJoin(operations, eq(operations.id, shopifyIntegrations.operationId))
      .where(eq(operations.storeId, storeId));

    return integrations.map(item => item.integration);
  }

  /**
   * Remove integração Shopify
   */
  async removeIntegration(operationId: string): Promise<boolean> {
    const result = await db
      .delete(shopifyIntegrations)
      .where(eq(shopifyIntegrations.operationId, operationId));

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Busca pedidos da Shopify
   */
  async getOrders(shopName: string, accessToken: string, options: {
    limit?: number;
    since_id?: string;
    created_at_min?: string;
    status?: string;
  } = {}): Promise<{ success: boolean; orders?: ShopifyOrder[]; error?: string }> {
    try {
      const params = new URLSearchParams();
      
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.since_id) params.append('since_id', options.since_id);
      if (options.created_at_min) params.append('created_at_min', options.created_at_min);
      if (options.status) params.append('status', options.status);

      const response = await fetch(`https://${shopName}/admin/api/2023-10/orders.json?${params}`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        orders: data.orders
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Busca produtos da Shopify
   */
  async getProducts(shopName: string, accessToken: string, options: {
    limit?: number;
    since_id?: string;
    status?: string;
  } = {}): Promise<{ success: boolean; products?: ShopifyProduct[]; error?: string }> {
    try {
      const params = new URLSearchParams();
      
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.since_id) params.append('since_id', options.since_id);
      if (options.status) params.append('status', options.status);

      const response = await fetch(`https://${shopName}/admin/api/2023-10/products.json?${params}`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        products: data.products
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Busca informações da loja
   */
  async getShopInfo(shopName: string, accessToken: string): Promise<{ success: boolean; shop?: ShopifyStore; error?: string }> {
    return this.testConnection(shopName, accessToken);
  }

  /**
   * Sincroniza dados da Shopify para o dashboard
   */
  async syncData(operationId: string): Promise<{ success: boolean; message: string; stats?: any }> {
    const integration = await this.getIntegration(operationId);
    
    if (!integration) {
      return {
        success: false,
        message: 'Integração Shopify não encontrada para esta operação'
      };
    }

    try {
      // Busca dados da loja
      const shopResult = await this.getShopInfo(integration.shopName, integration.accessToken);
      if (!shopResult.success) {
        await this.updateIntegrationStatus(operationId, 'error', shopResult.error || null);
        return {
          success: false,
          message: `Erro ao conectar com a loja: ${shopResult.error}`
        };
      }

      // Busca pedidos recentes (últimos 30 dias)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const ordersResult = await this.getOrders(integration.shopName, integration.accessToken, {
        created_at_min: thirtyDaysAgo,
        limit: 250
      });

      if (!ordersResult.success) {
        await this.updateIntegrationStatus(operationId, 'error', ordersResult.error || null);
        return {
          success: false,
          message: `Erro ao buscar pedidos: ${ordersResult.error}`
        };
      }

      // Busca produtos
      const productsResult = await this.getProducts(integration.shopName, integration.accessToken, {
        limit: 100,
        status: 'active'
      });

      if (!productsResult.success) {
        await this.updateIntegrationStatus(operationId, 'error', productsResult.error || null);
        return {
          success: false,
          message: `Erro ao buscar produtos: ${productsResult.error}`
        };
      }

      // Atualiza status da integração para sucesso
      await this.updateIntegrationStatus(operationId, 'active', null);

      const stats = {
        orders: ordersResult.orders?.length || 0,
        products: productsResult.products?.length || 0,
        store: shopResult.shop?.name,
        lastSync: new Date().toISOString()
      };

      return {
        success: true,
        message: 'Sincronização concluída com sucesso',
        stats
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      await this.updateIntegrationStatus(operationId, 'error', errorMessage);
      
      return {
        success: false,
        message: `Erro na sincronização: ${errorMessage}`
      };
    }
  }

  /**
   * Atualiza status da integração
   */
  private async updateIntegrationStatus(operationId: string, status: 'active' | 'pending' | 'error', error: string | null) {
    await db
      .update(shopifyIntegrations)
      .set({
        status,
        syncErrors: error,
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(shopifyIntegrations.operationId, operationId));
  }
}

export const shopifyService = new ShopifyService();