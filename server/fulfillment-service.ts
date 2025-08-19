import fetch, { Response } from "node-fetch";
import { randomUUID } from "crypto";
import type { InsertFulfillmentLead, FulfillmentLead } from "@shared/schema";

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

  constructor() {
    this.credentials = {
      email: process.env.EUROPEAN_FULFILLMENT_EMAIL || "tester@exemple.com",
      password: process.env.EUROPEAN_FULFILLMENT_PASSWORD || "password", 
      apiUrl: process.env.EUROPEAN_FULFILLMENT_API_URL || "https://api-test.ecomfulfilment.eu/"
    };
  }

  private async getAuthToken(): Promise<string> {
    // Check if we have a valid token
    if (this.token && this.token.expiresAt > new Date()) {
      return this.token.token;
    }

    try {
      const response = await fetch(
        `${this.credentials.apiUrl}api/login?email=${this.credentials.email}&password=${this.credentials.password}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      
      if (!data.token) {
        throw new Error("No token received from authentication");
      }

      // Token expires in 8 hours according to documentation
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 7); // 7 hours to be safe

      this.token = {
        token: data.token,
        expiresAt
      };

      return data.token;
    } catch (error) {
      console.error("European Fulfillment authentication error:", error);
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
    try {
      const response = await this.makeAuthenticatedRequest("api/countries");
      return response.countries || [];
    } catch (error) {
      console.error("Error getting countries:", error);
      return [];
    }
  }

  async getLeadsList(country?: string): Promise<any[]> {
    try {
      const endpoint = country ? `api/leads?country=${country}` : "api/leads";
      const response = await this.makeAuthenticatedRequest(endpoint);
      return response.leads || [];
    } catch (error) {
      console.error("Error getting leads list:", error);
      return [];
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getAuthToken();
      return true;
    } catch (error) {
      console.error("Connection test failed:", error);
      return false;
    }
  }
}

export const europeanFulfillmentService = new EuropeanFulfillmentService();