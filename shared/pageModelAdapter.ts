import { PageModelV2, BlockSection, BlockElement } from './schema';

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
  const sections: BlockSection[] = (legacy.sections || []).map((legacySection, sectionIndex) => {
    // Create a single row with one column containing elements from legacy content
    const elements: BlockElement[] = [];
    
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
  
  // Build V2 model
  const v2: PageModelV2 = {
    version: 2,
    layout: (legacy.layout as any) || 'single_page',
    sections: sections,
    
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
