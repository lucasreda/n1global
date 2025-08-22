import fetch, { Response } from "node-fetch";
import { randomUUID } from "crypto";
import https from "https";
// Removed unused imports

// Disable SSL verification for development
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

interface EuropeanFulfillmentCredentials {
  email: string;
  password: string;
  apiUrl: string;
}

interface EuropeanFulfillmentToken {
  token: string;
  expiresAt: Date;
}

interface LeadItem {
  sku: string;
  quantity: string;
  total: string;
}

interface CreateLeadRequest {
  name_costumer: string;
  mobile: string;
  email?: string;
  province: string;
  zipcode: string;
  city: string;
  address: string;
  country: string;
  total: string;
  payment_type: "COD" | "prepaid";
  order_number?: string;
  items: LeadItem[];
}

interface LeadResponse {
  success: boolean;
  message: string;
  lead_number?: string;
  data?: any;
}

interface LeadStatus {
  lead_number: string;
  status: string;
  tracking_number?: string;
  delivery_date?: string;
}

class EuropeanFulfillmentService {
  private credentials: EuropeanFulfillmentCredentials;
  private token: EuropeanFulfillmentToken | null = null;
  private simulationMode: boolean = false;

  constructor(email?: string, password?: string, apiUrl?: string) {
    // Initialize with user-specific credentials if provided
    this.credentials = {
      email: email || "",
      password: password || "",
      apiUrl: apiUrl || "https://api.ecomfulfilment.eu/"
    };
    
    if (email && password) {
      console.log("European Fulfillment Service initialized with user credentials:", this.credentials.email);
    } else {
      console.log("European Fulfillment Service initialized without credentials - must be configured");
    }
  }

  // Method to update credentials (for when user provides their own)
  updateCredentials(email: string, password: string, apiUrl?: string) {
    this.credentials.email = email;
    this.credentials.password = password;
    if (apiUrl) {
      this.credentials.apiUrl = apiUrl;
    }
    // Clear existing token to force re-authentication
    this.token = null;
  }

  private async getAuthToken(): Promise<string> {
    // Check if we have credentials configured
    if (!this.credentials.email || !this.credentials.password) {
      throw new Error("❌ Credenciais do provedor não configuradas. Configure as credenciais específicas do usuário.");
    }

    // Check if we have a valid token
    if (this.token && this.token.expiresAt > new Date()) {
      return this.token.token;
    }

    const loginUrl = `${this.credentials.apiUrl}api/login?email=${encodeURIComponent(this.credentials.email)}&password=${encodeURIComponent(this.credentials.password)}`;
    console.log("🔐 Attempting authentication with:", {
      url: loginUrl,
      email: this.credentials.email,
      hasPassword: !!this.credentials.password
    });

    try {
      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        agent: new https.Agent({
          rejectUnauthorized: false // Allow self-signed certificates in development
        })
      });

