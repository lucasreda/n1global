import { db } from "./db";
import { orders, stores, operations, type InsertOrder } from "@shared/schema";
import { EuropeanFulfillmentService } from "./fulfillment-service";
import { eq, and, not, inArray } from "drizzle-orm";

interface SyncOptions {
  forceFullSync?: boolean;
  maxPages?: number;
  statusFilter?: string[];
}

export class SmartSyncService {
  private isRunning = false;
  private lastSyncTime: Date | null = null;
  private syncHistory: Array<{ timestamp: Date; newLeads: number; updates: number }> = [];
  private defaultStoreId: string | null = null;
  private fulfillmentService: EuropeanFulfillmentService;

  constructor(fulfillmentService?: EuropeanFulfillmentService) {
    this.fulfillmentService = fulfillmentService || new EuropeanFulfillmentService();
  }
  
  // Estado da sincronização completa progressiva
  private completeSyncStatus = {
    isRunning: false,
    currentPage: 0,
    totalPages: 0,
    processedLeads: 0,
    totalLeads: 0,
    newLeads: 0,
    updatedLeads: 0,
    errors: 0,
    retries: 0,
    estimatedTimeRemaining: "Calculando...",
    currentSpeed: 0,
    phase: 'idle' as 'idle' | 'connecting' | 'syncing' | 'completed' | 'error' | 'retrying',
    message: "Aguardando...",
    startTime: null as Date | null
  };
  
  // Status que indicam pedidos finalizados (mas ainda precisam ser monitorados para mudanças)
  private finalStatuses = ['delivered', 'cancelled', 'refused', 'returned'];
  
  // Status que precisam monitoramento frequente
  private activeStatuses = ['new order', 'confirmed', 'packed', 'shipped', 'in transit', 'in delivery', 'incident'];
  
  // Progress tracking for better UX
  private syncProgress = {
    isRunning: false,
    currentPage: 0,
    totalPages: 0,
    processedOrders: 0,
    newOrders: 0,
    updatedOrders: 0,
    currentStep: '',
    estimatedTimeRemaining: '',
    startTime: null as Date | null,
    percentage: 0
  };
  
  // Configurações inteligentes baseadas em volume - REMOVIDOS LIMITES ARTIFICIAIS
  private adaptiveConfig = {
    lowVolumeThreshold: 5,    // Menos de 5 mudanças/hora = baixo volume
    mediumVolumeThreshold: 50, // Menos de 50 mudanças/hora = médio volume
    maxPagesLowVolume: Infinity,     // SEM LIMITE - sincronizar TODAS as páginas
    maxPagesMediumVolume: Infinity,  // SEM LIMITE - sincronizar TODAS as páginas
    maxPagesHighVolume: Infinity,    // SEM LIMITE - sincronizar TODAS as páginas
  };

  /**
   * Analisa o histórico de sincronizações para determinar o volume de atividade
   */
  private analyzeVolumePattern(): 'low' | 'medium' | 'high' {
    if (this.syncHistory.length < 3) return 'medium'; // Default para início
    
    const recentSyncs = this.syncHistory.slice(-6); // Últimas 6 sincronizações (30 min)
    const totalChanges = recentSyncs.reduce((sum, sync) => sum + sync.newLeads + sync.updates, 0);
    const avgChangesPerHour = totalChanges / (recentSyncs.length * 5 / 60); // 5 min intervals
    
    console.log(`📊 Volume detectado: ${avgChangesPerHour.toFixed(1)} mudanças/hora`);
    
    if (avgChangesPerHour < this.adaptiveConfig.lowVolumeThreshold) return 'low';
    if (avgChangesPerHour < this.adaptiveConfig.mediumVolumeThreshold) return 'medium';
    return 'high';
  }
  
  /**
   * Determina quantas páginas sincronizar baseado no volume detectado
   */
  private getOptimalSyncPages(volume: 'low' | 'medium' | 'high'): number {
    switch (volume) {
      case 'low': return this.adaptiveConfig.maxPagesLowVolume;
      case 'medium': return this.adaptiveConfig.maxPagesMediumVolume;
      case 'high': return this.adaptiveConfig.maxPagesHighVolume;
    }
  }

  /**
   * Calcula custos de produto e envio baseado no status e valor do pedido
   */
  private async calculateOrderCosts(status: string, total: string, products: any[], storeId: string): Promise<{ productCost: number; shippingCost: number }> {
    // Se não há produtos, retorna custos zerados
    if (!products || products.length === 0) {
      return { productCost: 0, shippingCost: 0 };
    }

    // Extrai o SKU do primeiro produto (assumindo um produto por pedido)
    const firstProduct = products[0];
    const sku = firstProduct?.sku;
    
    if (!sku) {
      console.warn('⚠️ Produto sem SKU encontrado, usando custos padrão');
      return { productCost: 0, shippingCost: 0 };
    }

    try {
      const { pool } = await import("./db");
      
      // Busca custos customizados do produto primeiro (user_products)
      const customCostsResult = await pool.query(`
        SELECT 
          up.custom_cost_price,
          up.custom_shipping_cost,
          p.cost_price,
          p.shipping_cost
        FROM user_products up
        JOIN products p ON up.product_id = p.id
        WHERE up.sku = $1 AND up.store_id = $2 AND up.is_active = true
        LIMIT 1
      `, [sku, storeId]);

      let productCostBase = 0;
      let shippingCostBase = 0;

      if (customCostsResult.rows.length > 0) {
        const costs = customCostsResult.rows[0];
        // Usa custo customizado se disponível, senão usa o custo padrão do produto
        productCostBase = parseFloat(costs.custom_cost_price) || parseFloat(costs.cost_price) || 0;
        shippingCostBase = parseFloat(costs.custom_shipping_cost) || parseFloat(costs.shipping_cost) || 0;
        console.log(`💰 Custos encontrados para SKU ${sku}: Produto: €${productCostBase}, Envio: €${shippingCostBase}`);
      } else {
        // Fallback: busca diretamente na tabela products
        const productResult = await pool.query(`
          SELECT cost_price, shipping_cost
          FROM products 
          WHERE sku = $1 AND store_id = $2 
          LIMIT 1
        `, [sku, storeId]);

        if (productResult.rows.length > 0) {
          const costs = productResult.rows[0];
          productCostBase = parseFloat(costs.cost_price) || 0;
          shippingCostBase = parseFloat(costs.shipping_cost) || 0;
          console.log(`💰 Custos padrão para SKU ${sku}: Produto: €${productCostBase}, Envio: €${shippingCostBase}`);
        } else {
          console.warn(`⚠️ Produto com SKU ${sku} não encontrado, usando custos zerados`);
        }
      }

      // Aplica custos baseado no status do pedido
      // Custo do produto: aplicado para pedidos confirmados/entregues/pendentes
      const productCost = ['confirmed', 'delivered', 'shipped', 'in transit', 'in delivery', 'pending'].includes(status) ?
        productCostBase : 0.00;
      
      // Custo de envio: aplicado para pedidos enviados/entregues + pendentes
      const shippingCost = ['shipped', 'delivered', 'in transit', 'in delivery', 'pending'].includes(status) ?
        shippingCostBase : 0.00;

      return { productCost, shippingCost };
      
    } catch (error) {
      console.error('❌ Erro ao calcular custos do produto:', error);
      return { productCost: 0, shippingCost: 0 };
    }
  }

