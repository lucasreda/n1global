import { z } from "zod";

// Interfaces baseadas na documentação da API CartPanda
export interface CartPandaCredentials {
  storeSlug: string;
  bearerToken: string;
}

export interface CartPandaOrder {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  payment_status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
  line_items: Array<{
    variant_id: number;
    quantity: number;
    price: number;
    name: string;
  }>;
  customer: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    cpf?: string;
  };
  shipping_address: {
    address1: string;
    address2?: string;
    city: string;
    province: string;
    zip: string;
    country: string;
    name: string;
    phone: string;
  };
  billing_address?: {
    address1: string;
    address2?: string;
    city: string;
    province: string;
    zip: string;
    country: string;
    name: string;
    phone: string;
  };
}

export interface CartPandaFulfillment {
  id: string;
  order_id: string;
  tracking_company: string;
  tracking_number: string;
  tracking_url?: string;
  status: string;
  line_items: Array<{
    variant_id: number;
    quantity: number;
  }>;
  created_at: string;
  updated_at: string;
}

export class CartPandaService {
  private baseUrl = "https://accounts.cartpanda.com/api";

  constructor(private credentials: CartPandaCredentials) {}

  /**
   * Testa a conexão com a loja CartPanda
   */
  async testConnection(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log(`🔗 Testando conexão CartPanda: ${this.credentials.storeSlug}`);
      
      // Testar a conexão fazendo uma chamada para listar pedidos com limite 1
      const url = `${this.baseUrl}/${this.credentials.storeSlug}/orders?limit=1`;
      console.log(`🌐 URL completa da requisição: ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.credentials.bearerToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000), // 30 segundos de timeout
      });

      console.log(`📊 Resposta CartPanda: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro CartPanda: ${response.status} - ${errorText}`);
        
        let userFriendlyError = `HTTP ${response.status}`;
        if (response.status === 401) {
          userFriendlyError = 'Token de acesso inválido ou expirado';
        } else if (response.status === 403) {
          userFriendlyError = 'Acesso negado. Verifique as permissões do token';
        } else if (response.status === 404) {
          userFriendlyError = 'Loja não encontrada. Verifique o store slug';
        }
        
        return {
          success: false,
          error: userFriendlyError
        };
      }

      const data = await response.json();
      console.log(`✅ Loja CartPanda conectada: ${this.credentials.storeSlug}`);
      
      return {
        success: true,
        data: {
          storeSlug: this.credentials.storeSlug,
          testSuccess: true,
          ordersCount: Array.isArray(data) ? data.length : 0
        }
      };
    } catch (error) {
      console.error('❌ Erro na conexão CartPanda:', error);
      
      let userFriendlyError = 'Erro desconhecido';
      if (error instanceof Error) {
        if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
          userFriendlyError = 'Servidor não encontrado. Verifique a configuração da API';
        } else if (error.message.includes('ECONNREFUSED')) {
          userFriendlyError = 'Conexão recusada. Servidor pode estar indisponível';
        } else if (error.message.includes('timeout')) {
          userFriendlyError = 'Timeout na conexão. Tente novamente';
        } else {
          userFriendlyError = error.message;
        }
      }
      
      return {
        success: false,
        error: userFriendlyError
      };
    }
  }

  /**
   * Lista pedidos da loja CartPanda
   */
  async listOrders(params?: {
    created_at_min?: string;
    created_at_max?: string;
    status?: string;
    payment_status?: number;
    email?: string;
    opt_in?: string;
    payment_gateway_id?: string;
    updated_at_min?: string;
    updated_at_max?: string;
  }): Promise<CartPandaOrder[]> {
    try {
      const queryParams = new URLSearchParams();
      // Usando parâmetros corretos da documentação CartPanda
      if (params?.created_at_min) queryParams.append('created_at_min', params.created_at_min);
      if (params?.created_at_max) queryParams.append('created_at_max', params.created_at_max);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.payment_status !== undefined) queryParams.append('payment_status', params.payment_status.toString());
      if (params?.email) queryParams.append('email', params.email);
      if (params?.opt_in) queryParams.append('opt_in', params.opt_in);
      if (params?.payment_gateway_id) queryParams.append('payment_gateway_id', params.payment_gateway_id);
      if (params?.updated_at_min) queryParams.append('updated_at_min', params.updated_at_min);
      if (params?.updated_at_max) queryParams.append('updated_at_max', params.updated_at_max);

      const url = `${this.baseUrl}/${this.credentials.storeSlug}/orders?${queryParams.toString()}`;
      console.log(`📊 Buscando pedidos CartPanda: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.credentials.bearerToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(60000), // 60 segundos de timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro ao buscar pedidos: ${response.status} - ${errorText}`);
        throw new Error(`Erro ao buscar pedidos: HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`📋 Estrutura da resposta CartPanda:`, JSON.stringify(data, null, 2));
      
      // CartPanda retorna: { orders: { data: [], total: 0, ... } }
      const orders = data.orders?.data || data.data || data.orders || [];
      const total = data.orders?.total || data.total || orders.length;
      
      console.log(`✅ ${orders.length} pedidos encontrados de ${total} total na loja`);
      console.log(`🔍 Parâmetros utilizados:`, params);
      console.log(`🎯 URL da requisição: ${url}`);
      console.log(`🔐 Store slug: ${this.credentials.storeSlug}`);
      console.log(`🔑 Token iniciado com: ${this.credentials.bearerToken.substring(0, 10)}...`);
      
      if (total === 0) {
        console.log(`⚠️ PROBLEMA: Loja não retorna pedidos com os parâmetros atuais`);
        console.log(`💡 SUGESTÃO: Verifique se a loja '${this.credentials.storeSlug}' está correta`);
        console.log(`💡 SUGESTÃO: Verifique se o token tem permissões para acessar pedidos`);
      }
      
      return orders;
    } catch (error) {
      console.error('❌ Erro ao listar pedidos:', error);
      throw error;
    }
  }

  /**
   * Obtém detalhes de um pedido específico
   */
  async getOrder(orderId: string): Promise<CartPandaOrder> {
    try {
      const url = `${this.baseUrl}/${this.credentials.storeSlug}/orders/${orderId}`;
      console.log(`📋 Buscando pedido CartPanda: ${orderId}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.credentials.bearerToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro ao buscar pedido: ${response.status} - ${errorText}`);
        throw new Error(`Erro ao buscar pedido: HTTP ${response.status}`);
      }

      const order = await response.json();
      console.log(`✅ Pedido encontrado: ${order.name || orderId}`);
      return order;
    } catch (error) {
      console.error('❌ Erro ao obter pedido:', error);
      throw error;
    }
  }

  /**
   * Cria um fulfillment para um pedido
   */
  async createFulfillment(data: {
    order_id: string;
    tracking_company: string;
    tracking_number: string;
    tracking_url?: string;
    line_items: Array<{
      variant_id: number;
      quantity: number;
    }>;
  }): Promise<CartPandaFulfillment> {
    try {
      const url = `${this.baseUrl}/${this.credentials.storeSlug}/fulfillment`;
      console.log(`📦 Criando fulfillment CartPanda para pedido: ${data.order_id}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.credentials.bearerToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro ao criar fulfillment: ${response.status} - ${errorText}`);
        throw new Error(`Erro ao criar fulfillment: HTTP ${response.status}`);
      }

      const fulfillment = await response.json();
      console.log(`✅ Fulfillment criado: ${fulfillment.id}`);
      return fulfillment;
    } catch (error) {
      console.error('❌ Erro ao criar fulfillment:', error);
      throw error;
    }
  }

  /**
   * Atualiza um fulfillment existente
   */
  async updateFulfillment(fulfillmentId: string, data: {
    tracking_company?: string;
    tracking_number?: string;
    tracking_url?: string;
  }): Promise<CartPandaFulfillment> {
    try {
      const url = `${this.baseUrl}/${this.credentials.storeSlug}/fulfillment/${fulfillmentId}`;
      console.log(`📦 Atualizando fulfillment CartPanda: ${fulfillmentId}`);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.credentials.bearerToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro ao atualizar fulfillment: ${response.status} - ${errorText}`);
        throw new Error(`Erro ao atualizar fulfillment: HTTP ${response.status}`);
      }

      const fulfillment = await response.json();
      console.log(`✅ Fulfillment atualizado: ${fulfillment.id}`);
      return fulfillment;
    } catch (error) {
      console.error('❌ Erro ao atualizar fulfillment:', error);
      throw error;
    }
  }

  /**
   * Lista fulfillments de um pedido
   */
  async listFulfillments(orderId?: string): Promise<CartPandaFulfillment[]> {
    try {
      const queryParams = new URLSearchParams();
      if (orderId) queryParams.append('order_id', orderId);

      const url = `${this.baseUrl}/${this.credentials.storeSlug}/fulfillment?${queryParams.toString()}`;
      console.log(`📦 Buscando fulfillments CartPanda`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.credentials.bearerToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro ao buscar fulfillments: ${response.status} - ${errorText}`);
        throw new Error(`Erro ao buscar fulfillments: HTTP ${response.status}`);
      }

      const fulfillments = await response.json();
      console.log(`✅ ${fulfillments.length} fulfillments encontrados`);
      return fulfillments;
    } catch (error) {
      console.error('❌ Erro ao listar fulfillments:', error);
      throw error;
    }
  }
}