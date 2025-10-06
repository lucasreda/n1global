import { PageModelV2, BlockSection, BlockElement, PageModelV3, BlockSectionV3, BlockElementV3, ResponsiveStylesV3 } from './schema';

// Legacy PageModel interface (what old manual pages use)
export interface LegacyPageModel {
  seo?: {
    title: string;
    description: string;
  };
  style?: {
    theme: string;
    primaryColor: string;
    secondaryColor?: string;
    fontFamily?: string;
  };
  layout?: string;
  sections?: Array<{
    id: string;
    type: string;
    config?: Record<string, any>;
    content?: Record<string, any>;
  }>;
}

// Type guard to check if a model is PageModelV2
export function isPageModelV2(model: any): model is PageModelV2 {
  if (!model || typeof model !== 'object') return false;
  
  // Check for V2-specific structure
  if (model.version === 2) return true;
  
  // Check for hierarchical structure with rows
  if (Array.isArray(model.sections) && model.sections.length > 0) {
    const firstSection = model.sections[0];
    // V2 sections have 'rows' property, legacy sections have 'content'
    if (firstSection && Array.isArray(firstSection.rows)) {
      return true;
    }
  }
  
  // Check for V2-specific theme structure
  if (model.theme && typeof model.theme === 'object') {
    return 'colors' in model.theme && 'typography' in model.theme;
  }
  
  return false;
}

// Type guard to check if a model is legacy format
export function isLegacyPageModel(model: any): model is LegacyPageModel {
  if (!model || typeof model !== 'object') return false;
  
  // If it's V2, it's not legacy
  if (isPageModelV2(model)) return false;
  
  // Check for legacy structure indicators
  if (model.style && typeof model.style === 'object') {
    // Legacy has flat 'style' with 'theme' and 'primaryColor'
    if ('theme' in model.style || 'primaryColor' in model.style) {
      return true;
    }
  }
  
  // Check for legacy sections structure
  if (Array.isArray(model.sections) && model.sections.length > 0) {
    const firstSection = model.sections[0];
    // Legacy sections have 'content' and 'config', not 'rows'
    if (firstSection && ('content' in firstSection || 'config' in firstSection)) {
      return true;
    }
  }
  
  return true; // Default to legacy if not clearly V2
}

