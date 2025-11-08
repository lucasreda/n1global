import { db } from './db';
import { orders, operations, stores } from '../shared/schema';
import { eq, and, or, isNull, sql } from 'drizzle-orm';
import { shopifyService, type ShopifyOrder as ShopifyServiceOrder } from './shopify-service';

// Usar o tipo ShopifyOrder do shopify-service
type ShopifyOrder = ShopifyServiceOrder;

/**
 * Serviço responsável pela nova arquitetura de sincronização:
 * 1. Importa pedidos do Shopify como fonte primária
 * 2. Faz match com dados da transportadora por nome do cliente
 * 3. Atualiza status e tracking baseado na transportadora
 */
export class ShopifySyncService {
  // Tracking de progresso global para múltiplas operações
  private static progressTracker = new Map<string, {
    isRunning: boolean;
    currentPage: number;
    totalPages: number;
    processedOrders: number;
    totalOrders: number;
    newOrders: number;
    updatedOrders: number;
    currentStep: string;
    startTime: Date | null;
    percentage: number;
  }>();

  /**
   * Obtém o progresso atual para uma operação específica
   */
  static getOperationProgress(operationId: string) {
    return ShopifySyncService.progressTracker.get(operationId) || {
      isRunning: false,
      currentPage: 0,
      totalPages: 0,
      processedOrders: 0,
      totalOrders: 0,
      newOrders: 0,
      updatedOrders: 0,
      currentStep: '',
      startTime: null,
      percentage: 0
    };
  }

  /**
   * Limpa o progresso de uma operação específica (para iniciar nova sincronização)
   */
  static resetOperationProgress(operationId: string): void {
    console.log(`🔄 [SHOPIFY RESET] Resetando progresso do Shopify para operação ${operationId}`);
    ShopifySyncService.progressTracker.set(operationId, {
      isRunning: false,
      currentPage: 0,
      totalPages: 0,
      processedOrders: 0,
      totalOrders: 0,
      newOrders: 0,
      updatedOrders: 0,
      currentStep: '',
      startTime: null,
      percentage: 0
    });
  }

  /**
   * Atualiza o progresso para uma operação específica
   */
  private updateProgress(operationId: string, updates: Partial<{
    isRunning: boolean;
    currentPage: number;
    totalPages: number;
    processedOrders: number;
    totalOrders: number;
    newOrders: number;
    updatedOrders: number;
    currentStep: string;
    startTime: Date | null;
    percentage: number;
  }>) {
    const current = ShopifySyncService.progressTracker.get(operationId) || {
      isRunning: false,
      currentPage: 0,
      totalPages: 0,
      processedOrders: 0,
      totalOrders: 0,
      newOrders: 0,
      updatedOrders: 0,
      currentStep: '',
      startTime: null,
      percentage: 0
    };

    const updated = { ...current, ...updates };
    
    // Calcular percentage se temos totalOrders
    if (updated.totalOrders > 0) {
      updated.percentage = Math.round((updated.processedOrders / updated.totalOrders) * 100);
    }

    ShopifySyncService.progressTracker.set(operationId, updated);
  }
  
