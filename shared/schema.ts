import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
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
  role: text("role").notNull().default("user"), // 'store', 'product_seller', 'supplier', 'super_admin', 'admin_financeiro', 'investor', 'admin_investimento'
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
  country: text("country").notNull(), // Country code e.g., "ES", "IT", "FR"
  currency: text("currency").notNull().default("EUR"), // Currency code e.g., "EUR", "PLN", "CZK"
  status: text("status").notNull().default("active"), // 'active', 'paused', 'archived'
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
  provider: text("provider").notNull().default("european_fulfillment"), // 'european_fulfillment', 'correios', 'jadlog'
  providerOrderId: text("provider_order_id"), // Original ID from provider (legacy, use carrierOrderId)
  trackingNumber: text("tracking_number"),
  
  // Provider specific data stored as JSON
  providerData: jsonb("provider_data"),
  shopifyData: jsonb("shopify_data"), // Complete Shopify order data
  
  // Timestamps - CRITICAL: Use real dates from provider history
  orderDate: timestamp("order_date"), // Real order creation date from provider
  lastStatusUpdate: timestamp("last_status_update"),
  
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

// European Fulfillment integration - per operation 
export const fulfillmentIntegrations = pgTable("fulfillment_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operationId: varchar("operation_id").notNull().references(() => operations.id),
  
  provider: text("provider").notNull(), // 'european_fulfillment', 'correios', 'jadlog'
  credentials: jsonb("credentials").notNull(), // Encrypted credentials
  
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
  type: text("type").notNull().default("custom"), // 'correios', 'jadlog', 'european_fulfillment', 'custom'
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
});

// Facebook Ads integration schemas
export const insertFacebookAdsIntegrationSchema = createInsertSchema(facebookAdsIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

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