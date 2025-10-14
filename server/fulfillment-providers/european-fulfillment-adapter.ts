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
          const customerPhone = lead.customer_phone || lead.phone || '';
          const customerEmail = lead.customer_email || lead.email || '';
          const customerName = lead.customer_name || lead.name || '';
          const customerCity = lead.shipping_city || lead.city || '';
          
          // 1. Buscar pedido da Shopify por múltiplos campos
          const { orders: ordersTable } = await import('../../shared/schema.js');
          const { and, or, like } = await import('drizzle-orm');
          
          let matchedOrder = null;
          let matchType = '';
          
          // PRIORIDADE 1: Buscar por telefone (normalizado)
          if (customerPhone) {
            const normalizedPhone = customerPhone.replace(/\D/g, '');
            
            if (normalizedPhone.length >= 9) {
              // Buscar por telefone usando LIKE para pegar os últimos 9 dígitos
              const last9Digits = normalizedPhone.slice(-9);
              
              const ordersByPhone = await db
                .select()
                .from(ordersTable)
                .where(
                  and(
                    eq(ordersTable.operationId, operationId),
                    eq(ordersTable.dataSource, 'shopify'),
                    like(ordersTable.customerPhone, `%${last9Digits}%`)
                  )
                )
                .limit(1);
              
              matchedOrder = ordersByPhone[0];
              if (matchedOrder) {
                matchType = 'telefone';
                console.log(`✅ Match por telefone! Lead ${leadNumber} → Pedido #${matchedOrder.shopifyOrderNumber}`);
              }
            }
          }
          
          // PRIORIDADE 2: Buscar por email
          if (!matchedOrder && customerEmail) {
            const ordersByEmail = await db
              .select()
              .from(ordersTable)
              .where(
                and(
                  eq(ordersTable.operationId, operationId),
                  eq(ordersTable.dataSource, 'shopify'),
                  eq(ordersTable.customerEmail, customerEmail.toLowerCase())
                )
              )
              .limit(1);
            
            matchedOrder = ordersByEmail[0];
            if (matchedOrder) {
              matchType = 'email';
              console.log(`✅ Match por email! Lead ${leadNumber} → Pedido #${matchedOrder.shopifyOrderNumber}`);
            }
          }
          
          // PRIORIDADE 3: Buscar por nome + cidade (quando não tem telefone/email)
          if (!matchedOrder && customerName && customerCity) {
            const ordersByNameCity = await db
              .select()
              .from(ordersTable)
              .where(
                and(
                  eq(ordersTable.operationId, operationId),
                  eq(ordersTable.dataSource, 'shopify'),
                  eq(ordersTable.customerName, customerName),
                  eq(ordersTable.customerCity, customerCity)
                )
              )
              .limit(1);
            
            matchedOrder = ordersByNameCity[0];
            if (matchedOrder) {
              matchType = 'nome+cidade';
              console.log(`✅ Match por nome+cidade! Lead ${leadNumber} → Pedido #${matchedOrder.shopifyOrderNumber}`);
            }
          }
          
          if (!matchedOrder) {
            console.log(`❌ Sem match: Lead ${leadNumber} (tel: ${customerPhone}, email: ${customerEmail}, nome: ${customerName}, cidade: ${customerCity})`);
          }
          
          if (matchedOrder) {
            // 3. Pedido da Shopify encontrado - ATUALIZAR com informações da transportadora
            const statusLivraison = lead.status_livrison || lead.status_livraison || '';
            const statusConfirmation = lead.status_confirmation || '';
            
            const mappedStatus = this.mapLeadStatusToOrderStatus(statusLivraison, statusConfirmation);
            
            console.log(`📦 Status da API: livraison="${statusLivraison}", confirmation="${statusConfirmation}" → Mapeado: "${mappedStatus}"`);
            
            await db
              .update(ordersTable)
              .set({
                carrierImported: true,
                carrierOrderId: leadNumber,
                carrierMatchedAt: new Date(),
                status: mappedStatus,
                trackingNumber: lead.tracking_number || lead.tracking || matchedOrder.trackingNumber,
                lastStatusUpdate: new Date(),
                providerData: lead
              })
              .where(eq(ordersTable.id, matchedOrder.id));
            
            ordersUpdated++;
            console.log(`✅ Pedido Shopify #${matchedOrder.shopifyOrderNumber} atualizado: lead ${leadNumber}, status: ${mappedStatus} (match por ${matchType})`);
          } else {
            // 4. Pedido NÃO encontrado - PULAR (não criar novo pedido)
            console.log(`⏭️ Lead ${leadNumber} pulado - sem match na Shopify`);
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

  private mapLeadStatusToOrderStatus(statusLivraison: string, statusConfirmation: string): string {
    // Prioridade: status de entrega (livraison) primeiro
    const livraison = statusLivraison?.toLowerCase() || '';
    const confirmation = statusConfirmation?.toLowerCase() || '';
    
    // 1. Status FINAIS de entrega (prioridade máxima)
    if (livraison === 'delivered' || livraison === 'livré') return 'delivered';
    if (livraison === 'returned' || livraison === 'retourné') return 'returned';
    if (livraison === 'rejected') return 'cancelled';
    
    // 2. Status EM TRÂNSITO
    if (livraison === 'in transit' || livraison === 'in delivery' || livraison === 'shipped' || livraison === 'expédié' || livraison === 'expedition') return 'shipped';
    
    // 3. Status PROCESSANDO/PREPARANDO
    if (livraison === 'unpacked' || livraison === 'déballé' || livraison === 'proseccing' || livraison === 'processing' || livraison === 'redeployment') return 'confirmed';
    
    // 4. Status de CONFIRMAÇÃO (quando livraison não define)
    if (confirmation === 'confirmed' || confirmation === 'confirmé') return 'confirmed';
    if (confirmation === 'canceled' || confirmation === 'cancelled' || confirmation === 'annulé' || confirmation === 'canceled by system') return 'cancelled';
    
    // 5. INCIDENTE ou status desconhecido
    if (livraison === 'incident') return 'pending';
    
    return 'pending';
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