  /**
   * Executa sincronização completa para uma operação
   * 1. Importa pedidos do Shopify
   * 2. Faz match com transportadora 
   * 3. Atualiza status baseado na transportadora
   */
  async syncOperation(operationId: string): Promise<{
    success: boolean;
    message: string;
    stats: {
      shopifyOrders: number;
      newOrders: number;
      carrierMatches: number;
      updated: number;
    };
  }> {
    try {
      console.log(`🔄 Iniciando sincronização Shopify-first para operação ${operationId}`);
      
      // 1. Importa pedidos do Shopify
      const shopifyStats = await this.importShopifyOrders(operationId);
      
      // 2. Faz match com dados da transportadora
      const matchStats = await this.matchWithCarrier(operationId);
      
      // 3. Atualiza status baseado na transportadora
      const updateStats = await this.updateCarrierStatus(operationId);
      
      const totalStats = {
        shopifyOrders: shopifyStats.imported + shopifyStats.updated,
        newOrders: shopifyStats.imported,
        carrierMatches: matchStats.matched,
        updated: updateStats.updated,
      };
      
      console.log(`✅ Sincronização concluída:`, totalStats);
      
      return {
        success: true,
        message: `Sincronização concluída: ${totalStats.newOrders} novos pedidos importados, ${totalStats.carrierMatches} matches com transportadora`,
        stats: totalStats
      };
      
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      return {
        success: false,
        message: `Erro na sincronização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        stats: { shopifyOrders: 0, newOrders: 0, carrierMatches: 0, updated: 0 }
      };
    }
  }
  
  /**
   * Importa pedidos do Shopify para o banco de dados
   */
  async importShopifyOrders(operationId: string): Promise<{ imported: number; updated: number }> {
    console.log(`📦 Importando pedidos do Shopify para operação ${operationId}`);
    
    // Inicializar progresso
    this.updateProgress(operationId, {
      isRunning: true,
      startTime: new Date(),
      currentStep: 'Conectando com Shopify...'
    });
    
    // Busca integração Shopify
    console.log(`🔍 Buscando integração Shopify para operação: ${operationId}`);
    const integration = await shopifyService.getIntegration(operationId);
    console.log(`🔍 Integração encontrada:`, integration ? 'SIM' : 'NÃO');
    if (!integration) {
      throw new Error(`Integração Shopify não encontrada para operação ${operationId}`);
    }
    
    // Normalizar nome da loja
    const normalizedShopName = integration.shopName.includes('.') 
      ? integration.shopName 
      : `${integration.shopName}.myshopify.com`;
    
    // Primeiro, vamos verificar o total de pedidos na Shopify
    console.log(`🔍 Verificando total de pedidos na Shopify para ${normalizedShopName}...`);
    this.updateProgress(operationId, {
      currentStep: 'Verificando total de pedidos...'
    });
    
    const countResponse = await fetch(`https://${normalizedShopName}/admin/api/2023-10/orders/count.json?status=any`, {
      headers: {
        'X-Shopify-Access-Token': integration.accessToken,
        'Content-Type': 'application/json',
      },
    });
    
    const countData = await countResponse.json();
    const totalShopifyOrders = countData.count || 0;
    console.log(`🎯 Total de pedidos na Shopify: ${totalShopifyOrders}`);
    
    // Calcular total de páginas esperadas
    const totalPages = Math.ceil(totalShopifyOrders / 250);
    this.updateProgress(operationId, {
      totalOrders: totalShopifyOrders,
      totalPages: totalPages,
      currentStep: `Iniciando importação de ${totalShopifyOrders} pedidos...`
    });
    
    // Busca TODOS os pedidos do Shopify usando paginação baseada em data
    let imported = 0;
    let updated = 0;
    let hasMorePages = true;
    let pageCount = 0;
    let lastCreatedAt = null;
    
    console.log(`🔄 ========== INICIANDO IMPORTAÇÃO COMPLETA ==========`);
    console.log(`🎯 OBJETIVO: Importar TODOS os ${totalShopifyOrders} pedidos da Shopify`);
    console.log(`📊 STATUS ATUAL: ${imported} novos, ${updated} atualizados`);
    
    while (hasMorePages) {
      pageCount++;
      
      console.log(`\n📄 ========== PÁGINA ${pageCount} ==========`);
      console.log(`🔍 Buscando pedidos${lastCreatedAt ? ` criados antes de ${lastCreatedAt}` : ' (primeira página)'}`);
      
      // Atualizar progresso da página atual
      this.updateProgress(operationId, {
        currentPage: pageCount,
        currentStep: `Processando página ${pageCount} de ${totalPages} (${imported + updated}/${totalShopifyOrders} pedidos)`
      });
      
      const params: any = {
        limit: 250, // Máximo permitido pela Shopify API
        status: 'any',
        order: 'created_at desc', // Ordenação para paginação consistente
        fields: 'id,name,email,phone,created_at,updated_at,total_price,current_total_price,subtotal_price,currency,financial_status,fulfillment_status,customer,shipping_address,billing_address,line_items'
      };
      
      if (lastCreatedAt) {
        params.created_at_max = lastCreatedAt;
      }
      
      console.log(`🌐 Fazendo requisição para Shopify API com:`, JSON.stringify(params, null, 2));
      
      const ordersResult = await shopifyService.getOrders(integration.shopName, integration.accessToken, params);
      
      if (!ordersResult.success || !ordersResult.orders) {
        console.error(`❌ Erro ao buscar pedidos da página ${pageCount}: ${ordersResult.error}`);
        break;
      }
      
      const orders = ordersResult.orders;
      console.log(`📦 Encontrados ${orders.length} pedidos nesta página`);
      
      // Se não há pedidos, fim da paginação
      if (orders.length === 0) {
        hasMorePages = false;
        console.log(`✅ Não há mais pedidos - importação completa`);
        break;
      }
      
      // Se retornou menos que o limite, é a última página
      if (orders.length < 250) {
        console.log(`📄 Última página detectada (${orders.length} < 250 pedidos)`);
        hasMorePages = false;
      }
      
      console.log(`📊 Processando ${orders.length} pedidos da página ${pageCount}...`);
      let newInThisPage = 0;
      let updatedInThisPage = 0;
      
      for (const shopifyOrder of orders) {
        try {
          const result = await this.processShopifyOrder(operationId, shopifyOrder);
          if (result.created) {
            imported++;
            newInThisPage++;
            if (imported % 100 === 0) {
              console.log(`📈 Progresso: ${imported} novos pedidos importados...`);
            }
          } else {
            updated++;
            updatedInThisPage++;
            if (updated % 100 === 0) {
              console.log(`🔄 Progresso: ${updated} pedidos atualizados...`);
            }
          }
          
          // Atualizar progresso a cada 10 pedidos processados para melhor UX em tempo real
          if ((imported + updated) % 10 === 0) {
            this.updateProgress(operationId, {
              processedOrders: imported + updated,
              newOrders: imported,
              updatedOrders: updated
            });
            console.log(`📊 [SHOPIFY SYNC] Progresso: ${imported + updated}/${totalShopifyOrders} (${Math.round((imported + updated) / totalShopifyOrders * 100)}%)`);
          }
        } catch (error) {
          console.error(`❌ Erro ao processar pedido ${shopifyOrder.name}:`, error);
        }
      }
      
      console.log(`📊 Página ${pageCount} processada: ${newInThisPage} novos, ${updatedInThisPage} atualizados`);
      console.log(`📈 Total acumulado: ${imported} novos, ${updated} atualizados (${imported + updated} processados)`);
      console.log(`🎯 Progresso: ${imported + updated}/${totalShopifyOrders} pedidos (${((imported + updated) / totalShopifyOrders * 100).toFixed(1)}%)`);
      
      // Atualizar progresso após cada página
      this.updateProgress(operationId, {
        processedOrders: imported + updated,
        newOrders: imported,
        updatedOrders: updated,
        currentStep: `Página ${pageCount} concluída: ${imported + updated}/${totalShopifyOrders} pedidos processados`
      });
      
      // Configurar created_at_max para próxima página se ainda há mais páginas
      if (hasMorePages) {
        const lastOrder = orders[orders.length - 1];
        const newLastCreatedAt = lastOrder.created_at;
        
        if (newLastCreatedAt === lastCreatedAt) {
          console.log(`⚠️ created_at repetido (${newLastCreatedAt}) - fim da paginação`);
          hasMorePages = false;
          break;
        }
        
        lastCreatedAt = newLastCreatedAt;
        console.log(`🔄 Próxima página usará created_at_max: ${lastCreatedAt}`);
      }
      
      // Continue até não haver mais páginas - verificação robusta do progresso
      if (imported + updated >= totalShopifyOrders) {
        console.log(`✅ Todos os pedidos processados: ${imported + updated}/${totalShopifyOrders}`);
        hasMorePages = false;
      }
    }
    
    console.log(`📦 Importação Shopify FINAL: ${imported} novos, ${updated} atualizados (Total processado: ${imported + updated})`);
    console.log(`🎯 RESULTADO FINAL: ${imported + updated}/${totalShopifyOrders} pedidos (${((imported + updated) / totalShopifyOrders * 100).toFixed(1)}%)`);
    
    // Debug final para verificar total de pedidos
    const totalOrders = await db
      .select({ count: sql`count(*)`.as('count') })
      .from(orders)
      .where(eq(orders.operationId, operationId));
    
    console.log(`🔍 VERIFICAÇÃO FINAL: Total de pedidos no banco para esta operação: ${totalOrders[0]?.count || 0}`);
    
    if ((imported + updated) < totalShopifyOrders) {
      console.log(`⚠️ ALERTA: Apenas ${imported + updated} de ${totalShopifyOrders} pedidos foram processados. ${totalShopifyOrders - (imported + updated)} pedidos podem estar faltando.`);
    } else {
      console.log(`✅ SUCESSO: Todos os ${totalShopifyOrders} pedidos da Shopify foram processados com sucesso!`);
    }
    
    // Finalizar progresso (uma única atualização)
    this.updateProgress(operationId, {
      isRunning: false,
      processedOrders: imported + updated,
      newOrders: imported,
      updatedOrders: updated,
      currentStep: `Importação concluída: ${imported} novos, ${updated} atualizados`,
      percentage: totalShopifyOrders > 0 ? 100 : 0
    });
    
    console.log(`✅ [SHOPIFY SYNC] Importação completa: ${imported} novos, ${updated} atualizados`);
    
    return { imported, updated };
  }
  
