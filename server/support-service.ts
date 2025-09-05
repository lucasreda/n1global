import { OpenAI } from 'openai';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import crypto from 'crypto';
import { db } from './db';
import { 
  supportCategories, 
  supportEmails, 
  supportTickets, 
  supportResponses, 
  supportConversations,
  supportMetrics,
  type SupportCategory,
  type SupportEmail,
  type SupportTicket,
  type SupportResponse,
  type InsertSupportEmail,
  type InsertSupportTicket,
  type InsertSupportConversation
} from '@shared/schema';
import { eq, and, desc, sql, count } from 'drizzle-orm';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure Mailgun
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || '',
});

export class SupportService {
  
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
   * Categorize email using OpenAI
   */
  async categorizeEmail(subject: string, content: string): Promise<{
    categoryName: string;
    confidence: number;
    reasoning: string;
    requiresHuman: boolean;
  }> {
    const categories = await this.getCategories();
    const categoryDescriptions = categories.map(cat => 
      `${cat.name}: ${cat.description} (automação: ${cat.isAutomated ? 'sim' : 'não'})`
    ).join('\n');

    const prompt = `
Analise o seguinte email de suporte e categorize-o em uma das categorias disponíveis.

CATEGORIAS DISPONÍVEIS:
${categoryDescriptions}

EMAIL:
Assunto: ${subject}
Conteúdo: ${content}

Responda em JSON no seguinte formato:
{
  "categoryName": "nome_da_categoria",
  "confidence": 85,
  "reasoning": "explicação_da_escolha",
  "requiresHuman": false
}

REGRAS:
1. Use apenas categorias da lista acima
2. confidence deve ser 0-100
3. requiresHuman = true se o email for complexo, tiver tom agressivo, ou mencionar problemas legais
4. Para dúvidas simples sobre rastreamento use "duvidas"
5. Para reclamações sobre produtos use "reclamacoes"
6. Para pedidos de mudança de endereço use "alteracao_endereco"
7. Para cancelamentos use "cancelamento"
8. Para tudo que precisa análise humana use "manual"
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 300,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        categoryName: result.categoryName || 'manual',
        confidence: Math.min(100, Math.max(0, result.confidence || 0)),
        reasoning: result.reasoning || 'Categorização automática falhou',
        requiresHuman: result.requiresHuman || true
      };
    } catch (error) {
      console.error('Erro na categorização por IA:', error);
      return {
        categoryName: 'manual',
        confidence: 0,
        reasoning: 'Erro na análise de IA - necessita revisão manual',
        requiresHuman: true
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

    return replyPrefixes.some(pattern => pattern.test(subject));
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
      cleanSubject = cleanSubject.replace(pattern, '');
    }
    
    return cleanSubject.trim();
  }

  /**
   * Find existing ticket for email reply
   */
  private async findExistingTicketForReply(from: string, subject: string): Promise<SupportTicket | null> {
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
            ilike(supportTickets.subject, `%${originalSubject}%`)
          ),
          in(supportTickets.status, ['open', 'in_progress', 'waiting_customer'])
        )
      )
      .orderBy(desc(supportTickets.createdAt))
      .limit(1);

    if (ticketsBySubject.length > 0) {
      console.log(`📬 Found existing ticket by subject match: ${ticketsBySubject[0].ticketNumber}`);
      return ticketsBySubject[0];
    }

    // Strategy 2: Find most recent open ticket from same customer
    const recentTickets = await db
      .select()
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.customerEmail, from),
          in(supportTickets.status, ['open', 'in_progress', 'waiting_customer'])
        )
      )
      .orderBy(desc(supportTickets.createdAt))
      .limit(1);

    if (recentTickets.length > 0) {
      console.log(`📬 Found existing ticket by recent activity: ${recentTickets[0].ticketNumber}`);
      return recentTickets[0];
    }

    console.log(`📬 No existing ticket found for reply from ${from}`);
    return null;
  }

  /**
   * Process incoming email from webhook
   */
  async processIncomingEmail(webhookData: any): Promise<SupportEmail> {
    const { from, to, subject, text, html, attachments = [], message_id } = webhookData;

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
      console.log(`📧 Adding reply to existing ticket: ${existingTicket.ticketNumber}`);
      
      // Save email
      const emailData: InsertSupportEmail = {
        messageId: message_id,
        from,
        to,
        subject,
        textContent: text,
        htmlContent: html,
        attachments: attachments.length > 0 ? attachments : null,
        categoryId: existingTicket.categoryId,
        aiConfidence: 100,
        aiReasoning: 'Reply to existing ticket - no AI categorization needed',
        status: 'attached_to_ticket',
        requiresHuman: true,
        rawData: webhookData
      };

      const [savedEmail] = await db
        .insert(supportEmails)
        .values(emailData)
        .returning();

      // Add conversation entry
      await this.addConversation(existingTicket.id, {
        type: 'email_in',
        from: from,
        to: to,
        subject: subject,
        content: text || html || '',
        messageId: message_id
      });

      // Update ticket status to show new activity
      if (existingTicket.status === 'waiting_customer') {
        await db
          .update(supportTickets)
          .set({
            status: 'open',
            updatedAt: new Date()
          })
          .where(eq(supportTickets.id, existingTicket.id));
      } else {
        // Just update the timestamp
        await db
          .update(supportTickets)
          .set({ updatedAt: new Date() })
          .where(eq(supportTickets.id, existingTicket.id));
      }

      console.log(`✅ Reply attached to ticket: ${existingTicket.ticketNumber}`);
      return savedEmail;
    }

    // This is a new email, process normally
    console.log(`📧 Processing as new email`);

    // Categorize with AI
    const categorization = await this.categorizeEmail(subject, text || html || '');
    
    // Find category by name
    const category = await db
      .select()
      .from(supportCategories)
      .where(eq(supportCategories.name, categorization.categoryName))
      .limit(1);

    const categoryId = category[0]?.id || null;

    // Save email
    const emailData: InsertSupportEmail = {
      messageId: message_id,
      from,
      to,
      subject,
      textContent: text,
      htmlContent: html,
      attachments: attachments.length > 0 ? attachments : null,
      categoryId,
      aiConfidence: categorization.confidence,
      aiReasoning: categorization.reasoning,
      status: 'categorized',
      requiresHuman: categorization.requiresHuman,
      rawData: webhookData
    };

    const [savedEmail] = await db
      .insert(supportEmails)
      .values(emailData)
      .returning();

    // Create ticket if not manual category or if requires human review
    if (categoryId && (categorization.requiresHuman || category[0]?.name === 'manual')) {
      await this.createTicketFromEmail(savedEmail);
    }

    // Send auto-response if category supports it
    if (categoryId && category[0]?.isAutomated && !categorization.requiresHuman) {
      await this.sendAutoResponse(savedEmail, category[0]);
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
    
    const ticketNumber = `SUP-${year}-${String((count[0]?.count || 0) + 1).padStart(3, '0')}`;

    const ticketData: InsertSupportTicket = {
      emailId: email.id,
      categoryId: email.categoryId!,
      customerEmail: email.from,
      subject: email.subject,
      description: email.textContent || email.htmlContent || '',
      priority: email.isUrgent ? 'high' : 'medium',
      status: 'open',
    };

    const [ticket] = await db
      .insert(supportTickets)
      .values({ ...ticketData, ticketNumber })
      .returning();

    // Add initial conversation entry
    await this.addConversation(ticket.id, {
      type: 'email_in',
      from: email.from,
      to: email.to,
      subject: email.subject,
      content: email.textContent || email.htmlContent || '',
      messageId: email.messageId
    });

    return ticket;
  }

  /**
   * Send automatic response
   */
  async sendAutoResponse(email: SupportEmail, category: SupportCategory): Promise<void> {
    // Get default response for category
    const response = await db
      .select()
      .from(supportResponses)
      .where(and(
        eq(supportResponses.categoryId, category.id),
        eq(supportResponses.isActive, true),
        eq(supportResponses.isDefault, true)
      ))
      .limit(1);

    if (!response[0]) {
      console.log(`Nenhuma resposta automática encontrada para categoria: ${category.name}`);
      return;
    }

    const template = response[0];

    // Replace variables in template
    const personalizedSubject = template.subject.replace('{{customer_name}}', email.from.split('@')[0]);
    const personalizedContent = template.textContent
      .replace('{{customer_name}}', email.from.split('@')[0])
      .replace('{{original_subject}}', email.subject)
      .replace('{{ticket_number}}', `AUTO-${Date.now()}`);

    try {
      await mg.messages.create(process.env.MAILGUN_DOMAIN || '', {
        from: `Suporte <suporte@${process.env.MAILGUN_DOMAIN}>`,
        to: email.from,
        subject: personalizedSubject,
        text: personalizedContent,
        html: template.htmlContent?.replace('{{customer_name}}', email.from.split('@')[0]) || undefined
      });

      // Update email as responded
      await db
        .update(supportEmails)
        .set({
          hasAutoResponse: true,
          autoResponseSentAt: new Date(),
          status: 'responded'
        })
        .where(eq(supportEmails.id, email.id));

      // Update response usage
      await db
        .update(supportResponses)
        .set({
          timesUsed: sql`${supportResponses.timesUsed} + 1`,
          lastUsed: new Date()
        })
        .where(eq(supportResponses.id, template.id));

      console.log(`Resposta automática enviada para: ${email.from}`);
    } catch (error) {
      console.error('Erro ao enviar resposta automática:', error);
      throw error;
    }
  }

  /**
   * Add conversation entry to ticket
   */
  async addConversation(ticketId: string, data: Partial<InsertSupportConversation>) {
    const conversationData = {
      ticketId,
      type: data.type || 'note',
      content: data.content || '',
      from: data.from || null,
      to: data.to || null,
      subject: data.subject || null,
      isInternal: data.isInternal || false,
      messageId: data.messageId || null,
      userId: data.userId || null
    };

    return await db
      .insert(supportConversations)
      .values(conversationData)
      .returning();
  }

  /**
   * Get tickets with pagination and filters
   */
  async getTickets(options: {
    status?: string;
    categoryId?: string;
    priority?: string;
    assignedToUserId?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { status, categoryId, priority, assignedToUserId, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    let query = db
      .select({
        ticket: supportTickets,
        category: supportCategories,
        email: supportEmails
      })
      .from(supportTickets)
      .leftJoin(supportCategories, eq(supportTickets.categoryId, supportCategories.id))
      .leftJoin(supportEmails, eq(supportTickets.emailId, supportEmails.id))
      .orderBy(desc(supportTickets.createdAt))
      .limit(limit)
      .offset(offset);

    // Apply filters
    const conditions = [];
    if (status) conditions.push(eq(supportTickets.status, status));
    if (categoryId) conditions.push(eq(supportTickets.categoryId, categoryId));
    if (priority) conditions.push(eq(supportTickets.priority, priority));
    if (assignedToUserId) conditions.push(eq(supportTickets.assignedToUserId, assignedToUserId));

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
      totalPages: Math.ceil(totalResult[0].count / limit)
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
        email: supportEmails
      })
      .from(supportTickets)
      .leftJoin(supportCategories, eq(supportTickets.categoryId, supportCategories.id))
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
      conversations
    };
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(ticketId: string, status: string, userId?: string) {
    const updateData: any = { status, updatedAt: new Date() };
    
    if (status === 'resolved') {
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
   * Get support dashboard metrics
   */
  async getDashboardMetrics(period: string = '7d') {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
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
        count: count()
      })
      .from(supportTickets)
      .where(sql`${supportTickets.createdAt} >= ${startDate}`)
      .groupBy(supportTickets.status);

    // Tickets by category
    const ticketsByCategory = await db
      .select({
        categoryName: supportCategories.displayName,
        count: count()
      })
      .from(supportTickets)
      .leftJoin(supportCategories, eq(supportTickets.categoryId, supportCategories.id))
      .where(sql`${supportTickets.createdAt} >= ${startDate}`)
      .groupBy(supportCategories.displayName);

    // Automation rate
    const totalEmails = emailsReceived[0].count;
    const autoResponded = await db
      .select({ count: count() })
      .from(supportEmails)
      .where(and(
        sql`${supportEmails.receivedAt} >= ${startDate}`,
        eq(supportEmails.hasAutoResponse, true)
      ));

    const automationRate = totalEmails > 0 ? (autoResponded[0].count / totalEmails) * 100 : 0;

    return {
      emailsReceived: totalEmails,
      ticketsByStatus: ticketsByStatus.reduce((acc, item) => ({ ...acc, [item.status]: item.count }), {}),
      ticketsByCategory,
      automationRate: Number(automationRate.toFixed(2)),
      period
    };
  }

  /**
   * Send a reply to a support ticket via email
   */
  async replyToTicket(ticketId: string, message: string, agentName?: string): Promise<void> {
    try {
      console.log('🎯 SupportService.replyToTicket called with:', { ticketId, messageLength: message.length, agentName });
      
      // Check environment variables
      console.log('🌍 Environment check:', {
        hasMailgunDomain: !!process.env.MAILGUN_DOMAIN,
        hasMailgunApiKey: !!process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN || 'NOT_SET'
      });

      // Get ticket details
      console.log('🔍 Fetching ticket details...');
      const ticketResult = await db
        .select({
          ticket: supportTickets,
          email: supportEmails
        })
        .from(supportTickets)
        .leftJoin(supportEmails, eq(supportTickets.emailId, supportEmails.id))
        .where(eq(supportTickets.id, ticketId))
        .limit(1);

      console.log('📋 Ticket query result:', { 
        found: ticketResult.length, 
        ticketId: ticketResult[0]?.ticket?.id,
        emailId: ticketResult[0]?.email?.id
      });

      if (ticketResult.length === 0) {
        console.error('❌ Ticket not found in database');
        throw new Error('Ticket não encontrado');
      }

      const { ticket, email } = ticketResult[0];
      if (!email) {
        console.error('❌ Original email not found for ticket');
        throw new Error('Email original não encontrado');
      }

      // Send reply via Mailgun
      const replySubject = `Re: ${email.subject}`;
      const senderName = agentName || 'Equipe de Suporte';
      
      console.log('📧 Preparing to send email via Mailgun...');
      console.log('Email details:', {
        from: `${senderName} <suporte@${process.env.MAILGUN_DOMAIN}>`,
        to: ticket.customerEmail,
        subject: replySubject,
        ticketNumber: ticket.ticketNumber
      });

      const mailgunResponse = await mg.messages.create(process.env.MAILGUN_DOMAIN || '', {
        from: `${senderName} <suporte@${process.env.MAILGUN_DOMAIN}>`,
        to: ticket.customerEmail,
        subject: replySubject,
        text: message,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 20px;">
              <svg style="width: 80px; height: 67px;" viewBox="0 0 179 150" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0 C10.56 0 21.12 0 32 0 C32.54 3.53 33.07 7.05 33.62 10.69 C39.04 44.18 51.08 80.13 78.81 101.75 C95.91 114.02 111.78 116.23 133 119 C132.67 93.92 132.34 68.84 132 43 C127.38 45.31 122.76 47.62 118 50 C107.6 54.03 96.05 53.86 85 53 C84.34 52.67 83.68 52.34 83 52 C87.19 31.28 87.19 31.28 90 23 C91.3 23.04 92.6 23.08 93.94 23.12 C104.17 23.06 113.41 20.01 121.15 13.07 C125.1 8.78 126.57 5.66 129 0 C138.9 0 148.8 0 159 0 C159 14.02 154.47 22.84 145 33 C142.03 35.31 139.06 37.62 136 40 C131.38 45.31 126.76 50.62 122 56 C116.6 62.03 111.05 67.86 105 73 C104.34 73.67 103.68 74.34 103 75 C107.19 95.72 107.19 95.72 110 104 C111.3 103.96 112.6 103.92 113.94 103.88 C124.17 103.94 133.41 106.99 141.15 113.93 C145.1 118.22 146.57 121.34 149 127 C139.1 127 129.2 127 119 127 C119 112.98 123.53 104.16 133 94 C135.97 91.69 138.94 89.38 142 87 C146.62 81.69 151.24 76.38 156 71 C161.4 64.97 166.95 59.14 173 54 C173.66 53.33 174.32 52.66 175 52 C170.81 31.28 170.81 31.28 168 23 C166.7 23.04 165.4 23.08 164.06 23.12 C153.83 23.06 144.59 20.01 136.85 13.07 C132.9 8.78 131.43 5.66 129 0 Z" fill="#2563eb"/>
                <path d="M0 0 C3.5 0.56 3.5 0.56 5.94 2.19 C7.96 5.26 8.03 6.94 7.5 10.56 C6.38 12.88 6.38 12.88 4.5 14.56 C1 15.7 -0.83 15.8 -4.31 14.56 C-6.5 12.56 -6.5 12.56 -7.56 9.19 C-7.5 5.56 -7.5 5.56 -6 2.62 C-3.5 0.56 -3.5 0.56 0 0 Z M-4.5 3.56 C-5.27 6.41 -5.27 6.41 -5.5 9.56 C-4.51 10.55 -3.52 11.54 -2.5 12.56 C-2.5 9.59 -2.5 6.62 -2.5 3.56 C-3.16 3.56 -3.82 3.56 -4.5 3.56 Z M2.5 3.56 C2.5 6.53 2.5 9.5 2.5 12.56 C3.49 11.9 4.48 11.24 5.5 10.56 C6 8.06 6 8.06 5.5 5.56 C4.51 4.9 3.52 4.24 2.5 3.56 Z" fill="#1e40af"/>
              </svg>
            </div>
            <h2 style="color: #2563eb;">Resposta do Suporte</h2>
            <p>Olá,</p>
            <div style="background-color: #f8fafc; padding: 20px; border-left: 4px solid #2563eb; margin: 20px 0;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <p style="color: #64748b; font-size: 14px;">
              Esta é uma resposta ao seu ticket ${ticket.ticketNumber}.
              <br>Se você tiver outras dúvidas, pode responder diretamente a este email.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #94a3b8; font-size: 12px;">
              ${senderName}<br>
              Atendimento ao Cliente
            </p>
          </div>
        `
      });

      console.log('📧 Mailgun response:', mailgunResponse);

      // Update ticket status to 'responded' and add conversation record
      console.log('💾 Updating database...');
      await db.transaction(async (tx) => {
        // Update ticket
        console.log('🔄 Updating ticket status...');
        await tx
          .update(supportTickets)
          .set({
            status: 'in_progress', // Set to in_progress after agent response
            updatedAt: new Date()
          })
          .where(eq(supportTickets.id, ticketId));

        // Add conversation record
        console.log('💬 Adding conversation record...');
        await tx.insert(supportConversations).values({
          ticketId: ticketId,
          type: 'email_out',
          from: `suporte@${process.env.MAILGUN_DOMAIN}`,
          to: ticket.customerEmail,
          subject: replySubject,
          content: message,
          isInternal: false,
          userId: null // TODO: Get user ID from auth
        });
      });

      console.log(`✅ Reply sent successfully for ticket ${ticket.ticketNumber} to ${ticket.customerEmail}`);
      
    } catch (error) {
      console.error('❌ SupportService.replyToTicket error:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error constructor:', error?.constructor?.name);
      if (error instanceof Error) {
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
      }
      throw new Error(`Falha ao enviar resposta do ticket: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const supportService = new SupportService();