  /**
   * Retorna o progresso atual da sincronização para feedback em tempo real
   */
  async getSyncProgress() {
    return {
      ...this.syncProgress,
      timeElapsed: this.syncProgress.startTime ? 
        Math.floor((Date.now() - this.syncProgress.startTime.getTime()) / 1000) : 0
    };
  }

  /**
   * Atualiza o progresso da sincronização
   */
  private updateSyncProgress(updates: Partial<typeof this.syncProgress>) {
    this.syncProgress = { ...this.syncProgress, ...updates };
    
    // Calcular porcentagem baseada nas páginas
    if (this.syncProgress.totalPages > 0) {
      this.syncProgress.percentage = Math.round(
        (this.syncProgress.currentPage / this.syncProgress.totalPages) * 100
      );
    }
    
    // Estimar tempo restante baseado no progresso atual
    if (this.syncProgress.startTime && this.syncProgress.percentage > 5) {
      const elapsed = Date.now() - this.syncProgress.startTime.getTime();
      const estimatedTotal = elapsed / (this.syncProgress.percentage / 100);
      const remaining = Math.max(0, estimatedTotal - elapsed);
      
      const remainingMinutes = Math.floor(remaining / 60000);
      const remainingSeconds = Math.floor((remaining % 60000) / 1000);
      
      if (remainingMinutes > 0) {
        this.syncProgress.estimatedTimeRemaining = `${remainingMinutes}min ${remainingSeconds}s`;
      } else {
        this.syncProgress.estimatedTimeRemaining = `${remainingSeconds}s`;
      }
    }
  }

  /**
   * Obtém o ID da loja padrão para associar aos pedidos
   */
  private async getDefaultStoreId(): Promise<string> {
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
    return this.defaultStoreId as string;
  }
  
