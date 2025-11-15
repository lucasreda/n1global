// 🚚 Big Arena Sync Worker
// Responsável por sincronizar pedidos, retornos, estoque, produtos e metadados da Big Arena

import { db } from "../db";
import {
  bigArenaWarehouseAccounts,
  bigArenaWarehouses,
  bigArenaOrders,
  bigArenaOrderReturns,
  bigArenaProducts,
  bigArenaProductVariants,
  bigArenaShipments,
  bigArenaCouriers,
  bigArenaCourierNomenclatures,
  userWarehouseAccounts,
  userWarehouseAccountOperations,
} from "@shared/schema";
import { and, eq, sql } from "drizzle-orm";
import {
  BigArenaService,
  BigArenaListResponse,
  BigArenaOrder,
  BigArenaOrderReturn,
  BigArenaProduct,
  BigArenaShipment,
  BigArenaVariant,
  BigArenaWarehouse,
  BigArenaCourier,
  BigArenaCourierNomenclature,
} from "../services/big-arena-service";

const DEFAULT_POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos
const INITIAL_DELAY_MS = 5_000;

let workerTimer: NodeJS.Timeout | null = null;
let workerRunning = false;
const accountsInFlight = new Set<string>();

export interface BigArenaSyncStats {
  orders: number;
  orderReturns: number;
  products: number;
  variants: number;
  shipments: number;
  warehouses: number;
  couriers: number;
  courierNomenclatures: number;
}

interface BigArenaAccountConfig {
  accountId: string;
  bigArenaAccountId: string;
  userId: string;
  status: string;
  apiToken: string;
  apiDomain?: string | null;
  lastSyncAt?: Date | null;
  lastSyncCursor?: string | null;
  operationIds: string[];
}

type BigArenaOrderInsert = typeof bigArenaOrders.$inferInsert;
type BigArenaOrderReturnInsert = typeof bigArenaOrderReturns.$inferInsert;
type BigArenaProductInsert = typeof bigArenaProducts.$inferInsert;
type BigArenaProductVariantInsert = typeof bigArenaProductVariants.$inferInsert;
type BigArenaShipmentInsert = typeof bigArenaShipments.$inferInsert;
type BigArenaWarehouseInsert = typeof bigArenaWarehouses.$inferInsert;
type BigArenaCourierInsert = typeof bigArenaCouriers.$inferInsert;
type BigArenaCourierNomenclatureInsert = typeof bigArenaCourierNomenclatures.$inferInsert;

/**
 * Inicia o worker de sincronização automática da Big Arena.
 */
export function startBigArenaSyncWorker(): void {
  if (process.env.BIG_ARENA_SYNC_DISABLED === "true") {
    console.warn("⏸️  Big Arena sync worker desabilitado via variável de ambiente.");
    return;
  }

  if (workerTimer) {
    return;
  }

  console.log("🚀 Iniciando Big Arena sync worker...");
  scheduleNextRun(INITIAL_DELAY_MS);
}

/**
 * Permite sincronizar manualmente uma conta específica (utilizado em endpoints).
 */
export async function syncBigArenaAccount(
  accountId: string,
  options: { reason?: "manual" | "automatic" } = {},
): Promise<BigArenaSyncStats> {
  if (accountsInFlight.has(accountId)) {
    console.log(`⏳ Big Arena sync já em execução para a conta ${accountId}, ignorando chamada paralela.`);
    return {
      orders: 0,
      orderReturns: 0,
      products: 0,
      variants: 0,
      shipments: 0,
      warehouses: 0,
      couriers: 0,
      courierNomenclatures: 0,
    };
  }

  const config = await getAccountConfig(accountId);
  if (!config) {
    throw new Error("Conta Big Arena não encontrada ou inativa.");
  }

  accountsInFlight.add(accountId);

  try {
    const stats = await runAccountSync(config);
    await updateAccountSyncState(config, {
      success: true,
      reason: options.reason ?? "manual",
      stats,
    });
    return stats;
  } catch (error: any) {
    console.error(`❌ Erro ao sincronizar conta Big Arena ${accountId}:`, error);
    await updateAccountSyncState(config, {
      success: false,
      reason: options.reason ?? "manual",
      error: error instanceof Error ? error.message : String(error),
    });
    throw error instanceof Error ? error : new Error(String(error));
  } finally {
    accountsInFlight.delete(accountId);
  }
}

