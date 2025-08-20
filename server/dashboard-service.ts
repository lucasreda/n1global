import { db } from "./db";
import { orders, dashboardMetrics, type InsertDashboardMetrics } from "@shared/schema";
import { eq, and, gte, lte, sql, count, sum, avg } from "drizzle-orm";

export class DashboardService {
  
  async getDashboardMetrics(period: '1d' | '7d' | '30d' | '90d' = '30d', provider?: string) {
    console.log(`📊 Getting dashboard metrics for period: ${period}, provider: ${provider || 'all'}`);
    
    // Check cache first
    const cached = await this.getCachedMetrics(period, provider);
    if (cached && cached.validUntil > new Date()) {
      console.log(`📦 Using cached metrics for ${period}`);
      return cached;
    }
    
    // Calculate fresh metrics
    const metrics = await this.calculateMetrics(period, provider);
    
    // Cache the results
    await this.cacheMetrics(period, provider, metrics);
    
    return metrics;
  }
  
  private async getCachedMetrics(period: string, provider?: string) {
    const [cached] = await db
      .select()
      .from(dashboardMetrics)
      .where(
        and(
          eq(dashboardMetrics.period, period),
          provider 
            ? eq(dashboardMetrics.provider, provider)
            : eq(dashboardMetrics.provider, sql`NULL`)
        )
      )
      .orderBy(sql`${dashboardMetrics.calculatedAt} DESC`)
      .limit(1);
    
    return cached;
  }
  
  private async calculateMetrics(period: string, provider?: string) {
    const dateRange = this.getDateRange(period);
    console.log(`📅 Calculating metrics from ${dateRange.from.toISOString()} to ${dateRange.to.toISOString()}`);
    
    // Base query conditions - use createdAt since orderDate might be null
    let whereConditions = [
      gte(orders.createdAt, dateRange.from),
      lte(orders.createdAt, dateRange.to)
    ];
    
    if (provider) {
      whereConditions.push(eq(orders.provider, provider));
    }
    
    const whereClause = and(...whereConditions);
    
    // Get total order counts by status
    const statusCounts = await db
      .select({
        status: orders.status,
        count: count(),
        totalRevenue: sum(orders.total)
      })
      .from(orders)
      .where(whereClause)
      .groupBy(orders.status);
    
    // Calculate metrics
    let totalOrders = 0;
    let deliveredOrders = 0;
    let cancelledOrders = 0;
    let shippedOrders = 0;
    let pendingOrders = 0;
    let totalRevenue = 0;
    
    statusCounts.forEach(row => {
      const orderCount = Number(row.count);
      const revenue = Number(row.totalRevenue || 0);
      
      totalOrders += orderCount;
      totalRevenue += revenue;
      
      switch (row.status) {
        case 'delivered':
          deliveredOrders += orderCount;
          break;
        case 'cancelled':
          cancelledOrders += orderCount;
          break;
        case 'shipped':
          shippedOrders += orderCount;
          break;
        case 'confirmed':
        case 'pending':
        default:
          pendingOrders += orderCount;
          break;
      }
    });
    
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    console.log(`📈 Calculated metrics: Total: ${totalOrders}, Delivered: ${deliveredOrders}, Cancelled: ${cancelledOrders}, Revenue: €${totalRevenue}`);
    
    return {
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      shippedOrders,
      pendingOrders,
      totalRevenue,
      averageOrderValue,
      period,
      provider: provider || null,
      calculatedAt: new Date(),
      // Cache for 1 hour for recent periods, 6 hours for older periods
      validUntil: new Date(Date.now() + (period === '1d' ? 1 : 6) * 60 * 60 * 1000)
    };
  }
  
