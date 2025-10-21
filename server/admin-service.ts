import { storage } from "./storage";
import { db } from "./db";
import { stores, operations, orders, users, products, shopifyIntegrations, cartpandaIntegrations, fulfillmentIntegrations, facebookAdsIntegrations, googleAdsIntegrations } from "@shared/schema";
import { count, sql, and, gte, lte, ilike, or, desc, eq } from "drizzle-orm";

export class AdminService {
  
  async getGlobalStats() {
    try {
      // Get total counts
      const [usersCount] = await db.select({ count: count() }).from(users);
      const [operationsCount] = await db.select({ count: count() }).from(operations);
      const [ordersCount] = await db.select({ count: count() }).from(orders);
      
      // Get total revenue (sum of all delivered orders)
      const [revenueResult] = await db
        .select({ 
          totalRevenue: sql<number>`COALESCE(SUM(CAST(${orders.total} AS DECIMAL)), 0)` 
        })
        .from(orders)
        .where(sql`${orders.status} = 'delivered'`);
      
      // Get top operations globally by total orders
      const topStoresGlobal = await db
        .select({
          id: operations.id,
          name: operations.name,
          storeName: stores.name,
          totalOrders: sql<number>`COUNT(${orders.id})`
        })
        .from(operations)
        .leftJoin(stores, eq(stores.id, operations.storeId))
        .leftJoin(orders, eq(orders.storeId, operations.storeId))
        .groupBy(operations.id, operations.name, stores.name)
        .orderBy(desc(sql<number>`COUNT(${orders.id})`))
        .limit(5);

      // Get orders by country (monthly) - Shopify orders only
      const ordersByCountry = await db
        .select({
          country: sql<string>`COALESCE(${orders.customerCountry}, 'Não informado')`,
          orders: sql<number>`COUNT(*)`
        })
        .from(orders)
        .where(and(
          sql`${orders.orderDate} >= CURRENT_DATE - INTERVAL '30 days'`,
          eq(orders.dataSource, 'shopify')
        ))
        .groupBy(sql`COALESCE(${orders.customerCountry}, 'Não informado')`)
        .orderBy(desc(sql<number>`COUNT(*)`))
        .limit(10);

      // Get top operations today by Shopify orders
      const today = new Date().toISOString().split('T')[0];
      const topStoresToday = await db
        .select({
          id: operations.id,
          name: operations.name,
          storeName: stores.name,
          todayOrders: sql<number>`COUNT(${orders.id})`
        })
        .from(operations)
        .leftJoin(stores, eq(stores.id, operations.storeId))
        .leftJoin(orders, and(
          eq(orders.storeId, operations.storeId),
          eq(orders.dataSource, 'shopify'),
          sql`DATE(${orders.orderDate}) = ${today}`
        ))
        .groupBy(operations.id, operations.name, stores.name)
        .orderBy(desc(sql<number>`COUNT(${orders.id})`))
        .limit(5);

      // Get total Shopify orders today (all operations)
      const [todayOrdersResult] = await db
        .select({
          count: sql<number>`COUNT(*)`
        })
        .from(orders)
        .where(and(
          eq(orders.dataSource, 'shopify'),
          sql`DATE(${orders.orderDate}) = ${today}`
        ));

      // Get total Shopify orders this month (all operations)
      const [monthOrdersResult] = await db
        .select({
          count: sql<number>`COUNT(*)`
        })
        .from(orders)
        .where(and(
          eq(orders.dataSource, 'shopify'),
          sql`DATE_TRUNC('month', ${orders.orderDate}) = DATE_TRUNC('month', CURRENT_DATE)`
        ));
      
      return {
        totalUsers: usersCount.count,
        totalOperations: operationsCount.count,
        totalOrders: ordersCount.count,
        totalRevenue: Number(revenueResult.totalRevenue) || 0,
        topStoresGlobal: topStoresGlobal.map(operation => ({
          id: operation.id,
          name: operation.name,
          storeName: operation.storeName,
          totalOrders: Number(operation.totalOrders)
        })),
        ordersByCountry: ordersByCountry.map(country => ({
          country: country.country,
          orders: Number(country.orders)
        })),
        topStoresToday: topStoresToday.map(operation => ({
          id: operation.id,
          name: operation.name,
          storeName: operation.storeName,
          todayOrders: Number(operation.todayOrders)
        })),
        todayShopifyOrders: Number(todayOrdersResult.count) || 0,
        monthShopifyOrders: Number(monthOrdersResult.count) || 0
      };
    } catch (error) {
      console.error('❌ Error getting global stats:', error);
      throw error;
    }
  }
  
