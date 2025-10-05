import { pgTable, varchar, text, timestamp, boolean, integer, jsonb, decimal, serial, index, unique, uuid, AnyPgColumn, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"), // 'user', 'admin', 'super_admin', 'finance', 'investor', 'supplier', 'affiliate'
  storeId: varchar("store_id"), // Make optional for global users like finance/super_admin
  accessLevel: integer("access_level").notNull().default(1), // 1 = basic, 2 = advanced, 3 = admin
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  onboardingStep1Operation: boolean("onboarding_step1_operation").default(false).notNull(),
  onboardingStep2Shopify: boolean("onboarding_step2_shopify").default(false).notNull(),
  onboardingStep3Shipping: boolean("onboarding_step3_shipping").default(false).notNull(),
  onboardingStep4Ads: boolean("onboarding_step4_ads").default(false).notNull(),
  onboardingStep5Sync: boolean("onboarding_step5_sync").default(false).notNull(),
});

// Stores table
export const stores = pgTable("stores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  domain: text("domain"), // Shopify domain
  accessToken: text("access_token"), // Shopify access token
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Operations table (campaigns/operations)
export const operations = pgTable("operations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  // Shopify configuration
  shopifyCollectionId: text("shopify_collection_id"),
  autoSync: boolean("auto_sync").default(false),
  
  // Instance-based fulfillment configuration
  fulfillmentInstanceId: varchar("fulfillment_instance_id"),
  warehouseCode: text("warehouse_code"),
}, (table) => {
  return {
    storeIdx: index().on(table.storeId),
  };
});

// User operations access table (many-to-many)
export const userOperations = pgTable("user_operations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  operationId: varchar("operation_id").notNull().references(() => operations.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    userIdx: index().on(table.userId),
    operationIdx: index().on(table.operationId),
    uniqueUserOperation: unique().on(table.userId, table.operationId),
  };
});

// User operation access with roles (alternative table)
export const userOperationAccess = pgTable("user_operation_access", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  operationId: varchar("operation_id").notNull().references(() => operations.id),
  role: text("role").notNull().default("viewer"), // 'owner', 'admin', 'viewer'
  permissions: jsonb("permissions"), // Custom permissions
  createdAt: timestamp("created_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Operation reference
  operationId: varchar("operation_id").notNull().references(() => operations.id),
  
  // Customer info
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  
  // Shipping address
  shippingAddress: text("shipping_address").notNull(),
  shippingCity: text("shipping_city").notNull(),
  shippingState: text("shipping_state"),
  shippingZip: text("shipping_zip").notNull(),
  shippingCountry: text("shipping_country").notNull().default("BR"),
  
  // Order details
  products: jsonb("products").notNull(), // Array of { productId, quantity, price }
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  shipping: decimal("shipping", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  
  // Payment & Fulfillment
  paymentMethod: text("payment_method").notNull().default("cod"), // 'cod', 'pix', 'credit_card'
  paymentStatus: text("payment_status").notNull().default("pending"), // 'pending', 'paid', 'failed'
  fulfillmentStatus: text("fulfillment_status").notNull().default("pending"), // 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
  
  // Lead reference (if from European Fulfillment)
  fulfillmentLeadId: text("fulfillment_lead_id"),
  fulfillmentProviderCode: text("fulfillment_provider_code"),
  
  // Shopify sync
  shopifyOrderId: text("shopify_order_id"),
  shopifyOrderNumber: text("shopify_order_number"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
}, (table) => {
  return {
    operationIdx: index().on(table.operationId),
    statusIdx: index().on(table.fulfillmentStatus),
    createdIdx: index().on(table.createdAt),
  };
});

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Basic info
  name: text("name").notNull(),
  description: text("description"),
  sku: text("sku").unique(),
  
  // Pricing
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  
  // Inventory
  stockQuantity: integer("stock_quantity").default(0),
  trackInventory: boolean("track_inventory").default(true),
  
  // Media
  images: jsonb("images"), // Array of image URLs
  
  // Relationships
  storeId: varchar("store_id").notNull().references(() => stores.id),
  supplierId: varchar("supplier_id").references(() => users.id), // User with role 'supplier'
  
  // Shopify sync
  shopifyProductId: text("shopify_product_id"),
  shopifyVariantId: text("shopify_variant_id"),
  
  // Status
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    storeIdx: index().on(table.storeId),
    supplierIdx: index().on(table.supplierId),
  };
});

// User products (custom product linking)
export const userProducts = pgTable("user_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  sku: text("sku").notNull(),
  customCostPrice: decimal("custom_cost_price", { precision: 10, scale: 2 }),
  customShippingCost: decimal("custom_shipping_cost", { precision: 10, scale: 2 }),
  customHandlingFee: decimal("custom_handling_fee", { precision: 10, scale: 2 }),
  linkedAt: timestamp("linked_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

// Marketplace products
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
  status: text("status").notNull().default("active"),
  specs: jsonb("specs").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// Product operation links
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

// Announcements
export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull().default("update"),
  imageUrl: text("image_url"),
  publishedAt: timestamp("published_at").defaultNow(),
  isPinned: boolean("is_pinned").default(false),
  audience: text("audience").notNull().default("all"),
  roleTarget: text("role_target"),
  operationId: varchar("operation_id").references(() => operations.id),
  ctaLabel: text("cta_label"),
  ctaUrl: text("cta_url"),
  status: text("status").notNull().default("published"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Metrics table for dashboard
export const metrics = pgTable("metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operationId: varchar("operation_id").notNull().references(() => operations.id),
  
  date: timestamp("date").notNull(),
  
  // Sales metrics
  revenue: decimal("revenue", { precision: 10, scale: 2 }).notNull().default("0"),
  orders: integer("orders").notNull().default(0),
  averageOrderValue: decimal("average_order_value", { precision: 10, scale: 2 }).notNull().default("0"),
  
  // Conversion metrics
  visitors: integer("visitors").default(0),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }).default("0"),
  
  // Fulfillment metrics
  ordersShipped: integer("orders_shipped").default(0),
  ordersDelivered: integer("orders_delivered").default(0),
  ordersCancelled: integer("orders_cancelled").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    operationDateIdx: index().on(table.operationId, table.date),
  };
});

