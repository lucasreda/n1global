import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, RefreshCw, Loader2, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface CompleteSyncStatus {
  isRunning: boolean;
  currentPage: number;
  totalPages: number;
  processedLeads: number;
  totalLeads: number;
  newLeads: number;
  updatedLeads: number;
  errors: number;
  retries: number;
  estimatedTimeRemaining: string;
  currentSpeed: number;
  phase: 'connecting' | 'syncing' | 'retrying' | 'completed' | 'error';
  message: string;
  startTime?: Date;
}

interface CompleteSyncDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  operationId?: string;
}

export function CompleteSyncDialog({ isOpen, onClose, onComplete, operationId }: CompleteSyncDialogProps) {
  const [syncStatus, setSyncStatus] = useState<CompleteSyncStatus | null>(null);
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Função para iniciar a sincronização
  const startCompleteSync = async () => {
    setIsStarting(true);
    try {
      const url = operationId 
        ? `/api/sync/complete-progressive?operationId=${operationId}`
        : '/api/sync/complete-progressive';
      
      console.log("🔄 Iniciando sync completo...", { url, operationId });
      
      const response = await apiRequest('POST', url, {
        forceComplete: true,
        maxRetries: 5
      });

      const result = await response.json();
      console.log("📊 Resposta do sync:", result);
      
      if (result.success) {
        console.log("🚀 Sincronização completa iniciada");
        startPolling();
      } else {
        console.error("❌ Erro ao iniciar sincronização:", result.message);
      }
    } catch (error) {
      console.error("❌ Erro na requisição de sincronização:", error);
    } finally {
      setIsStarting(false);
    }
  };

  // Função para buscar status da sincronização
  const fetchSyncStatus = async () => {
    try {
      const response = await apiRequest('GET', '/api/sync/complete-status');
      const status = await response.json();
      setSyncStatus(status);

      // Se completou ou houve erro, parar o polling
      if (status.phase === 'completed' || (status.phase === 'error' && !status.isRunning)) {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }

        // Se completou com sucesso, chamar callback
        if (status.phase === 'completed' && onComplete) {
          setTimeout(onComplete, 1000); // Aguardar um pouco antes de atualizar a UI
        }
      }
    } catch (error) {
      console.error("❌ Erro ao buscar status da sincronização:", error);
    }
  };

  // Iniciar polling
  const startPolling = () => {
    if (pollingInterval) return;

    fetchSyncStatus(); // Buscar imediatamente
    const interval = setInterval(fetchSyncStatus, 1000) as unknown as number; // A cada segundo
    setPollingInterval(interval);
  };

  // Limpar polling quando fechar
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Auto-iniciar ao abrir o dialog
  useEffect(() => {
    if (isOpen && !syncStatus?.isRunning && !isStarting) {
      startCompleteSync();
    }
  }, [isOpen]);

  // Calcular progresso
  const getProgress = () => {
    if (!syncStatus || syncStatus.totalLeads === 0) return 0;
    return Math.round((syncStatus.processedLeads / syncStatus.totalLeads) * 100);
  };

  // Ícone baseado na fase
  const getPhaseIcon = () => {
    if (!syncStatus) return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />;

    switch (syncStatus.phase) {
      case 'connecting':
        return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />;
      case 'syncing':
        return <RefreshCw className="h-6 w-6 text-blue-500 animate-spin" />;
      case 'retrying':
        return <AlertCircle className="h-6 w-6 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />;
    }
  };

  // Cor da barra de progresso baseada na fase
  const getProgressColor = () => {
    if (!syncStatus) return "";

    switch (syncStatus.phase) {
      case 'connecting':
      case 'syncing':
        return "bg-blue-500";
      case 'retrying':
        return "bg-yellow-500";
      case 'completed':
        return "bg-green-500";
      case 'error':
        return "bg-red-500";
      default:
        return "bg-blue-500";
    }
  };

  const handleClose = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setSyncStatus(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="complete-sync-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getPhaseIcon()}
            Sincronização Completa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mensagem de status */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground" data-testid="sync-message">
              {isStarting ? "Iniciando sincronização..." : (syncStatus?.message || "Preparando...")}
            </p>
          </div>

          {/* Barra de progresso */}
          {syncStatus && syncStatus.totalLeads > 0 && (
            <div className="space-y-2">
              <Progress 
                value={getProgress()} 
                className="h-3"
                data-testid="sync-progress"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span data-testid="sync-processed">
                  {syncStatus.processedLeads.toLocaleString()} / {syncStatus.totalLeads.toLocaleString()} pedidos
                </span>
                <span data-testid="sync-percentage">
                  {getProgress()}%
                </span>
              </div>
            </div>
          )}

          {/* Estatísticas detalhadas */}
          {syncStatus && syncStatus.phase !== 'connecting' && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Novos:</span>
                  <span className="font-medium text-green-600" data-testid="sync-new-leads">
                    +{syncStatus.newLeads.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Atualizados:</span>
                  <span className="font-medium text-blue-600" data-testid="sync-updated-leads">
                    ~{syncStatus.updatedLeads.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Velocidade:</span>
                  <span className="font-medium" data-testid="sync-speed">
                    {syncStatus.currentSpeed}/min
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Restante:</span>
                  <span className="font-medium" data-testid="sync-time-remaining">
                    {syncStatus.estimatedTimeRemaining}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Informações de páginas */}
          {syncStatus && syncStatus.totalPages > 0 && (
            <div className="flex justify-center text-xs text-muted-foreground">
              <span data-testid="sync-pages">
                Página {syncStatus.currentPage} de {syncStatus.totalPages}
                {syncStatus.retries > 0 && (
                  <span className="text-yellow-600 ml-2">
                    • {syncStatus.retries} tentativas
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            {syncStatus?.phase === 'completed' && (
              <Button onClick={handleClose} data-testid="button-close">
                Concluir
              </Button>
            )}
            
            {syncStatus?.phase === 'error' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={startCompleteSync}
                  disabled={isStarting}
                  data-testid="button-retry"
                >
                  {isStarting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Tentar Novamente
                </Button>
              </>
            )}

            {(syncStatus?.isRunning || isStarting) && (
              <Button 
                variant="secondary" 
                onClick={handleClose}
                data-testid="button-close-running"
              >
                Fechar (continua em background)
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}