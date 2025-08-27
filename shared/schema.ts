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
  role: text("role").notNull().default("user"), // 'store', 'product_seller', 'supplier', 'super_admin', 'admin_financeiro'
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
  
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default("0"),
  averageOrderValue: decimal("average_order_value", { precision: 8, scale: 2 }).default("0"),
  
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

export type ProductContract = typeof productContracts.$inferSelect;
export type InsertProductContract = z.infer<typeof insertProductContractSchema>;

export type UserProduct = typeof userProducts.$inferSelect;
export type InsertUserProduct = z.infer<typeof insertUserProductSchema>;
export type LinkProductBySku = z.infer<typeof linkProductBySkuSchema>;

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

// Ad Accounts - Unified table for Facebook and Google Ads
export const adAccounts = pgTable("ad_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id), // CRITICAL: Link to store for isolation
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