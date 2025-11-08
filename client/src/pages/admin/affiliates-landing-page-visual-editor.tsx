import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Save, Eye, Undo2, Redo2, Layers, Settings, Plus, History } from "lucide-react";
import { authenticatedApiRequest } from "@/lib/auth";
import { useLocation } from "wouter";
import { PageModelV4 } from "@shared/schema";
import { isPageModelV4 } from "@shared/pageModelAdapter";
import { VisualEditorV4 } from "@/components/page-builder/VisualEditorV4";
import { useHistoryV4, HistoryManagerV4 } from "@/components/page-builder/HistoryManagerV4";
import { BreakpointSelector } from "@/components/page-builder/BreakpointSelector";
import { ComponentLibraryV4 } from "@/components/page-builder/ComponentLibraryV4";
import { PageNodeV4 } from "@shared/schema";

interface AffiliateLandingPage {
  id: string;
  name: string;
  description?: string;
  htmlContent: string;
  cssContent?: string;
  jsContent?: string;
  model?: PageModelV4;
  status: 'draft' | 'active' | 'archived';
  thumbnailUrl?: string;
  tags?: string[];
  vercelDeploymentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface AffiliateLandingPageVisualEditorProps {
  landingPageId: string;
}

export function AffiliateLandingPageVisualEditor({ landingPageId }: AffiliateLandingPageVisualEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [pageData, setPageData] = useState<AffiliateLandingPage | null>(null);
  const [currentModel, setCurrentModel] = useState<PageModelV4 | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showProperties, setShowProperties] = useState(true);
  const [showElements, setShowElements] = useState(true);
  const [showComponents, setShowComponents] = useState(false);
  const [historyInitialized, setHistoryInitialized] = useState(false);
  
  // Saved components library
  const [savedComponents, setSavedComponents] = useState<any[]>([]);
  const [nodeToSave, setNodeToSave] = useState<PageNodeV4 | null>(null);
  
  // Ref to always have the latest model for auto-save
  const currentModelRef = useRef<PageModelV4 | null>(null);

  // History/Undo-Redo - Initialize with a stable default, will be reset when model loads
  const defaultModel: PageModelV4 = { 
    version: "4.0", 
    nodes: [], 
    meta: { title: "", description: "" } 
  };
  const { addToHistory, undo, redo, canUndo, canRedo, history } = useHistoryV4(defaultModel);

