import { db } from "./db";
import { users, stores, orders, products, shippingProviders, operations, userOperationAccess, userProducts, User, Order, Product, ShippingProvider, Operation, UserProduct, InsertUser, InsertOrder, InsertProduct, InsertShippingProvider, InsertUserProduct, LinkProductBySku } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

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
  getUserProductBySku(sku: string, storeId: string | null): Promise<(UserProduct & { product: Product }) | undefined>;

  // Supplier methods
  getProductsBySupplier(supplierId: string): Promise<Product[]>;
  createSupplierProduct(productData: any): Promise<Product>;
  getProductById(id: string): Promise<Product | undefined>;
  updateSupplierProduct(id: string, updates: any): Promise<Product | undefined>;
  getOrdersBySupplierSkus(supplierId: string): Promise<any[]>;
  getSupplierMetrics(supplierId: string): Promise<any>;
  
  // Stock calculation methods
  getAvailableStock(sku: string): Promise<{ initialStock: number; soldQuantity: number; availableStock: number }>;
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

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    return user || undefined;
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

  async forceCompleteOnboarding(userId: string): Promise<void> {
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

  async getUserProductBySku(sku: string, storeId: string | null): Promise<(UserProduct & { product: Product }) | undefined> {
    if (!storeId) {
      return undefined; // Cannot search without storeId
    }
    
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

  // ===== SUPPLIER METHODS =====
  
  async getProductsBySupplier(supplierId: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.supplierId, supplierId))
      .orderBy(desc(products.createdAt));
  }

  async createSupplierProduct(productData: any): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values(productData)
      .returning();
    
    return product;
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async updateSupplierProduct(id: string, updates: any): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    
    return product || undefined;
  }

  async getOrdersBySupplierSkus(supplierId: string): Promise<any[]> {
    // Get all products created by this supplier
    const supplierProducts = await db
      .select()
      .from(products)
      .where(eq(products.supplierId, supplierId));

    if (supplierProducts.length === 0) {
      return [];
    }

    const supplierSkus = supplierProducts.map(p => p.sku);
    
    // Find orders that contain any of these SKUs
    const ordersWithSupplierProducts = await db
      .select({
        id: orders.id,
        customerName: orders.customerName,
        customerCity: orders.customerCity,
        customerCountry: orders.customerCountry,
        status: orders.status,
        total: orders.total,
        currency: orders.currency,
        orderDate: orders.orderDate,
        shopifyOrderNumber: orders.shopifyOrderNumber,
        products: orders.products,
        operation: {
          name: operations.name,
          country: operations.country,
        }
      })
      .from(orders)
      .leftJoin(operations, eq(orders.operationId, operations.id))
      .where(sql`TRUE`); // Get all orders, we'll filter by SKU afterwards

    // Filter orders that actually contain supplier SKUs
    return ordersWithSupplierProducts.filter(order => {
      if (!order.products || !Array.isArray(order.products)) return false;
      return order.products.some((product: any) => 
        supplierSkus.includes(product.sku)
      );
    });
  }

  async getSupplierMetrics(supplierId: string, period?: string): Promise<any> {
    // Get orders for supplier SKUs
    let orders = await this.getOrdersBySupplierSkus(supplierId);
    
    // Apply date filter if period is specified
    if (period && period !== 'all') {
      const { from } = this.getDateRange(period);
      orders = orders.filter(order => {
        if (!order.orderDate) return false;
        const orderDate = new Date(order.orderDate);
        return orderDate >= from;
      });
    }
    
    // Get supplier products to get B2B prices and costs
    const supplierProducts = await db
      .select()
      .from(products)
      .where(eq(products.supplierId, supplierId));

    // Create a SKU to product map for quick lookup
    const skuToProduct = supplierProducts.reduce((acc, product) => {
      acc[product.sku] = product;
      return acc;
    }, {} as Record<string, any>);
    
    const totalOrders = orders.length;
    
    // Status que representam pedidos retornados/cancelados
    const returnedStatuses = ['returned', 'cancelled', 'refused'];
    const returnedOrders = orders.filter(o => returnedStatuses.includes(o.status)).length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    
    // Filter specifically for carrier-delivered orders (status = 'delivered') across all operations
    const carrierDeliveredOrders = orders.filter(o => o.status === 'delivered');
    
    // Calculate profit: (B2B Price - Production Cost) x Delivered Quantity
    let totalProfit = 0;
    
    carrierDeliveredOrders.forEach(order => {
      if (order.products && Array.isArray(order.products)) {
        order.products.forEach((orderProduct: any) => {
          const productData = skuToProduct[orderProduct.sku];
          if (productData && productData.price && productData.costPrice) {
            const profitPerUnit = productData.price - productData.costPrice;
            const quantity = orderProduct.quantity || 0;
            const productProfit = profitPerUnit * quantity;
            totalProfit += productProfit;
          }
        });
      }
    });
    
    return {
      totalOrders,
      deliveredOrders: carrierDeliveredOrders.length, // Count of orders delivered by carrier across all operations
      returnedOrders,
      cancelledOrders,
      totalProfit: Math.round(totalProfit * 100) / 100 // Round to 2 decimal places
    };
  }

  // Date range utility function (copied from dashboard-service.ts)
  private getDateRange(period: string): { from: Date; to: Date } {
    const now = new Date();
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let from: Date;

    switch (period) {
      case '1d':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '365d':
        from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'current_month':
        from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        break;
      default:
        // Return a very old date for 'all' or any unknown period
        from = new Date(2020, 0, 1);
        break;
    }

    return { from, to };
  }

  async getAvailableStock(sku: string): Promise<{ initialStock: number; soldQuantity: number; availableStock: number }> {
    // Get initial stock from products table
    const [product] = await db
      .select({ stock: products.stock })
      .from(products)
      .where(eq(products.sku, sku));

    if (!product) {
      throw new Error('Product not found');
    }

    const initialStock = product.stock || 0;

    // Calculate total sold quantity across all orders
    // Query orders where products JSONB array contains this SKU
    const result = await db.execute(sql`
      SELECT COALESCE(SUM((product->>'quantity')::int), 0) as total_sold
      FROM orders, jsonb_array_elements(products) AS product 
      WHERE product->>'sku' = ${sku}
      AND products IS NOT NULL
    `);

    const soldQuantity = result.rows[0] ? (result.rows[0] as any).total_sold || 0 : 0;
    const availableStock = Math.max(0, initialStock - soldQuantity);

    return {
      initialStock,
      soldQuantity,
      availableStock
    };
  }
}

export const storage = new DatabaseStorage();