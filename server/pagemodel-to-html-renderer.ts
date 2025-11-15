import type { PageModelV3, BlockSectionV3, BlockRowV3, BlockColumnV3, BlockElementV3 } from '@shared/schema';

/**
 * PageModelV3 → HTML Renderer
 * 
 * Converts PageModelV3 back to HTML for bijective testing
 * Goal: Validate that HTML → PageModel → HTML preserves structure and styles
 */

export function renderPageModelV3ToHtml(pageModel: PageModelV3): string {
  const head = renderHead(pageModel);
  const body = renderBody(pageModel);
  
  return `<!DOCTYPE html>
<html lang="en">
${head}
${body}
</html>`;
}

function renderHead(pageModel: PageModelV3): string {
  const styles = renderGlobalStyles(pageModel);
  
  return `<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageModel.meta.title || 'Untitled')}</title>
  ${pageModel.meta.description ? `<meta name="description" content="${escapeHtml(pageModel.meta.description)}">` : ''}
  ${styles}
</head>`;
}

function renderGlobalStyles(pageModel: PageModelV3): string {
  const cssRules: string[] = [];
  
  // Design tokens as CSS variables (skip if values are objects)
  if (pageModel.designTokens) {
    const rootVars: string[] = [':root {'];
    let hasVars = false;
    
    if (pageModel.designTokens.colors && typeof pageModel.designTokens.colors === 'object') {
      Object.entries(pageModel.designTokens.colors).forEach(([key, value]) => {
        // Only add if value is a primitive (string/number), not an object
        if (value && typeof value !== 'object') {
          rootVars.push(`  --color-${key}: ${value};`);
          hasVars = true;
        }
      });
    }
    
    if (pageModel.designTokens.typography?.fontSizes && typeof pageModel.designTokens.typography.fontSizes === 'object') {
      Object.entries(pageModel.designTokens.typography.fontSizes).forEach(([key, value]) => {
        if (value && typeof value !== 'object') {
          rootVars.push(`  --font-size-${key}: ${value};`);
          hasVars = true;
        }
      });
    }
    
    if (pageModel.designTokens.spacing && typeof pageModel.designTokens.spacing === 'object') {
      Object.entries(pageModel.designTokens.spacing).forEach(([key, value]) => {
        if (value && typeof value !== 'object') {
          rootVars.push(`  --spacing-${key}: ${value};`);
          hasVars = true;
        }
      });
    }
    
    rootVars.push('}');
    if (hasVars) {
      cssRules.push(rootVars.join('\n'));
    }
  }
  
  // Section styles
  pageModel.sections.forEach((section, index) => {
    const sectionClass = `section-${index}`;
    if (section.styles?.desktop) {
      cssRules.push(renderCssRule(`.${sectionClass}`, section.styles.desktop));
    }
    if (section.styles?.tablet) {
      cssRules.push(`@media (min-width: 769px) and (max-width: 1024px) {`);
      cssRules.push(renderCssRule(`.${sectionClass}`, section.styles.tablet));
      cssRules.push('}');
    }
    if (section.styles?.mobile) {
      cssRules.push(`@media (max-width: 768px) {`);
      cssRules.push(renderCssRule(`.${sectionClass}`, section.styles.mobile));
      cssRules.push('}');
    }
    
    // Row styles
    section.rows.forEach((row, rowIndex) => {
      const rowClass = `row-${index}-${rowIndex}`;
      if (row.styles?.desktop) {
        cssRules.push(renderCssRule(`.${rowClass}`, row.styles.desktop));
      }
      
      // Column styles
      row.columns.forEach((col, colIndex) => {
        const colClass = `col-${index}-${rowIndex}-${colIndex}`;
        if (col.styles?.desktop) {
          cssRules.push(renderCssRule(`.${colClass}`, col.styles.desktop));
        }
        
        // Element styles
        col.elements.forEach((el, elIndex) => {
          const elClass = `el-${index}-${rowIndex}-${colIndex}-${elIndex}`;
          if (el.styles?.desktop) {
            cssRules.push(renderCssRule(`.${elClass}`, el.styles.desktop));
          }
          if (el.styles?.tablet) {
            cssRules.push(`@media (min-width: 769px) and (max-width: 1024px) {`);
            cssRules.push(renderCssRule(`.${elClass}`, el.styles.tablet));
            cssRules.push('}');
          }
          if (el.styles?.mobile) {
            cssRules.push(`@media (max-width: 768px) {`);
            cssRules.push(renderCssRule(`.${elClass}`, el.styles.mobile));
            cssRules.push('}');
          }
          if (el.states?.hover) {
            cssRules.push(renderCssRule(`.${elClass}:hover`, el.states.hover));
          }
          if (el.states?.focus) {
            cssRules.push(renderCssRule(`.${elClass}:focus`, el.states.focus));
          }
          if (el.states?.active) {
            cssRules.push(renderCssRule(`.${elClass}:active`, el.states.active));
          }
          
          // Render children recursively with unique identifiers
          if (el.children && el.children.length > 0) {
            renderChildrenStyles(el.children, elClass, cssRules);
          }
        });
      });
    });
  });
  
  return `<style>\n${cssRules.filter(r => r).join('\n')}\n</style>`;
}

/**
 * Recursively render styles for children elements with unique identifiers
 */
