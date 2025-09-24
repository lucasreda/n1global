import OpenAI from 'openai';

export interface ContentResult {
  generatedContent: {
    layout: string;
    sections: Array<{
      id: string;
      type: string;
      config: any;
      content: any;
    }>;
    style: {
      theme: string;
      primaryColor: string;
      secondaryColor: string;
      fontFamily: string;
    };
    seo: {
      title: string;
      description: string;
      keywords: string[];
    };
  };
  cost: number;
  sectionsGenerated: string[];
  copyQualityScore: number;
}

export class ContentGenerationEngine {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateContent(enrichedBrief: any, template: any): Promise<ContentResult> {
    console.log('✍️ Content generation - creating conversion-focused copy...');
    
    let totalCost = 0;
    const sections = [];
    const sectionsGenerated = [];

    try {
      // Generate content for each recommended section
      for (const sectionType of enrichedBrief.recommendedSections) {
        console.log(`  📝 Generating ${sectionType} section...`);
        
        const sectionContent = await this.generateSectionContent(
          sectionType,
          enrichedBrief,
          template
        );
        
        sections.push({
          id: `section-${sectionType}-${this.generateId()}`,
          type: sectionType,
          config: this.getSectionConfig(sectionType),
          content: sectionContent.content
        });
        
        sectionsGenerated.push(sectionType);
        totalCost += sectionContent.cost;
      }

      // Generate SEO content
      const seoContent = await this.generateSEOContent(enrichedBrief);
      totalCost += seoContent.cost;

      const result: ContentResult = {
        generatedContent: {
          layout: this.getOptimalLayout(enrichedBrief.conversionFramework),
          sections,
          style: this.getStyleConfig(enrichedBrief),
          seo: seoContent.seo
        },
        cost: totalCost,
        sectionsGenerated,
        copyQualityScore: this.calculateCopyQuality(sections, enrichedBrief)
      };

      console.log(`✅ Content generated - ${sectionsGenerated.length} sections, Quality: ${result.copyQualityScore}/10, Cost: $${totalCost.toFixed(4)}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Content generation failed:', error);
      
      // Fallback to basic content structure
      return this.generateFallbackContent(enrichedBrief, template);
    }
  }

  private async generateSectionContent(sectionType: string, enrichedBrief: any, template: any) {
    const prompt = this.buildSectionPrompt(sectionType, enrichedBrief);
    
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: this.getSectionSystemPrompt(sectionType, enrichedBrief.conversionFramework)
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const content = JSON.parse(completion.choices[0].message.content || '{}');
    
    // Calculate cost
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const cost = (inputTokens * 0.005 + outputTokens * 0.015) / 1000;

    return { content, cost };
  }

  private getSectionSystemPrompt(sectionType: string, framework: string): string {
    const prompts = {
      hero: `Você é um especialista em headlines e hero sections de alta conversão. Use o framework ${framework} para criar um hero impactante que capture atenção imediatamente e comunique a proposta de valor única. Foque em clareza, benefício principal e chamada para ação irresistível.`,
      
      problema: `Você é especialista em copywriting de agitação de problemas. Sua tarefa é intensificar a dor do cliente potencial, criando urgência e necessidade do produto. Use linguagem emocional e específica que ressoe profundamente com o público-alvo.`,
      
      solução: `Você é especialista em apresentar soluções de forma convincente. Posicione o produto como a solução perfeita e única para os problemas apresentados. Use transições suaves e linguagem que gere confiança e credibilidade.`,
      
      benefícios: `Você é especialista em copywriting de benefícios focados em resultados. Transforme features em benefícios emocionais e tangíveis. Use a técnica "So What?" para ir além de características superficiais e conectar com desejos profundos.`,
      
      'prova-social': `Você é especialista em criar prova social convincente. Desenvolva depoimentos realistas e específicos que abordem objeções comuns e demonstrem resultados tangíveis. Inclua detalhes que aumentem a credibilidade.`,
      
      objeções: `Você é especialista em reverter objeções de vendas. Antecipe e responda às principais objeções de forma empática mas assertiva. Use lógica, prova social e garantias para eliminar riscos percebidos.`,
      
      cta: `Você é especialista em call-to-actions de alta conversão. Crie CTAs que geram urgência, reduzem fricção e maximizam cliques. Use linguagem orientada a ação e elementos de escassez/urgência quando apropriado.`
    };

    return prompts[sectionType] || `Você é especialista em copywriting de conversão. Crie conteúdo persuasivo e otimizado para este tipo de seção.`;
  }

  private buildSectionPrompt(sectionType: string, enrichedBrief: any): string {
    const baseInfo = `
PRODUTO: ${enrichedBrief.originalBrief.productInfo.name}
PREÇO: ${enrichedBrief.originalBrief.productInfo.price} ${enrichedBrief.originalBrief.productInfo.currency}
PÚBLICO: ${enrichedBrief.targetPersona.demographics}
FRAMEWORK: ${enrichedBrief.conversionFramework}
TOM: ${enrichedBrief.copyStrategy.tone}
URGÊNCIA: ${enrichedBrief.copyStrategy.urgency}

PERSONA:
- Dores: ${enrichedBrief.targetPersona.painPoints.join(', ')}
- Desejos: ${enrichedBrief.targetPersona.desires.join(', ')}
- Objeções: ${enrichedBrief.targetPersona.objections.join(', ')}
    `;

    const sectionPrompts = {
      hero: `${baseInfo}

Crie um hero section de alta conversão. Retorne JSON:
{
  "headline": "Headline principal super impactante",
  "subheadline": "Subheadline que clarifica a proposta de valor",
  "ctaText": "Texto do botão principal",
  "ctaSecondary": "Texto do botão secundário (opcional)",
  "trustElements": ["elemento de confiança 1", "elemento 2"],
  "urgencyText": "Texto de urgência/escassez (se aplicável)"
}`,

      problema: `${baseInfo}

Crie uma seção de agitação de problemas. Retorne JSON:
{
  "title": "Título da seção",
  "problemStatement": "Declaração principal do problema", 
  "painPoints": [
    {"pain": "Dor específica 1", "description": "Consequência emocional"},
    {"pain": "Dor específica 2", "description": "Consequência emocional"},
    {"pain": "Dor específica 3", "description": "Consequência emocional"}
  ],
  "emotionalHook": "Frase que intensifica a dor emocional"
}`,

      benefícios: `${baseInfo}

Crie uma seção de benefícios focada em resultados. Retorne JSON:
{
  "title": "Título da seção",
  "subtitle": "Subtítulo explicativo",
  "benefits": [
    {
      "title": "Benefício 1",
      "description": "Explicação do benefício",
      "result": "Resultado específico/mensurável",
      "icon": "icon-name"
    },
    {
      "title": "Benefício 2", 
      "description": "Explicação do benefício",
      "result": "Resultado específico/mensurável",
      "icon": "icon-name"
    },
    {
      "title": "Benefício 3",
      "description": "Explicação do benefício", 
      "result": "Resultado específico/mensurável",
      "icon": "icon-name"
    }
  ]
}`,

      'prova-social': `${baseInfo}

Crie depoimentos realistas e convincentes. Retorne JSON:
{
  "title": "Título da seção",
  "testimonials": [
    {
      "name": "Nome realista",
      "location": "Cidade, Estado",
      "avatar": "avatar-1",
      "rating": 5,
      "text": "Depoimento específico e detalhado",
      "result": "Resultado específico obtido",
      "timeframe": "Em quanto tempo"
    },
    {
      "name": "Nome realista",
      "location": "Cidade, Estado", 
      "avatar": "avatar-2",
      "rating": 5,
      "text": "Depoimento específico e detalhado",
      "result": "Resultado específico obtido",
      "timeframe": "Em quanto tempo"
    },
    {
      "name": "Nome realista",
      "location": "Cidade, Estado",
      "avatar": "avatar-3", 
      "rating": 5,
      "text": "Depoimento específico e detalhado",
      "result": "Resultado específico obtido",
      "timeframe": "Em quanto tempo"
    }
  ]
}`,

      cta: `${baseInfo}

Crie uma seção CTA final irresistível. Retorne JSON:
{
  "title": "Título de urgência",
  "subtitle": "Subtítulo reforçando o valor",
  "ctaText": "Texto do botão principal",
  "urgencyText": "Texto de escassez/urgência",
  "guarantee": "Texto da garantia",
  "priceOffer": "Oferta de preço (se aplicável)",
  "bonuses": ["Bônus 1", "Bônus 2"],
  "riskReversal": "Texto de reversão de risco"
}`
    };

    return sectionPrompts[sectionType] || `${baseInfo}\n\nCrie conteúdo persuasivo para seção tipo: ${sectionType}`;
  }

  private async generateSEOContent(enrichedBrief: any) {
    const prompt = `
Produto: ${enrichedBrief.originalBrief.productInfo.name}
Descrição: ${enrichedBrief.originalBrief.productInfo.description}  
Indústria: ${enrichedBrief.marketContext.industry}
Público: ${enrichedBrief.targetPersona.demographics}

Crie SEO otimizado para conversão. Retorne JSON:
{
  "title": "Título SEO de 50-60 caracteres",
  "description": "Meta description de 150-160 caracteres",
  "keywords": ["palavra-chave 1", "palavra-chave 2", "palavra-chave 3", "palavra-chave 4", "palavra-chave 5"]
}
    `;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Você é especialista em SEO para landing pages de conversão. Crie títulos e descrições que ranqueiem bem e aumentem CTR."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const seo = JSON.parse(completion.choices[0].message.content || '{}');
    
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const cost = (inputTokens * 0.005 + outputTokens * 0.015) / 1000;

    return { seo, cost };
  }

  private getSectionConfig(sectionType: string): any {
    const configs = {
      hero: { variant: 'centered', backgroundType: 'gradient', showImage: true },
      problema: { style: 'emotional', highlight: true },
      solução: { style: 'confident', showIcon: true },
      benefícios: { layout: 'grid', showIcons: true, columns: 3 },
      'prova-social': { layout: 'carousel', showRatings: true },
      objeções: { style: 'faq', collapsible: true },
      cta: { style: 'urgent', size: 'large', highlight: true }
    };
    
    return configs[sectionType] || {};
  }

  private getOptimalLayout(framework: string): string {
    const layouts = {
      'PAS': 'single_page',
      'AIDA': 'single_page', 
      'VSL': 'long_form',
      'BAB': 'single_page'
    };
    
    return layouts[framework] || 'single_page';
  }

  private getStyleConfig(enrichedBrief: any): any {
    const { pricePosition } = enrichedBrief.marketContext;
    
    const styleConfigs = {
      budget: {
        theme: 'clean',
        primaryColor: '#2563EB',
        secondaryColor: '#1D4ED8',
        fontFamily: 'Inter'
      },
      'mid-range': {
        theme: 'modern',
        primaryColor: '#059669',
        secondaryColor: '#047857', 
        fontFamily: 'Inter'
      },
      premium: {
        theme: 'elegant',
        primaryColor: '#7C3AED',
        secondaryColor: '#6D28D9',
        fontFamily: 'Playfair Display'
      },
      luxury: {
        theme: 'luxury',
        primaryColor: '#92400E',
        secondaryColor: '#78350F',
        fontFamily: 'Playfair Display'
      }
    };
    
    return styleConfigs[pricePosition] || styleConfigs['mid-range'];
  }

  private calculateCopyQuality(sections: any[], enrichedBrief: any): number {
    let score = 7.0; // Base score
    
    // Bonus for framework alignment
    if (enrichedBrief.conversionFramework === 'VSL' && sections.length >= 6) score += 0.5;
    
    // Bonus for complete sections
    if (sections.length >= 5) score += 0.5;
    if (sections.length >= 7) score += 0.5;
    
    // Bonus for high urgency strategy
    if (enrichedBrief.copyStrategy.urgency === 'high') score += 0.3;
    
    // Bonus for competitive market positioning
    if (enrichedBrief.marketContext.competitiveLevel === 'high') score += 0.2;
    
    return Math.min(score, 10);
  }

  private generateFallbackContent(enrichedBrief: any, template: any): ContentResult {
    return {
      generatedContent: {
        layout: "single_page",
        sections: [
          {
            id: "section-hero-fallback",
            type: "hero",
            config: { variant: 'centered' },
            content: {
              headline: enrichedBrief.originalBrief.productInfo.name,
              subheadline: enrichedBrief.originalBrief.productInfo.description,
              ctaText: "Começar Agora"
            }
          }
        ],
        style: {
          theme: "modern",
          primaryColor: "#3B82F6", 
          secondaryColor: "#1E40AF",
          fontFamily: "Inter"
        },
        seo: {
          title: enrichedBrief.originalBrief.productInfo.name,
          description: enrichedBrief.originalBrief.productInfo.description,
          keywords: ['produto', 'solução', 'benefícios']
        }
      },
      cost: 0.001,
      sectionsGenerated: ["hero"],
      copyQualityScore: 6.0
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}