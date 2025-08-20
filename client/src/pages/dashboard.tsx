import { useState } from "react";
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
  const [dateFilter, setDateFilter] = useState("7");

  // Fetch dashboard metrics with new API
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics", dateFilter],
    queryFn: async () => {
      const period = dateFilter === '1' ? '1d' : dateFilter === '7' ? '7d' : dateFilter === '30' ? '30d' : dateFilter === '90' ? '90d' : '30d';
      const response = await authenticatedApiRequest("GET", `/api/dashboard/metrics?period=${period}`);
      return response.json();
    },
  });

  // Fetch revenue chart data
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["/api/dashboard/revenue-chart", dateFilter],
    queryFn: async () => {
      const period = dateFilter === '1' ? '1d' : dateFilter === '7' ? '7d' : dateFilter === '30' ? '30d' : dateFilter === '90' ? '90d' : '30d';
      const response = await authenticatedApiRequest("GET", `/api/dashboard/revenue-chart?period=${period}`);
      return response.json();
    },
  });

  // Calculate distribution data from real API metrics
  const getDistributionData = () => {
    if (!metrics) return [];
    
    const total = metrics.totalOrders || 1;
    return [
      {
        name: "Entregues",
        value: metrics.deliveredOrders || 0,
        percentage: total > 0 ? ((metrics.deliveredOrders || 0) / total * 100).toFixed(1) : "0",
        color: "#10B981"
      },
      {
        name: "Enviados",
        value: metrics.shippedOrders || 0,
        percentage: total > 0 ? ((metrics.shippedOrders || 0) / total * 100).toFixed(1) : "0",
        color: "#3B82F6"
      },
      {
        name: "Pendentes",
        value: metrics.pendingOrders || 0,
        percentage: total > 0 ? ((metrics.pendingOrders || 0) / total * 100).toFixed(1) : "0",
        color: "#F59E0B"
      },
      {
        name: "Cancelados",
        value: metrics.cancelledOrders || 0,
        percentage: total > 0 ? ((metrics.cancelledOrders || 0) / total * 100).toFixed(1) : "0",
        color: "#EF4444"
      }
    ];
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
      {/* Compact Date Filter */}
      <div className="flex justify-end">
        <div className="flex items-center space-x-2 bg-gray-900/30 border border-gray-700/50 rounded-lg px-3 py-2">
          <Calendar className="text-gray-400" size={16} />
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-36 bg-transparent border-0 text-gray-300 text-sm h-auto p-0">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="glassmorphism border-gray-600">
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
