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
    
    // TODO: Implementar sincronização de leads/pedidos com o banco de dados
    // Por enquanto, retornar resultado vazio
    return {
      success: true,
      ordersProcessed: 0,
      ordersCreated: 0,
      ordersUpdated: 0,
      errors: []
    };
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
