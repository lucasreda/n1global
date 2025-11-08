// 🇪🇺 European Fulfillment Linking Worker
// Links staging orders from european_fulfillment_orders to operations.orders
// Uses shopifyOrderPrefix for matching orders to correct operations
// Implements 3-tier matching: order number → email → phone

import { db } from '../db';
import { europeanFulfillmentOrders, orders, operations, userWarehouseAccountOperations, userWarehouseAccounts } from '@shared/schema';
import { eq, and, inArray, isNull, or, sql } from 'drizzle-orm';

// Reentrancy guard
let isLinkingRunning = false;

/**
 * Map provider statuses to orders table status
 * Maps European Fulfillment specific statuses to standard order statuses
 */
function mapProviderStatus(status: string): string {
  const statusMap: Record<string, string> = {
    // Standard statuses
    'pending': 'pending',
    'processing': 'processing',
    'shipped': 'shipped',
    'sent': 'shipped',
    'delivered': 'delivered',
    'canceled': 'cancelled',
    'cancelled': 'cancelled',
    'rejected': 'cancelled',
    'returned': 'returned',
    // European Fulfillment specific
    'in delivery': 'shipped',
    'unpacked': 'shipped', // Cliente desembalou = ainda não confirmado como entregue, considera como enviado
    'redeployment': 'processing',
    'in transit': 'shipped', // Em trânsito = enviado
    'incident': 'pending' // Incidente mantém pendente
  };
  
  return statusMap[status?.toLowerCase()] || 'pending';
}

