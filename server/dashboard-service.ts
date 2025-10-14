import { db } from "./db";
import { orders, dashboardMetrics, products, stores, type InsertDashboardMetrics } from "@shared/schema";
import { eq, and, or, gte, lte, sql, count, sum, avg, isNotNull, ne, not } from "drizzle-orm";
import { storage } from "./storage"; // CRITICAL: Import storage
import { FacebookAdsService } from "./facebook-ads-service";
import { currencyService } from "./currency-service";

export class DashboardService {
  private facebookAdsService = new FacebookAdsService();
  private defaultStoreId: string | null = null;

  private async getStoreId(req?: any, operationId?: string): Promise<string | null> {
    // Se há um operationId específico, buscar o storeId dessa operação
    if (operationId) {
      const { operations } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [operation] = await db
        .select({ storeId: operations.storeId })
        .from(operations)
        .where(eq(operations.id, operationId))
        .limit(1);
      
      if (operation) {
        console.log(`🎯 Using storeId from operation ${operationId}: ${operation.storeId}`);
        return operation.storeId;
      }
    }

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
  
  async getDashboardMetrics(period?: '1d' | '7d' | '30d' | '90d' | 'current_month', provider?: string, req?: any, operationId?: string, dateFrom?: string, dateTo?: string, productId?: string) {
    console.log(`📊 Getting dashboard metrics for period: ${period || `${dateFrom} to ${dateTo}`}, provider: ${provider || 'all'}, product: ${productId || 'all'}`);
    
    // When using custom date range or product filter, skip cache
    if ((dateFrom && dateTo) || productId) {
      const metrics = await this.calculateMetrics(period || '30d', provider, req, operationId, dateFrom, dateTo, productId);
      return metrics;
    }
    
    // Check cache first for period-based queries (no product filter)
    const cached = await this.getCachedMetrics(period || 'current_month', provider, req, operationId);
    if (cached && cached.validUntil > new Date()) {
      console.log(`📦 Using cached metrics for ${period}`);
      
      // OTIMIZAÇÃO: Uma única chamada para taxas + conversões síncronas
      const exchangeRates = await currencyService.getExchangeRates();
      console.log('🚀 Cache hit - reutilizando taxas para conversões de cache');
      
      const totalRevenueBRL = currencyService.convertToBRLSync(Number(cached.totalRevenue || 0), 'EUR', exchangeRates);
      const deliveredRevenueBRL = currencyService.convertToBRLSync(Number(cached.deliveredRevenue || 0), 'EUR', exchangeRates);
      const paidRevenueBRL = currencyService.convertToBRLSync(Number(cached.paidRevenue || 0), 'EUR', exchangeRates);
      const totalProfitBRL = currencyService.convertToBRLSync(Number(cached.totalProfit || 0), 'EUR', exchangeRates);
      
      console.log(`🚀 Using fully cached metrics for ${period} - no cost recalculation needed`);
      
      return {
        ...cached,
        exchangeRates, // Only update exchange rates
        totalRevenueBRL,
        deliveredRevenueBRL,
        paidRevenueBRL,
        totalProfitBRL,
        // Use cached costs directly
        totalProductCosts: Number(cached.totalProductCosts || 0),
        totalShippingCosts: Number(cached.totalShippingCosts || 0),
        totalCombinedCosts: Number(cached.totalCombinedCosts || 0),
        marketingCosts: Number(cached.marketingCosts || 0),
        totalProfit: Number(cached.totalProfit || 0),
        profitMargin: Number(cached.profitMargin || 0),
        roi: Number(cached.roi || 0),
        // Include new cached fields
        uniqueCustomers: Number(cached.uniqueCustomers || 0),
        avgDeliveryTimeDays: Number(cached.avgDeliveryTimeDays || 0),
        cpaBRL: Number(cached.cacBRL || 0),
        cpaEUR: Number(cached.cacEUR || 0),
        cpaAdsBRL: Number(cached.cpaAdsBRL || 0),
        cpaAdsEUR: Number(cached.cpaAdsEUR || 0),
      };
    }
    
    // Calculate fresh metrics
    const metrics = await this.calculateMetrics(period || 'current_month', provider, req, operationId, dateFrom, dateTo);
    
    // 🚀 CACHE INTELIGENTE: TTL baseado no período
    await this.cacheMetrics(period || 'current_month', provider, metrics, req, operationId);
    
    console.log(`💾 Métricas calculadas e armazenadas em cache por ${this.getCacheTTL(period || 'current_month')} minutos`);
    
    return metrics;
  }
  
  private getCacheTTL(period: string): number {
    // TTL inteligente baseado no período
    switch (period) {
      case '1d': return 2; // 2 minutos para dados do dia
      case '7d': return 5; // 5 minutos para última semana
      case '30d': return 15; // 15 minutos para últimos 30 dias
      case '90d': return 30; // 30 minutos para últimos 90 dias
      case 'current_month': return 60; // 1 hora para mês atual
      default: return 5;
    }
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
  
  // 🎯 MÉTODO PRINCIPAL: Conversões históricas otimizadas por agregação de data
  private async calculateHistoricalRevenue(operationId: string, dateRange: any, provider?: string) {
    console.log(`📊 Iniciando cálculo de receita histórica para operação ${operationId}`);
    
    // 1. Agregar pedidos POR DATA (otimizado com GROUP BY)
    let whereConditions = [
      eq(orders.operationId, operationId),
      gte(orders.orderDate, dateRange.from),
      lte(orders.orderDate, dateRange.to)
    ];
    
    if (provider) {
      whereConditions.push(eq(orders.provider, provider));
    }
    
    const dailyAggregation = await db
      .select({
        day: sql<string>`DATE(order_date)`,
        totalRevenueEUR: sql<string>`SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END)`,
        deliveredRevenueEUR: sql<string>`SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END)`,
        paidRevenueEUR: sql<string>`SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END)`, // COD: delivered = paid
        orderCount: sql<number>`COUNT(*)`,
        deliveredCount: sql<number>`SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END)`
      })
      .from(orders)
      .where(and(...whereConditions))
      .groupBy(sql`DATE(order_date)`)
      .orderBy(sql`DATE(order_date)`);
    
    console.log(`📈 Agregação por data concluída: ${dailyAggregation.length} dias com dados`);
    
    if (dailyAggregation.length === 0) {
      return {
        totalShopifyRevenueBRL: 0,
        deliveredRevenueBRL: 0,
        paidRevenueBRL: 0
      };
    }
    
    // 2. Buscar taxas históricas para TODAS as datas de uma vez (BATCH)
    const uniqueDates = dailyAggregation.map(row => row.day).filter(Boolean);
    const historicalRates = await currencyService.getHistoricalRates(uniqueDates);
    const currentRates = await currencyService.getExchangeRates(); // Para hoje
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`💱 Taxas carregadas: ${Object.keys(historicalRates).length} históricas + taxa atual`);
    
    // 3. Converter TOTAIS DIÁRIOS com suas taxas específicas
    let totalShopifyRevenueBRL = 0;
    let deliveredRevenueBRL = 0;
    let paidRevenueBRL = 0;
    
    for (const dayData of dailyAggregation) {
      if (!dayData.day) continue;
      
      const dayTotalEUR = parseFloat(dayData.totalRevenueEUR || '0');
      const dayDeliveredEUR = parseFloat(dayData.deliveredRevenueEUR || '0');
      const dayPaidEUR = parseFloat(dayData.paidRevenueEUR || '0');
      
      // Escolher taxa histórica OU atual
      let dayRates;
      if (dayData.day === today) {
        dayRates = currentRates;
        console.log(`📅 ${dayData.day} (HOJE): Usando taxa atual EUR=${currentRates.EUR}`);
      } else if (historicalRates[dayData.day]) {
        dayRates = historicalRates[dayData.day];
        console.log(`📅 ${dayData.day}: Usando taxa histórica EUR=${dayRates.EUR}`);
      } else {
        dayRates = currentRates; // Fallback
        console.warn(`⚠️ ${dayData.day}: Taxa histórica não encontrada, usando atual`);
      }
      
      // Converter totais do dia
      const dayTotalBRL = currencyService.convertToBRLSync(dayTotalEUR, 'EUR', dayRates);
      const dayDeliveredBRL = currencyService.convertToBRLSync(dayDeliveredEUR, 'EUR', dayRates);
      const dayPaidBRL = currencyService.convertToBRLSync(dayPaidEUR, 'EUR', dayRates);
      
      // Somar aos totais
      totalShopifyRevenueBRL += dayTotalBRL;
      deliveredRevenueBRL += dayDeliveredBRL;
      paidRevenueBRL += dayPaidBRL;
      
      console.log(`💰 ${dayData.day}: €${dayTotalEUR} → R$${dayTotalBRL.toFixed(2)} (taxa: ${dayRates.EUR})`);
    }
    
    console.log(`🎯 RESULTADO FINAL - Total: R$${totalShopifyRevenueBRL.toFixed(2)}, Entregue: R$${deliveredRevenueBRL.toFixed(2)}, Pago: R$${paidRevenueBRL.toFixed(2)}`);
    
    return {
      totalShopifyRevenueBRL,
      deliveredRevenueBRL,
      paidRevenueBRL
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
  
  private async calculateMetrics(period: string, provider?: string, req?: any, operationId?: string, dateFrom?: string, dateTo?: string, productId?: string) {
    // Use custom date range if provided, otherwise calculate from period
    const dateRange = (dateFrom && dateTo) 
      ? { from: new Date(dateFrom), to: new Date(dateTo + 'T23:59:59.000Z') } 
      : this.getDateRange(period);
    
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
    
    console.log(`📅 Calculating metrics for ${dateFrom && dateTo ? `custom range: ${dateFrom} to ${dateTo}` : `period: ${period}`}, operation: ${currentOperation.name} (${currentOperation.id}), product: ${productId || 'all'}`);
    console.log(`📅 Date range: ${dateRange.from.toISOString()} to ${dateRange.to.toISOString()}`);
    console.log(`📊 Chart will use same ${dateFrom && dateTo ? 'custom date range' : `period: ${period}`}`);
    
    // CRITICAL: Use operationId instead of storeId for data isolation + DATE FILTERING + PRODUCT FILTERING
    let whereConditions = [
      eq(orders.operationId, currentOperation.id),
      gte(orders.orderDate, dateRange.from), // FIXED: Filter by Shopify order date
      lte(orders.orderDate, dateRange.to)    // FIXED: Filter by Shopify order date
    ];
    
    if (provider) {
      whereConditions.push(eq(orders.provider, provider));
    }

    // Note: Product filtering removed - orders table doesn't have productId column
    // Products are stored in JSONB array, filtering would require JSON queries
    
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
    
    // 2. Get revenue data: total, delivered, and PAID revenue
    const revenueQuery = await db
      .select({
        totalRevenue: sum(orders.total),
        deliveredRevenue: sql<string>`SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END)`,
        deliveredCount: sql<number>`SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END)`,
        paidRevenue: sql<string>`SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END)`, // COD: Entregue = Pago
        paidCount: sql<number>`SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END)` // COD: Entregue = Pago
      })
      .from(orders)
      .where(and(
        eq(orders.operationId, currentOperation.id),
        gte(orders.orderDate, dateRange.from), // SAME date filter as order counts
        lte(orders.orderDate, dateRange.to),   // SAME date filter as order counts
        ne(orders.status, 'cancelled'), // All orders except cancelled (total Shopify revenue)
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
    
    // Get revenue data: total Shopify revenue vs delivered revenue vs PAID revenue
    const totalShopifyRevenue = Number(revenueQuery[0]?.totalRevenue || 0); // Total Shopify revenue (all non-cancelled)
    const deliveredRevenue = Number(revenueQuery[0]?.deliveredRevenue || 0); // Only delivered orders
    const paidRevenue = Number(revenueQuery[0]?.paidRevenue || 0); // Only PAID orders
    const totalDeliveredForRevenue = Number(revenueQuery[0]?.deliveredCount || 0);
    const totalPaidOrders = Number(revenueQuery[0]?.paidCount || 0);
    
    const averageOrderValue = totalDeliveredForRevenue > 0 ? deliveredRevenue / totalDeliveredForRevenue : 0;
    
    // OTIMIZAÇÃO: Fazer uma única chamada para taxas de câmbio primeiro
    const exchangeRates = await currencyService.getExchangeRates();
    console.log('🚀 Uma única chamada da API de moeda realizada - reutilizando taxas para todas conversões');
    
    // Parallelize independent cost calculations using pre-loaded exchange rates
    const storeId = await this.getStoreId(req, operationId);
    
    const [productCosts, marketingCosts] = await Promise.all([
      this.calculateProductCosts(period, provider, operationId, req, exchangeRates),
      this.getMarketingCosts(period, storeId, operationId, exchangeRates)
    ]);
    
    const totalProductCosts = productCosts.totalProductCosts; // EUR value (product only)
    const totalProductCostsBRL = productCosts.totalProductCostsBRL; // BRL value (product only)
    const totalShippingCosts = productCosts.totalShippingCosts; // EUR value (shipping only)
    const totalShippingCostsBRL = productCosts.totalShippingCostsBRL; // BRL value (shipping only)
    const totalCombinedCosts = productCosts.totalCombinedCosts; // EUR value (product + shipping)
    const totalCombinedCostsBRL = productCosts.totalCombinedCostsBRL; // BRL value (product + shipping)
    
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
    
    // 🎯 NOVA LÓGICA: Agregação por data com conversões históricas precisas
    const dailyRevenueData = await this.calculateHistoricalRevenue(currentOperation.id, dateRange, provider);
    
    const totalShopifyRevenueBRL = dailyRevenueData.totalShopifyRevenueBRL;
    const deliveredRevenueBRL = dailyRevenueData.deliveredRevenueBRL;
    const paidRevenueBRL = dailyRevenueData.paidRevenueBRL;
    
    console.log(`💰 Conversões HISTÓRICAS otimizadas - Receita Shopify: €${totalShopifyRevenue} = R$${totalShopifyRevenueBRL.toFixed(2)}`);
    console.log(`💰 Receita PAGA histórica: €${paidRevenue} = R$${paidRevenueBRL.toFixed(2)} (${totalPaidOrders} pedidos pagos)`);
    
    // Calculate profit using ONLY delivered/paid revenue (deliveredRevenueBRL - costs)
    const marketingCostsBRL = marketingCosts.totalBRL;
    // Custos retornados: 2 euros por pedido retornado
    const returnCostsBRL = currencyService.convertToBRLSync(returnedOrders * 2, 'EUR', exchangeRates);
    const totalProfitBRL = deliveredRevenueBRL - totalCombinedCostsBRL - marketingCostsBRL - returnCostsBRL;
    const profitMargin = deliveredRevenueBRL > 0 ? (totalProfitBRL / deliveredRevenueBRL) * 100 : 0;
    
    // Calculate ROI (return on investment) using delivered revenue
    const totalCostsBRL = totalCombinedCostsBRL + marketingCostsBRL + returnCostsBRL;
    const roi = totalCostsBRL > 0 ? ((deliveredRevenueBRL - totalCostsBRL) / totalCostsBRL) * 100 : 0;
    
    console.log(`🔍 Debug Shopify: Total: ${totalOrders}, Unpacked: ${unpackedOrders}, Confirmed: ${confirmedOrders}`);
    console.log(`🔍 Debug Transportadora: Total: ${totalTransportadoraOrders}, Delivered: ${deliveredTransportadoraOrders}, Cancelled: ${cancelledTransportadoraOrders}`);
    console.log(`📈 Calculated metrics for ${period}: Total: ${totalOrders}, Delivered: ${deliveredOrders}, Returned: ${returnedOrders}, Confirmed: ${confirmedOrders}, Cancelled: ${cancelledTransportadoraOrders}, Shipped: ${shippedOrders}, Pending: ${pendingOrders}, Shopify Revenue: €${totalShopifyRevenue}, Delivered Revenue: €${deliveredRevenue}, Paid Revenue: €${paidRevenue}`);
    
    // Calculate previous period orders for growth comparison
    const previousPeriodRange = this.getPreviousPeriodDateRange(period);
    const previousPeriodQuery = await db
      .select({
        count: count()
      })
      .from(orders)
      .where(and(
        eq(orders.operationId, currentOperation.id),
        gte(orders.orderDate, previousPeriodRange.from),
        lte(orders.orderDate, previousPeriodRange.to),
        provider ? eq(orders.provider, provider) : sql`TRUE`
      ));
    
    const previousPeriodOrders = Number(previousPeriodQuery[0]?.count || 0);
    
    // Calculate CAC and Delivery Time
    const customerAnalysisQuery = await db
      .select({
        uniqueCustomers: sql<number>`COUNT(DISTINCT customer_email)`,
        avgDeliveryTime: sql<string>`ROUND(AVG(
          CASE 
            WHEN status = 'delivered' 
              AND order_date IS NOT NULL 
              AND last_status_update IS NOT NULL
              AND EXTRACT(days FROM (last_status_update - order_date)) >= 0
              AND EXTRACT(days FROM (last_status_update - order_date)) < 100
            THEN EXTRACT(days FROM (last_status_update - order_date))
            ELSE NULL 
          END
        ), 1)`
      })
      .from(orders)
      .where(whereClause);
    
    const uniqueCustomers = Number(customerAnalysisQuery[0]?.uniqueCustomers || 0);
    const avgDeliveryTimeDays = Number(customerAnalysisQuery[0]?.avgDeliveryTime || 0);
    
    // Calculate CPA Real (Marketing Total / Delivered Orders)
    const cpaBRL = deliveredOrders > 0 ? marketingCostsBRL / deliveredOrders : 0;
    const cpaEUR = deliveredOrders > 0 ? marketingCosts.totalEUR / deliveredOrders : 0;
    
    // Calculate CPA Anúncios (Marketing Total / Total Shopify Orders)
    const cpaAdsBRL = totalOrders > 0 ? marketingCostsBRL / totalOrders : 0;
    const cpaAdsEUR = totalOrders > 0 ? marketingCosts.totalEUR / totalOrders : 0;
    
    console.log(`🔍 Customer Analysis Debug - Unique: ${uniqueCustomers}, Avg Delivery: ${avgDeliveryTimeDays} days`);
    console.log(`🔍 CPA Debug - Marketing BRL: ${marketingCostsBRL}, Delivered: ${deliveredOrders}, CPA: ${cpaBRL}`);
    
    return {
      exchangeRates, // Include current exchange rates
      totalOrders: totalTransportadoraOrders, // Transportadora orders filtered by period
      shopifyOrders: totalOrders, // Shopify orders filtered by period
      previousPeriodOrders, // Previous period orders for growth comparison
      deliveredOrders, // Shopify delivered orders filtered by period  
      cancelledOrders: cancelledTransportadoraOrders, // Transportadora cancelled orders filtered by period
      returnedOrders,
      confirmedOrders,
      shippedOrders,
      pendingOrders,
      totalRevenue: totalShopifyRevenue, // Total Shopify revenue (all orders)
      totalRevenueBRL: totalShopifyRevenueBRL, // Total Shopify revenue in BRL for display
      deliveredRevenue, // Only delivered orders revenue for calculations
      deliveredRevenueBRL, // Delivered revenue in BRL for profit calculations
      paidRevenue, // Only PAID orders revenue (correct for "Receita Paga" card)
      paidRevenueBRL, // Paid revenue in BRL for display
      totalPaidOrders, // Count of paid orders
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
      uniqueCustomers,
      avgDeliveryTimeDays,
      cpaBRL,
      cpaEUR,
      cpaAdsBRL,
      cpaAdsEUR,
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
      returnedOrders: metrics.returnedOrders,
      confirmedOrders: metrics.confirmedOrders,
      totalRevenue: metrics.totalRevenue.toString(),
      deliveredRevenue: metrics.deliveredRevenue.toString(),
      paidRevenue: metrics.paidRevenue.toString(),
      averageOrderValue: metrics.averageOrderValue.toString(),
      // Cache calculated costs to avoid expensive recalculations
      totalProductCosts: metrics.totalProductCosts.toString(),
      totalShippingCosts: metrics.totalShippingCosts.toString(),
      totalCombinedCosts: metrics.totalCombinedCosts.toString(),
      marketingCosts: metrics.marketingCosts.toString(),
      totalProfit: metrics.totalProfit.toString(),
      profitMargin: metrics.profitMargin.toString(),
      roi: metrics.roi.toString(),
      // Customer analytics
      uniqueCustomers: metrics.uniqueCustomers,
      avgDeliveryTimeDays: metrics.avgDeliveryTimeDays.toString(),
      // CPA Real (Marketing Total / Delivered Orders)
      cacBRL: metrics.cpaBRL.toString(),
      cacEUR: metrics.cpaEUR.toString(),
      // CPA Anúncios (Marketing Total / Total Shopify Orders)
      cpaAdsBRL: metrics.cpaAdsBRL.toString(),
      cpaAdsEUR: metrics.cpaAdsEUR.toString(),
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
  
  private async calculateProductCosts(period: string, provider?: string, operationId?: string, req?: any, preloadedRates?: any) {
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
    
    // Check if there are any products linked to this store (operations are store-based)
    if (!storeId) {
      console.log('❌ StoreId não encontrado - retornando custos zero');
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
    
    const linkedProducts = await storage.getUserLinkedProducts(req.user.id, storeId);
    if (!linkedProducts || linkedProducts.length === 0) {
      console.log(`💰 Nenhum produto vinculado à operação ${currentOperation.name} - retornando custos zero`);
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
    
    // 🚀 OTIMIZAÇÃO CRÍTICA: Agregação SQL única em vez de 705 loops individuais
    console.log(`🚀 Iniciando cálculo otimizado para ${deliveredOrders.length} pedidos...`);
    
    try {
      // Query única que agrega todos os custos de uma vez
      const costResults = await db.execute(sql`
        WITH order_products AS (
          SELECT 
            o.id as order_id,
            jsonb_array_elements(o.products) as product_data
          FROM orders o
          WHERE o.operation_id = ${currentOperation.id}
            AND o.status = 'delivered'
            AND o.order_date BETWEEN ${dateRange.from} AND ${dateRange.to}
            ${provider ? sql`AND o.provider = ${provider}` : sql``}
        ),
        product_costs AS (
          SELECT 
            op.order_id,
            COALESCE(p.cost_price::decimal, 0) as product_cost,
            COALESCE(
              up.custom_shipping_cost::decimal, 
              p.shipping_cost::decimal, 
              0
            ) as shipping_cost
          FROM order_products op
          LEFT JOIN user_products up ON (
            up.sku = COALESCE(op.product_data->>'sku', op.product_data->>'product_sku')
            AND up.store_id = ${storeId}
          )
          LEFT JOIN products p ON (
            p.id = up.product_id 
            AND p.operation_id = ${currentOperation.id}
          )
          WHERE COALESCE(op.product_data->>'sku', op.product_data->>'product_sku') IS NOT NULL
            AND up.id IS NOT NULL
            AND p.id IS NOT NULL
        )
        SELECT 
          COALESCE(SUM(product_cost), 0) as total_product_costs,
          COALESCE(SUM(shipping_cost), 0) as total_shipping_costs,
          COUNT(DISTINCT order_id) as processed_orders
        FROM product_costs
      `);
      
      const result = costResults.rows[0] as any;
      totalProductCosts = parseFloat(result.total_product_costs || "0");
      totalShippingCosts = parseFloat(result.total_shipping_costs || "0");
      processedOrders = parseInt(result.processed_orders || "0");
      
      console.log(`🚀 Cálculo SQL otimizado concluído - Produtos: €${totalProductCosts}, Envio: €${totalShippingCosts}, Pedidos processados: ${processedOrders}`);
      
    } catch (sqlError) {
      console.error('❌ Erro na query otimizada, usando fallback:', sqlError);
      
      // FALLBACK: Método original em caso de erro
      for (const order of deliveredOrders) {
        if (!order.products) continue;
        
        const productsArray = order.products as any[];
        if (!Array.isArray(productsArray)) continue;
        
        for (const productInfo of productsArray) {
          const sku = productInfo?.sku || productInfo?.product_sku;
          if (!sku) continue;
          
          const linkedProduct = await storage.getUserProductBySku(sku, storeId);
          // Verificar se produto existe e se pertence à operação atual através do product
          const isLinkedToOperation = linkedProduct && linkedProduct.product && linkedProduct.product.operationId === currentOperation.id;
          
          if (linkedProduct && isLinkedToOperation) {
            const productCost = parseFloat(linkedProduct.product.costPrice || "0");
            const shippingCost = parseFloat(linkedProduct.customShippingCost || linkedProduct.product.shippingCost || "0");
            
            totalProductCosts += productCost;
            totalShippingCosts += shippingCost;
          }
        }
        
        processedOrders++;
      }
      
      console.log(`💰 Fallback calculation - Product: €${totalProductCosts}, Shipping: €${totalShippingCosts}, Orders: ${processedOrders}`);
    }
    
    
    console.log(`💰 Cálculo final - Produtos: €${totalProductCosts}, Envio: €${totalShippingCosts}, Pedidos: ${processedOrders}`);
    
    // OTIMIZAÇÃO: Use taxas pré-carregadas para conversões rápidas
    const totalProductCostsBRL = preloadedRates 
      ? currencyService.convertToBRLSync(totalProductCosts, 'EUR', preloadedRates)
      : await currencyService.convertToBRL(totalProductCosts, 'EUR');
    const totalShippingCostsBRL = preloadedRates 
      ? currencyService.convertToBRLSync(totalShippingCosts, 'EUR', preloadedRates) 
      : await currencyService.convertToBRL(totalShippingCosts, 'EUR');
    
    if (preloadedRates) {
      console.log(`💰 Conversões otimizadas - Produtos: €${totalProductCosts} = R$${totalProductCostsBRL.toFixed(2)}, Envio: €${totalShippingCosts} = R$${totalShippingCostsBRL.toFixed(2)}`);
    }
    
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

  private async getMarketingCosts(period: string = '30d', storeId?: string | null, operationId?: string | null, preloadedRates?: any): Promise<{ totalBRL: number; totalEUR: number; fallbackValue: number }> {
    try {
      // Get Facebook Ads costs
      const fbPeriod = this.convertPeriodToFacebookFormat(period);
      const marketingData = await this.facebookAdsService.getMarketingCostsByPeriod(fbPeriod, storeId, operationId, preloadedRates);
      
      // Get manual ad spend costs for the same period
      const manualCosts = await this.getManualAdSpendCosts(period, operationId, preloadedRates);
      
      const totalBRL = marketingData.totalBRL + manualCosts.totalBRL;
      const totalEUR = marketingData.totalEUR + manualCosts.totalEUR;
      
      console.log(`💰 Marketing costs breakdown - Facebook: R$${marketingData.totalBRL.toFixed(2)}, Manual: R$${manualCosts.totalBRL.toFixed(2)}, Total: R$${totalBRL.toFixed(2)}`);
      
      return {
        totalBRL,
        totalEUR,
        fallbackValue: totalBRL // Use BRL as main value for calculations
      };
    } catch (error) {
      console.warn("Failed to fetch marketing costs, using fallback:", error);
      return {
        totalBRL: 0,
        totalEUR: 0,
        fallbackValue: 0
      };
    }
  }

  private async getManualAdSpendCosts(period: string = '30d', operationId?: string | null, preloadedRates?: any): Promise<{ totalBRL: number; totalEUR: number }> {
    try {
      if (!operationId) {
        return { totalBRL: 0, totalEUR: 0 };
      }

      const { manualAdSpend } = await import("@shared/schema");
      const { and, eq, gte, lte } = await import("drizzle-orm");

      // Get date range for the period
      const dateRange = this.getDateRange(period);

      // Fetch manual ad spend entries for the operation and period
      const manualSpends = await db
        .select()
        .from(manualAdSpend)
        .where(and(
          eq(manualAdSpend.operationId, operationId),
          gte(manualAdSpend.spendDate, dateRange.from),
          lte(manualAdSpend.spendDate, dateRange.to)
        ));

      let totalBRL = 0;
      let totalEUR = 0;

      for (const spend of manualSpends) {
        const amount = Number(spend.amount);
        
        if (spend.currency === 'BRL') {
          totalBRL += amount;
          // Convert BRL to EUR
          const eurAmount = preloadedRates 
            ? currencyService.convertFromBRLSync(amount, 'EUR', preloadedRates)
            : await currencyService.convertFromBRL(amount, 'EUR');
          totalEUR += eurAmount;
        } else if (spend.currency === 'EUR') {
          totalEUR += amount;
          // Convert EUR to BRL
          const brlAmount = preloadedRates 
            ? currencyService.convertToBRLSync(amount, 'EUR', preloadedRates)
            : await currencyService.convertToBRL(amount, 'EUR');
          totalBRL += brlAmount;
        } else {
          // Handle other currencies (convert to EUR first, then to BRL)
          const eurAmount = preloadedRates 
            ? currencyService.convertToBRLSync(amount, spend.currency, preloadedRates) / preloadedRates.BRL * preloadedRates.EUR
            : await currencyService.convertToBRL(amount, spend.currency) / preloadedRates.BRL * preloadedRates.EUR;
          totalEUR += eurAmount;
          
          const brlAmount = preloadedRates 
            ? currencyService.convertToBRLSync(amount, spend.currency, preloadedRates)
            : await currencyService.convertToBRL(amount, spend.currency);
          totalBRL += brlAmount;
        }
      }

      console.log(`💰 Manual ad spend costs - Period: ${period}, Operation: ${operationId}, Entries: ${manualSpends.length}, Total BRL: R$${totalBRL.toFixed(2)}, Total EUR: €${totalEUR.toFixed(2)}`);

      return {
        totalBRL: Number(totalBRL.toFixed(2)),
        totalEUR: Number(totalEUR.toFixed(2))
      };
    } catch (error) {
      console.error("Failed to fetch manual ad spend costs:", error);
      return { totalBRL: 0, totalEUR: 0 };
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
        // Últimos 7 dias - usar dias completos em vez de 168 horas exatas
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);
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

  private getPreviousPeriodDateRange(period: string) {
    const currentRange = this.getDateRange(period);
    const periodDuration = currentRange.to.getTime() - currentRange.from.getTime();
    
    const to = new Date(currentRange.from.getTime() - 1); // End of previous period (1ms before current period starts)
    const from = new Date(to.getTime() - periodDuration);
    
    return { from, to };
  }
  
  async getRevenueOverTime(period: string = '30d', provider?: string, req?: any, operationId?: string, dateFrom?: string, dateTo?: string, productId?: string) {
    // Use custom date range if provided, otherwise calculate from period
    const dateRange = (dateFrom && dateTo) 
      ? { from: new Date(dateFrom), to: new Date(dateTo + 'T23:59:59.000Z') } 
      : this.getDateRange(period);
    
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
      ne(orders.status, 'cancelled') // Count all orders except cancelled
    ];
    
    if (provider) {
      whereConditions.push(eq(orders.provider, provider));
    }

    // Note: Product filtering removed - orders table doesn't have productId column
    
    console.log(`📊 Chart will use same period: ${period}`);

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
    
    console.log(`📊 Found ${revenueData.length} days with data for period ${period}`);
    
    if (revenueData.length === 0) {
      return [];
    }
    
    // 🎯 APLICAR CONVERSÕES HISTÓRICAS PRECISAS ao revenue chart
    const uniqueDates = revenueData.map(row => row.date).filter(Boolean);
    const historicalRates = await currencyService.getHistoricalRates(uniqueDates);
    const currentRates = await currencyService.getExchangeRates();
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`📈 Revenue Chart - Aplicando conversões históricas para ${uniqueDates.length} dias`);
    
    return revenueData.map(row => {
      const revenueEUR = Number(row.revenue || 0);
      
      // Escolher taxa do dia específico
      let dayRates;
      if (row.date === today) {
        dayRates = currentRates;
      } else if (historicalRates[row.date]) {
        dayRates = historicalRates[row.date];
      } else {
        dayRates = currentRates; // Fallback
        console.warn(`⚠️ Revenue Chart - Taxa não encontrada para ${row.date}, usando atual`);
      }
      
      // Converter com taxa específica do dia
      const revenueBRL = currencyService.convertToBRLSync(revenueEUR, 'EUR', dayRates);
      
      console.log(`📊 Chart ${row.date}: €${revenueEUR} → R$${revenueBRL.toFixed(2)} (taxa: ${dayRates.EUR})`);
      
      return {
        date: row.date,
        revenue: revenueBRL, // 🎯 Agora usando conversão histórica!
        orders: Number(row.orderCount)
      };
    });
  }
  
  async getOrdersByStatus(period: string = '30d', provider?: string, req?: any) {
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