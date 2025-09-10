import { db } from "./db";
import { orders, orderStatusHistory, syncJobs, type InsertOrder, type InsertOrderStatusHistory, type InsertSyncJob } from "@shared/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { EuropeanFulfillmentService } from "./fulfillment-service";

export class SyncService {
  private fulfillmentService: EuropeanFulfillmentService;
  
  constructor() {
    this.fulfillmentService = new EuropeanFulfillmentService();
  }
  
  async startSync(provider: string, type: 'full_sync' | 'incremental_sync' | 'details_sync' = 'full_sync'): Promise<string> {
    console.log(`🔄 Starting ${type} for provider: ${provider}`);
    
    const syncJob: InsertSyncJob = {
      storeId: 'default',
      provider,
      type,
      status: 'running',
      startedAt: new Date(),
      ordersProcessed: 0,
      ordersCreated: 0,
      ordersUpdated: 0,
      errorCount: 0,
      logs: [],
    };
    
    const [job] = await db.insert(syncJobs).values(syncJob).returning();
    
    // Run sync in background
    this.runSync(job.id, provider, type).catch(error => {
      console.error(`Sync job ${job.id} failed:`, error);
      this.updateSyncJob(job.id, { 
        status: 'failed', 
        error: error instanceof Error ? error.message : String(error),
        completedAt: new Date()
      });
    });
    
    return job.id;
  }
  
