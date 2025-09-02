import React, { useState } from "react";
import { ShoppingCart, CheckCircle, XCircle, Percent, Calculator, TrendingUp, Target, DollarSign, BarChart3, RotateCcw, CheckSquare, Truck, Lock, Eye, EyeOff, Globe } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { formatCurrencyBRL, formatCurrencyEUR } from "@/lib/utils";
import shopifyIcon from "@assets/shopify_1756413996883.webp";
import facebookIcon from "@assets/meta-icon_1756415603759.png";
import facebookIconMini from "@assets/metamini_1756416312919.png";
import googleAdsIcon from "@assets/gadsicon_1756416065444.png";
import googleAdsIconMini from "@assets/gadsmini_1756416199452.png";
import n1MiniIcon from "@assets/n1-mini_1756458815716.png";

interface StatsCardsProps {
  metrics: any;
  isLoading: boolean;
  period?: string;
}

// Componentes customizados para os ícones de anúncios
const FacebookIcon = ({ size }: { size?: number }) => {
  const iconSrc = (size || 40) <= 24 ? facebookIconMini : facebookIcon;
  return (
    <img 
      src={iconSrc} 
      alt="Meta" 
      className="object-contain"
      style={{ width: size || 40, height: size || 40 }}
    />
  );
};

const GoogleAdsIcon = ({ size }: { size?: number }) => {
  const iconSrc = (size || 40) <= 24 ? googleAdsIconMini : googleAdsIcon;
  return (
    <img 
      src={iconSrc} 
      alt="Google Ads" 
      className="object-contain"
      style={{ width: size || 40, height: size || 40 }}
    />
  );
};

// Network Icon Component para determinar qual ícone mostrar
const NetworkIcon = ({ network, size = 20 }: { network: 'facebook' | 'google' | 'mixed'; size?: number }) => {
  switch (network) {
    case 'facebook':
      return <FacebookIcon size={size} />;
    case 'google':
      return <GoogleAdsIcon size={size} />;
    case 'mixed':
      return <Target className={`w-${Math.floor(size/4)} h-${Math.floor(size/4)} text-orange-500`} />;
    default:
      return <Target className={`w-${Math.floor(size/4)} h-${Math.floor(size/4)} text-orange-500`} />;
  }
};

interface AdAccount {
  id: string;
  network: 'facebook' | 'google';
  accountId: string;
  name: string;
  isActive: boolean;
}

