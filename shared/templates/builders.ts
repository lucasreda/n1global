/**
 * Enterprise Template Builders & Factories
 * Sistema de construção inteligente para layouts premium
 */

import { enterpriseTokens } from '../theme-tokens';
import type {
  TemplateSection,
  ModularLayout,
  TemplateComposition,
  TemplateBuilder,
  LayoutFactory,
  ResponsiveUtils,
  StyleUtils,
  ContentElement,
  AIImageSlot,
  GridSystem,
  ResponsiveContainer,
} from './index';

import {
  enterpriseContainer,
  contentContainer,
  heroGrid,
  featuresGrid,
  testimonialsGrid,
  modernHeroSection,
  minimalistHeroSection,
  featuresGridSection,
  testimonialsCarouselSection,
  premiumCTASection,
} from './layouts';

// ============================
// 🏗️ TEMPLATE BUILDER CLASS
// ============================

/**
 * Builder fluent para criação de seções enterprise
 */
export class EnterpriseTemplateBuilder implements TemplateBuilder {
  private section: Partial<TemplateSection> = {
    elements: [],
  };

  constructor(id: string, name: string, type: TemplateSection['type']) {
    this.section.id = id;
    this.section.name = name;
    this.section.type = type;
    this.section.elements = [];
  }

  setContainer(container: ResponsiveContainer): this {
    this.section.container = container;
    return this;
  }

  setGrid(grid: GridSystem): this {
    this.section.grid = grid;
    return this;
  }

  addHeading(content: string, level: 1 | 2 | 3 | 4 | 5 | 6 = 1): this {
    const fontSizes = ['4xl', '3xl', '2xl', 'xl', 'lg', 'base'] as const;
    const fontWeights = ['extrabold', 'bold', 'semibold', 'semibold', 'medium', 'medium'] as const;
    
    const element: ContentElement = {
      id: `heading-${Date.now()}`,
      type: 'heading',
      content,
      typography: {
        fontSize: fontSizes[level - 1],
        fontWeight: fontWeights[level - 1],
        lineHeight: 'tight',
        color: '#1e293b',
      },
      spacing: {
        marginBottom: level <= 2 ? 6 : 4,
      },
    };

    this.section.elements!.push(element);
    return this;
  }

  addBody(content: string): this {
    const element: ContentElement = {
      id: `body-${Date.now()}`,
      type: 'body',
      content,
      typography: {
        fontSize: 'base',
        fontWeight: 'normal',
        lineHeight: 'relaxed',
        color: '#64748b',
      },
      spacing: {
        marginBottom: 4,
      },
    };

    this.section.elements!.push(element);
    return this;
  }

  addCTA(text: string, href: string = '#'): this {
    const element: ContentElement = {
      id: `cta-${Date.now()}`,
      type: 'cta',
      content: text,
      typography: {
        fontSize: 'lg',
        fontWeight: 'semibold',
        lineHeight: 'normal',
        color: '#ffffff',
      },
      spacing: {
        marginTop: 6,
      },
    };

    this.section.elements!.push(element);
    return this;
  }

  addHeroImage(prompt: string, style: string = 'premium lifestyle photography'): this {
    const imageSlot: AIImageSlot = {
      id: `hero-image-${Date.now()}`,
      type: 'hero',
      aspectRatio: '16/9',
      sizes: '100vw',
      quality: '4K',
      style,
      prompt,
      loading: 'eager',
      priority: true,
    };

    this.section.elements!.push(imageSlot);
    return this;
  }

  addLifestyleImage(prompt: string, aspectRatio: string = '4/3'): this {
    const imageSlot: AIImageSlot = {
      id: `lifestyle-image-${Date.now()}`,
      type: 'lifestyle',
      aspectRatio,
      sizes: '(max-width: 768px) 100vw, 50vw',
      quality: 'high',
      style: 'authentic lifestyle photography',
      prompt,
      loading: 'lazy',
    };

    this.section.elements!.push(imageSlot);
    return this;
  }

