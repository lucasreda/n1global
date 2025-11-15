/**
 * Enterprise Template Composition Library
 * Sistema modular para layouts premium com slots para imagens IA
 * Mobile-first, performance-optimized, accessibility-focused
 */

import { enterpriseTokens } from '../theme-tokens';

// ============================
// 🎨 CORE TEMPLATE TYPES
// ============================

/**
 * Slot para imagem gerada por IA
 */
export interface AIImageSlot {
  id: string;
  type: 'hero' | 'lifestyle' | 'icon' | 'avatar' | 'background' | 'product';
  aspectRatio: string;
  sizes: string;
  quality: 'standard' | 'high' | '4K';
  style: string;
  prompt: string;
  fallback?: string;
  loading: 'lazy' | 'eager';
  priority?: boolean;
}

/**
 * Container responsivo enterprise
 */
export interface ResponsiveContainer {
  maxWidth: keyof typeof enterpriseTokens.mobileFirst.containerWidths;
  padding: {
    mobile: keyof typeof enterpriseTokens.spacing;
    tablet: keyof typeof enterpriseTokens.spacing;
    desktop: keyof typeof enterpriseTokens.spacing;
  };
  margin: 'auto' | 'none';
  centered: boolean;
}

/**
 * Grid system profissional
 */
export interface GridSystem {
  columns: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  gap: {
    mobile: keyof typeof enterpriseTokens.spacing;
    tablet: keyof typeof enterpriseTokens.spacing;
    desktop: keyof typeof enterpriseTokens.spacing;
  };
  alignment: 'start' | 'center' | 'end' | 'stretch';
  justification: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
}

/**
 * Elemento de conteúdo com tipografia
 */
export interface ContentElement {
  id: string;
  type: 'heading' | 'subheading' | 'body' | 'caption' | 'cta';
  content: string;
  typography: {
    fontSize: keyof typeof enterpriseTokens.typography.fontSizes;
    fontWeight: keyof typeof enterpriseTokens.typography.fontWeights;
    lineHeight: keyof typeof enterpriseTokens.typography.lineHeights;
    color: string;
  };
  spacing: {
    marginTop?: keyof typeof enterpriseTokens.spacing;
    marginBottom?: keyof typeof enterpriseTokens.spacing;
  };
  animation?: {
    type: 'fadeIn' | 'slideUp' | 'scaleIn' | 'bounceIn';
    delay?: number;
    duration?: keyof typeof enterpriseTokens.animations.durations;
  };
}

/**
 * Seção template base
 */
export interface TemplateSection {
  id: string;
  name: string;
  type: 'hero' | 'features' | 'testimonials' | 'cta' | 'content' | 'gallery';
  container: ResponsiveContainer;
  background?: {
    type: 'solid' | 'gradient' | 'image' | 'glassmorphism';
    value: string;
    overlay?: string;
    attachment?: 'fixed' | 'scroll';
  };
  padding: {
    top: keyof typeof enterpriseTokens.spacing;
    bottom: keyof typeof enterpriseTokens.spacing;
  };
  grid: GridSystem;
  elements: (ContentElement | AIImageSlot)[];
  animations?: {
    entrance: string;
    sequence: boolean;
    stagger?: number;
  };
}

/**
 * Layout completo modular
 */
export interface ModularLayout {
  id: string;
  name: string;
  description: string;
  category: 'landing' | 'product' | 'service' | 'portfolio' | 'blog';
  sections: TemplateSection[];
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  performance: {
    criticalCSS: boolean;
    lazyLoading: boolean;
    imageOptimization: boolean;
    fontPreload: string[];
  };
  accessibility: {
    skipLinks: boolean;
    ariaLabels: boolean;
    contrastRatio: 'AA' | 'AAA';
    focusManagement: boolean;
  };
}

// ============================
// 🎯 TEMPLATE COMPOSITIONS
// ============================

/**
 * Configuração de identidade visual
 */
export interface VisualIdentityConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  mood: 'professional' | 'friendly' | 'luxury' | 'playful' | 'trustworthy' | 'innovative';
  industry: 'business' | 'ecommerce' | 'health' | 'education' | 'technology' | 'finance' | 'real-estate' | 'food' | 'travel' | 'fashion';
}

