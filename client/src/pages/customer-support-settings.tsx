import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  CheckCircle, AlertCircle, Globe, Settings, Mail, Shield, Trash2, Edit3, 
  Palette, Cog, Upload, Bot, Plus, X, Lightbulb, Sparkles, MessageCircle, 
  Zap, Users, Heart, Star, Clock 
} from "lucide-react";

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

interface AiDirective {
  id: string;
  type: 'store_info' | 'product_info' | 'response_style' | 'custom';
  title: string;
  content: string;
  isActive: boolean;
}

export default function CustomerSupportSettings() {
  // All hooks at the top level in consistent order
  const { toast } = useToast();
  const { selectedOperation, operations } = useCurrentOperation();
  
  // All useState hooks
  const [emailPrefix, setEmailPrefix] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [supportServiceActive, setSupportServiceActive] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [aiDirectives, setAiDirectives] = useState<AiDirective[]>([]);
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
  
  // Computed values
  const currentOperationId = selectedOperation;
  const currentOperationName = operations.find(op => op.id === selectedOperation)?.name;
  const currentOperation = operations.find(op => op.id === selectedOperation);

  // All useQuery hooks in consistent order
  const { data: supportConfig, isLoading: configLoading, refetch: refetchConfig } = useQuery<SupportConfig>({
    queryKey: [`/api/customer-support/config/${currentOperationId}`],
    enabled: !!currentOperationId,
    staleTime: 0
  });

  const { data: dnsRecordsData } = useQuery<{ success: boolean; dnsRecords: DnsRecord[] }>({
    queryKey: [`/api/customer-support/${currentOperationId}/dns-records/${supportConfig?.emailDomain}`],
    enabled: !!currentOperationId && !!supportConfig?.emailDomain && supportConfig.isCustomDomain,
    staleTime: 0
  });

  const { data: aiDirectivesData } = useQuery({
    queryKey: [`/api/customer-support/${currentOperationId}/ai-directives`],
    enabled: !!currentOperationId,
    staleTime: 0
  });

  const { data: designConfigData } = useQuery({
    queryKey: [`/api/customer-support/${currentOperationId}/design-config`],
    enabled: !!currentOperationId,
    staleTime: 0
  });

  // All useMutation hooks
  const configureDomainMutation = useMutation({
    mutationFn: async ({ emailPrefix, customDomain }: { emailPrefix: string; customDomain: string }) => {
      return await apiRequest(`/api/customer-support/config/${currentOperationId}`, {
        method: "POST",
        body: JSON.stringify({
          emailPrefix,
          customDomain,
          isCustomDomain: true,
        }),
      });
    },
    onSuccess: () => {
      refetchConfig();
      toast({
        title: "Email configurado",
        description: "Email de suporte configurado com sucesso. Configure os registros DNS.",
      });
      setEmailPrefix("");
      setCustomDomain("");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao configurar email. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const verifyDomainMutation = useMutation({
    mutationFn: async () => {
      if (!supportConfig?.emailDomain) throw new Error("Nenhum domínio configurado");
      return await apiRequest(`/api/customer-support/${currentOperationId}/verify-domain/${supportConfig.emailDomain}`, {
        method: "POST",
      });
    },
    onSuccess: (data) => {
      if (data.verified) {
        refetchConfig();
        toast({
          title: "Domínio verificado",
          description: "Domínio verificado com sucesso! O serviço de email está ativo.",
        });
      } else {
        toast({
          title: "Verificação falhada",
          description: "Alguns registros DNS ainda não foram configurados corretamente.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao verificar domínio. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const saveAiDirectivesMutation = useMutation({
    mutationFn: async (directives: AiDirective[]) => {
      return await apiRequest(`/api/customer-support/${currentOperationId}/ai-directives`, {
        method: "POST",
        body: JSON.stringify({ directives }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/customer-support/${currentOperationId}/ai-directives`],
      });
      toast({
        title: "Diretivas salvas",
        description: "As diretivas da IA foram atualizadas com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao salvar as diretivas. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const saveDesignMutation = useMutation({
    mutationFn: async (config: typeof designConfig) => {
      let logoUrl = config.logo;
      
      if (logoFile) {
        try {
          setIsUploadingLogo(true);
          const formData = new FormData();
          formData.append('logo', logoFile);
          
          const response = await fetch(`/api/customer-support/${currentOperationId}/upload-logo`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: formData
          });
          
          if (!response.ok) throw new Error('Upload failed');
          const result = await response.json();
          logoUrl = result.logoUrl;
        } catch (error) {
          throw new Error('Erro no upload do logo');
        } finally {
          setIsUploadingLogo(false);
        }
      }

      return await apiRequest(`/api/customer-support/${currentOperationId}/design-config`, {
        method: 'PUT',
        body: JSON.stringify({ ...config, logo: logoUrl }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Configurações salvas",
        description: "As configurações de design foram aplicadas com sucesso.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/customer-support/${currentOperationId}/design-config`]
      });
      setLogoFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    }
  });

  const activateSupportMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/operations/${currentOperationId}`, {
        method: "PATCH",
        body: JSON.stringify({ supportServiceActive: true }),
      });
    },
    onSuccess: () => {
      setSupportServiceActive(true);
      setShowActivationModal(false);
      queryClient.invalidateQueries({ queryKey: ["/api/operations"] });
      toast({
        title: "Serviço Ativado!",
        description: "O suporte automatizado está agora ativo para esta operação.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao ativar o serviço. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // All useEffect hooks
  useEffect(() => {
    if (aiDirectivesData && Array.isArray(aiDirectivesData)) {
      setAiDirectives(aiDirectivesData);
    }
  }, [aiDirectivesData]);

  useEffect(() => {
    if (currentOperation && 'supportServiceActive' in currentOperation) {
      setSupportServiceActive(currentOperation.supportServiceActive);
    } else {
      setSupportServiceActive(false);
    }
  }, [currentOperation]);

  useEffect(() => {
    if (designConfigData) {
      setDesignConfig(prev => ({
        ...prev,
        ...designConfigData,
        signature: designConfigData.signature || prev.signature,
        card: designConfigData.card || prev.card
      }));
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

  const handleConfigureDomain = () => {
    if (!emailPrefix.trim() || !customDomain.trim()) return;
    configureDomainMutation.mutate({ emailPrefix: emailPrefix.trim(), customDomain: customDomain.trim() });
  };

  const handleVerifyDomain = () => {
    setIsVerifying(true);
    verifyDomainMutation.mutate(undefined, {
      onSettled: () => setIsVerifying(false)
    });
  };

  const handleAddDirective = () => {
    if (!newDirectiveTitle.trim() || !newDirectiveContent.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Título e conteúdo são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const newDirective = {
      id: Math.random().toString(36).substr(2, 9),
      type: newDirectiveType,
      title: newDirectiveTitle.trim(),
      content: newDirectiveContent.trim(),
      isActive: true
    };

    const updatedDirectives = [...aiDirectives, newDirective];
    setAiDirectives(updatedDirectives);
    setNewDirectiveTitle('');
    setNewDirectiveContent('');
    setIsAddingDirective(false);
    saveAiDirectivesMutation.mutate(updatedDirectives);
  };

  const handleRemoveDirective = (id: string) => {
    const updatedDirectives = aiDirectives.filter(d => d.id !== id);
    setAiDirectives(updatedDirectives);
    saveAiDirectivesMutation.mutate(updatedDirectives);
  };

  const handleToggleDirective = (id: string) => {
    const updatedDirectives = aiDirectives.map(d => 
      d.id === id ? { ...d, isActive: !d.isActive } : d
    );
    setAiDirectives(updatedDirectives);
    saveAiDirectivesMutation.mutate(updatedDirectives);
  };

  const handleSaveDesign = () => {
    saveDesignMutation.mutate(designConfig);
  };

  // Loading states
  if (!currentOperationId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando operação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Configurações de Suporte
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure o suporte automatizado para {currentOperationName}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Switch
            checked={supportServiceActive}
            onCheckedChange={(checked) => {
              if (checked) {
                setShowActivationModal(true);
              }
            }}
            data-testid="support-service-toggle"
          />
          <span className={`text-sm font-medium ${supportServiceActive ? 'text-green-600' : 'text-gray-600'}`}>
            {supportServiceActive ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>

      {!supportServiceActive && (
        <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <MessageCircle className="w-12 h-12 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white mb-2">
                  Ativar Suporte Automatizado
                </h3>
                <p className="text-gray-300 mb-4">
                  Transforme seu atendimento com IA avançada e respostas automáticas inteligentes.
                </p>
                <Button
                  onClick={() => setShowActivationModal(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Ativar Agora
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-black/20 backdrop-blur-sm">
          <TabsTrigger value="general" className="data-[state=active]:bg-blue-600">
            <Settings className="w-4 h-4 mr-2" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="ai-training" className="data-[state=active]:bg-blue-600">
            <Bot className="w-4 h-4 mr-2" />
            Treinamento IA
          </TabsTrigger>
          <TabsTrigger value="design" className="data-[state=active]:bg-blue-600">
            <Palette className="w-4 h-4 mr-2" />
            Design
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6 mt-6">
          <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Email de Suporte</CardTitle>
              <CardDescription>
                Configure um email personalizado para receber tickets de suporte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {supportConfig?.isCustomDomain && supportConfig.emailDomain ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Badge variant={supportConfig.domainVerified ? "default" : "secondary"}>
                      {supportConfig.domainVerified ? (
                        <><CheckCircle className="w-3 h-3 mr-1" /> Verificado</>
                      ) : (
                        <><AlertCircle className="w-3 h-3 mr-1" /> Pendente</>
                      )}
                    </Badge>
                    <span className="text-white font-mono">
                      {supportConfig.emailPrefix}@{supportConfig.emailDomain}
                    </span>
                  </div>
                </div>
              ) : (
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
              )}
              
              {!supportConfig?.isCustomDomain && (
                <Button
                  onClick={handleConfigureDomain}
                  disabled={!emailPrefix.trim() || !customDomain.trim() || configureDomainMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {configureDomainMutation.isPending ? "Configurando..." : "Configurar Email"}
                </Button>
              )}
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
                        onCheckedChange={() => handleToggleDirective(directive.id)}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveDirective(directive.id)}
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
                      onClick={handleAddDirective}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  onClick={handleSaveDesign}
                  disabled={saveDesignMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {saveDesignMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Preview do Email</CardTitle>
                <CardDescription>
                  Visualize como ficará o email de suporte
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="p-6 rounded-lg border"
                  style={{ 
                    backgroundColor: designConfig.backgroundColor,
                    borderColor: designConfig.card.borderColor 
                  }}
                >
                  <div className="flex items-center mb-4">
                    {designConfig.logo && (
                      <img 
                        src={designConfig.logo} 
                        alt="Logo" 
                        className="h-8 w-auto mr-4" 
                      />
                    )}
                    <div>
                      <h3 
                        className="text-lg font-semibold"
                        style={{ color: designConfig.primaryColor }}
                      >
                        Resposta Automática
                      </h3>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <p style={{ color: designConfig.textColor }}>
                      Olá! Recebemos sua mensagem e nossa IA Sofia irá te ajudar.
                    </p>
                  </div>

                  <div className="border-t pt-4" style={{ borderColor: designConfig.card.borderColor }}>
                    <div className="text-sm" style={{ color: designConfig.secondaryTextColor }}>
                      <p className="font-medium">{designConfig.signature.name || "Nome"}</p>
                      <p>{designConfig.signature.position || "Cargo"}</p>
                      {designConfig.signature.phone && <p>{designConfig.signature.phone}</p>}
                      {designConfig.signature.website && (
                        <p>
                          <a 
                            href={`https://${designConfig.signature.website}`}
                            style={{ color: designConfig.primaryColor }}
                          >
                            {designConfig.signature.website}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Activation Modal */}
      <Dialog open={showActivationModal} onOpenChange={setShowActivationModal}>
        <DialogContent className="bg-gray-900/95 backdrop-blur-sm border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center">
              <Zap className="w-5 h-5 mr-2 text-yellow-400" />
              Ativar Suporte Automatizado
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Transforme seu atendimento com IA avançada e maximize sua eficiência operacional.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 my-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">IA Sofia</p>
                <p className="text-gray-400 text-xs">Respostas inteligentes</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-600/20 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">24/7</p>
                <p className="text-gray-400 text-xs">Disponibilidade total</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowActivationModal(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => activateSupportMutation.mutate()}
              disabled={activateSupportMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              {activateSupportMutation.isPending ? "Ativando..." : "Ativar Serviço"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}