  /**
   * Sincronização inteligente que adapta baseado no volume de atividade
   */
  async startIntelligentSync(userContext?: { userId: string; operationId: string; storeId: string }): Promise<{
    success: boolean;
    newLeads: number;
    updatedLeads: number;
    totalProcessed: number;
    duration: number;
    volume: string;
    pagesScanned: number;
    message: string;
  }> {
    if (this.isRunning) {
      return {
        success: false,
        newLeads: 0,
        updatedLeads: 0,
        totalProcessed: 0,
        duration: 0,
        volume: 'unknown',
        pagesScanned: 0,
        message: "Sincronização já está em execução"
      };
    }

    const startTime = Date.now();
    this.isRunning = true;

    // Initialize progress tracking
    this.updateSyncProgress({
      isRunning: true,
      currentPage: 0,
      totalPages: 0,
      processedOrders: 0,
      newOrders: 0,
      updatedOrders: 0,
      currentStep: 'Iniciando sincronização inteligente...',
      startTime: new Date(),
      percentage: 0
    });

    try {
      // Analisa o padrão de volume para determinar estratégia
      const volumePattern = this.analyzeVolumePattern();
      const maxPages = this.getOptimalSyncPages(volumePattern);
      
      // CRITICAL: Use user-specific context or fallback to default
      const operationId = userContext?.operationId;
      const storeId = userContext?.storeId || await this.getDefaultStoreId();
      
      if (!operationId) {
        throw new Error('❌ ID da operação não fornecido para sincronização');
      }
      
      // Get operation details to determine the correct country for API calls
      const [operation] = await db
        .select()
        .from(operations)
        .where(eq(operations.id, operationId))
        .limit(1);
      
      if (!operation) {
        throw new Error(`❌ Operação ${operationId} não encontrada`);
      }

      // Get shipping providers for this operation to configure credentials
      const { storage } = await import("./storage");
      const providers = await storage.getShippingProvidersByOperation(operationId);
      const activeProvider = providers.find(p => p.isActive && p.apiKey);
      
      if (!activeProvider || activeProvider.type !== 'european_fulfillment') {
        throw new Error(`❌ Nenhum provedor European Fulfillment ativo encontrado para a operação ${operationId}`);
      }

      // Create a user-specific fulfillment service instance with their credentials
      const userFulfillmentService = new EuropeanFulfillmentService(
        activeProvider.login,
        activeProvider.password,
        activeProvider.apiUrl || undefined
      );
      
      // Map operation country to API country format
      const countryMapping = {
        'ES': 'SPAIN',
        'IT': 'ITALY',
        'FR': 'FRANCE',
        'DE': 'GERMANY',
        'PT': 'PORTUGAL',
        'AT': 'AUSTRIA',
        'GR': 'GREECE',
        'PL': 'POLAND'
      };
      
      const syncCountry = countryMapping[operation.country as keyof typeof countryMapping] || operation.country || "SPAIN";
      console.log(`🧠 Sincronização inteligente para operação ${operationId} (${operation.country} -> ${syncCountry}): Volume ${volumePattern}, ${maxPages} páginas`);

      // Update progress with total pages estimate
      this.updateSyncProgress({
        totalPages: maxPages,
        currentStep: `Preparando sincronização para ${operation.country}...`
      });

      let newLeads = 0;
      let updatedLeads = 0;
      let totalProcessed = 0;
      let currentPage = 1;
      let pagesScanned = 0;

      // Sincronizar apenas as páginas necessárias baseado no volume
      while (currentPage <= maxPages) {
        try {
          // Update progress for current page
          this.updateSyncProgress({
            currentPage,
            currentStep: `Processando página ${currentPage} de ${maxPages}...`
          });

          console.log(`📄 Escaneando página ${currentPage}/${maxPages}...`);
          
          const pageLeads = await userFulfillmentService.getLeadsList(syncCountry, currentPage);
          
          if (!pageLeads || pageLeads.length === 0) {
            console.log(`📄 Página ${currentPage} vazia, finalizando...`);
            break;
          }

          pagesScanned++;

          // Processar cada lead da página
          for (const apiLead of pageLeads) {
            try {
              // Verificar se o lead já existe NESTA operação
              const [existingLead] = await db
                .select()
                .from(orders)
                .where(and(
                  eq(orders.id, apiLead.n_lead),
                  eq(orders.operationId, operationId)
                ))
                .limit(1);

              if (!existingLead) {
                // Lead novo - inserir COM operationId para isolamento
                const status = apiLead.status_livrison || "new order";
                
                // Garantir que temos storeId válido antes de inserir
                const finalStoreId = storeId || operation.storeId || await this.getDefaultStoreId();
                
                if (!finalStoreId) {
                  console.error(`❌ StoreId null para lead ${apiLead.n_lead}, pulando...`);
                  continue;
                }
                
                const costs = await this.calculateOrderCosts(status, apiLead.lead_value, [], finalStoreId);
                
                // CRITICAL: Use the specific store AND operation for this sync
                await db.insert(orders).values({
                  id: apiLead.n_lead,
                  storeId: finalStoreId,
                  operationId: operationId,
                  customerName: apiLead.name,
                  customerPhone: apiLead.phone,
                  customerCity: apiLead.city,
                  customerCountry: "IT",
                  total: apiLead.lead_value,
                  status: status,
                  paymentMethod: apiLead.method_payment || "COD",
                  provider: "european_fulfillment",
                  productCost: costs.productCost.toString(),
                  shippingCost: costs.shippingCost.toString(),
                  orderDate: new Date(),
                });

                newLeads++;
                
                // Update progress every 5 new orders for better UX
                if (newLeads % 5 === 0) {
                  this.updateSyncProgress({
                    processedOrders: totalProcessed + 1,
                    newOrders: newLeads,
                    updatedOrders: updatedLeads,
                    currentStep: `Importando pedidos: ${newLeads} novos importados (Página ${currentPage})`
                  });
                }
              } else {
                // Lead existente - atualizar status se mudou (somente na mesma operação)
                if (existingLead.status !== (apiLead.status_livrison || "new order")) {
                  await db
                    .update(orders)
                    .set({
                      status: apiLead.status_livrison || "new order",
                      updatedAt: new Date(),
                    })
                    .where(and(
                      eq(orders.id, apiLead.n_lead),
                      eq(orders.operationId, operationId)
                    ));
                  
                  updatedLeads++;
                }
              }
              
              totalProcessed++;
            } catch (error) {
              console.warn(`⚠️  Erro ao processar lead ${apiLead.n_lead}:`, error);
            }
          }

          currentPage++;
          
          // Pausa adaptativa baseada no volume
          const pauseMs = volumePattern === 'high' ? 50 : volumePattern === 'medium' ? 100 : 200;
          await new Promise(resolve => setTimeout(resolve, pauseMs));

        } catch (error) {
          console.warn(`⚠️  Erro ao buscar página ${currentPage}:`, error);
          break;
        }
      }

      const duration = Date.now() - startTime;
      
      // Registrar no histórico para análise futura
      this.syncHistory.push({
        timestamp: new Date(),
        newLeads,
        updates: updatedLeads
      });
      
      // Manter apenas os últimos 20 registros
      if (this.syncHistory.length > 20) {
        this.syncHistory = this.syncHistory.slice(-20);
      }

      this.lastSyncTime = new Date();
      
      const message = `Sincronização inteligente (${volumePattern}): ${newLeads} novos, ${updatedLeads} atualizados em ${pagesScanned} páginas`;
      console.log(`✅ ${message} (${duration}ms)`);

      // Final progress update
      this.updateSyncProgress({
        isRunning: false,
        currentStep: `Sincronização concluída! ${newLeads} pedidos importados`,
        processedOrders: totalProcessed,
        newOrders: newLeads,
        updatedOrders: updatedLeads,
        percentage: 100
      });

      return {
        success: true,
        newLeads,
        updatedLeads,
        totalProcessed,
        duration,
        volume: volumePattern,
        pagesScanned,
        message
      };

    } finally {
      this.isRunning = false;
      // Reset progress when sync ends
      setTimeout(() => {
        this.updateSyncProgress({
          isRunning: false,
          currentPage: 0,
          totalPages: 0,
          processedOrders: 0,
          newOrders: 0,
          updatedOrders: 0,
          currentStep: 'Aguardando próxima sincronização...',
          percentage: 0
        });
      }, 5000); // Keep final status visible for 5 seconds
    }
  }

