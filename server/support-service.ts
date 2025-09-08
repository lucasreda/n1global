import { OpenAI } from "openai";
import formData from "form-data";
import Mailgun from "mailgun.js";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { db } from "./db";
import {
  supportCategories,
  supportEmails,
  supportTickets,
  supportResponses,
  supportConversations,
  supportMetrics,
  customerSupportOperations,
  type SupportCategory,
  type SupportEmail,
  type SupportTicket,
  type SupportResponse,
  type InsertSupportEmail,
  type InsertSupportTicket,
  type InsertSupportConversation,
} from "@shared/schema";
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
      };
    } catch (error) {
      console.error("Erro na categorização por IA:", error);
      return {
        categoryName: "manual",
        confidence: 0,
        reasoning: "Erro na análise de IA - necessita revisão manual",
        requiresHuman: true,
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
      text,
      html,
      attachments = [],
      message_id,
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
        messageId: message_id,
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
        messageId: message_id,
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
      status: "categorized",
      requiresHuman: categorization.requiresHuman,
      rawData: webhookData,
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
        await this.sendAIAutoResponse(savedEmail, category[0]);
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
   * Generate AI-powered automatic response
   */
  async generateAIAutoResponse(
    email: SupportEmail,
    category: SupportCategory,
  ): Promise<{ subject: string; content: string }> {
    const customerName = email.from.split("@")[0];

    const prompt = `
Você é Sofia, uma agente de atendimento ao cliente experiente e empática. 

INFORMAÇÕES DA EMPRESA:
- Tempo de entrega: 2 a 7 dias úteis (maioria chega em até 3 dias úteis)
- Pagamento: Na entrega (COD - Cash on Delivery)  
- Horário: Segunda a sexta, 9h às 18h

EMAIL ORIGINAL:
Remetente: ${email.from}
Assunto: ${email.subject}  
Categoria: ${category.displayName}
Conteúdo: ${email.textContent || email.htmlContent}

IMPORTANTE: Responda APENAS com JSON válido (sem quebras de linha no content, use \\n) no formato:

INFORMAÇÕES OPERACIONAIS:

ENTREGAS:
- Prazo padrão: 2-7 dias úteis (70% chegam em até 3 dias)
- Prazo conta após confirmação do pagamento
- Entrega: Segunda a sexta, 8h às 18h / Sábado: 8h às 12h
- Área de cobertura: [especificar cidades/regiões]
- Transportadoras: [listar principais]

PAGAMENTO:
- Modalidade: Pagamento na Entrega
- Aceito: Dinheiro, cartão (débito/crédito), PIX
- Taxa de entrega: Grátis
- Política: Embalagem violada = prejuízo ao entregador

POLÍTICAS:
- Troca/Devolução: 7 dias após recebimento
- Garantia: [especificar por tipo de produto]
- Cancelamento: Até [X] horas após pedido
- Reembolso: 5-10 dias úteis (varia por banco)

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

ANÁLISE DO CASO:
Dados do Cliente:
- Email: ${email.from}
- Assunto: ${email.subject}
- Categoria: ${category.displayName}
- Conteúdo: ${email.textContent || email.htmlContent}
- Histórico: [Se disponível: pedidos anteriores, interações]

PROTOCOLOS POR CATEGORIA:

ENTREGA/RASTREAMENTO:
INVESTIGAR:
- Status atual do pedido (#número)
- Última atualização de rastreamento
- Tentativas de entrega anteriores
- Endereço de entrega confirmado

RESPONDER COM:
- Status específico: "Seu pedido saiu do centro de distribuição às [hora] e chegará hoje entre [horário]"
- Código de rastreamento: "[CÓDIGO] - acompanhe em [link]"
- Se atraso: Motivo específico + nova previsão + compensação
- Contato da transportadora se necessário

AÇÕES PROATIVAS:
- Alertar sobre necessidade de estar presente
- Confirmar telefone de contato
- Sugerir endereço alternativo se histórico de problemas

CANCELAMENTO/ALTERAÇÃO:
VERIFICAR IMEDIATAMENTE:
- Status: Em separação / Enviado / Em trânsito
- Janela para alteração (até [X] horas)
- Tipo de alteração solicitada

SE POSSÍVEL:
- "Cancelei/alterei seu pedido agora mesmo"
- Confirmação por email em até [X] minutos
- Prazo de estorno: [específico por forma de pagamento]

SE IMPOSSÍVEL:
- Explicar motivo específico + quando passou do prazo
- Alternativas: Recusar na entrega / Troca posterior / Cupom desconto
- Processo detalhado para cada alternativa

PROBLEMA COM PRODUTO:
CATEGORIZAR:
- Defeito de fábrica
- Produto diferente do anunciado
- Embalagem danificada
- Produto não funcionando

SOLUÇÃO IMEDIATA:
- Troca expressa (envio antes da devolução para clientes fidelizados)
- Reembolso total + frete de devolução grátis
- Desconto para manter produto (se defeito menor)
- Upgrade gratuito se disponível

SEGUIR:
- Email com etiqueta de devolução
- Agendamento de coleta
- Prazo específico para resolução

PAGAMENTO/FINANCEIRO:
ESCLARECER:
- Valor exato cobrado vs. esperado
- Forma de pagamento utilizada
- Data/hora da transação

RESOLVER:
- Ajuste de valor na próxima entrega
- Estorno parcial: [prazo específico]
- Crédito na conta para próxima compra
- Parcelamento alternativo se disponível

DÚVIDAS TÉCNICAS/PRODUTO:
RESPONDER:
- Especificações técnicas completas
- Compatibilidade com outros produtos
- Instruções de uso/instalação
- Cuidados e manutenção

AGREGAR VALOR:
- Acessórios recomendados
- Produtos complementares
- Dicas de uso otimizado
- Garantia estendida se disponível

CONTATO/INFORMAÇÕES:
FORNECER:
- Telefone direto da empresa
- WhatsApp para suporte
- Horários de funcionamento
- Endereço físico se necessário

ORIENTAR:
- Melhor horário para contato
- Documentos necessários
- Informações que deve ter em mãos

PRIMEIRA COMPRA/NOVOS CLIENTES:
ACOLHER:
- Agradecer pela confiança
- Explicar processo completo
- Tranquilizar sobre segurança

EDUCAR:
- Como acompanhar pedido
- O que esperar da entrega
- Políticas importantes
- Benefícios de cliente fidelizado

BANCO DE RESPOSTAS EMPÁTICAS:

Cliente Frustrado:
- "Entendo perfeitamente sua frustração, [Nome]. Ninguém gosta de [situação]. Vou resolver isso agora mesmo."
- "Você tem toda razão em estar chateado(a). Isso realmente não deveria ter acontecido."
- "Sei como é importante [contexto da necessidade]. Deixe-me cuidar disso pessoalmente."

Cliente Ansioso:
- "Fico feliz em esclarecer isso para você, [Nome]. É natural ter essa preocupação."
- "Entendo sua ansiedade. Vou te dar todas as informações em detalhes."
- "Compreendo que você precisa dessa certeza. Vou acompanhar pessoalmente seu caso."

Cliente Neutro/Informativo:
- "Perfeito, [Nome]! Vou te ajudar com todas as informações que precisa."
- "Claro! Fico feliz em esclarecer essas dúvidas para você."
- "Sem problemas! Vou te orientar sobre todo o processo."

Cliente Satisfeito:
- "Que bom saber que está tudo perfeito! Fico muito feliz em ajudar."
- "Obrigada pelo feedback positivo, [Nome]. Significa muito para nossa equipe."
- "É um prazer atender clientes como você! Conte sempre conosco."

Cliente Recorrente:
- "Sempre um prazer falar com você, [Nome]! Como posso ajudar dessa vez?"
- "Oi, [Nome]! Vi que você já é nosso cliente fiel. O que posso resolver para você hoje?"

DIRETRIZES DE FORMATAÇÃO:

ESTRUTURA VISUAL:
- Use **negrito** para informações importantes (prazos, valores, status)
- Use quebras de linha duplas (\n\n) entre parágrafos
- Use listas com - ou • para múltiplas informações
- Use emojis sutilmente (📦 para entrega, ✅ para confirmações)

HIERARQUIA DE INFORMAÇÃO:
1. **Ação imediata tomada** (primeiro parágrafo)
2. **Detalhes específicos** (segundo parágrafo)
3. **Próximos passos** (terceiro parágrafo)
4. **Informações complementares** (se necessário)
5. **Fechamento empático** (último parágrafo)

TOM DE VOZ:
- Profissional mas caloroso
- Direto mas não seco
- Empático mas não excessivo
- Confiante mas não arrogante

CENÁRIOS ESPECIAIS:

CLIENTE VIP/RECORRENTE:
- Priorizar atendimento diferenciado
- Oferecer benefícios exclusivos
- Mencionar histórico positivo
- Acesso direto a você para futuras questões

PEDIDO DE ALTO VALOR:
- Tratamento premium automático
- Rastreamento detalhado
- Seguro opcional
- Entrega expressa se disponível

PROBLEMA COMPLEXO/ESCALADO:
- Assumir ownership total do caso
- Cronograma de resolução claro
- Updates proativos regulares
- Envolvimento de gestão se necessário

RECLAMAÇÃO PÚBLICA (redes sociais mencionadas):
- Prioridade máxima
- Resolução imediata quando possível
- Convite para continuar conversa privada
- Follow-up para garantir satisfação

CLIENTE INDECISO/PRIMEIRA COMPRA:
- Mais detalhes sobre segurança
- Depoimentos de outros clientes
- Garantias e políticas claras
- Suporte mais próximo

INDICADORES DE QUALIDADE:

RESPOSTA EXCELENTE DEVE TER:
✅ Nome do cliente usado pelo menos 1 vez
✅ Ação específica mencionada no primeiro parágrafo
✅ Prazo ou data específica (não "em breve")
✅ Próximo passo claro para o cliente
✅ Tom empático apropriado à situação
✅ Informação além do que foi perguntado (valor agregado)
✅ Fechamento que convida continuidade

SINAIS DE ALERTA (REVISAR):
❌ Resposta muito curta (menos de 3 parágrafos para problemas)
❌ Linguagem muito formal ou robótica
❌ Não menciona nome do cliente
❌ Usa "nossa equipe" em vez de "eu"
❌ Promete sem dar prazo específico
❌ Não oferece alternativa quando não pode resolver
❌ Ignora completamente a emoção do cliente

{
  "subject": "Assunto da resposta",
  "content": "Conteúdo da resposta em português empático e específico (USE \\n para quebras de linha, NÃO use quebras reais)"
}
`;

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
        .where(eq(customerSupportOperations.domain, toDomain))
        .limit(1);

      if (!operation) {
        console.log('⚠️ No operation found for domain:', toDomain);
        return this.getDefaultDesignConfig();
      }

      console.log('✅ Found operation for domain:', toDomain, '-> Operation:', operation.id);
      
      // Get design config for the operation
      const brandingConfig = operation.brandingConfig || {};
      
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
      console.error('Error getting design config for email:', error);
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
  ): Promise<void> {
    console.log(
      `🤖 Gerando resposta automática IA para categoria: ${category.name}`,
    );
    console.log("🔥 STEP 1");
    console.log("🔥 STEP 2");
    console.log("🔥 ENTRANDO EM sendAIAutoResponse - INICIO DA FUNÇÃO");

    try {
      // Gerar resposta com IA
      const aiResponse = await this.generateAIAutoResponse(email, category);

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

      // Enviar email com resposta da IA
      const mailgunResponse = await mg.messages.create(
        process.env.MAILGUN_DOMAIN || "",
        {
          from: `Sofia - Atendimento <suporte@${process.env.MAILGUN_DOMAIN}>`,
          to: email.from,
          "h:Reply-To": `suporte@${process.env.MAILGUN_DOMAIN}`,
          subject: aiResponse.subject,
          text: aiResponse.content,
          html: htmlContent,
        },
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
}

export const supportService = new SupportService();
