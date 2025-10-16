import { useState, useEffect, useRef } from "react";
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
  onSyncStateChange?: (isRunning: boolean) => void;
  operationId?: string;
}

export function CompleteSyncDialog({ 
  isOpen, 
  onClose, 
  onComplete, 
  onSyncStateChange,
  operationId 
}: CompleteSyncDialogProps) {
  const [syncStatus, setSyncStatus] = useState<CompleteSyncStatus | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const hasStartedSyncRef = useRef(false);
  const pollingIntervalRef = useRef<number | null>(null);

  // Processar status e resetar ref se completou/erro
  const processStatus = (status: CompleteSyncStatus) => {
    setSyncStatus(status);
    onSyncStateChange?.(status.isRunning);

    // Resetar ref quando completar ou erro
    if (status.phase === 'completed' || status.phase === 'error') {
      hasStartedSyncRef.current = false;
      
      if (status.phase === 'completed' && onComplete) {
        setTimeout(onComplete, 1000);
      }
    }
  };

  // Iniciar polling de status
  const startStatusPolling = () => {
    // Limpar polling anterior se existir
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    console.log("🔄 Iniciando polling de status...");
    
    // Buscar status a cada 1 segundo
    const interval = setInterval(async () => {
      const status = await fetchStatusOnce();
      
      // Se não está mais rodando, parar polling e fechar modal
      if (status && !status.isRunning) {
        clearInterval(interval);
        pollingIntervalRef.current = null;
        
        // Aguardar 1.5s e fechar modal automaticamente
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    }, 1000) as unknown as number;

    pollingIntervalRef.current = interval;
  };

  // Buscar status uma vez
  const fetchStatusOnce = async (): Promise<CompleteSyncStatus | null> => {
    try {
      const url = operationId 
        ? `/api/sync/complete-status?operationId=${operationId}`
        : '/api/sync/complete-status';
      const response = await apiRequest(url, 'GET');
      const status = await response.json();
      processStatus(status);
      return status;
    } catch (error) {
      console.error("❌ Erro ao buscar status:", error);
      return null;
    }
  };

  // Função para iniciar a sincronização (apenas quando realmente iniciar)
  const startCompleteSync = async () => {
    setIsStarting(true);
    hasStartedSyncRef.current = true;

    try {
      const url = operationId 
        ? `/api/sync/complete-progressive?operationId=${operationId}`
        : '/api/sync/complete-progressive';
      
      console.log("🔄 Iniciando sync completo...", { url, operationId });
      
      const response = await apiRequest(url, 'POST', {
        forceComplete: true,
        maxRetries: 5
      });

      const result = await response.json();
      console.log("📊 Resposta do sync:", result);
      
      if (result.success) {
        console.log("🚀 Sincronização completa iniciada");
        // Iniciar polling de status
        startStatusPolling();
      } else {
        console.error("❌ Erro ao iniciar sincronização:", result.message);
        hasStartedSyncRef.current = false;
        onSyncStateChange?.(false);
      }
    } catch (error) {
      console.error("❌ Erro na requisição de sincronização:", error);
      hasStartedSyncRef.current = false;
      onSyncStateChange?.(false);
    } finally {
      setIsStarting(false);
    }
  };

  // Ao abrir o dialog, verificar se já há sync rodando
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Ao abrir, buscar status PRIMEIRO para decidir
    const initDialog = async () => {
      const status = await fetchStatusOnce();
      
      // Se status mostra running, iniciar polling
      if (status && status.isRunning) {
        startStatusPolling();
      }
      // Se hasStartedSyncRef é true mas status não mostra running ainda (race),
      // iniciar polling para pegar atualizações
      else if (hasStartedSyncRef.current && (!status || !status.isRunning)) {
        console.log("⏳ Sync iniciado mas status ainda não refletido, iniciando polling...");
        startStatusPolling();
      }
      // Se não está rodando e não iniciamos ainda, iniciar novo sync
      else if (status && !status.isRunning && !hasStartedSyncRef.current) {
        await startCompleteSync();
      }
    };

    initDialog();

    return () => {
      // Cleanup será feito no useEffect de desmontagem
    };
  }, [isOpen]);

  // Cleanup final ao desmontar completamente o componente
  useEffect(() => {
    return () => {
      // Limpar polling se existir
      if (pollingIntervalRef.current) {
        console.log("🔌 Limpando polling na desmontagem do componente");
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

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

  const handleClose = () => {
    // NÃO fechar SSE - manter ativo para detectar conclusão em background
    // SSE será fechado automaticamente quando sync completar (via processStatus)
    
    // Se iniciamos um sync (POST foi feito), sempre notificar como running
    // mesmo que o primeiro payload SSE ainda não tenha chegado
    if (isStarting || hasStartedSyncRef.current) {
      onSyncStateChange?.(true);
    }
    
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