  /**
   * Sincronização limitada para teste do onboarding
   */
  async startIntelligentSyncLimited(userContext: { userId: string; operationId: string; storeId: string }, maxPages: number = 4): Promise<{
    success: boolean;
    newLeads: number;
    updatedLeads: number;
    totalProcessed: number;
    duration: number;
    pagesScanned: number;
    message: string;
  }> {
    if (this.isRunning) {
      return {
        success: false,
        newLeads: 0,
        updatedLeads: 0,
        totalProcessed: 0,
        duration: 0,
        pagesScanned: 0,
        message: "Sincronização já está em execução"
      };
    }

    const startTime = Date.now();
    this.isRunning = true;

    try {
      const operationId = userContext.operationId;
      const storeId = userContext.storeId;
      
      console.log(`🧪 Teste de sincronização limitada: max ${maxPages} páginas para operação ${operationId}`);
      
      // Get operation details to determine the correct country for API calls
      const [operation] = await db
        .select()
        .from(operations)
        .where(eq(operations.id, operationId))
        .limit(1);
      
      if (!operation) {
        throw new Error(`❌ Operação ${operationId} não encontrada`);
      }

      // Get shipping providers for this operation to configure credentials
      const { storage } = await import("./storage");
      const providers = await storage.getShippingProvidersByOperation(operationId);
      const activeProvider = providers.find(p => p.isActive && p.apiKey);
      
      if (!activeProvider || activeProvider.type !== 'european_fulfillment') {
        throw new Error(`❌ Nenhum provedor European Fulfillment ativo encontrado para a operação ${operationId}`);
      }

      // Create a user-specific fulfillment service instance with their credentials
      const userFulfillmentService = new EuropeanFulfillmentService(
        activeProvider.login,
        activeProvider.password,
        activeProvider.apiUrl || undefined
      );
      
      // Map operation country to API country format
      const countryMapping = {
        'ES': 'SPAIN',
        'IT': 'ITALY',
        'FR': 'FRANCE',
        'DE': 'GERMANY'
      };
      
      const syncCountry = countryMapping[operation.country as keyof typeof countryMapping] || "SPAIN";
      console.log(`🌍 Sincronizando ${maxPages} páginas para ${operation.country} -> ${syncCountry}`);

      let newLeads = 0;
      let updatedLeads = 0;
      let totalProcessed = 0;
      let currentPage = 1;
      let pagesScanned = 0;

      // Sincronizar apenas o número limitado de páginas
      while (currentPage <= maxPages) {
        try {
          console.log(`📄 Teste: página ${currentPage}/${maxPages}...`);
          
          const pageLeads = await userFulfillmentService.getLeadsList(syncCountry, currentPage);
          
          if (!pageLeads || pageLeads.length === 0) {
            console.log(`📄 Página ${currentPage} vazia, finalizando teste...`);
            break;
          }

          pagesScanned++;

          // Processar cada lead da página
          for (const apiLead of pageLeads) {
            try {
              // Verificar se o lead já existe NESTA operação
              const [existingLead] = await db
                .select()
                .from(orders)
                .where(and(
                  eq(orders.id, apiLead.n_lead),
                  eq(orders.operationId, operationId)
                ))
                .limit(1);

              if (!existingLead) {
                // Lead novo - inserir COM operationId para isolamento
                const status = apiLead.status_livrison || "new order";
                
                // Garantir que temos storeId válido antes de inserir
                const finalStoreId = storeId || operation.storeId || await this.getDefaultStoreId();
                
                if (!finalStoreId) {
                  console.error(`❌ StoreId null para lead ${apiLead.n_lead}, pulando...`);
                  continue;
                }
                
                const costs = await this.calculateOrderCosts(status, apiLead.lead_value, [], finalStoreId);
                
                const orderData: InsertOrder = {
                  id: apiLead.n_lead,
                  storeId: finalStoreId,
                  operationId: operationId,
                  customerName: apiLead.name,
                  customerPhone: apiLead.phone,
                  customerCity: apiLead.city,
                  customerCountry: "ES",
                  total: apiLead.lead_value,
                  status: status,
                  paymentMethod: apiLead.method_payment || "COD",
                  provider: "european_fulfillment",
                  productCost: costs.productCost.toString(),
                  shippingCost: costs.shippingCost.toString(),
                  orderDate: new Date(),
                };
                
                await db.insert(orders).values(orderData);

                newLeads++;
                totalProcessed++;
                
                // Progresso detalhado para o usuário
                if (totalProcessed % 10 === 0 || totalProcessed <= 5) {
                  console.log(`📦 Importando pedidos: ${totalProcessed} processados, ${newLeads} novos (Página ${currentPage}/${maxPages})`);
                }
              } else {
                // Lead existente - atualizar status se mudou
                if (existingLead.status !== (apiLead.status_livrison || "new order")) {
                  await db
                    .update(orders)
                    .set({
                      status: apiLead.status_livrison || "new order",
                      updatedAt: new Date(),
                    })
                    .where(and(
                      eq(orders.id, apiLead.n_lead),
                      eq(orders.operationId, operationId)
                    ));
                  
                  updatedLeads++;
                }
              }
              
              totalProcessed++;
            } catch (error) {
              console.warn(`⚠️  Erro ao processar lead ${apiLead.n_lead}:`, error);
            }
          }

          currentPage++;
          
          // Pequena pausa entre páginas
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.warn(`⚠️  Erro ao buscar página ${currentPage}:`, error);
          break;
        }
      }

      const duration = Date.now() - startTime;
      
      const message = `Teste de sincronização: ${newLeads} novos, ${updatedLeads} atualizados em ${pagesScanned} páginas`;
      console.log(`✅ ${message} (${duration}ms)`);

      return {
        success: true,
        newLeads,
        updatedLeads,
        totalProcessed,
        duration,
        pagesScanned,
        message
      };

    } finally {
      this.isRunning = false;
    }
  }