  addIconImage(prompt: string, size: string = '64px'): this {
    const imageSlot: AIImageSlot = {
      id: `icon-image-${Date.now()}`,
      type: 'icon',
      aspectRatio: '1/1',
      sizes: size,
      quality: 'standard',
      style: 'minimalist icon design',
      prompt,
      loading: 'lazy',
    };

    this.section.elements!.push(imageSlot);
    return this;
  }

  addAvatarImage(prompt: string): this {
    const imageSlot: AIImageSlot = {
      id: `avatar-image-${Date.now()}`,
      type: 'avatar',
      aspectRatio: '1/1',
      sizes: '(max-width: 768px) 80px, 96px',
      quality: 'high',
      style: 'professional portrait photography',
      prompt,
      loading: 'lazy',
    };

    this.section.elements!.push(imageSlot);
    return this;
  }

  setBackground(background: TemplateSection['background']): this {
    this.section.background = background;
    return this;
  }

  setPadding(top: keyof typeof enterpriseTokens.spacing, bottom: keyof typeof enterpriseTokens.spacing): this {
    this.section.padding = { top, bottom };
    return this;
  }

  addAnimation(type: string, delay: number = 0): this {
    if (!this.section.animations) {
      this.section.animations = {
        entrance: type,
        sequence: true,
        stagger: delay,
      };
    }
    return this;
  }

  build(): TemplateSection {
    // Validações
    if (!this.section.id || !this.section.name || !this.section.type) {
      throw new Error('Template section deve ter id, name e type definidos');
    }

    if (!this.section.container) {
      this.section.container = enterpriseContainer;
    }

    if (!this.section.grid) {
      this.section.grid = featuresGrid;
    }

    if (!this.section.padding) {
      this.section.padding = { top: 12, bottom: 12 };
    }

    return this.section as TemplateSection;
  }
}

// ============================
// 🏭 LAYOUT FACTORY CLASS
// ============================

/**
 * Factory para criação de layouts completos
 */
export class EnterpriseLayoutFactory implements LayoutFactory {
  
  createLandingPage(config: Partial<TemplateComposition> = {}): ModularLayout {
    const {
      visualIdentity = {
        primaryColor: '#3b82f6',
        secondaryColor: '#64748b',
        accentColor: '#f59e0b',
        mood: 'professional',
        industry: 'business',
      },
      aiImageConfig = {
        style: 'premium commercial photography',
        quality: '4K',
        consistency: true,
        brandAlignment: true,
      },
      performance = {
        coreWebVitals: { lcp: 2500, fid: 100, cls: 0.1 },
        loadingStrategy: 'progressive',
        resourceHints: ['preload', 'prefetch'],
      },
    } = config;

    // Criar hero personalizado
    const heroBuilder = new EnterpriseTemplateBuilder('hero-custom', 'Hero Personalizado', 'hero');
    heroBuilder
      .setContainer(enterpriseContainer)
      .setGrid(heroGrid)
      .addHeading('{{productName}} - Transforme Seu {{industry}}', 1)
      .addBody('{{productDescription}} com qualidade premium e resultados garantidos.')
      .addCTA('Começar Agora')
      .addHeroImage(
        `Professional ${visualIdentity.industry} scene, ${visualIdentity.primaryColor} and ${visualIdentity.secondaryColor} color palette, ${aiImageConfig.style}, premium lighting, sophisticated atmosphere, 4K quality`,
        aiImageConfig.style
      )
      .setBackground({
        type: 'gradient',
        value: `linear-gradient(135deg, ${visualIdentity.primaryColor} 0%, ${visualIdentity.secondaryColor} 100%)`,
        overlay: 'rgba(0, 0, 0, 0.3)',
      })
      .setPadding(20, 20)
      .addAnimation('staggered', 150);

    // Features customizado
    const featuresBuilder = new EnterpriseTemplateBuilder('features-custom', 'Features Premium', 'features');
    featuresBuilder
      .setContainer(enterpriseContainer)
      .setGrid(featuresGrid)
      .addHeading('Por que escolher {{productName}}?', 2)
      .addBody('Descubra os benefícios únicos que fazem a diferença.')
      .setBackground({
        type: 'solid',
        value: '#f8fafc',
      })
      .setPadding(16, 16);

    return {
      id: `landing-${Date.now()}`,
      name: 'Landing Page Enterprise',
      description: 'Layout premium personalizado com IA para máxima conversão',
      category: 'landing',
      sections: [
        heroBuilder.build(),
        featuresBuilder.build(),
        testimonialsCarouselSection,
        premiumCTASection,
      ],
      seo: {
        title: `{{productName}} - ${visualIdentity.industry} Premium | ${visualIdentity.mood}`,
        description: '{{productDescription}} - Qualidade enterprise com resultados comprovados',
        keywords: [visualIdentity.industry, 'premium', 'qualidade', visualIdentity.mood],
      },
      performance: {
        criticalCSS: true,
        lazyLoading: true,
        imageOptimization: true,
        fontPreload: ['Inter-400.woff2', 'Inter-600.woff2', 'Inter-700.woff2'],
      },
      accessibility: {
        skipLinks: true,
        ariaLabels: true,
        contrastRatio: 'AA',
        focusManagement: true,
      },
    };
  }

