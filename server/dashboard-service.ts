import { db } from "./db";
import { orders, dashboardMetrics, products, stores, type InsertDashboardMetrics } from "@shared/schema";
import { eq, and, or, gte, lte, sql, count, sum, avg, isNotNull } from "drizzle-orm";
import { storage } from "./storage"; // CRITICAL: Import storage
import { FacebookAdsService } from "./facebook-ads-service";
import { currencyService } from "./currency-service";

export class DashboardService {
  private facebookAdsService = new FacebookAdsService();
  private defaultStoreId: string | null = null;

  private async getStoreId(req?: any): Promise<string | null> {
    // Se há um storeId no request context (vem do middleware), use ele
    if (req?.storeId) {
      return req.storeId;
    }

    // Fallback para loja padrão (compatibilidade)
    if (this.defaultStoreId) {
      return this.defaultStoreId;
    }

    // Buscar a primeira loja existente
    const [defaultStore] = await db
      .select({ id: stores.id })
      .from(stores)
      .limit(1);

    if (!defaultStore) {
      throw new Error('❌ Nenhuma loja encontrada no sistema');
    }

    this.defaultStoreId = defaultStore.id;
    return this.defaultStoreId;
  }
  
  async getDashboardMetrics(period: '1d' | '7d' | '30d' | '90d' | 'current_month' = 'current_month', provider?: string, req?: any, operationId?: string) {
    console.log(`📊 Getting dashboard metrics for period: ${period}, provider: ${provider || 'all'}`);
    
    // Check cache first
    const cached = await this.getCachedMetrics(period, provider, req, operationId);
    if (cached && cached.validUntil > new Date()) {
      console.log(`📦 Using cached metrics for ${period}`);
      
      // Get current exchange rates
      const exchangeRates = await currencyService.getExchangeRates();
      
      // Recalculate dynamic values (costs and BRL conversions)
      const totalRevenueBRL = await currencyService.convertToBRL(Number(cached.totalRevenue || 0), 'EUR');
      
      // Calculate costs dynamically
      const productCosts = await this.calculateProductCosts(period, provider);
      const marketingCosts = await this.getMarketingCosts(period);
      
      const totalProfit = Number(cached.totalRevenue || 0) - productCosts.totalProductCosts - marketingCosts.fallbackValue;
      const totalProfitBRL = await currencyService.convertToBRL(totalProfit, 'EUR');
      
      return {
        ...cached,
        exchangeRates, // Include current exchange rates
        totalRevenueBRL,
        totalProfitBRL,
        totalProfit,
        totalProductCosts: productCosts.totalProductCosts,
        totalProductCostsBRL: productCosts.totalProductCostsBRL, // Add BRL product costs
        marketingCosts: marketingCosts.fallbackValue,
        marketingCostsBRL: marketingCosts.totalBRL,
        marketingCostsEUR: marketingCosts.totalEUR,
        profitMargin: Number(cached.totalRevenue || 0) > 0 ? (totalProfit / Number(cached.totalRevenue || 0)) * 100 : 0,
        roi: (productCosts.totalProductCosts + marketingCosts.fallbackValue) > 0 ? 
          ((Number(cached.totalRevenue || 0) - productCosts.totalProductCosts - marketingCosts.fallbackValue) / (productCosts.totalProductCosts + marketingCosts.fallbackValue)) * 100 : 0
      };
    }
    
    // Calculate fresh metrics
    const metrics = await this.calculateMetrics(period, provider, req, operationId);
    
    // Cache the results
    await this.cacheMetrics(period, provider, metrics, req, operationId);
    
    return metrics;
  }
  
  private getEmptyMetrics() {
    return {
      totalOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      shippedOrders: 0,
      pendingOrders: 0,
      returnedOrders: 0,
      confirmedOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      conversionRate: 0,
      successRate: 0,
      productCosts: 0,
      shippingCosts: 0,
      marketingCosts: 0,
      marketingCostsBRL: 0,
      marketingCostsEUR: 0,
      profitMargin: 0,
      roi: 0
    };
  }
  
