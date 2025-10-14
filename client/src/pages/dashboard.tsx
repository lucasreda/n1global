import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ChartsSection } from "@/components/dashboard/charts-section";
import { SyncStatus } from "@/components/dashboard/sync-status";
import { OnboardingCard } from "@/components/dashboard/onboarding-card";

import { authenticatedApiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { useTourContext } from "@/contexts/tour-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, RefreshCw, X } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedOperation } = useCurrentOperation();
  
  // Tour context
  const { startTour, isTourRunning, tourWasCompletedOrSkipped } = useTourContext();

  // Fetch user data to check if tour was completed
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/user');
      return response.json();
    },
  });

  // Auto-start tour if not completed (but only once per session)
  useEffect(() => {
    console.log('🎯 Tour auto-start check:', { user, tourCompleted: user?.tourCompleted, isTourRunning, tourWasCompletedOrSkipped });
    if (user && user.tourCompleted === false && !isTourRunning && !tourWasCompletedOrSkipped) {
      console.log('✅ Starting tour automatically!');
      startTour();
    }
  }, [user, startTour, isTourRunning, tourWasCompletedOrSkipped]);

  // Fetch integrations status to check if platform and warehouse are connected
  const currentOperationId = localStorage.getItem("current_operation_id");
  const { data: integrationsStatus } = useQuery({
    queryKey: ['/api/onboarding/integrations-status', { operationId: currentOperationId }],
    enabled: !!currentOperationId,
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/onboarding/integrations-status", {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-operation-id": currentOperationId || "",
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch integration status");
      return res.json();
    },
  });

  // Sync mutation (same as orders page)
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedApiRequest("POST", `/api/integrations/sync-all`, { 
        operationId: selectedOperation 
      });
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

  // Auto-sync on page load (optimized - no page reload)
  useEffect(() => {
    const performAutoSync = async () => {
      try {
        console.log('🔄 Verificando necessidade de auto-sync da transportadora...');
        const response = await authenticatedApiRequest("GET", "/api/sync/auto");
        const result = await response.json();
        
        if (result.executed) {
          console.log('✅ Auto-sync da transportadora executado:', result.reason);
          // Refresh data without page reload
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/revenue-chart"] });
          toast({
            title: "Dados Atualizados",
            description: "Sincronização automática concluída",
          });
        } else {
          console.log('ℹ️ Auto-sync não necessário:', result.reason);
        }
      } catch (error) {
        console.error('❌ Erro no auto-sync da transportadora:', error);
      }
    };

    performAutoSync();
  }, []); // Run only on component mount

  // Fetch current operation data (including currency)
  const operationId = localStorage.getItem("current_operation_id");
  const { data: currentOperation } = useQuery({
    queryKey: ["/api/operations", operationId],
    queryFn: async () => {
      if (!operationId) return null;
      const response = await authenticatedApiRequest("GET", "/api/operations");
      const operations = await response.json();
      return operations.find((op: any) => op.id === operationId) || null;
    },
    enabled: !!operationId,
  });

  const operationCurrency = currentOperation?.currency || 'EUR';

  // Fetch dashboard metrics with new API
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics", dateRange?.from?.toISOString(), dateRange?.to?.toISOString(), operationId, "v4"],
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return null;
      const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
      const dateTo = format(dateRange.to, 'yyyy-MM-dd');
      const url = operationId 
        ? `/api/dashboard/metrics?dateFrom=${dateFrom}&dateTo=${dateTo}&operationId=${operationId}`
        : `/api/dashboard/metrics?dateFrom=${dateFrom}&dateTo=${dateTo}`;
      const response = await authenticatedApiRequest("GET", url);
      return response.json();
    },
    enabled: !!dateRange?.from && !!dateRange?.to,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in memory for 10 minutes
    refetchOnMount: false, // Don't refetch on every mount
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Fetch revenue chart data
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["/api/dashboard/revenue-chart", dateRange?.from?.toISOString(), dateRange?.to?.toISOString(), operationId, "v3"],
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return [];
      const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
      const dateTo = format(dateRange.to, 'yyyy-MM-dd');
      const url = operationId 
        ? `/api/dashboard/revenue-chart?dateFrom=${dateFrom}&dateTo=${dateTo}&operationId=${operationId}`
        : `/api/dashboard/revenue-chart?dateFrom=${dateFrom}&dateTo=${dateTo}`;
      console.log(`📊 Fetching revenue chart data for date range: ${dateFrom} to ${dateTo}`, url);
      const response = await authenticatedApiRequest("GET", url);
      const data = await response.json();
      console.log(`📈 Revenue chart data received:`, data);
      return data;
    },
    enabled: !!dateRange?.from && !!dateRange?.to,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in memory for 10 minutes
    refetchOnMount: false, // Don't refetch on every mount
    refetchOnWindowFocus: false, // Don't refetch on window focus
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



  // Progressive loading - show available data immediately
  const isInitialLoading = metricsLoading && !metrics;
  
  if (isInitialLoading) {
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
    <div className="w-full max-w-full overflow-x-hidden space-y-3 sm:space-y-4 lg:space-y-6">
      {/* Header with Complete Sync Button and Date Filter */}
      <div className="w-full flex items-center justify-between gap-2 sm:gap-3">
        {/* Date Range Picker - Left on mobile */}
        <Popover open={isPopoverOpen} onOpenChange={(open) => {
          setIsPopoverOpen(open);
          if (open) {
            setTempDateRange(dateRange);
          }
        }}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="justify-start text-left font-normal bg-gray-900/30 border-gray-700/50 hover:bg-gray-800/50 text-gray-300 text-xs sm:text-sm min-w-[200px] sm:min-w-[240px]"
              data-testid="button-date-range-picker"
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
              {dateRange?.from && dateRange?.to ? (
                <span className="truncate">
                  {format(dateRange.from, "dd/MM/yy", { locale: pt })} - {format(dateRange.to, "dd/MM/yy", { locale: pt })}
                </span>
              ) : (
                <span>Selecionar período</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 glassmorphism border-gray-600" align="start">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {tempDateRange?.from && tempDateRange?.to 
                    ? `${format(tempDateRange.from, "dd/MM/yy")} - ${format(tempDateRange.to, "dd/MM/yy")}`
                    : "Selecione a data inicial e final"}
                </p>
                {tempDateRange?.from && tempDateRange?.to && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTempDateRange(undefined)}
                    className="h-6 px-2 text-xs text-gray-400 hover:text-white"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>
              <Calendar
                mode="range"
                selected={tempDateRange}
                onSelect={setTempDateRange}
                numberOfMonths={2}
                initialFocus
                disabled={(date) => date > new Date()}
                toDate={new Date()}
                className="rounded-md border-0"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center text-gray-200",
                  caption_label: "text-sm font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 bg-transparent hover:bg-gray-700/50 p-0 opacity-50 hover:opacity-100",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex",
                  head_cell: "text-gray-400 rounded-md w-9 font-normal text-[0.8rem]",
                  row: "flex w-full mt-2",
                  cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-blue-600/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-700/50 rounded-md",
                  day_selected: "bg-blue-600 text-white hover:bg-blue-700 hover:text-white focus:bg-blue-700 focus:text-white",
                  day_today: "bg-gray-700/50 text-gray-200",
                  day_outside: "text-gray-600 opacity-50",
                  day_disabled: "text-gray-600 opacity-50 cursor-not-allowed",
                  day_range_middle: "aria-selected:bg-blue-600/30 aria-selected:text-white rounded-none",
                  day_hidden: "invisible",
                }}
              />
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-700">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    setTempDateRange({ from: firstDayOfMonth, to: now });
                  }}
                  className="text-xs bg-gray-800/50 hover:bg-gray-700/50"
                >
                  Este mês
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    const thirtyDaysAgo = new Date(now);
                    thirtyDaysAgo.setDate(now.getDate() - 30);
                    setTempDateRange({ from: thirtyDaysAgo, to: now });
                  }}
                  className="text-xs bg-gray-800/50 hover:bg-gray-700/50"
                >
                  30 dias
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    const ninetyDaysAgo = new Date(now);
                    ninetyDaysAgo.setDate(now.getDate() - 90);
                    setTempDateRange({ from: ninetyDaysAgo, to: now });
                  }}
                  className="text-xs bg-gray-800/50 hover:bg-gray-700/50"
                >
                  90 dias
                </Button>
              </div>
              <div className="flex gap-2 pt-2 border-t border-gray-700">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTempDateRange(dateRange);
                    setIsPopoverOpen(false);
                  }}
                  className="flex-1 text-xs bg-gray-800/50 hover:bg-gray-700/50"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (tempDateRange?.from && tempDateRange?.to) {
                      setDateRange(tempDateRange);
                      setIsPopoverOpen(false);
                    }
                  }}
                  disabled={!tempDateRange?.from || !tempDateRange?.to}
                  className="flex-1 text-xs bg-blue-600 hover:bg-blue-700"
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Complete Sync Button - Right on mobile */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  onClick={() => syncMutation.mutate()}
                  disabled={
                    syncMutation.isPending || 
                    !integrationsStatus?.hasPlatform || 
                    !integrationsStatus?.hasWarehouse
                  }
                  variant="outline"
                  size="sm"
                  className="bg-blue-900/30 border-blue-500/50 text-blue-300 hover:bg-blue-800/50 hover:text-blue-200 transition-colors disabled:opacity-50 text-xs sm:text-sm flex-shrink-0"
                  data-testid="button-complete-sync"
                >
                  <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">
                    {syncMutation.isPending ? 'Sincronizando...' : 'Sync Completo'}
                  </span>
                </Button>
              </div>
            </TooltipTrigger>
            {(!integrationsStatus?.hasPlatform || !integrationsStatus?.hasWarehouse) && (
              <TooltipContent>
                <p>É necessário conectar pelo menos uma plataforma e um armazém para realizar a sincronização completa</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <OnboardingCard />
      
      <StatsCards 
        metrics={metrics} 
        isLoading={metricsLoading} 
        period={dateRange?.from && dateRange?.to ? `${format(dateRange.from, 'dd/MM/yy')} - ${format(dateRange.to, 'dd/MM/yy')}` : 'Selecione um período'} 
        currency={operationCurrency} 
      />
      
      <ChartsSection 
        revenueData={revenueData || []}
        distributionData={getDistributionData()}
        isLoading={revenueLoading}
        currency={operationCurrency}
      />
      
      <SyncStatus />
    </div>
  );
}