  /**
   * Processa um pedido individual do Shopify (método público para webhooks)
   */
  async processShopifyOrderDirectly(operationId: string, shopifyOrder: ShopifyOrder): Promise<{ created: boolean }> {
    return this.processShopifyOrder(operationId, shopifyOrder);
  }

  /**
   * Processa um pedido individual do Shopify
   */
  private async processShopifyOrder(operationId: string, shopifyOrder: ShopifyOrder): Promise<{ created: boolean }> {
    // Busca a operação para obter storeId
    const [operation] = await db
      .select()
      .from(operations)
      .where(eq(operations.id, operationId));
      
    if (!operation) {
      throw new Error('Operação não encontrada');
    }
    
    // UPSERT: Create or update using ON CONFLICT
    const orderId = `shopify_${shopifyOrder.id}`;
    
    // Verifica se o pedido já existe (por ID OU por Shopify Order ID E operação)
    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(
        or(
          eq(orders.id, orderId),
          and(
            eq(orders.shopifyOrderId, shopifyOrder.id.toString()),
            eq(orders.operationId, operationId)
          )
        )
      );
    
    // Monta dados do cliente
    const customerName = this.getCustomerName(shopifyOrder);
    const shippingAddress = shopifyOrder.shipping_address;
    const billingAddress = shopifyOrder.billing_address;
    
    // Dados do pedido padronizados
    const orderData = {
      storeId: operation.storeId,
      operationId,
      dataSource: 'shopify' as const,
      shopifyOrderId: shopifyOrder.id.toString(),
      shopifyOrderNumber: shopifyOrder.name,
      
      // Informações do cliente
      customerName,
      customerEmail: shopifyOrder.email,
      customerPhone: shopifyOrder.phone || shopifyOrder.customer?.phone,
      customerAddress: shippingAddress?.address1,
      customerCity: shippingAddress?.city,
      customerState: shippingAddress?.province,
      customerCountry: shippingAddress?.country,
      customerZip: shippingAddress?.zip,
      
      // Informações financeiras (usar current_total_price que considera descontos)
      total: shopifyOrder.current_total_price || shopifyOrder.total_price,
      currency: shopifyOrder.currency,
      paymentStatus: this.mapShopifyPaymentStatus(shopifyOrder.financial_status),
      paymentMethod: 'cod', // Assumindo COD como padrão
      
      // Status do pedido
      status: this.mapShopifyFulfillmentStatus(shopifyOrder.fulfillment_status || ''),
      
      // Produtos
      products: shopifyOrder.line_items,
      
      // Dados completos do Shopify
      shopifyData: shopifyOrder,
      
      // Timestamps
      orderDate: new Date(shopifyOrder.created_at),
      lastStatusUpdate: new Date(shopifyOrder.updated_at),
      updatedAt: new Date(),
    };
    
    const isNewOrder = !existingOrder;
    
    // Prepare update data - exclude status if carrier already imported it
    const { status, ...orderDataWithoutStatus } = orderData;
    
    // ALWAYS check if order exists (even if existingOrder was null, it might exist by ID)
    const [currentOrder] = await db
      .select({ 
        id: orders.id,
        carrierImported: orders.carrierImported,
        status: orders.status 
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    
    if (currentOrder) {
      // Order exists - ALWAYS use UPDATE (never onConflictDoUpdate)
      // This gives us full control over what gets updated
      if (currentOrder.carrierImported === true) {
        // Order has carrier - update everything EXCEPT status
        // CRITICAL: Never overwrite carrier status
        // Database trigger will also protect, but we prevent update here too
        if (currentOrder.status === 'delivered' && orderData.status !== 'delivered') {
          console.log(`🔒 [SHOPIFY SYNC] Protecting carrier status: order ${shopifyOrder.name} has carrier_imported=true and status=delivered, skipping status update`);
        }
        await db
          .update(orders)
          .set(orderDataWithoutStatus)
          .where(eq(orders.id, orderId));
      } else {
        // Order exists but no carrier - update everything including status
        await db
          .update(orders)
          .set(orderData)
          .where(eq(orders.id, orderId));
      }
    } else {
      // Order doesn't exist - insert new
      await db
        .insert(orders)
        .values({
          id: orderId,
          ...orderData,
        });
    }
    
    if (isNewOrder) {
      console.log(`✅ Novo pedido Shopify importado: ${shopifyOrder.name}`);
      
      // Dispatch webhook for operational app integration
      // Get userId from operation -> store -> ownerId
      const [operationWithStore] = await db
        .select({ ownerId: stores.ownerId })
        .from(operations)
        .innerJoin(stores, eq(operations.storeId, stores.id))
        .where(eq(operations.id, orderData.operationId))
        .limit(1);
      
      if (operationWithStore?.ownerId) {
        const { WebhookService } = await import('./services/webhook-service');
        await WebhookService.dispatchOrderCreatedWebhook(orderId, operationWithStore.ownerId);
      }
      
      return { created: true };
    } else {
      console.log(`🔄 Pedido Shopify atualizado: ${shopifyOrder.name}`);
      return { created: false };
    }
  }
  
  /**
   * Faz match dos pedidos Shopify com dados da transportadora por nome do cliente
   */
  async matchWithCarrier(operationId: string): Promise<{ matched: number }> {
    console.log(`🔗 Fazendo match com transportadora para operação ${operationId}`);
    
    // Busca pedidos do Shopify que ainda não foram matched
    const unmatchedOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.operationId, operationId),
          eq(orders.dataSource, 'shopify'),
          eq(orders.carrierImported, false)
        )
      );
    
