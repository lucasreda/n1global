import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useCurrentOperation } from '@/hooks/use-current-operation';
import { authenticatedApiRequest } from '@/lib/auth';
import { FunnelPage, PageModelV2, BlockSection } from '@shared/schema';
import { VisualEditor } from '../page-builder/VisualEditor';
// Theme helper removed - using inline default theme
import { usePageModelHistory, useUndoRedoShortcuts } from '@/hooks/useUndoRedo';
import { useAIContent, useSectionGenerator } from '@/hooks/useAIContent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, 
  Undo, 
  Redo, 
  Eye, 
  Wand2, 
  Settings,
  Palette,
  Type,
  Smartphone,
  Monitor,
  Tablet,
  ArrowLeft
} from 'lucide-react';
import { useLocation } from 'wouter';

interface AdvancedPageEditorProps {
  funnelId: string;
  pageId: string;
}

export function AdvancedPageEditor({ funnelId, pageId }: AdvancedPageEditorProps) {
  const { selectedOperation } = useCurrentOperation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [pageData, setPageData] = useState<FunnelPage | null>(null);
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  // Fetch page data
  const { data: pageResponse, isLoading, error } = useQuery({
    queryKey: ['/api/funnels', funnelId, 'pages', pageId, selectedOperation],
    queryFn: async () => {
      const operationId = typeof selectedOperation === 'string' ? selectedOperation : (selectedOperation as any)?.id || '';
      
      // Debug authentication state
      const token = localStorage.getItem('auth_token');
      console.log('🔐 AdvancedPageEditor: Auth Debug:', { 
        hasToken: !!token,
        tokenLength: token?.length,
        tokenStart: token?.substring(0, 10) + '...',
        operationId,
        url: `/api/funnels/${funnelId}/pages/${pageId}?operationId=${operationId}`
      });
      
      // Temporary mock data based on actual database content
      console.log('📦 AdvancedPageEditor: Using mock data for page:', pageId);
      
      const mockPageModel = {
        version: 2,
        layout: "single_page",
        theme: {
          colors: {
            text: "#1F2937",
            muted: "#6B7280",
            accent: "#F59E0B",
            primary: "#3B82F6",
            secondary: "#1E40AF",
            background: "#FFFFFF"
          },
          fonts: {
            heading: "Inter",
            primary: "Inter"
          },
          spacing: {
            xs: "0.5rem",
            sm: "1rem",
            md: "1.5rem",
            lg: "2rem",
            xl: "3rem"
          }
        },
        sections: [
          {
            id: "section-uuid-1",
            type: "hero",
            styles: {
              padding: "3rem 0",
              background: "#F0F4F8"
            },
            rows: [{
              id: "row-uuid-1",
              styles: {},
              columns: [{
                id: "column-uuid-1",
                width: "full",
                styles: {},
                elements: [
                  {
                    id: "element-uuid-1",
                    type: "heading",
                    props: {
                      tag: "h1",
                      text: "Monitore sua Glicemia Sem Dor",
                      align: "center"
                    },
                    styles: {
                      color: "#1E40AF",
                      fontSize: "2.5rem",
                      textAlign: "center",
                      fontWeight: "bold",
                      marginBottom: "1rem"
                    },
                    content: {
                      text: "Monitore sua Glicemia Sem Dor"
                    }
                  },
                  {
                    id: "element-uuid-2",
                    type: "text",
                    props: {
                      align: "center",
                      content: "Conheça o Glucometro não invasivo - tecnologia de ponta para o cuidado da sua saúde."
                    },
                    styles: {
                      color: "#1F2937",
                      fontSize: "1.25rem",
                      textAlign: "center",
                      lineHeight: "1.75rem"
                    },
                    content: {
                      text: "Conheça o Glucometro não invasivo - tecnologia de ponta para o cuidado da sua saúde.",
                      html: "<p>Conheça o Glucometro não invasivo - tecnologia de ponta para o cuidado da sua saúde.</p>"
                    }
                  },
                  {
                    id: "element-uuid-3",
                    type: "button",
                    props: {
                      link: "#cta-section",
                      size: "large",
                      text: "Compre Agora",
                      variant: "primary"
                    },
                    styles: {
                      color: "#FFFFFF",
                      padding: "1rem 2rem",
                      fontSize: "1rem",
                      borderRadius: "0.5rem",
                      backgroundColor: "#3B82F6"
                    },
                    content: {
                      text: "Compre Agora"
                    }
                  }
                ]
              }]
            }]
          },
          {
            id: "section-uuid-2",
            type: "benefits",
            styles: {
              padding: "3rem 0"
            },
            rows: [{
              id: "row-uuid-2",
              styles: {},
              columns: [{
                id: "column-uuid-2",
                width: "full",
                styles: {},
                elements: [
                  {
                    id: "element-uuid-4",
                    type: "benefits",
                    props: {
                      title: "Por que Escolher Nosso Glucometro?",
                      items: [
                        {
                          icon: "icon-uuid-1",
                          title: "Sem Dor",
                          description: "Tecnologia não invasiva que elimina a necessidade de picadas."
                        },
                        {
                          icon: "icon-uuid-2",
                          title: "Fácil de Usar",
                          description: "Design intuitivo para todas as idades."
                        },
                        {
                          icon: "icon-uuid-3",
                          title: "Resultados Precisos",
                          description: "Monitore sua saúde com confiança."
                        }
                      ]
                    },
                    styles: {
                      gap: "2rem",
                      textAlign: "center"
                    },
                    content: {}
                  }
                ]
              }]
            }]
          }
        ],
        seo: {
          title: "Glucometro Non Invasivo - Monitore Sua Glicemia Sem Dor",
          description: "Compre o Glucometro não invasivo e facilite o monitoramento diário da sua glicemia sem picadas. Ideal para pessoas de 65+.",
          keywords: ["glucometro não invasivo", "medição glicemia", "saúde 65+", "compra glucometro", "monitoramento glicemia"]
        }
      };

      const mockData = {
        success: true,
        page: {
          id: pageId,
          name: "oximetro",
          path: "/oximetro",
          pageType: "landing",
          model: mockPageModel,
          funnelId: funnelId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };

      console.log('📦 AdvancedPageEditor: Mock data created with', mockPageModel.sections.length, 'sections');
      return mockData;
    },
    enabled: !!funnelId && !!pageId && !!selectedOperation,
  });

  // Initialize page model with default structure if needed
  const getInitialModel = useCallback((): PageModelV2 => {
    if (pageData?.model && (pageData.model as any).version === 2) {
      return pageData.model as PageModelV2;
    }

    // Convert legacy model or create new one
    return {
      version: 2,
      layout: 'single_page',
      sections: [{
        id: `section_${Date.now()}`,
        type: 'hero',
        name: 'Seção Principal',
        rows: [{
          id: `row_${Date.now()}`,
          columns: [{
            id: `column_${Date.now()}`,
            width: 'full',
            elements: [{
              id: `element_${Date.now()}`,
              type: 'heading',
              props: { level: 'h1' },
              styles: {
                fontSize: '3rem',
                fontWeight: '700',
                textAlign: 'center',
                color: '#1e293b',
                margin: '0 0 1rem 0',
              },
              content: {
                text: 'Bem-vindo ao nosso produto',
              },
            }, {
              id: `element_${Date.now() + 1}`,
              type: 'text',
              props: {},
              styles: {
                fontSize: '1.25rem',
                textAlign: 'center',
                color: '#475569',
                margin: '0 0 2rem 0',
              },
              content: {
                text: 'Descubra como podemos transformar sua experiência',
                html: '<p>Descubra como podemos transformar sua experiência</p>',
              },
            }, {
              id: `element_${Date.now() + 2}`,
              type: 'container',
              props: {},
              styles: {
                padding: '2rem',
                margin: '2rem 0',
                backgroundColor: '#f8fafc',
                border: '2px dashed #cbd5e1',
                borderRadius: '0.5rem',
                minHeight: '100px',
              },
              config: {
                allowNesting: true,
              },
              children: [],
              content: {},
            }, {
              id: `element_${Date.now() + 3}`,
              type: 'block',
              props: {},
              styles: {
                padding: '1rem',
                margin: '1rem 0',
                backgroundColor: '#f1f5f9',
                border: '2px dashed #94a3b8',
                borderRadius: '0.5rem',
              },
              config: {
                columns: 2,
                allowNesting: true,
                columnDistribution: 'equal',
                columnWidths: ['50%', '50%'],
              },
              children: [],
              content: {},
            }],
            styles: {},
          }],
          styles: {},
        }],
        styles: {
          padding: '4rem 0',
          backgroundColor: '#ffffff',
        },
        settings: {
          containerWidth: 'container',
        },
      }],
      theme: {
        colors: {
          primary: '#3b82f6',
          secondary: '#64748b',
          background: '#ffffff',
          text: '#1e293b',
          accent: '#f59e0b',
          muted: '#9ca3af',
        },
        typography: {
          headingFont: 'Inter, sans-serif',
          bodyFont: 'Inter, sans-serif',
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
          lg: '0.75rem',
          xl: '1rem',
        },
      },
      seo: {
        title: pageData?.name || 'Nova Página',
        description: 'Página criada com o editor visual avançado',
      },
      settings: {
        containerMaxWidth: '1200px',
        showGrid: false,
        snapToGrid: true,
        enableAnimations: true,
        mobileFirst: true,
      },
    };
  }, [pageData]);

  // Initialize history management
  const {
    state: currentModel,
    canUndo,
    canRedo,
    undo,
    redo,
    saveSnapshot,
    reset,
  } = usePageModelHistory(getInitialModel());

  // Set up keyboard shortcuts
  const { handleKeyDown } = useUndoRedoShortcuts(undo, redo);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Update page data when query responds
  useEffect(() => {
    console.log('🔍 AdvancedPageEditor: pageResponse changed:', { 
      pageResponse, 
      success: pageResponse?.success, 
      hasPage: !!pageResponse?.page,
      pageId: pageResponse?.page?.id,
      model: pageResponse?.page?.model 
    });
    
    if (pageResponse?.success && pageResponse.page) {
      console.log('✅ AdvancedPageEditor: Setting page data:', pageResponse.page);
      setPageData(pageResponse.page);
      // Only reset if pageData changed to avoid infinite loops
      if (!pageData || pageData.id !== pageResponse.page.id) {
        console.log('🔄 AdvancedPageEditor: Resetting model with new page data');
        reset(getInitialModel());
      }
    }
  }, [pageResponse, reset, pageData]); // Removed getInitialModel from dependencies

  // AI Content hooks
  const aiContent = useAIContent({
    onSuccess: (data) => {
      if (data.content?.text) {
        // Handle AI generated content
        console.log('AI Content generated:', data.content);
      }
    },
  });

  const sectionGenerator = useSectionGenerator();

  // Save page mutation
  const savePageMutation = useMutation({
    mutationFn: async (model: PageModelV2) => {
      if (!pageData) throw new Error('No page data');

      const updatedPage = {
        ...pageData,
        model,
        lastEditedBy: 'current-user', // This would come from auth context
      };

      const response = await authenticatedApiRequest(
        'PUT',
        `/api/funnels/${funnelId}/pages/${pageId}?operationId=${selectedOperation}`,
        updatedPage
      );

      if (!response.ok) {
        throw new Error('Falha ao salvar página');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Página salva",
        description: "As alterações foram salvas com sucesso.",
      });
      // Invalidate both the pages list and the specific page
      queryClient.invalidateQueries({ queryKey: ['/api/funnels', funnelId, 'pages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/funnels', funnelId, 'pages', pageId] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleModelChange = useCallback((newModel: PageModelV2) => {
    saveSnapshot(newModel, 'Page updated');
  }, [saveSnapshot]);

  const handleSave = useCallback(() => {
    savePageMutation.mutate(currentModel);
  }, [currentModel, savePageMutation]);

  const handlePreview = useCallback(() => {
    setLocation(`/funnels/${funnelId}/preview?pageId=${pageId}&operationId=${selectedOperation}`);
  }, [funnelId, pageId, selectedOperation, setLocation]);

  const generateAISection = useCallback((type: 'hero' | 'benefits' | 'testimonials' | 'cta') => {
    const businessInfo = {
      name: 'Meu Produto',
      industry: 'E-commerce',
      targetAudience: 'Consumidores online',
      valueProposition: 'Soluções inovadoras',
    };

    switch (type) {
      case 'hero':
        sectionGenerator.generateHeroSection(businessInfo);
        break;
      case 'benefits':
        sectionGenerator.generateBenefitsSection(businessInfo);
        break;
      case 'testimonials':
        sectionGenerator.generateTestimonialsSection(businessInfo);
        break;
      case 'cta':
        sectionGenerator.generateCTASection(businessInfo);
        break;
    }
  }, [sectionGenerator]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-700">Carregando editor...</div>
          <div className="text-sm text-gray-500 mt-2">Preparando o editor visual avançado</div>
        </div>
      </div>
    );
  }

  if (error || !pageData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-red-600">Erro ao carregar página</div>
          <div className="text-sm text-gray-500 mt-2">Não foi possível carregar os dados da página</div>
        </div>
      </div>
    );
  }


  return (
    <div 
      className="flex flex-col bg-background" 
      data-testid="advanced-page-editor"
      style={{ 
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden'
      }}
    >
      {/* Top Toolbar */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/editor/funnels/${funnelId}/pages`)}
              className="text-white hover:bg-muted/20"
              data-testid="button-back-to-pages"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="font-semibold text-white" style={{ fontSize: '20px' }}>{pageData.name}</h1>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={undo}
                disabled={!canUndo}
                data-testid="button-undo"
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={redo}
                disabled={!canRedo}
                data-testid="button-redo"
              >
                <Redo className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Viewport Controls */}
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
              <Button
                variant={viewportMode === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewportMode('desktop')}
                data-testid="viewport-desktop"
                className={viewportMode === 'desktop' ? 'text-white' : ''}
              >
                <Monitor className={`w-4 h-4 ${viewportMode === 'desktop' ? 'text-white' : ''}`} />
              </Button>
              <Button
                variant={viewportMode === 'tablet' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewportMode('tablet')}
                data-testid="viewport-tablet"
                className={viewportMode === 'tablet' ? 'text-white' : ''}
              >
                <Tablet className={`w-4 h-4 ${viewportMode === 'tablet' ? 'text-white' : ''}`} />
              </Button>
              <Button
                variant={viewportMode === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewportMode('mobile')}
                data-testid="viewport-mobile"
                className={viewportMode === 'mobile' ? 'text-white' : ''}
              >
                <Smartphone className={`w-4 h-4 ${viewportMode === 'mobile' ? 'text-white' : ''}`} />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePreview}
              data-testid="button-preview-page"
            >
              <Eye className="w-4 h-4 mr-2" />
              Pré-visualizar
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAIModalOpen(true)}
              data-testid="button-ai-assistant"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              IA
            </Button>

            <Button
              onClick={handleSave}
              disabled={savePageMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-save-page"
            >
              <Save className="w-4 h-4 mr-2 text-white" />
              {savePageMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Editor Area */}
      <div 
        className="flex-1 flex flex-col overflow-auto"
        style={{ 
          height: 'calc(100vh - 80px)',
          maxHeight: 'calc(100vh - 80px)'
        }}
      >
        <div 
          className="flex-1"
          style={{ 
            height: '100%',
            minHeight: '100%'
          }}
        >
          <VisualEditor
            model={currentModel}
            onChange={handleModelChange}
            viewport={viewportMode}
            onViewportChange={setViewportMode}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* AI Assistant Modal */}
      {isAIModalOpen && (
        <AIAssistantModal
          onClose={() => setIsAIModalOpen(false)}
          onGenerateSection={generateAISection}
          isLoading={sectionGenerator.isLoading}
        />
      )}
    </div>
  );
}

// AI Assistant Modal Component
interface AIAssistantModalProps {
  onClose: () => void;
  onGenerateSection: (type: 'hero' | 'benefits' | 'testimonials' | 'cta') => void;
  isLoading: boolean;
}

function AIAssistantModal({ onClose, onGenerateSection, isLoading }: AIAssistantModalProps) {
  const sectionTypes = [
    { type: 'hero' as const, label: 'Seção Hero', description: 'Título principal e chamada para ação' },
    { type: 'benefits' as const, label: 'Benefícios', description: 'Lista de vantagens do produto' },
    { type: 'testimonials' as const, label: 'Depoimentos', description: 'Testemunhos de clientes' },
    { type: 'cta' as const, label: 'Call to Action', description: 'Chamada final para conversão' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            Assistente de IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Gere seções completas usando inteligência artificial:
          </p>
          
          <div className="space-y-2">
            {sectionTypes.map((section) => (
              <Button
                key={section.type}
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  onGenerateSection(section.type);
                  onClose();
                }}
                disabled={isLoading}
              >
                <div className="text-left">
                  <div className="font-medium">{section.label}</div>
                  <div className="text-xs text-gray-500">{section.description}</div>
                </div>
              </Button>
            ))}
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}