import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt, enUS, es, type Locale } from "date-fns/locale";
import { useTranslation } from "@/hooks/use-translation";
import { authenticatedApiRequest } from "@/lib/auth";

interface SyncConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  operationId?: string | null;
}

export function SyncConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  operationId,
}: SyncConfirmationDialogProps) {
  const { t, currentLanguage } = useTranslation();

  // Valores padrão estáticos para informações de sincronização - sem chamada à API
  const syncInfo = {
    autoSyncActive: true,
    lastAutoSync: null,
    lastCompleteSync: null,
    hasWebhooks: false,
    hasPolling: true,
  };

  // Verificar primeira sync em background (sem mostrar loading)
  useEffect(() => {
    if (isOpen) {
      const checkFirstSync = async () => {
        try {
          const url = operationId
            ? `/api/sync/sync-info?operationId=${operationId}`
            : "/api/sync/sync-info";
          const response = await authenticatedApiRequest("GET", url);
          const data = await response.json();
          
          // Se for primeira sync, abrir diretamente o sync completo
          if (data.isFirstSync) {
            onConfirm();
            onClose();
          }
        } catch (error) {
          // Em caso de erro, assumir que não é primeira sync e mostrar modal normalmente
          console.error('Erro ao verificar primeira sync:', error);
        }
      };

      checkFirstSync();
    }
  }, [isOpen, operationId, onConfirm, onClose]);

  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return t('dashboard.syncConfirmation.never');
    try {
      const date = new Date(dateString);
      const localeMap: Record<string, Locale> = {
        'pt-BR': pt,
        'en': enUS,
        'es': es,
      };
      const locale = localeMap[currentLanguage] || pt;
      return formatDistanceToNow(date, { addSuffix: true, locale });
    } catch {
      return t('dashboard.syncConfirmation.invalidDate');
    }
  };

  const autoSyncStatus = syncInfo.autoSyncActive;
  const statusColor = autoSyncStatus ? "bg-green-500" : "bg-yellow-500";
  const statusText = autoSyncStatus ? t('dashboard.syncConfirmation.active') : t('dashboard.syncConfirmation.inactive');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg glassmorphism border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-white">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            {t('dashboard.syncConfirmation.title')}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {t('dashboard.syncConfirmation.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status da Sincronização Automática */}
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${statusColor} animate-pulse`} />
                <span className="text-sm font-medium text-white">
                  {t('dashboard.syncConfirmation.automaticSync')}
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
              {syncInfo.hasWebhooks && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span>{t('dashboard.syncConfirmation.webhooksConfigured')}</span>
                </div>
              )}
              {syncInfo.hasPolling && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span>{t('dashboard.syncConfirmation.pollingActive')}</span>
                </div>
              )}
              {syncInfo.lastAutoSync && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>
                    {t('dashboard.syncConfirmation.lastAutoUpdate')}:{" "}
                    <span className="font-medium text-white">
                      {formatLastSync(syncInfo.lastAutoSync)}
                    </span>
                  </span>
                </div>
              )}
              {syncInfo.lastCompleteSync && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Info className="h-3 w-3" />
                  <span>
                    {t('dashboard.syncConfirmation.lastCompleteSync')}:{" "}
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
                <p className="font-medium mb-1">{t('dashboard.syncConfirmation.warning')}:</p>
                <p>
                  {t('dashboard.syncConfirmation.warningMessage')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700/50"
          >
            {t('dashboard.syncConfirmation.cancel')}
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {t('dashboard.syncConfirmation.continue')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

