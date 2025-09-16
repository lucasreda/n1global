// 🏬 FHB (Kika API v3) Fulfillment Provider
// Integração com a API FHB/Kika para fulfillment de pedidos

import {
  BaseFulfillmentProvider,
  FulfillmentCredentials,
  FulfillmentToken,
  OrderResponse,
  OrderStatus,
  SyncResult
} from './base-fulfillment-provider';
import fetch from 'node-fetch';
import https from 'https';

interface FHBCredentials extends FulfillmentCredentials {
  appId: string; // App ID para autenticação
  secret: string; // Secret para autenticação
  apiUrl?: string; // URL da API (produção ou sandbox)
}

interface FHBOrder {
  id: string;
  variable_symbol: string;
  value: string;
  status: string;
  recipient: {
    address: {
      name: string;
      street: string;
      city: string;
      zip: string;
      country: string;
    };
    contact: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    price?: string;
  }>;
  created_at: string;
  tracking?: string;
}

interface FHBLoginResponse {
  token: string;
  expires_at?: string;
}

// URLs padrão da API FHB/Kika
const FHB_PRODUCTION_URL = "https://api.fhb.sk/v3";
const FHB_SANDBOX_URL = "https://api-dev.fhb.sk/v3";

export class FHBService extends BaseFulfillmentProvider {
  private fhbCredentials: FHBCredentials;
  
  constructor(credentials: FHBCredentials) {
    super(credentials);
    this.fhbCredentials = {
      ...credentials,
      apiUrl: credentials.apiUrl || FHB_PRODUCTION_URL
    };
    
    console.log("FHB Service initialized:");
    console.log("- App ID:", this.fhbCredentials.appId ? "✅ Configured" : "❌ Missing");
    console.log("- Secret:", this.fhbCredentials.secret ? "✅ Configured" : "❌ Missing");
    console.log("- API URL:", this.fhbCredentials.apiUrl);
  }

