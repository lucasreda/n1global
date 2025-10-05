import type { PageModelV2, BlockSection } from "@shared/schema";

/**
 * Generates basic HTML from a PageModelV2 structure
 * This is a simple renderer for landing page deployment
 */
export function renderPageModelToHTML(model: PageModelV2): string {
  const { theme, seo, sections } = model;
  
  const sectionsHTML = sections.map(section => renderSection(section)).join('\n');
  
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${seo.title || 'Landing Page'}</title>
  ${seo.description ? `<meta name="description" content="${escapeHtml(seo.description)}">` : ''}
  ${seo.keywords && seo.keywords.length > 0 ? `<meta name="keywords" content="${seo.keywords.join(', ')}">` : ''}
  ${seo.ogTitle ? `<meta property="og:title" content="${escapeHtml(seo.ogTitle)}">` : ''}
  ${seo.ogDescription ? `<meta property="og:description" content="${escapeHtml(seo.ogDescription)}">` : ''}
  ${seo.ogImage ? `<meta property="og:image" content="${seo.ogImage}">` : ''}
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: ${theme.typography.bodyFont};
      color: ${theme.colors.text};
      background-color: ${theme.colors.background};
      line-height: 1.6;
    }
    
    .container {
      max-width: ${model.settings?.containerMaxWidth || '1200px'};
      margin: 0 auto;
      padding: 0 ${theme.spacing.md};
    }
    
    section {
      padding: ${theme.spacing['2xl']} 0;
    }
    
    h1, h2, h3, h4, h5, h6 {
      font-family: ${theme.typography.headingFont};
      margin-bottom: ${theme.spacing.md};
      line-height: 1.2;
    }
    
    h1 { font-size: ${theme.typography.fontSize['4xl']}; }
    h2 { font-size: ${theme.typography.fontSize['3xl']}; }
    h3 { font-size: ${theme.typography.fontSize['2xl']}; }
    h4 { font-size: ${theme.typography.fontSize.xl}; }
    
    p {
      margin-bottom: ${theme.spacing.md};
    }
    
    .button {
      display: inline-block;
      padding: ${theme.spacing.sm} ${theme.spacing.lg};
      background-color: ${theme.colors.primary};
      color: white;
      text-decoration: none;
      border-radius: ${theme.borderRadius.md};
      font-weight: 600;
      transition: all 0.3s ease;
    }
    
    .button:hover {
      opacity: 0.9;
      transform: translateY(-2px);
    }
    
    .text-center {
      text-align: center;
    }
    
    img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  ${sectionsHTML}
</body>
</html>`;
  
  return html;
}

function renderSection(section: BlockSection): string {
  const rows = section.rows || [];
  
  const rowsHTML = rows.map(row => {
    const columns = row.columns || [];
    const columnsHTML = columns.map(column => {
      const elements = column.elements || [];
      const elementsHTML = elements.map(el => renderElement(el)).join('\n');
      return `<div style="flex: 1; padding: 0 ${section.settings?.gap || '1rem'}">${elementsHTML}</div>`;
    }).join('\n');
    
    return `<div style="display: flex; flex-wrap: wrap; gap: ${section.settings?.gap || '2rem'}; margin-bottom: 2rem;">${columnsHTML}</div>`;
  }).join('\n');
  
  const sectionStyle = `
    background-color: ${section.settings?.backgroundColor || 'transparent'};
    text-align: ${section.settings?.textAlign || 'left'};
  `.trim();
  
  return `<section style="${sectionStyle}">
  <div class="container">
    ${rowsHTML}
  </div>
</section>`;
}

function renderElement(element: any): string {
  const { type, props, content, styles } = element;
  
  const style = styles ? Object.entries(styles)
    .map(([key, value]) => `${camelToKebab(key)}: ${value}`)
    .join('; ') : '';
  
  // Extract text from content (it can be a string or an object with 'text' property)
  const getTextContent = (content: any): string => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (typeof content === 'object' && content.text) return content.text;
    return '';
  };
  
  switch (type) {
    case 'heading':
      const level = props?.level || 2;
      const headingText = getTextContent(content);
      return `<h${level} style="${style}">${escapeHtml(headingText)}</h${level}>`;
    
    case 'text':
    case 'paragraph':
      const paragraphText = getTextContent(content);
      return `<p style="${style}">${escapeHtml(paragraphText)}</p>`;
    
    case 'button':
      const href = props?.href || content?.href || '#';
      const buttonText = props?.text || content?.text || getTextContent(content) || 'Click Here';
      return `<a href="${href}" class="button" style="${style}">${escapeHtml(buttonText)}</a>`;
    
    case 'image':
      const src = props?.src || content?.src || '';
      const alt = props?.alt || content?.alt || '';
      return src ? `<img src="${src}" alt="${escapeHtml(alt)}" style="${style}">` : '';
    
    case 'spacer':
      const height = props?.height || '2rem';
      return `<div style="height: ${height}; ${style}"></div>`;
    
    default:
      const defaultText = getTextContent(content);
      return defaultText ? `<div style="${style}">${escapeHtml(defaultText)}</div>` : '';
  }
}

function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function escapeHtml(text: any): string {
  if (!text) return '';
  if (typeof text !== 'string') {
    text = String(text);
  }
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
