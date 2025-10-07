import { useState, useCallback } from 'react';
import { PageModelV4, PageNodeV4 } from '@shared/schema';
import { cn } from '@/lib/utils';
import { HoverTooltip } from './HoverTooltip';
import { SelectionToolbar } from './SelectionToolbar';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { canAcceptChild } from './tree-helpers';

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

  return (
    <div 
      className="page-frame w-full h-full overflow-auto page-renderer-reset" 
      style={{ position: 'relative', zIndex: 0 }}
      onMouseMove={handleMouseMove}
    >
      {/* Inject global CSS (variables, resets, classes) */}
      {/* Font Awesome is loaded globally in index.html */}
      {model.globalStyles && (
        <style dangerouslySetInnerHTML={{ 
          __html: sanitizeGlobalStyles(model.globalStyles) 
        }} />
      )}
      
      {/* User-edited styles with MAXIMUM specificity - injected AFTER global styles */}
      <style id="user-overrides">
        {model.nodes.map(node => {
          const generateNodeStyles = (n: PageNodeV4, currentBreakpoint: 'desktop' | 'tablet' | 'mobile'): string => {
            let css = '';
            
            // Generate styles for this node with maximum specificity
            const styles = n.styles?.[currentBreakpoint];
            if (styles && Object.keys(styles).length > 0) {
              const styleRules = Object.entries(styles)
                .map(([key, value]) => {
                  const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                  return `${cssKey}: ${value} !important`;
                })
                .join('; ');
              
              // Triple attribute selector + tag for absolute maximum specificity
              const tag = n.tag === 'text' ? 'span' : n.tag;
              const selector = `${tag}[data-node-id="${n.id}"][data-node-id="${n.id}"][data-node-id="${n.id}"]`;
              const rule = `${selector} { ${styleRules}; }`;
              
              console.log('📝 Generated CSS rule:', { nodeId: n.id, tag, selector, styleRules });
              
              css += rule + '\n';
            }
            
            // Recursively generate styles for children
            if (n.children) {
              n.children.forEach(child => {
                css += generateNodeStyles(child, currentBreakpoint);
              });
            }
            
            return css;
          };
          
          return generateNodeStyles(node, breakpoint);
        }).join('\n')}
      </style>
      
      {/* Isolate rendered HTML to prevent position:fixed from escaping */}
      <div style={{ 
        position: 'relative', 
        isolation: 'isolate',
        width: '100%',
        minHeight: '100%',
        overflow: 'hidden',
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
  
  // Get styles for current breakpoint
  const styles = node.styles?.[breakpoint] || {};
  
  // Merge layout properties, inline styles, and responsive styles
  const finalStyles: React.CSSProperties = {
    ...(node.layout as React.CSSProperties),
    ...node.inlineStyles,
    ...styles,
  };
  
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
  
  // Combine ALL refs into a single callback
  const setCombinedRefs = useCallback((el: Element | null) => {
    const htmlEl = el as HTMLElement | null;
    setDraggableRef(htmlEl);
    setBeforeDropRef(htmlEl);
    setAfterDropRef(htmlEl);
    setInnerDropRef(htmlEl);
  }, [setDraggableRef, setBeforeDropRef, setAfterDropRef, setInnerDropRef]);

  // Handle text-only nodes (convert 'text' tag to span)
  if (node.tag === 'text' || node.type === 'text') {
    const spanElement = (
      <span
        ref={setCombinedRefs}
        {...draggableAttributes}
        {...draggableListeners}
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
    return (
      <div style={{ display: 'inline', position: 'relative' }}>
        <Tag
          ref={setCombinedRefs}
          {...draggableAttributes}
          {...draggableListeners}
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
          {...node.attributes}
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
      {...node.attributes}
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
