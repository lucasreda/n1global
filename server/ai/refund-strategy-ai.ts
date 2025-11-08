import OpenAI from "openai";
import type { SupportTicket, SupportEmail } from "@shared/schema";

// Lazy initialization - only create OpenAI client when needed and API key is available
const getOpenAI = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured. OpenAI features are disabled.");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

// ============================================================================
// CRITICAL KEYWORDS DETECTION
// ============================================================================

/**
 * Keywords that trigger immediate escalation (offer refund form immediately)
 */
const CRITICAL_KEYWORDS = {
  legal: ['polícia', 'policia', 'justiça', 'justica', 'advogado', 'processo', 'judicial', 'lei', 'procon'],
  threats: ['denúncia', 'denuncia', 'denunciar', 'reclamar aqui', 'consumidor.gov', 'boletim de ocorrência'],
  urgency: ['urgente', 'imediato', 'agora', 'hoje']
};

/**
 * Keywords that indicate customer insists on refund
 */
const REFUND_INSISTENCE_KEYWORDS = [
  'mesmo assim',
  'ainda quero',
  'continuo querendo',
  'insisto',
  'não muda',
  'não mudou',
  'nao muda',
  'nao mudou',
  'quero sim',
  'quero o reembolso',
  'quero meu dinheiro',
  'devolva',
  'devolver',
  'estorno'
];

/**
 * Detects if message contains critical keywords that require immediate escalation
 */
export function detectCriticalKeywords(text: string): {
  hasCritical: boolean;
  reason: string | null;
  keywords: string[];
} {
  const lowerText = text.toLowerCase();
  const foundKeywords: string[] = [];
  
  // Check legal keywords
  for (const keyword of CRITICAL_KEYWORDS.legal) {
    if (lowerText.includes(keyword)) {
      foundKeywords.push(keyword);
    }
  }
  
  // Check threat keywords
  for (const keyword of CRITICAL_KEYWORDS.threats) {
    if (lowerText.includes(keyword)) {
      foundKeywords.push(keyword);
    }
  }
  
  if (foundKeywords.length > 0) {
    const reason = foundKeywords.some(k => CRITICAL_KEYWORDS.legal.includes(k))
      ? 'Menção a questões legais/jurídicas'
      : 'Ameaça de denúncia/reclamação pública';
    
    return { hasCritical: true, reason, keywords: foundKeywords };
  }
  
  return { hasCritical: false, reason: null, keywords: [] };
}

/**
 * Detects if customer reply insists on refund despite retention attempt
 */
export function detectRefundInsistence(text: string): {
  insistsOnRefund: boolean;
  confidence: 'high' | 'medium' | 'low';
  foundKeywords: string[];
} {
  const lowerText = text.toLowerCase();
  const foundKeywords: string[] = [];
  
  for (const keyword of REFUND_INSISTENCE_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      foundKeywords.push(keyword);
    }
  }
  
  // Check for explicit refund mentions even without keywords
  const hasRefundWord = lowerText.includes('reembolso') || lowerText.includes('dinheiro de volta');
  
  if (foundKeywords.length >= 2 || (foundKeywords.length === 1 && hasRefundWord)) {
    return { insistsOnRefund: true, confidence: 'high', foundKeywords };
  }
  
  if (foundKeywords.length === 1 || hasRefundWord) {
    return { insistsOnRefund: true, confidence: 'medium', foundKeywords };
  }
  
  return { insistsOnRefund: false, confidence: 'low', foundKeywords: [] };
}

// ============================================================================
// REFUND STRATEGY DECISION ENGINE
// ============================================================================

export type RefundStrategy = 
  | 'retention_attempt'      // Try to retain customer with persuasion
  | 'immediate_escalation'   // Critical keywords detected - offer refund form
  | 'final_retention'        // Second attempt at retention
  | 'offer_refund_form';     // After attempts exhausted - offer refund

export interface RefundDecision {
  strategy: RefundStrategy;
  reason: string;
  shouldOfferForm: boolean;
  responsePrompt: string;
}

/**
 * Decides refund strategy based on ticket progression and message content
 */
