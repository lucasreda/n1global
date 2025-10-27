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

// Per-user sync state to prevent cross-tenant data leakage
const userSyncProgress = new Map<string, SyncProgress>();

// Helper to get or create sync progress for a user
function getUserSyncProgress(userId: string): SyncProgress {
  if (!userSyncProgress.has(userId)) {
    userSyncProgress.set(userId, {
      isRunning: false,
      phase: 'preparing',
      message: 'Pronto para sincronizar',
      processedLeads: 0,
      totalLeads: 0,
      newLeads: 0,
      updatedLeads: 0,
      errors: 0
    });
  }
  return userSyncProgress.get(userId)!;
}

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
    'returned': 'returned',
    // European Fulfillment specific (status_livrison)
    'in delivery': 'shipped',
    'unpacked': 'processing',
    'redeployment': 'processing',
    // eLogy statuses
    'in_warehouse': 'confirmed',
    'in_transit': 'shipped',
    'out_for_delivery': 'shipped'
  };
  
  return statusMap[status.toLowerCase()] || 'pending';
}

/**
 * Normalize phone number for matching
 * Removes extensions and non-numeric characters, preserves all significant digits
 */
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove common extension patterns (ext, extension, ramal, x) before normalization
  let cleaned = phone.toLowerCase();
  cleaned = cleaned.replace(/\b(ext|extension|ramal|x)\s*\.?\s*\d+/gi, '');
  
  // Remove all non-numeric characters, preserve all digits
  return cleaned.replace(/[^\d]/g, '');
}

/**
 * Normalize email for matching
 */
function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.toLowerCase().trim();
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
 * Intelligent order matching - tries prefix first, then falls back to email/phone
 * Returns Shopify order if found, null otherwise
 */