/**
 * Normaliza número de telefone para matching
 * Remove espaços, hífens, parênteses e prefixos internacionais
 */
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  // Remove espaços, hífens, parênteses
  let normalized = phone.replace(/[\s\-\(\)]/g, '');
  
  // Remove prefixos internacionais comuns
  normalized = normalized.replace(/^\+/, '');
  normalized = normalized.replace(/^00/, '');
  normalized = normalized.replace(/^011/, '');
  
  // Remove extensões (ext, ramal, etc)
  normalized = normalized.replace(/[x#].*$/, '');
  normalized = normalized.replace(/ext.*$/i, '');
  normalized = normalized.replace(/ramal.*$/i, '');
  
  // Retorna apenas números
  return normalized.replace(/\D/g, '');
}

/**
 * Compara dois números de telefone usando matching de sufixo bidirecional
 * Suporta telefones de 7-8 dígitos e formatos internacionais
 */
function phonesMatch(phone1: string | null | undefined, phone2: string | null | undefined): boolean {
  const p1 = normalizePhone(phone1);
  const p2 = normalizePhone(phone2);
  
  if (!p1 || !p2) return false;
  
  // Match exato
  if (p1 === p2) return true;
  
  // Match de sufixo bidirecional (últimos 8 dígitos)
  const minLength = 7; // Suporta telefones de 7-8 dígitos
  if (p1.length >= minLength && p2.length >= minLength) {
    const suffix1 = p1.slice(-8);
    const suffix2 = p2.slice(-8);
    
    // Match se sufixos são iguais OU se um termina com o outro
    if (suffix1 === suffix2) return true;
    if (suffix1.endsWith(suffix2) || suffix2.endsWith(suffix1)) return true;
  }
  
  return false;
}

/**
 * Encontra pedido existente do Shopify usando matching 3-tier:
 * 1. Order number exato
 * 2. Email do cliente
 * 3. Telefone do cliente (com normalização)
 * 
 * Retorna o ID do pedido encontrado ou null
 */
async function findExistingShopifyOrder(
  orderNumber: string,
  email: string | null,
  phone: string | null,
  operationId: string
): Promise<string | null> {
  try {
    // Tier 1: Match por order number exato
    const orderByNumber = await db.select()
      .from(orders)
      .where(
        and(
          eq(orders.operationId, operationId),
          eq(orders.shopifyOrderNumber, orderNumber)
        )
      )
      .limit(1);
    
    if (orderByNumber.length > 0) {
      console.log(`✅ Match por order number: ${orderNumber}`);
      return orderByNumber[0].id;
    }
    
    // Tier 2: Match por email (se disponível)
    if (email) {
      const orderByEmail = await db.select()
        .from(orders)
        .where(
          and(
            eq(orders.operationId, operationId),
            eq(orders.customerEmail, email)
          )
        )
        .limit(1);
      
      if (orderByEmail.length > 0) {
        console.log(`✅ Match por email: ${orderNumber} → ${orderByEmail[0].shopifyOrderNumber}`);
        return orderByEmail[0].id;
      }
    }
    
    // Tier 3: Match por telefone (se disponível)
    if (phone) {
      const normalizedPhone = normalizePhone(phone);
      
      if (normalizedPhone) {
        // Buscar todos os pedidos da operação (limitar aos últimos 1000)
        const allOrders = await db.select()
          .from(orders)
          .where(eq(orders.operationId, operationId))
          .limit(1000);
        
        // Fazer matching manual de telefone
        for (const order of allOrders) {
          if (phonesMatch(phone, order.customerPhone)) {
            console.log(`✅ Match por telefone: ${orderNumber} (${phone}) → ${order.shopifyOrderNumber} (${order.customerPhone})`);
            return order.id;
          }
        }
      }
    }
    
    console.log(`❌ Nenhum match encontrado para ${orderNumber}`);
    return null;
    
  } catch (error: any) {
    console.error(`❌ Erro ao buscar pedido existente para ${orderNumber}:`, error.message);
    return null;
  }
}

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
    
    // Get active European Fulfillment account IDs only
    const activeEuropeanAccounts = await db.select({ id: userWarehouseAccounts.id })
      .from(userWarehouseAccounts)
      .where(
        and(
          eq(userWarehouseAccounts.providerKey, 'european_fulfillment'),
          eq(userWarehouseAccounts.status, 'active')
        )
      );
    
    const europeanAccountIds = activeEuropeanAccounts.map(a => a.id);
    
    // Get unprocessed staging orders ONLY from European Fulfillment accounts
    const stagingOrders = await db.select()
      .from(europeanFulfillmentOrders)
      .where(
        and(
          eq(europeanFulfillmentOrders.processedToOrders, false),
          europeanAccountIds.length > 0 
            ? inArray(europeanFulfillmentOrders.accountId, europeanAccountIds)
            : sql`false` // No accounts = no orders to process
        )
      )
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
        
        // Extract customer data from staging order
        const recipient = stagingOrder.recipient as any;
        const customerEmail = recipient?.email || null;
        const customerPhone = recipient?.phone || null;
        
        // Try to find existing Shopify order using 3-tier matching
        const existingOrderId = await findExistingShopifyOrder(
          stagingOrder.orderNumber,
          customerEmail,
          customerPhone,
          matchedOperation.id
        );
        
        let linkedOrderId: string;
        
        if (existingOrderId) {
          // Check if order is already linked to a different warehouse
          const existingOrder = await db.select({
            carrierOrderId: orders.carrierOrderId,
            provider: orders.provider
          })
            .from(orders)
            .where(eq(orders.id, existingOrderId))
            .limit(1);
          
          if (existingOrder[0]?.carrierOrderId && existingOrder[0]?.provider !== 'european_fulfillment') {
            console.warn(`⚠️ Order ${existingOrderId} already linked to ${existingOrder[0].provider}, skipping European Fulfillment update`);
            skipped++;
            continue;
          }
          
          // Update existing Shopify order with carrier data
          await db.update(orders)
            .set({
              status: mapProviderStatus(stagingOrder.status), // Use mapping function
              trackingNumber: stagingOrder.tracking || null,
              carrierImported: true,
              carrierMatchedAt: new Date(),
              carrierOrderId: stagingOrder.europeanOrderId,
              provider: 'european_fulfillment',
              providerData: stagingOrder.rawData,
              lastStatusUpdate: new Date()
            })
            .where(eq(orders.id, existingOrderId));
          
          updated++;
          console.log(`✅ Updated existing order ${existingOrderId} with carrier data from ${stagingOrder.orderNumber}`);
          
          // Mark staging order as processed AND update linked_order_id
          await db.update(europeanFulfillmentOrders)
            .set({
              processedToOrders: true,
              linkedOrderId: existingOrderId,
              processedAt: new Date()
            })
            .where(eq(europeanFulfillmentOrders.id, stagingOrder.id));
        } else {
          // No match found - skip (do not create new orders)
          console.warn(`⚠️ No Shopify match found for carrier order ${stagingOrder.orderNumber}, skipping (waiting for Shopify sync)`);
          skipped++;
          
          // DO NOT mark as processed - leave it for future matching attempts
          continue;
        }
        
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