// Shipping Providers (European Fulfillment instances)
export const shippingProviders = pgTable("shipping_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull().unique(), // 'n1_warehouse_1', 'n1_warehouse_2', etc.
  
  // API Configuration
  apiBaseUrl: text("api_base_url").notNull(),
  apiUsername: text("api_username").notNull(),
  apiPassword: text("api_password").notNull(),
  
  // Instance details
  warehouseLocation: text("warehouse_location"), // 'Spain', 'Portugal', etc.
  supportedCountries: jsonb("supported_countries"), // Array of country codes
  
  // Status
  isActive: boolean("is_active").default(true),
  
  // Shopify Location
  shopifyLocationId: text("shopify_location_id"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Fulfillment Leads (track requests to European Fulfillment API)
export const fulfillmentLeads = pgTable("fulfillment_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Provider reference
  providerId: varchar("provider_id").notNull().references(() => shippingProviders.id),
  
  // European Fulfillment Lead ID
  externalLeadId: text("external_lead_id"), // Lead ID returned by their API
  
  // Customer info
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  
  // Address
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state"),
  zip: text("zip").notNull(),
  country: text("country").notNull(),
  
  // Products (array of product codes and quantities)
  products: jsonb("products").notNull(),
  
  // Lead status from European Fulfillment
  status: text("status").notNull().default("pending"), // pending, confirmed, shipped, delivered, cancelled
  trackingNumber: text("tracking_number"),
  
  // N1 Order reference
  orderId: varchar("order_id").references(() => orders.id),
  
  // Sync info
  lastSyncedAt: timestamp("last_synced_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    providerIdx: index().on(table.providerId),
    orderIdx: index().on(table.orderId),
    statusIdx: index().on(table.status),
  };
});

// Fulfillment Products (master list from European Fulfillment)
export const fulfillmentProducts = pgTable("fulfillment_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Provider reference
  providerId: varchar("provider_id").notNull().references(() => shippingProviders.id),
  
  // Product info from European Fulfillment
  externalProductCode: text("external_product_code").notNull(), // Their product code
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }),
  
  // Stock info
  stockQuantity: integer("stock_quantity").default(0),
  isAvailable: boolean("is_available").default(true),
  
  // Mapping to N1 products
  n1ProductId: varchar("n1_product_id").references(() => products.id),
  
  // Last sync
  lastSyncedAt: timestamp("last_synced_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    providerCodeIdx: unique().on(table.providerId, table.externalProductCode),
  };
});

// Investment System Tables