  private async runSync(jobId: string, provider: string, type: string) {
    const logs: string[] = [];
    
    try {
      if (provider === 'european_fulfillment') {
        await this.syncEuropeanFulfillment(jobId, type, logs);
      }
      
      await this.updateSyncJob(jobId, {
        status: 'completed',
        completedAt: new Date(),
        logs: logs
      });
      
      console.log(`✅ Sync job ${jobId} completed successfully`);
      
    } catch (error) {
      console.error(`❌ Sync job ${jobId} failed:`, error);
      await this.updateSyncJob(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
        logs: logs
      });
      throw error;
    }
  }
  
  private async syncEuropeanFulfillment(jobId: string, type: string, logs: string[]) {
    logs.push(`Starting N1 Warehouse sync: ${type}`);
    
    let ordersProcessed = 0;
    let ordersCreated = 0;
    let ordersUpdated = 0;
    let errorCount = 0;
    
    try {
      // Get all leads from API (without pagination limits)
      console.log(`📊 Fetching all leads from N1 Warehouse API...`);
      const allLeads = await this.fetchAllLeads();
      logs.push(`Fetched ${allLeads.length} leads from API`);
      
      // Process each lead
      for (const lead of allLeads) {
        try {
          ordersProcessed++;
          
          // Get detailed lead information with real dates
          const detailedLead = await this.getLeadDetails(lead.n_lead);
          
          if (detailedLead) {
            const order = this.convertLeadToOrder(lead, detailedLead);
            
            // Check if order exists
            const [existingOrder] = await db.select().from(orders).where(eq(orders.id, order.id));
            
            if (existingOrder) {
              // Update existing order
              await db.update(orders).set({
                ...order,
                updatedAt: new Date()
              }).where(eq(orders.id, order.id));
              ordersUpdated++;
              
              // Check for status changes and add to history
              if (existingOrder.status !== order.status) {
                await this.addStatusHistory(order.id, existingOrder.status, order.status, detailedLead);
              }
            } else {
              // Create new order
              await db.insert(orders).values(order);
              ordersCreated++;
              
              // Add initial status history from API history
              await this.addInitialStatusHistory(order.id, detailedLead);
            }
          }
          
          // Update progress every 50 orders
          if (ordersProcessed % 50 === 0) {
            await this.updateSyncJob(jobId, {
              ordersProcessed,
              ordersCreated,
              ordersUpdated,
              errorCount,
              lastProcessedId: lead.n_lead
            });
            
            logs.push(`Progress: ${ordersProcessed} processed, ${ordersCreated} created, ${ordersUpdated} updated`);
          }
          
        } catch (orderError) {
          console.error(`Error processing lead ${lead.n_lead}:`, orderError);
          errorCount++;
          logs.push(`Error processing ${lead.n_lead}: ${orderError instanceof Error ? orderError.message : String(orderError)}`);
        }
      }
      
      // Final update
      await this.updateSyncJob(jobId, {
        ordersProcessed,
        ordersCreated,
        ordersUpdated,
        errorCount
      });
      
      logs.push(`Sync completed: ${ordersCreated} created, ${ordersUpdated} updated, ${errorCount} errors`);
      
    } catch (error) {
      logs.push(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  private async fetchAllLeads(): Promise<any[]> {
    const allLeads: any[] = [];
    let currentPage = 1;
    const maxPages = 63; // Based on API response
    
    while (currentPage <= maxPages) {
      try {
        const pageLeads = await this.fulfillmentService.getLeadsList("ITALY", currentPage);
        allLeads.push(...pageLeads);
        
        console.log(`📄 Page ${currentPage}: ${pageLeads.length} leads (total: ${allLeads.length})`);
        
        if (pageLeads.length < 15) {
          console.log(`🏁 Reached end of data at page ${currentPage}`);
          break;
        }
        
        currentPage++;
      } catch (error) {
        console.error(`Error fetching page ${currentPage}:`, error);
        break;
      }
    }
    
    return allLeads;
  }
  
  private async getLeadDetails(leadNumber: string): Promise<any> {
    try {
      console.log(`🔍 Getting details for lead: ${leadNumber}`);
      const response = await this.fulfillmentService.getLeadDetails(leadNumber);
      
      if (response && response.Lead) {
        return response;
      }
      
      console.warn(`No details found for lead: ${leadNumber}`);
      return null;
    } catch (error) {
      console.error(`Error getting details for lead ${leadNumber}:`, error);
      return null;
    }
  }
  
  private convertLeadToOrder(lead: any, detailedLead: any): InsertOrder {
    const leadData = detailedLead.Lead;
    
    // Extract real order date from history
    let orderDate = new Date();
    if (detailedLead.history && detailedLead.history.length > 0) {
      // Find the earliest status in history
      const earliestHistory = detailedLead.history.reduce((earliest: any, current: any) => {
        const currentDate = new Date(current.created_at);
        const earliestDate = new Date(earliest.created_at);
        return currentDate < earliestDate ? current : earliest;
      });
      orderDate = new Date(earliestHistory.created_at);
    }
    
    // Map status from API to our standard status
    const getStandardStatus = (confirmation: string, delivery: string) => {
      if (confirmation === 'cancelled' || confirmation === 'refused' || confirmation === 'duplicated') return 'cancelled';
      if (delivery === 'delivered') return 'delivered';
      if (delivery === 'shipped' || delivery === 'in transit') return 'shipped';
      if (confirmation === 'confirmed') return 'confirmed';
      return 'pending';
    };
    
    const status = getStandardStatus(leadData.status_confirmation || '', leadData.status_livrison || '');
    
    // Extract products from leadproduct array
    const products = detailedLead.leadproduct?.map((product: any) => ({
      name: product.name || 'Produto',
      quantity: product.quantity || 1,
      leadValue: product.lead_value || leadData.lead_value || '0',
      image: product.image
    })) || [];
    
    return {
      id: leadData.code ? `NT-${leadData.code}` : lead.n_lead,
      storeId: 'default',
      customerId: `customer-${leadData.phone?.replace(/\D/g, '') || 'unknown'}`,
      customerName: leadData.name || 'Cliente não informado',
      customerEmail: leadData.email || '',
      customerPhone: leadData.phone || '',
      customerAddress: leadData.address || '',
      customerCity: leadData.city || '',
      customerState: leadData.province || '',
      customerCountry: 'Italy',
      customerZip: leadData.zipcode || '',
      
      status,
      paymentStatus: leadData.method_payment === 'COD' ? (status === 'delivered' ? 'paid' : 'unpaid') : 'paid',
      paymentMethod: leadData.method_payment === 'COD' ? 'cod' : 'prepaid',
      
      total: leadData.lead_value || '0',
      currency: 'EUR',
      
      products,
      
      provider: 'european_fulfillment',
      providerOrderId: leadData.code?.toString(),
      trackingNumber: '',
      
      providerData: {
        originalLead: lead,
        detailedLead: detailedLead,
        status_confirmation: leadData.status_confirmation,
        status_livrison: leadData.status_livrison
      },
      
      orderDate,
      lastStatusUpdate: new Date(),
      
      notes: `Lead: ${lead.n_lead} | Status: ${leadData.status_confirmation} | Delivery: ${leadData.status_livrison}`,
      tags: [leadData.status_confirmation, leadData.status_livrison].filter(Boolean),
    };
  }
  
  private async addStatusHistory(orderId: string, previousStatus: string, newStatus: string, detailedLead: any) {
    // Find the most recent status change in history
    if (detailedLead.history && detailedLead.history.length > 0) {
      const latestHistory = detailedLead.history[detailedLead.history.length - 1];
      
      const statusHistory: InsertOrderStatusHistory = {
        orderId,
        previousStatus,
        newStatus,
        comment: latestHistory.comment || latestHistory.status,
        changedAt: new Date(latestHistory.created_at),
        providerData: latestHistory
      };
      
      await db.insert(orderStatusHistory).values(statusHistory);
    }
  }
  
  private async addInitialStatusHistory(orderId: string, detailedLead: any) {
    if (detailedLead.history && detailedLead.history.length > 0) {
      // Add all status changes from history
      for (const historyItem of detailedLead.history) {
        const statusHistory: InsertOrderStatusHistory = {
          orderId,
          previousStatus: null,
          newStatus: historyItem.status,
          comment: historyItem.comment,
          changedAt: new Date(historyItem.created_at),
          providerData: historyItem
        };
        
        await db.insert(orderStatusHistory).values(statusHistory);
      }
    }
  }
  
  private async updateSyncJob(jobId: string, updates: Partial<InsertSyncJob>) {
    await db.update(syncJobs).set(updates).where(eq(syncJobs.id, jobId));
  }
  
  async getSyncStatus(jobId: string) {
    const [job] = await db.select().from(syncJobs).where(eq(syncJobs.id, jobId));
    return job;
  }
  
  async getRecentSyncJobs(provider?: string, limit: number = 10) {
    const query = db.select().from(syncJobs);
    
    if (provider) {
      query.where(eq(syncJobs.provider, provider));
    }
    
    return query.orderBy(desc(syncJobs.startedAt)).limit(limit);
  }
}

export const syncService = new SyncService();