// 🔄 Staging Sync Service - Processes staging tables on-demand
// Used by "Sync Total" button to link warehouse orders without external API calls

import { db } from '../db';
import { 
  fhbOrders, 
  europeanFulfillmentOrders,
  elogyOrders,
  orders, 
  operations, 
  userWarehouseAccountOperations, 
  userWarehouseAccounts 
} from '@shared/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

interface SyncProgress {
  isRunning: boolean;
  phase: 'preparing' | 'syncing' | 'completed' | 'error';
  message: string;
  processedLeads: number;
  totalLeads: number;
  newLeads: number;
  updatedLeads: number;
  errors: number;
}

interface ProcessBatchResult {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
}

// Global sync state
let currentSyncProgress: SyncProgress = {
  isRunning: false,
  phase: 'preparing',
  message: 'Pronto para sincronizar',
  processedLeads: 0,
  totalLeads: 0,
  newLeads: 0,
  updatedLeads: 0,
  errors: 0
};

/**
 * Map provider statuses to orders table status
 */
function mapProviderStatus(status: string, provider: string): string {
  const statusMap: Record<string, string> = {
    // FHB/European Fulfillment statuses
    'pending': 'pending',
    'processing': 'confirmed',
    'shipped': 'shipped',
    'sent': 'shipped',
    'delivered': 'delivered',
    'canceled': 'cancelled',
    'cancelled': 'cancelled',
    'rejected': 'cancelled',
    // eLogy statuses
    'in_warehouse': 'confirmed',
    'in_transit': 'shipped',
    'out_for_delivery': 'shipped'
  };
  
  return statusMap[status.toLowerCase()] || 'pending';
}

/**
 * Find operation by order prefix
 */
function findOperationByPrefix(
  orderNumber: string,
  operationsList: (typeof operations.$inferSelect)[]
): typeof operations.$inferSelect | null {
  for (const operation of operationsList) {
    if (!operation.shopifyOrderPrefix) continue;
    
    if (orderNumber.startsWith(operation.shopifyOrderPrefix)) {
      return operation;
    }
  }
  
  return null;
}

/**
 * Build cache of warehouse account operations for a specific user
 */
async function buildAccountOperationsCache(userId: string): Promise<Map<string, typeof operations.$inferSelect[]>> {
  // Get user's warehouse accounts
  const userAccounts = await db.select()
    .from(userWarehouseAccounts)
    .where(
      and(
        eq(userWarehouseAccounts.userId, userId),
        inArray(userWarehouseAccounts.status, ['active', 'pending'])
      )
    );
  
  if (userAccounts.length === 0) {
    console.log('📦 No warehouse accounts found for user');
    return new Map();
  }
  
  const accountIds = userAccounts.map(a => a.id);
  
  // Fetch operations for these accounts
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
  
  console.log(`📦 Cached ${cache.size} warehouse accounts with ${accountOperations.length} total operations`);
  return cache;
}

/**
 * Process FHB staging orders
 */
