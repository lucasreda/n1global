import { db } from "./db";
import { users, orders, products, shippingProviders, operations, userOperationAccess, User, Order, Product, ShippingProvider, Operation, InsertUser, InsertOrder, InsertProduct } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Order methods - limited interface for backward compatibility
  getOrders(limit?: number, offset?: number): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<boolean>;

  // Product methods
  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  // Shipping provider methods
  getShippingProviders(): Promise<ShippingProvider[]>;
  getShippingProvider(id: string): Promise<ShippingProvider | undefined>;

  // Operation methods
  getUserOperations(userId: string): Promise<Operation[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0] || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    const result = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
      })
      .returning();
    
    return result[0];
  }

  async getOrders(limit: number = 50, offset: number = 0): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db
      .insert(orders)
      .values(insertOrder)
      .returning();
    
    return order;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    
    return order || undefined;
  }

  async deleteOrder(id: string): Promise<boolean> {
    const result = await db.delete(orders).where(eq(orders.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getProducts(): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .orderBy(desc(products.createdAt));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values(insertProduct)
      .returning();
    
    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    
    return product || undefined;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getShippingProviders(): Promise<ShippingProvider[]> {
    return await db
      .select()
      .from(shippingProviders)
      .orderBy(desc(shippingProviders.createdAt));
  }

  async getShippingProvider(id: string): Promise<ShippingProvider | undefined> {
    const [provider] = await db.select().from(shippingProviders).where(eq(shippingProviders.id, id));
    return provider || undefined;
  }

  async getUserOperations(userId: string): Promise<Operation[]> {
    const userOps = await db
      .select({
        id: operations.id,
        name: operations.name,
        description: operations.description,
        status: operations.status,
        createdAt: operations.createdAt,
        updatedAt: operations.updatedAt,
        storeId: operations.storeId,
        settings: operations.settings,
      })
      .from(operations)
      .innerJoin(userOperationAccess, eq(operations.id, userOperationAccess.operationId))
      .where(eq(userOperationAccess.userId, userId))
      .orderBy(desc(operations.createdAt));
    
    return userOps;
  }
}

export const storage = new DatabaseStorage();