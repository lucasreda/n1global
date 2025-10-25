// 🇪🇺 European Fulfillment Linking Worker
// Links staging orders from european_fulfillment_orders to operations.orders
// Uses shopifyOrderPrefix for matching orders to correct operations

import { db } from '../db';
import { europeanFulfillmentOrders, orders, operations, userWarehouseAccountOperations, userWarehouseAccounts } from '@shared/schema';
import { eq, and, inArray, isNull } from 'drizzle-orm';

// Reentrancy guard
let isLinkingRunning = false;

/**
 * Links European Fulfillment staging orders to operation orders
 * Runs every 2 minutes to process unprocessed orders
 */
export async function startEuropeanFulfillmentLinkingWorker() {
  console.log('🔗 European Fulfillment Linking Worker started (runs every 2 minutes)');
  
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
  
  // Step 1: Get all active European Fulfillment account IDs
  const activeAccounts = await db.select({ id: userWarehouseAccounts.id })
    .from(userWarehouseAccounts)
    .where(
      and(
        eq(userWarehouseAccounts.providerKey, 'european_fulfillment'),
        eq(userWarehouseAccounts.status, 'active')
      )
    );
  
  if (activeAccounts.length === 0) {
    console.log('ℹ️ No active European Fulfillment accounts found');
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
 * Process all unprocessed European Fulfillment orders from staging table
 */
async function processUnprocessedOrders() {
  // Prevent concurrent execution
  if (isLinkingRunning) {
    console.log('⏭️ European Fulfillment Linking Worker: Already running, skipping this cycle');
    return;
  }
  
  isLinkingRunning = true;
  
  try {
    console.log('🔗 European Fulfillment Linking Worker: Processing unprocessed orders...');
    
    // Build account → operations cache
    const accountOpsCache = await buildAccountOperationsCache();
    
    if (accountOpsCache.size === 0) {
      console.log('ℹ️ No European Fulfillment accounts with operations configured');
      return;
    }
    
    // Get unprocessed staging orders
    const stagingOrders = await db.select()
      .from(europeanFulfillmentOrders)
      .where(eq(europeanFulfillmentOrders.processedToOrders, false))
      .limit(100); // Process in batches
    
    if (stagingOrders.length === 0) {
      console.log('✅ No unprocessed European Fulfillment orders');
      return;
    }
    
    console.log(`📊 Found ${stagingOrders.length} unprocessed European Fulfillment order(s)`);
    
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
              status: stagingOrder.status || 'pending',
              trackingNumber: stagingOrder.tracking || null,
              total: stagingOrder.value || '0',
              providerData: stagingOrder.rawData,
              lastStatusUpdate: new Date()
            })
            .where(eq(orders.id, stagingOrder.orderNumber));
          
          updated++;
        } else {
          // Create new order
          await db.insert(orders).values({
            id: stagingOrder.orderNumber,
            storeId: matchedOperation.storeId,
            operationId: matchedOperation.id,
            dataSource: 'carrier',
            carrierImported: true,
            carrierMatchedAt: new Date(),
            carrierOrderId: stagingOrder.europeanOrderId,
            status: stagingOrder.status || 'pending',
            paymentMethod: 'cod',
            total: stagingOrder.value || '0',
            currency: matchedOperation.currency || 'EUR',
            provider: 'european_fulfillment',
            trackingNumber: stagingOrder.tracking || null,
            providerData: stagingOrder.rawData,
            orderDate: new Date(),
            lastStatusUpdate: new Date()
          });
          
          created++;
        }
        
        // Mark staging order as processed
        await db.update(europeanFulfillmentOrders)
          .set({
            processedToOrders: true,
            processedAt: new Date()
          })
          .where(eq(europeanFulfillmentOrders.id, stagingOrder.id));
        
        processed++;
        
      } catch (error: any) {
        console.error(`❌ Error processing European Fulfillment order ${stagingOrder.orderNumber}:`, error.message);
        skipped++;
      }
    }
    
    console.log(`✅ European Fulfillment Linking completed: ${processed} processed (${created} created, ${updated} updated, ${skipped} skipped)`);
    
  } catch (error: any) {
    console.error('❌ European Fulfillment Linking Worker error:', error);
  } finally {
    isLinkingRunning = false;
  }
}
