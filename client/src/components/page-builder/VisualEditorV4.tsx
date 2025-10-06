import { useState, useCallback } from 'react';
import { PageModelV4, PageNodeV4 } from '@shared/schema';
import { PageModelV4Renderer } from './PageModelV4Renderer';
import { LayersPanelV4 } from './LayersPanelV4';
import { PropertiesPanelV4 } from './PropertiesPanelV4';
import { Button } from '@/components/ui/button';
import { Plus, Layers, Settings } from 'lucide-react';

interface VisualEditorV4Props {
  model: PageModelV4;
  onChange: (model: PageModelV4) => void;
  viewport: 'desktop' | 'tablet' | 'mobile';
  onViewportChange: (viewport: 'desktop' | 'tablet' | 'mobile') => void;
  className?: string;
}

export function VisualEditorV4({ 
  model, 
  onChange, 
  viewport, 
  onViewportChange, 
  className = "" 
}: VisualEditorV4Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showLayers, setShowLayers] = useState(false);
  const [showProperties, setShowProperties] = useState(true);

  const handleSelectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setShowProperties(true);
  }, []);

  const findNodeInTree = (nodes: PageNodeV4[], id: string): PageNodeV4 | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeInTree(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const deepMergeStyles = (
    existing: ResponsiveStylesV4 | undefined,
    updates: Partial<ResponsiveStylesV4> | undefined
  ): ResponsiveStylesV4 => {
    if (!updates) return existing || { desktop: {}, tablet: {}, mobile: {} };
    
    const result: ResponsiveStylesV4 = {
      desktop: { ...(existing?.desktop || {}) },
      tablet: { ...(existing?.tablet || {}) },
      mobile: { ...(existing?.mobile || {}) },
    };
    
    // Apenas merge breakpoints que vêm no update
    if (updates.desktop) {
      result.desktop = { ...result.desktop, ...updates.desktop };
    }
    if (updates.tablet) {
      result.tablet = { ...result.tablet, ...updates.tablet };
    }
    if (updates.mobile) {
      result.mobile = { ...result.mobile, ...updates.mobile };
    }
    
    return result;
  };

  const updateNodeInTree = (nodes: PageNodeV4[], id: string, updates: Partial<PageNodeV4>): PageNodeV4[] => {
    return nodes.map(node => {
      if (node.id === id) {
        // Deep merge para preservar dados nested
        const updated: PageNodeV4 = { ...node };
        
        // Merge attributes preservando existentes
        if (updates.attributes !== undefined) {
          updated.attributes = { ...node.attributes, ...updates.attributes };
        }
        
        // Merge styles com lógica de breakpoint inteligente
        if (updates.styles !== undefined) {
          updated.styles = deepMergeStyles(node.styles, updates.styles);
        }
        
        // Merge inlineStyles
        if (updates.inlineStyles !== undefined) {
          updated.inlineStyles = { ...node.inlineStyles, ...updates.inlineStyles };
        }
        
        // Outros campos podem ser substituídos diretamente
        if (updates.textContent !== undefined) updated.textContent = updates.textContent;
        if (updates.tag) updated.tag = updates.tag;
        if (updates.classNames) updated.classNames = updates.classNames;
        if (updates.children) updated.children = updates.children;
        
        return updated;
      }
      if (node.children) {
        return {
          ...node,
          children: updateNodeInTree(node.children, id, updates),
        };
      }
      return node;
    });
  };

  const handleUpdateNode = useCallback((updates: Partial<PageNodeV4>) => {
    if (!selectedNodeId) return;
    
    const updatedNodes = updateNodeInTree(model.nodes, selectedNodeId, updates);
    onChange({
      ...model,
      nodes: updatedNodes,
    });
  }, [selectedNodeId, model, onChange]);

  const selectedNode = selectedNodeId ? findNodeInTree(model.nodes, selectedNodeId) : null;

  return (
    <div className={`flex h-full ${className}`}>
      {/* Left Sidebar - Elements Toolbar */}
      <div className="w-16 border-r bg-background flex flex-col items-center py-4 gap-2">
        <Button
          variant={showLayers ? "default" : "ghost"}
          size="icon"
          onClick={() => setShowLayers(!showLayers)}
          title="Camadas"
          data-testid="button-toggle-layers"
        >
          <Layers className="h-5 w-5" />
        </Button>
        <Button
          variant={showProperties ? "default" : "ghost"}
          size="icon"
          onClick={() => setShowProperties(!showProperties)}
          title="Propriedades"
          data-testid="button-toggle-properties"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {/* Layers Panel */}
      {showLayers && (
        <div className="w-64 border-r bg-background overflow-auto">
          <LayersPanelV4
            nodes={model.nodes}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
          />
        </div>
      )}

      {/* Center - Canvas */}
      <div className="flex-1 p-4 bg-gray-50 overflow-auto">
        <div 
          className="mx-auto bg-white shadow-lg"
          style={{
            width: viewport === 'desktop' ? '100%' : viewport === 'tablet' ? '768px' : '375px',
            minHeight: '100vh'
          }}
        >
          <PageModelV4Renderer
            model={model}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
            breakpoint={viewport}
          />
        </div>
      </div>

      {/* Right Sidebar - Properties Panel */}
      {showProperties && (
        <div className="w-80 border-l bg-background overflow-auto">
          <PropertiesPanelV4
            node={selectedNode}
            onUpdateNode={handleUpdateNode}
          />
        </div>
      )}
    </div>
  );
}