// Investment Pools (shared investment pools)
export const investmentPools = pgTable("investment_pools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Basic info
  name: text("name").notNull(),
  description: text("description"),
  targetAmount: decimal("target_amount", { precision: 12, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  minimumInvestment: decimal("minimum_investment", { precision: 12, scale: 2 }).notNull(),
  
  // Status
  status: text("status").notNull().default("open"), // 'open', 'closed', 'active', 'completed'
  
  // Returns configuration
  expectedReturnPercentage: decimal("expected_return_percentage", { precision: 5, scale: 2 }),
  returnPeriodMonths: integer("return_period_months"),
  
  // Associated operation (optional - pool can be for general investment)
  operationId: varchar("operation_id").references(() => operations.id),
  
  // Timestamps
  openedAt: timestamp("opened_at").defaultNow(),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Investor Profiles (extended user info for investors)
export const investorProfiles = pgTable("investor_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  
  // KYC info
  fullName: text("full_name").notNull(),
  cpf: text("cpf"),
  phone: text("phone"),
  
  // Banking
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  
  // Investment preferences
  riskTolerance: text("risk_tolerance"), // 'low', 'medium', 'high'
  investmentGoals: text("investment_goals"),
  
  // Status
  isVerified: boolean("is_verified").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Investments (individual investments in pools)
export const investments = pgTable("investments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // References
  poolId: varchar("pool_id").notNull().references(() => investmentPools.id, { onDelete: 'cascade' }),
  investorId: varchar("investor_id").notNull().references(() => investorProfiles.id, { onDelete: 'cascade' }),
  
  // Investment details
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'confirmed', 'active', 'completed', 'cancelled'
  
  // Payment
  paymentMethod: text("payment_method"),
  paymentReference: text("payment_reference"),
  paidAt: timestamp("paid_at"),
  
  // Returns
  expectedReturn: decimal("expected_return", { precision: 12, scale: 2 }),
  actualReturn: decimal("actual_return", { precision: 12, scale: 2 }).default("0"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => {
  return {
    poolIdx: index().on(table.poolId),
    investorIdx: index().on(table.investorId),
  };
});

// Investment Transactions (track all financial movements)
export const investmentTransactions = pgTable("investment_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // References
  investmentId: varchar("investment_id").notNull().references(() => investments.id, { onDelete: 'cascade' }),
  
  // Transaction details
  type: text("type").notNull(), // 'deposit', 'return', 'withdrawal', 'fee'
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  
  // Status
  status: text("status").notNull().default("pending"), // 'pending', 'completed', 'failed'
  
  // Processing
  processedAt: timestamp("processed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    investmentIdx: index().on(table.investmentId),
  };
});

// Investment Performance History (track pool performance over time)
export const investmentPerformanceHistory = pgTable("investment_performance_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  poolId: varchar("pool_id").notNull().references(() => investmentPools.id, { onDelete: 'cascade' }),
  
  // Snapshot data
  date: timestamp("date").notNull(),
  totalValue: decimal("total_value", { precision: 12, scale: 2 }).notNull(),
  returnPercentage: decimal("return_percentage", { precision: 5, scale: 2 }).notNull(),
  
  // Metrics
  activeInvestors: integer("active_investors").notNull().default(0),
  totalReturnsDistributed: decimal("total_returns_distributed", { precision: 12, scale: 2 }).default("0"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    poolDateIdx: index().on(table.poolId, table.date),
  };
});

// Facebook Ads Integration Tables

// Facebook Business Managers
export const facebookBusinessManagers = pgTable("facebook_business_managers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessManagerId: varchar("business_manager_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  accessToken: text("access_token"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Facebook Ad Accounts
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
  
  // Tracking
  firstResponseAt: timestamp("first_response_at"),
  lastActivityAt: timestamp("last_activity_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const supportResponses = pgTable("support_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  categoryId: varchar("category_id").notNull().references(() => supportCategories.id),
  
  // Response template
  title: text("title").notNull(),
  responseText: text("response_text").notNull(), // Plain text response
  responseHtml: text("response_html"), // HTML formatted response
  
  // Usage
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  
  // Status
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const supportTicketMessages = pgTable("support_ticket_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  ticketId: varchar("ticket_id").notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),
  
  // Message details
  from: text("from").notNull(), // Email address
  to: text("to").notNull(),
  subject: text("subject"),
  textContent: text("text_content"),
  htmlContent: text("html_content"),
  
  // Type
  messageType: text("message_type").notNull().default("reply"), // 'initial', 'reply', 'internal_note', 'automated'
  
  // Sender info
  sentByUserId: varchar("sent_by_user_id").references(() => users.id),
  isFromCustomer: boolean("is_from_customer").default(false),
  
  // Email metadata
  messageId: text("message_id").unique(),
  inReplyTo: text("in_reply_to"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    ticketIdx: index().on(table.ticketId),
  };
});

// Sofia Virtual Agent Tables

// Sofia Conversations (outbound call sessions)
export const sofiaConversations = pgTable("sofia_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Customer info
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  
  // Call details
  callSid: text("call_sid"), // Telnyx call SID
  callStatus: text("call_status").notNull().default("initiated"), // 'initiated', 'in_progress', 'completed', 'failed', 'no_answer'
  callDuration: integer("call_duration"), // Duration in seconds
  
  // Conversation context
  orderId: varchar("order_id").references(() => orders.id),
  supportTicketId: varchar("support_ticket_id").references(() => supportTickets.id),
  conversationPurpose: text("conversation_purpose").notNull(), // 'order_confirmation', 'delivery_update', 'support_followup', 'feedback'
  
  // AI Analysis
  emotionalContext: jsonb("emotional_context"), // Detected emotion, urgency, sentiment
  conversationSummary: text("conversation_summary"),
  keyTopics: jsonb("key_topics"), // Array of detected topics
  actionItems: jsonb("action_items"), // Array of actions to take
  
  // Transcript
  fullTranscript: text("full_transcript"),
  
  // Outcomes
  wasSuccessful: boolean("was_successful"),
  needsHumanFollowup: boolean("needs_human_followup").default(false),
  
  // Timestamps
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    orderIdx: index().on(table.orderId),
    ticketIdx: index().on(table.supportTicketId),
    statusIdx: index().on(table.callStatus),
  };
});

// Sofia Conversation Messages (individual exchanges during call)
export const sofiaConversationMessages = pgTable("sofia_conversation_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  conversationId: varchar("conversation_id").notNull().references(() => sofiaConversations.id, { onDelete: 'cascade' }),
  
  // Message details
  speaker: text("speaker").notNull(), // 'sofia', 'customer'
  message: text("message").notNull(),
  
  // Timing
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  
  // Recognition metadata (for customer speech)
  confidence: decimal("confidence", { precision: 3, scale: 2 }), // 0.00 - 1.00
  language: text("language").default("pt-BR"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    conversationIdx: index().on(table.conversationId),
  };
});

// Intelligent Refund System Tables

// Intelligent Refund Requests
export const intelligentRefundRequests = pgTable("intelligent_refund_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Customer & Order
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name"),
  orderId: varchar("order_id").references(() => orders.id),
  orderNumber: text("order_number"),
  
  // Refund details
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }).notNull(),
  refundReason: text("refund_reason").notNull(),
  
  // AI Engagement
  engagementStage: text("engagement_stage").notNull().default("initial"), // 'initial', 'alternative_offered', 'discount_offered', 'final_offer', 'approved', 'declined'
  retentionAttempts: integer("retention_attempts").default(0),
  
  // Communication
  lastAiResponse: text("last_ai_response"),
  lastCustomerMessage: text("last_customer_message"),
  conversationHistory: jsonb("conversation_history"), // Array of exchanges
  
  // Keywords & Sentiment
  hasCriticalKeywords: boolean("has_critical_keywords").default(false),
  criticalKeywords: jsonb("critical_keywords"), // Array of detected critical words
  sentiment: text("sentiment"), // 'positive', 'neutral', 'negative', 'frustrated', 'angry'
  urgencyLevel: integer("urgency_level").default(0), // 0-10
  
  // Offers made
  alternativeProductOffered: text("alternative_product_offered"),
  discountOffered: decimal("discount_offered", { precision: 10, scale: 2 }),
  
  // Decision
  status: text("status").notNull().default("pending"), // 'pending', 'retained', 'refunded', 'escalated', 'abandoned'
  finalDecision: text("final_decision"),
  decisionReason: text("decision_reason"),
  
  // Timestamps
  requestedAt: timestamp("requested_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    orderIdx: index().on(table.orderId),
    statusIdx: index().on(table.status),
    emailIdx: index().on(table.customerEmail),
  };
});

// Affiliate Program Tables

// Affiliate Profiles
export const affiliateProfiles = pgTable("affiliate_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  
  // Profile info
  businessName: text("business_name"),
  website: text("website"),
  socialMedia: jsonb("social_media"), // { instagram, tiktok, youtube, etc }
  
  // Payment info
  pixKey: text("pix_key"),
  bankAccount: text("bank_account"),
  
  // Status
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'active', 'suspended'
  approvedAt: timestamp("approved_at"),
  
  // Stats
  totalEarnings: decimal("total_earnings", { precision: 12, scale: 2 }).default("0"),
  totalClicks: integer("total_clicks").default(0),
  totalConversions: integer("total_conversions").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Affiliate Memberships (many-to-many: affiliates can promote multiple products)
export const affiliateMemberships = pgTable("affiliate_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliateProfiles.id, { onDelete: 'cascade' }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  
  // Commission configuration
  commissionType: text("commission_type").notNull().default("percentage"), // 'percentage', 'fixed'
  commissionValue: decimal("commission_value", { precision: 10, scale: 2 }).notNull(),
  
  // Status
  status: text("status").notNull().default("active"), // 'active', 'paused', 'terminated'
  
  // Stats
  clicks: integer("clicks").default(0),
  conversions: integer("conversions").default(0),
  earnings: decimal("earnings", { precision: 12, scale: 2 }).default("0"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    affiliateIdx: index().on(table.affiliateId),
    productIdx: index().on(table.productId),
    uniqueMembership: unique().on(table.affiliateId, table.productId),
  };
});

