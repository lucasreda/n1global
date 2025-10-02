import { OpenAI } from "openai";
import formData from "form-data";
import Mailgun from "mailgun.js";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { db } from "./db";
import { customerOrderService, type CustomerOrderMatch, type OrderActionResult } from "./customer-order-service";
import {
  supportCategories,
  supportEmails,
  supportTickets,
  supportResponses,
  supportConversations,
  supportMetrics,
  adminSupportDirectives,
  customerSupportOperations,
  aiDirectives,
  operations,
  type SupportCategory,
  type SupportEmail,
  type SupportTicket,
  type SupportResponse,
  type InsertSupportEmail,
  type InsertSupportTicket,
  type InsertSupportConversation,
} from "@shared/schema";

// Interfaces for order integration
export interface EmailOrderContext {
  customerOrders: CustomerOrderMatch[];
  customerStats: {
    totalOrders: number;
    totalValue: number;
    deliveredOrders: number;
    cancelledOrders: number;
    lastOrderDate?: Date;
    customerType: 'new' | 'returning' | 'vip';
  };
  extractedOrderIds: string[];
  suggestedActions: {
    action: 'cancel_order' | 'update_address' | 'provide_tracking' | 'none';
    orderId?: string;
    reason?: string;
    requiresApproval?: boolean;
  }[];
}

export interface OrderActionRequest {
  action: 'cancel_order' | 'update_address';
  orderId: string;
  reason?: string;
  newAddress?: {
    customerAddress?: string;
    customerCity?: string;
    customerState?: string;
    customerCountry?: string;
    customerZip?: string;
  };
}
import { eq, and, or, inArray, ilike, desc, sql, count } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure Mailgun
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY || "",
});

export class SupportService {
  /**
   * Format AI response content for HTML email
   */
  private formatAIResponseForEmail(content: string): string {
    // Split content into paragraphs
    let formatted = content
      // Replace double line breaks with paragraph separators
      .split("\n\n")
      .map((paragraph) => {
        // Trim whitespace
        paragraph = paragraph.trim();
        if (!paragraph) return "";

        // Convert **bold** to <strong>bold</strong>
        paragraph = paragraph.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

        // Convert *italic* to <em>italic</em>
        paragraph = paragraph.replace(/\*(.*?)\*/g, "<em>$1</em>");

        // Convert single line breaks to <br>
        paragraph = paragraph.replace(/\n/g, "<br>");

        // Wrap in paragraph tags
        return `<p style="margin-bottom: 15px; line-height: 1.6;">${paragraph}</p>`;
      })
      .filter((p) => p.length > 0)
      .join("");

    // Handle lists (- item or * item)
    formatted = formatted.replace(
      /<p[^>]*>([^<]*[-*]\s[^<]*(?:<br>[^<]*[-*]\s[^<]*)*)<\/p>/g,
      (match, listContent) => {
        const items = listContent
          .split("<br>")
          .filter((item: string) => item.trim().match(/^[-*]\s/))
          .map(
            (item: string) =>
              `<li style="margin-bottom: 8px;">${item.replace(/^[-*]\s/, "").trim()}</li>`,
          )
          .join("");
        return `<ul style="margin-bottom: 15px; padding-left: 20px;">${items}</ul>`;
      },
    );

    return formatted;
  }

  /**
   * Get all support categories
   */
  async getCategories(): Promise<SupportCategory[]> {
    return await db
      .select()
      .from(supportCategories)
      .orderBy(desc(supportCategories.priority));
  }

  /**
   * Enrich email with customer order information
   */
  async enrichEmailWithOrderContext(
    email: SupportEmail,
    operationId: string
  ): Promise<EmailOrderContext> {
    console.log('🔍 Enriching email with order context for:', email.from);

    // Extract customer information
    const customerEmail = email.from;
    const customerName = email.from.split('@')[0];
    
    // Extract potential order IDs from email content
    const extractedOrderIds = this.extractOrderIdsFromEmail(
      email.subject, 
      email.textContent || email.htmlContent || ''
    );

    try {
      // Find customer orders
      const customerOrders = await customerOrderService.findCustomerOrders(
        operationId,
        customerEmail,
        undefined, // phone - not available from email
        customerName
      );

      // Get customer statistics
      const customerStats = await customerOrderService.getCustomerStats(
        operationId,
        customerEmail
      );

      // Analyze email content for suggested actions
      const suggestedActions = await this.analyzeSuggestedActions(
        email,
        customerOrders,
        extractedOrderIds
      );

      console.log(`✅ Found ${customerOrders.length} orders for customer ${customerEmail}`);
      console.log(`📊 Customer stats: ${customerStats.totalOrders} total orders, ${customerStats.customerType} type`);
      console.log(`🎯 Suggested actions: ${suggestedActions.length} actions identified`);

      return {
        customerOrders,
        customerStats,
        extractedOrderIds,
        suggestedActions
      };

    } catch (error) {
      console.error('❌ Error enriching email with order context:', error);
      return {
        customerOrders: [],
        customerStats: {
          totalOrders: 0,
          totalValue: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
          customerType: 'new'
        },
        extractedOrderIds,
        suggestedActions: []
      };
    }
  }

  /**
   * Extract order IDs from email content
   */
  private extractOrderIdsFromEmail(subject: string, content: string): string[] {
    const orderIds: string[] = [];
    const fullText = `${subject} ${content}`.toLowerCase();
    
    // Common order ID patterns
    const patterns = [
      /(?:pedido|order|nº|número|#)\s*:?\s*([A-Z0-9\-]{5,20})/gi,
      /(?:NT-|ORD-|PED-|#)([A-Z0-9\-]{4,15})/gi,
      /\b([A-Z]{2,3}-\d{4,8})\b/gi,
      /\b(NT\d{6,8})\b/gi
    ];

    patterns.forEach(pattern => {
      const matches = fullText.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && !orderIds.includes(match[1])) {
          orderIds.push(match[1].toUpperCase());
        }
      }
    });

    console.log(`🔍 Extracted order IDs from email: ${orderIds.join(', ') || 'none'}`);
    return orderIds;
  }

  /**
   * Analyze email content to suggest automatic actions
   */
  private async analyzeSuggestedActions(
    email: SupportEmail,
    customerOrders: CustomerOrderMatch[],
    extractedOrderIds: string[]
  ): Promise<EmailOrderContext['suggestedActions']> {
    const actions: EmailOrderContext['suggestedActions'] = [];
    const content = `${email.subject} ${email.textContent || email.htmlContent || ''}`.toLowerCase();

    // Cancelamento
    if (content.includes('cancelar') || content.includes('cancel')) {
      // Priorizar pedidos específicos mencionados
      if (extractedOrderIds.length > 0) {
        extractedOrderIds.forEach(orderId => {
          const matchingOrder = customerOrders.find(o => o.order.id === orderId);
          if (matchingOrder) {
            actions.push({
              action: 'cancel_order',
              orderId: orderId,
              reason: 'Cliente solicitou cancelamento por email'
            });
          }
        });
      } else if (customerOrders.length > 0) {
        // Usar o pedido mais recente se nenhum ID específico foi mencionado
        const recentOrder = customerOrders
          .filter(o => o.confidence === 'high')
          .sort((a, b) => {
            const dateA = new Date(a.order.orderDate || 0);
            const dateB = new Date(b.order.orderDate || 0);
            return dateB.getTime() - dateA.getTime();
          })[0];

        if (recentOrder) {
          actions.push({
            action: 'cancel_order',
            orderId: recentOrder.order.id,
            reason: 'Cliente solicitou cancelamento por email (pedido mais recente)'
          });
        }
      }
    }

    // Alteração de endereço
    if (content.includes('endereço') || content.includes('endereco') || 
        content.includes('mudar') || content.includes('alterar')) {
      if (extractedOrderIds.length > 0) {
        extractedOrderIds.forEach(orderId => {
          const matchingOrder = customerOrders.find(o => o.order.id === orderId);
          if (matchingOrder) {
            actions.push({
              action: 'update_address',
              orderId: orderId,
              reason: 'Cliente solicitou alteração de endereço'
            });
          }
        });
      } else if (customerOrders.length > 0) {
        const recentOrder = customerOrders
          .filter(o => o.confidence === 'high')
          .sort((a, b) => {
            const dateA = new Date(a.order.orderDate || 0);
            const dateB = new Date(b.order.orderDate || 0);
            return dateB.getTime() - dateA.getTime();
          })[0];

        if (recentOrder) {
          actions.push({
            action: 'update_address',
            orderId: recentOrder.order.id,
            reason: 'Cliente solicitou alteração de endereço (pedido mais recente)'
          });
        }
      }
    }

    // Rastreamento
    if (content.includes('rastrear') || content.includes('tracking') || 
        content.includes('acompanhar') || content.includes('onde está')) {
      if (extractedOrderIds.length > 0) {
        extractedOrderIds.forEach(orderId => {
          const matchingOrder = customerOrders.find(o => o.order.id === orderId);
          if (matchingOrder) {
            actions.push({
              action: 'provide_tracking',
              orderId: orderId,
              reason: 'Cliente solicitou informações de rastreamento'
            });
          }
        });
      } else if (customerOrders.length > 0) {
        const recentOrder = customerOrders
          .filter(o => o.confidence === 'high')
          .sort((a, b) => {
            const dateA = new Date(a.order.orderDate || 0);
            const dateB = new Date(b.order.orderDate || 0);
            return dateB.getTime() - dateA.getTime();
          })[0];

        if (recentOrder) {
          actions.push({
            action: 'provide_tracking',
            orderId: recentOrder.order.id,
            reason: 'Cliente solicitou informações de rastreamento (pedido mais recente)'
          });
        }
      }
    }

    return actions;
  }

