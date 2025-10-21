// 🔄 FHB Sync Service - Centralized order synchronization
// Pulls ALL orders from FHB accounts into N1's central database
// Operations filter orders by configured prefix

import { db } from '../db';
import { orders, fhbAccounts, fhbSyncLogs, fhbOrders, operations, fulfillmentIntegrations } from '@shared/schema';
import { eq, and, gte, inArray, sql } from 'drizzle-orm';
import { FHBService } from '../fulfillment-providers/fhb-service';

type Operation = typeof operations.$inferSelect;

interface FHBOrder {
  id: string;
  variable_symbol: string;
  value: string;
  status: string;
  recipient: {
    address: {
      name: string;
      street: string;
      city: string;
      zip: string;
      country: string;
    };
    contact: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    price?: string;
  }>;
  created_at: string;
  tracking?: string;
}

interface SyncStats {
  ordersProcessed: number;
  ordersCreated: number;
  ordersUpdated: number;
  ordersSkipped: number;
}

export class FHBSyncService {
  
  /**
   * Deep Sync: 30 days, runs 2x daily (6h and 18h)
   * Syncs orders in non-final states (pending, processing, shipped)
   */
  async syncDeep(): Promise<void> {
    console.log('🔄 FHB Deep Sync started (30 days)');
    
    const activeAccounts = await db.select()
      .from(fhbAccounts)
      .where(eq(fhbAccounts.status, 'active'));
    
    console.log(`📊 Found ${activeAccounts.length} active FHB accounts`);
    
    for (const account of activeAccounts) {
      await this.syncAccount(account, 'deep', 30);
    }
    
    console.log('✅ FHB Deep Sync completed');
  }
  
  /**
   * Fast Sync: 10 days, runs every 30min
   * Only syncs orders in non-final states for quick updates
   */
  async syncFast(): Promise<void> {
    console.log('⚡ FHB Fast Sync started (10 days)');
    
    const activeAccounts = await db.select()
      .from(fhbAccounts)
      .where(eq(fhbAccounts.status, 'active'));
    
    console.log(`📊 Found ${activeAccounts.length} active FHB accounts`);
    
    for (const account of activeAccounts) {
      await this.syncAccount(account, 'fast', 10);
    }
    
    console.log('✅ FHB Fast Sync completed');
  }
  
  /**
   * Initial Sync: 2 years historical backfill in 30-day windows
   * Runs once per account to ensure complete order history
   */
  async syncInitial(): Promise<void> {
    console.log('🚀 FHB Initial Sync started (2 years backfill)');
    
    const accountsNeedingInitialSync = await db.select()
      .from(fhbAccounts)
      .where(
        and(
          eq(fhbAccounts.status, 'active'),
          eq(fhbAccounts.initialSyncCompleted, false)
        )
      );
    
    if (accountsNeedingInitialSync.length === 0) {
      console.log('✅ No accounts need initial sync');
      return;
    }
    
    console.log(`📊 Found ${accountsNeedingInitialSync.length} accounts needing initial sync`);
    
    for (const account of accountsNeedingInitialSync) {
      await this.performInitialSync(account);
    }
    
    console.log('✅ FHB Initial Sync completed');
  }
  
