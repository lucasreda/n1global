import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Main orders table - unified for all providers
export const orders = pgTable("orders", {
  id: text("id").primaryKey(), // Lead number from provider (NT-xxxxx, etc)
  
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
  currency: text("currency").default("EUR"),
  
  // Products
  products: jsonb("products"), // Array of products with quantities and prices
  
  // Shipping provider info
  provider: text("provider").notNull(), // 'european_fulfillment', 'correios', 'jadlog'
  providerOrderId: text("provider_order_id"), // Original ID from provider
  trackingNumber: text("tracking_number"),
  
  // Provider specific data stored as JSON
  providerData: jsonb("provider_data"),
  
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

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sku: text("sku").unique().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  lowStock: integer("low_stock").notNull().default(10),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  productUrl: text("product_url"),
  isActive: boolean("is_active").notNull().default(true),
  
  // Provider mapping
  providers: jsonb("providers"), // Maps provider -> provider_product_id
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shipping providers configuration
export const shippingProviders = pgTable("shipping_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  apiUrl: text("api_url").notNull(),
  isActive: boolean("is_active").notNull().default(true),
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
});

export const insertShippingProviderSchema = createInsertSchema(shippingProviders).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginSchema>;
export type User = typeof users.$inferSelect;

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