  async getAllStores() {
    try {
      const storesList = await db
        .select({
          id: stores.id,
          name: stores.name,
          description: stores.description,
          ownerId: stores.ownerId,
          operationsCount: count(operations.id),
          createdAt: stores.createdAt
        })
        .from(stores)
        .leftJoin(operations, sql`${operations.storeId} = ${stores.id}`)
        .groupBy(stores.id, stores.name, stores.description, stores.ownerId, stores.createdAt)
        .orderBy(desc(stores.createdAt));
      
      return storesList.map(store => ({
        ...store,
        operationsCount: Number(store.operationsCount)
      }));
    } catch (error) {
      console.error('❌ Error getting all stores:', error);
      throw error;
    }
  }
  
  async getAllOperations(storeId?: string) {
    try {
      let query = db
        .select({
          id: operations.id,
          name: operations.name,
          description: operations.description,
          storeId: operations.storeId,
          storeName: stores.name,
          ownerId: operations.ownerId,
          country: operations.country,
          currency: operations.currency,
          operationType: operations.operationType,
          status: operations.status,
          shopifyOrderPrefix: operations.shopifyOrderPrefix,
          createdAt: operations.createdAt
        })
        .from(operations)
        .leftJoin(stores, sql`${stores.id} = ${operations.storeId}`)
        .orderBy(desc(operations.createdAt));
      
      if (storeId && storeId !== 'all') {
        query = query.where(sql`${operations.storeId} = ${storeId}`) as any;
      }
      
      const result = await query;
      console.log('🔍 getAllOperations sample:', result[0]?.shopifyOrderPrefix);
      return result;
    } catch (error) {
      console.error('❌ Error getting operations:', error);
      throw error;
    }
  }
  
  async getGlobalOrders(filters: {
    searchTerm?: string;
    storeId?: string;
    operationId?: string;
    dateRange?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      const { searchTerm, storeId, operationId, dateRange, limit = 20, offset = 0 } = filters;
      
      // Build date filter
      let dateFilter = sql`TRUE`;
      const now = new Date();
      
      switch (dateRange) {
        case '7d':
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter = sql`${orders.orderDate} >= ${sevenDaysAgo.toISOString()}`;
          break;
        case '30d':
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateFilter = sql`${orders.orderDate} >= ${thirtyDaysAgo.toISOString()}`;
          break;
        case '90d':
          const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          dateFilter = sql`${orders.orderDate} >= ${ninetyDaysAgo.toISOString()}`;
          break;
        default:
          dateFilter = sql`TRUE`;
      }
      
      // Build search filter
      let searchFilter = sql`TRUE`;
      if (searchTerm && searchTerm.trim()) {
        searchFilter = or(
          ilike(orders.customerName, `%${searchTerm}%`),
          ilike(orders.customerPhone, `%${searchTerm}%`),
          ilike(orders.id, `%${searchTerm}%`)
        ) || sql`TRUE`;
      }
      
      // Build store filter
      let storeFilter = sql`TRUE`;
      if (storeId && storeId !== 'all') {
        storeFilter = sql`${orders.storeId} = ${storeId}`;
      }
      
      // Build operation filter
      let operationFilter = sql`TRUE`;
      if (operationId && operationId !== 'all') {
        operationFilter = sql`${orders.operationId} = ${operationId}`;
      }
      
      const globalOrders = await db
        .select({
          id: orders.id,
          storeId: orders.storeId,
          storeName: stores.name,
          operationId: orders.operationId,
          operationName: operations.name,
          customerName: orders.customerName,
          customerPhone: orders.customerPhone,
          customerEmail: orders.customerEmail,
          customerAddress: orders.customerAddress,
          customerCity: orders.customerCity,
          customerState: orders.customerState,
          customerCountry: orders.customerCountry,
          customerZip: orders.customerZip,
          status: orders.status,
          amount: orders.total,
          currency: orders.currency,
          orderDate: orders.orderDate,
          provider: orders.provider,
          dataSource: orders.dataSource,
          shopifyOrderNumber: orders.shopifyOrderNumber,
          carrierImported: orders.carrierImported,
          products: orders.products
        })
        .from(orders)
        .leftJoin(stores, sql`${stores.id} = ${orders.storeId}`)
        .leftJoin(operations, sql`${operations.id} = ${orders.operationId}`)
        .where(and(dateFilter, searchFilter, storeFilter, operationFilter))
        .orderBy(desc(orders.orderDate))
        .limit(limit)
        .offset(offset);
      
      // Enrich products with images from registered products when SKU is available
      const enrichedOrders = await Promise.all(globalOrders.map(async (order) => {
        if (order.products && Array.isArray(order.products)) {
          const enrichedProducts = await Promise.all(order.products.map(async (product: any) => {
            // If product has SKU, try to get image from registered products
            if (product.sku) {
              const registeredProduct = await db
                .select({ imageUrl: products.imageUrl })
                .from(products)
                .where(eq(products.sku, product.sku))
                .limit(1);
              
              if (registeredProduct.length > 0 && registeredProduct[0].imageUrl) {
                return {
                  ...product,
                  image: registeredProduct[0].imageUrl
                };
              }
            }
            return product;
          }));
          
          return {
            ...order,
            amount: Number(order.amount) || 0,
            products: enrichedProducts
          };
        }
        
        return {
          ...order,
          amount: Number(order.amount) || 0
        };
      }));
      
      return enrichedOrders;
    } catch (error) {
      console.error('❌ Error getting global orders:', error);
      throw error;
    }
  }