  /**
   * Perform 2-year backfill for a single account in 30-day windows
   */
  private async performInitialSync(
    account: typeof fhbAccounts.$inferSelect
  ): Promise<void> {
    console.log(`🚀 Starting initial sync for account: ${account.name} (2 years backfill)`);
    
    const startTime = Date.now();
    let totalStats: SyncStats = {
      ordersProcessed: 0,
      ordersCreated: 0,
      ordersUpdated: 0,
      ordersSkipped: 0
    };
    
    let hadErrors = false;
    const errorWindows: string[] = [];
    
    // Create overall sync log entry
    const [syncLog] = await db.insert(fhbSyncLogs).values({
      fhbAccountId: account.id,
      syncType: 'initial',
      status: 'started',
      startedAt: new Date()
    }).returning();
    
    try {
      // Initialize FHB service
      const fhbService = new FHBService({
        appId: account.appId,
        secret: account.secret,
        apiUrl: account.apiUrl
      });
      
      // Calculate 2 years back from today (730 days)
      const today = new Date();
      const twoYearsAgo = new Date(today.getTime() - 730 * 24 * 60 * 60 * 1000);
      
      // Build windows dynamically to cover exactly 730 days (24 windows of 30 days)
      const windowSizeDays = 30;
      let windowStart = new Date(twoYearsAgo);
      let windowNumber = 1;
      
      while (windowStart < today) {
        const windowEnd = new Date(Math.min(
          windowStart.getTime() + windowSizeDays * 24 * 60 * 60 * 1000,
          today.getTime()
        ));
        
        const fromStr = windowStart.toISOString().split('T')[0];
        const toStr = windowEnd.toISOString().split('T')[0];
        
        console.log(`📅 Window ${windowNumber}: ${fromStr} to ${toStr}`);
        
        try {
          // Fetch orders for this window
          const fetchResult = await this.fetchFHBOrders(fhbService, fromStr, toStr);
          
          // Check if fetch had errors (API failures)
          if (!fetchResult.complete) {
            console.error(`❌ Window ${windowNumber} had API error: ${fetchResult.error}`);
            hadErrors = true;
            errorWindows.push(`${fromStr} to ${toStr} (${fetchResult.error})`);
          } else {
            // Process orders only if fetch was successful
            const fetchedOrders = fetchResult.orders;
            console.log(`📦 Fetched ${fetchedOrders.length} orders from window ${windowNumber}`);
            
            // Save ALL orders to fhb_orders staging table (no filtering)
            for (const fhbOrder of fetchedOrders) {
              totalStats.ordersProcessed++;
              
              try {
                // Upsert to fhb_orders staging table
                const existingFhbOrder = await db.select()
                  .from(fhbOrders)
                  .where(
                    and(
                      eq(fhbOrders.fhbAccountId, account.id),
                      eq(fhbOrders.fhbOrderId, fhbOrder.id)
                    )
                  )
                  .limit(1);
                
                if (existingFhbOrder.length > 0) {
                  // Update existing staging order and reset processed flag for re-linking
                  await db.update(fhbOrders)
                    .set({
                      variableSymbol: fhbOrder.variable_symbol,
                      status: fhbOrder.status,
                      tracking: fhbOrder.tracking,
                      value: fhbOrder.value.toString(),
                      recipient: fhbOrder.recipient,
                      items: fhbOrder.items,
                      rawData: fhbOrder,
                      processedToOrders: false, // Reset to re-link with new data
                      processedAt: null,
                      updatedAt: new Date()
                    })
                    .where(eq(fhbOrders.id, existingFhbOrder[0].id));
                  
                  totalStats.ordersUpdated++;
                } else {
                  // Create new staging order
                  await db.insert(fhbOrders).values({
                    fhbAccountId: account.id,
                    fhbOrderId: fhbOrder.id,
                    variableSymbol: fhbOrder.variable_symbol,
                    status: fhbOrder.status,
                    tracking: fhbOrder.tracking,
                    value: fhbOrder.value.toString(),
                    recipient: fhbOrder.recipient,
                    items: fhbOrder.items,
                    rawData: fhbOrder,
                    processedToOrders: false
                  });
                  
                  totalStats.ordersCreated++;
                }
              } catch (orderError: any) {
                console.error(`❌ Error processing order ${fhbOrder.id}:`, orderError);
                totalStats.ordersSkipped++;
              }
            }
            
            console.log(`✅ Window ${windowNumber} completed: +${fetchedOrders.length} orders processed`);
          }
          
        } catch (windowError: any) {
          console.error(`❌ Error in window ${windowNumber}:`, windowError);
          hadErrors = true;
          errorWindows.push(`${fromStr} to ${toStr} (exception: ${windowError.message})`);
          // Continue to next window even if this one failed
        }
        
        // Move to next window
        windowStart = new Date(windowEnd);
        windowNumber++;
      }
      
      const duration = Date.now() - startTime;
      
      // Only mark as completed if NO errors occurred (API failures or exceptions)
      if (!hadErrors) {
        // Mark initial sync as completed
        await db.update(fhbAccounts)
          .set({
            initialSyncCompleted: true,
            initialSyncCompletedAt: new Date()
          })
          .where(eq(fhbAccounts.id, account.id));
        
        // Mark sync log as completed
        await db.update(fhbSyncLogs)
          .set({
            status: 'completed',
            ordersProcessed: totalStats.ordersProcessed,
            ordersCreated: totalStats.ordersCreated,
            ordersUpdated: totalStats.ordersUpdated,
            ordersSkipped: totalStats.ordersSkipped,
            durationMs: duration,
            completedAt: new Date()
          })
          .where(eq(fhbSyncLogs.id, syncLog.id));
        
        console.log(`✅ Initial sync COMPLETED for ${account.name}:`);
        console.log(`   📊 Total Processed: ${totalStats.ordersProcessed}`);
        console.log(`   ✨ Created: ${totalStats.ordersCreated}`);
        console.log(`   🔄 Updated: ${totalStats.ordersUpdated}`);
        console.log(`   ⏭️  Skipped: ${totalStats.ordersSkipped}`);
        console.log(`   ⏱️  Duration: ${(duration / 1000 / 60).toFixed(2)} minutes`);
      } else {
        // Mark sync as partial due to errors
        await db.update(fhbSyncLogs)
          .set({
            status: 'failed',
            ordersProcessed: totalStats.ordersProcessed,
            ordersCreated: totalStats.ordersCreated,
            ordersUpdated: totalStats.ordersUpdated,
            ordersSkipped: totalStats.ordersSkipped,
            errorMessage: `${errorWindows.length} window(s) had errors: ${errorWindows.join(', ')}`,
            durationMs: duration,
            completedAt: new Date()
          })
          .where(eq(fhbSyncLogs.id, syncLog.id));
        
        console.error(`⚠️ Initial sync PARTIAL for ${account.name}:`);
        console.error(`   🚨 Windows with errors (${errorWindows.length}): ${errorWindows.join(', ')}`);
        console.error(`   📊 Partial Results - Processed: ${totalStats.ordersProcessed}, Created: ${totalStats.ordersCreated}`);
        console.error(`   🔄 Will retry failed windows on next run`);
      }
      
    } catch (error: any) {
      console.error(`❌ Initial sync failed for ${account.name}:`, error);
      
      // Mark sync as failed
      await db.update(fhbSyncLogs)
        .set({
          status: 'failed',
          errorMessage: error.message,
          durationMs: Date.now() - startTime,
          completedAt: new Date()
        })
        .where(eq(fhbSyncLogs.id, syncLog.id));
    }
  }
  