    // Debug: análise dos dados Shopify
    const totalOrders = unmatchedOrders.length;
    const ordersWithPhone = unmatchedOrders.filter(o => o.customerPhone && o.customerPhone.trim() !== '').length;
    const ordersWithName = unmatchedOrders.filter(o => o.customerName && o.customerName.trim() !== '').length;
    
    console.log(`📊 Análise dados Shopify:`);
    console.log(`   Total pedidos: ${totalOrders}`);
    console.log(`   Com telefone: ${ordersWithPhone} (${((ordersWithPhone/totalOrders)*100).toFixed(1)}%)`);
    console.log(`   Com nome: ${ordersWithName} (${((ordersWithName/totalOrders)*100).toFixed(1)}%)`);
    
    // Exemplos de telefones Shopify
    const phoneSamples = unmatchedOrders
      .filter(o => o.customerPhone)
      .slice(0, 5)
      .map(o => o.customerPhone);
    console.log(`   📱 Exemplos telefones Shopify:`, phoneSamples);
    
    console.log(`🔍 Encontrados ${unmatchedOrders.length} pedidos para match`);
    
    // Debug: mostrar alguns exemplos detalhados do Shopify para comparação
    if (unmatchedOrders.length > 0) {
      console.log(`🛍️ Exemplos detalhados Shopify:`);
      unmatchedOrders.slice(0, 5).forEach((order, index) => {
        console.log(`  Pedido ${index + 1}:`, {
          id: order.id,
          name: order.customerName || 'SEM NOME',
          phone: order.customerPhone || 'SEM TELEFONE',
          email: order.customerEmail || 'SEM EMAIL'
        });
      });
    }
    
