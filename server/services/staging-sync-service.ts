// 🔄 Staging Sync Service - Processes staging tables on-demand
// Used by "Sync Total" button to link warehouse orders without external API calls

import { db } from '../db';
import { 
  bigArenaOrders,
  fhbOrders, 
  europeanFulfillmentOrders,
  elogyOrders,
  orders, 
  operations, 
  userWarehouseAccountOperations, 
  userWarehouseAccounts,
  syncSessions,
  shopifyIntegrations,
  cartpandaIntegrations,
  digistoreIntegrations
} from '@shared/schema';
import { eq, and, inArray, sql, desc, or } from 'drizzle-orm';

interface PlatformProgress {
  processedOrders: number;
  totalOrders: number;
  newOrders: number;
  updatedOrders: number;
  percentage: number;
  currentPage?: number;
  totalPages?: number;
}

interface StagingProgress {
  processedLeads: number;
  totalLeads: number;
  newLeads: number;
  updatedLeads: number;
}

interface SyncProgress {
  isRunning: boolean;
  phase: 'preparing' | 'syncing' | 'completed' | 'error';
  message: string;
  currentStep: 'shopify' | 'cartpanda' | 'digistore' | 'staging' | null;
  overallProgress: number; // 0-100 (apenas plataformas)
  platformProgress: PlatformProgress;
  shopifyProgress: PlatformProgress;
  stagingProgress: StagingProgress;
  errors: number;
  startTime: Date | null;
  endTime: Date | null;
  // Identificador único por execução para evitar confusão com estados antigos
  runId: string | null;
  // Número de versão que aumenta a cada atualização (para debug/ordering)
  version: number;
}

const createEmptyPlatformProgress = (): PlatformProgress => ({
        processedOrders: 0,
        totalOrders: 0,
        newOrders: 0,
        updatedOrders: 0,
        percentage: 0
});

const createEmptyStagingProgress = (): StagingProgress => ({
      processedLeads: 0,
      totalLeads: 0,
      newLeads: 0,
        updatedLeads: 0
});

/**
 * Obtém a data de integração mais antiga de uma operação
 * Retorna a data mais antiga entre Shopify, CartPanda e Digistore24
 * Se nenhuma integração existir, retorna null
 */
async function getEarliestIntegrationDate(operationId: string): Promise<Date | null> {
  try {
    const [shopifyIntegration] = await db
      .select({ integrationStartedAt: shopifyIntegrations.integrationStartedAt })
      .from(shopifyIntegrations)
      .where(and(
        eq(shopifyIntegrations.operationId, operationId),
        eq(shopifyIntegrations.status, 'active')
      ))
      .limit(1);

    const [cartpandaIntegration] = await db
      .select({ integrationStartedAt: cartpandaIntegrations.integrationStartedAt })
      .from(cartpandaIntegrations)
      .where(and(
        eq(cartpandaIntegrations.operationId, operationId),
        eq(cartpandaIntegrations.status, 'active')
      ))
      .limit(1);

    const [digistoreIntegration] = await db
      .select({ integrationStartedAt: digistoreIntegrations.integrationStartedAt })
      .from(digistoreIntegrations)
      .where(and(
        eq(digistoreIntegrations.operationId, operationId),
        eq(digistoreIntegrations.status, 'active')
      ))
      .limit(1);

    const dates: Date[] = [];
    if (shopifyIntegration?.integrationStartedAt) {
      dates.push(new Date(shopifyIntegration.integrationStartedAt));
    }
    if (cartpandaIntegration?.integrationStartedAt) {
      dates.push(new Date(cartpandaIntegration.integrationStartedAt));
    }
    if (digistoreIntegration?.integrationStartedAt) {
      dates.push(new Date(digistoreIntegration.integrationStartedAt));
    }

    if (dates.length === 0) {
      return null; // Nenhuma integração ativa encontrada
    }

    // Retornar a data mais antiga
    return new Date(Math.min(...dates.map(d => d.getTime())));
  } catch (error) {
    console.error(`❌ Erro ao obter data de integração para operação ${operationId}:`, error);
    return null;
  }
}

interface ProcessBatchResult {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
}

// ============================================================================
// PERSISTÊNCIA DE SYNC SESSIONS NO BANCO DE DADOS
// ============================================================================

/**
 * Carrega a sessão de sync ativa do banco de dados
 */
async function loadSyncSession(userId: string): Promise<SyncProgress | null> {
  const sessions = await db
    .select()
    .from(syncSessions)
    .where(and(
      eq(syncSessions.userId, userId),
      eq(syncSessions.isRunning, true)
    ))
    .orderBy(desc(syncSessions.startTime))
    .limit(1);
    
  if (!sessions[0]) return null;
  
  const session = sessions[0];
  const platformProgress = session.platformProgress ? { ...session.platformProgress } : createEmptyPlatformProgress();
  const stagingProgress = createEmptyStagingProgress();

  return {
    isRunning: session.isRunning,
    phase: session.phase as 'preparing' | 'syncing' | 'completed' | 'error',
    message: session.message || '',
    currentStep: session.currentStep as 'shopify' | 'cartpanda' | 'digistore' | 'staging' | null,
    overallProgress: session.overallProgress,
    platformProgress,
    shopifyProgress: platformProgress,
    stagingProgress,
    errors: session.errors,
    startTime: session.startTime,
    endTime: session.endTime,
    runId: session.runId,
    version: 0
  };
}

/**
 * Salva ou atualiza a sessão de sync no banco de dados
 */
async function saveSyncSession(userId: string, progress: SyncProgress): Promise<void> {
  if (!progress.runId) {
    console.error('❌ [SAVE SESSION] Tentativa de salvar sessão sem runId');
    return;
  }

  const platformProgress = progress.platformProgress || createEmptyPlatformProgress();
  progress.platformProgress = platformProgress;
  progress.shopifyProgress = progress.shopifyProgress || platformProgress;
  
  try {
    await db
      .insert(syncSessions)
      .values({
        userId,
        runId: progress.runId,
        isRunning: progress.isRunning,
        phase: progress.phase,
        message: progress.message,
        currentStep: progress.currentStep,
        overallProgress: progress.overallProgress,
        platformProgress: progress.platformProgress,
        errors: progress.errors,
        startTime: progress.startTime || new Date(),
        endTime: progress.endTime,
        lastUpdatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: syncSessions.runId,
        set: {
          isRunning: progress.isRunning,
          phase: progress.phase,
          message: progress.message,
          currentStep: progress.currentStep,
          overallProgress: progress.overallProgress,
          platformProgress: progress.platformProgress,
          errors: progress.errors,
          endTime: progress.endTime,
          lastUpdatedAt: new Date(),
          updatedAt: new Date()
        }
      });
  } catch (error) {
    console.error('❌ [SAVE SESSION] Erro ao salvar sessão:', error);
  }
}

/**
 * Helper to get or create sync progress for a user
 * Agora carrega do banco de dados em vez de memória
 */
export async function getUserSyncProgress(userId: string): Promise<SyncProgress> {
  const session = await loadSyncSession(userId);
  
  if (session) {
    // Garantir que nunca retorna valores inválidos
    if (isNaN(session.overallProgress) || !isFinite(session.overallProgress)) {
      session.overallProgress = 0;
    }
    if (isNaN(session.platformProgress.percentage) || !isFinite(session.platformProgress.percentage)) {
      session.platformProgress.percentage = 0;
    }
    return session;
  }
  
  // Retornar estado inicial se não houver sessão ativa
  const platformProgress = createEmptyPlatformProgress();
  const stagingProgress = createEmptyStagingProgress();

  return {
      isRunning: false,
      phase: 'preparing',
      message: 'Pronto para sincronizar',
      currentStep: null,
      overallProgress: 0,
    platformProgress,
    shopifyProgress: platformProgress,
    stagingProgress,
      errors: 0,
      startTime: null,
      endTime: null,
      runId: null,
      version: 0
  };
}