/**
 * Agenda próxima execução automática.
 */
function scheduleNextRun(delay: number = DEFAULT_POLL_INTERVAL_MS) {
  if (workerTimer) {
    clearTimeout(workerTimer);
  }
  workerTimer = setTimeout(() => {
    runScheduledSync().catch((error) => {
      console.error("❌ Erro no loop de sincronização Big Arena:", error);
    });
  }, delay);
}

/**
 * Executa ciclo automático de sincronização para todas as contas ativas.
 */
async function runScheduledSync() {
  if (workerRunning) {
    return;
  }

  workerRunning = true;
  try {
    const accounts = await getActiveAccounts();
    if (accounts.length === 0) {
      console.log("ℹ️ Nenhuma conta Big Arena ativa para sincronizar.");
      return;
    }

    console.log(`🔄 Big Arena worker sincronizando ${accounts.length} conta(s) ativa(s)...`);

    for (const account of accounts) {
      try {
        await syncBigArenaAccount(account.accountId, { reason: "automatic" });
      } catch (error) {
        console.error(`⚠️ Erro ao sincronizar conta Big Arena ${account.accountId}:`, error);
      }
    }
  } finally {
    workerRunning = false;
    scheduleNextRun();
  }
}

/**
 * Recupera todas as contas Big Arena com status ativo.
 */
async function getActiveAccounts(): Promise<Array<{ accountId: string }>> {
  const rows = await db
    .select({ accountId: bigArenaWarehouseAccounts.accountId })
    .from(bigArenaWarehouseAccounts)
    .innerJoin(userWarehouseAccounts, eq(bigArenaWarehouseAccounts.accountId, userWarehouseAccounts.id))
    .where(
      and(
        eq(userWarehouseAccounts.providerKey, "big_arena"),
        eq(userWarehouseAccounts.status, "active"),
        eq(bigArenaWarehouseAccounts.status, "active"),
      ),
    );

  return rows.map((row) => ({ accountId: row.accountId }));
}

/**
 * Busca a configuração completa de uma conta Big Arena específica.
 */
async function getAccountConfig(accountId: string): Promise<BigArenaAccountConfig | null> {
  const [row] = await db
    .select({
      accountId: userWarehouseAccounts.id,
      bigArenaAccountId: bigArenaWarehouseAccounts.id,
      userId: userWarehouseAccounts.userId,
      status: userWarehouseAccounts.status,
      apiToken: bigArenaWarehouseAccounts.apiToken,
      apiDomain: bigArenaWarehouseAccounts.apiDomain,
      lastSyncAt: bigArenaWarehouseAccounts.lastSyncAt,
      lastSyncCursor: bigArenaWarehouseAccounts.lastSyncCursor,
    })
    .from(bigArenaWarehouseAccounts)
    .innerJoin(userWarehouseAccounts, eq(bigArenaWarehouseAccounts.accountId, userWarehouseAccounts.id))
    .where(eq(bigArenaWarehouseAccounts.accountId, accountId))
    .limit(1);

  if (!row) {
    return null;
  }

  if (!row.apiToken || row.status !== "active") {
    return null;
  }

  const operationLinks = await db
    .select({
      accountId: userWarehouseAccountOperations.accountId,
      operationId: userWarehouseAccountOperations.operationId,
    })
    .from(userWarehouseAccountOperations)
    .where(eq(userWarehouseAccountOperations.accountId, accountId));

  const operationIds = operationLinks.map((item) => item.operationId);

  return {
    accountId: row.accountId,
    bigArenaAccountId: row.bigArenaAccountId,
    userId: row.userId,
    status: row.status,
    apiToken: row.apiToken,
    apiDomain: row.apiDomain,
    lastSyncAt: row.lastSyncAt,
    lastSyncCursor: row.lastSyncCursor,
    operationIds,
  };
}