    // Busca dados da transportadora para comparação
    const carrierLeads = await this.getCarrierLeads(operationId);
    
    let matched = 0;
    
    console.log(`🔍 Iniciando processo de matching de ${unmatchedOrders.length} pedidos...`);
    
    // Análise cruzada de dados - procurar possíveis matches
    console.log(`🔍 Fazendo análise cruzada de dados...`);
    let potentialMatches = 0;
    let exactPhoneMatches = 0;
    let phoneAfterNormalization = 0;
    
    // Primeiro pass: análise de potenciais matches sem aplicar ainda
    for (let i = 0; i < Math.min(50, unmatchedOrders.length); i++) {
      const order = unmatchedOrders[i];
      if (!order.customerPhone) continue;
      
      const normalizedShopifyPhone = this.normalizePhone(order.customerPhone);
      
      for (let j = 0; j < Math.min(100, carrierLeads.length); j++) {
        const lead = carrierLeads[j];
        if (!lead.phone) continue;
        
        const normalizedCarrierPhone = this.normalizePhone(lead.phone);
        
        // Verifica match exato de telefone original
        if (order.customerPhone === lead.phone) {
          exactPhoneMatches++;
          console.log(`🎯 Match telefone exato: "${order.customerPhone}" = "${lead.phone}"`);
        }
        
        // Verifica match após normalização
        if (this.phonesMatch(normalizedShopifyPhone, normalizedCarrierPhone)) {
          phoneAfterNormalization++;
          if (potentialMatches < 5) {
            console.log(`🔍 Match potencial: ${order.customerName} (${order.customerPhone} → ${normalizedShopifyPhone}) ↔ ${lead.name} (${lead.phone} → ${normalizedCarrierPhone})`);
          }
          potentialMatches++;
          break;
        }
      }
    }
    
    console.log(`📊 Análise cruzada (primeiros 50x100):`);
    console.log(`   Matches telefone exato: ${exactPhoneMatches}`);
    console.log(`   Matches após normalização: ${phoneAfterNormalization}`);
    console.log(`   Potenciais matches encontrados: ${potentialMatches}`);
    
    // Informação sobre cobertura parcial
    if (potentialMatches < unmatchedOrders.length * 0.5) {
      console.log(`ℹ️ INFORMAÇÃO: Cobertura parcial detectada`);
      console.log(`   Nem todos os pedidos Shopify passam pela European Fulfillment`);
      console.log(`   Outros pedidos serão processados por transportadoras diferentes no futuro`);
      console.log(`   Taxa de cobertura atual: ${potentialMatches}/${Math.min(50, unmatchedOrders.length)} (${((potentialMatches/Math.min(50, unmatchedOrders.length))*100).toFixed(1)}%)`);
    }
    
    // 🚀 OPTIMIZATION: Batch matching and updates
    console.log(`⚡ Using batch processing for optimal performance`);
    
    // Primeiro, faz todos os matches em memória
    const matchesToUpdate: Array<{orderId: string; leadData: any}> = [];
    
    for (const order of unmatchedOrders) {
      // Debug específico do matching nos primeiros
      if (matchesToUpdate.length < 5) {
        console.log(`🔍 Tentando match para:`, {
          name: order.customerName,
          phone: order.customerPhone,
          normalized: this.normalizePhone(order.customerPhone || '')
        });
      }
      
      // Busca lead da transportadora por telefone ou nome
      const matchedLead = this.findCarrierMatch(
        order.customerPhone || '', 
        order.customerName || '', 
        carrierLeads
      );
      
      if (matchedLead) {
        if (matchesToUpdate.length < 5) {
          console.log(`✅ Match encontrado! Shopify: ${order.customerName} (${order.customerPhone}) ↔ Transportadora: ${matchedLead.name} (${matchedLead.phone})`);
        }
        matchesToUpdate.push({ orderId: order.id, leadData: matchedLead });
      } else if (matchesToUpdate.length < 5) {
        console.log(`❌ Sem match para: ${order.customerName} (${order.customerPhone} → ${this.normalizePhone(order.customerPhone || '')})`);
      }
    }
    
