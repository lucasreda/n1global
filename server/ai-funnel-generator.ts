import OpenAI from "openai";

// AI-generated content types
interface GeneratedContent {
  hero: {
    title: string;
    subtitle: string;
    cta: string;
  };
  benefits: Array<{
    title: string;
    description: string;
    icon?: string;
  }>;
  testimonials: Array<{
    name: string;
    text: string;
    rating?: number;
  }>;
  faq: Array<{
    question: string;
    answer: string;
  }>;
  cta: {
    title: string;
    subtitle: string;
    buttonText: string;
  };
}

interface ProductInfo {
  name: string;
  description: string;
  price: number;
  currency: string;
  targetAudience: string;
  mainBenefits: string[];
  objections: string[];
  testimonials?: string[];
}

interface TemplateConfig {
  sections: string[];
  colorScheme: string;
  layout: string;
  conversionGoal: string;
}

export class AIFunnelGenerator {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('🤖 AI Funnel Generator initialized');
  }

  /**
   * Generate complete landing page content using AI
   */
  async generateLandingPageContent(
    productInfo: ProductInfo,
    templateConfig: TemplateConfig
  ): Promise<{ content: GeneratedContent; cost: number }> {
    console.log(`🎯 Generating AI content for: ${productInfo.name}`);

    try {
      const totalCost = 0;
      const content: GeneratedContent = {
        hero: { title: '', subtitle: '', cta: '' },
        benefits: [],
        testimonials: [],
        faq: [],
        cta: { title: '', subtitle: '', buttonText: '' }
      };

      // Generate hero section
      if (templateConfig.sections.includes('hero')) {
        const heroResult = await this.generateHeroSection(productInfo, templateConfig);
        content.hero = heroResult.content;
        // totalCost += heroResult.cost; // Cost tracking for future implementation
      }

      // Generate benefits section  
      if (templateConfig.sections.includes('benefits')) {
        const benefitsResult = await this.generateBenefitsSection(productInfo, templateConfig);
        content.benefits = benefitsResult.content;
        // totalCost += benefitsResult.cost;
      }

      // Generate testimonials
      if (templateConfig.sections.includes('testimonials')) {
        const testimonialsResult = await this.generateTestimonialsSection(productInfo);
        content.testimonials = testimonialsResult.content;
        // totalCost += testimonialsResult.cost;
      }

      // Generate FAQ
      if (templateConfig.sections.includes('faq')) {
        const faqResult = await this.generateFAQSection(productInfo);
        content.faq = faqResult.content;
        // totalCost += faqResult.cost;
      }

      // Generate CTA section
      if (templateConfig.sections.includes('cta')) {
        const ctaResult = await this.generateCTASection(productInfo, templateConfig);
        content.cta = ctaResult.content;
        // totalCost += ctaResult.cost;
      }

      console.log(`✅ Content generated successfully for ${productInfo.name}`);
      return { content, cost: totalCost };
    } catch (error) {
      console.error('❌ AI content generation failed:', error);
      throw new Error(`Failed to generate content: ${error}`);
    }
  }

  /**
   * Generate hero section content
   */
  private async generateHeroSection(
    productInfo: ProductInfo,
    templateConfig: TemplateConfig
  ): Promise<{ content: { title: string; subtitle: string; cta: string; }; cost: number }> {
    console.log('🎯 Generating hero section');

    const prompt = `
Crie um hero section persuasivo para uma landing page de ${productInfo.name}.

PRODUTO:
- Nome: ${productInfo.name}
- Descrição: ${productInfo.description}
- Preço: ${productInfo.price} ${productInfo.currency}
- Público-alvo: ${productInfo.targetAudience}
- Principais benefícios: ${productInfo.mainBenefits.join(', ')}

OBJETIVO DE CONVERSÃO: ${templateConfig.conversionGoal}
ESQUEMA DE CORES: ${templateConfig.colorScheme}

Retorne um JSON com:
{
  "title": "Título principal impactante (máx 60 caracteres)",
  "subtitle": "Subtítulo explicativo que detalha o valor (máx 120 caracteres)",
  "cta": "Texto do botão de chamada para ação (máx 25 caracteres)"
}

DIRETRIZES:
- Use linguagem persuasiva e direta
- Destaque o principal benefício no título
- Crie urgência e desejo
- CTA deve ser orientado à ação
- Foque na transformação que o produto oferece
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em copywriting para landing pages de alta conversão. Sempre retorne apenas JSON válido."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 400,
      });

      const content = JSON.parse(response.choices[0].message.content || '{}');
      return { content, cost: 0 }; // Cost calculation to be implemented
    } catch (error) {
      console.error('❌ Hero generation failed:', error);
      // Fallback content
      return {
        content: {
          title: `${productInfo.name} - Transforme Sua Vida Hoje`,
          subtitle: `Descubra como ${productInfo.name} pode revolucionar sua experiência`,
          cta: "Quero Conhecer"
        },
        cost: 0
      };
    }
  }

  /**
   * Generate benefits section
   */
  private async generateBenefitsSection(
    productInfo: ProductInfo,
    templateConfig: TemplateConfig
  ): Promise<{ content: Array<{ title: string; description: string; icon?: string; }>; cost: number }> {
    console.log('💎 Generating benefits section');

    const prompt = `
Crie uma seção de benefícios persuasiva para ${productInfo.name}.

INFORMAÇÕES DO PRODUTO:
- Nome: ${productInfo.name}
- Descrição: ${productInfo.description}
- Benefícios principais: ${productInfo.mainBenefits.join(', ')}
- Público-alvo: ${productInfo.targetAudience}
- Objeções comuns: ${productInfo.objections.join(', ')}

Retorne um JSON com array de 3-5 benefícios:
{
  "benefits": [
    {
      "title": "Título do benefício (máx 40 caracteres)",
      "description": "Explicação detalhada do benefício (máx 150 caracteres)",
      "icon": "nome-do-icon-lucide (opcional)"
    }
  ]
}

DIRETRIZES:
- Foque nos resultados e transformações
- Aborde as objeções principais
- Use linguagem emocional
- Seja específico sobre os benefícios
- Escolha ícones do Lucide React apropriados (star, check, zap, heart, etc.)
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system", 
            content: "Você é um especialista em copywriting para landing pages. Retorne apenas JSON válido."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 600,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"benefits": []}');
      return { content: result.benefits, cost: 0 };
    } catch (error) {
      console.error('❌ Benefits generation failed:', error);
      // Fallback content
      return {
        content: productInfo.mainBenefits.slice(0, 3).map((benefit, index) => ({
          title: `Benefício ${index + 1}`,
          description: benefit,
          icon: ['star', 'check', 'zap'][index]
        })),
        cost: 0
      };
    }
  }

  /**
   * Generate testimonials section
   */
  private async generateTestimonialsSection(
    productInfo: ProductInfo
  ): Promise<{ content: Array<{ name: string; text: string; rating?: number; }>; cost: number }> {
    console.log('💬 Generating testimonials');

    const prompt = `
Crie depoimentos realistas e persuasivos para ${productInfo.name}.

PRODUTO:
- Nome: ${productInfo.name}
- Descrição: ${productInfo.description}
- Público-alvo: ${productInfo.targetAudience}
- Benefícios: ${productInfo.mainBenefits.join(', ')}

Retorne um JSON com 3 depoimentos:
{
  "testimonials": [
    {
      "name": "Nome realista (primeiro nome + inicial do sobrenome)",
      "text": "Depoimento específico e emocional (máx 200 caracteres)", 
      "rating": 5
    }
  ]
}

DIRETRIZES:
- Nomes brasileiros realistas
- Depoimentos específicos sobre resultados
- Use linguagem natural e emocional
- Mencione benefícios específicos
- Todos com rating 5
- Varie o tom: alguns mais emotivos, outros mais técnicos
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em criar depoimentos autênticos para landing pages. Retorne apenas JSON válido."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 500,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"testimonials": []}');
      return { content: result.testimonials, cost: 0 };
    } catch (error) {
      console.error('❌ Testimonials generation failed:', error);
      // Fallback content
      return {
        content: [
          {
            name: "Maria S.",
            text: `${productInfo.name} mudou minha vida completamente! Recomendo para todos.`,
            rating: 5
          },
          {
            name: "João P.", 
            text: `Resultados incríveis em pouco tempo. Vale cada centavo!`,
            rating: 5
          },
          {
            name: "Ana L.",
            text: `Superou todas as minhas expectativas. Produto fantástico!`,
            rating: 5
          }
        ],
        cost: 0
      };
    }
  }

  /**
   * Generate FAQ section
   */
  private async generateFAQSection(
    productInfo: ProductInfo
  ): Promise<{ content: Array<{ question: string; answer: string; }>; cost: number }> {
    console.log('❓ Generating FAQ section');

    const prompt = `
Crie uma seção de FAQ para ${productInfo.name} que aborde as principais objeções.

PRODUTO:
- Nome: ${productInfo.name}
- Descrição: ${productInfo.description}
- Preço: ${productInfo.price} ${productInfo.currency}
- Objeções comuns: ${productInfo.objections.join(', ')}

Retorne um JSON com 4-6 perguntas frequentes:
{
  "faq": [
    {
      "question": "Pergunta comum do cliente",
      "answer": "Resposta persuasiva que remove objeções (máx 200 caracteres)"
    }
  ]
}

DIRETRIZES:
- Aborde todas as objeções mencionadas
- Inclua perguntas sobre preço, garantia, funcionamento
- Respostas devem tranquilizar e persuadir
- Use linguagem natural e confiante
- Termine respostas reforçando benefícios
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em vendas que cria FAQs persuasivos. Retorne apenas JSON válido."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"faq": []}');
      return { content: result.faq, cost: 0 };
    } catch (error) {
      console.error('❌ FAQ generation failed:', error);
      // Fallback content
      return {
        content: [
          {
            question: `Como funciona o ${productInfo.name}?`,
            answer: `${productInfo.name} é simples de usar e oferece resultados comprovados.`
          },
          {
            question: "Existe garantia?",
            answer: "Sim! Oferecemos garantia total de satisfação para sua tranquilidade."
          },
          {
            question: "Quanto tempo demora para ver resultados?",
            answer: "A maioria dos clientes vê resultados já nas primeiras utilizações."
          }
        ],
        cost: 0
      };
    }
  }

  /**
   * Generate CTA section
   */
  private async generateCTASection(
    productInfo: ProductInfo,
    templateConfig: TemplateConfig
  ): Promise<{ content: { title: string; subtitle: string; buttonText: string; }; cost: number }> {
    console.log('📢 Generating CTA section');

    const prompt = `
Crie uma seção de CTA final persuasiva para ${productInfo.name}.

PRODUTO:
- Nome: ${productInfo.name}
- Preço: ${productInfo.price} ${productInfo.currency}
- Público-alvo: ${productInfo.targetAudience}
- Objetivo: ${templateConfig.conversionGoal}

Retorne um JSON com:
{
  "title": "Título urgente e persuasivo (máx 50 caracteres)",
  "subtitle": "Subtítulo que cria urgência e valor (máx 100 caracteres)",
  "buttonText": "Texto do botão de ação (máx 30 caracteres)"
}

DIRETRIZES:
- Crie urgência e escassez
- Destaque o valor e transformação
- Use gatilhos emocionais
- CTA deve ser irresistível
- Foque na ação imediata
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em CTAs de alta conversão. Retorne apenas JSON válido."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 300,
      });

      const content = JSON.parse(response.choices[0].message.content || '{}');
      return { content, cost: 0 };
    } catch (error) {
      console.error('❌ CTA generation failed:', error);
      // Fallback content
      return {
        content: {
          title: `Garanta Seu ${productInfo.name} Agora!`,
          subtitle: `Oferta por tempo limitado - ${productInfo.price} ${productInfo.currency}`,
          buttonText: "Quero Garantir Agora"
        },
        cost: 0
      };
    }
  }

  /**
   * Validate OpenAI API key
   */
  async validateAPIKey(): Promise<boolean> {
    try {
      await this.openai.models.list();
      return true;
    } catch (error) {
      console.error('❌ OpenAI API key validation failed:', error);
      return false;
    }
  }
}

export const aiFunnelGenerator = new AIFunnelGenerator();