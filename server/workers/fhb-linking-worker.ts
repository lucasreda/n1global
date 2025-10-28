// 🔗 FHB Linking Worker - Links staging orders to operations
// Processes fhb_orders table and creates/updates orders based on operation prefix

import { db } from '../db';
import { fhbOrders, orders, operations, fulfillmentIntegrations, userWarehouseAccountOperations, userWarehouseAccounts } from '@shared/schema';
import { eq, and, inArray, sql, or } from 'drizzle-orm';

// Reentrancy guard
let isLinkingRunning = false;

/**
 * Map FHB status to orders table status
 */
function mapFHBStatus(fhbStatus: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'pending',
    'processing': 'confirmed',
    'shipped': 'shipped',
    'sent': 'shipped',
    'delivered': 'delivered',
    'canceled': 'cancelled',
    'cancelled': 'cancelled',
    'rejected': 'cancelled' // Customer rejected/refused delivery
  };
  
  return statusMap[fhbStatus.toLowerCase()] || 'pending';
}

/**
 * Find operation by order prefix from cached operations list
 */
function findOperationByPrefix(
  variableSymbol: string,
  operationsList: (typeof operations.$inferSelect)[]
): typeof operations.$inferSelect | null {
  for (const operation of operationsList) {
    if (!operation.shopifyOrderPrefix) continue;
    
    if (variableSymbol.startsWith(operation.shopifyOrderPrefix)) {
      return operation;
    }
  }
  
  return null;
}

/**
 * Build a cache of all FHB warehouse account operations
 * Maps warehouse account ID → operations array
 */
async function buildAccountOperationsCache(): Promise<Map<string, typeof operations.$inferSelect[]>> {
  // Step 1: Get active FHB warehouse account IDs
  // Include both 'active' and 'pending' (during initial sync)
  const activeAccounts = await db.select({ id: userWarehouseAccounts.id })
    .from(userWarehouseAccounts)
    .where(
      and(
        eq(userWarehouseAccounts.providerKey, 'fhb'),
        inArray(userWarehouseAccounts.status, ['active', 'pending'])
      )
    );
  
  if (activeAccounts.length === 0) {
    console.log('📦 No active FHB warehouse accounts found');
    return new Map();
  }
  
  const accountIds = activeAccounts.map(a => a.id);
  
  // Step 2: Fetch operations for these accounts
  const accountOperations = await db.select()
    .from(userWarehouseAccountOperations)
    .innerJoin(operations, eq(userWarehouseAccountOperations.operationId, operations.id))
    .where(inArray(userWarehouseAccountOperations.accountId, accountIds));
  
  const cache = new Map<string, typeof operations.$inferSelect[]>();
  
  for (const row of accountOperations) {
    const accountId = row.user_warehouse_account_operations.accountId;
    
    if (!cache.has(accountId)) {
      cache.set(accountId, []);
    }
    cache.get(accountId)!.push(row.operations);
  }
  
  console.log(`📦 Cached ${cache.size} FHB warehouse accounts with ${accountOperations.length} total operations`);
  return cache;
}

/**
 * Process unprocessed FHB orders and link to operations
 * Runs in continuous loop until backlog is cleared
 */
