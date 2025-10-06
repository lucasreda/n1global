import type { PageModelV2, BlockSection, BlockRow, BlockColumn, BlockElement } from "@shared/schema";
import type { PageModelV3, BlockSectionV3, BlockRowV3, BlockColumnV3, BlockElementV3, ResponsiveStylesV3, StateStylesV3, DesignTokensV3, AnimationV3, CSSPropertiesV3, LayoutTypeV3, SemanticTagV3, PseudoElementsV3 } from "@shared/schema";
import type { PageModelV4, PageNodeV4, NodeType, ResponsiveStylesV4, StateStylesV4 } from "@shared/schema";
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

// Enhanced CSS Rule structure with specificity and media query support
interface CSSRuleEnhanced {
  selector: string;
  styles: Record<string, string>;
  specificity: number;
  mediaQuery?: string; // e.g., "(max-width: 768px)"
  pseudoClass?: string; // e.g., "hover", "focus"
  pseudoElement?: string; // e.g., "before", "after"
}

/**
 * Extract and parse all CSS from HTML using css-tree with enhanced support
 */
function extractAllCSS(html: string): { rules: Record<string, Record<string, string>>, cssText: string, enhancedRules: CSSRuleEnhanced[] } {
  const cssRules: Record<string, Record<string, string>> = {};
  const enhancedRules: CSSRuleEnhanced[] = [];
  let allCssText = '';
  let ruleOrder = 0;
  
  // Extract all style tags
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  
  while ((match = styleRegex.exec(html)) !== null) {
    const cssText = match[1];
    allCssText += cssText + '\n';
    
    try {
      // Parse CSS using css-tree (removes comments automatically)
      const ast = csstree.parse(cssText);
      
      // Walk through the AST and extract rules including media queries
      csstree.walk(ast, {
        visit: 'Atrule',
        enter(node: any) {
          // Handle @media queries
          if (node.name === 'media') {
            const mediaQuery = csstree.generate(node.prelude);
            
            // Process rules inside media query
            if (node.block) {
              csstree.walk(node.block, {
                visit: 'Rule',
                enter(ruleNode: any) {
                  const selectorText = csstree.generate(ruleNode.prelude);
                  const styles = extractStylesFromRule(ruleNode);
                  
                  selectorText.split(',').forEach(sel => {
                    const cleanSelector = sel.trim();
                    const { baseSelector, pseudoClass, pseudoElement } = parsePseudoSelectors(cleanSelector);
                    
                    // Only add to enhanced rules if NOT a pseudo-class (they go to states)
                    if (!pseudoClass) {
                      enhancedRules.push({
                        selector: baseSelector,
                        styles,
                        specificity: calculateSpecificity(baseSelector) + (ruleOrder++ * 0.0001),
                        mediaQuery,
                        pseudoClass,
                        pseudoElement,
                      });
                    }
                  });
                }
              });
            }
          }
        }
      });
      
      // Walk through regular rules (non-media)
      csstree.walk(ast, {
        visit: 'Rule',
        enter(node: any) {
          // Skip if inside media query (already handled above)
          if (node.parentNode && node.parentNode.type === 'Block' && 
              node.parentNode.parentNode && node.parentNode.parentNode.type === 'Atrule') {
            return;
          }
          
          // Get selector text
          const selectorText = csstree.generate(node.prelude);
          const styles = extractStylesFromRule(node);
          
          // Store by selector (handle multiple selectors separated by comma)
          selectorText.split(',').forEach(sel => {
            const cleanSelector = sel.trim();
            const { baseSelector, pseudoClass, pseudoElement } = parsePseudoSelectors(cleanSelector);
            
            // CRITICAL: Skip pseudo-classes entirely - they should go to node.states, not base styles
            if (!pseudoClass) {
              if (!cssRules[cleanSelector]) {
                cssRules[cleanSelector] = {};
              }
              Object.assign(cssRules[cleanSelector], styles);
              
              enhancedRules.push({
                selector: baseSelector,
                styles,
                specificity: calculateSpecificity(baseSelector) + (ruleOrder++ * 0.0001),
                pseudoClass,
                pseudoElement,
              });
            }
          });
        }
      });
    } catch (error) {
      console.error('❌ CSS parsing error:', error);
    }
  }
  
  console.log('🎨 CSS Rules extracted:', {
    totalSelectors: Object.keys(cssRules).length,
    enhancedRulesCount: enhancedRules.length,
    selectors: Object.keys(cssRules).slice(0, 10),
    sampleRule: Object.keys(cssRules)[0] ? {
      selector: Object.keys(cssRules)[0],
      styles: cssRules[Object.keys(cssRules)[0]]
    } : null
  });
  
  return { rules: cssRules, cssText: allCssText, enhancedRules };
}

