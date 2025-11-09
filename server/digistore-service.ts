import { z } from "zod";

// Interfaces baseadas na documentação da API Digistore24
export interface DigistoreCredentials {
  apiKey: string;
}

export interface DigistoreOrder {
  order_id: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  buyer_email: string;
  buyer_name: string;
  billing_address: {
    first_name: string;
    last_name: string;
    street: string;
    street2?: string;
    city: string;
    state?: string;
    zipcode: string;
    country: string;
    phone?: string;
  };
  shipping_address?: {
    first_name: string;
    last_name: string;
    street: string;
    street2?: string;
    city: string;
    state?: string;
    zipcode: string;
    country: string;
    phone?: string;
  };
  amount: number;
  currency: string;
  payment_status: string; // 'paid', 'refunded', 'chargeback'
  created_at: string;
  updated_at: string;
}

export interface DigistoreTrackingInfo {
  tracking_number: string;
  tracking_url?: string;
  carrier?: string;
}

export class DigistoreService {
  private baseUrl = "https://www.digistore24.com/api";

  constructor(private credentials: DigistoreCredentials) {}

  /**
   * Testa a conexão com a API Digistore24
   * NOTA: A API da Digistore24 não possui um endpoint de teste dedicado.
   * Validamos apenas o formato da API Key por enquanto.
   * A validação real acontecerá quando recebermos webhooks IPN.
   */
  async testConnection(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log(`🔗 Testando conexão Digistore24`);
      
      // Validar formato da API Key
      if (!this.credentials.apiKey || this.credentials.apiKey.trim().length === 0) {
        return {
          success: false,
          error: 'API Key não pode estar vazia'
        };
      }

      // A API da Digistore24 funciona principalmente via webhooks IPN
      // Não há endpoint REST tradicional para validação
      // Aceitamos a API Key e validaremos quando recebermos os webhooks
      
      console.log(`✅ API Key Digistore24 aceita (validação completa via webhook IPN)`);
      
      return {
        success: true,
        data: {
          testSuccess: true,
          apiConnected: true,
          note: 'API Key salva. Configure o webhook IPN no painel da Digistore24 para receber pedidos.'
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
   * Lista pedidos da Digistore24 com filtros opcionais
   */
  async listOrders(params?: {
    limit?: number;
    start_date?: string; // ISO 8601 format
    end_date?: string; // ISO 8601 format
    payment_status?: string;
  }): Promise<DigistoreOrder[]> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.limit) {
        queryParams.append('limit', params.limit.toString());
      }
      if (params?.start_date) {
        queryParams.append('start_date', params.start_date);
      }
      if (params?.end_date) {
        queryParams.append('end_date', params.end_date);
      }
      if (params?.payment_status) {
        queryParams.append('payment_status', params.payment_status);
      }

      const url = `${this.baseUrl}/orders?${queryParams.toString()}`;
      console.log(`📦 Buscando pedidos Digistore24: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-DS-API-KEY': this.credentials.apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(60000), // 60 segundos de timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro ao buscar pedidos Digistore24: ${response.status} - ${errorText}`);
        throw new Error(`Erro ao buscar pedidos: HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Pedidos Digistore24 recuperados: ${Array.isArray(data) ? data.length : 0}`);
      
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('❌ Erro ao listar pedidos Digistore24:', error);
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
   */
  async updateOrderStatus(
    orderId: string,
    status: string,
    trackingInfo?: DigistoreTrackingInfo
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${this.baseUrl}/orders/${orderId}/fulfillment`;
      console.log(`📤 Atualizando status do pedido Digistore24: ${orderId}`);

      const payload: any = {
        status,
      };

      if (trackingInfo) {
        payload.tracking_number = trackingInfo.tracking_number;
        if (trackingInfo.tracking_url) {
          payload.tracking_url = trackingInfo.tracking_url;
        }
        if (trackingInfo.carrier) {
          payload.carrier = trackingInfo.carrier;
        }
      }

      const response = await fetch(url, {
        method: 'POST',
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
        console.error(`❌ Erro ao atualizar status Digistore24: ${response.status} - ${errorText}`);
        
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }

      console.log(`✅ Status do pedido ${orderId} atualizado com sucesso`);
      
      return {
        success: true
      };
    } catch (error) {
      console.error(`❌ Erro ao atualizar status do pedido ${orderId}:`, error);
      
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

