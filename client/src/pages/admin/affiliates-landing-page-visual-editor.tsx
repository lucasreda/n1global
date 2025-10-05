import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { authenticatedApiRequest } from "@/lib/auth";
import { useLocation } from "wouter";
import { PageModelV2 } from "@shared/schema";
import { ensurePageModelV2, isPageModelV2 } from "@shared/pageModelAdapter";
import { VisualEditor } from "@/components/page-builder/VisualEditor";

interface AffiliateLandingPage {
  id: string;
  name: string;
  description?: string;
  htmlContent: string;
  cssContent?: string;
  jsContent?: string;
  model?: PageModelV2;
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
  const [currentModel, setCurrentModel] = useState<PageModelV2 | null>(null);
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
      
      // If page has a model, use it; otherwise create a default one
      if (loadedPage.model) {
        const v2Model = ensurePageModelV2(loadedPage.model);
        
        if (!isPageModelV2(loadedPage.model)) {
          console.log('📝 Upgraded legacy page model to PageModelV2 for editing');
        }
        
        setCurrentModel(v2Model);
      } else {
        // Create a default PageModelV2 for new visual editing
        const defaultModel: PageModelV2 = {
          version: 2,
          layout: 'single_page',
          sections: [],
          theme: {
            colors: {
              primary: '#0066ff',
              secondary: '#6c757d',
              accent: '#ff6b6b',
              background: '#ffffff',
              text: '#212529',
              muted: '#6c757d',
            },
            typography: {
              headingFont: 'Inter, system-ui, sans-serif',
              bodyFont: 'Inter, system-ui, sans-serif',
              fontSize: {
                xs: '0.75rem',
                sm: '0.875rem',
                base: '1rem',
                lg: '1.125rem',
                xl: '1.25rem',
                '2xl': '1.5rem',
                '3xl': '1.875rem',
                '4xl': '2.25rem',
              },
            },
            spacing: {
              xs: '0.5rem',
              sm: '1rem',
              md: '1.5rem',
              lg: '2rem',
              xl: '3rem',
              '2xl': '4rem',
            },
            borderRadius: {
              sm: '0.25rem',
              md: '0.5rem',
              lg: '1rem',
            },
          },
          seo: {
            title: loadedPage.name,
            description: loadedPage.description || '',
            keywords: loadedPage.tags || [],
          },
          settings: {
            containerMaxWidth: '1200px',
            enableAnimations: true,
          },
        };
        setCurrentModel(defaultModel);
      }
      
      setPageData(loadedPage);
    }
  }, [pageResponse]);

  // Save page mutation
  const savePageMutation = useMutation({
    mutationFn: async (updatedModel: PageModelV2) => {
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

  const handleModelChange = (newModel: PageModelV2) => {
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
            {/* Viewport selector */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-md border bg-background">
              <Button
                variant={viewport === 'desktop' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewport('desktop')}
                data-testid="button-viewport-desktop"
              >
                Desktop
              </Button>
              <Button
                variant={viewport === 'tablet' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewport('tablet')}
                data-testid="button-viewport-tablet"
              >
                Tablet
              </Button>
              <Button
                variant={viewport === 'mobile' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewport('mobile')}
                data-testid="button-viewport-mobile"
              >
                Mobile
              </Button>
            </div>

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
        <VisualEditor
          model={currentModel}
          onChange={handleModelChange}
          viewport={viewport}
          onViewportChange={setViewport}
        />
      </div>
    </div>
  );
}