  /**
   * Categorize email using OpenAI
   */
  async categorizeEmail(
    subject: string,
    content: string,
  ): Promise<{
    categoryName: string;
    confidence: number;
    reasoning: string;
    requiresHuman: boolean;
    sentiment: string;
    emotion: string;
    urgency: string;
    tone: string;
    hasTimeConstraint: boolean;
    escalationRisk: number;
  }> {
    const categories = await this.getCategories();
    const categoryDescriptions = categories
      .map(
        (cat) =>
          `${cat.name}: ${cat.description} (automação: ${cat.isAutomated ? "sim" : "não"})`,
      )
      .join("\n");

    const prompt = `
Analise o seguinte email de suporte e categorize-o em uma das categorias disponíveis.

CATEGORIAS DISPONÍVEIS:
${categoryDescriptions}

EMAIL PARA ANÁLISE:
---
CONTEÚDO PRINCIPAL (PRIORIDADE MÁXIMA): ${content}
---
Assunto (referência secundária): ${subject}

INSTRUÇÃO CRÍTICA: Analise PRINCIPALMENTE o CONTEÚDO do email, não o assunto. 
O assunto pode ser genérico (como "Bom dia", "Olá", "Contato") mas o que importa é o que o cliente escreve no corpo da mensagem.

EXEMPLOS:
- Assunto: "Bom dia" + Conteúdo: "Gostaria de saber quando meu pedido vai chegar" → CATEGORIA: duvidas
- Assunto: "Olá" + Conteúdo: "Preciso cancelar minha compra" → CATEGORIA: cancelamento  
- Assunto: "Contato" + Conteúdo: "Quero alterar o endereço de entrega" → CATEGORIA: alteracao_endereco

Responda em JSON no seguinte formato:
{
  "categoryName": "nome_da_categoria",
  "confidence": 85,
  "reasoning": "explicação_da_escolha",
  "requiresHuman": false,
  "sentiment": "neutro",
  "emotion": "calmo",
  "urgency": "media",
  "tone": "educado",
  "hasTimeConstraint": false,
  "escalationRisk": 2
}

ANÁLISE DE SENTIMENTO - CAMPOS OBRIGATÓRIOS:

sentiment: Análise do sentimento geral
- "muito_positivo": Cliente muito satisfeito, elogios
- "positivo": Cliente satisfeito, tom amigável
- "neutro": Tom neutral, informativo
- "negativo": Cliente insatisfeito, frustração
- "muito_negativo": Cliente muito irritado, raiva

emotion: Estado emocional específico
- "calmo": Cliente tranquilo, sem pressa
- "ansioso": Cliente preocupado, querendo respostas
- "frustrado": Cliente irritado com situação
- "zangado": Cliente com raiva, tom agressivo
- "preocupado": Cliente com dúvidas, incerto
- "satisfeito": Cliente feliz, elogiando

urgency: Nível de urgência percebido
- "baixa": Dúvida simples, sem pressa
- "media": Questão normal, tempo razoável
- "alta": Cliente com pressa, precisa resolver logo
- "critica": Situação urgente, requer ação imediata

tone: Tom da comunicação
- "formal": Linguagem profissional, educada
- "informal": Linguagem casual, relaxada
- "agressivo": Tom hostil, ameaçador
- "educado": Tom respeitoso, cortês
- "desesperado": Tom de desespero, urgência emocional

hasTimeConstraint: true se menciona prazos, datas, "urgente", "rápido"

escalationRisk: Risco de escalação (0-10)
- 0-2: Baixo risco, cliente educado
- 3-5: Risco médio, cliente insatisfeito mas controlado
- 6-8: Risco alto, cliente irritado, pode escalar
- 9-10: Risco crítico, cliente muito agressivo

IMPORTANTE SOBRE requiresHuman:
- DEFAULT é false (nossa IA Sofia pode responder a maioria dos casos)
- Use requiresHuman = true APENAS para casos GRAVES: ameaças, problemas legais, linguagem agressiva, reclamações complexas

EXEMPLOS DE requiresHuman = false:
- "Quando meu pedido vai chegar?"
- "Quero cancelar meu pedido" 
- "Preciso alterar meu endereço"
- "Meu produto ainda não chegou"
- "Quanto tempo demora a entrega?"

EXEMPLOS DE requiresHuman = true:
- Linguagem agressiva ou ofensiva
- Ameaças ou menções legais
- Problemas técnicos complexos do site
- Reclamações sobre produto com defeito

REGRAS:
1. Para "duvidas" simples → requiresHuman = false
2. Para "cancelamento" direto → requiresHuman = false  
3. Para "alteracao_endereco" → requiresHuman = false
4. Para "reclamacoes" → sempre requiresHuman = true
5. Para "manual" → sempre requiresHuman = true
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 300,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");

      const categoryName = result.categoryName || "manual";
      let requiresHuman =
        result.requiresHuman !== undefined ? result.requiresHuman : true;

      // Override AI decision for simple cases - force AI response for basic inquiries
      if (categoryName === "duvidas") {
        const contentLower = (subject + " " + content).toLowerCase();
        const simpleInquiryKeywords = [
          "quando",
          "chegar",
          "chegou",
          "entrega",
          "prazo",
          "demora",
          "rastreamento",
          "rastrear",
          "acompanhar",
          "status",
          "pedido",
          "produto",
          "comprei",
          "onde está",
          "chegada",
        ];

        const hasSimpleKeywords = simpleInquiryKeywords.some((keyword) =>
          contentLower.includes(keyword),
        );

        const hasComplexKeywords = [
          "defeito",
          "quebrado",
          "problema",
          "reclamação",
          "advogado",
          "processo",
          "judicial",
          "indenização",
          "dano",
        ].some((keyword) => contentLower.includes(keyword));

        // If it's a simple delivery question without complex issues, AI can handle it
        if (hasSimpleKeywords && !hasComplexKeywords) {
          requiresHuman = false;
          console.log(`🤖 Forçando IA para dúvida simples: ${subject}`);
        }
      }

      // Always allow AI for cancellations and address changes (unless explicitly complex)
      if (["cancelamento", "alteracao_endereco"].includes(categoryName)) {
        const contentLower = (subject + " " + content).toLowerCase();
        const hasComplexKeywords = [
          "advogado",
          "processo",
          "judicial",
          "indenização",
          "dano",
          "ameaça",
        ].some((keyword) => contentLower.includes(keyword));

        if (!hasComplexKeywords) {
          requiresHuman = false;
          console.log(`🤖 Forçando IA para ${categoryName}: ${subject}`);
        }
      }

      return {
        categoryName,
        confidence: Math.min(100, Math.max(0, result.confidence || 0)),
        reasoning: result.reasoning || "Categorização automática falhou",
        requiresHuman,
        sentiment: result.sentiment || "neutro",
        emotion: result.emotion || "calmo",
        urgency: result.urgency || "media",
        tone: result.tone || "educado",
        hasTimeConstraint: result.hasTimeConstraint || false,
        escalationRisk: Math.min(10, Math.max(0, result.escalationRisk || 0)),
      };
    } catch (error) {
      console.error("Erro na categorização por IA:", error);
      return {
        categoryName: "manual",
        confidence: 0,
        reasoning: "Erro na análise de IA - necessita revisão manual",
        requiresHuman: true,
        sentiment: "neutro",
        emotion: "calmo",
        urgency: "media",
        tone: "educado",
        hasTimeConstraint: false,
        escalationRisk: 5,
      };
    }
  }

  /**
   * Check if email is a reply to an existing conversation
   */
  private isEmailReply(subject: string): boolean {
    // Check for common reply indicators in subject
    const replyPrefixes = [
      /^re:\s*/i,
      /^re\[\d+\]:\s*/i,
      /^aw:\s*/i,
      /^re\(\d+\):\s*/i,
      /^antw:\s*/i,
      /^resp:\s*/i,
      /^resposta:\s*/i,
      /^\[re\]:\s*/i,
      /^\[resposta\]:\s*/i,
    ];

    return replyPrefixes.some((pattern) => pattern.test(subject));
  }

  /**
   * Extract original subject from reply
   */
  private extractOriginalSubject(subject: string): string {
    // Remove reply prefixes to get original subject
    const replyPrefixes = [
      /^re:\s*/i,
      /^re\[\d+\]:\s*/i,
      /^aw:\s*/i,
      /^re\(\d+\):\s*/i,
      /^antw:\s*/i,
      /^resp:\s*/i,
      /^resposta:\s*/i,
      /^\[re\]:\s*/i,
      /^\[resposta\]:\s*/i,
    ];

    let cleanSubject = subject.trim();
    for (const pattern of replyPrefixes) {
      cleanSubject = cleanSubject.replace(pattern, "");
    }

    return cleanSubject.trim();
  }

  /**
   * Find existing ticket for email reply
   */
  private async findExistingTicketForReply(
    from: string,
    subject: string,
  ): Promise<SupportTicket | null> {
    const originalSubject = this.extractOriginalSubject(subject);

    // Strategy 1: Find by customer email and similar subject
    const ticketsBySubject = await db
      .select()
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.customerEmail, from),
          or(
            eq(supportTickets.subject, originalSubject),
            eq(supportTickets.subject, subject),
            ilike(supportTickets.subject, `%${originalSubject}%`),
          ),
          inArray(supportTickets.status, ["open", "in_progress"]),
        ),
      )
      .orderBy(desc(supportTickets.createdAt))
      .limit(1);

    if (ticketsBySubject.length > 0) {
      console.log(
        `📬 Found existing ticket by subject match: ${ticketsBySubject[0].ticketNumber}`,
      );
      return ticketsBySubject[0];
    }

    // Strategy 2: Find most recent open ticket from same customer
    const recentTickets = await db
      .select()
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.customerEmail, from),
          inArray(supportTickets.status, ["open", "in_progress"]),
        ),
      )
      .orderBy(desc(supportTickets.createdAt))
      .limit(1);

    if (recentTickets.length > 0) {
      console.log(
        `📬 Found existing ticket by recent activity: ${recentTickets[0].ticketNumber}`,
      );
      return recentTickets[0];
    }

    console.log(`📬 No existing ticket found for reply from ${from}`);
    return null;
  }

  /**
   * Process incoming email from webhook
   */
  async processIncomingEmail(webhookData: any): Promise<SupportEmail> {
    const {
      from,
      to,
      subject,
      textContent: text,
      htmlContent: html,
      messageId,
      attachments = [],
      inReplyTo,
      references,
      timestamp,
    } = webhookData;

    console.log(`📧 Processing email - From: ${from}, Subject: ${subject}`);

    // Check if this is a reply to existing conversation
    const isReply = this.isEmailReply(subject);
    console.log(`📧 Is reply: ${isReply}`);

    let existingTicket = null;
    if (isReply) {
      existingTicket = await this.findExistingTicketForReply(from, subject);
    }

    // If this is a reply to existing ticket, add to conversation instead of creating new ticket
    if (existingTicket) {
      console.log(
        `📧 Adding reply to existing ticket: ${existingTicket.ticketNumber}`,
      );

      // Save email
      const emailData: InsertSupportEmail = {
        messageId: messageId,
        from,
        to,
        subject,
        textContent: text,
        htmlContent: html,
        attachments: attachments.length > 0 ? attachments : null,
        categoryId: existingTicket.categoryId,
        aiConfidence: 100,
        aiReasoning: "Reply to existing ticket - no AI categorization needed",
        status: "attached_to_ticket",
        requiresHuman: true,
        rawData: webhookData,
      };

      const [savedEmail] = await db
        .insert(supportEmails)
        .values(emailData)
        .returning();

      // Add conversation entry
      await this.addConversation(existingTicket.id, {
        type: "email_in",
        from: from,
        to: to,
        subject: subject,
        content: text || html || "",
        messageId: messageId,
      });

      // Update ticket status to show new activity and mark as unread
      await db
        .update(supportTickets)
        .set({
          status: "open", // Set to open when customer replies
          isRead: false,
          updatedAt: new Date(),
        })
        .where(eq(supportTickets.id, existingTicket.id));

      console.log(
        `✅ Reply attached to ticket: ${existingTicket.ticketNumber}`,
      );
      return savedEmail;
    }

    // This is a new email, process normally
    console.log(`📧 Processing as new email`);

    // Categorize with AI
    const categorization = await this.categorizeEmail(
      subject,
      text || html || "",
    );

    // Find category by name
    const category = await db
      .select()
      .from(supportCategories)
      .where(eq(supportCategories.name, categorization.categoryName))
      .limit(1);

    const categoryId = category[0]?.id || null;

    // Get operation ID from email destination
    const operationId = await this.getOperationIdFromEmail({ to });
    console.log(`🏢 Email mapped to operation: ${operationId}`);

    // Create a temporary email object for enrichment
    const tempEmail: SupportEmail = {
      id: '',
      messageId: messageId,
      from,
      to,
      subject,
      textContent: text,
      htmlContent: html,
      attachments: attachments.length > 0 ? attachments : null,
      categoryId,
      aiConfidence: categorization.confidence,
      aiReasoning: categorization.reasoning,
      status: "categorized",
      requiresHuman: categorization.requiresHuman,
      rawData: webhookData,
      sentiment: categorization.sentiment,
      emotion: categorization.emotion,
      urgency: categorization.urgency,
      tone: categorization.tone,
      hasTimeConstraint: categorization.hasTimeConstraint,
      escalationRisk: categorization.escalationRisk,
      hasAutoResponse: false,
      autoResponseSentAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Enrich email with order context
    let orderContext: EmailOrderContext | null = null;
    if (operationId) {
      console.log('🔍 Enriching email with order context...');
      orderContext = await this.enrichEmailWithOrderContext(tempEmail, operationId);
      console.log(`📦 Order context: ${orderContext.customerOrders.length} orders, ${orderContext.suggestedActions.length} actions`);
    }

    // Save email
    const emailData: InsertSupportEmail = {
      messageId: messageId,
      from,
      to,
      subject,
      textContent: text,
      htmlContent: html,
      attachments: attachments.length > 0 ? attachments : null,
      categoryId,
      aiConfidence: categorization.confidence,
      aiReasoning: categorization.reasoning,
      status: "categorized",
      requiresHuman: categorization.requiresHuman,
      rawData: webhookData,
      sentiment: categorization.sentiment,
      emotion: categorization.emotion,
      urgency: categorization.urgency,
      tone: categorization.tone,
      hasTimeConstraint: categorization.hasTimeConstraint,
      escalationRisk: categorization.escalationRisk,
    };

    const [savedEmail] = await db
      .insert(supportEmails)
      .values(emailData)
      .returning();

    // Always create ticket for proper tracking and history
    // Tickets should exist regardless of whether they get automatic responses
    if (categoryId) {
      const ticket = await this.createTicketFromEmail(savedEmail);
      console.log(
        `📋 Ticket criado: ${ticket.ticketNumber} para ${savedEmail.from}`,
      );

      // If automatic response was sent, mark ticket as initially responded
      if (category[0]?.isAutomated && !categorization.requiresHuman) {
        const categoryName = category[0].name.toLowerCase();
        if (
          ["duvidas", "alteracao_endereco", "cancelamento"].includes(
            categoryName,
          )
        ) {
          // The AI will respond, so we'll update ticket status after response is sent
          console.log(
            `📋 Ticket ${ticket.ticketNumber} will receive automatic response`,
          );
        }
      }
    }

    // Send AI auto-response if category supports it and is eligible
    if (
      categoryId &&
      category[0]?.isAutomated &&
      !categorization.requiresHuman
    ) {
      const categoryName = category[0].name.toLowerCase();

      // Use AI responses for specific categories only
      if (
        ["duvidas", "alteracao_endereco", "cancelamento"].includes(categoryName)
      ) {
        console.log(`🤖 Enviando resposta IA para categoria: ${categoryName}`);
        const sentimentData = {
          sentiment: categorization.sentiment,
          emotion: categorization.emotion,
          urgency: categorization.urgency,
          tone: categorization.tone,
          hasTimeConstraint: categorization.hasTimeConstraint,
          escalationRisk: categorization.escalationRisk,
        };
        await this.sendAIAutoResponse(savedEmail, category[0], sentimentData, orderContext);
        
        // Execute automatic actions if any were suggested
        if (orderContext && orderContext.suggestedActions.length > 0) {
          console.log(`🎯 Executing ${orderContext.suggestedActions.length} automatic actions...`);
          await this.executeAutomaticActions(orderContext.suggestedActions, operationId);
        }
      } else if (categoryName !== "reclamacoes" && categoryName !== "manual") {
        // Fallback to template system for other automated categories
        console.log(
          `📄 Enviando resposta template para categoria: ${categoryName}`,
        );
        await this.sendAutoResponse(savedEmail, category[0]);
      } else {
        console.log(
          `⏸️ Categoria não elegível para resposta automática: ${categoryName}`,
        );
      }
    }

    return savedEmail;
  }

  /**
   * Create support ticket from email
   */
  async createTicketFromEmail(email: SupportEmail): Promise<SupportTicket> {
    // Generate ticket number
    const year = new Date().getFullYear();
    const count = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(supportTickets)
      .where(sql`EXTRACT(YEAR FROM created_at) = ${year}`);

    const ticketNumber = `SUP-${year}-${String((count[0]?.count || 0) + 1).padStart(3, "0")}`;

    const ticketData: InsertSupportTicket = {
      emailId: email.id,
      categoryId: email.categoryId!,
      customerEmail: email.from,
      customerName: email.from.split("@")[0], // Extract name from email
      subject: email.subject,
      description: email.textContent || email.htmlContent || "",
      priority: email.isUrgent ? "high" : "medium",
      status: "open",
      isRead: false,
    };

    const [ticket] = await db
      .insert(supportTickets)
      .values({ ...ticketData, ticketNumber })
      .returning();

    // Add initial conversation entry
    await this.addConversation(ticket.id, {
      type: "email_in",
      from: email.from,
      to: email.to,
      subject: email.subject,
      content: email.textContent || email.htmlContent || "",
      messageId: email.messageId,
    });

    return ticket;
  }

  /**
   * Generate AI-powered automatic response using dynamic directives
   */
  async generateAIAutoResponse(
    email: SupportEmail,
    category: SupportCategory,
    sentimentData?: {
      sentiment: string;
      emotion: string;
      urgency: string;
      tone: string;
      hasTimeConstraint: boolean;
      escalationRisk: number;
    },
    orderContext?: EmailOrderContext
  ): Promise<{ subject: string; content: string }> {
    const customerName = email.from.split("@")[0];

    // Get operation ID from email
    const operationId = await this.getOperationIdFromEmail(email);
    
    // Get active AI directives for this operation
    const directives = await this.getActiveDirectives(operationId);
    
    // Get global admin support directives
    const adminDirectives = await this.getAdminDirectives();
    const activeAdminDirectives = adminDirectives.filter(d => d.isActive);
    
    console.log(`📋 Using ${activeAdminDirectives.length} admin directives + ${directives.length} operation directives`);
    
    // Build dynamic prompt with both admin and operation directives
    const prompt = await this.buildDynamicPrompt(email, category, directives, sentimentData, orderContext, activeAdminDirectives);

    let content = "{}"; // Declarar fora do try para acessar no catch
    
    try {
      console.log("🤖 DEBUG - Iniciando chamada para OpenAI");
      console.log("📊 Tamanho do prompt:", prompt.length, "caracteres");
      console.log("📧 Email original:", {
        from: email.from,
        subject: email.subject,
        category: category.name,
        contentLength: (email.textContent || email.htmlContent || '').length
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7, // Mais criativo para respostas naturais
        max_tokens: 600,
      });

      console.log("✅ Resposta recebida da OpenAI");
      console.log("📝 Token usage:", response.usage);

      content = response.choices[0].message.content || "{}";

      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/g);
      if (jsonMatch && jsonMatch[0]) {
        const fullMatch = jsonMatch[0];
        const innerMatch = fullMatch.match(/\{[\s\S]*?\}/);
        if (innerMatch) {
          content = innerMatch[0];
        }
      }

      // Clean up potential control characters but preserve newlines in content
      content = content.replace(
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g,
        "",
      );

      console.log("🔍 Conteúdo que será parseado:", content.substring(0, 500) + "...");
      
      const result = JSON.parse(content);

      return {
        subject: result.subject || `Re: ${email.subject}`,
        content:
          result.content ||
          "Obrigada pelo seu contato. Nossa equipe analisará sua solicitação e retornaremos em breve.",
      };
    } catch (error) {
      console.error("🚨 ERRO DETALHADO na geração de resposta IA:");
      console.error("Tipo do erro:", error instanceof Error ? error.name : typeof error);
      console.error("Mensagem:", error instanceof Error ? error.message : error);
      
      if (error instanceof Error && error.message.includes('JSON')) {
        console.error("❌ ERRO JSON - Conteúdo recebido da OpenAI:", content);
      }
      
      if (error instanceof Error && error.message.includes('token')) {
        console.error("❌ ERRO TOKEN - Limite excedido ou quota");
      }
      
      if (error instanceof Error && error.message.includes('API')) {
        console.error("❌ ERRO API - Problema na chamada OpenAI");
      }
      
      console.error("Stack trace completo:", error);
      
      // Fallback para resposta padrão
      const customerName = email.from.split("@")[0];
      return {
        subject: `Re: ${email.subject}`,
        content: `Olá ${customerName},\n\nObrigada pelo seu contato. Recebemos sua mensagem sobre "${email.subject}" e nossa equipe está analisando sua solicitação.\n\nRetornaremos com uma resposta personalizada em breve.\n\nAtenciosamente,\nEquipe de Atendimento`,
      };
    }
  }

  /**
   * Get design configuration for an operation by analyzing the email domain
   */
  private async getDesignConfigForEmail(email: SupportEmail): Promise<any> {
    try {
      console.log("🤖 DEBUG - Iniciando chamada para OpenAI");
      console.log("📊 Tamanho do prompt:", prompt.length, "caracteres");
      console.log("📧 Email original:", {
        from: email.from,
        subject: email.subject,
        category: category.name,
        contentLength: (email.textContent || email.htmlContent || '').length
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7, // Mais criativo para respostas naturais
        max_tokens: 600,
      });

      console.log("✅ Resposta recebida da OpenAI");
      console.log("📝 Token usage:", response.usage);

      content = response.choices[0].message.content || "{}";

      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/g);
      if (jsonMatch && jsonMatch[0]) {
        const fullMatch = jsonMatch[0];
        const innerMatch = fullMatch.match(/\{[\s\S]*?\}/);
        if (innerMatch) {
          content = innerMatch[0];
        }
      }

      // Clean up potential control characters but preserve newlines in content
      content = content.replace(
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g,
        "",
      );

      console.log("🔍 Conteúdo que será parseado:", content.substring(0, 500) + "...");
      
      const result = JSON.parse(content);

      return {
        subject: result.subject || `Re: ${email.subject}`,
        content:
          result.content ||
          "Obrigada pelo seu contato. Nossa equipe analisará sua solicitação e retornaremos em breve.",
      };
    } catch (error) {
      console.error("🚨 ERRO DETALHADO na geração de resposta IA:");
      console.error("Tipo do erro:", error instanceof Error ? error.name : typeof error);
      console.error("Mensagem:", error instanceof Error ? error.message : error);
      
      if (error instanceof Error && error.message.includes('JSON')) {
        console.error("❌ ERRO JSON - Conteúdo recebido da OpenAI:", content);
      }
      
      if (error instanceof Error && error.message.includes('token')) {
        console.error("❌ ERRO TOKEN - Limite excedido ou quota");
      }
      
      if (error instanceof Error && error.message.includes('API')) {
        console.error("❌ ERRO API - Problema na chamada OpenAI");
      }
      
      console.error("Stack trace completo:", error);
      
      // Fallback para resposta padrão
      return {
        subject: `Re: ${email.subject}`,
        content: `Olá ${customerName},\n\nObrigada pelo seu contato. Recebemos sua mensagem sobre "${email.subject}" e nossa equipe está analisando sua solicitação.\n\nRetornaremos com uma resposta personalizada em breve.\n\nAtenciosamente,\nEquipe de Atendimento`,
      };
    }
  }

  /**
   * Get design configuration for an operation by analyzing the email domain
   */
  private async getDesignConfigForEmail(email: SupportEmail): Promise<any> {
    try {
      // Extract domain from the 'to' email address
      const toDomain = email.to.includes('@') ? email.to.split('@')[1] : null;
      
      if (!toDomain) {
        console.log('⚠️ Could not extract domain from email:', email.to);
        return this.getDefaultDesignConfig();
      }

      // Find operation by domain in customer support operations
      const [operation] = await db
        .select()
        .from(customerSupportOperations)
        .where(eq(customerSupportOperations.emailDomain, toDomain))
        .limit(1);

      if (!operation) {
        console.log('⚠️ No operation found for domain:', toDomain);
        return this.getDefaultDesignConfig();
      }

      console.log('✅ Found operation for domain:', toDomain, '-> Operation:', operation.id);
      
      // Get design config for the operation
      const brandingConfig = (operation.brandingConfig as any) || {};
      
      return {
        logo: brandingConfig.logo || "/images/n1-lblue.png",
        primaryColor: brandingConfig.primaryColor || "#2563eb",
        backgroundColor: brandingConfig.backgroundColor || "#f8fafc",
        textColor: brandingConfig.textColor || "#333333",
        logoAlignment: brandingConfig.logoAlignment || "center",
        secondaryTextColor: brandingConfig.secondaryTextColor || "#666666",
        signature: brandingConfig.signature || {
          name: "",
          position: "",
          phone: "",
          email: "",
          website: ""
        },
        card: brandingConfig.card || {
          backgroundColor: "#ffffff",
          backgroundOpacity: 1,
          borderColor: "#e5e7eb",
          borderRadius: 8,
          borderWidth: {
            top: 1,
            right: 1,
            bottom: 1,
            left: 1
          }
        }
      };
    } catch (error) {
      console.error('🚨 Error getting design config for email:', error);
      return this.getDefaultDesignConfig();
    }
  }

  /**
   * Get default design configuration
   */
  private getDefaultDesignConfig(): any {
    return {
      logo: "/images/n1-lblue.png",
      primaryColor: "#2563eb",
      backgroundColor: "#f8fafc",
      textColor: "#333333",
      logoAlignment: "center",
      secondaryTextColor: "#666666",
      signature: {
        name: "",
        position: "",
        phone: "",
        email: "",
        website: ""
      },
      card: {
        backgroundColor: "#ffffff",
        backgroundOpacity: 1,
        borderColor: "#e5e7eb",
        borderRadius: 8,
        borderWidth: {
          top: 1,
          right: 1,
          bottom: 1,
          left: 1
        }
      }
    };
  }

  /**
   * Send AI-powered automatic response
   */
  async sendAIAutoResponse(
    email: SupportEmail,
    category: SupportCategory,
    sentimentData?: {
      sentiment: string;
      emotion: string;
      urgency: string;
      tone: string;
      hasTimeConstraint: boolean;
      escalationRisk: number;
    },
    orderContext?: EmailOrderContext
  ): Promise<void> {
    console.log(
      `🤖 Gerando resposta automática IA para categoria: ${category.name}`,
    );
    console.log("🔥 STEP 1");
    console.log("🔥 STEP 2");
    console.log("🔥 ENTRANDO EM sendAIAutoResponse - INICIO DA FUNÇÃO");

    try {
      // Gerar resposta com IA
      const aiResponse = await this.generateAIAutoResponse(email, category, sentimentData, orderContext);

      console.log(`🤖 Resposta IA gerada - Assunto: "${aiResponse.subject}"`);

      // Get design configuration for this email
      const designConfig = await this.getDesignConfigForEmail(email);
      console.log("🎨 Design config loaded:", {
        logo: designConfig.logo,
        primaryColor: designConfig.primaryColor,
        hasSignature: !!(designConfig.signature?.name || designConfig.signature?.position || designConfig.signature?.phone || designConfig.signature?.email || designConfig.signature?.website)
      });

      // Carregar template HTML
      const templatePath = path.join(process.cwd(), "email-templates", "ai-response-template.html");
      console.log("🔍 Carregando template de:", templatePath);
      
      let htmlTemplate: string;
      try {
        htmlTemplate = fs.readFileSync(templatePath, "utf-8");
        console.log("✅ Template HTML carregado com sucesso - tamanho:", htmlTemplate.length, "caracteres");
      } catch (templateError) {
        console.error("❌ ERRO ao carregar template HTML:", templateError);
        throw new Error(`Falha ao carregar template: ${templateError}`);
      }
      
      // Substituir placeholder com conteúdo formatado
      const formattedContent = this.formatAIResponseForEmail(aiResponse.content);
      
      // Detectar URL base para as imagens
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://n1global.app' 
        : 'https://ed22092a-b3ec-459c-966a-df5b32c8942a-00-261ipz4lh9ym0.spock.replit.dev';
      
      // Aplicar configurações de design no template
      const logoUrl = designConfig.logo.startsWith('/') ? `${baseUrl}${designConfig.logo}` : designConfig.logo;
      const cardOpacityHex = Math.round(designConfig.card.backgroundOpacity * 255).toString(16).padStart(2, '0');
      const cardBackgroundWithOpacity = `${designConfig.card.backgroundColor}${cardOpacityHex}`;
      
      // Check if has custom signature
      const hasCustomSignature = !!(designConfig.signature?.name || designConfig.signature?.position || designConfig.signature?.phone || designConfig.signature?.email || designConfig.signature?.website);
      
      let htmlContent = htmlTemplate
        .replace(/{{AI_RESPONSE_CONTENT}}/g, formattedContent)
        .replace(/{{LOGO_URL}}/g, logoUrl)
        .replace(/{{LOGO_ALIGNMENT}}/g, designConfig.logoAlignment)
        .replace(/{{PRIMARY_COLOR}}/g, designConfig.primaryColor)
        .replace(/{{BACKGROUND_COLOR}}/g, designConfig.backgroundColor)
        .replace(/{{TEXT_COLOR}}/g, designConfig.textColor)
        .replace(/{{SECONDARY_TEXT_COLOR}}/g, designConfig.secondaryTextColor)
        .replace(/{{CARD_BACKGROUND_COLOR}}/g, cardBackgroundWithOpacity)
        .replace(/{{BORDER_COLOR}}/g, designConfig.card.borderColor)
        .replace(/{{BORDER_RADIUS}}/g, designConfig.card.borderRadius.toString())
        .replace(/{{BORDER_WIDTH_TOP}}/g, designConfig.card.borderWidth.top.toString())
        .replace(/{{BORDER_WIDTH_RIGHT}}/g, designConfig.card.borderWidth.right.toString())
        .replace(/{{BORDER_WIDTH_BOTTOM}}/g, designConfig.card.borderWidth.bottom.toString())
        .replace(/{{BORDER_WIDTH_LEFT}}/g, designConfig.card.borderWidth.left.toString());

      // Handle signature conditionals - show/hide elements based on signature data
      if (hasCustomSignature) {
        // Show custom signature, hide Sofia signature
        htmlContent = htmlContent.replace(/id="custom-signature" style="display: none;"/g, 'id="custom-signature" style="display: block;"');
        htmlContent = htmlContent.replace(/id="sofia-signature"/g, 'id="sofia-signature" style="display: none;"');
        
        // Show individual signature fields that have content
        if (designConfig.signature.name) {
          htmlContent = htmlContent.replace(/id="sig-name" style="margin: 5px 0 0 0; display: none;"/g, 'id="sig-name" style="margin: 5px 0 0 0; display: block;"');
        }
        if (designConfig.signature.position) {
          htmlContent = htmlContent.replace(/id="sig-position" style="margin: 5px 0 0 0; font-size: 12px; display: none;"/g, 'id="sig-position" style="margin: 5px 0 0 0; font-size: 12px; display: block;"');
        }
        if (designConfig.signature.phone) {
          htmlContent = htmlContent.replace(/id="sig-phone" style="margin: 2px 0; display: none;"/g, 'id="sig-phone" style="margin: 2px 0; display: block;"');
        }
        if (designConfig.signature.email) {
          htmlContent = htmlContent.replace(/id="sig-email" style="margin: 2px 0; display: none;"/g, 'id="sig-email" style="margin: 2px 0; display: block;"');
        }
        if (designConfig.signature.website) {
          htmlContent = htmlContent.replace(/id="sig-website" style="margin: 2px 0; display: none;"/g, 'id="sig-website" style="margin: 2px 0; display: block;"');
        }
      } else {
        // Show Sofia signature, hide custom signature
        htmlContent = htmlContent.replace(/id="custom-signature" style="display: none;"/g, 'id="custom-signature" style="display: none;"');
        htmlContent = htmlContent.replace(/id="sofia-signature"/g, 'id="sofia-signature" style="display: block;"');
      }
      
      // Replace signature variables
      htmlContent = htmlContent
        .replace(/{{SIGNATURE_NAME}}/g, designConfig.signature.name || '')
        .replace(/{{SIGNATURE_POSITION}}/g, designConfig.signature.position || '')
        .replace(/{{SIGNATURE_PHONE}}/g, designConfig.signature.phone || '')
        .replace(/{{SIGNATURE_EMAIL}}/g, designConfig.signature.email || '')
        .replace(/{{SIGNATURE_WEBSITE}}/g, designConfig.signature.website || '');

      console.log("🎨 Template processado com configurações personalizadas - HTML final tem", htmlContent.length, "caracteres");

      // Prepare threading headers for proper email conversation
      const threadingHeaders: any = {
        from: `Sofia - Atendimento <suporte@${process.env.MAILGUN_DOMAIN}>`,
        to: email.from,
        "h:Reply-To": `suporte@${process.env.MAILGUN_DOMAIN}`,
        text: aiResponse.content,
        html: htmlContent,
      };

      // Add "Re:" to subject if not already present
      const originalSubject = email.subject;
      threadingHeaders.subject = originalSubject.toLowerCase().startsWith('re:') 
        ? aiResponse.subject 
        : `Re: ${originalSubject}`;

      // Add threading headers for proper conversation
      if (email.messageId) {
        threadingHeaders["h:In-Reply-To"] = email.messageId;
        
        // Build References header: original references + original messageId
        const references = email.references 
          ? `${email.references} ${email.messageId}`
          : email.messageId;
        threadingHeaders["h:References"] = references;
      }

      console.log("🧵 Threading headers:", {
        "In-Reply-To": threadingHeaders["h:In-Reply-To"],
        "References": threadingHeaders["h:References"],
        subject: threadingHeaders.subject,
        originalSubject: originalSubject
      });

      // Enviar email com resposta da IA
      const mailgunResponse = await mg.messages.create(
        process.env.MAILGUN_DOMAIN || "",
        threadingHeaders,
      );

      console.log("🤖 Email IA enviado via Mailgun:", mailgunResponse.status);

      // Update email as responded
      await db
        .update(supportEmails)
        .set({
          hasAutoResponse: true,
          autoResponseSentAt: new Date(),
          status: "responded",
        })
        .where(eq(supportEmails.id, email.id));

      console.log(`✅ Resposta automática IA enviada para: ${email.from}`);

      // Add conversation entry for AI response
      const ticket = await db
        .select()
        .from(supportTickets)
        .where(eq(supportTickets.emailId, email.id))
        .limit(1);

      if (ticket[0]) {
        await this.addConversation(ticket[0].id, {
          type: "email_out",
          from: `Sofia - Atendimento <suporte@${process.env.MAILGUN_DOMAIN}>`,
          to: email.from,
          subject: aiResponse.subject,
          content: aiResponse.content,
          messageId: null,
        });

        // Update ticket status to show it was responded by AI but keep it active
        await db
          .update(supportTickets)
          .set({
            status: "in_progress",
            updatedAt: new Date(),
          })
          .where(eq(supportTickets.id, ticket[0].id));

        console.log(
          `📋 Ticket ${ticket[0].ticketNumber} atualizado após resposta IA`,
        );
      }
    } catch (error) {
      console.error("🚨 ERRO CRÍTICO em sendAIAutoResponse:");
      console.error("Tipo do erro:", error instanceof Error ? error.name : typeof error);
      console.error("Mensagem:", error instanceof Error ? error.message : error);
      console.error("Stack trace:", error instanceof Error ? error.stack : error);
      
      // Registrar onde exatamente o erro ocorreu
      if (error instanceof Error) {
        if (error.message.includes('template')) {
          console.error("❌ ERRO no carregamento do template HTML");
        } else if (error.message.includes('Mailgun')) {
          console.error("❌ ERRO no envio via Mailgun");
        } else if (error.message.includes('database') || error.message.includes('db')) {
          console.error("❌ ERRO de banco de dados");
        } else {
          console.error("❌ ERRO desconhecido na função sendAIAutoResponse");
        }
      }
      
      throw error;
    }
  }

  /**
   * Send automatic response (legacy template system - fallback)
   */
  async sendAutoResponse(
    email: SupportEmail,
    category: SupportCategory,
  ): Promise<void> {
    // Get default response for category
    const response = await db
      .select()
      .from(supportResponses)
      .where(
        and(
          eq(supportResponses.categoryId, category.id),
          eq(supportResponses.isActive, true),
          eq(supportResponses.isDefault, true),
        ),
      )
      .limit(1);

    if (!response[0]) {
      console.log(
        `Nenhuma resposta automática encontrada para categoria: ${category.name}`,
      );
      return;
    }

    const template = response[0];

    // Get design configuration for this email
    const designConfig = await this.getDesignConfigForEmail(email);
    console.log("🎨 Template automático usando design config:", {
      logo: designConfig.logo,
      primaryColor: designConfig.primaryColor,
      hasSignature: !!(designConfig.signature?.name)
    });

    // Replace variables in template
    const customerName = email.from.split("@")[0];
    const personalizedSubject = template.subject.replace(
      "{{customer_name}}",
      customerName,
    );
    const personalizedContent = template.textContent
      .replace("{{customer_name}}", customerName)
      .replace("{{original_subject}}", email.subject)
      .replace("{{ticket_number}}", `AUTO-${Date.now()}`);

    // Load HTML template and apply design
    const templatePath = path.join(process.cwd(), "email-templates", "ai-response-template.html");
    let htmlTemplate: string;
    try {
      htmlTemplate = fs.readFileSync(templatePath, "utf-8");
    } catch (templateError) {
      console.error("❌ Erro ao carregar template HTML:", templateError);
      throw new Error("Template HTML não encontrado");
    }

    // Apply design configurations to HTML template
    const processedHtml = htmlTemplate
      .replace(/\{\{LOGO_URL\}\}/g, designConfig.logo || '')
      .replace(/\{\{PRIMARY_COLOR\}\}/g, designConfig.primaryColor || '#0091ff')
      .replace(/\{\{BACKGROUND_COLOR\}\}/g, designConfig.backgroundColor || '#ffffff')
      .replace(/\{\{TEXT_COLOR\}\}/g, designConfig.textColor || '#000000')
      .replace(/\{\{SECONDARY_TEXT_COLOR\}\}/g, designConfig.secondaryTextColor || '#666666')
      .replace(/\{\{CUSTOMER_NAME\}\}/g, customerName)
      .replace(/\{\{AI_RESPONSE\}\}/g, personalizedContent.replace(/\n/g, '<br>'))
      .replace(/\{\{SIGNATURE_NAME\}\}/g, designConfig.signature?.name || 'Equipe de Suporte')
      .replace(/\{\{SIGNATURE_POSITION\}\}/g, designConfig.signature?.position || 'Atendimento ao Cliente')
      .replace(/\{\{SIGNATURE_PHONE\}\}/g, designConfig.signature?.phone || '')
      .replace(/\{\{SIGNATURE_EMAIL\}\}/g, designConfig.signature?.email || '')
      .replace(/\{\{SIGNATURE_WEBSITE\}\}/g, designConfig.signature?.website || '');

    try {
      await mg.messages.create(process.env.MAILGUN_DOMAIN || "", {
        from: `${designConfig.signature?.name || 'Suporte'} <suporte@${process.env.MAILGUN_DOMAIN}>`,
        to: email.from,
        subject: personalizedSubject,
        text: personalizedContent,
        html: processedHtml,
      });

      // Update email as responded
      await db
        .update(supportEmails)
        .set({
          hasAutoResponse: true,
          autoResponseSentAt: new Date(),
          status: "responded",
        })
        .where(eq(supportEmails.id, email.id));

      // Update response usage
      await db
        .update(supportResponses)
        .set({
          timesUsed: sql`${supportResponses.timesUsed} + 1`,
          lastUsed: new Date(),
        })
        .where(eq(supportResponses.id, template.id));

      console.log(`✅ Resposta automática enviada para: ${email.from} com design personalizado`);
    } catch (error) {
      console.error("Erro ao enviar resposta automática:", error);
      throw error;
    }
  }

  /**
   * Add conversation entry to ticket
   */
  async addConversation(
    ticketId: string,
    data: Partial<InsertSupportConversation>,
  ) {
    const conversationData = {
      ticketId,
      type: data.type || "note",
      content: data.content || "",
      from: data.from || null,
      to: data.to || null,
      subject: data.subject || null,
      isInternal: data.isInternal || false,
      messageId: data.messageId || null,
      userId: data.userId || null,
    };

    return await db
      .insert(supportConversations)
      .values(conversationData)
      .returning();
  }

  /**
   * Get tickets with pagination and filters
   */
  async getTickets(
    options: {
      status?: string;
      categoryId?: string;
      priority?: string;
      assignedToUserId?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const {
      status,
      categoryId,
      priority,
      assignedToUserId,
      page = 1,
      limit = 20,
    } = options;
    const offset = (page - 1) * limit;

    let query = db
      .select({
        ticket: supportTickets,
        category: supportCategories,
        email: supportEmails,
      })
      .from(supportTickets)
      .leftJoin(
        supportCategories,
        eq(supportTickets.categoryId, supportCategories.id),
      )
      .leftJoin(supportEmails, eq(supportTickets.emailId, supportEmails.id))
      .orderBy(desc(supportTickets.createdAt))
      .limit(limit)
      .offset(offset);

    // Apply filters
    const conditions = [];
    if (status) conditions.push(eq(supportTickets.status, status));
    if (categoryId) conditions.push(eq(supportTickets.categoryId, categoryId));
    if (priority) conditions.push(eq(supportTickets.priority, priority));
    if (assignedToUserId)
      conditions.push(eq(supportTickets.assignedToUserId, assignedToUserId));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const tickets = await query;

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(supportTickets);

    return {
      tickets,
      total: totalResult[0].count,
      page,
      totalPages: Math.ceil(totalResult[0].count / limit),
    };
  }

  /**
   * Get ticket by ID with full conversation
   */
  async getTicketById(ticketId: string) {
    const [ticket] = await db
      .select({
        ticket: supportTickets,
        category: supportCategories,
        email: supportEmails,
      })
      .from(supportTickets)
      .leftJoin(
        supportCategories,
        eq(supportTickets.categoryId, supportCategories.id),
      )
      .leftJoin(supportEmails, eq(supportTickets.emailId, supportEmails.id))
      .where(eq(supportTickets.id, ticketId));

    if (!ticket) return null;

    // Get conversation history
    const conversations = await db
      .select()
      .from(supportConversations)
      .where(eq(supportConversations.ticketId, ticketId))
      .orderBy(supportConversations.createdAt);

    return {
      ...ticket,
      conversations,
    };
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(ticketId: string, status: string, userId?: string) {
    const updateData: any = { status, updatedAt: new Date() };

    if (status === "resolved") {
      updateData.resolvedAt = new Date();
      updateData.resolvedByUserId = userId;
    }

    return await db
      .update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, ticketId))
      .returning();
  }

  /**
   * Mark ticket as read
   */
  async markTicketAsRead(ticketId: string) {
    return await db
      .update(supportTickets)
      .set({ isRead: true, updatedAt: new Date() })
      .where(eq(supportTickets.id, ticketId))
      .returning();
  }

  /**
   * Get support overview cards metrics
   */
  async getOverviewMetrics() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Tickets Abertos
    const openTickets = await db
      .select({ count: count() })
      .from(supportTickets)
      .where(eq(supportTickets.status, "open"));

    // Respondido por IA
    const aiResponded = await db
      .select({ count: count() })
      .from(supportEmails)
      .where(eq(supportEmails.hasAutoResponse, true));

    // Tickets no Mês
    const monthlyTickets = await db
      .select({ count: count() })
      .from(supportTickets)
      .where(sql`${supportTickets.createdAt} >= ${monthStart}`);

    // Não Lidos
    const unreadTickets = await db
      .select({ count: count() })
      .from(supportTickets)
      .where(eq(supportTickets.isRead, false));

    return {
      openTickets: openTickets[0].count,
      aiResponded: aiResponded[0].count,
      monthlyTickets: monthlyTickets[0].count,
      unreadTickets: unreadTickets[0].count,
    };
  }

  /**
   * Get support dashboard metrics
   */
  async getDashboardMetrics(period: string = "7d") {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "1d":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Total emails received
    const emailsReceived = await db
      .select({ count: count() })
      .from(supportEmails)
      .where(sql`${supportEmails.receivedAt} >= ${startDate}`);

    // Tickets by status
    const ticketsByStatus = await db
      .select({
        status: supportTickets.status,
        count: count(),
      })
      .from(supportTickets)
      .where(sql`${supportTickets.createdAt} >= ${startDate}`)
      .groupBy(supportTickets.status);

    // Tickets by category
    const ticketsByCategory = await db
      .select({
        categoryName: supportCategories.displayName,
        count: count(),
      })
      .from(supportTickets)
      .leftJoin(
        supportCategories,
        eq(supportTickets.categoryId, supportCategories.id),
      )
      .where(sql`${supportTickets.createdAt} >= ${startDate}`)
      .groupBy(supportCategories.displayName);

    // Automation rate
    const totalEmails = emailsReceived[0].count;
    const autoResponded = await db
      .select({ count: count() })
      .from(supportEmails)
      .where(
        and(
          sql`${supportEmails.receivedAt} >= ${startDate}`,
          eq(supportEmails.hasAutoResponse, true),
        ),
      );

    const automationRate =
      totalEmails > 0 ? (autoResponded[0].count / totalEmails) * 100 : 0;

    return {
      emailsReceived: totalEmails,
      ticketsByStatus: ticketsByStatus.reduce(
        (acc, item) => ({ ...acc, [item.status]: item.count }),
        {},
      ),
      ticketsByCategory,
      automationRate: Number(automationRate.toFixed(2)),
      period,
    };
  }

  /**
   * Send a reply to a support ticket via email
   */
  async replyToTicket(
    ticketId: string,
    message: string,
    agentName?: string,
  ): Promise<void> {
    try {
      console.log("🎯 SupportService.replyToTicket called with:", {
        ticketId,
        messageLength: message.length,
        agentName,
      });

      // Check environment variables
      console.log("🌍 Environment check:", {
        hasMailgunDomain: !!process.env.MAILGUN_DOMAIN,
        hasMailgunApiKey: !!process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN || "NOT_SET",
      });

      // Get ticket details
      console.log("🔍 Fetching ticket details...");
      const ticketResult = await db
        .select({
          ticket: supportTickets,
          email: supportEmails,
        })
        .from(supportTickets)
        .leftJoin(supportEmails, eq(supportTickets.emailId, supportEmails.id))
        .where(eq(supportTickets.id, ticketId))
        .limit(1);

      console.log("📋 Ticket query result:", {
        found: ticketResult.length,
        ticketId: ticketResult[0]?.ticket?.id,
        emailId: ticketResult[0]?.email?.id,
      });

      if (ticketResult.length === 0) {
        console.error("❌ Ticket not found in database");
        throw new Error("Ticket não encontrado");
      }

      const { ticket, email } = ticketResult[0];
      if (!email) {
        console.error("❌ Original email not found for ticket");
        throw new Error("Email original não encontrado");
      }

      // Get design configuration for this email
      const designConfig = await this.getDesignConfigForEmail(email);
      console.log("🎨 Resposta manual usando design config:", {
        logo: designConfig.logo,
        primaryColor: designConfig.primaryColor,
        hasSignature: !!(designConfig.signature?.name)
      });

      // Send reply via Mailgun
      const replySubject = `Re: ${email.subject}`;
      const senderName = designConfig.signature?.name || agentName || "Equipe de Suporte";

      console.log("📧 Preparing to send email via Mailgun...");
      console.log("Email details:", {
        from: `${senderName} <suporte@${process.env.MAILGUN_DOMAIN}>`,
        to: ticket.customerEmail,
        subject: replySubject,
        ticketNumber: ticket.ticketNumber,
      });

      // Load HTML template and apply design
      const templatePath = path.join(process.cwd(), "email-templates", "ai-response-template.html");
      let htmlTemplate: string;
      try {
        htmlTemplate = fs.readFileSync(templatePath, "utf-8");
      } catch (templateError) {
        console.error("❌ Erro ao carregar template HTML:", templateError);
        throw new Error("Template HTML não encontrado");
      }

      // Apply design configurations to HTML template
      const processedHtml = htmlTemplate
        .replace(/\{\{LOGO_URL\}\}/g, designConfig.logo || '')
        .replace(/\{\{PRIMARY_COLOR\}\}/g, designConfig.primaryColor || '#0091ff')
        .replace(/\{\{BACKGROUND_COLOR\}\}/g, designConfig.backgroundColor || '#ffffff')
        .replace(/\{\{TEXT_COLOR\}\}/g, designConfig.textColor || '#000000')
        .replace(/\{\{SECONDARY_TEXT_COLOR\}\}/g, designConfig.secondaryTextColor || '#666666')
        .replace(/\{\{CUSTOMER_NAME\}\}/g, ticket.customerName || 'Cliente')
        .replace(/\{\{AI_RESPONSE\}\}/g, message.replace(/\n/g, '<br>'))
        .replace(/\{\{SIGNATURE_NAME\}\}/g, designConfig.signature?.name || senderName)
        .replace(/\{\{SIGNATURE_POSITION\}\}/g, designConfig.signature?.position || 'Atendimento ao Cliente')
        .replace(/\{\{SIGNATURE_PHONE\}\}/g, designConfig.signature?.phone || '')
        .replace(/\{\{SIGNATURE_EMAIL\}\}/g, designConfig.signature?.email || '')
        .replace(/\{\{SIGNATURE_WEBSITE\}\}/g, designConfig.signature?.website || '');

      const mailgunResponse = await mg.messages.create(
        process.env.MAILGUN_DOMAIN || "",
        {
          from: `${senderName} <suporte@${process.env.MAILGUN_DOMAIN}>`,
          to: ticket.customerEmail,
          "h:Reply-To": `suporte@${process.env.MAILGUN_DOMAIN}`,
          subject: replySubject,
          text: message,
          html: processedHtml,
        },
      );

      console.log("📧 Mailgun response:", mailgunResponse);

      // Update ticket status to 'responded' and add conversation record
      console.log("💾 Updating database...");
      await db.transaction(async (tx) => {
        // Update ticket
        console.log("🔄 Updating ticket status...");
        await tx
          .update(supportTickets)
          .set({
            status: "in_progress", // Set to in_progress after agent response
            updatedAt: new Date(),
          })
          .where(eq(supportTickets.id, ticketId));

        // Add conversation record
        console.log("💬 Adding conversation record...");
        await tx.insert(supportConversations).values({
          ticketId: ticketId,
          type: "email_out",
          from: `suporte@${process.env.MAILGUN_DOMAIN}`,
          to: ticket.customerEmail,
          subject: replySubject,
          content: message,
          isInternal: false,
          userId: null, // TODO: Get user ID from auth
        });
      });

      console.log(
        `✅ Reply sent successfully for ticket ${ticket.ticketNumber} to ${ticket.customerEmail}`,
      );
    } catch (error) {
      console.error("❌ SupportService.replyToTicket error:", error);
      console.error("❌ Error type:", typeof error);
      console.error("❌ Error constructor:", error?.constructor?.name);
      if (error instanceof Error) {
        console.error("❌ Error message:", error.message);
        console.error("❌ Error stack:", error.stack);
      }
      throw new Error(
        `Falha ao enviar resposta do ticket: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Send new message to recipient and create a new ticket
   */
  async sendNewMessage(
    recipient: string,
    message: string,
    agentName?: string,
  ): Promise<{ ticketId: string }> {
    try {
      console.log("🎯 SupportService.sendNewMessage called with:", {
        recipient,
        messageLength: message.length,
        agentName,
      });

      // Check environment variables
      console.log("🌍 Environment check:", {
        hasMailgunDomain: !!process.env.MAILGUN_DOMAIN,
        hasMailgunApiKey: !!process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN || "NOT_SET",
      });

      const ticketNumber = `TKT-${Date.now().toString().slice(-8)}`;
      const senderName = agentName || "Equipe de Suporte";
      const subject = `Mensagem da equipe de suporte - ${ticketNumber}`;

      console.log("📧 Preparing to send email via Mailgun...");
      console.log("Email details:", {
        from: `${senderName} <suporte@${process.env.MAILGUN_DOMAIN}>`,
        to: recipient,
        subject: subject,
        ticketNumber: ticketNumber,
      });

      // Send email via Mailgun
      const mailgunResponse = await mg.messages.create(
        process.env.MAILGUN_DOMAIN || "",
        {
          from: `${senderName} <suporte@${process.env.MAILGUN_DOMAIN}>`,
          to: recipient,
          "h:Reply-To": `suporte@${process.env.MAILGUN_DOMAIN}`,
          subject: subject,
          text: message,
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFvElEQVR4nO2bW2wUVRjHf7OztAul3EpbKBcpCCJYQS5JfTAaE0w0IZo0xgfUF1980BgTE/XBB18MiQ/GF40PJiYmJr6YaKKJJj4Y8AEjmMiFcm/pFaEtlNJLge7uOCez3ZnuzOzMzs7szibZL5lkd2bO+c753//7vnPOLECRIkWKFClSpEiR/wMQO5lhFb4s5bAs5xMsAYvAlqWgJmCRhDEwMcYQgxF+TiQMjCNNIMZ4HWJ8xhgjAcYJxhhjxhijdBFjIzKXGFMfJLwWEuZYU1Q7qL4+FW0/qnz/VbKk+kq5TcP0RVJZlL2omIZl7+8lHW/vIfsqvh7fEhOgC6d4I+n4bwJ9B2O1mUhLo8XfrIEoXwmEsyO02VeP8VtNTGsaBTVBR1dGKz3eEANLON1SBSEMLBJiGIFRShgjmCBEZ4ZggBEKQsKTDFaHK6Cx2EpJtM+4bAhBON4QDxmCEYwgwLlpCMEIQTBCKIHRJoByjj7A7VjVAiw5BwAfqX8Ff5/sKgJcXQFLFi3DJy8+g4cfXI6HVi7DzfOr8a+tB5YNWLJdFUCApMRFqO+KgHMaXWYMnOK5o4+NX6dUglbk0u9H+1EZq8DDK+7Dh0/swOGW0xi83+VUqEy4XAEI5xZBJaU8Cl3ZMOWKACtGlV9/S6w2L1iHJ9c+iG2f7MbBs93oGRh0B9WcLZAygQ7rIlNB5YOWJ7c/jq37j+JPvwc3LV6Hl9c/jO3b9+CgfQm3+v3IBAW/DyCXC+Rrp7kGQMYjN9bg6dWrsOPLf3Cqu0eZVBULafnJ6qQTCBvOp+z3TZJGSaytAY+sWYEdh39Hzc1Vju88YLgGQPrI7QLZzLZWb3q98bKtTH31LFdRPFdw2v7QZQTdAaAZONWvLXBpAWggWjmrPEZ9iYuKb7hkCdW8AIqVnSwHOBs4eDt8vWzrSC5kWL1++wGE8NvwjhzgbGDl+60HEICW7xwAyBVu3vdU5wv7ycAZCqLJh2v9HjwZOEPB9tXlAw/twHrpZoSzCZcfJn0fJsRmkZbAhqb0U5YPu12bHLzHKftRO8Dp3j4dweNK3k/ldbvUz3vHcuZwZf/JhK5wdJJpGICNXTy3fvI8QV7bJwPHs/mFvFdyJQDOqSTy/uaadP4iB67Z3k/BgZs93xd0fZKNAGSJX2j7YYmfO2MHPOe8vY8LGqLk/YAMocG5jA7fqPdNbN/cAY+kqAygMX7t7ztg9wBQ2b8xACb5vrnqXA3c7GnvBFDZvzEA6aq8g7lDhQCMgGhCjJQz2Bq3BeCkFNrIbJRUPgF7M5P2BZD0v9ttP2jbD1oMgbbvlhDaLnSjtKLSKSGZ//WJkLJPe6QJOKffqe2pYr3A/b4uANz+bbc9NbGNthLXpPetbOBlCKJLiOz+qKPfqA8WrG5Bpjzh2n7Qth+07eutEwBdH6DJD7Kt7LZkr12uXIhEe0K3fqPpLh3vG12O2wGgI9H3Q/N+0+XKYP2myx96xHqQ8YOX3wD5E6Da8oPufSvvh35lVrG7fjYu+90AaPfHBWtAYRcHJCmGYKG6fdVK1NPfuLgNNz+FPjEV9Ku1gvdtRl5wPEcMAdWe7Jci8mL7LhejJiZA0lEOtKhNZFf7/QQlIgFg3u0OVtQ0i1LZWcm2+FqXywFqSACo9X6H8wVNOxrCIpgw5Xq/HXBI6PZ+S6J3hOcLVgtNdZJJcIKAINudHBDhbG8CX0o1G7PdhFRG6B4h4fzg3tD3EG1zl8uFnfCl3fVOgJt2d7jBxhLa/K8S3R8bL3d9gTZd9+2iXZdPfD/gZrR8p0dHO8lIB0TnJN2L1IKO8XfP/xaHlWxfUOGkjuF39v8qUqRIkSJFihQpUqTIJP8BFvT4rKXOwDcAAAAASUVORK5CYII=" alt="N1 Support" style="width: 64px; height: 64px;">
              <h2 style="color: #333; margin: 20px 0 10px 0;">Mensagem da Equipe de Suporte</h2>
              <p style="color: #666; margin: 0;">Ticket: ${ticketNumber}</p>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #333; line-height: 1.6; white-space: pre-wrap;">${message}</p>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 14px; text-align: center;">
              Esta mensagem foi enviada pela nossa equipe de suporte.<br>
              Para responder, basta responder a este email.
            </p>
          </div>
        `,
        },
      );

      console.log("📧 Mailgun response:", mailgunResponse);

      // Create email record in database
      console.log("💾 Saving email to database...");
      const [emailRecord] = await db
        .insert(supportEmails)
        .values({
          from: `${senderName} <suporte@${process.env.MAILGUN_DOMAIN}>`,
          to: recipient,
          subject: subject,
          textContent: message,
          messageId: mailgunResponse.id || ticketNumber,
          status: "sent",
        })
        .returning();

      // Create ticket record
      console.log("💾 Creating new ticket...");
      const [ticketRecord] = await db
        .insert(supportTickets)
        .values({
          emailId: emailRecord.id,
          ticketNumber: ticketNumber,
          customerEmail: recipient,
          subject: subject,
          description: message, // Use description field instead of content
          status: "open",
          priority: "medium",
          categoryId: "manual", // Default to manual category
        })
        .returning();

      // Add conversation record
      console.log("💬 Adding conversation record...");
      await db.insert(supportConversations).values({
        ticketId: ticketRecord.id,
        type: "email_out",
        from: `${senderName} <suporte@${process.env.MAILGUN_DOMAIN}>`,
        to: recipient,
        subject: subject,
        content: message,
        isInternal: false,
        userId: null,
      });

      console.log(
        `✅ New message sent successfully. Ticket ${ticketNumber} created for ${recipient}`,
      );

      return { ticketId: ticketRecord.id };
    } catch (error) {
      console.error("❌ SupportService.sendNewMessage error:", error);
      console.error("❌ Error type:", typeof error);
      console.error("❌ Error constructor:", error?.constructor?.name);
      if (error instanceof Error) {
        console.error("❌ Error message:", error.message);
        console.error("❌ Error stack:", error.stack);
      }
      throw new Error(
        `Falha ao enviar nova mensagem: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get operation ID from email based on email domain mapping
   */
  private async getOperationIdFromEmail(email: SupportEmail): Promise<string> {
    try {
      console.log('🔍 Getting operation ID for email:', { to: email.to, from: email.from });
      
      // Extract domain from the 'to' email address
      const toDomain = email.to.includes('@') ? email.to.split('@')[1] : null;
      
      if (!toDomain) {
        console.log('⚠️ Could not extract domain from email:', email.to);
        // Fallback to first operation
        const operationsList = await db.select().from(operations).limit(1);
        const fallbackId = operationsList[0]?.id || 'fb1d724d-6b9e-49c1-ad74-9a359527bbf4';
        console.log('⚠️ Using fallback operation ID:', fallbackId);
        return fallbackId;
      }

      console.log('🔍 Extracted domain:', toDomain);

      // Find operation by domain in customer support operations
      const [operation] = await db
        .select({
          operationId: customerSupportOperations.operationId,
          emailDomain: customerSupportOperations.emailDomain
        })
        .from(customerSupportOperations)
        .where(eq(customerSupportOperations.emailDomain, toDomain))
        .limit(1);

      if (!operation) {
        console.log('⚠️ No operation found for domain:', toDomain);
        // Fallback to first operation
        const operationsList = await db.select().from(operations).limit(1);
        const fallbackId = operationsList[0]?.id || 'fb1d724d-6b9e-49c1-ad74-9a359527bbf4';
        console.log('⚠️ Using fallback operation ID:', fallbackId);
        return fallbackId;
      }

      console.log('✅ Found operation for domain:', toDomain, '-> Operation ID:', operation.operationId);
      return operation.operationId;
      
    } catch (error) {
      console.error('❌ Error getting operation ID from email:', error);
      // Fallback to first operation in case of error
      const operationsList = await db.select().from(operations).limit(1);
      const fallbackId = operationsList[0]?.id || 'fb1d724d-6b9e-49c1-ad74-9a359527bbf4';
      console.log('⚠️ Using fallback operation ID due to error:', fallbackId);
      return fallbackId;
    }
  }

  /**
   * Get active AI directives for an operation
   */
  private async getActiveDirectives(operationId: string) {
    console.log('🔍 Getting AI directives for operation:', operationId);
    
    const directives = await db
      .select()
      .from(aiDirectives)
      .where(and(
        eq(aiDirectives.operationId, operationId),
        eq(aiDirectives.isActive, true)
      ))
      .orderBy(aiDirectives.sortOrder, aiDirectives.createdAt);
    
    console.log(`📋 Found ${directives.length} active directives for operation ${operationId}:`);
    directives.forEach((directive, index) => {
      console.log(`  ${index + 1}. [${directive.type}] ${directive.title}: ${directive.content.substring(0, 100)}...`);
    });
    
    return directives;
  }

  /**
   * Build dynamic prompt using active directives
   */
  private async buildDynamicPrompt(
    email: SupportEmail,
    category: SupportCategory,
    directives: any[],
    sentimentData?: {
      sentiment: string;
      emotion: string;
      urgency: string;
      tone: string;
      hasTimeConstraint: boolean;
      escalationRisk: number;
    },
    orderContext?: EmailOrderContext,
    adminDirectives: any[] = []
  ): Promise<string> {
    console.log('🛠️ Building dynamic prompt with', directives.length, 'operation directives and', adminDirectives.length, 'admin directives');
    const customerName = email.from.split("@")[0];

    // Combine both admin and operation directives
    const allDirectives = [...adminDirectives, ...directives];

    // Group directives by type
    const directivesByType = allDirectives.reduce((acc, directive) => {
      if (!acc[directive.type]) acc[directive.type] = [];
      acc[directive.type].push(directive);
      return acc;
    }, {} as Record<string, any[]>);

    console.log('📊 Directives grouped by type:', {
      n1_info: directivesByType.n1_info?.length || 0,
      store_info: directivesByType.store_info?.length || 0,
      product_info: directivesByType.product_info?.length || 0,
      response_style: directivesByType.response_style?.length || 0,
      custom: directivesByType.custom?.length || 0
    });

    // Build N1 platform information section (from admin directives)
    const n1InfoSection = directivesByType.n1_info?.length > 0 
      ? `
INFORMAÇÕES DA PLATAFORMA N1 HUB:
${directivesByType.n1_info.map(d => `- ${d.title}: ${d.content}`).join('\n')}
` 
      : '';

    // Build store information section
    const storeInfoSection = directivesByType.store_info?.length > 0 
      ? (() => {
          console.log('✅ Using custom store_info directives');
          return `INFORMAÇÕES DA EMPRESA:
${directivesByType.store_info.map(d => `- ${d.content}`).join('\n')}
`;
        })()
      : (() => {
          console.log('⚠️ Using fallback store_info (hardcoded)');
          return `INFORMAÇÕES DA EMPRESA:
- Tempo de entrega: 2 a 7 dias úteis (maioria chega em até 3 dias úteis)
- Pagamento: Na entrega (COD - Cash on Delivery)  
- Horário: Segunda a sexta, 9h às 18h
`;
        })();

    // Build product information section
    const productInfoSection = directivesByType.product_info?.length > 0 
      ? `
INFORMAÇÕES DOS PRODUTOS:
${directivesByType.product_info.map(d => `- ${d.content}`).join('\n')}
` 
      : '';

    // Build response style section
    const responseStyleSection = directivesByType.response_style?.length > 0 
      ? `
DIRETRIZES DE ATENDIMENTO PERSONALIZADAS:
${directivesByType.response_style.map(d => `- ${d.content}`).join('\n')}
` 
      : '';

    // Build custom directives section
    const customSection = directivesByType.custom?.length > 0 
      ? `
DIRETRIZES ESPECÍFICAS:
${directivesByType.custom.map(d => `- ${d.title}: ${d.content}`).join('\n')}
` 
      : '';

    // Build emotional context section
    const emotionalContextSection = sentimentData ? `
CONTEXTO EMOCIONAL DO CLIENTE:
- Sentimento: ${sentimentData.sentiment}
- Emoção: ${sentimentData.emotion}
- Urgência: ${sentimentData.urgency}
- Tom: ${sentimentData.tone}
- Prazo mencionado: ${sentimentData.hasTimeConstraint ? 'Sim' : 'Não'}
- Risco de escalação: ${sentimentData.escalationRisk}/10

INSTRUÇÕES BASEADAS NO CONTEXTO EMOCIONAL:
${sentimentData.sentiment === 'muito_negativo' || sentimentData.sentiment === 'negativo' ? 
  '- Use linguagem mais empática e acolhedora\n- Ofereça soluções prioritárias\n- Demonstre compreensão da frustração' : ''}
${sentimentData.escalationRisk >= 7 ? 
  '- ATENÇÃO: Alto risco de escalação - seja especialmente cuidadosa\n- Ofereça escalação para supervisor se necessário' : ''}
${sentimentData.hasTimeConstraint ? 
  '- Cliente mencionou prazo - priorize urgência na resposta' : ''}
${sentimentData.emotion === 'ansioso' || sentimentData.emotion === 'preocupado' ? 
  '- Cliente demonstra ansiedade - tranquilize e forneça informações claras' : ''}

` : '';

    // Build order context section
    const orderContextSection = orderContext && orderContext.customerOrders.length > 0 ? (() => {
      console.log('📦 Adding order context to prompt:', orderContext.customerOrders.length, 'orders');
      
      const ordersInfo = orderContext.customerOrders
        .slice(0, 5) // Limite de 5 pedidos para não sobrecarregar o prompt
        .map(orderMatch => {
          const order = orderMatch.order;
          return `  • Pedido ${order.id} (${orderMatch.confidence} confiança):
    - Status: ${order.status || 'Não informado'}
    - Data: ${order.orderDate ? new Date(order.orderDate).toLocaleDateString('pt-BR') : 'Não informada'}
    - Valor: ${order.orderValue ? `€${order.orderValue}` : 'Não informado'}
    - Produtos: ${order.products?.length || 0} itens
    - Endereço: ${order.customerAddress || 'Não informado'}${order.trackingCode ? `
    - Rastreamento: ${order.trackingCode}` : ''}`;
        }).join('\n');

      const customerStats = orderContext.customerStats;
      const suggestedActions = orderContext.suggestedActions;

      return `
INFORMAÇÕES DOS PEDIDOS DO CLIENTE:
📊 Estatísticas do Cliente:
- Total de pedidos: ${customerStats.totalOrders}
- Pedidos entregues: ${customerStats.deliveredOrders}
- Pedidos cancelados: ${customerStats.cancelledOrders}
- Valor total: €${customerStats.totalValue.toFixed(2)}
- Tipo de cliente: ${customerStats.customerType === 'vip' ? 'VIP (cliente fiel)' : 
                     customerStats.customerType === 'frequent' ? 'Frequente' : 'Novo'}

📋 Pedidos Encontrados:
${ordersInfo}

🎯 Ações Sugeridas Automaticamente:
${suggestedActions.length > 0 ? 
  suggestedActions.map(action => 
    `- ${action.action === 'cancel_order' ? 'CANCELAR' : 
        action.action === 'update_address' ? 'ALTERAR ENDEREÇO' : 
        action.action === 'provide_tracking' ? 'FORNECER RASTREAMENTO' : action.action} 
     do pedido ${action.orderId}: ${action.reason}`
  ).join('\n') : 
  '- Nenhuma ação automática identificada'}

INSTRUÇÕES ESPECÍFICAS PARA PEDIDOS:
${suggestedActions.some(a => a.action === 'cancel_order') ? 
  '🚨 CANCELAMENTO DETECTADO: Se o cliente realmente quer cancelar, confirme o pedido específico e execute o cancelamento automaticamente.' : ''}
${suggestedActions.some(a => a.action === 'update_address') ? 
  '📍 ALTERAÇÃO DE ENDEREÇO DETECTADA: Se o cliente quer alterar endereço, confirme os novos dados e execute a alteração.' : ''}
${suggestedActions.some(a => a.action === 'provide_tracking') ? 
  '📦 RASTREAMENTO SOLICITADO: Forneça informações detalhadas de rastreamento se disponível.' : ''}
${customerStats.customerType === 'vip' ? 
  '👑 CLIENTE VIP: Ofereça atendimento premium, prioridade e considere benefícios extras.' : ''}
${customerStats.cancelledOrders > customerStats.deliveredOrders ? 
  '⚠️ PERFIL DE RISCO: Cliente tem muitos cancelamentos - seja especialmente atencioso.' : ''}

`;
    })() : '';

    // Construct the complete prompt
    const prompt = `
Você é Sofia, uma agente de atendimento ao cliente experiente e empática. 

${n1InfoSection}${storeInfoSection}${productInfoSection}${responseStyleSection}${customSection}${emotionalContextSection}${orderContextSection}
EMAIL ORIGINAL:
Remetente: ${email.from}
Assunto: ${email.subject}  
Categoria: ${category.displayName}
Conteúdo: ${email.textContent || email.htmlContent}

IMPORTANTE: Responda APENAS com JSON válido (sem quebras de linha no content, use \\n) no formato:

METODOLOGIA DE ATENDIMENTO:

1. ANÁLISE INICIAL:
- Identifique o problema principal E problemas secundários
- Classifique urgência: CRÍTICO / MODERADO / BAIXO
- Detecte emoção: Frustrado / Ansioso / Neutro / Satisfeito

2. ESTRUTURA DA RESPOSTA:
[SAUDAÇÃO PERSONALIZADA]
[RECONHECIMENTO/EMPATIA]
[AÇÃO ESPECÍFICA TOMADA]
[INFORMAÇÕES DETALHADAS]
[PRÓXIMOS PASSOS]
[PREVENÇÃO/VALOR AGREGADO]
[FECHAMENTO PROFISSIONAL]

3. PADRÕES DE QUALIDADE:
✅ ESPECIFICIDADE: Números, datas, horários exatos
✅ PROATIVIDADE: Antecipe dúvidas relacionadas
✅ PERSONALIZAÇÃO: Use nome, histórico, contexto específico
✅ SOLUCIONISMO: Ofereça alternativas quando não puder atender
✅ FOLLOW-UP: Indique quando e como acompanhar

❌ NUNCA:
- Frases genéricas ou templates óbvios
- Promessas vagas ("em breve", "logo")
- Transferir responsabilidade ("sistema", "política")
- Ignorar tom emocional do cliente

BANCO DE RESPOSTAS EMPÁTICAS:

Cliente Frustrado:
- "Entendo perfeitamente sua frustração, [Nome]. Ninguém gosta de [situação]. Vou resolver isso agora mesmo."

Cliente Ansioso:
- "Fico feliz em esclarecer isso para você, [Nome]. É natural ter essa preocupação."

Cliente Neutro/Informativo:
- "Perfeito, [Nome]! Vou te ajudar com todas as informações que precisa."

Cliente Satisfeito:
- "Que bom saber que está tudo perfeito! Fico muito feliz em ajudar."

INDICADORES DE QUALIDADE:

RESPOSTA EXCELENTE DEVE TER:
✅ Nome do cliente usado pelo menos 1 vez
✅ Ação específica mencionada no primeiro parágrafo
✅ Prazo ou data específica (não "em breve")
✅ Próximo passo claro para o cliente
✅ Tom empático apropriado à situação
✅ Informação além do que foi perguntado (valor agregado)
✅ Fechamento que convida continuidade

{
  "subject": "Assunto da resposta",
  "content": "Conteúdo da resposta em português empático e específico (USE \\n para quebras de linha, NÃO use quebras reais)"
}
`;

    return prompt;
  }

  /**
   * Execute automatic actions suggested by the AI system
   */
  private async executeAutomaticActions(
    suggestedActions: EmailOrderContext['suggestedActions'],
    operationId: string
  ): Promise<void> {
    console.log(`🎯 Starting execution of ${suggestedActions.length} automatic actions`);

    for (const action of suggestedActions) {
      try {
        console.log(`🔄 Executing action: ${action.action} for order ${action.orderId}`);
        
        switch (action.action) {
          case 'cancel_order':
            await this.executeOrderCancellation(action.orderId, operationId, action.reason);
            break;
            
          case 'update_address':
            console.log(`📍 Address update for order ${action.orderId} - manual verification required`);
            // Note: Address updates require new address data, so we can't fully automate this
            // The AI will ask the customer for the new address details
            break;
            
          case 'provide_tracking':
            console.log(`📦 Tracking info for order ${action.orderId} - already included in AI response`);
            // Tracking information is already provided in the AI response
            break;
            
          default:
            console.log(`⚠️ Unknown action type: ${action.action}`);
        }
      } catch (error) {
        console.error(`❌ Error executing action ${action.action} for order ${action.orderId}:`, error);
        // Continue with other actions even if one fails
      }
    }
    
    console.log(`✅ Completed execution of automatic actions`);
  }

  /**
   * Execute order cancellation automatically
   */
  private async executeOrderCancellation(
    orderId: string,
    operationId: string,
    reason: string
  ): Promise<void> {
    try {
      console.log(`🚫 Attempting automatic cancellation of order ${orderId}`);
      
      const result = await customerOrderService.cancelOrder(operationId, orderId, {
        reason: reason,
        cancelledBy: 'Sofia AI Assistant'
      });

      if (result.success) {
        console.log(`✅ Order ${orderId} cancelled successfully: ${result.message}`);
        
        // Log the automatic action for audit trail
        const auditLog = {
          action: 'cancel_order',
          orderId: orderId,
          operationId: operationId,
          executedBy: 'Sofia AI Assistant',
          reason: reason,
          timestamp: new Date(),
          result: 'success'
        };
        
        console.log(`📋 Audit log:`, auditLog);
        
      } else {
        console.warn(`⚠️ Order ${orderId} cancellation failed: ${result.message}`);
      }
      
    } catch (error) {
      console.error(`❌ Error during automatic cancellation of order ${orderId}:`, error);
    }
  }

  // ============================================================================
  // ADMIN SUPPORT DIRECTIVES METHODS
  // ============================================================================

  /**
   * Get all active admin support directives
   */
  async getAdminDirectives() {
    return await db
      .select()
      .from(adminSupportDirectives)
      .where(eq(adminSupportDirectives.isActive, true))
      .orderBy(adminSupportDirectives.sortOrder, adminSupportDirectives.createdAt);
  }

  /**
   * Create new admin support directive
   */
  async createAdminDirective(data: {
    type: string;
    title: string;
    content: string;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    const [directive] = await db
      .insert(adminSupportDirectives)
      .values({
        type: data.type,
        title: data.title,
        content: data.content,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();

    return directive;
  }

  /**
   * Update admin support directive
   */
  async updateAdminDirective(id: string, data: {
    type?: string;
    title?: string;
    content?: string;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    const [directive] = await db
      .update(adminSupportDirectives)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(adminSupportDirectives.id, id))
      .returning();

    return directive;
  }

  /**
   * Delete admin support directive
   */
  async deleteAdminDirective(id: string) {
    const result = await db
      .delete(adminSupportDirectives)
      .where(eq(adminSupportDirectives.id, id))
      .returning();

    return result.length > 0;
  }
}

export const supportService = new SupportService();