/**
 * Extract styles from CSS rule node
 */
function extractStylesFromRule(ruleNode: any): Record<string, string> {
  const styles: Record<string, string> = {};
  
  if (ruleNode.block && ruleNode.block.children) {
    ruleNode.block.children.forEach((child: any) => {
      if (child.type === 'Declaration') {
        const property = child.property;
        const value = csstree.generate(child.value);
        
        // Convert kebab-case to camelCase for React inline styles
        const camelProperty = property.replace(/-([a-z])/g, (_: string, g: string) => g.toUpperCase());
        styles[camelProperty] = value;
      }
    });
  }
  
  return styles;
}

/**
 * Parse pseudo-selectors from selector string
 */
function parsePseudoSelectors(selector: string): {
  baseSelector: string;
  pseudoClass?: string;
  pseudoElement?: string;
} {
  // Match pseudo-elements (::before, ::after)
  const pseudoElementMatch = selector.match(/::(before|after|first-line|first-letter)/);
  const pseudoElement = pseudoElementMatch ? pseudoElementMatch[1] : undefined;
  
  // Match pseudo-classes (:hover, :focus, :nth-child, etc.)
  const pseudoClassMatch = selector.match(/:([a-z-]+(\([^)]*\))?)/);
  const pseudoClass = pseudoClassMatch && !pseudoElementMatch ? pseudoClassMatch[1] : undefined;
  
  // Remove pseudo-selectors to get base selector
  const baseSelector = selector
    .replace(/::(before|after|first-line|first-letter)/, '')
    .replace(/:[a-z-]+(\([^)]*\))?/, '')
    .trim();
  
  return { baseSelector, pseudoClass, pseudoElement };
}

/**
 * Calculate CSS specificity (simplified version)
 * Returns number: IDs=100, Classes/Attrs/Pseudo=10, Elements=1
 */
