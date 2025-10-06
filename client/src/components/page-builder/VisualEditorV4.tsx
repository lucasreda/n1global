import { useState, useCallback } from 'react';
import { PageModelV4, PageNodeV4, ResponsiveStylesV4 } from '@shared/schema';
import { PageModelV4Renderer } from './PageModelV4Renderer';
import { LayersPanelV4 } from './LayersPanelV4';
import { PropertiesPanelV4 } from './PropertiesPanelV4';
import { ElementsToolbarV4 } from './ElementsToolbarV4';
import { FloatingToolbarV4 } from './FloatingToolbarV4';
import { useHistoryV4 } from './HistoryManagerV4';
import { Button } from '@/components/ui/button';
import { Layers, Settings, Undo2, Redo2 } from 'lucide-react';
import { nanoid } from 'nanoid';

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
  const [showElements, setShowElements] = useState(true);

  // History/Undo-Redo
  const { addToHistory, undo, redo, canUndo, canRedo } = useHistoryV4(model);

  const handleModelChange = useCallback((newModel: PageModelV4, description = 'Edit') => {
    onChange(newModel);
    addToHistory(newModel, description);
  }, [onChange, addToHistory]);

  const handleUndo = () => {
    const previousModel = undo();
    if (previousModel) {
      onChange(previousModel);
    }
  };

  const handleRedo = () => {
    const nextModel = redo();
    if (nextModel) {
      onChange(nextModel);
    }
  };

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
    handleModelChange({
      ...model,
      nodes: updatedNodes,
    }, 'Update node');
  }, [selectedNodeId, model, handleModelChange]);

  const handleInsertElement = useCallback((node: PageNodeV4) => {
    // Insert at root level for now
    handleModelChange({
      ...model,
      nodes: [...model.nodes, node],
    }, `Insert ${node.tag}`);
  }, [model, handleModelChange]);

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

    handleModelChange({
      ...model,
      nodes: deleteFromTree(model.nodes),
    }, 'Delete node');
    
    setSelectedNodeId(null);
  }, [selectedNodeId, model, handleModelChange]);

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
    handleModelChange({
      ...model,
      nodes: [...model.nodes, duplicated],
    }, 'Duplicate node');
  }, [selectedNodeId, model, handleModelChange]);

  const selectedNode = selectedNodeId ? findNodeInTree(model.nodes, selectedNodeId) : null;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Top Toolbar */}
      <div className="h-12 border-b bg-background flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            data-testid="button-undo"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            data-testid="button-redo"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Viewport Selector */}
        <div className="flex gap-1">
          <Button
            variant={viewport === 'desktop' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewportChange('desktop')}
            data-testid="viewport-desktop"
          >
            Desktop
          </Button>
          <Button
            variant={viewport === 'tablet' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewportChange('tablet')}
            data-testid="viewport-tablet"
          >
            Tablet
          </Button>
          <Button
            variant={viewport === 'mobile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewportChange('mobile')}
            data-testid="viewport-mobile"
          >
            Mobile
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showElements ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowElements(!showElements)}
            title="Elements"
            data-testid="button-toggle-elements"
          >
            Elements
          </Button>
          <Button
            variant={showLayers ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowLayers(!showLayers)}
            title="Layers"
            data-testid="button-toggle-layers"
          >
            <Layers className="w-4 h-4" />
          </Button>
          <Button
            variant={showProperties ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowProperties(!showProperties)}
            title="Properties"
            data-testid="button-toggle-properties"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex flex-1 overflow-hidden">
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
    </div>
  );
}