  createProductPage(config: Partial<TemplateComposition> = {}): ModularLayout {
    const {
      visualIdentity = {
        primaryColor: '#059669',
        secondaryColor: '#0f766e',
        accentColor: '#f59e0b',
        mood: 'trustworthy',
        industry: 'ecommerce',
      },
    } = config;

    const productHero = new EnterpriseTemplateBuilder('product-hero', 'Produto Hero', 'hero');
    productHero
      .setContainer(enterpriseContainer)
      .setGrid(heroGrid)
      .addHeading('{{productName}}', 1)
      .addBody('{{productDescription}} - Descubra a qualidade premium que você merece.')
      .addCTA('Comprar Agora')
      .addHeroImage(
        `Professional {{productName}} product photography, clean white background, premium lighting, commercial quality, ${visualIdentity.primaryColor} accent, 4K resolution`,
        'clean product photography'
      )
      .setBackground({ type: 'solid', value: '#ffffff' })
      .setPadding(16, 16);

    return {
      id: `product-${Date.now()}`,
      name: 'Página de Produto Enterprise',
      description: 'Layout focado no produto com conversão otimizada',
      category: 'product',
      sections: [
        productHero.build(),
        featuresGridSection,
        testimonialsCarouselSection,
        premiumCTASection,
      ],
      seo: {
        title: '{{productName}} - Compre com Confiança | Melhor Preço',
        description: 'Descubra {{productName}} - {{productDescription}} com garantia e entrega rápida',
        keywords: ['{{productName}}', 'comprar', 'melhor preço', 'qualidade'],
      },
      performance: {
        criticalCSS: true,
        lazyLoading: true,
        imageOptimization: true,
        fontPreload: ['Inter-400.woff2', 'Inter-600.woff2'],
      },
      accessibility: {
        skipLinks: true,
        ariaLabels: true,
        contrastRatio: 'AAA',
        focusManagement: true,
      },
    };
  }

