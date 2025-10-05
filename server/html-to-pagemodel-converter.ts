import type { PageModelV2, BlockSection, BlockRow, BlockColumn, BlockElement } from "@shared/schema";
import type { PageModelV3, BlockSectionV3, BlockRowV3, BlockColumnV3, BlockElementV3, ResponsiveStylesV3, StateStylesV3, DesignTokensV3, AnimationV3, CSSPropertiesV3, LayoutTypeV3, SemanticTagV3, PseudoElementsV3 } from "@shared/schema";
import { parseDocument } from "htmlparser2";
import type { Element, ChildNode, Text } from "domhandler";
import * as csstree from "css-tree";

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
    version: '2.0',
    meta: {
      title,
      description,
      keywords,
    },
    theme: {
      primaryColor: theme.primaryColor || '#3b82f6',
      secondaryColor: theme.secondaryColor || '#64748b',
      backgroundColor: theme.backgroundColor || '#ffffff',
      textColor: theme.textColor || '#1e293b',
      fontFamily: theme.fontFamily || 'Inter, system-ui, sans-serif',
    },
    sections: sections.length > 0 ? sections : [createDefaultSection()],
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
 * Extract and parse all CSS from HTML using css-tree
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
    
    try {
      // Parse CSS using css-tree (removes comments automatically)
      const ast = csstree.parse(cssText);
      
      // Walk through the AST and extract rules
      csstree.walk(ast, {
        visit: 'Rule',
        enter(node: any) {
          // Get selector text
          const selectorText = csstree.generate(node.prelude);
          
          // Parse declarations
          const styles: Record<string, string> = {};
          
          if (node.block && node.block.children) {
            node.block.children.forEach((child: any) => {
              if (child.type === 'Declaration') {
                const property = child.property;
                const value = csstree.generate(child.value);
                
                // Convert kebab-case to camelCase for React inline styles
                const camelProperty = property.replace(/-([a-z])/g, (_: string, g: string) => g.toUpperCase());
                styles[camelProperty] = value;
              }
            });
          }
          
          // Store by selector (handle multiple selectors separated by comma)
          selectorText.split(',').forEach(sel => {
            const cleanSelector = sel.trim();
            if (!cssRules[cleanSelector]) {
              cssRules[cleanSelector] = {};
            }
            Object.assign(cssRules[cleanSelector], styles);
          });
        }
      });
    } catch (error) {
      console.error('❌ CSS parsing error:', error);
    }
  }
  
  console.log('🎨 CSS Rules extracted:', {
    totalSelectors: Object.keys(cssRules).length,
    selectors: Object.keys(cssRules).slice(0, 10),
    sampleRule: Object.keys(cssRules)[0] ? {
      selector: Object.keys(cssRules)[0],
      styles: cssRules[Object.keys(cssRules)[0]]
    } : null
  });
  
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
    // Has section tags - parse each section AND extract container styles
    sectionMatches.forEach((sectionHtml, index) => {
      // Extract section tag attributes to get styles
      const sectionTagMatch = sectionHtml.match(/<section([^>]*)>/i);
      let sectionStyles: Record<string, string> = {};
      
      if (sectionTagMatch) {
        const sectionTag = sectionTagMatch[0];
        // Extract classes and id from section tag
        const classMatch = sectionTag.match(/class=["']([^"']*)["']/i);
        const idMatch = sectionTag.match(/id=["']([^"']*)["']/i);
        const styleMatch = sectionTag.match(/style=["']([^"']*)["']/i);
        
        const classNames = classMatch ? classMatch[1].split(/\s+/).filter(c => c) : [];
        const elementId = idMatch ? idMatch[1] : null;
        const inlineStyles: Record<string, string> = {};
        
        if (styleMatch) {
          styleMatch[1].split(';').forEach(decl => {
            const [prop, val] = decl.split(':').map(s => s.trim());
            if (prop && val) {
              const camelProp = prop.replace(/-([a-z])/g, (_: string, g: string) => g.toUpperCase());
              inlineStyles[camelProp] = val;
            }
          });
        }
        
        // Compute styles for the section container
        sectionStyles = getComputedStyles('section', classNames, elementId, inlineStyles, cssRules);
        console.log(`📦 Section ${index + 1} container styles:`, Object.keys(sectionStyles).slice(0, 8));
      }
      
      const elements = parseHtmlElements(sectionHtml, cssRules);
      console.log(`📦 Section ${index + 1}: found ${elements.length} elements`);
      if (elements.length > 0) {
        sections.push(createSection(elements, index, sectionStyles));
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
 * Parse HTML to elements using htmlparser2 (DOM tree)
 */
function parseHtmlElements(html: string, cssRules: Record<string, Record<string, string>>): BlockElement[] {
  console.log('🔍 parseHtmlElements called with HTML length:', html.length);
  console.log('🔍 Using htmlparser2 for DOM parsing');
  
  // Parse HTML fragment
  const dom = parseDocument(html, {
    lowerCaseTags: false, // Preserve case
    lowerCaseAttributeNames: true,
  });
  
  // Convert DOM nodes to BlockElements recursively
  const elements = convertDOMNodesToElements(dom.children, cssRules);
  
  console.log(`🔍 Total elements created: ${elements.length}`);
  
  return elements;
}

/**
 * Recursively convert DOM nodes to BlockElements
 */
function convertDOMNodesToElements(nodes: ChildNode[], cssRules: Record<string, Record<string, string>>): BlockElement[] {
  const elements: BlockElement[] = [];
  
  for (const node of nodes) {
    // Text node - skip standalone text (will be captured by parent tags)
    if (node.type === 'text') {
      continue;
    }
    
    // Element node
    if (node.type === 'tag') {
      const element = node as Element;
      const converted = convertDOMElementToBlockElement(element, cssRules);
      
      if (converted) {
        elements.push(converted);
      } else {
        // If element itself didn't convert (e.g., div, ul), try children
        if (element.children && element.children.length > 0) {
          const childElements = convertDOMNodesToElements(element.children, cssRules);
          elements.push(...childElements);
        }
      }
    }
  }
  
  return elements;
}

/**
 * Convert a single DOM element to BlockElement
 */
function convertDOMElementToBlockElement(element: Element, cssRules: Record<string, Record<string, string>>): BlockElement | null {
  const tag = element.name.toLowerCase();
  const id = generateId();
  
  // Extract attributes and compute styles
  const classNames = element.attribs?.class?.split(/\s+/).filter(c => c) || [];
  const elementId = element.attribs?.id;
  const inlineStyleStr = element.attribs?.style || '';
  
  // Parse inline styles
  const inlineStyles: Record<string, string> = {};
  if (inlineStyleStr) {
    inlineStyleStr.split(';').forEach(decl => {
      const [prop, val] = decl.split(':').map(s => s.trim());
      if (prop && val) {
        inlineStyles[prop] = val;
      }
    });
  }
  
  // Compute final styles
  const computedStyles = getComputedStyles(tag, classNames, elementId, inlineStyles, cssRules);
  
  // Debug: Log element conversion details
  if (Object.keys(computedStyles).length > 0) {
    console.log(`🔍 Element <${tag}> classes=[${classNames.join(', ')}] → styles:`, Object.keys(computedStyles).slice(0, 5));
  }
  
  // Get text content
  const textContent = getTextContentFromDOM(element);
  
  // Convert based on tag type
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
        content: { text: textContent },
      };
    
    case 'p':
      return {
        id,
        type: 'text',
        props: {},
        styles: computedStyles,
        content: { text: textContent },
      };
    
    case 'button':
      return {
        id,
        type: 'button',
        props: {},
        styles: computedStyles,
        content: { text: textContent },
      };
    
    case 'a':
      const href = element.attribs?.href || '#';
      const isButton = classNames.some(c => c.includes('btn') || c.includes('button'));
      
      if (isButton) {
        return {
          id,
          type: 'button',
          props: { href },
          styles: computedStyles,
          content: { text: textContent, href },
        };
      } else {
        return {
          id,
          type: 'text',
          props: { href },
          styles: computedStyles,
          content: { text: textContent, href },
        };
      }
    
    case 'img':
      return {
        id,
        type: 'image',
        props: {
          src: element.attribs?.src || '',
          alt: element.attribs?.alt || '',
        },
        styles: computedStyles,
        content: {},
      };
    
    case 'ul':
    case 'ol':
      // Convert list to text with bullets
      const items: string[] = [];
      if (element.children) {
        for (const child of element.children) {
          if (child.type === 'tag' && (child as Element).name === 'li') {
            items.push(getTextContentFromDOM(child as Element));
          }
        }
      }
      
      return {
        id,
        type: 'text',
        props: {},
        styles: computedStyles,
        content: { text: items.map(item => `• ${item}`).join('\n') },
      };
    
    // For other tags (div, span, etc.), return null so children are processed
    default:
      return null;
  }
}

/**
 * Get text content from DOM element recursively
 */
function getTextContentFromDOM(element: Element): string {
  let text = '';
  
  if (element.children) {
    for (const child of element.children) {
      if (child.type === 'text') {
        text += (child as Text).data;
      } else if (child.type === 'tag') {
        text += getTextContentFromDOM(child as Element);
      }
    }
  }
  
  return text.trim();
}

/**
 * Convert HTML tag to BlockElement
 */
function convertTagToElement(tag: string, content: string, fullTag: string, cssRules: Record<string, Record<string, string>>): BlockElement | null {
  const id = generateId();
  
  // Extract attributes
  const inlineStyles = extractInlineStyles(fullTag);
  const classNames = extractClassNames(fullTag);
  const elementId = extractElementId(fullTag);
  
  // Compute styles
  const computedStyles = getComputedStyles(tag, classNames, elementId, inlineStyles, cssRules);
  
  console.log(`🔍 Converting tag: ${tag}, classes: [${classNames.join(', ')}]`);
  
  // Handle different tags
  if (tag.match(/^h[1-6]$/)) {
    return {
      id,
      type: 'heading',
      props: { level: tag as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' },
      styles: computedStyles,
      content: { text: stripHtmlTags(content) },
    };
  }
  
  if (tag === 'p') {
    return {
      id,
      type: 'text',
      props: {},
      styles: computedStyles,
      content: { text: stripHtmlTags(content) },
    };
  }
  
  if (tag === 'button' || (tag === 'a' && classNames.some(c => c.includes('btn') || c.includes('button')))) {
    let href = '#';
    if (tag === 'a') {
      const hrefMatch = fullTag.match(/href=["']([^"']*)["']/i);
      if (hrefMatch) href = hrefMatch[1];
    }
    
    return {
      id,
      type: 'button',
      props: { href: tag === 'a' ? href : undefined },
      styles: computedStyles,
      content: { text: stripHtmlTags(content), href: tag === 'a' ? href : undefined },
    };
  }
  
  if (tag === 'img') {
    const srcMatch = fullTag.match(/src=["']([^"']*)["']/i);
    const altMatch = fullTag.match(/alt=["']([^"']*)["']/i);
    
    return {
      id,
      type: 'image',
      props: {
        src: srcMatch ? srcMatch[1] : '',
        alt: altMatch ? altMatch[1] : '',
      },
      styles: computedStyles,
      content: {},
    };
  }
  
  if (tag === 'a' && !classNames.some(c => c.includes('btn'))) {
    const hrefMatch = fullTag.match(/href=["']([^"']*)["']/i);
    const href = hrefMatch ? hrefMatch[1] : '#';
    
    return {
      id,
      type: 'text',
      props: { href },
      styles: computedStyles,
      content: { text: stripHtmlTags(content), href },
    };
  }
  
  // For unhandled tags, return text if content exists
  if (stripHtmlTags(content)) {
    return {
      id,
      type: 'text',
      props: {},
      styles: computedStyles,
      content: { text: stripHtmlTags(content) },
    };
  }
  
  return null;
}

/**
 * Extract inline styles from tag
 */
function extractInlineStyles(fullTag: string): Record<string, string> {
  const styleMatch = fullTag.match(/style=["']([^"']*)["']/i);
  if (!styleMatch) return {};
  
  const inlineStyles: Record<string, string> = {};
  styleMatch[1].split(';').forEach(decl => {
    const [prop, val] = decl.split(':').map(s => s.trim());
    if (prop && val) {
      inlineStyles[prop] = val;
    }
  });
  
  return inlineStyles;
}

/**
 * Extract class names from tag
 */
function extractClassNames(fullTag: string): string[] {
  const classMatch = fullTag.match(/class=["']([^"']*)["']/i);
  return classMatch ? classMatch[1].split(/\s+/).filter(c => c) : [];
}

/**
 * Extract element ID from tag
 */
function extractElementId(fullTag: string): string | null {
  const idMatch = fullTag.match(/id=["']([^"']*)["']/i);
  return idMatch ? idMatch[1] : null;
}

/**
 * Strip HTML tags from content
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Group elements by logical sections
 */
function groupElementsBySections(elements: BlockElement[]): BlockElement[][] {
  const groups: BlockElement[][] = [];
  let currentGroup: BlockElement[] = [];
  
  elements.forEach((element, index) => {
    // Start new section on h1/h2
    if (element.type === 'heading' && (element.props.level === 'h1' || element.props.level === 'h2') && currentGroup.length > 0) {
      groups.push(currentGroup);
      currentGroup = [element];
    } else {
      currentGroup.push(element);
    }
    
    // Last element
    if (index === elements.length - 1 && currentGroup.length > 0) {
      groups.push(currentGroup);
    }
  });
  
  return groups.length > 0 ? groups : [elements];
}

/**
 * Create a BlockSection from elements
 */
function createSection(elements: BlockElement[], index: number, containerStyles?: Record<string, string>): BlockSection {
  return {
    id: generateId(),
    type: index === 0 ? 'hero' : 'content',
    name: `Seção ${index + 1}`,
    rows: [
      {
        id: generateId(),
        columns: [
          {
            id: generateId(),
            width: 'full',
            elements,
            styles: {},
          },
        ],
        styles: {},
      },
    ],
    styles: containerStyles || {},
    settings: {
      containerWidth: 'container',
    },
  };
}

/**
 * Create a default section
 */
function createDefaultSection(): BlockSection {
  return {
    id: generateId(),
    type: 'content',
    name: 'Seção Padrão',
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
                props: { level: 'h2' },
                styles: {
                  textAlign: 'center',
                  fontSize: '2rem',
                  fontWeight: 'bold',
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

// ============================================
// PAGE MODEL V3 CONVERTER
// ============================================

/**
 * CSS Rule with metadata for CSSOM
 */
interface CSSRuleV3 {
  selector: string;
  specificity: number;
  declarationOrder: number;
  styles: CSSPropertiesV3;
  mediaQuery?: string;
  pseudoClass?: string;
  pseudoElement?: string;
}

/**
 * CSSOM - Complete CSS Object Model
 */
interface CSSOMV3 {
  rules: CSSRuleV3[];
  mediaQueries: Map<string, CSSRuleV3[]>;
  keyframes: Map<string, AnimationV3>;
  variables: Map<string, string>;
}

/**
 * Specificity Calculator
 */
class SpecificityCalculator {
  calculate(selector: string): number {
    let specificity = 0;
    
    // Remove pseudo-elements and pseudo-classes for counting
    const cleanSelector = selector.replace(/::[a-z-]+/g, '').replace(/:[a-z-]+(\([^)]*\))?/g, '');
    
    // Count IDs (100 points each)
    const idMatches = cleanSelector.match(/#[a-z0-9_-]+/gi);
    specificity += (idMatches?.length || 0) * 100;
    
    // Count classes, attributes, and pseudo-classes (10 points each)
    const classMatches = cleanSelector.match(/\.[a-z0-9_-]+/gi);
    const attrMatches = cleanSelector.match(/\[[^\]]+\]/g);
    specificity += (classMatches?.length || 0) * 10;
    specificity += (attrMatches?.length || 0) * 10;
    
    // Count type selectors and pseudo-elements (1 point each)
    const typeMatches = cleanSelector.match(/(?:^|[\s>+~])([a-z][a-z0-9]*)/gi);
    specificity += (typeMatches?.length || 0) * 1;
    
    return specificity;
  }
}

/**
 * CSSOM Builder - Builds complete CSS Object Model
 */
class CSSOMBuilder {
  private specificityCalc = new SpecificityCalculator();
  private declarationCounter = 0;
  
  build(html: string): CSSOMV3 {
    console.log('🎨 Building CSSOM V3...');
    
    const cssom: CSSOMV3 = {
      rules: [],
      mediaQueries: new Map(),
      keyframes: new Map(),
      variables: new Map(),
    };
    
    // Extract all CSS
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let match;
    
    while ((match = styleRegex.exec(html)) !== null) {
      const cssText = match[1];
      this.parseCSS(cssText, cssom);
    }
    
    console.log('✅ CSSOM built:', {
      totalRules: cssom.rules.length,
      mediaQueries: cssom.mediaQueries.size,
      keyframes: cssom.keyframes.size,
      variables: cssom.variables.size,
    });
    
    return cssom;
  }
  
  private parseCSS(cssText: string, cssom: CSSOMV3, mediaQuery?: string): void {
    try {
      const ast = csstree.parse(cssText);
      
      csstree.walk(ast, {
        visit: 'Rule',
        enter: (node: any) => {
          const selectorText = csstree.generate(node.prelude);
          const styles = this.extractStyles(node);
          
          // Check for pseudo-classes and pseudo-elements
          const pseudoClass = this.extractPseudoClass(selectorText);
          const pseudoElement = this.extractPseudoElement(selectorText);
          const baseSelector = this.getBaseSelector(selectorText);
          
          const rule: CSSRuleV3 = {
            selector: baseSelector,
            specificity: this.specificityCalc.calculate(baseSelector),
            declarationOrder: this.declarationCounter++,
            styles,
            mediaQuery,
            pseudoClass,
            pseudoElement,
          };
          
          cssom.rules.push(rule);
          
          // Store in media queries map
          if (mediaQuery) {
            if (!cssom.mediaQueries.has(mediaQuery)) {
              cssom.mediaQueries.set(mediaQuery, []);
            }
            cssom.mediaQueries.get(mediaQuery)!.push(rule);
          }
        },
      });
      
      // Extract @media rules
      csstree.walk(ast, {
        visit: 'Atrule',
        enter: (node: any) => {
          if (node.name === 'media') {
            const mediaQueryText = csstree.generate(node.prelude);
            const innerCSS = csstree.generate(node.block);
            this.parseCSS(innerCSS, cssom, mediaQueryText);
          } else if (node.name === 'keyframes') {
            const animationName = csstree.generate(node.prelude);
            const animation = this.parseKeyframes(node, animationName);
            cssom.keyframes.set(animationName, animation);
          }
        },
      });
      
      // Extract CSS variables from :root
      const rootRules = cssom.rules.filter(r => r.selector === ':root');
      rootRules.forEach(rule => {
        Object.entries(rule.styles).forEach(([key, value]) => {
          if (key.startsWith('--')) {
            cssom.variables.set(key, value as string);
          }
        });
      });
      
    } catch (error) {
      console.error('❌ CSS parsing error:', error);
    }
  }
  
  private extractStyles(node: any): CSSPropertiesV3 {
    const styles: CSSPropertiesV3 = {};
    
    if (node.block && node.block.children) {
      node.block.children.forEach((child: any) => {
        if (child.type === 'Declaration') {
          const property = child.property;
          const value = csstree.generate(child.value);
          const camelProperty = property.replace(/-([a-z])/g, (_: string, g: string) => g.toUpperCase());
          styles[camelProperty] = value;
        }
      });
    }
    
    return styles;
  }
  
  private extractPseudoClass(selector: string): string | undefined {
    const match = selector.match(/:([a-z-]+)(?:\([^)]*\))?/);
    if (match && !match[1].startsWith(':')) {
      return match[1];
    }
    return undefined;
  }
  
  private extractPseudoElement(selector: string): string | undefined {
    const match = selector.match(/::(before|after)/);
    return match ? match[1] : undefined;
  }
  
  private getBaseSelector(selector: string): string {
    return selector.replace(/::[a-z-]+/g, '').replace(/:[a-z-]+(\([^)]*\))?/g, '').trim();
  }
  
  private parseKeyframes(node: any, name: string): AnimationV3 {
    const keyframes: Array<{ offset: number; styles: CSSPropertiesV3 }> = [];
    
    if (node.block && node.block.children) {
      node.block.children.forEach((child: any) => {
        if (child.type === 'Rule') {
          const selectorText = csstree.generate(child.prelude);
          const offset = this.parseKeyframeOffset(selectorText);
          const styles = this.extractStyles(child);
          keyframes.push({ offset, styles });
        }
      });
    }
    
    return {
      id: generateId(),
      name,
      type: 'keyframe',
      keyframes,
    };
  }
  
  private parseKeyframeOffset(selector: string): number {
    if (selector === 'from') return 0;
    if (selector === 'to') return 100;
    const match = selector.match(/(\d+)%/);
    return match ? parseInt(match[1]) : 0;
  }
}

/**
 * Design Tokens Extractor
 */
class DesignTokensExtractor {
  extract(cssom: CSSOMV3): DesignTokensV3 {
    console.log('🎨 Extracting design tokens...');
    
    const colors = this.extractColors(cssom);
    const typography = this.extractTypography(cssom);
    const spacing = this.extractSpacing(cssom);
    const shadows = this.extractShadows(cssom);
    
    return {
      colors,
      typography,
      spacing,
      shadows,
      borderRadius: {
        none: '0',
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        full: '9999px',
      },
      breakpoints: {
        mobile: '768px',
        tablet: '1024px',
        desktop: '1280px',
      },
    };
  }
  
  private extractColors(cssom: CSSOMV3): DesignTokensV3['colors'] {
    const colorMap = new Map<string, number>();
    
    // Collect all colors from rules
    cssom.rules.forEach(rule => {
      const colorProps = ['color', 'backgroundColor', 'borderColor'];
      colorProps.forEach(prop => {
        const value = rule.styles[prop];
        if (value && typeof value === 'string' && this.isColor(value)) {
          colorMap.set(value, (colorMap.get(value) || 0) + 1);
        }
      });
    });
    
    // Sort by frequency
    const sortedColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([color]) => color);
    
    // Build color palettes
    const primary = this.buildColorScale(sortedColors[0] || '#3b82f6');
    const secondary = this.buildColorScale(sortedColors[1] || '#64748b');
    const neutral = this.buildColorScale('#6b7280');
    
    return {
      primary,
      secondary,
      neutral,
      semantic: {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
      custom: {},
    };
  }
  
  private buildColorScale(baseColor: string): Record<string, string> {
    return {
      50: baseColor,
      100: baseColor,
      200: baseColor,
      300: baseColor,
      400: baseColor,
      500: baseColor,
      600: baseColor,
      700: baseColor,
      800: baseColor,
      900: baseColor,
    };
  }
  
  private extractTypography(cssom: CSSOMV3): DesignTokensV3['typography'] {
    const fontSizes = new Set<string>();
    const fontFamilies = new Set<string>();
    const fontWeights = new Set<string>();
    
    cssom.rules.forEach(rule => {
      if (rule.styles.fontSize) fontSizes.add(rule.styles.fontSize as string);
      if (rule.styles.fontFamily) fontFamilies.add(rule.styles.fontFamily as string);
      if (rule.styles.fontWeight) fontWeights.add(rule.styles.fontWeight as string);
    });
    
    const sortedSizes = Array.from(fontSizes).sort();
    
    return {
      fontFamilies: {
        sans: Array.from(fontFamilies)[0] || 'Inter, system-ui, sans-serif',
        serif: 'Georgia, serif',
        mono: 'Consolas, monospace',
      },
      fontSizes: {
        xs: sortedSizes[0] || '0.75rem',
        sm: sortedSizes[1] || '0.875rem',
        base: sortedSizes[2] || '1rem',
        lg: sortedSizes[3] || '1.125rem',
        xl: sortedSizes[4] || '1.25rem',
        '2xl': sortedSizes[5] || '1.5rem',
        '3xl': sortedSizes[6] || '1.875rem',
        '4xl': sortedSizes[7] || '2.25rem',
      },
      fontWeights: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeights: {
        tight: '1.25',
        normal: '1.5',
        relaxed: '1.75',
      },
      letterSpacings: {
        tight: '-0.05em',
        normal: '0',
        wide: '0.05em',
      },
    };
  }
  
  private extractSpacing(cssom: CSSOMV3): DesignTokensV3['spacing'] {
    const spacings = new Set<string>();
    
    cssom.rules.forEach(rule => {
      ['padding', 'margin', 'gap'].forEach(prop => {
        if (rule.styles[prop]) spacings.add(rule.styles[prop] as string);
      });
    });
    
    const sortedSpacings = Array.from(spacings).sort();
    
    return {
      xs: sortedSpacings[0] || '0.5rem',
      sm: sortedSpacings[1] || '1rem',
      md: sortedSpacings[2] || '1.5rem',
      lg: sortedSpacings[3] || '2rem',
      xl: sortedSpacings[4] || '3rem',
      '2xl': sortedSpacings[5] || '4rem',
    };
  }
  
  private extractShadows(cssom: CSSOMV3): DesignTokensV3['shadows'] {
    return {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    };
  }
  
  private isColor(value: string): boolean {
    return /^(#[0-9a-f]{3,8}|rgb|hsl|var\(--)/.test(value);
  }
}

/**
 * Layout Detector
 */
class LayoutDetector {
  detect(styles: CSSPropertiesV3): LayoutTypeV3 | undefined {
    if (styles.display === 'flex') {
      return 'flex';
    }
    
    if (styles.display === 'grid') {
      return 'grid';
    }
    
    if (styles.position === 'absolute') {
      return 'absolute';
    }
    
    if (styles.position === 'fixed') {
      return 'fixed';
    }
    
    if (styles.position === 'relative') {
      return 'relative';
    }
    
    if (styles.position === 'sticky') {
      return 'sticky';
    }
    
    if (styles.display === 'inline') {
      return 'inline';
    }
    
    if (styles.display === 'inline-block') {
      return 'inline-block';
    }
    
    return 'block';
  }
}

/**
 * Media Query Parser
 */
class MediaQueryParser {
  parseBreakpoint(mediaQuery: string): 'mobile' | 'tablet' | 'desktop' | undefined {
    if (mediaQuery.includes('max-width') && mediaQuery.includes('768px')) {
      return 'mobile';
    }
    if (mediaQuery.includes('min-width') && mediaQuery.includes('769px') && mediaQuery.includes('max-width') && mediaQuery.includes('1024px')) {
      return 'tablet';
    }
    if (mediaQuery.includes('min-width') && mediaQuery.includes('1025px')) {
      return 'desktop';
    }
    return undefined;
  }
}

/**
 * Convert HTML to PageModelV3
 */
export function convertHtmlToPageModelV3(html: string): PageModelV3 {
  console.log('🚀 HTML-to-PageModelV3 Converter - Starting...');
  
  // 1. Build CSSOM
  const cssomBuilder = new CSSOMBuilder();
  const cssom = cssomBuilder.build(html);
  
  // 2. Extract design tokens
  const tokensExtractor = new DesignTokensExtractor();
  const designTokens = tokensExtractor.extract(cssom);
  
  // 3. Extract meta information
  const title = extractMetaTag(html, 'title') || extractTag(html, 'title') || 'Nova Página';
  const description = extractMetaTag(html, 'description') || 'Descrição da página';
  const keywords = extractMetaTag(html, 'keywords')?.split(',').map(k => k.trim()) || [];
  const ogImage = extractMetaTag(html, 'og:image');
  
  // 4. Parse HTML to sections
  const bodyContent = extractBodyContent(html);
  const sections = parseHtmlToSectionsV3(bodyContent, cssom);
  
  // 5. Create PageModelV3
  const pageModel: PageModelV3 = {
    version: '3.0',
    meta: {
      title,
      description,
      keywords,
      ogImage: ogImage || undefined,
    },
    designTokens,
    components: [],
    sections,
    editorState: {
      activeBreakpoint: 'desktop',
      zoom: 1,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  console.log('✅ PageModelV3 created successfully!');
  console.log('📊 Stats:', {
    sections: sections.length,
    designTokens: Object.keys(designTokens).length,
  });
  
  return pageModel;
}

/**
 * Parse HTML to BlockSectionV3[]
 */
function parseHtmlToSectionsV3(html: string, cssom: CSSOMV3): BlockSectionV3[] {
  const sections: BlockSectionV3[] = [];
  const dom = parseDocument(html, { lowerCaseTags: false, lowerCaseAttributeNames: true });
  const layoutDetector = new LayoutDetector();
  const mediaQueryParser = new MediaQueryParser();
  
  // Find section elements
  const sectionElements = findElementsByTag(dom.children, 'section');
  
  if (sectionElements.length > 0) {
    sectionElements.forEach((sectionEl, index) => {
      const section = convertDOMToBlockSectionV3(sectionEl, cssom, layoutDetector, mediaQueryParser, index);
      sections.push(section);
    });
  } else {
    // No sections found - create one section with all content
    const defaultSection: BlockSectionV3 = {
      id: generateId(),
      type: 'content',
      name: 'Seção Principal',
      rows: [{
        id: generateId(),
        columns: [{
          id: generateId(),
          width: 'full',
          elements: convertDOMChildrenToBlockElementsV3(dom.children, cssom, layoutDetector, mediaQueryParser),
          styles: {},
        }],
        styles: {},
      }],
      styles: {},
    };
    sections.push(defaultSection);
  }
  
  return sections.length > 0 ? sections : [createDefaultSectionV3()];
}

/**
 * Convert DOM element to BlockSectionV3
 */
function convertDOMToBlockSectionV3(
  element: Element,
  cssom: CSSOMV3,
  layoutDetector: LayoutDetector,
  mediaQueryParser: MediaQueryParser,
  index: number
): BlockSectionV3 {
  const id = generateId();
  const styles = computeResponsiveStyles(element, cssom, mediaQueryParser);
  const states = computeStateStyles(element, cssom);
  
  // Convert children to rows
  const rows: BlockRowV3[] = [];
  const rowElements = findElementsByTag(element.children, 'div');
  
  if (rowElements.length > 0) {
    rowElements.forEach(rowEl => {
      const row = convertDOMToBlockRowV3(rowEl, cssom, layoutDetector, mediaQueryParser);
      rows.push(row);
    });
  } else {
    // Create a single row with all children
    rows.push({
      id: generateId(),
      columns: [{
        id: generateId(),
        width: 'full',
        elements: convertDOMChildrenToBlockElementsV3(element.children, cssom, layoutDetector, mediaQueryParser),
        styles: {},
      }],
      styles: {},
    });
  }
  
  return {
    id,
    type: index === 0 ? 'hero' : 'content',
    name: element.attribs?.['data-name'] || `Seção ${index + 1}`,
    rows,
    styles,
    states,
  };
}

/**
 * Convert DOM element to BlockRowV3
 */
function convertDOMToBlockRowV3(
  element: Element,
  cssom: CSSOMV3,
  layoutDetector: LayoutDetector,
  mediaQueryParser: MediaQueryParser
): BlockRowV3 {
  const styles = computeResponsiveStyles(element, cssom, mediaQueryParser);
  const layout = layoutDetector.detect(styles.desktop || {});
  
  return {
    id: generateId(),
    columns: [{
      id: generateId(),
      width: 'full',
      elements: convertDOMChildrenToBlockElementsV3(element.children, cssom, layoutDetector, mediaQueryParser),
      styles: {},
    }],
    styles,
    layout: layout === 'flex' || layout === 'grid' ? layout : undefined,
  };
}

/**
 * Convert DOM children to BlockElementV3[]
 */
function convertDOMChildrenToBlockElementsV3(
  nodes: ChildNode[],
  cssom: CSSOMV3,
  layoutDetector: LayoutDetector,
  mediaQueryParser: MediaQueryParser
): BlockElementV3[] {
  const elements: BlockElementV3[] = [];
  
  for (const node of nodes) {
    if (node.type === 'tag') {
      const element = node as Element;
      const converted = convertDOMElementToBlockElementV3(element, cssom, layoutDetector, mediaQueryParser);
      
      if (converted) {
        elements.push(converted);
      } else {
        // Try to convert children
        const childElements = convertDOMChildrenToBlockElementsV3(element.children, cssom, layoutDetector, mediaQueryParser);
        elements.push(...childElements);
      }
    }
  }
  
  return elements;
}

/**
 * Convert DOM element to BlockElementV3
 */
function convertDOMElementToBlockElementV3(
  element: Element,
  cssom: CSSOMV3,
  layoutDetector: LayoutDetector,
  mediaQueryParser: MediaQueryParser
): BlockElementV3 | null {
  const tag = element.name.toLowerCase();
  const textContent = getTextContentFromDOM(element);
  
  // Compute styles
  const styles = computeResponsiveStyles(element, cssom, mediaQueryParser);
  const states = computeStateStyles(element, cssom);
  const pseudoElements = computePseudoElements(element, cssom, mediaQueryParser);
  const layout = layoutDetector.detect(styles.desktop || {});
  const semanticTag = getSemanticTag(tag);
  
  // Convert based on tag
  let elementType: BlockElementV3['type'] = 'text';
  const props: any = {};
  
  switch (tag) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      elementType = 'heading';
      props.level = tag;
      props.text = textContent;
      break;
      
    case 'p':
      elementType = 'text';
      props.text = textContent;
      break;
      
    case 'button':
      elementType = 'button';
      props.text = textContent;
      props.onClick = element.attribs?.onclick;
      break;
      
    case 'a':
      const isButton = element.attribs?.class?.includes('btn') || element.attribs?.class?.includes('button');
      elementType = isButton ? 'button' : 'text';
      props.text = textContent;
      props.href = element.attribs?.href;
      break;
      
    case 'img':
      elementType = 'image';
      props.src = element.attribs?.src;
      props.alt = element.attribs?.alt;
      break;
      
    case 'video':
      elementType = 'video';
      props.src = element.attribs?.src;
      break;
      
    case 'input':
      elementType = 'input';
      props.type = element.attribs?.type || 'text';
      props.placeholder = element.attribs?.placeholder;
      break;
      
    case 'form':
      elementType = 'form';
      props.action = element.attribs?.action;
      props.method = element.attribs?.method;
      break;
      
    case 'hr':
      elementType = 'divider';
      break;
      
    case 'div':
    case 'section':
    case 'article':
    case 'header':
    case 'footer':
    case 'nav':
    case 'aside':
    case 'main':
      elementType = 'container';
      break;
      
    default:
      if (!textContent) return null;
      elementType = 'text';
      props.text = textContent;
  }
  
  // Build element
  const blockElement: BlockElementV3 = {
    id: generateId(),
    type: elementType,
    props,
    styles,
    states,
    pseudoElements: Object.keys(pseudoElements || {}).length > 0 ? pseudoElements : undefined,
    layout,
    semanticTag,
  };
  
  // Add children for container elements
  if (elementType === 'container' && element.children) {
    blockElement.children = convertDOMChildrenToBlockElementsV3(element.children, cssom, layoutDetector, mediaQueryParser);
  }
  
  return blockElement;
}

/**
 * Compute responsive styles for an element
 */
function computeResponsiveStyles(
  element: Element,
  cssom: CSSOMV3,
  mediaQueryParser: MediaQueryParser
): ResponsiveStylesV3 {
  const responsive: ResponsiveStylesV3 = {};
  
  // Get matching rules
  const matchingRules = getMatchingRules(element, cssom);
  
  // Separate by breakpoint
  const desktopRules = matchingRules.filter(r => !r.mediaQuery);
  const mobileRules = matchingRules.filter(r => r.mediaQuery && mediaQueryParser.parseBreakpoint(r.mediaQuery) === 'mobile');
  const tabletRules = matchingRules.filter(r => r.mediaQuery && mediaQueryParser.parseBreakpoint(r.mediaQuery) === 'tablet');
  
  // Apply cascade
  if (desktopRules.length > 0) {
    responsive.desktop = applyCascade(desktopRules);
  }
  
  if (mobileRules.length > 0) {
    responsive.mobile = applyCascade(mobileRules);
  }
  
  if (tabletRules.length > 0) {
    responsive.tablet = applyCascade(tabletRules);
  }
  
  return responsive;
}

/**
 * Compute state styles for an element
 */
function computeStateStyles(element: Element, cssom: CSSOMV3): StateStylesV3 | undefined {
  const matchingRules = getMatchingRules(element, cssom);
  
  const defaultRules = matchingRules.filter(r => !r.pseudoClass);
  const hoverRules = matchingRules.filter(r => r.pseudoClass === 'hover');
  const focusRules = matchingRules.filter(r => r.pseudoClass === 'focus');
  const activeRules = matchingRules.filter(r => r.pseudoClass === 'active');
  
  if (defaultRules.length === 0) return undefined;
  
  const states: StateStylesV3 = {
    default: applyCascade(defaultRules),
  };
  
  if (hoverRules.length > 0) states.hover = applyCascade(hoverRules);
  if (focusRules.length > 0) states.focus = applyCascade(focusRules);
  if (activeRules.length > 0) states.active = applyCascade(activeRules);
  
  return states;
}

/**
 * Compute pseudo-elements for an element
 */
function computePseudoElements(
  element: Element,
  cssom: CSSOMV3,
  mediaQueryParser: MediaQueryParser
): PseudoElementsV3 | undefined {
  const matchingRules = getMatchingRules(element, cssom);
  
  const beforeRules = matchingRules.filter(r => r.pseudoElement === 'before');
  const afterRules = matchingRules.filter(r => r.pseudoElement === 'after');
  
  const pseudoElements: PseudoElementsV3 = {};
  
  if (beforeRules.length > 0) {
    const styles = applyCascade(beforeRules);
    pseudoElements.before = {
      content: (styles.content as string) || '""',
      styles: { desktop: styles },
    };
  }
  
  if (afterRules.length > 0) {
    const styles = applyCascade(afterRules);
    pseudoElements.after = {
      content: (styles.content as string) || '""',
      styles: { desktop: styles },
    };
  }
  
  return Object.keys(pseudoElements).length > 0 ? pseudoElements : undefined;
}

/**
 * Get matching CSS rules for an element
 */
function getMatchingRules(element: Element, cssom: CSSOMV3): CSSRuleV3[] {
  const tag = element.name.toLowerCase();
  const classes = element.attribs?.class?.split(/\s+/) || [];
  const id = element.attribs?.id;
  
  return cssom.rules.filter(rule => {
    const selector = rule.selector;
    
    // Tag selector
    if (selector === tag) return true;
    
    // Class selector
    if (selector.startsWith('.') && classes.includes(selector.substring(1))) return true;
    
    // ID selector
    if (selector.startsWith('#') && id === selector.substring(1)) return true;
    
    return false;
  });
}

/**
 * Apply CSS cascade rules
 */
function applyCascade(rules: CSSRuleV3[]): CSSPropertiesV3 {
  // Sort by specificity, then by declaration order
  const sorted = rules.sort((a, b) => {
    if (a.specificity !== b.specificity) {
      return a.specificity - b.specificity;
    }
    return a.declarationOrder - b.declarationOrder;
  });
  
  // Merge styles
  const merged: CSSPropertiesV3 = {};
  sorted.forEach(rule => {
    Object.assign(merged, rule.styles);
  });
  
  return merged;
}

/**
 * Get semantic tag
 */
function getSemanticTag(tag: string): SemanticTagV3 | undefined {
  const semanticTags: SemanticTagV3[] = ['div', 'section', 'article', 'aside', 'header', 'footer', 'nav', 'main', 'figure'];
  return semanticTags.includes(tag as SemanticTagV3) ? (tag as SemanticTagV3) : undefined;
}

/**
 * Find elements by tag name
 */
function findElementsByTag(nodes: ChildNode[], tagName: string): Element[] {
  const elements: Element[] = [];
  
  for (const node of nodes) {
    if (node.type === 'tag') {
      const element = node as Element;
      if (element.name.toLowerCase() === tagName) {
        elements.push(element);
      }
      elements.push(...findElementsByTag(element.children, tagName));
    }
  }
  
  return elements;
}

/**
 * Create default V3 section
 */
function createDefaultSectionV3(): BlockSectionV3 {
  return {
    id: generateId(),
    type: 'content',
    name: 'Seção Padrão',
    rows: [{
      id: generateId(),
      columns: [{
        id: generateId(),
        width: 'full',
        elements: [{
          id: generateId(),
          type: 'heading',
          props: { level: 'h2', text: 'Título da Seção' },
          styles: {
            desktop: {
              textAlign: 'center',
              fontSize: '2rem',
              fontWeight: 'bold',
            },
          },
        }],
        styles: {},
      }],
      styles: {},
    }],
    styles: {},
  };
}