async function processUnprocessedOrders() {
  // Prevent concurrent executions
  if (isLinkingRunning) {
    console.log('⏭️  Linking worker already running, skipping...');
    return;
  }
  
  isLinkingRunning = true;
  
  try {
    console.log('🔗 FHB Linking Worker: Processing unprocessed orders...');
    
    // Build cache of account operations ONCE
    console.log('📚 Building account operations cache...');
    const accountOpsCache = await buildAccountOperationsCache();
    console.log(`✅ Cached operations for ${accountOpsCache.size} FHB accounts`);
    
    // Process in continuous loop until backlog is cleared
    let totalProcessed = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let batchCount = 0;
    
    const BATCH_SIZE = 500; // Increased from 100
    
    while (true) {
      batchCount++;
      
      // Get active FHB account IDs only
      const activeFhbAccounts = await db.select({ id: userWarehouseAccounts.id })
        .from(userWarehouseAccounts)
        .where(
          and(
            eq(userWarehouseAccounts.providerKey, 'fhb'),
            inArray(userWarehouseAccounts.status, ['active', 'pending'])
          )
        );
      
      const fhbAccountIds = activeFhbAccounts.map(a => a.id);
      
      // Fetch unprocessed orders ONLY from FHB accounts
      const unprocessedOrders = await db.select()
        .from(fhbOrders)
        .where(
          and(
            eq(fhbOrders.processedToOrders, false),
            fhbAccountIds.length > 0
              ? or(
                  inArray(fhbOrders.warehouseAccountId, fhbAccountIds),
                  inArray(fhbOrders.fhbAccountId, fhbAccountIds) // Support legacy field
                )
              : sql`false` // No accounts = no orders to process
          )
        )
        .limit(BATCH_SIZE);
      
      if (unprocessedOrders.length === 0) {
        console.log(`✅ Backlog cleared! Processed ${totalProcessed} total orders in ${batchCount - 1} batches`);
        break;
      }
      
      console.log(`📦 Batch ${batchCount}: Processing ${unprocessedOrders.length} orders...`);
      
      let batchProcessed = 0;
      let batchCreated = 0;
      let batchUpdated = 0;
      let batchSkipped = 0;
      
      for (const fhbOrder of unprocessedOrders) {
        try {
          // Get operations for this FHB account from cache
          // Support both new (warehouseAccountId) and legacy (fhbAccountId) fields
          const accountId = fhbOrder.warehouseAccountId || fhbOrder.fhbAccountId;
          if (!accountId) {
            batchSkipped++;
            continue;
          }
          const accountOperations = accountOpsCache.get(accountId) || [];
          
          // Find operation by prefix
          const operation = findOperationByPrefix(
            fhbOrder.variableSymbol,
            accountOperations
          );
          
          if (!operation) {
            // No matching operation - mark as processed to avoid infinite loop
            // These can be reprocessed later via admin interface or when sync updates them
            await db.update(fhbOrders)
              .set({
                processedToOrders: true,
                processedAt: new Date()
              })
              .where(eq(fhbOrders.id, fhbOrder.id));
            
            batchSkipped++;
            continue;
          }
          
          // Check if order already exists in orders table
          const existingOrder = await db.select()
            .from(orders)
            .where(
              and(
                eq(orders.shopifyOrderNumber, fhbOrder.variableSymbol),
                eq(orders.operationId, operation.id)
              )
            )
            .limit(1);
          
          const rawData = fhbOrder.rawData as any;
          
          if (existingOrder.length > 0) {
            // Update existing order with FHB data
            const currentProviderData = existingOrder[0].providerData as any || {};
            
            await db.update(orders)
              .set({
                status: mapFHBStatus(fhbOrder.status),
                trackingNumber: fhbOrder.tracking,
                carrierImported: true,
                carrierOrderId: fhbOrder.fhbOrderId,
                provider: 'fhb',
                syncedFromFhb: true,
                lastSyncAt: new Date(),
                needsSync: false,
                providerData: {
                  ...currentProviderData,
                  fhb: {
                    orderId: fhbOrder.fhbOrderId,
                    status: fhbOrder.status,
                    variableSymbol: fhbOrder.variableSymbol,
                    tracking: fhbOrder.tracking,
                    value: fhbOrder.value,
                    updatedAt: new Date().toISOString()
                  }
                }
              })
              .where(eq(orders.id, existingOrder[0].id));
            
            batchUpdated++;
            
            // Mark as processed
            await db.update(fhbOrders)
              .set({
                processedToOrders: true,
                processedAt: new Date()
              })
              .where(eq(fhbOrders.id, fhbOrder.id));
          } else {
            // No match found - skip (do not create new orders)
            console.warn(`⚠️ No Shopify match found for FHB order ${fhbOrder.variableSymbol}, skipping (waiting for Shopify sync)`);
            batchSkipped++;
            
            // DO NOT mark as processed - leave it for future matching attempts
            continue;
          }
          
          batchProcessed++;
          
        } catch (orderError: any) {
          console.error(`❌ Error processing FHB order ${fhbOrder.fhbOrderId}:`, orderError);
          batchSkipped++;
        }
      }
      
      totalProcessed += batchProcessed;
      totalCreated += batchCreated;
      totalUpdated += batchUpdated;
      totalSkipped += batchSkipped;
      
      console.log(`✅ Batch ${batchCount} completed: ${batchProcessed} processed, ${batchCreated} created, ${batchUpdated} updated, ${batchSkipped} skipped`);
    }
    
    console.log(`✅ Final stats: ${totalProcessed} processed, ${totalCreated} created, ${totalUpdated} updated, ${totalSkipped} skipped`);
    
  } catch (error: any) {
    console.error('❌ FHB Linking Worker error:', error);
  } finally {
    isLinkingRunning = false;
  }
}

/**
 * Start the linking worker (runs every 2 minutes)
 */
export function startFHBLinkingWorker() {
  console.log('🚀 FHB Linking Worker started (runs every 2 minutes)');
  
  // Run immediately on start
  processUnprocessedOrders().catch(err => {
    console.error('❌ Initial linking failed:', err);
  });
  
  // Schedule to run every 2 minutes
  setInterval(() => {
    processUnprocessedOrders().catch(err => {
      console.error('❌ Scheduled linking failed:', err);
    });
  }, 2 * 60 * 1000); // 2 minutes
}