// Affiliate Conversions (track successful sales)
export const affiliateConversions = pgTable("affiliate_conversions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliateProfiles.id, { onDelete: 'cascade' }),
  membershipId: varchar("membership_id").notNull().references(() => affiliateMemberships.id, { onDelete: 'cascade' }),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  clickId: varchar("click_id").references((): AnyPgColumn => affiliateClicks.id), // Track which click led to conversion
  
  // Conversion details
  orderValue: decimal("order_value", { precision: 10, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  
  // Status
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'paid', 'rejected'
  
  // Payment
  payoutId: varchar("payout_id"),
  paidAt: timestamp("paid_at"),
  
  convertedAt: timestamp("converted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    affiliateIdx: index().on(table.affiliateId),
    orderIdx: index().on(table.orderId),
  };
});

// Affiliate Commission Rules (global commission rules)
export const affiliateCommissionRules = pgTable("affiliate_commission_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Rule details
  name: text("name").notNull(),
  description: text("description"),
  
  // Commission
  commissionType: text("commission_type").notNull().default("percentage"), // 'percentage', 'fixed', 'tiered'
  commissionValue: decimal("commission_value", { precision: 10, scale: 2 }).notNull(),
  
  // Conditions
  minOrderValue: decimal("min_order_value", { precision: 10, scale: 2 }),
  maxOrderValue: decimal("max_order_value", { precision: 10, scale: 2 }),
  productIds: jsonb("product_ids"), // Array of product IDs (null = all products)
  
  // Status
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(0), // Higher priority rules are evaluated first
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Affiliate Payouts (bulk payouts to affiliates)
export const affiliatePayouts = pgTable("affiliate_payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliateProfiles.id, { onDelete: 'cascade' }),
  
  // Payout details
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("BRL"),
  
  // Payment method
  paymentMethod: text("payment_method").notNull(), // 'pix', 'bank_transfer', 'paypal'
  paymentReference: text("payment_reference"), // Transaction ID, receipt number, etc
  
  // Period
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  
  // Conversions included
  conversionIds: jsonb("conversion_ids").notNull(), // Array of conversion IDs
  
  // Status
  status: text("status").notNull().default("pending"), // 'pending', 'processing', 'completed', 'failed'
  
  // Timestamps
  processedAt: timestamp("processed_at"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    affiliateIdx: index().on(table.affiliateId),
  };
});

// Affiliate Clicks (track all clicks on affiliate links)
export const affiliateClicks = pgTable("affiliate_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliateProfiles.id, { onDelete: 'cascade' }),
  membershipId: varchar("membership_id").references(() => affiliateMemberships.id, { onDelete: 'cascade' }),
  landingPageId: varchar("landing_page_id"),
  
  // Click metadata
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  landingUrl: text("landing_url"),
  
  // Tracking token (JWT)
  trackingToken: text("tracking_token").notNull().unique(),
  
  // Conversion tracking
  convertedAt: timestamp("converted_at"),
  orderId: varchar("order_id").references(() => orders.id),
  
  clickedAt: timestamp("clicked_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    affiliateIdx: index().on(table.affiliateId),
    tokenIdx: index().on(table.trackingToken),
  };
});

// Affiliate Landing Page Deployment Configuration
export const affiliateLandingDeploymentConfig = pgTable("affiliate_landing_deployment_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Vercel integration
  vercelTeamId: text("vercel_team_id").notNull(),
  vercelAccessToken: text("vercel_access_token").notNull(),
  
  // Project configuration
  vercelProjectName: text("vercel_project_name").notNull(), // Single project name for all landing pages
  vercelProjectId: text("vercel_project_id"), // Will be set after first deployment
  
  // Domain configuration
  baseDomain: text("base_domain"), // e.g., "n1hub-pages.vercel.app" (optional custom domain)
  
  // Status
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Affiliate Landing Pages (HTML/CSS/JS pages for affiliates)
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
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    affiliateIdx: index().on(table.affiliateId),
    productIdx: index().on(table.productId),
  };
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertStoreSchema = createInsertSchema(stores);
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = typeof stores.$inferSelect;

export const insertOperationSchema = createInsertSchema(operations);
export type InsertOperation = z.infer<typeof insertOperationSchema>;
export type Operation = typeof operations.$inferSelect;

export const insertOrderSchema = createInsertSchema(orders);
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export const insertProductSchema = createInsertSchema(products);
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export const insertMetricSchema = createInsertSchema(metrics);
export type InsertMetric = z.infer<typeof insertMetricSchema>;
export type Metric = typeof metrics.$inferSelect;

export const insertShippingProviderSchema = createInsertSchema(shippingProviders);
export type InsertShippingProvider = z.infer<typeof insertShippingProviderSchema>;
export type ShippingProvider = typeof shippingProviders.$inferSelect;

export const insertFulfillmentLeadSchema = createInsertSchema(fulfillmentLeads);
export type InsertFulfillmentLead = z.infer<typeof insertFulfillmentLeadSchema>;
export type FulfillmentLead = typeof fulfillmentLeads.$inferSelect;

export const insertFulfillmentProductSchema = createInsertSchema(fulfillmentProducts);
export type InsertFulfillmentProduct = z.infer<typeof insertFulfillmentProductSchema>;
export type FulfillmentProduct = typeof fulfillmentProducts.$inferSelect;

export const insertInvestmentPoolSchema = createInsertSchema(investmentPools).omit({ currentAmount: true });
export type InsertInvestmentPool = z.infer<typeof insertInvestmentPoolSchema>;
export type InvestmentPool = typeof investmentPools.$inferSelect;

export const insertInvestorProfileSchema = createInsertSchema(investorProfiles);
export type InsertInvestorProfile = z.infer<typeof insertInvestorProfileSchema>;
export type InvestorProfile = typeof investorProfiles.$inferSelect;

