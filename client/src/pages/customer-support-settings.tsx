import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CheckCircle, AlertCircle, Globe, Settings, Mail, Shield, Trash2, Edit3, Palette, Cog, Upload, Bot, Plus, X, Lightbulb, Sparkles, MessageCircle, Zap, Users, Heart, Star, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SupportConfig {
  emailDomain: string;
  emailPrefix: string;
  isCustomDomain: boolean;
  domainVerified: boolean;
  mailgunDomainName?: string;
}

interface DnsRecord {
  record_type: string;
  name: string;
  value: string;
  category: string;
  valid?: string;
  dns_type: string;
  priority?: string;
}

export default function CustomerSupportSettings() {
  // Hooks - all at the top
  const { toast } = useToast();
  const { selectedOperation, operations } = useCurrentOperation();
  const currentOperationId = selectedOperation;
  const currentOperationName = operations.find(op => op.id === selectedOperation)?.name;
  
  // State hooks
  const [emailPrefix, setEmailPrefix] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [supportServiceActive, setSupportServiceActive] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [aiDirectives, setAiDirectives] = useState<Array<{
    id: string;
    type: 'store_info' | 'product_info' | 'response_style' | 'custom';
    title: string;
    content: string;
    isActive: boolean;
  }>>([]);
  const [newDirectiveType, setNewDirectiveType] = useState<'store_info' | 'product_info' | 'response_style' | 'custom'>('store_info');
  const [newDirectiveTitle, setNewDirectiveTitle] = useState('');
  const [newDirectiveContent, setNewDirectiveContent] = useState('');
  const [isAddingDirective, setIsAddingDirective] = useState(false);
  const [designConfig, setDesignConfig] = useState({
    logo: "/images/n1-lblue.png",
    primaryColor: "#2563eb",
    backgroundColor: "#f8fafc",
    textColor: "#333333",
    logoAlignment: "center" as "left" | "center" | "right",
    secondaryTextColor: "#666666",
    signature: {
      name: "",
      position: "",
      phone: "",
      email: "",
      website: ""
    },
    card: {
      backgroundColor: "#ffffff",
      backgroundOpacity: 1,
      borderColor: "#e5e7eb",
      borderRadius: 8,
      borderWidth: {
        top: 1,
        right: 1,
        bottom: 1,
        left: 1
      }
    }
  });

  // Get current operation data
  const currentOperation = operations.find(op => op.id === selectedOperation);

  // Query hooks
  const { data: aiDirectivesData } = useQuery({
    queryKey: [`/api/customer-support/${currentOperationId}/ai-directives`],
    enabled: !!currentOperationId,
    staleTime: 0
  });

  const { data: designConfigData } = useQuery({
    queryKey: [`/api/customer-support/${currentOperationId}/design-config`],
    enabled: !!currentOperationId && supportServiceActive,
    staleTime: 0
  });

  const { data: supportConfig, isLoading: isSupportLoading, refetch: refetchSupport, error: supportError } = useQuery<SupportConfig>({
    queryKey: [`/api/customer-support/config/${currentOperationId}`],
    enabled: !!currentOperationId,
    retry: 3,
    retryDelay: 1000,
  });

  const { data: dnsRecordsData } = useQuery<{ success: boolean; dnsRecords: DnsRecord[] }>({
    queryKey: [`/api/customer-support/${currentOperationId}/dns-records/${supportConfig?.emailDomain}`],
    enabled: !!currentOperationId && !!supportConfig?.emailDomain,
    retry: 1,
  });

  // Mutation hooks
  const activateSupportMutation = useMutation({
    mutationFn: async (active: boolean) => {
      return apiRequest(`/api/operations/${currentOperationId}/support-service`, 'PUT', {
        supportServiceActive: active
      });
    },
    onSuccess: () => {
      setSupportServiceActive(true);
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      toast({
        title: "Serviço de suporte ativado",
        description: "O serviço de suporte ao cliente foi ativado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao ativar serviço",
        description: error.message || "Erro ao ativar o serviço de suporte",
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (config: typeof designConfig) => {
      let logoUrl = config.logo;
      
      if (logoFile) {
        setIsUploadingLogo(true);
        try {
          const uploadResponse = await fetch(`/api/objects/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
              'Content-Type': 'application/json'
            }
          }).then(async res => {
            if (res.status === 401 || res.status === 403) {
              localStorage.removeItem('auth_token');
              localStorage.removeItem('user');
              window.location.href = '/';
              throw new Error('Sessão expirada. Redirecionando para login...');
            }
            if (!res.ok) {
              const errorText = await res.text();
              throw new Error(`Erro ao obter URL de upload: ${res.status} ${res.statusText} - ${errorText}`);
            }
            return res.json();
          });
          
          const uploadResult = await fetch(uploadResponse.uploadURL, {
            method: 'PUT',
            body: logoFile,
            headers: {
              'Content-Type': logoFile.type,
            }
          });
          
          if (!uploadResult.ok) {
            throw new Error(`Erro no upload: ${uploadResult.status} ${uploadResult.statusText}`);
          }
          
          const urlPath = new URL(uploadResponse.uploadURL).pathname;
          const bucketName = uploadResponse.uploadURL.split('/')[3];
          const objectPath = urlPath.replace(`/${bucketName}/`, '');
          logoUrl = `/objects/${objectPath.replace('.private/', '')}`;
        } catch (error) {
          throw new Error(`Erro no upload do logo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        } finally {
          setIsUploadingLogo(false);
        }
      }

      const dataToSave = {
        logo: logoUrl,
        primaryColor: config.primaryColor,
        backgroundColor: config.backgroundColor,
        textColor: config.textColor,
        logoAlignment: config.logoAlignment || "center",
        secondaryTextColor: config.secondaryTextColor || "#666666",
        signature: config.signature,
        card: config.card
      };
      return apiRequest(`/api/customer-support/${currentOperationId}/design-config`, 'PUT', dataToSave);
    },
    onSuccess: () => {
      toast({
        title: "Configurações salvas!",
        description: "As configurações de design foram salvas com sucesso.",
      });
      setLogoFile(null);
      queryClient.invalidateQueries({ queryKey: [`/api/customer-support/${currentOperationId}/design-config`] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Erro ao salvar as configurações",
        variant: "destructive",
      });
    },
  });

  const configureDomainMutation = useMutation({
    mutationFn: async ({ domain, emailPrefix }: { domain: string; emailPrefix: string }) => {
      const response = await fetch(`/api/customer-support/${currentOperationId}/configure-domain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ domain, emailPrefix, isCustomDomain: true })
      });
      if (!response.ok) throw new Error('Failed to configure domain');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email configurado",
        description: "O email foi configurado com sucesso. Aguarde a verificação.",
      });
      refetchSupport();
      setEmailPrefix("");
      setCustomDomain("");
    },
    onError: () => {
      toast({
        title: "Erro na configuração",
        description: "Não foi possível configurar o domínio.",
        variant: "destructive",
      });
    },
  });

  const verifyDomainMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/customer-support/${currentOperationId}/verify-domain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ domain: supportConfig?.emailDomain })
      });
      if (!response.ok) throw new Error('Failed to verify domain');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.verified ? "Domínio verificado" : "Verificação pendente",
        description: data.message,
        variant: data.verified ? "default" : "destructive",
      });
      refetchSupport();
    },
    onError: () => {
      toast({
        title: "Erro na verificação",
        description: "Falha ao verificar o domínio.",
        variant: "destructive",
      });
    }
  });

  const addDirectiveMutation = useMutation({
    mutationFn: async (directive: { type: string; title: string; content: string; isActive: boolean }) => {
      return apiRequest(`/api/customer-support/${currentOperationId}/ai-directives`, 'POST', directive);
    },
    onSuccess: () => {
      toast({
        title: "Diretiva adicionada",
        description: "A diretiva foi adicionada com sucesso.",
      });
      setNewDirectiveTitle('');
      setNewDirectiveContent('');
      setIsAddingDirective(false);
      queryClient.invalidateQueries({ queryKey: [`/api/customer-support/${currentOperationId}/ai-directives`] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar diretiva",
        description: error.message || "Erro ao adicionar a diretiva",
        variant: "destructive",
      });
    },
  });

  const updateDirectiveMutation = useMutation({
    mutationFn: async ({ directiveId, updates }: { directiveId: string; updates: Partial<any> }) => {
      return apiRequest(`/api/customer-support/${currentOperationId}/ai-directives/${directiveId}`, 'PUT', updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customer-support/${currentOperationId}/ai-directives`] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar diretiva",
        description: error.message || "Erro ao atualizar a diretiva",
        variant: "destructive",
      });
    },
  });

  const deleteDirectiveMutation = useMutation({
    mutationFn: async (directiveId: string) => {
      return apiRequest(`/api/customer-support/${currentOperationId}/ai-directives/${directiveId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Diretiva removida",
        description: "A diretiva foi removida com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/customer-support/${currentOperationId}/ai-directives`] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover diretiva",
        description: error.message || "Erro ao remover a diretiva",
        variant: "destructive",
      });
    },
  });

  // Effect hooks
  useEffect(() => {
    if (aiDirectivesData && Array.isArray(aiDirectivesData)) {
      setAiDirectives(aiDirectivesData);
    }
  }, [aiDirectivesData]);

  useEffect(() => {
    if (currentOperation && 'supportServiceActive' in currentOperation) {
      setSupportServiceActive(Boolean(currentOperation.supportServiceActive));
    } else {
      setSupportServiceActive(false);
    }
  }, [currentOperation]);

  useEffect(() => {
    if (designConfigData && typeof designConfigData === 'object') {
      const configData = designConfigData as any;
      const processedConfig = {
        ...designConfig,
        ...configData,
        logo: configData?.logo?.includes?.('storage.googleapis.com') 
          ? configData.logo.replace(/.*\/\.private\//, '/objects/') 
          : configData?.logo || designConfig.logo,
        logoAlignment: configData?.logoAlignment || designConfig.logoAlignment || "center",
        secondaryTextColor: configData?.secondaryTextColor || designConfig.secondaryTextColor || "#666666",
        signature: {
          ...designConfig.signature,
          ...(configData?.signature || {})
        },
        card: {
          ...designConfig.card,
          ...(configData?.card || {}),
          borderWidth: {
            ...designConfig.card.borderWidth,
            ...(configData?.card?.borderWidth || {})
          }
        }
      };
      setDesignConfig(processedConfig);
    }
  }, [designConfigData]);

  // Helper functions
  const getDirectiveTypeIcon = (type: string) => {
    switch (type) {
      case 'store_info': return <Globe className="w-4 h-4" />;
      case 'product_info': return <Sparkles className="w-4 h-4" />;
      case 'response_style': return <Bot className="w-4 h-4" />;
      case 'custom': return <Lightbulb className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getDirectiveTypeLabel = (type: string) => {
    switch (type) {
      case 'store_info': return 'Informações da Loja';
      case 'product_info': return 'Informações do Produto';
      case 'response_style': return 'Estilo de Resposta';
      case 'custom': return 'Personalizada';
      default: return 'Personalizada';
    }
  };

  const handleActivateSupport = () => {
    setShowActivationModal(true);
  };

  const confirmActivation = () => {
    activateSupportMutation.mutate(true);
    setShowActivationModal(false);
  };

  const handleSaveDesignConfig = () => {
    saveMutation.mutate(designConfig);
  };

  const handleConfigureDomain = () => {
    if (!emailPrefix.trim() || !customDomain.trim()) return;
    configureDomainMutation.mutate({ 
      domain: customDomain.trim(), 
      emailPrefix: emailPrefix.trim() 
    });
  };

  const handleVerifyDomain = () => {
    setIsVerifying(true);
    verifyDomainMutation.mutate();
  };

  // Conditional rendering - promotional page if service not active
  if (!supportServiceActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800">
        <div className="container mx-auto px-4 py-12">
          
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-white mb-4 mt-10">
              Transforme seu{" "}
              <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                Atendimento
              </span>{" "}
              ao Cliente
            </h1>
            <p className="text-lg text-gray-300 mb-6 max-w-2xl mx-auto">
              Active o sistema de suporte inteligente da {currentOperationName} e ofereça um atendimento personalizado e eficiente para seus clientes.
            </p>
            
            {/* Main CTA */}
            <div 
              className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6 max-w-md mx-auto mb-8 hover:bg-black/30 transition-all duration-300"
              style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-white font-medium">Ativar Serviço de Suporte</span>
                <Switch
                  checked={false}
                  onCheckedChange={handleActivateSupport}
                  className="data-[state=checked]:bg-blue-600"
                  data-testid="toggle-support-service"
                />
              </div>
              <p className="text-gray-300 text-sm">
                Comece agora e pague apenas pelo que usar
              </p>
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <div 
              className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-5 hover:bg-black/30 transition-all duration-300"
              style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
            >
              <div className="w-12 h-12 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">IA Sofia</h3>
              <p className="text-gray-400 text-sm">
                Assistente virtual empática que responde automaticamente a dúvidas, cancelamentos e alterações de endereço.
              </p>
            </div>

            <div 
              className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-5 hover:bg-black/30 transition-all duration-300"
              style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
            >
              <div className="w-12 h-12 flex items-center justify-center mb-4">
                <Zap className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Resposta Instantânea</h3>
              <p className="text-gray-400 text-sm">
                Categorização automática e respostas em segundos para as principais demandas dos seus clientes.
              </p>
            </div>

            <div 
              className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-5 hover:bg-black/30 transition-all duration-300"
              style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
            >
              <div className="w-12 h-12 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Totalmente Personalizável</h3>
              <p className="text-gray-400 text-sm">
                Configure diretivas específicas da sua operação para respostas alinhadas com sua marca.
              </p>
            </div>

            <div 
              className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-5 hover:bg-black/30 transition-all duration-300"
              style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
            >
              <div className="w-12 h-12 flex items-center justify-center mb-4">
                <Heart className="w-8 h-8 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Experiência Humanizada</h3>
              <p className="text-gray-400 text-sm">
                Templates de email elegantes e assinatura personalizada para uma comunicação profissional.
              </p>
            </div>

            <div 
              className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-5 hover:bg-black/30 transition-all duration-300"
              style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
            >
              <div className="w-12 h-12 flex items-center justify-center mb-4">
                <Star className="w-8 h-8 text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Gestão Inteligente</h3>
              <p className="text-gray-400 text-sm">
                Dashboard completo para acompanhar tickets, categorias e métricas de atendimento.
              </p>
            </div>

            <div 
              className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-5 hover:bg-black/30 transition-all duration-300"
              style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
            >
              <div className="w-12 h-12 flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Disponível 24/7</h3>
              <p className="text-gray-400 text-sm">
                Atendimento automático a qualquer hora, garantindo que seus clientes sempre tenham suporte.
              </p>
            </div>
          </div>

          {/* Pricing Info */}
          <div className="text-center">
            <div 
              className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-8 max-w-lg mx-auto hover:bg-black/30 transition-all duration-300"
              style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
            >
              <h3 className="text-xl font-bold text-white mb-4">Modelo de Cobrança</h3>
              <p className="text-gray-400 mb-6">
                Pague apenas pelo que usar. Cada email processado pela IA será cobrado conforme a tabela de preços.
              </p>
              <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-300 font-medium">
                  💡 Comece agora sem custos fixos
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Activation Modal */}
        <Dialog open={showActivationModal} onOpenChange={setShowActivationModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Ativar Serviço de Suporte</DialogTitle>
              <DialogDescription className="space-y-3">
                <p>
                  Você está prestes a ativar o serviço de suporte ao cliente para sua operação.
                </p>
                <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-yellow-300 text-sm font-medium">
                    ⚠️ Esta funcionalidade é paga por demanda
                  </p>
                  <p className="text-yellow-200 text-sm mt-1">
                    O valor será adicionado à sua fatura conforme o uso de emails processados pela IA.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowActivationModal(false)}
                data-testid="button-cancel-activation"
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmActivation}
                disabled={activateSupportMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-confirm-activation"
              >
                {activateSupportMutation.isPending ? "Ativando..." : "Ativar Serviço"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Main dashboard content when service is active
  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="font-bold tracking-tight text-gray-100" style={{ fontSize: '20px' }}>
            Configurações do Suporte
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Configure domínio personalizado e verificação para {currentOperationName}
          </p>
        </div>
      </div>

      {/* Tabs Container */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-black/20 backdrop-blur-sm border border-white/10">
          <TabsTrigger value="general" className="flex items-center gap-2 data-[state=active]:bg-white/10">
            <Cog className="w-4 h-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="ai-training" className="flex items-center gap-2 data-[state=active]:bg-white/10">
            <Bot className="w-4 h-4" />
            Treinamento IA
          </TabsTrigger>
          <TabsTrigger value="design" className="flex items-center gap-2 data-[state=active]:bg-white/10">
            <Palette className="w-4 h-4" />
            Design
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6 mt-6">
          
          {/* Emails Configurados */}
          {supportConfig?.emailDomain && (
            <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-green-400" />
                    <CardTitle className="text-white" style={{ fontSize: '18px' }}>Emails Configurados</CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-green-600/20 text-green-400 border-green-600/30">
                    1 email ativo
                  </Badge>
                </div>
                <CardDescription>
                  Emails de suporte configurados para esta operação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-600/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${supportConfig.domainVerified ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                      <div className="space-y-1">
                        <p className="text-white font-medium">
                          {supportConfig.emailPrefix}@{supportConfig.emailDomain}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {supportConfig.domainVerified ? 'Domínio verificado' : 'Verificação pendente'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={supportConfig.domainVerified ? "default" : "secondary"}
                        className={supportConfig.domainVerified ? "bg-green-600/20 text-green-400 border-green-600/30" : "bg-yellow-600/20 text-yellow-400 border-yellow-600/30"}
                      >
                        {supportConfig.domainVerified ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Ativo
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Pendente
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Configurar Domínio de Email</CardTitle>
              <CardDescription>
                Configure um domínio personalizado para os emails de suporte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email-prefix" className="text-white">Prefixo do Email</Label>
                  <Input
                    id="email-prefix"
                    value={emailPrefix}
                    onChange={(e) => setEmailPrefix(e.target.value)}
                    placeholder="suporte"
                    className="bg-gray-800/50 border-gray-600/30 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-domain" className="text-white">Domínio</Label>
                  <Input
                    id="custom-domain"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="meusite.com"
                    className="bg-gray-800/50 border-gray-600/30 text-white"
                  />
                </div>
              </div>
              <Button
                onClick={handleConfigureDomain}
                disabled={!emailPrefix.trim() || !customDomain.trim() || configureDomainMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {configureDomainMutation.isPending ? "Configurando..." : "Configurar Email"}
              </Button>
            </CardContent>
          </Card>

          {/* DNS Records */}
          {supportConfig?.emailDomain && dnsRecordsData?.dnsRecords && Array.isArray(dnsRecordsData.dnsRecords) && (
            <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Registros DNS</CardTitle>
                <CardDescription>
                  Configure estes registros DNS no seu provedor de domínio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dnsRecordsData.dnsRecords.map((record, index) => (
                    <div key={index} className="p-3 bg-gray-800/50 rounded-lg border border-gray-600/30">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Tipo:</span>
                          <p className="text-white font-mono">{record.record_type}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Nome:</span>
                          <p className="text-white font-mono break-all">{record.name}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Valor:</span>
                          <p className="text-white font-mono break-all">{record.value}</p>
                        </div>
                      </div>
                      {record.priority && (
                        <div className="mt-2">
                          <span className="text-gray-400">Prioridade:</span>
                          <span className="text-white font-mono ml-2">{record.priority}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleVerifyDomain}
                  disabled={verifyDomainMutation.isPending}
                  className="mt-4 bg-green-600 hover:bg-green-700 text-white"
                >
                  {verifyDomainMutation.isPending ? "Verificando..." : "Verificar Domínio"}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Training Tab */}
        <TabsContent value="ai-training" className="space-y-6 mt-6">
          <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Diretivas da IA</CardTitle>
              <CardDescription>
                Configure como a IA Sofia deve responder aos clientes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiDirectives.map((directive) => (
                <div key={directive.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-600/30">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex items-center gap-2">
                        {getDirectiveTypeIcon(directive.type)}
                        <Badge variant="outline" className="text-xs">
                          {getDirectiveTypeLabel(directive.type)}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{directive.title}</h4>
                        <p className="text-gray-400 text-sm mt-1">{directive.content}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={directive.isActive}
                        onCheckedChange={() => updateDirectiveMutation.mutate({
                          directiveId: directive.id,
                          updates: { isActive: !directive.isActive }
                        })}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteDirectiveMutation.mutate(directive.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {!isAddingDirective ? (
                <Button
                  onClick={() => setIsAddingDirective(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Diretiva
                </Button>
              ) : (
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-600/30 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white">Tipo</Label>
                    <select
                      value={newDirectiveType}
                      onChange={(e) => setNewDirectiveType(e.target.value as any)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                    >
                      <option value="store_info">Informações da Loja</option>
                      <option value="product_info">Informações do Produto</option>
                      <option value="response_style">Estilo de Resposta</option>
                      <option value="custom">Personalizada</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Título</Label>
                    <Input
                      value={newDirectiveTitle}
                      onChange={(e) => setNewDirectiveTitle(e.target.value)}
                      placeholder="Ex: Política de Trocas"
                      className="bg-gray-800/50 border-gray-600/30 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Conteúdo</Label>
                    <Textarea
                      value={newDirectiveContent}
                      onChange={(e) => setNewDirectiveContent(e.target.value)}
                      placeholder="Descreva as instruções para a IA..."
                      className="bg-gray-800/50 border-gray-600/30 text-white min-h-[100px]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => addDirectiveMutation.mutate({
                        type: newDirectiveType,
                        title: newDirectiveTitle,
                        content: newDirectiveContent,
                        isActive: true
                      })}
                      disabled={!newDirectiveTitle.trim() || !newDirectiveContent.trim()}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Salvar
                    </Button>
                    <Button
                      onClick={() => {
                        setIsAddingDirective(false);
                        setNewDirectiveTitle('');
                        setNewDirectiveContent('');
                      }}
                      variant="outline"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Design Tab */}
        <TabsContent value="design" className="space-y-6 mt-6">
          <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Personalização de Design</CardTitle>
              <CardDescription>
                Configure a aparência dos emails de suporte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-4">
                <Label className="text-white">Logo da Empresa</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
                    {designConfig.logo ? (
                      <img src={designConfig.logo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Upload className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setLogoFile(file);
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            setDesignConfig(prev => ({
                              ...prev,
                              logo: e.target?.result as string
                            }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="logo-upload"
                    />
                    <Button
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      variant="outline"
                      className="bg-gray-800/50 border-gray-600/30 text-white hover:bg-gray-700/50"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Carregar Logo
                    </Button>
                  </div>
                </div>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Cor Primária</Label>
                  <Input
                    type="color"
                    value={designConfig.primaryColor}
                    onChange={(e) => setDesignConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="h-10 bg-gray-800/50 border-gray-600/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Cor de Fundo</Label>
                  <Input
                    type="color"
                    value={designConfig.backgroundColor}
                    onChange={(e) => setDesignConfig(prev => ({ ...prev, backgroundColor: e.target.value }))}
                    className="h-10 bg-gray-800/50 border-gray-600/30"
                  />
                </div>
              </div>

              {/* Signature */}
              <div className="space-y-4">
                <Label className="text-white">Assinatura do Email</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Nome</Label>
                    <Input
                      value={designConfig.signature.name}
                      onChange={(e) => setDesignConfig(prev => ({
                        ...prev,
                        signature: { ...prev.signature, name: e.target.value }
                      }))}
                      placeholder="João Silva"
                      className="bg-gray-800/50 border-gray-600/30 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Cargo</Label>
                    <Input
                      value={designConfig.signature.position}
                      onChange={(e) => setDesignConfig(prev => ({
                        ...prev,
                        signature: { ...prev.signature, position: e.target.value }
                      }))}
                      placeholder="Gerente de Suporte"
                      className="bg-gray-800/50 border-gray-600/30 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Telefone</Label>
                    <Input
                      value={designConfig.signature.phone}
                      onChange={(e) => setDesignConfig(prev => ({
                        ...prev,
                        signature: { ...prev.signature, phone: e.target.value }
                      }))}
                      placeholder="(11) 99999-9999"
                      className="bg-gray-800/50 border-gray-600/30 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Website</Label>
                    <Input
                      value={designConfig.signature.website}
                      onChange={(e) => setDesignConfig(prev => ({
                        ...prev,
                        signature: { ...prev.signature, website: e.target.value }
                      }))}
                      placeholder="www.meusite.com"
                      className="bg-gray-800/50 border-gray-600/30 text-white"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSaveDesignConfig}
                disabled={saveMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}