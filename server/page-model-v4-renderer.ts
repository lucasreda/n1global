import type { PageModelV4, PageNodeV4 } from "@shared/schema";

/**
 * Generates HTML from a PageModelV4 structure
 * This renderer preserves the exact structure and styles from the visual editor
 */
export function renderPageModelV4ToHTML(model: PageModelV4): string {
  const { globalStyles = '', nodes = [] } = model;
  
  // Render all nodes recursively
  const bodyContent = nodes.map(node => renderNodeV4(node)).join('\n');
  
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Landing Page</title>
  <style>
    ${globalStyles}
    
    /* Reset styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    /* Responsive styles */
    @media (max-width: 768px) {
      .mobile-hidden { display: none !important; }
    }
    
    @media (min-width: 769px) and (max-width: 1024px) {
      .tablet-hidden { display: none !important; }
    }
    
    @media (min-width: 1025px) {
      .desktop-hidden { display: none !important; }
    }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
  
  return html;
}

/**
 * Recursively renders a PageNodeV4 and its children
 */
function renderNodeV4(node: PageNodeV4): string {
  const { tag, attributes = {}, classNames = [], inlineStyles = {}, textContent, children = [] } = node;
  
  // Skip text nodes that are converted to spans in the editor
  if (tag === 'text' || !tag) {
    return escapeHtml(textContent || '');
  }
  
  // Self-closing tags
  const selfClosing = ['img', 'input', 'br', 'hr', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'];
  const isSelfClosing = selfClosing.includes(tag);
  
  // Build attributes string
  const attrPairs: string[] = [];
  
  // Add classes
  if (classNames.length > 0) {
    attrPairs.push(`class="${classNames.join(' ')}"`);
  }
  
  // Add other attributes
  for (const [key, value] of Object.entries(attributes)) {
    if (key !== 'class') { // Skip class as we handle it separately
      attrPairs.push(`${key}="${escapeHtml(value)}"`);
    }
  }
  
  // Add inline styles
  if (Object.keys(inlineStyles).length > 0) {
    const styleString = Object.entries(inlineStyles)
      .map(([prop, value]) => `${prop}: ${value}`)
      .join('; ');
    attrPairs.push(`style="${styleString}"`);
  }
  
  const attributesString = attrPairs.length > 0 ? ' ' + attrPairs.join(' ') : '';
  
  if (isSelfClosing) {
    return `<${tag}${attributesString} />`;
  }
  
  // Regular elements with content
  const childrenHTML = children.map(child => renderNodeV4(child)).join('');
  const content = childrenHTML || escapeHtml(textContent || '');
  
  return `<${tag}${attributesString}>${content}</${tag}>`;
}

/**
 * Escapes HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, (m) => map[m]);
}