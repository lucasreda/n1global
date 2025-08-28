import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ChartsSection } from "@/components/dashboard/charts-section";
import { SyncStatus } from "@/components/dashboard/sync-status";

import { authenticatedApiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Filter, RefreshCw, Download } from "lucide-react";

export default function Dashboard() {
  const [dateFilter, setDateFilter] = useState("30");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Sync mutation (same as orders page)
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedApiRequest("POST", "/api/sync/shopify-carrier");
      return response.json();
    },
    onSuccess: (data) => {
      console.log("✅ Sincronização completa:", data);
      toast({
        title: "Sincronização Concluída",
        description: data.message || "Dados sincronizados com sucesso",
      });
      // Refresh dashboard data without page reload
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/revenue-chart"] });
    },
    onError: (error: any) => {
      console.error("❌ Erro na sincronização:", error);
      toast({
        title: "Erro na Sincronização",
        description: error.message || "Falha ao sincronizar dados",
        variant: "destructive",
      });
    }
  });

  // Auto-sync on page load (similar to Facebook Ads)
  useEffect(() => {
    const performAutoSync = async () => {
      try {
        console.log('🔄 Verificando necessidade de auto-sync da transportadora...');
        const response = await authenticatedApiRequest("GET", "/api/sync/auto");
        const result = await response.json();
        
        if (result.executed) {
          console.log('✅ Auto-sync da transportadora executado:', result.reason);
          // Refresh data after auto-sync
          window.location.reload();
        } else {
          console.log('ℹ️ Auto-sync não necessário:', result.reason);
        }
      } catch (error) {
        console.error('❌ Erro no auto-sync da transportadora:', error);
      }
    };

    performAutoSync();
  }, []); // Run only on component mount

  // Fetch dashboard metrics with new API
  const operationId = localStorage.getItem("current_operation_id");
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics", dateFilter, operationId, "v3"],
    queryFn: async () => {
      const period = dateFilter === '1' ? '1d' : dateFilter === '7' ? '7d' : dateFilter === '30' ? '30d' : dateFilter === '90' ? '90d' : dateFilter === 'current_month' ? 'current_month' : '30d';
      const url = operationId 
        ? `/api/dashboard/metrics?period=${period}&operationId=${operationId}`
        : `/api/dashboard/metrics?period=${period}`;
      const response = await authenticatedApiRequest("GET", url);
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });

  // Fetch revenue chart data
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["/api/dashboard/revenue-chart", dateFilter, operationId],
    queryFn: async () => {
      const period = dateFilter === '1' ? '1d' : dateFilter === '7' ? '7d' : dateFilter === '30' ? '30d' : dateFilter === '90' ? '90d' : dateFilter === 'current_month' ? 'current_month' : '30d';
      const url = operationId 
        ? `/api/dashboard/revenue-chart?period=${period}&operationId=${operationId}`
        : `/api/dashboard/revenue-chart?period=${period}`;
      const response = await authenticatedApiRequest("GET", url);
      return response.json();
    },
  });

  // Calculate distribution data with 3 meaningful categories
  const getDistributionData = () => {
    if (!metrics) return [];
    
    const total = metrics.totalOrders || 1;
    
    // Use the actual data available: Delivered, Pending, Others
    const delivered = metrics.deliveredOrders || 0;
    const pending = metrics.pendingOrders || 0;
    const shipped = metrics.shippedOrders || 0;
    const cancelled = metrics.cancelledOrders || 0;
    const returned = metrics.returnedOrders || 0;
    
    // Others = shipped + cancelled + returned
    const others = shipped + cancelled + returned;
    
    const data = [];
    
    // Always show delivered if exists
    if (delivered > 0) {
      data.push({
        name: "Entregues",
        value: delivered,
        percentage: ((delivered / total) * 100).toFixed(1),
        color: "#10B981", // Green
        description: "Pedidos entregues com sucesso"
      });
    }
    
    // Always show pending if exists
    if (pending > 0) {
      data.push({
        name: "Pendentes",
        value: pending,
        percentage: ((pending / total) * 100).toFixed(1),
        color: "#F59E0B", // Amber
        description: "Aguardando processamento"
      });
    }
    
    // Show others if exists
    if (others > 0) {
      data.push({
        name: "Outros",
        value: others,
        percentage: ((others / total) * 100).toFixed(1),
        color: "#8B5CF6", // Purple
        description: "Enviados, cancelados e retornados"
      });
    }
    
    // If we still have no meaningful data, create a basic split
    if (data.length <= 1 && total > 0) {
      const remaining = Math.max(0, total - delivered);
      
      if (delivered > 0) {
        data.push({
          name: "Não Entregues",
          value: remaining,
          percentage: ((remaining / total) * 100).toFixed(1),
          color: "#EF4444", // Red
          description: "Pedidos ainda não entregues"
        });
      } else {
        // Complete fallback
        data.push({
          name: "Total",
          value: total,
          percentage: "100.0",
          color: "#6B7280", // Gray
          description: "Todos os pedidos do período"
        });
      }
    }
    
    return data;
  };



  if (metricsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 glassmorphism" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 glassmorphism" />
          <Skeleton className="h-80 glassmorphism" />
        </div>
        <Skeleton className="h-96 glassmorphism" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Euro Rate, Complete Sync Button, and Date Filter */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        {/* Euro Exchange Rate */}
        <div className="flex items-center space-x-2 bg-gray-900/30 border border-green-500/50 rounded-lg px-3 py-2 w-fit">
          <span className="text-green-400 font-medium text-sm">
            € {metrics?.exchangeRates?.EUR ? (metrics.exchangeRates.EUR).toFixed(2).replace('.', ',') : '6,40'}
          </span>
          <span className="text-gray-400 text-xs">BRL</span>
        </div>

        {/* Action buttons and Date Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Complete Sync Button */}
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            variant="outline"
            size="sm"
            className="bg-blue-900/30 border-blue-500/50 text-blue-300 hover:bg-blue-800/50 hover:text-blue-200 transition-colors disabled:opacity-50 w-full sm:w-auto"
            data-testid="button-complete-sync"
          >
            <Download className="w-4 h-4 mr-2" />
            {syncMutation.isPending ? 'Sincronizando...' : 'Sync Completo'}
          </Button>

          {/* Date Filter */}
          <div className="flex items-center space-x-2 bg-gray-900/30 border border-gray-700/50 rounded-lg px-3 py-2">
            <Calendar className="text-gray-400" size={16} />
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-36 bg-transparent border-0 text-gray-300 text-sm h-auto p-0">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent className="glassmorphism border-gray-600">
                <SelectItem value="current_month">Este Mês</SelectItem>
                <SelectItem value="1">Hoje</SelectItem>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="90">3 meses</SelectItem>
                <SelectItem value="365">1 ano</SelectItem>
                <SelectItem value="all">Tudo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <StatsCards metrics={metrics} isLoading={metricsLoading} />
      
      <ChartsSection 
        revenueData={revenueData || []}
        distributionData={getDistributionData()}
        isLoading={revenueLoading}
      />
      
      <SyncStatus />
      
    </div>
  );
}
