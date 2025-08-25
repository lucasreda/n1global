import { db } from "./db";
import { users, stores, orders, products, shippingProviders, operations, userOperationAccess, userProducts, User, Order, Product, ShippingProvider, Operation, UserProduct, InsertUser, InsertOrder, InsertProduct, InsertShippingProvider, InsertUserProduct, LinkProductBySku } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
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
  getOrdersByStore(storeId: string): Promise<Order[]>;

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
  
  // Onboarding methods
  updateOnboardingStep(userId: string, stepId: string, completed: boolean): Promise<void>;
  completeOnboarding(userId: string): Promise<void>;
  resetUserOnboarding(userId: string): Promise<void>;
  createOperation(operationData: { name: string; description: string }, userId: string): Promise<Operation>;
  
  // Shipping providers creation
  createShippingProvider(data: InsertShippingProvider, storeId: string, operationId: string): Promise<ShippingProvider>;
  updateShippingProvider(id: string, updates: Partial<ShippingProvider>): Promise<ShippingProvider | undefined>;
  getShippingProvider(id: string): Promise<ShippingProvider | undefined>;
  getShippingProvidersByOperation(operationId: string): Promise<ShippingProvider[]>;

  // User Products methods
  findProductBySku(sku: string): Promise<Product | undefined>;
  linkProductToUser(userId: string, storeId: string, linkData: LinkProductBySku): Promise<UserProduct>;
  getUserLinkedProducts(userId: string, storeId: string): Promise<(UserProduct & { product: Product })[]>;
  unlinkProductFromUser(userId: string, productId: string): Promise<boolean>;
  updateUserProductCosts(userProductId: string, costs: Partial<Pick<UserProduct, 'customCostPrice' | 'customShippingCost' | 'customHandlingFee'>>): Promise<UserProduct | undefined>;
  getUserProductBySku(sku: string, storeId: string): Promise<(UserProduct & { product: Product }) | undefined>;
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

  async getOrdersByStore(storeId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.storeId, storeId))
      .orderBy(desc(orders.createdAt));
  }

  async getProducts(storeId?: string): Promise<Product[]> {
    if (!storeId) {
      // For backward compatibility, return all products if no storeId provided
      return await db
        .select()
        .from(products)
        .orderBy(desc(products.createdAt));
    }
    
    // Filter by storeId for proper data isolation
    return await db
      .select()
      .from(products)
      .where(eq(products.storeId, storeId))
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

  async getUserOperations(userId: string): Promise<Operation[]> {
    const userOps = await db
      .select({
        id: operations.id,
        name: operations.name,
        description: operations.description,
        country: operations.country,
        currency: operations.currency, // CRITICAL: Include missing currency field
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

  // Onboarding methods
  async updateOnboardingStep(userId: string, stepId: string, completed: boolean): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('Usuário não encontrado');

    const currentSteps = user.onboardingSteps as any || {
      step1_operation: false,
      step2_shopify: false,
      step3_shipping: false,
      step4_ads: false,
      step5_sync: false
    };

    currentSteps[stepId] = completed;

    await db
      .update(users)
      .set({ onboardingSteps: currentSteps })
      .where(eq(users.id, userId));
  }

  async completeOnboarding(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        onboardingCompleted: true,
        onboardingSteps: {
          step1_operation: true,
          step2_shopify: true,
          step3_shipping: true,
          step4_ads: true,
          step5_sync: true
        }
      })
      .where(eq(users.id, userId));
  }

  async resetUserOnboarding(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        onboardingCompleted: false,
        onboardingSteps: {}
      })
      .where(eq(users.id, userId));
  }

  async createOperation(operationData: { name: string; description: string; country: string; currency: string }, userId: string): Promise<Operation> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('Usuário não encontrado');

    // Get or create store for user
    let storeId = user.storeId;
    if (!storeId) {
      const [store] = await db
        .insert(stores)
        .values({
          name: `${user.name}'s Store`,
          description: 'Store criada automaticamente durante onboarding',
          ownerId: userId
        })
        .returning();
      
      storeId = store.id;
      
      // Update user with storeId
      await db
        .update(users)
        .set({ storeId })
        .where(eq(users.id, userId));
    }

    // Create operation
    const [operation] = await db
      .insert(operations)
      .values({
        name: operationData.name,
        description: operationData.description,
        country: operationData.country,
        currency: operationData.currency,
        storeId
      })
      .returning();

    // Grant user access to operation
    await db
      .insert(userOperationAccess)
      .values({
        userId,
        operationId: operation.id,
        role: 'owner'
      });

    return operation;
  }

  async createShippingProvider(data: InsertShippingProvider, storeId: string, operationId: string): Promise<ShippingProvider> {
    const [provider] = await db
      .insert(shippingProviders)
      .values({
        ...data,
        storeId,
        operationId
      })
      .returning();
    
    return provider;
  }

  async updateShippingProvider(id: string, updates: Partial<ShippingProvider>): Promise<ShippingProvider | undefined> {
    const [provider] = await db
      .update(shippingProviders)
      .set(updates)
      .where(eq(shippingProviders.id, id))
      .returning();
    
    return provider || undefined;
  }

  async getShippingProvider(id: string): Promise<ShippingProvider | undefined> {
    const [provider] = await db
      .select()
      .from(shippingProviders)
      .where(eq(shippingProviders.id, id))
      .limit(1);
    
    return provider || undefined;
  }

  async getShippingProvidersByOperation(operationId: string): Promise<ShippingProvider[]> {
    const providers = await db
      .select()
      .from(shippingProviders)
      .where(eq(shippingProviders.operationId, operationId))
      .orderBy(shippingProviders.createdAt);
    
    return providers;
  }

  // CRITICAL: Operation-specific data isolation for orders
  async getOrdersByOperation(operationId: string): Promise<Order[]> {
    const operationOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.operationId, operationId))
      .orderBy(orders.orderDate);
    
    return operationOrders;
  }

  // User Products methods implementation
  async findProductBySku(sku: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.sku, sku));
    return product || undefined;
  }

  async linkProductToUser(userId: string, storeId: string, linkData: LinkProductBySku): Promise<UserProduct> {
    // First find the product by SKU
    const product = await this.findProductBySku(linkData.sku);
    if (!product) {
      throw new Error(`Produto com SKU "${linkData.sku}" não encontrado na base global`);
    }

    // Check if already linked
    const [existing] = await db
      .select()
      .from(userProducts)
      .where(and(
        eq(userProducts.userId, userId),
        eq(userProducts.productId, product.id),
        eq(userProducts.isActive, true)
      ));

    if (existing) {
      throw new Error(`Produto "${linkData.sku}" já está vinculado à sua conta`);
    }

    // Create the link
    const [userProduct] = await db
      .insert(userProducts)
      .values({
        userId,
        storeId,
        productId: product.id,
        sku: product.sku,
        customCostPrice: linkData.customCostPrice?.toString(),
        customShippingCost: linkData.customShippingCost?.toString(),
        customHandlingFee: linkData.customHandlingFee?.toString(),
        isActive: true,
      })
      .returning();

    return userProduct;
  }

  async getUserLinkedProducts(userId: string, storeId: string): Promise<(UserProduct & { product: Product })[]> {
    const result = await db
      .select({
        id: userProducts.id,
        userId: userProducts.userId,
        storeId: userProducts.storeId,
        productId: userProducts.productId,
        sku: userProducts.sku,
        customCostPrice: userProducts.customCostPrice,
        customShippingCost: userProducts.customShippingCost,
        customHandlingFee: userProducts.customHandlingFee,
        linkedAt: userProducts.linkedAt,
        lastUpdated: userProducts.lastUpdated,
        isActive: userProducts.isActive,
        product: products,
      })
      .from(userProducts)
      .innerJoin(products, eq(userProducts.productId, products.id))
      .where(and(
        eq(userProducts.userId, userId),
        eq(userProducts.storeId, storeId),
        eq(userProducts.isActive, true)
      ))
      .orderBy(desc(userProducts.linkedAt));

    return result;
  }

  async unlinkProductFromUser(userId: string, productId: string): Promise<boolean> {
    const result = await db
      .update(userProducts)
      .set({ isActive: false, lastUpdated: new Date() })
      .where(and(
        eq(userProducts.userId, userId),
        eq(userProducts.productId, productId)
      ));

    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateUserProductCosts(
    userProductId: string, 
    costs: Partial<Pick<UserProduct, 'customCostPrice' | 'customShippingCost' | 'customHandlingFee'>>
  ): Promise<UserProduct | undefined> {
    const updates: any = { lastUpdated: new Date() };
    
    if (costs.customCostPrice !== undefined) {
      updates.customCostPrice = costs.customCostPrice?.toString();
    }
    if (costs.customShippingCost !== undefined) {
      updates.customShippingCost = costs.customShippingCost?.toString();
    }
    if (costs.customHandlingFee !== undefined) {
      updates.customHandlingFee = costs.customHandlingFee?.toString();
    }

    const [userProduct] = await db
      .update(userProducts)
      .set(updates)
      .where(eq(userProducts.id, userProductId))
      .returning();

    return userProduct || undefined;
  }

  async getUserProductBySku(sku: string, storeId: string): Promise<(UserProduct & { product: Product }) | undefined> {
    const result = await db
      .select({
        id: userProducts.id,
        userId: userProducts.userId,
        storeId: userProducts.storeId,
        productId: userProducts.productId,
        sku: userProducts.sku,
        customCostPrice: userProducts.customCostPrice,
        customShippingCost: userProducts.customShippingCost,
        customHandlingFee: userProducts.customHandlingFee,
        linkedAt: userProducts.linkedAt,
        lastUpdated: userProducts.lastUpdated,
        isActive: userProducts.isActive,
        product: products
      })
      .from(userProducts)
      .innerJoin(products, eq(userProducts.productId, products.id))
      .where(and(
        eq(userProducts.sku, sku),
        eq(userProducts.storeId, storeId),
        eq(userProducts.isActive, true)
      ))
      .limit(1);

    return result[0] || undefined;
  }
}

export const storage = new DatabaseStorage();