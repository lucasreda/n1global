import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, RefreshCw, Store, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { useTourContext } from "@/contexts/tour-context";
import { useLocation } from "wouter";
import { useTranslation } from "@/hooks/use-translation";

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
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState("");
  const [testOrderId, setTestOrderId] = useState("");
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
        title: t('integrations.digistore.success'),
        description: t('integrations.digistore.configuredSuccessfully'),
      });

      // Redirecionar para orders e iniciar tour
      toast({
        title: t('integrations.digistore.readyToSync'),
        description: t('integrations.digistore.readyToSyncDescription'),
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
        title: t('integrations.digistore.error'),
        description: error.message || t('integrations.digistore.errorConfiguring'),
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
        title: t('integrations.digistore.validConnection'),
        description: t('integrations.digistore.connectedSuccessfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('integrations.digistore.connectionError'),
        description: error.message || t('integrations.digistore.errorConnecting'),
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
        title: t('integrations.digistore.syncCompleted'),
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: t('integrations.digistore.syncError'),
        description: error.message || t('integrations.digistore.errorSyncing'),
        variant: "destructive",
      });
    },
  });

  // Testar webhook (TEMPORÁRIO - apenas para desenvolvimento)
  const testWebhookMutation = useMutation({
    mutationFn: async () => {
      if (!operationId) {
        throw new Error(t('integrations.digistore.selectOperationBeforeTest'));
      }

      const params = new URLSearchParams();
      params.append("operationId", operationId);
      if (testOrderId.trim()) params.append("customOrderId", testOrderId.trim());

      const response = await apiRequest(
        `/api/integrations/digistore/test-webhook?${params.toString()}`,
        "POST"
      );
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: t('integrations.digistore.webhookTestProcessed'),
        description: t('integrations.digistore.orderId', { orderId: data.orderId }),
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error: any) => {
      toast({
        title: t('integrations.digistore.errorTestingWebhook'),
        description: error.message || t('common.error'),
        variant: "destructive",
      });
    },
  });

  const handleConfigure = () => {
    if (!apiKey.trim()) {
      toast({
        title: t('integrations.digistore.requiredField'),
        description: t('integrations.digistore.fillApiKey'),
        variant: "destructive",
      });
      return;
    }
    configureMutation.mutate({ apiKey: apiKey.trim() });
  };

  const handleTest = () => {
    if (!apiKey.trim()) {
      toast({
        title: t('integrations.digistore.requiredField'),
        description: t('integrations.digistore.fillApiKeyToTest'),
        variant: "destructive",
      });
      return;
    }
    testMutation.mutate({ apiKey: apiKey.trim() });
  };

  const getStatusBadge = () => {
    if (!integration) return <Badge variant="secondary">{t('integrations.statusNotConfigured')}</Badge>;
    
    switch (integration.status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{t('integrations.statusActive')}</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{t('integrations.statusPending')}</Badge>;
      case "error":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{t('integrations.statusError')}</Badge>;
      default:
        return <Badge variant="secondary">{t('integrations.statusUnknown')}</Badge>;
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
            {t('integrations.digistore.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              {integration ? (
                <div className="space-y-2">
                  <p className="text-gray-300">
                    <strong>{t('integrations.digistore.integration')}:</strong> Digistore24
                  </p>
                  <p className="text-gray-300">
                    <strong>{t('integrations.digistore.lastSync')}:</strong>{" "}
                    {integration.lastSyncAt 
                      ? new Date(integration.lastSyncAt).toLocaleString("pt-BR")
                      : t('integrations.shopify.never')
                    }
                  </p>
                  {integration.syncErrors && (
                    <p className="text-red-400 text-sm">
                      <strong>{t('integrations.digistore.errors')}:</strong> {integration.syncErrors}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400">{t('integrations.digistore.noIntegration')}</p>
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
            {integration ? t('integrations.digistore.updateTitle') : t('integrations.digistore.configureTitle')}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {t('integrations.digistore.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-gray-300">
              {t('integrations.digistore.apiKey')} <span className="text-red-400">*</span>
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder={t('integrations.digistore.apiKeyPlaceholder')}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-black/40 border-white/20 text-white placeholder:text-gray-500"
              data-testid="input-api-key"
            />
            <p className="text-sm text-gray-500">
              {t('integrations.digistore.apiKeyHint')}
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
              {t('integrations.digistore.testConnection')}
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
              {integration ? t('integrations.digistore.update') : t('integrations.digistore.configure')}
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
              {t('integrations.digistore.syncTitle')}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {t('integrations.digistore.syncDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm text-gray-300">
                ℹ️ {t('integrations.digistore.webhookInfo')}
              </p>
              <p className="text-sm text-gray-300 mt-2">
                <strong>{t('integrations.digistore.webhookUrl')}:</strong><br />
                <code className="text-xs bg-black/30 px-2 py-1 rounded">
                  https://www.n1global.app/api/integrations/digistore/webhook
                </code>
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="custom-order-id" className="text-sm text-gray-200">
                {t('integrations.digistore.customOrderId')}
              </Label>
              <Input
                id="custom-order-id"
                placeholder={t('integrations.digistore.customOrderIdPlaceholder')}
                value={testOrderId}
                onChange={(e) => setTestOrderId(e.target.value)}
                className="bg-black/40 border-white/10 text-white"
              />
              <p className="text-xs text-gray-400">
                {t('integrations.digistore.customOrderIdHint')}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                data-testid="button-sync-data"
              >
                {syncMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {t('integrations.digistore.syncPendingDeliveries')}
              </Button>
              
              <Button
                onClick={() => testWebhookMutation.mutate()}
                disabled={testWebhookMutation.isPending}
                variant="outline"
                className="border-yellow-600 text-yellow-600 hover:bg-yellow-600 hover:text-white"
                data-testid="button-test-webhook"
              >
                {testWebhookMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {t('integrations.digistore.testWebhook')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

