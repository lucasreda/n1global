import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, RefreshCw, Store, ShoppingCart, Package, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { useTourContext } from "@/contexts/tour-context";
import { useLocation } from "wouter";

interface ShopifyIntegration {
  id: string;
  operationId: string;
  shopName: string;
  status: "active" | "pending" | "error";
  lastSyncAt: string | null;
  syncErrors: string | null;
  metadata?: {
    storeName?: string;
    storeEmail?: string;
    plan?: string;
    currency?: string;
    timezone?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export function ShopifyIntegration() {
  const [shopName, setShopName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [webhookUrlCopied, setWebhookUrlCopied] = useState(false);
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
  const { data: integration, isLoading } = useQuery<ShopifyIntegration | null>({
    queryKey: ["/api/integrations/shopify", operationId],
    queryFn: async () => {
      if (!operationId) return null;
      try {
        const response = await apiRequest(`/api/integrations/shopify?operationId=${operationId}`, "GET");
        if (response.status === 404) return null;
        return response.json();
      } catch (error) {
        return null;
      }
    },
    enabled: !!operationId,
  });

  // Buscar informações do webhook
  const { data: webhookInfo, isLoading: webhookInfoLoading } = useQuery({
    queryKey: ["/api/integrations/shopify/webhook-info"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/integrations/shopify/webhook-info", "GET");
        if (!response.ok) {
          console.error("Erro ao buscar informações do webhook:", response.status);
          return null;
        }
        return response.json();
      } catch (error) {
        console.error("Erro ao buscar informações do webhook:", error);
        return null;
      }
    },
  });

  // Configurar/atualizar integração
  const configureMutation = useMutation({
    mutationFn: async ({ shopName, accessToken }: { shopName: string; accessToken: string }) => {
      const response = await apiRequest("/api/integrations/shopify", "POST", {
        operationId,
        shopName: shopName.replace(/^https?:\/\//, '').replace(/\/$/, ''),
        accessToken,
      });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/integrations/shopify"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/onboarding/integrations-status"] });
      setIsConfiguring(false);
      toast({
        title: "Sucesso",
        description: "Integração Shopify configurada com sucesso!",
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
        description: error.message || "Erro ao configurar integração Shopify",
        variant: "destructive",
      });
    },
  });

