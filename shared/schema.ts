import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean, jsonb, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Forward declare stores table for reference
let stores: any;

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"), // 'store', 'product_seller', 'supplier', 'super_admin', 'admin_financeiro', 'investor', 'admin_investimento', 'affiliate'
  storeId: varchar("store_id"), // For product_seller role - links to parent store
  onboardingCompleted: boolean("onboarding_completed").default(false),
  onboardingSteps: jsonb("onboarding_steps").$type<{
    step1_operation: boolean;
    step2_shopify: boolean;
    step3_shipping: boolean;
    step4_ads: boolean;
    step5_sync: boolean;
  }>().default({
    step1_operation: false,
    step2_shopify: false,
    step3_shipping: false,
    step4_ads: false,
    step5_sync: false
  }),
  onboardingCardHidden: boolean("onboarding_card_hidden").default(false),
  tourCompleted: boolean("tour_completed").default(false),
  permissions: jsonb("permissions").$type<string[]>().default([]),
  isActive: boolean("is_active").default(true), // Account active/inactive status
  forcePasswordChange: boolean("force_password_change").default(false), // Force password change on next login
  lastLoginAt: timestamp("last_login_at"), // Last login timestamp
  createdAt: timestamp("created_at").defaultNow(),
});

// Stores table - main tenant entities
stores = pgTable("stores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: varchar("owner_id").notNull(), // Store owner (references users.id but not enforced here)
  settings: jsonb("settings"), // Store-specific settings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export { stores };

// Operations table - business operations within a store
export const operations = pgTable("operations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // e.g., "PureDreams", "Operation Alpha"
  description: text("description"),
  storeId: varchar("store_id").notNull().references(() => stores.id), // Links operation to store
  ownerId: varchar("owner_id").references(() => users.id), // Operation owner/manager
  country: text("country").notNull(), // Country code e.g., "ES", "IT", "FR"
  currency: text("currency").notNull().default("EUR"), // Currency code e.g., "EUR", "PLN", "CZK"
  timezone: text("timezone").notNull().default("Europe/Madrid"), // IANA timezone e.g., "Europe/Madrid", "Europe/Rome"
  operationType: text("operation_type").notNull().default("Cash on Delivery"), // 'Cash on Delivery', 'Pagamento no Cartão'
  status: text("status").notNull().default("active"), // 'active', 'paused', 'archived'
  
  // Shopify order prefix for FHB multi-tenant filtering (e.g., "LOJA01", "PDREAMS")
  shopifyOrderPrefix: text("shopify_order_prefix"), // Unique prefix for Shopify orders
  
  settings: jsonb("settings"), // Operation-specific settings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Main orders table - unified for all providers
export const orders = pgTable("orders", {
  id: text("id").primaryKey(), // Lead number from provider (NT-xxxxx, etc) or Shopify order ID
  storeId: varchar("store_id").notNull().references(() => stores.id), // Links order to store
  operationId: varchar("operation_id").references(() => operations.id), // Links order to operation
  
  // Source identification - NEW FIELDS FOR SHOPIFY-FIRST FLOW
  dataSource: text("data_source").notNull().default("shopify"), // 'shopify', 'carrier', 'manual'
  shopifyOrderId: text("shopify_order_id"), // Original Shopify order ID
  shopifyOrderNumber: text("shopify_order_number"), // Shopify order number (#1001, etc)
  carrierImported: boolean("carrier_imported").notNull().default(false), // If found in carrier API
  carrierMatchedAt: timestamp("carrier_matched_at"), // When matched with carrier
  carrierOrderId: text("carrier_order_id"), // ID from carrier when matched
  carrierConfirmation: text("carrier_confirmation"), // Original confirmation status from carrier API ('confirmed', 'canceled', etc)
  
  // Customer information
  customerId: text("customer_id"),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  customerAddress: text("customer_address"),
  customerCity: text("customer_city"),
  customerState: text("customer_state"),
  customerCountry: text("customer_country"),
  customerZip: text("customer_zip"),
  
  // Order details
  status: text("status").notNull(), // 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'
  paymentStatus: text("payment_status"), // 'paid', 'unpaid', 'refunded'
  paymentMethod: text("payment_method"), // 'cod', 'prepaid'
  
  // Financial
  total: decimal("total", { precision: 10, scale: 2 }),
  productCost: decimal("product_cost", { precision: 10, scale: 2 }).default("0"),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default("0"),
  currency: text("currency").default("EUR"),
  
  // Products
  products: jsonb("products"), // Array of products with quantities and prices
  
  // Shipping provider info  
  provider: text("provider").notNull().default("european_fulfillment"), // 'european_fulfillment', 'elogy'
  providerOrderId: text("provider_order_id"), // Original ID from provider (legacy, use carrierOrderId)
  trackingNumber: text("tracking_number"),
  
  // Provider specific data stored as JSON
  providerData: jsonb("provider_data"),
  shopifyData: jsonb("shopify_data"), // Complete Shopify order data
  
  // Timestamps - CRITICAL: Use real dates from provider history
  orderDate: timestamp("order_date"), // Real order creation date from provider
  lastStatusUpdate: timestamp("last_status_update"),
  
  // Affiliate tracking - for affiliate program
  affiliateId: varchar("affiliate_id").references(() => users.id), // Which affiliate generated this sale
  affiliateTrackingId: text("affiliate_tracking_id"), // Token from affiliate link
  landingSource: text("landing_source"), // Where customer came from (URL, campaign, etc)
  
  // FHB Sync fields
  syncedFromFhb: boolean("synced_from_fhb").default(false), // If order came from FHB API
  needsSync: boolean("needs_sync").default(true), // If order needs to be synced
  lastSyncAt: timestamp("last_sync_at"), // Last time this order was synced from FHB
  
  // Metadata
  notes: text("notes"),
  tags: text("tags").array(),
  
  createdAt: timestamp("created_at").defaultNow(), // When we imported to our DB
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Currency Exchange History table - stores daily rates between currencies
export const currencyHistory = pgTable("currency_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull().unique(), // Format: YYYY-MM-DD - unique per date
  
  // Currency rates to BRL (1 CURRENCY = X BRL)
  eurToBrl: decimal("eur_to_brl", { precision: 10, scale: 6 }),
  usdToBrl: decimal("usd_to_brl", { precision: 10, scale: 6 }),
  gbpToBrl: decimal("gbp_to_brl", { precision: 10, scale: 6 }),
  arsToBrl: decimal("ars_to_brl", { precision: 10, scale: 6 }),
  clpToBrl: decimal("clp_to_brl", { precision: 10, scale: 6 }),
  cadToBrl: decimal("cad_to_brl", { precision: 10, scale: 6 }),
  audToBrl: decimal("aud_to_brl", { precision: 10, scale: 6 }),
  jpyToBrl: decimal("jpy_to_brl", { precision: 10, scale: 6 }),
  
  source: text("source").notNull().default("currencyapi"), // API source
  createdAt: timestamp("created_at").defaultNow(),
});

// Currency Settings table - stores which currencies to import for each user/system
export const currencySettings = pgTable("currency_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // null = global setting for all users
  currency: text("currency").notNull(), // Currency code (EUR, USD, GBP, etc.)
  enabled: boolean("enabled").notNull().default(true),
  baseCurrency: text("base_currency").notNull().default("BRL"), // Always convert to BRL
  createdAt: timestamp("created_at").defaultNow(),
});

// Order status history - track all status changes
export const orderStatusHistory = pgTable("order_status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: text("order_id").notNull().references(() => orders.id),
  
  previousStatus: text("previous_status"),
  newStatus: text("new_status").notNull(),
  comment: text("comment"),
  
  // Real timestamp from provider
  changedAt: timestamp("changed_at").notNull(),
  
  // Provider specific data
  providerData: jsonb("provider_data"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Dashboard metrics cache
export const dashboardMetrics = pgTable("dashboard_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id), // Links metrics to store
  operationId: varchar("operation_id").references(() => operations.id), // Links metrics to operation
  period: text("period").notNull(), // '1d', '7d', '30d', '90d'
  provider: text("provider"), // null for all providers
  
  totalOrders: integer("total_orders").default(0),
  deliveredOrders: integer("delivered_orders").default(0),
  cancelledOrders: integer("cancelled_orders").default(0),
  shippedOrders: integer("shipped_orders").default(0),
  pendingOrders: integer("pending_orders").default(0),
  returnedOrders: integer("returned_orders").default(0),
  confirmedOrders: integer("confirmed_orders").default(0),
  
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default("0"),
  deliveredRevenue: decimal("delivered_revenue", { precision: 12, scale: 2 }).default("0"),
  paidRevenue: decimal("paid_revenue", { precision: 12, scale: 2 }).default("0"),
  averageOrderValue: decimal("average_order_value", { precision: 8, scale: 2 }).default("0"),
  
  // Cached costs to avoid recalculation
  totalProductCosts: decimal("total_product_costs", { precision: 12, scale: 2 }).default("0"),
  totalShippingCosts: decimal("total_shipping_costs", { precision: 12, scale: 2 }).default("0"),
  totalCombinedCosts: decimal("total_combined_costs", { precision: 12, scale: 2 }).default("0"),
  marketingCosts: decimal("marketing_costs", { precision: 12, scale: 2 }).default("0"),
  
  // Profit calculations
  totalProfit: decimal("total_profit", { precision: 12, scale: 2 }).default("0"),
  profitMargin: decimal("profit_margin", { precision: 8, scale: 2 }).default("0"),
  roi: decimal("roi", { precision: 8, scale: 2 }).default("0"),
  
  // Customer analytics
  uniqueCustomers: integer("unique_customers").default(0),
  avgDeliveryTimeDays: decimal("avg_delivery_time_days", { precision: 8, scale: 2 }).default("0"),
  
  // CAC (Customer Acquisition Cost)
  cacBRL: decimal("cac_brl", { precision: 12, scale: 2 }).default("0"),
  cacEUR: decimal("cac_eur", { precision: 12, scale: 2 }).default("0"),
  
  // CPA Anúncios (Customer Per Acquisition - Ads)
  cpaAdsBRL: decimal("cpa_ads_brl", { precision: 12, scale: 2 }).default("0"),
  cpaAdsEUR: decimal("cpa_ads_eur", { precision: 12, scale: 2 }).default("0"),
  
  calculatedAt: timestamp("calculated_at").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sync jobs - track data imports from providers
export const syncJobs = pgTable("sync_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id), // Links sync job to store
  operationId: varchar("operation_id").references(() => operations.id), // Links sync job to operation
  provider: text("provider").notNull(),
  type: text("type").notNull(), // 'full_sync', 'incremental_sync', 'details_sync'
  
  status: text("status").notNull(), // 'running', 'completed', 'failed'
  
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  
  ordersProcessed: integer("orders_processed").default(0),
  ordersCreated: integer("orders_created").default(0),
  ordersUpdated: integer("orders_updated").default(0),
  errorCount: integer("error_count").default(0),
  
  lastProcessedId: text("last_processed_id"), // For incremental syncs
  
  logs: jsonb("logs"),
  error: text("error"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Facebook Ads integrations - per operation
export const facebookAdsIntegrations = pgTable("facebook_ads_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operationId: varchar("operation_id").notNull().references(() => operations.id),
  
  accountId: text("account_id").notNull(), // Facebook Ad Account ID
  accountName: text("account_name"),
  accessToken: text("access_token").notNull(),
  
  selectedCampaignIds: text("selected_campaign_ids").array().default([]), // Array of campaign IDs
  
  status: text("status").notNull().default("active"), // 'active', 'inactive', 'error'
  lastSyncAt: timestamp("last_sync_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Google Ads integrations - per operation
export const googleAdsIntegrations = pgTable("google_ads_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operationId: varchar("operation_id").notNull().references(() => operations.id),
  
  customerId: text("customer_id").notNull(), // Google Ads Customer ID
  accountName: text("account_name"),
  refreshToken: text("refresh_token").notNull(),
  
  selectedCampaignIds: text("selected_campaign_ids").array().default([]), // Array of campaign IDs
  
  status: text("status").notNull().default("active"), // 'active', 'inactive', 'error'
  lastSyncAt: timestamp("last_sync_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// FHB Accounts - Admin-level shared accounts (many operations : one FHB account)
export const fhbAccounts = pgTable("fhb_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // e.g., "FHB Account PT", "FHB Main"
  appId: text("app_id").notNull(), // FHB App ID
  secret: text("secret").notNull(), // FHB Secret
  apiUrl: text("api_url").notNull().default("https://api.fhb.sk/v3"), // Production or sandbox
  
  status: text("status").notNull().default("active"), // 'active', 'inactive'
  lastTestedAt: timestamp("last_tested_at"),
  testResult: text("test_result"), // Last connection test result
  
  // Initial sync tracking - ensures 1-year historical backfill on first use
  initialSyncCompleted: boolean("initial_sync_completed").notNull().default(false),
  initialSyncCompletedAt: timestamp("initial_sync_completed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// FHB Sync Logs - tracking of synchronization executions (DEPRECATED - use user_warehouse_accounts)
export const fhbSyncLogs = pgTable("fhb_sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fhbAccountId: varchar("fhb_account_id"), // Nullable now - legacy reference
  
  syncType: text("sync_type").notNull(), // 'initial' (1 year), 'deep' (30 days), or 'fast' (10 days)
  status: text("status").notNull(), // 'started', 'completed', 'failed'
  
  ordersProcessed: integer("orders_processed").default(0),
  ordersCreated: integer("orders_created").default(0),
  ordersUpdated: integer("orders_updated").default(0),
  ordersSkipped: integer("orders_skipped").default(0),
  
  durationMs: integer("duration_ms"), // Duration in milliseconds
  errorMessage: text("error_message"), // Error details if failed
  
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// FHB Orders Staging Table - raw FHB orders before processing to operations
export const fhbOrders = pgTable("fhb_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  warehouseAccountId: varchar("warehouse_account_id").references(() => userWarehouseAccounts.id, { onDelete: "set null" }), // New: references user warehouse accounts
  fhbAccountId: varchar("fhb_account_id"), // DEPRECATED: old reference for backwards compatibility
  
  // FHB order identifiers
  fhbOrderId: text("fhb_order_id").notNull(), // FHB's internal order ID
  variableSymbol: text("variable_symbol").notNull(), // Order number with prefix (e.g., "LOJA01-1234")
  
  // Order data
  status: text("status").notNull(), // FHB status
  tracking: text("tracking"), // Tracking number
  value: decimal("value", { precision: 10, scale: 2 }), // Order value
  
  // Structured data
  recipient: jsonb("recipient"), // Customer/recipient information
  items: jsonb("items"), // Order items
  rawData: jsonb("raw_data").notNull(), // Complete FHB order object
  
  // Processing tracking
  processedToOrders: boolean("processed_to_orders").notNull().default(false),
  linkedOrderId: text("linked_order_id"), // ID of the linked order in orders table (null if not linked)
  processedAt: timestamp("processed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicates (using new warehouse_account_id)
  uniqueFhbOrder: unique().on(table.warehouseAccountId, table.fhbOrderId),
  // Index for unprocessed orders
  unprocessedIdx: index("fhb_orders_unprocessed_idx").on(table.processedToOrders),
  // Index for variable symbol lookup
  variableSymbolIdx: index("fhb_orders_variable_symbol_idx").on(table.variableSymbol),
  // Index for warehouse account lookup
  warehouseAccountIdx: index("fhb_orders_warehouse_account_idx").on(table.warehouseAccountId),
}));

// European Fulfillment integration - per operation 
export const fulfillmentIntegrations = pgTable("fulfillment_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operationId: varchar("operation_id").notNull().references(() => operations.id),
  
  provider: text("provider").notNull(), // 'european_fulfillment', 'elogy', 'fhb'
  credentials: jsonb("credentials").notNull(), // Encrypted credentials
  
  // FHB-specific: reference to shared account
  fhbAccountId: varchar("fhb_account_id").references(() => fhbAccounts.id),
  
  status: text("status").notNull().default("active"), // 'active', 'inactive', 'error'
  lastSyncAt: timestamp("last_sync_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shopify integrations table
export const shopifyIntegrations = pgTable("shopify_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operationId: varchar("operation_id").notNull().references(() => operations.id),
  
  shopName: text("shop_name").notNull(), // e.g., "mystore.myshopify.com"
  accessToken: text("access_token").notNull(), // Shopify Admin API access token
  
  status: text("status").notNull().default("pending"), // 'active', 'pending', 'error'
  lastSyncAt: timestamp("last_sync_at"),
  syncErrors: text("sync_errors"), // Error messages from last sync
  
  // Store metadata
  metadata: jsonb("metadata").$type<{
    storeName?: string;
    storeEmail?: string;
    plan?: string;
    currency?: string;
    timezone?: string;
  }>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CartPanda integrations table
export const cartpandaIntegrations = pgTable("cartpanda_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operationId: varchar("operation_id").notNull().references(() => operations.id),
  
  storeSlug: text("store_slug").notNull(), // CartPanda store slug (e.g., "example-test")
  bearerToken: text("bearer_token").notNull(), // CartPanda API Bearer Token
  
  status: text("status").notNull().default("pending"), // 'active', 'pending', 'error'
  lastSyncAt: timestamp("last_sync_at"),
  syncErrors: text("sync_errors"), // Error messages from last sync
  
  // Store metadata
  metadata: jsonb("metadata").$type<{
    storeName?: string;
    storeUrl?: string;
    currency?: string;
    timezone?: string;
  }>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Warehouse Providers - Catalog of available warehouse providers
export const warehouseProviders = pgTable("warehouse_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(), // 'fhb', 'european_fulfillment', 'elogy'
  name: text("name").notNull(), // 'FHB', 'European Fulfillment', 'eLogy'
  description: text("description"),
  
  // Metadata about required fields for configuration
  requiredFields: jsonb("required_fields").$type<{
    fieldName: string;
    fieldType: string;
    label: string;
    placeholder?: string;
    required: boolean;
  }[]>(),
  
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Warehouse Accounts - User-level warehouse integrations (multi-account support)
export const userWarehouseAccounts = pgTable("user_warehouse_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  providerKey: text("provider_key").notNull().references(() => warehouseProviders.key), // 'fhb', 'european_fulfillment', 'elogy'
  
  displayName: text("display_name").notNull(), // User-friendly name: "FHB Account PT", "Main European"
  
  // Encrypted credentials (JSON structure varies by provider)
  credentials: jsonb("credentials").notNull().$type<{
    appId?: string;
    secret?: string;
    apiUrl?: string;
    token?: string;
    username?: string;
    password?: string;
    [key: string]: any;
  }>(),
  
  status: text("status").notNull().default("active"), // 'active', 'inactive', 'error'
  lastTestedAt: timestamp("last_tested_at"),
  testResult: text("test_result"), // Last connection test result
  
  // Sync tracking
  lastSyncAt: timestamp("last_sync_at"),
  initialSyncStatus: text("initial_sync_status").notNull().default("pending"), // 'pending', 'in_progress', 'completed', 'failed'
  initialSyncCompleted: boolean("initial_sync_completed").notNull().default(false),
  initialSyncCompletedAt: timestamp("initial_sync_completed_at"),
  initialSyncError: text("initial_sync_error"), // Error message if sync failed
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Index for fetching accounts by user
  userIdIdx: index("user_warehouse_accounts_user_id_idx").on(table.userId),
  // Index for fetching by provider
  providerKeyIdx: index("user_warehouse_accounts_provider_key_idx").on(table.providerKey),
}));

// User Warehouse Account Operations - Links user warehouse accounts to specific operations (optional)
export const userWarehouseAccountOperations = pgTable("user_warehouse_account_operations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => userWarehouseAccounts.id, { onDelete: "cascade" }),
  operationId: varchar("operation_id").notNull().references(() => operations.id),
  
  isDefault: boolean("is_default").notNull().default(false), // Default account for this operation
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint: one account-operation pair
  uniqueAccountOperation: unique().on(table.accountId, table.operationId),
  // Index for fetching operations by account
  accountIdIdx: index("user_warehouse_account_operations_account_id_idx").on(table.accountId),
  // Index for fetching accounts by operation
  operationIdIdx: index("user_warehouse_account_operations_operation_id_idx").on(table.operationId),
}));

// European Fulfillment Orders Staging Table - raw orders before processing to operations
export const europeanFulfillmentOrders = pgTable("european_fulfillment_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").references(() => userWarehouseAccounts.id, { onDelete: "set null" }), // Nullable - permite desvincular ao deletar conta
  
  // European Fulfillment order identifiers
  europeanOrderId: text("european_order_id").notNull(), // European's internal order ID
  orderNumber: text("order_number").notNull(), // Order number with prefix (e.g., "LOJA01-1234")
  
  // Order data
  status: text("status").notNull(), // European status
  tracking: text("tracking"), // Tracking number
  value: decimal("value", { precision: 10, scale: 2 }), // Order value
  
  // Structured data
  recipient: jsonb("recipient"), // Customer/recipient information
  items: jsonb("items"), // Order items
  rawData: jsonb("raw_data").notNull(), // Complete European order object
  
  // Processing tracking
  processedToOrders: boolean("processed_to_orders").notNull().default(false),
  linkedOrderId: text("linked_order_id"), // ID of the linked order in orders table (null if not linked)
  processedAt: timestamp("processed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicates
  uniqueEuropeanOrder: unique().on(table.accountId, table.europeanOrderId),
  // Index for unprocessed orders
  unprocessedIdx: index("european_fulfillment_orders_unprocessed_idx").on(table.processedToOrders),
  // Index for order number lookup
  orderNumberIdx: index("european_fulfillment_orders_order_number_idx").on(table.orderNumber),
}));

// eLogy Orders Staging Table - raw orders before processing to operations
export const elogyOrders = pgTable("elogy_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").references(() => userWarehouseAccounts.id, { onDelete: "set null" }), // Nullable - permite desvincular ao deletar conta
  
  // eLogy order identifiers
  elogyOrderId: text("elogy_order_id").notNull(), // eLogy's internal order ID
  orderNumber: text("order_number").notNull(), // Order number with prefix (e.g., "LOJA01-1234")
  
  // Order data
  status: text("status").notNull(), // eLogy status
  tracking: text("tracking"), // Tracking number
  value: decimal("value", { precision: 10, scale: 2 }), // Order value
  
  // Structured data
  recipient: jsonb("recipient"), // Customer/recipient information
  items: jsonb("items"), // Order items
  rawData: jsonb("raw_data").notNull(), // Complete eLogy order object
  
  // Processing tracking
  processedToOrders: boolean("processed_to_orders").notNull().default(false),
  linkedOrderId: text("linked_order_id"), // ID of the linked order in orders table (null if not linked)
  processedAt: timestamp("processed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicates
  uniqueElogyOrder: unique().on(table.accountId, table.elogyOrderId),
  // Index for unprocessed orders
  unprocessedIdx: index("elogy_orders_unprocessed_idx").on(table.processedToOrders),
  // Index for order number lookup
  orderNumberIdx: index("elogy_orders_order_number_idx").on(table.orderNumber),
}));

// User operation access - defines which operations a user can access
export const userOperationAccess = pgTable("user_operation_access", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  operationId: varchar("operation_id").notNull().references(() => operations.id),
  
  role: text("role").notNull().default("viewer"), // 'owner', 'admin', 'viewer'
  permissions: jsonb("permissions"), // Custom permissions
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id), // Links product to store
  operationId: varchar("operation_id").references(() => operations.id), // Links product to operation
  sku: text("sku").unique().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("fisico"), // 'fisico', 'nutraceutico'
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  lowStock: integer("low_stock").notNull().default(10),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  productUrl: text("product_url"),
  isActive: boolean("is_active").notNull().default(true),
  
  // Physical Dimensions
  weight: decimal("weight", { precision: 10, scale: 2 }), // Weight in kg
  height: decimal("height", { precision: 10, scale: 2 }), // Height in cm
  width: decimal("width", { precision: 10, scale: 2 }), // Width in cm
  depth: decimal("depth", { precision: 10, scale: 2 }), // Depth in cm
  
  // Country Availability
  availableCountries: text("available_countries").array(), // Array of country codes where product is available
  
  // Cost Configuration for Financial Analytics
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }), // Product purchase/manufacturing cost
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }), // Average shipping cost
  handlingFee: decimal("handling_fee", { precision: 10, scale: 2 }), // Processing/handling fee
  marketingCost: decimal("marketing_cost", { precision: 10, scale: 2 }), // Marketing attribution cost
  operationalCost: decimal("operational_cost", { precision: 10, scale: 2 }), // Operational overhead
  
  // Calculated fields for dashboard analytics
  profitMargin: decimal("profit_margin", { precision: 5, scale: 2 }), // Calculated profit margin %
  lastCostUpdate: timestamp("last_cost_update"), // When costs were last updated
  
  // Provider mapping
  providers: jsonb("providers"), // Maps provider -> provider_product_id
  
  // Supplier information - for products created by suppliers
  supplierId: varchar("supplier_id").references(() => users.id), // Who created this global product
  initialStock: integer("initial_stock").default(0), // Initial stock set by supplier
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, contract_sent, approved, rejected - for supplier approval workflow
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Products - Links users to global products via SKU
export const userProducts = pgTable("user_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  sku: text("sku").notNull(), // Cached for quick access
  
  // User can override costs for their specific business
  customCostPrice: decimal("custom_cost_price", { precision: 10, scale: 2 }),
  customShippingCost: decimal("custom_shipping_cost", { precision: 10, scale: 2 }),
  customHandlingFee: decimal("custom_handling_fee", { precision: 10, scale: 2 }),
  
  // Track when product was linked and last updated
  linkedAt: timestamp("linked_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
  
  // Unique constraint to prevent duplicate user-product links
  isActive: boolean("is_active").notNull().default(true),
});

// Product contracts for supplier approval workflow
export const productContracts = pgTable("product_contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id), // Links contract to product
  supplierId: varchar("supplier_id").notNull().references(() => users.id), // Supplier who owns the product
  adminId: varchar("admin_id").notNull().references(() => users.id), // Admin who sent the contract
  
  // Contract content
  contractTitle: text("contract_title").notNull().default("Contrato de Fornecimento de Produto"),
  contractContent: text("contract_content").notNull(), // Full contract text
  contractTerms: jsonb("contract_terms"), // Structured terms and conditions
  
  // Status tracking
  status: varchar("status", { length: 50 }).notNull().default("sent"), // sent, viewed, signed, rejected
  sentAt: timestamp("sent_at").defaultNow(),
  viewedAt: timestamp("viewed_at"),
  respondedAt: timestamp("responded_at"),
  
  // Contract details
  deliveryDays: integer("delivery_days").default(30), // Expected delivery timeframe
  minimumOrder: integer("minimum_order").default(1), // Minimum order quantity
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default('15.00'), // Commission percentage
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shipping providers configuration
export const shippingProviders = pgTable("shipping_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id), // Links provider to store
  operationId: varchar("operation_id").notNull().references(() => operations.id), // Links provider to specific operation
  name: text("name").notNull(),
  type: text("type").notNull().default("custom"), // 'european_fulfillment', 'custom'
  login: text("login"), // Login/Email for the provider
  password: text("password"), // Password for the provider  
  apiKey: text("api_key"),
  apiUrl: text("api_url"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(false),
  lastTestAt: timestamp("last_test_at"), // When last test was performed
  createdAt: timestamp("created_at").defaultNow(),
});

// Manual Ad Spend - for tracking manual advertising costs
export const manualAdSpend = pgTable("manual_ad_spend", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operationId: varchar("operation_id").notNull().references(() => operations.id), // Links to operation
  
  // Spend details
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(), // Amount spent in BRL
  currency: text("currency").notNull().default("BRL"), // Currency of the spend
  platform: text("platform").notNull(), // 'facebook', 'google', 'taboola', 'tiktok', 'influencer', 'outro'
  
  // Date and description
  spendDate: timestamp("spend_date").notNull(), // Date of the spend
  description: text("description"), // Optional description
  notes: text("notes"), // Additional notes
  
  // Metadata
  createdBy: varchar("created_by").notNull().references(() => users.id), // Who added this spend
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Operation type validation
export const operationTypeOptions = ["Cash on Delivery", "Pagamento no Cartão"] as const;
export const operationTypeSchema = z.enum(operationTypeOptions);

// Auth schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

// Store schemas
export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Operation schemas
export const insertOperationSchema = createInsertSchema(operations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  operationType: operationTypeSchema,
});

// Operation update schema for API
export const updateOperationTypeSchema = z.object({
  operationType: operationTypeSchema,
});

// Operation settings update schema for API
export const updateOperationSettingsSchema = z.object({
  operationType: operationTypeSchema.optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  shopifyOrderPrefix: z.string().optional().transform((val) => {
    // If undefined (field not in request), return undefined to preserve existing value
    if (val === undefined) return undefined;
    
    // If empty string, return empty string to clear the prefix
    if (!val || val.trim() === '') return '';
    
    // Normalize: remove # if present, keep only first 3 chars, add # back
    const normalized = val.trim();
    const withoutHash = normalized.startsWith('#') ? normalized.substring(1) : normalized;
    const prefix = withoutHash.substring(0, 3).toUpperCase();
    
    return prefix ? `#${prefix}` : '';
  }),
});

// Facebook Ads integration schemas
export const insertFacebookAdsIntegrationSchema = createInsertSchema(facebookAdsIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Google Ads integration schemas
export const insertGoogleAdsIntegrationSchema = createInsertSchema(googleAdsIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// FHB Accounts schemas
export const insertFhbAccountSchema = createInsertSchema(fhbAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastTestedAt: true,
  testResult: true,
});

export const updateFhbAccountSchema = createInsertSchema(fhbAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type InsertFhbAccount = z.infer<typeof insertFhbAccountSchema>;
export type UpdateFhbAccount = z.infer<typeof updateFhbAccountSchema>;
export type FhbAccount = typeof fhbAccounts.$inferSelect;

// FHB Orders schemas
export const insertFhbOrderSchema = createInsertSchema(fhbOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFhbOrder = z.infer<typeof insertFhbOrderSchema>;
export type FhbOrder = typeof fhbOrders.$inferSelect;

// Warehouse Providers schemas
export const insertWarehouseProviderSchema = createInsertSchema(warehouseProviders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWarehouseProvider = z.infer<typeof insertWarehouseProviderSchema>;
export type WarehouseProvider = typeof warehouseProviders.$inferSelect;

// User Warehouse Accounts schemas
export const insertUserWarehouseAccountSchema = createInsertSchema(userWarehouseAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastTestedAt: true,
  testResult: true,
  lastSyncAt: true,
  initialSyncCompleted: true,
  initialSyncCompletedAt: true,
});

export const updateUserWarehouseAccountSchema = createInsertSchema(userWarehouseAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type InsertUserWarehouseAccount = z.infer<typeof insertUserWarehouseAccountSchema>;
export type UpdateUserWarehouseAccount = z.infer<typeof updateUserWarehouseAccountSchema>;
export type UserWarehouseAccount = typeof userWarehouseAccounts.$inferSelect;

// User Warehouse Account Operations schemas
export const insertUserWarehouseAccountOperationSchema = createInsertSchema(userWarehouseAccountOperations).omit({
  id: true,
  createdAt: true,
});

export type InsertUserWarehouseAccountOperation = z.infer<typeof insertUserWarehouseAccountOperationSchema>;
export type UserWarehouseAccountOperation = typeof userWarehouseAccountOperations.$inferSelect;

// European Fulfillment Orders schemas
export const insertEuropeanFulfillmentOrderSchema = createInsertSchema(europeanFulfillmentOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEuropeanFulfillmentOrder = z.infer<typeof insertEuropeanFulfillmentOrderSchema>;
export type EuropeanFulfillmentOrder = typeof europeanFulfillmentOrders.$inferSelect;

// eLogy Orders schemas
export const insertElogyOrderSchema = createInsertSchema(elogyOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertElogyOrder = z.infer<typeof insertElogyOrderSchema>;
export type ElogyOrder = typeof elogyOrders.$inferSelect;

// Fulfillment integration schemas
export const insertFulfillmentIntegrationSchema = createInsertSchema(fulfillmentIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Shopify integration schemas
export const insertShopifyIntegrationSchema = createInsertSchema(shopifyIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// CartPanda integration schemas
export const insertCartpandaIntegrationSchema = createInsertSchema(cartpandaIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// User operation access schemas
export const insertUserOperationAccessSchema = createInsertSchema(userOperationAccess).omit({
  id: true,
  createdAt: true,
});

// Order schemas
export const insertOrderSchema = createInsertSchema(orders).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertOrderStatusHistorySchema = createInsertSchema(orderStatusHistory).omit({
  id: true,
  createdAt: true,
});

export const insertDashboardMetricsSchema = createInsertSchema(dashboardMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSyncJobSchema = createInsertSchema(syncJobs).omit({
  id: true,
  createdAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  profitMargin: true,
  lastCostUpdate: true,
});

export const insertShippingProviderSchema = createInsertSchema(shippingProviders).omit({
  id: true,
  createdAt: true,
});

export const insertManualAdSpendSchema = createInsertSchema(manualAdSpend).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  spendDate: z.union([z.string(), z.date()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
});

// User Products schemas
export const insertUserProductSchema = createInsertSchema(userProducts).omit({
  id: true,
  linkedAt: true,
  lastUpdated: true,
});

export const linkProductBySkuSchema = z.object({
  sku: z.string().min(1, "SKU é obrigatório"),
  customCostPrice: z.number().optional(),
  customShippingCost: z.number().optional(),
  customHandlingFee: z.number().optional(),
});

// Product contract schemas
export const insertProductContractSchema = createInsertSchema(productContracts).omit({
  id: true,
  sentAt: true,
  createdAt: true,
  updatedAt: true,
});



// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginSchema>;
export type User = typeof users.$inferSelect;

export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;

export type Operation = typeof operations.$inferSelect;
export type InsertOperation = z.infer<typeof insertOperationSchema>;

export type FacebookAdsIntegration = typeof facebookAdsIntegrations.$inferSelect;
export type InsertFacebookAdsIntegration = z.infer<typeof insertFacebookAdsIntegrationSchema>;

export type GoogleAdsIntegration = typeof googleAdsIntegrations.$inferSelect;
export type InsertGoogleAdsIntegration = z.infer<typeof insertGoogleAdsIntegrationSchema>;

export type FulfillmentIntegration = typeof fulfillmentIntegrations.$inferSelect;
export type InsertFulfillmentIntegration = z.infer<typeof insertFulfillmentIntegrationSchema>;

export type ShopifyIntegration = typeof shopifyIntegrations.$inferSelect;
export type InsertShopifyIntegration = z.infer<typeof insertShopifyIntegrationSchema>;

export type UserOperationAccess = typeof userOperationAccess.$inferSelect;
export type InsertUserOperationAccess = z.infer<typeof insertUserOperationAccessSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type InsertOrderStatusHistory = z.infer<typeof insertOrderStatusHistorySchema>;

export type DashboardMetrics = typeof dashboardMetrics.$inferSelect;
export type InsertDashboardMetrics = z.infer<typeof insertDashboardMetricsSchema>;

export type SyncJob = typeof syncJobs.$inferSelect;
export type InsertSyncJob = z.infer<typeof insertSyncJobSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type ShippingProvider = typeof shippingProviders.$inferSelect;
export type InsertShippingProvider = z.infer<typeof insertShippingProviderSchema>;

export type ManualAdSpend = typeof manualAdSpend.$inferSelect;
export type InsertManualAdSpend = z.infer<typeof insertManualAdSpendSchema>;

export type ProductContract = typeof productContracts.$inferSelect;
export type InsertProductContract = z.infer<typeof insertProductContractSchema>;

export type UserProduct = typeof userProducts.$inferSelect;
export type InsertUserProduct = z.infer<typeof insertUserProductSchema>;
export type LinkProductBySku = z.infer<typeof linkProductBySkuSchema>;

export type SupplierPayment = typeof supplierPayments.$inferSelect;
export type SupplierPaymentWithDetails = SupplierPayment & {
  supplierName?: string;
  amountBRL?: string;
  exchangeRate?: string;
};
export type InsertSupplierPayment = z.infer<typeof insertSupplierPaymentSchema>;

export type SupplierPaymentItem = typeof supplierPaymentItems.$inferSelect;
export type InsertSupplierPaymentItem = z.infer<typeof insertSupplierPaymentItemSchema>;

// Relations
export const storesRelations = relations(stores, ({ one, many }) => ({
  owner: one(users, {
    fields: [stores.ownerId],
    references: [users.id],
  }),
  productSellers: many(users, {
    relationName: "store_sellers"
  }),
  orders: many(orders),
  products: many(products),
  shippingProviders: many(shippingProviders),
  dashboardMetrics: many(dashboardMetrics),
  syncJobs: many(syncJobs),
}));

export const usersRelations = relations(users, ({ one }) => ({
  ownedStore: one(stores, {
    fields: [users.id],
    references: [stores.ownerId],
  }),
  linkedStore: one(stores, {
    fields: [users.storeId],
    references: [stores.id],
    relationName: "store_sellers"
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  store: one(stores, {
    fields: [orders.storeId],
    references: [stores.id],
  }),
}));

export const productsRelations = relations(products, ({ one }) => ({
  store: one(stores, {
    fields: [products.storeId],
    references: [stores.id],
  }),
}));

export const shippingProvidersRelations = relations(shippingProviders, ({ one }) => ({
  store: one(stores, {
    fields: [shippingProviders.storeId],
    references: [stores.id],
  }),
}));

export const dashboardMetricsRelations = relations(dashboardMetrics, ({ one }) => ({
  store: one(stores, {
    fields: [dashboardMetrics.storeId],
    references: [stores.id],
  }),
}));

export const syncJobsRelations = relations(syncJobs, ({ one }) => ({
  store: one(stores, {
    fields: [syncJobs.storeId],
    references: [stores.id],
  }),
}));

// Ad Creatives - Store creative assets from Facebook/Google Ads
export const adCreatives = pgTable("ad_creatives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operationId: varchar("operation_id").notNull().references(() => operations.id),
  network: varchar("network", { length: 20 }).notNull(), // "facebook" or "google"
  accountId: varchar("account_id").notNull(),
  campaignId: varchar("campaign_id").notNull(),
  adId: varchar("ad_id").notNull().unique(),
  creativeId: varchar("creative_id"),
  name: text("name"),
  status: text("status"), // 'active', 'paused', 'archived'
  type: text("type"), // 'image', 'video', 'carousel', 'collection', 'unknown'
  
  // Visual assets
  thumbnailUrl: text("thumbnail_url"),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  
  // Copy elements
  primaryText: text("primary_text"),
  headline: text("headline"),
  description: text("description"),
  linkUrl: text("link_url"),
  ctaType: text("cta_type"), // 'LEARN_MORE', 'SHOP_NOW', etc.
  
  // Performance metrics
  period: text("period"), // Date preset used for metrics
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  spend: decimal("spend", { precision: 12, scale: 2 }).default("0"),
  cpm: decimal("cpm", { precision: 10, scale: 2 }).default("0"),
  cpc: decimal("cpc", { precision: 10, scale: 2 }).default("0"),
  ctr: decimal("ctr", { precision: 8, scale: 4 }).default("0"),
  conversions: integer("conversions").default(0),
  conversionRate: decimal("conversion_rate", { precision: 8, scale: 4 }).default("0"),
  roas: decimal("roas", { precision: 10, scale: 2 }).default("0"),
  
  // Analysis tracking
  isAnalyzed: boolean("is_analyzed").default(false),
  isNew: boolean("is_new").default(true),
  lastSync: timestamp("last_sync"),
  
  // Raw data from provider
  providerData: jsonb("provider_data"),
  
  // Enhanced Creative Intelligence fields
  // Real performance data from Meta Marketing API
  metaInsightsData: jsonb("meta_insights_data").$type<{
    reachBreakdown?: {
      age?: { [key: string]: number };
      gender?: { [key: string]: number };
      placement?: { [key: string]: number };
    };
    frequencyDistribution?: { [key: string]: number };
    actionBreakdowns?: {
      actionType?: string;
      value?: number;
      costPerAction?: number;
    }[];
    timeBasedMetrics?: {
      hourly?: { [key: string]: number };
      daily?: { [key: string]: number };
    };
  }>(),
  
  // Performance predictions
  performancePredictions: jsonb("performance_predictions").$type<{
    predictedCTR?: number;
    predictedCVR?: number;
    predictedROAS?: number;
    confidenceScore?: number; // 0-100
    basedOnFeatures?: string[];
    lastUpdated?: string; // ISO timestamp
  }>(),
  
  // Benchmark comparison
  benchmarkData: jsonb("benchmark_data").$type<{
    industryPercentile?: number; // 0-100
    categoryAverage?: {
      ctr?: number;
      cpc?: number;
      cpm?: number;
      roas?: number;
    };
    competitorComparison?: {
      betterThan?: number; // percentage
      similarTo?: string[];
    };
  }>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Creative Analyses - Track AI analysis jobs and results
export const creativeAnalyses = pgTable("creative_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operationId: varchar("operation_id").notNull().references(() => operations.id),
  creativeId: varchar("creative_id").references(() => adCreatives.id),
  batchId: varchar("batch_id"), // For grouping multiple creatives in one analysis
  
  // Analysis details
  status: text("status").notNull(), // 'queued', 'running', 'completed', 'failed'
  analysisType: text("analysis_type").notNull(), // 'audit', 'angles', 'copy', 'variants', 'performance'
  provider: text("provider").notNull().default("hybrid"), // 'openai', 'hybrid' (whisper+gpt4o)
  model: text("model"), // 'gpt-4o', 'whisper-1', etc.
  
  // Cost tracking
  costEstimate: decimal("cost_estimate", { precision: 10, scale: 4 }).default("0"),
  actualCost: decimal("actual_cost", { precision: 10, scale: 4 }).default("0"),
  inputTokens: integer("input_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),
  
  // Audio analysis results (Whisper)
  audioAnalysis: jsonb("audio_analysis").$type<{
    transcript?: string;
    audioQuality?: number;
    voiceStyle?: string;
    musicDetected?: boolean;
    musicType?: string;
    silencePercentage?: number;
    speechRate?: number;
    ctaAudio?: string[];
    duration?: number;
  }>(),
  audioProcessingTime: integer("audio_processing_time"), // milliseconds
  audioCost: decimal("audio_cost", { precision: 10, scale: 4 }).default("0"),
  
  // Visual analysis results (GPT-4o with keyframes)
  visualAnalysis: jsonb("visual_analysis").$type<{
    keyframes?: Array<{
      timestamp: number;
      url: string;
      description: string;
      objects: string[];
      text: string[];
    }>;
    products?: string[];
    people?: number;
    logoVisibility?: number;
    textOnScreen?: string[];
    colors?: string[];
    composition?: string;
    visualQuality?: number;
  }>(),
  visualProcessingTime: integer("visual_processing_time"), // milliseconds
  visualCost: decimal("visual_cost", { precision: 10, scale: 4 }).default("0"),
  
  // Fusion analysis results (Combined insights)
  fusionAnalysis: jsonb("fusion_analysis").$type<{
    overallScore?: number;
    timeline?: Array<{
      timeRange: string;
      audioEvent?: string;
      visualEvent?: string;
      syncQuality?: number;
    }>;
    audioVisualSync?: string; // 'perfect', 'good', 'poor'
    narrativeFlow?: string;
    ctaAlignment?: string;
    predictedPerformance?: {
      ctr?: number;
      cvr?: number;
      engagement?: string;
    };
    keyStrengths?: string[];
    improvements?: string[];
  }>(),
  
  // Legacy analysis results (for backward compatibility)
  result: jsonb("result"), // Structured analysis output
  insights: jsonb("insights"), // Key insights extracted
  recommendations: jsonb("recommendations"), // Actionable recommendations
  scores: jsonb("scores"), // Various scoring metrics
  error: text("error"),
  
  // Progress tracking
  progress: jsonb("progress"), // Store progress data as JSON
  currentStep: integer("current_step").default(0), // Step number as integer
  
  // Enhanced Creative Intelligence analysis results
  // Copywriting analysis with enhanced structure
  copyAnalysis: jsonb("copy_analysis").$type<{
    persuasion?: {
      score: number;
      triggers: {
        scarcity?: number;
        urgency?: number;
        socialProof?: number;
        authority?: number;
        reciprocity?: number;
        emotion?: number;
      };
      examples: Array<{
        trigger: string;
        text: string;
        timestamp: number;
        strength: number;
      }>;
    };
    narrative?: {
      framework: string;
      confidence: number;
      completeness: number;
      stages: Array<{
        name: string;
        present: boolean;
        startSec: number;
        endSec: number;
        excerpt?: string;
      }>;
    };
    performance?: {
      wpm: number;
      speechDensity: number;
      clarity: number;
      pauses: Array<{
        startSec: number;
        duration: number;
        purpose: string;
      }>;
    };
    personaTone?: {
      tone: string;
      audienceFit: number;
      ageGroup: string;
      characteristics: string[];
      toneChanges: Array<{
        timestamp: number;
        fromTone: string;
        toTone: string;
        reason: string;
      }>;
    };
    powerWords?: {
      count: number;
      categories: { [key: string]: string[] };
      effectiveness: number;
    };
  }>(),
  
  // Scene-by-scene analysis for Creative Intelligence
  sceneAnalysis: jsonb("scene_analysis").$type<{
    scenes?: Array<{
      id: number;
      startSec: number;
      endSec: number;
      durationSec: number;
      technicalDescription: string;
      objects: Array<{
        label: string;
        count: number;
        confidence?: number;
      }>;
      text: Array<{
        content: string;
        position?: string;
        fontSize?: string;
      }>;
      peopleCount: number;
      dominantColors: string[];
      brandElements: string[];
      composition: {
        shotType: string;
        cameraMovement: string;
        cameraAngle: string;
        lighting: string;
      };
      audio: {
        transcriptSnippet: string;
        voiceStyle?: string;
        musicDetected: boolean;
        musicType?: string;
        volume: string;
        ctas?: string[];
      };
      visualScore: number;
      engagementScore: number;
      syncQuality: number;
    }>;
    overallSummary?: string;
    keyStrengths?: string[];
    improvements?: string[];
    recommendations?: string[];
  }>(),
  
  // Timing
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Facebook Ads Campaigns table
export const facebookCampaigns = pgTable("facebook_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id", { length: 255 }).notNull().unique(),
  accountId: varchar("account_id", { length: 255 }).notNull(), // ID da conta do Facebook Ads
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  objective: varchar("objective", { length: 100 }),
  dailyBudget: decimal("daily_budget", { precision: 10, scale: 2 }),
  lifetimeBudget: decimal("lifetime_budget", { precision: 10, scale: 2 }),
  amountSpent: decimal("amount_spent", { precision: 10, scale: 2 }).default("0"), // Valor em BRL
  originalAmountSpent: decimal("original_amount_spent", { precision: 10, scale: 2 }), // Valor original
  originalCurrency: varchar("original_currency", { length: 10 }).default("USD"), // Moeda original
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  cpm: decimal("cpm", { precision: 10, scale: 2 }).default("0"),
  cpc: decimal("cpc", { precision: 10, scale: 2 }).default("0"),
  ctr: decimal("ctr", { precision: 10, scale: 4 }).default("0"),
  isSelected: boolean("is_selected").default(false),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  lastSync: timestamp("last_sync").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Facebook Business Managers
export const facebookBusinessManagers = pgTable("facebook_business_managers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  accessToken: text("access_token"),
  isActive: boolean("is_active").default(true),
  lastSync: timestamp("last_sync"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Supplier Payments - Track payments to suppliers
export const supplierPayments = pgTable("supplier_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supplierId: varchar("supplier_id").notNull().references(() => users.id), // Supplier receiving payment
  storeId: varchar("store_id").notNull().references(() => stores.id), // Store making payment
  
  // Payment details
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  amountBRL: decimal("amount_brl", { precision: 12, scale: 2 }), // Amount in Brazilian Real
  currency: text("currency").notNull().default("EUR"),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 4 }), // EUR to BRL exchange rate
  description: text("description"),
  
  // Status tracking
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'paid', 'rejected', 'cancelled'
  paymentMethod: text("payment_method"), // 'bank_transfer', 'pix', 'paypal', 'other'
  
  // Date tracking
  dueDate: timestamp("due_date"),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  
  // Reference data
  referenceId: text("reference_id"), // External payment reference
  bankDetails: jsonb("bank_details"), // Bank account details for payment
  notes: text("notes"),
  
  // Approval workflow
  approvedBy: varchar("approved_by").references(() => users.id), // Finance admin who approved
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Supplier Payment Items - Track which orders/products are being paid
export const supplierPaymentItems = pgTable("supplier_payment_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentId: varchar("payment_id").notNull().references(() => supplierPayments.id),
  orderId: text("order_id").references(() => orders.id),
  productSku: text("product_sku"),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Investment Pool - Main investment fund/pool
export const investmentPools = pgTable("investment_pools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // e.g., "COD Operations Fund I"
  slug: text("slug").notNull().unique(), // URL-friendly identifier, e.g., "cod-operations-fund-i"
  description: text("description"),
  totalValue: decimal("total_value", { precision: 15, scale: 2 }).notNull().default("0"), // Total pool value in BRL
  totalInvested: decimal("total_invested", { precision: 15, scale: 2 }).notNull().default("0"), // Total invested by all investors
  monthlyReturn: decimal("monthly_return", { precision: 5, scale: 4 }).default("0"), // Monthly return percentage
  yearlyReturn: decimal("yearly_return", { precision: 5, scale: 4 }).default("0"), // Yearly return percentage
  status: text("status").notNull().default("active"), // 'active', 'closed', 'paused'
  minInvestment: decimal("min_investment", { precision: 10, scale: 2 }).notNull().default("1000"), // Minimum investment in BRL
  currency: text("currency").notNull().default("BRL"),
  
  // Risk profile
  riskLevel: text("risk_level").notNull().default("medium"), // 'low', 'medium', 'high'
  investmentStrategy: text("investment_strategy"), // Description of investment strategy
  
  // Legal Documentation
  cnpj: text("cnpj"), // CNPJ do fundo/pool
  cvmRegistration: text("cvm_registration"), // Registro CVM se aplicável
  auditReport: text("audit_report"), // URL do relatório de auditoria independente
  
  // Portfolio Composition
  portfolioComposition: jsonb("portfolio_composition"), // Composição detalhada da carteira
  
  // Fiscal Performance
  managementFeeRate: decimal("management_fee_rate", { precision: 5, scale: 4 }).default("0"), // Taxa de administração
  administrativeExpenses: decimal("administrative_expenses", { precision: 10, scale: 2 }).default("0"), // Despesas administrativas
  irRetentionHistory: jsonb("ir_retention_history"), // Histórico de retenção de IR
  benchmarkIndex: text("benchmark_index").default("CDI"), // Índice de referência (CDI, IPCA, etc)
  comeCotasRate: decimal("come_cotas_rate", { precision: 5, scale: 4 }).default("0"), // Taxa come-cotas
  
  // Operational Transparency
  custodyProvider: text("custody_provider"), // Provedor de custódia dos ativos
  liquidationProcess: text("liquidation_process"), // Descrição do processo de liquidação
  monthlyReports: jsonb("monthly_reports"), // Relatórios mensais da pool
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Investor Profiles - Extended profile information for investors
export const investorProfiles = pgTable("investor_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  
  // Personal information
  firstName: text("first_name"),
  lastName: text("last_name"),
  birthDate: timestamp("birth_date"),
  nationality: text("nationality"),
  
  // Contact information
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  country: text("country"),
  
  // Investment profile
  riskTolerance: text("risk_tolerance").default("medium"), // 'conservative', 'medium', 'aggressive'
  investmentExperience: text("investment_experience").default("beginner"), // 'beginner', 'intermediate', 'experienced'
  investmentGoals: text("investment_goals"), // 'capital_growth', 'income', 'balanced'
  monthlyIncomeRange: text("monthly_income_range"), // '0-2k', '2k-5k', '5k-10k', '10k+'
  
  // Bank information for payments
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  routingNumber: text("routing_number"),
  accountHolderName: text("account_holder_name"),
  
  // Verification status
  kycStatus: text("kyc_status").default("pending"), // 'pending', 'verified', 'rejected'
  kycDocuments: jsonb("kyc_documents"), // Array of document URLs/references
  verifiedAt: timestamp("verified_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Investments - Individual investor positions in pools
export const investments = pgTable("investments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  investorId: varchar("investor_id").notNull().references(() => users.id),
  poolId: varchar("pool_id").notNull().references(() => investmentPools.id),
  
  // Investment details
  totalInvested: decimal("total_invested", { precision: 12, scale: 2 }).notNull().default("0"), // Total amount invested
  currentValue: decimal("current_value", { precision: 12, scale: 2 }).notNull().default("0"), // Current investment value
  totalReturns: decimal("total_returns", { precision: 12, scale: 2 }).notNull().default("0"), // Total returns earned
  totalPaidOut: decimal("total_paid_out", { precision: 12, scale: 2 }).notNull().default("0"), // Total paid out to investor
  
  // Performance metrics
  returnRate: decimal("return_rate", { precision: 5, scale: 4 }).default("0"), // Overall return rate
  monthlyReturn: decimal("monthly_return", { precision: 5, scale: 4 }).default("0"), // Last month return
  
  // Status
  status: text("status").notNull().default("active"), // 'active', 'withdrawn', 'closed'
  
  // Investment dates
  firstInvestmentDate: timestamp("first_investment_date"),
  lastTransactionDate: timestamp("last_transaction_date"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Investment Transactions - All deposits, withdrawals, and returns
export const investmentTransactions = pgTable("investment_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  investmentId: varchar("investment_id").notNull().references(() => investments.id),
  investorId: varchar("investor_id").notNull().references(() => users.id),
  poolId: varchar("pool_id").notNull().references(() => investmentPools.id),
  
  // Transaction details
  type: text("type").notNull(), // 'deposit', 'withdrawal', 'return_payment', 'fee'
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("EUR"),
  
  // Payment details
  paymentMethod: text("payment_method"), // 'bank_transfer', 'pix', 'wire_transfer'
  paymentReference: text("payment_reference"), // External reference from bank/payment provider
  paymentStatus: text("payment_status").default("pending"), // 'pending', 'completed', 'failed', 'cancelled'
  
  // Description and metadata
  description: text("description"),
  metadata: jsonb("metadata"), // Additional transaction data
  
  // Processing information
  processedAt: timestamp("processed_at"),
  processedBy: varchar("processed_by").references(() => users.id), // Admin who processed
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pool Performance History - Track pool performance over time
export const poolPerformanceHistory = pgTable("pool_performance_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poolId: varchar("pool_id").notNull().references(() => investmentPools.id),
  
  // Performance metrics for the period
  period: text("period").notNull(), // 'daily', 'weekly', 'monthly'
  periodDate: timestamp("period_date").notNull(), // Date of the performance record
  
  // Financial metrics
  totalValue: decimal("total_value", { precision: 15, scale: 2 }).notNull(),
  totalInvested: decimal("total_invested", { precision: 15, scale: 2 }).notNull(),
  returnRate: decimal("return_rate", { precision: 5, scale: 4 }).notNull(),
  benchmarkReturn: decimal("benchmark_return", { precision: 5, scale: 4 }), // CDI or other benchmark
  
  // Additional metrics
  numberOfInvestors: integer("number_of_investors").default(0),
  newInvestments: decimal("new_investments", { precision: 12, scale: 2 }).default("0"),
  withdrawals: decimal("withdrawals", { precision: 12, scale: 2 }).default("0"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// INVESTMENT PAYMENT & TAX TABLES
// ==========================================

// Tax calculations for investment returns
export const investmentTaxCalculations = pgTable("investment_tax_calculations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  investorId: varchar("investor_id").notNull().references(() => users.id),
  
  // Tax period
  taxYear: integer("tax_year").notNull(),
  referenceMonth: integer("reference_month"), // For monthly calculations
  
  // Calculation details
  totalGains: decimal("total_gains", { precision: 12, scale: 2 }).notNull().default("0"),
  taxableAmount: decimal("taxable_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 4 }).notNull(), // E.g., 0.15 for 15%
  taxDue: decimal("tax_due", { precision: 12, scale: 2 }).notNull().default("0"),
  taxPaid: decimal("tax_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  
  // Status and dates
  status: text("status").notNull().default("pending"), // 'pending', 'filed', 'paid', 'overdue'
  dueDate: timestamp("due_date"),
  paidDate: timestamp("paid_date"),
  
  // Supporting data
  calculationDetails: jsonb("calculation_details"), // Detailed breakdown
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment receipts and documentation
export const paymentReceipts = pgTable("payment_receipts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id").notNull().references(() => investmentTransactions.id),
  investorId: varchar("investor_id").notNull().references(() => users.id),
  
  // Receipt details
  receiptNumber: text("receipt_number"),
  receiptType: text("receipt_type").notNull(), // 'bank_transfer', 'pix_receipt', 'ted_receipt', 'wire_transfer'
  
  // File storage
  fileUrl: text("file_url"), // URL to stored receipt file
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  fileMimeType: text("file_mime_type"),
  
  // Bank/Payment details
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  routingNumber: text("routing_number"),
  authenticationCode: text("authentication_code"), // Bank confirmation code
  
  // Fund source declaration
  fundSource: text("fund_source").notNull(), // 'salary', 'savings', 'business_income', 'investment_returns', 'inheritance', 'loan', 'gift', 'other'
  fundSourceDescription: text("fund_source_description"), // Additional details
  fundSourceDocuments: jsonb("fund_source_documents"), // Array of supporting documents
  
  // Verification
  isVerified: boolean("is_verified").default(false),
  verifiedBy: varchar("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  verificationNotes: text("verification_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tax payment schedule/calendar
export const taxPaymentSchedule = pgTable("tax_payment_schedule", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  investorId: varchar("investor_id").notNull().references(() => users.id),
  calculationId: varchar("calculation_id").references(() => investmentTaxCalculations.id),
  
  // Schedule details
  taxType: text("tax_type").notNull(), // 'income_tax', 'capital_gains', 'come_cotas'
  paymentType: text("payment_type").notNull(), // 'monthly', 'quarterly', 'annual', 'on_demand'
  
  // Amount and dates
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  reminderDate: timestamp("reminder_date"),
  
  // Status
  status: text("status").notNull().default("scheduled"), // 'scheduled', 'reminder_sent', 'paid', 'overdue', 'cancelled'
  paidDate: timestamp("paid_date"),
  paymentReference: text("payment_reference"),
  
  // Notifications
  reminderSent: boolean("reminder_sent").default(false),
  reminderSentAt: timestamp("reminder_sent_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ad Accounts - Unified table for Facebook and Google Ads
export const adAccounts = pgTable("ad_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id), // CRITICAL: Link to store for isolation
  operationId: varchar("operation_id").references(() => operations.id), // Link to specific operation for isolation
  network: varchar("network", { length: 20 }).notNull(), // "facebook" or "google"
  accountId: varchar("account_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  businessManagerId: varchar("business_manager_id", { length: 255 }), // For Facebook
  managerId: varchar("manager_id", { length: 255 }), // For Google Ads (Customer ID)
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"), // For Google OAuth
  appId: varchar("app_id", { length: 255 }), // For Facebook
  appSecret: text("app_secret"), // For Facebook
  clientId: varchar("client_id", { length: 255 }), // For Google
  clientSecret: text("client_secret"), // For Google
  isActive: boolean("is_active").default(true),
  currency: varchar("currency", { length: 10 }).default("EUR"), // Currency returned by API
  baseCurrency: varchar("base_currency", { length: 10 }).default("BRL"), // User configured currency
  timezone: varchar("timezone", { length: 50 }).default("Europe/Rome"),
  lastSync: timestamp("last_sync"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Campaigns - Unified table for Facebook and Google Ads
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  network: varchar("network", { length: 20 }).notNull(), // "facebook" or "google"
  campaignId: varchar("campaign_id", { length: 255 }).notNull(),
  accountId: varchar("account_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  objective: varchar("objective", { length: 100 }), // For Facebook
  campaignType: varchar("campaign_type", { length: 100 }), // For Google
  dailyBudget: decimal("daily_budget", { precision: 10, scale: 2 }),
  lifetimeBudget: decimal("lifetime_budget", { precision: 10, scale: 2 }),
  amountSpent: decimal("amount_spent", { precision: 10, scale: 2 }).default("0"), // Valor em BRL
  originalAmountSpent: decimal("original_amount_spent", { precision: 10, scale: 2 }), // Valor original
  originalCurrency: varchar("original_currency", { length: 10 }).default("USD"), // Moeda original
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  cpm: decimal("cpm", { precision: 10, scale: 2 }).default("0"),
  cpc: decimal("cpc", { precision: 10, scale: 2 }).default("0"),
  ctr: decimal("ctr", { precision: 10, scale: 4 }).default("0"),
  isSelected: boolean("is_selected").default(false),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  lastSync: timestamp("last_sync").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Facebook Ads Account Settings (Legacy - kept for backward compatibility)
export const facebookAdAccounts = pgTable("facebook_ad_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  businessManagerId: varchar("business_manager_id", { length: 255 }), // Removida a FK constraint
  accessToken: text("access_token"),
  appId: varchar("app_id", { length: 255 }),
  appSecret: text("app_secret"),
  isActive: boolean("is_active").default(true),
  currency: varchar("currency", { length: 10 }).default("EUR"), // Moeda retornada pela API do Facebook
  baseCurrency: varchar("base_currency", { length: 10 }).default("BRL"), // Moeda configurada pelo usuário (BRL, USD, EUR)
  timezone: varchar("timezone", { length: 50 }).default("Europe/Rome"),
  lastSync: timestamp("last_sync"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Support system tables
export const supportCategories = pgTable("support_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // 'duvidas', 'reclamacoes', 'alteracao_endereco', 'cancelamento', 'manual'
  displayName: text("display_name").notNull(), // 'Dúvidas', 'Reclamações', 'Alteração de Endereço', 'Cancelamento', 'Manual'
  description: text("description"),
  isAutomated: boolean("is_automated").notNull().default(false), // If can be automated or needs manual review
  priority: integer("priority").notNull().default(0), // Higher number = higher priority
  color: text("color").default("#6b7280"), // UI color for category
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const supportEmails = pgTable("support_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Email details from webhook
  messageId: text("message_id").notNull().unique(), // Message ID
  inReplyTo: text("in_reply_to"), // Message ID this email is replying to
  references: text("references"), // Thread references for email threading
  from: text("from_email").notNull(), // Sender email
  to: text("to_email").notNull(), // Receiver email (support@n1.com)
  subject: text("subject").notNull(),
  textContent: text("text_content"), // Plain text content
  htmlContent: text("html_content"), // HTML content
  attachments: jsonb("attachments"), // Array of attachment info
  
  // AI Categorization
  categoryId: varchar("category_id").references(() => supportCategories.id),
  aiConfidence: integer("ai_confidence"), // 0-100 confidence score
  aiReasoning: text("ai_reasoning"), // Why AI chose this category
  
  // Sentiment Analysis
  sentiment: text("sentiment"), // 'muito_positivo' | 'positivo' | 'neutro' | 'negativo' | 'muito_negativo'
  emotion: text("emotion"), // 'calmo' | 'ansioso' | 'frustrado' | 'zangado' | 'preocupado' | 'satisfeito'
  urgency: text("urgency"), // 'baixa' | 'media' | 'alta' | 'critica'
  tone: text("tone"), // 'formal' | 'informal' | 'agressivo' | 'educado' | 'desesperado'
  hasTimeConstraint: boolean("has_time_constraint"), // Mentions deadlines/urgency
  escalationRisk: integer("escalation_risk"), // 0-10 risk score
  
  // Processing status
  status: text("status").notNull().default("received"), // 'received', 'categorized', 'responded', 'closed'
  isUrgent: boolean("is_urgent").notNull().default(false),
  requiresHuman: boolean("requires_human").notNull().default(false),
  
  // Response tracking
  hasAutoResponse: boolean("has_auto_response").notNull().default(false),
  autoResponseSentAt: timestamp("auto_response_sent_at"),
  
  // Raw data from Resend
  rawData: jsonb("raw_data"), // Complete webhook payload
  
  receivedAt: timestamp("received_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketNumber: text("ticket_number").notNull().unique(), // e.g., "SUP-2025-001"
  
  // Links
  emailId: varchar("email_id").notNull().references(() => supportEmails.id),
  categoryId: varchar("category_id").notNull().references(() => supportCategories.id),
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
  
  // Customer info
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name"),
  
  // Ticket details
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("medium"), // 'low', 'medium', 'high', 'urgent'
  status: text("status").notNull().default("open"), // 'open', 'in_progress', 'waiting_customer', 'resolved', 'closed'
  
  // Resolution
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  resolvedByUserId: varchar("resolved_by_user_id").references(() => users.id),
  
  // Metrics
  responseTime: integer("response_time"), // Minutes until first response
  resolutionTime: integer("resolution_time"), // Minutes until resolution
  
  // Tags and notes
  tags: text("tags").array().default([]),
  internalNotes: text("internal_notes"),
  
  // Read status
  isRead: boolean("is_read").notNull().default(false),
  
  // Refund progression tracking
  retentionAttempts: integer("retention_attempts").notNull().default(0), // Counter for retention attempts
  escalationReason: text("escalation_reason"), // Reason for immediate escalation if triggered
  refundOffered: boolean("refund_offered").notNull().default(false), // If refund form was sent
  refundOfferedAt: timestamp("refund_offered_at"), // When refund form was offered
  
  // Order linking
  linkedOrderId: text("linked_order_id").references(() => orders.id), // Linked order ID
  orderMatchConfidence: text("order_match_confidence"), // 'high', 'medium', 'low', 'manual'
  orderMatchMethod: text("order_match_method"), // 'explicit_mention', 'temporal', 'score', 'manual'
  orderLinkedAt: timestamp("order_linked_at"), // When order was linked
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const supportResponses = pgTable("support_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => supportCategories.id),
  
  // Response template
  name: text("name").notNull(), // Template name for admin reference
  subject: text("subject").notNull(), // Email subject template
  textContent: text("text_content").notNull(), // Plain text response
  htmlContent: text("html_content"), // HTML response (optional)
  
  // Template variables
  variables: jsonb("variables"), // Available variables for personalization
  
  // Settings
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false), // Default response for category
  delayMinutes: integer("delay_minutes").default(0), // Delay before sending (0 = immediate)
  
  // Usage tracking
  timesUsed: integer("times_used").default(0),
  lastUsed: timestamp("last_used"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const supportConversations = pgTable("support_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => supportTickets.id),
  
  // Message details
  type: text("type").notNull(), // 'email_in', 'email_out', 'note', 'status_change'
  from: text("from"), // Email address or 'system'
  to: text("to"), // Email address or null for internal notes
  
  // Content
  subject: text("subject"),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").notNull().default(false), // Internal notes vs customer-facing
  
  // Metadata
  messageId: text("message_id"), // If from email
  userId: varchar("user_id").references(() => users.id), // If from user action
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Reimbursement Requests - Customer refund requests linked to tickets
export const reimbursementRequests = pgTable("reimbursement_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => supportTickets.id),
  
  // Customer information (duplicated from ticket for data integrity)
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  
  // Order details
  orderNumber: text("order_number"), // Original order number
  productName: text("product_name"), // Product being refunded
  purchaseDate: timestamp("purchase_date"), // Date of purchase
  
  // Billing address
  billingAddressCountry: text("billing_address_country"),
  billingAddressCity: text("billing_address_city"),
  billingAddressStreet: text("billing_address_street"),
  billingAddressNumber: text("billing_address_number"),
  billingAddressComplement: text("billing_address_complement"),
  billingAddressState: text("billing_address_state"),
  billingAddressZip: text("billing_address_zip"),
  
  // Refund details
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  currency: text("currency").default("EUR"),
  
  // Banking information (IBAN only)
  bankIban: text("bank_iban"), // International Bank Account Number
  controlNumber: text("control_number"), // Número de controlo sem comprovativo de devolução
  
  // Legacy banking fields (kept for backward compatibility)
  bankAccountNumber: text("bank_account_number"),
  bankAccountHolder: text("bank_account_holder"),
  bankName: text("bank_name"),
  pixKey: text("pix_key"), // For Brazilian PIX payments
  
  // Required attachments (URLs from object storage)
  orderProofUrl: text("order_proof_url"), // Comprovativo de encomenda
  productPhotosUrl: text("product_photos_url"), // Fotos dos produtos
  returnProofUrl: text("return_proof_url"), // Comprovante de devolução e pagamento da taxa
  idDocumentUrl: text("id_document_url"), // Documento de identificação com fotografia
  
  // Customer declarations (checkboxes)
  declarationFormCorrect: boolean("declaration_form_correct").default(false),
  declarationAttachmentsProvided: boolean("declaration_attachments_provided").default(false),
  declarationIbanCorrect: boolean("declaration_iban_correct").default(false),
  
  // Reason and details
  refundReason: text("refund_reason").notNull(), // Customer's stated reason
  additionalDetails: text("additional_details"), // Extra context from customer
  
  // Status tracking
  status: text("status").notNull().default("pending"), // 'pending', 'under_review', 'approved', 'rejected', 'completed'
  reviewNotes: text("review_notes"), // Admin internal notes
  reviewedByUserId: varchar("reviewed_by_user_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  
  // Completion
  completedAt: timestamp("completed_at"),
  rejectionReason: text("rejection_reason"), // If rejected, why
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================
// AFFILIATE PROGRAM TABLES
// =============================================

// Affiliate Profiles - Extended profile data for users with 'affiliate' role
export const affiliateProfiles = pgTable("affiliate_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  storeId: varchar("store_id").notNull().references(() => stores.id), // Which store this affiliate belongs to
  
  // Fiscal/Legal data
  fiscalName: text("fiscal_name"), // Legal name or company name
  fiscalId: text("fiscal_id"), // Tax ID / NIF / CPF / CNPJ
  fiscalAddress: text("fiscal_address"),
  fiscalCountry: text("fiscal_country"),
  
  // Banking information for payouts
  bankAccountHolder: text("bank_account_holder"),
  bankIban: text("bank_iban"),
  pixKey: text("pix_key"), // For Brazilian affiliates
  
  // Status and approval
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'suspended', 'rejected'
  approvedByUserId: varchar("approved_by_user_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  suspendedReason: text("suspended_reason"),
  
  // Additional info
  referralCode: text("referral_code").unique(), // Custom referral code for marketing
  bio: text("bio"),
  socialMedia: jsonb("social_media").$type<{
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    website?: string;
  }>(),
  
  // Landing page and tracking
  trackingPixel: text("tracking_pixel"), // Custom tracking pixel code (e.g., Facebook Pixel, Google Analytics)
  landingPageUrl: text("landing_page_url"), // Assigned landing page URL on Vercel
  landingPageId: varchar("landing_page_id"), // Reference to deployed landing page
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    userIdIdx: index().on(table.userId),
    storeIdIdx: index().on(table.storeId),
    statusIdx: index().on(table.status),
  };
});

// Affiliate Memberships - Links affiliates to products/operations they can promote
export const affiliateMemberships = pgTable("affiliate_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliateProfiles.id, { onDelete: 'cascade' }),
  operationId: varchar("operation_id").notNull().references(() => operations.id, { onDelete: 'cascade' }),
  productId: varchar("product_id").references(() => products.id), // Specific product or null for all products in operation
  
  // Status
  status: text("status").notNull().default("pending"), // 'pending', 'active', 'paused', 'terminated'
  
  // Approval
  approvedByUserId: varchar("approved_by_user_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  
  // Terms
  customCommissionPercent: decimal("custom_commission_percent", { precision: 5, scale: 2 }), // Override default rule if set
  notes: text("notes"),
  
  // Short tracking code for referral links (8-10 characters, base62)
  shortCode: varchar("short_code", { length: 12 }).unique(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    affiliateIdIdx: index().on(table.affiliateId),
    operationIdIdx: index().on(table.operationId),
    statusIdx: index().on(table.status),
    shortCodeIdx: index().on(table.shortCode),
  };
});

// Affiliate Commission Rules - Defines commission percentages per product/operation
export const affiliateCommissionRules = pgTable("affiliate_commission_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operationId: varchar("operation_id").notNull().references(() => operations.id, { onDelete: 'cascade' }),
  productId: varchar("product_id").references(() => products.id), // Specific product or null for operation-wide rule
  
  // Commission structure
  commissionPercent: decimal("commission_percent", { precision: 5, scale: 2 }).notNull(), // e.g., 10.50 for 10.5%
  commissionType: text("commission_type").notNull().default("percentage"), // 'percentage', 'fixed_amount'
  fixedAmount: decimal("fixed_amount", { precision: 10, scale: 2 }), // If commission_type is 'fixed_amount'
  
  // Bonus rules
  bonusRules: jsonb("bonus_rules").$type<Array<{
    condition: string; // 'first_sale', 'volume_milestone', 'time_limited'
    threshold?: number;
    bonusPercent?: number;
    bonusAmount?: number;
  }>>(),
  
  // Validity
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").notNull().default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    operationIdIdx: index().on(table.operationId),
    productIdIdx: index().on(table.productId),
    activeIdx: index().on(table.isActive),
  };
});

// Affiliate Conversions - Records of sales generated by affiliates
export const affiliateConversions = pgTable("affiliate_conversions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliateProfiles.id),
  orderId: text("order_id").notNull().references(() => orders.id),
  trackingId: text("tracking_id").notNull(), // From affiliate link token
  
  // Financial details
  orderTotal: decimal("order_total", { precision: 10, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  commissionPercent: decimal("commission_percent", { precision: 5, scale: 2 }),
  currency: text("currency").notNull().default("EUR"),
  
  // Status and approval
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected', 'paid'
  approvedByUserId: varchar("approved_by_user_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  
  // Payout reference
  payoutId: varchar("payout_id").references(() => affiliatePayouts.id),
  
  // Metadata
  conversionSource: text("conversion_source"), // 'checkout_external', 'checkout_vercel', 'manual'
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    affiliateIdIdx: index().on(table.affiliateId),
    orderIdIdx: index().on(table.orderId),
    trackingIdIdx: index().on(table.trackingId),
    statusIdx: index().on(table.status),
  };
});

// Affiliate Payouts - Consolidated payments to affiliates
export const affiliatePayouts = pgTable("affiliate_payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliateProfiles.id),
  
  // Period
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  
  // Financial
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("EUR"),
  conversionsCount: integer("conversions_count").notNull().default(0),
  
  // Payment details
  paymentMethod: text("payment_method"), // 'bank_transfer', 'pix', 'paypal', 'stripe'
  paymentReference: text("payment_reference"), // Transaction ID or reference
  paymentProof: text("payment_proof"), // URL to payment receipt/proof
  
  // Status
  status: text("status").notNull().default("pending"), // 'pending', 'processing', 'paid', 'failed'
  paidByUserId: varchar("paid_by_user_id").references(() => users.id),
  paidAt: timestamp("paid_at"),
  
  // Notes
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    affiliateIdIdx: index().on(table.affiliateId),
    statusIdx: index().on(table.status),
  };
});

// Affiliate Clicks - Tracks clicks on affiliate links
export const affiliateClicks = pgTable("affiliate_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trackingId: text("tracking_id").notNull(), // Decoded from affiliate link
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliateProfiles.id),
  
  // Click metadata
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  referer: text("referer"), // Where they came from
  landingPage: text("landing_page"), // Where they landed
  
  // Geolocation (if available)
  country: text("country"),
  city: text("city"),
  
  // Conversion tracking
  converted: boolean("converted").notNull().default(false),
  conversionId: varchar("conversion_id").references(() => affiliateConversions.id),
  convertedAt: timestamp("converted_at"),
  
  clickedAt: timestamp("clicked_at").notNull().defaultNow(),
}, (table) => {
  return {
    trackingIdIdx: index().on(table.trackingId),
    affiliateIdIdx: index().on(table.affiliateId),
    convertedIdx: index().on(table.converted),
  };
});

// Vercel Deployment Config - Configuration for deploying pages to Vercel
export const vercelDeploymentConfig = pgTable("vercel_deployment_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operationId: varchar("operation_id").notNull().references(() => operations.id, { onDelete: 'cascade' }),
  
  // Vercel credentials
  teamId: text("team_id").notNull(),
  projectId: text("project_id"),
  apiToken: text("api_token").notNull(), // Encrypted in production
  
  // Deployment settings
  domain: text("domain"), // Custom domain for affiliate pages
  allowedDomains: text("allowed_domains").array(), // Additional allowed domains
  
  // Build settings
  framework: text("framework").default("nextjs"), // 'nextjs', 'static', 'react'
  buildCommand: text("build_command"),
  outputDirectory: text("output_directory"),
  
  // Status
  isActive: boolean("is_active").notNull().default(true),
  lastDeploymentAt: timestamp("last_deployment_at"),
  lastDeploymentStatus: text("last_deployment_status"), // 'success', 'failed', 'pending'
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    operationIdIdx: index().on(table.operationId),
    activeIdx: index().on(table.isActive),
  };
});

// Affiliate Landing Pages - Central storage for landing page templates
export const affiliateLandingPages = pgTable("affiliate_landing_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Basic info
  name: text("name").notNull(),
  description: text("description"),
  
  // Content (HTML/CSS/JS) - Legacy format for manual editing
  htmlContent: text("html_content").notNull(),
  cssContent: text("css_content"),
  jsContent: text("js_content"),
  
  // Visual Editor Model (PageModelV2) - For visual editor
  model: jsonb("model").$type<PageModelV2>(), // Structured page model for visual editing
  
  // Preview metadata
  thumbnailUrl: text("thumbnail_url"), // Screenshot/preview image
  tags: text("tags").array(), // For categorization/filtering
  
  // Status
  status: text("status").notNull().default("draft"), // 'draft', 'active', 'archived'
  
  // Vercel deployment info
  vercelProjectId: text("vercel_project_id"), // Vercel project ID after deployment
  vercelDeploymentUrl: text("vercel_deployment_url"), // Base deployment URL
  lastDeployedAt: timestamp("last_deployed_at"),
  
  // Attribution
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    statusIdx: index().on(table.status),
    createdByIdx: index().on(table.createdByUserId),
  };
});

// Affiliate Landing Page - Product relationship (many-to-many)
export const affiliateLandingPageProducts = pgTable("affiliate_landing_page_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  landingPageId: varchar("landing_page_id").notNull().references(() => affiliateLandingPages.id, { onDelete: 'cascade' }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    landingPageIdx: index().on(table.landingPageId),
    productIdx: index().on(table.productId),
    uniqueLandingPageProduct: index().on(table.landingPageId, table.productId),
  };
});

// Affiliate Product Pixels - Structured pixel configuration per product/landing page
export const affiliateProductPixels = pgTable("affiliate_product_pixels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliateProfiles.id, { onDelete: 'cascade' }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  landingPageId: varchar("landing_page_id").references(() => affiliateLandingPages.id, { onDelete: 'cascade' }), // Optional: specific landing page
  
  // Pixel type and configuration
  pixelType: text("pixel_type").notNull(), // 'meta', 'google_ads', 'tiktok', 'custom'
  pixelId: text("pixel_id").notNull(), // Meta Pixel ID, Google Ads ID, etc
  accessToken: text("access_token"), // For Meta Conversions API, etc
  
  // Event configuration
  events: jsonb("events").$type<{
    pageView?: boolean;
    purchase?: boolean;
    lead?: boolean;
    addToCart?: boolean;
    initiateCheckout?: boolean;
    custom?: string[];
  }>().notNull().default(sql`'{"pageView":true,"purchase":true}'::jsonb`),
  
  // Custom code fallback (for backward compatibility)
  customCode: text("custom_code"),
  
  // Status
  isActive: boolean("is_active").notNull().default(true),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    affiliateIdx: index().on(table.affiliateId),
    productIdx: index().on(table.productId),
    landingPageIdx: index().on(table.landingPageId),
    activeIdx: index().on(table.isActive),
    uniqueAffiliateProductLandingPage: index().on(table.affiliateId, table.productId, table.landingPageId),
  };
});

// =============================================
// END AFFILIATE PROGRAM TABLES
// =============================================

// AI training directives for custom prompt enhancement per operation
export const aiDirectives = pgTable("ai_directives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operationId: varchar("operation_id").notNull().references(() => operations.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 50 }).notNull(), // 'store_info', 'product_info', 'response_style', 'custom'
  title: text("title").notNull(),
  content: text("content").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").default(0), // For custom ordering
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    operationIdx: index().on(table.operationId),
    typeIdx: index().on(table.type),
    activeIdx: index().on(table.isActive),
  };
});

export const supportMetrics = pgTable("support_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Time period
  date: text("date").notNull(), // YYYY-MM-DD
  period: text("period").notNull(), // 'daily', 'weekly', 'monthly'
  
  // Volume metrics
  emailsReceived: integer("emails_received").default(0),
  ticketsCreated: integer("tickets_created").default(0),
  ticketsResolved: integer("tickets_resolved").default(0),
  ticketsClosed: integer("tickets_closed").default(0),
  
  // Category breakdown
  categoryBreakdown: jsonb("category_breakdown"), // Count per category
  
  // Response metrics
  avgResponseTimeMinutes: decimal("avg_response_time_minutes", { precision: 10, scale: 2 }).default("0"),
  avgResolutionTimeMinutes: decimal("avg_resolution_time_minutes", { precision: 10, scale: 2 }).default("0"),
  automationRate: decimal("automation_rate", { precision: 5, scale: 2 }).default("0"), // % of automated responses
  
  // Satisfaction (future)
  customerSatisfactionScore: decimal("customer_satisfaction_score", { precision: 3, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// AI training directives for N1 admin support (global, not per-operation)
export const adminSupportDirectives = pgTable("admin_support_directives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 50 }).notNull(), // 'n1_info', 'product_info', 'response_style', 'custom'
  title: text("title").notNull(),
  content: text("content").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").default(0), // For custom ordering
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    typeIdx: index().on(table.type),
    activeIdx: index().on(table.isActive),
  };
});

// ========================================
// CREATIVE INTELLIGENCE ENHANCEMENT TABLES
// ========================================

// Creative Benchmarks - Proprietary benchmarking based on aggregated client data
export const creativeBenchmarks = pgTable("creative_benchmarks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Categorization
  industry: varchar("industry", { length: 100 }).notNull(), // 'ecommerce', 'saas', 'health', etc.
  creativeType: varchar("creative_type", { length: 50 }).notNull(), // 'video', 'image', 'carousel'
  countryCodes: text("country_codes").array().notNull().default(sql`'{}'`),
  
  // Performance benchmarks (aggregated from our client data)
  avgCTR: decimal("avg_ctr", { precision: 8, scale: 4 }).notNull().default("0"),
  avgCPC: decimal("avg_cpc", { precision: 10, scale: 2 }).notNull().default("0"),
  avgCPM: decimal("avg_cpm", { precision: 10, scale: 2 }).notNull().default("0"),
  avgROAS: decimal("avg_roas", { precision: 10, scale: 2 }).notNull().default("0"),
  
  // Percentile distribution
  percentile25: jsonb("percentile_25"),
  percentile50: jsonb("percentile_50"),
  percentile75: jsonb("percentile_75"),
  percentile90: jsonb("percentile_90"),
  
  // Sample size and confidence
  sampleSize: integer("sample_size").notNull(),
  lastUpdated: timestamp("last_updated").notNull(),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }).notNull().default("0"), // 0-100
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    industryTypeIdx: index().on(table.industry, table.creativeType),
    lastUpdatedIdx: index().on(table.lastUpdated),
  };
});

// Creative Edit Plans - Actionable insights with specific edit recommendations
export const creativeEditPlans = pgTable("creative_edit_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creativeId: varchar("creative_id").notNull().references(() => adCreatives.id),
  analysisId: varchar("analysis_id").notNull().references(() => creativeAnalyses.id),
  
  // Plan metadata
  planName: varchar("plan_name", { length: 255 }).notNull(),
  planDescription: text("plan_description"),
  priorityLevel: varchar("priority_level", { length: 20 }).notNull().default("medium"),
  
  // Performance predictions
  estimatedImpact: jsonb("estimated_impact"),
  
  // Action plans
  visualActions: jsonb("visual_actions"),
  audioActions: jsonb("audio_actions"),
  copyActions: jsonb("copy_actions"),
  targetingActions: jsonb("targeting_actions"),
  
  // Implementation guidance
  implementationSteps: jsonb("implementation_steps").$type<Array<{
    stepNumber: number;
    description: string;
    category: string; // 'design', 'copy', 'audio', 'targeting'
    estimatedTime: string;
    toolsNeeded?: string[];
    skillLevel: string; // 'beginner', 'intermediate', 'advanced'
  }>>(),
  
  // Success metrics and testing
  successMetrics: jsonb("success_metrics").$type<{
    primaryKPI: string;
    targetImprovement: number;
    testDuration: string;
    significanceThreshold: number;
    sampleSizeRequired?: number;
  }>(),
  
  // Plan status
  status: text("status").notNull().default("pending"), // 'pending', 'in_progress', 'implemented', 'tested', 'successful', 'failed'
  implementedAt: timestamp("implemented_at"),
  resultsValidatedAt: timestamp("results_validated_at"),
  
  // Actual results tracking
  actualResults: jsonb("actual_results").$type<{
    performance?: { [key: string]: number };
    implementationNotes?: string;
    successAchieved?: boolean;
    learnings?: string[];
  }>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    creativeIdx: index().on(table.creativeId),
    analysisIdx: index().on(table.analysisId),
    statusIdx: index().on(table.status),
    createdAtIdx: index().on(table.createdAt),
  };
});

// Creative Variations - Track relationships and performance of creative variations
export const creativeVariations = pgTable("creative_variations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Relationship tracking
  originalCreativeId: varchar("original_creative_id").notNull().references(() => adCreatives.id),
  variationCreativeId: varchar("variation_creative_id").notNull().references(() => adCreatives.id),
  parentVariationId: varchar("parent_variation_id"), // Self-reference - foreign key constraint added separately
  editPlanId: varchar("edit_plan_id").references(() => creativeEditPlans.id),
  
  // Variation metadata
  variationType: varchar("variation_type", { length: 50 }).notNull(),
  changeDescription: text("change_description"),
  generationMethod: varchar("generation_method", { length: 50 }).notNull().default("manual"),
  generationCost: decimal("generation_cost", { precision: 10, scale: 2 }).default("0"),
  
  // Generation tracking
  generationProvider: varchar("generation_provider", { length: 100 }),
  generationPrompts: jsonb("generation_prompts"),
  generationParameters: jsonb("generation_parameters"),
  
  // Asset information  
  assetUrls: jsonb("asset_urls"),
  assetMetadata: jsonb("asset_metadata"),
  
  // A/B Testing
  testStatus: varchar("test_status", { length: 20 }).notNull().default("pending"),
  testStartDate: timestamp("test_start_date"),
  testEndDate: timestamp("test_end_date"),
  
  // Results and learnings
  testResults: jsonb("test_results"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    originalCreativeIdx: index().on(table.originalCreativeId),
    variationCreativeIdx: index().on(table.variationCreativeId),
    editPlanIdx: index().on(table.editPlanId),
    testStatusIdx: index().on(table.testStatus),
    createdAtIdx: index().on(table.createdAt),
  };
});

// Schema validations
export const insertFacebookBusinessManagerSchema = createInsertSchema(facebookBusinessManagers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSync: true,
});

export const insertFacebookCampaignSchema = createInsertSchema(facebookCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSync: true,
});

export const insertAdAccountSchema = createInsertSchema(adAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSync: true,
});

export const insertAdCreativeSchema = createInsertSchema(adCreatives).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSync: true,
});

export const insertCreativeAnalysisSchema = createInsertSchema(creativeAnalyses).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSync: true,
});

export const insertFacebookAdAccountSchema = createInsertSchema(facebookAdAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSync: true,
});

// Supplier payment schemas
export const insertSupplierPaymentSchema = createInsertSchema(supplierPayments).omit({
  id: true,
  approvedAt: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupplierPaymentItemSchema = createInsertSchema(supplierPaymentItems).omit({
  id: true,
  createdAt: true,
});

// Investment schemas
export const insertInvestmentPoolSchema = createInsertSchema(investmentPools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvestorProfileSchema = createInsertSchema(investorProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  verifiedAt: true,
});

export const insertInvestmentSchema = createInsertSchema(investments).omit({
  id: true,
  firstInvestmentDate: true,
  lastTransactionDate: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvestmentTransactionSchema = createInsertSchema(investmentTransactions).omit({
  id: true,
  processedAt: true,
  createdAt: true,
  updatedAt: true,
});

// Creative Intelligence schemas
export const insertCreativeBenchmarkSchema = createInsertSchema(creativeBenchmarks).omit({
  id: true,
  createdAt: true,
});

export const insertCreativeEditPlanSchema = createInsertSchema(creativeEditPlans).omit({
  id: true,
  implementedAt: true,
  resultsValidatedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCreativeVariationSchema = createInsertSchema(creativeVariations).omit({
  id: true,
  testStartDate: true,
  testEndDate: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPoolPerformanceHistorySchema = createInsertSchema(poolPerformanceHistory).omit({
  id: true,
  createdAt: true,
});

export const insertInvestmentTaxCalculationSchema = createInsertSchema(investmentTaxCalculations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentReceiptSchema = createInsertSchema(paymentReceipts).omit({
  id: true,
  verifiedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaxPaymentScheduleSchema = createInsertSchema(taxPaymentSchedule).omit({
  id: true,
  reminderSentAt: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type FacebookBusinessManager = typeof facebookBusinessManagers.$inferSelect;
export type InsertFacebookBusinessManager = z.infer<typeof insertFacebookBusinessManagerSchema>;

export type AdAccount = typeof adAccounts.$inferSelect;
export type InsertAdAccount = z.infer<typeof insertAdAccountSchema>;

export type AdCreative = typeof adCreatives.$inferSelect;
export type InsertAdCreative = z.infer<typeof insertAdCreativeSchema>;

export type CreativeAnalysis = typeof creativeAnalyses.$inferSelect;
export type InsertCreativeAnalysis = z.infer<typeof insertCreativeAnalysisSchema>;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export type FacebookCampaign = typeof facebookCampaigns.$inferSelect;
export type InsertFacebookCampaign = z.infer<typeof insertFacebookCampaignSchema>;

export type FacebookAdAccount = typeof facebookAdAccounts.$inferSelect;
export type InsertFacebookAdAccount = z.infer<typeof insertFacebookAdAccountSchema>;

// Investment types
export type InvestmentPool = typeof investmentPools.$inferSelect;
export type InsertInvestmentPool = z.infer<typeof insertInvestmentPoolSchema>;

export type InvestorProfile = typeof investorProfiles.$inferSelect;
export type InsertInvestorProfile = z.infer<typeof insertInvestorProfileSchema>;

export type Investment = typeof investments.$inferSelect;
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;

export type InvestmentTransaction = typeof investmentTransactions.$inferSelect;
export type InsertInvestmentTransaction = z.infer<typeof insertInvestmentTransactionSchema>;

export type PoolPerformanceHistory = typeof poolPerformanceHistory.$inferSelect;
export type InsertPoolPerformanceHistory = z.infer<typeof insertPoolPerformanceHistorySchema>;

export type InvestmentTaxCalculation = typeof investmentTaxCalculations.$inferSelect;
export type InsertInvestmentTaxCalculation = z.infer<typeof insertInvestmentTaxCalculationSchema>;

export type PaymentReceipt = typeof paymentReceipts.$inferSelect;
export type InsertPaymentReceipt = z.infer<typeof insertPaymentReceiptSchema>;

export type TaxPaymentSchedule = typeof taxPaymentSchedule.$inferSelect;
export type InsertTaxPaymentSchedule = z.infer<typeof insertTaxPaymentScheduleSchema>;

// Currency History schemas and types
export const insertCurrencyHistorySchema = createInsertSchema(currencyHistory).omit({
  id: true,
  createdAt: true,
});

export const insertCurrencySettingsSchema = createInsertSchema(currencySettings).omit({
  id: true,
  createdAt: true,
});

export type CurrencyHistory = typeof currencyHistory.$inferSelect;
export type InsertCurrencyHistory = z.infer<typeof insertCurrencyHistorySchema>;

export type CurrencySettings = typeof currencySettings.$inferSelect;
export type InsertCurrencySettings = z.infer<typeof insertCurrencySettingsSchema>;

// Support schemas
export const insertSupportCategorySchema = createInsertSchema(supportCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupportEmailSchema = createInsertSchema(supportEmails).omit({
  id: true,
  receivedAt: true,
  processedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  ticketNumber: true,
  resolvedAt: true,
  responseTime: true,
  resolutionTime: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupportResponseSchema = createInsertSchema(supportResponses).omit({
  id: true,
  timesUsed: true,
  lastUsed: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupportConversationSchema = createInsertSchema(supportConversations).omit({
  id: true,
  createdAt: true,
});

export const insertSupportMetricsSchema = createInsertSchema(supportMetrics).omit({
  id: true,
  createdAt: true,
});

// Support types
export type SupportCategory = typeof supportCategories.$inferSelect;
export type InsertSupportCategory = z.infer<typeof insertSupportCategorySchema>;

export type SupportEmail = typeof supportEmails.$inferSelect;
export type InsertSupportEmail = z.infer<typeof insertSupportEmailSchema>;

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;

export type SupportResponse = typeof supportResponses.$inferSelect;
export type InsertSupportResponse = z.infer<typeof insertSupportResponseSchema>;

export type SupportConversation = typeof supportConversations.$inferSelect;
export type InsertSupportConversation = z.infer<typeof insertSupportConversationSchema>;

export type SupportMetrics = typeof supportMetrics.$inferSelect;
export type InsertSupportMetrics = z.infer<typeof insertSupportMetricsSchema>;

// Reimbursement Requests Schema and Types
export const insertReimbursementRequestSchema = createInsertSchema(reimbursementRequests).omit({
  id: true,
  reviewedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type ReimbursementRequest = typeof reimbursementRequests.$inferSelect;
export type InsertReimbursementRequest = z.infer<typeof insertReimbursementRequestSchema>;

// =============================================
// AFFILIATE PROGRAM SCHEMAS AND TYPES
// =============================================

// Affiliate Profiles
export const insertAffiliateProfileSchema = createInsertSchema(affiliateProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AffiliateProfile = typeof affiliateProfiles.$inferSelect;
export type InsertAffiliateProfile = z.infer<typeof insertAffiliateProfileSchema>;

// Affiliate Memberships
export const insertAffiliateMembershipSchema = createInsertSchema(affiliateMemberships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AffiliateMembership = typeof affiliateMemberships.$inferSelect;
export type InsertAffiliateMembership = z.infer<typeof insertAffiliateMembershipSchema>;

// Affiliate Commission Rules
export const insertAffiliateCommissionRuleSchema = createInsertSchema(affiliateCommissionRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AffiliateCommissionRule = typeof affiliateCommissionRules.$inferSelect;
export type InsertAffiliateCommissionRule = z.infer<typeof insertAffiliateCommissionRuleSchema>;

// Affiliate Conversions
export const insertAffiliateConversionSchema = createInsertSchema(affiliateConversions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AffiliateConversion = typeof affiliateConversions.$inferSelect;
export type InsertAffiliateConversion = z.infer<typeof insertAffiliateConversionSchema>;

// Affiliate Payouts
export const insertAffiliatePayoutSchema = createInsertSchema(affiliatePayouts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AffiliatePayout = typeof affiliatePayouts.$inferSelect;
export type InsertAffiliatePayout = z.infer<typeof insertAffiliatePayoutSchema>;

// Affiliate Clicks
export const insertAffiliateClickSchema = createInsertSchema(affiliateClicks).omit({
  id: true,
});

export type AffiliateClick = typeof affiliateClicks.$inferSelect;
export type InsertAffiliateClick = z.infer<typeof insertAffiliateClickSchema>;

// Vercel Deployment Config
export const insertVercelDeploymentConfigSchema = createInsertSchema(vercelDeploymentConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type VercelDeploymentConfig = typeof vercelDeploymentConfig.$inferSelect;
export type InsertVercelDeploymentConfig = z.infer<typeof insertVercelDeploymentConfigSchema>;

// Affiliate Landing Pages
export const insertAffiliateLandingPageSchema = createInsertSchema(affiliateLandingPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AffiliateLandingPage = typeof affiliateLandingPages.$inferSelect;
export type InsertAffiliateLandingPage = z.infer<typeof insertAffiliateLandingPageSchema>;

// Affiliate Landing Page Products Schema
export const insertAffiliateLandingPageProductSchema = createInsertSchema(affiliateLandingPageProducts).omit({
  id: true,
  createdAt: true,
});

export type AffiliateLandingPageProduct = typeof affiliateLandingPageProducts.$inferSelect;
export type InsertAffiliateLandingPageProduct = z.infer<typeof insertAffiliateLandingPageProductSchema>;

// Affiliate Product Pixels Schema
export const insertAffiliateProductPixelSchema = createInsertSchema(affiliateProductPixels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AffiliateProductPixel = typeof affiliateProductPixels.$inferSelect;
export type InsertAffiliateProductPixel = z.infer<typeof insertAffiliateProductPixelSchema>;

// =============================================
// END AFFILIATE PROGRAM SCHEMAS AND TYPES
// =============================================

// Public refund form schema (customer-facing, no admin fields)
export const publicRefundFormSchema = z.object({
  // Customer information
  customerName: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  customerEmail: z.string().email("Email inválido"),
  customerPhone: z.string().optional(),
  
  // Order details
  orderNumber: z.string().min(1, "Número do pedido é obrigatório"),
  productName: z.string().optional(),
  purchaseDate: z.string().min(1, "Data da compra é obrigatória"), // Will be converted to date in backend
  
  // Billing address
  billingAddressCountry: z.string().min(1, "País é obrigatório"),
  billingAddressCity: z.string().min(1, "Cidade é obrigatória"),
  billingAddressStreet: z.string().min(1, "Rua é obrigatória"),
  billingAddressNumber: z.string().min(1, "Número é obrigatório"),
  billingAddressComplement: z.string().optional(),
  billingAddressState: z.string().min(1, "Estado/Região é obrigatório"),
  billingAddressZip: z.string().min(1, "Código postal é obrigatório"),
  
  // Refund details
  refundAmount: z.string().optional(),
  currency: z.string().default("EUR"),
  
  // Banking information (IBAN only)
  bankIban: z.string()
    .min(15, "IBAN deve ter no mínimo 15 caracteres")
    .regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/, "IBAN inválido - deve começar com 2 letras do país e 2 números"),
  controlNumber: z.string().min(1, "Número de controlo é obrigatório"),
  
  // Reason and details
  refundReason: z.string().min(10, "Motivo deve ter no mínimo 10 caracteres"),
  additionalDetails: z.string().optional(),
  
  // Customer declarations (checkboxes) - all required
  declarationFormCorrect: z.boolean().refine(val => val === true, {
    message: "Você deve confirmar que leu e preencheu corretamente o formulário"
  }),
  declarationAttachmentsProvided: z.boolean().refine(val => val === true, {
    message: "Você deve confirmar que anexou fotos dos produtos e comprovante de devolução"
  }),
  declarationIbanCorrect: z.boolean().refine(val => val === true, {
    message: "Você deve confirmar que informou o IBAN corretamente"
  }),
  
  // File attachments - handled separately in multipart form (not in this schema)
  // orderProofFile, productPhotosFile, returnProofFile, idDocumentFile
});

export type PublicRefundForm = z.infer<typeof publicRefundFormSchema>;

// Admin Support Directives Schema and Types
export const insertAdminSupportDirectiveSchema = createInsertSchema(adminSupportDirectives).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AdminSupportDirective = typeof adminSupportDirectives.$inferSelect;
export type InsertAdminSupportDirective = z.infer<typeof insertAdminSupportDirectiveSchema>;

// AI Directives Schema and Types
export const insertAiDirectiveSchema = createInsertSchema(aiDirectives).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AiDirective = typeof aiDirectives.$inferSelect;
export type InsertAiDirective = z.infer<typeof insertAiDirectiveSchema>;

// ============================================================================
// CUSTOMER SUPPORT TABLES (Multi-tenant for Operations)
// ============================================================================

export const customerSupportOperations = pgTable("customer_support_operations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operationId: varchar("operation_id").notNull().references(() => operations.id, { onDelete: 'cascade' }),
  operationName: varchar("operation_name"),
  
  // Email configuration
  emailDomain: varchar("email_domain"), // suporte@loja.com
  emailPrefix: varchar("email_prefix").default("suporte"), // Email prefix (e.g., "suporte", "atendimento")
  isCustomDomain: boolean("is_custom_domain").default(false),
  mailgunDomainName: varchar("mailgun_domain_name"), // Mailgun domain name
  mailgunApiKey: varchar("mailgun_api_key"), // Operation-specific Mailgun key
  domainVerified: boolean("domain_verified").default(false),
  
  // AI Configuration
  aiEnabled: boolean("ai_enabled").default(true),
  aiCategories: jsonb("ai_categories"), // Categories that AI can handle
  
  // Branding
  brandingConfig: jsonb("branding_config"), // Logo, colors, signature
  emailTemplateId: varchar("email_template_id"),
  
  // Business settings
  businessHours: jsonb("business_hours"),
  timezone: varchar("timezone").default("America/Sao_Paulo"),
  
  // Status
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    uniqueOperation: unique().on(table.operationId),
    emailDomainIdx: index().on(table.emailDomain),
  };
});

export const customerSupportCategories = pgTable("customer_support_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operationId: varchar("operation_id").notNull().references(() => customerSupportOperations.operationId, { onDelete: 'cascade' }),
  
  name: text("name").notNull(), // 'duvidas', 'alteracao_endereco', 'cancelamento', etc.
  displayName: text("display_name").notNull(), // 'Dúvidas', 'Alteração de Endereço', etc.
  description: text("description"),
  
  // AI settings
  isAutomated: boolean("is_automated").default(false),
  aiEnabled: boolean("ai_enabled").default(false),
  defaultResponse: text("default_response"),
  
  // UI settings
  priority: integer("priority").default(0),
  color: text("color").default("#6b7280"),
  
  // Status
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    operationCategoryIdx: index().on(table.operationId, table.name),
    uniqueOperationCategory: unique().on(table.operationId, table.name),
  };
});

export const customerSupportTickets = pgTable("customer_support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operationId: varchar("operation_id").notNull().references(() => customerSupportOperations.operationId, { onDelete: 'cascade' }),
  ticketNumber: text("ticket_number").notNull(),
  
  // Customer info
  customerEmail: varchar("customer_email").notNull(),
  customerName: varchar("customer_name"),
  
  // Ticket details
  subject: varchar("subject").notNull(),
  status: varchar("status").notNull().default("open"), // 'open', 'pending', 'resolved', 'closed'
  priority: varchar("priority").default("medium"), // 'low', 'medium', 'high', 'urgent'
  
  // Classification
  categoryId: varchar("category_id").references(() => customerSupportCategories.id),
  categoryName: varchar("category_name"), // Cache for quick filtering
  
  // Assignment
  assignedAgentId: varchar("assigned_agent_id").references(() => users.id),
  assignedAgentName: varchar("assigned_agent_name"), // Cache
  
  // AI processing
  isAutomated: boolean("is_automated").default(false),
  requiresHuman: boolean("requires_human").default(false),
  aiConfidence: integer("ai_confidence"), // 0-100
  aiReasoning: text("ai_reasoning"),
  
  // Email tracking
  originalEmailId: varchar("original_email_id"),
  threadId: varchar("thread_id"), // For email threading
  
  // Resolution
  resolvedAt: timestamp("resolved_at"),
  resolutionTime: integer("resolution_time_minutes"),
  customerSatisfaction: integer("customer_satisfaction"), // 1-5
  
  // Tags and metadata
  tags: jsonb("tags"),
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastActivity: timestamp("last_activity").defaultNow(),
}, (table) => {
  return {
    operationIdx: index().on(table.operationId),
    customerEmailIdx: index().on(table.customerEmail),
    statusIdx: index().on(table.status),
    assignedIdx: index().on(table.assignedAgentId),
    createdAtIdx: index().on(table.createdAt),
    uniqueTicketNumber: unique().on(table.operationId, table.ticketNumber),
  };
});

export const customerSupportMessages = pgTable("customer_support_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operationId: varchar("operation_id").notNull().references(() => customerSupportOperations.operationId, { onDelete: 'cascade' }),
  ticketId: varchar("ticket_id").notNull().references(() => customerSupportTickets.id, { onDelete: 'cascade' }),
  
  // Sender info
  sender: varchar("sender").notNull(), // 'customer', 'agent', 'ai', 'system'
  senderName: varchar("sender_name"),
  senderEmail: varchar("sender_email"),
  senderUserId: varchar("sender_user_id").references(() => users.id),
  
  // Message content
  subject: varchar("subject"),
  content: text("content").notNull(),
  htmlContent: text("html_content"),
  
  // Message type
  messageType: varchar("message_type").default("email"), // 'email', 'internal_note', 'system'
  isInternal: boolean("is_internal").default(false),
  isPublic: boolean("is_public").default(true),
  
  // AI info
  isAiGenerated: boolean("is_ai_generated").default(false),
  aiModel: varchar("ai_model"), // 'gpt-4', etc.
  aiPromptUsed: text("ai_prompt_used"),
  
  // Email tracking
  emailMessageId: varchar("email_message_id"),
  emailInReplyTo: varchar("email_in_reply_to"),
  emailReferences: text("email_references"),
  
  // Attachments
  attachments: jsonb("attachments"),
  
  // Tracking
  sentViaEmail: boolean("sent_via_email").default(false),
  emailSentAt: timestamp("email_sent_at"),
  emailDelivered: boolean("email_delivered").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    ticketIdx: index().on(table.ticketId),
    operationIdx: index().on(table.operationId),
    senderIdx: index().on(table.sender),
    createdAtIdx: index().on(table.createdAt),
    emailMessageIdIdx: index().on(table.emailMessageId),
  };
});

export const customerSupportEmails = pgTable("customer_support_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operationId: varchar("operation_id").notNull().references(() => customerSupportOperations.operationId, { onDelete: 'cascade' }),
  
  // Email identifiers
  messageId: text("message_id").notNull(),
  threadId: varchar("thread_id"),
  
  // Email details
  fromEmail: varchar("from_email").notNull(),
  fromName: varchar("from_name"),
  toEmail: varchar("to_email").notNull(),
  ccEmails: jsonb("cc_emails"),
  bccEmails: jsonb("bcc_emails"),
  
  subject: varchar("subject").notNull(),
  textContent: text("text_content"),
  htmlContent: text("html_content"),
  
  // Processing
  status: varchar("status").default("received"), // 'received', 'processing', 'processed', 'failed'
  ticketId: varchar("ticket_id").references(() => customerSupportTickets.id),
  
  // Categorization
  categoryId: varchar("category_id").references(() => customerSupportCategories.id),
  aiConfidence: integer("ai_confidence"),
  aiReasoning: text("ai_reasoning"),
  
  // Flags
  isSpam: boolean("is_spam").default(false),
  isAutoReply: boolean("is_auto_reply").default(false),
  requiresHuman: boolean("requires_human").default(false),
  hasAutoResponse: boolean("has_auto_response").default(false),
  
  // Metadata
  attachments: jsonb("attachments"),
  headers: jsonb("headers"),
  rawData: jsonb("raw_data"),
  
  // Processing timestamps
  receivedAt: timestamp("received_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    operationIdx: index().on(table.operationId),
    messageIdIdx: index().on(table.messageId),
    ticketIdx: index().on(table.ticketId),
    statusIdx: index().on(table.status),
    receivedAtIdx: index().on(table.receivedAt),
    uniqueOperationMessage: unique().on(table.operationId, table.messageId),
  };
});

// Customer Support Insert Schemas
export const insertCustomerSupportOperationSchema = createInsertSchema(customerSupportOperations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerSupportCategorySchema = createInsertSchema(customerSupportCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerSupportTicketSchema = createInsertSchema(customerSupportTickets).omit({
  id: true,
  ticketNumber: true,
  resolvedAt: true,
  resolutionTime: true,
  createdAt: true,
  updatedAt: true,
  lastActivity: true,
});

export const insertCustomerSupportMessageSchema = createInsertSchema(customerSupportMessages).omit({
  id: true,
  emailSentAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerSupportEmailSchema = createInsertSchema(customerSupportEmails).omit({
  id: true,
  receivedAt: true,
  processedAt: true,
  createdAt: true,
  updatedAt: true,
});

// Customer Support Types
export type CustomerSupportOperation = typeof customerSupportOperations.$inferSelect;
export type InsertCustomerSupportOperation = z.infer<typeof insertCustomerSupportOperationSchema>;

export type CustomerSupportCategory = typeof customerSupportCategories.$inferSelect;
export type InsertCustomerSupportCategory = z.infer<typeof insertCustomerSupportCategorySchema>;

export type CustomerSupportTicket = typeof customerSupportTickets.$inferSelect;
export type InsertCustomerSupportTicket = z.infer<typeof insertCustomerSupportTicketSchema>;

export type CustomerSupportMessage = typeof customerSupportMessages.$inferSelect;
export type InsertCustomerSupportMessage = z.infer<typeof insertCustomerSupportMessageSchema>;

export type CustomerSupportEmail = typeof customerSupportEmails.$inferSelect;
export type InsertCustomerSupportEmail = z.infer<typeof insertCustomerSupportEmailSchema>;

// Voice Support System Tables
export const voiceSettings = pgTable("voice_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operationId: varchar("operation_id").notNull().references(() => operations.id, { onDelete: 'cascade' }),
  
  // Basic settings
  isActive: boolean("is_active").notNull().default(false),
  telnyxPhoneNumber: text("telnyx_phone_number"), // Associated Telnyx phone number
  
  // Operating hours
  operatingHours: jsonb("operating_hours").$type<{
    monday: { enabled: boolean; start: string; end: string };
    tuesday: { enabled: boolean; start: string; end: string };
    wednesday: { enabled: boolean; start: string; end: string };
    thursday: { enabled: boolean; start: string; end: string };
    friday: { enabled: boolean; start: string; end: string };
    saturday: { enabled: boolean; start: string; end: string };
    sunday: { enabled: boolean; start: string; end: string };
    timezone: string;
  }>().default({
    monday: { enabled: true, start: "09:00", end: "18:00" },
    tuesday: { enabled: true, start: "09:00", end: "18:00" },
    wednesday: { enabled: true, start: "09:00", end: "18:00" },
    thursday: { enabled: true, start: "09:00", end: "18:00" },
    friday: { enabled: true, start: "09:00", end: "18:00" },
    saturday: { enabled: false, start: "09:00", end: "18:00" },
    sunday: { enabled: false, start: "09:00", end: "18:00" },
    timezone: "Europe/Madrid"
  }),
  
  // Voice AI settings
  voiceModel: text("voice_model").default("alloy"), // OpenAI voice model
  language: text("language").default("pt"), // Primary language
  maxCallDuration: integer("max_call_duration").default(600), // Max call duration in seconds
  
  // Call routing
  fallbackToHuman: boolean("fallback_to_human").default(true), // Transfer to human if needed
  humanFallbackNumber: text("human_fallback_number"), // Phone number for human fallback
  
  // Out of hours settings
  outOfHoursMessage: text("out_of_hours_message").default("Nosso horário de atendimento é de segunda a sexta, das 9h às 18h. Deixe sua mensagem que retornaremos em breve."),
  outOfHoursAction: text("out_of_hours_action").default("voicemail"), // 'voicemail', 'hangup', 'redirect'
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const voiceCalls = pgTable("voice_calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operationId: varchar("operation_id").notNull().references(() => operations.id),
  
  // Telnyx call data
  telnyxCallControlId: text("telnyx_call_control_id").notNull().unique(),
  telnyxCallLegId: text("telnyx_call_leg_id"),
  
  // Call details
  direction: text("direction").notNull(), // 'inbound', 'outbound'
  fromNumber: text("from_number").notNull(),
  toNumber: text("to_number").notNull(),
  status: text("status").notNull(), // 'queued', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer'
  
  // Legacy Twilio compatibility - required for database constraint
  twilioCallSid: text("twilio_call_sid").notNull(),
  twilioAccountSid: text("twilio_account_sid"),
  
  // Customer information
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"), // Normalized phone number
  
  // Call metrics
  duration: integer("duration"), // Call duration in seconds
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  
  // AI conversation data
  aiResponseGenerated: boolean("ai_response_generated").default(false),
  conversationSummary: text("conversation_summary"), // AI-generated summary
  detectedIntent: text("detected_intent"), // What the customer wanted
  satisfactionLevel: text("satisfaction_level"), // 'satisfied', 'neutral', 'unsatisfied'
  
  // Integration with support system
  relatedTicketId: varchar("related_ticket_id").references(() => supportTickets.id), // Link to support ticket if created
  categoryId: varchar("category_id").references(() => supportCategories.id), // Categorized call
  
  // Call recording and transcription
  recordingUrl: text("recording_url"), // Telnyx recording URL
  transcription: text("transcription"), // Full call transcription
  
  // Metadata
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"), // Additional call data from Telnyx
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const voiceConversations = pgTable("voice_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").notNull().references(() => voiceCalls.id, { onDelete: 'cascade' }),
  
  // Message details
  type: text("type").notNull(), // 'customer_speech', 'ai_response', 'system_message'
  speaker: text("speaker").notNull(), // 'customer', 'ai', 'system'
  
  // Content
  content: text("content").notNull(), // Transcribed or AI response text
  audioUrl: text("audio_url"), // URL to audio segment if available
  
  // Timing
  timestamp: timestamp("timestamp").notNull(), // When in the call this occurred
  duration: integer("duration"), // Duration of this segment in milliseconds
  
  // AI processing
  confidence: decimal("confidence", { precision: 5, scale: 4 }), // Speech recognition confidence
  sentiment: text("sentiment"), // 'positive', 'neutral', 'negative'
  emotion: text("emotion"), // Detected emotion
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas for voice tables
export const insertVoiceSettingsSchema = createInsertSchema(voiceSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVoiceCallSchema = createInsertSchema(voiceCalls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVoiceConversationSchema = createInsertSchema(voiceConversations).omit({
  id: true,
  createdAt: true,
});

// Voice Types
export type VoiceSettings = typeof voiceSettings.$inferSelect;
export type InsertVoiceSettings = z.infer<typeof insertVoiceSettingsSchema>;

export type VoiceCall = typeof voiceCalls.$inferSelect;
export type InsertVoiceCall = z.infer<typeof insertVoiceCallSchema>;

export type VoiceConversation = typeof voiceConversations.$inferSelect;
export type InsertVoiceConversation = z.infer<typeof insertVoiceConversationSchema>;

// Creative Intelligence Types
export type CreativeBenchmark = typeof creativeBenchmarks.$inferSelect;
export type InsertCreativeBenchmark = z.infer<typeof insertCreativeBenchmarkSchema>;

export type CreativeEditPlan = typeof creativeEditPlans.$inferSelect;
export type InsertCreativeEditPlan = z.infer<typeof insertCreativeEditPlanSchema>;

export type CreativeVariation = typeof creativeVariations.$inferSelect;
export type InsertCreativeVariation = z.infer<typeof insertCreativeVariationSchema>;

// ========================================
// Creative Intelligence Relations
// ========================================

// Creative Intelligence Relations
export const creativeBenchmarksRelations = relations(creativeBenchmarks, ({ one }) => ({
  // Note: creativeBenchmarks don't reference specific operations as they are industry-wide
}));

export const creativeEditPlansRelations = relations(creativeEditPlans, ({ one, many }) => ({
  creative: one(adCreatives, {
    fields: [creativeEditPlans.creativeId],
    references: [adCreatives.id],
  }),
  analysis: one(creativeAnalyses, {
    fields: [creativeEditPlans.analysisId],
    references: [creativeAnalyses.id],
  }),
  variations: many(creativeVariations),
}));

export const creativeVariationsRelations = relations(creativeVariations, ({ one }) => ({
  originalCreative: one(adCreatives, {
    fields: [creativeVariations.originalCreativeId],
    references: [adCreatives.id],
    relationName: "original_creative",
  }),
  variationCreative: one(adCreatives, {
    fields: [creativeVariations.variationCreativeId],
    references: [adCreatives.id],
    relationName: "variation_creative",
  }),
  editPlan: one(creativeEditPlans, {
    fields: [creativeVariations.editPlanId],
    references: [creativeEditPlans.id],
  }),
  parentVariation: one(creativeVariations, {
    fields: [creativeVariations.parentVariationId],
    references: [creativeVariations.id],
    relationName: "parent_variation",
  }),
}));

// Update existing adCreatives relations to include edit plans and variations
export const adCreativesRelations = relations(adCreatives, ({ one, many }) => ({
  operation: one(operations, {
    fields: [adCreatives.operationId],
    references: [operations.id],
  }),
  analyses: many(creativeAnalyses),
  editPlans: many(creativeEditPlans),
  originalVariations: many(creativeVariations, {
    relationName: "original_creative",
  }),
  variations: many(creativeVariations, {
    relationName: "variation_creative",
  }),
}));

export const creativeAnalysesRelations = relations(creativeAnalyses, ({ one, many }) => ({
  operation: one(operations, {
    fields: [creativeAnalyses.operationId],
    references: [operations.id],
  }),
  creative: one(adCreatives, {
    fields: [creativeAnalyses.creativeId],
    references: [adCreatives.id],
  }),
  editPlans: many(creativeEditPlans),
}));

// ========================================
// Scene-by-Scene Technical Analysis Types
// ========================================

// Object detected in a scene with precision details
export interface SceneObject {
  label: string;
  count: number;
  confidence?: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Text elements found in a scene
export interface SceneText {
  content: string;
  position?: 'top' | 'center' | 'bottom' | 'overlay';
  fontSize?: 'small' | 'medium' | 'large';
  fontStyle?: string;
  color?: string;
}

// Camera and visual composition details
export interface SceneComposition {
  shotType: 'extreme-close-up' | 'close-up' | 'medium' | 'wide' | 'extreme-wide' | 'over-shoulder';
  cameraMovement: 'static' | 'pan' | 'tilt' | 'zoom-in' | 'zoom-out' | 'dolly' | 'handheld';
  cameraAngle: 'eye-level' | 'high-angle' | 'low-angle' | 'dutch-angle';
  lighting: 'natural' | 'artificial' | 'mixed' | 'dramatic' | 'soft' | 'harsh';
  depth: 'shallow' | 'deep' | 'medium';
}

// Transition details between scenes
export interface SceneTransition {
  type: 'cut' | 'fade' | 'dissolve' | 'wipe' | 'zoom' | 'morph';
  duration: number; // in seconds
  effect?: string; // Additional effect description
}

// Audio characteristics for this scene
export interface SceneAudio {
  transcriptSnippet: string;
  voicePresent: boolean;
  voiceStyle?: 'professional' | 'casual' | 'emotional' | 'energetic' | 'calm';
  musicDetected: boolean;
  musicType?: 'instrumental' | 'vocal' | 'electronic' | 'ambient' | 'upbeat';
  soundEffects?: string[];
  audioQuality: number; // 1-10 scale
  volume: 'quiet' | 'normal' | 'loud';
  ctas?: string[]; // Call-to-actions detected in audio
}

// Complete scene description with technical analysis
export interface SceneDescription {
  id: number;
  startSec: number;
  endSec: number;
  durationSec: number;
  
  // Technical visual description
  technicalDescription: string; // Detailed technical description like Google Vision
  
  // Visual elements breakdown
  objects: SceneObject[];
  text: SceneText[];
  peopleCount: number;
  dominantColors: string[]; // Hex color codes
  brandElements: string[]; // Logos, brand colors, etc.
  
  // Composition and cinematography
  composition: SceneComposition;
  
  // Scene transitions
  transitionIn?: SceneTransition;
  transitionOut?: SceneTransition;
  
  // Motion and dynamics
  motionIntensity: number; // 1-10 scale
  visualComplexity: number; // 1-10 scale
  
  // Audio synchronized to this scene
  audio: SceneAudio;
  
  // Quality and engagement scores
  visualScore: number; // 1-10 technical quality
  engagementScore: number; // 1-10 predicted engagement
  syncQuality: number; // 1-10 audio-visual synchronization
  
  // Keyframes representing this scene
  keyframes: Array<{
    timestamp: number;
    url: string;
    description: string;
  }>;
}

// Complete timeline analysis result
export interface SceneTimeline {
  scenes: SceneDescription[];
  totalDuration: number;
  overallScore: number;
  overallSummary: string;
  
  // Aggregated insights
  totalObjects: SceneObject[];
  allTextContent: string[];
  dominantColorPalette: string[];
  averageSceneLength: number;
  
  // Quality metrics
  technicalQuality: number; // 1-10
  narrativeFlow: number; // 1-10
  audioVisualSync: number; // 1-10
  brandConsistency: number; // 1-10
  
  // Actionable insights
  keyStrengths: string[];
  improvements: string[];
  recommendations: string[];
  
  // Processing metadata
  analysisVersion: string;
  processingTime: number; // milliseconds
  totalCost: number;
}

// ========================================
// N1 Hub - Marketplace & Announcements
// ========================================

// Marketplace products offered by N1
export const marketplaceProducts = pgTable("marketplace_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  baseCost: decimal("base_cost", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("EUR"),
  images: jsonb("images").$type<string[]>().default([]),
  category: text("category").notNull(),
  tags: text("tags").array(),
  supplier: text("supplier").notNull(),
  status: text("status").notNull().default("active"), // 'active' | 'hidden'
  specs: jsonb("specs").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// Links products from marketplace to client operations
export const productOperationLinks = pgTable("product_operation_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operationId: varchar("operation_id").notNull().references(() => operations.id),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  marketplaceProductId: varchar("marketplace_product_id").notNull().references(() => marketplaceProducts.id),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("EUR"),
  sku: text("sku"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Global announcements from N1 to clients
export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(), // Brief description for cards
  content: text("content").notNull(),
  type: text("type").notNull().default("update"), // 'update' | 'tip' | 'maintenance' | 'promo'
  imageUrl: text("image_url"), // Image for the announcement
  publishedAt: timestamp("published_at").defaultNow(),
  isPinned: boolean("is_pinned").default(false),
  audience: text("audience").notNull().default("all"), // 'all' | 'role' | 'operation'
  roleTarget: text("role_target"), // Target role if audience is 'role'
  operationId: varchar("operation_id").references(() => operations.id), // Target operation if audience is 'operation'
  ctaLabel: text("cta_label"), // Call-to-action button text
  ctaUrl: text("cta_url"), // Call-to-action URL
  status: text("status").notNull().default("published"), // 'published' | 'draft'
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas for N1 Hub entities
export const insertMarketplaceProductSchema = createInsertSchema(marketplaceProducts).omit({
  id: true,
  createdAt: true,
});

export const insertProductOperationLinkSchema = createInsertSchema(productOperationLinks).omit({
  id: true,
  createdAt: true,
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
  publishedAt: true,
});

// Types for N1 Hub entities
export type MarketplaceProduct = typeof marketplaceProducts.$inferSelect;
export type InsertMarketplaceProduct = z.infer<typeof insertMarketplaceProductSchema>;

export type ProductOperationLink = typeof productOperationLinks.$inferSelect;
export type InsertProductOperationLink = z.infer<typeof insertProductOperationLinkSchema>;

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;

// ========================================
// Sales Funnels - AI Landing Page Builder
// ========================================

// Vercel integrations per operation
export const funnelIntegrations = pgTable("funnel_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operationId: varchar("operation_id").notNull().references(() => operations.id),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  
  // Vercel OAuth credentials
  vercelAccessToken: text("vercel_access_token").notNull(), // OAuth access token
  vercelTeamId: text("vercel_team_id"), // Team ID if using teams
  vercelUserId: text("vercel_user_id").notNull(), // User ID from Vercel
  
  // Connection metadata  
  connectedAt: timestamp("connected_at").defaultNow(),
  lastUsed: timestamp("last_used"),
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Funnel templates for different use cases
export const funnelTemplates = pgTable("funnel_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // 'ecommerce', 'lead_gen', 'webinar', 'app', 'service'
  
  // Template configuration
  templateConfig: jsonb("template_config").$type<{
    sections: string[]; // 'hero', 'benefits', 'testimonials', 'pricing', 'faq', 'cta'
    colorScheme: string; // 'modern', 'vibrant', 'minimal', 'dark'
    layout: string; // 'single_page', 'multi_section', 'video_first'
    conversionGoal: string; // 'purchase', 'email', 'phone', 'appointment'
  }>(),
  
  // AI prompts for content generation
  aiPrompts: jsonb("ai_prompts").$type<{
    heroPrompt: string;
    benefitsPrompt: string;
    testimonialsPrompt: string;
    ctaPrompt: string;
    faqPrompt: string;
  }>(),
  
  // Preview settings
  previewImage: text("preview_image"), // Template screenshot
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Sales funnels created by users
export const funnels = pgTable("funnels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operationId: varchar("operation_id").notNull().references(() => operations.id),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  
  // Basic info
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("ecommerce"), // 'ecommerce', 'nutraceutico', 'infoproduto'
  language: text("language").notNull().default("pt-BR"), // 'pt-BR', 'en-US', 'es-ES'
  currency: text("currency").notNull().default("EUR"), // 'EUR', 'USD', 'BRL'
  
  // Template and AI settings
  templateId: varchar("template_id").references(() => funnelTemplates.id),
  
  // Product/service info for AI generation
  productInfo: jsonb("product_info").$type<{
    name: string;
    description: string;
    price: number;
    currency: string;
    targetAudience: string;
    mainBenefits: string[];
    objections: string[];
    testimonials?: string[];
  }>(),
  
  // AI generated content
  generatedContent: jsonb("generated_content").$type<{
    hero: { title: string; subtitle: string; cta: string; };
    benefits: Array<{ title: string; description: string; icon?: string; }>;
    testimonials: Array<{ name: string; text: string; rating?: number; }>;
    faq: Array<{ question: string; answer: string; }>;
    cta: { title: string; subtitle: string; buttonText: string; };
  }>(),
  
  // Tracking and analytics
  trackingConfig: jsonb("tracking_config").$type<{
    facebookPixelId?: string;
    googleAnalyticsId?: string;
    googleTagManagerId?: string;
    tiktokPixelId?: string;
    customTracking?: Array<{ name: string; code: string; }>;
  }>(),
  
  // Status and metadata
  status: text("status").notNull().default("draft"), // 'draft', 'generating', 'ready', 'deployed', 'error'
  isActive: boolean("is_active").default(true),
  
  // Generation metadata
  aiCost: decimal("ai_cost", { precision: 8, scale: 4 }).default("0"), // Cost of AI generation
  generatedAt: timestamp("generated_at"),
  lastRegeneratedAt: timestamp("last_regenerated_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vercel deployment history
export const funnelDeployments = pgTable("funnel_deployments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  funnelId: varchar("funnel_id").notNull().references(() => funnels.id),
  
  // Vercel project info
  vercelProjectId: text("vercel_project_id").notNull(),
  vercelProjectName: text("vercel_project_name").notNull(),
  vercelDeploymentId: text("vercel_deployment_id").notNull(),
  vercelUrl: text("vercel_url").notNull(), // Generated Vercel URL
  
  // Custom domain (if configured)
  customDomain: text("custom_domain"),
  customDomainStatus: text("custom_domain_status"), // 'pending', 'active', 'error'
  
  // Deployment status
  status: text("status").notNull(), // 'building', 'ready', 'error', 'canceled'
  deploymentUrl: text("deployment_url").notNull(), // Final URL to access funnel
  
  // SSL and performance
  sslEnabled: boolean("ssl_enabled").default(true),
  performanceScore: integer("performance_score"), // Lighthouse score if available
  
  // Deployment metadata
  buildTime: integer("build_time"), // Build time in seconds
  deployedAt: timestamp("deployed_at"),
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Analytics for funnel performance
export const funnelAnalytics = pgTable("funnel_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  funnelId: varchar("funnel_id").notNull().references(() => funnels.id),
  deploymentId: varchar("deployment_id").references(() => funnelDeployments.id),
  
  // Time period
  date: text("date").notNull(), // YYYY-MM-DD
  period: text("period").notNull().default("daily"), // 'daily', 'weekly', 'monthly'
  
  // Traffic metrics
  visits: integer("visits").default(0),
  uniqueVisitors: integer("unique_visitors").default(0),
  pageViews: integer("page_views").default(0),
  bounceRate: decimal("bounce_rate", { precision: 5, scale: 2 }).default("0"),
  avgSessionDuration: integer("avg_session_duration").default(0), // in seconds
  
  // Conversion metrics
  conversions: integer("conversions").default(0),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }).default("0"),
  revenue: decimal("revenue", { precision: 12, scale: 2 }).default("0"),
  avgOrderValue: decimal("avg_order_value", { precision: 8, scale: 2 }).default("0"),
  
  // Traffic sources
  trafficSources: jsonb("traffic_sources").$type<{
    direct: number;
    organic: number;
    social: number;
    paid: number;
    referral: number;
    email: number;
  }>().default({
    direct: 0,
    organic: 0,
    social: 0,
    paid: 0,
    referral: 0,
    email: 0,
  }),
  
  // Device breakdown
  deviceTypes: jsonb("device_types").$type<{
    desktop: number;
    mobile: number;
    tablet: number;
  }>().default({
    desktop: 0,
    mobile: 0,
    tablet: 0,
  }),
  
  // Location data (top 5 countries)
  topCountries: jsonb("top_countries").$type<Array<{
    country: string;
    visits: number;
  }>>().default([]),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tracking events table for detailed user behavior analytics
export const trackingEvents = pgTable("tracking_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Session and user identification
  sessionId: varchar("session_id").notNull(), // Unique session identifier
  visitorId: varchar("visitor_id").notNull(), // Persistent visitor identifier
  userId: varchar("user_id"), // If logged in user
  
  // Funnel and page context
  funnelId: varchar("funnel_id").references(() => funnels.id),
  pageId: varchar("page_id").references(() => funnelPages.id),
  deploymentId: varchar("deployment_id").references(() => funnelDeployments.id),
  
  // Event details
  eventType: text("event_type").notNull(), // 'page_view', 'click', 'form_submit', 'conversion', 'scroll', 'time_on_page'
  eventName: text("event_name"), // Specific event name like 'add_to_cart', 'purchase', 'signup'
  eventValue: decimal("event_value", { precision: 10, scale: 2 }), // Monetary value if applicable
  
  // Event metadata
  metadata: jsonb("metadata").$type<{
    element?: string; // CSS selector or element ID
    text?: string; // Button text, form data, etc
    url?: string; // Current page URL
    referrer?: string; // Referrer URL
    scroll_depth?: number; // Scroll percentage for scroll events
    time_on_page?: number; // Time spent on page in seconds
    form_data?: Record<string, any>; // Form submission data
    custom_props?: Record<string, any>; // Custom tracking properties
  }>(),
  
  // Technical details
  deviceInfo: jsonb("device_info").$type<{
    user_agent?: string;
    device_type?: 'desktop' | 'mobile' | 'tablet';
    browser?: string;
    os?: string;
    screen_resolution?: string;
    viewport_size?: string;
  }>(),
  
  // Location and traffic source
  geoLocation: jsonb("geo_location").$type<{
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
    ip?: string; // Hashed for privacy
  }>(),
  
  trafficSource: jsonb("traffic_source").$type<{
    source?: string; // 'direct', 'google', 'facebook', 'instagram'
    medium?: string; // 'organic', 'paid', 'email', 'social'
    campaign?: string; // Campaign name
    term?: string; // Keyword
    content?: string; // Ad content
    utm_params?: Record<string, string>; // All UTM parameters
  }>(),
  
  // Performance tracking
  pageLoadTime: integer("page_load_time"), // Page load time in milliseconds
  serverTime: timestamp("server_time").defaultNow(), // Server timestamp
  clientTime: timestamp("client_time"), // Client timestamp when event occurred
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Conversion funnels tracking table
export const conversionFunnels = pgTable("conversion_funnels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Funnel context
  funnelId: varchar("funnel_id").notNull().references(() => funnels.id),
  operationId: varchar("operation_id").notNull().references(() => operations.id),
  
  // Conversion path definition
  name: text("name").notNull(), // "Main Purchase Flow", "Email Signup Flow"
  description: text("description"),
  
  // Funnel steps (ordered sequence)
  steps: jsonb("steps").$type<Array<{
    id: string;
    name: string;
    event_type: string;
    event_name?: string;
    page_id?: string;
    required: boolean;
    order: number;
  }>>().notNull(),
  
  // Funnel configuration
  config: jsonb("config").$type<{
    time_window_hours?: number; // Max time between steps (default 24h)
    allow_skipped_steps?: boolean; // Allow non-linear progression
    conversion_value?: number; // Expected conversion value
    goal_event: string; // Final conversion event
  }>().default({
    time_window_hours: 24,
    allow_skipped_steps: false,
    goal_event: "purchase",
  }),
  
  // Status and metrics
  isActive: boolean("is_active").default(true),
  totalSessions: integer("total_sessions").default(0),
  totalConversions: integer("total_conversions").default(0),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }).default("0"),
  
  // Last calculation
  lastCalculatedAt: timestamp("last_calculated_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User sessions for analytics
export const analyticsSessions = pgTable("analytics_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Session identification
  sessionId: varchar("session_id").notNull().unique(), // Unique session ID
  visitorId: varchar("visitor_id").notNull(), // Persistent visitor ID
  userId: varchar("user_id"), // If logged in
  
  // Funnel context
  funnelId: varchar("funnel_id").references(() => funnels.id),
  operationId: varchar("operation_id").references(() => operations.id),
  
  // Session metrics
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // Session duration in seconds
  pageViews: integer("page_views").default(0),
  eventsCount: integer("events_count").default(0),
  
  // Conversion tracking
  converted: boolean("converted").default(false),
  conversionEvent: text("conversion_event"), // Which event led to conversion
  conversionValue: decimal("conversion_value", { precision: 10, scale: 2 }),
  conversionTime: timestamp("conversion_time"),
  
  // Technical and context data
  entryPage: text("entry_page"), // First page visited
  exitPage: text("exit_page"), // Last page before leaving
  deviceInfo: jsonb("device_info").$type<{
    device_type?: 'desktop' | 'mobile' | 'tablet';
    browser?: string;
    os?: string;
  }>(),
  
  trafficSource: jsonb("traffic_source").$type<{
    source?: string;
    medium?: string;
    campaign?: string;
    utm_params?: Record<string, string>;
  }>(),
  
  geoLocation: jsonb("geo_location").$type<{
    country?: string;
    region?: string;
    city?: string;
  }>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Funnel page templates (landing, checkout, upsell, etc.)
export const funnelPageTemplates = pgTable("funnel_page_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Template info
  name: text("name").notNull(), // "Landing Page Moderna", "Checkout Simplificado"
  pageType: text("page_type").notNull(), // 'landing', 'checkout', 'upsell', 'downsell', 'thankyou'
  category: text("category").notNull().default("standard"), // 'standard', 'premium', 'custom'
  
  // Template structure
  defaultModel: jsonb("default_model").$type<{
    layout: string; // 'single_page', 'multi_step', 'scroll'
    sections: Array<{
      id: string;
      type: string; // 'hero', 'benefits', 'testimonials', 'faq', 'cta', 'checkout'
      config: Record<string, any>;
      content: Record<string, any>;
    }>;
    style: {
      theme: string;
      primaryColor: string;
      secondaryColor: string;
      fontFamily: string;
    };
  }>().notNull(),
  
  // Template constraints
  allowedSections: jsonb("allowed_sections").$type<string[]>().default([]),
  requiredSections: jsonb("required_sections").$type<string[]>().default([]),
  
  // Preview and metadata
  previewImageUrl: text("preview_image_url"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual pages within funnels
export const funnelPages = pgTable("funnel_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  funnelId: varchar("funnel_id").notNull().references(() => funnels.id, { onDelete: 'cascade' }),
  
  // Page info
  name: text("name").notNull(), // "Página Principal", "Checkout"
  pageType: text("page_type").notNull(), // 'landing', 'checkout', 'upsell', 'downsell', 'thankyou'
  path: text("path").notNull(), // '/', '/checkout', '/upsell'
  
  // Page structure (JSON model)
  model: jsonb("model").$type<{
    layout: string;
    sections: Array<{
      id: string;
      type: string;
      config: Record<string, any>;
      content: Record<string, any>;
    }>;
    style: {
      theme: string;
      primaryColor: string;
      secondaryColor: string;
      fontFamily: string;
    };
    seo: {
      title: string;
      description: string;
      keywords?: string[];
    };
  }>().notNull(),
  
  // Template reference
  templateId: varchar("template_id").references(() => funnelPageTemplates.id),
  
  // Status and metadata
  status: text("status").notNull().default("draft"), // 'draft', 'preview', 'published'
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").default(true),
  
  // Last editor info
  lastEditedBy: varchar("last_edited_by").references(() => users.id),
  lastAiPrompt: text("last_ai_prompt"), // Last AI prompt used for modification
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Revision history for pages (for rollback and diff)
export const funnelPageRevisions = pgTable("funnel_page_revisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pageId: varchar("page_id").notNull().references(() => funnelPages.id, { onDelete: 'cascade' }),
  
  // Revision info
  version: integer("version").notNull(),
  changeType: text("change_type").notNull(), // 'manual', 'ai_patch', 'template_apply', 'rollback'
  
  // Content snapshot
  model: jsonb("model").$type<{
    layout: string;
    sections: Array<{
      id: string;
      type: string;
      config: Record<string, any>;
      content: Record<string, any>;
    }>;
    style: Record<string, any>;
    seo: Record<string, any>;
  }>().notNull(),
  
  // Change metadata
  diff: jsonb("diff").$type<Array<{
    op: string; // 'add', 'remove', 'replace'
    path: string;
    value?: any;
    oldValue?: any;
  }>>(), // JSON Patch format (RFC 6902)
  
  aiPrompt: text("ai_prompt"), // If change was made by AI
  changeDescription: text("change_description"), // Human readable description
  
  // Author info
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI Page Generation System Tables - Professional AI page creation
export const pageGenerationTemplates = pgTable("page_generation_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  industry: text("industry").notNull(), // 'ecommerce', 'saas', 'course', 'health', etc.
  description: text("description"),
  sectionsConfig: jsonb("sections_config").$type<{
    sections: Array<{
      id: string;
      type: string;
      required: boolean;
      order: number;
      mobileLayout?: any;
      tabletLayout?: any;
      desktopLayout?: any;
    }>;
    conversionFramework: 'PAS' | 'AIDA' | 'VSL' | 'BAB';
    targetPersona: string;
    industrySpecific: any;
  }>().notNull(),
  qualityMetrics: jsonb("quality_metrics").$type<{
    expectedConversionRate: number;
    averageScore: number;
    usageCount: number;
    successRate: number;
  }>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pageGenerationDrafts = pgTable("page_generation_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  funnelId: varchar("funnel_id").notNull(),
  pageId: varchar("page_id"),
  templateId: varchar("template_id").references(() => pageGenerationTemplates.id),
  operationId: varchar("operation_id").notNull(),
  userId: varchar("user_id").notNull(),
  
  // Generation Input
  briefData: jsonb("brief_data").$type<{
    productInfo: {
      name: string;
      description: string;
      price: number;
      currency: string;
      targetAudience: string;
      mainBenefits: string[];
      objections: string[];
      industry: string;
    };
    conversionGoal: string;
    brandGuidelines?: any;
  }>().notNull(),
  
  // Generation Output
  generatedModel: jsonb("generated_model").$type<any>(), // Full PageModelV2
  qualityScore: jsonb("quality_score").$type<{
    overall: number;
    contentQuality: number;
    mobileOptimization: number;
    conversionPotential: number;
    brandCompliance: number;
    mediaRichness: number;
    breakdown: any;
  }>(),
  
  // Generation Process
  generationSteps: jsonb("generation_steps").$type<{
    briefEnrichment: any;
    templateSelection: any;
    contentGeneration: any;
    layoutOptimization: any;
    mediaEnrichment: any;
    qualityAssurance: any;
  }>(),
  
  status: text("status").notNull().default("generating"), // generating, review_pending, approved, rejected
  aiCost: decimal("ai_cost", { precision: 10, scale: 4 }).default("0"),
  generatedAt: timestamp("generated_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  publishedAt: timestamp("published_at"),
});

export const pageGenerationReviews = pgTable("page_generation_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  draftId: varchar("draft_id").notNull().references(() => pageGenerationDrafts.id),
  reviewerId: varchar("reviewer_id").notNull(),
  
  reviewScore: jsonb("review_score").$type<{
    overall: number;
    contentQuality: number;
    designQuality: number;
    conversionPotential: number;
    brandAlignment: number;
    feedback: string;
  }>().notNull(),
  
  suggestions: jsonb("suggestions").$type<Array<{
    sectionId: string;
    type: 'content' | 'design' | 'layout' | 'media';
    description: string;
    priority: 'low' | 'medium' | 'high';
    suggestedFix: string;
  }>>(),
  
  status: text("status").notNull(), // approved, rejected, needs_revision
  comments: text("comments"),
  reviewedAt: timestamp("reviewed_at").defaultNow(),
});

export const pageGenerationAnalytics = pgTable("page_generation_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  draftId: varchar("draft_id").notNull().references(() => pageGenerationDrafts.id),
  pageId: varchar("page_id"),
  
  // Performance Metrics
  conversionRate: decimal("conversion_rate", { precision: 8, scale: 4 }),
  bounceRate: decimal("bounce_rate", { precision: 8, scale: 4 }),
  timeOnPage: integer("time_on_page"), // seconds
  clickThroughRate: decimal("click_through_rate", { precision: 8, scale: 4 }),
  
  // A/B Testing
  variantType: text("variant_type"), // 'original', 'variant_a', 'variant_b'
  testId: varchar("test_id"),
  
  // User Feedback
  userRating: integer("user_rating"), // 1-5
  userFeedback: text("user_feedback"),
  
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// Insert schemas for funnel entities
export const insertFunnelIntegrationSchema = createInsertSchema(funnelIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  connectedAt: true,
});

export const insertFunnelTemplateSchema = createInsertSchema(funnelTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertFunnelSchema = createInsertSchema(funnels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  generatedAt: true,
  lastRegeneratedAt: true,
});

export const insertFunnelDeploymentSchema = createInsertSchema(funnelDeployments).omit({
  id: true,
  createdAt: true,
  deployedAt: true,
});

export const insertFunnelAnalyticsSchema = createInsertSchema(funnelAnalytics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFunnelPageTemplateSchema = createInsertSchema(funnelPageTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFunnelPageSchema = createInsertSchema(funnelPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFunnelPageRevisionSchema = createInsertSchema(funnelPageRevisions).omit({
  id: true,
  createdAt: true,
});

// Schema for the simplified funnel creation modal
export const createFunnelSchema = z.object({
  name: z.string().min(1, "Nome do funil é obrigatório"),
  type: z.enum(["ecommerce", "nutraceutico", "infoproduto"], {
    required_error: "Tipo do funil é obrigatório"
  }),
  language: z.enum([
    "pt-BR", "en-US", "es-ES", "fr-FR", "de-DE", "it-IT", "nl-NL", 
    "ru-RU", "pl-PL", "sv-SE", "da-DK", "no-NO", "fi-FI", "el-GR", 
    "hu-HU", "cs-CZ", "ar-SA"
  ], {
    required_error: "Idioma é obrigatório"
  }),
  currency: z.enum([
    "EUR", "USD", "BRL", "GBP", "CHF", "SEK", "DKK", "NOK", "PLN", 
    "CZK", "HUF", "RON", "BGN", "AED", "SAR"
  ], {
    required_error: "Moeda é obrigatória"
  }),
});

export type CreateFunnelData = z.infer<typeof createFunnelSchema>;

// Types for funnel entities
export type FunnelIntegration = typeof funnelIntegrations.$inferSelect;
export type InsertFunnelIntegration = z.infer<typeof insertFunnelIntegrationSchema>;

export type FunnelTemplate = typeof funnelTemplates.$inferSelect;
export type InsertFunnelTemplate = z.infer<typeof insertFunnelTemplateSchema>;

export type Funnel = typeof funnels.$inferSelect;
export type InsertFunnel = z.infer<typeof insertFunnelSchema>;

export type FunnelDeployment = typeof funnelDeployments.$inferSelect;
export type InsertFunnelDeployment = z.infer<typeof insertFunnelDeploymentSchema>;

export type FunnelAnalytics = typeof funnelAnalytics.$inferSelect;
export type InsertFunnelAnalytics = z.infer<typeof insertFunnelAnalyticsSchema>;

export type FunnelPageTemplate = typeof funnelPageTemplates.$inferSelect;
export type InsertFunnelPageTemplate = z.infer<typeof insertFunnelPageTemplateSchema>;

export type FunnelPage = typeof funnelPages.$inferSelect;
export type InsertFunnelPage = z.infer<typeof insertFunnelPageSchema>;

export type FunnelPageRevision = typeof funnelPageRevisions.$inferSelect;
export type InsertFunnelPageRevision = z.infer<typeof insertFunnelPageRevisionSchema>;

// Analytics and tracking table schemas
export const insertTrackingEventSchema = createInsertSchema(trackingEvents).omit({
  id: true,
  serverTime: true,
  createdAt: true,
});

export const insertConversionFunnelSchema = createInsertSchema(conversionFunnels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastCalculatedAt: true,
});

export const insertAnalyticsSessionSchema = createInsertSchema(analyticsSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Analytics and tracking types
export type TrackingEvent = typeof trackingEvents.$inferSelect;
export type InsertTrackingEvent = z.infer<typeof insertTrackingEventSchema>;

export type ConversionFunnel = typeof conversionFunnels.$inferSelect;
export type InsertConversionFunnel = z.infer<typeof insertConversionFunnelSchema>;

export type AnalyticsSession = typeof analyticsSessions.$inferSelect;
export type InsertAnalyticsSession = z.infer<typeof insertAnalyticsSessionSchema>;

// VercelIntegration type alias for backwards compatibility
export type VercelIntegration = {
  connected: boolean;
  accessToken?: string;
  teamId?: string;
  userId?: string;
  connectedAt?: string;
  lastUsed?: string;
  isActive?: boolean;
};

// Advanced Page Builder v2 - Enhanced Block System for Visual Editor
export type BlockElement = {
  id: string;
  type: 'heading' | 'text' | 'button' | 'image' | 'spacer' | 'divider' | 'video' | 'form' | 'embed' | 'container' | 'block' | 'benefits' | 'reviews' | 'slider' | 'hero' | 'features' | 'team' | 'contact';
  props: Record<string, any>;
  styles: {
    // Typography
    fontSize?: string;
    lineHeight?: string;
    letterSpacing?: string;
    fontWeight?: string;
    fontStyle?: string;
    textAlign?: 'left' | 'center' | 'right';
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    color?: string;
    
    // Spacing - Individual sides for precise control
    paddingTop?: string;
    paddingRight?: string;
    paddingBottom?: string;
    paddingLeft?: string;
    marginTop?: string;
    marginRight?: string;
    marginBottom?: string;
    marginLeft?: string;
    
    // Background
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundSize?: string;
    backgroundPosition?: string;
    
    // Borders - Individual sides and corners
    borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
    borderColor?: string;
    borderWidth?: string;
    borderTopWidth?: string;
    borderRightWidth?: string;
    borderBottomWidth?: string;
    borderLeftWidth?: string;
    borderTopColor?: string;
    borderRightColor?: string;
    borderBottomColor?: string;
    borderLeftColor?: string;
    borderRadius?: string;
    borderTopLeftRadius?: string;
    borderTopRightRadius?: string;
    borderBottomRightRadius?: string;
    borderBottomLeftRadius?: string;
    
    // Size & Layout
    width?: string;
    height?: string;
    minWidth?: string;
    maxWidth?: string;
    minHeight?: string;
    maxHeight?: string;
    
    // Layout for blocks - grid system
    display?: 'block' | 'flex' | 'grid';
    flexDirection?: 'row' | 'column';
    justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
    alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
    gap?: string;
    
    // Legacy support (will be deprecated)
    padding?: string;
    margin?: string;
    border?: string;
    
    [key: string]: any;
  };
  content?: {
    text?: string;
    html?: string;
    lexicalState?: any; // Lexical editor state for rich text
    src?: string; // For images/videos
    alt?: string; // For images
    href?: string; // For buttons/links
    placeholder?: string; // For forms
    [key: string]: any;
  };
  
  // V3 compatibility: State styles with responsive breakpoints
  states?: {
    default?: {
      desktop?: Record<string, any>;
      tablet?: Record<string, any>;
      mobile?: Record<string, any>;
    };
    hover?: {
      desktop?: Record<string, any>;
      tablet?: Record<string, any>;
      mobile?: Record<string, any>;
    };
    focus?: {
      desktop?: Record<string, any>;
      tablet?: Record<string, any>;
      mobile?: Record<string, any>;
    };
    active?: {
      desktop?: Record<string, any>;
      tablet?: Record<string, any>;
      mobile?: Record<string, any>;
    };
    disabled?: {
      desktop?: Record<string, any>;
      tablet?: Record<string, any>;
      mobile?: Record<string, any>;
    };
  };
  
  // V3 compatibility: Transitions and animations
  transitions?: Array<{
    property: string;
    duration?: string;
    timingFunction?: string;
    delay?: string;
  }>;
  animations?: Array<{
    name: string;
    duration?: string;
    timingFunction?: string;
    delay?: string;
    iterationCount?: number | 'infinite';
    direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
    fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
    keyframes: Array<{
      offset: number;
      styles: Record<string, any>;
    }>;
  }>;
  
  // Configuration for structural elements (container & block)
  config?: {
    // For block type - number of columns
    columns?: number;
    // For both - allow nesting
    allowNesting?: boolean;
    // Column distribution (for blocks)
    columnDistribution?: 'equal' | 'custom';
    columnWidths?: string[]; // ['1/2', '1/2'] or ['1/3', '2/3'] etc
    [key: string]: any;
  };
  
  // Child elements for structural elements (containers and blocks)
  children?: BlockElement[];
  
  // Component Instance support (V3 compatibility)
  componentId?: string; // Reference to ComponentDefinitionV3.id (legacy)
  instanceData?: ComponentInstanceData; // Full instance metadata with overrides
};

export type BlockColumn = {
  id: string;
  width: string; // '1/2', '1/3', '2/3', '1/4', '3/4', 'full'
  elements: BlockElement[];
  styles: {
    padding?: string;
    margin?: string;
    backgroundColor?: string;
    [key: string]: any;
  };
};

export type BlockRow = {
  id: string;
  columns: BlockColumn[];
  styles: {
    padding?: string;
    margin?: string;
    backgroundColor?: string;
    minHeight?: string;
    gap?: string;
    [key: string]: any;
  };
};

export type BlockSection = {
  id: string;
  type: 'hero' | 'content' | 'cta' | 'benefits' | 'testimonials' | 'faq' | 'checkout' | 'custom';
  name: string;
  rows: BlockRow[];
  styles: {
    // Spacing - Individual sides for precise control
    paddingTop?: string;
    paddingRight?: string;
    paddingBottom?: string;
    paddingLeft?: string;
    marginTop?: string;
    marginRight?: string;
    marginBottom?: string;
    marginLeft?: string;
    
    // Background
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundSize?: string;
    backgroundPosition?: string;
    
    // Borders - Individual sides and corners
    borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
    borderColor?: string;
    borderWidth?: string;
    borderTopWidth?: string;
    borderRightWidth?: string;
    borderBottomWidth?: string;
    borderLeftWidth?: string;
    borderTopColor?: string;
    borderRightColor?: string;
    borderBottomColor?: string;
    borderLeftColor?: string;
    borderRadius?: string;
    borderTopLeftRadius?: string;
    borderTopRightRadius?: string;
    borderBottomRightRadius?: string;
    borderBottomLeftRadius?: string;
    
    // Size & Layout
    width?: string;
    height?: string;
    minWidth?: string;
    maxWidth?: string;
    minHeight?: string;
    maxHeight?: string;
    
    // Legacy support (will be deprecated)
    padding?: string;
    margin?: string;
    border?: string;
    
    [key: string]: any;
  };
  states?: {
    default?: {
      desktop?: Record<string, any>;
      tablet?: Record<string, any>;
      mobile?: Record<string, any>;
    };
    hover?: {
      desktop?: Record<string, any>;
      tablet?: Record<string, any>;
      mobile?: Record<string, any>;
    };
    focus?: {
      desktop?: Record<string, any>;
      tablet?: Record<string, any>;
      mobile?: Record<string, any>;
    };
    active?: {
      desktop?: Record<string, any>;
      tablet?: Record<string, any>;
      mobile?: Record<string, any>;
    };
    disabled?: {
      desktop?: Record<string, any>;
      tablet?: Record<string, any>;
      mobile?: Record<string, any>;
    };
  };
  transitions?: Array<{
    property: string;
    duration?: string;
    timingFunction?: string;
    delay?: string;
  }>;
  animations?: Array<{
    name: string;
    duration?: string;
    timingFunction?: string;
    delay?: string;
    iterationCount?: number | 'infinite';
    direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
    fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
    keyframes: Array<{
      offset: number;
      styles: Record<string, any>;
    }>;
  }>;
  settings: {
    containerWidth?: 'full' | 'container' | 'narrow';
    verticalAlign?: 'top' | 'center' | 'bottom';
    animation?: string;
    [key: string]: any;
  };
};

export type PageModelV2 = {
  version: 2;
  layout: 'single_page' | 'multi_step' | 'scroll';
  sections: BlockSection[];
  
  // Global styles and theme
  theme: {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      text: string;
      muted: string;
    };
    typography: {
      headingFont: string;
      bodyFont: string;
      fontSize: {
        xs: string;
        sm: string;
        base: string;
        lg: string;
        xl: string;
        '2xl': string;
        '3xl': string;
        '4xl': string;
      };
    };
    spacing: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      '2xl': string;
    };
    borderRadius: {
      sm: string;
      md: string;
      lg: string;
    };
  };
  
  // V3 Design Tokens (optional for V3 compatibility)
  designTokens?: DesignTokensV3;
  
  // Reusable Components (optional for V3 compatibility)
  components?: ComponentDefinitionV3[];
  
  // SEO settings
  seo: {
    title: string;
    description: string;
    keywords?: string[];
    ogImage?: string;
    ogTitle?: string;
    ogDescription?: string;
  };
  
  // Settings for the visual editor
  settings: {
    containerMaxWidth?: string;
    showGrid?: boolean;
    snapToGrid?: boolean;
    enableAnimations?: boolean;
    mobileFirst?: boolean;
  };
};

// Legacy compatibility - extends existing model to work with v2
export type EnhancedPageModel = {
  // Legacy format (v1)
  layout: string;
  sections: Array<{
    id: string;
    type: string;
    config: Record<string, any>;
    content: Record<string, any>;
  }>;
  style: {
    theme: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
  seo: {
    title: string;
    description: string;
    keywords?: string[];
  };
} | PageModelV2; // OR new format (v2)

// AI Integration types for content generation
export type AIContentRequest = {
  type: 'generate_section' | 'rewrite_text' | 'optimize_cta' | 'suggest_layout' | 'generate_copy';
  context: {
    sectionType?: string;
    currentText?: string;
    businessInfo?: {
      name: string;
      industry: string;
      targetAudience: string;
      valueProposition: string;
    };
    goal?: 'increase_conversion' | 'improve_clarity' | 'make_persuasive' | 'create_urgency';
    tone?: 'professional' | 'friendly' | 'urgent' | 'trustworthy' | 'excited';
    language?: string;
  };
  elementId?: string; // For targeted improvements
};

export type AIContentResponse = {
  success: boolean;
  content?: {
    text?: string;
    html?: string;
    suggestions?: string[];
    variants?: Array<{
      text: string;
      reason: string;
    }>;
  };
  changes?: Array<{
    elementId: string;
    property: string;
    newValue: any;
    reason: string;
  }>;
  error?: string;
};

// ============================================================================
// PageModelV3 - Professional Visual Editor (Enterprise-Grade)
// Compatible with HTML-to-PageModel Converter (1732 lines)
// ============================================================================

export type ResponsiveStylesV3 = {
  desktop?: Record<string, any>;
  tablet?: Record<string, any>;
  mobile?: Record<string, any>;
};

// State styles with responsive breakpoints
// Each state (hover, focus, etc.) can have different styles per breakpoint
export type StateStylesV3 = {
  default?: ResponsiveStylesV3;
  hover?: ResponsiveStylesV3;
  focus?: ResponsiveStylesV3;
  active?: ResponsiveStylesV3;
  disabled?: ResponsiveStylesV3;
};

export type PseudoElementsV3 = {
  before?: {
    content?: string;
    styles?: Record<string, any>;
  };
  after?: {
    content?: string;
    styles?: Record<string, any>;
  };
};

export type AnimationKeyframeV3 = {
  offset: number; // 0-100
  styles: Record<string, any>;
};

export type AnimationV3 = {
  name: string;
  duration?: string;
  timingFunction?: string;
  delay?: string;
  iterationCount?: number | 'infinite';
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
  keyframes: AnimationKeyframeV3[];
};

export type TransitionV3 = {
  property: string;
  duration?: string;
  timingFunction?: string;
  delay?: string;
};

// Design Tokens structure from converter
export type DesignTokensV3 = {
  colors?: {
    primary?: Record<string, string>;
    secondary?: Record<string, string>;
    neutral?: Record<string, string>;
    semantic?: {
      success?: string;
      warning?: string;
      error?: string;
      info?: string;
    };
    custom?: Record<string, any>;
  };
  typography?: {
    fontFamilies?: Record<string, string>;
    fontSizes?: Record<string, string>;
    fontWeights?: Record<string, number>;
    lineHeights?: Record<string, string>;
    letterSpacings?: Record<string, string>;
  };
  spacing?: Record<string, string>;
  shadows?: Record<string, string>;
  borderRadius?: Record<string, string>;
  breakpoints?: Record<string, string>;
};

// ============================================================================
// Component Instance System - Overrides & References
// ============================================================================

// Individual property override tracking
export type ValueOverride<T = any> = {
  value: T;
  isOverridden: boolean; // true if modified from base component
};

// Overrides for a specific element in an instance
export type ElementOverrides = {
  props?: Record<string, ValueOverride>; // text, href, src, etc.
  styles?: {
    desktop?: Record<string, ValueOverride>;
    tablet?: Record<string, ValueOverride>;
    mobile?: Record<string, ValueOverride>;
  };
  states?: {
    default?: Record<string, ValueOverride>;
    hover?: Record<string, ValueOverride>;
    focus?: Record<string, ValueOverride>;
    active?: Record<string, ValueOverride>;
    disabled?: Record<string, ValueOverride>;
  };
  content?: ValueOverride<string>; // For text content overrides
  visible?: ValueOverride<boolean>; // Show/hide element
};

// Map of element ID to its overrides
export type InstanceOverridesMap = Record<string, ElementOverrides>;

// Component instance metadata (stored in element when type === 'componentInstance')
export type ComponentInstanceData = {
  componentId: string; // Reference to ComponentDefinitionV3.id
  instanceId: string; // Unique ID for this instance
  overrides: InstanceOverridesMap; // Overridden properties per element
  propValues?: Record<string, any>; // Custom prop values (key -> value)
  selectedVariant?: Record<string, string>; // Selected variant combination (property -> value)
  slotContents?: ComponentInstanceSlotContent[]; // Custom content for each slot
  detachedFrom?: string; // If detached, original componentId
  lastSyncedAt?: string; // ISO timestamp of last sync
};

// Component Props System (Figma-style customizable properties)
export type ComponentPropType = 
  | 'text'        // String input
  | 'number'      // Numeric input
  | 'boolean'     // Toggle/checkbox
  | 'select'      // Dropdown with options
  | 'color'       // Color picker
  | 'image';      // Image URL input

export type ComponentProp = {
  id: string;
  name: string;              // Display name (e.g., "Button Text")
  key: string;               // Property key (e.g., "buttonText")
  type: ComponentPropType;
  defaultValue: any;         // Default value for this prop
  options?: string[];        // Options for 'select' type
  bindTo?: {                 // Which element and property this affects
    elementId: string;
    property: string;        // e.g., "props.content", "styles.desktop.backgroundColor"
  };
  description?: string;
};

// Component Variants System (Figma-style variant combinations)
export type ComponentVariantProperty = {
  name: string;              // e.g., "Size", "State", "Type"
  values: string[];          // e.g., ["Small", "Medium", "Large"]
};

export type ComponentVariantCombination = {
  id: string;
  name: string;              // e.g., "Large / Primary"
  properties: Record<string, string>; // e.g., { Size: "Large", Type: "Primary" }
  element: BlockElementV3;   // The variant's element tree
};

// Component Slots System (for nested content areas like Vue slots or React children)
export type ComponentSlot = {
  id: string;
  name: string;              // Display name (e.g., "Header")
  slotName: string;          // Slot identifier (e.g., "header", "content", "footer")
  description?: string;      // Help text for users
  defaultContent?: BlockElementV3[]; // Default elements if slot is empty
  allowedTypes?: string[];   // Restrict which element types can be placed in slot
  maxChildren?: number;      // Limit number of children (e.g., 1 for single element slots)
};

// Slot content in a component instance
export type ComponentInstanceSlotContent = {
  slotName: string;          // Which slot this content fills
  elements: BlockElementV3[]; // The custom elements for this slot
};

export type ComponentDefinitionV3 = {
  id: string;
  name: string;
  category?: string;
  element: BlockElementV3;
  thumbnail?: string;
  updatedAt?: string; // ISO timestamp for sync detection
  
  // Props & Variants
  props?: ComponentProp[];                      // Custom props
  variantProperties?: ComponentVariantProperty[]; // Variant axes (Size, State, etc.)
  variants?: ComponentVariantCombination[];       // Specific variant combinations
  
  // Slots
  slots?: ComponentSlot[];                        // Defined slots for nested content
};

// Element types from converter: heading, text, button, image, link, etc.
export type BlockElementV3 = {
  id: string;
  type: string; // More flexible: heading, text, button, image, link, container, componentInstance, slot, etc.
  
  // Props for element (text content, href, src, etc.)
  props?: Record<string, any>;
  
  // Responsive styles
  styles?: ResponsiveStylesV3;
  
  // State styles (hover, focus, active, disabled)
  states?: StateStylesV3;
  
  // Layout type (block, inline-block, flex, grid, etc.)
  layout?: string;
  
  // Pseudo-elements
  pseudoElements?: PseudoElementsV3;
  
  // Animations
  animations?: AnimationV3[];
  transitions?: TransitionV3[];
  
  // Child elements
  children?: BlockElementV3[];
  
  // Settings
  settings?: {
    className?: string;
    dataAttributes?: Record<string, string>;
    [key: string]: any;
  };
  
  // Component reference (legacy, for simple references)
  componentId?: string;
  
  // Component Instance metadata (when type === 'componentInstance')
  instanceData?: ComponentInstanceData;
  
  // Slot metadata (when type === 'slot')
  slotName?: string; // Name of the slot this element represents
  
  // Custom CSS (for advanced users)
  customCSS?: string; // Raw CSS rules applied to this element
};

export type BlockColumnV3 = {
  id: string;
  width: string | number; // 'full', 'half', 1-12 grid columns
  elements: BlockElementV3[];
  
  // Responsive overrides
  styles?: ResponsiveStylesV3;
  states?: StateStylesV3;
};

export type BlockRowV3 = {
  id: string;
  columns: BlockColumnV3[];
  
  // Row-level responsive styles
  styles?: ResponsiveStylesV3;
  states?: StateStylesV3;
  
  settings?: {
    gap?: string;
    alignment?: 'start' | 'center' | 'end' | 'stretch';
    verticalAlignment?: 'top' | 'middle' | 'bottom';
    reverseOnMobile?: boolean;
    [key: string]: any;
  };
};

export type BlockSectionV3 = {
  id: string;
  type: 'hero' | 'features' | 'pricing' | 'testimonials' | 'cta' | 'content' | 'footer' | 'custom';
  name?: string;
  rows: BlockRowV3[];
  
  // Section-level responsive styles
  styles?: ResponsiveStylesV3;
  states?: StateStylesV3;
  animations?: AnimationV3[];
  
  settings?: {
    containerWidth?: 'full' | 'container' | 'narrow';
    spacing?: {
      paddingTop?: string;
      paddingBottom?: string;
    };
    background?: {
      type?: 'color' | 'gradient' | 'image' | 'video';
      value?: string;
      overlay?: {
        color?: string;
        opacity?: number;
      };
    };
    [key: string]: any;
  };
};

// PageModelV3 structure from converter
export type PageModelV3 = {
  version: string; // "3.0"
  
  // Meta information (SEO)
  meta: {
    title: string;
    description: string;
    keywords?: string[];
    ogImage?: string;
    ogTitle?: string;
    ogDescription?: string;
  };
  
  // Design Tokens extracted from CSS
  designTokens?: DesignTokensV3;
  
  // Reusable Components
  components?: ComponentDefinitionV3[];
  
  // Page sections
  sections: BlockSectionV3[];
  
  // Editor state
  editorState?: {
    activeBreakpoint?: 'mobile' | 'tablet' | 'desktop';
    zoom?: number;
    selectedElementId?: string;
  };
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
};

// ============================================================================
// PageModelV3 Zod Validation Schemas (Compatible with Converter)
// ============================================================================

const responsiveStylesV3Schema = z.object({
  desktop: z.record(z.any()).optional(),
  tablet: z.record(z.any()).optional(),
  mobile: z.record(z.any()).optional(),
});

const stateStylesV3Schema = z.object({
  default: z.record(z.any()).optional(),
  hover: z.record(z.any()).optional(),
  focus: z.record(z.any()).optional(),
  active: z.record(z.any()).optional(),
  disabled: z.record(z.any()).optional(),
});

const pseudoElementsV3Schema = z.object({
  before: z.object({
    content: z.string().optional(),
    styles: z.record(z.any()).optional(),
  }).optional(),
  after: z.object({
    content: z.string().optional(),
    styles: z.record(z.any()).optional(),
  }).optional(),
});

const animationKeyframeV3Schema = z.object({
  offset: z.number().min(0).max(100),
  styles: z.record(z.any()),
});

const animationV3Schema = z.object({
  name: z.string(),
  duration: z.string().optional(),
  timingFunction: z.string().optional(),
  delay: z.string().optional(),
  iterationCount: z.union([z.number(), z.literal('infinite')]).optional(),
  direction: z.enum(['normal', 'reverse', 'alternate', 'alternate-reverse']).optional(),
  fillMode: z.enum(['none', 'forwards', 'backwards', 'both']).optional(),
  keyframes: z.array(animationKeyframeV3Schema),
});

const transitionV3Schema = z.object({
  property: z.string(),
  duration: z.string().optional(),
  timingFunction: z.string().optional(),
  delay: z.string().optional(),
});

const designTokensV3Schema = z.object({
  colors: z.object({
    primary: z.record(z.string()).optional(),
    secondary: z.record(z.string()).optional(),
    neutral: z.record(z.string()).optional(),
    semantic: z.object({
      success: z.string().optional(),
      warning: z.string().optional(),
      error: z.string().optional(),
      info: z.string().optional(),
    }).optional(),
    custom: z.record(z.any()).optional(),
  }).optional(),
  typography: z.object({
    fontFamilies: z.record(z.string()).optional(),
    fontSizes: z.record(z.string()).optional(),
    fontWeights: z.record(z.number()).optional(),
    lineHeights: z.record(z.string()).optional(),
    letterSpacings: z.record(z.string()).optional(),
  }).optional(),
  spacing: z.record(z.string()).optional(),
  shadows: z.record(z.string()).optional(),
  borderRadius: z.record(z.string()).optional(),
  breakpoints: z.record(z.string()).optional(),
}).optional();

// Recursive schemas for nested structures
const blockElementV3Schema: z.ZodType<BlockElementV3> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.string(), // Flexible: heading, text, button, image, etc.
    props: z.record(z.any()).optional(),
    styles: responsiveStylesV3Schema.optional(),
    states: stateStylesV3Schema.optional(),
    layout: z.string().optional(),
    pseudoElements: pseudoElementsV3Schema.optional(),
    animations: z.array(animationV3Schema).optional(),
    transitions: z.array(transitionV3Schema).optional(),
    children: z.array(blockElementV3Schema).optional(),
    settings: z.object({
      className: z.string().optional(),
      dataAttributes: z.record(z.string()).optional(),
    }).catchall(z.any()).optional(),
    componentId: z.string().optional(),
  })
);

const blockColumnV3Schema: z.ZodType<BlockColumnV3> = z.lazy(() =>
  z.object({
    id: z.string(),
    width: z.union([z.string(), z.number()]), // 'full', 'half', or 1-12
    elements: z.array(blockElementV3Schema),
    styles: responsiveStylesV3Schema.optional(),
    states: stateStylesV3Schema.optional(),
  })
);

const blockRowV3Schema: z.ZodType<BlockRowV3> = z.lazy(() =>
  z.object({
    id: z.string(),
    columns: z.array(blockColumnV3Schema),
    styles: responsiveStylesV3Schema.optional(),
    states: stateStylesV3Schema.optional(),
    settings: z.object({
      gap: z.string().optional(),
      alignment: z.enum(['start', 'center', 'end', 'stretch']).optional(),
      verticalAlignment: z.enum(['top', 'middle', 'bottom']).optional(),
      reverseOnMobile: z.boolean().optional(),
    }).catchall(z.any()).optional(),
  })
);

const blockSectionV3Schema: z.ZodType<BlockSectionV3> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.enum(['hero', 'features', 'pricing', 'testimonials', 'cta', 'content', 'footer', 'custom']),
    name: z.string().optional(),
    rows: z.array(blockRowV3Schema),
    styles: responsiveStylesV3Schema.optional(),
    states: stateStylesV3Schema.optional(),
    animations: z.array(animationV3Schema).optional(),
    settings: z.object({
      containerWidth: z.enum(['full', 'container', 'narrow']).optional(),
      spacing: z.object({
        paddingTop: z.string().optional(),
        paddingBottom: z.string().optional(),
      }).optional(),
      background: z.object({
        type: z.enum(['color', 'gradient', 'image', 'video']).optional(),
        value: z.string().optional(),
        overlay: z.object({
          color: z.string().optional(),
          opacity: z.number().optional(),
        }).optional(),
      }).optional(),
    }).catchall(z.any()).optional(),
  })
);

const componentDefinitionV3Schema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().optional(),
  element: blockElementV3Schema,
  thumbnail: z.string().optional(),
});

export const pageModelV3Schema = z.object({
  version: z.string(), // "3.0"
  meta: z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.array(z.string()).optional(),
    ogImage: z.string().optional(),
    ogTitle: z.string().optional(),
    ogDescription: z.string().optional(),
  }),
  designTokens: designTokensV3Schema,
  components: z.array(componentDefinitionV3Schema).optional(),
  sections: z.array(blockSectionV3Schema),
  editorState: z.object({
    activeBreakpoint: z.enum(['mobile', 'tablet', 'desktop']).optional(),
    zoom: z.number().optional(),
    selectedElementId: z.string().optional(),
  }).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

// Export individual schemas for partial validation
export {
  blockElementV3Schema,
  blockColumnV3Schema,
  blockRowV3Schema,
  blockSectionV3Schema,
  responsiveStylesV3Schema,
  stateStylesV3Schema,
  animationV3Schema,
  designTokensV3Schema,
};

// Enterprise Visual Identity System - Phase 1 Implementation
// Color Palette with psychological alignment and accessibility
export type ColorPalette = {
  id: string;
  name: string;
  primary: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };
  secondary: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };
  accent: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };
  neutral: {
    white: string;
    light: string;
    medium: string;
    dark: string;
    black: string;
  };
  semantic: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  // Psychological and brand attributes
  mood: 'premium' | 'trustworthy' | 'energetic' | 'calming' | 'professional' | 'playful';
  industry: string; // e.g., 'luxury', 'health', 'tech', 'financial'
  accessibility: {
    wcagLevel: 'AA' | 'AAA';
    contrastRatios: Record<string, number>;
  };
};

// AI-Generated Asset Bundle for complete visual consistency
export type GeneratedAssetBundle = {
  id: string;
  palette: string; // Reference to ColorPalette.id
  style: 'photographic' | 'illustrated' | 'minimalist' | 'artistic' | 'corporate';
  
  // Images organized by section and purpose
  hero: {
    primary: GeneratedImage;
    background?: GeneratedImage;
    overlay?: GeneratedImage;
  };
  lifestyle: {
    primary: GeneratedImage[];
    gallery?: GeneratedImage[];
  };
  product: {
    showcase: GeneratedImage[];
    detail?: GeneratedImage[];
    comparison?: GeneratedImage[];
  };
  social: {
    avatars: GeneratedImage[];
    testimonialBackgrounds?: GeneratedImage[];
  };
  backgrounds: {
    section: GeneratedImage[];
    patterns: GeneratedImage[];
    textures: GeneratedImage[];
  };
  icons: {
    benefits: GeneratedIcon[];
    features: GeneratedIcon[];
    social: GeneratedIcon[];
    navigation: GeneratedIcon[];
  };
  
  // Metadata for consistency
  generatedAt: string;
  totalSize: number; // In bytes
  compressionApplied: boolean;
  cacheKey: string;
};

// Individual generated image with metadata
export type GeneratedImage = {
  id: string;
  url: string;
  width: number;
  height: number;
  format: 'webp' | 'avif' | 'jpg' | 'png';
  size: number; // In bytes
  alt: string;
  prompt: string; // Original generation prompt
  
  // Responsive variants
  variants: {
    mobile: string;
    tablet: string;
    desktop: string;
    thumbnail: string;
  };
  
  // Technical metadata
  dominantColors: string[];
  aspectRatio: string;
  generatedAt: string;
  processingTime: number; // In milliseconds
};

// Generated icon with consistent styling
export type GeneratedIcon = {
  id: string;
  url: string;
  svg?: string; // Vector format when available
  category: 'benefit' | 'feature' | 'social' | 'navigation' | 'action';
  style: 'outline' | 'filled' | 'duotone' | 'branded';
  size: '16' | '24' | '32' | '48' | '64';
  prompt: string;
  alt: string;
};

// Smart prompt templates for consistent image generation
export type ImagePromptTemplate = {
  id: string;
  name: string;
  category: 'hero' | 'lifestyle' | 'product' | 'social' | 'background' | 'icon';
  
  // Template with dynamic variables
  template: string; // e.g., "Professional ${niche} ${style}, ${lighting}, ${colors}"
  
  // Required variables for this template
  variables: Array<{
    name: string; // e.g., 'niche', 'style', 'lighting'
    type: 'text' | 'color' | 'enum';
    required: boolean;
    options?: string[]; // For enum type
    description: string;
  }>;
  
  // Style parameters
  style: {
    photographic: boolean;
    illustrated: boolean;
    minimalist: boolean;
    artistic: boolean;
  };
  
  // Technical parameters
  aspectRatio: string; // e.g., '16:9', '1:1', '4:3'
  quality: 'standard' | 'hd' | '4k';
  
  // Use cases and examples
  examples: Array<{
    input: Record<string, string>;
    resultDescription: string;
  }>;
};

// Design tokens for consistent styling across components
export type StyleTokens = {
  id: string;
  name: string;
  
  // Typography scale with fluid sizing
  typography: {
    fontFamilies: {
      heading: string;
      body: string;
      mono: string;
    };
    fontSizes: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
      '4xl': string;
      '5xl': string;
      '6xl': string;
    };
    lineHeights: {
      none: string;
      tight: string;
      snug: string;
      normal: string;
      relaxed: string;
      loose: string;
    };
    fontWeights: {
      thin: string;
      light: string;
      normal: string;
      medium: string;
      semibold: string;
      bold: string;
      extrabold: string;
    };
  };
  
  // Spacing system (8pt grid)
  spacing: {
    px: string;
    '0': string;
    '1': string;
    '2': string;
    '3': string;
    '4': string;
    '5': string;
    '6': string;
    '8': string;
    '10': string;
    '12': string;
    '16': string;
    '20': string;
    '24': string;
    '32': string;
    '40': string;
    '48': string;
    '56': string;
    '64': string;
  };
  
  // Elevation system for depth
  shadows: {
    none: string;
    sm: string;
    base: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    inner: string;
  };
  
  // Border radius scale
  borderRadius: {
    none: string;
    sm: string;
    base: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    full: string;
  };
  
  // Animation curves and durations
  animations: {
    durations: {
      fast: string;
      base: string;
      slow: string;
    };
    easings: {
      linear: string;
      easeIn: string;
      easeOut: string;
      easeInOut: string;
    };
  };
  
  // Breakpoints for responsive design
  breakpoints: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
};

// Complete visual identity package
export type VisualIdentity = {
  id: string;
  name: string;
  
  // Core identity components
  palette: ColorPalette;
  assets: GeneratedAssetBundle;
  tokens: StyleTokens;
  
  // Contextual information
  niche: string;
  targetAudience: string;
  brandPersonality: Array<'premium' | 'trustworthy' | 'innovative' | 'friendly' | 'professional' | 'playful'>;
  
  // Usage guidelines
  guidelines: {
    dosDonts: Array<{
      type: 'do' | 'dont';
      rule: string;
      example?: string;
    }>;
    brandVoice: {
      tone: string;
      language: string;
      keywords: string[];
    };
  };
  
  // Generation metadata
  generatedAt: string;
  version: string;
  aiModel: string;
  promptVersion: string;
  qualityScore: number; // 0-100
  
  // Performance and cache
  cacheExpiry: string;
  lastUsed: string;
  usageCount: number;
};

// ============================================================================
// PageModelV4 - Universal HTML Node System
// Supports arbitrary HTML structures with perfect fidelity
// ============================================================================

// Node types for flexible HTML representation
export type NodeType = 
  | 'container'       // Generic container (div, section, article, etc.)
  | 'text'           // Text node
  | 'heading'        // h1-h6
  | 'paragraph'      // p
  | 'link'           // a
  | 'button'         // button
  | 'image'          // img
  | 'video'          // video
  | 'input'          // form input
  | 'form'           // form
  | 'list'           // ul, ol
  | 'listItem'       // li
  | 'table'          // table elements
  | 'svg'            // SVG elements
  | 'custom';        // Custom elements

// Responsive styles per breakpoint
export type ResponsiveStylesV4 = {
  desktop?: Record<string, any>;
  tablet?: Record<string, any>;
  mobile?: Record<string, any>;
};

// State styles (hover, focus, active, etc.)
export type StateStylesV4 = {
  default?: ResponsiveStylesV4;
  hover?: ResponsiveStylesV4;
  focus?: ResponsiveStylesV4;
  active?: ResponsiveStylesV4;
  disabled?: ResponsiveStylesV4;
  visited?: ResponsiveStylesV4;
};

// Universal Node - can represent any HTML element
export type PageNodeV4 = {
  id: string;
  type: NodeType;
  
  // Original HTML information
  tag: string;                    // Original HTML tag (div, span, button, etc.)
  
  // Attributes (href, src, alt, data-*, etc.)
  attributes?: Record<string, string>;
  
  // Responsive attributes for breakpoint-specific values (e.g., responsive images)
  responsiveAttributes?: {
    src?: {
      desktop?: string;
      tablet?: string;
      mobile?: string;
    };
  };
  
  // Text content (for text nodes)
  textContent?: string;
  
  // Computed styles from HTML
  styles?: ResponsiveStylesV4;
  
  // State styles (hover, focus, etc.)
  states?: StateStylesV4;
  
  // CSS classes from original HTML
  classNames?: string[];
  
  // Inline styles from HTML
  inlineStyles?: Record<string, string>;
  
  // Children nodes (recursive)
  children?: PageNodeV4[];
  
  // Layout metadata (for editor tools) - COMPLETE flex/grid properties
  layout?: {
    // Display & Position
    display?: string;           // block, flex, grid, inline-block, etc.
    position?: string;          // static, relative, absolute, fixed, sticky
    
    // Flexbox properties
    flexDirection?: string;     // row, column, row-reverse, column-reverse
    flexWrap?: string;          // nowrap, wrap, wrap-reverse
    justifyContent?: string;    // flex-start, center, flex-end, space-between, space-around, space-evenly
    alignItems?: string;        // flex-start, center, flex-end, stretch, baseline
    alignContent?: string;      // flex-start, center, flex-end, space-between, space-around, stretch
    flex?: string;              // flex shorthand
    flexGrow?: string;          // flex-grow value
    flexShrink?: string;        // flex-shrink value
    flexBasis?: string;         // flex-basis value
    order?: string;             // order value
    alignSelf?: string;         // auto, flex-start, center, flex-end, stretch, baseline
    
    // Grid properties
    gridTemplateColumns?: string;  // grid column template
    gridTemplateRows?: string;     // grid row template
    gridTemplateAreas?: string;    // grid areas template
    gridColumn?: string;           // grid-column shorthand
    gridColumnStart?: string;      // grid column start
    gridColumnEnd?: string;        // grid column end
    gridRow?: string;              // grid-row shorthand
    gridRowStart?: string;         // grid row start
    gridRowEnd?: string;           // grid row end
    gridArea?: string;             // grid area name
    gridAutoFlow?: string;         // row, column, dense
    gridAutoColumns?: string;      // auto column sizing
    gridAutoRows?: string;         // auto row sizing
    justifyItems?: string;         // start, center, end, stretch
    placeItems?: string;           // align-items + justify-items shorthand
    placeContent?: string;         // align-content + justify-content shorthand
    placeSelf?: string;            // align-self + justify-self shorthand
    
    // Spacing
    gap?: string;                  // gap shorthand
    rowGap?: string;               // row gap
    columnGap?: string;            // column gap
  };
  
  // Animations and transitions
  animations?: AnimationV3[];
  transitions?: TransitionV3[];
  
  // Pseudo-elements
  pseudoElements?: PseudoElementsV3;
  
  // Custom CSS
  customCSS?: string;
  
  // Metadata
  metadata?: {
    sourceHTML?: string;        // Original HTML snippet
    convertedFrom?: string;     // Conversion source
    editorNotes?: string;
  };
};

// PageModelV4 structure
export type PageModelV4 = {
  version: string; // "4.0"
  
  // Meta information (SEO)
  meta: {
    title: string;
    description: string;
    keywords?: string[];
    ogImage?: string;
    ogTitle?: string;
    ogDescription?: string;
    favicon?: string;
    lang?: string;
  };
  
  // Design tokens extracted from CSS
  designTokens?: DesignTokensV3;
  
  // Global styles (from <style> tags)
  globalStyles?: string;
  
  // CSS class definitions (className -> styles)
  cssClasses?: Record<string, {
    styles: Record<string, any>;
    responsive?: ResponsiveStylesV4;
    states?: StateStylesV4;
  }>;
  
  // Root nodes (body children)
  nodes: PageNodeV4[];
  
  // Reusable components (optional, for editor)
  components?: ComponentDefinitionV3[];
  
  // Editor state
  editorState?: {
    activeBreakpoint?: 'mobile' | 'tablet' | 'desktop';
    zoom?: number;
    selectedNodeId?: string;
  };
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
};

// ============================================================================
// PageModelV4 Zod Validation Schemas
// ============================================================================

const responsiveStylesV4Schema = z.object({
  desktop: z.record(z.any()).optional(),
  tablet: z.record(z.any()).optional(),
  mobile: z.record(z.any()).optional(),
});

const stateStylesV4Schema = z.object({
  default: responsiveStylesV4Schema.optional(),
  hover: responsiveStylesV4Schema.optional(),
  focus: responsiveStylesV4Schema.optional(),
  active: responsiveStylesV4Schema.optional(),
  disabled: responsiveStylesV4Schema.optional(),
  visited: responsiveStylesV4Schema.optional(),
});

const pageNodeV4Schema: z.ZodType<PageNodeV4> = z.lazy(() => z.object({
  id: z.string(),
  type: z.enum(['container', 'text', 'heading', 'paragraph', 'link', 'button', 'image', 'video', 'input', 'form', 'list', 'listItem', 'table', 'svg', 'custom']),
  tag: z.string(),
  attributes: z.record(z.string()).optional(),
  textContent: z.string().optional(),
  styles: responsiveStylesV4Schema.optional(),
  states: stateStylesV4Schema.optional(),
  classNames: z.array(z.string()).optional(),
  inlineStyles: z.record(z.string()).optional(),
  children: z.array(pageNodeV4Schema).optional(),
  layout: z.object({
    display: z.string().optional(),
    position: z.string().optional(),
    flexDirection: z.string().optional(),
    justifyContent: z.string().optional(),
    alignItems: z.string().optional(),
    gridTemplateColumns: z.string().optional(),
    gridTemplateRows: z.string().optional(),
    gap: z.string().optional(),
  }).optional(),
  animations: z.array(animationV3Schema).optional(),
  transitions: z.array(transitionV3Schema).optional(),
  pseudoElements: pseudoElementsV3Schema.optional(),
  customCSS: z.string().optional(),
  metadata: z.object({
    sourceHTML: z.string().optional(),
    convertedFrom: z.string().optional(),
    editorNotes: z.string().optional(),
  }).optional(),
}));

export const pageModelV4Schema = z.object({
  version: z.string(),
  meta: z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.array(z.string()).optional(),
    ogImage: z.string().optional(),
    ogTitle: z.string().optional(),
    ogDescription: z.string().optional(),
    favicon: z.string().optional(),
    lang: z.string().optional(),
  }),
  designTokens: z.any().optional(),
  globalStyles: z.string().optional(),
  cssClasses: z.record(z.object({
    styles: z.record(z.any()),
    responsive: responsiveStylesV4Schema.optional(),
    states: stateStylesV4Schema.optional(),
  })).optional(),
  nodes: z.array(pageNodeV4Schema),
  components: z.array(z.any()).optional(),
  editorState: z.object({
    activeBreakpoint: z.enum(['mobile', 'tablet', 'desktop']).optional(),
    zoom: z.number().optional(),
    selectedNodeId: z.string().optional(),
  }).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});;
// ============================================================================
// OPERATIONAL APP INTEGRATION SYSTEM
// ============================================================================

// Integration configurations table - stores webhook settings
export const integrationConfigs = pgTable("integration_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  operationId: varchar("operation_id").references(() => operations.id), // Links integration to specific operation
  integrationType: text("integration_type").notNull(), // 'operational_app'
  webhookUrl: text("webhook_url").notNull(),
  webhookSecret: text("webhook_secret").notNull(), // Encrypted secret for HMAC
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Ensure one config per user+operation+type combination
  uniqueUserOperationType: unique().on(table.userId, table.operationId, table.integrationType),
}));

// Webhook logs table - tracks all webhook dispatches
export const webhookLogs = pgTable("webhook_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  integrationConfigId: varchar("integration_config_id").notNull().references(() => integrationConfigs.id),
  orderId: text("order_id").notNull().references(() => orders.id),
  payload: jsonb("payload").notNull(), // The data sent to webhook
  responseStatus: integer("response_status"), // HTTP status code received
  responseBody: jsonb("response_body"), // Response from webhook
  errorMessage: text("error_message"), // Error if failed
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas for integration configs
export const insertIntegrationConfigSchema = createInsertSchema(integrationConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWebhookLogSchema = createInsertSchema(webhookLogs).omit({
  id: true,
  createdAt: true,
});

export type IntegrationConfig = typeof integrationConfigs.$inferSelect;
export type InsertIntegrationConfig = z.infer<typeof insertIntegrationConfigSchema>;
export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;