export function decideRefundStrategy(
  ticket: SupportTicket,
  currentEmail: SupportEmail,
  emailHistory: SupportEmail[]
): RefundDecision {
  
  // 1. Check for critical keywords in current message
  const criticalCheck = detectCriticalKeywords(currentEmail.textContent || '');
  
  if (criticalCheck.hasCritical && !ticket.refundOffered) {
    return {
      strategy: 'immediate_escalation',
      reason: `Escalação imediata: ${criticalCheck.reason}. Palavras detectadas: ${criticalCheck.keywords.join(', ')}`,
      shouldOfferForm: true,
      responsePrompt: `ESCALAÇÃO CRÍTICA DETECTADA (${criticalCheck.reason}).

Gere uma resposta empática mas profissional que:
1. Demonstre que entendemos a seriedade da situação
2. Peça desculpas genuínas pelo transtorno
3. Ofereça o link do formulário de reembolso IMEDIATAMENTE
4. Não tente persuadir ou questionar a decisão
5. Seja breve e direto ao ponto (máximo 4 linhas)

Tom: Profissional, respeitoso, sem tentar convencer a ficar.`
    };
  }
  
  // 2. If refund form already offered, don't offer again
  if (ticket.refundOffered) {
    return {
      strategy: 'offer_refund_form',
      reason: 'Formulário já oferecido anteriormente',
      shouldOfferForm: false, // Don't offer twice
      responsePrompt: `Cliente já recebeu formulário de reembolso anteriormente.

Gere resposta breve confirmando que:
1. O formulário já foi enviado
2. Pergunte se teve dificuldades em acessá-lo
3. Ofereça ajuda adicional se necessário

Tom: Solícito, prestativo.`
    };
  }
  
  // 3. First message about refund - try retention
  if (ticket.retentionAttempts === 0) {
    return {
      strategy: 'retention_attempt',
      reason: 'Primeira tentativa de retenção',
      shouldOfferForm: false,
      responsePrompt: `PRIMEIRA INTERAÇÃO sobre reembolso - NÃO OFERECER FORMULÁRIO ainda.

Gere uma resposta de retenção empática que:
1. Demonstre que entendemos a frustração/problema
2. Pergunte especificamente qual foi o problema encontrado
3. Sugira possíveis soluções alternativas (troca, desconto futuro, suporte adicional)
4. Use técnicas de persuasão suaves SEM mencionar qualidade do produto diretamente
5. Seja genuinamente empático e não pareça script

Técnicas de persuasão a usar:
- Escassez: "Este é um produto exclusivo/edição limitada"
- Prova social: "Milhares de clientes satisfeitos"
- Reciprocidade: "Que tal um desconto/brinde na próxima compra?"
- Compromisso: "Podemos tentar resolver juntos?"

Tom: Empático, solícito, persuasivo sem ser insistente.
IMPORTANTE: NÃO mencionar formulário de reembolso ainda.`
    };
  }
  
  // 4. Second message - final retention attempt
  if (ticket.retentionAttempts === 1) {
    return {
      strategy: 'final_retention',
      reason: 'Tentativa final de retenção',
      shouldOfferForm: false,
      responsePrompt: `SEGUNDA INTERAÇÃO - Tentativa final de retenção.

Gere uma resposta que:
1. Reconheça que a primeira solução proposta não resolveu
2. Ofereça uma solução mais concreta e valiosa (desconto maior, frete grátis na próxima, etc.)
3. Demonstre compromisso genuíno em resolver
4. Use persuasão mais direta mas respeitosa
5. Se cliente mencionar que ainda quer reembolso, prepare para oferecer formulário na próxima

Tom: Mais direto, oferecendo valor real, última tentativa genuína.
AINDA NÃO oferecer formulário - apenas se cliente insistir na próxima mensagem.`
    };
  }
  
  // 5. Third message or more - offer refund form
  return {
    strategy: 'offer_refund_form',
    reason: 'Tentativas de retenção esgotadas',
    shouldOfferForm: true,
    responsePrompt: `Cliente insistiu após múltiplas tentativas de retenção.

Gere uma resposta que:
1. Demonstre que lamentamos não ter conseguido resolver
2. Respeite a decisão do cliente
3. Ofereça o link do formulário de reembolso de forma clara
4. Agradeça pela paciência e compreensão
5. Deixe porta aberta para futuras compras

Tom: Respeitoso, profissional, sem insistência.`
  };
}

// ============================================================================
// AI RESPONSE GENERATION
// ============================================================================

export interface RefundResponseResult {
  responseText: string;
  strategy: RefundStrategy;
  shouldOfferForm: boolean;
  refundFormUrl?: string;
}

/**
 * Generates AI-powered refund response based on strategy
 */
