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

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginSchema>;
export type User = typeof users.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type UpdateOrder = z.infer<typeof updateOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type DashboardMetrics = typeof dashboardMetrics.$inferSelect;
