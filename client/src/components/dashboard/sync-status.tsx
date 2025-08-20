import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Play, Clock, Database, Activity, CheckCircle2 } from "lucide-react";
import { authenticatedApiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function SyncStatus() {
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch sync stats
  const { data: syncStats, isLoading } = useQuery({
    queryKey: ["/api/sync/stats"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/sync/stats");
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
      <Card className="glassmorphism">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-400" />
            <CardTitle className="text-white">Carregando status...</CardTitle>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="glassmorphism" data-testid="sync-status-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-white">Sincronização Inteligente</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {syncStats?.isRunning && (
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                <Activity className="h-3 w-3 mr-1 animate-pulse" />
                Executando
              </Badge>
            )}
            <Badge variant="outline" className="text-green-400 border-green-400/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Automática
            </Badge>
          </div>
        </div>
        <CardDescription className="text-gray-300">
          Monitora apenas pedidos ativos, ignorando pedidos finalizados para otimizar performance
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Sync Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center space-y-2">
            <div className="text-2xl font-bold text-white" data-testid="total-leads">
              {syncStats?.totalLeads || 0}
            </div>
            <div className="text-sm text-gray-400">Total de Pedidos</div>
          </div>
          <div className="text-center space-y-2">
            <div className="text-2xl font-bold text-blue-400" data-testid="active-leads">
              {syncStats?.activeLeads || 0}
            </div>
            <div className="text-sm text-gray-400">Pedidos Ativos</div>
          </div>
          <div className="text-center space-y-2">
            <div className="text-2xl font-bold text-green-400" data-testid="finalized-leads">
              {syncStats?.finalizedLeads || 0}
            </div>
            <div className="text-sm text-gray-400">Finalizados</div>
          </div>
        </div>

        <Separator className="bg-gray-600" />

        {/* Last Sync Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-300">Última sincronização:</span>
          </div>
          <span className="text-sm text-white font-medium" data-testid="last-sync-time">
            {formatLastSync(syncStats?.lastSync)}
          </span>
        </div>

        {/* Manual Sync Controls */}
        <div className="space-y-3 pt-2">
          <div className="text-sm text-gray-400">
            Sincronização inteligente automática a cada 5 minutos - adapta baseado no volume de atividade
          </div>
          
          <div className="flex space-x-2">
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
      </CardContent>
    </Card>
  );
}