// Upgrade a legacy model to PageModelV2
export function upgradeLegacyModel(legacy: LegacyPageModel): PageModelV2 {
  console.warn('⚠️ LEGACY PAGE DETECTED - Converting to V2 format');
  console.warn('⚠️ Some custom fields may be preserved in metadata only');
  
  const sections: BlockSection[] = (legacy.sections || []).map((legacySection, sectionIndex) => {
    // Create a single row with one column containing elements from legacy content
    const elements: BlockElement[] = [];
    
    // Track unknown/unmapped fields for preservation
    const unknownContentFields: Record<string, any> = {};
    const unknownConfigFields: Record<string, any> = {};
    
    // Convert legacy content to elements
    if (legacySection.content) {
      const content = legacySection.content;
      
      // Title becomes a heading element
      if (content.title) {
        elements.push({
          id: `heading_${sectionIndex}_${Date.now()}`,
          type: 'heading',
          props: { level: 1 },
          styles: {
            fontSize: '2.5rem',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '1rem',
          },
          content: { text: content.title }
        });
      }
      
      // Subtitle becomes text element
      if (content.subtitle) {
        elements.push({
          id: `text_${sectionIndex}_${Date.now()}`,
          type: 'text',
          props: {},
          styles: {
            fontSize: '1.125rem',
            textAlign: 'center',
            color: '#64748b',
            marginBottom: '2rem',
          },
          content: { text: content.subtitle }
        });
      }
      
      // CTA button
      if (content.ctaLabel) {
        elements.push({
          id: `button_${sectionIndex}_${Date.now()}`,
          type: 'button',
          props: {
            variant: 'primary',
            size: 'lg',
          },
          styles: {
            marginTop: '1.5rem',
          },
          content: { label: content.ctaLabel, href: '#' }
        });
      }
      
      // Benefits list
      if (Array.isArray(content.benefits)) {
        content.benefits.forEach((benefit: any, idx: number) => {
          if (benefit.title) {
            elements.push({
              id: `benefit_${sectionIndex}_${idx}_${Date.now()}`,
              type: 'text',
              props: { isBenefit: true },
              styles: {
                fontSize: '1rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
              },
              content: { 
                text: `✓ ${benefit.title}${benefit.description ? `: ${benefit.description}` : ''}` 
              }
            });
          }
        });
      }
      
      // Preserve unknown content fields
      const knownFields = ['title', 'subtitle', 'ctaLabel', 'benefits'];
      Object.keys(content).forEach(key => {
        if (!knownFields.includes(key)) {
          unknownContentFields[key] = content[key];
        }
      });
    }
    
    // Preserve unknown config fields
    if (legacySection.config) {
      const knownConfigFields = ['backgroundColor', 'textAlign'];
      Object.keys(legacySection.config).forEach(key => {
        if (!knownConfigFields.includes(key)) {
          unknownConfigFields[key] = legacySection.config[key];
        }
      });
    }
    
    // If there are unknown fields, add them as metadata in a custom element
    if (Object.keys(unknownContentFields).length > 0 || Object.keys(unknownConfigFields).length > 0) {
      console.warn(`⚠️ Section ${sectionIndex} has unmapped fields:`, { unknownContentFields, unknownConfigFields });
      elements.push({
        id: `metadata_${sectionIndex}_${Date.now()}`,
        type: 'text',
        props: { isLegacyMetadata: true },
        styles: { display: 'none' },
        content: { 
          text: `[LEGACY METADATA] ${JSON.stringify({ content: unknownContentFields, config: unknownConfigFields })}` 
        }
      });
    }
    
    // If no elements were created, add a placeholder
    if (elements.length === 0) {
      elements.push({
        id: `placeholder_${sectionIndex}_${Date.now()}`,
        type: 'text',
        props: {},
        styles: {},
        content: { text: 'Conteúdo vazio' }
      });
    }
    
    return {
      id: legacySection.id || `section_${sectionIndex}_${Date.now()}`,
      type: (legacySection.type as any) || 'content',
      name: legacySection.type || 'Seção',
      rows: [
        {
          id: `row_${sectionIndex}_${Date.now()}`,
          columns: [
            {
              id: `col_${sectionIndex}_${Date.now()}`,
              width: '100%',
              elements: elements,
              styles: {}
            }
          ],
          styles: {}
        }
      ],
      styles: {
        paddingTop: '3rem',
        paddingBottom: '3rem',
        backgroundColor: legacySection.config?.backgroundColor || 'transparent',
      },
      settings: {
        containerWidth: 'container',
        textAlign: (legacySection.config?.textAlign as any) || 'center',
      }
    };
  });
  
  // Build V2 model with legacy flag
  const v2: PageModelV2 & { _convertedFromLegacy?: boolean; _conversionWarnings?: string[] } = {
    version: 2,
    layout: (legacy.layout as any) || 'single_page',
    sections: sections,
    _convertedFromLegacy: true,
    _conversionWarnings: [
      'This page was automatically converted from legacy format',
      'Some fields may have been preserved as metadata',
      'Please review the content before saving'
    ],
    
    theme: {
      colors: {
        primary: legacy.style?.primaryColor || '#3b82f6',
        secondary: legacy.style?.secondaryColor || '#64748b',
        accent: '#8b5cf6',
        background: '#ffffff',
        text: '#1e293b',
        muted: '#94a3b8',
      },
      typography: {
        headingFont: legacy.style?.fontFamily || 'Inter, system-ui, sans-serif',
        bodyFont: legacy.style?.fontFamily || 'Inter, system-ui, sans-serif',
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
          '4xl': '2.25rem',
        },
      },
      spacing: {
        xs: '0.5rem',
        sm: '1rem',
        md: '1.5rem',
        lg: '2rem',
        xl: '3rem',
        '2xl': '4rem',
      },
      borderRadius: {
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
      },
    },
    
    seo: {
      title: legacy.seo?.title || 'Nova Página',
      description: legacy.seo?.description || 'Descrição da página',
      keywords: [],
      ogImage: undefined,
    },
    
    settings: {
      containerMaxWidth: '1200px',
      showGrid: false,
      snapToGrid: true,
      enableAnimations: true,
      mobileFirst: true,
    },
  };
  
  return v2;
}