  private async getCachedMetrics(period: string, provider?: string, req?: any, operationId?: string) {
    try {
      // CRITICAL: Cache by operation, not by store
      let currentOperation;
      
      if (operationId) {
        // Use specific operation ID
        const userOperations = await storage.getUserOperations(req.user.id);
        currentOperation = userOperations.find(op => op.id === operationId);
      } else {
        // Fallback to first operation
        const userOperations = await storage.getUserOperations(req.user.id);
        currentOperation = userOperations[0];
      }
      
      if (!currentOperation) {
        return null;
      }
      
      const [cached] = await db
        .select()
        .from(dashboardMetrics)
        .where(
          and(
            eq(dashboardMetrics.period, period),
            eq(dashboardMetrics.operationId, currentOperation.id), // Use operationId
            provider 
              ? eq(dashboardMetrics.provider, provider)
              : eq(dashboardMetrics.provider, sql`NULL`)
          )
        )
        .limit(1);
      
      return cached || null;
    } catch (error) {
      console.warn("Failed to get cached metrics:", error);
      return null;
    }
  }
  
  private async calculateMetrics(period: string, provider?: string, req?: any, operationId?: string) {
    const dateRange = this.getDateRange(period);
    
    // CRITICAL: Get user's current operation for data isolation
    let currentOperation;
    
    if (operationId) {
      // Use specific operation ID
      const userOperations = await storage.getUserOperations(req.user.id);
      currentOperation = userOperations.find(op => op.id === operationId);
    } else {
      // Fallback to first operation
      const userOperations = await storage.getUserOperations(req.user.id);
      currentOperation = userOperations[0]; // User's active operation
    }
    
    if (!currentOperation) {
      console.log(`⚠️ No operation found for user ${req.user.id}`);
      return this.getEmptyMetrics();
    }
    
    console.log(`📅 Calculating metrics for period: ${period}, operation: ${currentOperation.name} (${currentOperation.id})`);
    
    // CRITICAL: Use operationId instead of storeId for data isolation + DATE FILTERING
    let whereConditions = [
      eq(orders.operationId, currentOperation.id),
      gte(orders.orderDate, dateRange.from), // FIXED: Filter by Shopify order date
      lte(orders.orderDate, dateRange.to)    // FIXED: Filter by Shopify order date
    ];
    
    if (provider) {
      whereConditions.push(eq(orders.provider, provider));
    }
    
    const whereClause = and(...whereConditions);
    
    // 1. Get order counts by status filtered by Shopify order date (for counting)
    const statusCounts = await db
      .select({
        status: orders.status,
        count: count()
      })
      .from(orders)
      .where(whereClause)
      .groupBy(orders.status);
    
    // 2. Get revenue and financial data also filtered by period (same as order counts)
    const revenueQuery = await db
      .select({
        totalRevenue: sum(orders.total),
        deliveredCount: count()
      })
      .from(orders)
      .where(and(
        eq(orders.operationId, currentOperation.id),
        gte(orders.orderDate, dateRange.from), // SAME date filter as order counts
        lte(orders.orderDate, dateRange.to),   // SAME date filter as order counts
        eq(orders.status, 'delivered'), // Only delivered/paid orders count for revenue
        provider ? eq(orders.provider, provider) : sql`TRUE`
      ));
    
    // 3. Get transportadora data filtered by period AND carrier_imported = true
    const transportadoraStats = await db
      .select({
        status: orders.status,
        count: count()
      })
      .from(orders)
      .where(and(
        eq(orders.operationId, currentOperation.id),
        gte(orders.orderDate, dateRange.from), // SAME period filter
        lte(orders.orderDate, dateRange.to),   // SAME period filter
        eq(orders.carrierImported, true), // ONLY orders found in carrier/transportadora
        provider ? eq(orders.provider, provider) : sql`TRUE`
      ))
      .groupBy(orders.status);
    
    // Calculate metrics from order counts (filtered by period)
    let totalOrders = 0;
    let deliveredOrders = 0;
    let cancelledOrders = 0;
    let shippedOrders = 0;
    let pendingOrders = 0;
    let returnedOrders = 0;
    let confirmedOrders = 0;
    
    statusCounts.forEach(row => {
      const orderCount = Number(row.count);
      totalOrders += orderCount;
      
      // Map real status values from European Fulfillment to dashboard categories
      switch (row.status) {
        case 'delivered':
          deliveredOrders += orderCount;
          break;
        case 'returned':
          returnedOrders += orderCount;
          break;
        case 'unpacked':
          // unpacked orders are NOT confirmed - they reduce the confirmed count
          break;
        case 'cancelled':
        case 'canceled':
        case 'rejected':
          cancelledOrders += orderCount;
          break;
        case 'shipped':
        case 'in transit':
        case 'in delivery':
          shippedOrders += orderCount;
          break;
        case 'confirmed':
        case 'pending':
        case 'new order':
        case 'item packed':
        case 'incident':
        default:
          pendingOrders += orderCount;
          break;
      }
    });
    
    // Get revenue from period-filtered delivered orders
    const totalRevenue = Number(revenueQuery[0]?.totalRevenue || 0);
    const totalDeliveredForRevenue = Number(revenueQuery[0]?.deliveredCount || 0);
    
    const averageOrderValue = totalDeliveredForRevenue > 0 ? totalRevenue / totalDeliveredForRevenue : 0;
    
    // Calculate product costs and shipping costs based on order quantities
    const productCosts = await this.calculateProductCosts(period, provider, operationId, req);
    const totalProductCosts = productCosts.totalProductCosts; // EUR value (product only)
    const totalProductCostsBRL = productCosts.totalProductCostsBRL; // BRL value (product only)
    const totalShippingCosts = productCosts.totalShippingCosts; // EUR value (shipping only)
    const totalShippingCostsBRL = productCosts.totalShippingCostsBRL; // BRL value (shipping only)
    const totalCombinedCosts = productCosts.totalCombinedCosts; // EUR value (product + shipping)
    const totalCombinedCostsBRL = productCosts.totalCombinedCostsBRL; // BRL value (product + shipping)
    
    // Calculate marketing costs from selected Facebook campaigns based on period
    const marketingCosts = await this.getMarketingCosts(period);
    
    // Calculate confirmed orders (total - unpacked)
    const unpackedOrders = statusCounts
      .filter(row => row.status === 'unpacked')
      .reduce((sum, row) => sum + row.count, 0);
    
    // Override confirmedOrders calculation: total orders - unpacked orders
    confirmedOrders = totalOrders - unpackedOrders;
    
    console.log(`🔍 Debug: Total: ${totalOrders}, Unpacked: ${unpackedOrders}, Confirmed: ${confirmedOrders}`);
    
    // Calculate transportadora totals for delivery rate (period-filtered)
    let totalTransportadoraOrders = 0;
    let deliveredTransportadoraOrders = 0;
    let cancelledTransportadoraOrders = 0;
    
    transportadoraStats.forEach(row => {
      const orderCount = Number(row.count);
      totalTransportadoraOrders += orderCount;
      
      switch (row.status) {
        case 'delivered':
          deliveredTransportadoraOrders += orderCount;
          break;
        case 'cancelled':
        case 'canceled':
        case 'rejected':
          cancelledTransportadoraOrders += orderCount;
          break;
      }
    });
    
    // Calculate delivery percentage based on transportadora data
    const deliveryRate = totalTransportadoraOrders > 0 ? (deliveredTransportadoraOrders / totalTransportadoraOrders) * 100 : 0;
    
    // Get current exchange rates
    const exchangeRates = await currencyService.getExchangeRates();
    
    // Convert revenue to BRL for consistent calculations
    const totalRevenueBRL = await currencyService.convertToBRL(totalRevenue, 'EUR');
    
    // Calculate profit using BRL values (revenue BRL - combined costs BRL - marketing costs BRL)
    const marketingCostsBRL = marketingCosts.totalBRL;
    const totalProfitBRL = totalRevenueBRL - totalCombinedCostsBRL - marketingCostsBRL;
    const profitMargin = totalRevenueBRL > 0 ? (totalProfitBRL / totalRevenueBRL) * 100 : 0;
    
    // Calculate ROI (return on investment) in BRL
    const totalCostsBRL = totalCombinedCostsBRL + marketingCostsBRL;
    const roi = totalCostsBRL > 0 ? ((totalRevenueBRL - totalCostsBRL) / totalCostsBRL) * 100 : 0;
    
    console.log(`🔍 Debug Shopify: Total: ${totalOrders}, Unpacked: ${unpackedOrders}, Confirmed: ${confirmedOrders}`);
    console.log(`🔍 Debug Transportadora: Total: ${totalTransportadoraOrders}, Delivered: ${deliveredTransportadoraOrders}, Cancelled: ${cancelledTransportadoraOrders}`);
    console.log(`📈 Calculated metrics for ${period}: Total: ${totalOrders}, Delivered: ${deliveredOrders}, Returned: ${returnedOrders}, Confirmed: ${confirmedOrders}, Cancelled: ${cancelledTransportadoraOrders}, Shipped: ${shippedOrders}, Pending: ${pendingOrders}, Revenue: €${totalRevenue}`);
    
    return {
      exchangeRates, // Include current exchange rates
      totalOrders: totalTransportadoraOrders, // Transportadora orders filtered by period
      shopifyOrders: totalOrders, // Shopify orders filtered by period
      deliveredOrders, // Shopify delivered orders filtered by period  
      cancelledOrders: cancelledTransportadoraOrders, // Transportadora cancelled orders filtered by period
      returnedOrders,
      confirmedOrders,
      shippedOrders,
      pendingOrders,
      totalRevenue,
      totalRevenueBRL, // Added BRL value for display
      totalProductCosts, // EUR value for reference (product only)
      totalProductCostsBRL, // BRL value for display (product only)
      totalShippingCosts, // EUR value for reference (shipping only)
      totalShippingCostsBRL, // BRL value for display (shipping only)
      totalCombinedCosts, // EUR value for reference (product + shipping)
      totalCombinedCostsBRL, // BRL value for calculations (product + shipping)
      marketingCosts: marketingCostsBRL, // Main value for calculations in BRL
      marketingCostsBRL: marketingCosts.totalBRL, // Explicit BRL value
      marketingCostsEUR: marketingCosts.totalEUR, // EUR value for display
      deliveryRate,
      totalProfit: totalProfitBRL, // Now calculated in BRL
      totalProfitBRL, // BRL value for display
      profitMargin,
      roi,
      averageOrderValue,
      period,
      provider: provider || null,
      calculatedAt: new Date(),
      // Cache for 1 hour for recent periods, 6 hours for older periods
      validUntil: new Date(Date.now() + (period === '1d' ? 1 : 6) * 60 * 60 * 1000)
    };
  }
  
