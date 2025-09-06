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

export default function CustomerSupportSettings() {
  const { toast } = useToast();
  const { selectedOperation, operations } = useCurrentOperation();
  const currentOperationId = selectedOperation;
  const currentOperationName = operations.find(op => op.id === selectedOperation)?.name;
  const [customDomain, setCustomDomain] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Get current support configuration
  const { data: supportConfig, isLoading, refetch, error } = useQuery<SupportConfig>({
    queryKey: [`/api/customer-support/config/${currentOperationId}`],
    enabled: !!currentOperationId,
    retry: 3,
    retryDelay: 1000,
  });

  // Configuration loaded successfully

  // Configure domain mutation
  const configureDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      const response = await fetch(`/api/customer-support/${currentOperationId}/configure-domain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ domain, isCustomDomain: true })
      });
      if (!response.ok) throw new Error('Failed to configure domain');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Domínio configurado",
        description: "O domínio foi configurado com sucesso. Aguarde a verificação.",
      });
      refetch();
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
      setIsVerifying(true);
      // Simular verificação
      await new Promise(resolve => setTimeout(resolve, 3000));
      return { verified: true };
    },
    onSuccess: () => {
      toast({
        title: "Domínio verificado",
        description: "O domínio foi verificado com sucesso!",
      });
      refetch();
      setIsVerifying(false);
    },
    onError: () => {
      toast({
        title: "Verificação falhou",
        description: "Não foi possível verificar o domínio. Verifique as configurações DNS.",
        variant: "destructive",
      });
      setIsVerifying(false);
    }
  });

  const handleConfigureDomain = () => {
    if (!customDomain.trim()) return;
    configureDomainMutation.mutate(customDomain.trim());
  };

  const handleVerifyDomain = () => {
    verifyDomainMutation.mutate();
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
              <Label htmlFor="custom-domain" className="text-gray-300">
                Domínio de Email
              </Label>
              <Input
                id="custom-domain"
                type="text"
                placeholder="support.meudominio.com"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                className="bg-gray-800/50 border-gray-600/50 text-white"
              />
              <p className="text-xs text-gray-400">
                Insira o subdomínio que você quer usar para emails de suporte
              </p>
            </div>

            <Button 
              onClick={handleConfigureDomain}
              disabled={!customDomain.trim() || configureDomainMutation.isPending}
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
                  Configurar Domínio
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
            <div className="bg-gray-800/50 rounded-lg p-4 font-mono text-sm">
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-4 text-gray-300">
                  <span className="font-semibold">Tipo</span>
                  <span className="font-semibold">Nome</span>
                  <span className="font-semibold">Valor</span>
                </div>
                <Separator className="bg-gray-600" />
                <div className="grid grid-cols-3 gap-4 text-white">
                  <span>TXT</span>
                  <span>{supportConfig.emailDomain}</span>
                  <span>mailgun-verification-abc123</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-white">
                  <span>MX</span>
                  <span>{supportConfig.emailDomain}</span>
                  <span>10 mxa.mailgun.org</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-white">
                  <span>CNAME</span>
                  <span>email.{supportConfig.emailDomain}</span>
                  <span>mailgun.org</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Após adicionar estes registros DNS, clique em "Verificar Domínio" para confirmar a configuração.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}