/**
 * Enterprise Layout Templates
 * Layouts modulares premium com slots otimizados para imagens IA
 */

import type {
  ModularLayout,
  TemplateSection,
  ResponsiveContainer,
  GridSystem,
  ContentElement,
  AIImageSlot,
} from './index';

// ============================
// 🏗️ BASE CONTAINERS
// ============================

/**
 * Container padrão enterprise
 */
const enterpriseContainer: ResponsiveContainer = {
  maxWidth: '2xl',
  padding: {
    mobile: 4,
    tablet: 6,
    desktop: 8,
  },
  margin: 'auto',
  centered: true,
};

/**
 * Container full-width para hero
 */
const fullWidthContainer: ResponsiveContainer = {
  maxWidth: '2xl', // usando 2xl pois 3xl não existe no tipo
  padding: {
    mobile: 0,
    tablet: 0,
    desktop: 0,
  },
  margin: 'auto',
  centered: true,
};

/**
 * Container condensado para conteúdo
 */
const contentContainer: ResponsiveContainer = {
  maxWidth: 'lg',
  padding: {
    mobile: 4,
    tablet: 6,
    desktop: 8,
  },
  margin: 'auto',
  centered: true,
};

// ============================
// 📐 GRID SYSTEMS
// ============================

/**
 * Grid responsivo 12 colunas
 */
const twelveColumnGrid: GridSystem = {
  columns: {
    mobile: 1,
    tablet: 2,
    desktop: 3,
  },
  gap: {
    mobile: 4,
    tablet: 6,
    desktop: 8,
  },
  alignment: 'stretch',
  justification: 'center',
};

/**
 * Grid hero 2 colunas
 */
const heroGrid: GridSystem = {
  columns: {
    mobile: 1,
    tablet: 1,
    desktop: 2,
  },
  gap: {
    mobile: 6,
    tablet: 8,
    desktop: 12,
  },
  alignment: 'center',
  justification: 'between',
};

/**
 * Grid features 3 colunas
 */
const featuresGrid: GridSystem = {
  columns: {
    mobile: 1,
    tablet: 2,
    desktop: 3,
  },
  gap: {
    mobile: 6,
    tablet: 8,
    desktop: 10,
  },
  alignment: 'start',
  justification: 'evenly',
};

/**
 * Grid testimonials flex
 */
const testimonialsGrid: GridSystem = {
  columns: {
    mobile: 1,
    tablet: 2,
    desktop: 3,
  },
  gap: {
    mobile: 4,
    tablet: 6,
    desktop: 8,
  },
  alignment: 'stretch',
  justification: 'center',
};

// ============================
// 🎨 HERO SECTION TEMPLATES
// ============================

/**
 * Hero moderno com background IA
 */
const modernHeroSection: TemplateSection = {
  id: 'hero-modern',
  name: 'Hero Moderno',
  type: 'hero',
  container: fullWidthContainer,
  background: {
    type: 'gradient',
    value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    overlay: 'rgba(0, 0, 0, 0.3)',
    attachment: 'fixed',
  },
  padding: {
    top: 20,
    bottom: 20,
  },
  grid: heroGrid,
  elements: [
    {
      id: 'hero-heading',
      type: 'heading',
      content: '{{productName}} - {{mainBenefit}}',
      typography: {
        fontSize: '4xl',
        fontWeight: 'bold',
        lineHeight: 'tight',
        color: '#ffffff',
      },
      spacing: {
        marginBottom: 6,
      },
      animation: {
        type: 'fadeIn',
        duration: 'slow',
        delay: 0,
      },
    } as ContentElement,
    {
      id: 'hero-subheading',
      type: 'subheading',
      content: '{{productDescription}}',
      typography: {
        fontSize: 'xl',
        fontWeight: 'normal',
        lineHeight: 'relaxed',
        color: '#f1f5f9',
      },
      spacing: {
        marginBottom: 8,
      },
      animation: {
        type: 'slideUp',
        duration: 'slow',
        delay: 200,
      },
    } as ContentElement,
    {
      id: 'hero-cta',
      type: 'cta',
      content: '{{ctaText}}',
      typography: {
        fontSize: 'lg',
        fontWeight: 'semibold',
        lineHeight: 'normal',
        color: '#1e293b',
      },
      spacing: {
        marginTop: 4,
      },
      animation: {
        type: 'scaleIn',
        duration: 'normal',
        delay: 400,
      },
    } as ContentElement,
    {
      id: 'hero-background',
      type: 'background',
      aspectRatio: '21/9',
      sizes: '100vw',
      quality: '4K',
      style: 'premium lifestyle photography',
      prompt: 'Professional {{industry}} lifestyle scene, {{primaryColor}} and {{secondaryColor}} color palette, premium lighting, sophisticated atmosphere, 4K quality',
      loading: 'eager',
      priority: true,
    } as AIImageSlot,
  ],
  animations: {
    entrance: 'staggered',
    sequence: true,
    stagger: 150,
  },
};

