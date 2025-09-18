import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, RefreshCw, Store, ShoppingCart, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import cartpandaIcon from "@assets/carticon_1758210690464.avif";

interface CartPandaIntegration {
  id: string;
  operationId: string;
  storeSlug: string;
  status: "active" | "pending" | "error";
  lastSyncAt: string | null;
  syncErrors: string | null;
  metadata?: {
    storeName?: string;
    storeUrl?: string;
    currency?: string;
    timezone?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export function CartPandaIntegration() {
  const [storeSlug, setStoreSlug] = useState("");
  const [bearerToken, setBearerToken] = useState("");
  const [isConfiguring, setIsConfiguring] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedOperation: operationId } = useCurrentOperation();

  // Buscar integração existente
  const { data: integration, isLoading } = useQuery<CartPandaIntegration | null>({
    queryKey: ["/api/integrations/cartpanda", operationId],
    queryFn: async () => {
      if (!operationId) return null;
      try {
        const response = await apiRequest(`/api/integrations/cartpanda?operationId=${operationId}`, "GET");
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
    mutationFn: async ({ storeSlug, bearerToken }: { storeSlug: string; bearerToken: string }) => {
      const response = await apiRequest("/api/integrations/cartpanda", "POST", {
        operationId,
        storeSlug: storeSlug.trim(),
        bearerToken: bearerToken.trim(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/cartpanda", operationId] });
      setIsConfiguring(false);
      toast({
        title: "Sucesso",
        description: "Integração CartPanda configurada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao configurar integração CartPanda",
        variant: "destructive",
      });
    },
  });

  // Testar conexão
  const testMutation = useMutation({
    mutationFn: async ({ storeSlug, bearerToken }: { storeSlug: string; bearerToken: string }) => {
      const response = await apiRequest("/api/integrations/cartpanda/test", "POST", {
        storeSlug: storeSlug.trim(),
        bearerToken: bearerToken.trim(),
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Conexão válida",
        description: `Conectado com sucesso à loja CartPanda: ${data.data?.name || storeSlug}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na conexão",
        description: error.message || "Erro ao conectar com a loja CartPanda",
        variant: "destructive",
      });
    },
  });

  // Sincronizar dados
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/integrations/cartpanda/sync?operationId=${operationId}`, "POST");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/cartpanda", operationId] });
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
    if (!storeSlug.trim() || !bearerToken.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos",
        variant: "destructive",
      });
      return;
    }
    configureMutation.mutate({ storeSlug: storeSlug.trim(), bearerToken: bearerToken.trim() });
  };

  const handleTest = () => {
    if (!storeSlug.trim() || !bearerToken.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos para testar",
        variant: "destructive",
      });
      return;
    }
    testMutation.mutate({ storeSlug: storeSlug.trim(), bearerToken: bearerToken.trim() });
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

  // Pré-preencher campos se integração existir
  useEffect(() => {
    if (integration && !storeSlug && !bearerToken) {
      setStoreSlug(integration.storeSlug || "");
      // Não pré-preenchemos o token por segurança
    }
  }, [integration, storeSlug, bearerToken]);

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
            <img 
              src={cartpandaIcon} 
              alt="CartPanda" 
              className="object-contain rounded-lg"
              style={{ width: 20, height: 20 }}
              loading="lazy"
              decoding="async"
            />
            Status da Integração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              {integration ? (
                <div className="space-y-2">
                  <p className="text-gray-300">
                    <strong>Loja:</strong> {integration.storeSlug}
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
            {integration ? "Atualizar" : "Configurar"} Integração CartPanda
          </CardTitle>
          <CardDescription className="text-gray-400">
            Configure sua integração com CartPanda para importar pedidos e gerenciar fulfillment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="storeSlug" className="text-gray-300">
              Store Slug <span className="text-red-400">*</span>
            </Label>
            <Input
              id="storeSlug"
              type="text"
              placeholder="ex: minha-loja"
              value={storeSlug}
              onChange={(e) => setStoreSlug(e.target.value)}
              className="bg-black/40 border-white/20 text-white placeholder:text-gray-500"
              data-testid="input-store-slug"
            />
            <p className="text-sm text-gray-500">
              O slug único da sua loja CartPanda (ex: se sua loja é "minha-loja.mycartpanda.com", use "minha-loja")
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bearerToken" className="text-gray-300">
              Bearer Token <span className="text-red-400">*</span>
            </Label>
            <Input
              id="bearerToken"
              type="password"
              placeholder="Seu Bearer Token da API CartPanda"
              value={bearerToken}
              onChange={(e) => setBearerToken(e.target.value)}
              className="bg-black/40 border-white/20 text-white placeholder:text-gray-500"
              data-testid="input-bearer-token"
            />
            <p className="text-sm text-gray-500">
              Token de acesso disponível no painel da sua loja CartPanda
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              onClick={handleTest}
              disabled={testMutation.isPending || !storeSlug.trim() || !bearerToken.trim()}
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
              disabled={configureMutation.isPending || !storeSlug.trim() || !bearerToken.trim()}
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
              Sincronização de Dados
            </CardTitle>
            <CardDescription className="text-gray-400">
              Sincronize pedidos da sua loja CartPanda
            </CardDescription>
          </CardHeader>
          <CardContent>
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
              Sincronizar Agora
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}