  async authenticate(): Promise<FulfillmentToken> {
    // Verificar se já temos token válido
    if (this.token && this.token.expiresAt > new Date()) {
      return this.token;
    }

    if (!this.fhbCredentials.appId || !this.fhbCredentials.secret) {
      throw new Error("❌ Credenciais FHB incompletas. É necessário: appId, secret");
    }

    const loginUrl = `${this.fhbCredentials.apiUrl}/login`;
    
    console.log("🔐 FHB: Autenticando com API...");
    
    try {
      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_id: this.fhbCredentials.appId,
          secret: this.fhbCredentials.secret
        }),
        // Use default HTTPS agent with proper certificate verification
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ FHB auth failed:", response.status, errorText);
        throw new Error(`Falha na autenticação FHB: ${response.status} - ${errorText}`);
      }

      const loginData = await response.json() as FHBLoginResponse;
      
      // Calcular expiração (padrão 24 horas se não fornecido)
      const expiresAt = loginData.expires_at 
        ? new Date(loginData.expires_at)
        : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
      
      this.token = {
        token: loginData.token,
        expiresAt
      };

      console.log("✅ FHB: Autenticação bem-sucedida!");
      console.log("🕐 Token expira em:", expiresAt.toISOString());
      
      return this.token;
    } catch (error: any) {
      console.error("💥 FHB authentication error:", error);
      throw error;
    }
  }

  protected async makeAuthenticatedRequest(endpoint: string, method: string = "GET", body?: any): Promise<any> {
    const token = await this.authenticate();
    
    // FHB usa header X-Authentication-Simple com token em base64
    const encodedToken = Buffer.from(token.token).toString('base64');
    
    const headers: any = {
      "Content-Type": "application/json",
      "X-Authentication-Simple": encodedToken
    };

    const url = endpoint.startsWith('http') ? endpoint : `${this.fhbCredentials.apiUrl}${endpoint}`;
    
    console.log(`📡 FHB ${method} request to:`, url);
    console.log(`🔑 FHB X-Authentication-Simple header:`, `${encodedToken.substring(0, 20)}...`);
    
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      // Use default HTTPS agent with proper certificate verification
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ FHB ${method} ${url} failed:`, response.status, errorText);
      throw new Error(`FHB API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async createOrder(orderData: any): Promise<OrderResponse> {
    try {
      console.log("🏬 FHB: Criando pedido...", orderData);

      // Mapear dados do pedido para formato FHB
      const fhbOrderData = {
        variable_symbol: orderData.orderNumber || orderData.id,
        value: orderData.total || "0",
        recipient: {
          address: {
            name: orderData.customerName || orderData.recipient?.name || "Cliente",
            street: orderData.shippingAddress?.street || orderData.address?.street || "",
            city: orderData.shippingAddress?.city || orderData.address?.city || "",
            zip: orderData.shippingAddress?.zip || orderData.address?.zip || "",
            country: orderData.shippingAddress?.country || orderData.address?.country || "SK"
          },
          contact: orderData.customerEmail || orderData.customerPhone || orderData.contact || ""
        },
        items: (orderData.items || []).map((item: any) => ({
          id: item.sku || item.id,
          quantity: item.quantity || 1,
          price: item.price || "0"
        }))
      };

      const result = await this.makeAuthenticatedRequest("/order", "POST", fhbOrderData);
      
      console.log("✅ FHB: Pedido criado:", result);
      
      return {
        success: true,
        message: "Pedido criado com sucesso na FHB",
        orderId: result.id?.toString(),
        trackingNumber: result.tracking,
        data: result
      };
    } catch (error: any) {
      console.error("❌ FHB: Erro ao criar pedido:", error);
      return {
        success: false,
        message: `Erro ao criar pedido na FHB: ${error.message}`,
        data: error
      };
    }
  }

  async getOrderStatus(orderId: string): Promise<OrderStatus | null> {
    try {
      console.log("📋 FHB: Buscando status do pedido:", orderId);

      // Tentar buscar por ID primeiro, depois por tracking se falhar
      let result: FHBOrder;
      
      try {
        result = await this.makeAuthenticatedRequest(`/order/${orderId}`);
      } catch (idError) {
        // Se falhar com ID, tentar com tracking number
        console.log("🔄 FHB: Tentando buscar por tracking number...");
        result = await this.makeAuthenticatedRequest(`/order?tracking=${orderId}`);
      }

      // Mapear status FHB para nossos status internos
      const statusMap: { [key: string]: string } = {
        'pending': 'pending',
        'confirmed': 'processing',
        'sent': 'shipped',
        'delivered': 'delivered',
        'rejected': 'cancelled'
      };

      return {
        orderId: result.id,
        status: statusMap[result.status] || result.status,
        trackingNumber: result.tracking,
        deliveryDate: undefined, // FHB API não retorna data de entrega específica
        carrierData: {
          fhbStatus: result.status,
          variableSymbol: result.variable_symbol,
          value: result.value,
          recipient: result.recipient
        }
      };
    } catch (error: any) {
      console.error("❌ FHB: Erro ao buscar status do pedido:", error);
      return null;
    }
  }

  async syncOrders(operationId: string): Promise<SyncResult> {
    console.log("🔄 FHB: Iniciando sincronização COMPLETA de pedidos para operação:", operationId);
    
    let ordersProcessed = 0;
    let ordersCreated = 0;
    let ordersUpdated = 0;
    const errors: string[] = [];

    try {
      // Para sync completa: buscar TODOS os pedidos históricos
      // Período de 2 anos para garantir que pegamos tudo
      const today = new Date();
      const twoYearsAgo = new Date(today.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
      const from = twoYearsAgo.toISOString().split('T')[0]; // formato: 2023-09-16
      const to = today.toISOString().split('T')[0]; // formato: 2025-09-16
      
      console.log(`📅 FHB: Buscando pedidos de ${from} até ${to}`);
      
      let page = 1;
      let hasMoreOrders = true;
      
      // Buscar pedidos Shopify existentes para fazer match por REF
      const { storage } = await import('../storage');
      const shopifyOrders = await storage.getOrdersByOperation(operationId);
      console.log(`📋 Carregados ${shopifyOrders.length} pedidos Shopify para match`);

      while (hasMoreOrders) { // Sem limite de páginas para sync completa
        try {
          const response = await this.makeAuthenticatedRequest(
            `/order/history?from=${from}&to=${to}&page=${page}`
          );
          const orders: FHBOrder[] = response.orders || response.data || [];

          if (!orders || orders.length === 0) {
            hasMoreOrders = false;
            break;
          }

          for (const fhbOrder of orders) {
            ordersProcessed++;
            
            try {
              console.log(`📦 FHB: Processando pedido ${fhbOrder.id} - Ref: ${fhbOrder.variable_symbol} - Status: ${fhbOrder.status}`);
              
              // MATCH POR REF: Buscar pedido Shopify correspondente pela referência
              const matchingShopifyOrder = shopifyOrders.find(order => {
                // Tentar diferentes formatos de match
                const shopifyRef = order.orderNumber || order.name || '';
                const fhbRef = fhbOrder.variable_symbol || '';
                
                return (
                  shopifyRef === fhbRef ||
                  shopifyRef === `#${fhbRef}` ||
                  shopifyRef.replace('#', '') === fhbRef ||
                  shopifyRef.split('-')[0] === fhbRef
                );
              });
              
              if (matchingShopifyOrder) {
                // ✅ MATCH ENCONTRADO: Atualizar status do pedido Shopify
                console.log(`✅ Match encontrado! Shopify ${matchingShopifyOrder.orderNumber} ↔ FHB ${fhbOrder.variable_symbol}`);
                
                await storage.updateOrder(matchingShopifyOrder.id, {
                  status: this.mapFHBStatusToInternal(fhbOrder.status),
                  trackingNumber: fhbOrder.tracking,
                  deliveryStatus: this.mapFHBStatusToInternal(fhbOrder.status),
                  externalData: {
                    ...matchingShopifyOrder.externalData,
                    fhb: {
                      orderId: fhbOrder.id,
                      status: fhbOrder.status,
                      variableSymbol: fhbOrder.variable_symbol,
                      tracking: fhbOrder.tracking,
                      value: fhbOrder.value,
                      updatedAt: new Date().toISOString()
                    }
                  }
                });
                ordersUpdated++;
              } else {
                // ❓ SEM MATCH: Pedido só existe na FHB (pode ser antigo ou de outro sistema)
                console.log(`ℹ️ Sem match para FHB ${fhbOrder.variable_symbol} - pedido só existe na transportadora`);
                
                // Opcionalmente criar como pedido órfão para rastreamento
                // (comentado para evitar duplicatas)
                /*
                await storage.createOrder({
                  externalId: `fhb_${fhbOrder.id}`,
                  operationId: operationId,
                  orderNumber: fhbOrder.variable_symbol,
                  customerName: fhbOrder.recipient?.address?.name || 'Nome não disponível',
                  total: parseFloat(fhbOrder.value) || 0,
                  status: this.mapFHBStatusToInternal(fhbOrder.status),
                  trackingNumber: fhbOrder.tracking,
                  source: 'fhb_only',
                  externalData: {
                    fhb: {
                      orderId: fhbOrder.id,
                      status: fhbOrder.status,
                      variableSymbol: fhbOrder.variable_symbol,
                      value: fhbOrder.value,
                      recipient: fhbOrder.recipient
                    }
                  },
                  createdAt: new Date(fhbOrder.created_at)
                });
                ordersCreated++;
                */
              }
            } catch (orderError: any) {
              console.error(`❌ Erro processando pedido ${fhbOrder.id}:`, orderError);
              errors.push(`Pedido ${fhbOrder.id}: ${orderError.message}`);
            }
          }

          page++;
        } catch (pageError: any) {
          console.error(`❌ Erro na página ${page}:`, pageError);
          errors.push(`Página ${page}: ${pageError.message}`);
          break;
        }
      }

      console.log(`✅ FHB Sync COMPLETO concluído:`);
      console.log(`   📊 ${ordersProcessed} pedidos FHB processados`);
      console.log(`   🔄 ${ordersUpdated} pedidos Shopify atualizados com status FHB`);
      console.log(`   📦 ${ordersCreated} pedidos órfãos encontrados (só na FHB)`);
      console.log(`   📅 Período: ${from} até ${to}`);
      
      return {
        success: true,
        ordersProcessed,
        ordersCreated,
        ordersUpdated,
        errors,
        message: `FHB: ${ordersUpdated} pedidos Shopify atualizados, ${ordersProcessed} processados`
      };
    } catch (error: any) {
      console.error("💥 FHB: Erro na sincronização:", error);
      return {
        success: false,
        ordersProcessed,
        ordersCreated,
        ordersUpdated,
        errors: [...errors, error.message]
      };
    }
  }

  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      console.log("🔧 FHB: Testando conexão...");
      
      // Testar autenticação primeiro
      const token = await this.authenticate();
      
      if (!token) {
        return {
          connected: false,
          message: "Falha na autenticação - verifique app_id e secret"
        };
      }

      // Usar o formato correto da documentação FHB: X-Authentication-Simple
      console.log("🧪 FHB: Testando com header X-Authentication-Simple...");
      
      // Usar endpoint correto da documentação: /order/history com parâmetros obrigatórios
      const today = new Date();
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const from = lastMonth.toISOString().split('T')[0]; // formato: 2019-01-01
      const to = today.toISOString().split('T')[0]; // formato: 2019-12-31
      
      const orders = await this.makeAuthenticatedRequest(`/order/history?from=${from}&to=${to}&page=1`);
      console.log("✅ FHB: Conexão testada com sucesso!");
      
      return {
        connected: true,
        message: "Conexão FHB estabelecida com sucesso"
      };
    } catch (error: any) {
      console.error("❌ FHB: Teste de conexão falhou:", error);
      return {
        connected: false,
        message: `Erro de conexão: ${error.message}`
      };
    }
  }

  // Método auxiliar para testar token direto no header
  private async makeDirectRequest(endpoint: string, token: string): Promise<any> {
    const headers: any = {
      "Content-Type": "application/json",
      "Authorization": token // Sem "Bearer " prefix
    };

    const url = `${this.fhbCredentials.apiUrl}${endpoint}`;
    
    console.log(`📡 FHB GET (direct) request to:`, url);
    console.log(`🔑 FHB Authorization header (direct):`, token.substring(0, 20) + "...");
    
    const response = await fetch(url, {
      method: "GET", 
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ FHB GET ${url} failed: ${response.status} ${errorText}`);
      throw new Error(`FHB API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Método auxiliar para testar sem header Authorization
  private async makeRequestWithoutAuth(endpoint: string): Promise<any> {
    const headers: any = {
      "Content-Type": "application/json"
    };

    const url = `${this.fhbCredentials.apiUrl}${endpoint}`;
    
    console.log(`📡 FHB GET (no auth header) request to:`, url);
    
    const response = await fetch(url, {
      method: "GET", 
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ FHB GET ${url} failed: ${response.status} ${errorText}`);
      throw new Error(`FHB API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Métodos opcionais específicos da FHB
  
  async getProducts(limit: number = 250): Promise<any[]> {
    try {
      const response = await this.makeAuthenticatedRequest(`/product?limit=${limit}`);
      return response.products || response.data || [];
    } catch (error: any) {
      console.error("❌ FHB: Erro ao buscar produtos:", error);
      return [];
    }
  }

  async createProduct(productData: any): Promise<{ success: boolean; message: string; productId?: string }> {
    try {
      const result = await this.makeAuthenticatedRequest("/product", "POST", productData);
      return {
        success: true,
        message: "Produto criado com sucesso",
        productId: result.id
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Erro ao criar produto: ${error.message}`
      };
    }
  }

  async getCountries(): Promise<string[]> {
    // FHB suporta vários países europeus
    return [
      'SK', 'CZ', 'AT', 'DE', 'HU', 'PL', 
      'SI', 'HR', 'RO', 'BG', 'EE', 'LV', 'LT'
    ];
  }

  // Helper method to map FHB status to internal status
  private mapFHBStatusToInternal(fhbStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'pending',
      'confirmed': 'processing',
      'sent': 'shipped',
      'delivered': 'delivered',
      'rejected': 'cancelled'
    };
    return statusMap[fhbStatus] || fhbStatus;
  }
}