  async getGlobalOrdersCount(filters: {
    searchTerm?: string;
    storeId?: string;
    operationId?: string;
    dateRange?: string;
  }) {
    try {
      const { searchTerm, storeId, operationId, dateRange } = filters;
      
      // Build date filter
      let dateFilter = sql`TRUE`;
      const now = new Date();
      
      switch (dateRange) {
        case '7d':
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter = sql`${orders.orderDate} >= ${sevenDaysAgo.toISOString()}`;
          break;
        case '30d':
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateFilter = sql`${orders.orderDate} >= ${thirtyDaysAgo.toISOString()}`;
          break;
        case '90d':
          const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          dateFilter = sql`${orders.orderDate} >= ${ninetyDaysAgo.toISOString()}`;
          break;
        default:
          dateFilter = sql`TRUE`;
      }
      
      // Build search filter
      let searchFilter = sql`TRUE`;
      if (searchTerm && searchTerm.trim()) {
        searchFilter = or(
          ilike(orders.customerName, `%${searchTerm}%`),
          ilike(orders.customerPhone, `%${searchTerm}%`),
          ilike(orders.id, `%${searchTerm}%`)
        ) || sql`TRUE`;
      }
      
      // Build store filter
      let storeFilter = sql`TRUE`;
      if (storeId && storeId !== 'all') {
        storeFilter = sql`${orders.storeId} = ${storeId}`;
      }
      
      // Build operation filter
      let operationFilter = sql`TRUE`;
      if (operationId && operationId !== 'all') {
        operationFilter = sql`${orders.operationId} = ${operationId}`;
      }
      
      const [countResult] = await db
        .select({ count: count() })
        .from(orders)
        .where(and(dateFilter, searchFilter, storeFilter, operationFilter));
      
      return countResult.count;
    } catch (error) {
      console.error('❌ Error counting global orders:', error);
      throw error;
    }
  }
  
  async createSuperAdmin(email: string, password: string, name: string) {
    try {
      // Check if super admin already exists
      const existingAdmin = await storage.getUserByEmail(email);
      if (existingAdmin) {
        console.log('⚠️ Super admin already exists');
        return existingAdmin;
      }
      
      const superAdmin = await storage.createUser({
        name,
        email,
        password,
        role: 'super_admin',
        onboardingCompleted: true // Super admins don't need onboarding
      });
      
      console.log('✅ Super admin created:', email);
      return superAdmin;
    } catch (error) {
      console.error('❌ Error creating super admin:', error);
      throw error;
    }
  }

  async getAllProducts() {
    try {
      const productsList = await db
        .select({
          id: products.id,
          sku: products.sku,
          name: products.name,
          type: products.type,
          description: products.description,
          price: products.price,
          costPrice: products.costPrice,
          shippingCost: products.shippingCost,
          imageUrl: products.imageUrl,
          availableCountries: products.availableCountries,
          isActive: products.isActive,
          status: products.status,
          supplierId: products.supplierId,
          supplierName: users.name,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt
        })
        .from(products)
        .leftJoin(users, eq(products.supplierId, users.id))
        .orderBy(desc(products.createdAt));

      return productsList.map(product => ({
        ...product,
        price: Number(product.price) || 0,
        costPrice: Number(product.costPrice) || 0,
        shippingCost: Number(product.shippingCost) || 0
      }));
    } catch (error) {
      console.error('❌ Error getting products:', error);
      throw error;
    }
  }

