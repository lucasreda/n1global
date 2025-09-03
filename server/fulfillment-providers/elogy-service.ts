// 🚚 eLogy Fulfillment Service
// Implementação específica para API eLogy seguindo sua documentação

import { BaseFulfillmentProvider, FulfillmentCredentials, FulfillmentToken, OrderResponse, OrderStatus, SyncResult } from './base-fulfillment-provider';
import fetch from 'node-fetch';
import https from 'https';

interface ElogyCredentials extends FulfillmentCredentials {
  authHeader?: string; // JWT fixo requerido pela API (opcional, tem padrão)
  warehouseId?: string; // ID do warehouse para consultas
  refreshToken?: string; // Token para renovação
  userId?: string; // ID do usuário para refresh
}

interface ElogyOrder {
  id: string;
  order_number: string;
  status: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  total: string;
  created_at: string;
  warehouse_id: string;
  items?: any[];
}

// Token padrão da eLogy para desenvolvimento/teste
const DEFAULT_ELOGY_AUTH_HEADER = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiSUdTb2x1dGlvbnMiLCJzdXJuYW1lIjoiR2F0ZURldiIsImlkIjotMjIxNTczOTQ5M30.9uI2zwCLqP4TrTaf6q9_jKinQOnU8NYjr0CiE3N8h0U";

export class ElogyService extends BaseFulfillmentProvider {
  private elogyCredentials: ElogyCredentials;
  
  constructor(credentials: ElogyCredentials) {
    super(credentials);
    // Usar token padrão se não fornecido
    this.elogyCredentials = {
      ...credentials,
      authHeader: credentials.authHeader || DEFAULT_ELOGY_AUTH_HEADER
    };
    
    console.log("eLogy Service initialized with token:", this.elogyCredentials.authHeader ? "✅" : "❌");
    console.log("eLogy Service email:", this.elogyCredentials.email || "Não configurado");
    console.log("eLogy Service warehouse:", this.elogyCredentials.warehouseId || "Não configurado");
  }

