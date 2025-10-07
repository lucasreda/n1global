import { useEffect, useRef } from 'react';

/**
 * Manages stylesheets with CSS Layers to ensure proper cascade order:
 * 1. Template styles (lowest priority) - @layer template
 * 2. Override styles (highest priority) - @layer overrides
 */
export function useStylesheetManager(
  templateCss: string | undefined,
  overrideCss: string | undefined,
  containerId: string
) {
  const templateStyleRef = useRef<HTMLStyleElement | null>(null);
  const overrideStyleRef = useRef<HTMLStyleElement | null>(null);
  const layerOrderRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    // Clean up old style elements
    if (layerOrderRef.current) {
      layerOrderRef.current.remove();
      layerOrderRef.current = null;
    }
    if (templateStyleRef.current) {
      templateStyleRef.current.remove();
      templateStyleRef.current = null;
    }
    if (overrideStyleRef.current) {
      overrideStyleRef.current.remove();
      overrideStyleRef.current = null;
    }

    // Find or create container for styles
    const container = document.getElementById(containerId);
    if (!container) return;

    // Define layer order - template first, overrides last (highest priority)
    const layerOrderStyle = document.createElement('style');
    layerOrderStyle.setAttribute('data-layer', 'order-definition');
    layerOrderStyle.textContent = '@layer template, overrides;';
    document.head.insertBefore(layerOrderStyle, document.head.firstChild);
    layerOrderRef.current = layerOrderStyle;
    
    // Create template layer (base styles)
    if (templateCss) {
      const templateStyle = document.createElement('style');
      templateStyle.setAttribute('data-layer', 'template');
      templateStyle.setAttribute('data-container-id', containerId);
      
      // Wrap template CSS in @layer to ensure lower priority
      templateStyle.textContent = `
        @layer template {
          ${templateCss}
        }
      `;
      
      // Insert after layer order definition
      document.head.insertBefore(templateStyle, layerOrderStyle.nextSibling);
      templateStyleRef.current = templateStyle;
    }

    // Create override layer (user edits)
    if (overrideCss) {
      const overrideStyle = document.createElement('style');
      overrideStyle.setAttribute('data-layer', 'overrides');
      overrideStyle.setAttribute('data-container-id', containerId);
      
      // Wrap override CSS in @layer with higher priority
      overrideStyle.textContent = `
        @layer overrides {
          ${overrideCss}
        }
      `;
      
      // Append to end of head to ensure it loads last
      document.head.appendChild(overrideStyle);
      overrideStyleRef.current = overrideStyle;
    }

    // Cleanup on unmount
    return () => {
      if (layerOrderRef.current) {
        layerOrderRef.current.remove();
      }
      if (templateStyleRef.current) {
        templateStyleRef.current.remove();
      }
      if (overrideStyleRef.current) {
        overrideStyleRef.current.remove();
      }
    };
  }, [templateCss, overrideCss, containerId]);
}

/**
 * Extracts <style> and <link> tags from HTML string
 * Returns the HTML without styles and the extracted CSS
 */
export function extractStylesFromHtml(html: string): {
  cleanHtml: string;
  extractedCss: string;
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  let extractedCss = '';
  
  // Extract and remove all <style> tags
  const styleTags = doc.querySelectorAll('style');
  styleTags.forEach(style => {
    extractedCss += style.textContent + '\n';
    style.remove();
  });
  
  // Note: <link rel="stylesheet"> tags need async handling
  // For now, we'll just remove them and note in comments
  const linkTags = doc.querySelectorAll('link[rel="stylesheet"]');
  linkTags.forEach(link => {
    const href = link.getAttribute('href');
    if (href) {
      extractedCss += `/* External stylesheet: ${href} */\n`;
    }
    link.remove();
  });
  
  // Get the cleaned HTML
  const cleanHtml = doc.body ? doc.body.innerHTML : doc.documentElement.innerHTML;
  
  return {
    cleanHtml,
    extractedCss
  };
}

/**
 * Generates override CSS from node styles
 */
export function generateOverrideCss(
  nodes: Array<{ id: string; styles?: Record<string, any> }>,
  breakpoint: 'desktop' | 'tablet' | 'mobile'
): string {
  let css = '';
  
  nodes.forEach(node => {
    if (node.styles?.[breakpoint]) {
      const styles = node.styles[breakpoint];
      const styleString = Object.entries(styles)
        .map(([key, value]) => {
          const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
          return `${cssKey}: ${value} !important`;
        })
        .join('; ');
      
      if (styleString) {
        // Use ID selector for maximum specificity
        css += `#style-override-${node.id}-${breakpoint} { ${styleString} }\n`;
      }
    }
  });
  
  return css;
}