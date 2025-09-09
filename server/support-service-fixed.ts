import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { sendAIResponseEmail, sendReplyEmail } from "./email-service";
import { db } from "./db";
import {
  supportTickets,
  supportEmails,
  supportConversations,
  supportCategories,
  supportDefaultResponses,
  customerSupportDesignConfigs,
  customerSupportOperations,
  aiDirectives,
  operations,
  users,
  type SupportTicket,
  type SupportEmail,
  type SupportCategory,
  type SupportConversation,
} from "@shared/schema";
import { eq, desc, and, sql, or } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class SupportService {
  // ... existing methods ...

  /**
   * Generate AI-powered automatic response using dynamic directives
   */
  async generateAIAutoResponse(
    email: SupportEmail,
    category: SupportCategory,
  ): Promise<{ subject: string; content: string }> {
    const customerName = email.from.split("@")[0];

    // Get operation ID from email
    const operationId = await this.getOperationIdFromEmail(email);
    
    // Get active AI directives for this operation
    const directives = await this.getActiveDirectives(operationId);
    
    // Build dynamic prompt
    const prompt = await this.buildDynamicPrompt(email, category, directives);

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
   * Get operation ID from email (implement based on your email routing logic)
   */
  private async getOperationIdFromEmail(email: SupportEmail): Promise<string> {
    // For now, return the first operation - you can implement proper routing later
    // This could be based on email domain, to field, etc.
    const operations = await db.select().from(operations).limit(1);
    return operations[0]?.id || 'fb1d724d-6b9e-49c1-ad74-9a359527bbf4';
  }

  /**
   * Get active AI directives for an operation
   */
  private async getActiveDirectives(operationId: string) {
    return await db
      .select()
      .from(aiDirectives)
      .where(and(
        eq(aiDirectives.operationId, operationId),
        eq(aiDirectives.isActive, true)
      ))
      .orderBy(aiDirectives.sortOrder, aiDirectives.createdAt);
  }

  /**
   * Build dynamic prompt using active directives
   */
  private async buildDynamicPrompt(
    email: SupportEmail,
    category: SupportCategory,
    directives: any[]
  ): Promise<string> {
    const customerName = email.from.split("@")[0];

    // Group directives by type
    const directivesByType = directives.reduce((acc, directive) => {
      if (!acc[directive.type]) acc[directive.type] = [];
      acc[directive.type].push(directive);
      return acc;
    }, {} as Record<string, any[]>);

    // Build store information section
    const storeInfoSection = directivesByType.store_info?.length > 0 
      ? `INFORMAÇÕES DA EMPRESA:
${directivesByType.store_info.map(d => `- ${d.content}`).join('\n')}
` 
      : `INFORMAÇÕES DA EMPRESA:
- Tempo de entrega: 2 a 7 dias úteis (maioria chega em até 3 dias úteis)
- Pagamento: Na entrega (COD - Cash on Delivery)  
- Horário: Segunda a sexta, 9h às 18h
`;

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

    // Construct the complete prompt
    const prompt = `
Você é Sofia, uma agente de atendimento ao cliente experiente e empática. 

${storeInfoSection}${productInfoSection}${responseStyleSection}${customSection}
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

  // ... rest of existing methods remain the same ...
}