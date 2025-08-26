import { storage } from "./storage";
import { db } from "./db";
import { stores, operations, orders, users, products, userProducts } from "@shared/schema";
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
        }))
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
          storeId: operations.storeId,
          storeName: stores.name,
          country: operations.country,
          currency: operations.currency,
          status: operations.status,
          createdAt: operations.createdAt
        })
        .from(operations)
        .leftJoin(stores, sql`${stores.id} = ${operations.storeId}`)
        .orderBy(desc(operations.createdAt));
      
      if (storeId && storeId !== 'all') {
        query = query.where(sql`${operations.storeId} = ${storeId}`) as any;
      }
      
      return await query;
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
          status: orders.status,
          amount: orders.total,
          currency: orders.currency,
          orderDate: orders.orderDate,
          provider: orders.provider,
          dataSource: orders.dataSource,
          shopifyOrderNumber: orders.shopifyOrderNumber,
          carrierImported: orders.carrierImported
        })
        .from(orders)
        .leftJoin(stores, sql`${stores.id} = ${orders.storeId}`)
        .leftJoin(operations, sql`${operations.id} = ${orders.operationId}`)
        .where(and(dateFilter, searchFilter, storeFilter, operationFilter))
        .orderBy(desc(orders.orderDate))
        .limit(limit)
        .offset(offset);
      
      return globalOrders.map(order => ({
        ...order,
        amount: Number(order.amount) || 0
      }));
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
          isActive: products.isActive,
          createdAt: products.createdAt
        })
        .from(products)
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
  }) {
    try {
      // Since products are global, we'll use a default store/operation for now
      // In a future version, this could be made more flexible
      const [defaultStore] = await db.select().from(stores).limit(1);
      const [defaultOperation] = await db.select().from(operations).limit(1);
      
      if (!defaultStore) {
        throw new Error('No default store found');
      }

      const [newProduct] = await db
        .insert(products)
        .values({
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
          isActive: true
        })
        .returning();

      return {
        ...newProduct,
        price: Number(newProduct.price) || 0,
        costPrice: Number(newProduct.costPrice) || 0,
        shippingCost: Number(newProduct.shippingCost) || 0
      };
    } catch (error) {
      console.error('❌ Error creating product:', error);
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
}

export const adminService = new AdminService();