import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ChartsSection } from "@/components/dashboard/charts-section";
import { SyncStatus } from "@/components/dashboard/sync-status";

import { authenticatedApiRequest } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Filter } from "lucide-react";

export default function Dashboard() {
  const [dateFilter, setDateFilter] = useState("current_month");

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
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics", dateFilter, "v3"],
    queryFn: async () => {
      const period = dateFilter === '1' ? '1d' : dateFilter === '7' ? '7d' : dateFilter === '30' ? '30d' : dateFilter === '90' ? '90d' : dateFilter === 'current_month' ? 'current_month' : 'current_month';
      const response = await authenticatedApiRequest("GET", `/api/dashboard/metrics?period=${period}`);
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });

  // Fetch revenue chart data
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["/api/dashboard/revenue-chart", dateFilter],
    queryFn: async () => {
      const period = dateFilter === '1' ? '1d' : dateFilter === '7' ? '7d' : dateFilter === '30' ? '30d' : dateFilter === '90' ? '90d' : dateFilter === 'current_month' ? 'current_month' : 'current_month';
      const response = await authenticatedApiRequest("GET", `/api/dashboard/revenue-chart?period=${period}`);
      return response.json();
    },
  });

  // Calculate distribution data from real API metrics
  const getDistributionData = () => {
    if (!metrics) return [];
    
    const total = metrics.totalOrders || 1;
    
    // Calculate all status values
    const delivered = metrics.deliveredOrders || 0;
    const shipped = metrics.shippedOrders || 0; 
    const confirmed = metrics.confirmedOrders || 0;
    const pending = metrics.pendingOrders || 0;
    const cancelled = metrics.cancelledOrders || 0;
    const returned = metrics.returnedOrders || 0;
    
    return [
      {
        name: "Entregues",
        value: delivered,
        percentage: total > 0 ? ((delivered / total) * 100).toFixed(1) : "0",
        color: "#10B981", // Green
        description: "Pedidos entregues com sucesso"
      },
      {
        name: "Confirmados", 
        value: confirmed,
        percentage: total > 0 ? ((confirmed / total) * 100).toFixed(1) : "0",
        color: "#3B82F6", // Blue
        description: "Pedidos confirmados pelo cliente"
      },
      {
        name: "Enviados",
        value: shipped,
        percentage: total > 0 ? ((shipped / total) * 100).toFixed(1) : "0",
        color: "#8B5CF6", // Purple
        description: "Pedidos em trânsito"
      },
      {
        name: "Pendentes",
        value: pending,
        percentage: total > 0 ? ((pending / total) * 100).toFixed(1) : "0",
        color: "#F59E0B", // Amber
        description: "Aguardando processamento"
      },
      {
        name: "Devolvidos",
        value: returned,
        percentage: total > 0 ? ((returned / total) * 100).toFixed(1) : "0",
        color: "#EF4444", // Red
        description: "Pedidos devolvidos"
      },
      {
        name: "Cancelados",
        value: cancelled,
        percentage: total > 0 ? ((cancelled / total) * 100).toFixed(1) : "0",
        color: "#6B7280", // Gray
        description: "Pedidos cancelados"
      }
    ].filter(item => item.value > 0); // Filtra apenas status com pedidos
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
      {/* Header with Euro Rate and Date Filter */}
      <div className="flex justify-between items-center">
        {/* Euro Exchange Rate */}
        <div className="flex items-center space-x-2 bg-gray-900/30 border border-green-500/50 rounded-lg px-3 py-2">
          <span className="text-green-400 font-medium text-sm">
            € {metrics?.exchangeRates?.EUR ? (metrics.exchangeRates.EUR).toFixed(2).replace('.', ',') : '6,40'}
          </span>
          <span className="text-gray-400 text-xs">BRL</span>
        </div>

        {/* Date Filter */}
        <div className="flex items-center space-x-2 bg-gray-900/30 border border-gray-700/50 rounded-lg px-3 py-2">
          <Calendar className="text-gray-400" size={16} />
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-36 bg-transparent border-0 text-gray-300 text-sm h-auto p-0">
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
