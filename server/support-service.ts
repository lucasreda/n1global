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
import { eq, and, or, inArray, ilike, desc, sql, count } from 'drizzle-orm';

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
   * Format AI response content for HTML email
   */
  private formatAIResponseForEmail(content: string): string {
    // Split content into paragraphs
    let formatted = content
      // Replace double line breaks with paragraph separators
      .split('\n\n')
      .map(paragraph => {
        // Trim whitespace
        paragraph = paragraph.trim();
        if (!paragraph) return '';
        
        // Convert **bold** to <strong>bold</strong>
        paragraph = paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Convert *italic* to <em>italic</em>
        paragraph = paragraph.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Convert single line breaks to <br>
        paragraph = paragraph.replace(/\n/g, '<br>');
        
        // Wrap in paragraph tags
        return `<p style="margin-bottom: 15px; line-height: 1.6;">${paragraph}</p>`;
      })
      .filter(p => p.length > 0)
      .join('');
    
    // Handle lists (- item or * item)
    formatted = formatted.replace(/<p[^>]*>([^<]*[-*]\s[^<]*(?:<br>[^<]*[-*]\s[^<]*)*)<\/p>/g, (match, listContent) => {
      const items = listContent.split('<br>')
        .filter(item => item.trim().match(/^[-*]\s/))
        .map(item => `<li style="margin-bottom: 8px;">${item.replace(/^[-*]\s/, '').trim()}</li>`)
        .join('');
      return `<ul style="margin-bottom: 15px; padding-left: 20px;">${items}</ul>`;
    });
    
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

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      const categoryName = result.categoryName || 'manual';
      let requiresHuman = result.requiresHuman !== undefined ? result.requiresHuman : true;
      
      // Override AI decision for simple cases - force AI response for basic inquiries
      if (categoryName === 'duvidas') {
        const contentLower = (subject + ' ' + content).toLowerCase();
        const simpleInquiryKeywords = [
          'quando', 'chegar', 'chegou', 'entrega', 'prazo', 'demora', 
          'rastreamento', 'rastrear', 'acompanhar', 'status', 'pedido',
          'produto', 'comprei', 'onde está', 'chegada'
        ];
        
        const hasSimpleKeywords = simpleInquiryKeywords.some(keyword => 
          contentLower.includes(keyword)
        );
        
        const hasComplexKeywords = [
          'defeito', 'quebrado', 'problema', 'reclamação', 'advogado',
          'processo', 'judicial', 'indenização', 'dano'
        ].some(keyword => contentLower.includes(keyword));
        
        // If it's a simple delivery question without complex issues, AI can handle it
        if (hasSimpleKeywords && !hasComplexKeywords) {
          requiresHuman = false;
          console.log(`🤖 Forçando IA para dúvida simples: ${subject}`);
        }
      }
      
      // Always allow AI for cancellations and address changes (unless explicitly complex)
      if (['cancelamento', 'alteracao_endereco'].includes(categoryName)) {
        const contentLower = (subject + ' ' + content).toLowerCase();
        const hasComplexKeywords = [
          'advogado', 'processo', 'judicial', 'indenização', 'dano', 'ameaça'
        ].some(keyword => contentLower.includes(keyword));
        
        if (!hasComplexKeywords) {
          requiresHuman = false;
          console.log(`🤖 Forçando IA para ${categoryName}: ${subject}`);
        }
      }
      
      return {
        categoryName,
        confidence: Math.min(100, Math.max(0, result.confidence || 0)),
        reasoning: result.reasoning || 'Categorização automática falhou',
        requiresHuman
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
          inArray(supportTickets.status, ['open', 'in_progress', 'waiting_customer'])
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
          inArray(supportTickets.status, ['open', 'in_progress', 'waiting_customer'])
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

      // Update ticket status to show new activity and mark as unread
      if (existingTicket.status === 'waiting_customer') {
        await db
          .update(supportTickets)
          .set({
            status: 'open',
            isRead: false,
            updatedAt: new Date()
          })
          .where(eq(supportTickets.id, existingTicket.id));
      } else {
        // Just update the timestamp and mark as unread
        await db
          .update(supportTickets)
          .set({ 
            isRead: false,
            updatedAt: new Date() 
          })
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

    // Always create ticket for proper tracking and history
    // Tickets should exist regardless of whether they get automatic responses
    if (categoryId) {
      const ticket = await this.createTicketFromEmail(savedEmail);
      console.log(`📋 Ticket criado: ${ticket.ticketNumber} para ${savedEmail.from}`);
      
      // If automatic response was sent, mark ticket as initially responded
      if (category[0]?.isAutomated && !categorization.requiresHuman) {
        const categoryName = category[0].name.toLowerCase();
        if (['duvidas', 'alteracao_endereco', 'cancelamento'].includes(categoryName)) {
          // The AI will respond, so we'll update ticket status after response is sent
          console.log(`📋 Ticket ${ticket.ticketNumber} will receive automatic response`);
        }
      }
    }

    // Send AI auto-response if category supports it and is eligible
    if (categoryId && category[0]?.isAutomated && !categorization.requiresHuman) {
      const categoryName = category[0].name.toLowerCase();
      
      // Use AI responses for specific categories only
      if (['duvidas', 'alteracao_endereco', 'cancelamento'].includes(categoryName)) {
        console.log(`🤖 Enviando resposta IA para categoria: ${categoryName}`);
        await this.sendAIAutoResponse(savedEmail, category[0]);
      } else if (categoryName !== 'reclamacoes' && categoryName !== 'manual') {
        // Fallback to template system for other automated categories
        console.log(`📄 Enviando resposta template para categoria: ${categoryName}`);
        await this.sendAutoResponse(savedEmail, category[0]);
      } else {
        console.log(`⏸️ Categoria não elegível para resposta automática: ${categoryName}`);
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
    
    const ticketNumber = `SUP-${year}-${String((count[0]?.count || 0) + 1).padStart(3, '0')}`;

    const ticketData: InsertSupportTicket = {
      emailId: email.id,
      categoryId: email.categoryId!,
      customerEmail: email.from,
      subject: email.subject,
      description: email.textContent || email.htmlContent || '',
      priority: email.isUrgent ? 'high' : 'medium',
      status: 'open',
      isRead: false,
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
   * Generate AI-powered automatic response
   */
  async generateAIAutoResponse(email: SupportEmail, category: SupportCategory): Promise<{subject: string, content: string}> {
    const customerName = email.from.split('@')[0];
    
    const prompt = `
Você é Sofia, uma agente de atendimento ao cliente experiente e empática de uma empresa de e-commerce. Você deve responder ao email de suporte de forma natural, humana e profissional, sem revelar que você é uma IA.

INFORMAÇÕES DA EMPRESA:
- Tempo de entrega: 2 a 7 dias úteis (maioria chega em até 3 dias)
- Pagamento: Na entrega (COD - Cash on Delivery)
- Política: Embalagens não podem ser violadas antes da entrega (gera prejuízos ao entregador)

CARACTERÍSTICAS DA SUA RESPOSTA:
- Seja empática e compreensiva com frustrações
- Use linguagem natural e calorosa
- Responda na MESMA LÍNGUA do cliente
- Seja específica e útil
- Mantenha tom profissional mas amigável
- NÃO mencione que você é IA ou bot
- Use o nome do cliente quando possível
- **FORMATAÇÃO**: Use formatação markdown no conteúdo:
  * Use **texto** para palavras importantes ou destaque
  * Use quebras de linha duplas (\n\n) para separar parágrafos
  * Use listas com - quando apropriado
  * Estruture a resposta em parágrafos claros e organizados

EMAIL ORIGINAL:
Remetente: ${email.from}
Assunto: ${email.subject}
Categoria: ${category.displayName}
Conteúdo: ${email.textContent || email.htmlContent}

INSTRUÇÕES ESPECÍFICAS:
- Se for sobre ENTREGA: Explique os prazos e tranquilize sobre acompanhamento
- Se for sobre CANCELAMENTO: Seja compreensiva e ofereça soluções
- Se for sobre ALTERAÇÃO DE ENDEREÇO: Explique o processo e prazos para mudança
- Se for DÚVIDAS GERAIS: Responda diretamente e ofereça ajuda adicional

Responda em JSON com:
{
  "subject": "Assunto da resposta (em resposta ao email original)",
  "content": "Conteúdo da resposta em texto limpo e empático"
}

IMPORTANTE: Responda na mesma língua do email original. Se o cliente escrever em português, responda em português. Se escrever em inglês, responda em inglês, etc.
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7, // Mais criativo para respostas naturais
        max_tokens: 600,
      });

      let content = response.choices[0].message.content || '{}';
      
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{.*?\})\s*```/s);
      if (jsonMatch) {
        content = jsonMatch[1];
      }
      
      // Clean up potential control characters but preserve newlines in content
      content = content.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");
      
      const result = JSON.parse(content);
      
      return {
        subject: result.subject || `Re: ${email.subject}`,
        content: result.content || 'Obrigada pelo seu contato. Nossa equipe analisará sua solicitação e retornaremos em breve.'
      };
    } catch (error) {
      console.error('Erro na geração de resposta IA:', error);
      // Fallback para resposta padrão
      return {
        subject: `Re: ${email.subject}`,
        content: `Olá ${customerName},\n\nObrigada pelo seu contato. Recebemos sua mensagem sobre "${email.subject}" e nossa equipe está analisando sua solicitação.\n\nRetornaremos com uma resposta personalizada em breve.\n\nAtenciosamente,\nEquipe de Atendimento`
      };
    }
  }

  /**
   * Send AI-powered automatic response
   */
  async sendAIAutoResponse(email: SupportEmail, category: SupportCategory): Promise<void> {
    console.log(`🤖 Gerando resposta automática IA para categoria: ${category.name}`);
    
    try {
      // Gerar resposta com IA
      const aiResponse = await this.generateAIAutoResponse(email, category);
      
      console.log(`🤖 Resposta IA gerada - Assunto: "${aiResponse.subject}"`);
      
      // Enviar email com resposta da IA
      const mailgunResponse = await mg.messages.create(process.env.MAILGUN_DOMAIN || '', {
        from: `Sofia - Atendimento <suporte@${process.env.MAILGUN_DOMAIN}>`,
        to: email.from,
        'h:Reply-To': `suporte@${process.env.MAILGUN_DOMAIN}`,
        subject: aiResponse.subject,
        text: aiResponse.content,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALMAAACWCAYAAACVdbl2AAAACXBIWXMAAAsTAAALEwEAmpwYAAAKLklEQVR4nO2dMYgkWRnHf7UsQh2LHoggHJiIl9xMYCInl5htIJiY3CRGe1CBzoKIyWBgsAYiwhbCFdxgsAgzgUZioBiYiBOZzMChoIGBIHIgsljZlEG/t/O6t3q6qvtVve979f1gmNnunuqe3l9//X/fe/W66LqOQyia9hHw7KCD7M9FV5VXie7bcBRN+y5wMvPdnnVV+TK84GGkA59GOs5YLhLdr7HOEfM7cAGsFbIHkQ5cRzrOWI4S3a+xznHqBwARZN4s9caycBFDBLEqs7FcTkgXM9eIJfN1pOOMRcTb21KRVJUhg8rsuilGGlIM/LaiXWYxT+TScFVZ1DtjLJlvIh3H0EPKrFzT41wOMlt7bmaKpn2S+jH0ddG0xwwwmWcliBcpI15vwyGmzKkmToyZC" alt="Logo" style="height: 40px; width: auto; margin-bottom: 10px;">
            </div>
            <div style="background-color: #f8fafc; padding: 20px; border-left: 4px solid #2563eb; margin: 20px 0; border-radius: 8px;">
              ${this.formatAIResponseForEmail(aiResponse.content)}
            </div>
            <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 30px;">
              Se precisar de mais alguma coisa, pode responder diretamente a este email.
              <br>Estamos aqui para ajudar! 😊
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #94a3b8; font-size: 12px;">
              Sofia<br>
              Atendimento ao Cliente
            </p>
          </div>
        `
      });

      console.log('🤖 Email IA enviado via Mailgun:', mailgunResponse.status);

      // Update email as responded
      await db
        .update(supportEmails)
        .set({
          hasAutoResponse: true,
          autoResponseSentAt: new Date(),
          status: 'responded'
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
          type: 'email_out',
          from: `Sofia - Atendimento <suporte@${process.env.MAILGUN_DOMAIN}>`,
          to: email.from,
          subject: aiResponse.subject,
          content: aiResponse.content,
          messageId: null
        });

        // Update ticket status to show it was responded
        await db
          .update(supportTickets)
          .set({
            status: 'waiting_customer',
            updatedAt: new Date()
          })
          .where(eq(supportTickets.id, ticket[0].id));

        console.log(`📋 Ticket ${ticket[0].ticketNumber} atualizado após resposta IA`);
      }
    } catch (error) {
      console.error('❌ Erro ao enviar resposta automática IA:', error);
      throw error;
    }
  }

  /**
   * Send automatic response (legacy template system - fallback)
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
      .where(eq(supportTickets.status, 'open'));

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
      unreadTickets: unreadTickets[0].count
    };
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
        'h:Reply-To': `suporte@${process.env.MAILGUN_DOMAIN}`,
        subject: replySubject,
        text: message,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALMAAACWCAYAAACVdbl2AAAACXBIWXMAAAsTAAALEwEAmpwYAAAKLklEQVR4nO2dMYgkWRnHf7UsQh2LHoggHJiIl9xMYCInl5htIJiY3CRGe1CBzoKIyWBgsAYiwhbCFdxgsAgzgUZioBiYiBOZzMChoIGBIHIgsljZlEG/t/O6t3q6qvtVve979f1gmNnunuqe3l9//X/fe/W66LqOQyia9hHw7KCD7M9FV5VXie7bcBRN+y5wMvPdnnVV+TK84GGkA59GOs5YLhLdr7HOEfM7cAGsFbIHkQ5cRzrOWI4S3a+xznHqBwARZN4s9caycBFDBLEqs7FcTkgXM9eIJfN1pOOMRcTb21KRVJUhg8rsuilGGlIM/LaiXWYxT+TScFVZ1DtjLJlvIh3H0EPKrFzT41wOMlt7bmaKpn2S+jH0ddG0xwwwmWcliBcpI15vwyGmzKkmToyZC" alt="Logo" style="height: 40px; width: auto; margin-bottom: 10px;">
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

  /**
   * Send new message to recipient and create a new ticket
   */
  async sendNewMessage(recipient: string, message: string, agentName?: string): Promise<{ ticketId: string }> {
    try {
      console.log('🎯 SupportService.sendNewMessage called with:', { recipient, messageLength: message.length, agentName });
      
      // Check environment variables
      console.log('🌍 Environment check:', {
        hasMailgunDomain: !!process.env.MAILGUN_DOMAIN,
        hasMailgunApiKey: !!process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN || 'NOT_SET'
      });

      const ticketNumber = `TKT-${Date.now().toString().slice(-8)}`;
      const senderName = agentName || 'Equipe de Suporte';
      const subject = `Mensagem da equipe de suporte - ${ticketNumber}`;
      
      console.log('📧 Preparing to send email via Mailgun...');
      console.log('Email details:', {
        from: `${senderName} <suporte@${process.env.MAILGUN_DOMAIN}>`,
        to: recipient,
        subject: subject,
        ticketNumber: ticketNumber
      });

      // Send email via Mailgun
      const mailgunResponse = await mg.messages.create(process.env.MAILGUN_DOMAIN || '', {
        from: `${senderName} <suporte@${process.env.MAILGUN_DOMAIN}>`,
        to: recipient,
        'h:Reply-To': `suporte@${process.env.MAILGUN_DOMAIN}`,
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
        `
      });

      console.log('📧 Mailgun response:', mailgunResponse);

      // Create email record in database
      console.log('💾 Saving email to database...');
      const [emailRecord] = await db.insert(supportEmails).values({
        from: `${senderName} <suporte@${process.env.MAILGUN_DOMAIN}>`,
        to: recipient,
        subject: subject,
        content: message,
        messageId: mailgunResponse.id || ticketNumber,
        status: 'sent'
      }).returning();

      // Create ticket record
      console.log('💾 Creating new ticket...');
      const [ticketRecord] = await db.insert(supportTickets).values({
        emailId: emailRecord.id,
        ticketNumber: ticketNumber,
        customerEmail: recipient,
        subject: subject,
        status: 'open',
        priority: 'medium',
        categoryId: 'manual', // Default to manual category
        source: 'outbound'
      }).returning();

      // Add conversation record
      console.log('💬 Adding conversation record...');
      await db.insert(supportConversations).values({
        ticketId: ticketRecord.id,
        type: 'email_out',
        from: `${senderName} <suporte@${process.env.MAILGUN_DOMAIN}>`,
        to: recipient,
        subject: subject,
        content: message,
        isInternal: false,
        userId: null
      });

      console.log(`✅ New message sent successfully. Ticket ${ticketNumber} created for ${recipient}`);
      
      return { ticketId: ticketRecord.id };
      
    } catch (error) {
      console.error('❌ SupportService.sendNewMessage error:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error constructor:', error?.constructor?.name);
      if (error instanceof Error) {
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
      }
      throw new Error(`Falha ao enviar nova mensagem: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const supportService = new SupportService();