  private async cacheMetrics(period: string, provider: string | undefined, metrics: any) {
    const cacheData: InsertDashboardMetrics = {
      period,
      provider: provider || null,
      totalOrders: metrics.totalOrders,
      deliveredOrders: metrics.deliveredOrders,
      cancelledOrders: metrics.cancelledOrders,
      shippedOrders: metrics.shippedOrders,
      pendingOrders: metrics.pendingOrders,
      totalRevenue: metrics.totalRevenue.toString(),
      averageOrderValue: metrics.averageOrderValue.toString(),
      calculatedAt: metrics.calculatedAt,
      validUntil: metrics.validUntil
    };
    
    // Delete old cache entries for this period/provider
    await db
      .delete(dashboardMetrics)
      .where(
        and(
          eq(dashboardMetrics.period, period),
          provider 
            ? eq(dashboardMetrics.provider, provider)
            : eq(dashboardMetrics.provider, sql`NULL`)
        )
      );
    
    // Insert new cache
    await db.insert(dashboardMetrics).values(cacheData);
    
    console.log(`💾 Cached metrics for ${period}${provider ? ` (${provider})` : ''}`);
  }
  
  private getDateRange(period: string) {
    const now = new Date();
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59); // End of today
    
    let from: Date;
    
    switch (period) {
      case '1d':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0); // Start of today
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
      default:
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    return { from, to };
  }
  
  async getRevenueOverTime(period: '7d' | '30d' | '90d' = '30d', provider?: string) {
    const dateRange = this.getDateRange(period);
    
    let whereConditions = [
      gte(orders.orderDate, dateRange.from),
      lte(orders.orderDate, dateRange.to),
      eq(orders.status, 'delivered') // Only count delivered orders for revenue
    ];
    
    if (provider) {
      whereConditions.push(eq(orders.provider, provider));
    }
    
    // Group by date
    const revenueData = await db
      .select({
        date: sql<string>`DATE(${orders.orderDate})`,
        revenue: sum(orders.total),
        orderCount: count()
      })
      .from(orders)
      .where(and(...whereConditions))
      .groupBy(sql`DATE(${orders.orderDate})`)
      .orderBy(sql`DATE(${orders.orderDate})`);
    
    return revenueData.map(row => ({
      date: row.date,
      revenue: Number(row.revenue || 0),
      orders: Number(row.orderCount)
    }));
  }
  
  async getOrdersByStatus(period: '7d' | '30d' | '90d' = '30d', provider?: string) {
    const dateRange = this.getDateRange(period);
    
    let whereConditions = [
      gte(orders.orderDate, dateRange.from),
      lte(orders.orderDate, dateRange.to)
    ];
    
    if (provider) {
      whereConditions.push(eq(orders.provider, provider));
    }
    
    const statusData = await db
      .select({
        status: orders.status,
        count: count(),
        percentage: sql<number>`
          ROUND(
            COUNT(*) * 100.0 / (
              SELECT COUNT(*) 
              FROM ${orders} 
              WHERE ${and(...whereConditions)}
            ), 
            1
          )
        `
      })
      .from(orders)
      .where(and(...whereConditions))
      .groupBy(orders.status);
    
    return statusData.map(row => ({
      status: row.status,
      count: Number(row.count),
      percentage: Number(row.percentage)
    }));
  }
  
  async getProviderComparison() {
    const providers = await db
      .select({
        provider: orders.provider,
        totalOrders: count(),
        deliveredOrders: sql<number>`SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END)`,
        totalRevenue: sum(orders.total),
        successRate: sql<number>`
          ROUND(
            SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 
            1
          )
        `
      })
      .from(orders)
      .groupBy(orders.provider);
    
    return providers.map(row => ({
      provider: row.provider,
      totalOrders: Number(row.totalOrders),
      deliveredOrders: Number(row.deliveredOrders),
      totalRevenue: Number(row.totalRevenue || 0),
      successRate: Number(row.successRate)
    }));
  }
  
  async invalidateCache(period?: string, provider?: string) {
    let conditions = [];
    
    if (period) {
      conditions.push(eq(dashboardMetrics.period, period));
    }
    
    if (provider) {
      conditions.push(eq(dashboardMetrics.provider, provider));
    }
    
    if (conditions.length === 0) {
      // Clear all cache
      await db.delete(dashboardMetrics);
    } else {
      await db.delete(dashboardMetrics).where(and(...conditions));
    }
    
    console.log(`🗑️ Cleared dashboard metrics cache`);
  }
}

export const dashboardService = new DashboardService();