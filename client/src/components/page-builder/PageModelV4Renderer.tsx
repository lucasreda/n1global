import { useState, useCallback } from 'react';
import { PageModelV4, PageNodeV4 } from '@shared/schema';
import { cn } from '@/lib/utils';
import { HoverTooltip } from './HoverTooltip';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { canAcceptChild } from './tree-helpers';

interface PageModelV4RendererProps {
  model: PageModelV4;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  breakpoint?: 'desktop' | 'tablet' | 'mobile';
}

export function PageModelV4Renderer({ 
  model, 
  selectedNodeId, 
  onSelectNode,
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

  return (
    <div 
      className="page-frame w-full h-full overflow-auto page-renderer-reset" 
      style={{ position: 'relative', zIndex: 0 }}
      onMouseMove={handleMouseMove}
    >
      {/* Inject global CSS (variables, resets, classes) */}
      {/* Font Awesome is loaded globally in index.html */}
      {model.globalStyles && (
        <style dangerouslySetInnerHTML={{ __html: model.globalStyles }} />
      )}
      
      {/* Isolate rendered HTML to prevent position:fixed from escaping */}
      <div style={{ position: 'relative', isolation: 'isolate' }}>
        {model.nodes.map(node => (
          <PageNodeV4Renderer 
            key={node.id} 
            node={node}
            selectedNodeId={selectedNodeId}
            hoveredNodeId={hoveredNodeId}
            onSelectNode={onSelectNode}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
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
  breakpoint: 'desktop' | 'tablet' | 'mobile';
}

function PageNodeV4Renderer({ 
  node, 
  selectedNodeId,
  hoveredNodeId,
  onSelectNode,
  onMouseEnter,
  onMouseLeave,
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
    ...node.layout,
    ...node.inlineStyles,
    ...styles,
  };
  
  // CRITICAL: Convert position:fixed to position:absolute to confine elements within canvas
  // This prevents HTML content from escaping the preview area and overlaying editor controls
  if (finalStyles.position === 'fixed') {
    finalStyles.position = 'absolute';
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
    return (
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
      </span>
    );
  }
  
  // Get the tag name (default to div if not specified)
  const Tag = (node.tag || 'div') as keyof JSX.IntrinsicElements;
  
  // Check if node is a self-closing tag
  const isSelfClosing = ['img', 'input', 'br', 'hr', 'meta', 'link'].includes(node.tag);
  
  // DEBUG: Log img nodes with children
  if (node.tag === 'img' && node.children && node.children.length > 0) {
    console.error('❌ IMG NODE HAS CHILDREN (THIS SHOULD NEVER HAPPEN):', {
      nodeId: node.id,
      childrenCount: node.children.length,
      children: node.children
    });
  }
  
  // CRITICAL: For self-closing tags, we MUST NOT render children or textContent
  if (isSelfClosing) {
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
      />
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
          breakpoint={breakpoint}
        />
      ))}
    </Tag>
  );
}
