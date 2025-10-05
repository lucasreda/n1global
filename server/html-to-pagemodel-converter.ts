import type { PageModelV2, BlockSection, BlockRow, BlockColumn, BlockElement } from "@shared/schema";

/**
 * Converts HTML to PageModelV2 structure
 * Analyzes HTML content and extracts main elements to create a valid PageModelV2
 */
export function convertHtmlToPageModel(html: string): PageModelV2 {
  // Extract meta information
  const title = extractMetaTag(html, 'title') || extractTag(html, 'title') || 'Nova Página';
  const description = extractMetaTag(html, 'description') || 'Descrição da página';
  const keywords = extractMetaTag(html, 'keywords')?.split(',').map(k => k.trim()) || [];
  
  // Extract theme colors from style tags or inline styles
  const theme = extractTheme(html);
  
  // Extract body content
  const bodyContent = extractBodyContent(html);
  
  // Parse HTML elements and group into sections
  const sections = parseHtmlToSections(bodyContent);
  
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
 * Extract theme from HTML styles
 */
function extractTheme(html: string): {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
} {
  const theme: any = {};
  
  // Extract from style tags
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (styleMatch) {
    const styles = styleMatch[1];
    
    // Look for common color patterns
    const primaryMatch = styles.match(/--primary[^:]*:\s*([^;]+)/i);
    if (primaryMatch) theme.primaryColor = primaryMatch[1].trim();
    
    const secondaryMatch = styles.match(/--secondary[^:]*:\s*([^;]+)/i);
    if (secondaryMatch) theme.secondaryColor = secondaryMatch[1].trim();
    
    const bgMatch = styles.match(/background-color:\s*([^;]+)/i);
    if (bgMatch) theme.backgroundColor = bgMatch[1].trim();
    
    const colorMatch = styles.match(/color:\s*([^;]+)/i);
    if (colorMatch) theme.textColor = colorMatch[1].trim();
    
    const fontMatch = styles.match(/font-family:\s*([^;]+)/i);
    if (fontMatch) theme.fontFamily = fontMatch[1].trim();
  }
  
  return theme;
}

/**
 * Parse HTML to sections
 */
function parseHtmlToSections(html: string): BlockSection[] {
  const sections: BlockSection[] = [];
  
  // Split by section tags if they exist
  const sectionMatches = html.match(/<section[^>]*>([\s\S]*?)<\/section>/gi);
  
  if (sectionMatches && sectionMatches.length > 0) {
    // Has section tags - parse each section
    sectionMatches.forEach((sectionHtml, index) => {
      const elements = parseHtmlElements(sectionHtml);
      if (elements.length > 0) {
        sections.push(createSection(elements, index));
      }
    });
  } else {
    // No section tags - group elements logically
    const allElements = parseHtmlElements(html);
    
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
function parseHtmlElements(html: string): BlockElement[] {
  const elements: BlockElement[] = [];
  
  // Remove script and style tags
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Extract all relevant tags
  const tagRegex = /<(h[1-6]|p|a|img|button|div)[^>]*>([\s\S]*?)<\/\1>|<img[^>]*\/?>|<br\s*\/?>/gi;
  let match;
  
  while ((match = tagRegex.exec(html)) !== null) {
    const tag = match[1]?.toLowerCase() || 'br';
    const content = match[2] || '';
    const fullTag = match[0];
    
    const element = convertTagToElement(tag, content, fullTag);
    if (element) {
      elements.push(element);
    }
  }
  
  return elements;
}

/**
 * Convert HTML tag to BlockElement
 */
function convertTagToElement(tag: string, content: string, fullTag: string): BlockElement | null {
  const id = generateId();
  const styles = extractInlineStyles(fullTag);
  
  switch (tag) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      const level = parseInt(tag.substring(1));
      return {
        id,
        type: 'heading',
        props: { level },
        styles: {
          ...styles,
          fontSize: level === 1 ? '2.5rem' : level === 2 ? '2rem' : level === 3 ? '1.75rem' : '1.5rem',
          fontWeight: '700',
        },
        content: { text: stripHtml(content) },
      };
    
    case 'p':
      return {
        id,
        type: 'text',
        props: {},
        styles: {
          ...styles,
          marginBottom: '1rem',
        },
        content: { text: stripHtml(content) },
      };
    
    case 'a':
      const href = extractAttribute(fullTag, 'href') || '#';
      const isButton = fullTag.includes('button') || fullTag.includes('btn') || fullTag.includes('cta');
      
      if (isButton) {
        return {
          id,
          type: 'button',
          props: { href },
          styles: {
            ...styles,
            padding: '0.75rem 1.5rem',
            backgroundColor: styles.backgroundColor || '#3b82f6',
            color: styles.color || '#ffffff',
            borderRadius: '0.5rem',
          },
          content: { text: stripHtml(content), href },
        };
      } else {
        return {
          id,
          type: 'text',
          props: { href },
          styles: {
            ...styles,
            color: styles.color || '#3b82f6',
            textDecoration: 'underline',
          },
          content: { text: stripHtml(content), href },
        };
      }
    
    case 'button':
      return {
        id,
        type: 'button',
        props: {},
        styles: {
          ...styles,
          padding: '0.75rem 1.5rem',
          backgroundColor: styles.backgroundColor || '#3b82f6',
          color: styles.color || '#ffffff',
          borderRadius: '0.5rem',
        },
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
        styles: {
          ...styles,
          maxWidth: '100%',
          height: 'auto',
        },
        content: { src, alt },
      };
    
    case 'div':
      const text = stripHtml(content).trim();
      if (!text) return null;
      
      return {
        id,
        type: 'text',
        props: {},
        styles,
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
