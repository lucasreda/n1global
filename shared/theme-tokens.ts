/**
 * Enterprise Design Token System
 * Sistema de tokens profissional para qualidade premium ($10-50k level)
 * Mobile-first, accessible, performance-optimized
 */

// ============================
// 🎨 TYPOGRAPHY TOKENS
// ============================

/**
 * Tipografia harmônica baseada em escala modular (ratio 1.25 - Major Third)
 * Otimizada para legibilidade mobile-first e hierarquia visual clara
 */
export const typography = {
  fontFamilies: {
    // System fonts prioritários para performance
    heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
    body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
    mono: `"JetBrains Mono", "Fira Code", Consolas, "Liberation Mono", Menlo, Courier, monospace`,
  },
  
  // Mobile-first font sizes com escala harmônica
  fontSizes: {
    xs: { mobile: '0.75rem', desktop: '0.8rem' },    // 12px -> 12.8px
    sm: { mobile: '0.875rem', desktop: '0.9rem' },   // 14px -> 14.4px
    base: { mobile: '1rem', desktop: '1rem' },        // 16px -> 16px
    lg: { mobile: '1.125rem', desktop: '1.125rem' },  // 18px -> 18px
    xl: { mobile: '1.25rem', desktop: '1.25rem' },    // 20px -> 20px
    '2xl': { mobile: '1.5rem', desktop: '1.75rem' }, // 24px -> 28px
    '3xl': { mobile: '1.875rem', desktop: '2.25rem' }, // 30px -> 36px
    '4xl': { mobile: '2.25rem', desktop: '3rem' },   // 36px -> 48px
    '5xl': { mobile: '3rem', desktop: '4rem' },      // 48px -> 64px
    '6xl': { mobile: '3.75rem', desktop: '5rem' },   // 60px -> 80px
  },
  
  fontWeights: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  
  lineHeights: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  
  letterSpacings: {
    tighter: '-0.02em',
    tight: '-0.01em', 
    normal: '0em',
    wide: '0.01em',
    wider: '0.02em',
    widest: '0.1em',
  },
} as const;

// ============================
// 📐 SPACING TOKENS (8pt Grid)
// ============================

/**
 * Sistema de espaçamento baseado em 8pt grid para consistência visual
 */
export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px (base unit)
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px (2x base)
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px (3x base)
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px (4x base)
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px (5x base)
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px (6x base)
  14: '3.5rem',     // 56px (7x base)
  16: '4rem',       // 64px (8x base)
  20: '5rem',       // 80px (10x base)
  24: '6rem',       // 96px (12x base)
  28: '7rem',       // 112px (14x base)
  32: '8rem',       // 128px (16x base)
  36: '9rem',       // 144px (18x base)
  40: '10rem',      // 160px (20x base)
  44: '11rem',      // 176px (22x base)
  48: '12rem',      // 192px (24x base)
  52: '13rem',      // 208px (26x base)
  56: '14rem',      // 224px (28x base)
  60: '15rem',      // 240px (30x base)
  64: '16rem',      // 256px (32x base)
  72: '18rem',      // 288px (36x base)
  80: '20rem',      // 320px (40x base)
  96: '24rem',      // 384px (48x base)
} as const;

// ============================
// 🌈 COLOR TOKENS
// ============================

/**
 * Sistema de cores enterprise com variações completas
 * Suporte para light/dark mode e acessibilidade WCAG AA
 */
