import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { authenticatedApiRequest } from "@/lib/auth";
import { useCurrentOperation, DSS_OPERATION_ID } from "@/hooks/use-current-operation";
import { useOperationPermissions } from "@/hooks/use-operation-permissions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Filter, Search, ChevronLeft, ChevronRight, Eye, Edit, Send, Loader2 } from "lucide-react";
import { cn, formatOperationCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { OrderDetailsDialog } from "@/components/orders/OrderDetailsDialog";
import shopifyIcon from "@assets/shopify_1756413996883.webp";
import cartpandaIcon from "@assets/carticon_1758210690464.avif";
import digistoreIcon from "@assets/digistore-logo_1757013744090.png";
import { CompleteSyncDialog } from "@/components/sync/CompleteSyncDialog";
import { useTranslation } from "@/hooks/use-translation";

// Helper para retornar ícone da plataforma baseado no dataSource ou ID do pedido
const getPlatformIcon = (order: any) => {
  // Verificar dataSource primeiro
  if (order.dataSource === 'shopify' || order.shopifyOrderId) {
    return (
      <img 
        src={shopifyIcon}
        alt="Shopify"
        className="w-3 h-3 inline-block mr-1.5 rounded-sm flex-shrink-0 object-contain"
        loading="lazy"
        decoding="async"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }
  
  if (order.dataSource === 'cartpanda' || order.cartpandaOrderId) {
    return (
      <img 
        src={cartpandaIcon}
        alt="CartPanda"
        className="w-3 h-3 inline-block mr-1.5 rounded-sm flex-shrink-0 object-contain"
        loading="lazy"
        decoding="async"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }
  
  if (order.dataSource === 'digistore24' || order.digistoreOrderId || order.id?.startsWith('DS-')) {
    return (
      <img
        src={digistoreIcon}
        alt="Digistore24"
        className="w-3 h-3 inline-block mr-1.5 rounded flex-shrink-0 object-contain"
        loading="lazy"
        decoding="async"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }
  
  // Default: sem ícone para pedidos de fulfillment providers
  return null;
};

export default function Orders() {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize] = useState(15);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<any | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [sendingTrackingOrderId, setSendingTrackingOrderId] = useState<string | null>(null);
  const { canEdit: canEditOrders, canDelete: canDeleteOrders, canCreate: canCreateOrders } = useOperationPermissions();
  const handleSendDigistoreTracking = async (order: any) => {
    if (!order?.id) return;
    const operationToUse = selectedOperation || DSS_OPERATION_ID;

    if (!operationToUse) {
      toast({
        title: t('orders.operationNotSelected'),
        description: t('orders.selectOperationBeforeTracking'),
        variant: "destructive",
      });
      return;
    }

    try {
      setSendingTrackingOrderId(order.id);
      const response = await authenticatedApiRequest(
        "POST",
        `/api/integrations/digistore/test-tracking?operationId=${operationToUse}`,
        { orderId: order.id }
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody?.error || t('orders.failedToSendTracking'));
      }

      const data = await response.json();
      toast({
        title: t('orders.trackingSent'),
        description: t('orders.trackingSentDescription', { trackingNumber: data.trackingNumber }),
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    } catch (error: any) {
      toast({
        title: t('orders.errorSendingTracking'),
        description: error?.message || t('orders.couldNotSendTracking'),
        variant: "destructive",
      });
    } finally {
      setSendingTrackingOrderId(null);
    }
  };
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

  // Fetch integrations status to check if platform and warehouse are connected
  const { data: integrationsStatus } = useQuery({
    queryKey: ['/api/onboarding/integrations-status', selectedOperation],
    queryFn: async () => {
      const url = selectedOperation 
        ? `/api/onboarding/integrations-status?operationId=${selectedOperation}`
        : '/api/onboarding/integrations-status';
      const response = await authenticatedApiRequest('GET', url);
      return response.json();
    },
    enabled: !!selectedOperation,
  });


  // Fetch operation details to get currency
  const { data: operationsList } = useQuery({
    queryKey: ['/api/operations'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/operations');
      return response.json();
    },
  });

  // Find the selected operation from the list to get its currency
  const operationDetails = operationsList?.find((op: any) => op.id === selectedOperation) || null;

  // Remove the query for operations with orders since we'll show a simple message

  const handleViewOrder = (orderId: string) => {
    console.log("View order:", orderId);
    console.log("Orders array:", orders);
    const order = orders.find((o: any) => o.id === orderId);
    console.log("Found order:", order);
    if (order) {
      console.log("Setting order for details and opening dialog");
      setSelectedOrderForDetails(order);
      setIsDetailsDialogOpen(true);
    } else {
      console.log("Order not found in array!");
    }
  };

  const handleEditOrder = (orderId: string) => {
    console.log("Edit order:", orderId);
    // TODO: Implement order edit functionality
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <DashboardHeader 
          title={t('orders.manageOrders')} 
          subtitle={t('orders.manageOrdersSubtitle')} 
        />
        <div className="glassmorphism rounded-2xl p-6">
          <p className="text-gray-300">{t('orders.loadingOrders')}</p>
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

  const operationCurrency = operationDetails?.currency || 'EUR';
  
  // Debug log para verificar moeda
  if (operationDetails && selectedOperation) {
    console.log('💰 [ORDERS] Moeda da operação:', {
      operationId: selectedOperation,
      operationName: operationDetails.name,
      currency: operationDetails.currency,
      usingCurrency: operationCurrency
    });
  }

  const formatAmount = (amount: any) => {
    if (!amount) return formatOperationCurrency(0, operationCurrency);
    
    // Convert string to number if needed
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) return formatOperationCurrency(0, operationCurrency);
    return formatOperationCurrency(numAmount, operationCurrency);
  };

  const formatCost = (cost: any) => {
    if (!cost) return formatOperationCurrency(0, operationCurrency);
    
    // Convert string to number if needed
    const numCost = typeof cost === 'string' ? parseFloat(cost) : cost;
    
    if (isNaN(numCost)) return formatOperationCurrency(0, operationCurrency);
    return formatOperationCurrency(numCost, operationCurrency);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-white" style={{ fontSize: '22px' }}>{t('orders.title')}</h1>
        <p className="text-gray-400">{t('orders.subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="glassmorphism rounded-xl p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:gap-3">
          {/* Search Bar - Full width on mobile */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <Input
              placeholder={t('orders.searchPlaceholder')}
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
                  <SelectValue placeholder={t('orders.status')} />
                </SelectTrigger>
                <SelectContent className="glassmorphism border-gray-600">
                  <SelectItem value="all">{t('orders.statusAll')}</SelectItem>
                  <SelectItem value="delivered">{t('orders.delivered')}</SelectItem>
                  <SelectItem value="in transit">{t('orders.inTransit')}</SelectItem>
                  <SelectItem value="shipped">{t('orders.shipped')}</SelectItem>
                  <SelectItem value="confirmed">{t('orders.confirmed')}</SelectItem>
                  <SelectItem value="cancelled">{t('orders.cancelled')}</SelectItem>
                  <SelectItem value="pending">{t('orders.pending')}</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-36 h-9 glassmorphism-light border-gray-600 text-white text-sm">
                  <SelectValue placeholder={t('orders.period')} />
                </SelectTrigger>
                <SelectContent className="glassmorphism border-gray-600">
                  <SelectItem value="1">{t('orders.today')}</SelectItem>
                  <SelectItem value="7">{t('orders.days7')}</SelectItem>
                  <SelectItem value="30">{t('orders.days30')}</SelectItem>
                  <SelectItem value="90">{t('orders.months3')}</SelectItem>
                  <SelectItem value="365">{t('orders.year1')}</SelectItem>
                  <SelectItem value="all">{t('orders.periodAll')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Order count */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex-1">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSyncDialogOpen(true)}
                        disabled={!integrationsStatus?.hasPlatform}
                        className={`bg-blue-900/30 border-blue-500/50 text-blue-300 hover:bg-blue-800/50 hover:text-blue-200 transition-colors disabled:opacity-50 whitespace-nowrap w-full ${
                          isSyncingInBackground ? 'animate-pulse ring-2 ring-blue-500/50' : ''
                        }`}
                        data-testid="button-sync-complete"
                      >
                        {isSyncingInBackground ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4 mr-2" />
                        )}
                        <span className="hidden sm:inline">
                          {isSyncingInBackground ? t('orders.syncing') : t('orders.syncComplete')}
                        </span>
                        <span className="sm:hidden">
                          {isSyncingInBackground ? t('orders.syncing') : t('orders.syncComplete')}
                        </span>
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!integrationsStatus?.hasPlatform && (
                    <TooltipContent className="max-w-xs">
                      <p>{t('orders.needPlatformForSync')}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <div className="text-xs text-gray-300 text-center sm:text-left whitespace-nowrap">
                {totalOrders} {t('orders.orders')}
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
                    <p className="text-gray-400">{t('orders.noOrdersFound')}</p>
                    <div className="glassmorphism-light rounded-xl p-4 max-w-lg mx-auto">
                      <p className="text-gray-300 text-sm text-center">
                        {t('orders.syncAgainIfNoOrders')}
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
                        <div className="font-mono text-blue-400 flex items-center">
                          {getPlatformIcon(order)}
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
                        <span className="text-gray-400">{t('orders.value')}:</span>
                        <div className="text-white font-semibold">{formatAmount(order.total || order.amount || order.lead_value)}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">{t('orders.b2b')}:</span>
                        <div className="text-orange-400 font-semibold">{formatCost(order.productCost)}</div>
                      </div>
                    </div>
                    
                    {/* Tracking and Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-600/30">
                      <div className="text-sm">
                        <span className="text-gray-400">{t('orders.tracking')}: </span>
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
                        {order.dataSource === 'digistore24' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSendDigistoreTracking(order)}
                                className="text-yellow-400 hover:text-yellow-300 transition-colors p-2 h-auto"
                                disabled={sendingTrackingOrderId === order.id}
                              >
                                {sendingTrackingOrderId === order.id ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <Send size={16} />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <span>{t('orders.sendTestTracking')}</span>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {canEditOrders('orders') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditOrder(order.id)}
                            className="text-gray-400 hover:text-gray-300 transition-colors p-2 h-auto"
                            title="Editar pedido"
                          >
                            <Edit size={16} />
                          </Button>
                        )}
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
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">{t('orders.ref')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">{t('orders.trackingNumber')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">{t('orders.name')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">{t('orders.phone')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">{t('orders.leadValue')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">{t('orders.b2bPrice')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">{t('orders.shippingCost')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">{t('orders.city')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">{t('orders.delivery')}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">{t('orders.payment')}</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-300">{t('orders.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-600/30">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center">
                        <div className="space-y-4">
                          <p className="text-gray-400">{t('orders.noOrdersFound')}</p>
                          <div className="glassmorphism-light rounded-xl p-4 max-w-lg mx-auto">
                            <p className="text-gray-300 text-sm text-center">
                              {t('orders.syncAgainIfNoOrders')}
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
                        <td className="py-4 px-4 text-sm text-white font-mono">
                          <div className="space-y-1">
                            <div className="text-blue-400 flex items-center">
                              {getPlatformIcon(order)}
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
                                // Extract SKUs from products array (pode ter múltiplos SKUs concatenados)
                                if (order.products && Array.isArray(order.products) && order.products.length > 0) {
                                  const allSkus: string[] = [];
                                  
                                  // Extrair todos os SKUs de todos os produtos
                                  for (const product of order.products) {
                                    if (product?.sku) {
                                      // Dividir SKU concatenado por "+" se houver
                                      const skus = product.sku.split('+').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
                                      allSkus.push(...skus);
                                    }
                                  }
                                  
                                  if (allSkus.length > 0) {
                                    // Se houver múltiplos SKUs, mostrar separados por vírgula
                                    return allSkus.map(sku => sku.toLowerCase()).join(', ');
                                  }
                                  return t('orders.noSku');
                                }
                                return order.refNumber || t('orders.noSku');
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
                          {formatCost(order.productCost)}
                        </td>
                        <td className="py-4 px-4 text-sm text-cyan-400 font-semibold">
                          {formatCost(order.shippingCost)}
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
                            {order.dataSource === 'digistore24' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSendDigistoreTracking(order)}
                                    className="text-yellow-400 hover:text-yellow-300 transition-colors p-2 h-auto"
                                    disabled={sendingTrackingOrderId === order.id}
                                  >
                                    {sendingTrackingOrderId === order.id ? (
                                      <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                      <Send size={16} />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <span>{t('orders.sendTestTracking')}</span>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {canEditOrders('orders') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditOrder(order.id)}
                                className="text-gray-400 hover:text-gray-300 transition-colors p-2 h-auto"
                                title="Editar pedido"
                              >
                                <Edit size={16} />
                              </Button>
                            )}
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
              <div className="mt-6 pt-4 border-t border-gray-600/30">
                {/* Desktop Layout */}
                <div className="hidden md:flex items-center justify-between">
                  <p className="text-sm text-gray-300">
                    {t('orders.showingOrders', { 
                      start: ((currentPage - 1) * pageSize) + 1, 
                      end: Math.min(currentPage * pageSize, totalOrders), 
                      total: totalOrders 
                    })}
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

                {/* Mobile Layout */}
                <div className="md:hidden space-y-3">
                  <div className="flex items-center justify-between w-full">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="glassmorphism-light text-gray-300 hover:bg-white/20"
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    
                    <div className="flex items-center space-x-1 flex-1 justify-center">
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
                  
                  <p className="text-sm text-gray-300 text-center">
                    {t('orders.showingOrders', { 
                      start: ((currentPage - 1) * pageSize) + 1, 
                      end: Math.min(currentPage * pageSize, totalOrders), 
                      total: totalOrders 
                    })}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        order={selectedOrderForDetails}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        operationCurrency={operationDetails?.currency || 'EUR'}
      />

    </div>
  );
}
