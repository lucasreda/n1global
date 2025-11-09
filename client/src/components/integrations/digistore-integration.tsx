import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, RefreshCw, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { useTourContext } from "@/contexts/tour-context";
import { useLocation } from "wouter";

interface DigistoreIntegration {
  id: string;
  operationId: string;
  status: "active" | "pending" | "error";
  lastSyncAt: string | null;
  syncErrors: string | null;
  metadata?: {
    vendorName?: string;
    currency?: string;
    timezone?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export function DigistoreIntegration() {
  const [apiKey, setApiKey] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedOperation: operationId } = useCurrentOperation();
  const { startSyncTour } = useTourContext();
  const [, setLocation] = useLocation();

  // Buscar status das integrações
  const { data: integrationsStatus } = useQuery({
    queryKey: ['/api/onboarding/integrations-status'],
    queryFn: async () => {
      const response = await apiRequest('/api/onboarding/integrations-status', 'GET');
      return response.json();
    },
  });

  // Buscar integração existente
  const { data: integration, isLoading } = useQuery<DigistoreIntegration | null>({
    queryKey: ["/api/integrations/digistore", operationId],
    queryFn: async () => {
      if (!operationId) return null;
      try {
        const response = await apiRequest(`/api/integrations/digistore?operationId=${operationId}`, "GET");
        if (response.status === 404) return null;
        return response.json();
      } catch (error) {
        return null;
      }
    },
    enabled: !!operationId,
  });

  // Configurar/atualizar integração
  const configureMutation = useMutation({
    mutationFn: async ({ apiKey }: { apiKey: string }) => {
      const response = await apiRequest("/api/integrations/digistore", "POST", {
        operationId,
        apiKey: apiKey.trim(),
      });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/integrations/digistore", operationId] });
      await queryClient.invalidateQueries({ queryKey: ["/api/onboarding/integrations-status"] });
      toast({
        title: "Sucesso",
        description: "Integração Digistore24 configurada com sucesso!",
      });

      // Redirecionar para orders e iniciar tour
      toast({
        title: "Pronto para Sincronizar!",
        description: "Agora você pode importar seus pedidos.",
      });
      setTimeout(() => {
        setLocation('/orders');
        setTimeout(() => {
          startSyncTour();
        }, 2500);
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao configurar integração Digistore24",
        variant: "destructive",
      });
    },
  });

  // Testar conexão
  const testMutation = useMutation({
    mutationFn: async ({ apiKey }: { apiKey: string }) => {
      const response = await apiRequest("/api/integrations/digistore/test", "POST", {
        apiKey: apiKey.trim(),
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Conexão válida",
        description: `Conectado com sucesso ao Digistore24`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na conexão",
        description: error.message || "Erro ao conectar com o Digistore24",
        variant: "destructive",
      });
    },
  });

  // Sincronizar dados
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/integrations/digistore/sync?operationId=${operationId}`, "POST");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/digistore", operationId] });
      toast({
        title: "Sincronização concluída",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na sincronização",
        description: error.message || "Erro ao sincronizar dados",
        variant: "destructive",
      });
    },
  });

  const handleConfigure = () => {
    if (!apiKey.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, preencha a API Key",
        variant: "destructive",
      });
      return;
    }
    configureMutation.mutate({ apiKey: apiKey.trim() });
  };

  const handleTest = () => {
    if (!apiKey.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, preencha a API Key para testar",
        variant: "destructive",
      });
      return;
    }
    testMutation.mutate({ apiKey: apiKey.trim() });
  };

  const getStatusBadge = () => {
    if (!integration) return <Badge variant="secondary">Não configurado</Badge>;
    
    switch (integration.status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Ativo</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pendente</Badge>;
      case "error":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Erro</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status atual */}
      <Card className="bg-black/20 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2" style={{ fontSize: '20px' }}>
            <Store className="text-blue-400" size={20} />
            Status da Integração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              {integration ? (
                <div className="space-y-2">
                  <p className="text-gray-300">
                    <strong>Integração:</strong> Digistore24
                  </p>
                  <p className="text-gray-300">
                    <strong>Última sincronização:</strong>{" "}
                    {integration.lastSyncAt 
                      ? new Date(integration.lastSyncAt).toLocaleString("pt-BR")
                      : "Nunca"
                    }
                  </p>
                  {integration.syncErrors && (
                    <p className="text-red-400 text-sm">
                      <strong>Erros:</strong> {integration.syncErrors}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400">Nenhuma integração configurada</p>
              )}
            </div>
            {getStatusBadge()}
          </div>
        </CardContent>
      </Card>

      {/* Configuração */}
      <Card className="bg-black/20 border-white/10">
        <CardHeader>
          <CardTitle className="text-white" style={{ fontSize: '20px' }}>
            {integration ? "Atualizar" : "Configurar"} Integração Digistore24
          </CardTitle>
          <CardDescription className="text-gray-400">
            Configure sua integração com Digistore24 para importar pedidos e gerenciar fulfillment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-gray-300">
              API Key <span className="text-red-400">*</span>
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Sua API Key do Digistore24"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-black/40 border-white/20 text-white placeholder:text-gray-500"
              data-testid="input-api-key"
            />
            <p className="text-sm text-gray-500">
              API Key disponível no painel do Digistore24 em Configurações {'>'} Acesso à conta {'>'} Chaves de API
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              onClick={handleTest}
              disabled={testMutation.isPending || !apiKey.trim()}
              variant="outline"
              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
              data-testid="button-test-connection"
            >
              {testMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Testar Conexão
            </Button>

            <Button
              onClick={handleConfigure}
              disabled={configureMutation.isPending || !apiKey.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-save-integration"
            >
              {configureMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Store className="h-4 w-4 mr-2" />
              )}
              {integration ? "Atualizar" : "Configurar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sincronização */}
      {integration && integration.status === "active" && (
        <Card className="bg-black/20 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2" style={{ fontSize: '20px' }}>
              <RefreshCw className="text-blue-400" size={20} />
              Sincronização Automática via Webhook
            </CardTitle>
            <CardDescription className="text-gray-400">
              Os pedidos são recebidos automaticamente via webhook IPN
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm text-gray-300">
                ℹ️ A Digistore24 envia pedidos automaticamente via webhook IPN. Você também pode sincronizar manualmente para buscar entregas pendentes.
              </p>
              <p className="text-sm text-gray-300 mt-2">
                <strong>URL do Webhook:</strong><br />
                <code className="text-xs bg-black/30 px-2 py-1 rounded">
                  https://www.n1global.app/api/integrations/digistore/webhook
                </code>
              </p>
            </div>
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-sync-data"
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sincronizar Entregas Pendentes
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