export function StatsCards({ metrics, isLoading, period = "30" }: StatsCardsProps) {
  const [isOrdersVisible, setIsOrdersVisible] = useState(true);
  const operationId = localStorage.getItem("current_operation_id");
  
  // Converter período para formato da API
  const apiPeriod = period === "1" ? "1d" : 
                    period === "7" ? "7d" : 
                    period === "90" ? "90d" : 
                    period === "365" ? "365d" :
                    period === "current_month" ? "current_month" :
                    period === "all" ? "all" : "30d";
  
  // Buscar dados de pedidos diários
  const { data: ordersTimelineData } = useQuery({
    queryKey: ["/api/dashboard/revenue-chart", operationId, apiPeriod],
    queryFn: async () => {
      const url = `/api/dashboard/revenue-chart?period=${apiPeriod}${operationId ? `&operationId=${operationId}` : ''}`;
      const response = await authenticatedApiRequest("GET", url);
      return response.json();
    },
    enabled: !!operationId
  });

  // Buscar contas de anúncios ativas da operação para determinar o ícone
  const { data: adAccounts } = useQuery({
    queryKey: ["/api/ad-accounts", operationId],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", `/api/ad-accounts?operationId=${operationId}`);
      return response.json();
    },
    enabled: !!operationId
  });

  // Determinar qual ícone de rede usar baseado nas contas ativas
  const getNetworkForIcon = (): 'facebook' | 'google' | 'mixed' => {
    if (!adAccounts || adAccounts.length === 0) return 'mixed';
    
    const activeAccounts = (adAccounts as AdAccount[]).filter(acc => acc.isActive);
    const networks = Array.from(new Set(activeAccounts.map(acc => acc.network)));
    
    if (networks.length > 1) return 'mixed';
    if (networks.includes('facebook')) return 'facebook';
    if (networks.includes('google')) return 'google';
    return 'mixed';
  };
  if (isLoading) {
    return (
      <div className="space-y-4 lg:space-y-6">
        {/* Main Cards Loading */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3 lg:gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6 animate-pulse" style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gray-600/50 rounded-lg"></div>
                <div className="w-16 h-4 bg-gray-600/50 rounded"></div>
              </div>
              <div className="w-32 h-8 bg-gray-600/50 rounded mb-2"></div>
              <div className="w-20 h-4 bg-gray-600/50 rounded"></div>
            </div>
          ))}
        </div>
        
        {/* Combined Secondary Cards Loading */}
        <div className="grid gap-2 sm:gap-4" style={{gridTemplateColumns: '50% 16% 16% 16%'}}>
          {/* Combined Orders Card Loading - 50% */}
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6 animate-pulse" style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-gray-600/50 rounded"></div>
                <div>
                  <div className="w-32 h-5 bg-gray-600/50 rounded mb-2"></div>
                  <div className="w-24 h-3 bg-gray-600/50 rounded"></div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-gray-600/50 rounded"></div>
                <div className="w-12 h-6 bg-gray-600/50 rounded"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="w-16 h-8 bg-gray-600/50 rounded mb-1 mx-auto"></div>
                <div className="w-24 h-4 bg-gray-600/50 rounded mx-auto"></div>
              </div>
              <div className="text-center">
                <div className="w-16 h-8 bg-gray-600/50 rounded mb-1 mx-auto"></div>
                <div className="w-20 h-4 bg-gray-600/50 rounded mx-auto"></div>
              </div>
            </div>
          </div>
          
          {/* Secondary Cards Loading - 16% cada */}
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 animate-pulse" style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}>
              <div className="w-8 h-8 bg-gray-600/50 rounded mb-3"></div>
              <div className="w-16 h-6 bg-gray-600/50 rounded mb-1"></div>
              <div className="w-12 h-3 bg-gray-600/50 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalOrders = metrics?.totalOrders || 0;
  const deliveredOrders = metrics?.deliveredOrders || 0;
  const cancelledOrders = metrics?.cancelledOrders || 0;
  const returnedOrders = metrics?.returnedOrders || 0;
  const confirmedOrders = metrics?.confirmedOrders || 0;
  const revenue = metrics?.totalRevenue || 0;
  const productCosts = metrics?.totalProductCosts || 0;
  const productCostsBRL = metrics?.totalProductCostsBRL || 0;
  const shippingCosts = metrics?.totalShippingCosts || 0;
  const shippingCostsBRL = metrics?.totalShippingCostsBRL || 0;
  const marketingCosts = metrics?.marketingCosts || 0;
  const marketingCostsBRL = metrics?.marketingCostsBRL || 0;
  const marketingCostsEUR = metrics?.marketingCostsEUR || 0;
  const deliveryRate = metrics?.deliveryRate || 0;
  const totalProfit = metrics?.totalProfit || 0;
  const profitMargin = metrics?.profitMargin || 0;
  const roi = metrics?.roi || 0;
  const averageOrderValue = metrics?.averageOrderValue || 0;
  
  // Novos cálculos para os cards especiais
  const shopifyOrders = metrics?.shopifyOrders || 0;
  const avgCPA = metrics?.cpaBRL || 0; // Use valor calculado do backend
  
  // Force refresh se CPA for 0 mas deveria ter valor
  const queryClient = useQueryClient();
  React.useEffect(() => {
    if (metrics && avgCPA === 0 && metrics.deliveredOrders > 0) {
      console.log('🔄 Invalidating cache - CPA shows 0 but should have value');
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      }, 100);
    }
  }, [metrics, avgCPA, queryClient]);
  

  // Calcular valores em BRL
  const totalProfitBRL = metrics?.totalProfitBRL || 0;
  const totalRevenueEUR = revenue;
  const totalRevenueBRL = metrics?.totalRevenueBRL || 0;
  const paidRevenueBRL = metrics?.paidRevenueBRL || 0;
  const paidRevenueEUR = metrics?.paidRevenue || 0;
  const totalPaidOrders = metrics?.totalPaidOrders || 0;

  const calculateGrowth = (current: number, previous: number = current * 0.9): string => {
    if (previous === 0) return "0";
    return ((current - previous) / previous * 100).toFixed(1);
  };

  // Métricas principais
  const primaryMetrics = [
    {
      title: "Pedidos",
      value: shopifyOrders.toLocaleString(),
      subtitle: "Importados da plataforma",
      icon: () => <img src={shopifyIcon} alt="Shopify" className="w-5 h-5 object-contain" />,
      color: "green",
      growth: calculateGrowth(shopifyOrders),
      testId: "card-shopify-orders",
      isProfit: false,
      isNegative: false,
      isSingle: false
    },
    {
      title: "CPA & Marketing",
      value: formatCurrencyBRL(avgCPA),
      subtitle: "Custo por aquisição",
      icon: Target,
      color: "orange",
      growth: calculateGrowth(avgCPA, avgCPA * 1.1),
      testId: "card-cpa-marketing",
      isProfit: false,
      isNegative: false,
      isCombined: true,
      marketingValue: formatCurrencyBRL(marketingCostsBRL),
      marketingSubtitle: marketingCostsEUR > 0 ? formatCurrencyEUR(marketingCostsEUR) : "Sem campanhas",
      isSingle: false
    }
  ];

  // Métricas secundárias
  const secondaryMetrics = [
    {
      title: "Custos Envio",
      value: formatCurrencyBRL(shippingCostsBRL),
      subtitle: shippingCosts > 0 ? formatCurrencyEUR(shippingCosts) : "Sem custos",
      icon: Truck,
      color: "amber",
      testId: "card-shipping-costs"
    },
    {
      title: "Custos Produtos",
      value: formatCurrencyBRL(productCostsBRL),
      subtitle: productCosts > 0 ? formatCurrencyEUR(productCosts) : "Sem custos",
      icon: DollarSign,
      color: "red",
      testId: "card-product-costs"
    }
  ];

  const getIconColors = (color: string) => {
    const colors = {
      blue: "text-blue-500",
      green: "text-[#4ade80]", 
      slate: "text-slate-400",
      emerald: "text-[#4ade80]",
      cyan: "text-cyan-500",
      amber: "text-amber-500",
      purple: "text-purple-500",
      red: "text-red-500",
      orange: "text-orange-500"
    };
    return colors[color as keyof typeof colors] || "text-gray-500";
  };

  const getGrowthStyle = (growth: string) => {
    const value = parseFloat(growth);
    if (value > 0) return "text-[#4ade80] bg-[#4ade80]/10";
    if (value < 0) return "text-red-500 bg-red-500/10";
    return "text-gray-400 bg-gray-500/10";
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Métricas Principais */}
      <div className="space-y-3 lg:space-y-6">
        {/* Mobile: Pedidos em linha própria */}
        <div className="sm:hidden">
          <div 
            className="group bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300 flex flex-col relative"
            style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
            data-testid="card-shopify-orders"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex-shrink-0">
                <img src={shopifyIcon} alt="Shopify" className="w-5 h-5 object-contain" />
              </div>
            </div>
            <div className="flex items-start gap-[50px] mb-2">
              <div>
                <p className="text-sm font-medium text-gray-400">Faturamento</p>
                <h3 className="text-[22px] font-semibold mt-1 text-white">{formatCurrencyBRL(totalRevenueBRL)}</h3>
                <p className="text-base text-gray-500">{formatCurrencyEUR(totalRevenueEUR)}</p>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-400">Pedidos</p>
                  <button 
                    onClick={() => setIsOrdersVisible(!isOrdersVisible)}
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {isOrdersVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>
                <h3 className={`text-[22px] font-bold mt-1 text-white ${!isOrdersVisible ? 'blur-xl select-none' : ''}`}>
                  {shopifyOrders.toLocaleString()}
                </h3>
                {isOrdersVisible && (
                  <div className={`px-2 py-1 rounded-md text-xs font-medium w-fit ${getGrowthStyle(calculateGrowth(shopifyOrders, metrics?.previousPeriodOrders || 0))}`} style={{marginTop: '-2px'}}>
                    {parseFloat(calculateGrowth(shopifyOrders, metrics?.previousPeriodOrders || 0)) > 0 ? '+' : ''}{calculateGrowth(shopifyOrders, metrics?.previousPeriodOrders || 0)}%
                  </div>
                )}
              </div>
            </div>
            {/* Ícone no canto inferior direito */}
            <img 
              src={n1MiniIcon} 
              alt="N1" 
              className="absolute bottom-2 right-2 w-5 h-5 object-contain opacity-60"
            />
          </div>
        </div>
        
        {/* Mobile: CPA & Marketing em linha própria ocupando tela inteira */}
        <div className="sm:hidden">
          <div 
            className="group bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300"
            style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
            data-testid="card-cpa-marketing"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex-shrink-0">
                <NetworkIcon network={getNetworkForIcon()} size={20} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-400">CPA Anúncios</p>
                <h3 className="text-lg font-semibold mt-1 text-white">{formatCurrencyBRL(avgCPA)}</h3>
                <p className="text-sm text-gray-500">Custo por aquisição</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">Marketing</p>
                <h3 className="text-lg font-semibold mt-1 text-white">{formatCurrencyBRL(marketingCostsBRL)}</h3>
                <p className="text-sm text-gray-500">{marketingCostsEUR > 0 ? formatCurrencyEUR(marketingCostsEUR) : "Sem campanhas"}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Desktop: Layout horizontal */}
        <div className="hidden sm:grid gap-3 lg:gap-6" style={{gridTemplateColumns: '1fr 1fr 1fr'}}>
          {/* Gráfico de Pedidos Diários - 1/3 */}
          <div 
            className="group p-4 h-[180px]"
            data-testid="card-daily-orders"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-slate-400" />
              </div>
            </div>
            <div className="mb-2">
              <p className="text-sm font-medium text-gray-400">Pedidos por Dia</p>
              <div className="h-[116px] mt-1">
                {ordersTimelineData && ordersTimelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ordersTimelineData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <XAxis 
                        dataKey="date" 
                        stroke="#6B7280"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                        }}
                        formatter={(value: number) => [`${value} pedidos`, '']}
                        labelStyle={{ color: '#9CA3AF', fontSize: '11px' }}
                        labelFormatter={(label) => {
                          const date = new Date(label);
                          return date.toLocaleDateString('pt-BR');
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="orders" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3, stroke: '#10B981', strokeWidth: 1, fill: '#10B981' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-xs">Carregando...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Pedidos - 1/3 */}
          <div 
            className="group bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300 flex flex-col h-[180px] relative"
            style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
            data-testid="card-shopify-orders"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex-shrink-0">
                <img src={shopifyIcon} alt="Shopify" className="w-5 h-5 object-contain" />
              </div>
            </div>
            <div className="flex items-start gap-[50px] mb-2">
              <div>
                <p className="text-sm font-medium text-gray-400">Faturamento</p>
                <h3 className="text-[22px] font-semibold mt-1 text-white">{formatCurrencyBRL(totalRevenueBRL)}</h3>
                <p className="text-base text-gray-500">{formatCurrencyEUR(totalRevenueEUR)}</p>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-400">Pedidos</p>
                  <button 
                    onClick={() => setIsOrdersVisible(!isOrdersVisible)}
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {isOrdersVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>
                <h3 className={`text-[22px] font-bold mt-1 text-white ${!isOrdersVisible ? 'blur-xl select-none' : ''}`}>
                  {shopifyOrders.toLocaleString()}
                </h3>
                {isOrdersVisible && (
                  <div className={`px-2 py-1 rounded-md text-xs font-medium w-fit ${getGrowthStyle(calculateGrowth(shopifyOrders, metrics?.previousPeriodOrders || 0))}`} style={{marginTop: '-2px'}}>
                    {parseFloat(calculateGrowth(shopifyOrders, metrics?.previousPeriodOrders || 0)) > 0 ? '+' : ''}{calculateGrowth(shopifyOrders, metrics?.previousPeriodOrders || 0)}%
                  </div>
                )}
              </div>
            </div>
            {/* Ícone no canto inferior direito */}
            <img 
              src={n1MiniIcon} 
              alt="N1" 
              className="absolute bottom-2 right-2 w-5 h-5 object-contain opacity-60"
            />
          </div>
          
          {/* CPA & Marketing - 1/3 */}
          <div 
            className="group bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300 h-[180px]"
            style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
            data-testid="card-cpa-marketing"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex-shrink-0">
                <NetworkIcon network={getNetworkForIcon()} size={20} />
              </div>
            </div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-400">CPA Anúncios</p>
                <h3 className="text-lg font-semibold mt-1 text-white">{formatCurrencyBRL(avgCPA)}</h3>
                <p className="text-sm text-gray-500">Custo por aquisição</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">Marketing</p>
                <h3 className="text-lg font-semibold mt-1 text-white">{formatCurrencyBRL(marketingCostsBRL)}</h3>
                <p className="text-sm text-gray-500">{marketingCostsEUR > 0 ? formatCurrencyEUR(marketingCostsEUR) : "Sem campanhas"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas Secundárias com Card Combinado */}
      <div className="space-y-4">
        {/* Mobile layout - Card transportadora em linha própria */}
        <div className="sm:hidden">
          <div 
            className="group bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300" 
            data-testid="card-orders-delivered"
            style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-4 h-4 text-slate-400" />
                <p className="text-sm font-medium text-gray-400">Pedidos Transportadora</p>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-[#4ade80]" />
                <div className="px-2 py-1 rounded-md text-xs font-medium bg-[#4ade80]/10 text-[#4ade80]">
                  {deliveryRate.toFixed(1)}%
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <h4 className="text-lg font-bold text-white mb-1">{totalOrders.toLocaleString()}</h4>
                <p className="text-xs text-gray-500">Pedidos N1</p>
              </div>
              <div className="text-center">
                <h4 className="text-lg font-bold text-white mb-1">{confirmedOrders.toLocaleString()}</h4>
                <p className="text-xs text-gray-500">Confirmados</p>
              </div>
              <div className="text-center">
                <h4 className="text-lg font-bold text-[#4ade80] mb-1">{deliveredOrders.toLocaleString()}</h4>
                <p className="text-xs text-gray-500">Entregues</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile - Cards secundários na linha seguinte */}
        <div className="grid grid-cols-2 gap-2 sm:hidden">
          {secondaryMetrics.map((metric, index) => {
            const IconComponent = metric.icon;
            return (
              <div 
                key={index}
                className="group bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300"
                style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
                data-testid={metric.testId}
              >
                <div className="flex items-center justify-between mb-3">
                  <IconComponent className={`w-4 h-4 ${getIconColors(metric.color)}`} />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-white mb-1">{metric.value}</h4>
                  <p className="text-xs font-medium text-gray-400">{metric.title}</p>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Desktop layout - todos na mesma linha */}
        <div className="hidden sm:grid gap-4" style={{gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr)'}}>
          {/* Card Combinado de Pedidos e Entregues - Desktop: 40% */}
          <div 
            className="group backdrop-blur-sm rounded-xl p-4 transition-all duration-300 bg-black/20 border border-white/10 hover:bg-black/30" 
            data-testid="card-orders-delivered"
            style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
          >
            <div className="flex items-center justify-between mb-3" style={{marginTop: '-3px'}}>
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-4 h-4 text-slate-400" />
                <p className="text-sm font-medium text-gray-400">Pedidos Transportadora</p>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-[#4ade80]" />
                <div className="px-2 py-1 rounded-md text-xs font-medium bg-[#4ade80]/10 text-[#4ade80]">
                  {deliveryRate.toFixed(1)}%
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4" style={{marginTop: '-6px'}}>
              <div className="text-center">
                <h4 className="text-lg font-semibold text-white mb-1">{totalOrders.toLocaleString()}</h4>
                <p className="text-xs text-gray-500">Pedidos N1</p>
              </div>
              <div className="text-center">
                <h4 className="text-lg font-semibold text-white mb-1">{confirmedOrders.toLocaleString()}</h4>
                <p className="text-xs text-gray-500">Confirmados</p>
              </div>
              <div className="text-center">
                <h4 className="text-lg font-semibold text-[#4ade80] mb-1">{deliveredOrders.toLocaleString()}</h4>
                <p className="text-xs text-gray-500">Entregues</p>
              </div>
            </div>
          </div>
          
          {/* Cards Secundários - Desktop: cada um ocupa 20% */}
          {secondaryMetrics.map((metric, index) => {
            const IconComponent = metric.icon;
            return (
              <div 
                key={index}
                className="group bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300"
                style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
                data-testid={metric.testId}
              >
                <div className="flex items-center justify-between mb-3">
                  <IconComponent className={`w-4 h-4 ${getIconColors(metric.color)}`} />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-1">{metric.value}</h4>
                  <p className="text-xs font-medium text-gray-400">{metric.title}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cards de Receita, Custos e Lucro */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2 sm:gap-4">
        <div 
          className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300" 
          data-testid="card-paid-revenue"
          style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
        >
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white mb-1">{formatCurrencyBRL(paidRevenueBRL)}</h3>
            <p className="text-sm font-medium text-gray-400">Receita Paga</p>
            <p className="text-sm text-gray-500 mt-1">{formatCurrencyEUR(paidRevenueEUR)} • {totalPaidOrders} entregas</p>
          </div>
        </div>


        <div 
          className={`backdrop-blur-sm rounded-lg p-4 transition-all duration-300 ${
            totalProfitBRL < 0 
              ? 'bg-red-900/20 border border-red-400/50 hover:bg-red-900/30' 
              : 'bg-green-900/20 border border-[#4ade80]/50 hover:bg-green-900/30'
          }`}
          data-testid="card-total-profit"
          style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
        >
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className={`w-4 h-4 ${totalProfitBRL < 0 ? 'text-red-400' : 'text-[#4ade80]'}`} />
          </div>
          <div>
            <h3 className={`text-xl font-semibold mb-1 ${totalProfitBRL < 0 ? 'text-white' : 'text-white'}`}>{formatCurrencyBRL(totalProfitBRL)}</h3>
            <p className={`text-sm font-medium ${totalProfitBRL < 0 ? 'text-red-300' : 'text-[#4ade80]'}`}>Lucro Total</p>
            <p className={`text-sm mt-1 ${totalProfitBRL < 0 ? 'text-red-400' : 'text-green-300'}`}>{profitMargin.toFixed(1)}% margem • {roi.toFixed(1)}% ROI</p>
          </div>
        </div>
      </div>

      {/* Resumo da Operação - Seguindo padrão dos cards */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-slate-400" />
          Resumo da Operação
        </h3>
        
        {/* Grid seguindo mesmo padrão dos outros cards */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2 sm:gap-4">
          {/* CAC - Customer Acquisition Cost */}
          <div 
            className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300"
            style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
            data-testid="card-cac"
          >
            <div className="flex items-center justify-between mb-3">
              <Target className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-1">{formatCurrencyBRL(metrics?.cacBRL || 0)}</h3>
              <p className="text-sm font-medium text-gray-400">CPA Real</p>
              <p className="text-sm text-gray-500 mt-1">{formatCurrencyEUR(metrics?.cacEUR || 0)} • {metrics?.deliveredOrders || 0} entregues</p>
            </div>
          </div>

          {/* Tempo Médio de Entrega */}
          <div 
            className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300"
            style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
            data-testid="card-tempo-entrega"
          >
            <div className="flex items-center justify-between mb-3">
              <Truck className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-1">{(metrics?.avgDeliveryTimeDays || 0).toFixed(1)} dias</h3>
              <p className="text-sm font-medium text-gray-400">Tempo Médio de Entrega</p>
              <p className="text-sm text-gray-500 mt-1">Da criação até entrega</p>
            </div>
          </div>

          {/* Taxa de Entrega */}
          <div 
            className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300"
            style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
            data-testid="card-taxa-entrega"
          >
            <div className="flex items-center justify-between mb-3">
              <CheckCircle className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-1">{deliveryRate.toFixed(1)}%</h3>
              <p className="text-sm font-medium text-gray-400">Taxa de Entrega</p>
              <p className="text-sm text-gray-500 mt-1">{deliveredOrders} de {totalOrders} pedidos</p>
            </div>
          </div>

          {/* Margem de Lucro */}
          <div 
            className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300"
            style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
            data-testid="card-margem-lucro"
          >
            <div className="flex items-center justify-between mb-3">
              <Percent className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-1">{profitMargin.toFixed(1)}%</h3>
              <p className="text-sm font-medium text-gray-400">Margem de Lucro</p>
            </div>
          </div>

          {/* CPA Médio */}
          <div 
            className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300"
            style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
            data-testid="card-cpa-medio"
          >
            <div className="flex items-center justify-between mb-3">
              <DollarSign className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-1">{formatCurrencyBRL(avgCPA)}</h3>
              <p className="text-sm font-medium text-gray-400">CPA Médio</p>
              <p className="text-sm text-gray-500 mt-1">Custo por aquisição</p>
            </div>
          </div>

          {/* Taxa de Cancelamento */}
          <div 
            className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300"
            style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
            data-testid="card-taxa-cancelamento"
          >
            <div className="flex items-center justify-between mb-3">
              <XCircle className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-1">
                {totalOrders > 0 ? `${(cancelledOrders / totalOrders * 100).toFixed(1)}%` : '0.0%'}
              </h3>
              <p className="text-sm font-medium text-gray-400">Taxa Cancelamento</p>
              <p className="text-sm text-gray-500 mt-1">{cancelledOrders} cancelados</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}