function calculateSpecificity(selector: string): number {
  let specificity = 0;
  
  // Count IDs
  const idCount = (selector.match(/#/g) || []).length;
  specificity += idCount * 100;
  
  // Count classes, attributes, pseudo-classes
  const classCount = (selector.match(/\./g) || []).length;
  const attrCount = (selector.match(/\[/g) || []).length;
  const pseudoCount = (selector.match(/:/g) || []).length;
  specificity += (classCount + attrCount + pseudoCount) * 10;
  
  // Count elements
  const elementCount = selector.split(/[\s>+~]/).filter(s => s && !s.match(/[.#:\[]/)). length;
  specificity += elementCount;
  
  return specificity;
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
  
  // 1. Apply universal selector (*) as base
  if (cssRules['*']) {
    Object.assign(computedStyles, cssRules['*']);
  }
  
  // 2. Apply body styles as global defaults (for text color, font, etc)
  if (cssRules['body']) {
    Object.assign(computedStyles, cssRules['body']);
  }
  
  // 3. Apply tag styles
  if (cssRules[tag]) {
    Object.assign(computedStyles, cssRules[tag]);
  }
  
  // 4. Apply class styles (in order)
  classNames.forEach(className => {
    if (cssRules[`.${className}`]) {
      Object.assign(computedStyles, cssRules[`.${className}`]);
    }
  });
  
  // 5. Apply ID styles
  if (id && cssRules[`#${id}`]) {
    Object.assign(computedStyles, cssRules[`#${id}`]);
  }
  
  // 6. Apply inline styles (highest priority)
  Object.assign(computedStyles, inlineStyles);
  
  // 7. CRITICAL: Default text color if not defined (prevents invisible text)
  if (!computedStyles.color) {
    computedStyles.color = '#000000'; // Black by default
  }
  
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
    
    // For container tags (div, span, etc.)
    case 'div':
      // Check if div has important visual/background styling that should be preserved
      const hasVisualStyles = computedStyles.backgroundColor ||
                             computedStyles.backgroundImage ||
                             computedStyles.background ||
                             computedStyles.border ||
                             computedStyles.borderRadius ||
                             computedStyles.boxShadow;
      
      // If div has visual styling AND text content, preserve it as spacer
      if (hasVisualStyles && textContent.trim().length > 0) {
        return {
          id,
          type: 'spacer',
          props: {},
          styles: computedStyles,
          content: { text: textContent },
        };
      }
      
      // For layout containers (grid/flex), we need to preserve them differently
      // Instead of discarding, we'll process children but log the layout styles
      const hasLayoutStyles = computedStyles.display === 'grid' || 
                             computedStyles.display === 'flex' ||
                             computedStyles.gridTemplateColumns ||
                             computedStyles.flexDirection ||
                             computedStyles.gap;
      
      if (hasLayoutStyles) {
        console.log(`📐 Layout container detected: display=${computedStyles.display}, grid-template-columns=${computedStyles.gridTemplateColumns}, gap=${computedStyles.gap}`);
        // Note: Layout will need to be applied at Row/Column level
      }
      
      // Process children (layout styling will need manual adjustment in editor)
      return null;
    
    // For other tags, return null so children are processed
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
    
    // Descendant selector (e.g., ".hero h1", ".container p")
    if (selector.includes(' ') && !selector.includes(':')) {
      const parts = selector.split(' ').map(s => s.trim()).filter(s => s);
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1];
        
        // Check if last part matches current element
        const matchesLast = 
          lastPart === tag ||
          (lastPart.startsWith('.') && classes.includes(lastPart.substring(1))) ||
          (lastPart.startsWith('#') && id === lastPart.substring(1));
        
        if (matchesLast) {
          // Check if any ancestor matches the first part(s)
          const ancestorSelector = parts.slice(0, -1).join(' ');
          if (hasMatchingAncestor(element, ancestorSelector)) {
            return true;
          }
        }
      }
    }
    
    return false;
  });
}

/**
 * Check if element has an ancestor that matches the selector
 */
function hasMatchingAncestor(element: Element, selector: string): boolean {
  let current = element.parent;
  
  while (current && current.type === 'tag') {
    const parentElement = current as Element;
    const parentTag = parentElement.name?.toLowerCase();
    const parentClasses = parentElement.attribs?.class?.split(/\s+/) || [];
    const parentId = parentElement.attribs?.id;
    
    // Simple selector match
    const selectorParts = selector.split(' ').filter(s => s);
    const lastSelector = selectorParts[selectorParts.length - 1];
    
    const matches =
      lastSelector === parentTag ||
      (lastSelector.startsWith('.') && parentClasses.includes(lastSelector.substring(1))) ||
      (lastSelector.startsWith('#') && parentId === lastSelector.substring(1));
    
    if (matches) {
      // If this is the only part, we found a match
      if (selectorParts.length === 1) {
        return true;
      }
      // If there are more parts, recursively check ancestors
      const remainingSelector = selectorParts.slice(0, -1).join(' ');
      if (hasMatchingAncestor(parentElement, remainingSelector)) {
        return true;
      }
    }
    
    current = current.parent;
  }
  
  return false;
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

// ============================================================================
// PageModelV4 Converter - Universal HTML to Node Tree
// ============================================================================

/**
 * Converts HTML to PageModelV4 with perfect fidelity
 * Preserves all nested structures, styles, and attributes
 */
export function convertHtmlToPageModelV4(html: string): PageModelV4 {
  console.log('🔍 HTML-to-PageModelV4 Converter - Starting...');
  console.log('📄 HTML length:', html.length, 'characters');
  
  // Extract meta information
  const title = extractMetaTag(html, 'title') || extractTag(html, 'title') || 'Nova Página';
  const description = extractMetaTag(html, 'description') || 'Descrição da página';
  const keywords = extractMetaTag(html, 'keywords')?.split(',').map(k => k.trim()) || [];
  const ogImage = extractMetaTag(html, 'og:image');
  const ogTitle = extractMetaTag(html, 'og:title');
  const ogDescription = extractMetaTag(html, 'og:description');
  
  console.log('📋 Meta extracted:', { title, description, keywordsCount: keywords.length });
  
  // Extract and parse all CSS with enhanced rules
  const { rules: cssRules, cssText, enhancedRules } = extractAllCSS(html);
  
  console.log('🎨 CSS extracted:', {
    rulesCount: Object.keys(cssRules).length,
    enhancedRulesCount: enhancedRules.length,
    cssTextLength: cssText.length
  });
  
  // Extract design tokens from CSS (skip for now in V4)
  const designTokens = undefined; // TODO: Implement extractDesignTokensV3 or create V4 version
  
  // Parse HTML document
  const doc = parseDocument(html);
  
  // Find body element
  const bodyElements = findElementsByTag(doc.children, 'body');
  const bodyElement = bodyElements[0];
  
  if (!bodyElement) {
    console.warn('⚠️ No body element found, using entire document');
  }
  
  const rootNodes = bodyElement ? bodyElement.children : doc.children;
  
  // Convert DOM tree to PageNodeV4 tree with enhanced rules
  const nodes = convertDomNodesToPageNodesV4(rootNodes, cssRules, enhancedRules);
  
  console.log('✅ Converted to', nodes.length, 'root nodes');
  
  // Create PageModelV4
  const pageModel: PageModelV4 = {
    version: '4.0',
    meta: {
      title,
      description,
      keywords,
      ogImage: ogImage || undefined,
      ogTitle: ogTitle || undefined,
      ogDescription: ogDescription || undefined,
    },
    designTokens,
    globalStyles: cssText || undefined,
    cssClasses: convertCssRulesToClasses(cssRules),
    nodes: nodes.length > 0 ? nodes : [],
    editorState: {
      activeBreakpoint: 'desktop',
      zoom: 1,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  return pageModel;
}

/**
 * Convert DOM nodes to PageNodeV4 recursively
 */
function convertDomNodesToPageNodesV4(
  domNodes: ChildNode[],
  cssRules: Record<string, Record<string, string>>,
  enhancedRules?: CSSRuleEnhanced[]
): PageNodeV4[] {
  const nodes: PageNodeV4[] = [];
  
  for (const domNode of domNodes) {
    // Skip script, style, and comment nodes
    if (domNode.type === 'script' || domNode.type === 'style' || domNode.type === 'comment') {
      continue;
    }
    
    // Handle text nodes
    if (domNode.type === 'text') {
      const textNode = domNode as Text;
      const text = textNode.data.trim();
      if (text) {
        nodes.push({
          id: generateId(),
          type: 'text',
          tag: 'text',
          textContent: text,
        });
      }
      continue;
    }
    
    // Handle element nodes
    if (domNode.type === 'tag') {
      const element = domNode as Element;
      const node = convertElementToPageNodeV4(element, cssRules, enhancedRules);
      if (node) {
        nodes.push(node);
      }
    }
  }
  
  return nodes;
}

/**
 * Convert a single DOM element to PageNodeV4
 */
function convertElementToPageNodeV4(
  element: Element,
  cssRules: Record<string, Record<string, string>>,
  enhancedRules?: CSSRuleEnhanced[]
): PageNodeV4 | null {
  const tag = element.name.toLowerCase();
  
  // Skip script and style elements
  if (tag === 'script' || tag === 'style') {
    return null;
  }
  
  // Determine node type
  const nodeType = getNodeType(tag);
  
  // Extract attributes
  const attributes: Record<string, string> = {};
  if (element.attribs) {
    Object.entries(element.attribs).forEach(([key, value]) => {
      if (key !== 'class' && key !== 'style') {
        attributes[key] = value;
      }
    });
  }
  
  // Extract classes
  const classNames = element.attribs?.class?.split(' ').filter(c => c) || [];
  
  // Extract inline styles
  const inlineStyles = parseInlineStyles(element.attribs?.style || '');
  
  // Compute styles from CSS rules with enhanced rules support
  const computedStyles = computeElementStylesV4(element, cssRules, enhancedRules);
  
  // Extract layout properties
  const layout = extractLayoutProperties(computedStyles.desktop || {}, inlineStyles);
  
  // CRITICAL: Void elements (self-closing tags) CANNOT have children in React
  const isVoidElement = ['img', 'input', 'br', 'hr', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'].includes(tag);
  
  // Convert children recursively (but NOT for void elements)
  const children = !isVoidElement && element.children.length > 0
    ? convertDomNodesToPageNodesV4(element.children, cssRules, enhancedRules)
    : undefined;
  
  // Extract text content (for leaf elements without children, and NOT for void elements)
  const textContent = !isVoidElement && (!children || children.length === 0)
    ? getElementText(element)
    : undefined;
  
  const node: PageNodeV4 = {
    id: generateId(),
    type: nodeType,
    tag,
    attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    classNames: classNames.length > 0 ? classNames : undefined,
    inlineStyles: Object.keys(inlineStyles).length > 0 ? inlineStyles : undefined,
    textContent,
    styles: computedStyles,
    layout,
    children,
    metadata: {
      convertedFrom: 'html-v4-converter',
    },
  };
  
  return node;
}

/**
 * Determine NodeType from HTML tag
 */
function getNodeType(tag: string): NodeType {
  const typeMap: Record<string, NodeType> = {
    'div': 'container',
    'section': 'container',
    'article': 'container',
    'aside': 'container',
    'header': 'container',
    'footer': 'container',
    'nav': 'container',
    'main': 'container',
    'span': 'container',
    'h1': 'heading',
    'h2': 'heading',
    'h3': 'heading',
    'h4': 'heading',
    'h5': 'heading',
    'h6': 'heading',
    'p': 'paragraph',
    'a': 'link',
    'button': 'button',
    'img': 'image',
    'video': 'video',
    'input': 'input',
    'textarea': 'input',
    'select': 'input',
    'form': 'form',
    'ul': 'list',
    'ol': 'list',
    'li': 'listItem',
    'table': 'table',
    'thead': 'table',
    'tbody': 'table',
    'tr': 'table',
    'td': 'table',
    'th': 'table',
    'svg': 'svg',
  };
  
  return typeMap[tag] || 'custom';
}

/**
 * Parse inline styles
 */
function parseInlineStyles(styleAttr: string): Record<string, string> {
  const styles: Record<string, string> = {};
  if (!styleAttr) return styles;
  
  const declarations = styleAttr.split(';').filter(d => d.trim());
  for (const decl of declarations) {
    const [property, value] = decl.split(':').map(s => s.trim());
    if (property && value) {
      // Convert to camelCase
      const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      styles[camelProperty] = value;
    }
  }
  
  return styles;
}

/**
 * Compute styles for an element from CSS rules with media query support
 */
function computeElementStylesV4(
  element: Element,
  cssRules: Record<string, Record<string, string>>,
  enhancedRules?: CSSRuleEnhanced[]
): ResponsiveStylesV4 {
  const styles: ResponsiveStylesV4 = {};
  
  // Get element identifiers
  const tag = element.name.toLowerCase();
  const classes = element.attribs?.class?.split(' ').filter(c => c) || [];
  const id = element.attribs?.id;
  
  if (enhancedRules) {
    // Use enhanced rules with media query and specificity support
    const desktopStyles: Record<string, string> = {};
    const tabletStyles: Record<string, string> = {};
    const mobileStyles: Record<string, string> = {};
    
    // STEP 1: Apply global styles first (*, body) to all elements
    const sortedRules = [...enhancedRules].sort((a, b) => a.specificity - b.specificity);
    
    for (const rule of sortedRules) {
      // Global selectors (* and body) apply to ALL elements
      const isGlobalSelector = rule.selector === '*' || rule.selector === 'body';
      const matchesElement = matchesSelector(element, rule.selector, tag, classes, id);
      
      if (isGlobalSelector || matchesElement) {
        // CRITICAL: For global selectors, exclude inheritable properties (color, font-*)
        // These should be inherited naturally through DOM, not forced on every element
        let stylesToApply = rule.styles;
        if (isGlobalSelector) {
          stylesToApply = { ...rule.styles };
          // Remove properties that should be inherited, not forced
          delete stylesToApply.color; // Let color inherit from parent naturally
        }
        
        // Determine breakpoint from media query
        if (!rule.mediaQuery) {
          // No media query = applies to all
          Object.assign(desktopStyles, stylesToApply);
        } else if (rule.mediaQuery.includes('768px') && rule.mediaQuery.includes('max-width')) {
          // Tablet/Mobile breakpoint
          Object.assign(mobileStyles, stylesToApply);
        } else if (rule.mediaQuery.includes('1024px') && rule.mediaQuery.includes('max-width')) {
          // Tablet breakpoint
          Object.assign(tabletStyles, stylesToApply);
        } else if (rule.mediaQuery.includes('min-width')) {
          // Desktop and up
          Object.assign(desktopStyles, stylesToApply);
        }
      }
    }
    
    // Add inline styles (highest priority)
    if (element.attribs?.style) {
      const inlineStyles = parseInlineStyles(element.attribs.style);
      Object.assign(desktopStyles, inlineStyles);
    }
    
    // CRITICAL: Apply browser-like defaults for common elements
    // NOTE: We DON'T force color: #000000 here because that would prevent CSS inheritance!
    // Elements without explicit color should inherit from their parents naturally
    
    // Apply default heading styles (browser defaults)
    if (tag === 'h1' && !desktopStyles.fontSize) {
      desktopStyles.fontSize = '2em';
      desktopStyles.fontWeight = 'bold';
      if (!desktopStyles.marginTop) desktopStyles.marginTop = '0.67em';
      if (!desktopStyles.marginBottom) desktopStyles.marginBottom = '0.67em';
    } else if (tag === 'h2' && !desktopStyles.fontSize) {
      desktopStyles.fontSize = '1.5em';
      desktopStyles.fontWeight = 'bold';
      if (!desktopStyles.marginTop) desktopStyles.marginTop = '0.83em';
      if (!desktopStyles.marginBottom) desktopStyles.marginBottom = '0.83em';
    } else if (tag === 'h3' && !desktopStyles.fontSize) {
      desktopStyles.fontSize = '1.17em';
      desktopStyles.fontWeight = 'bold';
      if (!desktopStyles.marginTop) desktopStyles.marginTop = '1em';
      if (!desktopStyles.marginBottom) desktopStyles.marginBottom = '1em';
    } else if (tag === 'h4' && !desktopStyles.fontSize) {
      desktopStyles.fontSize = '1em';
      desktopStyles.fontWeight = 'bold';
      if (!desktopStyles.marginTop) desktopStyles.marginTop = '1.33em';
      if (!desktopStyles.marginBottom) desktopStyles.marginBottom = '1.33em';
    } else if (tag === 'h5' && !desktopStyles.fontSize) {
      desktopStyles.fontSize = '0.83em';
      desktopStyles.fontWeight = 'bold';
      if (!desktopStyles.marginTop) desktopStyles.marginTop = '1.67em';
      if (!desktopStyles.marginBottom) desktopStyles.marginBottom = '1.67em';
    } else if (tag === 'h6' && !desktopStyles.fontSize) {
      desktopStyles.fontSize = '0.67em';
      desktopStyles.fontWeight = 'bold';
      if (!desktopStyles.marginTop) desktopStyles.marginTop = '2.33em';
      if (!desktopStyles.marginBottom) desktopStyles.marginBottom = '2.33em';
    }
    
    // Apply default paragraph margins
    if (tag === 'p') {
      if (!desktopStyles.marginTop) desktopStyles.marginTop = '1em';
      if (!desktopStyles.marginBottom) desktopStyles.marginBottom = '1em';
    }
    
    // Apply default bold for <strong> and <b>
    if ((tag === 'strong' || tag === 'b') && !desktopStyles.fontWeight) {
      desktopStyles.fontWeight = 'bold';
    }
    
    // Apply default italic for <em> and <i> (but NOT for Font Awesome icons)
    // Font Awesome uses <i> with classes like "fas fa-icon-name"
    const isFontAwesomeIcon = tag === 'i' && classes.some(c => 
      c === 'fa' || c.startsWith('fa-') || c === 'fas' || c === 'far' || c === 'fab' || c === 'fal' || c === 'fad' || c === 'fat'
    );
    
    if ((tag === 'em' || (tag === 'i' && !isFontAwesomeIcon)) && !desktopStyles.fontStyle) {
      desktopStyles.fontStyle = 'italic';
    }
    
    if (Object.keys(desktopStyles).length > 0) styles.desktop = desktopStyles;
    if (Object.keys(tabletStyles).length > 0) styles.tablet = tabletStyles;
    if (Object.keys(mobileStyles).length > 0) styles.mobile = mobileStyles;
  } else {
    // Fallback to simple matching
    const matchedStyles: Record<string, string> = {};
    
    // Match CSS rules
    for (const [selector, ruleStyles] of Object.entries(cssRules)) {
      if (matchesSelector(element, selector, tag, classes, id)) {
        Object.assign(matchedStyles, ruleStyles);
      }
    }
    
    // Add inline styles
    if (element.attribs?.style) {
      const inlineStyles = parseInlineStyles(element.attribs.style);
      Object.assign(matchedStyles, inlineStyles);
    }
    
    if (Object.keys(matchedStyles).length > 0) {
      styles.desktop = matchedStyles;
    }
  }
  
  return styles;
}

/**
 * Check if element matches CSS selector with full combinator support
 */
function matchesSelector(
  element: Element,
  selector: string,
  tag: string,
  classes: string[],
  id?: string
): boolean {
  // Remove pseudo-classes and pseudo-elements for base matching
  const cleanSelector = selector.replace(/:(hover|focus|active|visited|before|after|first-child|last-child|nth-child\([^)]+\))/g, '').trim();
  
  // Handle combinator selectors (descendant, child, adjacent, sibling)
  if (cleanSelector.includes(' ') || cleanSelector.includes('>') || cleanSelector.includes('+') || cleanSelector.includes('~')) {
    return matchesCombinatorSelector(element, cleanSelector, tag, classes, id);
  }
  
  // Simple selectors
  return matchesSimpleSelector(cleanSelector, tag, classes, id);
}

/**
 * Match simple selector (no combinators)
 */
function matchesSimpleSelector(
  selector: string,
  tag: string,
  classes: string[],
  id?: string
): boolean {
  // Universal selector
  if (selector === '*') return true;
  
  // Tag selector
  if (selector === tag) return true;
  
  // Class selector
  if (selector.startsWith('.')) {
    const className = selector.substring(1);
    return classes.includes(className);
  }
  
  // ID selector
  if (selector.startsWith('#')) {
    const idName = selector.substring(1);
    return id === idName;
  }
  
  // Attribute selector
  if (selector.includes('[') && selector.includes(']')) {
    // Simplified attribute matching
    return false; // TODO: Implement full attribute matching
  }
  
  // Compound selector (e.g., "div.className", "div#id", "div.class1.class2")
  if (selector.includes('.') || selector.includes('#')) {
    // Parse compound selector
    let currentSelector = selector;
    let tagMatch = true;
    
    // Check tag
    const tagPart = currentSelector.match(/^[a-z0-9-]+/i);
    if (tagPart && tagPart[0] !== tag) {
      tagMatch = false;
    }
    currentSelector = currentSelector.replace(/^[a-z0-9-]+/i, '');
    
    // Check classes
    const classMatches = currentSelector.match(/\.[a-z0-9-_]+/gi);
    if (classMatches) {
      for (const classMatch of classMatches) {
        const className = classMatch.substring(1);
        if (!classes.includes(className)) {
          return false;
        }
      }
    }
    
    // Check ID
    const idMatch = currentSelector.match(/#[a-z0-9-_]+/i);
    if (idMatch) {
      const idName = idMatch[0].substring(1);
      if (id !== idName) {
        return false;
      }
    }
    
    return tagMatch;
  }
  
  return false;
}

/**
 * Match combinator selector (descendant, child, adjacent, sibling)
 */
function matchesCombinatorSelector(
  element: Element,
  selector: string,
  tag: string,
  classes: string[],
  id?: string
): boolean {
  // Parse combinator
  let parts: string[] = [];
  let combinator: string = ' '; // default to descendant
  
  if (selector.includes('>')) {
    parts = selector.split('>').map(s => s.trim());
    combinator = '>';
  } else if (selector.includes('+')) {
    parts = selector.split('+').map(s => s.trim());
    combinator = '+';
  } else if (selector.includes('~')) {
    parts = selector.split('~').map(s => s.trim());
    combinator = '~';
  } else {
    // Descendant combinator (space)
    parts = selector.split(/\s+/).filter(s => s);
    combinator = ' ';
  }
  
  if (parts.length < 2) return false;
  
  // The last part should match current element
  const lastPart = parts[parts.length - 1];
  if (!matchesSimpleSelector(lastPart, tag, classes, id)) {
    return false;
  }
  
  // Check combinator relationship
  const parentPart = parts[parts.length - 2];
  
  if (combinator === '>') {
    // Child combinator - direct parent must match
    if (!element.parent || element.parent.type !== 'tag') return false;
    const parent = element.parent as Element;
    const parentTag = parent.name.toLowerCase();
    const parentClasses = parent.attribs?.class?.split(' ').filter(c => c) || [];
    const parentId = parent.attribs?.id;
    return matchesSimpleSelector(parentPart, parentTag, parentClasses, parentId);
  }
  
  if (combinator === ' ') {
    // Descendant combinator - any ancestor must match
    let current = element.parent;
    while (current) {
      if (current.type === 'tag') {
        const currentEl = current as Element;
        const currentTag = currentEl.name.toLowerCase();
        const currentClasses = currentEl.attribs?.class?.split(' ').filter(c => c) || [];
        const currentId = currentEl.attribs?.id;
        if (matchesSimpleSelector(parentPart, currentTag, currentClasses, currentId)) {
          // If we have more parts, check recursively
          if (parts.length > 2) {
            const remainingSelector = parts.slice(0, -1).join(' ');
            return matchesCombinatorSelector(currentEl, remainingSelector, currentTag, currentClasses, currentId);
          }
          return true;
        }
      }
      current = current.parent;
    }
    return false;
  }
  
  // Adjacent and sibling combinators would require sibling traversal
  // Simplified implementation - return false for now
  return false;
}

/**
 * Extract layout properties from styles - COMPLETE flex/grid support
 */
function extractLayoutProperties(
  styles: Record<string, any>,
  inlineStyles: Record<string, string>
): PageNodeV4['layout'] | undefined {
  const allStyles = { ...styles, ...inlineStyles };
  
  const layout: PageNodeV4['layout'] = {};
  
  // Display & Position
  if (allStyles.display) layout.display = allStyles.display;
  if (allStyles.position) layout.position = allStyles.position;
  
  // Flexbox properties
  if (allStyles.flexDirection) layout.flexDirection = allStyles.flexDirection;
  if (allStyles.flexWrap) layout.flexWrap = allStyles.flexWrap;
  if (allStyles.justifyContent) layout.justifyContent = allStyles.justifyContent;
  if (allStyles.alignItems) layout.alignItems = allStyles.alignItems;
  if (allStyles.alignContent) layout.alignContent = allStyles.alignContent;
  if (allStyles.flex) layout.flex = allStyles.flex;
  if (allStyles.flexGrow) layout.flexGrow = allStyles.flexGrow;
  if (allStyles.flexShrink) layout.flexShrink = allStyles.flexShrink;
  if (allStyles.flexBasis) layout.flexBasis = allStyles.flexBasis;
  if (allStyles.order) layout.order = allStyles.order;
  if (allStyles.alignSelf) layout.alignSelf = allStyles.alignSelf;
  
  // Grid properties
  if (allStyles.gridTemplateColumns) layout.gridTemplateColumns = allStyles.gridTemplateColumns;
  if (allStyles.gridTemplateRows) layout.gridTemplateRows = allStyles.gridTemplateRows;
  if (allStyles.gridTemplateAreas) layout.gridTemplateAreas = allStyles.gridTemplateAreas;
  if (allStyles.gridColumn) layout.gridColumn = allStyles.gridColumn;
  if (allStyles.gridColumnStart) layout.gridColumnStart = allStyles.gridColumnStart;
  if (allStyles.gridColumnEnd) layout.gridColumnEnd = allStyles.gridColumnEnd;
  if (allStyles.gridRow) layout.gridRow = allStyles.gridRow;
  if (allStyles.gridRowStart) layout.gridRowStart = allStyles.gridRowStart;
  if (allStyles.gridRowEnd) layout.gridRowEnd = allStyles.gridRowEnd;
  if (allStyles.gridArea) layout.gridArea = allStyles.gridArea;
  if (allStyles.gridAutoFlow) layout.gridAutoFlow = allStyles.gridAutoFlow;
  if (allStyles.gridAutoColumns) layout.gridAutoColumns = allStyles.gridAutoColumns;
  if (allStyles.gridAutoRows) layout.gridAutoRows = allStyles.gridAutoRows;
  if (allStyles.justifyItems) layout.justifyItems = allStyles.justifyItems;
  if (allStyles.placeItems) layout.placeItems = allStyles.placeItems;
  if (allStyles.placeContent) layout.placeContent = allStyles.placeContent;
  if (allStyles.placeSelf) layout.placeSelf = allStyles.placeSelf;
  
  // Spacing
  if (allStyles.gap) layout.gap = allStyles.gap;
  if (allStyles.rowGap) layout.rowGap = allStyles.rowGap;
  if (allStyles.columnGap) layout.columnGap = allStyles.columnGap;
  
  return Object.keys(layout).length > 0 ? layout : undefined;
}

/**
 * Get text content from element
 */
function getElementText(element: Element): string | undefined {
  let text = '';
  
  for (const child of element.children) {
    if (child.type === 'text') {
      text += (child as Text).data;
    }
  }
  
  return text.trim() || undefined;
}

/**
 * Convert CSS rules to class definitions
 */
function convertCssRulesToClasses(
  cssRules: Record<string, Record<string, string>>
): Record<string, { styles: Record<string, any>; responsive?: ResponsiveStylesV4; states?: StateStylesV4 }> {
  const classes: Record<string, any> = {};
  
  for (const [selector, styles] of Object.entries(cssRules)) {
    // Only process class selectors
    if (selector.startsWith('.')) {
      const className = selector.substring(1).split(':')[0]; // Remove pseudo-classes
      
      if (!classes[className]) {
        classes[className] = {
          styles: {},
        };
      }
      
      // Merge styles
      Object.assign(classes[className].styles, styles);
    }
  }
  
  return classes;
}