export const insertInvestmentSchema = createInsertSchema(investments).omit({ actualReturn: true });
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type Investment = typeof investments.$inferSelect;

export const insertAffiliateProfileSchema = createInsertSchema(affiliateProfiles).omit({
  totalEarnings: true,
  totalClicks: true,
  totalConversions: true,
});
export type InsertAffiliateProfile = z.infer<typeof insertAffiliateProfileSchema>;
export type AffiliateProfile = typeof affiliateProfiles.$inferSelect;

export const insertAffiliateMembershipSchema = createInsertSchema(affiliateMemberships).omit({
  clicks: true,
  conversions: true,
  earnings: true,
});
export type InsertAffiliateMembership = z.infer<typeof insertAffiliateMembershipSchema>;
export type AffiliateMembership = typeof affiliateMemberships.$inferSelect;

export const insertAffiliateConversionSchema = createInsertSchema(affiliateConversions);
export type InsertAffiliateConversion = z.infer<typeof insertAffiliateConversionSchema>;
export type AffiliateConversion = typeof affiliateConversions.$inferSelect;

export const insertAffiliateClickSchema = createInsertSchema(affiliateClicks);
export type InsertAffiliateClick = z.infer<typeof insertAffiliateClickSchema>;
export type AffiliateClick = typeof affiliateClicks.$inferSelect;

export const insertAffiliateLandingPageSchema = createInsertSchema(affiliateLandingPages);
export type InsertAffiliateLandingPage = z.infer<typeof insertAffiliateLandingPageSchema>;
export type AffiliateLandingPage = typeof affiliateLandingPages.$inferSelect;

// Support schemas
export const insertSupportCategorySchema = createInsertSchema(supportCategories);
export type InsertSupportCategory = z.infer<typeof insertSupportCategorySchema>;
export type SupportCategory = typeof supportCategories.$inferSelect;

export const insertSupportEmailSchema = createInsertSchema(supportEmails);
export type InsertSupportEmail = z.infer<typeof insertSupportEmailSchema>;
export type SupportEmail = typeof supportEmails.$inferSelect;

export const insertSupportTicketSchema = createInsertSchema(supportTickets);
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

export const insertSupportResponseSchema = createInsertSchema(supportResponses).omit({ usageCount: true });
export type InsertSupportResponse = z.infer<typeof insertSupportResponseSchema>;
export type SupportResponse = typeof supportResponses.$inferSelect;

// Sofia schemas
export const insertSofiaConversationSchema = createInsertSchema(sofiaConversations);
export type InsertSofiaConversation = z.infer<typeof insertSofiaConversationSchema>;
export type SofiaConversation = typeof sofiaConversations.$inferSelect;

export const insertSofiaConversationMessageSchema = createInsertSchema(sofiaConversationMessages);
export type InsertSofiaConversationMessage = z.infer<typeof insertSofiaConversationMessageSchema>;
export type SofiaConversationMessage = typeof sofiaConversationMessages.$inferSelect;

// Intelligent Refund schemas
export const insertIntelligentRefundRequestSchema = createInsertSchema(intelligentRefundRequests).omit({ retentionAttempts: true, urgencyLevel: true });
export type InsertIntelligentRefundRequest = z.infer<typeof insertIntelligentRefundRequestSchema>;
export type IntelligentRefundRequest = typeof intelligentRefundRequests.$inferSelect;

// Campaign Analytics - Additional Types
export type CampaignAnalytics = {
  clicks: number;
  impressions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  conversionValue: number;
  costPerConversion: number;
  roas: number;
};

export type AdSetAnalytics = CampaignAnalytics & {
  adSetId: string;
  adSetName: string;
};

export type AdAnalytics = CampaignAnalytics & {
  adId: string;
  adName: string;
};

// Analytics & Creative Performance
export type AnalyticsDataPoint = {
  date: string;
  value: number;
};

// Creative Intelligence Types
export type CreativeMetrics = {
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  conversions: number;
  cpc: number;
  cpm: number;
  roas: number;
};

export type CreativeInsight = {
  category: 'headline' | 'visual' | 'cta' | 'targeting' | 'performance' | 'opportunity';
  severity: 'positive' | 'neutral' | 'warning' | 'critical';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  recommendation?: string;
};

export type CreativeRecommendation = {
  type: 'headline' | 'visual' | 'cta' | 'copy' | 'targeting' | 'budget';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: string;
  implementation: string;
};

export type CreativeVariant = {
  id: string;
  name: string;
  type: 'headline' | 'description' | 'cta' | 'visual';
  content: string;
  rationale: string;
  expectedImprovement: string;
};

export type CreativeAnalysis = {
  adId: string;
  adName: string;
  insights: CreativeInsight[];
  recommendations: CreativeRecommendation[];
  variants: CreativeVariant[];
  summary: {
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
  };
  metrics: CreativeMetrics;
};

// Page Builder V2 Types for Visual Editor

// Color Palette - For brand consistency
export type ColorPalette = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  muted: string;
  destructive: string;
  success: string;
  warning: string;
};

// Typography Scale
export type TypographyScale = {
  fontFamily: {
    heading: string;
    body: string;
    mono: string;
  };
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
  fontWeight: {
    light: string;
    normal: string;
    medium: string;
    semibold: string;
    bold: string;
  };
  lineHeight: {
    tight: string;
    normal: string;
    relaxed: string;
  };
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
    
    // Size
    minHeight?: string;
    maxWidth?: string;
    
    // Layout
    display?: 'block' | 'flex' | 'grid';
    flexDirection?: 'row' | 'column';
    justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
    alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
    gap?: string;
    
    [key: string]: any;
  };
  settings?: {
    containerWidth?: 'full' | 'container' | 'narrow';
    textAlign?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'center' | 'bottom';
  };
};

// Complete page model with metadata
export type PageModelV2 = {
  version: '2.0';
  meta: {
    title: string;
    description: string;
    keywords: string[];
  };
  theme: {
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    fontFamily?: string;
  };
  sections: BlockSection[];
  
  // Original HTML content (for bidirectional conversion)
  htmlContent?: string;
  cssContent?: string;
  jsContent?: string;
};

