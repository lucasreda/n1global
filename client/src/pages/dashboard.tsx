import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ChartsSection } from "@/components/dashboard/charts-section";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { authenticatedApiRequest } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Filter } from "lucide-react";

export default function Dashboard() {
  const [dateFilter, setDateFilter] = useState("7");

  // Fetch dashboard metrics with date filter
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics", dateFilter],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", `/api/dashboard/metrics?days=${dateFilter}`);
      return response.json();
    },
  });

  // Fetch recent orders with date filter
  const { data: ordersResponse, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders", dateFilter],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", `/api/orders?limit=10&days=${dateFilter}`);
      return response.json();
    },
  });

  // Extract orders from response
  const orders = Array.isArray(ordersResponse) ? ordersResponse : ordersResponse?.data || [];

  // Generate mock revenue data for charts
  const revenueData = [
    { name: "Jan", value: 4000 },
    { name: "Fev", value: 3000 },
    { name: "Mar", value: 5000 },
    { name: "Abr", value: 4500 },
    { name: "Mai", value: 6000 },
    { name: "Jun", value: 5500 },
  ];

  // Calculate distribution data from real API metrics
  const getDistributionData = () => {
    if (!metrics) return [];
    
    const total = metrics.totalOrders || 1;
    return [
      {
        name: "Entregues",
        value: metrics.successfulOrders || 0,
        percentage: total > 0 ? ((metrics.successfulOrders || 0) / total * 100).toFixed(1) : "0",
        color: "#10B981"
      },
      {
        name: "Enviados",
        value: metrics.shippedOrders || 0,
        percentage: total > 0 ? ((metrics.shippedOrders || 0) / total * 100).toFixed(1) : "0",
        color: "#3B82F6"
      },
      {
        name: "Confirmados",
        value: metrics.confirmedOrders || 0,
        percentage: total > 0 ? ((metrics.confirmedOrders || 0) / total * 100).toFixed(1) : "0",
        color: "#F59E0B"
      },
      {
        name: "Cancelados",
        value: metrics.cancelledOrders || 0,
        percentage: total > 0 ? ((metrics.cancelledOrders || 0) / total * 100).toFixed(1) : "0",
        color: "#EF4444"
      },
      {
        name: "Pendentes",
        value: metrics.pendingOrders || 0,
        percentage: total > 0 ? ((metrics.pendingOrders || 0) / total * 100).toFixed(1) : "0",
        color: "#6B7280"
      }
    ];
  };

  const handleViewOrder = (orderId: string) => {
    console.log("View order:", orderId);
    // TODO: Implement order view modal or navigation
  };

  const handleEditOrder = (orderId: string) => {
    console.log("Edit order:", orderId);
    // TODO: Implement order edit modal or navigation
  };

  if (metricsLoading) {
    return (
      <div className="space-y-6">
        <DashboardHeader 
          title="Dashboard COD - Itália" 
          subtitle="Carregando dados da European Fulfillment Center..." 
        />
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
      <DashboardHeader 
        title="Dashboard COD - Itália" 
        subtitle={
          <div className="flex items-center space-x-2">
            <span>Dados reais da European Fulfillment Center</span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-400/20 text-green-400 border border-green-400/30">
              API REAL
            </span>
          </div>
        } 
      />

      {/* Date Filter */}
      <div className="glassmorphism rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="text-blue-400" size={20} />
            <span className="text-white font-medium">Período:</span>
          </div>
          <div className="flex items-center space-x-3">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-48 glassmorphism-light border-gray-600 text-white">
                <SelectValue placeholder="Selecionar período" />
              </SelectTrigger>
              <SelectContent className="glassmorphism border-gray-600">
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 3 meses</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
                <SelectItem value="all">Todos os períodos</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="glassmorphism-light text-gray-300 hover:bg-white/20"
              data-testid="button-refresh-data"
            >
              <Filter size={16} className="mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
      </div>
      
      <StatsCards metrics={metrics} isLoading={metricsLoading} />
      
      <ChartsSection 
        revenueData={revenueData}
        distributionData={getDistributionData()}
      />
      
      <RecentOrders 
        orders={orders || []}
        onViewOrder={handleViewOrder}
        onEditOrder={handleEditOrder}
      />
    </div>
  );
}
