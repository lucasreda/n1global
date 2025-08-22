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
  private async importShopifyOrders(operationId: string): Promise<{ imported: number; updated: number }> {
    console.log(`📦 Importando pedidos do Shopify para operação ${operationId}`);
    
    // Busca integração Shopify
    const integration = await shopifyService.getIntegration(operationId);
    if (!integration) {
      throw new Error('Integração Shopify não encontrada para esta operação');
    }
    
    // Busca TODOS os pedidos do Shopify usando paginação baseada em cursor
    let imported = 0;
    let updated = 0;
    let sinceId: string | undefined = undefined;
    let hasMorePages = true;
    
    console.log(`🔄 Iniciando importação completa de todos os pedidos históricos do Shopify...`);
    
    while (hasMorePages) {
      const ordersResult = await shopifyService.getOrders(integration.shopName, integration.accessToken, {
        limit: 250, // Máximo permitido pelo Shopify
        status: 'any',
        since_id: sinceId
      });
      
      if (!ordersResult.success || !ordersResult.orders) {
        console.error(`❌ Erro ao buscar pedidos: ${ordersResult.error}`);
        break;
      }
      
      const orders = ordersResult.orders;
      
      // Se retornou menos de 250 pedidos, é a última página
      hasMorePages = orders.length === 250;
      
      console.log(`📦 Processando ${orders.length} pedidos (Total importados até agora: ${imported})`);
      
      for (const shopifyOrder of orders) {
        try {
          const result = await this.processShopifyOrder(operationId, shopifyOrder);
          if (result.created) {
            imported++;
            if (imported % 100 === 0) {
              console.log(`📈 Progresso: ${imported} pedidos importados...`);
            }
          } else {
            updated++;
          }
        } catch (error) {
          console.error(`❌ Erro ao processar pedido ${shopifyOrder.name}:`, error);
        }
      }
      
      // Define o since_id para a próxima página (último pedido da página atual)
      if (orders.length > 0 && hasMorePages) {
        sinceId = orders[orders.length - 1].id.toString();
        console.log(`➡️ Continuando com since_id: ${sinceId}`);
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
    
    // Verifica se o pedido já existe (por Shopify Order ID)
    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.shopifyOrderId, shopifyOrder.id.toString()));
    
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
  private async matchWithCarrier(operationId: string): Promise<{ matched: number }> {
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
    
    console.log(`🔍 Encontrados ${unmatchedOrders.length} pedidos para match`);
    
    // Busca dados da transportadora para comparação
    const carrierLeads = await this.getCarrierLeads(operationId);
    
    let matched = 0;
    
    for (const order of unmatchedOrders) {
      if (!order.customerName) continue;
      
      // Busca lead da transportadora com nome similar
      const matchedLead = this.findCarrierMatch(order.customerName, carrierLeads);
      
      if (matchedLead) {
        // Atualiza o pedido com dados da transportadora
        await db
          .update(orders)
          .set({
            carrierImported: true,
            carrierMatchedAt: new Date(),
            carrierOrderId: matchedLead.id,
            trackingNumber: matchedLead.tracking_number,
            status: this.mapCarrierStatus(matchedLead.status),
            providerData: matchedLead,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));
        
        console.log(`🔗 Match encontrado: ${order.customerName} -> ${matchedLead.customer_name}`);
        matched++;
      }
    }
    
    console.log(`🔗 Match concluído: ${matched} pedidos matched`);
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
    // Implementação específica para European Fulfillment
    try {
      // Por enquanto retorna array vazio, será implementado quando integrar com a API
      return [];
    } catch (error) {
      console.error('❌ Erro ao buscar leads da transportadora:', error);
      return [];
    }
  }
  
  private findCarrierMatch(customerName: string, carrierLeads: any[]): any | null {
    if (!customerName || carrierLeads.length === 0) return null;
    
    const normalizedName = this.normalizeName(customerName);
    
    for (const lead of carrierLeads) {
      const leadName = this.normalizeName(lead.customer_name || '');
      if (leadName && this.namesMatch(normalizedName, leadName)) {
        return lead;
      }
    }
    
    return null;
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