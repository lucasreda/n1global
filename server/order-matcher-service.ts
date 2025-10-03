import { db } from './db';
import { orders } from '@shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { extractEmailAddress } from './utils/email-utils';

type Order = typeof orders.$inferSelect;

export interface OrderMatch {
  orderId: string;
  orderNumber: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  method: 'explicit_mention' | 'temporal' | 'score';
  reasons: string[];
}

export interface OrderMatchCriteria {
  customerEmail: string;
  emailSubject: string;
  emailBody: string;
  ticketCreatedAt: Date;
}

export class OrderMatcherService {
  private static readonly EXPLICIT_MENTION_POINTS = 40;
  private static readonly TEMPORAL_7_DAYS_POINTS = 30;
  private static readonly TEMPORAL_30_DAYS_POINTS = 20;
  private static readonly TEMPORAL_60_DAYS_POINTS = 10;
  private static readonly STATUS_PROBLEMATIC_POINTS = 20;
  private static readonly NAME_SIMILARITY_POINTS = 10;

  private static readonly HIGH_CONFIDENCE_THRESHOLD = 50;
  private static readonly MEDIUM_CONFIDENCE_THRESHOLD = 30;

  /**
   * Normaliza um ID de pedido removendo caracteres especiais e deixando apenas alfanuméricos
   * Exemplos: "#1001" -> "1001", "NT-12345" -> "NT12345"
   */
  private static normalizeOrderId(id: string): string {
    return id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  /**
   * Extrai IDs de pedidos mencionados explicitamente no texto
   * Busca por padrões como: #123, pedido 123, order 123, COD123, NT-12345, etc
   */
  static extractOrderIdsFromText(text: string): string[] {
    const patterns = [
      // Padrões numéricos
      /#(\d+)/gi,                                    // #12345
      /pedido\s*:?\s*#?(\d+)/gi,                    // pedido: 12345, pedido #12345
      /order\s*:?\s*#?(\d+)/gi,                     // order: 12345, order #12345
      /COD\s*:?\s*#?(\d+)/gi,                       // COD: 12345, COD #12345
      /número\s*:?\s*#?(\d+)/gi,                    // número: 12345
      /n[úu]mero\s*:?\s*#?(\d+)/gi,                 // numero: 12345
      /compra\s*:?\s*#?(\d+)/gi,                    // compra: 12345
      /rastreio\s*:?\s*#?(\d+)/gi,                  // rastreio: 12345
      
      // Padrões alfanuméricos (NT-12345, EFC-123, etc)
      /pedido\s*:?\s*#?([A-Z]{2,4}-?\d+)/gi,        // pedido: NT-12345
      /order\s*:?\s*#?([A-Z]{2,4}-?\d+)/gi,         // order: NT-12345
      /rastreio\s*:?\s*#?([A-Z]{2,4}-?\d+)/gi,      // rastreio: NT-12345
      /([A-Z]{2,4}-\d+)/g,                          // NT-12345 standalone
    ];

    const foundIds = new Set<string>();
    
    for (const pattern of patterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        if (match[1]) {
          // Normalizar o ID extraído
          foundIds.add(this.normalizeOrderId(match[1]));
        }
      }
    }

    return Array.from(foundIds);
  }