/**
 * Calculate overall progress considering only platform progress (Shopify/CartPanda/Digistore)
 * Staging is processed in background but doesn't affect progress bar
 */
export function calculateOverallProgress(
  platformProgress: PlatformProgress | undefined,
  currentStep: 'shopify' | 'cartpanda' | 'digistore' | 'staging' | null
): number {
  // Progresso agora é 100% baseado em plataformas
  // Staging é processado em background mas não afeta a barra
  
  // CRÍTICO: Verificar se platformProgress existe
  if (!platformProgress) {
    return 0;
  }
  
  let platformPercent = 0;
  
  if (platformProgress.totalOrders === 0 && platformProgress.processedOrders === 0) {
    platformPercent = 0;
  } else if (platformProgress.totalOrders > 0 && !isNaN(platformProgress.processedOrders) && !isNaN(platformProgress.totalOrders)) {
    platformPercent = (platformProgress.processedOrders / platformProgress.totalOrders) * 100;
    platformPercent = Math.max(0, Math.min(100, platformPercent));
    
    if (platformProgress.processedOrders >= platformProgress.totalOrders) {
      platformPercent = 100;
    }
  } else if (platformProgress.percentage > 0 && !isNaN(platformProgress.percentage)) {
    platformPercent = Math.max(0, Math.min(100, platformProgress.percentage));
    
    if (platformProgress.percentage >= 100) {
      platformPercent = 100;
    }
  }
  
  const overall = Math.round(platformPercent);
  
  if (isNaN(overall) || !isFinite(overall)) {
    console.warn('⚠️ [PROGRESS] Cálculo de progresso retornou NaN, retornando 0');
    return 0;
  }
  
  return Math.max(0, Math.min(100, overall));
}

/**
 * Map provider statuses to orders table status
 */
export function mapProviderStatus(status: string, provider: string): string {
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
    'unpacked': 'shipped', // Cliente desembalou = ainda não confirmado como entregue, considera como enviado
    'redeployment': 'processing',
    'in transit': 'shipped', // Em trânsito = enviado
    'incident': 'pending', // Incidente mantém pendente
    // eLogy statuses
    'in_warehouse': 'confirmed',
    'in_transit': 'shipped',
    'out_for_delivery': 'shipped',
    // Big Arena statuses
    'ready_to_ship': 'processing',
    'ready-to-ship': 'processing',
    'packing': 'processing',
    'packed': 'processing',
    'awaiting_pickup': 'processing',
    'picked': 'processing',
    'queued': 'processing',
    'awaiting_shipment': 'processing',
    'in_transit': 'shipped',
    'in-transit': 'shipped',
    'on_hold': 'pending',
    'problem': 'pending',
    'failed': 'pending',
    'partial_return': 'returned'
  };
  
  return statusMap[status?.toLowerCase?.()] || 'pending';
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
  // IMPORTANT: Do NOT remove country prefix (34 for Spain) to match SQL normalization
  // SQL normalization keeps all digits, so we must too for consistency
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
 * Normalize name for matching (remove accents, lowercase, trim)
 */
function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .trim();
}

/**
 * Intelligent order matching - tries prefix first, then falls back to email/phone/name+total
 * Returns Shopify order if found, null otherwise
 * Filters orders by integration date if provided
 */