  async createProduct(productData: {
    sku: string;
    name: string;
    type: string;
    description?: string;
    price: number;
    costPrice: number;
    shippingCost: number;
    imageUrl?: string;
    weight?: number;
    height?: number;
    width?: number;
    depth?: number;
    availableCountries?: string[];
  }) {
    try {
      // Since products are global, we'll use a default store/operation for now
      // In a future version, this could be made more flexible
      const [defaultStore] = await db.select().from(stores).limit(1);
      const [defaultOperation] = await db.select().from(operations).limit(1);
      
      if (!defaultStore) {
        throw new Error('No default store found');
      }

      const productValues: any = {
        sku: productData.sku,
        name: productData.name,
        type: productData.type,
        description: productData.description || null,
        price: productData.price.toString(),
        costPrice: productData.costPrice.toString(),
        shippingCost: productData.shippingCost.toString(),
        storeId: defaultStore.id,
        operationId: defaultOperation?.id || null,
        stock: 0,
        isActive: true,
        status: 'approved' // Produtos criados pelo admin já vêm aprovados
      };

      // Add optional fields if provided and valid
      if (productData.imageUrl) productValues.imageUrl = productData.imageUrl;
      
      // Add available countries if provided
      if (productData.availableCountries && Array.isArray(productData.availableCountries)) {
        productValues.availableCountries = productData.availableCountries;
      }
      
      // Only add dimension fields if they are valid finite numbers
      if (productData.weight !== undefined && Number.isFinite(productData.weight)) {
        productValues.weight = productData.weight.toString();
      }
      if (productData.height !== undefined && Number.isFinite(productData.height)) {
        productValues.height = productData.height.toString();
      }
      if (productData.width !== undefined && Number.isFinite(productData.width)) {
        productValues.width = productData.width.toString();
      }
      if (productData.depth !== undefined && Number.isFinite(productData.depth)) {
        productValues.depth = productData.depth.toString();
      }

      const [newProduct] = await db
        .insert(products)
        .values(productValues)
        .returning();

      return {
        ...newProduct,
        price: Number(newProduct.price) || 0,
        costPrice: Number(newProduct.costPrice) || 0,
        shippingCost: Number(newProduct.shippingCost) || 0,
        weight: newProduct.weight ? Number(newProduct.weight) : undefined,
        height: newProduct.height ? Number(newProduct.height) : undefined,
        width: newProduct.width ? Number(newProduct.width) : undefined,
        depth: newProduct.depth ? Number(newProduct.depth) : undefined,
      };
    } catch (error) {
      console.error('❌ Error creating product:', error);
      throw error;
    }
  }

  async getProductById(productId: string) {
    try {
      const [product] = await db
        .select({
          id: products.id,
          storeId: products.storeId,
          operationId: products.operationId,
          sku: products.sku,
          name: products.name,
          description: products.description,
          type: products.type,
          price: products.price,
          stock: products.stock,
          lowStock: products.lowStock,
          imageUrl: products.imageUrl,
          videoUrl: products.videoUrl,
          productUrl: products.productUrl,
          isActive: products.isActive,
          costPrice: products.costPrice,
          shippingCost: products.shippingCost,
          handlingFee: products.handlingFee,
          marketingCost: products.marketingCost,
          operationalCost: products.operationalCost,
          profitMargin: products.profitMargin,
          lastCostUpdate: products.lastCostUpdate,
          providers: products.providers,
          supplierId: products.supplierId,
          initialStock: products.initialStock,
          status: products.status,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
          supplierName: users.name
        })
        .from(products)
        .leftJoin(users, eq(products.supplierId, users.id))
        .where(eq(products.id, productId))
        .limit(1);

      if (!product) {
        return null;
      }

      return {
        ...product,
        price: Number(product.price) || 0,
        costPrice: Number(product.costPrice) || 0,
        shippingCost: Number(product.shippingCost) || 0,
        handlingFee: Number(product.handlingFee) || 0,
        marketingCost: Number(product.marketingCost) || 0,
        operationalCost: Number(product.operationalCost) || 0,
        profitMargin: Number(product.profitMargin) || 0
      };
    } catch (error) {
      console.error('❌ Error getting product by ID:', error);
      throw error;
    }
  }

  async updateProductStatus(productId: string, status: string) {
    try {
      const [updatedProduct] = await db
        .update(products)
        .set({ 
          status,
          updatedAt: new Date()
        })
        .where(eq(products.id, productId))
        .returning();

      if (!updatedProduct) {
        throw new Error('Product not found');
      }

      return updatedProduct;
    } catch (error) {
      console.error('❌ Error updating product status:', error);
      throw error;
    }
  }

