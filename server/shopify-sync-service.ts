import { db } from './db';
import { orders, operations } from '../shared/schema';
import { eq, and, isNull } from 'drizzle-orm';
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
    
    // Busca integração Shopify
    console.log(`🔍 Buscando integração Shopify para operação: ${operationId}`);
    const integration = await shopifyService.getIntegration(operationId);
    console.log(`🔍 Integração encontrada:`, integration ? 'SIM' : 'NÃO');
    if (!integration) {
      throw new Error(`Integração Shopify não encontrada para operação ${operationId}`);
    }
    
    // Busca TODOS os pedidos do Shopify usando paginação baseada em created_at
    let imported = 0;
    let updated = 0;
    let currentDate = new Date();
    let hasMorePages = true;
    let pageCount = 0;
    
    console.log(`🔄 Iniciando importação completa de TODOS os pedidos históricos do Shopify...`);
    
    // Buscar pedidos mais antigos primeiro, trabalhando para frente
    // Começar de 2 anos atrás para garantir histórico completo
    let startDate = new Date(currentDate.getTime() - (2 * 365 * 24 * 60 * 60 * 1000));
    
    while (hasMorePages) {
      pageCount++;
      
      // Buscar pedidos em janelas de 30 dias para evitar limitações
      let endDate = new Date(startDate.getTime() + (30 * 24 * 60 * 60 * 1000));
      if (endDate > currentDate) {
        endDate = currentDate;
      }
      
      console.log(`📄 Página ${pageCount}: Buscando pedidos de ${startDate.toISOString().split('T')[0]} até ${endDate.toISOString().split('T')[0]}`);
      
      const ordersResult = await shopifyService.getOrders(integration.shopName, integration.accessToken, {
        limit: 250,
        status: 'any',
        created_at_min: startDate.toISOString(),
        created_at_max: endDate.toISOString()
      });
      
      if (!ordersResult.success || !ordersResult.orders) {
        console.error(`❌ Erro ao buscar pedidos da página ${pageCount}: ${ordersResult.error}`);
        break;
      }
      
      const orders = ordersResult.orders;
      console.log(`📦 Encontrados ${orders.length} pedidos no período`);
      
      for (const shopifyOrder of orders) {
        try {
          const result = await this.processShopifyOrder(operationId, shopifyOrder);
          if (result.created) {
            imported++;
            if (imported % 50 === 0) {
              console.log(`📈 Progresso: ${imported} novos pedidos importados...`);
            }
          } else {
            updated++;
          }
        } catch (error) {
          console.error(`❌ Erro ao processar pedido ${shopifyOrder.name}:`, error);
        }
      }
      
      // Avançar para o próximo período
      startDate = new Date(endDate.getTime() + 1); // +1ms para evitar duplicatas
      
      // Se chegamos até a data atual, parar
      if (startDate >= currentDate) {
        hasMorePages = false;
        console.log(`✅ Chegamos à data atual - importação histórica completa`);
      }
      
      // Limite de segurança para evitar loops infinitos
      if (pageCount > 50) {
        console.log(`⚠️ Limite de 50 páginas atingido - parando por segurança`);
        hasMorePages = false;
      }
    }
    
    console.log(`📦 Importação Shopify concluída: ${imported} novos, ${updated} atualizados`);
    return { imported, updated };
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
    
    // Verifica se o pedido já existe (por Shopify Order ID E operação)
    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.shopifyOrderId, shopifyOrder.id.toString()),
          eq(orders.operationId, operationId)
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
      
      // Informações financeiras
      total: shopifyOrder.total_price,
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
    
    if (existingOrder) {
      // Atualiza pedido existente
      await db
        .update(orders)
        .set(orderData)
        .where(eq(orders.id, existingOrder.id));
      
      console.log(`🔄 Pedido Shopify atualizado: ${shopifyOrder.name}`);
      return { created: false };
    } else {
      // Cria novo pedido
      await db
        .insert(orders)
        .values({
          id: `shopify_${shopifyOrder.id}`, // ID único baseado no Shopify
          ...orderData,
        });
      
      console.log(`✅ Novo pedido Shopify importado: ${shopifyOrder.name}`);
      return { created: true };
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
    
    // Se não há matches potenciais, as bases podem ser de períodos diferentes
    if (potentialMatches === 0 && unmatchedOrders.length > 0 && carrierLeads.length > 0) {
      console.log(`⚠️ ANÁLISE: Sem matches potenciais encontrados`);
      console.log(`   Isso pode indicar que:`);
      console.log(`   1. Os pedidos Shopify são de período diferente dos leads da transportadora`);
      console.log(`   2. Nem todos os pedidos Shopify passam pela European Fulfillment`);
      console.log(`   3. Há diferença temporal entre quando foi criado no Shopify vs transportadora`);
      
      // Mostra alguns telefones de cada lado para comparação manual
      const shopifyPhones = unmatchedOrders.slice(0, 5).map(o => this.normalizePhone(o.customerPhone || ''));
      const carrierPhones = carrierLeads.slice(0, 5).map(l => this.normalizePhone(l.phone || ''));
      console.log(`   📱 Primeiros 5 telefones Shopify normalizados:`, shopifyPhones);
      console.log(`   📞 Primeiros 5 telefones Transportadora normalizados:`, carrierPhones);
    }
    
    // Agora aplica os matches de verdade
    for (const order of unmatchedOrders) {
      // Debug específico do matching nos primeiros
      if (matched < 5) {
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
        console.log(`✅ Match encontrado! Shopify: ${order.customerName} (${order.customerPhone}) ↔ Transportadora: ${matchedLead.name} (${matchedLead.phone})`);
      } else if (matched < 5) {
        console.log(`❌ Sem match para: ${order.customerName} (${order.customerPhone} → ${this.normalizePhone(order.customerPhone || '')})`);
      }
      
      if (matchedLead) {
        // Atualiza o pedido com dados da transportadora
        await db
          .update(orders)
          .set({
            carrierImported: true,
            carrierMatchedAt: new Date(),
            carrierOrderId: matchedLead.n_lead || matchedLead.id,
            trackingNumber: matchedLead.tracking_number || matchedLead.tracking,
            status: this.mapCarrierStatus(matchedLead.status_livrison || matchedLead.status),
            providerData: matchedLead,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));
        
        matched++;
      }
    }
    
    console.log(`🔗 Match concluído: ${matched} pedidos matched`);
    
    // Análise detalhada dos matches
    const totalShopifyOrders = unmatchedOrders.length;
    const totalCarrierLeads = carrierLeads.length;
    const matchRate = ((matched / totalShopifyOrders) * 100).toFixed(1);
    
    console.log(`📊 Análise de Match:`);
    console.log(`   Pedidos Shopify: ${totalShopifyOrders}`);
    console.log(`   Leads Transportadora: ${totalCarrierLeads}`);
    console.log(`   Matches encontrados: ${matched} (${matchRate}%)`);
    console.log(`   Sem match: ${totalShopifyOrders - matched} pedidos`);
    
    // Amostra de pedidos sem telefone
    const ordersWithoutPhone = unmatchedOrders.filter(order => !order.customerPhone);
    console.log(`   📱 Pedidos sem telefone: ${ordersWithoutPhone.length}`);
    
    if (ordersWithoutPhone.length > 0) {
      console.log(`   Exemplos sem telefone:`, ordersWithoutPhone.slice(0, 3).map(o => ({
        name: o.customerName,
        phone: o.customerPhone || 'SEM TELEFONE'
      })));
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