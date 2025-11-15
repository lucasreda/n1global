import { useState, useMemo, useCallback } from 'react';
import { PageNodeV4 } from '@shared/schema';
import { ChevronRight, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface LayersPanelV4Props {
  nodes: PageNodeV4[];
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
}

// Flatten tree for virtualization
interface FlattenedLayer {
  id: string;
  node: PageNodeV4;
  depth: number;
  isVisible: boolean;
}

function flattenNodes(
  nodes: PageNodeV4[], 
  depth = 0, 
  expandedIds = new Set<string>(), 
  searchTerm = ''
): FlattenedLayer[] {
  const result: FlattenedLayer[] = [];
  
  const matchesSearch = (node: PageNodeV4, term: string): boolean => {
    if (!term) return true;
    const search = term.toLowerCase();
    return (
      node.tag.toLowerCase().includes(search) ||
      node.textContent?.toLowerCase().includes(search) ||
      node.id.toLowerCase().includes(search) ||
      node.classNames?.some(c => c.toLowerCase().includes(search))
    ) || false;
  };

  const shouldTraverse = (node: PageNodeV4, term: string): boolean => {
    if (!term) return true;
    // Check if any child matches
    if (node.children) {
      return node.children.some(child => matchesSearch(child, term) || shouldTraverse(child, term));
    }
    return false;
  };

  for (const node of nodes) {
    const isVisible = matchesSearch(node, searchTerm) || shouldTraverse(node, searchTerm);
    
    if (isVisible) {
      result.push({ id: node.id, node, depth, isVisible: true });
      
      // Traverse children if expanded or search is active
      const hasExpanded = expandedIds.has(node.id) || searchTerm.length > 0;
      const hasChildren = node.children && node.children.length > 0;
      
      if (hasExpanded && hasChildren) {
        result.push(...flattenNodes(node.children!, depth + 1, expandedIds, searchTerm));
      }
    }
  }
  
  return result;
}

export function LayersPanelV4({ nodes, selectedNodeId, onSelectNode }: LayersPanelV4Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  
  // Flatten tree for virtualization
  const flattenedLayers = useMemo(() => {
    return flattenNodes(nodes, 0, expandedIds, searchTerm);
  }, [nodes, expandedIds, searchTerm]);
  
  const toggleExpand = useCallback((nodeId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);
  
  return (
    <div className="layers-panel-v4 flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold mb-3 text-sm uppercase text-muted-foreground dark:text-gray-300">
          Camadas {flattenedLayers.length > 0 && `(${flattenedLayers.length})`}
        </h3>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar elemento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-8 h-8 text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 pt-2">
        <div className="space-y-1">
          {flattenedLayers.map(({ id, node, depth }) => (
            <LayerNodeV4
              key={id}
              node={node}
              depth={depth}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface LayerNodeV4Props {
  node: PageNodeV4;
  depth: number;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  expandedIds?: Set<string>;
  onToggleExpand?: (nodeId: string) => void;
}

function LayerNodeV4({ 
  node, 
  depth, 
  selectedNodeId, 
  onSelectNode,
  expandedIds,
  onToggleExpand
}: LayerNodeV4Props) {
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNodeId === node.id;
  const isExpanded = expandedIds?.has(node.id) ?? true;

  const handleClick = () => {
    if (onSelectNode) {
      onSelectNode(node.id);
    }
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleExpand) {
      onToggleExpand(node.id);
    }
  };

  return (
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
          onClick={handleToggleExpand}
          className="w-4 h-4 flex items-center justify-center hover:bg-accent rounded"
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
      ) : (
        <div className="w-4" />
      )}

      {/* Tag Name */}
      <span className="text-purple-600 dark:text-purple-400 text-sm font-mono">
        &lt;{node.tag}&gt;
      </span>

      {/* Text Preview */}
      {node.textContent && (
        <span className="text-xs text-muted-foreground dark:text-gray-400 truncate ml-2">
          {node.textContent.substring(0, 30)}
          {node.textContent.length > 30 && '...'}
        </span>
      )}

      {/* ID Badge */}
      <span className="text-xs text-muted-foreground dark:text-gray-400 ml-auto font-mono">
        #{node.id.substring(0, 6)}
      </span>
    </div>
  );
}
