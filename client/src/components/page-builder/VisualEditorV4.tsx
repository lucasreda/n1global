import { useState, useCallback } from 'react';
import { PageModelV4, PageNodeV4 } from '@shared/schema';
import { PageModelV4Renderer } from './PageModelV4Renderer';
import { LayersPanelV4 } from './LayersPanelV4';
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
        <div className="w-80 border-l bg-background p-4 overflow-auto">
          <h3 className="font-semibold mb-4">Propriedades</h3>
          
          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Tag HTML</label>
                <div className="text-sm text-muted-foreground mt-1">
                  &lt;{selectedNode.tag}&gt;
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">ID do Elemento</label>
                <div className="text-sm text-muted-foreground mt-1 font-mono">
                  {selectedNode.id}
                </div>
              </div>

              {selectedNode.textContent && (
                <div>
                  <label className="text-sm font-medium">Conteúdo de Texto</label>
                  <div className="text-sm text-muted-foreground mt-1">
                    {selectedNode.textContent.substring(0, 100)}
                    {selectedNode.textContent.length > 100 && '...'}
                  </div>
                </div>
              )}

              {selectedNode.classNames && selectedNode.classNames.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Classes CSS</label>
                  <div className="text-sm text-muted-foreground mt-1">
                    {selectedNode.classNames.join(', ')}
                  </div>
                </div>
              )}

              {selectedNode.styles && (
                <div>
                  <label className="text-sm font-medium">Estilos ({viewport})</label>
                  <div className="text-xs text-muted-foreground mt-1 font-mono bg-gray-50 p-2 rounded max-h-40 overflow-auto">
                    <pre>{JSON.stringify(selectedNode.styles[viewport] || {}, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">
              Selecione um elemento para editar suas propriedades
            </div>
          )}
        </div>
      )}
    </div>
  );
}
