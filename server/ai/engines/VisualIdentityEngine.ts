import OpenAI from 'openai';
import { 
  ColorPalette, 
  StyleTokens, 
  VisualIdentity, 
  ImagePromptTemplate,
  GeneratedAssetBundle 
} from '@shared/schema';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
export interface VisualIdentityResult {
  visualIdentity: VisualIdentity;
  promptTemplates: ImagePromptTemplate[];
  cost: number;
  qualityScore: number;
}

export class VisualIdentityEngine {
  private openaiApiKey: string | undefined;

  constructor() {
    // Using OpenAI's API with blueprint configuration
    this.openaiApiKey = process.env.OPENAI_API_KEY;
  }

  private getOpenAI(): OpenAI {
    if (!this.openaiApiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }
    return new OpenAI({ apiKey: this.openaiApiKey });
  }

  async generateVisualIdentity(
    niche: string, 
    targetAudience: string, 
    brandPersonality: string[],
    businessContext: any
  ): Promise<VisualIdentityResult> {
    console.log('🎨 Generating enterprise visual identity...');
    
    try {
      let totalCost = 0;

      // Step 1: Generate intelligent color palette
      console.log('  🌈 Generating psychologically-aligned color palette...');
      const paletteResult = await this.generateColorPalette(niche, targetAudience, brandPersonality);
      totalCost += paletteResult.cost;

      // Step 2: Generate style tokens system
      console.log('  📐 Creating design token system...');
      const tokensResult = await this.generateStyleTokens(paletteResult.palette, niche);
      totalCost += tokensResult.cost;

      // Step 3: Generate image prompt templates
      console.log('  📝 Creating intelligent prompt templates...');
      const promptTemplates = await this.generatePromptTemplates(niche, paletteResult.palette, brandPersonality);
      totalCost += promptTemplates.cost;

      // Step 4: Create visual guidelines
      console.log('  📋 Generating brand guidelines...');
      const guidelines = await this.generateBrandGuidelines(paletteResult.palette, niche, brandPersonality);
      totalCost += guidelines.cost;

      // Assemble complete visual identity
      const visualIdentity: VisualIdentity = {
        id: `vi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: `${niche} Visual Identity`,
        palette: paletteResult.palette,
        assets: this.createEmptyAssetBundle(paletteResult.palette.id),
        tokens: tokensResult.tokens,
        niche,
        targetAudience,
        brandPersonality: brandPersonality as any,
        guidelines: guidelines.guidelines,
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        aiModel: 'gpt-5',
        promptVersion: '2.1.0',
        qualityScore: this.calculateQualityScore(paletteResult.palette, tokensResult.tokens, promptTemplates.templates),
        cacheExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        lastUsed: new Date().toISOString(),
        usageCount: 0
      };

      const result: VisualIdentityResult = {
        visualIdentity,
        promptTemplates: promptTemplates.templates,
        cost: totalCost,
        qualityScore: visualIdentity.qualityScore
      };

      console.log(`✅ Visual identity generated - Quality: ${result.qualityScore}/10, Cost: $${totalCost.toFixed(4)}`);
      return result;

    } catch (error) {
      console.error('❌ Visual identity generation failed:', error);
      return this.generateFallbackIdentity(niche, targetAudience, brandPersonality);
    }
  }

  private async generateColorPalette(
    niche: string, 
    targetAudience: string, 
    brandPersonality: string[]
  ): Promise<{ palette: ColorPalette; cost: number }> {
    const prompt = `
Gere uma paleta de cores psicologicamente alinhada para esta marca:

NICHO: ${niche}
PÚBLICO: ${targetAudience}
PERSONALIDADE: ${brandPersonality.join(', ')}

Analise a psicologia das cores e crie uma paleta que:
1. Evoque as emoções certas para o público
2. Transmita confiança e profissionalismo
3. Seja acessível (contraste WCAG AA)
4. Funcione em diferentes contextos

Retorne JSON no formato:
{
  "palette": {
    "name": "nome descritivo da paleta",
    "primary": {
      "main": "#hexcode",
      "light": "#hexcode", 
      "dark": "#hexcode",
      "contrast": "#hexcode"
    },
    "secondary": {
      "main": "#hexcode",
      "light": "#hexcode",
      "dark": "#hexcode", 
      "contrast": "#hexcode"
    },
    "accent": {
      "main": "#hexcode",
      "light": "#hexcode",
      "dark": "#hexcode",
      "contrast": "#hexcode"
    },
    "neutral": {
      "white": "#ffffff",
      "light": "#hexcode",
      "medium": "#hexcode", 
      "dark": "#hexcode",
      "black": "#hexcode"
    },
    "semantic": {
      "success": "#hexcode",
      "warning": "#hexcode",
      "error": "#hexcode",
      "info": "#hexcode"
    },
    "mood": "premium|trustworthy|energetic|calming|professional|playful",
    "industry": "categoria da indústria",
    "accessibility": {
      "wcagLevel": "AA",
      "contrastRatios": {
        "primaryOnWhite": 4.5,
        "primaryOnDark": 4.5,
        "secondaryOnWhite": 4.5
      }
    }
  },
  "reasoning": "explicação da escolha psicológica das cores"
}
    `;

      const openai = this.getOpenAI();
      const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "Você é especialista em psicologia das cores e design de marca. Crie paletas que maximizem conversão e confiança. Retorne JSON válido."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const cost = (inputTokens * 0.005 + outputTokens * 0.015) / 1000;

    const palette: ColorPalette = {
      id: `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...result.palette
    };

    console.log(`    Generated palette: ${palette.name} (${palette.mood} mood)`);
    return { palette, cost };
  }

  private async generateStyleTokens(
    palette: ColorPalette, 
    niche: string
  ): Promise<{ tokens: StyleTokens; cost: number }> {
    const prompt = `
Crie um sistema completo de design tokens para este contexto:

PALETA: ${palette.name} (${palette.mood})
NICHO: ${niche}
CORES: ${JSON.stringify(palette, null, 2)}

Gere tokens que criem hierarquia visual clara e sejam mobile-first.

Retorne JSON:
{
  "tokens": {
    "name": "Design Tokens ${niche}",
    "typography": {
      "fontFamilies": {
        "heading": "font profissional para títulos",
        "body": "font legível para texto",
        "mono": "font monoespaçada"
      },
      "fontSizes": {
        "xs": "12px",
        "sm": "14px", 
        "base": "16px",
        "lg": "18px",
        "xl": "20px",
        "2xl": "24px",
        "3xl": "30px",
        "4xl": "36px",
        "5xl": "48px",
        "6xl": "60px"
      },
      "lineHeights": {
        "none": "1",
        "tight": "1.25",
        "snug": "1.375",
        "normal": "1.5", 
        "relaxed": "1.625",
        "loose": "2"
      },
      "fontWeights": {
        "thin": "100",
        "light": "300",
        "normal": "400",
        "medium": "500",
        "semibold": "600", 
        "bold": "700",
        "extrabold": "800"
      }
    },
    "spacing": {
      "px": "1px",
      "0": "0",
      "1": "4px",
      "2": "8px", 
      "3": "12px",
      "4": "16px",
      "5": "20px",
      "6": "24px",
      "8": "32px",
      "10": "40px",
      "12": "48px",
      "16": "64px",
      "20": "80px",
      "24": "96px",
      "32": "128px",
      "40": "160px",
      "48": "192px",
      "56": "224px",
      "64": "256px"
    },
    "shadows": {
      "none": "none",
      "sm": "sombra sutil",
      "base": "sombra padrão",
      "md": "sombra média",
      "lg": "sombra grande", 
      "xl": "sombra extra grande",
      "2xl": "sombra muito grande",
      "inner": "sombra interna"
    },
    "borderRadius": {
      "none": "0",
      "sm": "2px",
      "base": "4px",
      "md": "6px", 
      "lg": "8px",
      "xl": "12px",
      "2xl": "16px",
      "3xl": "24px",
      "full": "9999px"
    },
    "animations": {
      "durations": {
        "fast": "150ms",
        "base": "250ms",
        "slow": "350ms"
      },
      "easings": {
        "linear": "linear",
        "easeIn": "cubic-bezier(0.4, 0, 1, 1)",
        "easeOut": "cubic-bezier(0, 0, 0.2, 1)", 
        "easeInOut": "cubic-bezier(0.4, 0, 0.2, 1)"
      }
    },
    "breakpoints": {
      "xs": "475px",
      "sm": "640px",
      "md": "768px",
      "lg": "1024px",
      "xl": "1280px",
      "2xl": "1536px"
    }
  }
}
    `;

      const openai = this.getOpenAI();
      const completion = await openai.chat.completions.create({
      model: "gpt-5", 
      messages: [
        {
          role: "system",
          content: "Você é especialista em design systems e design tokens. Crie sistemas escaláveis e consistentes. Retorne JSON válido."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const cost = (inputTokens * 0.005 + outputTokens * 0.015) / 1000;

    const tokens: StyleTokens = {
      id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...result.tokens
    };

    return { tokens, cost };
  }

  private async generatePromptTemplates(
    niche: string,
    palette: ColorPalette,
    brandPersonality: string[]
  ): Promise<{ templates: ImagePromptTemplate[]; cost: number }> {
    const prompt = `
Crie templates de prompt para geração de imagens IA customizadas:

NICHO: ${niche}
PERSONALIDADE: ${brandPersonality.join(', ')}
PALETA: ${palette.name} (cores: ${palette.primary.main}, ${palette.secondary.main})

Crie templates para diferentes seções que garantam consistência visual.

Retorne JSON:
{
  "templates": [
    {
      "name": "Hero Principal",
      "category": "hero",
      "template": "Professional \${niche} \${style}, \${primaryColor} and \${secondaryColor} color scheme, premium lighting, clean background, high-end commercial style, 4K quality",
      "variables": [
        {
          "name": "niche",
          "type": "text", 
          "required": true,
          "description": "Nicho do negócio"
        },
        {
          "name": "style",
          "type": "enum",
          "required": true,
          "options": ["product photography", "lifestyle shot", "professional portrait"],
          "description": "Estilo da imagem"
        },
        {
          "name": "primaryColor",
          "type": "color",
          "required": true,
          "description": "Cor primária da marca"
        }
      ],
      "style": {
        "photographic": true,
        "illustrated": false,
        "minimalist": true,
        "artistic": false
      },
      "aspectRatio": "16:9",
      "quality": "hd",
      "examples": [
        {
          "input": {"niche": "skincare", "style": "product photography", "primaryColor": "#2563eb"},
          "resultDescription": "Imagem profissional de produtos de skincare com lighting premium e fundo limpo"
        }
      ]
    },
    {
      "name": "Ícones de Benefícios",
      "category": "icon",
      "template": "Minimalist \${benefit} icon, \${style} style, \${primaryColor} color, vector illustration, clean lines, professional design",
      "variables": [
        {
          "name": "benefit",
          "type": "text",
          "required": true, 
          "description": "Nome do benefício"
        },
        {
          "name": "style", 
          "type": "enum",
          "required": true,
          "options": ["outline", "filled", "duotone"],
          "description": "Estilo do ícone"
        }
      ],
      "style": {
        "photographic": false,
        "illustrated": true,
        "minimalist": true,
        "artistic": false
      },
      "aspectRatio": "1:1",
      "quality": "standard"
    },
    {
      "name": "Prova Social",
      "category": "social",
      "template": "Professional business person headshot, \${gender} \${age}, confident expression, corporate attire, clean background, high-quality portrait photography",
      "variables": [
        {
          "name": "gender",
          "type": "enum",
          "required": false,
          "options": ["male", "female", "diverse"],
          "description": "Gênero da pessoa"
        },
        {
          "name": "age",
          "type": "enum", 
          "required": false,
          "options": ["young professional", "middle-aged", "senior executive"],
          "description": "Faixa etária"
        }
      ],
      "style": {
        "photographic": true,
        "illustrated": false,
        "minimalist": false,
        "artistic": false
      },
      "aspectRatio": "1:1",
      "quality": "hd"
    }
  ]
}
    `;

      const openai = this.getOpenAI();
      const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system", 
          content: "Você é especialista em prompts para IA gerativa e design visual. Crie templates que produzam imagens consistentes e de alta qualidade. Retorne JSON válido."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const cost = (inputTokens * 0.005 + outputTokens * 0.015) / 1000;

    const templates: ImagePromptTemplate[] = result.templates.map((template: any) => ({
      id: `ipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...template
    }));

    console.log(`    Generated ${templates.length} prompt templates`);
    return { templates, cost };
  }

  private async generateBrandGuidelines(
    palette: ColorPalette,
    niche: string, 
    brandPersonality: string[]
  ): Promise<{ guidelines: any; cost: number }> {
    const prompt = `
Crie diretrizes de marca profissionais para:

NICHO: ${niche}
PERSONALIDADE: ${brandPersonality.join(', ')}
PALETA: ${palette.name}

Retorne JSON:
{
  "guidelines": {
    "dosDonts": [
      {
        "type": "do",
        "rule": "Use cores primárias para CTAs",
        "example": "Botões importantes em ${palette.primary.main}"
      },
      {
        "type": "dont", 
        "rule": "Não misture mais de 3 cores por seção",
        "example": "Evite poluição visual"
      }
    ],
    "brandVoice": {
      "tone": "tom de voz baseado na personalidade",
      "language": "português brasileiro",
      "keywords": ["palavra-chave 1", "palavra-chave 2", "palavra-chave 3"]
    }
  }
}
    `;

      const openai = this.getOpenAI();
      const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "Você é especialista em branding e diretrizes de marca. Crie guias práticos e acionáveis. Retorne JSON válido."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const cost = (inputTokens * 0.005 + outputTokens * 0.015) / 1000;

    return { guidelines: result.guidelines, cost };
  }

  private createEmptyAssetBundle(paletteId: string): GeneratedAssetBundle {
    return {
      id: `gab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      palette: paletteId,
      style: 'photographic',
      hero: { 
        primary: {
          id: '',
          url: '',
          width: 1920,
          height: 1080,
          format: 'webp',
          size: 0,
          alt: '',
          prompt: '',
          variants: { mobile: '', tablet: '', desktop: '', thumbnail: '' },
          dominantColors: [],
          aspectRatio: '16:9', 
          generatedAt: '',
          processingTime: 0
        }
      },
      lifestyle: { primary: [] },
      product: { showcase: [] },
      social: { avatars: [] },
      backgrounds: { section: [], patterns: [], textures: [] },
      icons: { benefits: [], features: [], social: [], navigation: [] },
      generatedAt: new Date().toISOString(),
      totalSize: 0,
      compressionApplied: false,
      cacheKey: ''
    };
  }

  private calculateQualityScore(palette: ColorPalette, tokens: StyleTokens, templates: ImagePromptTemplate[]): number {
    let score = 7.0; // Base score

    // Palette quality
    if (palette.accessibility.wcagLevel === 'AA') score += 1.0;
    if (palette.mood && ['premium', 'trustworthy', 'professional'].includes(palette.mood)) score += 0.5;

    // Token system completeness
    const tokenSections = Object.keys(tokens).length;
    score += Math.min(tokenSections / 8, 1.0); // Max 1.0 bonus

    // Template diversity
    const templateCategories = new Set(templates.map(t => t.category)).size;
    score += Math.min(templateCategories / 5, 1.0); // Max 1.0 bonus

    return Math.min(score, 10);
  }

  private generateFallbackIdentity(niche: string, targetAudience: string, brandPersonality: string[]): VisualIdentityResult {
    const fallbackPalette: ColorPalette = {
      id: `cp_fallback_${Date.now()}`,
      name: `${niche} Professional Palette`,
      primary: { main: '#2563eb', light: '#3b82f6', dark: '#1d4ed8', contrast: '#ffffff' },
      secondary: { main: '#64748b', light: '#94a3b8', dark: '#475569', contrast: '#ffffff' },
      accent: { main: '#059669', light: '#10b981', dark: '#047857', contrast: '#ffffff' },
      neutral: { white: '#ffffff', light: '#f8fafc', medium: '#64748b', dark: '#1e293b', black: '#000000' },
      semantic: { success: '#059669', warning: '#d97706', error: '#dc2626', info: '#2563eb' },
      mood: 'professional',
      industry: niche,
      accessibility: { wcagLevel: 'AA', contrastRatios: {} }
    };

    const fallbackTokens: StyleTokens = {
      id: `st_fallback_${Date.now()}`,
      name: 'Fallback Design Tokens',
      typography: {
        fontFamilies: { heading: 'Inter', body: 'Inter', mono: 'Menlo' },
        fontSizes: { xs: '12px', sm: '14px', base: '16px', lg: '18px', xl: '20px', '2xl': '24px', '3xl': '30px', '4xl': '36px', '5xl': '48px', '6xl': '60px' },
        lineHeights: { none: '1', tight: '1.25', snug: '1.375', normal: '1.5', relaxed: '1.625', loose: '2' },
        fontWeights: { thin: '100', light: '300', normal: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800' }
      },
      spacing: { px: '1px', '0': '0', '1': '4px', '2': '8px', '3': '12px', '4': '16px', '5': '20px', '6': '24px', '8': '32px', '10': '40px', '12': '48px', '16': '64px', '20': '80px', '24': '96px', '32': '128px', '40': '160px', '48': '192px', '56': '224px', '64': '256px' },
      shadows: { none: 'none', sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)', base: '0 1px 3px 0 rgb(0 0 0 / 0.1)', md: '0 4px 6px -1px rgb(0 0 0 / 0.1)', lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)', xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)', '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)', inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)' },
      borderRadius: { none: '0', sm: '2px', base: '4px', md: '6px', lg: '8px', xl: '12px', '2xl': '16px', '3xl': '24px', full: '9999px' },
      animations: { durations: { fast: '150ms', base: '250ms', slow: '350ms' }, easings: { linear: 'linear', easeIn: 'cubic-bezier(0.4, 0, 1, 1)', easeOut: 'cubic-bezier(0, 0, 0.2, 1)', easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)' } },
      breakpoints: { xs: '475px', sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' }
    };

    const visualIdentity: VisualIdentity = {
      id: `vi_fallback_${Date.now()}`,
      name: `${niche} Fallback Identity`,
      palette: fallbackPalette,
      assets: this.createEmptyAssetBundle(fallbackPalette.id),
      tokens: fallbackTokens,
      niche,
      targetAudience,
      brandPersonality: brandPersonality as any,
      guidelines: { dosDonts: [], brandVoice: { tone: 'professional', language: 'pt-br', keywords: [] } },
      generatedAt: new Date().toISOString(),
      version: '1.0.0-fallback',
      aiModel: 'fallback',
      promptVersion: '1.0.0',
      qualityScore: 6.0,
      cacheExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      lastUsed: new Date().toISOString(),
      usageCount: 0
    };

    return {
      visualIdentity,
      promptTemplates: [],
      cost: 0.001,
      qualityScore: 6.0
    };
  }
}