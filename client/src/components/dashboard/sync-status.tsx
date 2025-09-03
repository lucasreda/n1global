import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RefreshCw, Play, Database, Activity, CheckCircle2 } from "lucide-react";
import { authenticatedApiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function SyncStatus() {
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch sync stats
  const operationId = localStorage.getItem("current_operation_id");
  const { data: syncStats, isLoading } = useQuery({
    queryKey: ["/api/sync/stats", operationId],
    queryFn: async () => {
      const url = operationId 
        ? `/api/sync/stats?operationId=${operationId}`
        : "/api/sync/stats";
      const response = await authenticatedApiRequest("GET", url);
      return response.json();
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Manual sync mutation
  const syncMutation = useMutation({
    mutationFn: async (options: { maxPages?: number; syncType?: string }) => {
      const response = await authenticatedApiRequest("POST", "/api/sync/start", {
        body: JSON.stringify(options),
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sincronização iniciada",
        description: data.message || "Sincronização executada com sucesso",
      });
      // Refresh sync stats and dashboard data
      queryClient.invalidateQueries({ queryKey: ["/api/sync/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
    },
    onError: (error) => {
      toast({
        title: "Erro na sincronização",
        description: error.message || "Erro ao executar sincronização",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsManualSyncing(false);
    },
  });

  const handleManualSync = (syncType: string = "incremental", maxPages: number = 3) => {
    setIsManualSyncing(true);
    syncMutation.mutate({ maxPages, syncType });
  };

  const formatLastSync = (date: string | null) => {
    if (!date) return "Nunca";
    const lastSync = new Date(date);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "Agora";
    if (diffMinutes < 60) return `${diffMinutes}min atrás`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
  };

  if (isLoading) {
    return (
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300" style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Database className="w-4 h-4 text-slate-400" />
            <h3 className="text-lg font-semibold text-white">Sincronização Inteligente</h3>
          </div>
          <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
        </div>
        <div className="animate-pulse">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center space-y-2">
              <div className="h-6 bg-gray-600/50 rounded"></div>
              <div className="h-3 bg-gray-600/50 rounded"></div>
            </div>
            <div className="text-center space-y-2">
              <div className="h-6 bg-gray-600/50 rounded"></div>
              <div className="h-3 bg-gray-600/50 rounded"></div>
            </div>
            <div className="text-center space-y-2">
              <div className="h-6 bg-gray-600/50 rounded"></div>
              <div className="h-3 bg-gray-600/50 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300" 
      style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}} 
      data-testid="sync-status-card"
      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
      onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
    >
      {/* Header - seguindo padrão dos outros cards */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Database className="w-4 h-4 text-slate-400" />
          <h3 className="text-lg font-semibold text-white">Sincronização Inteligente</h3>
        </div>
        <div className="flex items-center space-x-2">
          {syncStats?.isRunning && (
            <div className="px-2 py-1 rounded-md text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center">
              <Activity className="h-3 w-3 mr-1 animate-pulse" />
              Executando
            </div>
          )}
          <div className="px-2 py-1 rounded-md text-xs font-medium bg-green-500/20 text-green-400 border border-green-400/30 flex items-center">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Automática
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-400 mb-4">
        Monitora apenas pedidos ativos, ignorando pedidos finalizados para otimizar performance
      </p>

      {/* Sync Statistics */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
        <div className="text-center">
          <h4 className="text-lg sm:text-xl font-semibold text-white" data-testid="total-leads">
            {syncStats?.totalLeads || 0}
          </h4>
          <p className="text-xs font-medium text-gray-400">Total de Pedidos</p>
        </div>
        <div className="text-center">
          <h4 className="text-lg sm:text-xl font-semibold text-blue-400" data-testid="active-leads">
            {syncStats?.activeLeads || 0}
          </h4>
          <p className="text-xs font-medium text-gray-400">Pedidos Ativos</p>
        </div>
        <div className="text-center">
          <h4 className="text-lg sm:text-xl font-semibold text-green-400" data-testid="finalized-leads">
            {syncStats?.finalizedLeads || 0}
          </h4>
          <p className="text-xs font-medium text-gray-400">Finalizados</p>
        </div>
      </div>

      {/* Separator */}
      <div className="h-px bg-gray-600 mb-4"></div>

      {/* Last Sync Info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-400">Última sincronização:</span>
        </div>
        <span className="text-sm text-white font-medium" data-testid="last-sync-time">
          {formatLastSync(syncStats?.lastSync)}
        </span>
      </div>

      {/* Manual Sync Controls */}
      <div className="space-y-3">
        <p className="text-sm text-gray-400">
          Sincronização inteligente automática a cada 5 minutos - adapta baseado no volume de atividade
        </p>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleManualSync("intelligent")}
            disabled={isManualSyncing || syncStats?.isRunning}
            className="glassmorphism-light text-gray-200 border-blue-600 hover:bg-blue-500/10 flex-1"
            data-testid="button-intelligent-sync"
          >
            {isManualSyncing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            Sync Inteligente
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleManualSync("incremental", 2)}
            disabled={isManualSyncing || syncStats?.isRunning}
            className="glassmorphism-light text-gray-200 border-gray-600 hover:bg-white/10 flex-1"
            data-testid="button-quick-sync"
          >
            {isManualSyncing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Sync Rápido
          </Button>
        </div>
      </div>
    </div>
  );
}