/**
 * Hero minimalista com produto
 */
const minimalistHeroSection: TemplateSection = {
  id: 'hero-minimal',
  name: 'Hero Minimalista',
  type: 'hero',
  container: enterpriseContainer,
  background: {
    type: 'solid',
    value: '#ffffff',
  },
  padding: {
    top: 16,
    bottom: 16,
  },
  grid: heroGrid,
  elements: [
    {
      id: 'minimal-heading',
      type: 'heading',
      content: '{{productName}}',
      typography: {
        fontSize: '5xl',
        fontWeight: 'extrabold',
        lineHeight: 'tight',
        color: '#1e293b',
      },
      spacing: {
        marginBottom: 4,
      },
    } as ContentElement,
    {
      id: 'minimal-description',
      type: 'body',
      content: '{{productDescription}}',
      typography: {
        fontSize: 'lg',
        fontWeight: 'normal',
        lineHeight: 'relaxed',
        color: '#64748b',
      },
      spacing: {
        marginBottom: 8,
      },
    } as ContentElement,
    {
      id: 'hero-product-image',
      type: 'product',
      aspectRatio: '4/3',
      sizes: '(max-width: 768px) 100vw, 50vw',
      quality: '4K',
      style: 'clean product photography',
      prompt: 'Professional {{productName}} product photography, clean white background, premium lighting, commercial quality, 4K resolution',
      loading: 'eager',
      priority: true,
    } as AIImageSlot,
  ],
};

// ============================
// 🌟 FEATURES SECTION TEMPLATES
// ============================

/**
 * Grid de features com ícones IA
 */
const featuresGridSection: TemplateSection = {
  id: 'features-grid',
  name: 'Grid de Features',
  type: 'features',
  container: enterpriseContainer,
  background: {
    type: 'solid',
    value: '#f8fafc',
  },
  padding: {
    top: 16,
    bottom: 16,
  },
  grid: featuresGrid,
  elements: [
    {
      id: 'features-title',
      type: 'heading',
      content: 'Por que escolher {{productName}}?',
      typography: {
        fontSize: '3xl',
        fontWeight: 'bold',
        lineHeight: 'tight',
        color: '#1e293b',
      },
      spacing: {
        marginBottom: 12,
      },
    } as ContentElement,
    // Features individuais serão adicionados dinamicamente
  ],
};

// ============================
// 💬 TESTIMONIALS TEMPLATES
// ============================

/**
 * Carrossel de depoimentos com avatares
 */
