import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { authenticatedApiRequest } from "@/lib/auth";
import { useCurrentOperation, DSS_OPERATION_ID } from "@/hooks/use-current-operation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Filter, Search, ChevronLeft, ChevronRight, Eye, Edit, RefreshCw, Zap } from "lucide-react";
import { cn, formatCurrencyEUR } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Orders() {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize] = useState(15);
  const { selectedOperation, isDssOperation } = useCurrentOperation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      
      // Debug token
      const token = localStorage.getItem('auth_token');
      console.log("🔑 Using token:", token ? `${token.slice(0, 20)}...` : 'NO TOKEN');
      
      try {
        const response = await authenticatedApiRequest("GET", `/api/orders?${params}`, undefined, {
          headers: {
            'X-Operation-Id': operationToUse
          }
        });
        
        if (!response.ok) {
          console.error("❌ API response not ok:", response.status);
          return { data: [], total: 0, totalPages: 0, currentPage: 1 };
        }
        
        const data = await response.json();
        console.log("✅ Orders fetched successfully:", data.total || data.length || 'unknown count');
        return data;
      } catch (error) {
        console.error("❌ Orders fetch error:", error);
        // Return empty state instead of throwing to prevent unhandled rejection
        return { data: [], total: 0, totalPages: 0, currentPage: 1 };
      }
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

  // Mutation for combined Shopify + Carrier sync
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedApiRequest("POST", "/api/sync/shopify-carrier");
      return response.json();
    },
    onSuccess: (data) => {
      console.log("✅ Sincronização completa:", data);
      toast({
        title: "Sincronização Concluída",
        description: data.message || "Pedidos sincronizados com sucesso",
      });
      // Refresh orders list
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error: any) => {
      console.error("❌ Erro na sincronização:", error);
      toast({
        title: "Erro na Sincronização",
        description: error.message || "Falha ao sincronizar pedidos",
        variant: "destructive",
      });
    }
  });

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
        title="Pedidos" 
        subtitle="Visualize e gerencie todos os pedidos" 
      />

      {/* Filters */}
      <div className="glassmorphism rounded-xl p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:gap-3">
          {/* Search Bar - Full width on mobile */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <Input
              placeholder="Buscar por nome, telefone ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full h-9 glassmorphism-light border-gray-600 text-white placeholder:text-gray-400"
            />
          </div>
          
          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            {/* Status and Date filters */}
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40 h-9 glassmorphism-light border-gray-600 text-white text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="glassmorphism border-gray-600">
                  <SelectItem value="all">Status: Todos</SelectItem>
                  <SelectItem value="delivered">Entregues</SelectItem>
                  <SelectItem value="in transit">Em trânsito</SelectItem>
                  <SelectItem value="shipped">Enviados</SelectItem>
                  <SelectItem value="confirmed">Confirmados</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-36 h-9 glassmorphism-light border-gray-600 text-white text-sm">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent className="glassmorphism border-gray-600">
                  <SelectItem value="1">Hoje</SelectItem>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="90">3 meses</SelectItem>
                  <SelectItem value="365">1 ano</SelectItem>
                  <SelectItem value="all">Período: Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Sync button and count */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="bg-blue-900/30 border-blue-500/50 text-blue-300 hover:bg-blue-800/50 hover:text-blue-200 transition-colors disabled:opacity-50 whitespace-nowrap flex-1"
                data-testid="button-sync-complete"
              >
                {syncMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                <span className="hidden sm:inline">
                  {syncMutation.isPending ? "Sincronizando..." : "Sync Completo"}
                </span>
                <span className="sm:hidden">
                  {syncMutation.isPending ? "Sincronizando..." : "Sync Completo"}
                </span>
              </Button>
              <div className="text-xs text-gray-300 text-center sm:text-left whitespace-nowrap">
                {totalOrders} pedidos
              </div>
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
            {/* Mobile Card Layout */}
            <div className="block md:hidden space-y-4">
              {orders.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="space-y-4">
                    <p className="text-gray-400">Nenhum pedido encontrado nesta operação</p>
                    <div className="glassmorphism-light rounded-xl p-4 max-w-lg mx-auto">
                      <p className="text-gray-300 text-sm text-center">
                        Se você fez a integração da Shopify, faça a sincronia completa novamente caso não veja seus pedidos.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                orders.map((order: any) => (
                  <div key={order.id} className="glassmorphism-light rounded-xl p-4 space-y-3">
                    {/* Header with REF and Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-blue-500/20 rounded flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-400">📦</span>
                        </div>
                        <div className="font-mono text-blue-400">
                          {(() => {
                            if (order.shopifyOrderNumber) {
                              return order.shopifyOrderNumber;
                            }
                            if (order.id && order.id.startsWith('shopify_')) {
                              return `#${order.id.replace('shopify_', '')}`;
                            }
                            return order.refS || order.n_lead || order.id;
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium border-0",
                            getDeliveryStatusVariant(order.deliveryStatus || order.status)
                          )}
                        >
                          {order.deliveryStatus || order.status}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Customer Info */}
                    <div>
                      <div className="text-white font-medium">{order.customerName || order.name || '-'}</div>
                      <div className="text-gray-400 text-sm font-mono">{order.customerPhone || order.phone || '-'}</div>
                      <div className="text-gray-400 text-sm">{order.customerCity || order.city || '-'}</div>
                    </div>
                    
                    {/* Values */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400">Valor:</span>
                        <div className="text-white font-semibold">{formatAmount(order.total || order.amount || order.lead_value)}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">B2B:</span>
                        <div className="text-orange-400 font-semibold">€{parseFloat(order.productCost || '0').toFixed(2)}</div>
                      </div>
                    </div>
                    
                    {/* Tracking and Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-600/30">
                      <div className="text-sm">
                        <span className="text-gray-400">Tracking: </span>
                        <span className="text-blue-400 font-mono">{order.trackingNumber || '-'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
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
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-600/30">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Market</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">REF.S / REF</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Tracking Number</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Phone</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Lead Value</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Preço B2B</th>
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
                          <div className="glassmorphism-light rounded-xl p-4 max-w-lg mx-auto">
                            <p className="text-gray-300 text-sm text-center">
                              Se você fez a integração da Shopify, faça a sincronia completa novamente caso não veja seus pedidos.
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
                            <div className="text-blue-400">
                              {(() => {
                                // 1. Se tem shopify_order_number, exibe ele (#PDIT3732)
                                if (order.shopifyOrderNumber) {
                                  return order.shopifyOrderNumber;
                                }
                                
                                // 2. Se é pedida Shopify sem order_number, formata o ID
                                if (order.id && order.id.startsWith('shopify_')) {
                                  return `#${order.id.replace('shopify_', '')}`;
                                }
                                
                                // 3. Outros casos (NT-, refS, etc.)
                                return order.refS || order.n_lead || order.id;
                              })()}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {(() => {
                                // Extract SKU from Shopify products array
                                if (order.products && Array.isArray(order.products) && order.products.length > 0) {
                                  const sku = order.products[0]?.sku;
                                  return sku ? sku.toLowerCase() : 'No SKU';
                                }
                                return order.refNumber || 'No SKU';
                              })()}
                            </div>
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
