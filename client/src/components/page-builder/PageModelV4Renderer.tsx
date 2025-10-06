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
    <div className="page-frame w-full h-full overflow-auto page-renderer-reset" style={{ position: 'relative', zIndex: 0 }}>
      {/* Inject global CSS (variables, resets, classes) */}
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
            onSelectNode={onSelectNode}
            breakpoint={breakpoint}
          />
        ))}
      </div>
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
  const finalStyles: React.CSSProperties = {
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
        data-node-id={node.id}
        data-testid={`node-${node.tag}-${node.id}`}
        className={cn(
          node.classNames?.join(' '),
          isSelected && 'ring-2 ring-blue-500 ring-offset-2'
        )}
        style={finalStyles}
        onClick={handleClick}
        {...node.attributes}
      />
    );
  }
  
  // Regular elements with children/text
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
      {node.textContent}
      {node.children?.map(child => (
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
