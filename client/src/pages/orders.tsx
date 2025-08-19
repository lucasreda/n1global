import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { authenticatedApiRequest } from "@/lib/auth";

export default function Orders() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/orders");
      return response.json();
    },
  });

  const handleViewOrder = (orderId: string) => {
    console.log("View order:", orderId);
    // TODO: Implement order view functionality
  };

  const handleEditOrder = (orderId: string) => {
    console.log("Edit order:", orderId);
    // TODO: Implement order edit functionality
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <DashboardHeader 
          title="Gerenciar Pedidos" 
          subtitle="Visualize e gerencie todos os pedidos COD" 
        />
        <div className="glassmorphism rounded-2xl p-6">
          <p className="text-gray-300">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title="Gerenciar Pedidos" 
        subtitle="Visualize e gerencie todos os pedidos COD" 
      />
      
      <RecentOrders 
        orders={orders || []}
        onViewOrder={handleViewOrder}
        onEditOrder={handleEditOrder}
      />
    </div>
  );
}
