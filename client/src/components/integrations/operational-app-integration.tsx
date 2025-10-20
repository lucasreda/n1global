import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, CheckCircle, XCircle, Copy, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCurrentOperation } from "@/hooks/use-current-operation";

export function OperationalAppIntegration() {
  const { toast } = useToast();
  const { selectedOperation: operationId } = useCurrentOperation();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [generatedSecret, setGeneratedSecret] = useState("");

  // Fetch current config
  const { data: configData, isLoading } = useQuery<{ config: any }>({
    queryKey: ["/api/integrations/operational-app", operationId],
    queryFn: async () => {
      const res = await apiRequest(`/api/integrations/operational-app?operationId=${operationId}`, "GET");
      return res.json();
    },
    enabled: !!operationId,
    refetchOnMount: true,
  });

  const config = configData?.config;

  // Save config mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { webhookUrl: string; webhookSecret?: string; isActive: boolean }) => {
      const res = await apiRequest("/api/integrations/operational-app", "POST", {
        ...data,
        operationId,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/operational-app", operationId] });
      
      if (data.secret) {
        setGeneratedSecret(data.secret);
        setShowSecret(true);
      }
      
      toast({
        title: "Configuração salva",
        description: "A integração foi configurada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar a configuração",
        variant: "destructive",
      });
    },
  });

  // Test webhook mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/integrations/operational-app/test", "POST", {
        webhookUrl: webhookUrl || config?.webhookUrl,
        webhookSecret: webhookSecret || generatedSecret,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: "Conexão bem-sucedida",
          description: data.message,
        });
      } else {
        toast({
          title: "Falha na conexão",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao testar",
        description: error.message || "Não foi possível testar a conexão",
        variant: "destructive",
      });
    },
  });

  // Fetch logs
  const { data: logsData } = useQuery<{ logs: any[] }>({
    queryKey: ["/api/integrations/operational-app/logs", operationId],
    queryFn: async () => {
      const res = await apiRequest(`/api/integrations/operational-app/logs?operationId=${operationId}`, "GET");
      return res.json();
    },
    enabled: !!config && !!operationId,
  });

  const logs = logsData?.logs || [];

  const handleSave = () => {
    const url = webhookUrl || config?.webhookUrl;
    console.log('🔧 handleSave called:', { url, webhookUrl, configUrl: config?.webhookUrl, isActive });
    
    if (!url) {
      toast({
        title: "URL obrigatória",
        description: "Por favor, informe a URL do webhook",
        variant: "destructive",
      });
      return;
    }

    console.log('✅ Sending mutation:', { webhookUrl: url, webhookSecret: webhookSecret || undefined, isActive });
    
    saveMutation.mutate({
      webhookUrl: url,
      webhookSecret: webhookSecret || undefined,
      isActive: isActive,
    });
  };

  const handleTest = () => {
    const url = webhookUrl || config?.webhookUrl;
    if (!url) {
      toast({
        title: "URL obrigatória",
        description: "Por favor, informe a URL do webhook",
        variant: "destructive",
      });
      return;
    }

    if (!webhookSecret && !generatedSecret) {
      toast({
        title: "Secret obrigatório",
        description: "Por favor, salve a configuração primeiro para gerar o secret",
        variant: "destructive",
      });
      return;
    }

    testMutation.mutate();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: `${label} copiado para a área de transferência`,
    });
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
      {/* Configuração */}
      <Card className="bg-black/40 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Configuração do Webhook</CardTitle>
          <CardDescription>
            Configure o webhook para receber notificações de novos pedidos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhookUrl" className="text-gray-300">URL do Webhook</Label>
            <div className="flex space-x-2">
              <Input
                id="webhookUrl"
                placeholder="https://seu-app.com/api/webhooks/orders"
                value={webhookUrl || config?.webhookUrl || ""}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="bg-black/20 border-white/10 text-white"
                data-testid="input-webhook-url"
              />
              {config?.webhookUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(config.webhookUrl, "URL")}
                  data-testid="button-copy-url"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhookSecret" className="text-gray-300">Webhook Secret</Label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Input
                  id="webhookSecret"
                  type={showSecret ? "text" : "password"}
                  placeholder="Deixe em branco para gerar automaticamente"
                  value={webhookSecret || (showSecret ? generatedSecret : "")}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  className="bg-black/20 border-white/10 text-white pr-10"
                  data-testid="input-webhook-secret"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowSecret(!showSecret)}
                  data-testid="button-toggle-secret"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {generatedSecret && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(generatedSecret, "Secret")}
                  data-testid="button-copy-secret"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-400">
              Use este secret para validar a assinatura HMAC SHA-256 no header X-Webhook-Signature
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-gray-300">Status da Integração</Label>
              <p className="text-sm text-gray-400">
                {isActive || config?.isActive 
                  ? "Ativa - Enviando webhooks e emails" 
                  : "Inativa - Webhooks e emails desativados"}
              </p>
            </div>
            <Switch
              checked={isActive || config?.isActive || false}
              onCheckedChange={setIsActive}
              data-testid="switch-integration-active"
            />
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-blue-500 hover:bg-blue-600"
              data-testid="button-save-config"
            >
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Configuração
            </Button>
            <Button
              onClick={handleTest}
              disabled={testMutation.isPending}
              variant="outline"
              className="border-white/10"
              data-testid="button-test-webhook"
            >
              {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <RefreshCw className="mr-2 h-4 w-4" />
              Testar Conexão
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payload Example */}
      <Card className="bg-black/40 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Exemplo de Payload</CardTitle>
          <CardDescription>
            Este é o formato do JSON que será enviado para seu webhook
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-black/40 p-4 rounded-lg text-sm text-gray-300 overflow-x-auto">
{`{
  "event": "order.created",
  "order": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "customer_email": "cliente@example.com",
    "customer_name": "João Silva",
    "phone": "+5511999999999"
  }
}`}
          </pre>
        </CardContent>
      </Card>

      {/* Logs */}
      {logs.length > 0 && (
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Histórico de Webhooks</CardTitle>
            <CardDescription>
              Últimas {logs.length} tentativas de envio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {logs.map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-black/20 rounded-lg"
                  data-testid={`log-${log.id}`}
                >
                  <div className="flex items-center space-x-3">
                    {log.responseStatus >= 200 && log.responseStatus < 300 ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400" />
                    )}
                    <div>
                      <p className="text-sm text-white">Pedido: {log.orderId}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={log.responseStatus >= 200 && log.responseStatus < 300 ? "default" : "destructive"}
                  >
                    {log.responseStatus || "Erro"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