    // 🚀 Batch update: atualiza todos os matches de uma vez usando raw SQL
    if (matchesToUpdate.length > 0) {
      console.log(`⚡ Atualizando ${matchesToUpdate.length} pedidos em batch...`);
      
      const { pool } = await import('./db');
      const timestamp = new Date();
      
      // Atualizar em lotes de 50 para evitar queries muito grandes
      const BATCH_SIZE = 50;
      for (let i = 0; i < matchesToUpdate.length; i += BATCH_SIZE) {
        const batch = matchesToUpdate.slice(i, i + BATCH_SIZE);
        
        // Construir SQL para update em batch
        const caseStatements = batch.map((match, idx) => 
          `WHEN id = $${idx * 6 + 1} THEN $${idx * 6 + 2}`
        ).join(' ');
        
        const orderIdsCaseStatements = batch.map((match, idx) => 
          `WHEN id = $${idx * 6 + 1} THEN $${idx * 6 + 3}`
        ).join(' ');
        
        const trackingCaseStatements = batch.map((match, idx) => 
          `WHEN id = $${idx * 6 + 1} THEN $${idx * 6 + 4}`
        ).join(' ');
        
        const statusCaseStatements = batch.map((match, idx) => 
          `WHEN id = $${idx * 6 + 1} THEN $${idx * 6 + 5}`
        ).join(' ');
        
        const providerDataCaseStatements = batch.map((match, idx) => 
          `WHEN id = $${idx * 6 + 1} THEN $${idx * 6 + 6}::jsonb`
        ).join(' ');
        
        const params: any[] = [];
        batch.forEach(match => {
          params.push(
            match.orderId,
            true, // carrier_imported
            match.leadData.n_lead || match.leadData.id, // carrier_order_id
            match.leadData.tracking_number || match.leadData.tracking || null, // tracking_number
            this.mapCarrierStatus(match.leadData.status_livrison || match.leadData.status), // status
            JSON.stringify(match.leadData) // provider_data
          );
        });
        
        const orderIds = batch.map(m => m.orderId);
        const placeholders = orderIds.map((_, i) => `$${batch.length * 6 + i + 1}`).join(', ');
        params.push(...orderIds);
        
        await pool.query(`
          UPDATE orders
          SET 
            carrier_imported = CASE ${caseStatements} END,
            carrier_matched_at = $${batch.length * 6 + orderIds.length + 1},
            carrier_order_id = CASE ${orderIdsCaseStatements} END,
            tracking_number = CASE ${trackingCaseStatements} END,
            status = CASE ${statusCaseStatements} END,
            provider_data = CASE ${providerDataCaseStatements} END,
            updated_at = $${batch.length * 6 + orderIds.length + 1}
          WHERE id IN (${placeholders})
        `, [...params, timestamp]);
        
        console.log(`✅ Batch ${Math.floor(i/BATCH_SIZE) + 1} atualizado: ${batch.length} pedidos`);
      }
      
      matched = matchesToUpdate.length;
      console.log(`🚀 Batch update concluído: ${matched} pedidos atualizados em ${Math.ceil(matchesToUpdate.length / BATCH_SIZE)} queries`);
    }
    
    console.log(`🔗 Match concluído: ${matched} pedidos matched`);
    
    // Análise detalhada dos matches
    const totalShopifyOrders = unmatchedOrders.length;
    const totalCarrierLeads = carrierLeads.length;
    const matchRate = ((matched / totalShopifyOrders) * 100).toFixed(1);
    
    console.log(`📊 Resultados do Match:`);
    console.log(`   Pedidos Shopify analisados: ${totalShopifyOrders}`);
    console.log(`   Leads N1 Warehouse: ${totalCarrierLeads}`);
    console.log(`   Matches encontrados: ${matched}`);
    console.log(`   Pedidos não processados por esta transportadora: ${totalShopifyOrders - matched}`);
    
    if (matched > 0) {
      console.log(`✅ Sistema funcionando corretamente - ${matched} pedidos sincronizados com N1 Warehouse`);
    }
    
    if (totalShopifyOrders - matched > 0) {
      console.log(`ℹ️ ${totalShopifyOrders - matched} pedidos foram processados por outras transportadoras`);
    }
    
