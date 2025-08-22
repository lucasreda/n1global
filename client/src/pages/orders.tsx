import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { authenticatedApiRequest } from "@/lib/auth";
import { useCurrentOperation, DSS_OPERATION_ID } from "@/hooks/use-current-operation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Filter, Search, ChevronLeft, ChevronRight, Eye, Edit } from "lucide-react";
import { cn, formatCurrencyEUR } from "@/lib/utils";

export default function Orders() {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("7");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize] = useState(15);
  const { selectedOperation, isDssOperation } = useCurrentOperation();

  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ["/api/orders", currentPage, statusFilter, searchTerm, dateFilter, selectedOperation],
    queryFn: async () => {
      console.log(`🔍 Fetching orders with operation: ${selectedOperation}`);
      
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((currentPage - 1) * pageSize).toString(),
      });
      
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchTerm) params.append("search", searchTerm);
      if (dateFilter !== "all") params.append("days", dateFilter);
      
      // Force Dss operation if available
      const operationToUse = selectedOperation || DSS_OPERATION_ID;
      console.log(`💾 Using operation ID: ${operationToUse}`);
      
      const response = await authenticatedApiRequest("GET", `/api/orders?${params}`, {
        headers: {
          'X-Operation-Id': operationToUse
        }
      });
      return response.json();
    },
    enabled: !!selectedOperation, // Only run when we have an operation selected
  });

  const orders = Array.isArray(ordersResponse) ? ordersResponse : ordersResponse?.data || [];
  const totalOrders = ordersResponse?.total || orders.length;
  const totalPages = ordersResponse?.totalPages || Math.ceil(totalOrders / pageSize);
  const hasNext = ordersResponse?.hasNext || false;
  const hasPrev = ordersResponse?.hasPrev || false;

  // Remove the query for operations with orders since we'll show a simple message

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

  const getDeliveryStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-green-500/20 text-green-400 hover:bg-green-500/30";
      case "in transit":
        return "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30";
      case "shipped":
        return "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30";
      case "preparing":
        return "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30";
      case "cancelled":
        return "bg-red-500/20 text-red-400 hover:bg-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30";
    }
  };

  const getPaymentStatusVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500/20 text-green-400 hover:bg-green-500/30";
      case "no paid":
        return "bg-red-500/20 text-red-400 hover:bg-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30";
    }
  };

  const formatAmount = (amount: any) => {
    if (!amount) return formatCurrencyEUR(0);
    
    // Convert string to number if needed
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) return formatCurrencyEUR(0);
    return formatCurrencyEUR(numAmount);
  };

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title="Gerenciar Pedidos - Itália" 
        subtitle={
          <div className="flex items-center space-x-2">
            <span>Todos os pedidos da European Fulfillment Center</span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-400/20 text-green-400 border border-green-400/30">
              API REAL
            </span>
          </div>
        }
      />

      {/* Filters */}
      <div className="glassmorphism rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                placeholder="Buscar por nome, telefone ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80 glassmorphism-light border-gray-600 text-white placeholder:text-gray-400"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 glassmorphism-light border-gray-600 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="glassmorphism border-gray-600">
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="delivered">Entregues</SelectItem>
                <SelectItem value="in transit">Em trânsito</SelectItem>
                <SelectItem value="shipped">Enviados</SelectItem>
                <SelectItem value="confirmed">Confirmados</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-48 glassmorphism-light border-gray-600 text-white">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent className="glassmorphism border-gray-600">
                <SelectItem value="1">Hoje</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 3 meses</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
                <SelectItem value="all">Todos os períodos</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-gray-300">
              {totalOrders} pedidos encontrados
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="glassmorphism rounded-2xl p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex space-x-4 p-4">
                <div className="w-16 h-4 bg-gray-600/50 rounded"></div>
                <div className="w-32 h-4 bg-gray-600/50 rounded"></div>
                <div className="w-24 h-4 bg-gray-600/50 rounded"></div>
                <div className="w-20 h-4 bg-gray-600/50 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-600/30">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Market</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">REF.S / REF</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Tracking Number</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Phone</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Lead Value</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Custo Produto</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Custo Envio</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">City</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Delivery</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Payment</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-300">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-600/30">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-8 text-center">
                        <div className="space-y-4">
                          <p className="text-gray-400">Nenhum pedido encontrado nesta operação</p>
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 max-w-md mx-auto">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                              <span className="text-blue-400 font-medium text-sm">💡 Dica</span>
                            </div>
                            <p className="text-blue-300 text-xs">
                              Se você fez a sincronização do Shopify, verifique se está na operação correta. 
                              Use o seletor de "Operação" no canto superior esquerdo da barra lateral para trocar para a operação "Dss" onde estão os pedidos importados.
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    orders.map((order: any) => (
                      <tr 
                        key={order.id} 
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="py-4 px-4 text-sm text-white">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-blue-500/20 rounded flex items-center justify-center">
                              <span className="text-xs font-bold text-blue-400">📦</span>
                            </div>
                            <span className="text-gray-300">{order.market || 'E-commerce'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-white font-mono">
                          <div className="space-y-1">
                            <div className="text-blue-400">{order.refS || order.n_lead || order.id}</div>
                            <div className="text-gray-400 text-xs">{order.refNumber || order.n_lead || order.id}</div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-blue-400 font-mono">
                          {order.trackingNumber || '-'}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-200">
                          {order.customerName || order.name || '-'}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-300 font-mono">
                          {order.customerPhone || order.phone || '-'}
                        </td>
                        <td className="py-4 px-4 text-sm text-white font-semibold">
                          {formatAmount(order.total || order.amount || order.lead_value)}
                        </td>
                        <td className="py-4 px-4 text-sm text-orange-400 font-semibold">
                          €{parseFloat(order.productCost || '0').toFixed(2)}
                        </td>
                        <td className="py-4 px-4 text-sm text-cyan-400 font-semibold">
                          €{parseFloat(order.shippingCost || '0').toFixed(2)}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-200">
                          {order.customerCity || order.city || '-'}
                        </td>
                        <td className="py-4 px-4">
                          <Badge 
                            className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium border-0",
                              getDeliveryStatusVariant(order.deliveryStatus || order.status)
                            )}
                          >
                            {order.deliveryStatus || order.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <Badge 
                            className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium border-0",
                              getPaymentStatusVariant(order.paymentStatus)
                            )}
                          >
                            {order.paymentStatus || order.method_payment || 'COD'}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewOrder(order.id)}
                              className="text-blue-400 hover:text-blue-300 transition-colors p-2 h-auto"
                            >
                              <Eye size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditOrder(order.id)}
                              className="text-gray-400 hover:text-gray-300 transition-colors p-2 h-auto"
                            >
                              <Edit size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-600/30">
                <p className="text-sm text-gray-300">
                  Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, totalOrders)} de {totalOrders} pedidos
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="glassmorphism-light text-gray-300 hover:bg-white/20"
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={cn(
                            "w-8 h-8 p-0 text-sm",
                            currentPage === pageNum
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              : "glassmorphism-light text-gray-300 hover:bg-white/20"
                          )}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="glassmorphism-light text-gray-300 hover:bg-white/20"
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
