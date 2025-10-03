import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Save, 
  Eye, 
  Type, 
  Palette, 
  Search,
  Plus,
  Trash2,
  Move,
  Edit3
} from "lucide-react";
import { authenticatedApiRequest } from "@/lib/auth";
import { useLocation } from "wouter";
import { PageModelV2 } from "@shared/schema";
import { ensurePageModelV2, isPageModelV2 } from "@shared/pageModelAdapter";

interface FunnelPage {
  id: string;
  funnelId: string;
  name: string;
  pageType: string;
  path: string;
  model?: PageModelV2;
  status: 'draft' | 'published' | 'archived';
  templateId?: string;
  version: number;
  isActive: boolean;
  lastEditedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface PageVisualEditorProps {
  funnelId: string;
  pageId: string;
}

export function PageVisualEditor({ funnelId, pageId }: PageVisualEditorProps) {
  const { selectedOperation } = useCurrentOperation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [pageData, setPageData] = useState<FunnelPage | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Fetch page data
  const { data: pageResponse, isLoading, error } = useQuery({
    queryKey: ['/api/funnels', funnelId, 'pages', pageId],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', `/api/funnels/${funnelId}/pages/${pageId}?operationId=${selectedOperation}`);
      if (!response.ok) {
        throw new Error('Falha ao carregar dados da página');
      }
      return response.json();
    },
    enabled: !!funnelId && !!pageId && !!selectedOperation,
  });

  // Update local state when data loads
  useEffect(() => {
    if (pageResponse?.success && pageResponse?.page) {
      const loadedPage = pageResponse.page;
      
      // Ensure the model is always PageModelV2 (auto-upgrade legacy models)
      if (loadedPage.model) {
        const v2Model = ensurePageModelV2(loadedPage.model);
        
        if (!isPageModelV2(loadedPage.model)) {
          console.log('📝 Upgraded legacy page model to PageModelV2 for editing');
        }
        
        setPageData({ ...loadedPage, model: v2Model });
      } else {
        setPageData(loadedPage);
      }
    }
  }, [pageResponse]);