  // Fetch landing page data
  const { data: pageResponse, isLoading, error } = useQuery({
    queryKey: ['/api/affiliate/landing-pages', landingPageId],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', `/api/affiliate/landing-pages/${landingPageId}`);
      if (!response.ok) {
        throw new Error('Falha ao carregar dados da landing page');
      }
      return response.json();
    },
    enabled: !!landingPageId,
  });

  // Initialize model when data loads
  useEffect(() => {
    if (pageResponse && !historyInitialized) {
      const loadedPage = pageResponse.landingPage || pageResponse;
      
      if (loadedPage.model) {
        if (!isPageModelV4(loadedPage.model)) {
          console.error('❌ Only PageModelV4 is supported. Please convert HTML to V4 first.');
          toast({
            title: "Modelo não suportado",
            description: "Esta landing page usa um formato antigo. Por favor, importe o HTML novamente.",
            variant: "destructive",
          });
          return;
        }
        
        setCurrentModel(loadedPage.model);
        // Initialize history with the loaded model
        addToHistory(loadedPage.model, 'Initial load');
        setHistoryInitialized(true);
        console.log('✅ Loaded PageModelV4 for editing');
      } else {
        toast({
          title: "Modelo não encontrado",
          description: "Esta landing page não possui um modelo visual. Importe o HTML primeiro.",
          variant: "destructive",
        });
        return;
      }
      
      setPageData(loadedPage);
    }
  }, [pageResponse, toast, historyInitialized, addToHistory]);

  // Save page mutation (state management handled by auto-save or manual save handlers)
  const savePageMutation = useMutation({
    mutationFn: async (updatedModel: PageModelV4) => {
      const response = await authenticatedApiRequest('PUT', `/api/affiliate/landing-pages/${landingPageId}`, {
        model: updatedModel
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao salvar landing page');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Force refetch by invalidating and refetching immediately
      queryClient.invalidateQueries({ 
        queryKey: ['/api/affiliate/landing-pages'], 
        refetchType: 'active' 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/affiliate/landing-pages', landingPageId],
        refetchType: 'active'
      });
      
      // Force refetch this specific query
      queryClient.refetchQueries({ 
        queryKey: ['/api/affiliate/landing-pages', landingPageId],
        exact: true
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Component handlers
  const handleSaveAsComponent = useCallback((node: PageNodeV4) => {
    setNodeToSave(node);
    setShowComponents(true);
  }, []);

  const handleSaveComponent = useCallback((component: any) => {
    setSavedComponents(prev => [...prev, component]);
    setNodeToSave(null);
    toast({
      title: 'Componente salvo',
      description: `"${component.name}" foi adicionado à biblioteca`,
    });
  }, [toast]);

  const handleDeleteComponent = useCallback((componentId: string) => {
    setSavedComponents(prev => prev.filter(c => c.id !== componentId));
  }, []);

  const handleInsertComponent = useCallback((node: PageNodeV4) => {
    if (!currentModel) return;
    
    // If node already has componentRef (from ComponentLibraryV4), keep it
    // Otherwise, generate new ID (for direct insertion)
    const nodeWithNewId: PageNodeV4 = node.componentRef ? node : {
      ...node,
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    
    // Insert at root level
    const newNodes = [...currentModel.nodes, nodeWithNewId];
    handleModelChange({
      ...currentModel,
      nodes: newNodes,
    });
    
    toast({
      title: 'Componente inserido',
      description: node.componentRef 
        ? 'Instância do componente adicionada à página'
        : 'Componente adicionado à página',
    });
  }, [currentModel]);

  const handleSave = useCallback(() => {
    if (currentModel) {
      const editIdAtSave = lastEditIdRef.current;
      
      savePageMutation.mutate(currentModel, {
        onSuccess: () => {
          // Only clear isDirty if no newer edits happened
          if (editIdAtSave === lastEditIdRef.current) {
            setIsDirty(false);
            toast({
              title: "✅ Salvo",
              description: "Alterações salvas com sucesso",
            });
          } else {
            // Newer edit exists during save
            console.log('⚠️ Manual save: newer edit detected, keeping isDirty true');
            toast({
              title: "⚠️ Salvo com novas edições",
              description: "Salvo, mas novas alterações detectadas",
            });
          }
        }
      });
    }
  }, [currentModel, savePageMutation, toast]);

  // Keep ref in sync with currentModel
  useEffect(() => {
    currentModelRef.current = currentModel;
  }, [currentModel]);

  // Auto-save when image is uploaded
  useEffect(() => {
    const handleAutoSave = (event: CustomEvent) => {
      console.log('🔄 Auto-save triggered:', event.detail);
      // Wait for React state to fully update, then save
      setTimeout(() => {
        const modelToSave = currentModelRef.current;
        if (modelToSave) {
          console.log('💾 Executing auto-save with model from ref...');
          savePageMutation.mutate(modelToSave);
        } else {
          console.warn('⚠️ No model available in ref for auto-save');
        }
      }, 500); // Give enough time for state to propagate
    };

    window.addEventListener('editor:auto-save', handleAutoSave as EventListener);
    return () => {
      window.removeEventListener('editor:auto-save', handleAutoSave as EventListener);
    };
  }, [savePageMutation]);

  // Track edit generations to prevent race conditions
  const lastEditIdRef = useRef(0);
  
  const handleModelChange = useCallback((newModel: PageModelV4) => {
    lastEditIdRef.current++; // Increment on every edit
    setCurrentModel(newModel);
    setIsDirty(true);
    addToHistory(newModel, 'Edit');
  }, [addToHistory]);

  // Auto-save with debounce
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statusResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only auto-save if there are unsaved changes
    if (!isDirty) return;

    // Clear existing timers
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    if (statusResetTimerRef.current) {
      clearTimeout(statusResetTimerRef.current);
      statusResetTimerRef.current = null;
    }

    // Capture the current edit ID when starting debounce
    const editIdAtDebounceStart = lastEditIdRef.current;

    // Set new timer for auto-save
    autoSaveTimerRef.current = setTimeout(() => {
      console.log('🔄 Auto-saving changes (editId:', editIdAtDebounceStart, 'current:', lastEditIdRef.current, ')...');
      setAutoSaveStatus('saving');
      
      // Use model from ref to avoid stale closure
      const modelToSave = currentModelRef.current;
      if (!modelToSave) {
        console.warn('⚠️ No model available for auto-save');
        setAutoSaveStatus('idle');
        return;
      }
      
      savePageMutation.mutate(modelToSave, {
        onSuccess: () => {
          // Only clear isDirty if no newer edits happened
          if (editIdAtDebounceStart === lastEditIdRef.current) {
            setAutoSaveStatus('saved');
            setIsDirty(false);
            
            // Clear any existing reset timer
            if (statusResetTimerRef.current) {
              clearTimeout(statusResetTimerRef.current);
            }
            
            // Reset to idle after 2 seconds
            statusResetTimerRef.current = setTimeout(() => {
              setAutoSaveStatus('idle');
            }, 2000);
          } else {
            // Newer edit exists, keep isDirty true
            console.log('⚠️ Newer edit detected (editId:', lastEditIdRef.current, '), keeping isDirty true');
            setAutoSaveStatus('idle'); // Don't show "saved" for stale save
          }
        },
        onError: () => {
          setAutoSaveStatus('error');
          
          // Clear any existing reset timer
          if (statusResetTimerRef.current) {
            clearTimeout(statusResetTimerRef.current);
          }
          
          // Reset to idle after 3 seconds
          statusResetTimerRef.current = setTimeout(() => {
            setAutoSaveStatus('idle');
          }, 3000);
        }
      });
    }, 3000); // 3 seconds debounce

    // Cleanup on unmount
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      if (statusResetTimerRef.current) {
        clearTimeout(statusResetTimerRef.current);
      }
    };
  }, [isDirty, savePageMutation]);

  const handleUndo = () => {
    const previousModel = undo();
    if (previousModel) {
      setCurrentModel(previousModel);
      setIsDirty(true);
    }
  };

  const handleRedo = () => {
    const nextModel = redo();
    if (nextModel) {
      setCurrentModel(nextModel);
      setIsDirty(true);
    }
  };

  const handlePreview = () => {
    if (pageData?.vercelDeploymentUrl) {
      window.open(pageData.vercelDeploymentUrl, '_blank');
    } else {
      toast({
        title: "Preview indisponível",
        description: "Esta landing page ainda não foi implantada.",
        variant: "default",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando editor visual...</p>
        </div>
      </div>
    );
  }

  if (error || !pageData || !currentModel) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md">
          <h2 className="text-xl font-semibold mb-2">Erro ao carregar</h2>
          <p className="text-muted-foreground mb-4">
            Não foi possível carregar a landing page para edição.
          </p>
          <Button onClick={() => setLocation('/inside/affiliates/landing-pages')}>
            Voltar para lista
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header - CRITICAL: Very high z-index to stay above rendered HTML content */}
      <div className="border-b bg-background relative z-[9999] shadow-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/inside/affiliates/landing-pages')}
              data-testid="button-back-to-list"
              className="text-foreground dark:text-gray-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{pageData.name}</h1>
              {pageData.description && (
                <p className="text-sm text-muted-foreground dark:text-gray-400">{pageData.description}</p>
              )}
            </div>
            
            {/* Undo/Redo Controls - Logo após o nome */}
            <div className="flex items-center gap-1 ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={!canUndo}
                title="Desfazer (Ctrl+Z)"
                data-testid="button-undo-header"
                className="text-foreground dark:text-gray-200"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRedo}
                disabled={!canRedo}
                title="Refazer (Ctrl+Y)"
                data-testid="button-redo-header"
                className="text-foreground dark:text-gray-200"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>
            
            {/* History Popover */}
            <HistoryManagerV4 
              currentPageModel={currentModel} 
              onRestore={(model) => {
                setCurrentModel(model);
                setIsDirty(true);
              }}
              maxHistorySize={50}
            />

            {/* Auto-save Status Indicator */}
            <div className="flex items-center gap-2 ml-4 text-sm">
              {autoSaveStatus === 'saving' && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
                  <span>Salvando...</span>
                </div>
              )}
              {autoSaveStatus === 'saved' && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Save className="h-3 w-3" />
                  <span>Salvo</span>
                </div>
              )}
              {autoSaveStatus === 'error' && (
                <div className="flex items-center gap-2 text-destructive">
                  <span>❌</span>
                  <span>Erro ao salvar</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">

            {/* Panel Toggles */}
            <Button
              variant={showElements ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowElements(!showElements)}
              title="Elements Panel"
              data-testid="button-toggle-elements-header"
              className={showElements ? "" : "text-foreground dark:text-gray-200"}
            >
              <Plus className="h-4 w-4 mr-2" />
              Elements
            </Button>
            <Button
              variant={showLayers ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowLayers(!showLayers)}
              title="Layers Panel"
              data-testid="button-toggle-layers-header"
              className={showLayers ? "" : "text-foreground dark:text-gray-200"}
            >
              <Layers className="h-4 w-4 mr-2" />
              Layers
            </Button>
            <Button
              variant={showProperties ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowProperties(!showProperties)}
              title="Properties Panel"
              data-testid="button-toggle-properties-header"
              className={showProperties ? "" : "text-foreground dark:text-gray-200"}
            >
              <Settings className="h-4 w-4 mr-2" />
              Properties
            </Button>
            <Button
              variant={showComponents ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowComponents(!showComponents)}
              title="Components Library"
              data-testid="button-toggle-components-header"
              className={showComponents ? "" : "text-foreground dark:text-gray-200"}
            >
              <Layers className="h-4 w-4 mr-2" />
              Components
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Viewport Selector */}
            <BreakpointSelector
              activeBreakpoint={viewport as 'desktop' | 'tablet' | 'mobile'}
              onChange={setViewport}
              zoomLevel={zoomLevel}
              onZoomChange={setZoomLevel}
              showGrid={showGrid}
              onGridToggle={setShowGrid}
              snapToGrid={snapToGrid}
              onSnapToggle={setSnapToGrid}
              data-testid="page-breakpoint-selector"
            />
            
            <div className="w-px h-6 bg-border mx-1" />

            {pageData.vercelDeploymentUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
                data-testid="button-preview"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            )}
            
            <Button
              onClick={handleSave}
              disabled={!isDirty || savePageMutation.isPending}
              size="sm"
              data-testid="button-save"
            >
              {savePageMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar {isDirty && '*'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Visual Editor */}
      <div className="flex-1 overflow-hidden">
        <VisualEditorV4
          model={currentModel}
          onChange={handleModelChange}
          viewport={viewport}
          onViewportChange={setViewport}
          showElements={showElements}
          showLayers={showLayers}
          showProperties={showProperties}
          zoomLevel={zoomLevel}
          showGrid={showGrid}
          snapToGrid={snapToGrid}
          onSaveAsComponent={handleSaveAsComponent}
          showComponents={showComponents}
          savedComponents={savedComponents}
          onSaveComponent={handleSaveComponent}
          onDeleteComponent={handleDeleteComponent}
          onInsertComponent={handleInsertComponent}
        />
      </div>
    </div>
  );
}