async function findShopifyOrderIntelligent(
  warehouseOrderNumber: string,
  warehouseEmail: string | null | undefined,
  warehousePhone: string | null | undefined,
  operationId: string
): Promise<typeof orders.$inferSelect | null> {
  // Strategy 1: Try to match by order number with prefix
  // Extract potential prefix from warehouse order number (e.g., "LI-479851" -> try matching "#LI-479851" or "#479851")
  const potentialMatches = [
    warehouseOrderNumber,
    `#${warehouseOrderNumber}`,
    warehouseOrderNumber.replace(/^[A-Z]+-/, ''), // Remove prefix like "LI-"
    `#${warehouseOrderNumber.replace(/^[A-Z]+-/, '')}`
  ];
  
  for (const orderNum of potentialMatches) {
    const orderByNumber = await db.select()
      .from(orders)
      .where(
        and(
          eq(orders.operationId, operationId),
          eq(orders.shopifyOrderNumber, orderNum)
        )
      )
      .limit(1);
    
    if (orderByNumber.length > 0) {
      console.log(`✅ Matched by order number: ${warehouseOrderNumber} -> ${orderNum}`);
      return orderByNumber[0];
    }
  }
  
  // Strategy 2: Match by email (if available)
  const normalizedEmail = normalizeEmail(warehouseEmail);
  if (normalizedEmail) {
    const orderByEmail = await db.select()
      .from(orders)
      .where(
        and(
          eq(orders.operationId, operationId),
          sql`LOWER(TRIM(${orders.customerEmail})) = ${normalizedEmail}`
        )
      )
      .limit(1);
    
    if (orderByEmail.length > 0) {
      console.log(`✅ Matched by email: ${warehouseOrderNumber} -> ${normalizedEmail}`);
      return orderByEmail[0];
    }
  }
  
  // Strategy 3: Match by phone (if available and >=7 digits)
  const normalizedPhone = normalizePhone(warehousePhone);
  if (normalizedPhone && normalizedPhone.length >= 7) {
    // SQL helper to normalize phone: remove extensions, then non-digits
    const normalizePhoneSQL = sql`REGEXP_REPLACE(REGEXP_REPLACE(${orders.customerPhone}, '\\b(ext|extension|ramal|x)\\s*\\.?\\s*\\d+', '', 'gi'), '[^0-9]', '', 'g')`;
    
    // Try exact match first (preserves full precision)
    const exactPhoneMatch = await db.select()
      .from(orders)
      .where(
        and(
          eq(orders.operationId, operationId),
          sql`${normalizePhoneSQL} = ${normalizedPhone}`
        )
      )
      .limit(1);
    
    if (exactPhoneMatch.length > 0) {
      console.log(`✅ Matched by phone (exact): ${warehouseOrderNumber} -> ${normalizedPhone}`);
      return exactPhoneMatch[0];
    }
    
    // If no exact match, try bidirectional suffix matching
    // Use last 9 digits for phones >=9 digits, otherwise use full number
    const suffixDigits = normalizedPhone.length >= 9 ? normalizedPhone.slice(-9) : normalizedPhone;
    
    // Direction 1: Warehouse suffix → Shopify phone (handles long warehouse, short Shopify)
    const suffixMatch1 = await db.select()
      .from(orders)
      .where(
        and(
          eq(orders.operationId, operationId),
          sql`${normalizePhoneSQL} LIKE ${'%' + suffixDigits}`
        )
      )
      .limit(1);
    
    if (suffixMatch1.length > 0) {
      console.log(`✅ Matched by phone (suffix): ${warehouseOrderNumber} -> ${suffixDigits}`);
      return suffixMatch1[0];
    }
    
    // Direction 2: Shopify suffix → Warehouse phone (handles short warehouse, long Shopify)
    // Only needed for short warehouse numbers (<9 digits)
    if (normalizedPhone.length < 9) {
      const suffixMatch2 = await db.select()
        .from(orders)
        .where(
          and(
            eq(orders.operationId, operationId),
            sql`RIGHT(${normalizePhoneSQL}, ${normalizedPhone.length}) = ${normalizedPhone}`
          )
        )
        .limit(1);
      
      if (suffixMatch2.length > 0) {
        console.log(`✅ Matched by phone (reverse suffix): ${warehouseOrderNumber} -> ${normalizedPhone}`);
        return suffixMatch2[0];
      }
    }
  }
  
  console.log(`❌ No match found for order: ${warehouseOrderNumber}`);
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
  userId: string,
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
        
        // Try to find operation by prefix first (if configured)
        let operation = findOperationByPrefix(fhbOrder.variableSymbol, accountOperations);
        
        // If no prefix match and we have only one operation, use it
        if (!operation && accountOperations.length === 1) {
          operation = accountOperations[0];
        }
        
        // If still no operation, skip
        if (!operation) {
          await db.update(fhbOrders)
            .set({ processedToOrders: true, processedAt: new Date() })
            .where(eq(fhbOrders.id, fhbOrder.id));
          totalSkipped++;
          continue;
        }
        
        // Extract customer data from recipient
        const recipient = fhbOrder.recipient as any;
        const customerEmail = recipient?.email || recipient?.address?.email;
        const customerPhone = recipient?.phone || recipient?.address?.phone;
        
        // Use intelligent matching (order number → email → phone)
        const existingOrder = await findShopifyOrderIntelligent(
          fhbOrder.variableSymbol,
          customerEmail,
          customerPhone,
          operation.id
        );
        
        const rawData = fhbOrder.rawData as any;
        
        if (existingOrder) {
          // Update existing Shopify order with carrier data
          const currentProviderData = existingOrder.providerData as any || {};
          
          await db.update(orders)
            .set({
              status: mapProviderStatus(fhbOrder.status, 'fhb'),
              trackingNumber: fhbOrder.tracking,
              carrierImported: true,
              carrierOrderId: fhbOrder.fhbOrderId,
              carrierMatchedAt: new Date(),
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
            .where(eq(orders.id, existingOrder.id));
          
          totalUpdated++;
        } else {
          // No Shopify order found - create carrier-only order
          await db.insert(orders).values({
            id: `fhb_${fhbOrder.fhbOrderId}`,
            storeId: operation.storeId,
            operationId: operation.id,
            dataSource: 'carrier',
            carrierImported: true,
            carrierOrderId: fhbOrder.fhbOrderId,
            shopifyOrderNumber: fhbOrder.variableSymbol,
            customerName: recipient?.name || recipient?.address?.name || 'Unknown',
            customerEmail: customerEmail || null,
            customerPhone: customerPhone || null,
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
        
        // Update progress (aggregate, don't overwrite)
        const progress = getUserSyncProgress(userId);
        progress.processedLeads++;
        
      } catch (error) {
        console.error(`❌ Error processing FHB order:`, error);
        const progress = getUserSyncProgress(userId);
        progress.errors++;
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
  userId: string,
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
        
        // Try to find operation by prefix first (if configured)
        let operation = findOperationByPrefix(efOrder.orderNumber, accountOperations);
        
        // If no prefix match and we have only one operation, use it
        if (!operation && accountOperations.length === 1) {
          operation = accountOperations[0];
        }
        
        // If still no operation, skip
        if (!operation) {
          await db.update(europeanFulfillmentOrders)
            .set({ processedToOrders: true, processedAt: new Date() })
            .where(eq(europeanFulfillmentOrders.id, efOrder.id));
          totalSkipped++;
          continue;
        }
        
        // Extract customer data from recipient
        const recipient = efOrder.recipient as any;
        const customerEmail = recipient?.email || recipient?.address?.email;
        const customerPhone = recipient?.phone || recipient?.address?.phone;
        
        // Use intelligent matching (order number → email → phone)
        const existingOrder = await findShopifyOrderIntelligent(
          efOrder.orderNumber,
          customerEmail,
          customerPhone,
          operation.id
        );
        
        const rawData = efOrder.rawData as any;
        
        if (existingOrder) {
          // Update existing Shopify order with carrier data
          const currentProviderData = existingOrder.providerData as any || {};
          
          await db.update(orders)
            .set({
              status: mapProviderStatus(efOrder.status, 'european_fulfillment'),
              trackingNumber: efOrder.tracking,
              carrierImported: true,
              carrierOrderId: efOrder.europeanOrderId,
              carrierMatchedAt: new Date(),
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
            .where(eq(orders.id, existingOrder.id));
          
          totalUpdated++;
        } else {
          // No Shopify order found - create carrier-only order
          await db.insert(orders).values({
            id: `ef_${efOrder.europeanOrderId}`,
            storeId: operation.storeId,
            operationId: operation.id,
            dataSource: 'carrier',
            carrierImported: true,
            carrierOrderId: efOrder.europeanOrderId,
            shopifyOrderNumber: efOrder.orderNumber,
            customerName: recipient?.name || recipient?.address?.name || 'Unknown',
            customerEmail: customerEmail || null,
            customerPhone: customerPhone || null,
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
        
        // Update progress (aggregate, don't overwrite)
        const progress = getUserSyncProgress(userId);
        progress.processedLeads++;
        
      } catch (error) {
        console.error(`❌ Error processing European Fulfillment order:`, error);
        const progress = getUserSyncProgress(userId);
        progress.errors++;
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
  userId: string,
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
        
        // Try to find operation by prefix first (if configured)
        let operation = findOperationByPrefix(elogyOrder.orderNumber, accountOperations);
        
        // If no prefix match and we have only one operation, use it
        if (!operation && accountOperations.length === 1) {
          operation = accountOperations[0];
        }
        
        // If still no operation, skip
        if (!operation) {
          await db.update(elogyOrders)
            .set({ processedToOrders: true, processedAt: new Date() })
            .where(eq(elogyOrders.id, elogyOrder.id));
          totalSkipped++;
          continue;
        }
        
        // Extract customer data from recipient
        const recipient = elogyOrder.recipient as any;
        const customerEmail = recipient?.email || recipient?.address?.email;
        const customerPhone = recipient?.phone || recipient?.address?.phone;
        
        // Use intelligent matching (order number → email → phone)
        const existingOrder = await findShopifyOrderIntelligent(
          elogyOrder.orderNumber,
          customerEmail,
          customerPhone,
          operation.id
        );
        
        const rawData = elogyOrder.rawData as any;
        
        if (existingOrder) {
          // Update existing Shopify order with carrier data
          const currentProviderData = existingOrder.providerData as any || {};
          
          await db.update(orders)
            .set({
              status: mapProviderStatus(elogyOrder.status, 'elogy'),
              trackingNumber: elogyOrder.tracking,
              carrierImported: true,
              carrierOrderId: elogyOrder.elogyOrderId,
              carrierMatchedAt: new Date(),
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
            .where(eq(orders.id, existingOrder.id));
          
          totalUpdated++;
        } else {
          // No Shopify order found - create carrier-only order
          await db.insert(orders).values({
            id: `elogy_${elogyOrder.elogyOrderId}`,
            storeId: operation.storeId,
            operationId: operation.id,
            dataSource: 'carrier',
            carrierImported: true,
            carrierOrderId: elogyOrder.elogyOrderId,
            shopifyOrderNumber: elogyOrder.orderNumber,
            customerName: recipient?.name || recipient?.address?.name || 'Unknown',
            customerEmail: customerEmail || null,
            customerPhone: customerPhone || null,
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
        
        // Update progress (aggregate, don't overwrite)
        const progress = getUserSyncProgress(userId);
        progress.processedLeads++;
        
      } catch (error) {
        console.error(`❌ Error processing eLogy order:`, error);
        const progress = getUserSyncProgress(userId);
        progress.errors++;
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
  
  console.log(`🔍 [countUnprocessedOrders] User ${userId}: ${userAccounts.length} accounts`, userAccounts.map(a => a.id));
  
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
  
  const fhb = fhbCount[0]?.count || 0;
  const ef = efCount[0]?.count || 0;
  const elogy = elogyCount[0]?.count || 0;
  const total = Number(fhb) + Number(ef) + Number(elogy);
  
  console.log(`📊 [countUnprocessedOrders] User ${userId}: FHB=${fhb}, EF=${ef}, eLogy=${elogy}, TOTAL=${total}`);
  
  return total;
}

/**
 * Perform complete sync from staging tables
 */
export async function performStagingSync(userId: string): Promise<void> {
  // Per-user concurrency guard
  const progress = getUserSyncProgress(userId);
  
  if (progress.isRunning) {
    throw new Error('Sincronização já em andamento para este usuário');
  }
  
  try {
    console.log(`🔄 Starting staging sync for user ${userId}`);
    
    // Reset progress for this user
    progress.isRunning = true;
    progress.phase = 'preparing';
    progress.message = 'Preparando sincronização...';
    progress.processedLeads = 0;
    progress.totalLeads = 0;
    progress.newLeads = 0;
    progress.updatedLeads = 0;
    progress.errors = 0;
    
    // Count total unprocessed orders
    const totalOrders = await countUnprocessedOrders(userId);
    progress.totalLeads = totalOrders;
    
    if (totalOrders === 0) {
      progress.phase = 'completed';
      progress.message = 'Nenhum pedido pendente para processar';
      progress.isRunning = false;
      return;
    }
    
    console.log(`📊 Found ${totalOrders} unprocessed orders`);
    
    // Build account operations cache
    progress.phase = 'syncing';
    progress.message = 'Processando pedidos...';
    
    const accountOpsCache = await buildAccountOperationsCache(userId);
    
    // Process all staging tables in parallel for speed
    const [fhbResult, efResult, elogyResult] = await Promise.all([
      processFHBOrders(userId, accountOpsCache),
      processEuropeanFulfillmentOrders(userId, accountOpsCache),
      processElogyOrders(userId, accountOpsCache)
    ]);
    
    // Aggregate results from all providers
    progress.newLeads = fhbResult.created + efResult.created + elogyResult.created;
    progress.updatedLeads = fhbResult.updated + efResult.updated + elogyResult.updated;
    
    console.log(`✅ Sync completed for user ${userId}:`, {
      fhb: fhbResult,
      europeanFulfillment: efResult,
      elogy: elogyResult,
      totals: {
        newLeads: progress.newLeads,
        updatedLeads: progress.updatedLeads,
        errors: progress.errors
      }
    });
    
    progress.phase = 'completed';
    progress.message = 'Sincronização concluída!';
    progress.isRunning = false;
    
  } catch (error) {
    console.error(`❌ Staging sync error for user ${userId}:`, error);
    progress.phase = 'error';
    progress.message = error instanceof Error ? error.message : 'Erro desconhecido';
    progress.isRunning = false;
    throw error;
  }
}

/**
 * Get current sync progress for a specific user
 */
export function getSyncProgress(userId: string): SyncProgress {
  return { ...getUserSyncProgress(userId) };
}

/**
 * Reset sync progress for a specific user (for testing)
 */
export function resetSyncProgress(userId: string): void {
  userSyncProgress.set(userId, {
    isRunning: false,
    phase: 'preparing',
    message: 'Pronto para sincronizar',
    processedLeads: 0,
    totalLeads: 0,
    newLeads: 0,
    updatedLeads: 0,
    errors: 0
  });
}
