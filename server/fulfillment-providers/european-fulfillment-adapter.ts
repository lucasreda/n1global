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
    
    // Importar todas as dependências no início para reusar
    const { db } = await import('../db.js');
    const { eq } = await import('drizzle-orm');

    try {
      console.log(`🔧 Iniciando busca de leads para operação ${operationId}`);
      
      // SEMPRE buscar o país da operação
      const { operations } = await import('../../shared/schema.js');
      
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
      
      // Mapear país da operação para NOME COMPLETO em inglês (API espera "spain", não "es")
      const countryMap: Record<string, string> = {
        'Portugal': 'portugal',
        'Itália': 'italy', 
        'Espanha': 'spain',
        'España': 'spain',
        'França': 'france',
        'Alemanha': 'germany',
        'Germany': 'germany',
        'France': 'france',
        'Italy': 'italy',
        'Spain': 'spain',
        'IT': 'italy',
        'ES': 'spain',
        'PT': 'portugal',
        'FR': 'france',
        'DE': 'germany',
        'it': 'italy',
        'es': 'spain',
        'pt': 'portugal',
        'fr': 'france',
        'de': 'germany'
      };
      
      const country = countryMap[operation.country] || operation.country.toLowerCase();
      console.log(`🌍 País da operação: ${operation.country} → País API: ${country}`);
      
      const service = await this.getEuropeanService();
      console.log(`✅ Serviço European Fulfillment obtido com sucesso`);
      
      // Buscar leads do European Fulfillment (últimos 30 dias)
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      console.log(`📅 Buscando leads desde: ${dateFrom} para país: ${country}`);
      
      const leads = await service.getLeadsListWithDateFilter(country, dateFrom);
      console.log(`📦 European Fulfillment: ${leads?.length || 0} leads encontrados`);
      
      // Importar storage dinamicamente
      const { storage } = await import('../storage.js');
      
      // Buscar a store da operação (operation.storeId)
      const { stores } = await import('../../shared/schema.js');
      
      if (!operation.storeId) {
        console.log('❌ Operação não tem storeId associado');
        return {
          success: false,
          ordersProcessed: 0,
          ordersCreated: 0,
          ordersUpdated: 0,
          errors: ['Operação não tem storeId associado']
        };
      }
      
      const storesResult = await db.select().from(stores).where(eq(stores.id, operation.storeId)).limit(1);
      const defaultStore = storesResult[0];
      
      if (!defaultStore) {
        console.log('❌ Loja não encontrada para storeId:', operation.storeId);
        return {
          success: false,
          ordersProcessed: 0,
          ordersCreated: 0,
          ordersUpdated: 0,
          errors: ['Loja não encontrada']
        };
      }
      
      const storeId = defaultStore.id;
      console.log(`🏪 Usando store_id: ${storeId} para importar leads`);
      
      for (const lead of leads) {
        try {
          ordersProcessed++;
          
          const leadNumber = lead.n_lead || lead.number || lead.lead_number || lead.id;
          const orderReference = lead.order_number || lead.order_ref || lead.reference || leadNumber;
          
          // 1. Tentar buscar pedido da Shopify por número de referência
          const { orders: ordersTable } = await import('../../shared/schema.js');
          const { and } = await import('drizzle-orm');
          
          const shopifyOrders = await db
            .select()
            .from(ordersTable)
            .where(
              and(
                eq(ordersTable.operationId, operationId),
                eq(ordersTable.dataSource, 'shopify'),
                eq(ordersTable.shopifyOrderNumber, orderReference)
              )
            );
          
          let matchedOrder = shopifyOrders[0];
          
          // 2. Se não encontrou por número, tentar por ID
          if (!matchedOrder && lead.order_id) {
            const ordersByShopifyId = await db
              .select()
              .from(ordersTable)
              .where(
                and(
                  eq(ordersTable.operationId, operationId),
                  eq(ordersTable.dataSource, 'shopify'),
                  eq(ordersTable.shopifyOrderId, lead.order_id)
                )
              );
            matchedOrder = ordersByShopifyId[0];
          }
          
          if (matchedOrder) {
            // 3. Pedido da Shopify encontrado - ATUALIZAR com informações da transportadora
            await db
              .update(ordersTable)
              .set({
                carrierImported: true,
                carrierOrderId: leadNumber,
                carrierMatchedAt: new Date(),
                status: this.mapLeadStatusToOrderStatus(lead.status),
                trackingNumber: lead.tracking_number || lead.tracking || matchedOrder.trackingNumber,
                lastStatusUpdate: new Date(),
                providerData: lead
              })
              .where(eq(ordersTable.id, matchedOrder.id));
            
            ordersUpdated++;
            console.log(`✅ Pedido Shopify ${orderReference} atualizado com lead ${leadNumber}`);
          } else {
            // 4. Pedido NÃO existe na Shopify - criar novo pedido da transportadora
            const newOrder = {
              id: leadNumber,
              storeId,
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
            console.log(`➕ Novo pedido criado da transportadora: ${leadNumber} (não encontrado na Shopify)`);
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
