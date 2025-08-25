import { storage } from "./storage";
import { db } from "./db";
import { stores, operations, orders, users } from "@shared/schema";
import { count, sql, and, gte, lte, ilike, or, desc } from "drizzle-orm";

export class AdminService {
  
  async getGlobalStats() {
    try {
      // Get total counts
      const [storesCount] = await db.select({ count: count() }).from(stores);
      const [operationsCount] = await db.select({ count: count() }).from(operations);
      const [ordersCount] = await db.select({ count: count() }).from(orders);
      
      console.log('🔍 Global Stats Debug:', {
        storesCount: storesCount.count,
        operationsCount: operationsCount.count,
        ordersCount: ordersCount.count
      });
      
      // Get total revenue (sum of all delivered orders)
      const [revenueResult] = await db
        .select({ 
          totalRevenue: sql<number>`COALESCE(SUM(CAST(${orders.total} AS DECIMAL)), 0)` 
        })
        .from(orders)
        .where(sql`${orders.status} = 'delivered'`);
      
      // Get recent stores activity with aggregated data
      const recentStores = await db
        .select({
          id: stores.id,
          name: stores.name,
          operationsCount: count(operations.id),
          ordersCount: sql<number>`COUNT(${orders.id})`,
          revenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'delivered' THEN CAST(${orders.total} AS DECIMAL) ELSE 0 END), 0)`,
          lastActivity: sql<string>`MAX(${orders.orderDate})`
        })
        .from(stores)
        .leftJoin(operations, sql`${operations.storeId} = ${stores.id}`)
        .leftJoin(orders, sql`${orders.storeId} = ${stores.id}`)
        .groupBy(stores.id, stores.name)
        .orderBy(desc(sql`MAX(${orders.orderDate})`))
        .limit(5);
      
      return {
        totalStores: storesCount.count,
        totalOperations: operationsCount.count,
        totalOrders: ordersCount.count,
        totalRevenue: Number(revenueResult.totalRevenue) || 0,
        recentStores: recentStores.map(store => ({
          ...store,
          operationsCount: Number(store.operationsCount),
          ordersCount: Number(store.ordersCount),
          revenue: Number(store.revenue),
          lastActivity: store.lastActivity || new Date().toISOString()
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
      const { searchTerm, storeId, operationId, dateRange, limit = 50, offset = 0 } = filters;
      
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
}

export const adminService = new AdminService();