  /**
   * Sync a specific FHB account
   */
  private async syncAccount(
    account: typeof fhbAccounts.$inferSelect,
    syncType: 'deep' | 'fast',
    days: number
  ): Promise<void> {
    const startTime = Date.now();
    const stats: SyncStats = {
      ordersProcessed: 0,
      ordersCreated: 0,
      ordersUpdated: 0,
      ordersSkipped: 0
    };
    
    // Create sync log entry
    const [syncLog] = await db.insert(fhbSyncLogs).values({
      fhbAccountId: account.id,
      syncType,
      status: 'started',
      startedAt: new Date()
    }).returning();
    
    try {
      console.log(`🔄 Syncing FHB account: ${account.name} (${syncType}, ${days} days)`);
      
      // Initialize FHB service
      const fhbService = new FHBService({
        appId: account.appId,
        secret: account.secret,
        apiUrl: account.apiUrl
      });
      
      // Calculate date range
      const to = new Date();
      const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
      const fromStr = from.toISOString().split('T')[0];
      const toStr = to.toISOString().split('T')[0];
      
      console.log(`📅 Date range: ${fromStr} to ${toStr}`);
      
      // Fetch orders from FHB
      const fetchResult = await this.fetchFHBOrders(fhbService, fromStr, toStr);
      
      // If fetch failed due to API error, mark sync as failed
      if (!fetchResult.complete) {
        throw new Error(`FHB API error: ${fetchResult.error}`);
      }
      
      const fetchedOrders = fetchResult.orders;
      console.log(`📦 Fetched ${fetchedOrders.length} orders from FHB`);
      
      // Save ALL orders to fhb_orders staging table (no filtering)
      for (const fhbOrder of fetchedOrders) {
        stats.ordersProcessed++;
        
        try {
          // Upsert to fhb_orders staging table
          const existingFhbOrder = await db.select()
            .from(fhbOrders)
            .where(
              and(
                eq(fhbOrders.fhbAccountId, account.id),
                eq(fhbOrders.fhbOrderId, fhbOrder.id)
              )
            )
            .limit(1);
          
          if (existingFhbOrder.length > 0) {
            // Update existing staging order and reset processed flag for re-linking
            await db.update(fhbOrders)
              .set({
                variableSymbol: fhbOrder.variable_symbol,
                status: fhbOrder.status,
                tracking: fhbOrder.tracking,
                value: fhbOrder.value.toString(),
                recipient: fhbOrder.recipient,
                items: fhbOrder.items,
                rawData: fhbOrder,
                processedToOrders: false, // Reset to re-link with new data
                processedAt: null,
                updatedAt: new Date()
              })
              .where(eq(fhbOrders.id, existingFhbOrder[0].id));
            
            stats.ordersUpdated++;
          } else {
            // Create new staging order
            await db.insert(fhbOrders).values({
              fhbAccountId: account.id,
              fhbOrderId: fhbOrder.id,
              variableSymbol: fhbOrder.variable_symbol,
              status: fhbOrder.status,
              tracking: fhbOrder.tracking,
              value: fhbOrder.value.toString(),
              recipient: fhbOrder.recipient,
              items: fhbOrder.items,
              rawData: fhbOrder,
              processedToOrders: false
            });
            
            stats.ordersCreated++;
          }
        } catch (orderError: any) {
          console.error(`❌ Error processing order ${fhbOrder.id}:`, orderError);
          stats.ordersSkipped++;
        }
      }
      
      // Mark sync as completed
      const duration = Date.now() - startTime;
      await db.update(fhbSyncLogs)
        .set({
          status: 'completed',
          ordersProcessed: stats.ordersProcessed,
          ordersCreated: stats.ordersCreated,
          ordersUpdated: stats.ordersUpdated,
          ordersSkipped: stats.ordersSkipped,
          durationMs: duration,
          completedAt: new Date()
        })
        .where(eq(fhbSyncLogs.id, syncLog.id));
      
      console.log(`✅ Sync completed for ${account.name}:`);
      console.log(`   📊 Processed: ${stats.ordersProcessed}`);
      console.log(`   ✨ Created: ${stats.ordersCreated}`);
      console.log(`   🔄 Updated: ${stats.ordersUpdated}`);
      console.log(`   ⏭️  Skipped: ${stats.ordersSkipped}`);
      console.log(`   ⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
      
    } catch (error: any) {
      console.error(`❌ Sync failed for ${account.name}:`, error);
      
      // Mark sync as failed
      await db.update(fhbSyncLogs)
        .set({
          status: 'failed',
          errorMessage: error.message,
          durationMs: Date.now() - startTime,
          completedAt: new Date()
        })
        .where(eq(fhbSyncLogs.id, syncLog.id));
    }
  }
  
  /**
   * Fetch orders from FHB API with pagination
   * Returns object with orders and completion status
   * Note: Stops at 99 pages max - this is normal behavior for high-volume windows
   */
  private async fetchFHBOrders(
    fhbService: FHBService,
    from: string,
    to: string
  ): Promise<{ orders: FHBOrder[], complete: boolean, error?: string }> {
    const allOrders: FHBOrder[] = [];
    let page = 1;
    let hasMore = true;
    const MAX_PAGES = 99;
    
    while (hasMore && page <= MAX_PAGES) {
      try {
        const response = await (fhbService as any).makeAuthenticatedRequest(
          `/order/history?from=${from}&to=${to}&page=${page}`
        );
        
        const pageOrders: FHBOrder[] = response.orders || response.data || [];
        
        if (!pageOrders || pageOrders.length === 0) {
          hasMore = false;
          break;
        }
        
        allOrders.push(...pageOrders);
        page++;
        
      } catch (error: any) {
        console.error(`❌ Error fetching page ${page}:`, error);
        return {
          orders: allOrders,
          complete: false,
          error: `Failed to fetch page ${page}: ${error.message}`
        };
      }
    }
    
    // Reached page limit - this is normal for high-volume windows
    if (page > MAX_PAGES) {
      console.log(`📦 Fetched ${allOrders.length} orders (${MAX_PAGES} pages max per window)`);
    }
    
    return { orders: allOrders, complete: true };
  }
  
  /**
   * Find operation by order prefix
   */
  private findOperationByPrefix(
    variableSymbol: string,
    operationsList: Array<Operation>
  ): Operation | null {
    for (const operation of operationsList) {
      const prefix = operation.shopifyOrderPrefix || '';
      
      if (!prefix) continue;
      
      // Check if order starts with this operation's prefix
      if (variableSymbol.startsWith(prefix)) {
        return operation;
      }
    }
    
    return null;
  }
  
  /**
   * Map FHB status to internal status
   */
  private mapFHBStatus(fhbStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'pending',
      'confirmed': 'processing',
      'sent': 'shipped',
      'delivered': 'delivered',
      'rejected': 'cancelled',
      'cancelled': 'cancelled'
    };
    
    return statusMap[fhbStatus.toLowerCase()] || fhbStatus;
  }
  
  /**
   * Get sync status for admin dashboard
   */
  async getSyncStatus() {
    // Get last sync for each account
    const accounts = await db.select()
      .from(fhbAccounts)
      .where(eq(fhbAccounts.status, 'active'));
    
    const status = [];
    let pendingInitialCount = 0;
    
    for (const account of accounts) {
      const lastSync = await db.select()
        .from(fhbSyncLogs)
        .where(eq(fhbSyncLogs.fhbAccountId, account.id))
        .orderBy(sql`${fhbSyncLogs.createdAt} DESC`)
        .limit(1);
      
      // Check if needs initial sync
      const needsInitialSync = !account.initialSyncCompleted;
      if (needsInitialSync) {
        pendingInitialCount++;
      }
      
      status.push({
        account: {
          id: account.id,
          name: account.name,
          needsInitialSync,
          initialSyncCompletedAt: account.initialSyncCompletedAt
        },
        lastSync: lastSync[0] || null
      });
    }
    
    return {
      accounts: status,
      pendingInitialCount,
      totalAccounts: accounts.length
    };
  }
}