export const colors = {
  // Cores neutras base (escala 50-950)
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },
  
  // Cores semânticas
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',   // Base
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',   // Base
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  
  accent: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',   // Base
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  
  // Estados
  success: {
    50: '#f0fdf4',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },
  
  warning: {
    50: '#fffbeb',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },
  
  error: {
    50: '#fef2f2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },
  
  info: {
    50: '#eff6ff',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
} as const;

// ============================
// 🎭 ELEVATION & SHADOWS
// ============================

/**
 * Sistema de elevação enterprise com glassmorphism
 */
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  
  // Glassmorphism premium
  glass: {
    sm: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    md: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    lg: '0 20px 25px -5px rgb(0 0 0 / 0.25), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
} as const;

// ============================
// 🔄 ANIMATION TOKENS
// ============================

/**
 * Animações suaves para UX premium
 */
export const animations = {
  durations: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    slower: '500ms',
  },
  
  easings: {
    ease: 'ease',
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    
    // Custom premium easings
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  
  // Animações pre-definidas
  presets: {
    fadeIn: 'fadeIn 250ms cubic-bezier(0, 0, 0.2, 1)',
    slideUp: 'slideUp 250ms cubic-bezier(0, 0, 0.2, 1)',
    scaleIn: 'scaleIn 150ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    bounceIn: 'bounceIn 350ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// ============================
// 📱 BREAKPOINTS TOKENS
// ============================

/**
 * Breakpoints responsivos enterprise mobile-first
 */
export const breakpoints = {
  xs: '320px',    // Small phones
  sm: '640px',    // Large phones
  md: '768px',    // Tablets
  lg: '1024px',   // Small laptops
  xl: '1280px',   // Laptops
  '2xl': '1536px', // Large screens
  '3xl': '1920px', // Ultra-wide
} as const;

// ============================
// 🎭 BORDER RADIUS TOKENS
// ============================

/**
 * Border radius system para elementos modernos
 */
export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',   // Circular
} as const;

// ============================
// 🖼️ AI IMAGE STYLE TOKENS
// ============================

/**
 * Tokens específicos para imagens geradas por IA
 */
export const aiImageStyles = {
  // Estilos visuais por contexto
  hero: {
    aspectRatio: '16/9',
    quality: '4K',
    style: 'professional product photography',
    lighting: 'premium studio lighting',
    mood: 'clean and premium',
  },
  
  lifestyle: {
    aspectRatio: '4/3',
    quality: 'high-definition',
    style: 'authentic lifestyle photography',
    lighting: 'natural lighting',
    mood: 'relatable and aspirational',
  },
  
  icons: {
    aspectRatio: '1/1',
    quality: 'vector-style',
    style: 'minimalist icons',
    lighting: 'flat design',
    mood: 'clean and modern',
  },
  
  avatars: {
    aspectRatio: '1/1',
    quality: 'portrait',
    style: 'professional headshots',
    lighting: 'soft portrait lighting',
    mood: 'trustworthy and diverse',
  },
  
  backgrounds: {
    aspectRatio: '21/9',
    quality: 'seamless pattern',
    style: 'subtle textures',
    lighting: 'ambient',
    mood: 'elegant and sophisticated',
  },
} as const;

// ============================
// 🎨 GLASSMORPHISM TOKENS
// ============================

/**
 * Efeitos glassmorphism modernos
 */
export const glassmorphism = {
  backgrounds: {
    light: 'rgba(255, 255, 255, 0.25)',
    medium: 'rgba(255, 255, 255, 0.18)',
    dark: 'rgba(0, 0, 0, 0.25)',
  },
  
  blurs: {
    sm: 'blur(4px)',
    md: 'blur(8px)',
    lg: 'blur(16px)',
    xl: 'blur(24px)',
  },
  
  borders: {
    light: '1px solid rgba(255, 255, 255, 0.18)',
    medium: '1px solid rgba(255, 255, 255, 0.3)',
    dark: '1px solid rgba(0, 0, 0, 0.18)',
  },
} as const;

// ============================
// 📊 PERFORMANCE TOKENS
// ============================

/**
 * Tokens de performance para otimização
 */
export const performance = {
  // Lazy loading thresholds
  lazyLoading: {
    rootMargin: '100px',
    threshold: 0.1,
  },
  
  // Image optimization
  imageOptimization: {
    quality: 85,
    formats: ['webp', 'avif', 'jpeg'],
    sizes: ['320w', '640w', '768w', '1024w', '1280w', '1536w'],
  },
  
  // Animation performance
  animationPerformance: {
    reducedMotion: 'prefers-reduced-motion: reduce',
    willChange: 'transform, opacity',
    gpu: 'translateZ(0)', // Force GPU acceleration
  },
} as const;

// ============================
// 🎯 COMPOSITE DESIGN TOKENS
// ============================

/**
 * Tokens compostos para elementos complexos
 */
export const components = {
  button: {
    primary: {
      background: colors.primary[500],
      text: colors.neutral[50],
      hover: colors.primary[600],
      shadow: shadows.md,
      radius: borderRadius.lg,
      transition: animations.presets.scaleIn,
    },
    
    secondary: {
      background: colors.secondary[100],
      text: colors.secondary[700],
      hover: colors.secondary[200],
      shadow: shadows.sm,
      radius: borderRadius.lg,
      transition: animations.presets.scaleIn,
    },
  },
  
  card: {
    background: colors.neutral[50],
    border: `1px solid ${colors.neutral[200]}`,
    shadow: shadows.lg,
    radius: borderRadius['2xl'],
    padding: spacing[6],
  },
  
  hero: {
    minHeight: '60vh',
    background: 'gradient-to-br',
    overlay: 'rgba(0, 0, 0, 0.4)',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
  },
} as const;

// ============================
// 📱 MOBILE-FIRST UTILITIES
// ============================

/**
 * Utilitários mobile-first
 */
export const mobileFirst = {
  containerWidths: {
    xs: '100%',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  padding: {
    mobile: spacing[4],
    tablet: spacing[6],
    desktop: spacing[8],
  },
  
  fontSize: {
    mobile: typography.fontSizes.base.mobile,
    desktop: typography.fontSizes.base.desktop,
  },
} as const;

// ============================
// 🎨 TYPE EXPORTS
// ============================

export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type Colors = typeof colors;
export type Shadows = typeof shadows;
export type Animations = typeof animations;
export type Breakpoints = typeof breakpoints;
export type BorderRadius = typeof borderRadius;
export type AIImageStyles = typeof aiImageStyles;
export type Glassmorphism = typeof glassmorphism;
export type Performance = typeof performance;
export type Components = typeof components;
export type MobileFirst = typeof mobileFirst;

// ============================
// 🚀 COMPLETE TOKEN EXPORT
// ============================

/**
 * Design Token System completo para N1 Hub Enterprise
 */
export const enterpriseTokens = {
  typography,
  spacing,
  colors,
  shadows,
  animations,
  breakpoints,
  borderRadius,
  aiImageStyles,
  glassmorphism,
  performance,
  components,
  mobileFirst,
} as const;

export type EnterpriseTokens = typeof enterpriseTokens;