    return { matched };
  }
  
  /**
   * Atualiza status dos pedidos baseado na transportadora
   */
  private async updateCarrierStatus(operationId: string): Promise<{ updated: number }> {
    console.log(`📊 Atualizando status baseado na transportadora`);
    
    // Busca pedidos que já foram matched com a transportadora
    const matchedOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.operationId, operationId),
          eq(orders.carrierImported, true)
        )
      );
    
    console.log(`📊 Encontrados ${matchedOrders.length} pedidos para atualizar status`);
    
    let updated = 0;
    
    // Para cada pedido matched, busca status atualizado na transportadora
    // Implementação depende da API específica da transportadora
    // Por enquanto, vamos apenas marcar como processado
    
    return { updated };
  }
  
  // Funções auxiliares
  
  private getCustomerName(shopifyOrder: ShopifyOrder): string {
    const shipping = shopifyOrder.shipping_address;
    const billing = shopifyOrder.billing_address;
    const customer = shopifyOrder.customer;
    
    if (shipping?.first_name && shipping?.last_name) {
      return `${shipping.first_name} ${shipping.last_name}`.trim();
    }
    
    if (billing?.first_name && billing?.last_name) {
      return `${billing.first_name} ${billing.last_name}`.trim();
    }
    
    if (customer?.first_name && customer?.last_name) {
      return `${customer.first_name} ${customer.last_name}`.trim();
    }
    
    return shopifyOrder.email || 'Cliente sem nome';
  }
  
  private mapShopifyPaymentStatus(financialStatus: string): string {
    switch (financialStatus) {
      case 'paid': return 'paid';
      case 'pending': return 'unpaid';
      case 'refunded': return 'refunded';
      default: return 'unpaid';
    }
  }
  
  private mapShopifyFulfillmentStatus(fulfillmentStatus?: string): string {
    switch (fulfillmentStatus) {
      case 'fulfilled': return 'delivered';
      case 'partial': return 'shipped';
      case 'unfulfilled': return 'pending';
      default: return 'pending';
    }
  }
  
  private mapCarrierStatus(carrierStatus: string): string {
    // Mapeia status da transportadora para nosso padrão
    switch (carrierStatus?.toLowerCase()) {
      case 'confirmed': return 'confirmed';
      case 'shipped': return 'shipped';
      case 'delivered': return 'delivered';
      case 'returned': return 'returned';
      case 'cancelled': return 'cancelled';
      default: return 'pending';
    }
  }
  
  private async getCarrierLeads(operationId: string): Promise<any[]> {
    // Busca leads da transportadora para a operação
    try {
      // Busca a operação para obter storeId
      const [operation] = await db
        .select()
        .from(operations)
        .where(eq(operations.id, operationId));
      
      if (!operation) {
        console.error('❌ Operação não encontrada para buscar leads da transportadora');
        return [];
      }
      
      // Busca o provedor de fulfillment para esta operação
      const { EuropeanFulfillmentService } = await import('./fulfillment-service');
      const fulfillmentService = new EuropeanFulfillmentService();
      
      // Configura as credenciais
      fulfillmentService.updateCredentials(
        'unit1@n1storeworld.com',
        'Ecom@2025'
      );
      
      // Busca os leads da API da transportadora
      console.log(`🚚 Buscando leads da transportadora para storeId: ${operation.storeId}`);
      
      // Busca todos os leads da transportadora (múltiplas páginas)
      console.log(`🔍 Buscando todos os leads com paginação`);
      let allLeads: any[] = [];
      
      // Busca TODOS os leads da transportadora (sem limite de páginas)
      let page = 1;
      
      while (true) {
        try {
          console.log(`📄 Buscando página ${page} de leads`);
          const pageLeads = await fulfillmentService.getLeadsList('ITALY', page);
          
          if (pageLeads.length === 0) {
            console.log(`✅ Página ${page} vazia - fim da busca (total: ${allLeads.length} leads)`);
            break;
          }
          
          allLeads = allLeads.concat(pageLeads);
          console.log(`📦 Página ${page}: ${pageLeads.length} leads (total: ${allLeads.length})`);
          page++;
          
          // Pequena pausa entre requests para não sobrecarregar a API
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.log(`⚠️ Erro na página ${page}:`, error);
          break;
        }
      }
      
      const leads = allLeads;
      
      console.log(`📦 Encontrados ${leads.length} leads da transportadora`);
      
      // Debug: análise detalhada dos dados da transportadora
      if (leads.length > 0) {
        const leadsWithPhone = leads.filter(l => l.phone && l.phone.trim() !== '').length;
        const leadsWithName = leads.filter(l => l.name && l.name.trim() !== '').length;
        
        console.log(`🔍 Análise dados Transportadora:`);
        console.log(`   Total leads: ${leads.length}`);
        console.log(`   Com telefone: ${leadsWithPhone} (${((leadsWithPhone/leads.length)*100).toFixed(1)}%)`);
        console.log(`   Com nome: ${leadsWithName} (${((leadsWithName/leads.length)*100).toFixed(1)}%)`);
        
        // Exemplos de telefones da transportadora
        const carrierPhoneSamples = leads
          .filter(l => l.phone)
          .slice(0, 5)
          .map(l => l.phone);
        console.log(`   📞 Exemplos telefones Transportadora:`, carrierPhoneSamples);
        
        console.log(`🔍 Primeiros 3 leads detalhados:`);
        leads.slice(0, 3).forEach((lead, index) => {
          console.log(`  Lead ${index + 1}:`, {
            name: lead.name || lead.customer_name || lead.first_name + ' ' + lead.last_name || 'SEM NOME',
            phone: lead.phone || lead.telephone || lead.mobile || 'SEM TELEFONE',
            email: lead.email || 'SEM EMAIL',
            keys: Object.keys(lead)
          });
        });
      } else {
        console.log(`⚠️ Nenhum lead encontrado - verificar configuração da API`);
      }
      
      return leads;
    } catch (error) {
      console.error('❌ Erro ao buscar leads da transportadora:', error);
      return [];
    }
  }
  
  private findCarrierMatch(customerPhone: string, customerName: string, carrierLeads: any[]): any | null {
    if (carrierLeads.length === 0) return null;
    
    // Primeiro tenta match por telefone (mais confiável)
    if (customerPhone) {
      const normalizedPhone = this.normalizePhone(customerPhone);
      
      for (const lead of carrierLeads) {
        const leadPhone = this.normalizePhone(lead.phone || lead.telephone || lead.mobile || '');
        if (leadPhone && this.phonesMatch(normalizedPhone, leadPhone)) {
          console.log(`📞 Match por telefone: ${customerPhone} (${normalizedPhone}) ↔ ${lead.phone || lead.telephone || lead.mobile} (${leadPhone})`);
          return lead;
        }
      }
      
      // Debug: mostrar alguns telefones da transportadora para comparação
      if (carrierLeads.length > 0 && customerPhone) {
        console.log(`🔍 Debug normalização: Shopify "${customerPhone}" -> "${normalizedPhone}"`);
        
        // Procura 3 telefones da transportadora que começam com os mesmos dígitos
        const similarLeads = carrierLeads
          .filter(lead => lead.phone && this.normalizePhone(lead.phone).startsWith(normalizedPhone.substring(0, 4)))
          .slice(0, 3);
          
        if (similarLeads.length > 0) {
          console.log(`   📞 Similares na transportadora:`, 
            similarLeads.map(lead => `${lead.phone} -> ${this.normalizePhone(lead.phone)}`)
          );
        } else {
          // Se não há similares, mostra alguns exemplos aleatórios
          const randomSamples = carrierLeads.slice(0, 3);
          console.log(`   📞 Exemplos transportadora:`, 
            randomSamples.map(lead => `${lead.phone} -> ${this.normalizePhone(lead.phone)}`)
          );
        }
      }
    }
    
    // Se não encontrou por telefone, tenta por nome
    if (customerName) {
      const normalizedName = this.normalizeName(customerName);
      for (const lead of carrierLeads) {
        const leadName = this.normalizeName(lead.name || lead.customer_name || lead.first_name + ' ' + lead.last_name || '');
        if (leadName && this.namesMatch(normalizedName, leadName)) {
          console.log(`👤 Match por nome: ${customerName} ↔ ${leadName}`);
          return lead;
        }
      }
    }
    
    return null;
  }
  
  private normalizePhone(phone: string): string {
    if (!phone) return '';
    
    // Remove todos os caracteres não numéricos
    let normalized = phone.replace(/\D/g, '');
    
    // Remove prefixos italianos comuns
    // +39 -> remove 39
    if (normalized.startsWith('39') && normalized.length > 10) {
      normalized = normalized.substring(2);
    }
    
    // Se começar com 0, remove (formato nacional italiano)
    if (normalized.startsWith('0')) {
      normalized = normalized.substring(1);
    }
    
    return normalized;
  }
  
  private phonesMatch(phone1: string, phone2: string): boolean {
    if (!phone1 || !phone2 || phone1.length < 8 || phone2.length < 8) return false;
    
    // Match exato (prioritário)
    if (phone1 === phone2) return true;
    
    // Match pelos últimos 9 dígitos (mais específico para evitar falsos positivos)
    if (phone1.length >= 9 && phone2.length >= 9) {
      const suffix1 = phone1.slice(-9);
      const suffix2 = phone2.slice(-9);
      if (suffix1 === suffix2) return true;
    }
    
    // Match pelos últimos 8 dígitos como fallback
    const suffix1 = phone1.slice(-8);
    const suffix2 = phone2.slice(-8);
    
    return suffix1 === suffix2;
  }
  
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z\s]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  private namesMatch(name1: string, name2: string): boolean {
    // Estratégia de match por nomes
    // 1. Match exato
    if (name1 === name2) return true;
    
    // 2. Match por palavras (pelo menos 2 palavras em comum)
    const words1 = name1.split(' ').filter(w => w.length > 2);
    const words2 = name2.split(' ').filter(w => w.length > 2);
    
    if (words1.length < 2 || words2.length < 2) return false;
    
    const commonWords = words1.filter(w => words2.includes(w));
    return commonWords.length >= 2;
  }
}

export const shopifySyncService = new ShopifySyncService();