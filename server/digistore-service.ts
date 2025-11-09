import { z } from "zod";

// Interfaces baseadas na documentação da API Digistore24
export interface DigistoreCredentials {
  apiKey: string;
}

export interface DigistoreOrder {
  id?: string;
  delivery_id?: string;
  purchase_id: string;
  delivery_type: string;
  product_name?: string;
  
  // Endereço de entrega (objeto aninhado na resposta da API)
  delivery_address?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_no?: string;
    street?: string;
    street_number?: string;
    city?: string;
    state?: string;
    zipcode?: string;
    country?: string;
  };
  
  // Tracking
  tracking?: Array<{
    tracking_id?: string;
    parcel_service?: string;
  }>;
  
  // Datas
  purchase_created_at?: string;
}

export interface DigistoreTrackingInfo {
  tracking_number: string;
  tracking_url?: string;
  carrier?: string;
}

export class DigistoreService {
  private baseUrl = "https://www.digistore24.com/api/call";

  constructor(private credentials: DigistoreCredentials) {}

  /**
   * Testa a conexão com a API Digistore24 usando o endpoint /ping
   */
  async testConnection(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log(`🔗 Testando conexão Digistore24 com /ping`);
      
      // Validar formato da API Key
      if (!this.credentials.apiKey || this.credentials.apiKey.trim().length === 0) {
        return {
          success: false,
          error: 'API Key não pode estar vazia'
        };
      }

      const url = `${this.baseUrl}/ping`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-DS-API-KEY': this.credentials.apiKey,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro no ping Digistore24: ${response.status} - ${errorText}`);
        
        return {
          success: false,
          error: `Erro na autenticação: HTTP ${response.status}`
        };
      }

      const data = await response.json();
      console.log(`✅ Conexão Digistore24 estabelecida:`, data);
      
      return {
        success: true,
        data: {
          testSuccess: true,
          apiConnected: true,
          pingResponse: data
        }
      };
    } catch (error) {
      console.error('❌ Erro na validação Digistore24:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Lista entregas pendentes da Digistore24
   * Endpoint: GET /listDeliveries
   */
  async listOrders(params?: {
      from?: string; // YYYY-MM-DD
      to?: string; // YYYY-MM-DD
      type?: string; // 'request,in_progress,delivery'
      is_processed?: boolean;
      order_id?: string;
      delivery_id?: string;
      purchase_id?: string;
    }): Promise<any[]> {
    try {
      const url = new URL(`${this.baseUrl}/listDeliveries`);
      
      // Adicionar parâmetros de busca
      const searchParams: any = {
        type: params?.type || 'request,in_progress', // Entregas pendentes
      };

      if (params?.from) {
        searchParams.from = params.from;
      }

      if (params?.order_id) {
        searchParams.order_id = params.order_id;
      }

      if (params?.delivery_id) {
        searchParams.delivery_id = params.delivery_id;
      }

      if (params?.purchase_id) {
        searchParams.purchase_id = params.purchase_id;
      }
      
      if (params?.to) {
        searchParams.to = params.to;
      }

      if (params?.is_processed !== undefined) {
        searchParams.is_processed = params.is_processed;
      }

      // Construir query string
      Object.keys(searchParams).forEach(key => {
        url.searchParams.append(key, searchParams[key]);
      });

      console.log(`📦 Buscando entregas Digistore24: ${url.toString()}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'X-DS-API-KEY': this.credentials.apiKey,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro ao buscar entregas: ${response.status} - ${errorText}`);
        throw new Error(`Erro ao buscar entregas: HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // A resposta vem em { delivery: [...] }
      const deliveries = data.delivery || [];
      console.log(`✅ ${deliveries.length} entregas encontradas`);
      
      return deliveries;
    } catch (error) {
      console.error('❌ Erro ao listar entregas Digistore24:', error);
      throw error;
    }
  }

  /**
   * Busca um pedido específico pelo ID
   */
  async getOrder(orderId: string): Promise<DigistoreOrder | null> {
    try {
      const url = `${this.baseUrl}/orders/${orderId}`;
      console.log(`🔍 Buscando pedido Digistore24: ${orderId}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-DS-API-KEY': this.credentials.apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000),
      });

      if (response.status === 404) {
        console.log(`ℹ️ Pedido não encontrado: ${orderId}`);
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro ao buscar pedido Digistore24: ${response.status} - ${errorText}`);
        throw new Error(`Erro ao buscar pedido: HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Pedido Digistore24 encontrado: ${orderId}`);
      
      return data;
    } catch (error) {
      console.error(`❌ Erro ao buscar pedido ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Atualiza o status de entrega de um pedido
   * Envia informações de rastreamento de volta para a Digistore24
   * Endpoint: PUT /updateDelivery?delivery_id={id}&notify_via_email=true
   */
  async updateOrderStatus(
    deliveryId: string,
    status: 'shipped' | 'delivered' | 'cancelled',
    trackingInfo?: DigistoreTrackingInfo
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const url = new URL(`${this.baseUrl}/updateDelivery`);
      url.searchParams.append('delivery_id', deliveryId);
      url.searchParams.append('notify_via_email', 'true');

      console.log(`📤 Atualizando entrega Digistore24: ${deliveryId} -> ${status}`);

      // Construir payload conforme documentação
      const payload: any = {
        data: {
          type: status === 'shipped' ? 'delivery' : 'request',
          is_shipped: status === 'shipped',
          quantity_delivered: status === 'shipped' ? 1 : 0,
        }
      };

      // Adicionar tracking se fornecido
      if (trackingInfo && trackingInfo.tracking_number) {
        payload.tracking = [{
          parcel_service: trackingInfo.carrier || 'correios',
          tracking_id: trackingInfo.tracking_number,
          operation: 'create_or_update'
        }];
      }

      const response = await fetch(url.toString(), {
        method: 'PUT',
        headers: {
          'X-DS-API-KEY': this.credentials.apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro ao atualizar entrega: ${response.status} - ${errorText}`);
        
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }

      const result = await response.json();
      console.log(`✅ Entrega ${deliveryId} atualizada:`, result);
      
      return {
        success: true
      };
    } catch (error) {
      console.error(`❌ Erro ao atualizar entrega ${deliveryId}:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Cria um fulfillment (envio) para um pedido
   */
  async createFulfillment(
    orderId: string,
    trackingInfo: DigistoreTrackingInfo
  ): Promise<{ success: boolean; error?: string }> {
    return this.updateOrderStatus(orderId, 'shipped', trackingInfo);
  }
}

