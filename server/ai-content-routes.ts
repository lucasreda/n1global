import { Router } from 'express';
import { authenticateToken } from './auth-middleware';
import { validateOperationAccess as operationAccess } from './middleware/operation-access';
import { AIContentRequest, AIContentResponse } from '@shared/schema.js';
import OpenAI from 'openai';

const router = Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate section content
router.post('/generate-section', authenticateToken, operationAccess, async (req, res) => {
  try {
    const request: AIContentRequest = req.body;
    
    const systemPrompt = `Você é um especialista em copywriting e marketing digital. Sua função é gerar conteúdo persuasivo e otimizado para conversão em páginas de vendas.`;
    
    let userPrompt = '';
    
    switch (request.type) {
      case 'generate_section':
        userPrompt = generateSectionPrompt(request);
        break;
      case 'rewrite_text':
        userPrompt = rewriteTextPrompt(request);
        break;
      case 'optimize_cta':
        userPrompt = optimizeCTAPrompt(request);
        break;
      case 'suggest_layout':
        userPrompt = suggestLayoutPrompt(request);
        break;
      case 'generate_copy':
        userPrompt = generateCopyPrompt(request);
        break;
      default:
        return res.status(400).json({ success: false, error: 'Tipo de solicitação inválido' });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      return res.status(500).json({ 
        success: false, 
        error: 'Falha ao gerar conteúdo' 
      });
    }

    // Parse AI response and format according to request type
    const formattedResponse = formatAIResponse(aiResponse, request.type);

    const response: AIContentResponse = {
      success: true,
      content: formattedResponse,
    };

    res.json(response);
  } catch (error) {
    console.error('AI Content Generation Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
});

// Rewrite existing text for better conversion
router.post('/rewrite-text', authenticateToken, operationAccess, async (req, res) => {
  try {
    const { text, goal, tone, elementType, businessContext } = req.body;
    
    const systemPrompt = `Você é um especialista em copywriting e conversão. Reescreva textos para maximizar o engajamento e conversão.`;
    
    const userPrompt = `
Reescreva o seguinte texto para ${goal || 'melhorar a conversão'}:

Texto original: "${text}"
Tipo de elemento: ${elementType || 'texto'}
Tom desejado: ${tone || 'persuasivo'}
Contexto do negócio: ${businessContext || 'não especificado'}

Forneça 3 variações do texto reescrito, cada uma com uma abordagem diferente.
Formate a resposta como JSON:
{
  "variants": [
    {"text": "variação 1", "reason": "explicação da abordagem"},
    {"text": "variação 2", "reason": "explicação da abordagem"},
    {"text": "variação 3", "reason": "explicação da abordagem"}
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 800,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    try {
      const parsedResponse = JSON.parse(aiResponse || '{}');
      
      const response: AIContentResponse = {
        success: true,
        content: {
          variants: parsedResponse.variants || [],
        },
      };

      res.json(response);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      const response: AIContentResponse = {
        success: true,
        content: {
          text: aiResponse || text,
          suggestions: ['Texto melhorado pela IA'],
        },
      };

      res.json(response);
    }
  } catch (error) {
    console.error('Text Rewrite Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao reescrever texto' 
    });
  }
});

// Generate multiple CTA variations
router.post('/generate-cta', authenticateToken, operationAccess, async (req, res) => {
  try {
    const { businessInfo, pageType, currentCTA } = req.body;
    
    const userPrompt = `
Gere 5 variações de Call-to-Action (CTA) para uma página de ${pageType || 'vendas'}.

Informações do negócio:
- Nome: ${businessInfo?.name || 'Negócio'}
- Setor: ${businessInfo?.industry || 'Geral'}
- Público-alvo: ${businessInfo?.targetAudience || 'Geral'}
- Proposta de valor: ${businessInfo?.valueProposition || 'Não especificada'}

CTA atual: "${currentCTA || 'Não especificado'}"

Cada CTA deve:
1. Ser persuasivo e criar urgência
2. Ser claro sobre a ação desejada
3. Usar palavras de poder
4. Ter entre 2-5 palavras

Formate como JSON:
{
  "ctas": [
    {"text": "CTA 1", "reason": "Por que funciona"},
    {"text": "CTA 2", "reason": "Por que funciona"},
    {"text": "CTA 3", "reason": "Por que funciona"},
    {"text": "CTA 4", "reason": "Por que funciona"},
    {"text": "CTA 5", "reason": "Por que funciona"}
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.9,
      max_tokens: 600,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    try {
      const parsedResponse = JSON.parse(aiResponse || '{}');
      
      const response: AIContentResponse = {
        success: true,
        content: {
          variants: parsedResponse.ctas || [],
        },
      };

      res.json(response);
    } catch (parseError) {
      const response: AIContentResponse = {
        success: false,
        error: 'Erro ao processar resposta da IA',
      };

      res.json(response);
    }
  } catch (error) {
    console.error('CTA Generation Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao gerar CTAs' 
    });
  }
});

// Suggest improvements for specific elements
router.post('/suggest-improvements', authenticateToken, operationAccess, async (req, res) => {
  try {
    const { elementType, currentContent, pageContext } = req.body;
    
    const userPrompt = `
Analise o seguinte elemento de página e sugira melhorias específicas:

Tipo do elemento: ${elementType}
Conteúdo atual: "${currentContent}"
Contexto da página: ${pageContext || 'Página de vendas'}

Forneça 3 sugestões específicas de melhoria focadas em:
1. Clareza da mensagem
2. Persuasão e conversão
3. Otimização para o público-alvo

Formate como JSON:
{
  "suggestions": [
    {"type": "clarity", "description": "Sugestão para clareza", "example": "Exemplo prático"},
    {"type": "persuasion", "description": "Sugestão para persuasão", "example": "Exemplo prático"},
    {"type": "targeting", "description": "Sugestão para público-alvo", "example": "Exemplo prático"}
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 700,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    try {
      const parsedResponse = JSON.parse(aiResponse || '{}');
      
      const response: AIContentResponse = {
        success: true,
        content: {
          suggestions: parsedResponse.suggestions || [],
        },
      };

      res.json(response);
    } catch (parseError) {
      const response: AIContentResponse = {
        success: false,
        error: 'Erro ao processar sugestões da IA',
      };

      res.json(response);
    }
  } catch (error) {
    console.error('Suggestions Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao gerar sugestões' 
    });
  }
});

// Helper functions for generating prompts
function generateSectionPrompt(request: AIContentRequest): string {
  const { context } = request;
  
  return `
Gere conteúdo para uma seção de ${context.sectionType || 'página de vendas'}.

Informações do negócio:
- Nome: ${context.businessInfo?.name || 'Negócio'}
- Setor: ${context.businessInfo?.industry || 'Geral'}
- Público-alvo: ${context.businessInfo?.targetAudience || 'Geral'}
- Proposta de valor: ${context.businessInfo?.valueProposition || 'Não especificada'}

Objetivo: ${context.goal || 'increase_conversion'}
Tom: ${context.tone || 'professional'}
Idioma: ${context.language || 'pt-BR'}

Forneça conteúdo estruturado incluindo título, subtítulo e texto principal.
`;
}

function rewriteTextPrompt(request: AIContentRequest): string {
  const { context } = request;
  
  return `
Reescreva o seguinte texto para ${context.goal || 'melhorar a conversão'}:

"${context.currentText}"

Tom desejado: ${context.tone || 'professional'}
Idioma: ${context.language || 'pt-BR'}

Mantenha a essência da mensagem mas melhore a persuasão e clareza.
`;
}

function optimizeCTAPrompt(request: AIContentRequest): string {
  const { context } = request;
  
  return `
Otimize este call-to-action: "${context.currentText}"

Objetivo: ${context.goal || 'increase_conversion'}
Tom: ${context.tone || 'urgent'}
Idioma: ${context.language || 'pt-BR'}

Gere 3 variações otimizadas para conversão.
`;
}

function suggestLayoutPrompt(request: AIContentRequest): string {
  const { context } = request;
  
  return `
Sugira um layout otimizado para uma seção de ${context.sectionType || 'vendas'}.

Contexto do negócio: ${context.businessInfo?.industry || 'Geral'}
Público-alvo: ${context.businessInfo?.targetAudience || 'Geral'}
Objetivo: ${context.goal || 'increase_conversion'}

Descreva a estrutura ideal, elementos necessários e hierarquia visual.
`;
}

function generateCopyPrompt(request: AIContentRequest): string {
  const { context } = request;
  
  return `
Gere copy persuasivo para ${context.sectionType || 'seção de vendas'}.

Informações do produto/serviço:
- Nome: ${context.businessInfo?.name || 'Produto'}
- Setor: ${context.businessInfo?.industry || 'Geral'}
- Público-alvo: ${context.businessInfo?.targetAudience || 'Geral'}
- Proposta de valor: ${context.businessInfo?.valueProposition || 'Benefício principal'}

Tom: ${context.tone || 'professional'}
Objetivo: ${context.goal || 'increase_conversion'}
Idioma: ${context.language || 'pt-BR'}

Gere copy completo com título impactante, benefícios e call-to-action.
`;
}

function formatAIResponse(response: string, type: string): any {
  try {
    // Try to parse as JSON first
    return JSON.parse(response);
  } catch {
    // Fallback to plain text response
    switch (type) {
      case 'generate_section':
      case 'rewrite_text':
      case 'generate_copy':
        return {
          text: response,
          html: `<p>${response}</p>`,
        };
      case 'optimize_cta':
        return {
          variants: [
            { text: response, reason: 'IA gerada' }
          ],
        };
      case 'suggest_layout':
        return {
          suggestions: [response],
        };
      default:
        return {
          text: response,
        };
    }
  }
}

export default router;