function renderChildrenStyles(
  children: BlockElementV3[],
  parentClass: string,
  cssRules: string[]
): void {
  children.forEach((child, childIndex) => {
    const childClass = `${parentClass}-c${childIndex}`;
    
    if (child.styles?.desktop) {
      cssRules.push(renderCssRule(`.${childClass}`, child.styles.desktop));
    }
    if (child.styles?.tablet) {
      cssRules.push(`@media (min-width: 769px) and (max-width: 1024px) {`);
      cssRules.push(renderCssRule(`.${childClass}`, child.styles.tablet));
      cssRules.push('}');
    }
    if (child.styles?.mobile) {
      cssRules.push(`@media (max-width: 768px) {`);
      cssRules.push(renderCssRule(`.${childClass}`, child.styles.mobile));
      cssRules.push('}');
    }
    if (child.states?.hover) {
      cssRules.push(renderCssRule(`.${childClass}:hover`, child.states.hover));
    }
    if (child.states?.focus) {
      cssRules.push(renderCssRule(`.${childClass}:focus`, child.states.focus));
    }
    if (child.states?.active) {
      cssRules.push(renderCssRule(`.${childClass}:active`, child.states.active));
    }
    
    // Recursively render grandchildren
    if (child.children && child.children.length > 0) {
      renderChildrenStyles(child.children, childClass, cssRules);
    }
  });
}

function renderCssRule(selector: string, styles: Record<string, any>): string {
  const properties = Object.entries(styles)
    .map(([key, value]) => {
      const cssKey = camelToKebab(key);
      return `  ${cssKey}: ${value};`;
    })
    .join('\n');
  
  if (!properties) return '';
  
  return `${selector} {\n${properties}\n}`;
}

function renderBody(pageModel: PageModelV3): string {
  const sections = pageModel.sections
    .map((section, index) => renderSection(section, index))
    .join('\n');
  
  return `<body>
${sections}
</body>`;
}

function renderSection(section: BlockSectionV3, index: number): string {
  const tag = section.type === 'footer' ? 'footer' : 'section';
  
  const className = `section-${index}`;
  const rows = section.rows.map((row, rowIndex) => renderRow(row, index, rowIndex)).join('\n');
  
  return `<${tag} class="${className}">
${rows}
</${tag}>`;
}

function renderRow(row: BlockRowV3, sectionIndex: number, rowIndex: number): string {
  const className = `row-${sectionIndex}-${rowIndex}`;
  const columns = row.columns
    .map((col, colIndex) => renderColumn(col, sectionIndex, rowIndex, colIndex))
    .join('\n');
  
  return `<div class="${className}">
${columns}
</div>`;
}

function renderColumn(col: BlockColumnV3, sectionIndex: number, rowIndex: number, colIndex: number): string {
  const className = `col-${sectionIndex}-${rowIndex}-${colIndex}`;
  const elements = col.elements
    .map((el, elIndex) => renderElement(el, sectionIndex, rowIndex, colIndex, elIndex))
    .join('\n');
  
  return `<div class="${className}">
${elements}
</div>`;
}

function renderElement(
  el: BlockElementV3, 
  sectionIndex: number, 
  rowIndex: number, 
  colIndex: number, 
  elIndex: number,
  parentClass?: string
): string {
  const className = parentClass ? `${parentClass}-c${elIndex}` : `el-${sectionIndex}-${rowIndex}-${colIndex}-${elIndex}`;
  
  switch (el.type) {
    case 'heading':
      let level = el.props?.level || 1;
      // Handle both number (1) and string ("h1") formats
      if (typeof level === 'string') {
        const match = level.match(/\d+/);
        level = match ? parseInt(match[0]) : 1;
      }
      return `<h${level} class="${className}">${escapeHtml(el.props?.text || '')}</h${level}>`;
    
    case 'text':
      return `<p class="${className}">${escapeHtml(el.props?.text || '')}</p>`;
    
    case 'button':
      if (el.props?.href) {
        return `<a href="${escapeHtml(el.props.href)}" class="${className}">${escapeHtml(el.props?.text || 'Button')}</a>`;
      }
      return `<button class="${className}">${escapeHtml(el.props?.text || 'Button')}</button>`;
    
    case 'image':
      return `<img src="${escapeHtml(el.props?.src || '')}" alt="${escapeHtml(el.props?.alt || '')}" class="${className}">`;
    
    case 'video':
      return `<video class="${className}" ${el.props?.autoplay ? 'autoplay' : ''} ${el.props?.muted ? 'muted' : ''} ${el.props?.loop ? 'loop' : ''}>
  <source src="${escapeHtml(el.props?.src || '')}" type="${escapeHtml(el.props?.type || 'video/mp4')}">
</video>`;
    
    case 'input':
      return `<input type="${escapeHtml(el.props?.inputType || 'text')}" class="${className}" placeholder="${escapeHtml(el.props?.placeholder || '')}">`;
    
    case 'container':
      if (el.children && el.children.length > 0) {
        const childrenHtml = el.children
          .map((child, childIndex) => renderElement(child, sectionIndex, rowIndex, colIndex, childIndex, className))
          .join('\n');
        return `<div class="${className}">
${childrenHtml}
</div>`;
      }
      return `<div class="${className}"></div>`;
    
    default:
      return `<div class="${className}">${escapeHtml(el.props?.text || '')}</div>`;
  }
}

function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
