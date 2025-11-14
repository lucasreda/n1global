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
import { useTranslation } from "@/hooks/use-translation";

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
  const { t } = useTranslation();
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
        title: t('integrations.shopify.success'),
        description: t('integrations.shopify.configuredSuccessfully'),
      });

      // Redirecionar para orders e iniciar tour
      toast({
        title: t('integrations.shopify.readyToSync'),
        description: t('integrations.shopify.readyToSyncDescription'),
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
        title: t('integrations.shopify.error'),
        description: error.message || t('integrations.shopify.errorConfiguring'),
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
        title: t('integrations.shopify.validConnection'),
        description: t('integrations.shopify.connectedSuccessfully', { name: data.data.name }),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('integrations.shopify.connectionError'),
        description: error.message || t('integrations.shopify.errorConnecting'),
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
        title: t('integrations.shopify.syncCompleted'),
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: t('integrations.shopify.syncError'),
        description: error.message || t('integrations.shopify.errorSyncing'),
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
        title: t('integrations.shopify.integrationRemoved'),
        description: t('integrations.shopify.integrationRemovedSuccess'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('integrations.shopify.error'),
        description: error.message || t('integrations.shopify.errorRemoving'),
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
        title: t('integrations.shopify.requiredFields'),
        description: t('integrations.shopify.fillShopNameAndToken'),
        variant: "destructive",
      });
      return;
    }

    configureMutation.mutate({ shopName, accessToken });
  };

  const handleTest = () => {
    if (!shopName || !accessToken) {
      toast({
        title: t('integrations.shopify.requiredFields'),
        description: t('integrations.shopify.fillShopNameAndToken'),
        variant: "destructive",
      });
      return;
    }

    testMutation.mutate({ shopName, accessToken });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />{t('integrations.statusActive')}</Badge>;
      case "error":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{t('integrations.statusError')}</Badge>;
      default:
        return <Badge variant="secondary">{t('integrations.statusPending')}</Badge>;
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
            {t('integrations.shopify.title')}
          </CardTitle>
          <CardDescription>
            {t('integrations.shopify.description')}
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
                    <Label className="text-muted-foreground">{t('integrations.shopify.plan')}</Label>
                    <p>{integration.metadata.plan}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('integrations.shopify.currency')}</Label>
                    <p>{integration.metadata.currency}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('integrations.shopify.email')}</Label>
                    <p>{integration.metadata.storeEmail}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('integrations.shopify.lastSync')}</Label>
                    <p>{integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString('pt-BR') : t('integrations.shopify.never')}</p>
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
                  {t('integrations.shopify.syncShopify')}
                </Button>
                <Button
                  onClick={() => setIsConfiguring(true)}
                  variant="outline"
                >
                  {t('integrations.shopify.reconfigure')}
                </Button>
                <Button
                  onClick={() => removeMutation.mutate()}
                  disabled={removeMutation.isPending}
                  variant="destructive"
                >
                  {removeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  {t('integrations.shopify.remove')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">{t('integrations.shopify.noStoreConnected')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('integrations.shopify.configureToStart')}
              </p>
              <Button onClick={() => setIsConfiguring(true)}>
                {t('integrations.shopify.configureShopify')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {(isConfiguring || !integration) && (
        <Card>
          <CardHeader>
            <CardTitle style={{ fontSize: '20px' }}>{t('integrations.shopify.configureTitle')}</CardTitle>
            <CardDescription>
              {t('integrations.shopify.configureDescription')}
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
                      <span className="text-sm text-muted-foreground">{t('integrations.shopify.loadingWebhookInfo')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 p-4 bg-muted/50 border border-border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground mb-2">
                        {t('integrations.shopify.webhookOptional')}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {t('integrations.shopify.webhookDescription')}
                      </p>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">{t('integrations.shopify.webhookUrl')}</Label>
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
                                    title: t('integrations.shopify.webhookUrlCopied'),
                                    description: t('integrations.shopify.webhookUrlCopiedDescription'),
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
                          <Label className="text-sm text-muted-foreground">{t('integrations.shopify.requiredTopics')}</Label>
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
              <Label htmlFor="shopName">{t('integrations.shopify.shopName')}</Label>
              <Input
                id="shopName"
                data-testid="input-shop-name"
                placeholder={t('integrations.shopify.shopNamePlaceholder')}
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t('integrations.shopify.shopNameHint')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessToken">{t('integrations.shopify.accessToken')}</Label>
              <Input
                id="accessToken"
                data-testid="input-access-token"
                type="password"
                placeholder={t('integrations.shopify.accessTokenPlaceholder')}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t('integrations.shopify.accessTokenHint')}
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
                {t('integrations.shopify.testConnection')}
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
                {integration ? t('integrations.shopify.update') : t('integrations.shopify.save')}
              </Button>
            </div>

            {isConfiguring && integration && (
              <Button
                onClick={() => setIsConfiguring(false)}
                variant="outline"
                className="w-full"
              >
                {t('integrations.shopify.cancel')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ fontSize: '20px' }}>
            <Package className="w-5 h-5" />
            {t('integrations.shopify.howToConfigure')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="bg-blue-50 p-3 rounded-md border-l-4 border-blue-500">
            <h4 className="font-medium text-blue-800">{t('integrations.shopify.newArchitectureTitle')}</h4>
            <p className="text-blue-700 text-sm mt-1">
              {t('integrations.shopify.newArchitectureDescription')}
            </p>
          </div>
          
          <div>
            <h4 className="font-medium">{t('integrations.shopify.step1Title')}</h4>
            <p className="text-muted-foreground">
              {t('integrations.shopify.step1Description')}
            </p>
          </div>
          <div>
            <h4 className="font-medium">{t('integrations.shopify.step2Title')}</h4>
            <p className="text-muted-foreground">
              {t('integrations.shopify.step2Description')}
            </p>
          </div>
          <div>
            <h4 className="font-medium">{t('integrations.shopify.step3Title')}</h4>
            <p className="text-muted-foreground">
              {t('integrations.shopify.step3Description')}
            </p>
          </div>
          
          <div className="bg-green-50 p-3 rounded-md border-l-4 border-green-500">
            <h4 className="font-medium text-green-800">{t('integrations.shopify.syncFlowTitle')}</h4>
            <div className="text-green-700 text-sm mt-1 space-y-1">
              <p>{t('integrations.shopify.syncFlowStep1')}</p>
              <p>{t('integrations.shopify.syncFlowStep2')}</p>
              <p>{t('integrations.shopify.syncFlowStep3')}</p>
              <p>{t('integrations.shopify.syncFlowStep4')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}