// Creative Asset Bundle (AI-generated landing page assets)
export type GeneratedAssetBundle = {
  // Hero/header images
  hero: {
    desktopUrl: string;
    mobileUrl?: string;
    alt: string;
  };
  
  // Product/feature images
  features: Array<{
    url: string;
    alt: string;
    title: string;
  }>;
  
  // Icons (SVG URLs or data URIs)
  icons: Array<{
    name: string;
    url: string;
    category: 'feature' | 'social' | 'ui';
  }>;
  
  // Logo variations
  logos: {
    primary: string;
    secondary?: string;
    icon?: string;
  };
  
  // Background patterns/textures
  backgrounds: Array<{
    url: string;
    usage: 'hero' | 'section' | 'card';
  }>;
  
  // Social proof assets (testimonial avatars, company logos)
  socialProof: Array<{
    type: 'avatar' | 'company_logo';
    url: string;
    name: string;
  }>;
};

// Design Token System
export type StyleTokens = {
  // Color system with semantic meaning
  colors: {
    // Primary brand colors
    primary: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string; // Base
      600: string;
      700: string;
      800: string;
      900: string;
    };
    
    // Semantic colors
    semantic: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
    
    // Neutral/grayscale
    neutral: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
      950: string;
    };
  };
  
  // Typography scale
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
    fontWeights: {
      light: number;
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
      extrabold: number;
    };
    lineHeights: {
      none: string;
      tight: string;
      snug: string;
      normal: string;
      relaxed: string;
      loose: string;
    };
    letterSpacings: {
      tighter: string;
      tight: string;
      normal: string;
      wide: string;
      wider: string;
      widest: string;
    };
  };
  
  // Spacing scale (for margin, padding, gap)
  spacing: {
    0: string;
    px: string;
    0.5: string;
    1: string;
    1.5: string;
    2: string;
    2.5: string;
    3: string;
    3.5: string;
    4: string;
    5: string;
    6: string;
    7: string;
    8: string;
    9: string;
    10: string;
    11: string;
    12: string;
    14: string;
    16: string;
    20: string;
    24: string;
    28: string;
    32: string;
    36: string;
    40: string;
    44: string;
    48: string;
    52: string;
    56: string;
    60: string;
    64: string;
    72: string;
    80: string;
    96: string;
  };
  
  // Shadow scale
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

// ============================================
// PAGE MODEL V3 - PROFESSIONAL VISUAL EDITOR
// ============================================

/**
 * Responsive Styles - Styles for different breakpoints
 */
export type ResponsiveStylesV3 = {
  mobile?: CSSPropertiesV3;
  tablet?: CSSPropertiesV3;
  desktop?: CSSPropertiesV3;
};

/**
 * State Styles - Styles for different interaction states
 */
export type StateStylesV3 = {
  default: CSSPropertiesV3;
  hover?: CSSPropertiesV3;
  focus?: CSSPropertiesV3;
  active?: CSSPropertiesV3;
  disabled?: CSSPropertiesV3;
  visited?: CSSPropertiesV3; // For links
};

/**
 * Pseudo Elements - Styles for ::before and ::after
 */
export type PseudoElementsV3 = {
  before?: {
    content: string;
    styles: ResponsiveStylesV3;
  };
  after?: {
    content: string;
    styles: ResponsiveStylesV3;
  };
};

/**
 * Animation - Keyframes and transitions
 */
export type AnimationV3 = {
  id: string;
  name: string;
  type: 'keyframe' | 'transition';
  
  // For keyframes
  keyframes?: Array<{
    offset: number; // 0-100 (percentage)
    styles: CSSPropertiesV3;
  }>;
  
  // For transitions
  transition?: {
    property: string; // 'all', 'opacity', 'transform', etc
    duration: string; // '0.3s', '500ms'
    timingFunction: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | string;
    delay?: string;
  };
  
  // Common
  duration?: string;
  iterationCount?: number | 'infinite';
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
  playState?: 'running' | 'paused';
};

/**
 * Extended CSS Properties with all modern CSS features
 */
export type CSSPropertiesV3 = {
  // Typography
  fontSize?: string;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  lineHeight?: string | number;
  letterSpacing?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify' | 'start' | 'end';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textDecoration?: string;
  color?: string;
  
  // Spacing
  padding?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  margin?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  
  // Background
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  backgroundAttachment?: string;
  backgroundClip?: string;
  backgroundOrigin?: string;
  background?: string; // Shorthand
  
  // Borders
  border?: string;
  borderWidth?: string;
  borderStyle?: string;
  borderColor?: string;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
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
  
  // Display & Position
  display?: string;
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  zIndex?: number | string;
  
  // Flexbox
  flexDirection?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  flexFlow?: string;
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'baseline' | 'stretch';
  alignContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'stretch';
  flex?: string;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string;
  alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'baseline' | 'stretch';
  order?: number;
  gap?: string;
  rowGap?: string;
  columnGap?: string;
  
  // Grid
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridTemplateAreas?: string;
  gridTemplate?: string;
  gridAutoColumns?: string;
  gridAutoRows?: string;
  gridAutoFlow?: 'row' | 'column' | 'dense' | 'row dense' | 'column dense';
  gridColumn?: string;
  gridRow?: string;
  gridArea?: string;
  gridColumnStart?: string | number;
  gridColumnEnd?: string | number;
  gridRowStart?: string | number;
  gridRowEnd?: string | number;
  
  // Visual Effects
  opacity?: number | string;
  boxShadow?: string;
  textShadow?: string;
  filter?: string;
  backdropFilter?: string;
  transform?: string;
  transformOrigin?: string;
  transformStyle?: 'flat' | 'preserve-3d';
  perspective?: string;
  perspectiveOrigin?: string;
  
  // Overflow & Visibility
  overflow?: string;
  overflowX?: string;
  overflowY?: string;
  visibility?: 'visible' | 'hidden' | 'collapse';
  cursor?: string;
  pointerEvents?: 'auto' | 'none';
  
  // Transitions & Animations
  transition?: string;
  transitionProperty?: string;
  transitionDuration?: string;
  transitionTimingFunction?: string;
  transitionDelay?: string;
  animation?: string;
  animationName?: string;
  animationDuration?: string;
  animationTimingFunction?: string;
  animationDelay?: string;
  animationIterationCount?: string | number;
  animationDirection?: string;
  animationFillMode?: string;
  animationPlayState?: string;
  
  // Allow any other CSS property
  [key: string]: any;
};

