import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: text("customer_id").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("processing"), // processing, paid, refused, cancelled
  shippingProvider: text("shipping_provider").notNull(), // correios, jadlog
  trackingCode: text("tracking_code"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dashboardMetrics = pgTable("dashboard_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull(), // YYYY-MM-DD format
  totalOrders: integer("total_orders").notNull().default(0),
  paidOrders: integer("paid_orders").notNull().default(0),
  refusedOrders: integer("refused_orders").notNull().default(0),
  processingOrders: integer("processing_orders").notNull().default(0),
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).notNull().default("0"),
  successRate: decimal("success_rate", { precision: 5, scale: 2 }).notNull().default("0"),
});

// European Fulfillment Center Integration Tables
export const shippingProviders = pgTable("shipping_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  apiUrl: text("api_url").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fulfillmentLeads = pgTable("fulfillment_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadNumber: text("lead_number").notNull().unique(),
  orderId: varchar("order_id").references(() => orders.id),
  providerId: varchar("provider_id").references(() => shippingProviders.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  province: text("province").notNull(),
  zipcode: text("zipcode").notNull(),
  country: text("country").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentType: text("payment_type").notNull(), // cod, prepaid
  status: text("status").notNull().default("pending"), // pending, sent, delivered, cancelled
  items: text("items").notNull(), // JSON string with SKU and quantities
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  lowStock: integer("low_stock").notNull().default(10),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  productUrl: text("product_url"),
  isActive: boolean("is_active").notNull().default(true),
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

// Order schemas
export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateOrderSchema = createInsertSchema(orders).omit({
  id: true,
  customerId: true,
  customerName: true,
  customerEmail: true,
  createdAt: true,
}).partial();

// Integration schemas
export const insertFulfillmentLeadSchema = createInsertSchema(fulfillmentLeads).omit({
  id: true,
  leadNumber: true,
  createdAt: true,
  updatedAt: true,
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
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type UpdateOrder = z.infer<typeof updateOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type DashboardMetrics = typeof dashboardMetrics.$inferSelect;
export type InsertFulfillmentLead = z.infer<typeof insertFulfillmentLeadSchema>;
export type FulfillmentLead = typeof fulfillmentLeads.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type ShippingProvider = typeof shippingProviders.$inferSelect;
