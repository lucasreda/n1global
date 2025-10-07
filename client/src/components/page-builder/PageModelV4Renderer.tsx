import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { PageModelV4, PageNodeV4 } from '@shared/schema';
import { cn } from '@/lib/utils';
import { HoverTooltip } from './HoverTooltip';
import { SelectionToolbar } from './SelectionToolbar';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { canAcceptChild } from './tree-helpers';
import { useStylesheetManager, generateOverrideCss } from '@/hooks/useStylesheetManager';

interface PageModelV4RendererProps {
  model: PageModelV4;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  onDuplicateNode?: () => void;
  onDeleteNode?: () => void;
  breakpoint?: 'desktop' | 'tablet' | 'mobile';
}

export function PageModelV4Renderer({ 
  model, 
  selectedNodeId, 
  onSelectNode,
  onDuplicateNode,
  onDeleteNode,
  breakpoint = 'desktop'
}: PageModelV4RendererProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredNodeInfo, setHoveredNodeInfo] = useState<{ tag: string; classNames: string[]; dimensions?: { width: number; height: number } } | null>(null);
  
  // Collect all nodes for CSS generation
  const collectNodes = useCallback((node: PageNodeV4): PageNodeV4[] => {
    const nodes: PageNodeV4[] = [node];
    if (node.children) {
      node.children.forEach(child => {
        nodes.push(...collectNodes(child));
      });
    }
    return nodes;
  }, []);
  
  // Generate override CSS for all nodes with styles
  const overrideCss = useMemo(() => {
    if (!model.nodes || model.nodes.length === 0) return '';
    const allNodes = model.nodes.flatMap(node => collectNodes(node));
    const css = generateOverrideCss(allNodes, breakpoint);
    console.log(`Generated override CSS (${breakpoint}):`, css ? 'Yes' : 'No', css?.length || 0, 'chars');
    return css;
  }, [model.nodes, breakpoint, collectNodes]);
  
  // Use stylesheet manager with CSS layers
  useStylesheetManager(
    model.globalStyles, // Template base CSS
    overrideCss,        // User override CSS
    'page-builder-canvas'
  );

  const handleMouseEnter = useCallback((nodeId: string, tag: string, classNames: string[], dimensions?: { width: number; height: number }) => {
    setHoveredNodeId(nodeId);
    setHoveredNodeInfo({ tag, classNames, dimensions });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
    setHoveredNodeInfo(null);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  }, []);

  // Sanitize global styles to remove unwanted overflow and scrollbar rules
  const sanitizeGlobalStyles = (css: string): string => {
    if (!css) return '';
    
    let sanitized = css;
    
    // Step 1: Remove custom scrollbar styling rules that cause green scrollbars
    sanitized = sanitized.replace(
      /::-webkit-scrollbar[^{]*\{[^}]*\}/gi,
      ''
    );
    sanitized = sanitized.replace(
      /::-webkit-scrollbar-[^{]*\{[^}]*\}/gi,
      ''
    );
    
    // Step 2: Remove overflow: auto/scroll from all selectors except whitelisted ones
    sanitized = sanitized.replace(
      /([^}]*?)\{([^}]*?overflow\s*:\s*(auto|scroll)[^}]*?)\}/gi,
      (match, selector, rules) => {
        // Allow overflow on textarea, pre, code, or elements with scroll/overflow in selector
        if (
          selector.includes('textarea') ||
          selector.includes('pre') ||
          selector.includes('code') ||
          selector.includes('scroll') ||
          selector.includes('overflow')
        ) {
          return match; // Keep original
        }
        
        // Remove overflow property from this rule
        const sanitizedRules = rules.replace(/overflow(-[xy])?\s*:\s*(auto|scroll)\s*;?/gi, '');
        return `${selector}{${sanitizedRules}}`;
      }
    );
    
    return sanitized;
  };

  // Generate override styles with maximum specificity using IDs
  const generateOverrideStyles = (nodes: PageNodeV4[]): string => {
    let css = '';
    
    const processNode = (node: PageNodeV4) => {
      const styles = node.styles?.[breakpoint];
      if (styles && Object.keys(styles).length > 0) {
        const uniqueId = `style-override-${node.id}-${breakpoint}`;
        const styleRules = Object.entries(styles)
          .map(([key, value]) => {
            const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            return `${cssKey}: ${value} !important`;
          })
          .join('; ');
        
        // ID selector has maximum specificity
        css += `#${uniqueId} { ${styleRules}; }\n`;
      }
      
      // Process children recursively
      if (node.children) {
        node.children.forEach(processNode);
      }
    };
    
    nodes.forEach(processNode);
    return css;
  };

  return (
    <div 
      className="page-frame w-full h-full page-renderer-reset" 
      style={{ position: 'relative', zIndex: 0, overflow: 'visible' }}
      onMouseMove={handleMouseMove}
    >
      {/* Inject global CSS (variables, resets, classes) */}
      {/* Font Awesome is loaded globally in index.html */}
      {model.globalStyles && (
        <style dangerouslySetInnerHTML={{ 
          __html: sanitizeGlobalStyles(model.globalStyles) 
        }} />
      )}
      
      {/* Global CSS to prevent unwanted scrollbars */}
      <style>{`
        #page-builder-canvas * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        #page-builder-canvas *::-webkit-scrollbar {
          display: none !important;
        }
        #page-builder-canvas section,
        #page-builder-canvas div,
        #page-builder-canvas nav,
        #page-builder-canvas header,
        #page-builder-canvas footer,
        #page-builder-canvas aside {
          overflow: visible !important;
        }
      `}</style>
      
      {/* Isolate rendered HTML to prevent position:fixed from escaping */}
      <div style={{ 
        position: 'relative', 
        isolation: 'isolate',
        width: '100%',
        minHeight: '100%',
        overflow: 'visible',
        contain: 'layout style paint'
      }}>
        {model.nodes.map(node => (
          <PageNodeV4Renderer 
            key={node.id} 
            node={node}
            selectedNodeId={selectedNodeId}
            hoveredNodeId={hoveredNodeId}
            onSelectNode={onSelectNode}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onDuplicateNode={onDuplicateNode}
            onDeleteNode={onDeleteNode}
            breakpoint={breakpoint}
          />
        ))}
      </div>
      
      {/* CRITICAL: Inject user overrides AFTER rendered content to win cascade order */}
      {/* This ensures overrides come after any <style> tags embedded in the imported HTML */}
      <style id="user-overrides" dangerouslySetInnerHTML={{
        __html: generateOverrideStyles(model.nodes)
      }} />

      {/* Hover Tooltip */}
      {hoveredNodeInfo && hoveredNodeId !== selectedNodeId && (
        <HoverTooltip
          tag={hoveredNodeInfo.tag}
          classNames={hoveredNodeInfo.classNames}
          dimensions={hoveredNodeInfo.dimensions}
          position={mousePosition}
          visible={true}
        />
      )}
    </div>
  );
}

