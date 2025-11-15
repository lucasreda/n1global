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
      
      // NO CONVERSION - Use cached values in original currency
      const exchangeRates = await currencyService.getExchangeRates(); // Keep for compatibility
      console.log('🚀 Cache hit - using cached values in original currency (NO conversion)');
      
      const totalRevenueBRL = Number(cached.totalRevenue || 0); // Keep variable name for compatibility
      const deliveredRevenueBRL = Number(cached.deliveredRevenue || 0);
      const paidRevenueBRL = Number(cached.paidRevenue || 0);
      const totalProfitBRL = Number(cached.totalProfit || 0);
      
      console.log(`🚀 Using fully cached metrics for ${period} - no recalculation needed`);
      
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
        totalProfit: Number(cached.totalProfit || 0), // EUR value from cache
        totalProfitEUR: Number(cached.totalProfit || 0), // EUR value explicitly
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
  
  // 🎯 MÉTODO PRINCIPAL: Agregação de receita (SEM conversão de moeda)
  private async calculateHistoricalRevenue(operationId: string, dateRange: any, provider?: string, timezone: string = 'Europe/Madrid', shouldConvert: boolean = false) {
    console.log(`📊 Iniciando cálculo de receita para operação ${operationId} (timezone: ${timezone}, convert: ${shouldConvert})`);
    
    // 1. Agregar pedidos POR DATA (otimizado com GROUP BY) - com timezone awareness
    // Use raw SQL with CTE to avoid Drizzle GROUP BY issues
    const providerFilter = provider ? sql`AND provider = ${provider}` : sql``;
    
    const result = await db.execute(sql`
      WITH tz_orders AS (
        SELECT 
          (order_date AT TIME ZONE 'UTC' AT TIME ZONE ${timezone})::date AS order_day,
          total,
          status,
          shopify_data->>'financial_status' AS financial_status
        FROM orders
        WHERE operation_id = ${operationId}
          AND (order_date AT TIME ZONE 'UTC' AT TIME ZONE ${timezone})::date >= ${dateRange.from.toISOString().split('T')[0]}::date
          AND (order_date AT TIME ZONE 'UTC' AT TIME ZONE ${timezone})::date <= ${dateRange.to.toISOString().split('T')[0]}::date
          AND (shopify_data->>'financial_status' IS NULL OR shopify_data->>'financial_status' != 'voided')
          ${providerFilter}
      )
      SELECT 
        order_day::text AS day,
        SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END)::text AS "totalRevenueEUR",
        SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END)::text AS "deliveredRevenueEUR",
        SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END)::text AS "paidRevenueEUR",
        COUNT(*)::int AS "orderCount",
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END)::int AS "deliveredCount"
      FROM tz_orders
      GROUP BY order_day
      ORDER BY order_day
    `);
    
    const dailyAggregation = result.rows;
    
    console.log(`📈 Agregação por data concluída: ${dailyAggregation.length} dias com dados`);
    
    if (dailyAggregation.length === 0) {
      return {
        totalShopifyRevenueBRL: 0,
        deliveredRevenueBRL: 0,
        paidRevenueBRL: 0
      };
    }
    
    // 2. Sum values directly without currency conversion
    let totalRevenue = 0;
    let deliveredRevenue = 0;
    let paidRevenue = 0;
    
    for (const dayData of dailyAggregation) {
      if (!dayData.day) continue;
      
      const dayTotal = parseFloat(dayData.totalRevenueEUR || '0');
      const dayDelivered = parseFloat(dayData.deliveredRevenueEUR || '0');
      const dayPaid = parseFloat(dayData.paidRevenueEUR || '0');
      
      totalRevenue += dayTotal;
      deliveredRevenue += dayDelivered;
      paidRevenue += dayPaid;
      
      console.log(`💰 ${dayData.day}: ${dayTotal.toFixed(2)} (original currency, no conversion)`);
    }
    
    console.log(`🎯 RESULTADO FINAL - Total: ${totalRevenue.toFixed(2)}, Entregue: ${deliveredRevenue.toFixed(2)}, Pago: ${paidRevenue.toFixed(2)} (original currency)`);
    
    return {
      totalShopifyRevenueBRL: totalRevenue, // Keep variable name for compatibility
      deliveredRevenueBRL: deliveredRevenue,
      paidRevenueBRL: paidRevenue
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
    console.log(`🚀 [CALCULATE METRICS] Iniciando - period: ${period}, dateFrom: ${dateFrom}, dateTo: ${dateTo}, provider: ${provider || 'all'}`);
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
    
    // Use operation's configured timezone
    const operationTimezone = currentOperation.timezone || 'Europe/Madrid';
    console.log(`🌍 Using timezone: ${operationTimezone} from operation configuration`);
    
    // 🔥 NO CURRENCY CONVERSION: System displays values in original currency
    const operationCurrency = currentOperation.currency || 'EUR';
    const shouldConvertCurrency = false; // NEVER convert - always show original currency
    console.log(`💱 Operation currency: ${operationCurrency}, Conversion disabled (showing original values)`);
    
    // CRITICAL: Use operationId + TIMEZONE-AWARE date filtering
    // Filter by operation timezone to match Shopify's display
    // IMPORTANT: For carrier-delivered orders, include them regardless of orderDate
    // (they may have old orderDate but were recently updated to delivered)
    let whereConditions = [
      eq(orders.operationId, currentOperation.id),
      or(
        // Shopify orders: filter by orderDate and provider
        and(
          sql`${orders.carrierImported} IS NOT TRUE`,
          sql`(${orders.orderDate} AT TIME ZONE 'UTC' AT TIME ZONE ${operationTimezone})::date >= ${dateRange.from.toISOString().split('T')[0]}`,
          sql`(${orders.orderDate} AT TIME ZONE 'UTC' AT TIME ZONE ${operationTimezone})::date <= ${dateRange.to.toISOString().split('T')[0]}`,
          provider ? eq(orders.provider, provider) : sql`TRUE`
        ),
        // Carrier-delivered orders: include ALL regardless of orderDate, but respect provider filter
        and(
          eq(orders.carrierImported, true),
          eq(orders.status, 'delivered'),
          provider ? eq(orders.provider, provider) : sql`TRUE`
        )
      )
    ];

    // Note: Product filtering removed - orders table doesn't have productId column
    // Products are stored in JSONB array, filtering would require JSON queries
    
    const whereClause = and(...whereConditions);
    
    // 1. Get order counts by status
    // Include carrier-delivered orders regardless of period
    const statusCounts = await db
      .select({
        status: orders.status,
        count: count()
      })
      .from(orders)
      .where(whereClause)
      .groupBy(orders.status);
    
    // 2. Get revenue data: total, delivered, and PAID revenue (with timezone-aware filtering)
    // IMPORTANT: Include carrier-delivered orders regardless of orderDate
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
        or(
          // Shopify orders: filter by orderDate
          and(
            sql`${orders.carrierImported} IS NOT TRUE`,
            sql`(${orders.orderDate} AT TIME ZONE 'UTC' AT TIME ZONE ${operationTimezone})::date >= ${dateRange.from.toISOString().split('T')[0]}`,
            sql`(${orders.orderDate} AT TIME ZONE 'UTC' AT TIME ZONE ${operationTimezone})::date <= ${dateRange.to.toISOString().split('T')[0]}`,
            ne(orders.status, 'cancelled'),
            sql`(shopify_data->>'financial_status' IS NULL OR shopify_data->>'financial_status' != 'voided')`
          ),
          // Carrier-delivered orders: include ALL regardless of orderDate
          and(
            eq(orders.carrierImported, true),
            eq(orders.status, 'delivered'),
            provider ? eq(orders.provider, provider) : sql`TRUE`
          )
        )
      ));
    
    // 3. Get transportadora data WITHOUT period filter (count ALL carrier orders)
    const transportadoraStats = await db
      .select({
        status: orders.status,
        count: count()
      })
      .from(orders)
      .where(and(
        eq(orders.operationId, currentOperation.id),
        // NO DATE FILTER - count ALL orders from carrier regardless of period
        eq(orders.carrierImported, true), // ONLY orders found in carrier/transportadora
        provider ? eq(orders.provider, provider) : sql`TRUE`
      ))
      .groupBy(orders.status);
    
    // 4. Get carrier confirmation stats (original API field) - for exact carrier dashboard match
    const carrierConfirmationStats = await db
      .select({
        confirmation: orders.carrierConfirmation,
        count: count()
      })
      .from(orders)
      .where(and(
        eq(orders.operationId, currentOperation.id),
        eq(orders.carrierImported, true), // ONLY carrier orders
        provider ? eq(orders.provider, provider) : sql`TRUE`
      ))
      .groupBy(orders.carrierConfirmation);
    
    // Detectar se é período "total" ou "all" (quando dateFrom é muito antiga, indicando período total)
    // Verificar se dateFrom é anterior ou igual a 2020 (período total) ou se o range é muito grande (>5 anos)
    console.log(`🔍 [PERÍODO DETECTION] dateFrom: ${dateFrom}, dateTo: ${dateTo}`);
    const dateFromDate = dateFrom ? new Date(dateFrom) : null;
    const dateToDate = dateTo ? new Date(dateTo) : null;
    console.log(`🔍 [PERÍODO DETECTION] dateFromDate: ${dateFromDate}, dateToDate: ${dateToDate}`);
    if (dateFromDate) {
      console.log(`🔍 [PERÍODO DETECTION] dateFromDate.getFullYear(): ${dateFromDate.getFullYear()}, < 2021: ${dateFromDate.getFullYear() < 2021}`);
    }
    const isTotalPeriod = dateFromDate && (
      dateFromDate.getFullYear() < 2021 || // Inclui 2020 e anteriores
      (dateToDate && (dateToDate.getTime() - dateFromDate.getTime()) > (5 * 365 * 24 * 60 * 60 * 1000))
    );
    console.log(`🔍 [PERÍODO DETECTION] isTotalPeriod: ${isTotalPeriod}`);
    console.log(`🔍 [DEBUG INICIO] Iniciando queries de debug para diagnóstico...`);
    
    // DEBUG: Verificar total de pedidos Shopify sem filtros para diagnóstico
    const debugTotalOrdersQuery = await db
      .select({
        count: count()
      })
      .from(orders)
      .where(eq(orders.operationId, currentOperation.id));
    
    const debugTotalOrders = Number(debugTotalOrdersQuery[0]?.count || 0);
    
    // Verificar pedidos com dataSource='shopify'
    const debugShopifyOrdersQuery = await db
      .select({
        count: count()
      })
      .from(orders)
      .where(and(
        eq(orders.operationId, currentOperation.id),
        eq(orders.dataSource, 'shopify')
      ));
    
    const debugShopifyOrders = Number(debugShopifyOrdersQuery[0]?.count || 0);
    
    // Verificar pedidos com dataSource NULL ou diferente de 'shopify' (pedidos antigos)
    const debugNonShopifyOrdersQuery = await db
      .select({
        count: count()
      })
      .from(orders)
      .where(and(
        eq(orders.operationId, currentOperation.id),
        sql`${orders.dataSource} IS NULL OR ${orders.dataSource} != 'shopify'`
      ));
    
    const debugNonShopifyOrders = Number(debugNonShopifyOrdersQuery[0]?.count || 0);
    
    // Verificar pedidos com shopifyOrderId (mesmo que não tenham dataSource='shopify')
    const debugWithShopifyIdQuery = await db
      .select({
        count: count()
      })
      .from(orders)
      .where(and(
        eq(orders.operationId, currentOperation.id),
        sql`${orders.shopifyOrderId} IS NOT NULL`
      ));
    
    const debugWithShopifyId = Number(debugWithShopifyIdQuery[0]?.count || 0);
    
    const debugCarrierImportedQuery = await db
      .select({
        count: count()
      })
      .from(orders)
      .where(and(
        eq(orders.operationId, currentOperation.id),
        eq(orders.dataSource, 'shopify'),
        eq(orders.carrierImported, true)
      ));
    
    const debugCarrierImported = Number(debugCarrierImportedQuery[0]?.count || 0);
    
    console.log(`🔍 [DEBUG SHOPIFY] Total pedidos na operação: ${debugTotalOrders}`);
    console.log(`🔍 [DEBUG SHOPIFY] Pedidos com dataSource='shopify': ${debugShopifyOrders}`);
    console.log(`🔍 [DEBUG SHOPIFY] Pedidos sem dataSource='shopify' (antigos?): ${debugNonShopifyOrders}`);
    console.log(`🔍 [DEBUG SHOPIFY] Pedidos com shopifyOrderId (qualquer dataSource): ${debugWithShopifyId}`);
    console.log(`🔍 [DEBUG SHOPIFY] Pedidos Shopify com carrierImported=true: ${debugCarrierImported}`);
    console.log(`🔍 [DEBUG FIM] Queries de debug concluídas. Iniciando cálculo de shopifyOrdersCount...`);
    
    // Sempre calcular pedidos Shopify corretamente (com ou sem filtro de data)
    // CORREÇÃO: Contar TODOS os pedidos importados da Shopify, seja por dataSource='shopify' OU por shopifyOrderId
    let shopifyOrdersCount = 0;
    
    if (isTotalPeriod) {
      console.log(`📊 [PERÍODO TOTAL] Detectado período total - dateFrom: ${dateFrom}, dateTo: ${dateTo}`);
      console.log(`📊 [PERÍODO TOTAL] Provider filtro: ${provider || 'all'}`);
      
      // DEBUG: Contar pedidos sem filtro de provider primeiro
      const allShopifyOrdersNoProviderQuery = await db
        .select({
          count: count()
        })
        .from(orders)
        .where(and(
          eq(orders.operationId, currentOperation.id),
          sql`(${orders.dataSource} = 'shopify' OR ${orders.shopifyOrderId} IS NOT NULL)`
        ));
      
      const allShopifyOrdersNoProvider = Number(allShopifyOrdersNoProviderQuery[0]?.count || 0);
      console.log(`🔍 [DEBUG PERÍODO TOTAL] Pedidos Shopify sem filtro de provider: ${allShopifyOrdersNoProvider}`);
      
      // Período total: buscar TODOS os pedidos Shopify importados (sem filtro de data)
      // IMPORTANTE: Se provider for 'all' ou undefined, não aplicar filtro de provider
      let whereConditions = [
        eq(orders.operationId, currentOperation.id),
        sql`(${orders.dataSource} = 'shopify' OR ${orders.shopifyOrderId} IS NOT NULL)`
      ];
      
      // Aplicar filtro de provider apenas se for um provider específico (não 'all')
      if (provider && provider !== 'all') {
        whereConditions.push(eq(orders.provider, provider));
        console.log(`🔍 [DEBUG PERÍODO TOTAL] Aplicando filtro de provider: ${provider}`);
      } else {
        console.log(`🔍 [DEBUG PERÍODO TOTAL] Não aplicando filtro de provider (provider: ${provider || 'all'})`);
      }
      
      const allShopifyOrdersQuery = await db
        .select({
          count: count()
        })
        .from(orders)
        .where(and(...whereConditions));
      
      shopifyOrdersCount = Number(allShopifyOrdersQuery[0]?.count || 0);
      console.log(`📊 [PERÍODO TOTAL] Total de pedidos Shopify importados (sem filtro de data): ${shopifyOrdersCount}`);
      console.log(`🔍 [DEBUG PERÍODO TOTAL] Diferença com/sem filtro provider: ${allShopifyOrdersNoProvider - shopifyOrdersCount}`);
    } else {
      console.log(`📊 [PERÍODO FILTRADO] Período não é total - dateFrom: ${dateFrom}, dateTo: ${dateTo}`);
      console.log(`📊 [PERÍODO FILTRADO] dateRange calculado: from=${dateRange.from.toISOString()}, to=${dateRange.to.toISOString()}`);
      console.log(`📊 [PERÍODO FILTRADO] Timezone da operação: ${operationTimezone}`);
      
      // Período filtrado: buscar pedidos Shopify filtrados por data
      // Usar dateFrom/dateTo diretamente se fornecidos, respeitando timezone
      let dateFromFilter: string;
      let dateToFilter: string;
      
      if (dateFrom && dateTo) {
        // Se dateFrom e dateTo foram fornecidos, usar diretamente
        dateFromFilter = dateFrom;
        dateToFilter = dateTo;
      } else {
        // Usar dateRange calculado, convertendo para formato de data (YYYY-MM-DD)
        dateFromFilter = dateRange.from.toISOString().split('T')[0];
        dateToFilter = dateRange.to.toISOString().split('T')[0];
      }
      
      console.log(`📊 [PERÍODO FILTRADO] Filtros de data: dateFromFilter=${dateFromFilter}, dateToFilter=${dateToFilter}`);
      
      // Período filtrado: buscar pedidos Shopify filtrados por data
      // Usar shopifyOrderId IS NOT NULL para incluir pedidos antigos que podem não ter dataSource='shopify'
      // IMPORTANTE: Se orderDate for NULL, não incluir no filtro de data (pode ser pedido antigo ou sem data)
      const shopifyOrdersQuery = await db
        .select({
          count: count()
        })
        .from(orders)
        .where(and(
          eq(orders.operationId, currentOperation.id),
          sql`(${orders.dataSource} = 'shopify' OR ${orders.shopifyOrderId} IS NOT NULL)`, // Incluir pedidos com dataSource='shopify' OU com shopifyOrderId
          sql`${orders.orderDate} IS NOT NULL`, // Garantir que orderDate não é NULL
          sql`(${orders.orderDate} AT TIME ZONE 'UTC' AT TIME ZONE ${operationTimezone})::date >= ${dateFromFilter}::date`,
          sql`(${orders.orderDate} AT TIME ZONE 'UTC' AT TIME ZONE ${operationTimezone})::date <= ${dateToFilter}::date`,
          provider ? eq(orders.provider, provider) : sql`TRUE`
        ));
      
      shopifyOrdersCount = Number(shopifyOrdersQuery[0]?.count || 0);
      console.log(`📊 [PERÍODO FILTRADO] Total de pedidos Shopify importados (filtrado por data): ${shopifyOrdersCount}`);
      console.log(`📊 [PERÍODO FILTRADO] Filtros aplicados: dateFromFilter=${dateFromFilter}, dateToFilter=${dateToFilter}, timezone=${operationTimezone}, provider=${provider || 'all'}`);
    }
    
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
          // confirmed status from carrier
          confirmedOrders += orderCount;
          break;
        case 'pending':
        case 'new order':
        case 'item packed':
        case 'incident':
        case 'unpacked':
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
    
    console.log(`🔍 Debug Shopify (all orders): Total: ${totalOrders}, Pending: ${pendingOrders}, Delivered: ${deliveredOrders}, Shipped: ${shippedOrders}, Confirmed status: ${confirmedOrders}`);
    console.log(`🔍 [SHOPIFY ORDERS COUNT] shopifyOrdersCount calculado: ${shopifyOrdersCount}, isTotalPeriod: ${isTotalPeriod}`);
    
    // Process carrier confirmation stats (original API field) - for EXACT carrier dashboard match
    let totalCarrierLeads = 0;
    let confirmedCarrierLeads = 0;
    let cancelledCarrierLeads = 0;
    
    carrierConfirmationStats.forEach(row => {
      const count = Number(row.count);
      const confirmation = row.confirmation?.toLowerCase() || '';
      
      // Skip entries with NULL/empty confirmation - these may not have come from carrier API
      if (!confirmation) {
        return; // Don't count in total, confirmed, or cancelled
      }
      
      totalCarrierLeads += count; // Count only leads with actual confirmation status
      
      // CANCELLED: leads explicitamente cancelados
      if (confirmation.includes('cancel') || confirmation === 'annulé') {
        cancelledCarrierLeads += count;
      }
      // CONFIRMED: todos os outros são considerados confirmados pela transportadora
      // (confirmed, duplicated, out of area, wrong, etc)
      else {
        confirmedCarrierLeads += count;
      }
    });
    
    // Calculate transportadora totals by status (for delivered/shipped/pending breakdown)
    let totalTransportadoraOrders = 0;
    let deliveredTransportadoraOrders = 0;
    let cancelledTransportadoraOrders = 0;
    let confirmedTransportadoraOrders = 0;
    let pendingTransportadoraOrders = 0;
    let shippedTransportadoraOrders = 0;
    
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
        case 'confirmed':
          confirmedTransportadoraOrders += orderCount;
          break;
        case 'pending':
          pendingTransportadoraOrders += orderCount;
          break;
        case 'shipped':
          shippedTransportadoraOrders += orderCount;
          break;
      }
    });
    
    // Calculate confirmed orders from TRANSPORTADORA data only (orders accepted by carrier)
    confirmedOrders = confirmedTransportadoraOrders + pendingTransportadoraOrders + deliveredTransportadoraOrders + shippedTransportadoraOrders;
    
    // Calculate delivery percentage based on transportadora data
    const deliveryRate = totalTransportadoraOrders > 0 ? (deliveredTransportadoraOrders / totalTransportadoraOrders) * 100 : 0;
    
    // 🎯 Sum revenue in original currency (NO conversion)
    const dailyRevenueData = await this.calculateHistoricalRevenue(currentOperation.id, dateRange, provider, operationTimezone, shouldConvertCurrency);
    
    const totalShopifyRevenueBRL = dailyRevenueData.totalShopifyRevenueBRL; // Actually in original currency
    const deliveredRevenueBRL = dailyRevenueData.deliveredRevenueBRL; // Actually in original currency
    const paidRevenueBRL = dailyRevenueData.paidRevenueBRL; // Actually in original currency
    
    console.log(`💰 NO CONVERSION - Receita Shopify: ${totalShopifyRevenue.toFixed(2)} ${operationCurrency}`);
    console.log(`💰 Receita PAGA: ${paidRevenue.toFixed(2)} ${operationCurrency} (${totalPaidOrders} pedidos pagos)`);
    
    // Calculate profit in original currency (NO conversion)
    const marketingCostsBRL = marketingCosts.totalBRL; // Actually in original currency
    const marketingCostsEUR = marketingCosts.totalEUR; // Actually in original currency
    // Return costs: 2 per returned order (in original currency)
    const returnCosts = returnedOrders * 2;
    const returnCostsBRL = returnCosts; // Keep variable name for compatibility
    
    // Calculate profit in original currency
    const totalProfit = deliveredRevenue - totalCombinedCosts - marketingCostsEUR - returnCosts;
    const totalProfitBRL = totalProfit; // Keep variable name for compatibility
    const profitMargin = deliveredRevenue > 0 ? (totalProfit / deliveredRevenue) * 100 : 0;
    
    console.log(`💰 LUCRO (original currency): ${totalProfit.toFixed(2)} ${operationCurrency}`);
    console.log(`💰 Cálculo: ${deliveredRevenue} - ${totalCombinedCosts} - ${marketingCostsEUR} - ${returnCosts} = ${totalProfit.toFixed(2)}`);
    
    // Calculate ROI (return on investment) using delivered revenue
    const totalCosts = totalCombinedCosts + marketingCostsEUR + returnCosts;
    const roi = totalCosts > 0 ? ((deliveredRevenue - totalCosts) / totalCosts) * 100 : 0;
    
    console.log(`🎯 CARRIER API CONFIRMATION (campo original da API):`);
    console.log(`   📊 Total Pedidos com carrier_imported=true: ${totalCarrierLeads}`);
    console.log(`   ✅ Confirmados (todos exceto cancelados): ${confirmedCarrierLeads}`);
    console.log(`   ❌ Cancelados (canceled/cancelled/canceled by system): ${cancelledCarrierLeads}`);
    console.log(`🔍 Debug Transportadora (by mapped status): Total: ${totalTransportadoraOrders}, Delivered: ${deliveredTransportadoraOrders}, Cancelled: ${cancelledTransportadoraOrders}, Confirmed status: ${confirmedTransportadoraOrders}, Pending: ${pendingTransportadoraOrders}, Shipped: ${shippedTransportadoraOrders}`);
    console.log(`📈 Calculated metrics for ${period}: Total: ${totalOrders}, Delivered: ${deliveredOrders}, Returned: ${returnedOrders}, Confirmed: ${confirmedOrders}, Cancelled: ${cancelledCarrierLeads}, Shipped: ${shippedOrders}, Pending: ${pendingOrders}, Shopify Revenue: €${totalShopifyRevenue}, Delivered Revenue: €${deliveredRevenue}, Paid Revenue: €${paidRevenue}`);
    
    // Calculate previous period orders for growth comparison (timezone-aware)
    const previousPeriodRange = this.getPreviousPeriodDateRange(period);
    const previousPeriodQuery = await db
      .select({
        count: count()
      })
      .from(orders)
      .where(and(
        eq(orders.operationId, currentOperation.id),
        sql`(${orders.orderDate} AT TIME ZONE 'UTC' AT TIME ZONE ${operationTimezone})::date >= ${previousPeriodRange.from.toISOString().split('T')[0]}`,
        sql`(${orders.orderDate} AT TIME ZONE 'UTC' AT TIME ZONE ${operationTimezone})::date <= ${previousPeriodRange.to.toISOString().split('T')[0]}`,
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
    
    console.log(`📊 [RETURN] shopifyOrders será retornado: ${shopifyOrdersCount} (isTotalPeriod: ${isTotalPeriod}, totalOrders: ${totalOrders})`);
    
    return {
      exchangeRates, // Include current exchange rates
      totalOrders: totalCarrierLeads, // 🆕 Total leads from carrier API (original confirmation field)
      shopifyOrders: shopifyOrdersCount, // Shopify orders: sempre correto, com ou sem filtro de data
      previousPeriodOrders, // Previous period orders for growth comparison
      deliveredOrders, // Shopify delivered orders filtered by period  
      cancelledOrders: cancelledCarrierLeads, // 🆕 Cancelled from carrier API (original confirmation field)
      returnedOrders,
      confirmedOrders: confirmedCarrierLeads, // 🆕 Confirmed from carrier API (original confirmation field)
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
      totalProfit, // Original currency value for storage and cache
      totalProfitEUR: totalProfit, // Keep variable name for compatibility
      totalProfitBRL, // Keep variable name for compatibility
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
    
    // Use operation's configured timezone
    const operationTimezone = currentOperation.timezone || 'Europe/Madrid';
    
    // Build where conditions for delivered orders only (timezone-aware)
    // Usar LOWER() para comparação case-insensitive do status
    let whereConditions = [
      eq(orders.operationId, currentOperation.id),
      sql`LOWER(${orders.status}) = 'delivered'`, // Only delivered orders (case-insensitive)
      sql`(${orders.orderDate} AT TIME ZONE 'UTC' AT TIME ZONE ${operationTimezone})::date >= ${dateRange.from.toISOString().split('T')[0]}`,
      sql`(${orders.orderDate} AT TIME ZONE 'UTC' AT TIME ZONE ${operationTimezone})::date <= ${dateRange.to.toISOString().split('T')[0]}`
    ];
    
    if (provider) {
      whereConditions.push(eq(orders.provider, provider));
    }
    
    // Get delivered orders with their products data
    const deliveredOrders = await db
      .select({
        id: orders.id,
        products: orders.products,
        total: orders.total,
        status: orders.status,
        orderDate: orders.orderDate
      })
      .from(orders)
      .where(and(...whereConditions));
    
    console.log(`📦 [CALCULATE PRODUCT COSTS] Encontrados ${deliveredOrders.length} pedidos entregues para cálculo de custos`);
    
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
    
    // 🚀 OTIMIZAÇÃO CRÍTICA: Usar campos product_cost e shipping_cost já calculados nos pedidos
    console.log(`🚀 Iniciando cálculo otimizado usando custos já calculados dos pedidos...`);
    
    try {
      // Query simplificada que usa diretamente os campos product_cost e shipping_cost dos pedidos
      // que já foram atualizados pelo serviço de recálculo quando produtos foram vinculados
      
      // Debug: log dos parâmetros da query
      console.log(`🔍 Debug - Parâmetros da query:`, {
        operationId: currentOperation.id,
        status: 'delivered',
        dateFrom: dateRange.from.toISOString().split('T')[0],
        dateTo: dateRange.to.toISOString().split('T')[0],
        provider: provider || 'todos',
        timezone: operationTimezone
      });
      
      // Primeiro, verificar se há pedidos entregues no período
      // Se order_date for NULL, usa created_at como fallback
      const deliveredOrdersCheck = await db.execute(sql`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN o.product_cost IS NOT NULL AND o.product_cost::decimal > 0 THEN 1 END) as with_product_cost,
          COUNT(CASE WHEN o.shipping_cost IS NOT NULL AND o.shipping_cost::decimal > 0 THEN 1 END) as with_shipping_cost,
          SUM(CASE WHEN o.product_cost IS NOT NULL THEN o.product_cost::decimal ELSE 0 END) as sum_product_cost,
          SUM(CASE WHEN o.shipping_cost IS NOT NULL THEN o.shipping_cost::decimal ELSE 0 END) as sum_shipping_cost
        FROM orders o
        WHERE o.operation_id = ${currentOperation.id}
          AND LOWER(o.status) = 'delivered'
          AND (
            (o.order_date IS NOT NULL AND (o.order_date AT TIME ZONE 'UTC' AT TIME ZONE ${operationTimezone})::date >= ${dateRange.from.toISOString().split('T')[0]} AND (o.order_date AT TIME ZONE 'UTC' AT TIME ZONE ${operationTimezone})::date <= ${dateRange.to.toISOString().split('T')[0]})
            OR
            (o.order_date IS NULL AND (o.created_at AT TIME ZONE 'UTC' AT TIME ZONE ${operationTimezone})::date >= ${dateRange.from.toISOString().split('T')[0]} AND (o.created_at AT TIME ZONE 'UTC' AT TIME ZONE ${operationTimezone})::date <= ${dateRange.to.toISOString().split('T')[0]})
          )
          ${provider ? sql`AND o.provider = ${provider}` : sql``}
      `);
      
      const checkResult = deliveredOrdersCheck.rows[0] as any;
      console.log(`🔍 Debug - Verificação de pedidos entregues:`, {
        total_pedidos: checkResult.total,
        com_product_cost: checkResult.with_product_cost,
        com_shipping_cost: checkResult.with_shipping_cost,
        soma_product_cost: checkResult.sum_product_cost,
        soma_shipping_cost: checkResult.sum_shipping_cost
      });
      
      // Query para buscar custos dos pedidos entregues
      // Se order_date for NULL, usa created_at como fallback
      const costResults = await db.execute(sql`
        SELECT 
          COALESCE(SUM(o.product_cost::decimal), 0) as total_product_costs,
          COALESCE(SUM(o.shipping_cost::decimal), 0) as total_shipping_costs,
          COUNT(DISTINCT o.id) as processed_orders
        FROM orders o
        WHERE o.operation_id = ${currentOperation.id}
          AND LOWER(o.status) = 'delivered'
          AND (
            (o.order_date IS NOT NULL AND (o.order_date AT TIME ZONE 'UTC' AT TIME ZONE ${operationTimezone})::date >= ${dateRange.from.toISOString().split('T')[0]} AND (o.order_date AT TIME ZONE 'UTC' AT TIME ZONE ${operationTimezone})::date <= ${dateRange.to.toISOString().split('T')[0]})
            OR
            (o.order_date IS NULL AND (o.created_at AT TIME ZONE 'UTC' AT TIME ZONE ${operationTimezone})::date >= ${dateRange.from.toISOString().split('T')[0]} AND (o.created_at AT TIME ZONE 'UTC' AT TIME ZONE ${operationTimezone})::date <= ${dateRange.to.toISOString().split('T')[0]})
          )
          ${provider ? sql`AND o.provider = ${provider}` : sql``}
      `);
      
      const result = costResults.rows[0] as any;
      
      // Debug: verificar valores retornados
      console.log(`🔍 Debug - Resultado da query:`, {
        total_product_costs: result.total_product_costs,
        total_shipping_costs: result.total_shipping_costs,
        processed_orders: result.processed_orders,
        tipo_product_costs: typeof result.total_product_costs,
        tipo_shipping_costs: typeof result.total_shipping_costs
      });
      
      totalProductCosts = parseFloat(result.total_product_costs || "0");
      totalShippingCosts = parseFloat(result.total_shipping_costs || "0");
      processedOrders = parseInt(result.processed_orders || "0");
      
      const totalDeliveredOrders = parseInt(checkResult.total || "0");
      const ordersWithProductCost = parseInt(checkResult.with_product_cost || "0");
      const ordersWithoutProductCost = totalDeliveredOrders - ordersWithProductCost;
      
      console.log(`✅ Cálculo SQL otimizado concluído usando custos dos pedidos - Produtos: €${totalProductCosts.toFixed(2)}, Envio: €${totalShippingCosts.toFixed(2)}, Pedidos processados: ${processedOrders}`);
      console.log(`📊 Resumo da query otimizada: Total de pedidos entregues: ${totalDeliveredOrders}, Pedidos com product_cost: ${ordersWithProductCost}, Pedidos sem product_cost: ${ordersWithoutProductCost}`);
      
      // Se há pedidos sem custos calculados, apenas logar aviso (não recalcular em tempo real)
      // Os custos serão calculados automaticamente quando produtos forem vinculados
      if (ordersWithoutProductCost > 0 && totalDeliveredOrders > 0) {
        console.warn(`⚠️ Há ${ordersWithoutProductCost} pedidos entregues sem custos calculados (de ${totalDeliveredOrders} totais). Os custos serão calculados automaticamente quando produtos forem vinculados.`);
      }
      
    } catch (sqlError) {
      // Em caso de erro na query, apenas logar e usar valores zero
      console.error('❌ Erro na query otimizada:', sqlError);
      totalProductCosts = 0;
      totalShippingCosts = 0;
      processedOrders = 0;
    }
    
    
    console.log(`💰 Cálculo final - Produtos: €${totalProductCosts.toFixed(2)}, Envio: €${totalShippingCosts.toFixed(2)}, Pedidos: ${processedOrders}`);
    
    // NO CONVERSION - Use original currency values
    const totalProductCostsBRL = totalProductCosts; // Keep variable name for compatibility
    const totalShippingCostsBRL = totalShippingCosts; // Keep variable name for compatibility
    
    console.log(`💰 NO CONVERSION - Produtos: ${totalProductCosts.toFixed(2)}, Envio: ${totalShippingCosts.toFixed(2)} (original currency)`);
    
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
    
    // Use operation's configured timezone
    const operationTimezone = currentOperation.timezone || 'Europe/Madrid';
    
    // Use raw SQL with CTE to avoid Drizzle GROUP BY issues
    const providerFilter = provider ? sql`AND provider = ${provider}` : sql``;
    
    const result = await db.execute(sql`
      WITH tz_orders AS (
        SELECT 
          (order_date AT TIME ZONE 'UTC' AT TIME ZONE ${operationTimezone})::date AS order_day,
          total,
          status
        FROM orders
        WHERE operation_id = ${currentOperation.id}
          AND (order_date AT TIME ZONE 'UTC' AT TIME ZONE ${operationTimezone})::date >= ${dateRange.from.toISOString().split('T')[0]}::date
          AND (order_date AT TIME ZONE 'UTC' AT TIME ZONE ${operationTimezone})::date <= ${dateRange.to.toISOString().split('T')[0]}::date
          AND status != 'cancelled'
          ${providerFilter}
      )
      SELECT 
        order_day::text AS date,
        SUM(total)::text AS revenue,
        COUNT(*)::int AS "orderCount"
      FROM tz_orders
      GROUP BY order_day
      ORDER BY order_day
    `);
    
    const revenueData = result.rows;
    
    console.log(`📊 Chart will use same period: ${period} (timezone: ${operationTimezone})`);
    
    console.log(`📊 Found ${revenueData.length} days with data for period ${period}`);
    
    if (revenueData.length === 0) {
      return [];
    }
    
    // NO CONVERSION - Display revenue in original currency
    console.log(`📈 Revenue Chart - NO CONVERSION (original currency for ${revenueData.length} days)`);
    
    return revenueData.map(row => {
      const revenue = Number(row.revenue || 0);
      
      console.log(`📊 Chart ${row.date}: ${revenue.toFixed(2)} (original currency)`);
      
      return {
        date: row.date,
        revenue, // Original currency value
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
    
    // Use operation's configured timezone
    const operationTimezone = currentOperation.timezone || 'Europe/Madrid';
    
    let whereConditions = [
      eq(orders.operationId, currentOperation.id), // CRITICAL: Filter by operation
      sql`(${orders.orderDate} AT TIME ZONE 'UTC' AT TIME ZONE ${operationTimezone})::date >= ${dateRange.from.toISOString().split('T')[0]}`,
      sql`(${orders.orderDate} AT TIME ZONE 'UTC' AT TIME ZONE ${operationTimezone})::date <= ${dateRange.to.toISOString().split('T')[0]}`
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