// Ensure a model is PageModelV2, upgrading if necessary
export function ensurePageModelV2(model: any): PageModelV2 {
  if (!model) {
    // Return a minimal valid V2 model
    return createEmptyPageModelV2();
  }
  
  if (isPageModelV2(model)) {
    return model as PageModelV2;
  }
  
  if (isLegacyPageModel(model)) {
    console.log('🔄 Upgrading legacy page model to V2');
    return upgradeLegacyModel(model as LegacyPageModel);
  }
  
  // Unknown format, create empty V2
  console.warn('⚠️ Unknown page model format, creating empty V2 model');
  return createEmptyPageModelV2();
}

// Create an empty PageModelV2 with defaults
export function createEmptyPageModelV2(): PageModelV2 {
  return {
    version: 2,
    layout: 'single_page',
    sections: [],
    
    theme: {
      colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
        accent: '#8b5cf6',
        background: '#ffffff',
        text: '#1e293b',
        muted: '#94a3b8',
      },
      typography: {
        headingFont: 'Inter, system-ui, sans-serif',
        bodyFont: 'Inter, system-ui, sans-serif',
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
          '4xl': '2.25rem',
        },
      },
      spacing: {
        xs: '0.5rem',
        sm: '1rem',
        md: '1.5rem',
        lg: '2rem',
        xl: '3rem',
        '2xl': '4rem',
      },
      borderRadius: {
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
      },
    },
    
    seo: {
      title: 'Nova Página',
      description: 'Descrição da página',
      keywords: [],
      ogImage: undefined,
    },
    
    settings: {
      containerMaxWidth: '1200px',
      showGrid: false,
      snapToGrid: true,
      enableAnimations: true,
      mobileFirst: true,
    },
  };
}

// Downgrade V2 to legacy format (for backward compatibility, loses data)
export function downgradeToLegacy(v2: PageModelV2): LegacyPageModel {
  console.warn('⚠️ Downgrading PageModelV2 to legacy format - some data will be lost');
  
  const legacySections = v2.sections.map(section => {
    // Extract content from first row/column/elements
    const firstRow = section.rows[0];
    const firstColumn = firstRow?.columns[0];
    const elements = firstColumn?.elements || [];
    
    // Find title, subtitle, cta from elements
    const headingEl = elements.find(el => el.type === 'heading');
    const textEl = elements.find(el => el.type === 'text');
    const buttonEl = elements.find(el => el.type === 'button');
    
    return {
      id: section.id,
      type: section.type,
      config: {
        textAlign: section.settings?.textAlign || 'center',
        backgroundColor: section.styles?.backgroundColor || '#ffffff',
      },
      content: {
        title: headingEl?.content?.text || section.name,
        subtitle: textEl?.content?.text || '',
        ctaLabel: buttonEl?.content?.label || '',
      }
    };
  });
  
  return {
    seo: {
      title: v2.seo.title,
      description: v2.seo.description,
    },
    style: {
      theme: 'modern',
      primaryColor: v2.theme.colors.primary,
      secondaryColor: v2.theme.colors.secondary,
      fontFamily: v2.theme.typography.bodyFont,
    },
    layout: v2.layout,
    sections: legacySections,
  };
}

// ============================================================================
// PageModelV3 Adapters
// ============================================================================

/**
 * Type guard to check if a model is PageModelV3
 */