      console.log("📡 Response status:", response.status);
      console.log("📡 Response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Authentication failed:", errorText);
        throw new Error(`Authentication failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as any;
      console.log("✅ Authentication response keys:", Object.keys(data));
      
      // European Fulfillment uses 'token' field
      if (!data.token) {
        console.error("❌ No token found in response:", data);
        throw new Error("No token received from authentication");
      }

      // Token expires in 8 hours according to documentation
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 7); // 7 hours to be safe

      this.token = {
        token: data.token,
        expiresAt
      };

      console.log("🎉 Authentication successful! Token cached until:", expiresAt);
      return data.token;
    } catch (error) {
      console.error("💥 European Fulfillment authentication error:", error);
      throw new Error("Failed to authenticate with European Fulfillment Center");
    }
  }

  private async makeAuthenticatedRequest(endpoint: string, method: string = "GET", body?: any): Promise<any> {
    const token = await this.getAuthToken();
    
    const headers: any = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const requestOptions: any = {
      method,
      headers,
      agent: new https.Agent({
        rejectUnauthorized: false // Allow self-signed certificates in development
      })
    };

    if (body && (method === "POST" || method === "PATCH" || method === "PUT")) {
      requestOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.credentials.apiUrl}${endpoint}`, requestOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  async createLead(leadData: any): Promise<LeadResponse> {
    if (this.simulationMode) {
      const mockLeadNumber = this.generateMockLeadNumber();
      return {
        success: true,
        message: "Lead criado com sucesso (modo simulado)",
        lead_number: mockLeadNumber,
        data: {
          lead_number: mockLeadNumber,
          status: "pending",
          message: "Simulação: Lead seria enviado para European Fulfillment Center"
        }
      };
    }

    try {
      const items = JSON.parse(leadData.items) as LeadItem[];
      
      // Format data according to API documentation
      const createLeadRequest: CreateLeadRequest = {
        name_costumer: leadData.customerName,
        mobile: leadData.customerPhone,
        email: leadData.customerEmail || undefined,
        province: leadData.province,
        zipcode: leadData.zipcode,
        city: leadData.city,
        address: leadData.address,
        country: leadData.country,
        total: leadData.total.toString(),
        payment_type: leadData.paymentType as "COD" | "prepaid",
        order_number: leadData.orderId || undefined,
        items: items
      };

      console.log("Creating lead with data:", createLeadRequest);
      const response = await this.makeAuthenticatedRequest("api/leads/store", "POST", createLeadRequest);
      console.log("Lead creation response:", response);
      
      // Handle different response formats
      const leadNumber = response.lead_number || response.leadNumber || response.data?.lead_number;
      
      if (!leadNumber) {
        throw new Error("No lead number received from API");
      }
      
      return {
        success: true,
        message: "Lead criado com sucesso na European Fulfillment Center",
        lead_number: leadNumber,
        data: response
      };
    } catch (error) {
      console.error("Error creating lead:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Erro desconhecido ao criar lead"
      };
    }
  }

  async getLeadStatus(leadNumber: string): Promise<LeadStatus | null> {
    if (this.simulationMode) {
      // Return mock status based on lead number
      const mockStatuses = ["pending", "sent", "delivered", "cancelled"];
      const randomStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)];
      
      return {
        lead_number: leadNumber,
        status: randomStatus,
        tracking_number: leadNumber.startsWith("SIM-") ? `TRK${leadNumber.slice(4)}` : undefined,
        delivery_date: randomStatus === "delivered" ? new Date().toISOString() : undefined
      };
    }