/**
 * Executa sincronização para uma conta específica.
 * Por enquanto apenas coleta estatísticas (persistência será implementada na etapa seguinte).
 */
async function runAccountSync(config: BigArenaAccountConfig): Promise<BigArenaSyncStats> {
  // Sempre usar domínio padrão (https://my.bigarena.net/api/v1/) - apiDomain é ignorado no BigArenaService
  const service = new BigArenaService({
    apiToken: config.apiToken,
    domain: null, // Sempre null - domínio padrão é usado no BigArenaService.buildBaseUrl()
  });

  const stats: BigArenaSyncStats = {
    orders: 0,
    orderReturns: 0,
    products: 0,
    variants: 0,
    shipments: 0,
    warehouses: 0,
    couriers: 0,
    courierNomenclatures: 0,
  };

  // Apenas primeira página por enquanto; incremental será tratado posteriormente.
  const queries = { per_page: 100 };

  const ordersResp = await safeList(() => service.listOrders(queries), "orders");
  stats.orders = await upsertBigArenaOrders(config, ordersResp?.data ?? []);

  const returnsResp = await safeList(() => service.listOrderReturns(queries), "order-returns");
  stats.orderReturns = await upsertBigArenaOrderReturns(config, returnsResp?.data ?? []);

  const productsResp = await safeList(() => service.listProducts(queries), "products");
  stats.products = await upsertBigArenaProducts(config, productsResp?.data ?? []);

  const variantsResp = await safeList(() => service.listVariants(queries), "variants");
  stats.variants = await upsertBigArenaProductVariants(config, variantsResp?.data ?? []);

  const shipmentsResp = await safeList(() => service.listShipments(queries), "warehouse-shipments");
  stats.shipments = await upsertBigArenaShipments(config, shipmentsResp?.data ?? []);

  const warehousesResp = await safeList(() => service.listWarehouses({ per_page: 50 }), "warehouses");
  stats.warehouses = await upsertBigArenaWarehouses(config, warehousesResp?.data ?? []);

  const couriersResp = await safeList(() => service.listCouriers({ per_page: 50 }), "couriers");
  stats.couriers = await upsertBigArenaCouriers(config, couriersResp?.data ?? []);

  const nomenclaturesResp = await safeList(() => service.listCourierNomenclatures({ per_page: 50 }), "courier-nomenclatures");
  stats.courierNomenclatures = await upsertBigArenaCourierNomenclatures(config, nomenclaturesResp?.data ?? []);

  console.log(
    `✅ Big Arena sync concluído para conta ${config.accountId}. Resumo: ` +
      `${stats.orders} pedidos, ${stats.orderReturns} retornos, ` +
      `${stats.products} produtos, ${stats.variants} variantes, ` +
      `${stats.shipments} envios, ${stats.warehouses} warehouses.`,
  );

  return stats;
}

/**
 * Atualiza estado de sincronização no banco.
 */
async function updateAccountSyncState(
  config: BigArenaAccountConfig,
  result: {
    success: boolean;
    reason: string;
    stats?: BigArenaSyncStats;
    error?: string;
  },
) {
  const now = new Date();

  await db
    .update(bigArenaWarehouseAccounts)
    .set({
      lastSyncAt: now,
      lastSyncStatus: result.success ? "success" : "failed",
      lastSyncCursor: now.toISOString(),
      lastSyncError: result.success ? null : result.error ?? "Erro desconhecido",
      metadata: {
        lastRunReason: result.reason,
        lastRunAt: now.toISOString(),
        ...(result.stats ? { lastCounts: result.stats } : {}),
      },
      updatedAt: now,
    })
    .where(eq(bigArenaWarehouseAccounts.id, config.bigArenaAccountId));

  await db
    .update(userWarehouseAccounts)
    .set({
      lastSyncAt: now,
      status: result.success ? "active" : "active",
      updatedAt: now,
    })
    .where(eq(userWarehouseAccounts.id, config.accountId));
}

