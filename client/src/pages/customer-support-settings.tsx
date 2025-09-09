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
import { CheckCircle, AlertCircle, Globe, Settings, Mail, Shield, Trash2, Edit3, Palette, Cog, Upload } from "lucide-react";
import { Switch } from "@/components/ui/switch";

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
  const { toast } = useToast();
  const { selectedOperation, operations } = useCurrentOperation();
  const currentOperationId = selectedOperation;
  const currentOperationName = operations.find(op => op.id === selectedOperation)?.name;
  const [emailPrefix, setEmailPrefix] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Design configuration states
  const [designConfig, setDesignConfig] = useState({
    logo: "/images/n1-lblue.png",
    primaryColor: "#2563eb",
    backgroundColor: "#f8fafc",
    textColor: "#333333",
    logoAlignment: "center" as "left" | "center" | "right",
    // Cor de textos secundários
    secondaryTextColor: "#666666",
    // Assinatura personalizada
    signature: {
      name: "",
      position: "",
      phone: "",
      email: "",
      website: ""
    },
    // Configurações do card de conteúdo
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Get current design configuration
  const { data: designConfigData } = useQuery({
    queryKey: [`/api/customer-support/${currentOperationId}/design-config`],
    enabled: !!currentOperationId,
    staleTime: 0 // Always fetch fresh data
  });

  // Update local state when data from server changes
  useEffect(() => {
    if (designConfigData) {
      console.log('🔄 Updating design config from server:', designConfigData);
      // Convert Google Storage URLs to local object URLs if needed
      const processedConfig = {
        ...designConfig, // Start with current state to preserve defaults
        ...designConfigData,
        logo: designConfigData.logo?.includes('storage.googleapis.com') 
          ? designConfigData.logo.replace(/.*\/\.private\//, '/objects/') 
          : designConfigData.logo,
        // Preserve all new fields with defaults if not present
        logoAlignment: designConfigData.logoAlignment || designConfig.logoAlignment || "center",
        secondaryTextColor: designConfigData.secondaryTextColor || designConfig.secondaryTextColor || "#666666",
        signature: {
          ...designConfig.signature,
          ...(designConfigData.signature || {})
        },
        card: {
          ...designConfig.card,
          ...(designConfigData.card || {}),
          borderWidth: {
            ...designConfig.card.borderWidth,
            ...(designConfigData.card?.borderWidth || {})
          }
        }
      };
      console.log('🔧 Processed config:', processedConfig);
      setDesignConfig(processedConfig);
    }
  }, [designConfigData]);

  // Save design configuration mutation
  const saveMutation = useMutation({
    mutationFn: async (config: typeof designConfig) => {
      let logoUrl = config.logo;
      
      // Upload logo if a new file was selected
      if (logoFile) {
        setIsUploadingLogo(true);
        try {
          console.log('🔄 Iniciando upload do logo...');
          
          // Get upload URL
          console.log('🔗 Solicitando URL de upload...');
          const uploadResponse = await fetch(`/api/objects/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
              'Content-Type': 'application/json'
            }
          }).then(async res => {
            if (res.status === 401 || res.status === 403) {
              // Token expirado, redirecionar para login
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
          console.log('✅ URL de upload obtida:', uploadResponse.uploadURL);
          
          // Upload file
          console.log('📤 Fazendo upload do arquivo...');
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
          
          // Convert the upload URL to our object serving endpoint
          const urlPath = new URL(uploadResponse.uploadURL).pathname;
          const bucketName = uploadResponse.uploadURL.split('/')[3];
          const objectPath = urlPath.replace(`/${bucketName}/`, '');
          logoUrl = `/objects/${objectPath.replace('.private/', '')}`;
          console.log('✅ Upload concluído:', logoUrl);
        } catch (error) {
          console.error('❌ Erro detalhado no upload:', error);
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
      console.log('💾 Dados que serão enviados para salvar:', dataToSave);
      console.log('🎨 Card config detalhado:', config.card);
      return apiRequest(`/api/customer-support/${currentOperationId}/design-config`, 'PUT', dataToSave);
    },
    onSuccess: () => {
      toast({
        title: "Configurações salvas!",
        description: "As configurações de design foram aplicadas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/customer-support/${currentOperationId}/design-config`] });
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

  const handleSaveDesignConfig = () => {
    saveMutation.mutate(designConfig);
  };

  // Get current support configuration
  const { data: supportConfig, isLoading, refetch, error } = useQuery<SupportConfig>({
    queryKey: [`/api/customer-support/config/${currentOperationId}`],
    enabled: !!currentOperationId,
    retry: 3,
    retryDelay: 1000,
  });

  // Get DNS records for the domain
  const { data: dnsRecordsData } = useQuery<{ success: boolean; dnsRecords: DnsRecord[] }>({
    queryKey: [`/api/customer-support/${currentOperationId}/dns-records/${supportConfig?.emailDomain}`],
    enabled: !!currentOperationId && !!supportConfig?.emailDomain,
    retry: 1,
  });

  // Configuration loaded successfully

  // Configure domain mutation
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
      refetch();
      setEmailPrefix("");
      setCustomDomain("");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao configurar o domínio.",
        variant: "destructive",
      });
    }
  });

  // Verify domain mutation
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
      refetch();
    },
    onError: () => {
      toast({
        title: "Erro na verificação",
        description: "Falha ao verificar o domínio.",
        variant: "destructive",
      });
    }
  });

  const handleConfigureDomain = () => {
    if (!emailPrefix.trim() || !customDomain.trim()) return;
    configureDomainMutation.mutate({ 
      domain: customDomain.trim(), 
      emailPrefix: emailPrefix.trim() 
    });
  };

  const handleVerifyDomain = () => {
    setIsVerifying(true);
    verifyDomainMutation.mutate(undefined, {
      onSettled: () => setIsVerifying(false)
    });
  };

  // Show loading while waiting for operation ID to load
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-400">Erro ao carregar configurações</p>
          <p className="text-muted-foreground text-sm mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

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
        <TabsList className="grid w-full grid-cols-2 bg-black/20 backdrop-blur-sm border border-white/10">
          <TabsTrigger value="general" className="flex items-center gap-2 data-[state=active]:bg-white/10">
            <Cog className="w-4 h-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="design" className="flex items-center gap-2 data-[state=active]:bg-white/10">
            <Palette className="w-4 h-4" />
            Design
          </TabsTrigger>
        </TabsList>

        {/* Aba Geral */}
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
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">
                        {supportConfig.emailPrefix}@{supportConfig.emailDomain}
                      </span>
                      {supportConfig.domainVerified ? (
                        <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">
                          Verificado
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30 text-xs">
                          Pendente
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {supportConfig.isCustomDomain ? "Domínio personalizado" : "Domínio padrão"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-600/20"
                    onClick={() => {
                      // TODO: Implementar remoção
                      toast({
                        title: "Em breve",
                        description: "Funcionalidade de remoção será implementada em breve.",
                      });
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Configuration */}
        <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" />
              <CardTitle className="text-white" style={{ fontSize: '18px' }}>Configuração Atual</CardTitle>
            </div>
            <CardDescription>
              Status da configuração do sistema de suporte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Email de Suporte</span>
                {supportConfig?.emailDomain && supportConfig?.emailPrefix ? (
                  <Badge variant="outline" className="bg-blue-600/20 text-blue-400 border-blue-600/30">
                    {supportConfig.emailPrefix}@{supportConfig.emailDomain}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-600/20 text-gray-400 border-gray-600/30">
                    Não configurado
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Tipo de Domínio</span>
                <Badge variant="outline" className={supportConfig?.isCustomDomain 
                  ? "bg-blue-600/20 text-blue-400 border-blue-600/30"
                  : "bg-gray-600/20 text-gray-400 border-gray-600/30"
                }>
                  {supportConfig?.isCustomDomain ? "Personalizado" : "Padrão"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Status de Verificação</span>
                <div className="flex items-center gap-2">
                  {supportConfig?.domainVerified ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                        Verificado
                      </Badge>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                      <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30">
                        Pendente
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>

            {supportConfig?.emailDomain && !supportConfig.domainVerified && (
              <>
                <Separator className="bg-white/10" />
                <Button 
                  onClick={handleVerifyDomain}
                  disabled={isVerifying}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isVerifying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Verificando...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Verificar Domínio
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Configure Custom Domain */}
        <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-400" />
              <CardTitle className="text-white" style={{ fontSize: '18px' }}>Domínio Personalizado</CardTitle>
            </div>
            <CardDescription>
              Configure seu próprio domínio para emails de suporte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-config" className="text-gray-300">
                Email de Suporte
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    id="email-prefix"
                    type="text"
                    placeholder="suporte"
                    value={emailPrefix}
                    onChange={(e) => setEmailPrefix(e.target.value)}
                    className="bg-gray-800/50 border-gray-600/50 text-white"
                  />
                </div>
                <span className="text-gray-400 text-lg font-medium px-2">@</span>
                <div className="flex-1">
                  <Input
                    id="custom-domain"
                    type="text"
                    placeholder="meudominio.com.br"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    className="bg-gray-800/50 border-gray-600/50 text-white"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Escolha o nome do email (ex: suporte, atendimento) e seu domínio personalizado
              </p>
            </div>

            <Button 
              onClick={handleConfigureDomain}
              disabled={!emailPrefix.trim() || !customDomain.trim() || configureDomainMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {configureDomainMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Configurando...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Configurar Email
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* DNS Instructions */}
      {supportConfig?.emailDomain && !supportConfig.domainVerified && (
        <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
          <CardHeader>
            <CardTitle className="text-white" style={{ fontSize: '18px' }}>Instruções de Configuração DNS</CardTitle>
            <CardDescription>
              Adicione os seguintes registros DNS ao seu domínio para verificar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Instruções para o cliente */}
            <div className="mb-4 p-3 bg-blue-600/20 border border-blue-600/30 rounded-lg">
              <p className="text-blue-300 text-sm font-medium mb-1">
                📋 Instruções para seu provedor DNS
              </p>
              <p className="text-blue-200 text-xs">
                Copie os registros abaixo e adicione-os nas configurações DNS do seu domínio. 
                <strong> Todos os 5 registros são obrigatórios</strong> para o email funcionar corretamente.
              </p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 font-mono text-sm">
              <div className="space-y-3">
                {/* Cabeçalho da tabela */}
                <div className="grid grid-cols-12 gap-2 text-gray-300 pb-2 border-b border-gray-600">
                  <span className="col-span-2 font-semibold text-xs">TIPO</span>
                  <span className="col-span-5 font-semibold text-xs">NOME/HOST</span>
                  <span className="col-span-4 font-semibold text-xs">VALOR</span>
                  <span className="col-span-1 font-semibold text-xs text-center">PRIO</span>
                </div>
                
                {dnsRecordsData?.dnsRecords?.length ? (
                  <>
                    {/* Separar por categoria */}
                    {dnsRecordsData.dnsRecords
                      .filter(record => record.category === 'receiving')
                      .map((record, index) => (
                        <div key={`receiving-${index}`} className="grid grid-cols-12 gap-2 text-white py-1">
                          <span className="col-span-2 text-green-400 font-bold text-xs">{record.record_type}</span>
                          <span className="col-span-5 break-all text-xs text-gray-200">{record.name}</span>
                          <span className="col-span-4 break-all text-green-300 text-xs">{record.value}</span>
                          <span className="col-span-1 text-center text-yellow-400 text-xs font-bold">
                            {record.priority || '-'}
                          </span>
                        </div>
                    ))}
                    
                    {dnsRecordsData.dnsRecords.filter(record => record.category === 'receiving').length > 0 && (
                      <div className="text-xs text-gray-400 flex items-center gap-2 py-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        <span>Registros MX - Para receber emails</span>
                      </div>
                    )}

                    {dnsRecordsData.dnsRecords
                      .filter(record => record.category === 'sending')
                      .map((record, index) => (
                        <div key={`sending-${index}`} className="grid grid-cols-12 gap-2 text-white py-1">
                          <span className="col-span-2 text-blue-400 font-bold text-xs">{record.record_type}</span>
                          <span className="col-span-5 break-all text-xs text-gray-200">{record.name}</span>
                          <span className="col-span-4 break-all text-blue-300 text-xs">{record.value}</span>
                          <span className="col-span-1 text-center text-gray-500 text-xs">-</span>
                        </div>
                    ))}
                    
                    {dnsRecordsData.dnsRecords.filter(record => record.category === 'sending').length > 0 && (
                      <div className="text-xs text-gray-400 flex items-center gap-2 py-1">
                        <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                        <span>Registros TXT/CNAME - Para enviar emails e autenticação</span>
                      </div>
                    )}
                  </>
                ) : (
                  /* Registros de fallback */
                  <>
                    <div className="grid grid-cols-12 gap-2 text-white py-1">
                      <span className="col-span-2 text-blue-400 font-bold text-xs">TXT</span>
                      <span className="col-span-5 text-xs text-gray-200">{supportConfig.emailDomain}</span>
                      <span className="col-span-4 text-blue-300 text-xs">v=spf1 include:mailgun.org ~all</span>
                      <span className="col-span-1 text-center text-gray-500 text-xs">-</span>
                    </div>
                    <div className="grid grid-cols-12 gap-2 text-white py-1">
                      <span className="col-span-2 text-green-400 font-bold text-xs">MX</span>
                      <span className="col-span-5 text-xs text-gray-200">{supportConfig.emailDomain}</span>
                      <span className="col-span-4 text-green-300 text-xs">mxa.mailgun.org</span>
                      <span className="col-span-1 text-center text-yellow-400 text-xs font-bold">10</span>
                    </div>
                    <div className="grid grid-cols-12 gap-2 text-white py-1">
                      <span className="col-span-2 text-green-400 font-bold text-xs">MX</span>
                      <span className="col-span-5 text-xs text-gray-200">{supportConfig.emailDomain}</span>
                      <span className="col-span-4 text-green-300 text-xs">mxb.mailgun.org</span>
                      <span className="col-span-1 text-center text-yellow-400 text-xs font-bold">10</span>
                    </div>
                    <div className="grid grid-cols-12 gap-2 text-white py-1">
                      <span className="col-span-2 text-blue-400 font-bold text-xs">CNAME</span>
                      <span className="col-span-5 text-xs text-gray-200">email.{supportConfig.emailDomain}</span>
                      <span className="col-span-4 text-blue-300 text-xs">mailgun.org</span>
                      <span className="col-span-1 text-center text-gray-500 text-xs">-</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Status e próximos passos */}
            <div className="mt-4 space-y-3">
              <div className="bg-yellow-600/20 border border-yellow-600/30 rounded p-3">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-400 text-lg">⚠️</span>
                  <div className="text-xs text-yellow-200">
                    <p className="font-medium mb-1">Importantes:</p>
                    <ul className="space-y-1 text-yellow-100">
                      <li>• Todos os 5 registros são obrigatórios</li>
                      <li>• Para registros MX, a prioridade deve ser <strong>10</strong></li>
                      <li>• Aguarde até 24h para propagação DNS</li>
                      <li>• Use o botão "Verificar Domínio" após configurar</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        {/* Aba Design */}
        <TabsContent value="design" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[800px]">
            {/* Painel de Configurações (Esquerda) */}
            <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-blue-400" />
                  <CardTitle className="text-white" style={{ fontSize: '18px' }}>Personalização do Template</CardTitle>
                </div>
                <CardDescription>
                  Configure a aparência dos seus emails de suporte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <h3 className="text-sm font-semibold text-gray-200">Logo da Empresa</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                        {designConfig.logo ? (
                          <img
                            src={designConfig.logo}
                            alt="Logo atual"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full ${designConfig.logo ? 'hidden' : 'flex'} items-center justify-center`}>
                          <span className="text-xs text-gray-400">Logo</span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-xs text-gray-300">Logo atual</p>
                        <p className="text-xs text-gray-500">
                          {designConfig.logo && !designConfig.logo.includes('/images/') ? 'Logo personalizada' : 'N1 Global padrão'}
                        </p>
                      </div>
                    </div>

                    {/* Logo Alignment */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-gray-200">Alinhamento da Logo</h4>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {(["left", "center", "right"] as const).map((alignment) => (
                          <button
                            key={alignment}
                            onClick={() => setDesignConfig(prev => ({ ...prev, logoAlignment: alignment }))}
                            className={`p-3 rounded-lg border text-xs font-medium transition-all ${
                              designConfig.logoAlignment === alignment
                                ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                                : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600/50'
                            }`}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <div className={`w-6 h-2 bg-current rounded-sm ${
                                alignment === 'left' ? 'self-start' : 
                                alignment === 'center' ? 'self-center' : 
                                'self-end'
                              }`}></div>
                              <span className="capitalize">
                                {alignment === 'left' ? 'Esquerda' : 
                                 alignment === 'center' ? 'Centro' : 
                                 'Direita'}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <input
                        type="file"
                        id="logo-upload"
                        accept=".png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setLogoFile(file);
                            // Create preview URL
                            const previewUrl = URL.createObjectURL(file);
                            setDesignConfig(prev => ({ ...prev, logo: previewUrl }));
                          }
                        }}
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full bg-blue-600/20 border-blue-600/30 text-blue-300 hover:bg-blue-600/30"
                        onClick={() => document.getElementById('logo-upload')?.click()}
                        disabled={isUploadingLogo}
                      >
                        {isUploadingLogo ? (
                          <Cog className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        {isUploadingLogo ? 'Enviando...' : 'Fazer Upload do Logo'}
                      </Button>
                      {logoFile && (
                        <p className="text-xs text-green-400">
                          ✓ {logoFile.name} selecionado
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      Formatos aceitos: PNG, JPG. Tamanho máximo: 2MB
                    </p>
                  </div>
                </div>

                <Separator className="bg-white/10" />

                {/* Colors Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <h3 className="text-sm font-semibold text-gray-200">Cores do Template</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Primary Color */}
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-300">Cor Principal</Label>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded border border-white/20 cursor-pointer hover:scale-105 transition-transform" 
                          style={{ backgroundColor: designConfig.primaryColor }}
                          onClick={() => document.getElementById('primary-color-picker')?.click()}
                        ></div>
                        <input
                          id="primary-color-picker"
                          type="color"
                          value={designConfig.primaryColor}
                          onChange={(e) => setDesignConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="hidden"
                        />
                        <Input
                          type="text"
                          value={designConfig.primaryColor}
                          onChange={(e) => setDesignConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="flex-1 h-8 bg-gray-800/50 border-gray-600/50 text-white text-xs"
                          placeholder="#2563eb"
                        />
                      </div>
                    </div>

                    {/* Background Color */}
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-300">Cor de Fundo</Label>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded border border-white/20 cursor-pointer hover:scale-105 transition-transform" 
                          style={{ backgroundColor: designConfig.backgroundColor }}
                          onClick={() => document.getElementById('background-color-picker')?.click()}
                        ></div>
                        <input
                          id="background-color-picker"
                          type="color"
                          value={designConfig.backgroundColor}
                          onChange={(e) => setDesignConfig(prev => ({ ...prev, backgroundColor: e.target.value }))}
                          className="hidden"
                        />
                        <Input
                          type="text"
                          value={designConfig.backgroundColor}
                          onChange={(e) => setDesignConfig(prev => ({ ...prev, backgroundColor: e.target.value }))}
                          className="flex-1 h-8 bg-gray-800/50 border-gray-600/50 text-white text-xs"
                          placeholder="#f8fafc"
                        />
                      </div>
                    </div>

                    {/* Text Color */}
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-300">Cor do Texto Principal</Label>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded border border-white/20 cursor-pointer hover:scale-105 transition-transform" 
                          style={{ backgroundColor: designConfig.textColor }}
                          onClick={() => document.getElementById('text-color-picker')?.click()}
                        ></div>
                        <input
                          id="text-color-picker"
                          type="color"
                          value={designConfig.textColor}
                          onChange={(e) => setDesignConfig(prev => ({ ...prev, textColor: e.target.value }))}
                          className="hidden"
                        />
                        <Input
                          type="text"
                          value={designConfig.textColor}
                          onChange={(e) => setDesignConfig(prev => ({ ...prev, textColor: e.target.value }))}
                          className="flex-1 h-8 bg-gray-800/50 border-gray-600/50 text-white text-xs"
                          placeholder="#333333"
                        />
                      </div>
                    </div>

                    {/* Secondary Text Color */}
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-300">Textos Secundários</Label>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded border border-white/20 cursor-pointer hover:scale-105 transition-transform" 
                          style={{ backgroundColor: designConfig.secondaryTextColor }}
                          onClick={() => document.getElementById('secondary-text-color-picker')?.click()}
                        ></div>
                        <input
                          id="secondary-text-color-picker"
                          type="color"
                          value={designConfig.secondaryTextColor}
                          onChange={(e) => setDesignConfig(prev => ({ ...prev, secondaryTextColor: e.target.value }))}
                          className="hidden"
                        />
                        <Input
                          type="text"
                          value={designConfig.secondaryTextColor}
                          onChange={(e) => setDesignConfig(prev => ({ ...prev, secondaryTextColor: e.target.value }))}
                          className="flex-1 h-8 bg-gray-800/50 border-gray-600/50 text-white text-xs"
                          placeholder="#666666"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="bg-white/10" />

                {/* Signature Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <h3 className="text-sm font-semibold text-gray-200">Assinatura Personalizada</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-300">Nome</Label>
                        <Input
                          type="text"
                          value={designConfig.signature.name}
                          onChange={(e) => setDesignConfig(prev => ({ 
                            ...prev, 
                            signature: { ...prev.signature, name: e.target.value }
                          }))}
                          className="h-8 bg-gray-800/50 border-gray-600/50 text-white text-xs"
                          placeholder="João Silva"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-300">Cargo</Label>
                        <Input
                          type="text"
                          value={designConfig.signature.position}
                          onChange={(e) => setDesignConfig(prev => ({ 
                            ...prev, 
                            signature: { ...prev.signature, position: e.target.value }
                          }))}
                          className="h-8 bg-gray-800/50 border-gray-600/50 text-white text-xs"
                          placeholder="Atendimento ao Cliente"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-300">Telefone</Label>
                        <Input
                          type="text"
                          value={designConfig.signature.phone}
                          onChange={(e) => setDesignConfig(prev => ({ 
                            ...prev, 
                            signature: { ...prev.signature, phone: e.target.value }
                          }))}
                          className="h-8 bg-gray-800/50 border-gray-600/50 text-white text-xs"
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-300">Email</Label>
                        <Input
                          type="email"
                          value={designConfig.signature.email}
                          onChange={(e) => setDesignConfig(prev => ({ 
                            ...prev, 
                            signature: { ...prev.signature, email: e.target.value }
                          }))}
                          className="h-8 bg-gray-800/50 border-gray-600/50 text-white text-xs"
                          placeholder="contato@empresa.com"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-300">Website</Label>
                      <Input
                        type="url"
                        value={designConfig.signature.website}
                        onChange={(e) => setDesignConfig(prev => ({ 
                          ...prev, 
                          signature: { ...prev.signature, website: e.target.value }
                        }))}
                        className="h-8 bg-gray-800/50 border-gray-600/50 text-white text-xs"
                        placeholder="https://www.empresa.com"
                      />
                    </div>
                  </div>
                </div>

                <Separator className="bg-white/10" />

                {/* Card Configuration Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <h3 className="text-sm font-semibold text-gray-200">Configurações do Card</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Card Background */}
                    <div className="space-y-3">
                      <Label className="text-xs text-gray-300">Fundo do Card</Label>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded border border-white/20 cursor-pointer hover:scale-105 transition-transform" 
                          style={{ backgroundColor: designConfig.card.backgroundColor }}
                          onClick={() => document.getElementById('card-background-picker')?.click()}
                        ></div>
                        <input
                          id="card-background-picker"
                          type="color"
                          value={designConfig.card.backgroundColor}
                          onChange={(e) => setDesignConfig(prev => ({ 
                            ...prev, 
                            card: { ...prev.card, backgroundColor: e.target.value }
                          }))}
                          className="hidden"
                        />
                        <Input
                          type="text"
                          value={designConfig.card.backgroundColor}
                          onChange={(e) => setDesignConfig(prev => ({ 
                            ...prev, 
                            card: { ...prev.card, backgroundColor: e.target.value }
                          }))}
                          className="flex-1 h-8 bg-gray-800/50 border-gray-600/50 text-white text-xs"
                          placeholder="#ffffff"
                        />
                      </div>
                      
                      {/* Opacity */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-gray-300">Opacidade</Label>
                          <span className="text-xs text-gray-400">{Math.round(designConfig.card.backgroundOpacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={designConfig.card.backgroundOpacity}
                          onChange={(e) => setDesignConfig(prev => ({ 
                            ...prev, 
                            card: { ...prev.card, backgroundOpacity: parseFloat(e.target.value) }
                          }))}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        />
                      </div>
                    </div>

                    {/* Border Configuration */}
                    <div className="space-y-3">
                      <Label className="text-xs text-gray-300">Configuração de Bordas</Label>
                      
                      {/* Border Color */}
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded border border-white/20 cursor-pointer hover:scale-105 transition-transform" 
                          style={{ backgroundColor: designConfig.card.borderColor }}
                          onClick={() => document.getElementById('border-color-picker')?.click()}
                        ></div>
                        <input
                          id="border-color-picker"
                          type="color"
                          value={designConfig.card.borderColor}
                          onChange={(e) => setDesignConfig(prev => ({ 
                            ...prev, 
                            card: { ...prev.card, borderColor: e.target.value }
                          }))}
                          className="hidden"
                        />
                        <Input
                          type="text"
                          value={designConfig.card.borderColor}
                          onChange={(e) => setDesignConfig(prev => ({ 
                            ...prev, 
                            card: { ...prev.card, borderColor: e.target.value }
                          }))}
                          className="flex-1 h-8 bg-gray-800/50 border-gray-600/50 text-white text-xs"
                          placeholder="#e5e7eb"
                        />
                      </div>

                      {/* Border Radius */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-gray-300">Raio das Bordas</Label>
                          <span className="text-xs text-gray-400">{designConfig.card.borderRadius}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          step="1"
                          value={designConfig.card.borderRadius}
                          onChange={(e) => setDesignConfig(prev => ({ 
                            ...prev, 
                            card: { ...prev.card, borderRadius: parseInt(e.target.value) }
                          }))}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        />
                      </div>

                      {/* Border Width */}
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-300">Espessura das Bordas</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-400">Superior</Label>
                            <Input
                              type="number"
                              min="0"
                              max="10"
                              value={designConfig.card.borderWidth.top}
                              onChange={(e) => setDesignConfig(prev => ({ 
                                ...prev, 
                                card: { 
                                  ...prev.card, 
                                  borderWidth: { ...prev.card.borderWidth, top: parseInt(e.target.value) || 0 }
                                }
                              }))}
                              className="h-8 bg-gray-800/50 border-gray-600/50 text-white text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-400">Inferior</Label>
                            <Input
                              type="number"
                              min="0"
                              max="10"
                              value={designConfig.card.borderWidth.bottom}
                              onChange={(e) => setDesignConfig(prev => ({ 
                                ...prev, 
                                card: { 
                                  ...prev.card, 
                                  borderWidth: { ...prev.card.borderWidth, bottom: parseInt(e.target.value) || 0 }
                                }
                              }))}
                              className="h-8 bg-gray-800/50 border-gray-600/50 text-white text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-400">Esquerda</Label>
                            <Input
                              type="number"
                              min="0"
                              max="10"
                              value={designConfig.card.borderWidth.left}
                              onChange={(e) => setDesignConfig(prev => ({ 
                                ...prev, 
                                card: { 
                                  ...prev.card, 
                                  borderWidth: { ...prev.card.borderWidth, left: parseInt(e.target.value) || 0 }
                                }
                              }))}
                              className="h-8 bg-gray-800/50 border-gray-600/50 text-white text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-400">Direita</Label>
                            <Input
                              type="number"
                              min="0"
                              max="10"
                              value={designConfig.card.borderWidth.right}
                              onChange={(e) => setDesignConfig(prev => ({ 
                                ...prev, 
                                card: { 
                                  ...prev.card, 
                                  borderWidth: { ...prev.card.borderWidth, right: parseInt(e.target.value) || 0 }
                                }
                              }))}
                              className="h-8 bg-gray-800/50 border-gray-600/50 text-white text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="bg-white/10" />

                {/* Save Button */}
                <div className="space-y-3">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleSaveDesignConfig}
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? (
                      <Cog className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Shield className="w-4 h-4 mr-2" />
                    )}
                    {saveMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
                  </Button>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    <span>Alterações aplicadas automaticamente nos emails</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview do Template (Direita) */}
            <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-green-400" />
                    <CardTitle className="text-white" style={{ fontSize: '18px' }}>Preview do Email</CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">
                    Tempo Real
                  </Badge>
                </div>
                <CardDescription>
                  Visualização em tempo real do template de email
                </CardDescription>
              </CardHeader>
              <CardContent className="h-full">
                <div className="rounded-lg p-4 h-[600px] overflow-y-auto border" style={{ backgroundColor: designConfig.backgroundColor }}>
                  {/* Email Preview */}
                  <div className="max-w-lg mx-auto space-y-4">
                    {/* Email Header */}
                    <div className={`pb-4 border-b ${
                      designConfig.logoAlignment === 'left' ? 'text-left' :
                      designConfig.logoAlignment === 'right' ? 'text-right' :
                      'text-center'
                    }`} style={{ borderColor: `${designConfig.primaryColor}30` }}>
                      <img
                        src={designConfig.logo}
                        alt="Logo"
                        className={`h-12 mb-2 ${
                          designConfig.logoAlignment === 'left' ? 'mr-auto' :
                          designConfig.logoAlignment === 'right' ? 'ml-auto' :
                          'mx-auto'
                        }`}
                        onLoad={() => console.log('✅ Logo carregada:', designConfig.logo)}
                        onError={(e) => {
                          console.log('❌ Erro ao carregar logo:', designConfig.logo);
                          e.currentTarget.style.display = 'none';
                          (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'block';
                        }}
                      />
                      <div className="hidden text-sm px-3 py-2 rounded" style={{ color: designConfig.textColor, backgroundColor: `${designConfig.primaryColor}10` }}>
                        Logo da Empresa
                      </div>
                    </div>

                    {/* Email Content */}
                    <div className="p-4 rounded-lg" style={{ 
                      backgroundColor: `${designConfig.card.backgroundColor}${Math.round(designConfig.card.backgroundOpacity * 255).toString(16).padStart(2, '0')}`,
                      borderTopWidth: `${designConfig.card.borderWidth.top}px`,
                      borderRightWidth: `${designConfig.card.borderWidth.right}px`,
                      borderBottomWidth: `${designConfig.card.borderWidth.bottom}px`,
                      borderLeftWidth: `${designConfig.card.borderWidth.left}px`,
                      borderColor: designConfig.card.borderColor,
                      borderStyle: 'solid',
                      borderRadius: `${designConfig.card.borderRadius}px`
                    }}>
                      <p className="mb-3" style={{ color: designConfig.textColor }}>
                        <strong>Olá João,</strong>
                      </p>
                      
                      <p className="mb-3" style={{ color: designConfig.textColor }}>
                        Compreendo sua preocupação com o <strong>cancelamento do pedido</strong>.
                      </p>
                      
                      <p className="mb-3" style={{ color: designConfig.textColor }}>
                        Se a compra ainda não foi enviada, podemos <strong>cancelar imediatamente</strong>. 
                        Caso já tenha sido enviada, o processo pode levar de <strong>2 a 7 dias úteis</strong> para o reembolso completo.
                      </p>
                      
                      <p className="mb-3" style={{ color: designConfig.textColor }}>
                        Estamos disponíveis para ajudar de <strong>segunda a sexta-feira, das 9h às 18h</strong>.
                      </p>
                      
                      <p style={{ color: designConfig.textColor }}>
                        Se precisar de mais alguma coisa, estarei aqui para ajudar! 😊
                      </p>
                    </div>

                    {/* Email Footer */}
                    <div className="text-center pt-4 border-t space-y-2" style={{ borderColor: `${designConfig.primaryColor}30` }}>
                      <p className="text-sm" style={{ color: designConfig.secondaryTextColor }}>
                        Se precisar de mais alguma coisa, pode responder diretamente a este email.
                        <br />Estamos aqui para ajudar! 😊
                      </p>
                      
                      {/* Custom Signature ou Sofia Default */}
                      {(designConfig.signature.name || designConfig.signature.position || designConfig.signature.phone || designConfig.signature.email || designConfig.signature.website) ? (
                        <div className="text-sm space-y-1" style={{ color: designConfig.secondaryTextColor }}>
                          <p className="font-semibold">Atenciosamente,</p>
                          {designConfig.signature.name && (
                            <p><strong>{designConfig.signature.name}</strong></p>
                          )}
                          {designConfig.signature.position && (
                            <p className="text-xs">{designConfig.signature.position}</p>
                          )}
                          <div className="space-y-1 text-xs">
                            {designConfig.signature.phone && (
                              <p>📞 {designConfig.signature.phone}</p>
                            )}
                            {designConfig.signature.email && (
                              <p>✉️ {designConfig.signature.email}</p>
                            )}
                            {designConfig.signature.website && (
                              <p>🌐 {designConfig.signature.website}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs space-y-1" style={{ color: designConfig.secondaryTextColor }}>
                          <p><strong>Sofia</strong> - Assistente IA do N1 Support</p>
                          <p>Resposta automática baseada na sua solicitação</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}