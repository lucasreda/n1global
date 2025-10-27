// 📦 eLogy Linking Worker
// Links staging orders from elogy_orders to operations.orders
// Uses shopifyOrderPrefix for matching orders to correct operations

import { db } from '../db';
import { elogyOrders, orders, operations, userWarehouseAccountOperations, userWarehouseAccounts } from '@shared/schema';
import { eq, and, inArray, isNull } from 'drizzle-orm';

// Reentrancy guard
let isLinkingRunning = false;

/**
 * Map provider statuses to orders table status
 * Maps eLogy specific statuses to standard order statuses
 */
function mapProviderStatus(status: string): string {
  const statusMap: Record<string, string> = {
    // Standard statuses
    'pending': 'pending',
    'processing': 'processing',
    'shipped': 'shipped',
    'delivered': 'delivered',
    'canceled': 'cancelled',
    'cancelled': 'cancelled',
    'returned': 'returned',
    // eLogy specific
    'in_warehouse': 'confirmed',
    'in_transit': 'shipped',
    'out_for_delivery': 'shipped'
  };
  
  return statusMap[status?.toLowerCase()] || 'pending';
}

/**
 * Links eLogy staging orders to operation orders
 * Runs every 2 minutes to process unprocessed orders
 */
export async function startElogyLinkingWorker() {
  console.log('🔗 eLogy Linking Worker started (runs every 2 minutes)');
  
  // Initial run
  await processUnprocessedOrders();
  
  // Schedule recurring runs every 2 minutes
  setInterval(async () => {
    await processUnprocessedOrders();
  }, 2 * 60 * 1000); // 2 minutes
}

/**
 * Build cache of account → operations mapping
 * Returns Map<accountId, operationId[]>
 */
async function buildAccountOperationsCache(): Promise<Map<string, string[]>> {
  const cache = new Map<string, string[]>();
  
  console.log('📚 Building account operations cache...');
  
  // Step 1: Get all active eLogy account IDs
  const activeAccounts = await db.select({ id: userWarehouseAccounts.id })
    .from(userWarehouseAccounts)
    .where(
      and(
        eq(userWarehouseAccounts.providerKey, 'elogy'),
        eq(userWarehouseAccounts.status, 'active')
      )
    );
  
  if (activeAccounts.length === 0) {
    console.log('ℹ️ No active eLogy accounts found');
    return cache;
  }
  
  const accountIds = activeAccounts.map(a => a.id);
  
  // Step 2: Get all operation links for these accounts
  const accountOps = await db.select({
    accountId: userWarehouseAccountOperations.accountId,
    operationId: userWarehouseAccountOperations.operationId
  })
    .from(userWarehouseAccountOperations)
    .where(inArray(userWarehouseAccountOperations.accountId, accountIds));
  
  // Build cache
  for (const { accountId, operationId } of accountOps) {
    if (!cache.has(accountId)) {
      cache.set(accountId, []);
    }
    cache.get(accountId)!.push(operationId);
  }
  
  console.log(`✅ Cache built: ${cache.size} accounts with linked operations`);
  return cache;
}

/**
 * Process all unprocessed eLogy orders from staging table
 */
async function processUnprocessedOrders() {
  // Prevent concurrent execution
  if (isLinkingRunning) {
    console.log('⏭️ eLogy Linking Worker: Already running, skipping this cycle');
    return;
  }
  
  isLinkingRunning = true;
  
  try {
    console.log('🔗 eLogy Linking Worker: Processing unprocessed orders...');
    
    // Build account → operations cache
    const accountOpsCache = await buildAccountOperationsCache();
    
    if (accountOpsCache.size === 0) {
      console.log('ℹ️ No eLogy accounts with operations configured');
      return;
    }
    
    // Get unprocessed staging orders
    const stagingOrders = await db.select()
      .from(elogyOrders)
      .where(eq(elogyOrders.processedToOrders, false))
      .limit(100); // Process in batches
    
    if (stagingOrders.length === 0) {
      console.log('✅ No unprocessed eLogy orders');
      return;
    }
    
    console.log(`📊 Found ${stagingOrders.length} unprocessed eLogy order(s)`);
    
    let processed = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;
    
    for (const stagingOrder of stagingOrders) {
      try {
        // Skip if account not linked
        if (!stagingOrder.accountId) {
          console.warn(`⚠️ Staging order ${stagingOrder.orderNumber} has no accountId, skipping`);
          skipped++;
          continue;
        }
        
        // Get operations for this account
        const linkedOperations = accountOpsCache.get(stagingOrder.accountId) || [];
        
        if (linkedOperations.length === 0) {
          console.warn(`⚠️ Account ${stagingOrder.accountId} has no linked operations, skipping order ${stagingOrder.orderNumber}`);
          skipped++;
          continue;
        }
        
        // Get operation details with shopifyOrderPrefix
        const opsWithPrefix = await db.select()
          .from(operations)
          .where(inArray(operations.id, linkedOperations));
        
        // Match order to operation using shopifyOrderPrefix
        let matchedOperation = null;
        
        for (const op of opsWithPrefix) {
          if (op.shopifyOrderPrefix && stagingOrder.orderNumber?.startsWith(op.shopifyOrderPrefix)) {
            matchedOperation = op;
            break;
          }
        }
        
        // If no prefix match, use first operation (fallback)
        if (!matchedOperation && opsWithPrefix.length > 0) {
          matchedOperation = opsWithPrefix[0];
          console.warn(`⚠️ No prefix match for ${stagingOrder.orderNumber}, using fallback operation ${matchedOperation.name}`);
        }
        
        if (!matchedOperation) {
          console.warn(`⚠️ No operation found for order ${stagingOrder.orderNumber}, skipping`);
          skipped++;
          continue;
        }
        
        // Check if order already exists
        const existingOrder = await db.select()
          .from(orders)
          .where(eq(orders.id, stagingOrder.orderNumber))
          .limit(1);
        
        if (existingOrder.length > 0) {
          // Update existing order
          await db.update(orders)
            .set({
              status: mapProviderStatus(stagingOrder.status), // Use mapping function
              trackingNumber: stagingOrder.tracking || null,
              total: stagingOrder.value || '0',
              carrierImported: true,
              carrierMatchedAt: new Date(),
              carrierOrderId: stagingOrder.elogyOrderId,
              provider: 'elogy',
              providerData: stagingOrder.rawData,
              lastStatusUpdate: new Date()
            })
            .where(eq(orders.id, stagingOrder.orderNumber));
          
          updated++;
          
          // Mark staging order as processed
          await db.update(elogyOrders)
            .set({
              processedToOrders: true,
              processedAt: new Date()
            })
            .where(eq(elogyOrders.id, stagingOrder.id));
        } else {
          // No match found - skip (do not create new orders)
          console.warn(`⚠️ No Shopify match found for eLogy order ${stagingOrder.orderNumber}, skipping (waiting for Shopify sync)`);
          skipped++;
          
          // DO NOT mark as processed - leave it for future matching attempts
          continue;
        }
        
        processed++;
        
      } catch (error: any) {
        console.error(`❌ Error processing eLogy order ${stagingOrder.orderNumber}:`, error.message);
        skipped++;
      }
    }
    
    console.log(`✅ eLogy Linking completed: ${processed} processed (${created} created, ${updated} updated, ${skipped} skipped)`);
    
  } catch (error: any) {
    console.error('❌ eLogy Linking Worker error:', error);
  } finally {
    isLinkingRunning = false;
  }
}
