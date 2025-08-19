import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ChartsSection } from "@/components/dashboard/charts-section";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { authenticatedApiRequest } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  // Fetch dashboard metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/dashboard/metrics");
      return response.json();
    },
  });

  // Fetch recent orders
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/orders?limit=10");
      return response.json();
    },
  });

  // Generate mock revenue data for charts
  const revenueData = [
    { name: "Jan", value: 4000 },
    { name: "Fev", value: 3000 },
    { name: "Mar", value: 5000 },
    { name: "Abr", value: 4500 },
    { name: "Mai", value: 6000 },
    { name: "Jun", value: 5500 },
  ];

  // Calculate distribution data from metrics
  const getDistributionData = () => {
    if (!metrics) return [];
    
    const total = metrics.totalOrders || 1;
    return [
      {
        name: "Pagos",
        value: metrics.paidOrders || 0,
        percentage: total > 0 ? ((metrics.paidOrders || 0) / total * 100).toFixed(1) : "0",
        color: "#10B981"
      },
      {
        name: "Processando",
        value: metrics.processingOrders || 0,
        percentage: total > 0 ? ((metrics.processingOrders || 0) / total * 100).toFixed(1) : "0",
        color: "#F59E0B"
      },
      {
        name: "Recusados",
        value: metrics.refusedOrders || 0,
        percentage: total > 0 ? ((metrics.refusedOrders || 0) / total * 100).toFixed(1) : "0",
        color: "#EF4444"
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
          title="Dashboard COD" 
          subtitle="Controle financeiro completo dos seus pedidos" 
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
        title="Dashboard COD" 
        subtitle="Controle financeiro completo dos seus pedidos" 
      />
      
      <StatsCards
        totalOrders={metrics?.totalOrders || 0}
        paidOrders={metrics?.paidOrders || 0}
        refusedOrders={metrics?.refusedOrders || 0}
        successRate={metrics?.successRate || "0"}
      />
      
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
