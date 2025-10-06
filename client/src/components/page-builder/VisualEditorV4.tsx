import { useState, useCallback } from 'react';
import { PageModelV4, PageNodeV4, ResponsiveStylesV4 } from '@shared/schema';
import { PageModelV4Renderer } from './PageModelV4Renderer';
import { LayersPanelV4 } from './LayersPanelV4';
import { PropertiesPanelV4 } from './PropertiesPanelV4';
import { ElementsToolbarV4 } from './ElementsToolbarV4';
import { FloatingToolbarV4 } from './FloatingToolbarV4';
import { nanoid } from 'nanoid';

interface VisualEditorV4Props {
  model: PageModelV4;
  onChange: (model: PageModelV4) => void;
  viewport: 'desktop' | 'tablet' | 'mobile';
  onViewportChange: (viewport: 'desktop' | 'tablet' | 'mobile') => void;
  showElements?: boolean;
  showLayers?: boolean;
  showProperties?: boolean;
  className?: string;
}

export function VisualEditorV4({ 
  model, 
  onChange, 
  viewport, 
  onViewportChange, 
  showElements = true,
  showLayers = false,
  showProperties = true,
  className = "" 
}: VisualEditorV4Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const handleSelectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
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
        const updated: PageNodeV4 = { ...node };
        
        if (updates.attributes !== undefined) {
          updated.attributes = { ...node.attributes, ...updates.attributes };
        }
        
        if (updates.styles !== undefined) {
          updated.styles = deepMergeStyles(node.styles, updates.styles);
        }
        
        if (updates.inlineStyles !== undefined) {
          updated.inlineStyles = { ...node.inlineStyles, ...updates.inlineStyles };
        }
        
        if (updates.textContent !== undefined) updated.textContent = updates.textContent;
        if (updates.tag) updated.tag = updates.tag;
        if (updates.classNames) updated.classNames = updates.classNames;
        if (updates.children) updated.children = updates.children;
        if (updates.states) updated.states = updates.states;
        
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

  const handleInsertElement = useCallback((node: PageNodeV4) => {
    onChange({
      ...model,
      nodes: [...model.nodes, node],
    });
  }, [model, onChange]);

  const handleDeleteNode = useCallback(() => {
    if (!selectedNodeId) return;

    const deleteFromTree = (nodes: PageNodeV4[]): PageNodeV4[] => {
      return nodes.filter(node => {
        if (node.id === selectedNodeId) return false;
        if (node.children) {
          node.children = deleteFromTree(node.children);
        }
        return true;
      });
    };

    onChange({
      ...model,
      nodes: deleteFromTree(model.nodes),
    });
    
    setSelectedNodeId(null);
  }, [selectedNodeId, model, onChange]);

  const handleDuplicateNode = useCallback(() => {
    if (!selectedNodeId) return;

    const duplicateNode = (node: PageNodeV4): PageNodeV4 => {
      return {
        ...node,
        id: nanoid(),
        children: node.children?.map(duplicateNode),
      };
    };

    const selectedNode = findNodeInTree(model.nodes, selectedNodeId);
    if (!selectedNode) return;

    const duplicated = duplicateNode(selectedNode);
    onChange({
      ...model,
      nodes: [...model.nodes, duplicated],
    });
  }, [selectedNodeId, model, onChange]);

  const selectedNode = selectedNodeId ? findNodeInTree(model.nodes, selectedNodeId) : null;

  return (
    <div className={`flex h-full ${className}`}>
      {/* Elements Toolbar */}
      {showElements && (
        <div className="w-56 border-r">
          <ElementsToolbarV4 onInsertElement={handleInsertElement} />
        </div>
      )}

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
      <div className="flex-1 p-4 bg-gray-50 overflow-auto relative">
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

        {/* Floating Toolbar */}
        {selectedNode && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <FloatingToolbarV4
              node={selectedNode}
              position={{ x: 0, y: 0 }}
              breakpoint={viewport}
              onUpdateNode={handleUpdateNode}
              onDeleteNode={handleDeleteNode}
              onDuplicateNode={handleDuplicateNode}
              onMoveNode={() => {}}
            />
          </div>
        )}
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
