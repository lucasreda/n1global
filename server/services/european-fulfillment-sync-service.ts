// 🇪🇺 European Fulfillment Sync Service
// Manages sync of European Fulfillment orders to staging table (european_fulfillment_orders)
// Follows same architecture as FHBSyncService

import { db } from '../db';
import { europeanFulfillmentOrders, userWarehouseAccounts, fhbSyncLogs, fhbAccounts } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface EuropeanFulfillmentConfig {
  email: string;
  password: string;
  apiUrl: string;
}

interface SyncStats {
  ordersProcessed: number;
  ordersCreated: number;
  ordersUpdated: number;
  ordersSkipped: number;
}

type SyncType = 'deep' | 'fast' | 'initial';

/**
 * European Fulfillment Sync Service
 * Syncs orders from European Fulfillment API to european_fulfillment_orders staging table
 */
export class EuropeanFulfillmentSyncService {
  /**
   * Sync all active European Fulfillment accounts (Deep Sync: 30 days)
   */
  async syncDeep(): Promise<void> {
    console.log('🔄 European Fulfillment Deep Sync: Starting 30-day sync for all accounts...');
    
    // Get all active European Fulfillment accounts
    const accounts = await db.select()
      .from(userWarehouseAccounts)
      .where(
        and(
          eq(userWarehouseAccounts.providerKey, 'european_fulfillment'),
          eq(userWarehouseAccounts.status, 'active')
        )
      );
    
    if (accounts.length === 0) {
      console.log('ℹ️ No active European Fulfillment accounts found');
      return;
    }
    
    console.log(`📊 Found ${accounts.length} active European Fulfillment account(s)`);
    
    for (const account of accounts) {
      try {
        await this.syncWarehouseAccount(account, 'deep', 30);
      } catch (error: any) {
        console.error(`❌ Deep sync failed for account ${account.displayName}:`, error.message);
      }
    }
  }
  
  /**
   * Sync all active European Fulfillment accounts (Fast Sync: 10 days)
   */
  async syncFast(): Promise<void> {
    console.log('⚡ European Fulfillment Fast Sync: Starting 10-day sync for all accounts...');
    
    // Get all active European Fulfillment accounts
    const accounts = await db.select()
      .from(userWarehouseAccounts)
      .where(
        and(
          eq(userWarehouseAccounts.providerKey, 'european_fulfillment'),
          eq(userWarehouseAccounts.status, 'active')
        )
      );
    
    if (accounts.length === 0) {
      console.log('ℹ️ No active European Fulfillment accounts found');
      return;
    }
    
    console.log(`📊 Found ${accounts.length} active European Fulfillment account(s)`);
    
    for (const account of accounts) {
      try {
        await this.syncWarehouseAccount(account, 'fast', 10);
      } catch (error: any) {
        console.error(`❌ Fast sync failed for account ${account.displayName}:`, error.message);
      }
    }
  }
  
  /**
   * Perform initial 2-year backfill for accounts that haven't completed it
   */
  async syncInitial(): Promise<void> {
    console.log('🚀 European Fulfillment Initial Sync: Checking for accounts needing backfill...');
    
    // Get accounts that need initial sync
    const accounts = await db.select()
      .from(userWarehouseAccounts)
      .where(
        and(
          eq(userWarehouseAccounts.providerKey, 'european_fulfillment'),
          eq(userWarehouseAccounts.status, 'active'),
          eq(userWarehouseAccounts.initialSyncCompleted, false)
        )
      );
    
    if (accounts.length === 0) {
      console.log('ℹ️ No European Fulfillment accounts need initial sync');
      return;
    }
    
    console.log(`📊 Found ${accounts.length} account(s) needing initial sync`);
    
    for (const account of accounts) {
      try {
        await this.performInitialSyncWarehouse(account);
      } catch (error: any) {
        console.error(`❌ Initial sync failed for account ${account.displayName}:`, error.message);
      }
    }
  }
  