  // Testar conexão
  const testMutation = useMutation({
    mutationFn: async ({ shopName, accessToken }: { shopName: string; accessToken: string }) => {
      const response = await apiRequest("/api/integrations/shopify/test", "POST", {
        shopName: shopName.replace(/^https?:\/\//, '').replace(/\/$/, ''),
        accessToken,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Conexão válida",
        description: `Conectado com sucesso à loja: ${data.data.name}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na conexão",
        description: error.message || "Erro ao conectar com a loja Shopify",
        variant: "destructive",
      });
    },
  });

  // Sincronizar dados
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/integrations/shopify/sync?operationId=${operationId}`, "POST");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/shopify"] });
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

  // Remover integração
  const removeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/integrations/shopify?operationId=${operationId}`, "DELETE");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/shopify"] });
      setIsConfiguring(false);
      setShopName("");
      setAccessToken("");
      toast({
        title: "Integração removida",
        description: "Integração Shopify removida com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover integração",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (integration) {
      setShopName(integration.shopName);
    }
  }, [integration]);

  const handleConfigure = () => {
    if (!shopName || !accessToken) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome da loja e token de acesso",
        variant: "destructive",
      });
      return;
    }

    configureMutation.mutate({ shopName, accessToken });
  };

  const handleTest = () => {
    if (!shopName || !accessToken) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome da loja e token de acesso",
        variant: "destructive",
      });
      return;
    }

    testMutation.mutate({ shopName, accessToken });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Ativo</Badge>;
      case "error":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Erro</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ fontSize: '20px' }}>
            <Store className="w-5 h-5" />
            Integração Shopify
          </CardTitle>
          <CardDescription>
            Conecte sua loja Shopify para importar pedidos e produtos automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integration ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{integration.metadata?.storeName || integration.shopName}</h3>
                  <p className="text-sm text-muted-foreground">{integration.shopName}</p>
                </div>
                {getStatusBadge(integration.status)}
              </div>

              {integration.metadata && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Plano</Label>
                    <p>{integration.metadata.plan}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Moeda</Label>
                    <p>{integration.metadata.currency}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p>{integration.metadata.storeEmail}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Última sincronização</Label>
                    <p>{integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString('pt-BR') : 'Nunca'}</p>
                  </div>
                </div>
              )}

              {integration.syncErrors && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{integration.syncErrors}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  variant="outline"
                  className="flex-1"
                >
                  {syncMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Sincronizar Shopify
                </Button>
                <Button
                  onClick={() => setIsConfiguring(true)}
                  variant="outline"
                >
                  Reconfigurar
                </Button>
                <Button
                  onClick={() => removeMutation.mutate()}
                  disabled={removeMutation.isPending}
                  variant="destructive"
                >
                  {removeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Remover
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Nenhuma loja conectada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure sua integração Shopify para começar
              </p>
              <Button onClick={() => setIsConfiguring(true)}>
                Configurar Shopify
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {(isConfiguring || !integration) && (
        <Card>
          <CardHeader>
            <CardTitle style={{ fontSize: '20px' }}>Configurar Integração</CardTitle>
            <CardDescription>
              Configure as credenciais da sua loja Shopify
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Seção de Webhook - ANTES dos campos de configuração - Só exibe se URL pública disponível */}
            {webhookInfo?.hasPublicUrl && (
              <>
                {webhookInfoLoading ? (
                  <div className="p-4 bg-muted/50 border border-border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Carregando informações do webhook...</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 p-4 bg-muted/50 border border-border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground mb-2">
                        Configurar Webhook (Opcional)
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Para sincronização em tempo real, configure o webhook na sua conta Shopify antes de preencher as credenciais abaixo.
                      </p>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">URL do Webhook</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              value={webhookInfo.webhookUrl || ''}
                              readOnly
                              className="font-mono text-xs"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (webhookInfo.webhookUrl) {
                                  navigator.clipboard.writeText(webhookInfo.webhookUrl);
                                  setWebhookUrlCopied(true);
                                  setTimeout(() => setWebhookUrlCopied(false), 2000);
                                  toast({
                                    title: "URL copiada!",
                                    description: "Cole a URL na configuração do webhook da Shopify",
                                  });
                                }
                              }}
                            >
                              {webhookUrlCopied ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Tópicos Necessários</Label>
                          <div className="mt-1 flex gap-2 flex-wrap">
                            {webhookInfo.topics?.map((topic: string) => (
                              <Badge key={topic} variant="secondary" className="mr-1">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {webhookInfo.instructions && (
                          <div className="mt-3 text-xs text-muted-foreground bg-muted/30 p-3 rounded border border-border">
                            <p className="font-medium mb-2 text-foreground">{webhookInfo.instructions.title}</p>
                            <ol className="list-decimal list-inside space-y-1">
                              {webhookInfo.instructions.steps.map((step: string, idx: number) => (
                                <li key={idx}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="shopName">Nome da Loja</Label>
              <Input
                id="shopName"
                data-testid="input-shop-name"
                placeholder="minhaloja.myshopify.com"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Digite o nome da loja: minhaloja.myshopify.com ou apenas minhaloja
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessToken">Token de Acesso</Label>
              <Input
                id="accessToken"
                data-testid="input-access-token"
                type="password"
                placeholder="shpat_..."
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Token de acesso da Shopify Admin API
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleTest}
                disabled={testMutation.isPending}
                variant="outline"
                className="flex-1"
                data-testid="button-test-connection"
              >
                {testMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Testar Conexão
              </Button>
              <Button
                onClick={handleConfigure}
                disabled={configureMutation.isPending}
                className="flex-1"
                data-testid="button-save-integration"
              >
                {configureMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {integration ? "Atualizar" : "Salvar"}
              </Button>
            </div>

            {isConfiguring && integration && (
              <Button
                onClick={() => setIsConfiguring(false)}
                variant="outline"
                className="w-full"
              >
                Cancelar
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ fontSize: '20px' }}>
            <Package className="w-5 h-5" />
            Como configurar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="bg-blue-50 p-3 rounded-md border-l-4 border-blue-500">
            <h4 className="font-medium text-blue-800">🚀 Nova Arquitetura Shopify-First</h4>
            <p className="text-blue-700 text-sm mt-1">
              Os pedidos agora são importados primeiro do Shopify e depois matched com a transportadora por nome do cliente. 
              Isso garante que temos todos os dados do pedido, mesmo os que não estão na transportadora.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium">1. Criar app privado na Shopify</h4>
            <p className="text-muted-foreground">
              Acesse Admin → Apps → Manage private apps → Create private app
            </p>
          </div>
          <div>
            <h4 className="font-medium">2. Configurar permissões</h4>
            <p className="text-muted-foreground">
              Habilite: Read access para Orders, Products, Customers e Inventory
            </p>
          </div>
          <div>
            <h4 className="font-medium">3. Obter token de acesso</h4>
            <p className="text-muted-foreground">
              Copie o "Admin API access token" gerado automaticamente
            </p>
          </div>
          
          <div className="bg-green-50 p-3 rounded-md border-l-4 border-green-500">
            <h4 className="font-medium text-green-800">🔄 Fluxo de Sincronização</h4>
            <div className="text-green-700 text-sm mt-1 space-y-1">
              <p>1. Importa pedidos do Shopify (fonte primária)</p>
              <p>2. Faz match com transportadora por nome do cliente</p>
              <p>3. Atualiza status/tracking baseado na transportadora</p>
              <p>4. Marca pedidos como "Importado pela Transportadora"</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}