/**
 * Layout Type - Determines how the element is positioned
 */
export type LayoutTypeV3 = 'flex' | 'grid' | 'block' | 'inline' | 'inline-block' | 'absolute' | 'relative' | 'fixed' | 'sticky';

/**
 * Semantic HTML Tag - For better SEO and accessibility
 */
export type SemanticTagV3 = 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer' | 'nav' | 'main' | 'figure';

/**
 * Block Element V3 - Complete element definition
 */
export type BlockElementV3 = {
  id: string;
  
  // Element type
  type: 'heading' | 'text' | 'button' | 'image' | 'video' | 'container' | 'spacer' | 'divider' | 'form' | 'input' | 'embed' | 'custom';
  
  // Props (element-specific configuration)
  props: {
    // For heading
    level?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    
    // For links/buttons
    href?: string;
    target?: '_self' | '_blank' | '_parent' | '_top';
    rel?: string;
    
    // For images/videos
    src?: string;
    alt?: string;
    srcset?: string;
    sizes?: string;
    loading?: 'lazy' | 'eager';
    
    // For forms
    name?: string;
    placeholder?: string;
    required?: boolean;
    type?: string;
    value?: string;
    
    // Custom attributes
    [key: string]: any;
  };
  
  // Styles (responsive + states)
  styles: ResponsiveStylesV3;
  states?: StateStylesV3;
  pseudoElements?: PseudoElementsV3;
  
  // Layout configuration
  layout?: LayoutTypeV3;
  semanticTag?: SemanticTagV3;
  
  // Content
  content?: {
    text?: string;
    html?: string;
    lexicalState?: any; // Rich text editor state
    [key: string]: any;
  };
  
  // Animations
  animations?: AnimationV3[];
  
  // Component reference (if this is a component instance)
  componentRef?: string;
  componentOverrides?: Record<string, any>;
  
  // Children (for container elements)
  children?: BlockElementV3[];
  
  // Metadata
  locked?: boolean;
  hidden?: boolean;
  name?: string; // User-defined name for layers panel
};

/**
 * Block Column V3
 */
export type BlockColumnV3 = {
  id: string;
  width: string; // '1/2', '1/3', '2/3', '1/4', '3/4', 'full', 'auto', or CSS value
  elements: BlockElementV3[];
  styles: ResponsiveStylesV3;
  states?: StateStylesV3;
};

/**
 * Block Row V3
 */
export type BlockRowV3 = {
  id: string;
  columns: BlockColumnV3[];
  styles: ResponsiveStylesV3;
  states?: StateStylesV3;
  layout?: 'flex' | 'grid';
};

/**
 * Block Section V3
 */
export type BlockSectionV3 = {
  id: string;
  type: 'hero' | 'content' | 'cta' | 'benefits' | 'testimonials' | 'faq' | 'checkout' | 'custom';
  name: string;
  rows: BlockRowV3[];
  styles: ResponsiveStylesV3;
  states?: StateStylesV3;
  settings?: {
    containerWidth?: 'full' | 'container' | 'narrow' | string;
    textAlign?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'center' | 'bottom';
  };
  semanticTag?: SemanticTagV3;
};

/**
 * Design Tokens V3 - Reusable design values
 */
export type DesignTokensV3 = {
  colors: {
    primary: Record<string, string>; // { 50: '#...', 100: '#...', ... }
    secondary: Record<string, string>;
    neutral: Record<string, string>;
    semantic: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
    custom: Record<string, string>; // User-defined colors
  };
  
  typography: {
    fontFamilies: Record<string, string>;
    fontSizes: Record<string, string>;
    fontWeights: Record<string, number>;
    lineHeights: Record<string, string>;
    letterSpacings: Record<string, string>;
  };
  
  spacing: Record<string, string>;
  shadows: Record<string, string>;
  borderRadius: Record<string, string>;
  
  breakpoints: {
    mobile: string; // e.g., '768px'
    tablet: string; // e.g., '1024px'
    desktop: string; // e.g., '1280px'
  };
};

/**
 * Component Definition - Reusable component
 */
export type ComponentDefinitionV3 = {
  id: string;
  name: string;
  description?: string;
  category: 'button' | 'card' | 'header' | 'footer' | 'form' | 'custom';
  
  // The element structure
  element: BlockElementV3;
  
  // Props that can be overridden
  props: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'color' | 'image';
    default: any;
    label: string;
  }>;
  
  // Variants
  variants?: Record<string, {
    label: string;
    overrides: Partial<BlockElementV3>;
  }>;
  
  createdAt: string;
  updatedAt: string;
};

/**
 * Component Instance - Reference to a component with overrides
 */
export type ComponentInstanceV3 = {
  id: string;
  componentId: string;
  overrides: Record<string, any>;
  variantId?: string;
};

/**
 * Page Model V3 - Complete page definition
 */
export type PageModelV3 = {
  version: '3.0';
  
  // Metadata
  meta: {
    title: string;
    description: string;
    keywords: string[];
    ogImage?: string;
    favicon?: string;
  };
  
  // Design system
  designTokens: DesignTokensV3;
  
  // Components library
  components: ComponentDefinitionV3[];
  
  // Page structure
  sections: BlockSectionV3[];
  
  // Global styles
  globalStyles?: {
    body?: CSSPropertiesV3;
    links?: StateStylesV3;
    [selector: string]: any;
  };
  
  // Original HTML content (for bidirectional conversion)
  htmlContent?: string;
  cssContent?: string;
  jsContent?: string;
  
  // Editor state
  editorState?: {
    selectedElementId?: string;
    activeBreakpoint: 'mobile' | 'tablet' | 'desktop';
    zoom: number; // 0.5 = 50%, 1 = 100%, 2 = 200%
  };
  
  // Version control
  createdAt: string;
  updatedAt: string;
};

