import type { PageModelV2, BlockSection, BlockRow, BlockColumn, BlockElement } from "@shared/schema";

/**
 * Converts HTML to PageModelV2 structure
 * Analyzes HTML content and extracts main elements to create a valid PageModelV2
 */
export function convertHtmlToPageModel(html: string): PageModelV2 {
  console.log('🔍 HTML-to-PageModel Converter - Starting...');
  console.log('📄 HTML length:', html.length, 'characters');
  
  // Extract meta information
  const title = extractMetaTag(html, 'title') || extractTag(html, 'title') || 'Nova Página';
  const description = extractMetaTag(html, 'description') || 'Descrição da página';
  const keywords = extractMetaTag(html, 'keywords')?.split(',').map(k => k.trim()) || [];
  
  console.log('📋 Meta extracted:', { title, description, keywordsCount: keywords.length });
  
  // Extract and parse all CSS
  const { rules: cssRules, cssText } = extractAllCSS(html);
  
  console.log('🎨 CSS extracted:', {
    rulesCount: Object.keys(cssRules).length,
    cssTextLength: cssText.length,
    sampleSelectors: Object.keys(cssRules).slice(0, 10)
  });
  
  // Extract theme colors from parsed CSS
  const theme = extractTheme(html, cssRules);
  
  console.log('🎨 Theme extracted:', theme);
  
  // Extract body content
  const bodyContent = extractBodyContent(html);
  
  // Parse HTML elements and group into sections (pass cssRules for style computation)
  const sections = parseHtmlToSections(bodyContent, cssRules);
  
  // Create PageModelV2
  const pageModel: PageModelV2 = {
    version: 2,
    layout: 'single_page',
    sections: sections.length > 0 ? sections : [createDefaultSection()],
    
    theme: {
      colors: {
        primary: theme.primaryColor || '#3b82f6',
        secondary: theme.secondaryColor || '#64748b',
        accent: '#8b5cf6',
        background: theme.backgroundColor || '#ffffff',
        text: theme.textColor || '#1e293b',
        muted: '#94a3b8',
      },
      typography: {
        headingFont: theme.fontFamily || 'Inter, system-ui, sans-serif',
        bodyFont: theme.fontFamily || 'Inter, system-ui, sans-serif',
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
      title,
      description,
      keywords,
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
  
  return pageModel;
}

/**
 * Extract meta tag content
 */
function extractMetaTag(html: string, name: string): string | null {
  // Try name attribute
  const nameRegex = new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
  let match = html.match(nameRegex);
  if (match) return match[1];
  
  // Try property attribute (for og: tags)
  const propRegex = new RegExp(`<meta[^>]*property=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
  match = html.match(propRegex);
  if (match) return match[1];
  
  // Try reversed order (content before name)
  const revRegex = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`, 'i');
  match = html.match(revRegex);
  if (match) return match[1];
  
  return null;
}

/**
 * Extract content from HTML tag
 */
function extractTag(html: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Extract body content
 */
function extractBodyContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : html;
}

/**
 * Extract and parse all CSS from HTML
 */
function extractAllCSS(html: string): { rules: Record<string, Record<string, string>>, cssText: string } {
  const cssRules: Record<string, Record<string, string>> = {};
  let allCssText = '';
  
  // Extract all style tags
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  
  while ((match = styleRegex.exec(html)) !== null) {
    const cssText = match[1];
    allCssText += cssText + '\n';
    
    // Parse CSS rules
    // Match: selector { property: value; }
    const ruleRegex = /([^{]+)\{([^}]+)\}/g;
    let ruleMatch;
    
    while ((ruleMatch = ruleRegex.exec(cssText)) !== null) {
      const selector = ruleMatch[1].trim();
      const properties = ruleMatch[2].trim();
      
      // Parse properties
      const styles: Record<string, string> = {};
      const propRegex = /([^:]+):([^;]+)/g;
      let propMatch;
      
      while ((propMatch = propRegex.exec(properties)) !== null) {
        const property = propMatch[1].trim();
        const value = propMatch[2].trim();
        
        // Convert kebab-case to camelCase
        const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        styles[camelProperty] = value;
      }
      
      // Store by selector (handle multiple selectors separated by comma)
      selector.split(',').forEach(sel => {
        const cleanSelector = sel.trim();
        if (!cssRules[cleanSelector]) {
          cssRules[cleanSelector] = {};
        }
        Object.assign(cssRules[cleanSelector], styles);
      });
    }
  }
  
  return { rules: cssRules, cssText: allCssText };
}

/**
 * Get computed styles for an element based on its tag, classes, and id
 */
function getComputedStyles(
  tag: string,
  classNames: string[],
  id: string | null,
  inlineStyles: Record<string, string>,
  cssRules: Record<string, Record<string, string>>
): Record<string, string> {
  const computedStyles: Record<string, string> = {};
  
  // Apply tag styles
  if (cssRules[tag]) {
    Object.assign(computedStyles, cssRules[tag]);
  }
  
  // Apply class styles (in order)
  classNames.forEach(className => {
    if (cssRules[`.${className}`]) {
      Object.assign(computedStyles, cssRules[`.${className}`]);
    }
  });
  
  // Apply ID styles
  if (id && cssRules[`#${id}`]) {
    Object.assign(computedStyles, cssRules[`#${id}`]);
  }
  
  // Apply inline styles (highest priority)
  Object.assign(computedStyles, inlineStyles);
  
  return computedStyles;
}

/**
 * Extract theme from HTML styles with improved CSS parsing
 */
function extractTheme(html: string, cssRules: Record<string, Record<string, string>>): {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
} {
  const theme: any = {};
  
  // Look for CSS variables in :root
  if (cssRules[':root']) {
    const rootVars = cssRules[':root'];
    theme.primaryColor = rootVars['--primary'] || rootVars['--primary-color'] || rootVars['--color-primary'];
    theme.secondaryColor = rootVars['--secondary'] || rootVars['--secondary-color'] || rootVars['--color-secondary'];
    theme.backgroundColor = rootVars['--bg'] || rootVars['--background'] || rootVars['--background-color'];
    theme.textColor = rootVars['--text'] || rootVars['--text-color'] || rootVars['--color-text'];
    theme.fontFamily = rootVars['--font-family'] || rootVars['--body-font'];
  }
  
  // Fallback to body styles
  if (cssRules['body']) {
    const bodyStyles = cssRules['body'];
    theme.backgroundColor = theme.backgroundColor || bodyStyles.backgroundColor;
    theme.textColor = theme.textColor || bodyStyles.color;
    theme.fontFamily = theme.fontFamily || bodyStyles.fontFamily;
  }
  
  // Look for common button/primary element styles
  const buttonSelectors = ['.btn', '.button', '.btn-primary', 'button'];
  for (const selector of buttonSelectors) {
    if (cssRules[selector]?.backgroundColor) {
      theme.primaryColor = theme.primaryColor || cssRules[selector].backgroundColor;
      break;
    }
  }
  
  return theme;
}

/**
 * Parse HTML to sections
 */
function parseHtmlToSections(html: string, cssRules: Record<string, Record<string, string>>): BlockSection[] {
  console.log('📦 Parsing sections from HTML...');
  console.log('📦 CSS rules available:', Object.keys(cssRules).length);
  
  const sections: BlockSection[] = [];
  
  // Split by section tags if they exist
  const sectionMatches = html.match(/<section[^>]*>([\s\S]*?)<\/section>/gi);
  
  console.log('📦 Found', sectionMatches?.length || 0, 'section tags');
  
  if (sectionMatches && sectionMatches.length > 0) {
    // Has section tags - parse each section
    sectionMatches.forEach((sectionHtml, index) => {
      const elements = parseHtmlElements(sectionHtml, cssRules);
      console.log(`📦 Section ${index + 1}: found ${elements.length} elements`);
      if (elements.length > 0) {
        sections.push(createSection(elements, index));
      }
    });
  } else {
    // No section tags - group elements logically
    const allElements = parseHtmlElements(html, cssRules);
    
    if (allElements.length === 0) {
      return [createDefaultSection()];
    }
    
    // Group elements into sections (e.g., by heading)
    const groupedElements = groupElementsBySections(allElements);
    groupedElements.forEach((elements, index) => {
      sections.push(createSection(elements, index));
    });
  }
  
  return sections;
}

/**
 * Parse HTML to elements
 */
function parseHtmlElements(html: string, cssRules: Record<string, Record<string, string>>): BlockElement[] {
  const elements: BlockElement[] = [];
  
  // Remove script tags (keep style tags for context, they're already parsed)
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Extract all relevant tags
  const tagRegex = /<(h[1-6]|p|a|img|button|div)[^>]*>([\s\S]*?)<\/\1>|<img[^>]*\/?>|<br\s*\/?>/gi;
  let match;
  
  while ((match = tagRegex.exec(html)) !== null) {
    const fullTag = match[0];
    
    // Determine the tag name
    let tag: string;
    if (match[1]) {
      // Regular tag with closing tag
      tag = match[1].toLowerCase();
    } else if (fullTag.toLowerCase().startsWith('<img')) {
      // Self-closing img tag
      tag = 'img';
    } else {
      // Default to br for <br /> tags
      tag = 'br';
    }
    
    const content = match[2] || '';
    
    const element = convertTagToElement(tag, content, fullTag, cssRules);
    if (element) {
      elements.push(element);
    }
  }
  
  return elements;
}

/**
 * Convert HTML tag to BlockElement
 */
function convertTagToElement(tag: string, content: string, fullTag: string, cssRules: Record<string, Record<string, string>>): BlockElement | null {
  const id = generateId();
  
  // Extract attributes
  const inlineStyles = extractInlineStyles(fullTag);
  const classNames = extractAttribute(fullTag, 'class')?.split(/\s+/).filter(c => c) || [];
  const elementId = extractAttribute(fullTag, 'id');
  
  // Compute final styles (tag + classes + id + inline)
  const computedStyles = getComputedStyles(tag, classNames, elementId, inlineStyles, cssRules);
  
  switch (tag) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return {
        id,
        type: 'heading',
        props: { level: tag as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' },
        styles: computedStyles,
        content: { text: stripHtml(content) },
      };
    
    case 'p':
      return {
        id,
        type: 'text',
        props: {},
        styles: computedStyles,
        content: { text: stripHtml(content) },
      };
    
    case 'a':
      const href = extractAttribute(fullTag, 'href') || '#';
      const isButton = classNames.some(c => c.includes('btn') || c.includes('button')) || 
                       fullTag.includes('button');
      
      if (isButton) {
        return {
          id,
          type: 'button',
          props: { href },
          styles: computedStyles,
          content: { text: stripHtml(content), href },
        };
      } else {
        return {
          id,
          type: 'text',
          props: { href },
          styles: computedStyles,
          content: { text: stripHtml(content), href },
        };
      }
    
    case 'button':
      return {
        id,
        type: 'button',
        props: {},
        styles: computedStyles,
        content: { text: stripHtml(content) },
      };
    
    case 'img':
      const src = extractAttribute(fullTag, 'src') || '';
      const alt = extractAttribute(fullTag, 'alt') || '';
      
      if (!src) return null;
      
      return {
        id,
        type: 'image',
        props: { src, alt },
        styles: computedStyles,
        content: { src, alt },
      };
    
    case 'div':
      const text = stripHtml(content).trim();
      if (!text) return null;
      
      return {
        id,
        type: 'text',
        props: {},
        styles: computedStyles,
        content: { text },
      };
    
    case 'br':
      return {
        id,
        type: 'spacer',
        props: { height: '1rem' },
        styles: {},
        content: {},
      };
    
    default:
      return null;
  }
}

/**
 * Extract inline styles from HTML tag
 */
function extractInlineStyles(html: string): Record<string, string> {
  const styles: Record<string, string> = {};
  const styleMatch = html.match(/style=["']([^"']*)["']/i);
  
  if (styleMatch) {
    const styleString = styleMatch[1];
    const styleRules = styleString.split(';');
    
    styleRules.forEach(rule => {
      const [property, value] = rule.split(':').map(s => s.trim());
      if (property && value) {
        // Convert kebab-case to camelCase
        const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        styles[camelProperty] = value;
      }
    });
  }
  
  return styles;
}

/**
 * Extract attribute from HTML tag
 */
function extractAttribute(html: string, attr: string): string | null {
  const regex = new RegExp(`${attr}=["']([^"']*)["']`, 'i');
  const match = html.match(regex);
  return match ? match[1] : null;
}

/**
 * Strip HTML tags from content
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Group elements into logical sections
 */
function groupElementsBySections(elements: BlockElement[]): BlockElement[][] {
  const groups: BlockElement[][] = [];
  let currentGroup: BlockElement[] = [];
  
  elements.forEach((element, index) => {
    currentGroup.push(element);
    
    // Start new section after heading (if not the last element)
    if (element.type === 'heading' && index < elements.length - 1) {
      const nextElement = elements[index + 1];
      if (nextElement?.type === 'heading') {
        groups.push(currentGroup);
        currentGroup = [];
      }
    }
    
    // Limit section size (max 5 elements per section)
    if (currentGroup.length >= 5 && index < elements.length - 1) {
      groups.push(currentGroup);
      currentGroup = [];
    }
  });
  
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }
  
  return groups.length > 0 ? groups : [elements];
}

/**
 * Create a section from elements
 */
function createSection(elements: BlockElement[], index: number): BlockSection {
  // Determine section type based on content
  const hasHeading = elements.some(el => el.type === 'heading');
  const hasButton = elements.some(el => el.type === 'button');
  const hasImage = elements.some(el => el.type === 'image');
  
  let sectionType: BlockSection['type'] = 'content';
  let sectionName = `Seção ${index + 1}`;
  
  if (index === 0 && hasHeading && (hasButton || hasImage)) {
    sectionType = 'hero';
    sectionName = 'Hero';
  } else if (hasButton && !hasImage) {
    sectionType = 'cta';
    sectionName = 'Call to Action';
  } else if (hasHeading) {
    sectionName = elements.find(el => el.type === 'heading')?.content?.text || sectionName;
  }
  
  const column: BlockColumn = {
    id: generateId(),
    width: 'full',
    elements,
    styles: {},
  };
  
  const row: BlockRow = {
    id: generateId(),
    columns: [column],
    styles: {},
  };
  
  return {
    id: generateId(),
    type: sectionType,
    name: sectionName,
    rows: [row],
    styles: {
      paddingTop: '3rem',
      paddingBottom: '3rem',
    },
    settings: {
      containerWidth: 'container',
      textAlign: 'center',
    },
  };
}

/**
 * Create a default empty section
 */
function createDefaultSection(): BlockSection {
  return {
    id: generateId(),
    type: 'content',
    name: 'Nova Seção',
    rows: [
      {
        id: generateId(),
        columns: [
          {
            id: generateId(),
            width: 'full',
            elements: [
              {
                id: generateId(),
                type: 'heading',
                props: { level: 2 },
                styles: {
                  fontSize: '2rem',
                  fontWeight: '700',
                  textAlign: 'center',
                },
                content: { text: 'Título da Seção' },
              },
              {
                id: generateId(),
                type: 'text',
                props: {},
                styles: {
                  textAlign: 'center',
                  marginTop: '1rem',
                },
                content: { text: 'Adicione seu conteúdo aqui.' },
              },
            ],
            styles: {},
          },
        ],
        styles: {},
      },
    ],
    styles: {
      paddingTop: '3rem',
      paddingBottom: '3rem',
    },
    settings: {
      containerWidth: 'container',
      textAlign: 'center',
    },
  };
}

/**
 * Generate unique ID
 */
function generateId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `element_${timestamp}_${random}`;
}
