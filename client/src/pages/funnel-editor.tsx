import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft,
  Save,
  Eye,
  Settings,
  Palette,
  Globe,
  BarChart3,
  Zap,
  ExternalLink,
  Rocket,
  CheckCircle,
  AlertCircle,
  Clock
} from "lucide-react";
import { authenticatedApiRequest } from "@/lib/auth";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { useToast } from "@/hooks/use-toast";
import { Funnel } from "@shared/schema";
import { FunnelPagesManager } from "@/components/funnel/FunnelPagesManager";

interface FunnelEditorData {
  name: string;
  description: string;
  type: string;
  language: string;
  currency: string;
  isActive: boolean;
  productInfo?: {
    name: string;
    description: string;
    price: number;
    currency: string;
    targetAudience: string;
    mainBenefits: string[];
    objections: string[];
  };
  trackingConfig?: {
    facebookPixelId?: string;
    googleAnalyticsId?: string;
    googleTagManagerId?: string;
    tiktokPixelId?: string;
  };
}

export default function FunnelEditor() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { selectedOperation } = useCurrentOperation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Handle different URL patterns: /funnels/:id vs /funnels/:funnelId/pages/:pageId/edit
  const funnelId = (params.funnelId || params.id) as string;
  const pageId = params.pageId as string;
  
  console.log('🚀 FunnelEditor RENDERED:', { funnelId, pageId, params });
  
  // If we're editing a specific page, start on Pages tab
  const [activeTab, setActiveTab] = useState(pageId ? "pages" : "content");
  
  useEffect(() => {
    if (pageId) {
      console.log('✅ FunnelEditor: Switching to pages tab for pageId:', pageId);
      setActiveTab("pages");
    }
  }, [pageId]);

  // Fetch funnel data
  const { data: funnel, isLoading, error } = useQuery({
    queryKey: ['/api/funnels', funnelId],
    queryFn: async () => {
      const operationId = typeof selectedOperation === 'string' ? selectedOperation : selectedOperation?.id || '';
      console.log('🎯 FunnelEditor: Making API request with:', { funnelId, operationId });
      const response = await authenticatedApiRequest("GET", `/api/funnels/${funnelId}?operationId=${operationId}`);
      if (!response.ok) {
        throw new Error('Falha ao carregar dados do funil');
      }
      const data = await response.json();
      console.log('📄 FunnelEditor: Funnel data loaded:', data.funnel);
      return data.funnel as Funnel;
    },
    enabled: !!funnelId && !!selectedOperation,
  });

  console.log('🔄 FunnelEditor: Current state:', { 
    isLoading, 
    error: error?.message, 
    hasFunnel: !!funnel, 
    activeTab,
    selectedOperation 
  });

  // Update funnel mutation
  const updateFunnelMutation = useMutation({
    mutationFn: async (updates: Partial<FunnelEditorData>) => {
      const response = await authenticatedApiRequest("PUT", `/api/funnels/${funnelId}`, {
        ...updates, 
        operationId: selectedOperation 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao atualizar funil');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Funil atualizado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/funnels', funnelId] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = (updates: Partial<FunnelEditorData>) => {
    updateFunnelMutation.mutate(updates);
  };

  const handleGoBack = () => {
    setLocation('/funnels');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <DashboardHeader title="Carregando Funil" subtitle="Aguarde enquanto carregamos os dados..." />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error || !funnel) {
    return (
      <div className="min-h-screen bg-black">
        <DashboardHeader title="Erro no Funil" subtitle="Não foi possível carregar os dados do funil" />
        <div className="container mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={handleGoBack} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
          <Card className="bg-red-950/20 border-red-800">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Erro ao carregar funil
              </CardTitle>
              <CardDescription className="text-red-300">
                Não foi possível carregar os dados do funil. Verifique se o ID está correto.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-500';
      case 'generating': return 'bg-yellow-500';
      case 'deployed': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ready': return 'Pronto';
      case 'generating': return 'Gerando';
      case 'deployed': return 'Implantado';
      case 'error': return 'Erro';
      case 'draft': return 'Rascunho';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <DashboardHeader title={funnel.name} subtitle="Gerenciar e editar páginas do funil" />
      
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleGoBack} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">{funnel.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={`${getStatusColor(funnel.status)} text-white`}>
                  {getStatusLabel(funnel.status)}
                </Badge>
                <Badge variant="outline" className="text-gray-300">
                  {funnel.type}
                </Badge>
                <Badge variant="outline" className="text-gray-300">
                  {funnel.language}
                </Badge>
                <Badge variant="outline" className="text-gray-300">
                  {funnel.currency}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              className="border-gray-600"
              data-testid="button-preview"
            >
              <Eye className="w-4 h-4 mr-2" />
              Pré-visualizar
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-deploy"
            >
              <Rocket className="w-4 h-4 mr-2" />
              Implantar
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-gray-900 border-gray-700">
            <TabsTrigger value="content" className="data-[state=active]:bg-blue-600">
              <Palette className="w-4 h-4 mr-2" />
              Páginas
            </TabsTrigger>
            <TabsTrigger value="tracking" className="data-[state=active]:bg-blue-600">
              <BarChart3 className="w-4 h-4 mr-2" />
              Tracking
            </TabsTrigger>
            <TabsTrigger value="deployment" className="data-[state=active]:bg-blue-600">
              <Globe className="w-4 h-4 mr-2" />
              Deployment
            </TabsTrigger>
            <TabsTrigger value="general" className="data-[state=active]:bg-blue-600">
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Informações Básicas</CardTitle>
                  <CardDescription>Configure as informações gerais do funil</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome do Funil</Label>
                    <Input
                      id="name"
                      defaultValue={funnel.name}
                      className="bg-gray-800 border-gray-600"
                      data-testid="input-funnel-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      defaultValue={funnel.description || ''}
                      className="bg-gray-800 border-gray-600"
                      rows={3}
                      data-testid="textarea-funnel-description"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="active" 
                      defaultChecked={funnel.isActive || false}
                      data-testid="switch-funnel-active"
                    />
                    <Label htmlFor="active">Funil Ativo</Label>
                  </div>
                  <Button 
                    onClick={() => handleSave({
                      name: (document.getElementById('name') as HTMLInputElement)?.value,
                      description: (document.getElementById('description') as HTMLTextAreaElement)?.value,
                      isActive: (document.getElementById('active') as HTMLInputElement)?.checked,
                    })}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={updateFunnelMutation.isPending}
                    data-testid="button-save-general"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateFunnelMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Status do Funil</CardTitle>
                  <CardDescription>Informações sobre o estado atual do funil</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(funnel.status)}`}></div>
                    <span className="text-white font-medium">{getStatusLabel(funnel.status)}</span>
                  </div>
                  {funnel.generatedAt && (
                    <div className="text-sm text-gray-400">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Gerado em: {new Date(funnel.generatedAt).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                  {funnel.lastRegeneratedAt && (
                    <div className="text-sm text-gray-400">
                      <Zap className="w-4 h-4 inline mr-1" />
                      Última regeneração: {new Date(funnel.lastRegeneratedAt).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                  <div className="pt-4 border-t border-gray-700">
                    <Button 
                      variant="outline" 
                      className="w-full border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-black"
                      data-testid="button-regenerate"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Regenerar Conteúdo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pages Tab */}
          <TabsContent value="pages" className="mt-6">
            {pageId ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <Button variant="ghost" onClick={() => setLocation(`/funnels/${funnelId}`)} data-testid="button-back-to-pages">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar às Páginas
                  </Button>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Editor de Página</h3>
                    <p className="text-gray-400">Editando página: {pageId}</p>
                  </div>
                </div>
                <Card className="bg-gray-900/50 border-gray-700">
                  <CardContent className="p-6">
                    <div className="text-center py-12">
                      <h3 className="text-xl font-semibold text-white mb-2">Editor Visual de Página</h3>
                      <p className="text-gray-400 mb-4">O editor visual será implementado aqui</p>
                      <p className="text-sm text-gray-500">ID da Página: {pageId}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <FunnelPagesManager funnelId={funnelId} />
            )}
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="mt-6">
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-white mb-2">Conteúdo do Funil</h3>
              <p className="text-gray-400">Configurações de conteúdo e design serão implementadas aqui.</p>
            </div>
          </TabsContent>

          {/* Tracking Tab */}
          <TabsContent value="tracking" className="mt-6">
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Configuração de Tracking</CardTitle>
                <CardDescription>Configure pixels e códigos de rastreamento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="facebook-pixel">Facebook Pixel ID</Label>
                  <Input
                    id="facebook-pixel"
                    placeholder="123456789012345"
                    className="bg-gray-800 border-gray-600"
                    data-testid="input-facebook-pixel"
                  />
                </div>
                <div>
                  <Label htmlFor="google-analytics">Google Analytics ID</Label>
                  <Input
                    id="google-analytics"
                    placeholder="G-XXXXXXXXXX"
                    className="bg-gray-800 border-gray-600"
                    data-testid="input-google-analytics"
                  />
                </div>
                <div>
                  <Label htmlFor="google-tag-manager">Google Tag Manager ID</Label>
                  <Input
                    id="google-tag-manager"
                    placeholder="GTM-XXXXXXX"
                    className="bg-gray-800 border-gray-600"
                    data-testid="input-google-tag-manager"
                  />
                </div>
                <div>
                  <Label htmlFor="tiktok-pixel">TikTok Pixel ID</Label>
                  <Input
                    id="tiktok-pixel"
                    placeholder="CXXXXXXXXXXXXXXXXXX"
                    className="bg-gray-800 border-gray-600"
                    data-testid="input-tiktok-pixel"
                  />
                </div>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  data-testid="button-save-tracking"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configurações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deployment Tab */}
          <TabsContent value="deployment" className="mt-6">
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Deployment e Publicação</CardTitle>
                <CardDescription>Gerencie a publicação do seu funil</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Globe className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                  <h3 className="text-lg font-medium text-gray-300 mb-2">Sistema de Deployment</h3>
                  <p className="text-gray-500 mb-4">
                    Publique seu funil automaticamente na Vercel
                  </p>
                  <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                    Em desenvolvimento
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}