// Zod schemas for PageModelV3 validation
export const cssPropertiesV3Schema = z.record(z.any());

export const responsiveStylesV3Schema = z.object({
  mobile: cssPropertiesV3Schema.optional(),
  tablet: cssPropertiesV3Schema.optional(),
  desktop: cssPropertiesV3Schema.optional(),
});

export const stateStylesV3Schema = z.object({
  default: cssPropertiesV3Schema,
  hover: cssPropertiesV3Schema.optional(),
  focus: cssPropertiesV3Schema.optional(),
  active: cssPropertiesV3Schema.optional(),
  disabled: cssPropertiesV3Schema.optional(),
  visited: cssPropertiesV3Schema.optional(),
});

export const animationV3Schema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['keyframe', 'transition']),
  keyframes: z.array(z.object({
    offset: z.number().min(0).max(100),
    styles: cssPropertiesV3Schema,
  })).optional(),
  transition: z.object({
    property: z.string(),
    duration: z.string(),
    timingFunction: z.string(),
    delay: z.string().optional(),
  }).optional(),
  duration: z.string().optional(),
  iterationCount: z.union([z.number(), z.literal('infinite')]).optional(),
  direction: z.enum(['normal', 'reverse', 'alternate', 'alternate-reverse']).optional(),
  fillMode: z.enum(['none', 'forwards', 'backwards', 'both']).optional(),
  playState: z.enum(['running', 'paused']).optional(),
});

export const blockElementV3Schema: z.ZodType<BlockElementV3> = z.lazy(() => z.object({
  id: z.string(),
  type: z.enum(['heading', 'text', 'button', 'image', 'video', 'container', 'spacer', 'divider', 'form', 'input', 'embed', 'custom']),
  props: z.record(z.any()),
  styles: responsiveStylesV3Schema,
  states: stateStylesV3Schema.optional(),
  pseudoElements: z.object({
    before: z.object({
      content: z.string(),
      styles: responsiveStylesV3Schema,
    }).optional(),
    after: z.object({
      content: z.string(),
      styles: responsiveStylesV3Schema,
    }).optional(),
  }).optional(),
  layout: z.enum(['flex', 'grid', 'block', 'inline', 'inline-block', 'absolute', 'relative', 'fixed', 'sticky']).optional(),
  semanticTag: z.enum(['div', 'section', 'article', 'aside', 'header', 'footer', 'nav', 'main', 'figure']).optional(),
  content: z.record(z.any()).optional(),
  animations: z.array(animationV3Schema).optional(),
  componentRef: z.string().optional(),
  componentOverrides: z.record(z.any()).optional(),
  children: z.array(blockElementV3Schema).optional(),
  locked: z.boolean().optional(),
  hidden: z.boolean().optional(),
  name: z.string().optional(),
}));

// BlockColumn V3 Schema
export const blockColumnV3Schema = z.object({
  id: z.string(),
  width: z.string(),
  elements: z.array(blockElementV3Schema),
  styles: responsiveStylesV3Schema,
  states: stateStylesV3Schema.optional(),
});

// BlockRow V3 Schema
export const blockRowV3Schema = z.object({
  id: z.string(),
  columns: z.array(blockColumnV3Schema),
  styles: responsiveStylesV3Schema,
  states: stateStylesV3Schema.optional(),
  layout: z.enum(['flex', 'grid']).optional(),
});

// BlockSection V3 Schema
export const blockSectionV3Schema = z.object({
  id: z.string(),
  type: z.enum(['hero', 'content', 'cta', 'benefits', 'testimonials', 'faq', 'checkout', 'custom']),
  name: z.string(),
  rows: z.array(blockRowV3Schema),
  styles: responsiveStylesV3Schema,
  states: stateStylesV3Schema.optional(),
  settings: z.object({
    containerWidth: z.union([z.literal('full'), z.literal('container'), z.literal('narrow'), z.string()]).optional(),
    textAlign: z.enum(['left', 'center', 'right']).optional(),
    verticalAlign: z.enum(['top', 'center', 'bottom']).optional(),
  }).optional(),
  semanticTag: z.enum(['div', 'section', 'article', 'aside', 'header', 'footer', 'nav', 'main', 'figure']).optional(),
});

// ComponentDefinition V3 Schema
export const componentDefinitionV3Schema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.enum(['button', 'card', 'header', 'footer', 'form', 'custom']),
  element: blockElementV3Schema,
  props: z.record(z.object({
    type: z.enum(['string', 'number', 'boolean', 'color', 'image']),
    default: z.any(),
    label: z.string(),
  })),
  variants: z.record(z.object({
    label: z.string(),
    overrides: z.any(), // Partial<BlockElementV3>
  })).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const designTokensV3Schema = z.object({
  colors: z.object({
    primary: z.record(z.string()),
    secondary: z.record(z.string()),
    neutral: z.record(z.string()),
    semantic: z.object({
      success: z.string(),
      warning: z.string(),
      error: z.string(),
      info: z.string(),
    }),
    custom: z.record(z.string()),
  }),
  typography: z.object({
    fontFamilies: z.record(z.string()),
    fontSizes: z.record(z.string()),
    fontWeights: z.record(z.number()),
    lineHeights: z.record(z.string()),
    letterSpacings: z.record(z.string()),
  }),
  spacing: z.record(z.string()),
  shadows: z.record(z.string()),
  borderRadius: z.record(z.string()),
  breakpoints: z.object({
    mobile: z.string(),
    tablet: z.string(),
    desktop: z.string(),
  }),
});

export const pageModelV3Schema = z.object({
  version: z.literal('3.0'),
  meta: z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.array(z.string()),
    ogImage: z.string().optional(),
    favicon: z.string().optional(),
  }),
  designTokens: designTokensV3Schema,
  components: z.array(componentDefinitionV3Schema),
  sections: z.array(blockSectionV3Schema),
  globalStyles: z.record(z.any()).optional(),
  htmlContent: z.string().optional(),
  cssContent: z.string().optional(),
  jsContent: z.string().optional(),
  editorState: z.object({
    selectedElementId: z.string().optional(),
    activeBreakpoint: z.enum(['mobile', 'tablet', 'desktop']),
    zoom: z.number(),
  }).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