  async updateProduct(productId: string, productData: {
    sku?: string;
    name?: string;
    type?: string;
    description?: string;
    price?: number;
    costPrice?: number;
    shippingCost?: number;
  }) {
    try {
      const updateData: any = {};
      
      if (productData.sku !== undefined) updateData.sku = productData.sku;
      if (productData.name !== undefined) updateData.name = productData.name;
      if (productData.type !== undefined) updateData.type = productData.type;
      if (productData.description !== undefined) updateData.description = productData.description;
      if (productData.price !== undefined) updateData.price = productData.price.toString();
      if (productData.costPrice !== undefined) updateData.costPrice = productData.costPrice.toString();
      if (productData.shippingCost !== undefined) updateData.shippingCost = productData.shippingCost.toString();
      
      const [updatedProduct] = await db
        .update(products)
        .set(updateData)
        .where(eq(products.id, productId))
        .returning();

      if (!updatedProduct) {
        throw new Error('Product not found');
      }

      return {
        ...updatedProduct,
        price: Number(updatedProduct.price) || 0,
        costPrice: Number(updatedProduct.costPrice) || 0,
        shippingCost: Number(updatedProduct.shippingCost) || 0
      };
    } catch (error) {
      console.error('❌ Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(productId: string) {
    try {
      // First, delete all references in user_products table using SQL
      await db.execute(sql`DELETE FROM user_products WHERE product_id = ${productId}`);
      
      console.log(`Removed user product links for product ${productId}`);

      // Then delete the product
      const [deletedProduct] = await db
        .delete(products)
        .where(eq(products.id, productId))
        .returning();

      if (!deletedProduct) {
        throw new Error('Product not found');
      }

      return deletedProduct;
    } catch (error) {
      console.error('❌ Error deleting product:', error);
      throw error;
    }
  }

  async createOperation(operationData: {
    name: string;
    description?: string;
    storeId: string;
    ownerId?: string;
    country: string;
    currency?: string;
    operationType?: string;
    status?: string;
  }) {
    try {
      const operationValues: any = {
        name: operationData.name,
        storeId: operationData.storeId,
        country: operationData.country,
        currency: operationData.currency || 'EUR',
        operationType: operationData.operationType || 'Cash on Delivery',
        status: operationData.status || 'active'
      };

      if (operationData.description) {
        operationValues.description = operationData.description;
      }
      
      if (operationData.ownerId) {
        operationValues.ownerId = operationData.ownerId;
      }

      const [newOperation] = await db
        .insert(operations)
        .values(operationValues)
        .returning();

      return newOperation;
    } catch (error) {
      console.error('❌ Error creating operation:', error);
      throw error;
    }
  }

  async updateOperation(operationId: string, operationData: {
    name?: string;
    description?: string;
    ownerId?: string;
    country?: string;
    currency?: string;
    operationType?: string;
    status?: string;
    shopifyOrderPrefix?: string;
  }) {
    try {
      const updateData: any = { updatedAt: new Date() };
      
      if (operationData.name !== undefined) updateData.name = operationData.name;
      if (operationData.description !== undefined) updateData.description = operationData.description;
      if (operationData.ownerId !== undefined) updateData.ownerId = operationData.ownerId;
      if (operationData.country !== undefined) updateData.country = operationData.country;
      if (operationData.currency !== undefined) updateData.currency = operationData.currency;
      if (operationData.operationType !== undefined) updateData.operationType = operationData.operationType;
      if (operationData.status !== undefined) updateData.status = operationData.status;
      if (operationData.shopifyOrderPrefix !== undefined) updateData.shopifyOrderPrefix = operationData.shopifyOrderPrefix;

      const [updatedOperation] = await db
        .update(operations)
        .set(updateData)
        .where(eq(operations.id, operationId))
        .returning();

      if (!updatedOperation) {
        throw new Error('Operation not found');
      }

      return updatedOperation;
    } catch (error) {
      console.error('❌ Error updating operation:', error);
      throw error;
    }
  }

  async deleteOperation(operationId: string) {
    try {
      // Delete the operation
      const [deletedOperation] = await db
        .delete(operations)
        .where(eq(operations.id, operationId))
        .returning();

      if (!deletedOperation) {
        throw new Error('Operation not found');
      }

      return deletedOperation;
    } catch (error) {
      console.error('❌ Error deleting operation:', error);
      throw error;
    }
  }

  async getOperationProducts(operationId: string) {
    try {
      const operationProducts = await db
        .select({
          id: products.id,
          sku: products.sku,
          name: products.name,
          type: products.type,
          description: products.description,
          price: products.price,
          costPrice: products.costPrice,
          shippingCost: products.shippingCost,
          imageUrl: products.imageUrl,
          isActive: products.isActive,
          status: products.status
        })
        .from(products)
        .where(eq(products.operationId, operationId))
        .orderBy(desc(products.createdAt));

      return operationProducts.map(product => ({
        ...product,
        price: Number(product.price) || 0,
        costPrice: Number(product.costPrice) || 0,
        shippingCost: Number(product.shippingCost) || 0
      }));
    } catch (error) {
      console.error('❌ Error getting operation products:', error);
      throw error;
    }
  }

  async linkProductToOperation(productId: string, operationId: string) {
    try {
      const [updatedProduct] = await db
        .update(products)
        .set({ 
          operationId,
          updatedAt: new Date()
        })
        .where(eq(products.id, productId))
        .returning();

      if (!updatedProduct) {
        throw new Error('Product not found');
      }

      return updatedProduct;
    } catch (error) {
      console.error('❌ Error linking product to operation:', error);
      throw error;
    }
  }

  async unlinkProductFromOperation(productId: string) {
    try {
      const [updatedProduct] = await db
        .update(products)
        .set({ 
          operationId: null,
          updatedAt: new Date()
        })
        .where(eq(products.id, productId))
        .returning();

      if (!updatedProduct) {
        throw new Error('Product not found');
      }

      return updatedProduct;
    } catch (error) {
      console.error('❌ Error unlinking product from operation:', error);
      throw error;
    }
  }

  // Integration Management Methods

  async getOperationIntegrations(operationId: string) {
    try {
      // Buscar todas as integrações de plataforma (Shopify e CartPanda)
      const shopifyList = await db
        .select()
        .from(shopifyIntegrations)
        .where(eq(shopifyIntegrations.operationId, operationId));

      const cartpandaList = await db
        .select()
        .from(cartpandaIntegrations)
        .where(eq(cartpandaIntegrations.operationId, operationId));

      // Unificar plataformas com campo "platform" para identificação
      const platforms = [
        ...shopifyList.map(s => ({ ...s, platform: 'shopify' as const })),
        ...cartpandaList.map(c => ({ ...c, platform: 'cartpanda' as const }))
      ];

      // Retornar TODAS as integrações de fulfillment (múltiplos armazéns)
      const fulfillments = await db
        .select()
        .from(fulfillmentIntegrations)
        .where(eq(fulfillmentIntegrations.operationId, operationId));

      // Buscar todas as contas de anúncios (Meta e Google)
      const metaAdsList = await db
        .select()
        .from(facebookAdsIntegrations)
        .where(eq(facebookAdsIntegrations.operationId, operationId));

      const googleAdsList = await db
        .select()
        .from(googleAdsIntegrations)
        .where(eq(googleAdsIntegrations.operationId, operationId));

      // Unificar contas de anúncios com campo "platform" para identificação
      const adsAccounts = [
        ...metaAdsList.map(m => ({ ...m, platform: 'meta' as const })),
        ...googleAdsList.map(g => ({ ...g, platform: 'google' as const }))
      ];

      return {
        platforms: platforms || [], // Array de plataformas (Shopify + CartPanda)
        fulfillments: fulfillments || [], // Array de armazéns
        adsAccounts: adsAccounts || [] // Array de contas de anúncios (Meta + Google)
      };
    } catch (error) {
      console.error('❌ Error getting operation integrations:', error);
      throw error;
    }
  }

  async createOrUpdateShopifyIntegration(operationId: string, data: {
    shopName: string;
    accessToken: string;
    integrationId?: string; // Se fornecido, atualiza essa integração específica
  }) {
    try {
      // Se integrationId for fornecido, atualizar essa integração específica
      if (data.integrationId) {
        const [updated] = await db
          .update(shopifyIntegrations)
          .set({
            shopName: data.shopName,
            accessToken: data.accessToken,
            status: 'pending',
            updatedAt: new Date()
          })
          .where(eq(shopifyIntegrations.id, data.integrationId))
          .returning();
        return updated;
      }
      
      // Verificar se já existe integração com essa loja para esta operação
      const [existing] = await db
        .select()
        .from(shopifyIntegrations)
        .where(
          and(
            eq(shopifyIntegrations.operationId, operationId),
            eq(shopifyIntegrations.shopName, data.shopName)
          )
        )
        .limit(1);

      if (existing) {
        // Atualizar integração existente da mesma loja
        const [updated] = await db
          .update(shopifyIntegrations)
          .set({
            accessToken: data.accessToken,
            status: 'pending',
            updatedAt: new Date()
          })
          .where(eq(shopifyIntegrations.id, existing.id))
          .returning();
        return updated;
      } else {
        // Criar nova integração
        const [created] = await db
          .insert(shopifyIntegrations)
          .values({
            operationId,
            shopName: data.shopName,
            accessToken: data.accessToken,
            status: 'pending'
          })
          .returning();
        return created;
      }
    } catch (error) {
      console.error('❌ Error creating/updating Shopify integration:', error);
      throw error;
    }
  }

  async deleteShopifyIntegration(integrationId: string) {
    try {
      const [deleted] = await db
        .delete(shopifyIntegrations)
        .where(eq(shopifyIntegrations.id, integrationId))
        .returning();
      
      if (!deleted) {
        throw new Error('Integration not found');
      }
      
      return deleted;
    } catch (error) {
      console.error('❌ Error deleting Shopify integration:', error);
      throw error;
    }
  }

  async createOrUpdateCartpandaIntegration(operationId: string, data: {
    storeSlug: string;
    bearerToken: string;
    integrationId?: string; // Se fornecido, atualiza essa integração específica
  }) {
    try {
      // Se integrationId for fornecido, atualizar essa integração específica
      if (data.integrationId) {
        const [updated] = await db
          .update(cartpandaIntegrations)
          .set({
            storeSlug: data.storeSlug,
            bearerToken: data.bearerToken,
            status: 'pending',
            updatedAt: new Date()
          })
          .where(eq(cartpandaIntegrations.id, data.integrationId))
          .returning();
        return updated;
      }
      
      // Verificar se já existe integração com essa loja para esta operação
      const [existing] = await db
        .select()
        .from(cartpandaIntegrations)
        .where(
          and(
            eq(cartpandaIntegrations.operationId, operationId),
            eq(cartpandaIntegrations.storeSlug, data.storeSlug)
          )
        )
        .limit(1);

      if (existing) {
        // Atualizar integração existente da mesma loja
        const [updated] = await db
          .update(cartpandaIntegrations)
          .set({
            bearerToken: data.bearerToken,
            status: 'pending',
            updatedAt: new Date()
          })
          .where(eq(cartpandaIntegrations.id, existing.id))
          .returning();
        return updated;
      } else {
        // Criar nova integração
        const [created] = await db
          .insert(cartpandaIntegrations)
          .values({
            operationId,
            storeSlug: data.storeSlug,
            bearerToken: data.bearerToken,
            status: 'pending'
          })
          .returning();
        return created;
      }
    } catch (error) {
      console.error('❌ Error creating/updating CartPanda integration:', error);
      throw error;
    }
  }

  async deleteCartpandaIntegration(integrationId: string) {
    try {
      const [deleted] = await db
        .delete(cartpandaIntegrations)
        .where(eq(cartpandaIntegrations.id, integrationId))
        .returning();
      
      if (!deleted) {
        throw new Error('Integration not found');
      }
      
      return deleted;
    } catch (error) {
      console.error('❌ Error deleting CartPanda integration:', error);
      throw error;
    }
  }

  async createOrUpdateFulfillmentIntegration(operationId: string, data: {
    provider: string;
    credentials: any;
    integrationId?: string; // Se fornecido, atualiza essa integração específica
  }) {
    try {
      // Se integrationId for fornecido, atualizar essa integração específica
      if (data.integrationId) {
        const [updated] = await db
          .update(fulfillmentIntegrations)
          .set({
            provider: data.provider,
            credentials: data.credentials,
            status: 'active',
            updatedAt: new Date()
          })
          .where(eq(fulfillmentIntegrations.id, data.integrationId))
          .returning();
        return updated;
      }
      
      // Verificar se já existe integração com esse provider para esta operação
      const [existing] = await db
        .select()
        .from(fulfillmentIntegrations)
        .where(
          and(
            eq(fulfillmentIntegrations.operationId, operationId),
            eq(fulfillmentIntegrations.provider, data.provider)
          )
        )
        .limit(1);

      if (existing) {
        // Atualizar integração existente do mesmo provider
        const [updated] = await db
          .update(fulfillmentIntegrations)
          .set({
            credentials: data.credentials,
            status: 'active',
            updatedAt: new Date()
          })
          .where(eq(fulfillmentIntegrations.id, existing.id))
          .returning();
        return updated;
      } else {
        // Criar nova integração
        const [created] = await db
          .insert(fulfillmentIntegrations)
          .values({
            operationId,
            provider: data.provider,
            credentials: data.credentials,
            status: 'active'
          })
          .returning();
        return created;
      }
    } catch (error) {
      console.error('❌ Error creating/updating Fulfillment integration:', error);
      throw error;
    }
  }

  async deleteFulfillmentIntegration(integrationId: string) {
    try {
      const [deleted] = await db
        .delete(fulfillmentIntegrations)
        .where(eq(fulfillmentIntegrations.id, integrationId))
        .returning();
      
      if (!deleted) {
        throw new Error('Integration not found');
      }
      
      return deleted;
    } catch (error) {
      console.error('❌ Error deleting Fulfillment integration:', error);
      throw error;
    }
  }

  async createOrUpdateMetaAdsIntegration(operationId: string, data: {
    accountId: string;
    accountName?: string;
    accessToken: string;
    integrationId?: string; // Se fornecido, atualiza essa integração específica
  }) {
    try {
      // Se integrationId for fornecido, atualizar essa integração específica
      if (data.integrationId) {
        const [updated] = await db
          .update(facebookAdsIntegrations)
          .set({
            accountId: data.accountId,
            accountName: data.accountName,
            accessToken: data.accessToken,
            status: 'active',
            updatedAt: new Date()
          })
          .where(eq(facebookAdsIntegrations.id, data.integrationId))
          .returning();
        return updated;
      }
      
      // Verificar se já existe integração com esse accountId para esta operação
      const [existing] = await db
        .select()
        .from(facebookAdsIntegrations)
        .where(
          and(
            eq(facebookAdsIntegrations.operationId, operationId),
            eq(facebookAdsIntegrations.accountId, data.accountId)
          )
        )
        .limit(1);

      if (existing) {
        const [updated] = await db
          .update(facebookAdsIntegrations)
          .set({
            accountName: data.accountName,
            accessToken: data.accessToken,
            status: 'active',
            updatedAt: new Date()
          })
          .where(eq(facebookAdsIntegrations.id, existing.id))
          .returning();
        return updated;
      } else {
        const [created] = await db
          .insert(facebookAdsIntegrations)
          .values({
            operationId,
            accountId: data.accountId,
            accountName: data.accountName,
            accessToken: data.accessToken,
            status: 'active'
          })
          .returning();
        return created;
      }
    } catch (error) {
      console.error('❌ Error creating/updating Meta Ads integration:', error);
      throw error;
    }
  }

  async deleteMetaAdsIntegration(integrationId: string) {
    try {
      const [deleted] = await db
        .delete(facebookAdsIntegrations)
        .where(eq(facebookAdsIntegrations.id, integrationId))
        .returning();
      
      if (!deleted) {
        throw new Error('Integration not found');
      }
      
      return deleted;
    } catch (error) {
      console.error('❌ Error deleting Meta Ads integration:', error);
      throw error;
    }
  }

  async createOrUpdateGoogleAdsIntegration(operationId: string, data: {
    customerId: string;
    accountName?: string;
    refreshToken: string;
    integrationId?: string; // Se fornecido, atualiza essa integração específica
  }) {
    try {
      // Se integrationId for fornecido, atualizar essa integração específica
      if (data.integrationId) {
        const [updated] = await db
          .update(googleAdsIntegrations)
          .set({
            customerId: data.customerId,
            accountName: data.accountName,
            refreshToken: data.refreshToken,
            status: 'active',
            updatedAt: new Date()
          })
          .where(eq(googleAdsIntegrations.id, data.integrationId))
          .returning();
        return updated;
      }
      
      // Verificar se já existe integração com esse customerId para esta operação
      const [existing] = await db
        .select()
        .from(googleAdsIntegrations)
        .where(
          and(
            eq(googleAdsIntegrations.operationId, operationId),
            eq(googleAdsIntegrations.customerId, data.customerId)
          )
        )
        .limit(1);

      if (existing) {
        const [updated] = await db
          .update(googleAdsIntegrations)
          .set({
            accountName: data.accountName,
            refreshToken: data.refreshToken,
            status: 'active',
            updatedAt: new Date()
          })
          .where(eq(googleAdsIntegrations.id, existing.id))
          .returning();
        return updated;
      } else {
        const [created] = await db
          .insert(googleAdsIntegrations)
          .values({
            operationId,
            customerId: data.customerId,
            accountName: data.accountName,
            refreshToken: data.refreshToken,
            status: 'active'
          })
          .returning();
        return created;
      }
    } catch (error) {
      console.error('❌ Error creating/updating Google Ads integration:', error);
      throw error;
    }
  }

  async deleteGoogleAdsIntegration(integrationId: string) {
    try {
      const [deleted] = await db
        .delete(googleAdsIntegrations)
        .where(eq(googleAdsIntegrations.id, integrationId))
        .returning();
      
      if (!deleted) {
        throw new Error('Integration not found');
      }
      
      return deleted;
    } catch (error) {
      console.error('❌ Error deleting Google Ads integration:', error);
      throw error;
    }
  }
}

export const adminService = new AdminService();