export function isPageModelV3(model: any): model is PageModelV3 {
  if (!model || typeof model !== 'object') return false;
  
  // Check for V3-specific structure
  if (model.version === '3.0' || model.version === 3) return true;
  
  // Check for V3-specific fields
  if (model.designTokens && typeof model.designTokens === 'object') return true;
  if (model.meta && typeof model.meta === 'object') return true;
  
  // Check for V3-specific responsive styles in sections
  if (Array.isArray(model.sections) && model.sections.length > 0) {
    const firstSection = model.sections[0];
    if (firstSection?.styles && typeof firstSection.styles === 'object') {
      // V3 has ResponsiveStylesV3 (desktop/tablet/mobile)
      if ('desktop' in firstSection.styles || 'tablet' in firstSection.styles || 'mobile' in firstSection.styles) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Convert PageModelV2 to PageModelV3
 */
export function convertV2toV3(v2: PageModelV2): PageModelV3 {
  console.log('🔄 Converting PageModelV2 → PageModelV3');
  
  // Convert theme to design tokens
  const designTokens = {
    colors: {
      primary: { 500: v2.theme.colors.primary },
      secondary: { 500: v2.theme.colors.secondary },
      neutral: { 
        50: v2.theme.colors.background,
        900: v2.theme.colors.text
      },
      semantic: {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6'
      }
    },
    typography: {
      fontFamilies: {
        sans: v2.theme.typography.bodyFont,
        heading: v2.theme.typography.headingFont
      },
      fontSizes: v2.theme.typography.fontSize,
      fontWeights: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      },
      lineHeights: {
        tight: '1.25',
        normal: '1.5',
        relaxed: '1.75'
      },
      letterSpacings: {
        tight: '-0.05em',
        normal: '0',
        wide: '0.05em'
      }
    },
    spacing: v2.theme.spacing,
    borderRadius: v2.theme.borderRadius,
    breakpoints: {
      mobile: '768px',
      tablet: '1024px',
      desktop: '1280px'
    }
  };
  
  // Convert sections
  const sectionsV3: BlockSectionV3[] = v2.sections.map(section => convertSectionV2toV3(section));
  
  return {
    version: '3.0',
    meta: {
      title: v2.seo.title,
      description: v2.seo.description,
      keywords: v2.seo.keywords,
      ogTitle: v2.seo.ogTitle,
      ogDescription: v2.seo.ogDescription
    },
    designTokens,
    sections: sectionsV3,
    editorState: {
      activeBreakpoint: 'desktop',
      zoom: 100
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Convert PageModelV3 to PageModelV2 (for backwards compatibility)
 */
export function convertV3toV2(v3: PageModelV3): PageModelV2 {
  console.log('🔄 Converting PageModelV3 → PageModelV2');
  
  // Extract theme from design tokens
  const theme = {
    colors: {
      primary: v3.designTokens?.colors?.primary?.['500'] || '#0066ff',
      secondary: v3.designTokens?.colors?.secondary?.['500'] || '#6c757d',
      accent: '#ff6b6b',
      background: v3.designTokens?.colors?.neutral?.['50'] || '#ffffff',
      text: v3.designTokens?.colors?.neutral?.['900'] || '#212529',
      muted: '#6c757d'
    },
    typography: {
      headingFont: v3.designTokens?.typography?.fontFamilies?.heading || 'Inter, system-ui, sans-serif',
      bodyFont: v3.designTokens?.typography?.fontFamilies?.sans || 'Inter, system-ui, sans-serif',
      fontSize: (v3.designTokens?.typography?.fontSizes as any) || {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem'
      }
    },
    spacing: v3.designTokens?.spacing || {
      xs: '0.5rem',
      sm: '1rem',
      md: '1.5rem',
      lg: '2rem',
      xl: '3rem',
      '2xl': '4rem'
    },
    borderRadius: v3.designTokens?.borderRadius || {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '1rem'
    }
  };
  
  // Convert sections
  const sectionsV2: BlockSection[] = v3.sections.map(section => convertSectionV3toV2(section));
  
  return {
    version: 2,
    layout: 'single_page',
    sections: sectionsV2,
    theme,
    seo: {
      title: v3.meta.title,
      description: v3.meta.description,
      keywords: v3.meta.keywords,
      ogTitle: v3.meta.ogTitle,
      ogDescription: v3.meta.ogDescription
    },
    settings: {
      containerMaxWidth: '1200px',
      enableAnimations: true
    }
  };
}

/**
 * Convert BlockSectionV2 to BlockSectionV3
 */
function convertSectionV2toV3(section: BlockSection): BlockSectionV3 {
  return {
    id: section.id,
    type: section.type as any,
    name: section.name,
    rows: section.rows.map(row => ({
      id: row.id,
      columns: row.columns.map(col => ({
        id: col.id,
        width: col.width,
        elements: col.elements.map(el => convertElementV2toV3(el)),
        styles: col.styles ? { desktop: col.styles } : undefined
      })),
      styles: row.styles ? { desktop: row.styles } : undefined,
      settings: {}
    })),
    styles: section.styles ? { desktop: section.styles } : undefined,
    settings: section.settings
  };
}

/**
 * Convert BlockSectionV3 to BlockSectionV2
 */
function convertSectionV3toV2(section: BlockSectionV3): BlockSection {
  return {
    id: section.id,
    type: section.type as any,
    name: section.name || 'Untitled Section',
    rows: section.rows.map(row => ({
      id: row.id,
      columns: row.columns.map(col => ({
        id: col.id,
        width: String(col.width),
        elements: col.elements.map(el => convertElementV3toV2(el)),
        styles: col.styles?.desktop || {}
      })),
      styles: row.styles?.desktop || {}
    })),
    styles: section.styles?.desktop || {},
    settings: section.settings || { containerWidth: 'container' }
  };
}

/**
 * Convert BlockElementV2 to BlockElementV3
 */
function convertElementV2toV3(element: BlockElement): BlockElementV3 {
  // V2 stores content in `content`, V3 stores it in `props`
  // Merge both content and props into V3 props
  const mergedProps: Record<string, any> = { ...element.props };
  
  if (element.content) {
    // Copy all content fields to props
    Object.keys(element.content).forEach(key => {
      // Don't overwrite if props already has this key
      if (!(key in mergedProps)) {
        mergedProps[key] = element.content[key];
      }
    });
  }
  
  return {
    id: element.id,
    type: element.type,
    props: mergedProps,
    styles: element.styles ? { desktop: element.styles } : undefined,
    layout: (element as any).layout,
    children: element.children?.map(child => convertElementV2toV3(child)),
    settings: (element as any).settings
  };
}

/**
 * Convert BlockElementV3 to BlockElementV2
 */
function convertElementV3toV2(element: BlockElementV3): BlockElement {
  // V3 stores content in `props`, V2 stores it in `content`
  // We need to properly map content fields based on element type
  const content: Record<string, any> = {};
  
  if (element.props) {
    // Map common content fields
    if (element.props.text) content.text = element.props.text;
    if (element.props.label) content.label = element.props.label;
    if (element.props.href) content.href = element.props.href;
    if (element.props.src) content.src = element.props.src;
    if (element.props.alt) content.alt = element.props.alt;
    if (element.props.placeholder) content.placeholder = element.props.placeholder;
    
    // Copy all other props
    Object.keys(element.props).forEach(key => {
      if (!['text', 'label', 'href', 'src', 'alt', 'placeholder'].includes(key)) {
        content[key] = element.props![key];
      }
    });
  }
  
  return {
    id: element.id,
    type: element.type as any,
    props: element.props || {},
    content,
    styles: element.styles?.desktop || {},
    children: element.children?.map(child => convertElementV3toV2(child)),
    config: {}
  };
}

/**
 * Ensure model is compatible with current version (auto-convert if needed)
 */
export function ensurePageModelV3(model: any): PageModelV3 {
  if (isPageModelV3(model)) {
    return model;
  }
  
  if (isPageModelV2(model)) {
    console.log('📝 Auto-converting PageModelV2 to V3');
    return convertV2toV3(model);
  }
  
  if (isLegacyPageModel(model)) {
    console.log('📝 Auto-converting Legacy → V2 → V3');
    const v2 = upgradeLegacyModel(model);
    return convertV2toV3(v2);
  }
  
  // Default fallback
  console.warn('⚠️ Unknown page model format, creating default V3 model');
  return {
    version: '3.0',
    meta: {
      title: 'Untitled Page',
      description: ''
    },
    sections: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
