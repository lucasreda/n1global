/**
 * Enterprise Theme Composer Hook
 * Context React para design tokens e aplicação automática de estilos
 */

import { createContext, useContext, useMemo, useEffect, useState, ReactNode } from 'react';
import { enterpriseTokens } from '@shared/theme-tokens';
import { responsiveUtils, styleUtils } from '@shared/templates/builders';
import type { VisualIdentityConfig, ContentElement } from '@shared/templates';

// ============================
// 🎨 THEME CONTEXT
// ============================

interface ThemeComposerContextValue {
  tokens: typeof enterpriseTokens;
  visualIdentity: VisualIdentityConfig;
  utils: {
    responsive: typeof responsiveUtils;
    style: typeof styleUtils;
  };
  applyVisualIdentity: (config: Partial<VisualIdentityConfig>) => void;
  generateCSS: (element: ContentElement) => Record<string, string>;
  getResponsiveClasses: (breakpoints: Record<string, any>) => string;
  getSpacingClass: (spacing: keyof typeof enterpriseTokens.spacing) => string;
  getShadowClass: (level: keyof typeof enterpriseTokens.shadows) => string;
  getTypographyClass: (element: ContentElement['typography']) => string;
  isLargeScreen: boolean;
  isMobile: boolean;
  currentBreakpoint: keyof typeof enterpriseTokens.breakpoints;
}

const ThemeComposerContext = createContext<ThemeComposerContextValue | null>(null);

// ============================
// 🪝 THEME COMPOSER HOOK
// ============================

/**
 * Hook principal para composição de temas enterprise
 */
export function useThemeComposer(): ThemeComposerContextValue {
  const context = useContext(ThemeComposerContext);
  
  if (!context) {
    throw new Error('useThemeComposer deve ser usado dentro de ThemeComposerProvider');
  }
  
  return context;
}

// ============================
// 🏗️ THEME COMPOSER PROVIDER
// ============================

interface ThemeComposerProviderProps {
  children: ReactNode;
  defaultVisualIdentity?: Partial<VisualIdentityConfig>;
}

