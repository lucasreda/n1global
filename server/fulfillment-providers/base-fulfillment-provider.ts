// 🎯 Interface abstrata para padronizar operações de fulfillment
// Permite múltiplas transportadoras com APIs diferentes

export interface FulfillmentCredentials {
  email: string;
  password: string;
  apiUrl?: string;
  authHeader?: string; // Para APIs como eLogy que precisam de header fixo
  warehouseId?: string; // Para eLogy
  [key: string]: any; // Campos específicos por provider
}

export interface FulfillmentToken {
  token: string;
  expiresAt: Date;
  refreshToken?: string;
  userId?: string;
}

export interface OrderResponse {
  success: boolean;
  message: string;
  orderId?: string;
  trackingNumber?: string;
  data?: any;
}

export interface OrderStatus {
  orderId: string;
  status: string;
  trackingNumber?: string;
  deliveryDate?: string;
  carrierData?: any;
}

export interface SyncResult {
  success: boolean;
  ordersProcessed: number;
  ordersCreated: number;
  ordersUpdated: number;
  errors: string[];
}

// 🎯 Interface base que todas as transportadoras devem implementar
export abstract class BaseFulfillmentProvider {
  protected credentials: FulfillmentCredentials;
  protected token: FulfillmentToken | null = null;
  protected simulationMode: boolean = false;
  
  constructor(credentials: FulfillmentCredentials) {
    this.credentials = credentials;
  }

  // Métodos abstratos que cada provider deve implementar
  abstract authenticate(): Promise<FulfillmentToken>;
  abstract createOrder(orderData: any): Promise<OrderResponse>;
  abstract getOrderStatus(orderId: string): Promise<OrderStatus | null>;
  abstract syncOrders(operationId: string): Promise<SyncResult>;
  abstract testConnection(): Promise<{ connected: boolean; message: string }>;
  
  // Métodos opcionais que nem todos providers terão
  async getCountries?(): Promise<string[]>;
  async getWarehouses?(): Promise<any[]>;
  async printLabel?(orderId: string): Promise<{ success: boolean; message: string }>;
  async confirmOrder?(orderId: string): Promise<{ success: boolean; message: string }>;
  
  // Métodos comuns
  updateCredentials(newCredentials: Partial<FulfillmentCredentials>): void {
    this.credentials = { ...this.credentials, ...newCredentials };
    this.token = null; // Clear existing token to force re-authentication
  }
  
  enableSimulation(): void {
    this.simulationMode = true;
  }
  
  disableSimulation(): void {
    this.simulationMode = false;
  }
  
  protected async makeAuthenticatedRequest(endpoint: string, method: string = "GET", body?: any): Promise<any> {
    // Implementação base que pode ser sobrescrita por cada provider
    throw new Error("makeAuthenticatedRequest deve ser implementado por cada provider específico");
  }
}