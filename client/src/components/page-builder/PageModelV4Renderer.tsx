import { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react';
import { PageModelV4, PageNodeV4 } from '@shared/schema';
import { isComponentInstance, getInstanceStyles, getInstanceAttributes, getInstanceTextContent } from '@/lib/componentInstance';
import { cn } from '@/lib/utils';
import { HoverTooltip } from './HoverTooltip';
import { SelectionToolbar } from './SelectionToolbar';
import { SelectionOverlay } from './SelectionOverlay';
import { InlineTextToolbar } from './InlineTextToolbar';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { canAcceptChild } from './tree-helpers';
import { useStylesheetManager, generateOverrideCss } from '@/hooks/useStylesheetManager';

// Normalize HTML attributes to React props (fixes imported HTML compatibility)
function normalizeAttributes(tag: string, attributes: Record<string, any> = {}): Record<string, any> {
  const normalized: Record<string, any> = {};
  
  // Map of HTML attributes to React props
  const attrMap: Record<string, string> = {
    'class': 'className', // CRITICAL: Most common HTML attribute
    'allowfullscreen': 'allowFullScreen',
    'frameborder': 'frameBorder',
    'marginwidth': 'marginWidth',
    'marginheight': 'marginHeight',
    'charset': 'charSet',
    'classname': 'className',
    'for': 'htmlFor',
    'tabindex': 'tabIndex',
    'readonly': 'readOnly',
    'maxlength': 'maxLength',
    'cellpadding': 'cellPadding',
    'cellspacing': 'cellSpacing',
    'colspan': 'colSpan',
    'rowspan': 'rowSpan',
    'usemap': 'useMap',
    'datetime': 'dateTime',
    'accesskey': 'accessKey',
    'contenteditable': 'contentEditable'
  };
  
  for (const [key, value] of Object.entries(attributes)) {
    const lowerKey = key.toLowerCase();
    
    // Skip class/className - they're handled separately via node.classNames
    if (lowerKey === 'class' || lowerKey === 'classname') {
      continue;
    }
    
    // Use mapped React prop if available
    if (attrMap[lowerKey]) {
      normalized[attrMap[lowerKey]] = value;
    } else {
      normalized[key] = value;
    }
  }
  
  // For iframes: enforce sandbox mode to prevent script execution and focus stealing
  if (tag === 'iframe') {
    normalized.sandbox = 'allow-same-origin'; // Prevents scripts, allows styling
    
    // Safely merge pointerEvents into existing styles
    if (typeof normalized.style === 'string') {
      // Keep existing inline style string and add pointerEvents
      normalized.style = `${normalized.style}; pointer-events: none;`;
    } else if (normalized.style && typeof normalized.style === 'object') {
      // Merge with existing style object
      normalized.style = { ...normalized.style, pointerEvents: 'none' };
    } else {
      // No existing style, create new object
      normalized.style = { pointerEvents: 'none' };
    }
  }
  
  return normalized;
}

// Helper function to find a node in the tree
function findNodeInTree(nodes: PageNodeV4[], nodeId: string): PageNodeV4 | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    if (node.children) {
      const found = findNodeInTree(node.children, nodeId);
      if (found) return found;
    }
  }
  return null;
}

interface PageModelV4RendererProps {
  model: PageModelV4;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  onDuplicateNode?: () => void;
  onDeleteNode?: () => void;
  onUpdateNode?: (updates: Partial<PageNodeV4>) => void;
  breakpoint?: 'desktop' | 'tablet' | 'mobile';
  savedComponents?: any[]; // For component instances to get base component
}