  /**
   * Get sync status for all European Fulfillment accounts
   */
  async getSyncStatus(): Promise<any[]> {
    const accounts = await db.select()
      .from(userWarehouseAccounts)
      .where(eq(userWarehouseAccounts.providerKey, 'european_fulfillment'));
    
    return accounts.map(account => ({
      accountId: account.id,
      accountName: account.displayName,
      status: account.status,
      initialSyncCompleted: account.initialSyncCompleted,
      initialSyncCompletedAt: account.initialSyncCompletedAt,
      lastTestedAt: account.lastTestedAt
    }));
  }
  
  /**
   * Trigger initial sync for a specific account (3 months lookback)
   * Called when a new warehouse account is created
   */
  async triggerInitialSyncForAccount(accountId: string, lookbackDays: number = 90): Promise<void> {
    console.log(`🚀 Triggering initial sync for European Fulfillment account ${accountId} (${lookbackDays} days)`);
    
    // Fetch the account
    const accounts = await db.select()
      .from(userWarehouseAccounts)
      .where(eq(userWarehouseAccounts.id, accountId))
      .limit(1);
    
    if (accounts.length === 0) {
      throw new Error(`European Fulfillment account ${accountId} not found`);
    }
    
    const account = accounts[0];
    
    // Update status to in_progress
    await db.update(userWarehouseAccounts)
      .set({
        initialSyncStatus: 'in_progress',
        initialSyncError: null
      })
      .where(eq(userWarehouseAccounts.id, accountId));
    
    try {
      // Perform the initial sync (European Fulfillment doesn't support date filtering, so fetches all)
      await this.performInitialSyncWarehouse(account);
      
      // Update status to completed
      await db.update(userWarehouseAccounts)
        .set({
          initialSyncStatus: 'completed',
          initialSyncCompleted: true,
          initialSyncCompletedAt: new Date()
        })
        .where(eq(userWarehouseAccounts.id, accountId));
      
      console.log(`✅ Initial sync completed successfully for account ${accountId}`);
    } catch (error: any) {
      // Update status to failed with error message
      await db.update(userWarehouseAccounts)
        .set({
          initialSyncStatus: 'failed',
          initialSyncError: error.message || 'Unknown error'
        })
        .where(eq(userWarehouseAccounts.id, accountId));
      
      console.error(`❌ Initial sync failed for account ${accountId}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Sync a single warehouse account
   * Fetches leads from European Fulfillment API and saves to staging table
   */
  private async syncWarehouseAccount(
    warehouseAccount: typeof userWarehouseAccounts.$inferSelect,
    syncType: SyncType,
    days: number
  ): Promise<void> {
    console.log(`🔄 Syncing European Fulfillment account: ${warehouseAccount.displayName} (${syncType}, ${days} days)`);
    
    try {
      // Extract credentials from JSON field
      const credentials = warehouseAccount.credentials as any;
      if (!credentials || !credentials.email || !credentials.password) {
        const error = `Invalid credentials for account ${warehouseAccount.displayName}`;
        console.error(`❌ ${error}`);
        throw new Error(error);
      }
      
      // Get default country from credentials (or use 'spain' as default)
      const country = credentials.country || 'spain';
      
      // Dynamically import European Fulfillment adapter
      const { EuropeanFulfillmentAdapter } = await import('../fulfillment-providers/european-fulfillment-adapter.js');
      
      const europeanAdapter = new EuropeanFulfillmentAdapter({
        email: credentials.email,
        password: credentials.password,
        apiUrl: credentials.apiUrl || 'https://api.ecomfulfilment.eu'
      });
      
      // Authenticate
      await europeanAdapter.authenticate();
      
      // Get European Fulfillment service instance
      const service = await (europeanAdapter as any).getEuropeanService();
      
      let totalStats: SyncStats = {
        ordersProcessed: 0,
        ordersCreated: 0,
        ordersUpdated: 0,
        ordersSkipped: 0
      };
      
      // Calculate date range based on sync type
      const dateTo = new Date().toISOString().split('T')[0]; // Today (YYYY-MM-DD)
      const dateFromObj = new Date();
      dateFromObj.setDate(dateFromObj.getDate() - days);
      const dateFrom = dateFromObj.toISOString().split('T')[0]; // X days ago (YYYY-MM-DD)
      
      console.log(`🌍 Fetching leads for country: ${country}`);
      console.log(`📅 Date range: ${dateFrom} to ${dateTo} (${days} days)`);
      
      // Fetch leads for the country with date filtering
      const leads = await service.getLeadsListWithDateFilter(country, dateFrom, dateTo);
      
      console.log(`📦 Fetched ${leads?.length || 0} European Fulfillment leads`);
      
      if (!leads || leads.length === 0) {
        console.log(`ℹ️ No leads found for ${warehouseAccount.displayName}`);
        return;
      }
      
      for (const lead of leads) {
        totalStats.ordersProcessed++;
        
        try {
          const leadNumber = lead.n_lead || lead.number || lead.lead_number || lead.id;
          const orderNumber = lead.order_number || lead.n_order || lead.shopify_order || leadNumber;
          
          if (!leadNumber) {
            console.warn(`⚠️ Lead without number, skipping`);
            totalStats.ordersSkipped++;
            continue;
          }
          
          // Check if lead already exists in staging
          const existing = await db.select()
            .from(europeanFulfillmentOrders)
            .where(
              and(
                eq(europeanFulfillmentOrders.accountId, warehouseAccount.id),
                eq(europeanFulfillmentOrders.europeanOrderId, leadNumber)
              )
            )
            .limit(1);
          
          const orderData = {
            accountId: warehouseAccount.id,
            europeanOrderId: leadNumber,
            orderNumber: orderNumber,
            status: lead.status || 'pending',
            tracking: lead.tracking_number || lead.tracking || null,
            value: lead.total || lead.amount || '0',
            recipient: {
              name: lead.customer_name || lead.name || '',
              email: lead.customer_email || lead.email || '',
              phone: lead.customer_phone || lead.phone || '',
              city: lead.shipping_city || lead.city || '',
              address: lead.shipping_address || lead.address || ''
            },
            items: lead.items || [],
            rawData: lead
          };
          
          if (existing.length > 0) {
            // Update existing
            await db.update(europeanFulfillmentOrders)
              .set({
                ...orderData,
                processedToOrders: false, // Reset for re-linking
                processedAt: null,
                updatedAt: new Date()
              })
              .where(eq(europeanFulfillmentOrders.id, existing[0].id));
            
            totalStats.ordersUpdated++;
          } else {
            // Create new
            await db.insert(europeanFulfillmentOrders).values({
              ...orderData,
              processedToOrders: false
            });
            
            totalStats.ordersCreated++;
          }
        } catch (error: any) {
          console.error(`❌ Error processing European lead:`, error.message);
          totalStats.ordersSkipped++;
        }
      }
      
      console.log(`✅ European Fulfillment sync completed for ${warehouseAccount.displayName}:`);
      console.log(`   📊 ${totalStats.ordersCreated} created, ${totalStats.ordersUpdated} updated, ${totalStats.ordersSkipped} skipped`);
      
    } catch (error: any) {
      console.error(`❌ European Fulfillment sync failed for ${warehouseAccount.displayName}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Perform initial sync for warehouse account
   * NOTE: European Fulfillment API does not support date filtering
   * Fetches all available leads and marks as completed
   */
  private async performInitialSyncWarehouse(
    warehouseAccount: typeof userWarehouseAccounts.$inferSelect
  ): Promise<void> {
    console.log(`🚀 Starting initial sync for European Fulfillment account: ${warehouseAccount.displayName}`);
    console.log(`⚠️ European Fulfillment API limitation: No date filtering - fetching all available leads`);
    
    try {
      // Use the regular sync logic (fetches all available leads)
      await this.syncWarehouseAccount(warehouseAccount, 'initial', 730);
      
      // Mark as completed after successful sync
      await db.update(userWarehouseAccounts)
        .set({
          initialSyncCompleted: true,
          initialSyncCompletedAt: new Date()
        })
        .where(eq(userWarehouseAccounts.id, warehouseAccount.id));
      
      console.log(`✅ Initial sync completed for ${warehouseAccount.displayName}`);
      
    } catch (error: any) {
      console.error(`❌ Initial sync failed for ${warehouseAccount.displayName}:`, error.message);
      throw error;
    }
  }
}
