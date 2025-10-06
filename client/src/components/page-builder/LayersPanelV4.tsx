import { useState } from 'react';
import { PageNodeV4 } from '@shared/schema';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayersPanelV4Props {
  nodes: PageNodeV4[];
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
}

export function LayersPanelV4({ nodes, selectedNodeId, onSelectNode }: LayersPanelV4Props) {
  return (
    <div className="layers-panel-v4 p-4 overflow-auto">
      <h3 className="font-semibold mb-3 text-sm uppercase text-muted-foreground">
        Camadas
      </h3>
      <div className="space-y-1">
        {nodes.map(node => (
          <LayerNodeV4
            key={node.id}
            node={node}
            depth={0}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
          />
        ))}
      </div>
    </div>
  );
}

interface LayerNodeV4Props {
  node: PageNodeV4;
  depth: number;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
}

function LayerNodeV4({ node, depth, selectedNodeId, onSelectNode }: LayerNodeV4Props) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNodeId === node.id;

  const handleClick = () => {
    if (onSelectNode) {
      onSelectNode(node.id);
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer hover:bg-accent/50 transition-colors',
          isSelected && 'bg-primary/10 border border-primary/30'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        data-testid={`layer-node-${node.id}`}
      >
        {/* Expand/Collapse Toggle */}
        {hasChildren ? (
          <button
            onClick={toggleExpand}
            className="w-4 h-4 flex items-center justify-center hover:bg-accent rounded"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}

        {/* Tag Name */}
        <span className="text-purple-600 text-sm font-mono">
          &lt;{node.tag}&gt;
        </span>

        {/* Text Preview */}
        {node.textContent && (
          <span className="text-xs text-muted-foreground truncate ml-2">
            {node.textContent.substring(0, 30)}
            {node.textContent.length > 30 && '...'}
          </span>
        )}

        {/* ID Badge */}
        <span className="text-xs text-muted-foreground ml-auto font-mono">
          #{node.id.substring(0, 6)}
        </span>
      </div>

      {/* Render Children */}
      {expanded && hasChildren && (
        <div className="ml-1">
          {node.children!.map(child => (
            <LayerNodeV4
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
