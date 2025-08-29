import React from "react";
import { ShoppingCart, CheckCircle, XCircle, Percent, Calculator, TrendingUp, Target, DollarSign, BarChart3, RotateCcw, CheckSquare, Truck, Lock } from "lucide-react";
import { formatCurrencyBRL, formatCurrencyEUR } from "@/lib/utils";
import shopifyIcon from "@assets/shopify_1756413996883.webp";

interface StatsCardsProps {
  metrics: any;
  isLoading: boolean;
}

export function StatsCards({ metrics, isLoading }: StatsCardsProps) {
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
  const avgCPA = shopifyOrders > 0 ? (marketingCostsBRL / shopifyOrders) : 0;

  // Calcular valores em BRL
  const totalProfitBRL = metrics?.totalProfitBRL || 0;
  const totalRevenueEUR = revenue;
  const totalRevenueBRL = metrics?.totalRevenueBRL || 0;

  const calculateGrowth = (current: number, previous: number = current * 0.9): string => {
    if (previous === 0) return "0";
    return ((current - previous) / previous * 100).toFixed(1);
  };

  // Métricas principais
  const primaryMetrics = [
    {
      title: "Pedidos Shopify",
      value: shopifyOrders.toLocaleString(),
      subtitle: "Importados da plataforma",
      icon: () => <img src={shopifyIcon} alt="Shopify" className="w-5 h-5 object-contain" />,
      color: "green",
      growth: calculateGrowth(shopifyOrders),
      testId: "card-shopify-orders",
      isProfit: false,
      isNegative: false
    },
    {
      title: "CPA Anúncios",
      value: formatCurrencyBRL(avgCPA),
      subtitle: "Custo por aquisição",
      icon: Target,
      color: "orange",
      growth: calculateGrowth(avgCPA, avgCPA * 1.1),
      testId: "card-avg-cpa",
      isProfit: false,
      isNegative: false
    },
    {
      title: "Marketing",
      value: formatCurrencyBRL(marketingCostsBRL),
      subtitle: marketingCostsEUR > 0 ? formatCurrencyEUR(marketingCostsEUR) : "Sem campanhas",
      icon: Target,
      color: "purple",
      growth: calculateGrowth(marketingCostsBRL),
      testId: "card-marketing-costs",
      isProfit: false,
      isNegative: false
    }
  ];

  // Métricas secundárias
  const secondaryMetrics = [
    {
      title: "Confirmados",
      value: confirmedOrders.toLocaleString(),
      subtitle: "Processando",
      icon: CheckSquare,
      color: "cyan",
      testId: "card-confirmed-orders"
    },
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
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3 lg:gap-6">
        {primaryMetrics.map((metric, index) => {
          const IconComponent = metric.icon;
          const isNegativeProfit = metric.isProfit && metric.isNegative;
          
          return (
            <div 
              key={index}
              className={`group backdrop-blur-sm rounded-xl p-6 transition-all duration-300 ${
                isNegativeProfit 
                  ? 'bg-red-900/20 border border-red-400/50 hover:bg-red-900/30' 
                  : 'bg-black/20 border border-white/10 hover:bg-black/30'
              }`}
              style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
              data-testid={metric.testId}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex-shrink-0">
                  <IconComponent className={`w-5 h-5 ${isNegativeProfit ? 'text-red-400' : getIconColors(metric.color)}`} />
                </div>
                {metric.isProfit ? (
                  <div className="text-right">
                    <p className={`text-xs font-medium mb-1 ${isNegativeProfit ? 'text-red-400' : 'text-gray-400'}`}>
                      % Lucro
                    </p>
                    <div className={`px-2 py-1 rounded-md text-sm font-semibold ${
                      isNegativeProfit 
                        ? 'bg-red-500/10 text-red-300' 
                        : 'bg-[#4ade80]/10 text-[#4ade80]'
                    }`}>
                      {profitMargin.toFixed(1)}%
                    </div>
                  </div>
                ) : (
                  <div className={`px-2 py-1 rounded-md text-xs font-medium ${getGrowthStyle(metric.growth)}`}>
                    {parseFloat(metric.growth) > 0 ? '+' : ''}{metric.growth}%
                  </div>
                )}
              </div>
              <div className="mb-2">
                <p className={`text-sm font-medium ${isNegativeProfit ? 'text-red-300' : 'text-gray-400'}`}>{metric.title}</p>
                <h3 className="text-lg font-semibold mt-1 text-white">{metric.value}</h3>
              </div>
              <p className={`text-sm ${isNegativeProfit ? 'text-red-400' : 'text-gray-500'}`}>{metric.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Métricas Secundárias com Card Combinado */}
      <div className="grid gap-2 sm:gap-4" style={{gridTemplateColumns: '40% 20% 20% 20%'}}>
        {/* Card Combinado de Pedidos e Entregues - Ocupa 40% */}
        <div 
          className="group backdrop-blur-sm rounded-xl p-6 transition-all duration-300 bg-black/20 border border-white/10 hover:bg-black/30" 
          data-testid="card-orders-delivered"
          style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <ShoppingCart className="w-5 h-5 text-slate-400" />
              </div>
              <div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-[#4ade80]" />
              <div className="px-2 py-1 rounded-md text-xs font-medium bg-[#4ade80]/10 text-[#4ade80]">
                {deliveryRate.toFixed(1)}%
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <h4 className="text-2xl font-bold text-white mb-1">{totalOrders.toLocaleString()}</h4>
              <p className="text-sm text-gray-500">Total de Pedidos</p>
            </div>
            <div className="text-center">
              <h4 className="text-2xl font-bold text-[#4ade80] mb-1">{deliveredOrders.toLocaleString()}</h4>
              <p className="text-sm text-gray-500">Entregues</p>
            </div>
            <div className="text-center">
              <h4 className="text-2xl font-bold text-white mb-1">{returnedOrders.toLocaleString()}</h4>
              <p className="text-sm text-gray-500">Retornados</p>
            </div>
          </div>
        </div>

        {/* Cards Secundários - Cada um ocupa 20% */}
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
                <p className="text-xs text-gray-500 mt-1">{metric.subtitle}</p>
              </div>
            </div>
          );
        })}
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
            <div className={`px-2 py-1 rounded-md text-xs font-medium ${getGrowthStyle(calculateGrowth(totalRevenueBRL))}`}>
              {parseFloat(calculateGrowth(totalRevenueBRL)) > 0 ? '+' : ''}{calculateGrowth(totalRevenueBRL)}%
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">{formatCurrencyBRL(totalRevenueBRL)}</h3>
            <p className="text-xs font-medium text-gray-400">Receita Paga</p>
            <p className="text-xs text-gray-500 mt-1">{formatCurrencyEUR(totalRevenueEUR)} • {deliveredOrders} entregas</p>
          </div>
        </div>

        <div 
          className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300" 
          data-testid="card-product-costs"
          style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
        >
          <div className="flex items-center justify-between mb-3">
            <Calculator className="w-4 h-4 text-orange-500" />
            <div className={`px-2 py-1 rounded-md text-xs font-medium ${getGrowthStyle(calculateGrowth(productCostsBRL))}`}>
              {parseFloat(calculateGrowth(productCostsBRL)) > 0 ? '+' : ''}{calculateGrowth(productCostsBRL)}%
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">{formatCurrencyBRL(productCostsBRL)}</h3>
            <p className="text-xs font-medium text-gray-400">Custos Produto</p>
            <p className="text-xs text-gray-500 mt-1">{formatCurrencyEUR(productCosts)} • Fornecedores</p>
          </div>
        </div>

        <div 
          className={`backdrop-blur-sm rounded-lg p-4 transition-all duration-300 ${
            totalProfitBRL < 0 
              ? 'bg-red-900/20 border border-red-400/50 hover:bg-red-900/30' 
              : 'bg-black/20 border border-white/10 hover:bg-black/30'
          }`}
          data-testid="card-total-profit"
          style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
        >
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className={`w-4 h-4 ${totalProfitBRL < 0 ? 'text-red-400' : 'text-[#4ade80]'}`} />
            <div className={`px-2 py-1 rounded-md text-xs font-medium ${getGrowthStyle(calculateGrowth(totalProfitBRL))}`}>
              {parseFloat(calculateGrowth(totalProfitBRL)) > 0 ? '+' : ''}{calculateGrowth(totalProfitBRL)}%
            </div>
          </div>
          <div>
            <h3 className={`text-lg font-semibold mb-1 ${totalProfitBRL < 0 ? 'text-white' : 'text-white'}`}>{formatCurrencyBRL(totalProfitBRL)}</h3>
            <p className={`text-xs font-medium ${totalProfitBRL < 0 ? 'text-red-300' : 'text-gray-400'}`}>Lucro Total</p>
            <p className={`text-xs mt-1 ${totalProfitBRL < 0 ? 'text-red-400' : 'text-gray-500'}`}>{profitMargin.toFixed(1)}% margem • {roi.toFixed(1)}% ROI</p>
          </div>
        </div>
      </div>

      {/* Insights Section */}
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6" style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}>
        <h3 className="text-lg font-semibold text-white mb-4">Resumo da Operação</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{formatCurrencyBRL(totalRevenueBRL)}</p>
            <p className="text-sm text-gray-400">Receita Total</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${totalProfitBRL < 0 ? 'text-red-400' : 'text-[#4ade80]'}`}>{formatCurrencyBRL(totalProfitBRL)}</p>
            <p className="text-sm text-gray-400">Lucro Líquido</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">{deliveryRate.toFixed(1)}%</p>
            <p className="text-sm text-gray-400">Taxa de Entrega</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">{roi.toFixed(1)}%</p>
            <p className="text-sm text-gray-400">Retorno (ROI)</p>
          </div>
        </div>
      </div>
    </div>
  );
}