export async function generateRefundResponse(
  ticket: SupportTicket,
  currentEmail: SupportEmail,
  emailHistory: SupportEmail[],
  decision: RefundDecision
): Promise<RefundResponseResult> {
  
  // Build context from email history
  const conversationContext = emailHistory.slice(-3).map((email, idx) => {
    const isCustomer = email.from !== 'suporte@n1global.app';
    return `${isCustomer ? 'Cliente' : 'Suporte'}: ${email.textContent}`;
  }).join('\n\n');
  
  const systemPrompt = `Você é um agente de suporte especializado em retenção de clientes e resolução de problemas.

CONTEXTO DO TICKET:
- Número: ${ticket.ticketNumber}
- Cliente: ${ticket.customerName} (${ticket.customerEmail})
- Assunto: ${ticket.subject}
- Tentativas de retenção: ${ticket.retentionAttempts}
- Formulário já oferecido: ${ticket.refundOffered ? 'Sim' : 'Não'}

HISTÓRICO DA CONVERSA:
${conversationContext}

MENSAGEM ATUAL DO CLIENTE:
${currentEmail.textContent}

ESTRATÉGIA PARA ESTA RESPOSTA:
${decision.responsePrompt}

${decision.shouldOfferForm ? '\nINCLUA NO FINAL: "Você pode solicitar o reembolso através deste link: [REFUND_FORM_LINK]"' : ''}

REGRAS IMPORTANTES:
1. Seja humano, empático e genuíno - nunca pareça um robô ou script
2. Responda APENAS em português do Brasil
3. Use tom profissional mas amigável
4. Seja conciso - máximo 6 linhas
5. Se oferecer formulário, mencione claramente
6. Nunca mencione que você é uma IA

Gere APENAS o texto da resposta, sem assinatura ou cabeçalho.`;

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Gere a resposta apropriada para este cliente:" }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });
    
    let responseText = completion.choices[0]?.message?.content?.trim() || '';
    
    // Generate refund form URL if should offer
    let refundFormUrl: string | undefined;
    if (decision.shouldOfferForm) {
      // URL will be like: https://yourapp.com/refund-form/SUP-2025-001
      const baseUrl = process.env.VITE_APP_URL || process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
      refundFormUrl = `${baseUrl}/refund-form/${ticket.ticketNumber}`;
      
      // Replace placeholder with actual URL
      responseText = responseText.replace(/\[REFUND_FORM_LINK\]/g, refundFormUrl);
    }
    
    return {
      responseText,
      strategy: decision.strategy,
      shouldOfferForm: decision.shouldOfferForm,
      refundFormUrl
    };
    
  } catch (error) {
    console.error('❌ Error generating refund response:', error);
    
    // Fallback response
    const fallbackResponse = decision.shouldOfferForm
      ? `Olá ${ticket.customerName},\n\nEntendo sua situação e lamento que não tenhamos conseguido resolver da forma que esperava. Você pode solicitar o reembolso através deste formulário: [REFUND_FORM_LINK]\n\nEstamos à disposição para qualquer dúvida.`
      : `Olá ${ticket.customerName},\n\nEntendo sua preocupação. Poderia me dar mais detalhes sobre o problema? Gostaria muito de ajudar a resolver essa situação.`;
    
    return {
      responseText: fallbackResponse,
      strategy: decision.strategy,
      shouldOfferForm: decision.shouldOfferForm
    };
  }
}

// ============================================================================
// COMPLETE REFUND AI PIPELINE
// ============================================================================

/**
 * Main entry point - analyzes ticket and generates appropriate refund response
 */
export async function processRefundRequest(
  ticket: SupportTicket,
  currentEmail: SupportEmail,
  emailHistory: SupportEmail[]
): Promise<RefundResponseResult & { decision: RefundDecision }> {
  
  console.log(`\n🎯 Processing refund strategy for ticket ${ticket.ticketNumber}`);
  console.log(`📊 Current retention attempts: ${ticket.retentionAttempts}`);
  console.log(`🔄 Refund form offered: ${ticket.refundOffered}`);
  
  // Decide strategy
  const decision = decideRefundStrategy(ticket, currentEmail, emailHistory);
  console.log(`✅ Strategy decided: ${decision.strategy}`);
  console.log(`📝 Reason: ${decision.reason}`);
  
  // Generate response
  const response = await generateRefundResponse(ticket, currentEmail, emailHistory, decision);
  console.log(`✅ AI response generated (${response.responseText.length} chars)`);
  
  return {
    ...response,
    decision
  };
}