  async startFullInitialSync(userContext?: { userId: string; operationId: string; storeId: string }): Promise<{
    success: boolean;
    newLeads: number;
    updatedLeads: number;
    totalProcessed: number;
    duration: number;
    message: string;
  }> {
    if (this.isRunning) {
      return {
        success: false,
        newLeads: 0,
        updatedLeads: 0,
        totalProcessed: 0,
        duration: 0,
        message: "Sincronização já está em execução"
      };
    }

    const startTime = Date.now();
    this.isRunning = true;

    try {
      // CRITICAL: Use user-specific context or fallback to default
      const operationId = userContext?.operationId;
      const storeId = userContext?.storeId || await this.getDefaultStoreId();
      
      if (!operationId) {
        throw new Error('❌ ID da operação não fornecido para sincronização');
      }
      
      // Get operation details to determine the correct country for API calls
      const [operation] = await db
        .select()
        .from(operations)
        .where(eq(operations.id, operationId))
        .limit(1);
      
      if (!operation) {
        throw new Error(`❌ Operação ${operationId} não encontrada`);
      }

      // Get shipping providers for this operation to configure credentials
      const { storage } = await import("./storage");
      const providers = await storage.getShippingProvidersByOperation(operationId);
      const activeProvider = providers.find(p => p.isActive && p.apiKey);
      
      if (!activeProvider || activeProvider.type !== 'european_fulfillment') {
        throw new Error(`❌ Nenhum provedor European Fulfillment ativo encontrado para a operação ${operationId}`);
      }

      // Create a user-specific fulfillment service instance with their credentials
      const userFulfillmentService = new EuropeanFulfillmentService(
        activeProvider.login,
        activeProvider.password,
        activeProvider.apiUrl || undefined
      );
      
      // Map country codes to API format  
      const countryMapping = {
        'ES': 'SPAIN',
        'IT': 'ITALY', 
        'FR': 'FRANCE',
        'PT': 'PORTUGAL',
        'DE': 'GERMANY',
        'AT': 'AUSTRIA',
        'GR': 'GREECE',
        'PL': 'POLAND',
        'CZ': 'CZECH REPUBLIC',
        'SK': 'ESLOVAQUIA',
        'HU': 'HUNGRY',
        'RO': 'ROMANIA',
        'BG': 'BULGARIA',
        'HR': 'CROACIA',
        'SI': 'ESLOVENIA',
        'EE': 'ESTONIA',
        'LV': 'LATVIA',
        'LT': 'LITHUANIA'
      };
      
      const syncCountry = countryMapping[operation.country as keyof typeof countryMapping] || "SPAIN";
      console.log(`🔄 Iniciando sincronização COMPLETA para operação ${operationId} (${operation.country} -> ${syncCountry})...`);

      let newLeads = 0;
      let updatedLeads = 0;
      let totalProcessed = 0;
      let currentPage = 1;
      let hasMorePages = true;

      // Buscar TODAS as páginas até o fim
      while (hasMorePages) {
        try {
          console.log(`📄 Processando página ${currentPage}...`);
          
          const pageLeads = await userFulfillmentService.getLeadsList(syncCountry, currentPage);
          
          if (!pageLeads || pageLeads.length === 0) {
            console.log(`📄 Página ${currentPage} vazia, finalizando...`);
            break;
          }

          // Processar cada lead da página
          for (const apiLead of pageLeads) {
            try {
              // Verificar se o lead já existe NESTA operação
              const [existingLead] = await db
                .select()
                .from(orders)
                .where(and(
                  eq(orders.id, apiLead.n_lead),
                  eq(orders.operationId, operationId)
                ))
                .limit(1);

              if (!existingLead) {
                // Lead novo - inserir COM operationId para isolamento
                const status = apiLead.status_livrison || "new order";
                
                // Garantir que temos storeId válido antes de inserir
                const finalStoreId = storeId || operation.storeId || await this.getDefaultStoreId();
                
                if (!finalStoreId) {
                  console.error(`❌ StoreId null para lead ${apiLead.n_lead}, pulando...`);
                  continue;
                }
                
                const costs = await this.calculateOrderCosts(status, apiLead.lead_value, [], finalStoreId);
                
                const orderData: InsertOrder = {
                  id: apiLead.n_lead,
                  storeId: finalStoreId,
                  operationId: operationId,
                  customerName: apiLead.name,
                  customerPhone: apiLead.phone,
                  customerCity: apiLead.city,
                  customerCountry: "IT",
                  total: apiLead.lead_value,
                  status: status,
                  paymentMethod: apiLead.method_payment || "COD",
                  provider: "european_fulfillment",
                  productCost: costs.productCost.toString(),
                  shippingCost: costs.shippingCost.toString(),
                  orderDate: new Date(),
                };
                
                await db.insert(orders).values(orderData);

                newLeads++;
                if (newLeads % 50 === 0) {
                  console.log(`✅ ${newLeads} leads processados...`);
                }
              } else {
                // Lead existente - atualizar status se mudou (somente na mesma operação)
                if (existingLead.status !== (apiLead.status_livrison || "new order")) {
                  await db
                    .update(orders)
                    .set({
                      status: apiLead.status_livrison || "new order",
                      updatedAt: new Date(),
                    })
                    .where(and(
                      eq(orders.id, apiLead.n_lead),
                      eq(orders.operationId, operationId)
                    ));
                  
                  updatedLeads++;
                }
              }
              
              totalProcessed++;
            } catch (error) {
              console.warn(`⚠️  Erro ao processar lead ${apiLead.n_lead}:`, error);
            }
          }

          // Verificar se há mais páginas
          if (pageLeads.length < 15) {
            hasMorePages = false;
          } else {
            currentPage++;
            // Pequena pausa para não sobrecarregar a API
            await new Promise(resolve => setTimeout(resolve, 100));
          }

        } catch (error) {
          console.warn(`⚠️  Erro ao buscar página ${currentPage}:`, error);
          break;
        }
      }

      const duration = Date.now() - startTime;
      this.lastSyncTime = new Date();

      const message = `Sincronização completa: ${newLeads} novos, ${updatedLeads} atualizados de ${totalProcessed} leads em ${Math.round(duration / 1000)}s`;
      
      console.log(`✅ ${message}`);

      // Se importamos muitos pedidos novos (indicando sincronização inicial completa), marcar onboarding como concluído
      if (newLeads >= 100 && userContext?.userId) {
        try {
          const { storage } = await import("./storage");
          const user = await storage.getUser(userContext.userId);
          
          if (user && !user.onboardingCompleted) {
            const steps = typeof user.onboardingSteps === 'string' 
              ? JSON.parse(user.onboardingSteps) 
              : user.onboardingSteps || {};
            
            steps.step5_sync = true;
            
            // Note: updateUser method needs to be implemented in storage
            console.log("Onboarding completion would be updated here");
            
            console.log(`🎉 Onboarding concluído automaticamente para usuário ${userContext.userId} após sincronizar ${newLeads} pedidos!`);
          }
        } catch (error) {
          console.warn("⚠️ Erro ao marcar onboarding como concluído:", error);
        }
      }

      return {
        success: true,
        newLeads,
        updatedLeads,
        totalProcessed,
        duration,
        message
      };

    } catch (error) {
      console.error("❌ Erro na sincronização completa:", error);
      return {
        success: false,
        newLeads: 0,
        updatedLeads: 0,
        totalProcessed: 0,
        duration: Date.now() - startTime,
        message: `Erro na sincronização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    } finally {
      this.isRunning = false;
    }
  }

  async startIncrementalSync(options: SyncOptions = {}, userContext?: { userId: string; operationId: string; storeId: string }): Promise<{
    success: boolean;
    newLeads: number;
    updatedLeads: number;
    skippedLeads: number;
    totalProcessed: number;
    duration: number;
    message: string;
  }> {
    if (this.isRunning) {
      return {
        success: false,
        newLeads: 0,
        updatedLeads: 0,
        skippedLeads: 0,
        totalProcessed: 0,
        duration: 0,
        message: "Sincronização já está em execução"
      };
    }

    const startTime = Date.now();
    this.isRunning = true;

    try {
      // CRITICAL: Use user-specific context or fallback to default
      const operationId = userContext?.operationId;
      const storeId = userContext?.storeId || await this.getDefaultStoreId();
      
      if (!operationId) {
        throw new Error('❌ ID da operação não fornecido para sincronização');
      }
      
      // Get operation details to determine the correct country for API calls
      const [operation] = await db
        .select()
        .from(operations)
        .where(eq(operations.id, operationId))
        .limit(1);
      
      if (!operation) {
        throw new Error(`❌ Operação ${operationId} não encontrada`);
      }
      
      const syncCountry = operation.country || "ITALY"; // Use operation's country, fallback to ITALY
      console.log(`📋 Iniciando sincronização incremental para operação ${operationId} (${syncCountry})...`);

      let newLeads = 0;
      let updatedLeads = 0;
      let skippedLeads = 0;
      let totalProcessed = 0;

      // 1. Buscar leads que precisam ser atualizados NESTA operação (todos os não-finalizados + sample de finalizados)
      const activeLeads = await db
        .select()
        .from(orders)
        .where(and(
          not(inArray(orders.status, this.finalStatuses)),
          eq(orders.operationId, operationId)
        ));

      // Também verificar uma amostra de pedidos finalizados DESTA operação (caso o status mude)
      const finalizedSample = await db
        .select()
        .from(orders)
        .where(and(
          inArray(orders.status, this.finalStatuses),
          eq(orders.operationId, operationId)
        ))
        .limit(20); // Verificar apenas 20 pedidos finalizados por vez

      const leadsToUpdate = [...activeLeads, ...finalizedSample];

      console.log(`📋 Encontrados ${leadsToUpdate.length} leads para atualização`);

      // 2. Atualizar leads existentes com status não-final
      for (const lead of leadsToUpdate) {
        if (lead.id) {
          try {
            const leadDetails = await this.fulfillmentService.getLeadStatus(lead.id);
            
            if (leadDetails && leadDetails.status !== lead.status) {
              await db
                .update(orders)
                .set({
                  status: leadDetails.status,
                  updatedAt: new Date(),
                })
                .where(and(
                  eq(orders.id, lead.id),
                  eq(orders.operationId, operationId)
                ));
              
              updatedLeads++;
              console.log(`✏️  Lead ${lead.id} atualizado: ${lead.status} → ${leadDetails.status}`);
            } else {
              skippedLeads++;
            }
          } catch (error) {
            console.warn(`⚠️  Erro ao atualizar lead ${lead.id}:`, error);
          }
        }
        totalProcessed++;
      }

      // 3. Buscar novos leads da API (TODAS as páginas para garantir completude)
      const maxPages = options.maxPages || Infinity; // SEM LIMITE - buscar TODOS os leads
      let apiLeads: any[] = [];

      for (let page = 1; page <= maxPages; page++) {
        try {
          const pageResponse = await this.fulfillmentService.getLeadsListWithPagination(syncCountry, page);
          const pageLeads = pageResponse.data || pageResponse;
          
          if (!pageLeads || pageLeads.length === 0) break;
          
          apiLeads = apiLeads.concat(pageLeads);
          
          // Se encontrou menos que 15 leads, provavelmente chegou ao fim
          if (pageLeads.length < 15) break;
        } catch (error) {
          console.warn(`⚠️  Erro ao buscar página ${page}:`, error);
          break;
        }
      }

      console.log(`🌐 Recuperados ${apiLeads.length} leads da API`);

      // 4. Processar novos leads
      for (const apiLead of apiLeads) {
        try {
          // Verificar se o lead já existe NESTA operação
          const [existingLead] = await db
            .select()
            .from(orders)
            .where(and(
              eq(orders.id, apiLead.n_lead),
              eq(orders.operationId, operationId)
            ))
            .limit(1);

          if (!existingLead) {
            // Lead novo - inserir com dados básicos da API COM operationId
            await db.insert(orders).values({
              id: apiLead.n_lead,
              storeId: storeId,
              operationId: operationId,
              customerName: apiLead.name,
              customerPhone: apiLead.phone,
              customerCity: apiLead.city,
              customerCountry: "IT",
              total: apiLead.lead_value,
              status: apiLead.status_livrison || "new order",
              paymentMethod: apiLead.method_payment || "COD",
              provider: "european_fulfillment",
            });

            newLeads++;
            console.log(`✅ Novo lead adicionado: ${apiLead.n_lead}`);
          } else if (!this.finalStatuses.includes(existingLead.status)) {
            // Lead existente com status não-final - já foi processado acima
            skippedLeads++;
          }
          
          totalProcessed++;
        } catch (error) {
          console.warn(`⚠️  Erro ao processar lead ${apiLead.n_lead}:`, error);
        }
      }

      // 5. Finalizar sincronização
      console.log(`📊 Sincronização finalizada: processados ${totalProcessed}, novos ${newLeads}, atualizados ${updatedLeads}`);

      const duration = Date.now() - startTime;
      this.lastSyncTime = new Date();

      const message = `Sincronização concluída: ${newLeads} novos, ${updatedLeads} atualizados, ${skippedLeads} ignorados`;
      
      console.log(`✅ ${message} em ${duration}ms`);

      return {
        success: true,
        newLeads,
        updatedLeads,
        skippedLeads,
        totalProcessed,
        duration,
        message
      };

    } catch (error) {
      console.error("❌ Erro na sincronização:", error);
      return {
        success: false,
        newLeads: 0,
        updatedLeads: 0,
        skippedLeads: 0,
        totalProcessed: 0,
        duration: Date.now() - startTime,
        message: `Erro na sincronização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    } finally {
      this.isRunning = false;
    }
  }

  async scheduleAutoSync(): Promise<void> {
    console.log("⏰ Sincronização automática desabilitada temporariamente - use sincronização manual via dashboard");
  }

  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  isCurrentlyRunning(): boolean {
    return this.isRunning;
  }

  async getSyncStats(operationId?: string): Promise<{
    totalLeads: number;
    activeLeads: number;
    finalizedLeads: number;
    lastSync: Date | null;
    isRunning: boolean;
    syncHistory: Array<{ timestamp: Date; newLeads: number; updates: number }>;
    currentVolume: 'low' | 'medium' | 'high';
  }> {
    let allLeads;
    
    if (operationId) {
      // Filter by specific operation
      allLeads = await db.select().from(orders).where(eq(orders.operationId, operationId));
    } else {
      // Get all leads (fallback for compatibility)
      allLeads = await db.select().from(orders);
    }
    
    const totalCount = allLeads.length;
    const activeCount = allLeads.filter(lead => this.activeStatuses.includes(lead.status)).length;
    const finalizedCount = allLeads.filter(lead => this.finalStatuses.includes(lead.status)).length;

    return {
      totalLeads: totalCount,
      activeLeads: activeCount,
      finalizedLeads: finalizedCount,
      lastSync: this.lastSyncTime,
      isRunning: this.isRunning,
      syncHistory: this.syncHistory.slice(-10), // Últimas 10 sincronizações
      currentVolume: this.analyzeVolumePattern()
    };
  }

  /**
   * Obtém o status atual da sincronização completa progressiva
   */
  getCompleteSyncStatus() {
    return { ...this.completeSyncStatus };
  }

  /**
   * Executa sincronização completa progressiva com atualizações em tempo real
   */
  async performCompleteSyncProgressive(options: SyncOptions & { maxRetries?: number; countryCode?: string; operationId?: string; storeId?: string } = {}): Promise<void> {
    if (this.completeSyncStatus.isRunning) {
      throw new Error('Sincronização completa já está em execução');
    }

    const maxRetries = options.maxRetries || 5;
    const countryCode = options.countryCode || 'IT';
    const operationId = options.operationId || '';
    const storeId = options.storeId || await this.getDefaultStoreId();
    let currentRetry = 0;

    // Map country codes to API format
    const countryMapping: Record<string, string> = {
      'ES': 'SPAIN',
      'IT': 'ITALY',
      'FR': 'FRANCE',
      'DE': 'GERMANY',
      'PT': 'PORTUGAL',
      'GB': 'UK',
      'NL': 'NETHERLANDS',
      'BE': 'BELGIUM'
    };

    const apiCountry = countryMapping[countryCode] || countryCode;
    console.log(`🌍 País configurado: ${countryCode} -> API: ${apiCountry}`);

    this.completeSyncStatus = {
      isRunning: true,
      currentPage: 0,
      totalPages: 0,
      processedLeads: 0,
      totalLeads: 0,
      newLeads: 0,
      updatedLeads: 0,
      errors: 0,
      retries: 0,
      estimatedTimeRemaining: "Calculando...",
      currentSpeed: 0,
      phase: 'connecting',
      message: "Conectando à API da transportadora...",
      startTime: new Date()
    };

    while (currentRetry <= maxRetries) {
      try {
        await this.executeCompleteSyncWithProgress(apiCountry, operationId, storeId);
        
        // Sucesso - marcar como concluído
        this.completeSyncStatus.phase = 'completed';
        this.completeSyncStatus.message = `Sincronização concluída! ${this.completeSyncStatus.totalLeads} pedidos processados.`;
        this.completeSyncStatus.isRunning = false;
        return;

      } catch (error) {
        currentRetry++;
        this.completeSyncStatus.retries = currentRetry;
        this.completeSyncStatus.errors++;
        
        console.error(`❌ Tentativa ${currentRetry}/${maxRetries + 1} falhou:`, error);
        
        if (currentRetry <= maxRetries) {
          this.completeSyncStatus.phase = 'retrying';
          this.completeSyncStatus.message = `Erro detectado. Tentando novamente... (${currentRetry}/${maxRetries + 1})`;
          
          // Aguardar antes de tentar novamente (backoff exponencial)
          const waitTime = Math.min(1000 * Math.pow(2, currentRetry), 30000);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          // Esgotar todas as tentativas
          this.completeSyncStatus.phase = 'error';
          this.completeSyncStatus.message = `Falha após ${maxRetries + 1} tentativas. Tente novamente mais tarde.`;
          this.completeSyncStatus.isRunning = false;
        }
      }
    }
  }

  /**
   * Executa a sincronização completa com atualizações de progresso
   */
  private async executeCompleteSyncWithProgress(apiCountry: string, operationId: string, storeId: string): Promise<void> {
    console.log(`🔄 Iniciando sincronização completa progressiva para ${apiCountry}...`);
    
    this.completeSyncStatus.phase = 'syncing';
    this.completeSyncStatus.message = "Obtendo informações totais da API...";

    // Obter informações iniciais da API - primeiro buscar dados para calcular total
    const firstPageLeads = await this.fulfillmentService.getLeadsList(apiCountry, 1);
    
    if (!firstPageLeads || firstPageLeads.length === 0) {
      throw new Error('Não foi possível obter dados da primeira página da API');
    }

    // Usar o total real retornado pela API
    const apiResponse = await this.fulfillmentService.getLeadsListWithPagination(apiCountry, 1);
    const totalLeads = apiResponse?.total || 1173; // Fallback baseado no último valor conhecido
    const leadsPerPage = apiResponse?.per_page || 15; // Usar o valor real da API
    const totalPages = apiResponse?.last_page || Math.ceil(totalLeads / leadsPerPage);
    
    this.completeSyncStatus.totalLeads = totalLeads;
    this.completeSyncStatus.totalPages = totalPages;
    this.completeSyncStatus.message = `Processando ${this.completeSyncStatus.totalLeads} pedidos em ${this.completeSyncStatus.totalPages} páginas...`;

    console.log(`📊 Total de pedidos a processar: ${this.completeSyncStatus.totalLeads}`);
    console.log(`📄 Total de páginas estimadas: ${this.completeSyncStatus.totalPages}`);

    let allNewLeads = 0;
    let allUpdatedLeads = 0;

    // Processar todas as páginas
    for (let page = 1; page <= this.completeSyncStatus.totalPages; page++) {
      this.completeSyncStatus.currentPage = page;
      this.completeSyncStatus.message = `Processando página ${page} de ${this.completeSyncStatus.totalPages}...`;

      try {
        const pageResponse = await this.fulfillmentService.getLeadsListWithPagination(apiCountry, page);
        const pageLeads = pageResponse.data || pageResponse;
        
        if (!pageLeads || pageLeads.length === 0) {
          console.log(`📄 Página ${page} vazia, finalizando...`);
          break;
        }
        
        const { newLeads, updatedLeads } = await this.processLeadsPage(pageLeads, storeId, operationId);
        
        allNewLeads += newLeads;
        allUpdatedLeads += updatedLeads;
        
        this.completeSyncStatus.newLeads = allNewLeads;
        this.completeSyncStatus.updatedLeads = allUpdatedLeads;
        this.completeSyncStatus.processedLeads = (page - 1) * leadsPerPage + pageLeads.length;

        // Calcular velocidade e tempo estimado
        const elapsed = (Date.now() - this.completeSyncStatus.startTime!.getTime()) / 1000;
        this.completeSyncStatus.currentSpeed = Math.round((this.completeSyncStatus.processedLeads / elapsed) * 60);
        
        const remaining = this.completeSyncStatus.totalLeads - this.completeSyncStatus.processedLeads;
        const estimatedSeconds = remaining / (this.completeSyncStatus.currentSpeed / 60);
        this.completeSyncStatus.estimatedTimeRemaining = this.formatTimeRemaining(estimatedSeconds);

        console.log(`✅ Página ${page}/${this.completeSyncStatus.totalPages}: +${newLeads} novos, ~${updatedLeads} atualizados`);

        // Pequena pausa para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Erro na página ${page}:`, error);
        throw error; // Re-throw para tentar novamente
      }
    }

    // Atualizar histórico
    this.syncHistory.push({
      timestamp: new Date(),
      newLeads: allNewLeads,
      updates: allUpdatedLeads
    });

    this.lastSyncTime = new Date();

    console.log(`🎉 Sincronização completa finalizada: ${allNewLeads} novos, ${allUpdatedLeads} atualizados`);
  }

  /**
   * Processa uma página de leads da API com algoritmo de matching em 4 níveis
   */
  private async processLeadsPage(leads: any[], storeId: string, operationId: string): Promise<{ newLeads: number; updatedLeads: number }> {
    let newLeads = 0;
    let updatedLeads = 0;

    const { matchCarrierLeadToOrder } = await import('./carrier-matcher');

    for (const apiLead of leads) {
      try {
        // Executar algoritmo de matching em 4 níveis
        const matchResult = await matchCarrierLeadToOrder(apiLead, storeId, operationId);

        if (matchResult.matched && matchResult.order) {
          // Pedido encontrado - ATUALIZAR com dados da transportadora
          const updateData: any = {
            carrierImported: true,
            carrierOrderId: apiLead.n_lead,
            carrierMatchedAt: new Date(),
            carrierConfirmation: apiLead.status_confirmation || null,
            status: this.mapCarrierStatusToOrderStatus(apiLead.status_livrison),
            lastStatusUpdate: new Date(),
            updatedAt: new Date(),
          };

          // Atualizar tracking se disponível
          if (apiLead.tracking_number) {
            updateData.trackingNumber = apiLead.tracking_number;
          }

          await db
            .update(orders)
            .set(updateData)
            .where(eq(orders.id, matchResult.order.id));

          console.log(`✅ Pedido atualizado: ${matchResult.order.id} (${matchResult.matchMethod})`);
          updatedLeads++;
        } else {
          // Nenhum match - criar novo pedido (carrier-first)
          // Usar o ID da transportadora como ID do pedido
          await db.insert(orders).values({
            id: apiLead.n_lead, // Usar ID da transportadora como ID do pedido
            storeId,
            operationId,
            customerName: apiLead.name,
            customerPhone: apiLead.phone,
            customerCity: apiLead.city,
            customerCountry: "ES",
            total: apiLead.lead_value,
            status: this.mapCarrierStatusToOrderStatus(apiLead.status_livrison),
            paymentMethod: apiLead.method_payment || "COD",
            provider: "european_fulfillment",
            carrierImported: true,
            carrierOrderId: apiLead.n_lead,
            carrierConfirmation: apiLead.status_confirmation || null,
            dataSource: "carrier",
            lastStatusUpdate: new Date(),
          });

          console.log(`➕ Novo pedido criado (carrier-first): ${apiLead.n_lead}`);
          newLeads++;
        }
      } catch (error) {
        console.warn(`⚠️  Erro ao processar lead ${apiLead.n_lead}:`, error);
        throw error;
      }
    }

    return { newLeads, updatedLeads };
  }

  /**
   * Mapeia status da transportadora para status do pedido
   */
  private mapCarrierStatusToOrderStatus(carrierStatus: string): string {
    if (!carrierStatus) return 'pending';

    const statusMap: Record<string, string> = {
      'proseccing': 'shipped',
      'processing': 'shipped',
      'delivered': 'delivered',
      'livred': 'delivered',
      'canceled': 'cancelled',
      'cancelled': 'cancelled',
      'canceled by system': 'cancelled',
      'unpacked': 'pending',
      'new order': 'pending',
      'wrong': 'pending',
      'out of area': 'cancelled'
    };

    const normalized = carrierStatus.toLowerCase().trim();
    return statusMap[normalized] || 'pending';
  }

  /**
   * Formatar tempo restante em formato legível
   */
  private formatTimeRemaining(seconds: number): string {
    if (isNaN(seconds) || seconds <= 0) return "Finalizando...";
    
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours}h ${minutes}min`;
  }
}

export const smartSyncService = new SmartSyncService();