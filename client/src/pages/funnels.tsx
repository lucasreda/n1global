import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Zap, 
  Plus, 
  ExternalLink, 
  Settings, 
  Eye,
  Rocket,
  Globe,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Clock,
  Star,
  Sparkles
} from "lucide-react";
import { authenticatedApiRequest } from "@/lib/auth";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Schemas for form validation
const createFunnelSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  templateId: z.string().optional(),
  productInfo: z.object({
    name: z.string().min(1, "Nome do produto é obrigatório"),
    description: z.string().min(1, "Descrição é obrigatória"),
    price: z.number().positive("Preço deve ser positivo"),
    currency: z.string().default("EUR"),
    targetAudience: z.string().min(1, "Público-alvo é obrigatório"),
    mainBenefits: z.array(z.string()).min(1, "Pelo menos um benefício é obrigatório"),
    objections: z.array(z.string()).min(1, "Pelo menos uma objeção é obrigatória"),
  }),
  trackingConfig: z.object({
    facebookPixelId: z.string().optional(),
    googleAnalyticsId: z.string().optional(),
  }).optional(),
});

type CreateFunnelData = z.infer<typeof createFunnelSchema>;

interface FunnelTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  previewImage?: string;
  templateConfig: {
    sections: string[];
    colorScheme: string;
    layout: string;
    conversionGoal: string;
  };
}

interface Funnel {
  id: string;
  name: string;
  description?: string;
  status: string;
  isActive: boolean;
  aiCost: string;
  generatedAt?: string;
  createdAt: string;
  updatedAt: string;
  templateId?: string;
  templateName?: string;
  deploymentUrl?: string;
  deploymentStatus?: string;
}

interface VercelIntegration {
  connected: boolean;
  integration?: {
    id: string;
    connectedAt: string;
    lastUsed?: string;
    isActive: boolean;
  };
}