  private async cacheMetrics(period: string, provider: string | undefined, metrics: any, req?: any, operationId?: string) {
    // CRITICAL: Cache by operation, not store
    let currentOperation;
    
    if (operationId) {
      // Use specific operation ID
      const userOperations = await storage.getUserOperations(req.user.id);
      currentOperation = userOperations.find(op => op.id === operationId);
    } else {
      // Fallback to first operation
      const userOperations = await storage.getUserOperations(req.user.id);
      currentOperation = userOperations[0];
    }
    
    if (!currentOperation) {
      return; // No operation to cache for
    }
    
    const cacheData: InsertDashboardMetrics = {
      period,
      provider: provider || null,
      storeId: currentOperation.storeId, // Add storeId from operation
      operationId: currentOperation.id, // Use operationId instead of storeId
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
    
    // Delete old cache entries for this period/provider/operation
    await db
      .delete(dashboardMetrics)
      .where(
        and(
          eq(dashboardMetrics.period, period),
          eq(dashboardMetrics.operationId, currentOperation.id), // Use operationId
          provider 
            ? eq(dashboardMetrics.provider, provider)
            : eq(dashboardMetrics.provider, sql`NULL`)
        )
      );
    
    // Insert new cache
    await db.insert(dashboardMetrics).values(cacheData);
    
    console.log(`💾 Cached metrics for ${period}${provider ? ` (${provider})` : ''}`);
  }

  async invalidateCache() {
    try {
      // Invalida todo o cache do dashboard deletando entradas antigas
      await db.delete(dashboardMetrics);
      console.log('🗑️ Dashboard cache invalidated - will recalculate on next request');
    } catch (error) {
      console.warn('Cache invalidation failed:', error);
    }
  }
  
  private async calculateProductCosts(period: string, provider?: string, operationId?: string, req?: any) {
    const dateRange = this.getDateRange(period);
    
    // CRITICAL: Get operation for data isolation
    let currentOperation;
    
    if (operationId) {
      // Use specific operation ID
      const userOperations = await storage.getUserOperations(req.user.id);
      currentOperation = userOperations.find(op => op.id === operationId);
    } else {
      // Fallback to first operation
      const userOperations = await storage.getUserOperations(req.user.id);
      currentOperation = userOperations[0];
    }
    
    if (!currentOperation) {
      // No operation, return zero costs
      return {
        totalProductCosts: 0,
        totalProductCostsBRL: 0,
        totalShippingCosts: 0,
        totalShippingCostsBRL: 0,
        totalCombinedCosts: 0,
        totalCombinedCostsBRL: 0,
        totalQuantity: 0
      };
    }
    
    // Build where conditions for delivered orders only (as requested)
    let whereConditions = [
      eq(orders.operationId, currentOperation.id),
      eq(orders.status, 'delivered'), // Only delivered orders
      gte(orders.orderDate, dateRange.from),
      lte(orders.orderDate, dateRange.to)
    ];
    
    if (provider) {
      whereConditions.push(eq(orders.provider, provider));
    }
    
    // Get delivered orders with their products data
    const deliveredOrders = await db
      .select({
        id: orders.id,
        products: orders.products,
        total: orders.total
      })
      .from(orders)
      .where(and(...whereConditions));
    
    let totalProductCosts = 0;
    let totalShippingCosts = 0;
    let processedOrders = 0;
    
    // Get store context for user product lookup
    const storeId = await this.getStoreId(req);
    
    // Process each delivered order to calculate costs based on linked products
    for (const order of deliveredOrders) {
      if (!order.products) continue;
      
      // Extract SKUs from products array (jsonb)
      const productsArray = order.products as any[];
      if (!Array.isArray(productsArray)) continue;
      
      // Process each product in the order
      for (const productInfo of productsArray) {
        const sku = productInfo?.sku || productInfo?.product_sku;
        if (!sku) continue;
        
        // Find linked product by SKU for this store
        const linkedProduct = await storage.getUserProductBySku(sku, storeId);
        
        if (linkedProduct) {
          // Use custom costs from linked product or fall back to product defaults
          const productCost = parseFloat(linkedProduct.customCostPrice || linkedProduct.product.costPrice || "0");
          const shippingCost = parseFloat(linkedProduct.customShippingCost || linkedProduct.product.shippingCost || "0");
          
          totalProductCosts += productCost;
          totalShippingCosts += shippingCost;
          
          console.log(`💰 Order ${order.id}: SKU ${sku} - Product: €${productCost}, Shipping: €${shippingCost}`);
        } else {
          // If no linked product found, use fallback calculation
          const orderValue = parseFloat(order.total || "0");
          const fallbackProductCost = orderValue >= 120 ? 45.00 : orderValue >= 60 ? 35.00 : 30.00;
          const fallbackShippingCost = orderValue >= 120 ? 15.00 : orderValue >= 60 ? 12.00 : 10.00;
          
          totalProductCosts += fallbackProductCost;
          totalShippingCosts += fallbackShippingCost;
          
          console.log(`💰 Order ${order.id}: SKU ${sku} (fallback) - Product: €${fallbackProductCost}, Shipping: €${fallbackShippingCost}`);
        }
      }
      
      processedOrders++;
    }
    
    console.log(`💰 Costs calculation - Product: €${totalProductCosts}, Shipping: €${totalShippingCosts}, Orders: ${processedOrders}`);
    
    // Convert both product and shipping costs from EUR to BRL using the currency API
    const totalProductCostsBRL = await currencyService.convertToBRL(totalProductCosts, 'EUR');
    const totalShippingCostsBRL = await currencyService.convertToBRL(totalShippingCosts, 'EUR');
    
    // Calculate total costs (product + shipping)
    const totalCombinedCosts = totalProductCosts + totalShippingCosts;
    const totalCombinedCostsBRL = totalProductCostsBRL + totalShippingCostsBRL;
    
    return {
      totalProductCosts: Number(totalProductCosts.toFixed(2)), // Product costs only in EUR
      totalProductCostsBRL: Number(totalProductCostsBRL.toFixed(2)), // Product costs only in BRL
      totalShippingCosts: Number(totalShippingCosts.toFixed(2)), // Shipping costs only in EUR
      totalShippingCostsBRL: Number(totalShippingCostsBRL.toFixed(2)), // Shipping costs only in BRL
      totalCombinedCosts: Number(totalCombinedCosts.toFixed(2)), // Combined costs in EUR
      totalCombinedCostsBRL: Number(totalCombinedCostsBRL.toFixed(2)), // Combined costs in BRL
      totalQuantity: processedOrders
    };
  }

  private async getMarketingCosts(period: string = '30d'): Promise<{ totalBRL: number; totalEUR: number; fallbackValue: number }> {
    try {
      // Convert dashboard period to Facebook period format
      const fbPeriod = this.convertPeriodToFacebookFormat(period);
      const marketingData = await this.facebookAdsService.getMarketingCostsByPeriod(fbPeriod);
      
      return {
        totalBRL: marketingData.totalBRL,
        totalEUR: marketingData.totalEUR,
        fallbackValue: marketingData.totalBRL // Use BRL as main value for calculations
      };
    } catch (error) {
      console.warn("Failed to fetch Facebook Ads costs, using fallback:", error);
      return {
        totalBRL: 0,
        totalEUR: 0,
        fallbackValue: 0
      };
    }
  }

  private convertPeriodToFacebookFormat(period: string): string {
    switch (period) {
      case '1d':
        return 'today';
      case '7d':
        return 'last_7d';
      case '30d':
        return 'last_30d';
      case '90d':
        return 'this_quarter';
      case 'current_month':
        return 'this_month';
      default:
        return 'last_30d';
    }
  }
  
  private getDateRange(period: string) {
    const now = new Date();
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59); // End of today
    
    let from: Date;
    
    switch (period) {
      case '1d':
        // Último dia
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case '7d':
        // Últimos 7 dias
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        // Últimos 30 dias - incluir toda a data para pegar mais dados históricos
        from = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        // Últimos 90 dias
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'current_month':
        // Este mês completo: do primeiro dia do mês atual até hoje
        from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        break;
      default:
        // Default: todos os dados (últimos 365 dias para performance)
        from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }
    
    return { from, to };
  }
  