async function findShopifyOrderIntelligent(
  warehouseOrderNumber: string,
  warehouseEmail: string | null | undefined,
  warehousePhone: string | null | undefined,
  operationId: string,
  warehouseName?: string | null,
  warehouseValue?: string | number | null,
  integrationDate?: Date | null
): Promise<typeof orders.$inferSelect | null> {
  // Construir condições de filtro de data se integrationDate existir
  const dateFilter = integrationDate 
    ? sql`${orders.orderDate} >= ${integrationDate.toISOString()}`
    : sql`TRUE`;
  // Strategy 1: Try to match by order number with prefix
  // Extract potential prefix from warehouse order number (e.g., "LI-479851" -> try matching "#LI-479851" or "#479851")
  // Also try variations with and without dashes, and partial matches
  const baseNumber = warehouseOrderNumber.replace(/^[A-Z]+-?/, ''); // Remove prefix like "LI-" or "LI"
  const prefix = warehouseOrderNumber.match(/^([A-Z]+)-?/)?.[1] || '';
  
  const potentialMatches = [
    warehouseOrderNumber, // Exact match: "LI-483422"
    `#${warehouseOrderNumber}`, // With hash: "#LI-483422"
    baseNumber, // Without prefix: "483422"
    `#${baseNumber}`, // With hash, no prefix: "#483422"
    warehouseOrderNumber.replace(/-/g, ''), // Without dashes: "LI483422"
    `#${warehouseOrderNumber.replace(/-/g, '')}`, // "#LI483422"
    prefix ? `${prefix}-${baseNumber}` : warehouseOrderNumber, // With dash: "LI-483422"
    prefix ? `#${prefix}-${baseNumber}` : `#${warehouseOrderNumber}`, // "#LI-483422"
  ];
  
  // Remove duplicates
  const uniqueMatches = Array.from(new Set(potentialMatches));
  
  for (const orderNum of uniqueMatches) {
    const orderByNumber = await db.select()
      .from(orders)
      .where(
        and(
          eq(orders.operationId, operationId),
          eq(orders.shopifyOrderNumber, orderNum),
          dateFilter
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
          sql`LOWER(TRIM(${orders.customerEmail})) = ${normalizedEmail}`,
          dateFilter
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
    // SQL helper to normalize phone: use customer_phone first, fallback to shopify_data if empty
    const normalizePhoneSQL = sql`REGEXP_REPLACE(REGEXP_REPLACE(
      COALESCE(
        NULLIF(${orders.customerPhone}, ''),
        ${orders.shopifyData}->>'phone',
        ${orders.shopifyData}->'shipping_address'->>'phone',
        ${orders.shopifyData}->'billing_address'->>'phone',
        ${orders.shopifyData}->'customer'->>'phone',
        ${orders.shopifyData}->'customer'->'default_address'->>'phone',
        ''
      ),
      '\\b(ext|extension|ramal|x)\\s*\\.?\\s*\\d+', '', 'gi'), '[^0-9]', '', 'g')`;
    
    // Try exact match first (preserves full precision)
    const exactPhoneMatch = await db.select()
      .from(orders)
      .where(
        and(
          eq(orders.operationId, operationId),
          sql`${normalizePhoneSQL} = ${normalizedPhone}`,
          dateFilter
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
          sql`${normalizePhoneSQL} LIKE ${'%' + suffixDigits}`,
          dateFilter
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
            sql`RIGHT(${normalizePhoneSQL}, ${normalizedPhone.length}) = ${normalizedPhone}`,
            dateFilter
          )
        )
        .limit(1);
      
      if (suffixMatch2.length > 0) {
        console.log(`✅ Matched by phone (reverse suffix): ${warehouseOrderNumber} -> ${normalizedPhone}`);
        return suffixMatch2[0];
      }
    }
  }
  
  // Strategy 4: Match by name + total value (fallback when phone/email unavailable)
  if (warehouseName && warehouseValue) {
    const normalizedName = normalizeName(warehouseName);
    if (normalizedName && normalizedName.length >= 3) {
      const totalValue = typeof warehouseValue === 'string' ? parseFloat(warehouseValue) : warehouseValue;
      
      if (!isNaN(totalValue) && totalValue > 0) {
        // Search for orders with similar name and close total value (tolerance: €1)
        const nameTotalMatch = await db.select()
          .from(orders)
          .where(
            and(
              eq(orders.operationId, operationId),
              sql`LOWER(REGEXP_REPLACE(${orders.customerName}, '[^a-zA-Z0-9\\s]', '', 'g')) LIKE ${'%' + normalizedName + '%'}`,
              sql`ABS(CAST(${orders.total} AS DECIMAL) - ${totalValue}) <= 1.0`,
              dateFilter
            )
          )
          .limit(1);
        
        if (nameTotalMatch.length > 0) {
          console.log(`✅ Matched by name + total: ${warehouseOrderNumber} -> ${nameTotalMatch[0].shopifyOrderNumber} (${warehouseName} + €${totalValue})`);
          return nameTotalMatch[0];
        }
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
    console.log(`📦 No warehouse accounts found for user ${userId}`);
    return new Map();
  }
  
  console.log(`📦 Found ${userAccounts.length} warehouse account(s) for user ${userId}`);
  
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
  
  // Auto-update accounts with linked operations from 'pending' to 'active'
  for (const account of userAccounts) {
    if (account.status === 'pending' && cache.has(account.id)) {
      console.log(`🔄 Auto-activating warehouse account ${account.id} (has ${cache.get(account.id)!.length} linked operation(s))`);
      await db.update(userWarehouseAccounts)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(userWarehouseAccounts.id, account.id));
    }
  }
  
  console.log(`📦 Cached ${cache.size} warehouse accounts with ${accountOperations.length} total operations`);
  
  if (cache.size === 0) {
    console.warn(`⚠️ No warehouse accounts have linked operations! Accounts exist but aren't linked to any operations.`);
    console.warn(`⚠️ Accounts found: ${userAccounts.map(a => `${a.id} (${a.providerKey}, ${a.status})`).join(', ')}`);
  }
  
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
        
        // Obter data de integração mais antiga para filtrar pedidos
        const integrationDate = await getEarliestIntegrationDate(operation.id);
        
        // Use intelligent matching (order number → email → phone)
        const existingOrder = await findShopifyOrderIntelligent(
          fhbOrder.variableSymbol,
          customerEmail,
          customerPhone,
          operation.id,
          undefined,
          undefined,
          integrationDate
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
          
          // Mark as processed ONLY when we found a match
          await db.update(fhbOrders)
            .set({ processedToOrders: true, processedAt: new Date() })
            .where(eq(fhbOrders.id, fhbOrder.id));
          
          totalProcessed++;
        } else {
          // No Shopify order found - skip (DO NOT create orphan orders)
          // DO NOT mark as processed so it can be retried later
          console.warn(`⚠️ No Shopify match found for FHB order ${fhbOrder.variableSymbol}, skipping (will retry on next sync)`);
          totalSkipped++;
        }
        
        // Update progress (aggregate, don't overwrite)
        const progress = getUserSyncProgress(userId);
        progress.stagingProgress.processedLeads++;
        progress.version++;
        progress.overallProgress = calculateOverallProgress(
          progress.platformProgress,
          progress.currentStep
        );
        
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
  
  let consecutiveNoProgress = 0; // Track consecutive iterations with no progress
  const maxNoProgress = 3; // Max iterations without progress before stopping (reduced from 5)
  let totalIterations = 0;
  const maxTotalIterations = 30; // Maximum total iterations before forcing stop (reduced from 50)
  
  while (true) {
    totalIterations++;
    
    // Safety check: Force stop after max total iterations
    if (totalIterations > maxTotalIterations) {
      console.warn(`⚠️ FORCE STOPPING sync after ${maxTotalIterations} iterations to prevent infinite loop`);
      break;
    }
    // Only process orders that haven't been marked as failed match
    const unprocessedOrders = await db.select()
      .from(europeanFulfillmentOrders)
      .where(
        and(
          eq(europeanFulfillmentOrders.processedToOrders, false),
          inArray(europeanFulfillmentOrders.accountId, accountIds),
          // Exclude orders that already failed matching
          sql`(${europeanFulfillmentOrders.rawData}->>'failedMatch')::boolean IS NOT TRUE`
        )
      )
      .limit(batchSize);
    
    let batchProcessed = 0;
    
    if (unprocessedOrders.length === 0) {
      // No more orders to process - exit naturally
      // Atualizar progresso final antes de sair
      const progress = getUserSyncProgress(userId);
      progress.version++;
      progress.overallProgress = calculateOverallProgress(
        progress.shopifyProgress,
        progress.stagingProgress,
        progress.currentStep
      );
      break;
    }
    
    // Atualizar progresso ao iniciar novo batch (a cada batch de pedidos)
    if (unprocessedOrders.length > 0 && totalIterations === 1) {
      const progress = getUserSyncProgress(userId);
      progress.message = `Processando ${unprocessedOrders.length} pedido(s)...`;
      progress.version++;
    }
    
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
        const customerName = recipient?.name || recipient?.address?.name;
        const orderValue = efOrder.value;
        
        // Obter data de integração mais antiga para filtrar pedidos
        const integrationDate = await getEarliestIntegrationDate(operation.id);
        
        // Use intelligent matching (order number → email → phone → name+total)
        const existingOrder = await findShopifyOrderIntelligent(
          efOrder.orderNumber,
          customerEmail,
          customerPhone,
          operation.id,
          customerName,
          orderValue,
          integrationDate
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
          console.log(`✅ [EF MATCH] Order ${efOrder.orderNumber} matched with Shopify order ${existingOrder.shopifyOrderNumber}`);
          
          // Mark as processed ONLY when we found a match
          await db.update(europeanFulfillmentOrders)
            .set({ processedToOrders: true, processedAt: new Date() })
            .where(eq(europeanFulfillmentOrders.id, efOrder.id));
          
          totalProcessed++;
          
          // Update progress - increment when order is successfully processed
          const progress = getUserSyncProgress(userId);
          progress.stagingProgress.processedLeads++;
          progress.version++;
          progress.overallProgress = calculateOverallProgress(
            progress.shopifyProgress,
            progress.stagingProgress,
            progress.currentStep
          );
          
          // Log progresso a cada 10 pedidos para debug
          if (progress.stagingProgress.processedLeads % 10 === 0) {
            console.log(`📊 [STAGING PROGRESS] Processando: ${progress.stagingProgress.processedLeads}/${progress.stagingProgress.totalLeads} leads (${progress.overallProgress}% overall)`);
          }
          
          batchProcessed++;
        } else {
          // No Shopify order found after trying ALL matching methods
          // Mark as failed match immediately (no retry - all methods were tried)
          const rawData = efOrder.rawData as any;
          console.warn(`⚠️ No Shopify match found for European Fulfillment order ${efOrder.orderNumber} after trying all matching methods, marking as failed match`);
          
          await db.update(europeanFulfillmentOrders)
            .set({ 
              processedToOrders: true, 
              processedAt: new Date(),
              rawData: {
                ...rawData,
                failedMatch: true,
                failedMatchReason: 'No Shopify order found after trying all matching methods (order number, email, phone, name+value)',
                failedMatchAt: new Date().toISOString()
              }
            })
            .where(eq(europeanFulfillmentOrders.id, efOrder.id));
          
          totalProcessed++;
          batchProcessed++;
          
          // Update progress
        const progress = getUserSyncProgress(userId);
          progress.stagingProgress.processedLeads++;
          progress.version++;
          progress.overallProgress = calculateOverallProgress(
            progress.shopifyProgress,
            progress.stagingProgress,
            progress.currentStep
          );
        }
        
      } catch (error) {
        console.error(`❌ Error processing European Fulfillment order:`, error);
        const progress = getUserSyncProgress(userId);
        progress.errors++;
        totalSkipped++;
      }
    }
    
    // Track if we made progress in this batch (only count actual matches or failed matches, not skipped)
    if (batchProcessed > 0) {
      consecutiveNoProgress = 0; // Reset counter if we processed any orders (matched or failed)
    } else {
      // No progress in this iteration - exit
      break;
    }
    
    // Log progress every 5 iterations
    if (totalIterations % 5 === 0) {
      console.log(`🔄 Sync progress: Iteration ${totalIterations}, Processed: ${totalProcessed}, Updated: ${totalUpdated}, Skipped: ${totalSkipped}`);
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
        
        // Obter data de integração mais antiga para filtrar pedidos
        const integrationDate = await getEarliestIntegrationDate(operation.id);
        
        // Use intelligent matching (order number → email → phone)
        const existingOrder = await findShopifyOrderIntelligent(
          elogyOrder.orderNumber,
          customerEmail,
          customerPhone,
          operation.id,
          undefined,
          undefined,
          integrationDate
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
          
          // Mark as processed ONLY when we found a match
          await db.update(elogyOrders)
            .set({ processedToOrders: true, processedAt: new Date() })
            .where(eq(elogyOrders.id, elogyOrder.id));
          
          totalProcessed++;
        } else {
          // No Shopify order found - skip (DO NOT create orphan orders)
          // DO NOT mark as processed so it can be retried later
          console.warn(`⚠️ No Shopify match found for eLogy order ${elogyOrder.orderNumber}, skipping (will retry on next sync)`);
          totalSkipped++;
        }
        
        // Update progress (aggregate, don't overwrite)
        const progress = getUserSyncProgress(userId);
        progress.stagingProgress.processedLeads++;
        progress.version++;
        progress.overallProgress = calculateOverallProgress(
          progress.shopifyProgress,
          progress.stagingProgress,
          progress.currentStep
        );
        
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
 * Process Big Arena staging orders
 */
async function processBigArenaOrders(
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
    const unprocessedOrders = await db
      .select()
      .from(bigArenaOrders)
      .where(
        and(
          eq(bigArenaOrders.processedToOrders, false),
          inArray(bigArenaOrders.accountId, accountIds)
        )
      )
      .limit(batchSize);

    if (unprocessedOrders.length === 0) break;

    for (const warehouseOrder of unprocessedOrders) {
      try {
        const accountId = warehouseOrder.accountId;
        if (!accountId) {
          await db
            .update(bigArenaOrders)
            .set({ processedToOrders: true, processedAt: new Date(), linkedOrderId: null })
            .where(eq(bigArenaOrders.id, warehouseOrder.id));
          totalSkipped++;
          continue;
        }

        const accountOperations = accountOpsCache.get(accountId) || [];
        let operation = accountOperations.find((op) => warehouseOrder.operationId && op.id === warehouseOrder.operationId) || null;

        if (!operation) {
          const identifier = warehouseOrder.externalId || warehouseOrder.orderId || "";
          if (identifier) {
            operation = findOperationByPrefix(identifier, accountOperations);
          }
        }

        if (!operation && accountOperations.length === 1) {
          operation = accountOperations[0];
        }

        if (!operation) {
          await db
            .update(bigArenaOrders)
            .set({ processedToOrders: true, processedAt: new Date(), linkedOrderId: null })
            .where(eq(bigArenaOrders.id, warehouseOrder.id));
          totalSkipped++;
          continue;
        }

        const identifierCandidates = Array.from(
          new Set(
            [
              warehouseOrder.orderId,
              warehouseOrder.externalId,
              warehouseOrder.orderId ? `#${warehouseOrder.orderId}` : null,
              warehouseOrder.externalId ? `#${warehouseOrder.externalId}` : null,
            ].filter((value): value is string => Boolean(value && value.trim())),
          ),
        );

        let existingOrder: typeof orders.$inferSelect | null = null;

        // Obter data de integração mais antiga para filtrar pedidos
        const integrationDate = await getEarliestIntegrationDate(operation.id);
        const dateFilter = integrationDate 
          ? sql`${orders.orderDate} >= ${integrationDate.toISOString()}`
          : sql`TRUE`;

        for (const identifier of identifierCandidates) {
          const matchById = await db
            .select()
            .from(orders)
            .where(
              and(
                eq(orders.operationId, operation.id),
                eq(orders.id, identifier),
                dateFilter
              ),
            )
            .limit(1);
          if (matchById.length > 0) {
            existingOrder = matchById[0];
            break;
          }

          const matchByCarrier = await db
            .select()
            .from(orders)
            .where(
              and(
                eq(orders.operationId, operation.id),
                eq(orders.carrierOrderId, identifier),
                dateFilter
              ),
            )
            .limit(1);
          if (matchByCarrier.length > 0) {
            existingOrder = matchByCarrier[0];
            break;
          }
        }

        if (!existingOrder) {
          const shippingAddress = warehouseOrder.shippingAddress as any;
          const customerEmail = warehouseOrder.customerEmail || shippingAddress?.email || null;
          const customerPhone = warehouseOrder.customerPhone || shippingAddress?.phone || null;
          const customerName = warehouseOrder.customerName || shippingAddress?.name || null;
          const totalValue = warehouseOrder.total ? Number(warehouseOrder.total) : null;

          // Obter data de integração mais antiga para filtrar pedidos
          const integrationDate = await getEarliestIntegrationDate(operation.id);

          const primaryIdentifier = identifierCandidates[0] || warehouseOrder.orderId || warehouseOrder.externalId || "";
          existingOrder = await findShopifyOrderIntelligent(
            primaryIdentifier,
            customerEmail,
            customerPhone,
            operation.id,
            customerName,
            totalValue,
            integrationDate
          );
        }

        if (existingOrder) {
          const currentProviderData = (existingOrder.providerData as any) || {};
          await db
            .update(orders)
            .set({
              status: mapProviderStatus(warehouseOrder.status || '', 'big_arena'),
              trackingNumber: warehouseOrder.trackingCode ?? existingOrder.trackingNumber,
              carrierImported: true,
              carrierOrderId: warehouseOrder.orderId ?? existingOrder.carrierOrderId,
              carrierMatchedAt: new Date(),
              provider: existingOrder.provider || 'big_arena',
              lastSyncAt: new Date(),
              needsSync: false,
              providerData: {
                ...currentProviderData,
                bigArena: {
                  orderId: warehouseOrder.orderId,
                  externalId: warehouseOrder.externalId,
                  status: warehouseOrder.status,
                  trackingCode: warehouseOrder.trackingCode,
                  trackingUrl: warehouseOrder.trackingUrl,
                  total: warehouseOrder.total,
                  raw: warehouseOrder.rawData,
                  syncedAt: new Date().toISOString(),
                },
              },
            })
            .where(eq(orders.id, existingOrder.id));

          await db
            .update(bigArenaOrders)
            .set({
              processedToOrders: true,
              processedAt: new Date(),
              linkedOrderId: existingOrder.id,
              updatedAt: new Date(),
            })
            .where(eq(bigArenaOrders.id, warehouseOrder.id));

          totalProcessed++;
          totalUpdated++;
        } else {
          console.warn(
            `⚠️ No order match found for Big Arena order ${warehouseOrder.orderId || warehouseOrder.externalId}, keeping for retry`,
          );
          totalSkipped++;
        }

        const progress = getUserSyncProgress(userId);
        progress.stagingProgress.processedLeads++;
        progress.version++;
        progress.overallProgress = calculateOverallProgress(
          progress.shopifyProgress,
          progress.stagingProgress,
          progress.currentStep,
        );
      } catch (error) {
        console.error(`❌ Error processing Big Arena order:`, error);
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
  
  // Log total de pedidos por provider (incluindo os já processados para debug)
  const [fhbTotalCount, efTotalCount, elogyTotalCount, bigArenaTotalCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` })
      .from(fhbOrders)
      .where(
        inArray(
          sql`COALESCE(${fhbOrders.warehouseAccountId}, ${fhbOrders.fhbAccountId})`,
          accountIds
        )
      ),
    db.select({ count: sql<number>`count(*)` })
      .from(europeanFulfillmentOrders)
      .where(inArray(europeanFulfillmentOrders.accountId, accountIds)),
    db.select({ count: sql<number>`count(*)` })
      .from(elogyOrders)
      .where(inArray(elogyOrders.accountId, accountIds)),
    db.select({ count: sql<number>`count(*)` })
      .from(bigArenaOrders)
      .where(inArray(bigArenaOrders.accountId, accountIds))
  ]);
  
  const [fhbCount, efCount, elogyCount, bigArenaCount] = await Promise.all([
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
          inArray(europeanFulfillmentOrders.accountId, accountIds),
          // Exclude orders that already failed matching after max attempts
          sql`(${europeanFulfillmentOrders.rawData}->>'failedMatch')::boolean IS NOT TRUE`
        )
      ),
    db.select({ count: sql<number>`count(*)` })
      .from(elogyOrders)
      .where(
        and(
          eq(elogyOrders.processedToOrders, false),
          inArray(elogyOrders.accountId, accountIds)
        )
      ),
    db.select({ count: sql<number>`count(*)` })
      .from(bigArenaOrders)
      .where(
        and(
          eq(bigArenaOrders.processedToOrders, false),
          inArray(bigArenaOrders.accountId, accountIds)
        )
      )
  ]);
  
  const fhb = fhbCount[0]?.count || 0;
  const ef = efCount[0]?.count || 0;
  const elogy = elogyCount[0]?.count || 0;
  const bigArena = bigArenaCount[0]?.count || 0;
  const total = Number(fhb) + Number(ef) + Number(elogy) + Number(bigArena);
  
  const fhbTotal = fhbTotalCount[0]?.count || 0;
  const efTotal = efTotalCount[0]?.count || 0;
  const elogyTotal = elogyTotalCount[0]?.count || 0;
  const bigArenaTotal = bigArenaTotalCount[0]?.count || 0;
  
  console.log(`📊 [countUnprocessedOrders] User ${userId}:`);
  console.log(`   FHB: ${fhb}/${fhbTotal} não processados`);
  console.log(`   EF: ${ef}/${efTotal} não processados`);
  console.log(`   eLogy: ${elogy}/${elogyTotal} não processados`);
  console.log(`   Big Arena: ${bigArena}/${bigArenaTotal} não processados`);
  console.log(`   TOTAL: ${total} pedidos não processados`);
  
  // Se há pedidos totais mas nenhum não processado, pode ser que todos já foram processados
  if ((fhbTotal + efTotal + elogyTotal + bigArenaTotal) > 0 && total === 0) {
    console.log(`ℹ️ [countUnprocessedOrders] Todos os ${fhbTotal + efTotal + elogyTotal + bigArenaTotal} pedidos já foram processados anteriormente`);
  }
  
  return total;
}

/**
 * Perform complete sync from staging tables
 */
export async function performStagingSync(userId: string): Promise<void> {
  // Per-user concurrency guard
  const progress = getUserSyncProgress(userId);
  
  // CRÍTICO: Durante uma sync completa (Shopify -> Staging), é normal que o progresso
  // esteja em estado 'syncing' ou 'preparing' quando chamamos performStagingSync.
  // Também é possível que o Shopify já tenha completado e mudado o estado.
  // SEMPRE permitir se estamos em uma transição normal (Shopify -> Staging).
  
  // Se currentStep é 'shopify' ou está em fase 'syncing'/'preparing', é continuação normal
  const isNormalTransition = 
    progress.currentStep === 'shopify' || 
    progress.phase === 'syncing' || 
    progress.phase === 'preparing';
  
  if (progress.isRunning && !isNormalTransition) {
    // Se está rodando mas NÃO é transição normal, verificar se pode resetar
    if (progress.phase === 'completed' || progress.phase === 'error') {
      console.log(`🔄 [STAGING SYNC] Sync já está em estado ${progress.phase}, resetando para permitir nova sync`);
      progress.isRunning = false;
      progress.phase = 'preparing';
      progress.currentStep = null;
      // Continuar normalmente após reset
    }
  }
  
  // SEMPRE permitir se é transição normal (Shopify -> Staging)
  if (isNormalTransition) {
    console.log(`✅ [STAGING SYNC] Continuando sync para user ${userId} (transição normal). Step: ${progress.currentStep} -> staging, Phase: ${progress.phase}`);
    // Garantir que estamos na etapa staging agora
    progress.currentStep = 'staging';
    // Garantir que isRunning está true e phase está 'syncing'
    progress.isRunning = true;
    progress.phase = 'syncing';
    // Continuar normalmente - não lançar erro
  }
  
  try {
    console.log(`🔄 Starting staging sync for user ${userId}`);
    
    // Reset progress for this user
    // Garantir que startTime seja definido ANTES de qualquer processamento
    if (!progress.startTime) {
      progress.startTime = new Date();
    }
    progress.isRunning = true;
    progress.phase = 'syncing'; // Mudar para syncing, não preparing
    progress.message = 'Processando pedidos da transportadora...';
    progress.currentStep = 'staging';
    progress.endTime = null;
    progress.version++;
    progress.stagingProgress = {
      processedLeads: 0,
      totalLeads: 0,
      newLeads: 0,
      updatedLeads: 0
    };
    progress.errors = 0;
    
    // Count total unprocessed orders
    const totalOrders = await countUnprocessedOrders(userId);
    
    // CRÍTICO: Atualizar totalLeads ANTES de qualquer delay ou processamento
    // Garantir que o frontend vê o total de pedidos imediatamente
    progress.stagingProgress.totalLeads = totalOrders;
    progress.message = totalOrders === 0 
      ? 'Verificando pedidos pendentes...' 
      : `Processando ${totalOrders} pedido(s)...`;
    progress.overallProgress = calculateOverallProgress(
      progress.shopifyProgress,
      progress.stagingProgress,
      progress.currentStep
    );
    progress.version++; // Atualizar versão para forçar refresh no frontend
    
    console.log(`📊 [STAGING SYNC] Total de pedidos não processados: ${totalOrders} para user ${userId}`);
    
    // Pequeno delay para garantir que o frontend recebeu o totalLeads
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (totalOrders === 0) {
      // CRÍTICO: Mesmo sem pedidos, mostrar processo por tempo suficiente para UX
      // Atualizar progresso para mostrar "0 / 0" no frontend
      progress.phase = 'syncing';
      progress.message = 'Nenhum pedido pendente para processar';
      progress.stagingProgress.processedLeads = 0;
      progress.stagingProgress.totalLeads = 0; // Garantir que está 0
      progress.overallProgress = calculateOverallProgress(
        progress.shopifyProgress,
        progress.stagingProgress,
        progress.currentStep
      );
      progress.version++;
      
      console.log(`📊 [STAGING SYNC] Nenhum pedido para processar, mostrando mensagem por 5 segundos`);
      
      // Delay de 5 segundos para o frontend receber e exibir a mensagem "Nenhum pedido teve o status atualizado na transportadora"
      // Atualizar progresso a cada 500ms durante os 5 segundos para garantir que o frontend veja o card ativo
      const startTime = Date.now();
      const duration = 5000; // 5 segundos (+2 segundos conforme solicitado)
      const updateInterval = 500; // Atualizar a cada 500ms
      
      while (Date.now() - startTime < duration) {
        await new Promise(resolve => setTimeout(resolve, updateInterval));
        // Atualizar progresso para manter o frontend sincronizado
        progress.version++;
        progress.phase = 'syncing';
        progress.currentStep = 'staging';
        progress.stagingProgress.totalLeads = 0;
        progress.stagingProgress.processedLeads = 0;
        progress.isRunning = true;
      }
      
      // Atualizar uma última vez antes de completar
      progress.phase = 'syncing';
      progress.message = 'Finalizando...';
      progress.currentStep = 'staging'; // Garantir que está na etapa staging
      progress.stagingProgress.totalLeads = 0; // Garantir que está 0
      progress.stagingProgress.processedLeads = 0; // Garantir que está 0
      
      // CRÍTICO: Calcular progresso ANTES de completar para garantir que está correto
      // Quando totalLeads = 0 e estamos em staging, stagingPercent deve ser 100%
      // E se o Shopify completou (processed >= total), shopifyPercent deve ser 100%
      // Então overall deve ser: 100 * 0.4 + 100 * 0.6 = 100%
      progress.overallProgress = calculateOverallProgress(
        progress.shopifyProgress,
        progress.stagingProgress,
        progress.currentStep
      );
      
      // CRÍTICO: Se o cálculo retornou menos de 100%, forçar para 100% (deve ser 100% quando completa)
      if (progress.overallProgress < 100) {
        console.warn(`⚠️ [STAGING SYNC] Progresso geral é ${progress.overallProgress}% mas deveria ser 100% quando completa! Forçando para 100%...`, {
          shopifyPercent: progress.shopifyProgress.processedOrders >= progress.shopifyProgress.totalOrders ? 100 : (progress.shopifyProgress.processedOrders / progress.shopifyProgress.totalOrders * 100),
          shopifyProcessed: progress.shopifyProgress.processedOrders,
          shopifyTotal: progress.shopifyProgress.totalOrders,
          stagingPercent: 100, // Sempre 100% quando totalLeads = 0
          stagingProcessed: 0,
          stagingTotal: 0,
          currentStep: progress.currentStep
        });
        progress.overallProgress = 100;
      }
      
      progress.version++;
      
      // Pequeno delay final
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Completar com 100%
      progress.phase = 'completed';
      progress.message = 'Sincronização concluída!';
      progress.isRunning = false;
      progress.endTime = new Date();
      progress.overallProgress = 100; // Garantir 100% quando completa
      progress.stagingProgress.processedLeads = 0;
      progress.stagingProgress.totalLeads = 0;
      progress.version++;
      
      console.log(`✅ [STAGING SYNC] Sync completo (sem pedidos) para user ${userId}`, {
        overallProgress: progress.overallProgress,
        shopifyProgress: {
          processed: progress.shopifyProgress.processedOrders,
          total: progress.shopifyProgress.totalOrders,
          percentage: progress.shopifyProgress.percentage
        },
        stagingProgress: {
          processed: progress.stagingProgress.processedLeads,
          total: progress.stagingProgress.totalLeads
        }
      });
      return;
    }
    
    console.log(`📊 Found ${totalOrders} unprocessed orders`);
    
    // Build account operations cache
    progress.phase = 'syncing';
    progress.message = `Fazendo matching de ${totalOrders} pedido(s)...`;
    progress.currentStep = 'staging'; // GARANTIR que está na etapa staging ANTES de atualizar versão
    progress.overallProgress = calculateOverallProgress(
      progress.shopifyProgress,
      progress.stagingProgress,
      progress.currentStep
    );
    progress.version++; // Atualizar versão para forçar refresh no frontend
    
    console.log(`📊 [STAGING SYNC] Iniciando matching de ${totalOrders} pedidos para user ${userId}`);
    
    // Pequeno delay para garantir que o frontend recebeu o totalLeads ANTES de iniciar processamento
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const accountOpsCache = await buildAccountOperationsCache(userId);
    
    // Atualizar progresso após cache ser construído
    progress.message = `Processando ${totalOrders} pedido(s)...`;
    progress.currentStep = 'staging'; // Garantir novamente que está na etapa staging
    progress.version++;
    
    console.log(`📊 [STAGING SYNC] Cache construído, iniciando processamento de ${totalOrders} pedidos...`);
    
    // Process all staging tables in parallel for speed
    // Nota: Cada função de processamento já atualiza o progresso individualmente
    console.log(`🔄 [STAGING SYNC] Iniciando processamento paralelo de FHB, EF, eLogy e Big Arena...`);
    const startTime = Date.now();
    const [fhbResult, efResult, elogyResult, bigArenaResult] = await Promise.all([
      processFHBOrders(userId, accountOpsCache),
      processEuropeanFulfillmentOrders(userId, accountOpsCache),
      processElogyOrders(userId, accountOpsCache),
      processBigArenaOrders(userId, accountOpsCache)
    ]);
    const processingTime = Date.now() - startTime;
    console.log(`✅ [STAGING SYNC] Processamento paralelo concluído em ${processingTime}ms:`, {
      fhb: fhbResult,
      ef: efResult,
      elogy: elogyResult,
      bigArena: bigArenaResult
    });
    
    // Atualizar progresso imediatamente após processamento iniciar
    progress.version++;
    progress.overallProgress = calculateOverallProgress(
      progress.shopifyProgress,
      progress.stagingProgress,
      progress.currentStep
    );
    
    // Atualizar progresso após processamento paralelo
    progress.message = 'Finalizando matching...';
    progress.version++;
    
    // Aggregate results from all providers
    progress.stagingProgress.newLeads = fhbResult.created + efResult.created + elogyResult.created + bigArenaResult.created;
    progress.stagingProgress.updatedLeads = fhbResult.updated + efResult.updated + elogyResult.updated + bigArenaResult.updated;
    
    // Atualizar processedLeads com o total real processado (já foi atualizado durante o processamento)
    // Mas garantir que está sincronizado
    const totalProcessed = fhbResult.processed + efResult.processed + elogyResult.processed + bigArenaResult.processed;
    if (progress.stagingProgress.processedLeads < totalProcessed) {
      progress.stagingProgress.processedLeads = totalProcessed;
    }
    progress.version++;
    progress.overallProgress = calculateOverallProgress(
      progress.shopifyProgress,
      progress.stagingProgress,
      progress.currentStep
    );
    
    console.log(`✅ Sync completed for user ${userId}:`, {
      fhb: fhbResult,
      europeanFulfillment: efResult,
      elogy: elogyResult,
      totals: {
        processed: progress.stagingProgress.processedLeads,
        total: progress.stagingProgress.totalLeads,
        newLeads: progress.stagingProgress.newLeads,
        updatedLeads: progress.stagingProgress.updatedLeads,
        errors: progress.errors
      }
    });
    
    // Pequeno delay para garantir que o frontend recebeu todas as atualizações
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // IMPORTANTE: Só marcar como completo se realmente terminou
    // Verificar se há pedidos sendo processados ainda
    const remainingUnprocessed = await countUnprocessedOrders(userId);
    
    if (remainingUnprocessed > 0) {
      console.log(`⚠️ [STAGING SYNC] Ainda há ${remainingUnprocessed} pedidos não processados, mas marcando como completo (foram processados: ${progress.stagingProgress.processedLeads}/${progress.stagingProgress.totalLeads})`);
    }
    
    progress.phase = 'completed';
    progress.message = 'Sincronização concluída!';
    progress.isRunning = false;
    progress.endTime = new Date();
    progress.currentStep = 'staging'; // Garantir que está na etapa staging
    
    // Garantir que processedLeads está correto
    progress.stagingProgress.processedLeads = progress.stagingProgress.totalLeads;
    
    // CRÍTICO: Calcular progresso ANTES de forçar para 100% para garantir que está correto
    // Quando staging completa (processed >= total), stagingPercent deve ser 100%
    // E se o Shopify completou (processed >= total), shopifyPercent deve ser 100%
    // Então overall deve ser: 100 * 0.4 + 100 * 0.6 = 100%
    const calculatedProgress = calculateOverallProgress(
      progress.shopifyProgress,
      progress.stagingProgress,
      progress.currentStep
    );
    
    // CRÍTICO: Sempre forçar para 100% quando completa, mas logar se o cálculo deu diferente
    if (calculatedProgress < 100) {
      console.warn(`⚠️ [STAGING SYNC] Progresso calculado é ${calculatedProgress}% mas deveria ser 100% quando completa! Forçando para 100%...`, {
        shopifyPercent: progress.shopifyProgress.processedOrders >= progress.shopifyProgress.totalOrders ? 100 : (progress.shopifyProgress.processedOrders / progress.shopifyProgress.totalOrders * 100),
        shopifyProcessed: progress.shopifyProgress.processedOrders,
        shopifyTotal: progress.shopifyProgress.totalOrders,
        stagingPercent: progress.stagingProgress.totalLeads > 0 ? (progress.stagingProgress.processedLeads / progress.stagingProgress.totalLeads * 100) : 100,
        stagingProcessed: progress.stagingProgress.processedLeads,
        stagingTotal: progress.stagingProgress.totalLeads,
        currentStep: progress.currentStep
      });
    }
    
    progress.overallProgress = 100; // Sempre 100% quando completa
    
    console.log(`✅ [STAGING SYNC] Sync marcado como completo para user ${userId}:`, {
      phase: progress.phase,
      isRunning: progress.isRunning,
      overallProgress: progress.overallProgress,
      endTime: progress.endTime,
      staging: {
        processed: progress.stagingProgress.processedLeads,
        total: progress.stagingProgress.totalLeads,
        new: progress.stagingProgress.newLeads,
        updated: progress.stagingProgress.updatedLeads
      }
    });
    
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
export async function getSyncProgress(userId: string): Promise<SyncProgress> {
  const progress = await getUserSyncProgress(userId);
  const runId = progress.runId || null;

  progress.shopifyProgress = progress.shopifyProgress || progress.platformProgress;
  progress.stagingProgress = progress.stagingProgress || createEmptyStagingProgress();
  
  // CRÍTICO PRIMEIRO: Limpar progressTracker ANTES de qualquer verificação
  // Isso garante que valores antigos não sejam retornados mesmo se houver uma race condition
  if (!progress.isRunning) {
    try {
      const { ShopifySyncService } = await import('../shopify-sync-service');
      
      // Buscar todas as operações do usuário e limpar o progressTracker ANTES de verificar progress.shopifyProgress
      const userAccounts = await db.select()
        .from(userWarehouseAccounts)
        .where(eq(userWarehouseAccounts.userId, userId));
      
      if (userAccounts.length > 0) {
        const accountIds = userAccounts.map(a => a.id);
        
        // Buscar operações vinculadas a essas contas
        const accountOperations = await db.select()
          .from(userWarehouseAccountOperations)
          .innerJoin(operations, eq(userWarehouseAccountOperations.operationId, operations.id))
          .where(inArray(userWarehouseAccountOperations.accountId, accountIds));
        
        // Limpar progressTracker para cada operação ANTES de qualquer verificação
        for (const row of accountOperations) {
          const operationId = row.operations.id;
          const shopifyProgress = ShopifySyncService.getOperationProgress(operationId);
          
          // SEMPRE limpar se não está rodando E tem valores não-zero
          if (!shopifyProgress.isRunning && 
              (shopifyProgress.totalOrders > 0 || 
               shopifyProgress.processedOrders > 0 || 
               shopifyProgress.percentage > 0)) {
            console.log(`🔄 [GET SYNC PROGRESS] Limpando progressTracker antigo ANTES de retornar status para operação ${operationId}:`, {
              shopifyTotal: shopifyProgress.totalOrders,
              shopifyProcessed: shopifyProgress.processedOrders,
              shopifyPercentage: shopifyProgress.percentage
            });
            ShopifySyncService.resetOperationProgress(operationId);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ [GET SYNC PROGRESS] Não foi possível limpar progressTracker (não crítico):`, error);
    }
  }
  
  // CRÍTICO: Se não há sync rodando, SEMPRE zerar valores antigos do Shopify
  // EXCEÇÃO APENAS: Se acabou de completar AGORA (menos de 5 segundos), manter para o resumo
  // Isso previne retornar valores antigos (como 370/369) quando o modal abre antes de iniciar nova sync
  if (!progress.isRunning) {
    // Verificar se a sync acabou MUITO recentemente (menos de 5 segundos atrás)
    // Isso permite que o resumo seja exibido brevemente antes de zerar
    const hasVeryRecentCompletion = progress.endTime && 
      progress.phase === 'completed' &&
      (typeof progress.endTime === 'string' 
        ? (Date.now() - new Date(progress.endTime).getTime()) < 5000
        : (Date.now() - progress.endTime.getTime()) < 5000);
    
    // Se há valores das plataformas mas não há sync ativa E não completou muito recentemente, SEMPRE zerar
    if (!hasVeryRecentCompletion && 
        (progress.platformProgress.totalOrders > 0 || 
         progress.platformProgress.processedOrders > 0 || 
         progress.platformProgress.percentage > 0)) {
      console.log(`🔄 [GET SYNC PROGRESS] Zerando valores antigos de plataforma (não há sync ativa):`, {
        platformTotal: progress.platformProgress.totalOrders,
        platformProcessed: progress.platformProgress.processedOrders,
        platformPercentage: progress.platformProgress.percentage,
        isRunning: progress.isRunning,
        hasRunId: !!runId,
        phase: progress.phase,
        hasVeryRecentCompletion,
        endTime: progress.endTime
      });
      
      progress.platformProgress = {
        processedOrders: 0,
        totalOrders: 0,
        newOrders: 0,
        updatedOrders: 0,
        percentage: 0
      };
      progress.overallProgress = 0;
      progress.currentStep = null;
      
      if (!hasVeryRecentCompletion) {
        progress.phase = 'preparing';
        progress.message = 'Pronto para sincronizar';
        progress.runId = null;
        progress.version = 0;
      }
      
      console.log(`✅ [GET SYNC PROGRESS] Valores de plataforma zerados`);
    }
  }
  
  // CRÍTICO: Se a sincronização já completou, sempre retornar 100%
  if (progress.phase === 'completed' && !progress.isRunning) {
    progress.overallProgress = 100;
  } else {
    // Recalculate overall progress before returning (garantir que nunca seja NaN)
    const calculatedProgress = calculateOverallProgress(
      progress.platformProgress,
      progress.currentStep
    );
    progress.overallProgress = isNaN(calculatedProgress) ? 0 : Math.max(0, Math.min(100, calculatedProgress));
  }
  
  // Garantir que não há valores inválidos
  if (isNaN(progress.platformProgress.percentage)) {
    progress.platformProgress.percentage = 0;
  }
  
  // Retornar cópia com dates convertidos para ISO strings para serialização JSON
  // CRÍTICO: Incluir runId e version para o frontend (usar runId já capturado acima)
  const version = (progress as any).version || 0;
  
  // CRÍTICO: Garantir que overallProgress nunca seja undefined ou NaN
  const finalOverallProgress = (isNaN(progress.overallProgress) || progress.overallProgress === undefined || !isFinite(progress.overallProgress)) 
    ? 0 
    : Math.max(0, Math.min(100, progress.overallProgress));
  
  const serialized: SyncProgress & { startTime: string | null; endTime: string | null; runId: string | null; version: number } = {
    ...progress,
    overallProgress: finalOverallProgress, // Garantir que é um número válido
    startTime: progress.startTime ? (typeof progress.startTime === 'string' ? progress.startTime : new Date(progress.startTime).toISOString()) : null,
    endTime: progress.endTime ? (typeof progress.endTime === 'string' ? progress.endTime : new Date(progress.endTime).toISOString()) : null,
    runId: runId, // Garantir que runId está incluído
    version: version // Garantir que version está incluído
  } as any;
  
  // Atualizar o progresso original também
  progress.overallProgress = finalOverallProgress;
  
  // Log para debug - SEMPRE logar quando phase é completed para debug
  if (runId || progress.isRunning || (progress.phase !== 'preparing' && progress.phase === 'completed')) {
    console.log(`📤 [GET SYNC PROGRESS] Retornando status para user ${userId}:`, {
      isRunning: serialized.isRunning,
      phase: serialized.phase,
      overallProgress: serialized.overallProgress,
      originalOverallProgress: progress.overallProgress,
      currentStep: serialized.currentStep,
      runId: serialized.runId,
      version: serialized.version,
      platformProcessed: serialized.platformProgress.processedOrders,
      platformTotal: serialized.platformProgress.totalOrders
    });
    
    // Se overallProgress está undefined, é um erro crítico
    if (serialized.overallProgress === undefined || isNaN(serialized.overallProgress)) {
      const currentCalculatedProgress = calculateOverallProgress(
        progress.platformProgress,
        progress.currentStep
      );
      console.error(`❌ [GET SYNC PROGRESS] ERRO CRÍTICO: overallProgress está undefined ou NaN!`, {
        userId,
        phase: serialized.phase,
        calculatedProgressValue: currentCalculatedProgress,
        originalOverallProgress: progress.overallProgress,
        finalOverallProgressValue: finalOverallProgress
      });
    }
  }
  
  return serialized;
}

/**
 * Update platform progress for a user (Shopify/CartPanda/Digistore)
 */
export async function updatePlatformProgress(
  userId: string,
  updates: Partial<PlatformProgress>
): Promise<void> {
  const progress = await getUserSyncProgress(userId);
  const oldOverall = progress.overallProgress;
  const runId = progress.runId;
  
  // CRÍTICO: Se estamos recebendo valores não-zero mas não há runId E não há sync rodando, isso é um valor antigo
  if (((updates.totalOrders ?? 0) > 0 || (updates.processedOrders ?? 0) > 0 || (updates.percentage ?? 0) > 0) && !runId && !progress.isRunning) {
    console.log(`⏭️ [UPDATE PLATFORM PROGRESS] Ignorando atualização antiga sem runId e sem sync rodando`);
    return;
  }
  
  // CRÍTICO: Se estamos recebendo valores zerados, isso indica um reset
  if (updates.totalOrders === 0 && updates.processedOrders === 0 && updates.percentage === 0) {
    if (!runId && (progress.platformProgress.totalOrders > 0 || progress.platformProgress.processedOrders > 0)) {
      console.log(`⏭️ [UPDATE PLATFORM PROGRESS] Ignorando atualização com valores zerados sem runId`);
      return;
    }
    console.log(`✅ [UPDATE PLATFORM PROGRESS] Aplicando reset (valores zerados)`);
  }
  
  // Aplicar atualizações
  progress.platformProgress = { ...progress.platformProgress, ...updates };
  progress.shopifyProgress = progress.platformProgress;
  progress.version++;
  
  // Calculate percentage if totalOrders > 0
  if (progress.platformProgress.totalOrders > 0) {
    progress.platformProgress.percentage = Math.round(
      (progress.platformProgress.processedOrders / progress.platformProgress.totalOrders) * 100
    );
    
    progress.platformProgress.percentage = Math.max(0, Math.min(100, progress.platformProgress.percentage));
    
    if (progress.platformProgress.processedOrders >= progress.platformProgress.totalOrders) {
      progress.platformProgress.percentage = 100;
    }
  } else {
    progress.platformProgress.percentage = 0;
  }
  
  // Durante o processo de plataforma, currentStep DEVE refletir a plataforma atual
  if (progress.platformProgress.totalOrders > 0) {
    const platformStillRunning = 
      progress.platformProgress.processedOrders < progress.platformProgress.totalOrders ||
      progress.platformProgress.percentage < 100;
    
    if (platformStillRunning && !['shopify', 'cartpanda', 'digistore'].includes(progress.currentStep || '')) {
      progress.currentStep = 'shopify'; // Default to shopify if no specific step
    }
  }
  
  // Recalculate overall progress (agora apenas com plataformas)
  progress.overallProgress = calculateOverallProgress(
    progress.platformProgress,
    progress.currentStep
  );
  
  // Salvar no banco de dados
  await saveSyncSession(userId, progress);
  
  console.log(`📊 [PROGRESS] Platform progress atualizado:`, {
    userId,
    processed: progress.platformProgress.processedOrders,
    total: progress.platformProgress.totalOrders,
    percentage: progress.platformProgress.percentage,
    currentStep: progress.currentStep,
    oldOverall,
    newOverall: progress.overallProgress,
    version: progress.version
  });
}

// Manter compatibilidade com código existente
export const updateShopifyProgress = updatePlatformProgress;

/**
 * Set current step (shopify, cartpanda, digistore or staging)
 */
export async function setCurrentStep(
  userId: string,
  step: 'shopify' | 'cartpanda' | 'digistore' | 'staging' | null
): Promise<void> {
  const progress = await getUserSyncProgress(userId);
  progress.currentStep = step;
  progress.overallProgress = calculateOverallProgress(
    progress.platformProgress,
    step
  );
  
  // Salvar no banco de dados
  await saveSyncSession(userId, progress);
}

/**
 * Reset sync progress for a specific user
 */
export async function resetSyncProgress(userId: string): Promise<void> {
  console.log(`🔄 [RESET] Resetando progresso para user ${userId}`);
  
  const platformProgress = createEmptyPlatformProgress();
  const stagingProgress = createEmptyStagingProgress();

  const resetProgress: SyncProgress = {
    isRunning: false,
    phase: 'preparing',
    message: 'Pronto para sincronizar',
    currentStep: null,
    overallProgress: 0,
    platformProgress,
    shopifyProgress: platformProgress,
    stagingProgress,
    errors: 0,
    startTime: null,
    endTime: null,
    runId: null,
    version: 0
  };
  
  // Salvar no banco de dados
  await saveSyncSession(userId, resetProgress);
  
  console.log(`✅ [RESET] Progresso resetado para user ${userId}:`, {
    isRunning: resetProgress.isRunning,
    phase: resetProgress.phase,
    overallProgress: resetProgress.overallProgress,
    runId: resetProgress.runId,
    version: resetProgress.version
  });
}
