// 📦 eLogy Sync Service
// Manages sync of eLogy orders to staging table (elogy_orders)
// Follows same architecture as FHBSyncService

import { db } from '../db';
import { elogyOrders, userWarehouseAccounts, fhbSyncLogs, fhbAccounts } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface ElogyConfig {
  email: string;
  password: string;
  apiUrl: string;
  authHeader?: string;
  warehouseId?: string;
}

interface SyncStats {
  ordersProcessed: number;
  ordersCreated: number;
  ordersUpdated: number;
  ordersSkipped: number;
}

type SyncType = 'deep' | 'fast' | 'initial';

/**
 * eLogy Sync Service
 * Syncs orders from eLogy API to elogy_orders staging table
 */
export class ElogySyncService {
  /**
   * Sync all active eLogy accounts (Deep Sync: 30 days)
   */
  async syncDeep(): Promise<void> {
    console.log('🔄 eLogy Deep Sync: Starting 30-day sync for all accounts...');
    
    // Get all active eLogy accounts
    const accounts = await db.select()
      .from(userWarehouseAccounts)
      .where(
        and(
          eq(userWarehouseAccounts.providerKey, 'elogy'),
          eq(userWarehouseAccounts.status, 'active')
        )
      );
    
    if (accounts.length === 0) {
      console.log('ℹ️ No active eLogy accounts found');
      return;
    }
    
    console.log(`📊 Found ${accounts.length} active eLogy account(s)`);
    
    for (const account of accounts) {
      try {
        await this.syncWarehouseAccount(account, 'deep', 30);
      } catch (error: any) {
        console.error(`❌ Deep sync failed for account ${account.displayName}:`, error.message);
      }
    }
  }
  
  /**
   * Sync all active eLogy accounts (Fast Sync: 10 days)
   */
  async syncFast(): Promise<void> {
    console.log('⚡ eLogy Fast Sync: Starting 10-day sync for all accounts...');
    
    // Get all active eLogy accounts
    const accounts = await db.select()
      .from(userWarehouseAccounts)
      .where(
        and(
          eq(userWarehouseAccounts.providerKey, 'elogy'),
          eq(userWarehouseAccounts.status, 'active')
        )
      );
    
    if (accounts.length === 0) {
      console.log('ℹ️ No active eLogy accounts found');
      return;
    }
    
    console.log(`📊 Found ${accounts.length} active eLogy account(s)`);
    
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
    console.log('🚀 eLogy Initial Sync: Checking for accounts needing backfill...');
    
    // Get accounts that need initial sync
    const accounts = await db.select()
      .from(userWarehouseAccounts)
      .where(
        and(
          eq(userWarehouseAccounts.providerKey, 'elogy'),
          eq(userWarehouseAccounts.status, 'active'),
          eq(userWarehouseAccounts.initialSyncCompleted, false)
        )
      );
    
    if (accounts.length === 0) {
      console.log('ℹ️ No eLogy accounts need initial sync');
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
   * Get sync status for all eLogy accounts
   */
  async getSyncStatus(): Promise<any[]> {
    const accounts = await db.select()
      .from(userWarehouseAccounts)
      .where(eq(userWarehouseAccounts.providerKey, 'elogy'));
    
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
   * Sync a single warehouse account
   * Uses available eLogy API methods (no date filtering available yet)
   */
  private async syncWarehouseAccount(
    warehouseAccount: typeof userWarehouseAccounts.$inferSelect,
    syncType: SyncType,
    days: number
  ): Promise<void> {
    console.log(`🔄 Syncing eLogy account: ${warehouseAccount.displayName} (${syncType}, ${days} days)`);
    
    try {
      // Extract credentials from JSON field
      const credentials = warehouseAccount.credentials as any;
      if (!credentials || !credentials.email || !credentials.password) {
        const error = `Invalid credentials for account ${warehouseAccount.displayName}`;
        console.error(`❌ ${error}`);
        throw new Error(error);
      }
      
      // Dynamically import eLogy service
      const { ElogyService } = await import('../fulfillment-providers/elogy-service.js');
      
      const elogyService = new ElogyService({
        email: credentials.email,
        password: credentials.password,
        apiUrl: credentials.apiUrl || 'https://api.elogy.io',
        authHeader: credentials.authHeader,
        warehouseId: credentials.warehouseId
      });
      
      // Authenticate
      await elogyService.authenticate();
      
      let totalStats: SyncStats = {
        ordersProcessed: 0,
        ordersCreated: 0,
        ordersUpdated: 0,
        ordersSkipped: 0
      };
      
      // eLogy API limitation: no date filtering available
      // We can only fetch recent orders using available endpoints
      console.log(`⚠️ eLogy API does not support date filtering - fetching recent orders only`);
      
      // Fetch orders to print (recent orders)
      const orders = await elogyService.getOrdersToPrint();
      
      console.log(`📦 Fetched ${orders.length} eLogy orders`);
      
      for (const elogyOrder of orders) {
        totalStats.ordersProcessed++;
        
        try {
          // Check if order already exists in staging
          const existing = await db.select()
            .from(elogyOrders)
            .where(
              and(
                eq(elogyOrders.accountId, warehouseAccount.id),
                eq(elogyOrders.elogyOrderId, elogyOrder.id)
              )
            )
            .limit(1);
          
          const orderData = {
            accountId: warehouseAccount.id,
            elogyOrderId: elogyOrder.id,
            orderNumber: elogyOrder.order_number,
            status: elogyOrder.status,
            tracking: null, // eLogy may not provide tracking in this endpoint
            value: elogyOrder.total,
            recipient: {
              name: elogyOrder.customer_name,
              email: elogyOrder.customer_email,
              phone: elogyOrder.customer_phone
            },
            items: elogyOrder.items || [],
            rawData: elogyOrder
          };
          
          if (existing.length > 0) {
            // Update existing
            await db.update(elogyOrders)
              .set({
                ...orderData,
                processedToOrders: false, // Reset for re-linking
                processedAt: null,
                updatedAt: new Date()
              })
              .where(eq(elogyOrders.id, existing[0].id));
            
            totalStats.ordersUpdated++;
          } else {
            // Create new
            await db.insert(elogyOrders).values({
              ...orderData,
              processedToOrders: false
            });
            
            totalStats.ordersCreated++;
          }
        } catch (error: any) {
          console.error(`❌ Error processing eLogy order ${elogyOrder.id}:`, error.message);
          totalStats.ordersSkipped++;
        }
      }
      
      console.log(`✅ eLogy sync completed for ${warehouseAccount.displayName}:`);
      console.log(`   📊 ${totalStats.ordersCreated} created, ${totalStats.ordersUpdated} updated, ${totalStats.ordersSkipped} skipped`);
      
    } catch (error: any) {
      console.error(`❌ eLogy sync failed for ${warehouseAccount.displayName}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Perform initial sync for warehouse account
   * NOTE: eLogy API does not support date filtering, so we fetch all available orders
   */
  private async performInitialSyncWarehouse(
    warehouseAccount: typeof userWarehouseAccounts.$inferSelect
  ): Promise<void> {
    console.log(`🚀 Starting initial sync for eLogy account: ${warehouseAccount.displayName}`);
    console.log(`⚠️ eLogy API limitation: No date filtering - fetching all available orders`);
    
    try {
      // Use the regular sync logic (which fetches all available orders)
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