  createServicePage(config: Partial<TemplateComposition> = {}): ModularLayout {
    const serviceHero = new EnterpriseTemplateBuilder('service-hero', 'Serviço Hero', 'hero');
    serviceHero
      .setContainer(enterpriseContainer)
      .addHeading('{{serviceName}} - Soluções Profissionais', 1)
      .addBody('{{serviceDescription}} com qualidade garantida e suporte especializado.')
      .addCTA('Solicitar Orçamento')
      .addHeroImage(
        'Professional service consultation scene, modern office environment, premium lighting, business atmosphere, 4K quality',
        'professional service photography'
      )
      .setBackground({
        type: 'gradient',
        value: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
      })
      .setPadding(20, 20);

    return {
      id: `service-${Date.now()}`,
      name: 'Página de Serviço Enterprise',
      description: 'Layout profissional para serviços premium',
      category: 'service',
      sections: [
        serviceHero.build(),
        featuresGridSection,
        testimonialsCarouselSection,
        premiumCTASection,
      ],
      seo: {
        title: '{{serviceName}} - Serviços Profissionais | Qualidade Garantida',
        description: '{{serviceDescription}} - Soluções personalizadas para seu negócio',
        keywords: ['{{serviceName}}', 'serviços', 'profissional', 'qualidade'],
      },
      performance: {
        criticalCSS: true,
        lazyLoading: true,
        imageOptimization: true,
        fontPreload: ['Inter-400.woff2', 'Inter-600.woff2'],
      },
      accessibility: {
        skipLinks: true,
        ariaLabels: true,
        contrastRatio: 'AA',
        focusManagement: true,
      },
    };
  }

  createPortfolioPage(config: Partial<TemplateComposition> = {}): ModularLayout {
    const portfolioHero = new EnterpriseTemplateBuilder('portfolio-hero', 'Portfolio Hero', 'hero');
    portfolioHero
      .setContainer(contentContainer)
      .addHeading('Nosso Portfolio', 1)
      .addBody('Conheça nossos projetos e cases de sucesso que transformaram negócios.')
      .addCTA('Ver Todos os Projetos')
      .addHeroImage(
        'Creative portfolio showcase, modern design workspace, professional presentation, premium lighting, inspiring atmosphere, 4K quality',
        'creative portfolio photography'
      )
      .setBackground({ type: 'solid', value: '#fafafa' })
      .setPadding(16, 16);

    return {
      id: `portfolio-${Date.now()}`,
      name: 'Portfolio Enterprise',
      description: 'Showcase profissional de projetos e cases',
      category: 'portfolio',
      sections: [
        portfolioHero.build(),
        featuresGridSection,
        testimonialsCarouselSection,
        premiumCTASection,
      ],
      seo: {
        title: 'Portfolio - Nossos Projetos e Cases de Sucesso',
        description: 'Conheça nosso portfolio com projetos únicos e resultados excepcionais',
        keywords: ['portfolio', 'projetos', 'cases', 'sucesso', 'trabalhos'],
      },
      performance: {
        criticalCSS: true,
        lazyLoading: true,
        imageOptimization: true,
        fontPreload: ['Inter-400.woff2', 'Inter-600.woff2'],
      },
      accessibility: {
        skipLinks: true,
        ariaLabels: true,
        contrastRatio: 'AA',
        focusManagement: true,
      },
    };
  }
}

// ============================
// 📱 RESPONSIVE UTILITIES
// ============================

/**
 * Utilidades para responsividade enterprise
 */
export class EnterpriseResponsiveUtils implements ResponsiveUtils {
  
  getContainerWidth(breakpoint: keyof typeof enterpriseTokens.breakpoints): string {
    const widths = {
      xs: '100%',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      '3xl': '1920px',
    };
    return widths[breakpoint] || '100%';
  }

  getColumnsForBreakpoint(breakpoint: keyof typeof enterpriseTokens.breakpoints, total: number): number {
    const columnMaps = {
      xs: 1,
      sm: Math.min(2, total),
      md: Math.min(2, total),
      lg: Math.min(3, total),
      xl: Math.min(4, total),
      '2xl': Math.min(4, total),
      '3xl': Math.min(6, total),
    };
    return columnMaps[breakpoint] || 1;
  }

