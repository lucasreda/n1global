import { useState } from 'react';
import { PageModelV4, PageNodeV4 } from '@shared/schema';
import { cn } from '@/lib/utils';

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
  return (
    <div className="page-frame w-full h-full overflow-auto">
      {model.nodes.map(node => (
        <PageNodeV4Renderer 
          key={node.id} 
          node={node}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          breakpoint={breakpoint}
        />
      ))}
    </div>
  );
}

interface PageNodeV4RendererProps {
  node: PageNodeV4;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  breakpoint: 'desktop' | 'tablet' | 'mobile';
}

function PageNodeV4Renderer({ 
  node, 
  selectedNodeId, 
  onSelectNode,
  breakpoint 
}: PageNodeV4RendererProps) {
  const isSelected = selectedNodeId === node.id;
  
  // Get styles for current breakpoint
  const styles = node.styles?.[breakpoint] || {};
  
  // Merge inline styles with responsive styles
  const finalStyles = {
    ...node.inlineStyles,
    ...styles,
  };
  
  // Handle click to select node
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelectNode) {
      onSelectNode(node.id);
    }
  };
  
  // Handle text-only nodes (convert 'text' tag to span)
  if (node.tag === 'text' || node.type === 'text') {
    return (
      <span
        data-node-id={node.id}
        data-testid={`node-text-${node.id}`}
        className={cn(
          node.classNames?.join(' '),
          isSelected && 'ring-2 ring-blue-500 ring-offset-2'
        )}
        style={finalStyles}
        onClick={handleClick}
      >
        {node.textContent}
      </span>
    );
  }
  
  // Get the tag name (default to div if not specified)
  const Tag = (node.tag || 'div') as keyof JSX.IntrinsicElements;
  
  // Check if node is a self-closing tag
  const isSelfClosing = ['img', 'input', 'br', 'hr', 'meta', 'link'].includes(node.tag);
  
  return (
    <Tag
      data-node-id={node.id}
      data-testid={`node-${node.tag}-${node.id}`}
      className={cn(
        node.classNames?.join(' '),
        isSelected && 'ring-2 ring-blue-500 ring-offset-2'
      )}
      style={finalStyles}
      onClick={handleClick}
      {...node.attributes}
    >
      {/* Render text content if exists */}
      {!isSelfClosing && node.textContent}
      
      {/* Recursively render children */}
      {!isSelfClosing && node.children?.map(child => (
        <PageNodeV4Renderer 
          key={child.id} 
          node={child}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          breakpoint={breakpoint}
        />
      ))}
    </Tag>
  );
}