/**
 * Composição de template otimizada
 */
export interface TemplateComposition {
  layout: ModularLayout;
  visualIdentity: VisualIdentityConfig;
  aiImageConfig: {
    style: string;
    quality: '4K' | 'high' | 'standard';
    consistency: boolean;
    brandAlignment: boolean;
  };
  responsive: {
    mobileFirst: boolean;
    breakpoints: (keyof typeof enterpriseTokens.breakpoints)[];
    containerQuery: boolean;
  };
  performance: {
    coreWebVitals: {
      lcp: number; // Largest Contentful Paint target (ms)
      fid: number; // First Input Delay target (ms)  
      cls: number; // Cumulative Layout Shift target
    };
    loadingStrategy: 'eager' | 'lazy' | 'progressive';
    resourceHints: string[];
  };
}

// ============================
// 🏗️ BUILDER INTERFACES
// ============================

/**
 * Builder para criação de templates
 */
export interface TemplateBuilder {
  // Container methods
  setContainer(container: ResponsiveContainer): this;
  
  // Grid methods
  setGrid(grid: GridSystem): this;
  
  // Content methods
  addHeading(content: string, level?: 1 | 2 | 3 | 4 | 5 | 6): this;
  addBody(content: string): this;
  addCTA(text: string, href: string): this;
  
  // AI Image methods
  addHeroImage(prompt: string, style?: string): this;
  addLifestyleImage(prompt: string, aspectRatio?: string): this;
  addIconImage(prompt: string, size?: string): this;
  addAvatarImage(prompt: string): this;
  
  // Layout methods
  setBackground(background: TemplateSection['background']): this;
  setPadding(top: keyof typeof enterpriseTokens.spacing, bottom: keyof typeof enterpriseTokens.spacing): this;
  
  // Animation methods
  addAnimation(type: string, delay?: number): this;
  
  // Build method
  build(): TemplateSection;
}

/**
 * Factory para criação de layouts
 */
export interface LayoutFactory {
  createLandingPage(config: Partial<TemplateComposition>): ModularLayout;
  createProductPage(config: Partial<TemplateComposition>): ModularLayout;
  createServicePage(config: Partial<TemplateComposition>): ModularLayout;
  createPortfolioPage(config: Partial<TemplateComposition>): ModularLayout;
}

// ============================
// 📱 RESPONSIVE UTILITIES
// ============================

/**
 * Utilidades para responsividade
 */
export interface ResponsiveUtils {
  // Container queries
  getContainerWidth(breakpoint: keyof typeof enterpriseTokens.breakpoints): string;
  
  // Grid utilities
  getColumnsForBreakpoint(breakpoint: keyof typeof enterpriseTokens.breakpoints, total: number): number;
  
  // Typography utilities
  getFontSizeForBreakpoint(breakpoint: keyof typeof enterpriseTokens.breakpoints, size: keyof typeof enterpriseTokens.typography.fontSizes): string;
  
  // Spacing utilities
  getSpacingForBreakpoint(breakpoint: keyof typeof enterpriseTokens.breakpoints, spacing: keyof typeof enterpriseTokens.spacing): string;
}

// ============================
// 🎨 STYLE UTILITIES
// ============================

/**
 * Utilidades para estilo e tema
 */
export interface StyleUtils {
  // Color utilities
  getColorVariant(color: string, variant: number): string;
  generateGradient(fromColor: string, toColor: string, direction?: string): string;
  
  // Shadow utilities
  getShadowForElevation(level: keyof typeof enterpriseTokens.shadows): string;
  
  // Animation utilities
  getAnimationTiming(duration: keyof typeof enterpriseTokens.animations.durations, easing: keyof typeof enterpriseTokens.animations.easings): string;
  
  // Typography utilities
  getTypographyStyle(element: ContentElement['typography']): Record<string, string>;
}

// ============================
// 🚀 EXPORTS
// ============================

// All interfaces are already exported above with 'export interface'
// No need for duplicate type exports