  getFontSizeForBreakpoint(
    breakpoint: keyof typeof enterpriseTokens.breakpoints,
    size: keyof typeof enterpriseTokens.typography.fontSizes
  ): string {
    const sizeConfig = enterpriseTokens.typography.fontSizes[size];
    
    // Mobile first approach
    if (breakpoint === 'xs' || breakpoint === 'sm') {
      return sizeConfig.mobile;
    }
    
    return sizeConfig.desktop;
  }

  getSpacingForBreakpoint(
    breakpoint: keyof typeof enterpriseTokens.breakpoints,
    spacing: keyof typeof enterpriseTokens.spacing
  ): string {
    const baseSpacing = enterpriseTokens.spacing[spacing];
    
    // Responsive scaling for larger screens
    if (breakpoint === '2xl' || breakpoint === '3xl') {
      const numericValue = parseFloat(baseSpacing);
      return `${numericValue * 1.25}rem`;
    }
    
    return baseSpacing;
  }
}

// ============================
// 🎨 STYLE UTILITIES
// ============================

/**
 * Utilidades para estilo e tema
 */
export class EnterpriseStyleUtils implements StyleUtils {
  
  getColorVariant(color: string, variant: number): string {
    // Se for uma cor do sistema de tokens, buscar a variante
    const colorName = this.extractColorName(color);
    if (colorName && enterpriseTokens.colors[colorName as keyof typeof enterpriseTokens.colors]) {
      const colorObject = enterpriseTokens.colors[colorName as keyof typeof enterpriseTokens.colors];
      return (colorObject as any)[variant] || color;
    }
    
    // Fallback para cores customizadas
    return this.adjustColorBrightness(color, variant);
  }

  generateGradient(fromColor: string, toColor: string, direction: string = '135deg'): string {
    return `linear-gradient(${direction}, ${fromColor} 0%, ${toColor} 100%)`;
  }

  getShadowForElevation(level: keyof typeof enterpriseTokens.shadows): string {
    const shadow = enterpriseTokens.shadows[level];
    return typeof shadow === 'string' ? shadow : shadow.md || '';
  }

  getAnimationTiming(
    duration: keyof typeof enterpriseTokens.animations.durations,
    easing: keyof typeof enterpriseTokens.animations.easings
  ): string {
    return `${enterpriseTokens.animations.durations[duration]} ${enterpriseTokens.animations.easings[easing]}`;
  }

  getTypographyStyle(element: ContentElement['typography']): Record<string, any> {
    const fontSize = enterpriseTokens.typography.fontSizes[element.fontSize];
    
    return {
      fontSize: fontSize.mobile,
      fontWeight: enterpriseTokens.typography.fontWeights[element.fontWeight].toString(),
      lineHeight: enterpriseTokens.typography.lineHeights[element.lineHeight].toString(),
      color: element.color,
      '@media (min-width: 768px)': {
        fontSize: fontSize.desktop,
      },
    };
  }

  private extractColorName(color: string): string | null {
    // Extrair nome da cor de valores como '#3b82f6' -> 'primary'
    const colorMap = {
      '#3b82f6': 'primary',
      '#64748b': 'secondary',
      '#f59e0b': 'accent',
      '#22c55e': 'success',
      '#ef4444': 'error',
    };
    
    return (colorMap as any)[color] || null;
  }

  private adjustColorBrightness(color: string, variant: number): string {
    // Implementação simples para ajustar brilho
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * (variant - 500) / 10);
    const R = (num >> 16) + amt;
    const B = (num >> 8 & 0x00FF) + amt;
    const G = (num & 0x0000FF) + amt;
    
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + 
      (B < 255 ? B < 1 ? 0 : B : 255) * 0x100 + 
      (G < 255 ? G < 1 ? 0 : G : 255)).toString(16).slice(1);
  }
}

// ============================
// 🚀 FACTORY INSTANCES
// ============================

// Factory instances for convenience
export const layoutFactory = new EnterpriseLayoutFactory();
export const responsiveUtils = new EnterpriseResponsiveUtils();
export const styleUtils = new EnterpriseStyleUtils();