  async authenticate(): Promise<FulfillmentToken> {
    // Verificar se já temos token válido
    if (this.token && this.token.expiresAt > new Date()) {
      return this.token;
    }

    // Tentar refresh token primeiro se disponível
    if (this.elogyCredentials.refreshToken && this.elogyCredentials.userId) {
      try {
        return await this.refreshToken();
      } catch (error) {
        console.warn("⚠️ Refresh token falhou, fazendo login completo:", error);
      }
    }

    if (!this.elogyCredentials.email || !this.elogyCredentials.password) {
      throw new Error("❌ Credenciais eLogy incompletas. É necessário: email, password");
    }

    // Garantir que sempre temos o authorization header
    if (!this.elogyCredentials.authHeader) {
      this.elogyCredentials.authHeader = DEFAULT_ELOGY_AUTH_HEADER;
      console.log("🔑 Usando token eLogy padrão para autenticação");
    }

    const loginUrl = `${this.elogyCredentials.apiUrl || 'https://api.elogy.io'}/public-api/login`;
    
    console.log("🔐 eLogy: Tentando autenticação...", {
      url: loginUrl,
      email: this.elogyCredentials.email,
      hasAuthHeader: !!this.elogyCredentials.authHeader
    });

    try {
      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Authorization": this.elogyCredentials.authHeader!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: this.elogyCredentials.email,
          password: this.elogyCredentials.password,
          source: "api",
          host: "app.elogy.io"
        }),
        agent: new https.Agent({
          rejectUnauthorized: false // Allow self-signed certificates in development
        })
      });

      console.log("📡 eLogy Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ eLogy authentication failed:", response.status, errorText);
        throw new Error(`eLogy authentication failed: ${response.status} ${response.statusText}`);
      }

      // eLogy não retorna token no corpo - o Authorization header é o token
      // Definir expiração padrão de 4 horas
      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);
      
      this.token = {
        token: this.elogyCredentials.authHeader || DEFAULT_ELOGY_AUTH_HEADER,
        expiresAt,
      };

      console.log("✅ eLogy authentication successful! Token válido até:", expiresAt.toISOString());
      return this.token;
    } catch (error) {
      console.error("💥 eLogy authentication error:", error);
      throw new Error("Failed to authenticate with eLogy API");
    }
  }

  // Implementar refresh token conforme documentação oficial
  private async refreshToken(): Promise<FulfillmentToken> {
    if (!this.elogyCredentials.refreshToken || !this.elogyCredentials.userId) {
      throw new Error("Refresh token ou userId não disponível");
    }

    const refreshUrl = `${this.elogyCredentials.apiUrl || 'https://api.elogy.io'}/public-api/refresh`;
    
    console.log("🔄 eLogy: Renovando token...");

    try {
      const response = await fetch(refreshUrl, {
        method: "POST",
        headers: {
          "Authorization": this.elogyCredentials.authHeader!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh_token: this.elogyCredentials.refreshToken,
          user_id: this.elogyCredentials.userId
        }),
        agent: new https.Agent({
          rejectUnauthorized: false
        })
      });

      if (!response.ok) {
        throw new Error(`Refresh token failed: ${response.status}`);
      }

      // Token renovado com sucesso
      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);
      
      this.token = {
        token: this.elogyCredentials.authHeader!,
        expiresAt,
      };

      console.log("✅ eLogy token refreshed successfully!");
      return this.token;
    } catch (error) {
      console.error("💥 eLogy refresh token error:", error);
      throw error;
    }
  }

  protected async makeAuthenticatedRequest(endpoint: string, method: string = "GET", body?: any): Promise<any> {
    const token = await this.authenticate();
    
    const headers: any = {
      "Authorization": token.token,
      "Content-Type": "application/json",
    };

    const requestOptions: any = {
      method,
      headers,
      agent: new https.Agent({
        rejectUnauthorized: false
      })
    };

    if (body && (method === "POST" || method === "PATCH" || method === "PUT")) {
      requestOptions.body = JSON.stringify(body);
    }

    const apiUrl = this.elogyCredentials.apiUrl || 'https://api.elogy.io';
    const response = await fetch(`${apiUrl}/${endpoint}`, requestOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ eLogy API request failed:", response.status, errorText);
      throw new Error(`eLogy API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Verificar se há conteúdo na resposta
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    } else {
      // eLogy pode retornar respostas sem conteúdo para algumas operações
      return { success: true, status: response.status };
    }
  }

  // 🎯 Implementação dos métodos abstratos adaptados para eLogy

  async createOrder(orderData: any): Promise<OrderResponse> {
    if (this.simulationMode) {
      const mockOrderId = `ELOGY-${Date.now()}`;
      return {
        success: true,
        message: "Ordem criada com sucesso (modo simulado - eLogy)",
        orderId: mockOrderId,
        data: { orderId: mockOrderId, status: "pending" }
      };
    }

    try {
      // eLogy usa fluxo diferente - não "cria" orders, mas gerencia os existentes
      // Este método será usado para outras operações como printSticker
      console.warn("⚠️ eLogy não suporta criação direta de orders - use getOrdersToPrint() para gerenciar existentes");
      
      return {
        success: false,
        message: "eLogy não suporta criação de orders - use métodos específicos"
      };
    } catch (error) {
      console.error("Error in eLogy createOrder:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Erro desconhecido ao criar ordem eLogy"
      };
    }
  }

  async getOrderStatus(orderId: string): Promise<OrderStatus | null> {
    if (this.simulationMode) {
      const mockStatuses = ["pending", "confirmed", "printed", "shipped", "delivered"];
      const randomStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)];
      
      return {
        orderId,
        status: randomStatus,
        trackingNumber: orderId.startsWith("ELOGY-") ? `TRK${orderId.slice(6)}` : undefined,
        deliveryDate: randomStatus === "delivered" ? new Date().toISOString() : undefined
      };
    }

    try {
      // eLogy não tem endpoint específico de status individual na documentação
      // Implementaremos buscando na lista de orders
      console.warn("⚠️ eLogy: getOrderStatus individual não documentado - use syncOrders() para dados completos");
      return null;
    } catch (error) {
      console.error("Error getting eLogy order status:", error);
      return null;
    }
  }

  // 🚚 Métodos específicos da eLogy conforme documentação

  async getOrdersToPrint(): Promise<ElogyOrder[]> {
    if (this.simulationMode) {
      return [
        {
          id: "ELOGY-SIM-001",
          order_number: "ORD-001",
          status: "pending_print",
          customer_name: "Cliente Simulado",
          customer_email: "cliente@teste.com",
          total: "79.90",
          created_at: new Date().toISOString(),
          warehouse_id: this.elogyCredentials.warehouseId || "demo-warehouse"
        }
      ];
    }

    try {
      const warehouseId = this.elogyCredentials.warehouseId;
      if (!warehouseId) {
        throw new Error("warehouse_id é obrigatório para buscar orders eLogy");
      }

      // Endpoint conforme documentação
      const endpoint = `api/blockOrders?sort=order_number&sort_dir=asc&offset=0&length=15&warehouse_id=${warehouseId}`;
      const response = await this.makeAuthenticatedRequest(endpoint);
      
      console.log("📦 eLogy orders to print response:", response);
      
      // Adaptar resposta da eLogy para nosso formato padrão
      let orders: ElogyOrder[] = [];
      
      if (Array.isArray(response)) {
        orders = response;
      } else if (response.data && Array.isArray(response.data)) {
        orders = response.data;
      } else if (response.orders && Array.isArray(response.orders)) {
        orders = response.orders;
      }
      
      return orders;
    } catch (error) {
      console.error("Error getting eLogy orders to print:", error);
      return [];
    }
  }

  async printSticker(orderId: string, packages: number = 1, weight: string = "0.10", volume: string = "0.00024"): Promise<{ success: boolean; message: string }> {
    if (this.simulationMode) {
      return {
        success: true,
        message: `Etiqueta impressa com sucesso para order ${orderId} (simulado - eLogy)`
      };
    }

    try {
      // Usar endpoint correto conforme documentação oficial
      const response = await this.makeAuthenticatedRequest("api/gspedShipment", "POST", {
        orders: [{
          order_id: orderId,
          packages,
          weight,
          volume
        }]
      });

      console.log("🖨️ eLogy print sticker response:", response);

      return {
        success: true,
        message: "Etiqueta eLogy impressa com sucesso"
      };
    } catch (error) {
      console.error("Error printing eLogy sticker:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Erro ao imprimir etiqueta eLogy"
      };
    }
  }

  async getOrdersToConfirm(): Promise<any[]> {
    if (this.simulationMode) {
      return [
        {
          id: "ELOGY-CONF-001",
          order_number: "ORD-001", 
          status: "pending_confirmation",
          customer_name: "Cliente Confirmação",
          gsped_shipment_id: "69723512" // Para confirmar depois
        }
      ];
    }

    try {
      const warehouseId = this.elogyCredentials.warehouseId;
      if (!warehouseId) {
        throw new Error("warehouse_id é obrigatório para buscar orders to confirm eLogy");
      }

      // Endpoint correto conforme documentação
      const endpoint = `api/preparedToShip?sort=label_print_date&sort_dir=desc&offset=0&length=15&warehouse_id=${warehouseId}`;
      const response = await this.makeAuthenticatedRequest(endpoint);
      console.log("✅ eLogy orders to confirm response:", response);
      
      return Array.isArray(response) ? response : (response.data || []);
    } catch (error) {
      console.error("Error getting eLogy orders to confirm:", error);
      return [];
    }
  }

  async getDailyWaitingForCarrier(date?: string): Promise<any[]> {
    if (this.simulationMode) {
      return [
        {
          id: "ELOGY-DAILY-001",
          date: new Date().toISOString().split('T')[0],
          waiting_count: 5,
          status: "waiting_carrier"
        }
      ];
    }

    try {
      // Usar data atual se não fornecida
      const reportDate = date || new Date().toISOString();
      
      // Endpoint correto conforme documentação
      const endpoint = `api/reports/fullfillment?day=${encodeURIComponent(reportDate)}&sort=order_number&sort_dir=asc&offset=0&length=15&totals=0`;
      const response = await this.makeAuthenticatedRequest(endpoint);
      console.log("📊 eLogy daily waiting response:", response);
      
      return Array.isArray(response) ? response : (response.data || []);
    } catch (error) {
      console.error("Error getting eLogy daily waiting:", error);
      return [];
    }
  }

  // 🎯 Implementação obrigatória dos métodos abstratos

  async syncOrders(operationId: string): Promise<SyncResult> {
    console.log(`🔄 Iniciando sync eLogy para operação ${operationId}`);
    
    let ordersProcessed = 0;
    let ordersCreated = 0;
    let ordersUpdated = 0;
    let errors: string[] = [];

    try {
      // Buscar todos os orders da eLogy
      const ordersToPrint = await this.getOrdersToPrint();
      const ordersToConfirm = await this.getOrdersToConfirm();
      const dailyWaiting = await this.getDailyWaitingForCarrier();

      // Combinar todos os dados (implementação específica conforme necessário)
      const allOrders = [...ordersToPrint];
      
      console.log(`📦 eLogy sync: processando ${allOrders.length} orders`);

      for (const elogyOrder of allOrders) {
        try {
          ordersProcessed++;
          
          // Converter order eLogy para nosso formato padrão
          const standardOrder = this.convertElogyOrderToStandard(elogyOrder, operationId);
          
          // TODO: Integrar com nosso database (será implementado na próxima fase)
          console.log(`📝 Order convertida: ${elogyOrder.order_number} → ${standardOrder.id}`);
          ordersCreated++; // Por enquanto, assumir como criadas
          
        } catch (orderError) {
          console.error(`Error processing eLogy order ${elogyOrder.id}:`, orderError);
          errors.push(`Order ${elogyOrder.id}: ${orderError instanceof Error ? orderError.message : 'Unknown error'}`);
        }
      }

      console.log(`✅ eLogy sync completed: ${ordersProcessed} processed, ${ordersCreated} created, ${ordersUpdated} updated`);
      
      return {
        success: true,
        ordersProcessed,
        ordersCreated,
        ordersUpdated,
        errors
      };
    } catch (error) {
      console.error("eLogy sync error:", error);
      return {
        success: false,
        ordersProcessed,
        ordersCreated,
        ordersUpdated,
        errors: [...errors, error instanceof Error ? error.message : 'Unknown sync error']
      };
    }
  }

  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      // Tentar autenticar
      await this.authenticate();
      
      // Tentar buscar orders para confirmar conexão
      await this.getOrdersToPrint();
      
      return {
        connected: true,
        message: "Conexão eLogy estabelecida com sucesso"
      };
    } catch (error) {
      console.error("eLogy connection test failed:", error);
      return {
        connected: false,
        message: error instanceof Error ? error.message : "Erro de conexão eLogy"
      };
    }
  }

  // 🔄 Converter dados eLogy para formato padrão do sistema
  private convertElogyOrderToStandard(elogyOrder: ElogyOrder, operationId: string): any {
    // Mapear status eLogy para nossos status padrão
    const mapStatus = (elogyStatus: string) => {
      switch (elogyStatus?.toLowerCase()) {
        case 'pending_print':
        case 'pending':
          return 'pending';
        case 'confirmed':
          return 'confirmed';
        case 'printed':
        case 'shipped':
          return 'shipped';
        case 'delivered':
          return 'delivered';
        case 'cancelled':
        case 'canceled':
          return 'cancelled';
        default:
          return 'pending';
      }
    };

    return {
      id: `elogy_${elogyOrder.id}`, // Prefixo para identificar origem
      storeId: 'default', // Será substituído pelo contexto da operação
      operationId,
      
      // Source identification
      dataSource: 'carrier',
      carrierImported: true,
      carrierMatchedAt: new Date(),
      carrierOrderId: elogyOrder.id,
      
      // Customer info
      customerName: elogyOrder.customer_name || 'Cliente eLogy',
      customerEmail: elogyOrder.customer_email || '',
      customerPhone: elogyOrder.customer_phone || '',
      
      // Order details
      status: mapStatus(elogyOrder.status),
      paymentMethod: 'cod', // eLogy tipicamente trabalha com COD
      
      // Financial
      total: elogyOrder.total || '0',
      currency: 'EUR', // Assumir EUR como padrão
      
      // Provider info
      provider: 'elogy',
      providerOrderId: elogyOrder.order_number,
      
      // Provider specific data
      providerData: {
        warehouse_id: elogyOrder.warehouse_id,
        original_data: elogyOrder
      },
      
      // Timestamps
      orderDate: new Date(elogyOrder.created_at || Date.now()),
      lastStatusUpdate: new Date(),
    };
  }

  // 🛠️ Métodos específicos da eLogy conforme documentação oficial
  
  async printLabel(orderId: string): Promise<{ success: boolean; message: string }> {
    return this.printSticker(orderId);
  }
  
  // Confirmar múltiplos shipments e imprimir manifesto
  async confirmShipments(gspedShipmentIds: string[]): Promise<{ success: boolean; message: string }> {
    if (this.simulationMode) {
      return {
        success: true,
        message: `${gspedShipmentIds.length} shipments confirmados com sucesso (simulado - eLogy)`
      };
    }

    try {
      // Endpoint oficial: POST /api/gspedShipmentConfirm
      const response = await this.makeAuthenticatedRequest("api/gspedShipmentConfirm", "POST", gspedShipmentIds);
      console.log("✅ eLogy confirm shipments response:", response);

      return {
        success: true,
        message: `${gspedShipmentIds.length} shipments confirmados e manifesto gerado com sucesso`
      };
    } catch (error) {
      console.error("Error confirming eLogy shipments:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Erro ao confirmar shipments eLogy"
      };
    }
  }

  // Criar order completo conforme documentação
  async createFullOrder(orderData: {
    order_number: string;
    country: string;
    total_price: number;
    subtotal_price: number;
    shipping_price: number;
    currency: string;
    gateway: 'cashondelivery' | 'online';
    customer_first_name: string;
    customer_last_name: string;
    shipping_first_name: string;
    shipping_last_name: string;
    shipping_address1: string;
    shipping_city: string;
    shipping_zip: string;
    shipping_province_code: string;
    shipping_country_code: string;
    shipping_phone: string;
    shipping_email: string;
    products: Array<{
      sku: string;
      quantity: number;
      subtotal: number;
    }>;
    external_id?: string;
  }): Promise<OrderResponse> {
    if (this.simulationMode) {
      const mockOrderId = `ELOGY-FULL-${Date.now()}`;
      return {
        success: true,
        message: "Order completo criado com sucesso (simulado - eLogy)",
        orderId: mockOrderId,
        data: { orderId: mockOrderId, status: "pending" }
      };
    }

    try {
      // Adicionar campos obrigatórios
      const completeOrderData = {
        ...orderData,
        total_tax: 0,
        tax_included: 1,
        shipping_address2: "",
        shipping_notes: "",
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      };

      const response = await this.makeAuthenticatedRequest("api/orders", "POST", completeOrderData);
      console.log("📦 eLogy create full order response:", response);

      return {
        success: true,
        message: "Order eLogy criado com sucesso",
        orderId: response.id || response.order_id || orderData.order_number,
        data: response
      };
    } catch (error) {
      console.error("Error creating eLogy full order:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Erro ao criar order eLogy"
      };
    }
  }

  // Criar order simples (cf7Order)
  async createSimpleOrder(orderData: {
    first_name: string;
    last_name: string;
    sku: string;
    quantity: number;
    address: string;
    city: string;
    zip: string;
    province: string;
    country: string;
    total_price: number;
    subtotal_price: number;
    phone: string;
    email: string;
    gateway: 'online' | 'cashondelivery';
  }): Promise<OrderResponse> {
    if (this.simulationMode) {
      const mockOrderId = `ELOGY-SIMPLE-${Date.now()}`;
      return {
        success: true,
        message: "Order simples criado com sucesso (simulado - eLogy)",
        orderId: mockOrderId,
        data: { orderId: mockOrderId, status: "pending" }
      };
    }

    try {
      const response = await this.makeAuthenticatedRequest("api/cf7Order", "POST", orderData);
      console.log("📦 eLogy create simple order response:", response);

      return {
        success: true,
        message: "Order simples eLogy criado com sucesso",
        orderId: response.id || response.order_id,
        data: response
      };
    } catch (error) {
      console.error("Error creating eLogy simple order:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Erro ao criar order simples eLogy"
      };
    }
  }

  // Criar lead simples (cf7Lead)
  async createSimpleLead(leadData: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    sku: string;
    quantity: number;
    address: string;
    city: string;
    zip: string;
    province: string;
    country: string;
    total_price: number;
    subtotal_price: number;
  }): Promise<OrderResponse> {
    if (this.simulationMode) {
      const mockLeadId = `ELOGY-LEAD-${Date.now()}`;
      return {
        success: true,
        message: "Lead criado com sucesso (simulado - eLogy)",
        orderId: mockLeadId,
        data: { orderId: mockLeadId, status: "lead" }
      };
    }

    try {
      const response = await this.makeAuthenticatedRequest("api/cf7Lead", "POST", leadData);
      console.log("📝 eLogy create simple lead response:", response);

      return {
        success: true,
        message: "Lead eLogy criado com sucesso",
        orderId: response.id || response.lead_id,
        data: response
      };
    } catch (error) {
      console.error("Error creating eLogy simple lead:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Erro ao criar lead eLogy"
      };
    }
  }

  // Deletar orders por ID
  async deleteOrders(orderIds: string[]): Promise<{ success: boolean; message: string }> {
    if (this.simulationMode) {
      return {
        success: true,
        message: `${orderIds.length} orders deletados com sucesso (simulado - eLogy)`
      };
    }

    try {
      const response = await this.makeAuthenticatedRequest("api/deleteOrders", "POST", orderIds);
      console.log("🗑️ eLogy delete orders response:", response);

      return {
        success: true,
        message: `${orderIds.length} orders eLogy deletados com sucesso`
      };
    } catch (error) {
      console.error("Error deleting eLogy orders:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Erro ao deletar orders eLogy"
      };
    }
  }

  // Deletar orders por número
  async deleteOrdersByNumber(orderNumbers: string[]): Promise<{ success: boolean; message: string }> {
    if (this.simulationMode) {
      return {
        success: true,
        message: `Orders ${orderNumbers.join(', ')} deletados com sucesso (simulado - eLogy)`
      };
    }

    try {
      const response = await this.makeAuthenticatedRequest("api/deleteOrdersByNumber", "POST", orderNumbers);
      console.log("🗑️ eLogy delete orders by number response:", response);

      return {
        success: true,
        message: `Orders eLogy deletados com sucesso: ${orderNumbers.join(', ')}`
      };
    } catch (error) {
      console.error("Error deleting eLogy orders by number:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Erro ao deletar orders por número eLogy"
      };
    }
  }
}