import { db } from "./db";
import { users, stores, orders, products, userProducts, shippingProviders, operations, userOperationAccess, aiDirectives, marketplaceProducts, productOperationLinks, announcements, warehouseProviders, userWarehouseAccounts, userWarehouseAccountOperations, bigArenaWarehouseAccounts, User, Order, Product, UserProduct, ShippingProvider, Operation, WarehouseProvider, UserWarehouseAccount, UserWarehouseAccountOperation, BigArenaWarehouseAccount, InsertUser, InsertOrder, InsertProduct, InsertShippingProvider, InsertUserWarehouseAccount, UpdateUserWarehouseAccount, InsertUserWarehouseAccountOperation, InsertBigArenaWarehouseAccount, UpdateBigArenaWarehouseAccount, LinkProductBySku, MarketplaceProduct, InsertMarketplaceProduct, ProductOperationLink, InsertProductOperationLink, Announcement, InsertAnnouncement } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getUserWithPassword(id: string): Promise<{ id: string; passwordHash: string } | undefined>;
  updateUserPassword(userId: string, passwordHash: string): Promise<boolean>;

  // Order methods - limited interface for backward compatibility
  getOrders(limit?: number, offset?: number): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrderByCarrierId(carrierId: string, operationId: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined>;
  updateOrderStatus(id: string, updates: { status: string; lastStatusUpdate: Date; providerData?: any }): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<boolean>;
  getOrdersByStore(storeId: string): Promise<Order[]>;

  // Product methods
  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductsByOperation(operationId: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  // Shipping provider methods
  getShippingProviders(): Promise<ShippingProvider[]>;
  getShippingProvider(id: string): Promise<ShippingProvider | undefined>;

  // Operation methods
  getUserOperations(userId: string): Promise<Operation[]>;
  updateOperation(operationId: string, updates: Partial<Operation>): Promise<Operation | undefined>;
  
  // Onboarding methods
  updateOnboardingStep(userId: string, stepId: string, completed: boolean): Promise<void>;
  completeOnboarding(userId: string): Promise<void>;
  resetUserOnboarding(userId: string): Promise<void>;
  createOperation(operationData: { name: string; description: string; country: string; currency: string; operationType?: string }, userId: string): Promise<Operation>;
  updateUserOnboardingCardHidden(userId: string, hidden: boolean): Promise<void>;
  getShopifyIntegrationsByOperation(operationId: string): Promise<any[]>;
  getAdAccountsByOperation(operationId: string): Promise<any[]>;
  getCustomerSupportByOperation(operationId: string): Promise<any | null>;
  
  // Tour methods
  updateUserTourCompleted(userId: string, completed: boolean): Promise<void>;
  resetUserTour(userId: string): Promise<void>;
  
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

  // N1 Hub - Marketplace methods
  getMarketplaceProducts(params?: { search?: string; category?: string; limit?: number; offset?: number }): Promise<MarketplaceProduct[]>;
  getMarketplaceProduct(id: string): Promise<MarketplaceProduct | undefined>;
  createMarketplaceProduct(product: InsertMarketplaceProduct): Promise<MarketplaceProduct>;
  updateMarketplaceProduct(id: string, updates: Partial<MarketplaceProduct>): Promise<MarketplaceProduct | undefined>;

  // N1 Hub - Product Operation Links methods
  linkProductToOperation(link: InsertProductOperationLink): Promise<ProductOperationLink>;
  getOperationProductLinks(operationId: string): Promise<ProductOperationLink[]>;
  deleteProductOperationLink(id: string): Promise<boolean>;

  // N1 Hub - Announcements methods
  getAnnouncements(params?: { audience?: string; roleTarget?: string; operationId?: string; limit?: number; offset?: number }): Promise<Announcement[]>;
  getAnnouncement(id: string): Promise<Announcement | undefined>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<Announcement | undefined>;
  deleteAnnouncement(id: string): Promise<boolean>;

  // Warehouse Providers methods
  getWarehouseProviders(): Promise<WarehouseProvider[]>;
  getWarehouseProvider(key: string): Promise<WarehouseProvider | undefined>;
  
  // User Warehouse Accounts methods
  getUserWarehouseAccounts(userId: string): Promise<UserWarehouseAccount[]>;
  getUserWarehouseAccountsByProvider(userId: string, providerKey: string): Promise<UserWarehouseAccount[]>;
  getUserWarehouseAccount(id: string): Promise<UserWarehouseAccount | undefined>;
  createUserWarehouseAccount(account: InsertUserWarehouseAccount): Promise<UserWarehouseAccount>;
  updateUserWarehouseAccount(id: string, updates: UpdateUserWarehouseAccount): Promise<UserWarehouseAccount | undefined>;
  deleteUserWarehouseAccount(id: string): Promise<boolean>;
  testUserWarehouseAccount(id: string): Promise<{ success: boolean; message: string }>;
  getBigArenaWarehouseAccountByAccountId(accountId: string): Promise<BigArenaWarehouseAccount | undefined>;
  createBigArenaWarehouseAccount(data: InsertBigArenaWarehouseAccount): Promise<BigArenaWarehouseAccount>;
  updateBigArenaWarehouseAccount(id: string, updates: UpdateBigArenaWarehouseAccount): Promise<BigArenaWarehouseAccount | undefined>;
  deleteBigArenaWarehouseAccount(id: string): Promise<boolean>;
  
  // User Warehouse Account Operations methods
  linkAccountToOperation(link: InsertUserWarehouseAccountOperation): Promise<UserWarehouseAccountOperation>;
  getAccountOperationLinks(accountId: string): Promise<UserWarehouseAccountOperation[]>;
  getOperationAccountLinks(operationId: string): Promise<UserWarehouseAccountOperation[]>;
  deleteAccountOperationLink(accountId: string, operationId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Helper to migrate legacy onboarding step IDs to new format
  private migrateOnboardingSteps(user: User): User {
    if (!user.onboardingSteps) return user;
    
    const steps = user.onboardingSteps as any;
    let needsMigration = false;
    
    // Map old step IDs to new ones
    if ('step3_shipping' in steps) {
      needsMigration = true;
      delete steps.step3_shipping; // Remove obsolete shipping step
    }
    if ('step4_ads' in steps) {
      steps.step3_ads = steps.step4_ads;
      delete steps.step4_ads;
      needsMigration = true;
    }
    if ('step5_sync' in steps) {
      steps.step4_sync = steps.step5_sync;
      delete steps.step5_sync;
      needsMigration = true;
    }
    
    // Persist migration if needed
    if (needsMigration) {
      db.update(users)
        .set({ onboardingSteps: steps })
        .where(eq(users.id, user.id))
        .catch(err => console.error('Error migrating onboarding steps:', err));
    }
    
    return { ...user, onboardingSteps: steps };
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    if (!result[0]) return undefined;
    return this.migrateOnboardingSteps(result[0]);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    if (!result[0]) return undefined;
    return this.migrateOnboardingSteps(result[0]);
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

  async getUserWithPassword(id: string): Promise<{ id: string; passwordHash: string } | undefined> {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      if (!result || result.length === 0) {
        console.log("🔍 getUserWithPassword: No user found for id:", id);
        return undefined;
      }
      
      const dbUser = result[0];
      console.log("🔍 getUserWithPassword: User found, password exists:", !!dbUser.password, "password length:", dbUser.password?.length);
      
      if (!dbUser.password) {
        console.error("⚠️ getUserWithPassword: User has no password!");
        return undefined;
      }
      
      return {
        id: dbUser.id,
        passwordHash: dbUser.password
      };
    } catch (error) {
      console.error("❌ getUserWithPassword error:", error);
      return undefined;
    }
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<boolean> {
    try {
      const result = await db
        .update(users)
        .set({ 
          password: passwordHash,
          updatedAt: new Date() 
        })
        .where(eq(users.id, userId));
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error("Error updating user password:", error);
      return false;
    }
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

  async getOrderByCarrierId(carrierId: string, operationId: string): Promise<Order | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.carrierOrderId, carrierId),
          eq(orders.operationId, operationId)
        )
      );
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

  async updateOrderStatus(id: string, updates: { status: string; lastStatusUpdate: Date; providerData?: any }): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({ 
        status: updates.status,
        lastStatusUpdate: updates.lastStatusUpdate,
        providerData: updates.providerData,
        updatedAt: new Date()
      })
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

  async getProductsByOperation(operationId: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.operationId, operationId))
      .orderBy(desc(products.createdAt));
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
        timezone: operations.timezone, // Include timezone for dashboard calculations
        operationType: operations.operationType, // Include operationType field
        language: operations.language, // Include language for emails
        shopifyOrderPrefix: operations.shopifyOrderPrefix, // Include FHB prefix for linking
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

  async updateOperation(operationId: string, updates: Partial<Operation>): Promise<Operation | undefined> {
    const [operation] = await db
      .update(operations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(operations.id, operationId))
      .returning();
    
    return operation || undefined;
  }

  // Onboarding methods
  async updateOnboardingStep(userId: string, stepId: string, completed: boolean): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('Usuário não encontrado');

    const currentSteps = user.onboardingSteps as any || {
      step1_operation: false,
      step2_shopify: false,
      step3_ads: false,
      step4_sync: false
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
          step3_ads: true,
          step4_sync: true
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
          step3_ads: true,
          step4_sync: true
        }
      })
      .where(eq(users.id, userId));
  }

  async createOperation(operationData: { name: string; description: string; country: string; currency: string; operationType?: string }, userId: string): Promise<Operation> {
    console.log("🏭 Creating operation - Start", { operationData, userId });
    
    const user = await this.getUser(userId);
    if (!user) {
      console.error("❌ User not found:", userId);
      throw new Error('Usuário não encontrado');
    }
    console.log("✅ User found:", user.email);

    // Get or create store for user
    let storeId = user.storeId;
    console.log("🏪 Current user storeId:", storeId);
    
    if (!storeId) {
      console.log("🏪 Creating new store for user");
      try {
        const [store] = await db
          .insert(stores)
          .values({
            name: `${user.name}'s Store`,
            description: 'Store criada automaticamente durante onboarding',
            ownerId: userId
          })
          .returning();
        
        storeId = store.id;
        console.log("✅ Store created:", store.id);
        
        // Update user with storeId
        await db
          .update(users)
          .set({ storeId })
          .where(eq(users.id, userId));
        console.log("✅ User updated with storeId");
      } catch (error) {
        console.error("❌ Error creating store:", error);
        throw error;
      }
    }

    // Create operation
    console.log("🏭 Creating operation with storeId:", storeId);
    try {
      const [operation] = await db
        .insert(operations)
        .values({
          name: operationData.name,
          description: operationData.description,
          country: operationData.country,
          currency: operationData.currency,
          operationType: operationData.operationType || 'Cash on Delivery',
          storeId
        })
        .returning();
      console.log("✅ Operation created:", operation.id);

      // Grant user access to operation
      console.log("🔐 Granting user access to operation");
      await db
        .insert(userOperationAccess)
        .values({
          userId,
          operationId: operation.id,
          role: 'owner'
        });
      console.log("✅ User access granted");

      // Create default AI directives for the new operation
      console.log("🤖 Creating default AI directives for operation");
      await this.createDefaultAIDirectives(operation.id);
      console.log("✅ Default AI directives created");

      console.log("🏭 Creating operation - Complete", operation);
      return operation;
    } catch (error) {
      console.error("❌ Error creating operation or granting access:", error);
      throw error;
    }
  }

  async updateUserOnboardingCardHidden(userId: string, hidden: boolean): Promise<void> {
    await db
      .update(users)
      .set({ onboardingCardHidden: hidden })
      .where(eq(users.id, userId));
  }

  async updateUserTourCompleted(userId: string, completed: boolean): Promise<void> {
    await db
      .update(users)
      .set({ tourCompleted: completed })
      .where(eq(users.id, userId));
  }

  async resetUserTour(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ tourCompleted: false })
      .where(eq(users.id, userId));
  }

  async getShopifyIntegrationsByOperation(operationId: string): Promise<any[]> {
    const { shopifyIntegrations } = await import("@shared/schema");
    const result = await db
      .select()
      .from(shopifyIntegrations)
      .where(eq(shopifyIntegrations.operationId, operationId));
    return result;
  }

  async getAdAccountsByOperation(operationId: string): Promise<any[]> {
    const { adAccounts } = await import("@shared/schema");
    const result = await db
      .select()
      .from(adAccounts)
      .where(eq(adAccounts.operationId, operationId));
    return result;
  }

  async getCustomerSupportByOperation(operationId: string): Promise<any | null> {
    const { customerSupportOperations } = await import("@shared/schema");
    const [result] = await db
      .select()
      .from(customerSupportOperations)
      .where(eq(customerSupportOperations.operationId, operationId));
    return result || null;
  }

  /**
   * Create default AI directives for a new operation
   */
  private async createDefaultAIDirectives(operationId: string): Promise<void> {
    const defaultDirectives = [
      {
        operationId,
        type: 'store_info',
        title: 'Informações Básicas da Empresa',
        content: 'Tempo de entrega: 2 a 7 dias úteis (maioria chega em até 3 dias úteis)',
        isActive: true,
        sortOrder: 1
      },
      {
        operationId,
        type: 'store_info',
        title: 'Forma de Pagamento',
        content: 'Pagamento: Na entrega (COD - Cash on Delivery)',
        isActive: true,
        sortOrder: 2
      },
      {
        operationId,
        type: 'store_info',
        title: 'Horário de Atendimento',
        content: 'Horário: Segunda a sexta, 9h às 18h',
        isActive: true,
        sortOrder: 3
      },
      {
        operationId,
        type: 'response_style',
        title: 'Tom de Atendimento',
        content: 'Utilize sempre um tom empático, profissional e acolhedor. Demonstre compreensão pelos sentimentos do cliente.',
        isActive: true,
        sortOrder: 4
      },
      {
        operationId,
        type: 'response_style',
        title: 'Personalização',
        content: 'Personalize sempre as respostas com o nome do cliente quando disponível. Evite respostas genéricas.',
        isActive: true,
        sortOrder: 5
      },
      {
        operationId,
        type: 'response_style',
        title: 'Proatividade',
        content: 'Antecipe dúvidas relacionadas e ofereça informações úteis adicionais quando pertinente.',
        isActive: true,
        sortOrder: 6
      }
    ];

    try {
      await db.insert(aiDirectives).values(defaultDirectives);
      console.log(`✅ Created ${defaultDirectives.length} default AI directives for operation ${operationId}`);
    } catch (error) {
      console.error('❌ Error creating default AI directives:', error);
      throw error;
    }
  }

  /**
   * Check if an operation has any AI directives
   */
  async hasAIDirectives(operationId: string): Promise<boolean> {
    const directive = await db
      .select()
      .from(aiDirectives)
      .where(eq(aiDirectives.operationId, operationId))
      .limit(1);
    
    return directive.length > 0;
  }

  /**
   * Populate default AI directives for operations that don't have any
   */
  async populateDirectivesForExistingOperations(): Promise<{success: number, errors: number}> {
    console.log('🔍 Searching for operations without AI directives...');
    
    // Get all operations
    const allOperations = await db.select().from(operations);
    console.log(`📋 Found ${allOperations.length} total operations`);
    
    let success = 0;
    let errors = 0;
    
    for (const operation of allOperations) {
      try {
        // Check if operation already has directives
        const hasDirectives = await this.hasAIDirectives(operation.id);
        
        if (!hasDirectives) {
          console.log(`🤖 Creating default directives for operation: ${operation.name} (${operation.id})`);
          await this.createDefaultAIDirectives(operation.id);
          success++;
        } else {
          console.log(`✅ Operation ${operation.name} already has directives, skipping`);
        }
      } catch (error) {
        console.error(`❌ Error processing operation ${operation.id}:`, error);
        errors++;
      }
    }
    
    console.log(`📊 Population complete: ${success} operations populated, ${errors} errors`);
    return { success, errors };
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
    // Normalizar SKU para minúsculas para comparação case-insensitive
    const { normalizeSku } = await import('./utils/sku-parser');
    const normalizedSku = normalizeSku(sku);
    
    const [product] = await db
      .select()
      .from(products)
      .where(sql`LOWER(${products.sku}) = ${normalizedSku}`);
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

  // New function: Link product by operation instead of storeId
  async linkProductToUserByOperation(userId: string, operationId: string, linkData: LinkProductBySku): Promise<UserProduct> {
    const { userOperationAccess, operations } = await import("@shared/schema");
    
    // Get storeId from operation via user access
    const [operationInfo] = await db
      .select({
        storeId: operations.storeId
      })
      .from(userOperationAccess)
      .innerJoin(operations, eq(userOperationAccess.operationId, operations.id))
      .where(and(
        eq(userOperationAccess.userId, userId),
        eq(userOperationAccess.operationId, operationId)
      ))
      .limit(1);

    if (!operationInfo) {
      throw new Error('Usuário não tem acesso a esta operação');
    }

    // Use the existing linkProductToUser with the resolved storeId
    return this.linkProductToUser(userId, operationInfo.storeId, linkData);
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

  // New function: Get user products filtered by operation
  async getUserLinkedProductsByOperation(userId: string, operationId: string): Promise<(UserProduct & { product: Product })[]> {
    const { userOperationAccess, operations } = await import("@shared/schema");
    
    // Get storeId from operation via user access
    const [operationInfo] = await db
      .select({
        storeId: operations.storeId
      })
      .from(userOperationAccess)
      .innerJoin(operations, eq(userOperationAccess.operationId, operations.id))
      .where(and(
        eq(userOperationAccess.userId, userId),
        eq(userOperationAccess.operationId, operationId)
      ))
      .limit(1);

    if (!operationInfo) {
      throw new Error('Usuário não tem acesso a esta operação');
    }

    // Get products for this operation's store
    // Note: Products are linked to stores, not operations directly
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
        eq(userProducts.storeId, operationInfo.storeId),
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
    
    // Normalizar SKU para minúsculas para comparação case-insensitive
    const { normalizeSku } = await import('./utils/sku-parser');
    const normalizedSku = normalizeSku(sku);
    
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
        sql`LOWER(${userProducts.sku}) = ${normalizedSku}`,
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

  async getProductProfitability(productId: string): Promise<any> {
    // Get product details
    const product = await this.getProductById(productId);
    if (!product) {
      return {
        totalOrders: 0,
        deliveredOrders: 0,
        totalProfit: 0,
        profitMargin: 0,
        totalRevenue: 0
      };
    }

    // Get all orders that contain this product SKU
    const allOrders = await db
      .select({
        id: orders.id,
        status: orders.status,
        products: orders.products,
        orderDate: orders.orderDate
      })
      .from(orders);

    // Filter orders containing this specific product SKU
    const ordersWithProduct = allOrders.filter(order => {
      if (!order.products || !Array.isArray(order.products)) return false;
      return order.products.some((orderProduct: any) => 
        orderProduct.sku === product.sku
      );
    });

    const totalOrders = ordersWithProduct.length;
    const deliveredOrders = ordersWithProduct.filter(o => o.status === 'delivered');

    let totalRevenue = 0;
    let totalQuantity = 0;

    // Calculate revenue and quantity for delivered orders only
    deliveredOrders.forEach(order => {
      if (order.products && Array.isArray(order.products)) {
        order.products.forEach((orderProduct: any) => {
          if (orderProduct.sku === product.sku) {
            const quantity = orderProduct.quantity || 0;
            const revenue = (product.price || 0) * quantity;
            totalRevenue += revenue;
            totalQuantity += quantity;
          }
        });
      }
    });

    // Calculate profit: (B2B Price - Cost Price) * Delivered Quantity
    const costPrice = product.costPrice || 0;
    const sellingPrice = product.price || 0;
    const profitPerUnit = sellingPrice - costPrice;
    const totalProfit = profitPerUnit * totalQuantity;
    
    // Calculate profit margin percentage
    const profitMargin = sellingPrice > 0 ? (profitPerUnit / sellingPrice) * 100 : 0;

    return {
      totalOrders,
      deliveredOrders: deliveredOrders.length,
      totalQuantity,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      profitMargin: Math.round(profitMargin * 100) / 100
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

  // ========================================
  // N1 Hub - Marketplace Products
  // ========================================

  async getMarketplaceProducts(params?: { search?: string; category?: string; limit?: number; offset?: number }): Promise<MarketplaceProduct[]> {
    const { search, category, limit = 50, offset = 0 } = params || {};
    
    let query = db.select().from(marketplaceProducts).where(eq(marketplaceProducts.status, 'active'));
    
    if (search) {
      query = query.where(sql`${marketplaceProducts.name} ILIKE ${`%${search}%`} OR ${marketplaceProducts.description} ILIKE ${`%${search}%`}`);
    }
    
    if (category) {
      query = query.where(eq(marketplaceProducts.category, category));
    }
    
    return await query
      .orderBy(desc(marketplaceProducts.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getMarketplaceProduct(id: string): Promise<MarketplaceProduct | undefined> {
    const [product] = await db.select().from(marketplaceProducts).where(eq(marketplaceProducts.id, id));
    return product || undefined;
  }

  async createMarketplaceProduct(product: InsertMarketplaceProduct): Promise<MarketplaceProduct> {
    const [newProduct] = await db
      .insert(marketplaceProducts)
      .values(product)
      .returning();
    
    return newProduct;
  }

  async updateMarketplaceProduct(id: string, updates: Partial<MarketplaceProduct>): Promise<MarketplaceProduct | undefined> {
    const [product] = await db
      .update(marketplaceProducts)
      .set(updates)
      .where(eq(marketplaceProducts.id, id))
      .returning();
    
    return product || undefined;
  }

  async deleteMarketplaceProduct(id: string): Promise<boolean> {
    const result = await db.delete(marketplaceProducts).where(eq(marketplaceProducts.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // ========================================
  // N1 Hub - Product Operation Links
  // ========================================

  async linkProductToOperation(link: InsertProductOperationLink): Promise<ProductOperationLink> {
    const [newLink] = await db
      .insert(productOperationLinks)
      .values(link)
      .returning();
    
    return newLink;
  }

  async getOperationProductLinks(operationId: string): Promise<ProductOperationLink[]> {
    return await db
      .select()
      .from(productOperationLinks)
      .where(eq(productOperationLinks.operationId, operationId))
      .orderBy(desc(productOperationLinks.createdAt));
  }

  async deleteProductOperationLink(id: string): Promise<boolean> {
    const result = await db.delete(productOperationLinks).where(eq(productOperationLinks.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // ========================================
  // N1 Hub - Announcements
  // ========================================

  async getAnnouncements(params?: { audience?: string; roleTarget?: string; operationId?: string; limit?: number; offset?: number }): Promise<Announcement[]> {
    const { audience, roleTarget, operationId, limit = 50, offset = 0 } = params || {};
    
    let query = db.select().from(announcements).where(eq(announcements.status, 'published'));
    
    if (audience) {
      query = query.where(eq(announcements.audience, audience));
    }
    
    if (roleTarget) {
      query = query.where(eq(announcements.roleTarget, roleTarget));
    }
    
    if (operationId) {
      query = query.where(eq(announcements.operationId, operationId));
    }
    
    return await query
      .orderBy(desc(announcements.isPinned), desc(announcements.publishedAt))
      .limit(limit)
      .offset(offset);
  }

  async getAnnouncement(id: string): Promise<Announcement | undefined> {
    const [announcement] = await db.select().from(announcements).where(eq(announcements.id, id));
    return announcement || undefined;
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [newAnnouncement] = await db
      .insert(announcements)
      .values(announcement)
      .returning();
    
    return newAnnouncement;
  }

  async updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<Announcement | undefined> {
    const [announcement] = await db
      .update(announcements)
      .set(updates)
      .where(eq(announcements.id, id))
      .returning();
    
    return announcement || undefined;
  }

  async deleteAnnouncement(id: string): Promise<boolean> {
    const result = await db.delete(announcements).where(eq(announcements.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Warehouse Providers methods
  async getWarehouseProviders(): Promise<WarehouseProvider[]> {
    const providers = await db
      .select()
      .from(warehouseProviders)
      .where(eq(warehouseProviders.isActive, true));

    const hasBigArena = providers.some((provider) => provider.key === "big_arena");
    if (!hasBigArena) {
      providers.push({
        id: "virtual-big-arena",
        key: "big_arena",
        name: "Big Arena Logistics",
        description: "Integração oficial Big Arena para pedidos, estoque e logística.",
        requiredFields: [
          {
            fieldName: "apiToken",
            fieldType: "password",
            label: "API Token",
            placeholder: "seu_token_api",
            required: true,
          },
          {
            fieldName: "domain",
            fieldType: "text",
            label: "Domínio (opcional)",
            placeholder: "ex: api.sualoja.bigarena.com",
            required: false,
          },
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } satisfies WarehouseProvider);
    } else {
      const bigArenaProvider = providers.find((p) => p.key === "big_arena");
      if (bigArenaProvider) {
        // Ensure requiredFields is an array
        if (!bigArenaProvider.requiredFields || !Array.isArray(bigArenaProvider.requiredFields)) {
          bigArenaProvider.requiredFields = [
            {
              fieldName: "apiToken",
              fieldType: "password",
              label: "API Token",
              placeholder: "seu_token_api",
              required: true,
            },
            {
              fieldName: "domain",
              fieldType: "text",
              label: "Domínio (opcional)",
              placeholder: "ex: api.sualoja.bigarena.com",
              required: false,
            },
          ];
        }
      }
    }

    // Ensure all providers have valid requiredFields
    for (const provider of providers) {
      if (!provider.requiredFields || !Array.isArray(provider.requiredFields)) {
        provider.requiredFields = [];
      }
    }

    return providers;
  }

  async getWarehouseProvider(key: string): Promise<WarehouseProvider | undefined> {
    const [provider] = await db.select().from(warehouseProviders).where(eq(warehouseProviders.key, key));
    return provider || undefined;
  }

  // User Warehouse Accounts methods
  async getUserWarehouseAccounts(userId: string): Promise<UserWarehouseAccount[]> {
    const results = await db
      .select({
        id: userWarehouseAccounts.id,
        userId: userWarehouseAccounts.userId,
        providerKey: userWarehouseAccounts.providerKey,
        providerName: warehouseProviders.name,
        displayName: userWarehouseAccounts.displayName,
        credentials: userWarehouseAccounts.credentials,
        status: userWarehouseAccounts.status,
        lastTestedAt: userWarehouseAccounts.lastTestedAt,
        testResult: userWarehouseAccounts.testResult,
        lastSyncAt: userWarehouseAccounts.lastSyncAt,
        initialSyncStatus: userWarehouseAccounts.initialSyncStatus,
        initialSyncCompleted: userWarehouseAccounts.initialSyncCompleted,
        initialSyncCompletedAt: userWarehouseAccounts.initialSyncCompletedAt,
        initialSyncError: userWarehouseAccounts.initialSyncError,
        createdAt: userWarehouseAccounts.createdAt,
        updatedAt: userWarehouseAccounts.updatedAt,
      })
      .from(userWarehouseAccounts)
      .leftJoin(warehouseProviders, eq(userWarehouseAccounts.providerKey, warehouseProviders.key))
      .where(eq(userWarehouseAccounts.userId, userId))
      .orderBy(desc(userWarehouseAccounts.createdAt));
    
    return results.map(r => ({
      ...r,
      providerName: r.providerName || r.providerKey,
      isActive: r.status === 'active'
    })) as UserWarehouseAccount[];
  }

  async getUserWarehouseAccountsByProvider(userId: string, providerKey: string): Promise<UserWarehouseAccount[]> {
    const results = await db
      .select({
        id: userWarehouseAccounts.id,
        userId: userWarehouseAccounts.userId,
        providerKey: userWarehouseAccounts.providerKey,
        providerName: warehouseProviders.name,
        displayName: userWarehouseAccounts.displayName,
        credentials: userWarehouseAccounts.credentials,
        status: userWarehouseAccounts.status,
        lastTestedAt: userWarehouseAccounts.lastTestedAt,
        testResult: userWarehouseAccounts.testResult,
        lastSyncAt: userWarehouseAccounts.lastSyncAt,
        initialSyncStatus: userWarehouseAccounts.initialSyncStatus,
        initialSyncCompleted: userWarehouseAccounts.initialSyncCompleted,
        initialSyncCompletedAt: userWarehouseAccounts.initialSyncCompletedAt,
        initialSyncError: userWarehouseAccounts.initialSyncError,
        createdAt: userWarehouseAccounts.createdAt,
        updatedAt: userWarehouseAccounts.updatedAt,
      })
      .from(userWarehouseAccounts)
      .leftJoin(warehouseProviders, eq(userWarehouseAccounts.providerKey, warehouseProviders.key))
      .where(
        and(
          eq(userWarehouseAccounts.userId, userId),
          eq(userWarehouseAccounts.providerKey, providerKey)
        )
      )
      .orderBy(desc(userWarehouseAccounts.createdAt));
    
    return results.map(r => ({
      ...r,
      providerName: r.providerName || r.providerKey,
      isActive: r.status === 'active'
    })) as UserWarehouseAccount[];
  }

  async getUserWarehouseAccount(id: string): Promise<UserWarehouseAccount | undefined> {
    const [account] = await db
      .select()
      .from(userWarehouseAccounts)
      .where(eq(userWarehouseAccounts.id, id));
    return account || undefined;
  }

  async createUserWarehouseAccount(account: InsertUserWarehouseAccount): Promise<UserWarehouseAccount> {
    const [newAccount] = await db
      .insert(userWarehouseAccounts)
      .values(account)
      .returning();
    return newAccount;
  }

  async updateUserWarehouseAccount(id: string, updates: UpdateUserWarehouseAccount): Promise<UserWarehouseAccount | undefined> {
    const [updated] = await db
      .update(userWarehouseAccounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userWarehouseAccounts.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteUserWarehouseAccount(id: string): Promise<boolean> {
    const result = await db
      .delete(userWarehouseAccounts)
      .where(eq(userWarehouseAccounts.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async testUserWarehouseAccount(id: string): Promise<{ success: boolean; message: string }> {
    // This will be implemented by calling the appropriate provider service
    // For now, return a placeholder
    const account = await this.getUserWarehouseAccount(id);
    if (!account) {
      return { success: false, message: "Account not found" };
    }
    
    // TODO: Implement actual provider testing logic
    return { success: true, message: "Test connection placeholder - to be implemented with provider services" };
  }

  async getBigArenaWarehouseAccountByAccountId(accountId: string): Promise<BigArenaWarehouseAccount | undefined> {
    const [record] = await db
      .select()
      .from(bigArenaWarehouseAccounts)
      .where(eq(bigArenaWarehouseAccounts.accountId, accountId))
      .limit(1);
    return record || undefined;
  }

  async createBigArenaWarehouseAccount(data: InsertBigArenaWarehouseAccount): Promise<BigArenaWarehouseAccount> {
    const [record] = await db
      .insert(bigArenaWarehouseAccounts)
      .values(data)
      .returning();
    return record;
  }

  async updateBigArenaWarehouseAccount(id: string, updates: UpdateBigArenaWarehouseAccount): Promise<BigArenaWarehouseAccount | undefined> {
    const [record] = await db
      .update(bigArenaWarehouseAccounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bigArenaWarehouseAccounts.id, id))
      .returning();
    return record || undefined;
  }

  async deleteBigArenaWarehouseAccount(id: string): Promise<boolean> {
    const result = await db
      .delete(bigArenaWarehouseAccounts)
      .where(eq(bigArenaWarehouseAccounts.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // User Warehouse Account Operations methods
  async linkAccountToOperation(link: InsertUserWarehouseAccountOperation): Promise<UserWarehouseAccountOperation> {
    const [newLink] = await db
      .insert(userWarehouseAccountOperations)
      .values(link)
      .returning();
    return newLink;
  }

  async getAccountOperationLinks(accountId: string): Promise<UserWarehouseAccountOperation[]> {
    return await db
      .select()
      .from(userWarehouseAccountOperations)
      .where(eq(userWarehouseAccountOperations.accountId, accountId));
  }

  async getOperationAccountLinks(operationId: string): Promise<UserWarehouseAccountOperation[]> {
    return await db
      .select()
      .from(userWarehouseAccountOperations)
      .where(eq(userWarehouseAccountOperations.operationId, operationId));
  }

  async deleteAccountOperationLink(accountId: string, operationId: string): Promise<boolean> {
    const result = await db
      .delete(userWarehouseAccountOperations)
      .where(
        and(
          eq(userWarehouseAccountOperations.accountId, accountId),
          eq(userWarehouseAccountOperations.operationId, operationId)
        )
      );
    return result.rowCount !== null && result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();