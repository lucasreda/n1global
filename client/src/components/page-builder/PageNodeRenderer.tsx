import React from 'react';
import { PageNodeV4, ResponsiveStylesV4 } from '@shared/schema';

interface PageNodeRendererProps {
  node: PageNodeV4;
  breakpoint?: 'desktop' | 'tablet' | 'mobile';
  onNodeClick?: (nodeId: string) => void;
  selectedNodeId?: string;
}

/**
 * Recursively renders PageNodeV4 tree with perfect HTML fidelity
 */
export function PageNodeRenderer({ 
  node, 
  breakpoint = 'desktop', 
  onNodeClick,
  selectedNodeId 
}: PageNodeRendererProps) {
  // Get responsive styles for current breakpoint
  const styles = getResponsiveStyles(node.styles, breakpoint);
  
  // Merge layout properties into styles
  const layoutStyles = node.layout ? {
    display: node.layout.display,
    position: node.layout.position,
    flexDirection: node.layout.flexDirection,
    justifyContent: node.layout.justifyContent,
    alignItems: node.layout.alignItems,
    gridTemplateColumns: node.layout.gridTemplateColumns,
    gridTemplateRows: node.layout.gridTemplateRows,
    gap: node.layout.gap,
  } : {};
  
  // Merge inline styles
  const inlineStyles = node.inlineStyles || {};
  
  // Final computed styles
  const computedStyles = {
    ...styles,
    ...layoutStyles,
    ...inlineStyles,
    // Add selection indicator
    ...(selectedNodeId === node.id ? {
      outline: '2px solid #3b82f6',
      outlineOffset: '2px',
    } : {}),
  } as React.CSSProperties;
  
  // Handle text nodes
  if (node.type === 'text' && node.textContent) {
    return <span style={computedStyles}>{node.textContent}</span>;
  }
  
  // Build attributes
  const attributes: any = {
    ...node.attributes,
    className: node.classNames?.join(' '),
    style: computedStyles,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      onNodeClick?.(node.id);
    },
    'data-node-id': node.id,
    'data-node-type': node.type,
  };
  
  // Render children
  const children = node.children?.map((child, index) => (
    <PageNodeRenderer
      key={child.id || index}
      node={child}
      breakpoint={breakpoint}
      onNodeClick={onNodeClick}
      selectedNodeId={selectedNodeId}
    />
  ));
  
  // Render specific elements
  switch (node.tag) {
    case 'img':
      return <img {...attributes} src={node.attributes?.src} alt={node.attributes?.alt} />;
    
    case 'a':
      return <a {...attributes} href={node.attributes?.href}>{children || node.textContent}</a>;
    
    case 'button':
      return <button {...attributes}>{children || node.textContent}</button>;
    
    case 'input':
      return <input {...attributes} />;
    
    case 'textarea':
      return <textarea {...attributes}>{node.textContent}</textarea>;
    
    case 'h1':
      return <h1 {...attributes}>{children || node.textContent}</h1>;
    
    case 'h2':
      return <h2 {...attributes}>{children || node.textContent}</h2>;
    
    case 'h3':
      return <h3 {...attributes}>{children || node.textContent}</h3>;
    
    case 'h4':
      return <h4 {...attributes}>{children || node.textContent}</h4>;
    
    case 'h5':
      return <h5 {...attributes}>{children || node.textContent}</h5>;
    
    case 'h6':
      return <h6 {...attributes}>{children || node.textContent}</h6>;
    
    case 'p':
      return <p {...attributes}>{children || node.textContent}</p>;
    
    case 'ul':
      return <ul {...attributes}>{children}</ul>;
    
    case 'ol':
      return <ol {...attributes}>{children}</ol>;
    
    case 'li':
      return <li {...attributes}>{children || node.textContent}</li>;
    
    case 'section':
      return <section {...attributes}>{children}</section>;
    
    case 'article':
      return <article {...attributes}>{children}</article>;
    
    case 'header':
      return <header {...attributes}>{children}</header>;
    
    case 'footer':
      return <footer {...attributes}>{children}</footer>;
    
    case 'nav':
      return <nav {...attributes}>{children}</nav>;
    
    case 'main':
      return <main {...attributes}>{children}</main>;
    
    case 'aside':
      return <aside {...attributes}>{children}</aside>;
    
    case 'div':
    case 'span':
    default:
      // Generic container - use div
      return <div {...attributes}>{children || node.textContent}</div>;
  }
}

/**
 * Get styles for current breakpoint with fallback
 */
function getResponsiveStyles(
  responsiveStyles?: ResponsiveStylesV4,
  breakpoint: 'desktop' | 'tablet' | 'mobile' = 'desktop'
): React.CSSProperties {
  if (!responsiveStyles) return {};
  
  // Start with desktop styles as base
  const baseStyles = responsiveStyles.desktop || {};
  
  // Override with breakpoint-specific styles
  if (breakpoint === 'tablet' && responsiveStyles.tablet) {
    return { ...baseStyles, ...responsiveStyles.tablet };
  }
  
  if (breakpoint === 'mobile' && responsiveStyles.mobile) {
    return { 
      ...baseStyles, 
      ...(responsiveStyles.tablet || {}), 
      ...responsiveStyles.mobile 
    };
  }
  
  return baseStyles;
}

/**
 * Render entire PageModelV4
 */
interface PageModelV4RendererProps {
  nodes: PageNodeV4[];
  breakpoint?: 'desktop' | 'tablet' | 'mobile';
  onNodeClick?: (nodeId: string) => void;
  selectedNodeId?: string;
  className?: string;
}

export function PageModelV4Renderer({ 
  nodes, 
  breakpoint = 'desktop',
  onNodeClick,
  selectedNodeId,
  className
}: PageModelV4RendererProps) {
  return (
    <div className={className} data-page-model="v4">
      {nodes.map((node, index) => (
        <PageNodeRenderer
          key={node.id || index}
          node={node}
          breakpoint={breakpoint}
          onNodeClick={onNodeClick}
          selectedNodeId={selectedNodeId}
        />
      ))}
    </div>
  );
}
