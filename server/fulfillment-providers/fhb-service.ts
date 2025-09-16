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
    
    const headers: any = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token.token}`
    };

    const url = endpoint.startsWith('http') ? endpoint : `${this.fhbCredentials.apiUrl}${endpoint}`;
    
    console.log(`📡 FHB ${method} request to:`, url);
    console.log(`🔑 FHB Authorization header:`, `Bearer ${token.token.substring(0, 20)}...`);
    
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
    console.log("🔄 FHB: Iniciando sincronização de pedidos para operação:", operationId);
    
    let ordersProcessed = 0;
    let ordersCreated = 0;
    let ordersUpdated = 0;
    const errors: string[] = [];

    try {
      // Buscar histórico de pedidos (últimas páginas)
      let page = 1;
      const limit = 100; // Limite da API
      let hasMoreOrders = true;

      while (hasMoreOrders && page <= 5) { // Limitar a 5 páginas por sync
        try {
          const response = await this.makeAuthenticatedRequest(`/order/history?page=${page}&limit=${limit}`);
          const orders: FHBOrder[] = response.orders || response.data || [];

          if (!orders || orders.length === 0) {
            hasMoreOrders = false;
            break;
          }

          for (const fhbOrder of orders) {
            ordersProcessed++;
            
            try {
              // Aqui integramos com o sistema de pedidos existente
              // Por enquanto, vamos apenas contar as operações
              console.log(`📦 Processando pedido FHB: ${fhbOrder.id} - Status: ${fhbOrder.status}`);
              
              // Integrar com a storage para salvar/atualizar pedidos
              const { storage } = await import('../storage');
              const existingOrder = await storage.getOrderByExternalId(fhbOrder.id);
              
              if (existingOrder) {
                // Atualizar pedido existente
                await storage.updateOrder(existingOrder.id, {
                  status: this.mapFHBStatusToInternal(fhbOrder.status),
                  trackingNumber: fhbOrder.tracking,
                  externalData: {
                    fhbStatus: fhbOrder.status,
                    variableSymbol: fhbOrder.variable_symbol,
                    value: fhbOrder.value,
                    recipient: fhbOrder.recipient
                  }
                });
                ordersUpdated++;
              } else {
                // Criar novo pedido
                await storage.createOrder({
                  externalId: fhbOrder.id,
                  operationId: operationId,
                  orderNumber: fhbOrder.variable_symbol,
                  customerName: fhbOrder.recipient.address.name,
                  customerEmail: fhbOrder.recipient.contact,
                  total: parseFloat(fhbOrder.value) || 0,
                  status: this.mapFHBStatusToInternal(fhbOrder.status),
                  trackingNumber: fhbOrder.tracking,
                  shippingAddress: {
                    street: fhbOrder.recipient.address.street,
                    city: fhbOrder.recipient.address.city,
                    zip: fhbOrder.recipient.address.zip,
                    country: fhbOrder.recipient.address.country
                  },
                  items: fhbOrder.items.map(item => ({
                    sku: item.id,
                    quantity: item.quantity,
                    price: parseFloat(item.price || '0')
                  })),
                  externalData: {
                    fhbStatus: fhbOrder.status,
                    variableSymbol: fhbOrder.variable_symbol,
                    value: fhbOrder.value,
                    recipient: fhbOrder.recipient
                  },
                  createdAt: new Date(fhbOrder.created_at)
                });
                ordersCreated++;
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

      console.log(`✅ FHB Sync concluído: ${ordersProcessed} processados, ${ordersCreated} criados, ${ordersUpdated} atualizados`);
      
      return {
        success: true,
        ordersProcessed,
        ordersCreated,
        ordersUpdated,
        errors
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

      // Vamos tentar diferentes formatos de header para encontrar o correto
      console.log("🧪 FHB: Testando diferentes formatos de header...");
      
      // Teste 1: Token sem Bearer prefix
      try {
        console.log("🔍 FHB: Tentando token sem 'Bearer' prefix...");
        const response = await this.makeDirectRequest("/order?limit=1", token.token);
        console.log("✅ FHB: Sucesso com token sem Bearer prefix!");
        
        return {
          connected: true,
          message: "Conexão FHB estabelecida com sucesso (token direto)"
        };
      } catch (directError: any) {
        console.log("⚠️ FHB: Token direto falhou, continuando...");
      }

      // Teste 2: Token como query parameter
      try {
        console.log("🔍 FHB: Tentando token como query parameter...");
        const url = `/order?limit=1&token=${token.token}`;
        const response = await this.makeRequestWithoutAuth(url);
        console.log("✅ FHB: Sucesso com token como query parameter!");
        
        return {
          connected: true,
          message: "Conexão FHB estabelecida com sucesso (token como query)"
        };
      } catch (queryError: any) {
        console.log("⚠️ FHB: Token como query falhou, continuando...");
      }

      // Teste 3: Header Authorization com Bearer (original)
      const orders = await this.makeAuthenticatedRequest("/order?limit=1");
      console.log("✅ FHB: Sucesso com Bearer token!");
      
      return {
        connected: true,
        message: "Conexão FHB estabelecida com sucesso (Bearer token)"
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