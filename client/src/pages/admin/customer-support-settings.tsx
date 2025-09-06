import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { CheckCircle, AlertCircle, Globe, Settings, Mail, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface SupportConfig {
  emailDomain: string;
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
                <span className="text-sm text-gray-300">Domínio de Email</span>
                {supportConfig?.emailDomain ? (
                  <Badge variant="outline" className="bg-blue-600/20 text-blue-400 border-blue-600/30">
                    {supportConfig.emailDomain}
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
                  ? "bg-purple-600/20 text-purple-400 border-purple-600/30"
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
              <Globe className="w-5 h-5 text-purple-400" />
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
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
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
    </div>
  );
}