/**
 * Helper resiliente para chamadas list* com captura de erro controlada.
 */
async function safeList<T>(
  fn: () => Promise<BigArenaListResponse<T>>,
  resourceName: string,
): Promise<BigArenaListResponse<T> | null> {
  try {
    return await fn();
  } catch (error: any) {
    console.error(`❌ Erro ao buscar recurso ${resourceName} na Big Arena:`, error);
    return null;
  }
}

function getNestedValue(source: any, path: string): any {
  if (!source || typeof source !== "object") return undefined;
  return path.split(".").reduce<any>((acc, key) => {
    if (acc === null || acc === undefined) {
      return undefined;
    }
    if (Array.isArray(acc)) {
      const index = Number.parseInt(key, 10);
      return Number.isNaN(index) ? undefined : acc[index];
    }
    return acc[key];
  }, source);
}

function pickStringValue(source: any, paths: string[]): string | null {
  for (const path of paths) {
    const value = getNestedValue(source, path);
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (value !== undefined && value !== null && typeof value !== "object") {
      const str = String(value).trim();
      if (str.length > 0) return str;
    }
  }
  return null;
}

function pickNumberValue(source: any, paths: string[]): number | null {
  for (const path of paths) {
    const value = getNestedValue(source, path);
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function pickDateValue(source: any, paths: string[]): Date | null {
  for (const path of paths) {
    const value = getNestedValue(source, path);
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
}

async function upsertBigArenaOrders(
  config: BigArenaAccountConfig,
  records: BigArenaOrder[],
): Promise<number> {
  if (!records || records.length === 0) return 0;
  const now = new Date();
  const rows: BigArenaOrderInsert[] = [];

  for (const record of records) {
    const orderId =
      pickStringValue(record, ["id", "order_id", "orderId", "uuid", "reference", "order_number", "orderNumber"]) ?? null;
    if (!orderId) continue;

    const totalNumber = pickNumberValue(record, ["total", "total_amount", "grand_total", "amount", "summary.total"]);
    const shippingAddress =
      getNestedValue(record, "shipping_address") ??
      getNestedValue(record, "shipping.address") ??
      getNestedValue(record, "customer.shipping_address") ??
      null;
    const billingAddress =
      getNestedValue(record, "billing_address") ??
      getNestedValue(record, "billing.address") ??
      getNestedValue(record, "customer.billing_address") ??
      null;
    const items = getNestedValue(record, "items") ?? getNestedValue(record, "order_items") ?? null;

    const orderDate = pickDateValue(record, ["created_at", "order_date", "placed_at", "date"]);
    const updatedRemote = pickDateValue(record, ["updated_at", "modified_at", "status_updated_at"]);

    rows.push({
      accountId: config.accountId,
      bigArenaAccountId: config.bigArenaAccountId,
      operationId: config.operationIds[0] ?? null,
      orderId,
      externalId: pickStringValue(record, ["external_id", "external_reference", "reference"]),
      status: pickStringValue(record, ["status", "state", "order_status"]),
      total: totalNumber !== null ? String(totalNumber) : null,
      currency: pickStringValue(record, ["currency", "currency_code", "money.currency"]),
      trackingCode: pickStringValue(record, ["tracking_code", "tracking.code", "tracking_number", "trackingNumber"]),
      trackingUrl: pickStringValue(record, ["tracking_url", "tracking.url"]),
      customerName:
        pickStringValue(record, ["customer.name", "customer.full_name", "recipient.name", "shipping_address.name"]) ??
        null,
      customerPhone:
        pickStringValue(record, ["customer.phone", "recipient.phone", "shipping_address.phone", "phone"]) ?? null,
      customerEmail:
        pickStringValue(record, ["customer.email", "recipient.email", "shipping_address.email", "email"]) ?? null,
      shippingAddress,
      billingAddress,
      items,
      rawData: record,
      processedToOrders: false,
      linkedOrderId: null,
      processedAt: null,
      orderDate: orderDate ?? null,
      updatedAtRemote: updatedRemote ?? null,
      updatedAt: now,
    });
  }

  if (rows.length === 0) return 0;

  await db
    .insert(bigArenaOrders)
    .values(rows)
    .onConflictDoUpdate({
      target: [bigArenaOrders.bigArenaAccountId, bigArenaOrders.orderId],
      set: {
        status: sql`excluded.status`,
        total: sql`excluded.total`,
        currency: sql`excluded.currency`,
        trackingCode: sql`excluded.tracking_code`,
        trackingUrl: sql`excluded.tracking_url`,
        customerName: sql`excluded.customer_name`,
        customerPhone: sql`excluded.customer_phone`,
        customerEmail: sql`excluded.customer_email`,
        shippingAddress: sql`excluded.shipping_address`,
        billingAddress: sql`excluded.billing_address`,
        items: sql`excluded.items`,
        rawData: sql`excluded.raw_data`,
        orderDate: sql`excluded.order_date`,
        updatedAtRemote: sql`excluded.updated_at_remote`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  return rows.length;
}

async function upsertBigArenaOrderReturns(
  config: BigArenaAccountConfig,
  records: BigArenaOrderReturn[],
): Promise<number> {
  if (!records || records.length === 0) return 0;
  const now = new Date();
  const rows: BigArenaOrderReturnInsert[] = [];

  for (const record of records) {
    const returnId =
      pickStringValue(record, ["id", "return_id", "order_return_id", "uuid", "reference"]) ?? null;
    if (!returnId) continue;

    const status = pickStringValue(record, ["status", "state"]);
    const resolved = status ? ["resolved", "completed", "closed"].includes(status.toLowerCase()) : false;

    rows.push({
      bigArenaAccountId: config.bigArenaAccountId,
      orderReturnId: returnId,
      orderId: pickStringValue(record, ["order_id", "orderId", "order.id"]),
      status,
      reason: pickStringValue(record, ["reason", "notes", "description"]),
      resolved,
      rawData: record,
      processedAt: pickDateValue(record, ["processed_at", "resolved_at"]),
      updatedAt: now,
    });
  }

  if (rows.length === 0) return 0;

  await db
    .insert(bigArenaOrderReturns)
    .values(rows)
    .onConflictDoUpdate({
      target: [bigArenaOrderReturns.bigArenaAccountId, bigArenaOrderReturns.orderReturnId],
      set: {
        status: sql`excluded.status`,
        reason: sql`excluded.reason`,
        resolved: sql`excluded.resolved`,
        rawData: sql`excluded.raw_data`,
        processedAt: sql`excluded.processed_at`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  return rows.length;
}

async function upsertBigArenaProducts(
  config: BigArenaAccountConfig,
  records: BigArenaProduct[],
): Promise<number> {
  if (!records || records.length === 0) return 0;
  const now = new Date();
  const rows: BigArenaProductInsert[] = [];

  for (const record of records) {
    const productId = pickStringValue(record, ["id", "product_id", "productId", "sku", "uuid"]) ?? null;
    if (!productId) continue;

    rows.push({
      bigArenaAccountId: config.bigArenaAccountId,
      productId,
      sku: pickStringValue(record, ["sku", "code", "product_code"]),
      name: pickStringValue(record, ["name", "title", "product_name"]),
      status: pickStringValue(record, ["status", "state"]),
      metadata: getNestedValue(record, "metadata") ?? null,
      rawData: record,
      syncedAt: now,
      updatedAt: now,
    });
  }

  if (rows.length === 0) return 0;

  await db
    .insert(bigArenaProducts)
    .values(rows)
    .onConflictDoUpdate({
      target: [bigArenaProducts.bigArenaAccountId, bigArenaProducts.productId],
      set: {
        sku: sql`excluded.sku`,
        name: sql`excluded.name`,
        status: sql`excluded.status`,
        metadata: sql`excluded.metadata`,
        rawData: sql`excluded.raw_data`,
        syncedAt: sql`excluded.synced_at`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  return rows.length;
}

async function upsertBigArenaProductVariants(
  config: BigArenaAccountConfig,
  records: BigArenaVariant[],
): Promise<number> {
  if (!records || records.length === 0) return 0;
  const now = new Date();
  const rows: BigArenaProductVariantInsert[] = [];

  for (const record of records) {
    const variantId = pickStringValue(record, ["id", "variant_id", "variantId", "uuid"]) ?? null;
    if (!variantId) continue;

    const productId =
      pickStringValue(record, ["product_id", "productId", "product.id"]) ??
      pickStringValue(record, ["parent_id", "parentId"]) ??
      null;
    if (!productId) continue;

    const priceNumber = pickNumberValue(record, ["price", "price_amount", "amount", "sale_price"]);
    const inventoryQuantity = pickNumberValue(record, ["inventory", "inventory_quantity", "stock"]);

    rows.push({
      bigArenaAccountId: config.bigArenaAccountId,
      productId,
      variantId,
      sku: pickStringValue(record, ["sku", "code", "barcode"]),
      title: pickStringValue(record, ["title", "name", "variant_name"]),
      barcode: pickStringValue(record, ["barcode", "ean", "ean13"]),
      price: priceNumber !== null ? String(priceNumber) : null,
      inventoryQuantity: inventoryQuantity !== null ? Math.trunc(inventoryQuantity) : null,
      rawData: record,
      syncedAt: now,
      updatedAt: now,
    });
  }

  if (rows.length === 0) return 0;

  await db
    .insert(bigArenaProductVariants)
    .values(rows)
    .onConflictDoUpdate({
      target: [bigArenaProductVariants.bigArenaAccountId, bigArenaProductVariants.variantId],
      set: {
        sku: sql`excluded.sku`,
        title: sql`excluded.title`,
        barcode: sql`excluded.barcode`,
        price: sql`excluded.price`,
        inventoryQuantity: sql`excluded.inventory_quantity`,
        rawData: sql`excluded.raw_data`,
        syncedAt: sql`excluded.synced_at`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  return rows.length;
}

async function upsertBigArenaShipments(
  config: BigArenaAccountConfig,
  records: BigArenaShipment[],
): Promise<number> {
  if (!records || records.length === 0) return 0;
  const now = new Date();
  const rows: BigArenaShipmentInsert[] = [];

  for (const record of records) {
    const shipmentId = pickStringValue(record, ["id", "shipment_id", "shipmentId", "uuid"]) ?? null;
    if (!shipmentId) continue;

    rows.push({
      bigArenaAccountId: config.bigArenaAccountId,
      shipmentId,
      orderId: pickStringValue(record, ["order_id", "orderId", "order.id"]),
      status: pickStringValue(record, ["status", "state"]),
      carrier: pickStringValue(record, ["carrier", "courier.name", "shipping_company"]),
      trackingCode: pickStringValue(record, ["tracking_code", "tracking.code", "tracking_number"]),
      trackingUrl: pickStringValue(record, ["tracking_url", "tracking.url"]),
      shippedAt: pickDateValue(record, ["shipped_at", "shipping_date"]),
      deliveredAt: pickDateValue(record, ["delivered_at", "delivery_date"]),
      rawData: record,
      updatedAt: now,
    });
  }

  if (rows.length === 0) return 0;

  await db
    .insert(bigArenaShipments)
    .values(rows)
    .onConflictDoUpdate({
      target: [bigArenaShipments.bigArenaAccountId, bigArenaShipments.shipmentId],
      set: {
        orderId: sql`excluded.order_id`,
        status: sql`excluded.status`,
        carrier: sql`excluded.carrier`,
        trackingCode: sql`excluded.tracking_code`,
        trackingUrl: sql`excluded.tracking_url`,
        shippedAt: sql`excluded.shipped_at`,
        deliveredAt: sql`excluded.delivered_at`,
        rawData: sql`excluded.raw_data`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  return rows.length;
}

async function upsertBigArenaWarehouses(
  config: BigArenaAccountConfig,
  records: BigArenaWarehouse[],
): Promise<number> {
  if (!records || records.length === 0) return 0;
  const now = new Date();
  const rows: BigArenaWarehouseInsert[] = [];

  for (const record of records) {
    const warehouseId = pickStringValue(record, ["id", "warehouse_id", "warehouseId", "uuid"]) ?? null;
    if (!warehouseId) continue;

    rows.push({
      bigArenaAccountId: config.bigArenaAccountId,
      warehouseId,
      name: pickStringValue(record, ["name", "title"]),
      country: pickStringValue(record, ["country", "location.country"]),
      city: pickStringValue(record, ["city", "location.city"]),
      metadata: getNestedValue(record, "metadata") ?? null,
      rawData: record,
      syncedAt: now,
      updatedAt: now,
    });
  }

  if (rows.length === 0) return 0;

  await db
    .insert(bigArenaWarehouses)
    .values(rows)
    .onConflictDoUpdate({
      target: [bigArenaWarehouses.bigArenaAccountId, bigArenaWarehouses.warehouseId],
      set: {
        name: sql`excluded.name`,
        country: sql`excluded.country`,
        city: sql`excluded.city`,
        metadata: sql`excluded.metadata`,
        rawData: sql`excluded.raw_data`,
        syncedAt: sql`excluded.synced_at`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  return rows.length;
}

async function upsertBigArenaCouriers(
  config: BigArenaAccountConfig,
  records: BigArenaCourier[],
): Promise<number> {
  if (!records || records.length === 0) return 0;
  const now = new Date();
  const rows: BigArenaCourierInsert[] = [];

  for (const record of records) {
    const courierId = pickStringValue(record, ["id", "courier_id", "courierId", "uuid", "code"]) ?? null;
    if (!courierId) continue;

    rows.push({
      bigArenaAccountId: config.bigArenaAccountId,
      courierId,
      name: pickStringValue(record, ["name", "title"]),
      code: pickStringValue(record, ["code", "short_code"]),
      rawData: record,
      syncedAt: now,
      updatedAt: now,
    });
  }

  if (rows.length === 0) return 0;

  await db
    .insert(bigArenaCouriers)
    .values(rows)
    .onConflictDoUpdate({
      target: [bigArenaCouriers.bigArenaAccountId, bigArenaCouriers.courierId],
      set: {
        name: sql`excluded.name`,
        code: sql`excluded.code`,
        rawData: sql`excluded.raw_data`,
        syncedAt: sql`excluded.synced_at`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  return rows.length;
}

async function upsertBigArenaCourierNomenclatures(
  config: BigArenaAccountConfig,
  records: BigArenaCourierNomenclature[],
): Promise<number> {
  if (!records || records.length === 0) return 0;
  const now = new Date();
  const rows: BigArenaCourierNomenclatureInsert[] = [];

  for (const record of records) {
    const nomenclatureId = pickStringValue(record, ["id", "nomenclature_id", "nomenclatureId", "uuid"]) ?? null;
    if (!nomenclatureId) continue;

    rows.push({
      bigArenaAccountId: config.bigArenaAccountId,
      nomenclatureId,
      courierId: pickStringValue(record, ["courier_id", "courierId", "courier.id"]),
      name: pickStringValue(record, ["name", "title", "description"]),
      rawData: record,
      syncedAt: now,
      updatedAt: now,
    });
  }

  if (rows.length === 0) return 0;

  await db
    .insert(bigArenaCourierNomenclatures)
    .values(rows)
    .onConflictDoUpdate({
      target: [bigArenaCourierNomenclatures.bigArenaAccountId, bigArenaCourierNomenclatures.nomenclatureId],
      set: {
        courierId: sql`excluded.courier_id`,
        name: sql`excluded.name`,
        rawData: sql`excluded.raw_data`,
        syncedAt: sql`excluded.synced_at`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  return rows.length;
}