const testimonialsCarouselSection: TemplateSection = {
  id: 'testimonials-carousel',
  name: 'Carrossel de Depoimentos',
  type: 'testimonials',
  container: enterpriseContainer,
  background: {
    type: 'glassmorphism',
    value: 'rgba(255, 255, 255, 0.1)',
    overlay: 'blur(8px)',
  },
  padding: {
    top: 16,
    bottom: 16,
  },
  grid: testimonialsGrid,
  elements: [
    {
      id: 'testimonials-title',
      type: 'heading',
      content: 'O que nossos clientes dizem',
      typography: {
        fontSize: '3xl',
        fontWeight: 'bold',
        lineHeight: 'tight',
        color: '#1e293b',
      },
      spacing: {
        marginBottom: 12,
      },
    } as ContentElement,
  ],
};

// ============================
// 🚀 CTA SECTION TEMPLATES
// ============================

/**
 * CTA centralizado premium
 */
const premiumCTASection: TemplateSection = {
  id: 'cta-premium',
  name: 'CTA Premium',
  type: 'cta',
  container: contentContainer,
  background: {
    type: 'gradient',
    value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  padding: {
    top: 16,
    bottom: 16,
  },
  grid: {
    columns: {
      mobile: 1,
      tablet: 1,
      desktop: 1,
    },
    gap: {
      mobile: 0,
      tablet: 0,
      desktop: 0,
    },
    alignment: 'center',
    justification: 'center',
  },
  elements: [
    {
      id: 'cta-title',
      type: 'heading',
      content: 'Pronto para começar?',
      typography: {
        fontSize: '3xl',
        fontWeight: 'bold',
        lineHeight: 'tight',
        color: '#ffffff',
      },
      spacing: {
        marginBottom: 4,
      },
    } as ContentElement,
    {
      id: 'cta-subtitle',
      type: 'subheading',
      content: 'Junte-se a milhares de clientes satisfeitos',
      typography: {
        fontSize: 'lg',
        fontWeight: 'normal',
        lineHeight: 'relaxed',
        color: '#f1f5f9',
      },
      spacing: {
        marginBottom: 8,
      },
    } as ContentElement,
    {
      id: 'cta-button',
      type: 'cta',
      content: '{{ctaText}}',
      typography: {
        fontSize: 'lg',
        fontWeight: 'semibold',
        lineHeight: 'normal',
        color: '#1e293b',
      },
    } as ContentElement,
  ],
};

// ============================
// 🏗️ COMPLETE LAYOUTS
// ============================

/**
 * Landing page premium
 */
const premiumLandingPage: ModularLayout = {
  id: 'premium-landing',
  name: 'Landing Page Premium',
  description: 'Layout enterprise para produtos premium com foco em conversão',
  category: 'landing',
  sections: [
    modernHeroSection,
    featuresGridSection,
    testimonialsCarouselSection,
    premiumCTASection,
  ],
  seo: {
    title: '{{productName}} - {{mainBenefit}}',
    description: '{{productDescription}}',
    keywords: ['{{industry}}', '{{productCategory}}', 'premium', 'qualidade'],
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

/**
 * Página de produto minimalista
 */
const minimalistProductPage: ModularLayout = {
  id: 'minimal-product',
  name: 'Produto Minimalista',
  description: 'Layout clean focado no produto com conversão otimizada',
  category: 'product',
  sections: [
    minimalistHeroSection,
    featuresGridSection,
    testimonialsCarouselSection,
    premiumCTASection,
  ],
  seo: {
    title: '{{productName}} - Compre com Confiança',
    description: 'Descubra {{productName}} - {{productDescription}}',
    keywords: ['{{productName}}', '{{industry}}', 'comprar', 'melhor preço'],
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

// ============================
// 🚀 EXPORTS
// ============================

export {
  // Containers
  enterpriseContainer,
  fullWidthContainer,
  contentContainer,
  
  // Grids
  twelveColumnGrid,
  heroGrid,
  featuresGrid,
  testimonialsGrid,
  
  // Sections
  modernHeroSection,
  minimalistHeroSection,
  featuresGridSection,
  testimonialsCarouselSection,
  premiumCTASection,
  
  // Complete Layouts
  premiumLandingPage,
  minimalistProductPage,
};