async function processFHBOrders(
  accountOpsCache: Map<string, typeof operations.$inferSelect[]>,
  batchSize: number = 100
): Promise<ProcessBatchResult> {
  let totalProcessed = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  
  const accountIds = Array.from(accountOpsCache.keys());
  if (accountIds.length === 0) return { processed: 0, created: 0, updated: 0, skipped: 0 };
  
  while (true) {
    const unprocessedOrders = await db.select()
      .from(fhbOrders)
      .where(
        and(
          eq(fhbOrders.processedToOrders, false),
          inArray(
            sql`COALESCE(${fhbOrders.warehouseAccountId}, ${fhbOrders.fhbAccountId})`,
            accountIds
          )
        )
      )
      .limit(batchSize);
    
    if (unprocessedOrders.length === 0) break;
    
    for (const fhbOrder of unprocessedOrders) {
      try {
        const accountId = fhbOrder.warehouseAccountId || fhbOrder.fhbAccountId;
        if (!accountId) {
          totalSkipped++;
          continue;
        }
        
        const accountOperations = accountOpsCache.get(accountId) || [];
        const operation = findOperationByPrefix(fhbOrder.variableSymbol, accountOperations);
        
        if (!operation) {
          await db.update(fhbOrders)
            .set({ processedToOrders: true, processedAt: new Date() })
            .where(eq(fhbOrders.id, fhbOrder.id));
          totalSkipped++;
          continue;
        }
        
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
          const currentProviderData = existingOrder[0].providerData as any || {};
          
          await db.update(orders)
            .set({
              status: mapProviderStatus(fhbOrder.status, 'fhb'),
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
          
          totalUpdated++;
        } else {
          await db.insert(orders).values({
            id: `fhb_${fhbOrder.fhbOrderId}`,
            storeId: operation.storeId,
            operationId: operation.id,
            dataSource: 'carrier',
            carrierImported: true,
            carrierOrderId: fhbOrder.fhbOrderId,
            shopifyOrderNumber: fhbOrder.variableSymbol,
            customerName: (fhbOrder.recipient as any)?.address?.name || 'Unknown',
            total: fhbOrder.value?.toString() || '0',
            status: mapProviderStatus(fhbOrder.status, 'fhb'),
            trackingNumber: fhbOrder.tracking,
            provider: 'fhb',
            syncedFromFhb: true,
            lastSyncAt: new Date(),
            needsSync: false,
            providerData: {
              fhb: {
                orderId: fhbOrder.fhbOrderId,
                status: fhbOrder.status,
                variableSymbol: fhbOrder.variableSymbol,
                value: fhbOrder.value,
                recipient: fhbOrder.recipient,
                items: fhbOrder.items,
                createdAt: rawData?.created_at
              }
            },
            orderDate: rawData?.created_at ? new Date(rawData.created_at) : new Date(),
            createdAt: rawData?.created_at ? new Date(rawData.created_at) : new Date()
          });
          
          totalCreated++;
        }
        
        await db.update(fhbOrders)
          .set({ processedToOrders: true, processedAt: new Date() })
          .where(eq(fhbOrders.id, fhbOrder.id));
        
        totalProcessed++;
        
        // Update progress
        currentSyncProgress.processedLeads++;
        currentSyncProgress.newLeads = totalCreated;
        currentSyncProgress.updatedLeads = totalUpdated;
        
      } catch (error) {
        console.error(`❌ Error processing FHB order:`, error);
        currentSyncProgress.errors++;
        totalSkipped++;
      }
    }
  }
  
  return { processed: totalProcessed, created: totalCreated, updated: totalUpdated, skipped: totalSkipped };
}

/**
 * Process European Fulfillment staging orders
 */
async function processEuropeanFulfillmentOrders(
  accountOpsCache: Map<string, typeof operations.$inferSelect[]>,
  batchSize: number = 100
): Promise<ProcessBatchResult> {
  let totalProcessed = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  
  const accountIds = Array.from(accountOpsCache.keys());
  if (accountIds.length === 0) return { processed: 0, created: 0, updated: 0, skipped: 0 };
  
  while (true) {
    const unprocessedOrders = await db.select()
      .from(europeanFulfillmentOrders)
      .where(
        and(
          eq(europeanFulfillmentOrders.processedToOrders, false),
          inArray(europeanFulfillmentOrders.accountId, accountIds)
        )
      )
      .limit(batchSize);
    
    if (unprocessedOrders.length === 0) break;
    
    for (const efOrder of unprocessedOrders) {
      try {
        const accountId = efOrder.accountId;
        if (!accountId) {
          totalSkipped++;
          continue;
        }
        
        const accountOperations = accountOpsCache.get(accountId) || [];
        const operation = findOperationByPrefix(efOrder.orderNumber, accountOperations);
        
        if (!operation) {
          await db.update(europeanFulfillmentOrders)
            .set({ processedToOrders: true, processedAt: new Date() })
            .where(eq(europeanFulfillmentOrders.id, efOrder.id));
          totalSkipped++;
          continue;
        }
        
        const existingOrder = await db.select()
          .from(orders)
          .where(
            and(
              eq(orders.shopifyOrderNumber, efOrder.orderNumber),
              eq(orders.operationId, operation.id)
            )
          )
          .limit(1);
        
        const rawData = efOrder.rawData as any;
        
        if (existingOrder.length > 0) {
          const currentProviderData = existingOrder[0].providerData as any || {};
          
          await db.update(orders)
            .set({
              status: mapProviderStatus(efOrder.status, 'european_fulfillment'),
              trackingNumber: efOrder.tracking,
              carrierImported: true,
              carrierOrderId: efOrder.europeanOrderId,
              provider: 'european_fulfillment',
              lastSyncAt: new Date(),
              needsSync: false,
              providerData: {
                ...currentProviderData,
                european_fulfillment: {
                  orderId: efOrder.europeanOrderId,
                  status: efOrder.status,
                  orderNumber: efOrder.orderNumber,
                  tracking: efOrder.tracking,
                  value: efOrder.value,
                  updatedAt: new Date().toISOString()
                }
              }
            })
            .where(eq(orders.id, existingOrder[0].id));
          
          totalUpdated++;
        } else {
          await db.insert(orders).values({
            id: `ef_${efOrder.europeanOrderId}`,
            storeId: operation.storeId,
            operationId: operation.id,
            dataSource: 'carrier',
            carrierImported: true,
            carrierOrderId: efOrder.europeanOrderId,
            shopifyOrderNumber: efOrder.orderNumber,
            customerName: (efOrder.recipient as any)?.address?.name || 'Unknown',
            total: efOrder.value?.toString() || '0',
            status: mapProviderStatus(efOrder.status, 'european_fulfillment'),
            trackingNumber: efOrder.tracking,
            provider: 'european_fulfillment',
            lastSyncAt: new Date(),
            needsSync: false,
            providerData: {
              european_fulfillment: {
                orderId: efOrder.europeanOrderId,
                status: efOrder.status,
                orderNumber: efOrder.orderNumber,
                value: efOrder.value,
                recipient: efOrder.recipient,
                items: efOrder.items,
                createdAt: rawData?.created_at
              }
            },
            orderDate: rawData?.created_at ? new Date(rawData.created_at) : new Date(),
            createdAt: rawData?.created_at ? new Date(rawData.created_at) : new Date()
          });
          
          totalCreated++;
        }
        
        await db.update(europeanFulfillmentOrders)
          .set({ processedToOrders: true, processedAt: new Date() })
          .where(eq(europeanFulfillmentOrders.id, efOrder.id));
        
        totalProcessed++;
        
        // Update progress
        currentSyncProgress.processedLeads++;
        currentSyncProgress.newLeads = totalCreated;
        currentSyncProgress.updatedLeads = totalUpdated;
        
      } catch (error) {
        console.error(`❌ Error processing European Fulfillment order:`, error);
        currentSyncProgress.errors++;
        totalSkipped++;
      }
    }
  }
  
  return { processed: totalProcessed, created: totalCreated, updated: totalUpdated, skipped: totalSkipped };
}

/**
 * Process eLogy staging orders
 */
async function processElogyOrders(
  accountOpsCache: Map<string, typeof operations.$inferSelect[]>,
  batchSize: number = 100
): Promise<ProcessBatchResult> {
  let totalProcessed = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  
  const accountIds = Array.from(accountOpsCache.keys());
  if (accountIds.length === 0) return { processed: 0, created: 0, updated: 0, skipped: 0 };
  
  while (true) {
    const unprocessedOrders = await db.select()
      .from(elogyOrders)
      .where(
        and(
          eq(elogyOrders.processedToOrders, false),
          inArray(elogyOrders.accountId, accountIds)
        )
      )
      .limit(batchSize);
    
    if (unprocessedOrders.length === 0) break;
    
    for (const elogyOrder of unprocessedOrders) {
      try {
        const accountId = elogyOrder.accountId;
        if (!accountId) {
          totalSkipped++;
          continue;
        }
        
        const accountOperations = accountOpsCache.get(accountId) || [];
        const operation = findOperationByPrefix(elogyOrder.orderNumber, accountOperations);
        
        if (!operation) {
          await db.update(elogyOrders)
            .set({ processedToOrders: true, processedAt: new Date() })
            .where(eq(elogyOrders.id, elogyOrder.id));
          totalSkipped++;
          continue;
        }
        
        const existingOrder = await db.select()
          .from(orders)
          .where(
            and(
              eq(orders.shopifyOrderNumber, elogyOrder.orderNumber),
              eq(orders.operationId, operation.id)
            )
          )
          .limit(1);
        
        const rawData = elogyOrder.rawData as any;
        
        if (existingOrder.length > 0) {
          const currentProviderData = existingOrder[0].providerData as any || {};
          
          await db.update(orders)
            .set({
              status: mapProviderStatus(elogyOrder.status, 'elogy'),
              trackingNumber: elogyOrder.tracking,
              carrierImported: true,
              carrierOrderId: elogyOrder.elogyOrderId,
              provider: 'elogy',
              lastSyncAt: new Date(),
              needsSync: false,
              providerData: {
                ...currentProviderData,
                elogy: {
                  orderId: elogyOrder.elogyOrderId,
                  status: elogyOrder.status,
                  orderNumber: elogyOrder.orderNumber,
                  tracking: elogyOrder.tracking,
                  value: elogyOrder.value,
                  updatedAt: new Date().toISOString()
                }
              }
            })
            .where(eq(orders.id, existingOrder[0].id));
          
          totalUpdated++;
        } else {
          await db.insert(orders).values({
            id: `elogy_${elogyOrder.elogyOrderId}`,
            storeId: operation.storeId,
            operationId: operation.id,
            dataSource: 'carrier',
            carrierImported: true,
            carrierOrderId: elogyOrder.elogyOrderId,
            shopifyOrderNumber: elogyOrder.orderNumber,
            customerName: (elogyOrder.recipient as any)?.address?.name || 'Unknown',
            total: elogyOrder.value?.toString() || '0',
            status: mapProviderStatus(elogyOrder.status, 'elogy'),
            trackingNumber: elogyOrder.tracking,
            provider: 'elogy',
            lastSyncAt: new Date(),
            needsSync: false,
            providerData: {
              elogy: {
                orderId: elogyOrder.elogyOrderId,
                status: elogyOrder.status,
                orderNumber: elogyOrder.orderNumber,
                value: elogyOrder.value,
                recipient: elogyOrder.recipient,
                items: elogyOrder.items,
                createdAt: rawData?.created_at
              }
            },
            orderDate: rawData?.created_at ? new Date(rawData.created_at) : new Date(),
            createdAt: rawData?.created_at ? new Date(rawData.created_at) : new Date()
          });
          
          totalCreated++;
        }
        
        await db.update(elogyOrders)
          .set({ processedToOrders: true, processedAt: new Date() })
          .where(eq(elogyOrders.id, elogyOrder.id));
        
        totalProcessed++;
        
        // Update progress
        currentSyncProgress.processedLeads++;
        currentSyncProgress.newLeads = totalCreated;
        currentSyncProgress.updatedLeads = totalUpdated;
        
      } catch (error) {
        console.error(`❌ Error processing eLogy order:`, error);
        currentSyncProgress.errors++;
        totalSkipped++;
      }
    }
  }
  
  return { processed: totalProcessed, created: totalCreated, updated: totalUpdated, skipped: totalSkipped };
}

/**
 * Count unprocessed orders for a user across all staging tables
 */
async function countUnprocessedOrders(userId: string): Promise<number> {
  const userAccounts = await db.select({ id: userWarehouseAccounts.id })
    .from(userWarehouseAccounts)
    .where(
      and(
        eq(userWarehouseAccounts.userId, userId),
        inArray(userWarehouseAccounts.status, ['active', 'pending'])
      )
    );
  
  if (userAccounts.length === 0) return 0;
  
  const accountIds = userAccounts.map(a => a.id);
  
  const [fhbCount, efCount, elogyCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` })
      .from(fhbOrders)
      .where(
        and(
          eq(fhbOrders.processedToOrders, false),
          inArray(
            sql`COALESCE(${fhbOrders.warehouseAccountId}, ${fhbOrders.fhbAccountId})`,
            accountIds
          )
        )
      ),
    db.select({ count: sql<number>`count(*)` })
      .from(europeanFulfillmentOrders)
      .where(
        and(
          eq(europeanFulfillmentOrders.processedToOrders, false),
          inArray(europeanFulfillmentOrders.accountId, accountIds)
        )
      ),
    db.select({ count: sql<number>`count(*)` })
      .from(elogyOrders)
      .where(
        and(
          eq(elogyOrders.processedToOrders, false),
          inArray(elogyOrders.accountId, accountIds)
        )
      )
  ]);
  
  const total = (fhbCount[0]?.count || 0) + (efCount[0]?.count || 0) + (elogyCount[0]?.count || 0);
  return Number(total);
}

/**
 * Perform complete sync from staging tables
 */
export async function performStagingSync(userId: string): Promise<void> {
  if (currentSyncProgress.isRunning) {
    throw new Error('Sincronização já em andamento');
  }
  
  try {
    console.log(`🔄 Starting staging sync for user ${userId}`);
    
    currentSyncProgress = {
      isRunning: true,
      phase: 'preparing',
      message: 'Preparando sincronização...',
      processedLeads: 0,
      totalLeads: 0,
      newLeads: 0,
      updatedLeads: 0,
      errors: 0
    };
    
    // Count total unprocessed orders
    const totalOrders = await countUnprocessedOrders(userId);
    currentSyncProgress.totalLeads = totalOrders;
    
    if (totalOrders === 0) {
      currentSyncProgress.phase = 'completed';
      currentSyncProgress.message = 'Nenhum pedido pendente para processar';
      currentSyncProgress.isRunning = false;
      return;
    }
    
    console.log(`📊 Found ${totalOrders} unprocessed orders`);
    
    // Build account operations cache
    currentSyncProgress.phase = 'syncing';
    currentSyncProgress.message = 'Processando pedidos...';
    
    const accountOpsCache = await buildAccountOperationsCache(userId);
    
    // Process all staging tables in parallel for speed
    const [fhbResult, efResult, elogyResult] = await Promise.all([
      processFHBOrders(accountOpsCache),
      processEuropeanFulfillmentOrders(accountOpsCache),
      processElogyOrders(accountOpsCache)
    ]);
    
    console.log(`✅ Sync completed:`, {
      fhb: fhbResult,
      europeanFulfillment: efResult,
      elogy: elogyResult
    });
    
    currentSyncProgress.phase = 'completed';
    currentSyncProgress.message = 'Sincronização concluída!';
    currentSyncProgress.isRunning = false;
    
  } catch (error) {
    console.error('❌ Staging sync error:', error);
    currentSyncProgress.phase = 'error';
    currentSyncProgress.message = error instanceof Error ? error.message : 'Erro desconhecido';
    currentSyncProgress.isRunning = false;
    throw error;
  }
}

/**
 * Get current sync progress
 */
export function getSyncProgress(): SyncProgress {
  return { ...currentSyncProgress };
}

/**
 * Reset sync progress (for testing)
 */
export function resetSyncProgress(): void {
  currentSyncProgress = {
    isRunning: false,
    phase: 'preparing',
    message: 'Pronto para sincronizar',
    processedLeads: 0,
    totalLeads: 0,
    newLeads: 0,
    updatedLeads: 0,
    errors: 0
  };
}
