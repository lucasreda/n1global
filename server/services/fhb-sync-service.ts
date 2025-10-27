// 🔄 FHB Sync Service - Centralized order synchronization
// Pulls ALL orders from FHB accounts into N1's central database
// Operations filter orders by configured prefix

import { db } from '../db';
import { orders, fhbAccounts, fhbSyncLogs, fhbOrders, operations, fulfillmentIntegrations, userWarehouseAccounts } from '@shared/schema';
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
    
    // Fetch active FHB warehouse accounts
    const activeAccounts = await db.select()
      .from(userWarehouseAccounts)
      .where(
        and(
          eq(userWarehouseAccounts.providerKey, 'fhb'),
          eq(userWarehouseAccounts.status, 'active')
        )
      );
    
    console.log(`📊 Found ${activeAccounts.length} active FHB warehouse accounts`);
    
    for (const account of activeAccounts) {
      // Convert user_warehouse_account to fhbAccount format for compatibility
      await this.syncWarehouseAccount(account, 'deep', 30);
    }
    
    console.log('✅ FHB Deep Sync completed');
  }
  
  /**
   * Fast Sync: 10 days, runs every 30min
   * Only syncs orders in non-final states for quick updates
   */
  async syncFast(): Promise<void> {
    console.log('⚡ FHB Fast Sync started (10 days)');
    
    // Fetch active FHB warehouse accounts
    const activeAccounts = await db.select()
      .from(userWarehouseAccounts)
      .where(
        and(
          eq(userWarehouseAccounts.providerKey, 'fhb'),
          eq(userWarehouseAccounts.status, 'active')
        )
      );
    
    console.log(`📊 Found ${activeAccounts.length} active FHB warehouse accounts`);
    
    for (const account of activeAccounts) {
      await this.syncWarehouseAccount(account, 'fast', 10);
    }
    
    console.log('✅ FHB Fast Sync completed');
  }
  
  /**
   * Initial Sync: 90 days historical backfill in 30-day windows
   * Runs once per account to ensure complete order history
   */
  async syncInitial(): Promise<void> {
    console.log('🚀 FHB Initial Sync started (90 days backfill)');
    
    // Fetch FHB warehouse accounts needing initial sync
    const accountsNeedingInitialSync = await db.select()
      .from(userWarehouseAccounts)
      .where(
        and(
          eq(userWarehouseAccounts.providerKey, 'fhb'),
          eq(userWarehouseAccounts.status, 'active'),
          eq(userWarehouseAccounts.initialSyncCompleted, false)
        )
      );
    
    if (accountsNeedingInitialSync.length === 0) {
      console.log('✅ No accounts need initial sync');
      return;
    }
    
    console.log(`📊 Found ${accountsNeedingInitialSync.length} accounts needing initial sync`);
    
    for (const account of accountsNeedingInitialSync) {
      await this.performInitialSyncWarehouse(account);
    }
    
    console.log('✅ FHB Initial Sync completed');
  }
  
  /**
   * Trigger initial sync for a specific account (3 months lookback)
   * Called when a new warehouse account is created
   */
  async triggerInitialSyncForAccount(accountId: string, lookbackDays: number = 90): Promise<void> {
    console.log(`🚀 Triggering initial sync for FHB account ${accountId} (${lookbackDays} days)`);
    
    // Fetch the account
    const accounts = await db.select()
      .from(userWarehouseAccounts)
      .where(eq(userWarehouseAccounts.id, accountId))
      .limit(1);
    
    if (accounts.length === 0) {
      throw new Error(`FHB account ${accountId} not found`);
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
      // Perform the initial sync with custom lookback period
      await this.performInitialSyncWithCustomWindow(account, lookbackDays);
      
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
   * Perform initial sync with custom window (for new accounts - 3 months)
   */
  private async performInitialSyncWithCustomWindow(
    warehouseAccount: typeof userWarehouseAccounts.$inferSelect,
    lookbackDays: number
  ): Promise<void> {
    const legacyAccount = this.convertToLegacyFormat(warehouseAccount);
    console.log(`🚀 Starting initial sync for warehouse account: ${warehouseAccount.displayName} (${lookbackDays} days backfill)`);
    
    const startTime = Date.now();
    let totalStats: SyncStats = {
      ordersProcessed: 0,
      ordersCreated: 0,
      ordersUpdated: 0,
      ordersSkipped: 0
    };
    
    // TODO: Create generic sync logs for user_warehouse_accounts
    // Temporarily disabled - fhbSyncLogs references legacy fhb_accounts table
    // const [syncLog] = await db.insert(fhbSyncLogs).values({
    //   fhbAccountId: legacyAccount.id,
    //   syncType: 'initial',
    //   status: 'started',
    //   startedAt: new Date()
    // }).returning();
    const syncLog = { id: 'temp-log-id' }; // Placeholder for now
    
    try {
      // Initialize FHB service
      const fhbService = new FHBService({
        appId: legacyAccount.appId,
        secret: legacyAccount.secret,
        apiUrl: legacyAccount.apiUrl
      });
      
      // Calculate lookback period
      const today = new Date();
      const startDate = new Date(today.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
      
      // Build windows to cover the period
      const windowSizeDays = 30;
      let windowStart = new Date(startDate);
      let windowNumber = 1;
      
      while (windowStart < today) {
        const windowEnd = new Date(Math.min(
          windowStart.getTime() + windowSizeDays * 24 * 60 * 60 * 1000,
          today.getTime()
        ));
        
        // Process window with automatic splitting
        await this.processWindowWithAutoSplit(
          fhbService,
          legacyAccount,
          windowStart,
          windowEnd,
          windowNumber,
          totalStats,
          0, // depth
          warehouseAccount.id // Pass warehouse account ID for new system
        );
        
        // Move to next window
        windowStart = new Date(windowEnd);
        windowNumber++;
      }
      
      const duration = Date.now() - startTime;
      
      // TODO: Update generic sync logs
      // Temporarily disabled - fhbSyncLogs references legacy fhb_accounts table
      // await db.update(fhbSyncLogs)
      //   .set({
      //     status: 'completed',
      //     ordersProcessed: totalStats.ordersProcessed,
      //     ordersCreated: totalStats.ordersCreated,
      //     ordersUpdated: totalStats.ordersUpdated,
      //     ordersSkipped: totalStats.ordersSkipped,
      //     completedAt: new Date(),
      //     durationMs: duration
      //   })
      //   .where(eq(fhbSyncLogs.id, syncLog.id));
      
      console.log(`✅ Initial sync completed for ${warehouseAccount.displayName}`);
      console.log(`   📊 Stats: ${totalStats.ordersCreated} created, ${totalStats.ordersUpdated} updated, ${totalStats.ordersSkipped} skipped`);
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // TODO: Update generic sync logs with failure
      // Temporarily disabled - fhbSyncLogs references legacy fhb_accounts table
      // await db.update(fhbSyncLogs)
      //   .set({
      //     status: 'failed',
      //     errorMessage: error.message,
      //     completedAt: new Date(),
      //     durationMs: duration
      //   })
      //   .where(eq(fhbSyncLogs.id, syncLog.id));
      
      throw error;
    }
  }
  
  /**
   * Helper: Convert userWarehouseAccount to legacy fhbAccount format
   * This allows reusing existing sync logic
   */
  private convertToLegacyFormat(warehouseAccount: typeof userWarehouseAccounts.$inferSelect): typeof fhbAccounts.$inferSelect {
    const credentials = warehouseAccount.credentials as Record<string, any>;
    
    console.log('🔍 Converting warehouse account to legacy format:', {
      accountId: warehouseAccount.id,
      displayName: warehouseAccount.displayName,
      credentialsKeys: Object.keys(credentials || {}),
      hasAppId: !!(credentials.appId || credentials.app_id),
      hasSecret: !!credentials.secret,
      appIdLength: (credentials.appId || credentials.app_id || '').length,
      secretLength: (credentials.secret || '').length
    });
    
    return {
      id: warehouseAccount.id,
      name: warehouseAccount.displayName,
      appId: credentials.appId || credentials.app_id || '',
      secret: credentials.secret || '',
      apiUrl: credentials.apiUrl || credentials.api_url || undefined,
      status: warehouseAccount.status,
      initialSyncCompleted: warehouseAccount.initialSyncCompleted || false,
      initialSyncCompletedAt: warehouseAccount.initialSyncCompletedAt || null,
      createdAt: warehouseAccount.createdAt,
      updatedAt: warehouseAccount.updatedAt
    } as typeof fhbAccounts.$inferSelect;
  }
  
  /**
   * Sync a user warehouse account (wrapper for legacy syncAccount)
   */
  private async syncWarehouseAccount(
    warehouseAccount: typeof userWarehouseAccounts.$inferSelect,
    syncType: 'deep' | 'fast',
    days: number
  ): Promise<void> {
    const legacyAccount = this.convertToLegacyFormat(warehouseAccount);
    await this.syncAccount(legacyAccount, syncType, days);
  }
  
  /**
   * Perform initial sync for warehouse account
   * Full implementation that updates user_warehouse_accounts table
   */
  private async performInitialSyncWarehouse(warehouseAccount: typeof userWarehouseAccounts.$inferSelect): Promise<void> {
    const legacyAccount = this.convertToLegacyFormat(warehouseAccount);
    console.log(`🚀 Starting initial sync for warehouse account: ${warehouseAccount.displayName} (90 days backfill)`);
    
    const startTime = Date.now();
    let totalStats: SyncStats = {
      ordersProcessed: 0,
      ordersCreated: 0,
      ordersUpdated: 0,
      ordersSkipped: 0
    };
    
    let hadErrors = false;
    const errorWindows: string[] = [];
    
    // TODO: Create generic sync logs for user_warehouse_accounts
    // Temporarily disabled - fhbSyncLogs references legacy fhb_accounts table
    // const [syncLog] = await db.insert(fhbSyncLogs).values({
    //   fhbAccountId: legacyAccount.id,
    //   syncType: 'initial',
    //   status: 'started',
    //   startedAt: new Date()
    // }).returning();
    const syncLog = { id: 'temp-log-id' }; // Placeholder for now
    
    try {
      // Initialize FHB service
      const fhbService = new FHBService({
        appId: legacyAccount.appId,
        secret: legacyAccount.secret,
        apiUrl: legacyAccount.apiUrl
      });
      
      // Calculate 90 days back from today
      const today = new Date();
      const twoYearsAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
      
      // Build windows dynamically to cover exactly 90 days
      const windowSizeDays = 30;
      let windowStart = new Date(twoYearsAgo);
      let windowNumber = 1;
      
      while (windowStart < today) {
        const windowEnd = new Date(Math.min(
          windowStart.getTime() + windowSizeDays * 24 * 60 * 60 * 1000,
          today.getTime()
        ));
        
        // Process window with automatic splitting
        const result = await this.processWindowWithAutoSplit(
          fhbService,
          legacyAccount,
          windowStart,
          windowEnd,
          windowNumber,
          totalStats
        );
        
        if (!result.success) {
          hadErrors = true;
          const fromStr = windowStart.toISOString().split('T')[0];
          const toStr = windowEnd.toISOString().split('T')[0];
          errorWindows.push(`${fromStr} to ${toStr} (${result.error})`);
        }
        
        // Move to next window
        windowStart = new Date(windowEnd);
        windowNumber++;
      }
      
      const duration = Date.now() - startTime;
      
      // Only mark as completed if NO errors occurred
      if (!hadErrors) {
        // Mark warehouse account as completed
        await db.update(userWarehouseAccounts)
          .set({
            initialSyncCompleted: true,
            initialSyncCompletedAt: new Date()
          })
          .where(eq(userWarehouseAccounts.id, warehouseAccount.id));
        
        // Also update legacy table for backward compatibility
        await db.update(fhbAccounts)
          .set({
            initialSyncCompleted: true,
            initialSyncCompletedAt: new Date()
          })
          .where(eq(fhbAccounts.id, legacyAccount.id));
        
        // Mark sync log as completed
        await db.update(fhbSyncLogs)
          .set({
            status: 'completed',
            ordersProcessed: totalStats.ordersProcessed,
            ordersCreated: totalStats.ordersCreated,
            ordersUpdated: totalStats.ordersUpdated,
            ordersSkipped: totalStats.ordersSkipped,
            completedAt: new Date(),
            durationMs: duration
          })
          .where(eq(fhbSyncLogs.id, syncLog.id));
        
        console.log(`✅ Initial sync completed successfully for ${warehouseAccount.displayName}`);
        console.log(`   📊 Stats: ${totalStats.ordersCreated} created, ${totalStats.ordersUpdated} updated, ${totalStats.ordersSkipped} skipped`);
        console.log(`   ⏱️ Duration: ${(duration / 1000 / 60).toFixed(1)} minutes`);
      } else {
        // Had errors - mark as failed
        await db.update(fhbSyncLogs)
          .set({
            status: 'failed',
            ordersProcessed: totalStats.ordersProcessed,
            ordersCreated: totalStats.ordersCreated,
            ordersUpdated: totalStats.ordersUpdated,
            ordersSkipped: totalStats.ordersSkipped,
            errorMessage: `Failed windows: ${errorWindows.join('; ')}`,
            completedAt: new Date(),
            durationMs: duration
          })
          .where(eq(fhbSyncLogs.id, syncLog.id));
        
        console.warn(`⚠️ Initial sync completed with errors for ${warehouseAccount.displayName}`);
        console.warn(`   Failed windows (${errorWindows.length}): ${errorWindows.join('; ')}`);
        console.warn(`   ⏭️ Sync will retry on next cycle`);
      }
    } catch (error: any) {
      // Fatal error during sync
      await db.update(fhbSyncLogs)
        .set({
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date(),
          durationMs: Date.now() - startTime
        })
        .where(eq(fhbSyncLogs.id, syncLog.id));
      
      console.error(`❌ Fatal error during initial sync for ${warehouseAccount.displayName}:`, error);
      throw error;
    }
  }
  
  /**
   * Process a window with automatic splitting if it hits the 99-page limit
   * This ensures ALL orders are captured regardless of volume
   */
  private async processWindowWithAutoSplit(
    fhbService: FHBService,
    account: typeof fhbAccounts.$inferSelect,
    windowStart: Date,
    windowEnd: Date,
    windowNumber: number,
    totalStats: SyncStats,
    depth: number = 0,
    warehouseAccountId?: string // Optional for new warehouse accounts
  ): Promise<{ success: boolean, error?: string }> {
    const fromStr = windowStart.toISOString().split('T')[0];
    const toStr = windowEnd.toISOString().split('T')[0];
    const indent = '  '.repeat(depth);
    
    console.log(`${indent}📅 Window ${windowNumber}: ${fromStr} to ${toStr}`);
    
    try {
      // Fetch orders for this window
      const fetchResult = await this.fetchFHBOrders(fhbService, fromStr, toStr);
      
      // Check if fetch had errors (API failures)
      if (!fetchResult.complete) {
        console.error(`${indent}❌ Window ${windowNumber} had API error: ${fetchResult.error}`);
        return { success: false, error: fetchResult.error };
      }
      
      const fetchedOrders = fetchResult.orders;
      console.log(`${indent}📦 Fetched ${fetchedOrders.length} orders`);
      
      // Check if we hit the page limit (99 pages = ~9900 orders)
      if (fetchResult.hitPageLimit) {
        // CRITICAL: Check if we're already at a single-day window
        // If fromStr === toStr, we cannot split further - this prevents infinite recursion
        if (fromStr === toStr) {
          console.warn(`${indent}⚠️ Single-day overflow detected: ${fromStr} has >9,900 orders`);
          console.warn(`${indent}   Processing first 9,900 orders, remaining will be skipped`);
          console.warn(`${indent}   Consider contacting FHB for bulk export or API pagination improvement`);
          
          // Process the 9,900 orders we did fetch (this is not a failure)
          // The orders are already in fetchedOrders, so we'll process them below
          // This is logged as a warning but not an error - the sync continues
        } else {
          console.log(`${indent}🔀 Window has more data - splitting into sub-windows...`);
          
          // Split window in half
          const windowDuration = windowEnd.getTime() - windowStart.getTime();
          const midPoint = new Date(windowStart.getTime() + windowDuration / 2);
          
          // Process first half
          console.log(`${indent}  ↪️ Processing first half...`);
          const firstHalf = await this.processWindowWithAutoSplit(
            fhbService,
            account,
            windowStart,
            midPoint,
            windowNumber,
            totalStats,
            depth + 1,
            warehouseAccountId
          );
          
          // Process second half
          console.log(`${indent}  ↪️ Processing second half...`);
          const secondHalf = await this.processWindowWithAutoSplit(
            fhbService,
            account,
            midPoint,
            windowEnd,
            windowNumber,
            totalStats,
            depth + 1,
            warehouseAccountId
          );
          
          // Both halves must succeed
          if (!firstHalf.success || !secondHalf.success) {
            return {
              success: false,
              error: firstHalf.error || secondHalf.error
            };
          }
          
          console.log(`${indent}✅ Split window processed successfully`);
          return { success: true };
        }
      }
      
      // No split needed - process orders normally
      for (const fhbOrder of fetchedOrders) {
        totalStats.ordersProcessed++;
        
        // Skip orders with null ID (invalid data from FHB API)
        if (!fhbOrder.id) {
          console.warn(`${indent}⚠️ Skipping order with null ID (variable_symbol: ${fhbOrder.variable_symbol || 'unknown'})`);
          totalStats.ordersSkipped++;
          continue;
        }
        
        try {
          // Upsert to fhb_orders staging table
          // Use warehouseAccountId if provided (new system), otherwise fhbAccountId (legacy)
          const accountIdField = warehouseAccountId ? fhbOrders.warehouseAccountId : fhbOrders.fhbAccountId;
          const accountIdValue = warehouseAccountId || account.id;
          
          const existingFhbOrder = await db.select()
            .from(fhbOrders)
            .where(
              and(
                eq(accountIdField, accountIdValue),
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
            const orderData: any = {
              fhbOrderId: fhbOrder.id,
              variableSymbol: fhbOrder.variable_symbol,
              status: fhbOrder.status,
              tracking: fhbOrder.tracking,
              value: fhbOrder.value.toString(),
              recipient: fhbOrder.recipient,
              items: fhbOrder.items,
              rawData: fhbOrder,
              processedToOrders: false, // Will be processed by linking worker
              processedAt: null
            };
            
            // Set appropriate account ID field
            if (warehouseAccountId) {
              orderData.warehouseAccountId = warehouseAccountId;
            } else {
              orderData.fhbAccountId = account.id;
            }
            
            await db.insert(fhbOrders).values(orderData);
            
            totalStats.ordersCreated++;
          }
        } catch (orderError: any) {
          console.error(`${indent}❌ Error processing order ${fhbOrder.id}:`, orderError);
          totalStats.ordersSkipped++;
        }
      }
      
      console.log(`${indent}✅ Window processed: ${totalStats.ordersCreated} created, ${totalStats.ordersUpdated} updated`);
      return { success: true };
      
    } catch (error: any) {
      console.error(`${indent}❌ Error processing window:`, error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Perform 2-year backfill for a single account in 30-day windows
   * Automatically splits windows that exceed the 99-page API limit
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
        
        // Process window with automatic splitting
        const result = await this.processWindowWithAutoSplit(
          fhbService,
          account,
          windowStart,
          windowEnd,
          windowNumber,
          totalStats
        );
        
        if (!result.success) {
          hadErrors = true;
          const fromStr = windowStart.toISOString().split('T')[0];
          const toStr = windowEnd.toISOString().split('T')[0];
          errorWindows.push(`${fromStr} to ${toStr} (${result.error})`);
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
        
        // Skip orders with null ID (invalid data from FHB API)
        if (!fhbOrder.id) {
          console.warn(`⚠️ Skipping order with null ID (variable_symbol: ${fhbOrder.variable_symbol || 'unknown'})`);
          stats.ordersSkipped++;
          continue;
        }
        
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
   * Fetch orders from FHB API with pagination and automatic window splitting
   * Returns object with orders and completion status
   * Note: Automatically detects when 99-page limit is hit and returns incomplete flag
   */
  private async fetchFHBOrders(
    fhbService: FHBService,
    from: string,
    to: string
  ): Promise<{ orders: FHBOrder[], complete: boolean, error?: string, hitPageLimit: boolean }> {
    const allOrders: FHBOrder[] = [];
    let page = 1;
    let hasMore = true;
    const MAX_PAGES = 99;
    let hitPageLimit = false;
    
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
          error: `Failed to fetch page ${page}: ${error.message}`,
          hitPageLimit: false
        };
      }
    }
    
    // Check if we hit the page limit (indicates there might be more data)
    if (page > MAX_PAGES && hasMore) {
      hitPageLimit = true;
      console.log(`⚠️ Hit ${MAX_PAGES}-page limit! Fetched ${allOrders.length} orders - window needs splitting`);
    }
    
    return { orders: allOrders, complete: true, hitPageLimit };
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
    // Get last sync for each FHB warehouse account
    const accounts = await db.select()
      .from(userWarehouseAccounts)
      .where(
        and(
          eq(userWarehouseAccounts.providerKey, 'fhb'),
          eq(userWarehouseAccounts.status, 'active')
        )
      );
    
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
          name: account.displayName,
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
