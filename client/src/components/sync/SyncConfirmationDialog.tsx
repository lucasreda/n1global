import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { authenticatedApiRequest } from "@/lib/auth";
import { AlertCircle, RefreshCw, CheckCircle2, Clock, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface SyncConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  operationId?: string | null;
}

interface SyncInfo {
  isFirstSync: boolean;
  autoSyncActive: boolean;
  lastAutoSync: string | null;
  lastCompleteSync: string | null;
  hasWebhooks: boolean;
  hasPolling: boolean;
}

export function SyncConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  operationId,
}: SyncConfirmationDialogProps) {
  const [syncInfo, setSyncInfo] = useState<SyncInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchSyncInfo();
    }
  }, [isOpen, operationId]);

  const fetchSyncInfo = async () => {
    setIsLoading(true);
    try {
      const url = operationId
        ? `/api/sync/sync-info?operationId=${operationId}`
        : "/api/sync/sync-info";
      const response = await authenticatedApiRequest("GET", url);
      const data = await response.json();
      setSyncInfo(data);
    } catch (error) {
      console.error("Erro ao buscar informações de sincronização:", error);
      // Em caso de erro, assumir que não é primeira sync
      setSyncInfo({
        isFirstSync: false,
        autoSyncActive: true,
        lastAutoSync: null,
        lastCompleteSync: null,
        hasWebhooks: false,
        hasPolling: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: pt });
    } catch {
      return "Data inválida";
    }
  };

  // Se for primeira sync, não mostrar o modal de confirmação - abrir direto o sync completo
  useEffect(() => {
    if (!isLoading && syncInfo?.isFirstSync && isOpen) {
      // Pequeno delay para evitar fechar imediatamente antes de confirmar
      const timer = setTimeout(() => {
        onConfirm();
        onClose();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, syncInfo?.isFirstSync, isOpen, onConfirm, onClose]);
  
  // Se for primeira sync, não renderizar o modal (mas ainda executar o useEffect para chamar onConfirm)
  if (!isLoading && syncInfo?.isFirstSync) {
    return null;
  }

  const autoSyncStatus = syncInfo?.autoSyncActive ?? true;
  const statusColor = autoSyncStatus ? "bg-green-500" : "bg-yellow-500";
  const statusText = autoSyncStatus ? "Ativa" : "Inativa";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg glassmorphism border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-white">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Confirmar Sincronização Completa
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            A sincronização completa só é necessária se você deseja resetar todos os pedidos sincronizados por completo. O processo pode durar alguns minutos.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Status da Sincronização Automática */}
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${statusColor} animate-pulse`} />
                  <span className="text-sm font-medium text-white">
                    Sincronização Automática
                  </span>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${
                    autoSyncStatus
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                  }`}
                >
                  {statusText}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-300">
                {syncInfo?.hasWebhooks && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <span>Webhooks configurados e ativos</span>
                  </div>
                )}
                {syncInfo?.hasPolling && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <span>Polling automático ativo (a cada 5 minutos)</span>
                  </div>
                )}
                {syncInfo?.lastAutoSync && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>
                      Última atualização automática:{" "}
                      <span className="font-medium text-white">
                        {formatLastSync(syncInfo.lastAutoSync)}
                      </span>
                    </span>
                  </div>
                )}
                {syncInfo?.lastCompleteSync && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Info className="h-3 w-3" />
                    <span>
                      Última sync completa:{" "}
                      <span className="font-medium text-gray-300">
                        {formatLastSync(syncInfo.lastCompleteSync)}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Aviso */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-200">
                  <p className="font-medium mb-1">Atenção:</p>
                  <p>
                    A sincronização completa processará todos os pedidos novamente,
                    o que pode levar alguns minutos e pode impactar o desempenho do sistema.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700/50"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Continuar com Sync Completo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

