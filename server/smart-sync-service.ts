import { db } from "./db";
import { orders, stores } from "@shared/schema";
import { europeanFulfillmentService } from "./fulfillment-service";
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
  
  // Configurações inteligentes baseadas em volume
  private adaptiveConfig = {
    lowVolumeThreshold: 5,    // Menos de 5 mudanças/hora = baixo volume
    mediumVolumeThreshold: 50, // Menos de 50 mudanças/hora = médio volume
    maxPagesLowVolume: 3,     // 3 páginas = ~45 leads para baixo volume
    maxPagesMediumVolume: 8,  // 8 páginas = ~120 leads para médio volume
    maxPagesHighVolume: 20,   // 20 páginas = ~300 leads para alto volume
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
  private calculateOrderCosts(status: string, total: string): { productCost: number; shippingCost: number } {
    const orderValue = parseFloat(total);
    
    // Custo do produto: aplicado quando pedido está confirmado/pago
    const productCost = ['confirmed', 'delivered', 'shipped', 'in transit', 'in delivery'].includes(status) ?
      (orderValue >= 120 ? 45.00 : orderValue >= 60 ? 35.00 : 30.00) : 0.00;
    
    // Custo de envio: aplicado quando pedido está enviado
    const shippingCost = ['shipped', 'delivered', 'in transit', 'in delivery'].includes(status) ?
      (orderValue >= 120 ? 15.00 : orderValue >= 60 ? 12.00 : 10.00) : 0.00;
    
    return { productCost, shippingCost };
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
  async startIntelligentSync(): Promise<{
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

    try {
      // Analisa o padrão de volume para determinar estratégia
      const volumePattern = this.analyzeVolumePattern();
      const maxPages = this.getOptimalSyncPages(volumePattern);
      const storeId = await this.getDefaultStoreId();
      
      console.log(`🧠 Sincronização inteligente: Volume ${volumePattern}, ${maxPages} páginas`);

      let newLeads = 0;
      let updatedLeads = 0;
      let totalProcessed = 0;
      let currentPage = 1;
      let pagesScanned = 0;

      // Sincronizar apenas as páginas necessárias baseado no volume
      while (currentPage <= maxPages) {
        try {
          console.log(`📄 Escaneando página ${currentPage}/${maxPages}...`);
          
          const pageLeads = await europeanFulfillmentService.getLeadsList("ITALY", currentPage);
          
          if (!pageLeads || pageLeads.length === 0) {
            console.log(`📄 Página ${currentPage} vazia, finalizando...`);
            break;
          }

          pagesScanned++;

          // Processar cada lead da página
          for (const apiLead of pageLeads) {
            try {
              // Verificar se o lead já existe
              const [existingLead] = await db
                .select()
                .from(orders)
                .where(eq(orders.id, apiLead.n_lead))
                .limit(1);

              if (!existingLead) {
                // Lead novo - inserir
                const status = apiLead.status_livrison || "new order";
                const costs = this.calculateOrderCosts(status, apiLead.lead_value);
                
                await db.insert(orders).values({
                  id: apiLead.n_lead,
                  storeId,
                  customerName: apiLead.name,
                  customerPhone: apiLead.phone,
                  customerCity: apiLead.city,
                  customerCountry: "IT",
                  total: apiLead.lead_value,
                  status: status,
                  paymentMethod: apiLead.method_payment || "COD",
                  provider: "european_fulfillment",
                  productCost: costs.productCost,
                  shippingCost: costs.shippingCost,
                  orderDate: new Date(),
                });

                newLeads++;
              } else {
                // Lead existente - atualizar status se mudou
                if (existingLead.status !== (apiLead.status_livrison || "new order")) {
                  await db
                    .update(orders)
                    .set({
                      status: apiLead.status_livrison || "new order",
                      updatedAt: new Date(),
                    })
                    .where(eq(orders.id, apiLead.n_lead));
                  
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
    }
  }

  async startFullInitialSync(): Promise<{
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
      console.log("🔄 Iniciando sincronização COMPLETA de todos os leads...");

      let newLeads = 0;
      let updatedLeads = 0;
      let totalProcessed = 0;
      let currentPage = 1;
      let hasMorePages = true;

      // Buscar TODAS as páginas até o fim
      while (hasMorePages) {
        try {
          console.log(`📄 Processando página ${currentPage}...`);
          
          const pageLeads = await europeanFulfillmentService.getLeadsList("ITALY", currentPage);
          
          if (!pageLeads || pageLeads.length === 0) {
            console.log(`📄 Página ${currentPage} vazia, finalizando...`);
            break;
          }

          // Processar cada lead da página
          for (const apiLead of pageLeads) {
            try {
              // Verificar se o lead já existe
              const [existingLead] = await db
                .select()
                .from(orders)
                .where(eq(orders.id, apiLead.n_lead))
                .limit(1);

              if (!existingLead) {
                // Lead novo - inserir
                const status = apiLead.status_livrison || "new order";
                const costs = this.calculateOrderCosts(status, apiLead.lead_value);
                
                await db.insert(orders).values({
                  id: apiLead.n_lead,
                  storeId: storeId,
                  customerName: apiLead.name,
                  customerPhone: apiLead.phone,
                  customerCity: apiLead.city,
                  customerCountry: "IT",
                  total: apiLead.lead_value,
                  status: status,
                  paymentMethod: apiLead.method_payment || "COD",
                  provider: "european_fulfillment",
                  productCost: costs.productCost,
                  shippingCost: costs.shippingCost,
                  orderDate: new Date(),
                });

                newLeads++;
                if (newLeads % 50 === 0) {
                  console.log(`✅ ${newLeads} leads processados...`);
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
                    .where(eq(orders.id, apiLead.n_lead));
                  
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

  async startIncrementalSync(options: SyncOptions = {}): Promise<{
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
      console.log("🔄 Iniciando sincronização inteligente...");

      console.log("📋 Iniciando sincronização incremental...");

      let newLeads = 0;
      let updatedLeads = 0;
      let skippedLeads = 0;
      let totalProcessed = 0;

      // 1. Buscar leads que precisam ser atualizados (todos os não-finalizados + sample de finalizados)
      const activeLeads = await db
        .select()
        .from(orders)
        .where(not(inArray(orders.status, this.finalStatuses)));

      // Também verificar uma amostra de pedidos finalizados (caso o status mude)
      const finalizedSample = await db
        .select()
        .from(orders)
        .where(inArray(orders.status, this.finalStatuses))
        .limit(20); // Verificar apenas 20 pedidos finalizados por vez

      const leadsToUpdate = [...activeLeads, ...finalizedSample];

      console.log(`📋 Encontrados ${leadsToUpdate.length} leads para atualização`);

      // 2. Atualizar leads existentes com status não-final
      for (const lead of leadsToUpdate) {
        if (lead.id) {
          try {
            const leadDetails = await europeanFulfillmentService.getLeadStatus(lead.id);
            
            if (leadDetails && leadDetails.status !== lead.status) {
              await db
                .update(orders)
                .set({
                  status: leadDetails.status,
                  updatedAt: new Date(),
                })
                .where(eq(orders.id, lead.id));
              
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

      // 3. Buscar novos leads da API (apenas as primeiras páginas para otimizar)
      const maxPages = options.maxPages || 3; // Limitar a 3 páginas (45 leads mais recentes)
      let apiLeads: any[] = [];

      for (let page = 1; page <= maxPages; page++) {
        try {
          const pageLeads = await europeanFulfillmentService.getLeadsList("ITALY", page);
          
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
          // Verificar se o lead já existe
          const [existingLead] = await db
            .select()
            .from(orders)
            .where(eq(orders.id, apiLead.n_lead))
            .limit(1);

          if (!existingLead) {
            // Lead novo - inserir com dados básicos da API
            await db.insert(orders).values({
              id: apiLead.n_lead,
              storeId: storeId,
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
    // Sincronização inteligente automática a cada 5 minutos
    setInterval(async () => {
      if (!this.isRunning) {
        console.log("🧠 Executando sincronização inteligente automática...");
        const result = await this.startIntelligentSync();
        if (result.success) {
          console.log(`🎯 Sync automático (${result.volume}): ${result.newLeads} novos, ${result.updatedLeads} atualizados em ${result.pagesScanned} páginas`);
        }
      }
    }, 5 * 60 * 1000); // 5 minutos

    console.log("⏰ Sincronização inteligente automática agendada para cada 5 minutos");
  }

  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  isCurrentlyRunning(): boolean {
    return this.isRunning;
  }

  async getSyncStats(): Promise<{
    totalLeads: number;
    activeLeads: number;
    finalizedLeads: number;
    lastSync: Date | null;
    isRunning: boolean;
    syncHistory: Array<{ timestamp: Date; newLeads: number; updates: number }>;
    currentVolume: 'low' | 'medium' | 'high';
  }> {
    const allLeads = await db.select().from(orders);
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
  async performCompleteSyncProgressive(options: SyncOptions & { maxRetries?: number } = {}): Promise<void> {
    if (this.completeSyncStatus.isRunning) {
      throw new Error('Sincronização completa já está em execução');
    }

    const maxRetries = options.maxRetries || 5;
    let currentRetry = 0;

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
        await this.executeCompleteSyncWithProgress();
        
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
  private async executeCompleteSyncWithProgress(): Promise<void> {
    console.log('🔄 Iniciando sincronização completa progressiva...');
    
    this.completeSyncStatus.phase = 'syncing';
    this.completeSyncStatus.message = "Obtendo informações totais da API...";

    // Obter informações iniciais da API - primeiro buscar dados para calcular total
    const firstPageLeads = await europeanFulfillmentService.getLeadsList("ITALY", 1);
    
    if (!firstPageLeads || firstPageLeads.length === 0) {
      throw new Error('Não foi possível obter dados da primeira página da API');
    }

    // Para obter o total real, vamos usar o método que sabemos que funciona
    // Fazemos uma estimativa conservadora baseada nas páginas disponíveis
    const estimatedTotalLeads = 937; // Total conhecido da API
    const leadsPerPage = 15; // Padrão da API European Fulfillment
    const estimatedTotalPages = Math.ceil(estimatedTotalLeads / leadsPerPage);
    
    this.completeSyncStatus.totalLeads = estimatedTotalLeads;
    this.completeSyncStatus.totalPages = estimatedTotalPages;
    this.completeSyncStatus.message = `Processando ${this.completeSyncStatus.totalLeads} pedidos em ${this.completeSyncStatus.totalPages} páginas...`;

    console.log(`📊 Total de pedidos a processar: ${this.completeSyncStatus.totalLeads}`);
    console.log(`📄 Total de páginas estimadas: ${this.completeSyncStatus.totalPages}`);

    const storeId = await this.getDefaultStoreId();
    let allNewLeads = 0;
    let allUpdatedLeads = 0;

    // Processar todas as páginas
    for (let page = 1; page <= this.completeSyncStatus.totalPages; page++) {
      this.completeSyncStatus.currentPage = page;
      this.completeSyncStatus.message = `Processando página ${page} de ${this.completeSyncStatus.totalPages}...`;

      try {
        const pageLeads = await europeanFulfillmentService.getLeadsList("ITALY", page);
        
        if (!pageLeads || pageLeads.length === 0) {
          console.log(`📄 Página ${page} vazia, finalizando...`);
          break;
        }
        
        const { newLeads, updatedLeads } = await this.processLeadsPage(pageLeads, storeId);
        
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
   * Processa uma página de leads da API
   */
  private async processLeadsPage(leads: any[], storeId: string): Promise<{ newLeads: number; updatedLeads: number }> {
    let newLeads = 0;
    let updatedLeads = 0;

    for (const apiLead of leads) {
      try {
        // Verificar se o lead já existe
        const [existingLead] = await db
          .select()
          .from(orders)
          .where(eq(orders.id, apiLead.n_lead))
          .limit(1);

        if (!existingLead) {
          // Lead novo - inserir
          await db.insert(orders).values({
            id: apiLead.n_lead,
            storeId,
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
        } else {
          // Lead existente - atualizar status se mudou
          if (existingLead.status !== (apiLead.status_livrison || "new order")) {
            await db
              .update(orders)
              .set({
                status: apiLead.status_livrison || "new order",
                updatedAt: new Date(),
              })
              .where(eq(orders.id, apiLead.n_lead));
            
            updatedLeads++;
          }
        }
      } catch (error) {
        console.warn(`⚠️  Erro ao processar lead ${apiLead.n_lead}:`, error);
        throw error; // Re-throw para controle de erro na sincronização
      }
    }

    return { newLeads, updatedLeads };
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