  async getRevenueOverTime(period: '7d' | '30d' | '90d' = '30d', provider?: string, req?: any, operationId?: string) {
    const dateRange = this.getDateRange(period);
    
    // CRITICAL: Get operation context for data isolation
    let currentOperation;
    
    if (operationId) {
      // Use specific operation ID
      const userOperations = await storage.getUserOperations(req.user.id);
      currentOperation = userOperations.find(op => op.id === operationId);
    } else {
      // Fallback to first operation
      const userOperations = await storage.getUserOperations(req.user.id);
      currentOperation = userOperations[0];
    }
    
    if (!currentOperation) {
      return []; // No operation, no data
    }
    
    let whereConditions = [
      eq(orders.operationId, currentOperation.id), // CRITICAL: Filter by operation
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
  
  async getOrdersByStatus(period: '7d' | '30d' | '90d' = '30d', provider?: string, req?: any) {
    const dateRange = this.getDateRange(period);
    
    // CRITICAL: Get operation context for data isolation
    const userOperations = await storage.getUserOperations(req.user.id);
    const currentOperation = userOperations[0];
    
    if (!currentOperation) {
      return []; // No operation, no data
    }
    
    let whereConditions = [
      eq(orders.operationId, currentOperation.id), // CRITICAL: Filter by operation
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
  

}

export const dashboardService = new DashboardService();