export function PageModelV4Renderer({ 
  model, 
  selectedNodeId, 
  onSelectNode,
  onDuplicateNode,
  onDeleteNode,
  onUpdateNode,
  breakpoint = 'desktop',
  savedComponents = []
}: PageModelV4RendererProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredNodeInfo, setHoveredNodeInfo] = useState<{ 
    tag: string; 
    classNames: string[]; 
    dimensions?: { width: number; height: number };
    hasResponsiveOverrides?: boolean;
  } | null>(null);
  
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
    // Find node to check for responsive overrides using the helper
    const node = findNodeInTree(model.nodes, nodeId);
    const hasResponsiveOverrides = node?.styles 
      ? (!!node.styles.mobile || !!node.styles.tablet)
      : false;
    setHoveredNodeInfo({ tag, classNames, dimensions, hasResponsiveOverrides });
  }, [model.nodes]);

  const handleMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
    setHoveredNodeInfo(null);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  }, []);

  // Sanitize global styles to remove unwanted overflow and scrollbar rules
  const sanitizeGlobalStyles = useCallback((css: string): string => {
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
  }, []);

  // Generate override styles with maximum specificity using IDs
  const generateOverrideStyles = useCallback((nodes: PageNodeV4[]): string => {
    let css = '';
    
    const processNode = (node: PageNodeV4) => {
      // Get effective styles for component instances
      let styles: Record<string, any> = {};
      if (isComponentInstance(node)) {
        const baseComponent = savedComponents.find(c => c.id === node.componentRef);
        const baseNode = baseComponent?.node || null;
        styles = getInstanceStyles(node, baseNode, breakpoint);
      } else {
        styles = node.styles?.[breakpoint] || {};
      }
      
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
  }, [breakpoint, savedComponents]);
  
  // Memoize sanitized global styles
  const sanitizedGlobalStyles = useMemo(() => {
    return model.globalStyles ? sanitizeGlobalStyles(model.globalStyles) : '';
  }, [model.globalStyles, sanitizeGlobalStyles]);
  
  // Memoize override styles
  const overrideStyles = useMemo(() => {
    return generateOverrideStyles(model.nodes);
  }, [model.nodes, generateOverrideStyles]);

  return (
    <div 
      className="page-frame w-full h-full page-renderer-reset" 
      style={{ position: 'relative', zIndex: 0, overflow: 'visible' }}
      onMouseMove={handleMouseMove}
    >
      {/* Inject global CSS (variables, resets, classes) */}
      {/* Font Awesome is loaded globally in index.html */}
      {sanitizedGlobalStyles && (
        <style dangerouslySetInnerHTML={{ 
          __html: sanitizedGlobalStyles 
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
            onUpdateNode={onUpdateNode}
            breakpoint={breakpoint}
            savedComponents={savedComponents}
          />
        ))}
      </div>
      
      {/* CRITICAL: Inject user overrides AFTER rendered content to win cascade order */}
      {/* This ensures overrides come after any <style> tags embedded in the imported HTML */}
      {overrideStyles && (
        <style id="user-overrides" dangerouslySetInnerHTML={{
          __html: overrideStyles
        }} />
      )}
      
      {/* Hover Tooltip */}
      {hoveredNodeInfo && (
        <HoverTooltip
          tag={hoveredNodeInfo.tag}
          classNames={hoveredNodeInfo.classNames}
          dimensions={hoveredNodeInfo.dimensions}
          position={mousePosition}
          visible={!!hoveredNodeId && hoveredNodeId !== selectedNodeId}
          hasResponsiveOverrides={hoveredNodeInfo.hasResponsiveOverrides}
        />
      )}
    </div>
  );
}

interface PageNodeV4RendererProps {
  node: PageNodeV4;
  selectedNodeId?: string | null;
  hoveredNodeId?: string | null;
  onSelectNode?: (nodeId: string, modifiers?: { ctrlKey?: boolean; shiftKey?: boolean; metaKey?: boolean; altKey?: boolean }) => void;
  onMouseEnter?: (nodeId: string, tag: string, classNames: string[], dimensions?: { width: number; height: number }) => void;
  onMouseLeave?: () => void;
  onDuplicateNode?: () => void;
  onDeleteNode?: () => void;
  onUpdateNode?: (updates: Partial<PageNodeV4>) => void;
  breakpoint: 'desktop' | 'tablet' | 'mobile';
  savedComponents?: any[];
}

const PageNodeV4Renderer = memo(function PageNodeV4Renderer({ 
  node, 
  selectedNodeId,
  hoveredNodeId,
  onSelectNode,
  onMouseEnter,
  onMouseLeave,
  onDuplicateNode,
  onDeleteNode,
  onUpdateNode,
  breakpoint,
  savedComponents = []
}: PageNodeV4RendererProps) {
  const isSelected = selectedNodeId === node.id;
  const isHovered = hoveredNodeId === node.id && !isSelected;
  
  // Get base component if this is an instance
  const baseComponent = node.componentRef 
    ? savedComponents.find(c => c.id === node.componentRef)
    : null;
  const baseNode = baseComponent?.node || null;
  
  // Get effective attributes and text content for component instances
  const effectiveAttributes = isComponentInstance(node) 
    ? getInstanceAttributes(node, baseNode)
    : node.attributes || {};
  const effectiveTextContent = isComponentInstance(node)
    ? (getInstanceTextContent(node, baseNode) ?? node.textContent)
    : node.textContent;
  
  // Drag and drop
  const { attributes: draggableAttributes, listeners: draggableListeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
    id: `node-${node.id}`,
    data: {
      kind: 'node',
      nodeId: node.id,
    },
  });
  
  // Debug listeners
  useEffect(() => {
    if (isSelected) {
      console.log('🎯 Selected node listeners:', node.id, {
        hasListeners: !!draggableListeners,
        listenerKeys: Object.keys(draggableListeners || {}),
        listeners: draggableListeners
      });
    }
  }, [isSelected, node.id, draggableListeners]);

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
  // For component instances, use effective styles (base + overrides)
  const styles = isComponentInstance(node)
    ? getInstanceStyles(node, baseNode, breakpoint)
    : (node.styles?.[breakpoint] || {});
  
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
  
  // Add cursor:grab for draggable elements
  if (draggableListeners && !isDragging) {
    finalStyles.cursor = 'grab';
  } else if (isDragging) {
    finalStyles.cursor = 'grabbing';
  }
  
  // FIX: Remove unwanted overflow:auto that creates spurious scrollbars
  // Only allow overflow:auto on explicit scrollable containers (divs with specific class/role)
  const allowScrollbarTags = ['textarea', 'pre', 'code'];
  const isScrollableContainer = node.classNames?.some(c => 
    c.includes('scroll') || c.includes('overflow')
  ) || effectiveAttributes?.role === 'region';
  
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
    // Don't stop propagation during drag - it breaks @dnd-kit sensors
    if (!isDragging) {
      e.stopPropagation();
    }
    if (onSelectNode) {
      onSelectNode(node.id, { 
        ctrlKey: e.ctrlKey, 
        shiftKey: e.shiftKey,
        metaKey: e.metaKey,
        altKey: e.altKey
      });
    }
  };

  // Handle hover events
  const handleMouseEnterNode = (e: React.MouseEvent) => {
    // Don't stopPropagation - let drag events bubble
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
    // Don't stopPropagation - let drag events bubble
    if (onMouseLeave) {
      onMouseLeave();
    }
  };
  
  // Combine refs - drag ref is applied to the element, drop refs are disabled for now
  const setCombinedRefs = useCallback((el: Element | null) => {
    const htmlEl = el as HTMLElement | null;
    setDraggableRef(htmlEl); // Only drag ref for now to fix listeners issue
    (elementRef as any).current = htmlEl; // Also set our ref for direct style manipulation
  }, [setDraggableRef]);

  // Handle text-only nodes (convert 'text' tag to span)
  if (node.tag === 'text' || node.type === 'text') {
    return (
      <span
        ref={setDraggableRef}
        {...draggableAttributes}
        {...draggableListeners}
        {...normalizeAttributes('span', effectiveAttributes)}
        id={uniqueStyleId}
        data-node-id={node.id}
        data-testid={`node-text-${node.id}`}
        className={cn(
          node.classNames?.join(' '),
          isHovered && 'editor-node-hovered',
          isDragging && 'opacity-30'
        )}
        style={finalStyles}
        onClick={handleClick}
        onMouseEnter={handleMouseEnterNode}
        onMouseLeave={handleMouseLeaveNode}
      >
        {effectiveTextContent}
        
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
  }
  
  // Get the tag name (default to div if not specified)
  const Tag = (node.tag || 'div') as any;
  
  // Check if node is a self-closing tag
  const isSelfClosing = ['img', 'input', 'br', 'hr', 'meta', 'link'].includes(node.tag);
  
  // CRITICAL: For self-closing tags, we MUST NOT render children or textContent
  if (isSelfClosing) {
    // Handle responsive images - normalize attributes first
    // Use effective attributes for component instances
    let finalAttributes = normalizeAttributes(node.tag, effectiveAttributes);
    if (node.tag === 'img') {
      // Priority 1: Check responsiveAttributes for the current breakpoint
      const responsiveSrc = node.responsiveAttributes?.src?.[breakpoint];
      
      // Priority 2: Check data-src attributes (use effective attributes for instances)
      const dataSrcDesktop = effectiveAttributes?.['data-src-desktop'];
      const dataSrcMobile = effectiveAttributes?.['data-src-mobile'];
      
      // Priority 3: Regular src attribute (use effective attributes for instances)
      const baseSrc = effectiveAttributes?.src;
      
      // Debug: Log image src resolution
      console.log('🖼️ Image rendering:', {
        nodeId: node.id,
        breakpoint,
        responsiveSrc,
        dataSrcDesktop,
        dataSrcMobile,
        baseSrc,
        responsiveAttributes: node.responsiveAttributes
      });
      
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
      
      console.log('🖼️ Final src:', finalAttributes.src);
      
    }
    
    return (
      <div style={{ display: 'inline', position: 'relative' }}>
        <Tag
          key={`${node.id}-${finalAttributes.src || 'no-src'}`}
          ref={setDraggableRef}
          {...draggableAttributes}
          {...draggableListeners}
          {...finalAttributes}
          id={uniqueStyleId}
          data-node-id={node.id}
          data-testid={`node-${node.tag}-${node.id}`}
          className={cn(
            node.classNames?.join(' '),
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
      ref={setDraggableRef}
      {...draggableAttributes}
      {...draggableListeners}
      {...normalizeAttributes(node.tag, effectiveAttributes)}
      id={uniqueStyleId}
      data-node-id={node.id}
      data-testid={`node-${node.tag}-${node.id}`}
      className={cn(
        node.classNames?.join(' '),
        isHovered && 'editor-node-hovered',
        isDragging && 'opacity-30'
      )}
      style={finalStyles}
      onClick={handleClick}
      onMouseEnter={handleMouseEnterNode}
      onMouseLeave={handleMouseLeaveNode}
    >
      {effectiveTextContent}
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
          onUpdateNode={onUpdateNode}
          breakpoint={breakpoint}
          savedComponents={savedComponents}
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
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  if (prevProps.node.id !== nextProps.node.id) return false;
  if (prevProps.selectedNodeId !== nextProps.selectedNodeId) return false;
  if (prevProps.hoveredNodeId !== nextProps.hoveredNodeId) return false;
  if (prevProps.breakpoint !== nextProps.breakpoint) return false;
  
  // Deep comparison of node data
  const prevNode = prevProps.node;
  const nextNode = nextProps.node;
  
  if (prevNode.textContent !== nextNode.textContent) return false;
  if (JSON.stringify(prevNode.styles) !== JSON.stringify(nextNode.styles)) return false;
  if (JSON.stringify(prevNode.attributes) !== JSON.stringify(nextNode.attributes)) return false;
  if (JSON.stringify(prevNode.classNames) !== JSON.stringify(nextNode.classNames)) return false;
  if (prevNode.children?.length !== nextNode.children?.length) return false;
  
  // Compare component instance overrides
  if (JSON.stringify(prevNode.componentRef) !== JSON.stringify(nextNode.componentRef)) return false;
  if (JSON.stringify(prevNode.instanceOverrides) !== JSON.stringify(nextNode.instanceOverrides)) return false;
  
  return true;
});
