// 🔄 FHB Sync Service - Centralized order synchronization
// Pulls ALL orders from FHB accounts into N1's central database
// Operations filter orders by configured prefix

import { db } from '../db';
import { orders, fhbAccounts, fhbSyncLogs, operations, fulfillmentIntegrations } from '@shared/schema';
import { eq, and, gte, inArray } from 'drizzle-orm';
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
      const fhbOrders = await this.fetchFHBOrders(fhbService, fromStr, toStr);
      console.log(`📦 Fetched ${fhbOrders.length} orders from FHB`);
      
      // Get operations using this FHB account
      const accountOperations = await db.select()
        .from(fulfillmentIntegrations)
        .innerJoin(operations, eq(fulfillmentIntegrations.operationId, operations.id))
        .where(
          and(
            eq(fulfillmentIntegrations.fhbAccountId, account.id),
            eq(fulfillmentIntegrations.status, 'active')
          )
        );
      
      console.log(`🏢 ${accountOperations.length} operations using this FHB account`);
      
      // Process each FHB order
      for (const fhbOrder of fhbOrders) {
        stats.ordersProcessed++;
        
        // Only sync orders in non-final states to reduce load
        if (this.isFinalState(fhbOrder.status)) {
          stats.ordersSkipped++;
          continue;
        }
        
        try {
          // Determine which operation this order belongs to based on prefix
          const operation = this.findOperationByPrefix(
            fhbOrder.variable_symbol,
            accountOperations.map(ao => ao.operations)
          );
          
          if (!operation) {
            console.log(`⚠️ No operation found for order ${fhbOrder.variable_symbol}`);
            stats.ordersSkipped++;
            continue;
          }
          
          // Check if order already exists by shopifyOrderNumber
          const existingOrder = await db.select()
            .from(orders)
            .where(
              and(
                eq(orders.shopifyOrderNumber, fhbOrder.variable_symbol),
                eq(orders.operationId, operation.id)
              )
            )
            .limit(1);
          
          if (existingOrder.length > 0) {
            // Update existing order
            const currentProviderData = existingOrder[0].providerData as any || {};
            
            await db.update(orders)
              .set({
                status: this.mapFHBStatus(fhbOrder.status),
                trackingNumber: fhbOrder.tracking,
                syncedFromFhb: true,
                lastSyncAt: new Date(),
                needsSync: false,
                providerData: {
                  ...currentProviderData,
                  fhb: {
                    orderId: fhbOrder.id,
                    status: fhbOrder.status,
                    variableSymbol: fhbOrder.variable_symbol,
                    tracking: fhbOrder.tracking,
                    value: fhbOrder.value,
                    updatedAt: new Date().toISOString()
                  }
                }
              })
              .where(eq(orders.id, existingOrder[0].id));
            
            stats.ordersUpdated++;
            console.log(`✅ Updated order ${fhbOrder.variable_symbol}`);
          } else {
            // Create new order - need storeId from operation
            const operationRecord = await db.select()
              .from(operations)
              .where(eq(operations.id, operation.id))
              .limit(1);
            
            if (!operationRecord[0]) {
              console.error(`❌ Operation ${operation.id} not found`);
              stats.ordersSkipped++;
              continue;
            }
            
            await db.insert(orders).values({
              id: `fhb_${fhbOrder.id}`,
              storeId: operationRecord[0].storeId,
              operationId: operation.id,
              dataSource: 'carrier',
              carrierImported: true,
              carrierOrderId: fhbOrder.id,
              shopifyOrderNumber: fhbOrder.variable_symbol,
              customerName: fhbOrder.recipient?.address?.name || 'Unknown',
              total: fhbOrder.value,
              status: this.mapFHBStatus(fhbOrder.status),
              trackingNumber: fhbOrder.tracking,
              provider: 'fhb',
              syncedFromFhb: true,
              lastSyncAt: new Date(),
              needsSync: false,
              providerData: {
                fhb: {
                  orderId: fhbOrder.id,
                  status: fhbOrder.status,
                  variableSymbol: fhbOrder.variable_symbol,
                  value: fhbOrder.value,
                  recipient: fhbOrder.recipient,
                  items: fhbOrder.items,
                  createdAt: fhbOrder.created_at
                }
              },
              orderDate: new Date(fhbOrder.created_at),
              createdAt: new Date(fhbOrder.created_at)
            });
            
            stats.ordersCreated++;
            console.log(`✨ Created order ${fhbOrder.variable_symbol}`);
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
   */
  private async fetchFHBOrders(
    fhbService: FHBService,
    from: string,
    to: string
  ): Promise<FHBOrder[]> {
    const allOrders: FHBOrder[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
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
        
        // Safety limit to prevent infinite loops
        if (page > 100) {
          console.warn('⚠️ Reached page limit (100), stopping pagination');
          break;
        }
      } catch (error: any) {
        console.error(`❌ Error fetching page ${page}:`, error);
        break;
      }
    }
    
    return allOrders;
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
   * Check if order is in a final state (no need to sync)
   */
  private isFinalState(fhbStatus: string): boolean {
    const finalStates = ['delivered', 'rejected', 'cancelled'];
    return finalStates.includes(fhbStatus.toLowerCase());
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
    
    for (const account of accounts) {
      const lastSync = await db.select()
        .from(fhbSyncLogs)
        .where(eq(fhbSyncLogs.fhbAccountId, account.id))
        .orderBy(fhbSyncLogs.createdAt)
        .limit(1);
      
      status.push({
        account: {
          id: account.id,
          name: account.name
        },
        lastSync: lastSync[0] || null
      });
    }
    
    return status;
  }
}
