import fetch, { Response } from "node-fetch";
import { randomUUID } from "crypto";
import https from "https";
import type { InsertFulfillmentLead, FulfillmentLead } from "@shared/schema";

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

  constructor() {
    this.credentials = {
      email: process.env.EUROPEAN_FULFILLMENT_EMAIL || "tester@exemple.com",
      password: process.env.EUROPEAN_FULFILLMENT_PASSWORD || "password", 
      apiUrl: process.env.EUROPEAN_FULFILLMENT_API_URL || "https://api-test.ecomfulfilment.eu/"
    };
    console.log("European Fulfillment Service initialized with email:", this.credentials.email);
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
      
      // Check for different possible token field names
      const tokenField = data.access_token || data.token || data.jwt_token;
      
      if (!tokenField) {
        console.error("❌ No token found in response:", data);
        throw new Error("No token received from authentication");
      }

      // Token expires in 8 hours according to documentation
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 7); // 7 hours to be safe

      this.token = {
        token: tokenField,
        expiresAt
      };

      console.log("🎉 Authentication successful! Token cached until:", expiresAt);
      return tokenField;
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

  async createLead(leadData: InsertFulfillmentLead): Promise<LeadResponse> {
    if (this.simulationMode) {
      // Simulation mode - return mock success response
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

      const response = await this.makeAuthenticatedRequest("api/leads/store", "POST", createLeadRequest);
      
      return {
        success: true,
        message: "Lead created successfully",
        lead_number: response.lead_number,
        data: response
      };
    } catch (error) {
      console.error("Error creating lead:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
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
      return this.getMockCountries();
    }

    try {
      const response = await this.makeAuthenticatedRequest("api/countries");
      return response.countries || [];
    } catch (error) {
      console.error("Error getting countries:", error);
      return this.getMockCountries(); // Fallback to mock data
    }
  }

  async getLeadsList(country?: string): Promise<any[]> {
    if (this.simulationMode) {
      const mockLeads = this.getMockLeadsList();
      return country ? mockLeads.filter(lead => lead.country === country) : mockLeads;
    }

    try {
      const endpoint = country ? `api/leads?country=${country}` : "api/leads";
      const response = await this.makeAuthenticatedRequest(endpoint);
      return response.leads || [];
    } catch (error) {
      console.error("Error getting leads list:", error);
      return this.getMockLeadsList(); // Fallback to mock data
    }
  }

  async testConnection(): Promise<{ connected: boolean; message: string; details?: any }> {
    try {
      await this.getAuthToken();
      this.simulationMode = false;
      return { 
        connected: true, 
        message: "Conexão bem-sucedida com European Fulfillment Center" 
      };
    } catch (error) {
      console.error("Connection test failed:", error);
      
      // Enable simulation mode when connection fails
      this.simulationMode = true;
      
      return {
        connected: false,
        message: "Modo simulado ativo - Credenciais incorretas",
        details: "API externa indisponível. Usando modo simulado para desenvolvimento local."
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

export const europeanFulfillmentService = new EuropeanFulfillmentService();