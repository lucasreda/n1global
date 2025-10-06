import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { authenticatedApiRequest } from "@/lib/auth";
import { useLocation } from "wouter";
import { PageModelV4 } from "@shared/schema";
import { isPageModelV4 } from "@shared/pageModelAdapter";
import { VisualEditorV4 } from "@/components/page-builder/VisualEditorV4";
import { BreakpointSelector } from "@/components/page-builder/BreakpointSelector";

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
    if (pageResponse) {
      // Handle both direct response and wrapped response
      const loadedPage = pageResponse.landingPage || pageResponse;
      
      // ✅ V4-only: Validate model is PageModelV4
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
        console.log('✅ Loaded PageModelV4 for editing');
      } else {
        // No model - show error (should import HTML first)
        toast({
          title: "Modelo não encontrado",
          description: "Esta landing page não possui um modelo visual. Importe o HTML primeiro.",
          variant: "destructive",
        });
        return;
      }
      
      setPageData(loadedPage);
    }
  }, [pageResponse, toast]);

  // Save page mutation
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
    onSuccess: () => {
      toast({
        title: "Landing page salva",
        description: "As alterações foram salvas com sucesso.",
      });
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/landing-pages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/landing-pages', landingPageId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (currentModel) {
      savePageMutation.mutate(currentModel);
    }
  };

  const handleModelChange = (newModel: PageModelV4) => {
    setCurrentModel(newModel);
    setIsDirty(true);
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
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/inside/affiliates/landing-pages')}
              data-testid="button-back-to-list"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{pageData.name}</h1>
              {pageData.description && (
                <p className="text-sm text-muted-foreground">{pageData.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <BreakpointSelector
              activeBreakpoint={viewport as 'desktop' | 'tablet' | 'mobile'}
              onChange={setViewport}
              data-testid="page-breakpoint-selector"
            />
            
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
        />
      </div>
    </div>
  );
}