export function ThemeComposerProvider({ 
  children, 
  defaultVisualIdentity = {} 
}: ThemeComposerProviderProps) {
  // Estado da identidade visual
  const [visualIdentity, setVisualIdentity] = useState<VisualIdentityConfig>({
    primaryColor: '#3b82f6',
    secondaryColor: '#64748b',
    accentColor: '#f59e0b',
    mood: 'professional',
    industry: 'business',
    ...defaultVisualIdentity,
  });

  // Estado do breakpoint atual
  const [currentBreakpoint, setCurrentBreakpoint] = useState<keyof typeof enterpriseTokens.breakpoints>('lg');
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // ============================
  // 📱 RESPONSIVE DETECTION
  // ============================

  useEffect(() => {
    function updateBreakpoint() {
      const width = window.innerWidth;
      
      if (width < 640) {
        setCurrentBreakpoint('xs');
        setIsMobile(true);
        setIsLargeScreen(false);
      } else if (width < 768) {
        setCurrentBreakpoint('sm');
        setIsMobile(true);
        setIsLargeScreen(false);
      } else if (width < 1024) {
        setCurrentBreakpoint('md');
        setIsMobile(false);
        setIsLargeScreen(false);
      } else if (width < 1280) {
        setCurrentBreakpoint('lg');
        setIsMobile(false);
        setIsLargeScreen(true);
      } else if (width < 1536) {
        setCurrentBreakpoint('xl');
        setIsMobile(false);
        setIsLargeScreen(true);
      } else {
        setCurrentBreakpoint('2xl');
        setIsMobile(false);
        setIsLargeScreen(true);
      }
    }

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  // ============================
  // 🎨 UTILITY FUNCTIONS
  // ============================

  const applyVisualIdentity = (config: Partial<VisualIdentityConfig>) => {
    setVisualIdentity(prev => ({ ...prev, ...config }));
  };

  const generateCSS = (element: ContentElement): Record<string, string> => {
    return styleUtils.getTypographyStyle(element.typography);
  };

  const getResponsiveClasses = (breakpoints: Record<string, any>): string => {
    const classes: string[] = [];
    
    Object.entries(breakpoints).forEach(([breakpoint, value]) => {
      if (breakpoint === 'mobile' || breakpoint === 'xs') {
        classes.push(value);
      } else {
        classes.push(`${breakpoint}:${value}`);
      }
    });
    
    return classes.join(' ');
  };

  const getSpacingClass = (spacing: keyof typeof enterpriseTokens.spacing): string => {
    const spacingMap: Record<keyof typeof enterpriseTokens.spacing, string> = {
      0: 'p-0',
      'px': 'px-px',
      0.5: 'p-0.5',
      1: 'p-1',
      1.5: 'p-1.5',
      2: 'p-2',
      2.5: 'p-2.5',
      3: 'p-3',
      3.5: 'p-3.5',
      4: 'p-4',
      5: 'p-5',
      6: 'p-6',
      7: 'p-7',
      8: 'p-8',
      9: 'p-9',
      10: 'p-10',
      11: 'p-11',
      12: 'p-12',
      14: 'p-14',
      16: 'p-16',
      20: 'p-20',
      24: 'p-24',
      28: 'p-28',
      32: 'p-32',
      36: 'p-36',
      40: 'p-40',
      44: 'p-44',
      48: 'p-48',
      52: 'p-52',
      56: 'p-56',
      60: 'p-60',
      64: 'p-64',
      72: 'p-72',
      80: 'p-80',
      96: 'p-96',
    };
    
    return spacingMap[spacing] || 'p-4';
  };

  const getShadowClass = (level: keyof typeof enterpriseTokens.shadows): string => {
    const shadowMap: Record<keyof typeof enterpriseTokens.shadows, string> = {
      none: 'shadow-none',
      sm: 'shadow-sm',
      base: 'shadow',
      md: 'shadow-md',
      lg: 'shadow-lg',
      xl: 'shadow-xl',
      '2xl': 'shadow-2xl',
      inner: 'shadow-inner',
      glass: 'shadow-lg',
    };
    
    return shadowMap[level] || 'shadow-md';
  };

  const getTypographyClass = (typography: ContentElement['typography']): string => {
    const classes: string[] = [];
    
    // Font size
    const fontSizeMap: Record<ContentElement['typography']['fontSize'], string> = {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl',
      '5xl': 'text-5xl',
      '6xl': 'text-6xl',
    };
    
    classes.push(fontSizeMap[typography.fontSize] || 'text-base');
    
    // Font weight
    const fontWeightMap: Record<ContentElement['typography']['fontWeight'], string> = {
      light: 'font-light',
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
      extrabold: 'font-extrabold',
    };
    
    classes.push(fontWeightMap[typography.fontWeight] || 'font-normal');
    
    // Line height
    const lineHeightMap: Record<ContentElement['typography']['lineHeight'], string> = {
      tight: 'leading-tight',
      snug: 'leading-snug',
      normal: 'leading-normal',
      relaxed: 'leading-relaxed',
      loose: 'leading-loose',
    };
    
    classes.push(lineHeightMap[typography.lineHeight] || 'leading-normal');
    
    return classes.join(' ');
  };

  // ============================
  // 🎯 CONTEXT VALUE
  // ============================

  const contextValue: ThemeComposerContextValue = useMemo(() => ({
    tokens: enterpriseTokens,
    visualIdentity,
    utils: {
      responsive: responsiveUtils,
      style: styleUtils,
    },
    applyVisualIdentity,
    generateCSS,
    getResponsiveClasses,
    getSpacingClass,
    getShadowClass,
    getTypographyClass,
    isLargeScreen,
    isMobile,
    currentBreakpoint,
  }), [
    visualIdentity,
    isLargeScreen,
    isMobile,
    currentBreakpoint,
  ]);

  return (
    <ThemeComposerContext.Provider value={contextValue}>
      {children}
    </ThemeComposerContext.Provider>
  );
}

// ============================
// 🪝 SPECIALIZED HOOKS
// ============================

/**
 * Hook para responsividade
 */
export function useResponsive() {
  const { isMobile, isLargeScreen, currentBreakpoint, utils } = useThemeComposer();
  
  return {
    isMobile,
    isLargeScreen,
    currentBreakpoint,
    getColumnsForBreakpoint: utils.responsive.getColumnsForBreakpoint,
    getContainerWidth: utils.responsive.getContainerWidth,
    getFontSizeForBreakpoint: utils.responsive.getFontSizeForBreakpoint,
    getSpacingForBreakpoint: utils.responsive.getSpacingForBreakpoint,
  };
}

/**
 * Hook para estilos
 */
export function useStyles() {
  const { visualIdentity, utils, generateCSS, getTypographyClass } = useThemeComposer();
  
  return {
    visualIdentity,
    generateCSS,
    getTypographyClass,
    getColorVariant: utils.style.getColorVariant,
    generateGradient: utils.style.generateGradient,
    getShadowForElevation: utils.style.getShadowForElevation,
    getAnimationTiming: utils.style.getAnimationTiming,
  };
}

/**
 * Hook para identidade visual
 */
export function useVisualIdentity() {
  const { visualIdentity, applyVisualIdentity } = useThemeComposer();
  
  const setMood = (mood: VisualIdentityConfig['mood']) => {
    applyVisualIdentity({ mood });
  };
  
  const setIndustry = (industry: VisualIdentityConfig['industry']) => {
    applyVisualIdentity({ industry });
  };
  
  const setColors = (colors: Partial<Pick<VisualIdentityConfig, 'primaryColor' | 'secondaryColor' | 'accentColor'>>) => {
    applyVisualIdentity(colors);
  };
  
  return {
    ...visualIdentity,
    setMood,
    setIndustry,
    setColors,
    applyVisualIdentity,
  };
}

/**
 * Hook para layout mobile-first
 */
export function useMobileFirst() {
  const { isMobile, currentBreakpoint, getResponsiveClasses } = useThemeComposer();
  
  const getMobileFirstClasses = (classes: {
    mobile: string;
    tablet?: string;
    desktop?: string;
    large?: string;
  }) => {
    return getResponsiveClasses({
      '': classes.mobile,
      'md': classes.tablet || classes.mobile,
      'lg': classes.desktop || classes.tablet || classes.mobile,
      'xl': classes.large || classes.desktop || classes.tablet || classes.mobile,
    });
  };
  
  const getOrderClasses = (mobileOrder: number, desktopOrder?: number) => {
    return getResponsiveClasses({
      '': `order-${mobileOrder}`,
      'lg': `order-${desktopOrder || mobileOrder}`,
    });
  };
  
  return {
    isMobile,
    currentBreakpoint,
    getMobileFirstClasses,
    getOrderClasses,
    getResponsiveClasses,
  };
}