  /**
   * Calcula score de relevância de um pedido baseado em múltiplos critérios
   */
  static scoreOrderRelevance(
    order: Order,
    criteria: OrderMatchCriteria,
    explicitlyMentioned: boolean
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // 1. Menção explícita (40 pontos)
    if (explicitlyMentioned) {
      score += this.EXPLICIT_MENTION_POINTS;
      const orderRef = order.shopifyOrderNumber || order.id;
      reasons.push(`Pedido #${orderRef} mencionado explicitamente no email`);
    }

    // 2. Proximidade temporal (10-30 pontos)
    if (!order.createdAt) {
      return { score, reasons };
    }
    
    const orderDate = new Date(order.createdAt);
    const daysDiff = Math.floor(
      (criteria.ticketCreatedAt.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff <= 7) {
      score += this.TEMPORAL_7_DAYS_POINTS;
      reasons.push(`Pedido recente (${daysDiff} dias atrás)`);
    } else if (daysDiff <= 30) {
      score += this.TEMPORAL_30_DAYS_POINTS;
      reasons.push(`Pedido do último mês (${daysDiff} dias atrás)`);
    } else if (daysDiff <= 60) {
      score += this.TEMPORAL_60_DAYS_POINTS;
      reasons.push(`Pedido dos últimos 2 meses (${daysDiff} dias atrás)`);
    }

    // 3. Status problemático (20 pontos)
    const problematicStatuses = ['cancelled', 'returned', 'refunded', 'failed'];
    if (problematicStatuses.includes(order.status?.toLowerCase())) {
      score += this.STATUS_PROBLEMATIC_POINTS;
      reasons.push(`Status problemático: ${order.status}`);
    }

    // 4. Similaridade de nome (10 pontos)
    // Comparação básica - pode ser melhorada com algoritmos de similaridade
    if (order.customerName && criteria.emailBody) {
      const nameParts = order.customerName.toLowerCase().split(' ').filter((p: string) => p.length > 2);
      const emailLower = criteria.emailBody.toLowerCase();
      
      const hasNameMatch = nameParts.some((part: string) => emailLower.includes(part));
      if (hasNameMatch) {
        score += this.NAME_SIMILARITY_POINTS;
        reasons.push('Nome do cliente mencionado no email');
      }
    }

    return { score, reasons };
  }

  /**
   * Determina o nível de confiança baseado no score
   */
  static getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= this.HIGH_CONFIDENCE_THRESHOLD) return 'high';
    if (score >= this.MEDIUM_CONFIDENCE_THRESHOLD) return 'medium';
    return 'low';
  }

  /**
   * Determina o método de vinculação baseado nos fatores
   */
  static getMatchMethod(explicitlyMentioned: boolean, score: number): 'explicit_mention' | 'temporal' | 'score' {
    if (explicitlyMentioned) return 'explicit_mention';
    if (score >= this.TEMPORAL_7_DAYS_POINTS) return 'temporal';
    return 'score';
  }

  /**
   * Encontra o melhor pedido correspondente para um ticket
   */
  /**
   * Extrai apenas o email de strings no formato "Name <email@example.com>" ou "email@example.com"
   */
  private static extractEmailAddress(emailString: string): string {
    const emailMatch = emailString.match(/<([^>]+)>/);
    return emailMatch ? emailMatch[1] : emailString;
  }

  static async findBestMatchingOrder(
    criteria: OrderMatchCriteria
  ): Promise<OrderMatch | null> {
    try {
      // 1. Extrair IDs mencionados explicitamente
      const fullText = `${criteria.emailSubject} ${criteria.emailBody}`;
      const mentionedIds = this.extractOrderIdsFromText(fullText);

      // 2. Extrair apenas o endereço de email (remove nome se houver)
      const cleanEmail = this.extractEmailAddress(criteria.customerEmail);

      // 3. Buscar pedidos do cliente
      const customerOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.customerEmail, cleanEmail))
        .orderBy(desc(orders.createdAt))
        .limit(50); // Limita aos últimos 50 pedidos

      if (customerOrders.length === 0) {
        return null;
      }

      // 3. Calcular scores para cada pedido
      const scoredOrders: OrderMatch[] = customerOrders.map(order => {
        const orderRef = order.shopifyOrderNumber || order.id;
        // Normalizar a referência do pedido para comparação
        const normalizedOrderRef = this.normalizeOrderId(orderRef);
        const explicitlyMentioned = mentionedIds.includes(normalizedOrderRef);
        const { score, reasons } = this.scoreOrderRelevance(order, criteria, explicitlyMentioned);
        
        return {
          orderId: order.id,
          orderNumber: orderRef, // Manter formato original para exibição
          score,
          confidence: this.getConfidenceLevel(score),
          method: this.getMatchMethod(explicitlyMentioned, score),
          reasons
        };
      });

      // 4. Ordenar por score (maior primeiro)
      scoredOrders.sort((a, b) => b.score - a.score);

      // 5. Retornar o melhor match (se tiver score mínimo)
      const bestMatch = scoredOrders[0];
      if (bestMatch.score >= this.MEDIUM_CONFIDENCE_THRESHOLD) {
        return bestMatch;
      }

      return null;
    } catch (error) {
      console.error('❌ Error finding best matching order:', error);
      return null;
    }
  }

  /**
   * Busca pedidos sugeridos para um ticket (para UI de seleção manual)
   */
  static async getSuggestedOrders(
    criteria: OrderMatchCriteria
  ): Promise<OrderMatch[]> {
    try {
      // 1. Extrair IDs mencionados
      const fullText = `${criteria.emailSubject} ${criteria.emailBody}`;
      const mentionedIds = this.extractOrderIdsFromText(fullText);

      // 2. Extrair apenas o endereço de email (remove nome se houver)
      const cleanEmail = this.extractEmailAddress(criteria.customerEmail);

      // 3. Buscar pedidos do cliente
      const customerOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.customerEmail, cleanEmail))
        .orderBy(desc(orders.createdAt))
        .limit(20); // Limita aos últimos 20 para UI

      if (customerOrders.length === 0) {
        return [];
      }

      // 3. Calcular scores
      const scoredOrders: OrderMatch[] = customerOrders.map(order => {
        const orderRef = order.shopifyOrderNumber || order.id;
        // Normalizar a referência do pedido para comparação
        const normalizedOrderRef = this.normalizeOrderId(orderRef);
        const explicitlyMentioned = mentionedIds.includes(normalizedOrderRef);
        const { score, reasons } = this.scoreOrderRelevance(order, criteria, explicitlyMentioned);
        
        return {
          orderId: order.id,
          orderNumber: orderRef, // Manter formato original para exibição
          score,
          confidence: this.getConfidenceLevel(score),
          method: this.getMatchMethod(explicitlyMentioned, score),
          reasons
        };
      });

      // 4. Ordenar por score
      scoredOrders.sort((a, b) => b.score - a.score);

      return scoredOrders;
    } catch (error) {
      console.error('❌ Error getting suggested orders:', error);
      return [];
    }
  }
}