  // Save page mutation
  const savePageMutation = useMutation({
    mutationFn: async (updatedModel: PageModelV2) => {
      const response = await authenticatedApiRequest('PUT', `/api/funnels/${funnelId}/pages/${pageId}?operationId=${selectedOperation}`, {
        model: updatedModel
      });
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
      setIsDirty(false);
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

  const handleModelUpdate = (newModel: PageModelV2) => {
    setPageData(prev => prev ? { ...prev, model: newModel } : null);
    setIsDirty(true);
  };

  const handleSave = () => {
    if (pageData?.model) {
      savePageMutation.mutate(pageData.model);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-900/50 border-gray-700">
        <CardContent className="p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando editor da página...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !pageData) {
    return (
      <Card className="bg-gray-900/50 border-gray-700">
        <CardContent className="p-6">
          <div className="text-center py-12">
            <p className="text-red-400 mb-2">Erro ao carregar página</p>
            <p className="text-gray-400 text-sm">{error?.message || 'Dados da página não encontrados'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ensure we always have a valid PageModelV2
  const model: PageModelV2 = pageData.model || ensurePageModelV2(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Editor Visual - {pageData.name}</h3>
          <p className="text-gray-400">Página tipo: {pageData.pageType}</p>
          <Badge variant={pageData.status === 'published' ? 'default' : 'secondary'} className="mt-1">
            {pageData.status === 'published' ? 'Publicada' : 'Rascunho'}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLocation(`/funnels/${funnelId}/preview?pageId=${pageId}&operationId=${selectedOperation}`)}
            data-testid="button-preview-page"
          >
            <Eye className="w-4 h-4 mr-2" />
            Pré-visualizar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!isDirty || savePageMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-save-page"
          >
            <Save className="w-4 h-4 mr-2" />
            {savePageMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* Main Editor */}
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="bg-gray-900 border-gray-700">
          <TabsTrigger value="content" className="data-[state=active]:bg-blue-600" data-testid="tab-content">
            <Edit3 className="w-4 h-4 mr-2" />
            Conteúdo
          </TabsTrigger>
          <TabsTrigger value="seo" className="data-[state=active]:bg-blue-600" data-testid="tab-seo">
            <Search className="w-4 h-4 mr-2" />
            SEO
          </TabsTrigger>
          <TabsTrigger value="style" className="data-[state=active]:bg-blue-600" data-testid="tab-style">
            <Palette className="w-4 h-4 mr-2" />
            Estilo
          </TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="mt-6">
          <SectionEditor 
            sections={model.sections || []}
            onSectionsChange={(sections) => handleModelUpdate({ ...model, sections })}
          />
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo" className="mt-6">
          <SEOEditor 
            seo={model.seo || { title: '', description: '' }}
            onSEOChange={(seo) => handleModelUpdate({ ...model, seo })}
          />
        </TabsContent>

        {/* Style Tab */}
        <TabsContent value="style" className="mt-6">
          <StyleEditor 
            style={{ 
              theme: 'modern', 
              primaryColor: model.theme.colors.primary 
            }}
            onStyleChange={(style) => handleModelUpdate({ 
              ...model, 
              theme: {
                ...model.theme,
                colors: {
                  ...model.theme.colors,
                  primary: style.primaryColor
                }
              }
            })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Section Editor Component
interface SectionEditorProps {
  sections: Array<{
    id: string;
    type: string;
    config?: Record<string, any>;
    content?: Record<string, any>;
  }>;
  onSectionsChange: (sections: any[]) => void;
}

function SectionEditor({ sections, onSectionsChange }: SectionEditorProps) {
  const addSection = (type: 'hero' | 'text' | 'cta' | 'benefits' | 'testimonials' = 'text') => {
    const baseSection = {
      id: `section_${Date.now()}`,
      type,
      config: { textAlign: 'center', backgroundColor: '#ffffff' }
    };

    let content;
    switch (type) {
      case 'hero':
        content = { 
          title: 'Título Principal', 
          subtitle: 'Subtítulo impactante que converte visitantes', 
          ctaLabel: 'Começar Agora' 
        };
        break;
      case 'cta':
        content = { 
          title: 'Pronto para começar?', 
          subtitle: 'Não perca esta oportunidade', 
          ctaLabel: 'Quero Aproveitar' 
        };
        break;
      case 'benefits':
        content = { 
          title: 'Benefícios', 
          subtitle: 'Veja como podemos te ajudar',
          benefits: [
            { title: 'Benefício 1', description: 'Descrição do primeiro benefício' },
            { title: 'Benefício 2', description: 'Descrição do segundo benefício' }
          ]
        };
        break;
      case 'testimonials':
        content = { 
          title: 'O que nossos clientes dizem', 
          subtitle: 'Depoimentos reais de quem já teve resultado' 
        };
        break;
      default:
        content = { title: 'Nova Seção', subtitle: 'Edite o conteúdo aqui' };
    }

    const newSection = { ...baseSection, content };
    onSectionsChange([...sections, newSection]);
  };

  const updateSection = (index: number, updatedSection: any) => {
    const newSections = [...sections];
    newSections[index] = updatedSection;
    onSectionsChange(newSections);
  };

  const removeSection = (index: number) => {
    const newSections = sections.filter((_, i) => i !== index);
    onSectionsChange(newSections);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-white">Seções da Página</h4>
        <div className="flex gap-2">
          <Select onValueChange={(value) => addSection(value as any)} defaultValue="">
            <SelectTrigger className="w-40 bg-gray-800 border-gray-600" data-testid="select-add-section-type">
              <SelectValue placeholder="Tipo de seção" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hero">Hero</SelectItem>
              <SelectItem value="text">Texto</SelectItem>
              <SelectItem value="cta">Call to Action</SelectItem>
              <SelectItem value="benefits">Benefícios</SelectItem>
              <SelectItem value="testimonials">Depoimentos</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => addSection()} size="sm" data-testid="button-add-section">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </div>

      {sections.length === 0 ? (
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-8 text-center">
            <p className="text-gray-400 mb-4">Nenhuma seção encontrada</p>
            <Button onClick={() => addSection('hero')} data-testid="button-add-first-section">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Seção Hero
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map((section, index) => (
            <Card key={section.id} className="bg-gray-900/50 border-gray-700">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Move className="w-4 h-4 text-gray-400" />
                    <CardTitle className="text-white text-sm">
                      Seção {index + 1} - {section.type}
                    </CardTitle>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeSection(index)}
                    data-testid={`button-remove-section-${index}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`section-title-${index}`}>Título</Label>
                    <Input
                      id={`section-title-${index}`}
                      value={section.content?.title || ''}
                      onChange={(e) => updateSection(index, {
                        ...section,
                        content: { ...section.content, title: e.target.value }
                      })}
                      className="bg-gray-800 border-gray-600"
                      data-testid={`input-section-title-${index}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`section-type-${index}`}>Tipo</Label>
                    <Select 
                      value={section.type} 
                      onValueChange={(value) => updateSection(index, { ...section, type: value })}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600" data-testid={`select-section-type-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hero">Hero</SelectItem>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="cta">Call to Action</SelectItem>
                        <SelectItem value="benefits">Benefícios</SelectItem>
                        <SelectItem value="testimonials">Depoimentos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor={`section-subtitle-${index}`}>Subtítulo</Label>
                  <Textarea
                    id={`section-subtitle-${index}`}
                    value={section.content?.subtitle || ''}
                    onChange={(e) => updateSection(index, {
                      ...section,
                      content: { ...section.content, subtitle: e.target.value }
                    })}
                    className="bg-gray-800 border-gray-600"
                    rows={3}
                    data-testid={`textarea-section-subtitle-${index}`}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// SEO Editor Component
interface SEOEditorProps {
  seo: {
    title: string;
    description: string;
  };
  onSEOChange: (seo: { title: string; description: string }) => void;
}

function SEOEditor({ seo, onSEOChange }: SEOEditorProps) {
  return (
    <Card className="bg-gray-900/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Configurações de SEO</CardTitle>
        <CardDescription>Configure o título e descrição para mecanismos de busca</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="seo-title">Título da Página</Label>
          <Input
            id="seo-title"
            value={seo.title}
            onChange={(e) => onSEOChange({ ...seo, title: e.target.value })}
            className="bg-gray-800 border-gray-600"
            placeholder="Digite o título da página"
            data-testid="input-seo-title"
          />
          <p className="text-xs text-gray-400 mt-1">
            Recomendado: 50-60 caracteres ({seo.title.length}/60)
          </p>
        </div>
        <div>
          <Label htmlFor="seo-description">Descrição da Página</Label>
          <Textarea
            id="seo-description"
            value={seo.description}
            onChange={(e) => onSEOChange({ ...seo, description: e.target.value })}
            className="bg-gray-800 border-gray-600"
            rows={3}
            placeholder="Digite a descrição da página"
            data-testid="textarea-seo-description"
          />
          <p className="text-xs text-gray-400 mt-1">
            Recomendado: 150-160 caracteres ({seo.description.length}/160)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Style Editor Component
interface StyleEditorProps {
  style: {
    theme: string;
    primaryColor: string;
  };
  onStyleChange: (style: { theme: string; primaryColor: string }) => void;
}

function StyleEditor({ style, onStyleChange }: StyleEditorProps) {
  const themes = [
    { value: 'modern', label: 'Moderno' },
    { value: 'classic', label: 'Clássico' },
    { value: 'minimal', label: 'Minimalista' },
    { value: 'bold', label: 'Ousado' }
  ];

  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ];

  return (
    <Card className="bg-gray-900/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Configurações de Estilo</CardTitle>
        <CardDescription>Configure o tema e cores da página</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="style-theme">Tema</Label>
          <Select 
            value={style.theme} 
            onValueChange={(value) => onStyleChange({ ...style, theme: value })}
          >
            <SelectTrigger className="bg-gray-800 border-gray-600" data-testid="select-style-theme">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {themes.map(theme => (
                <SelectItem key={theme.value} value={theme.value}>
                  {theme.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label>Cor Primária</Label>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => onStyleChange({ ...style, primaryColor: color })}
                className={`w-12 h-12 rounded-lg border-2 transition-all ${
                  style.primaryColor === color 
                    ? 'border-white scale-110' 
                    : 'border-gray-600 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color }}
                data-testid={`button-color-${color.replace('#', '')}`}
              />
            ))}
          </div>
          <Input
            value={style.primaryColor}
            onChange={(e) => onStyleChange({ ...style, primaryColor: e.target.value })}
            className="bg-gray-800 border-gray-600 mt-3"
            placeholder="#3b82f6"
            data-testid="input-custom-color"
          />
        </div>
      </CardContent>
    </Card>
  );
}