export default function Funnels() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const { selectedOperation } = useCurrentOperation();
  const { toast } = useToast();

  // Handle OAuth callback from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      toast({
        title: "Erro de OAuth",
        description: `Falha na conexão: ${error}`,
        variant: "destructive",
      });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (code && state) {
      // Extract operationId from state (format: userId_timestamp_random_operationId)
      const stateParts = state.split('_');
      let operationId = selectedOperation;
      
      // Try to find operationId in state (if it was included in the state)
      if (stateParts.length >= 4) {
        operationId = stateParts.slice(3).join('_'); // Get everything after the third underscore
      }
      
      // Use selectedOperation as fallback
      if (!operationId) {
        operationId = selectedOperation;
      }
      
      // Only process if we have an operationId
      if (operationId) {
        console.log('🔐 Processing OAuth callback with operation:', operationId);
        handleOAuthCallback(code, state, operationId);
      } else {
        console.warn('⚠️ OAuth callback received but no operation selected');
        toast({
          title: "Aviso",
          description: "Por favor, selecione uma operação e tente conectar novamente",
          variant: "default",
        });
      }
    }
  }, [selectedOperation, toast]);

  // Handle OAuth callback and connect integration
  const handleOAuthCallback = async (code: string, state: string, operationId: string) => {
    try {
      console.log('🔄 Connecting Vercel integration...');
      const response = await authenticatedApiRequest('POST', '/api/funnels/vercel/connect', {
        operationId: operationId,
        code: code,
        state: state,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Vercel connected:', result);
        toast({
          title: "Sucesso",
          description: "Integração Vercel conectada com sucesso!",
        });
        refetchVercel();
      } else {
        const errorData = await response.json();
        console.error('❌ Connection failed:', errorData);
        throw new Error(errorData.error || 'Erro ao conectar integração');
      }
    } catch (error) {
      console.error('❌ OAuth callback error:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao conectar integração Vercel",
        variant: "destructive",
      });
    } finally {
      // Clean URL parameters
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  // Form for creating funnels
  const form = useForm<CreateFunnelData>({
    resolver: zodResolver(createFunnelSchema),
    defaultValues: {
      name: "",
      description: "",
      productInfo: {
        name: "",
        description: "",
        price: 0,
        currency: "EUR",
        targetAudience: "",
        mainBenefits: [""],
        objections: [""],
      },
      trackingConfig: {},
    },
  });

  // Fetch Vercel integration status
  const { data: vercelIntegration, refetch: refetchVercel } = useQuery<VercelIntegration>({
    queryKey: ['/api/funnels/vercel/status', selectedOperation],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', `/api/funnels/vercel/status?operationId=${selectedOperation}`);
      return await response.json();
    },
    enabled: !!selectedOperation,
  });

  // Fetch funnel templates
  const { data: templates } = useQuery<{ templates: FunnelTemplate[] }>({
    queryKey: ['/api/funnels/templates'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/funnels/templates');
      return await response.json();
    },
  });

  // Fetch funnels for current operation
  const { data: funnelsData, refetch: refetchFunnels } = useQuery<{ funnels: Funnel[] }>({
    queryKey: ['/api/funnels', selectedOperation],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', `/api/funnels?operationId=${selectedOperation}`);
      return await response.json();
    },
    enabled: !!selectedOperation,
  });

  // Connect to Vercel
  const handleConnectVercel = async () => {
    try {
      if (!selectedOperation) {
        toast({
          title: "Aviso",
          description: "Por favor, selecione uma operação primeiro",
          variant: "default",
        });
        return;
      }
      
      const response = await authenticatedApiRequest('GET', `/api/funnels/vercel/oauth-url?operationId=${selectedOperation}`);
      
      if (response.ok) {
        const { oauthUrl } = await response.json();
        window.open(oauthUrl, '_blank', 'width=800,height=700'); // Volta a abrir em nova janela como antes
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao obter URL OAuth');
      }
    } catch (error) {
      console.error('❌ Error connecting to Vercel:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao conectar com Vercel",
        variant: "destructive",
      });
    }
  };

  // Create new funnel
  const handleCreateFunnel = async (data: CreateFunnelData) => {
    try {
      const response = await authenticatedApiRequest('POST', '/api/funnels', {
        ...data,
        operationId: selectedOperation,
        productInfo: {
          ...data.productInfo,
          mainBenefits: data.productInfo.mainBenefits.filter(b => b.trim()),
          objections: data.productInfo.objections.filter(o => o.trim()),
        },
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Sucesso",
          description: "Funil criado com sucesso! IA está gerando conteúdo...",
        });
        setOpenDialog(null);
        form.reset();
        refetchFunnels();
      } else {
        throw new Error('Erro ao criar funil');
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar funil",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Rascunho", variant: "secondary" as const },
      generating: { label: "Gerando IA", variant: "default" as const },
      ready: { label: "Pronto", variant: "default" as const },
      deploying: { label: "Deploy...", variant: "default" as const },
      deployed: { label: "Online", variant: "default" as const },
      error: { label: "Erro", variant: "destructive" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      ecommerce: "🛒",
      lead_gen: "📧", 
      webinar: "🎥",
      app: "📱",
      service: "⚡",
    };
    return icons[category as keyof typeof icons] || "📄";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <DashboardHeader 
        title="Funis de Venda"
        subtitle="Crie landing pages com IA e deploy automático no Vercel"
      />
      
      <main className="container mx-auto px-6 py-8">
        {/* Action Buttons */}
        <div className="flex items-center justify-end mb-8">
          
          <div className="flex gap-4">
            {!vercelIntegration?.connected ? (
              <Button 
                onClick={handleConnectVercel}
                className="bg-black text-white hover:bg-gray-800"
                data-testid="button-connect-vercel"
              >
                <Zap className="w-4 h-4 mr-2" />
                Conectar Vercel
              </Button>
            ) : (
              <Dialog open={openDialog === 'create'} onOpenChange={(open) => setOpenDialog(open ? 'create' : null)}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    data-testid="button-create-funnel"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Funil
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Criar Funil com IA
                    </DialogTitle>
                  </DialogHeader>
                  
                  <form onSubmit={form.handleSubmit(handleCreateFunnel)} className="space-y-6">
                    <Tabs defaultValue="basic">
                      <TabsList>
                        <TabsTrigger value="basic">Básico</TabsTrigger>
                        <TabsTrigger value="product">Produto</TabsTrigger>
                        <TabsTrigger value="tracking">Tracking</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="basic" className="space-y-4">
                        <div>
                          <Label htmlFor="name">Nome do Funil</Label>
                          <Input
                            id="name"
                            {...form.register("name")}
                            placeholder="Ex: Lançamento Produto X"
                            data-testid="input-funnel-name"
                          />
                          {form.formState.errors.name && (
                            <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="description">Descrição (Opcional)</Label>
                          <Textarea
                            id="description"
                            {...form.register("description")}
                            placeholder="Descreva o objetivo deste funil..."
                            data-testid="input-funnel-description"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="template">Template</Label>
                          <Select onValueChange={(value) => form.setValue("templateId", value)}>
                            <SelectTrigger data-testid="select-template">
                              <SelectValue placeholder="Escolha um template" />
                            </SelectTrigger>
                            <SelectContent>
                              {templates?.templates?.map((template) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {getCategoryIcon(template.category)} {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="product" className="space-y-4">
                        <div>
                          <Label htmlFor="productName">Nome do Produto</Label>
                          <Input
                            id="productName"
                            {...form.register("productInfo.name")}
                            placeholder="Ex: Curso de Marketing Digital"
                            data-testid="input-product-name"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="productDescription">Descrição do Produto</Label>
                          <Textarea
                            id="productDescription"
                            {...form.register("productInfo.description")}
                            placeholder="Descreva o que seu produto faz e os problemas que resolve..."
                            data-testid="input-product-description"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="price">Preço</Label>
                            <Input
                              id="price"
                              type="number"
                              step="0.01"
                              {...form.register("productInfo.price", { valueAsNumber: true })}
                              placeholder="97.00"
                              data-testid="input-product-price"
                            />
                          </div>
                          <div>
                            <Label htmlFor="currency">Moeda</Label>
                            <Select onValueChange={(value) => form.setValue("productInfo.currency", value)}>
                              <SelectTrigger data-testid="select-currency">
                                <SelectValue placeholder="EUR" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="EUR">EUR (€)</SelectItem>
                                <SelectItem value="USD">USD ($)</SelectItem>
                                <SelectItem value="BRL">BRL (R$)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="targetAudience">Público-Alvo</Label>
                          <Input
                            id="targetAudience"
                            {...form.register("productInfo.targetAudience")}
                            placeholder="Ex: Empreendedores digitais iniciantes"
                            data-testid="input-target-audience"
                          />
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="tracking" className="space-y-4">
                        <div>
                          <Label htmlFor="facebookPixel">Facebook Pixel ID (Opcional)</Label>
                          <Input
                            id="facebookPixel"
                            {...form.register("trackingConfig.facebookPixelId")}
                            placeholder="123456789012345"
                            data-testid="input-facebook-pixel"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="googleAnalytics">Google Analytics ID (Opcional)</Label>
                          <Input
                            id="googleAnalytics"
                            {...form.register("trackingConfig.googleAnalyticsId")}
                            placeholder="GA-XXXXXXXXX-X"
                            data-testid="input-google-analytics"
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                    
                    <div className="flex gap-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setOpenDialog(null)}
                        data-testid="button-cancel"
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-gradient-to-r from-blue-600 to-purple-600"
                        data-testid="button-submit-funnel"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Criar com IA
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Vercel Integration Status */}
        {!vercelIntegration?.connected && (
          <Card className="bg-yellow-500/10 border-yellow-500/20 mb-8">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <div>
                  <h3 className="text-white font-semibold">Conectar com Vercel</h3>
                  <p className="text-gray-400 text-sm">
                    Conecte sua conta Vercel para criar e hospedar funis automaticamente
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleConnectVercel}
                className="bg-black text-white hover:bg-gray-800"
                data-testid="button-connect-vercel-card"
              >
                <Zap className="w-4 h-4 mr-2" />
                Conectar Agora
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Templates Section */}
        {templates?.templates && templates.templates.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4" data-testid="text-templates-title">
              Templates Disponíveis
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.templates.slice(0, 3).map((template) => (
                <Card key={template.id} className="bg-black/20 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <span className="text-lg">{getCategoryIcon(template.category)}</span>
                      {template.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 text-xs mb-3">{template.description}</p>
                    <div className="flex gap-2 flex-wrap">
                      {template.templateConfig.sections.slice(0, 3).map((section) => (
                        <Badge key={section} variant="outline" className="text-xs">
                          {section}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Funnels List */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4" data-testid="text-funnels-title">
            Meus Funis
          </h2>
          
          {!funnelsData?.funnels || funnelsData.funnels.length === 0 ? (
            <Card className="bg-black/20 backdrop-blur-sm border-white/10">
              <CardContent className="text-center py-12">
                <Rocket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-white font-semibold mb-2">Nenhum funil criado ainda</h3>
                <p className="text-gray-400 mb-6">
                  Crie seu primeiro funil de venda com IA e comece a converter visitantes em clientes
                </p>
                {vercelIntegration?.connected && (
                  <Button 
                    onClick={() => setOpenDialog('create')}
                    className="bg-gradient-to-r from-blue-600 to-purple-600"
                    data-testid="button-create-first-funnel"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Funil
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {funnelsData.funnels.map((funnel) => (
                <Card key={funnel.id} className="bg-black/20 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-white text-lg" data-testid={`text-funnel-name-${funnel.id}`}>
                        {funnel.name}
                      </CardTitle>
                      {getStatusBadge(funnel.status)}
                    </div>
                    {funnel.description && (
                      <CardDescription className="text-gray-400" data-testid={`text-funnel-description-${funnel.id}`}>
                        {funnel.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {funnel.templateName && (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Star className="w-4 h-4" />
                        {funnel.templateName}
                      </div>
                    )}
                    
                    {funnel.deploymentUrl && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-green-400" />
                        <a 
                          href={funnel.deploymentUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-green-400 hover:text-green-300 text-sm flex items-center gap-1"
                          data-testid={`link-view-funnel-${funnel.id}`}
                        >
                          Ver Funil <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Criado em {new Date(funnel.createdAt).toLocaleDateString('pt-BR')}</span>
                      {funnel.aiCost && parseFloat(funnel.aiCost) > 0 && (
                        <span>IA: ${parseFloat(funnel.aiCost).toFixed(4)}</span>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        data-testid={`button-view-details-${funnel.id}`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Detalhes
                      </Button>
                      {funnel.status === 'ready' && (
                        <Button 
                          size="sm" 
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          data-testid={`button-deploy-${funnel.id}`}
                        >
                          <Rocket className="w-4 h-4 mr-1" />
                          Deploy
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}