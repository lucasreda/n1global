// 🎯 Adapter para European Fulfillment Service implementar BaseFulfillmentProvider
import { 
  BaseFulfillmentProvider, 
  FulfillmentCredentials, 
  FulfillmentToken,
  OrderResponse,
  OrderStatus,
  SyncResult
} from './base-fulfillment-provider.js';

// Importação dinâmica do EuropeanFulfillmentService
let EuropeanFulfillmentServiceClass: any;

export class EuropeanFulfillmentAdapter extends BaseFulfillmentProvider {
  private europeanService: any;

  constructor(credentials: FulfillmentCredentials) {
    super(credentials);
  }

  private async getEuropeanService() {
    if (!this.europeanService) {
      if (!EuropeanFulfillmentServiceClass) {
        const module = await import('../fulfillment-service.js');
        EuropeanFulfillmentServiceClass = module.EuropeanFulfillmentService;
      }
      this.europeanService = new EuropeanFulfillmentServiceClass(
        this.credentials.email,
        this.credentials.password,
        this.credentials.apiUrl
      );
    }
    return this.europeanService;
  }

  async authenticate(): Promise<FulfillmentToken> {
    const service = await this.getEuropeanService();
    const token = await service.getAuthToken();
    
    return {
      token: token.token,
      expiresAt: token.expiresAt,
      refreshToken: token.refreshToken,
      userId: token.userId
    };
  }

  async createOrder(orderData: any): Promise<OrderResponse> {
    const service = await this.getEuropeanService();
    
    // European Fulfillment usa "leads" em vez de "orders"
    const result = await service.createLead(orderData);
    
    return {
      success: result.success,
      message: result.message,
      orderId: result.leadNumber,
      trackingNumber: result.trackingNumber,
      data: result.data
    };
  }

  async getOrderStatus(orderId: string): Promise<OrderStatus | null> {
    const service = await this.getEuropeanService();
    
    // European Fulfillment usa "leads" em vez de "orders"
    const status = await service.getLeadStatus(orderId);
    
    if (!status) return null;
    
    return {
      orderId: status.leadNumber || orderId,
      status: status.status,
      trackingNumber: status.trackingNumber,
      deliveryDate: status.deliveryDate,
      carrierData: status.carrierData
    };
  }

  async syncOrders(operationId: string): Promise<SyncResult> {
    console.log(`🔄 European Fulfillment Adapter: Sincronizando pedidos para operação ${operationId}`);
    
    let ordersProcessed = 0;
    let ordersCreated = 0;
    let ordersUpdated = 0;
    let errors: string[] = [];

    try {
      console.log(`🔧 Iniciando busca de leads para operação ${operationId}`);
      
      // Buscar a operação diretamente do banco
      const { db } = await import('../db.js');
      const { operations } = await import('../../shared/schema.js');
      const { eq } = await import('drizzle-orm');
      
      const [operation] = await db.select().from(operations).where(eq(operations.id, operationId));
      
      if (!operation) {
        return {
          success: false,
          ordersProcessed: 0,
          ordersCreated: 0,
          ordersUpdated: 0,
          errors: ['Operação não encontrada']
        };
      }
      
      // Mapear país da operação para o formato esperado pela API
      const countryMap: Record<string, string> = {
        'Portugal': 'PORTUGAL',
        'Itália': 'ITALY',
        'Espanha': 'SPAIN',
        'França': 'FRANCE',
        'Alemanha': 'GERMANY'
      };
      
      const country = countryMap[operation.country] || operation.country.toUpperCase();
      console.log(`🌍 País da operação: ${operation.country} → API: ${country}`);
      
      const service = await this.getEuropeanService();
      console.log(`✅ Serviço European Fulfillment obtido com sucesso`);
      
      // Buscar leads do European Fulfillment (últimos 30 dias)
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      console.log(`📅 Buscando leads desde: ${dateFrom} para país: ${country}`);
      
      const leads = await service.getLeadsListWithDateFilter(country, dateFrom);
      console.log(`📦 European Fulfillment: ${leads?.length || 0} leads encontrados`);
      
      for (const lead of leads) {
        try {
          ordersProcessed++;
          
          const leadNumber = lead.number || lead.lead_number || lead.id;
          
          // Verificar se o pedido já existe (por carrierOrderId)
          const existingOrder = await storage.getOrderByCarrierId(leadNumber, operationId);
          
          if (existingOrder) {
            // Atualizar status se mudou
            if (existingOrder.status !== lead.status) {
              await storage.updateOrderStatus(existingOrder.id, {
                status: this.mapLeadStatusToOrderStatus(lead.status),
                lastStatusUpdate: new Date(),
                providerData: lead
              });
              ordersUpdated++;
              console.log(`📝 Order ${leadNumber} atualizado: ${lead.status}`);
            }
          } else {
            // Criar novo pedido do carrier
            const newOrder = {
              id: leadNumber, // Use lead number as primary key
              storeId: '', // Will be filled by storage
              operationId,
              dataSource: 'carrier' as const,
              carrierImported: true,
              carrierOrderId: leadNumber,
              carrierMatchedAt: new Date(),
              
              customerName: lead.customer_name || lead.name || '',
              customerEmail: lead.customer_email || lead.email || '',
              customerPhone: lead.customer_phone || lead.phone || '',
              customerAddress: lead.shipping_address || lead.address || '',
              customerCity: lead.shipping_city || lead.city || '',
              customerCountry: lead.shipping_country || lead.country || '',
              customerZip: lead.shipping_zip || lead.zip || '',
              
              status: this.mapLeadStatusToOrderStatus(lead.status),
              paymentMethod: 'cod',
              
              total: lead.total || '0',
              productCost: lead.product_cost || '0',
              shippingCost: lead.shipping_cost || '0',
              currency: 'EUR',
              
              products: lead.items || lead.products || [],
              provider: 'european_fulfillment',
              trackingNumber: lead.tracking_number || lead.tracking || '',
              providerData: lead,
              
              orderDate: lead.created_at ? new Date(lead.created_at) : new Date(),
              lastStatusUpdate: new Date()
            };
            
            await storage.createOrder(newOrder as any);
            ordersCreated++;
            console.log(`✨ Novo order criado: ${leadNumber}`);
          }
          
        } catch (orderError) {
          console.error(`❌ Erro processando lead ${lead.number}:`, orderError);
          errors.push(`Lead ${lead.number}: ${orderError instanceof Error ? orderError.message : 'Unknown error'}`);
        }
      }

      console.log(`✅ European Fulfillment sync completo: ${ordersProcessed} processados, ${ordersCreated} criados, ${ordersUpdated} atualizados`);
      
      return {
        success: true,
        ordersProcessed,
        ordersCreated,
        ordersUpdated,
        errors
      };
      
    } catch (error) {
      console.error("❌ European Fulfillment sync error:", error);
      return {
        success: false,
        ordersProcessed,
        ordersCreated,
        ordersUpdated,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private mapLeadStatusToOrderStatus(leadStatus: string): string {
    // Mapear status do European Fulfillment para nosso padrão
    const statusMap: Record<string, string> = {
      'pending': 'pending',
      'confirmed': 'confirmed',
      'shipped': 'shipped',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'returned': 'returned'
    };
    
    return statusMap[leadStatus?.toLowerCase()] || 'pending';
  }

  async testConnection(): Promise<{ connected: boolean; message: string }> {
    const service = await this.getEuropeanService();
    const result = await service.testConnection();
    
    return {
      connected: result.connected,
      message: result.message
    };
  }
}
