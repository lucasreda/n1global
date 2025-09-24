import OpenAI from 'openai';

export interface EnrichmentResult {
  enrichedBrief: {
    originalBrief: any;
    marketContext: {
      industry: string;
      competitiveLevel: string;
      seasonality: string;
      pricePosition: string;
    };
    targetPersona: {
      demographics: string;
      psychographics: string;
      painPoints: string[];
      desires: string[];
      objections: string[];
    };
    conversionFramework: 'PAS' | 'AIDA' | 'VSL' | 'BAB';
    copyStrategy: {
      tone: string;
      urgency: string;
      trustBuilding: string[];
      emotional: string[];
    };
    recommendedSections: string[];
    competitorInsights: string[];
  };
  cost: number;
  insights: string[];
}

export class BriefEnrichmentEngine {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async enrichBrief(briefData: any): Promise<EnrichmentResult> {
    console.log('🎯 Brief enrichment - analyzing product & market context...');
    
    try {
      const enrichmentPrompt = this.buildEnrichmentPrompt(briefData);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em marketing digital e copywriting focado em páginas de conversão de alta performance. Sua expertise inclui:
            
            1. Análise de mercado e posicionamento competitivo
            2. Desenvolvimento de personas detalhadas
            3. Estratégias de conversão (PAS, AIDA, VSL, BAB)
            4. Copywriting persuasivo para diferentes indústrias
            5. Otimização de landing pages para máxima conversão
            
            Analise o brief fornecido e retorne um JSON estruturado com insights profundos para criar uma página de altíssima conversão.`
          },
          {
            role: "user",
            content: enrichmentPrompt
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const enrichedData = JSON.parse(completion.choices[0].message.content || '{}');
      
      // Calculate cost (GPT-4o pricing)
      const inputTokens = completion.usage?.prompt_tokens || 0;
      const outputTokens = completion.usage?.completion_tokens || 0;
      const cost = (inputTokens * 0.005 + outputTokens * 0.015) / 1000;

      const result: EnrichmentResult = {
        enrichedBrief: {
          originalBrief: briefData,
          ...enrichedData
        },
        cost,
        insights: this.extractInsights(enrichedData)
      };

      console.log(`✅ Brief enriched - Framework: ${result.enrichedBrief.conversionFramework}, Cost: $${cost.toFixed(4)}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Brief enrichment failed:', error);
      
      // Fallback to basic enrichment
      return {
        enrichedBrief: {
          originalBrief: briefData,
          marketContext: {
            industry: briefData.productInfo.industry || 'general',
            competitiveLevel: 'medium',
            seasonality: 'year-round',
            pricePosition: this.analyzePricePosition(briefData.productInfo.price)
          },
          targetPersona: {
            demographics: briefData.productInfo.targetAudience,
            psychographics: 'Value-conscious consumers',
            painPoints: ['Generic pain points'],
            desires: ['Quality solutions'],
            objections: ['Price', 'Trust', 'Need']
          },
          conversionFramework: 'PAS' as const,
          copyStrategy: {
            tone: 'professional',
            urgency: 'medium',
            trustBuilding: ['testimonials', 'guarantees'],
            emotional: ['security', 'confidence']
          },
          recommendedSections: ['hero', 'benefits', 'testimonials', 'faq', 'cta'],
          competitorInsights: []
        },
        cost: 0.001,
        insights: ['Fallback analysis applied', 'Manual optimization recommended']
      };
    }
  }

  private buildEnrichmentPrompt(briefData: any): string {
    return `
Analise este brief de produto e forneça insights estratégicos para criar uma página de conversão de alta performance:

**PRODUTO:**
- Nome: ${briefData.productInfo.name}
- Descrição: ${briefData.productInfo.description}
- Preço: ${briefData.productInfo.price} ${briefData.productInfo.currency}
- Público-alvo: ${briefData.productInfo.targetAudience}
- Benefícios principais: ${briefData.productInfo.mainBenefits?.join(', ') || 'Não especificado'}
- Objeções esperadas: ${briefData.productInfo.objections?.join(', ') || 'Não especificado'}
- Indústria: ${briefData.productInfo.industry}

**OBJETIVO DE CONVERSÃO:** ${briefData.conversionGoal}

Retorne um JSON com a seguinte estrutura:

{
  "marketContext": {
    "industry": "categoria específica da indústria",
    "competitiveLevel": "low/medium/high",
    "seasonality": "seasonal/year-round/trending",
    "pricePosition": "budget/mid-range/premium/luxury"
  },
  "targetPersona": {
    "demographics": "perfil demográfico detalhado",
    "psychographics": "motivações, valores e comportamentos",
    "painPoints": ["dor específica 1", "dor específica 2", "dor específica 3"],
    "desires": ["desejo específico 1", "desejo específico 2", "desejo específico 3"],
    "objections": ["objeção específica 1", "objeção específica 2", "objeção específica 3"]
  },
  "conversionFramework": "PAS|AIDA|VSL|BAB",
  "copyStrategy": {
    "tone": "tom de voz ideal",
    "urgency": "low/medium/high",
    "trustBuilding": ["elemento 1", "elemento 2", "elemento 3"],
    "emotional": ["gatilho emocional 1", "gatilho emocional 2"]
  },
  "recommendedSections": ["hero", "problema", "solução", "benefícios", "prova-social", "objeções", "cta"],
  "competitorInsights": ["insight competitivo 1", "insight competitivo 2"]
}

Seja específico e estratégico. Esta análise será usada para gerar uma página de conversão profissional.
    `;
  }

  private extractInsights(enrichedData: any): string[] {
    const insights = [];
    
    if (enrichedData.marketContext?.competitiveLevel === 'high') {
      insights.push('Mercado altamente competitivo - necessário diferenciação forte');
    }
    
    if (enrichedData.targetPersona?.painPoints?.length > 2) {
      insights.push('Múltiplas dores identificadas - estratégia de agitação de problemas recomendada');
    }
    
    if (enrichedData.conversionFramework === 'VSL') {
      insights.push('Framework VSL recomendado - página longa com storytelling');
    }
    
    insights.push(`Framework ${enrichedData.conversionFramework} otimizado para este produto`);
    insights.push(`${enrichedData.recommendedSections?.length || 5} seções recomendadas para máxima conversão`);
    
    return insights;
  }

  private analyzePricePosition(price: number): string {
    if (price < 50) return 'budget';
    if (price < 200) return 'mid-range';
    if (price < 500) return 'premium';
    return 'luxury';
  }
}