interface PageNodeV4RendererProps {
  node: PageNodeV4;
  selectedNodeId?: string | null;
  hoveredNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  onMouseEnter?: (nodeId: string, tag: string, classNames: string[], dimensions?: { width: number; height: number }) => void;
  onMouseLeave?: () => void;
  onDuplicateNode?: () => void;
  onDeleteNode?: () => void;
  breakpoint: 'desktop' | 'tablet' | 'mobile';
}

function PageNodeV4Renderer({ 
  node, 
  selectedNodeId,
  hoveredNodeId,
  onSelectNode,
  onMouseEnter,
  onMouseLeave,
  onDuplicateNode,
  onDeleteNode,
  breakpoint 
}: PageNodeV4RendererProps) {
  const isSelected = selectedNodeId === node.id;
  const isHovered = hoveredNodeId === node.id && !isSelected;
  
  // Drag and drop
  const { attributes: draggableAttributes, listeners: draggableListeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
    id: `node-${node.id}`,
    data: {
      kind: 'node',
      nodeId: node.id,
    },
  });

  // Three separate drop zones: before, after, inner
  const { setNodeRef: setBeforeDropRef, isOver: isOverBefore } = useDroppable({
    id: `drop-before-${node.id}`,
    data: {
      kind: 'node',
      nodeId: node.id,
      position: 'before',
    },
  });

  const { setNodeRef: setAfterDropRef, isOver: isOverAfter } = useDroppable({
    id: `drop-after-${node.id}`,
    data: {
      kind: 'node',
      nodeId: node.id,
      position: 'after',
    },
  });

  const { setNodeRef: setInnerDropRef, isOver: isOverInner } = useDroppable({
    id: `drop-inner-${node.id}`,
    data: {
      kind: 'node',
      nodeId: node.id,
      position: 'child',
    },
    disabled: !canAcceptChild(node),
  });
  
  // Get styles for current breakpoint (used for CSS generation, not inline)
  const styles = node.styles?.[breakpoint] || {};
  
  // Merge only layout and inline styles (overrides are in CSS Layers)
  const finalStyles: React.CSSProperties = {
    ...(node.layout as React.CSSProperties),
    ...node.inlineStyles,
    // DON'T include override styles here - they're applied via CSS Layers
  };
  
  // Generate unique CSS ID for maximum specificity override
  const uniqueStyleId = `style-override-${node.id}-${breakpoint}`;
  
  // Ref for drag and drop
  const elementRef = useRef<HTMLElement>(null);
  
  // CRITICAL: Convert position:fixed to position:absolute to confine elements within canvas
  // This prevents HTML content from escaping the preview area and overlaying editor controls
  if (finalStyles.position === 'fixed') {
    finalStyles.position = 'absolute';
  }
  
  // FIX: Remove unwanted overflow:auto that creates spurious scrollbars
  // Only allow overflow:auto on explicit scrollable containers (divs with specific class/role)
  const allowScrollbarTags = ['textarea', 'pre', 'code'];
  const isScrollableContainer = node.classNames?.some(c => 
    c.includes('scroll') || c.includes('overflow')
  ) || node.attributes?.role === 'region';
  
  if (!allowScrollbarTags.includes(node.tag) && !isScrollableContainer) {
    // Remove overflow auto/scroll to prevent unwanted scrollbars
    if (finalStyles.overflow === 'auto' || finalStyles.overflow === 'scroll') {
      delete finalStyles.overflow;
    }
    if (finalStyles.overflowX === 'auto' || finalStyles.overflowX === 'scroll') {
      delete finalStyles.overflowX;
    }
    if (finalStyles.overflowY === 'auto' || finalStyles.overflowY === 'scroll') {
      delete finalStyles.overflowY;
    }
  }
  
  // Handle click to select node
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelectNode) {
      onSelectNode(node.id);
    }
  };

  // Handle hover events
  const handleMouseEnterNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMouseEnter) {
      const rect = e.currentTarget.getBoundingClientRect();
      onMouseEnter(
        node.id, 
        node.tag, 
        node.classNames || [],
        { width: rect.width, height: rect.height }
      );
    }
  };

  const handleMouseLeaveNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMouseLeave) {
      onMouseLeave();
    }
  };
  
  // Combine ALL refs into a single callback (including elementRef for direct DOM manipulation)
  const setCombinedRefs = useCallback((el: Element | null) => {
    const htmlEl = el as HTMLElement | null;
    setDraggableRef(htmlEl);
    setBeforeDropRef(htmlEl);
    setAfterDropRef(htmlEl);
    setInnerDropRef(htmlEl);
    (elementRef as any).current = htmlEl; // Also set our ref for direct style manipulation
  }, [setDraggableRef, setBeforeDropRef, setAfterDropRef, setInnerDropRef]);

  // Handle text-only nodes (convert 'text' tag to span)
  if (node.tag === 'text' || node.type === 'text') {
    const spanElement = (
      <span
        ref={setCombinedRefs}
        {...draggableAttributes}
        {...draggableListeners}
        {...node.attributes}
        id={uniqueStyleId}
        data-node-id={node.id}
        data-testid={`node-text-${node.id}`}
        className={cn(
          node.classNames?.join(' '),
          isSelected && 'editor-node-selected',
          isHovered && 'editor-node-hovered',
          isDragging && 'opacity-30'
        )}
        style={finalStyles}
        onClick={handleClick}
        onMouseEnter={handleMouseEnterNode}
        onMouseLeave={handleMouseLeaveNode}
      >
        {node.textContent}
        
        {/* Render toolbar for selected node */}
        {isSelected && onDuplicateNode && onDeleteNode && (
          <SelectionToolbar
            nodeId={node.id}
            onDuplicate={onDuplicateNode}
            onDelete={onDeleteNode}
            dragListeners={draggableListeners}
            dragAttributes={draggableAttributes}
          />
        )}
      </span>
    );
    
    return spanElement;
  }
  
  // Get the tag name (default to div if not specified)
  const Tag = (node.tag || 'div') as any;
  
  // Check if node is a self-closing tag
  const isSelfClosing = ['img', 'input', 'br', 'hr', 'meta', 'link'].includes(node.tag);
  
  // CRITICAL: For self-closing tags, we MUST NOT render children or textContent
  if (isSelfClosing) {
    // Handle responsive images
    let finalAttributes = { ...node.attributes };
    if (node.tag === 'img') {
      // Priority 1: Check responsiveAttributes for the current breakpoint
      const responsiveSrc = node.responsiveAttributes?.src?.[breakpoint];
      
      // Priority 2: Check data-src attributes
      const dataSrcDesktop = node.attributes?.['data-src-desktop'];
      const dataSrcMobile = node.attributes?.['data-src-mobile'];
      
      // Priority 3: Regular src attribute
      const baseSrc = node.attributes?.src;
      
      // Determine which src to use based on breakpoint
      if (breakpoint === 'mobile') {
        finalAttributes.src = responsiveSrc || dataSrcMobile || baseSrc || '';
      } else if (breakpoint === 'tablet') {
        // Use desktop image for tablet
        finalAttributes.src = responsiveSrc || dataSrcDesktop || baseSrc || '';
      } else {
        // Desktop
        finalAttributes.src = responsiveSrc || dataSrcDesktop || baseSrc || '';
      }
      
    }
    
    return (
      <div style={{ display: 'inline', position: 'relative' }}>
        <Tag
          key={`${node.id}-${finalAttributes.src || 'no-src'}`}
          ref={setCombinedRefs}
          {...draggableAttributes}
          {...draggableListeners}
          {...finalAttributes}
          id={uniqueStyleId}
          data-node-id={node.id}
          data-testid={`node-${node.tag}-${node.id}`}
          className={cn(
            node.classNames?.join(' '),
            isSelected && 'editor-node-selected',
            isHovered && 'editor-node-hovered',
            isDragging && 'opacity-30'
          )}
          style={finalStyles}
          onClick={handleClick}
          onMouseEnter={handleMouseEnterNode}
          onMouseLeave={handleMouseLeaveNode}
        />
        
        {/* Render toolbar for selected node */}
        {isSelected && onDuplicateNode && onDeleteNode && (
          <SelectionToolbar
            nodeId={node.id}
            onDuplicate={onDuplicateNode}
            onDelete={onDeleteNode}
            dragListeners={draggableListeners}
            dragAttributes={draggableAttributes}
          />
        )}
      </div>
    );
  }
  
  // Regular elements with children/text
  return (
    <Tag
      ref={setCombinedRefs}
      {...draggableAttributes}
      {...draggableListeners}
      {...node.attributes}
      id={uniqueStyleId}
      data-node-id={node.id}
      data-testid={`node-${node.tag}-${node.id}`}
      className={cn(
        node.classNames?.join(' '),
        isSelected && 'editor-node-selected',
        isHovered && 'editor-node-hovered',
        isDragging && 'opacity-30'
      )}
      style={finalStyles}
      onClick={handleClick}
      onMouseEnter={handleMouseEnterNode}
      onMouseLeave={handleMouseLeaveNode}
    >
      {node.textContent}
      {node.children?.map(child => (
        <PageNodeV4Renderer 
          key={child.id} 
          node={child}
          selectedNodeId={selectedNodeId}
          hoveredNodeId={hoveredNodeId}
          onSelectNode={onSelectNode}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onDuplicateNode={onDuplicateNode}
          onDeleteNode={onDeleteNode}
          breakpoint={breakpoint}
        />
      ))}
      
      {/* Render toolbar for selected node */}
      {isSelected && onDuplicateNode && onDeleteNode && (
        <SelectionToolbar
          nodeId={node.id}
          onDuplicate={onDuplicateNode}
          onDelete={onDeleteNode}
          dragListeners={draggableListeners}
          dragAttributes={draggableAttributes}
        />
      )}
    </Tag>
  );
}
