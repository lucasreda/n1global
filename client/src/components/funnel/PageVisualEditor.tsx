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
  Edit3,
  AlertCircle
} from "lucide-react";
import { authenticatedApiRequest } from "@/lib/auth";
import { useLocation } from "wouter";
import { PageModelV2, BlockSection, BlockElement } from "@shared/schema";
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
  const [isLegacyConverted, setIsLegacyConverted] = useState(false);
  const [conversionWarnings, setConversionWarnings] = useState<string[]>([]);

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
      
      // Reset legacy flags for each new page load
      setIsLegacyConverted(false);
      setConversionWarnings([]);
      
      // Ensure the model is always PageModelV2 (auto-upgrade legacy models)
      if (loadedPage.model) {
        const v2Model = ensurePageModelV2(loadedPage.model);
        
        if (!isPageModelV2(loadedPage.model)) {
          console.log('📝 Upgraded legacy page model to PageModelV2 for editing');
          setIsLegacyConverted(true);
        }
        
        // Check if model has conversion warnings
        if ((v2Model as any)._convertedFromLegacy) {
          setIsLegacyConverted(true);
          setConversionWarnings((v2Model as any)._conversionWarnings || []);
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
      // Clean auxiliary conversion metadata before saving
      const cleanModel = { ...pageData.model };
      delete (cleanModel as any)._convertedFromLegacy;
      delete (cleanModel as any)._conversionWarnings;
      
      savePageMutation.mutate(cleanModel);
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

      {/* Legacy Conversion Warning */}
      {isLegacyConverted && (
        <Card className="bg-yellow-900/20 border-yellow-700/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-yellow-300 font-medium mb-1">Página Legacy Convertida</h4>
                <p className="text-yellow-200/80 text-sm mb-2">
                  Esta página foi automaticamente convertida do formato antigo para o novo formato PageModelV2.
                </p>
                {conversionWarnings.length > 0 && (
                  <ul className="list-disc list-inside text-sm text-yellow-200/70 space-y-1">
                    {conversionWarnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                )}
                <p className="text-yellow-200/60 text-xs mt-2">
                  ⚠️ Revise o conteúdo cuidadosamente antes de salvar.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
  sections: BlockSection[];
  onSectionsChange: (sections: BlockSection[]) => void;
}

function SectionEditor({ sections, onSectionsChange }: SectionEditorProps) {
  // Helper: Extract editable text from an element
  const getElementText = (element: BlockElement): string => {
    if (!element.content) return '';
    if (typeof element.content === 'string') return element.content;
    if (typeof element.content === 'object' && 'text' in element.content) {
      return element.content.text || '';
    }
    return '';
  };

  // Helper: Update element text
  const updateElementText = (sectionIndex: number, rowIndex: number, colIndex: number, elemIndex: number, newText: string) => {
    const newSections = [...sections];
    const element = newSections[sectionIndex].rows[rowIndex].columns[colIndex].elements[elemIndex];
    
    if (typeof element.content === 'object') {
      element.content = { ...element.content, text: newText };
    } else {
      element.content = { text: newText };
    }
    
    onSectionsChange(newSections);
  };

  const removeSection = (index: number) => {
    const newSections = sections.filter((_, i) => i !== index);
    onSectionsChange(newSections);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-white">Conteúdo da Página</h4>
        <Badge variant="secondary">{sections.length} seção{sections.length !== 1 ? 'ões' : ''}</Badge>
      </div>

      {sections.length === 0 ? (
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-8 text-center">
            <p className="text-gray-400 mb-4">Nenhuma seção encontrada</p>
            <p className="text-gray-500 text-sm">Esta página foi gerada com IA mas não tem conteúdo visível.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map((section, sectionIndex) => (
            <Card key={section.id} className="bg-gray-900/50 border-gray-700">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Move className="w-4 h-4 text-gray-400" />
                    <CardTitle className="text-white text-sm">
                      {section.name || `Seção ${sectionIndex + 1}`} ({section.type})
                    </CardTitle>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeSection(sectionIndex)}
                    data-testid={`button-remove-section-${sectionIndex}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Show elements from all rows/columns */}
                {section.rows.map((row, rowIndex) => (
                  row.columns.map((column, colIndex) => (
                    column.elements.map((element, elemIndex) => (
                      <div key={element.id} className="border-l-2 border-blue-500 pl-3 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {element.type}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            #{elemIndex + 1}
                          </span>
                        </div>
                        {(element.type === 'heading' || element.type === 'text') && (
                          <Textarea
                            value={getElementText(element)}
                            onChange={(e) => updateElementText(sectionIndex, rowIndex, colIndex, elemIndex, e.target.value)}
                            className="bg-gray-800 border-gray-600 text-sm"
                            rows={element.type === 'heading' ? 1 : 3}
                            placeholder={`Editar ${element.type === 'heading' ? 'título' : 'texto'}...`}
                            data-testid={`textarea-element-${sectionIndex}-${rowIndex}-${colIndex}-${elemIndex}`}
                          />
                        )}
                        {element.type === 'button' && (
                          <div className="space-y-2">
                            <Input
                              value={(element.content as any)?.label || ''}
                              onChange={(e) => {
                                const newSections = [...sections];
                                const elem = newSections[sectionIndex].rows[rowIndex].columns[colIndex].elements[elemIndex];
                                elem.content = { ...(elem.content as any), label: e.target.value };
                                onSectionsChange(newSections);
                              }}
                              className="bg-gray-800 border-gray-600 text-sm"
                              placeholder="Texto do botão"
                              data-testid={`input-button-label-${elemIndex}`}
                            />
                            <Input
                              value={(element.content as any)?.href || ''}
                              onChange={(e) => {
                                const newSections = [...sections];
                                const elem = newSections[sectionIndex].rows[rowIndex].columns[colIndex].elements[elemIndex];
                                elem.content = { ...(elem.content as any), href: e.target.value };
                                onSectionsChange(newSections);
                              }}
                              className="bg-gray-800 border-gray-600 text-sm"
                              placeholder="URL do botão"
                              data-testid={`input-button-href-${elemIndex}`}
                            />
                          </div>
                        )}
                        {element.type === 'image' && (
                          <div className="space-y-2">
                            <Input
                              value={(element.content as any)?.src || ''}
                              onChange={(e) => {
                                const newSections = [...sections];
                                const elem = newSections[sectionIndex].rows[rowIndex].columns[colIndex].elements[elemIndex];
                                elem.content = { ...(elem.content as any), src: e.target.value };
                                onSectionsChange(newSections);
                              }}
                              className="bg-gray-800 border-gray-600 text-sm"
                              placeholder="URL da imagem"
                              data-testid={`input-image-src-${elemIndex}`}
                            />
                            <Input
                              value={(element.content as any)?.alt || ''}
                              onChange={(e) => {
                                const newSections = [...sections];
                                const elem = newSections[sectionIndex].rows[rowIndex].columns[colIndex].elements[elemIndex];
                                elem.content = { ...(elem.content as any), alt: e.target.value };
                                onSectionsChange(newSections);
                              }}
                              className="bg-gray-800 border-gray-600 text-sm"
                              placeholder="Texto alternativo"
                              data-testid={`input-image-alt-${elemIndex}`}
                            />
                          </div>
                        )}
                        {!['heading', 'text', 'button', 'image'].includes(element.type) && (
                          <p className="text-xs text-gray-500 italic">
                            Tipo "{element.type}" - edição avançada em breve
                          </p>
                        )}
                      </div>
                    ))
                  ))
                ))}
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