import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Rocket, 
  Globe, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink, 
  Settings,
  Loader2,
  AlertTriangle,
  Zap
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DeploymentStatus {
  id: string;
  status: 'BUILDING' | 'ERROR' | 'READY' | 'QUEUED' | 'INITIALIZING' | 'CANCELED';
  url?: string;
  createdAt: number;
  readyAt?: number;
  error?: string;
}

interface FunnelDeployInterfaceProps {
  sessionId?: string;
  funnelId?: string;
  operationId?: string;
  previewData?: {
    validation?: {
      isValid?: boolean;
      score?: number;
      errors?: any[];
      warnings?: any[];
      issues?: any[];
      metrics?: any;
    };
    pages?: any[];
    productInfo?: any;
  };
  onDeploymentComplete?: (deployment: any) => void;
  className?: string;
}

export function FunnelDeployInterface({ 
  sessionId, 
  funnelId,
  operationId,
  previewData,
  onDeploymentComplete,
  className 
}: FunnelDeployInterfaceProps) {
  const [projectName, setProjectName] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [deploymentProgress, setDeploymentProgress] = useState(0);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get Vercel integration status
  const { data: vercelIntegration, isLoading: loadingIntegration } = useQuery({
    queryKey: ['/api/funnels/vercel/status', operationId],
    queryFn: async () => {
      // Use operationId from props or fallback to context
      const currentOperationId = operationId || 
        new URLSearchParams(window.location.search).get('operationId') || 
        localStorage.getItem('selectedOperationId');
      
      if (!currentOperationId) {
        throw new Error('Operation context is required for Vercel integration status');
      }

      return await apiRequest(`/api/funnels/vercel/status?operationId=${currentOperationId}`, 'GET');
    },
    enabled: !!(operationId || 
      new URLSearchParams(window.location.search).get('operationId') || 
      localStorage.getItem('selectedOperationId')),
  });

  // Deploy from preview session mutation
  const deployFromPreviewMutation = useMutation({
    mutationFn: async (data: { 
      sessionId: string; 
      projectName: string; 
      customDomain?: string; 
    }) => {
      // Use operationId from props or fallback to context
      const currentOperationId = operationId || 
        new URLSearchParams(window.location.search).get('operationId') || 
        localStorage.getItem('selectedOperationId');
      
      if (!currentOperationId) {
        throw new Error('Operation context is required for deployment');
      }

      return await apiRequest(`/api/funnels/multi-page/create-and-deploy?operationId=${currentOperationId}`, 'POST', {
        sessionId: data.sessionId,
        projectName: data.projectName,
        customDomain: data.customDomain,
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "🚀 Deploy Iniciado!",
        description: "Seu funil está sendo implantado no Vercel. Acompanhe o progresso abaixo.",
      });
      
      setDeploymentStatus({
        id: data.deployment.id,
        status: data.deployment.state,
        url: data.deployment.url,
        createdAt: data.deployment.createdAt,
      });
      
      // Start polling for deployment status
      pollDeploymentStatus(data.deployment.id);
    },
    onError: (error: any) => {
      console.error('Deploy error:', error);
      toast({
        title: "❌ Erro no Deploy",
        description: error.message || "Falha ao iniciar o deploy. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Deploy regular funnel mutation (uses multi-page endpoint with server-managed tokens)
  const deployFunnelMutation = useMutation({
    mutationFn: async (data: { 
      funnelId: string; 
      projectName?: string;
      customDomain?: string; 
    }) => {
      // Use operationId from props or fallback to context
      const currentOperationId = operationId || 
        new URLSearchParams(window.location.search).get('operationId') || 
        localStorage.getItem('selectedOperationId');
      
      if (!currentOperationId) {
        throw new Error('Operation context is required for deployment');
      }

      // For regular funnel deployment, we'll use the create-and-deploy endpoint
      // which handles server-side token management and operation scoping
      return await apiRequest(`/api/funnels/multi-page/create-and-deploy?operationId=${currentOperationId}`, 'POST', {
        sessionId: `funnel-${data.funnelId}`,
        projectName: data.projectName || `funnel-${data.funnelId}`,
        customDomain: data.customDomain,
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "🚀 Deploy Iniciado!",
        description: "Seu funil está sendo implantado no Vercel. Acompanhe o progresso abaixo.",
      });
      
      // Set deployment status if backend returns it
      if (data.deployment) {
        setDeploymentStatus({
          id: data.deployment.id,
          status: data.deployment.state,
          url: data.deployment.url,
          createdAt: data.deployment.createdAt,
        });
        
        // Start polling for deployment status
        pollDeploymentStatus(data.deployment.id);
      } else {
        // Fallback: just show toast and invalidate queries
        queryClient.invalidateQueries({ queryKey: ['/api/funnels'] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro no Deploy",
        description: error.message || "Falha ao iniciar o deploy. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Poll deployment status
  const pollDeploymentStatus = async (deploymentId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        // Use operationId from props or fallback to context
        const currentOperationId = operationId || 
          new URLSearchParams(window.location.search).get('operationId') || 
          localStorage.getItem('selectedOperationId');
        
        if (!currentOperationId) {
          throw new Error('Operation context is required for deployment status');
        }

        const response = await apiRequest(`/api/funnels/vercel/deployment/${deploymentId}/status?operationId=${currentOperationId}`, 'GET') as any;
        
        setDeploymentStatus(response.deployment);
        
        // Update progress based on status
        switch (response.deployment.status) {
          case 'QUEUED':
            setDeploymentProgress(10);
            break;
          case 'INITIALIZING':
            setDeploymentProgress(25);
            break;
          case 'BUILDING':
            setDeploymentProgress(60);
            break;
          case 'READY':
            setDeploymentProgress(100);
            clearInterval(pollInterval);
            toast({
              title: "🎉 Deploy Concluído!",
              description: `Seu funil está agora disponível em: ${response.deployment.url}`,
            });
            // Only call completion callback when deployment is actually ready
            if (onDeploymentComplete && response.deployment) {
              onDeploymentComplete(response.deployment);
            }
            break;
          case 'ERROR':
          case 'CANCELED':
            setDeploymentProgress(0);
            clearInterval(pollInterval);
            toast({
              title: "❌ Deploy Falhou",
              description: response.deployment.error || "O deploy foi cancelado ou falhou.",
              variant: "destructive",
            });
            break;
        }
        
      } catch (error) {
        console.error('Failed to poll deployment status:', error);
        clearInterval(pollInterval);
      }
    }, 3000);

    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 600000);
  };

  const handleDeploy = () => {
    if (!projectName.trim()) {
      toast({
        title: "Nome do projeto obrigatório",
        description: "Digite um nome para o projeto antes de fazer o deploy.",
        variant: "destructive",
      });
      return;
    }

    if (sessionId) {
      // Deploy from preview session
      deployFromPreviewMutation.mutate({
        sessionId,
        projectName: projectName.trim(),
        customDomain: customDomain.trim() || undefined,
      });
    } else if (funnelId) {
      // Deploy regular funnel
      deployFunnelMutation.mutate({
        funnelId,
        projectName: projectName.trim(),
        customDomain: customDomain.trim() || undefined,
      });
    }
  };

  const isDeploying = deployFromPreviewMutation.isPending || deployFunnelMutation.isPending;
  const integration = vercelIntegration as any;
  const canDeploy = integration?.connected && 
    (sessionId ? previewData?.validation?.isValid !== false : true) && 
    projectName.trim();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'READY':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'ERROR':
      case 'CANCELED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'BUILDING':
      case 'INITIALIZING':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY':
        return 'bg-green-500';
      case 'ERROR':
      case 'CANCELED':
        return 'bg-red-500';
      case 'BUILDING':
      case 'INITIALIZING':
        return 'bg-blue-500';
      default:
        return 'bg-yellow-500';
    }
  };

  if (loadingIntegration) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Verificando integração Vercel...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5" />
              Deploy para Vercel
            </CardTitle>
            <CardDescription>
              {sessionId ? 
                "Implante seu funil validado diretamente da preview" : 
                "Implante seu funil em produção"
              }
            </CardDescription>
          </div>
          {integration?.connected ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Zap className="w-3 h-3 mr-1" />
              Conectado
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-gray-50 text-gray-600">
              Desconectado
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Vercel Integration Status */}
        {!integration?.connected && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Conecte sua conta Vercel primeiro para fazer deploy dos funis.
              <Button variant="link" className="ml-2 p-0 h-auto">
                Conectar Vercel
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Preview Validation Status */}
        {sessionId && previewData?.validation && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Status da Validação</Label>
            <div className="flex items-center gap-3">
              {previewData.validation.isValid ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">
                    Score de Validação: {previewData.validation?.score || 0}/100
                  </span>
                  <Badge 
                    variant={previewData.validation.isValid ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {previewData.validation.isValid ? "Aprovado" : "Reprovado"}
                  </Badge>
                </div>
                <Progress value={previewData.validation.score || 0} className="h-2" />
              </div>
            </div>
            
            {(previewData.validation.errors || previewData.validation.issues)?.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {(previewData.validation.errors || previewData.validation.issues)?.length} erro(s) devem ser corrigidos antes do deploy.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <Separator />

        {/* Deploy Configuration */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projectName" className="text-sm font-medium">
              Nome do Projeto <span className="text-red-500">*</span>
            </Label>
            <Input
              id="projectName"
              placeholder="ex: meu-funil-vendas"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={isDeploying}
              data-testid="input-project-name"
            />
            <p className="text-xs text-gray-500">
              Será usado como nome do projeto no Vercel. Use apenas letras, números e hífens.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customDomain" className="text-sm font-medium">
              Domínio Personalizado (Opcional)
            </Label>
            <Input
              id="customDomain"
              placeholder="meusite.com"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              disabled={isDeploying}
              data-testid="input-custom-domain"
            />
            <p className="text-xs text-gray-500">
              Configure um domínio personalizado após o deploy (pode ser adicionado depois).
            </p>
          </div>
        </div>

        {/* Deployment Progress */}
        {deploymentStatus && (
          <div className="space-y-3">
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Status do Deploy</Label>
                <div className="flex items-center gap-2">
                  {getStatusIcon(deploymentStatus.status)}
                  <span className="text-sm capitalize">
                    {deploymentStatus.status.toLowerCase()}
                  </span>
                </div>
              </div>
              
              <Progress value={deploymentProgress} className="h-2" />
              
              {deploymentStatus.url && deploymentStatus.status === 'READY' && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <Globe className="w-4 h-4 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">Deploy Concluído!</p>
                    <a 
                      href={`https://${deploymentStatus.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-600 hover:text-green-800 flex items-center gap-1"
                      data-testid="link-deployed-site"
                    >
                      {deploymentStatus.url} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Deploy Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleDeploy}
            disabled={!canDeploy || isDeploying}
            className="flex-1"
            data-testid="button-deploy-funnel"
          >
            {isDeploying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Fazendo Deploy...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4 mr-2" />
                Fazer Deploy
              </>
            )}
          </Button>

          {integration?.connected && (
            <Button
              variant="outline"
              size="icon"
              disabled={isDeploying}
              data-testid="button-deploy-settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Deploy Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• O deploy pode levar alguns minutos para ser concluído</p>
          <p>• Você receberá uma URL temporária do Vercel</p>
          <p>• Domínios personalizados podem ser configurados depois</p>
        </div>
      </CardContent>
    </Card>
  );
}