    try {
      const response = await this.makeAuthenticatedRequest(`api/leads/details?leadNumber=${leadNumber}`);
      
      return {
        lead_number: leadNumber,
        status: response.status || "unknown",
        tracking_number: response.tracking_number,
        delivery_date: response.delivery_date
      };
    } catch (error) {
      console.error("Error getting lead status:", error);
      return null;
    }
  }

  async getLeadHistory(leadNumber: string): Promise<any> {
    try {
      return await this.makeAuthenticatedRequest(`api/leads/history?leadNumber=${leadNumber}`);
    } catch (error) {
      console.error("Error getting lead history:", error);
      return null;
    }
  }

  async updateLead(leadNumber: string, items: LeadItem[], country: string): Promise<LeadResponse> {
    try {
      const updateData = {
        lead_number: leadNumber,
        country: country,
        items: items
      };

      const response = await this.makeAuthenticatedRequest("api/leads/update", "POST", updateData);
      
      return {
        success: true,
        message: "Lead updated successfully",
        data: response
      };
    } catch (error) {
      console.error("Error updating lead:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  async deleteLead(leadNumber: string): Promise<LeadResponse> {
    try {
      const response = await this.makeAuthenticatedRequest(`api/leads/delete/${leadNumber}`, "POST");
      
      return {
        success: true,
        message: "Lead deleted successfully",
        data: response
      };
    } catch (error) {
      console.error("Error deleting lead:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  async getCountries(): Promise<string[]> {
    if (this.simulationMode) {
      return ["ITALY"]; // Focus on Italy for now
    }

    try {
      const response = await this.makeAuthenticatedRequest("api/countries");
      console.log("Countries API response:", response);
      
      let countries: string[] = [];
      
      // Handle different response formats
      if (Array.isArray(response)) {
        countries = response.map((country: any) => typeof country === 'string' ? country : country.name || country.country).filter(Boolean);
      } else if (response.countries && Array.isArray(response.countries)) {
        countries = response.countries.map((country: any) => typeof country === 'string' ? country : country.name || country.country).filter(Boolean);
      } else if (response.data && Array.isArray(response.data)) {
        countries = response.data.map((country: any) => typeof country === 'string' ? country : country.name || country.country).filter(Boolean);
      } else {
        console.warn("Unexpected countries response format:", response);
        return ["ITALY"];
      }
      
      // Return ALL countries from API - no geographic restrictions
      return countries.length > 0 ? countries : ["ITALY"]; // ITALY only as fallback if API fails
    } catch (error) {
      console.error("Error getting countries:", error);
      return ["ITALY"];
    }
  }

  // New method to get stores from API
  async getStores(): Promise<any[]> {
    if (this.simulationMode) {
      return [
        { id: 1, name: "Store Italy Demo", link: "https://store-italy.com" },
        { id: 2, name: "Milano Shop", link: "https://milano-shop.it" }
      ];
    }

    try {
      const response = await this.makeAuthenticatedRequest("api/stores");
      console.log("Stores API response:", response);
      
      // Handle different response formats based on API documentation
      if (Array.isArray(response)) {
        return response;
      }
      
      if (response.stores && Array.isArray(response.stores)) {
        return response.stores;
      }
      
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      
      // If no stores found or response is empty, return empty array with note
      console.warn("No stores found in API response. User may need to create stores first.");
      return [];
    } catch (error) {
      console.error("Error getting stores:", error);
      
      // Check if it's an authentication error
      if (error instanceof Error && error.message.includes("401")) {
        console.log("Authentication error - token may have expired");
      }
      
      return [];
    }
  }

  // Method to create a new store
  async createStore(storeData: { name: string; link: string }): Promise<any> {
    if (this.simulationMode) {
      return {
        success: true,
        message: "Store criada com sucesso (modo simulado)",
        store: { id: Date.now(), ...storeData }
      };
    }

    try {
      const response = await this.makeAuthenticatedRequest("api/stores/store", "POST", storeData);
      console.log("Store creation response:", response);
      
      return {
        success: true,
        message: "Store criada com sucesso",
        store: response
      };
    } catch (error) {
      console.error("Error creating store:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Erro ao criar store"
      };
    }
  }

  async getLeadsListWithDateFilter(country?: string, dateFrom?: string, dateTo?: string): Promise<any[]> {
    if (this.simulationMode) {
      const mockLeads = this.getMockLeadsList();
      return country ? mockLeads.filter(lead => lead.country === country) : mockLeads;
    }

    try {
      // Try various analytics endpoints with date filter
      if (dateFrom && dateTo) {
        console.log(`🎯 Trying analytics endpoints with date filter: ${dateFrom} - ${dateTo}`);
        const dateRange = `${dateFrom} - ${dateTo}`;
        
        const analyticsEndpoints = [
          `api/analytics/shipping?date=${encodeURIComponent(dateRange)}`,
          `api/reports/orders?from=${dateFrom}&to=${dateTo}&country=ITALY`,
          `api/leads/analytics?date_from=${dateFrom}&date_to=${dateTo}&country=ITALY`,
          `api/dashboard/orders?from=${dateFrom}&to=${dateTo}&country=ITALY`
        ];
        
        for (const endpoint of analyticsEndpoints) {
          try {
            console.log(`🔍 Testing endpoint: ${endpoint}`);
            const response = await this.makeAuthenticatedRequest(endpoint);
            console.log(`📊 Response from ${endpoint}:`, response);
            
            if (response && (Array.isArray(response.data) || Array.isArray(response))) {
              const data = Array.isArray(response.data) ? response.data : response;
              console.log(`✅ Found ${data.length} orders from analytics endpoint`);
              return data;
            }
          } catch (endpointError: any) {
            console.log(`⚠️  Endpoint ${endpoint} failed:`, endpointError?.message || endpointError);
          }
        }
        
        console.log(`⚠️  All analytics endpoints failed, falling back to leads pagination`);
      }
      
      // Fallback to pagination method
      return await this.getLeadsList(country, 1, dateFrom, dateTo);
    } catch (error) {
      console.error(`Error getting leads with date filter:`, error);
      return [];
    }
  }

  async getLeadsListWithPagination(country?: string, page: number = 1, dateFrom?: string, dateTo?: string): Promise<any> {
    if (this.simulationMode) {
      const mockLeads = this.getMockLeadsList();
      const filteredLeads = country ? mockLeads.filter(lead => lead.country === country) : mockLeads;
      return {
        data: filteredLeads,
        total: filteredLeads.length,
        per_page: 15,
        last_page: Math.ceil(filteredLeads.length / 15)
      };
    }

    try {
      let endpoint = `api/leads?page=${page}`;
      if (country) {
        endpoint += `&country=${encodeURIComponent(country)}`;
      }
      
      if (dateFrom) {
        endpoint += `&date_from=${encodeURIComponent(dateFrom)}`;
      }
      
      if (dateTo) {
        endpoint += `&date_to=${encodeURIComponent(dateTo)}`;
      }
      
      console.log(`🔍 API Request: ${endpoint}`);
      const response = await this.makeAuthenticatedRequest(endpoint);
      
      // Return the full response with pagination metadata
      return response;
    } catch (error) {
      console.error(`Error getting leads list with pagination for page ${page}:`, error);
      return { data: [], total: 0, per_page: 15, last_page: 1 };
    }
  }

  async getLeadsList(country?: string, page: number = 1, dateFrom?: string, dateTo?: string): Promise<any[]> {
    if (this.simulationMode) {
      const mockLeads = this.getMockLeadsList();
      return country ? mockLeads.filter(lead => lead.country === country) : mockLeads;
    }

    try {
      let endpoint = `api/leads?page=${page}`;
      if (country) {
        endpoint += `&country=${encodeURIComponent(country)}`;
      }
      
      // Add date filtering if supported by API  
      if (dateFrom) {
        endpoint += `&date_from=${encodeURIComponent(dateFrom)}`;
      }
      
      if (dateTo) {
        endpoint += `&date_to=${encodeURIComponent(dateTo)}`;
      }
      
      console.log(`🔍 API Request: ${endpoint}`);
      const response = await this.makeAuthenticatedRequest(endpoint);
      console.log(`Leads API response for page ${page}:`, response);
      
      // Handle paginated response format
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      
      // Handle direct array response
      if (Array.isArray(response)) {
        return response;
      }
      
      // Handle leads property
      if (response.leads && Array.isArray(response.leads)) {
        return response.leads;
      }
      
      console.warn("Unexpected leads response format:", response);
      return [];
    } catch (error) {
      console.error(`Error getting leads list for page ${page}:`, error);
      return [];
    }
  }

  // Helper method to safely parse dates
  private parseDate(dateValue: any): Date {
    if (!dateValue) return new Date();
    
    // If it's already a Date object
    if (dateValue instanceof Date) return dateValue;
    
    // If it's a string, try to parse it
    if (typeof dateValue === 'string') {
      const parsedDate = new Date(dateValue);
      return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    }
    
    // Default to current date
    return new Date();
  }

  // Convert API leads to dashboard orders format with all transportadora fields
  convertLeadsToOrders(leads: any[]): any[] {
    return leads.map((lead, index) => {
      // Map lead statuses to order statuses based on real API data
      const getOrderStatus = (confirmation: string, delivery: string) => {
        if (confirmation === 'cancelled' || confirmation === 'refused') return 'cancelled';
        if (confirmation === 'duplicated') return 'cancelled';
        if (delivery === 'delivered') return 'delivered';
        if (delivery === 'shipped' || delivery === 'in transit') return 'shipped';
        if (confirmation === 'confirmed') return 'confirmed';
        return 'pending';
      };

      const getPaymentStatus = (method: string, deliveryStatus: string) => {
        if (method === 'COD') {
          return deliveryStatus === 'delivered' ? 'paid' : 'no paid';
        }
        return 'paid'; // prepaid orders
      };

      const getDeliveryStatusDisplay = (status: string) => {
        const statusMap: { [key: string]: string } = {
          'in transit': 'in transit',
          'shipped': 'shipped', 
          'delivered': 'delivered',
          'unpacked': 'preparing',
          'pending': 'pending',
          'cancelled': 'cancelled'
        };
        return statusMap[status] || status;
      };

      const status = getOrderStatus(lead.status_confirmation, lead.status_livrison);
      const paymentStatus = getPaymentStatus(lead.method_payment, lead.status_livrison);

      return {
        id: lead.n_lead || `api-${index}`,
        
        // Customer details from API
        customerId: `customer-${lead.phone?.replace(/\D/g, '') || index}`,
        customerName: lead.name || 'Cliente não informado',
        customerEmail: lead.email || '',
        customerPhone: lead.phone || '',
        customerAddress: lead.address || '',
        customerCity: lead.city || '',
        customerState: lead.province || '',
        customerCountry: 'Italy',
        customerZip: lead.zipcode || '',
        
        // Order status from API
        status: status,
        paymentStatus: paymentStatus,
        paymentMethod: lead.method_payment === 'COD' ? 'cod' : 'prepaid',
        
        // Financial data
        total: parseFloat(lead.lead_value || '0'),
        leadValue: lead.lead_value,
        
        // Transportadora specific fields matching the interface
        market: lead.market || '',
        refS: lead.ref_s || lead.refs || '',
        refNumber: lead.ref || lead.n_lead,
        trackingNumber: lead.tracking_number || lead.tracking || '',
        deliveryStatus: getDeliveryStatusDisplay(lead.status_livrison || ''),
        confirmationStatus: lead.status_confirmation || '',
        
        // Product details
        items: JSON.stringify([{
          name: lead.product_name || 'Produto',
          quantity: parseInt(lead.quantity || '1'),
          price: parseFloat(lead.lead_value || '0')
        }]),
        
        // Metadata with proper date handling
        notes: `REF: ${lead.n_lead} | Market: ${lead.market || 'N/A'} | Tracking: ${lead.tracking_number || 'N/A'} | Confirmação: ${lead.status_confirmation} | Entrega: ${lead.status_livrison}`,
        createdAt: this.parseDate(lead.created_at || lead.date_created),
        updatedAt: this.parseDate(lead.updated_at || lead.date_updated),
        
        // Raw API data for debugging
        apiData: lead
      };
    });
  }

  async testConnection(): Promise<{ connected: boolean; message: string; details?: any }> {
    try {
      const token = await this.getAuthToken();
      this.simulationMode = false;
      
      // Test with a simple API call to verify connection
      try {
        await this.makeAuthenticatedRequest("api/countries");
        return { 
          connected: true, 
          message: "Conexão estabelecida com sucesso",
          details: `Token ativo até ${this.token?.expiresAt?.toLocaleTimeString('pt-BR')}`
        };
      } catch (apiError) {
        return {
          connected: true,
          message: "Autenticação OK, mas API com problemas",
          details: "Token válido, mas alguns endpoints podem estar indisponíveis"
        };
      }
    } catch (error) {
      console.error("Connection test failed:", error);
      this.simulationMode = true;
      
      return {
        connected: false,
        message: "Falha na autenticação",
        details: "Verifique suas credenciais e tente novamente"
      };
    }
  }

  // Simulation methods for local development
  private generateMockLeadNumber(): string {
    return `SIM-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  }

  private getMockCountries(): string[] {
    return ["PORTUGAL", "SPAIN", "FRANCE", "ITALY", "GERMANY", "NETHERLANDS", "BELGIUM"];
  }

  private getMockLeadsList(): any[] {
    return [
      {
        lead_number: "SIM-ABC12345",
        customer_name: "João Silva",
        country: "PORTUGAL",
        status: "delivered",
        total: "149.90"
      },
      {
        lead_number: "SIM-DEF67890", 
        customer_name: "Maria Santos",
        country: "SPAIN",
        status: "pending",
        total: "199.50"
      }
    ];
  }
}

export { EuropeanFulfillmentService };
// Removed global instance - each provider should have its own instance with specific credentials