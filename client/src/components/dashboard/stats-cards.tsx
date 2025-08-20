import { ShoppingCart, CheckCircle, XCircle, Percent, Calculator, TrendingUp, Target, DollarSign, BarChart3, RotateCcw, CheckSquare } from "lucide-react";

interface StatsCardsProps {
  metrics: any;
  isLoading: boolean;
}

export function StatsCards({ metrics, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Profit Card Loading */}
        <div className="glassmorphism rounded-3xl p-8 animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="w-16 h-16 bg-gray-600/50 rounded-2xl"></div>
            <div className="w-24 h-6 bg-gray-600/50 rounded-full"></div>
          </div>
          <div className="w-40 h-8 bg-gray-600/50 rounded mb-2"></div>
          <div className="w-24 h-5 bg-gray-600/50 rounded"></div>
        </div>
        
        {/* Main Cards Loading */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="glassmorphism rounded-2xl p-6 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gray-600/50 rounded-xl"></div>
                <div className="w-16 h-4 bg-gray-600/50 rounded"></div>
              </div>
              <div className="w-20 h-7 bg-gray-600/50 rounded mb-2"></div>
              <div className="w-24 h-4 bg-gray-600/50 rounded"></div>
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
  const marketingCosts = metrics?.marketingCosts || 0;
  const marketingCostsBRL = metrics?.marketingCostsBRL || 0;
  const marketingCostsEUR = metrics?.marketingCostsEUR || 0;
  const deliveryRate = metrics?.deliveryRate || 0;
  const totalProfit = metrics?.totalProfit || 0;
  const profitMargin = metrics?.profitMargin || 0;
  const roi = metrics?.roi || 0;
  const averageOrderValue = metrics?.averageOrderValue || 0;

  // Calcular valores em BRL
  const totalProfitBRL = metrics?.totalProfitBRL || 0;
  const totalRevenueEUR = revenue; // mantém o valor EUR original  
  const totalRevenueBRL = metrics?.totalRevenueBRL || 0;

  const calculateGrowth = (current: number, previous: number = current * 0.9) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const stats = [
    {
      title: "Total de Pedidos",
      value: totalOrders.toLocaleString(),
      icon: ShoppingCart,
      iconBg: "bg-blue-600/20",
      iconColor: "text-blue-400",
      hoverBg: "group-hover:bg-blue-600/30",
      growth: calculateGrowth(totalOrders),
      testId: "card-total-orders"
    },
    {
      title: "Pedidos Entregues", 
      value: deliveredOrders.toLocaleString(),
      icon: CheckCircle,
      iconBg: "bg-green-600/20",
      iconColor: "text-green-400",
      hoverBg: "group-hover:bg-green-600/30",
      growth: calculateGrowth(deliveredOrders),
      testId: "card-delivered-orders"
    },
    {
      title: "Pedidos Cancelados",
      value: cancelledOrders.toLocaleString(),
      icon: XCircle,
      iconBg: "bg-red-600/20",
      iconColor: "text-red-400",
      hoverBg: "group-hover:bg-red-600/30",
      growth: calculateGrowth(cancelledOrders, cancelledOrders * 1.1),
      testId: "card-cancelled-orders"
    },
    {
      title: "Pedidos Retornados",
      value: returnedOrders.toLocaleString(),
      icon: RotateCcw,
      iconBg: "bg-amber-600/20",
      iconColor: "text-amber-400",
      hoverBg: "group-hover:bg-amber-600/30",
      growth: calculateGrowth(returnedOrders, returnedOrders * 1.1),
      testId: "card-returned-orders"
    },
    {
      title: "Pedidos Confirmados",
      value: confirmedOrders.toLocaleString(),
      icon: CheckSquare,
      iconBg: "bg-teal-600/20",
      iconColor: "text-teal-400",
      hoverBg: "group-hover:bg-teal-600/30",
      growth: calculateGrowth(confirmedOrders, confirmedOrders * 0.9),
      testId: "card-confirmed-orders"
    },
    {
      title: "Receita Paga",
      value: `R$ ${totalRevenueBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      subtitle: `€ ${revenue.toFixed(2)} • ${deliveredOrders} pedidos`,
      icon: Percent,
      iconBg: "bg-purple-600/20",
      iconColor: "text-purple-400",
      hoverBg: "group-hover:bg-purple-600/30",
      growth: calculateGrowth(totalRevenueBRL),
      testId: "card-revenue"
    },
    {
      title: "Custo de Produtos",
      value: `R$ ${productCostsBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      subtitle: `€ ${productCosts.toFixed(2)}`,
      icon: Calculator,
      iconBg: "bg-orange-600/20",
      iconColor: "text-orange-400",
      hoverBg: "group-hover:bg-orange-600/30",
      growth: calculateGrowth(productCostsBRL, productCostsBRL * 1.1),
      testId: "card-product-costs"
    },
    {
      title: "Custo Marketing",
      value: `R$ ${marketingCostsBRL.toFixed(2)}`,
      subtitle: marketingCostsEUR > 0 ? `€ ${marketingCostsEUR.toFixed(2)}` : undefined,
      icon: TrendingUp,
      iconBg: "bg-pink-600/20",
      iconColor: "text-pink-400",
      hoverBg: "group-hover:bg-pink-600/30",
      growth: calculateGrowth(marketingCostsBRL),
      testId: "card-marketing-costs"
    },
    {
      title: "% de Entregados",
      value: `${deliveryRate.toFixed(1)}%`,
      icon: Target,
      iconBg: "bg-cyan-600/20",
      iconColor: "text-cyan-400",
      hoverBg: "group-hover:bg-cyan-600/30",
      growth: calculateGrowth(deliveryRate, deliveryRate * 0.9),
      testId: "card-delivery-rate"
    },
    {
      title: "ROI",
      value: `${roi.toFixed(1)}%`,
      icon: BarChart3,
      iconBg: "bg-indigo-600/20",
      iconColor: "text-indigo-400",
      hoverBg: "group-hover:bg-indigo-600/30",
      growth: calculateGrowth(roi, roi * 0.85),
      testId: "card-roi"
    },
  ];

  // Definir dados por prioridade e tamanho
  const primaryMetrics = [
    {
      title: "Lucro Total",
      value: `R$ ${totalProfitBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      subtitle: `€ ${totalProfit.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} • ${profitMargin.toFixed(1)}% margem`,
      icon: DollarSign,
      color: "green",
      size: "hero"
    }
  ];

  const secondaryMetrics = [
    {
      title: "Receita Total",
      value: `R$ ${totalRevenueBRL.toLocaleString('pt-BR')}`,
      subtitle: `€ ${totalRevenueEUR.toLocaleString('pt-PT')} • ${totalOrders} pedidos`,
      icon: BarChart3,
      color: "blue",
      size: "large"
    },
    {
      title: "Taxa de Entrega",
      value: `${deliveryRate.toFixed(1)}%`,
      subtitle: `${deliveredOrders} entregues`,
      icon: CheckCircle,
      color: "emerald",
      size: "large"
    }
  ];

  const tertiaryMetrics = [
    {
      title: "ROI",
      value: `${roi.toFixed(1)}%`,
      subtitle: "Retorno",
      icon: TrendingUp,
      color: "green",
      size: "medium"
    },
    {
      title: "Pedidos Confirmados",
      value: confirmedOrders.toLocaleString(),
      subtitle: "Processando",
      icon: CheckSquare,
      color: "teal",
      size: "medium"
    },
    {
      title: "Pedidos Retornados",
      value: returnedOrders.toLocaleString(),
      subtitle: "Devoluções",
      icon: RotateCcw,
      color: "amber",
      size: "medium"
    }
  ];

  const quaternaryMetrics = [
    {
      title: "Custos Marketing",
      value: `R$ ${marketingCostsBRL.toLocaleString('pt-BR')}`,
      subtitle: marketingCostsEUR > 0 ? `€ ${marketingCostsEUR.toFixed(2)}` : "Sem campanhas selecionadas",
      icon: Target,
      color: "purple",
      size: "small"
    },
    {
      title: "Custos Produtos",
      value: `€${productCosts.toLocaleString('pt-PT')}`,
      subtitle: "Entregues apenas",
      icon: Calculator,
      color: "indigo",
      size: "small"
    },
    {
      title: "Cancelados",
      value: cancelledOrders.toLocaleString(),
      subtitle: "Perdidos",
      icon: XCircle,
      color: "red",
      size: "small"
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Metric */}
      <div className="glassmorphism rounded-3xl p-6 bg-gradient-to-br from-green-500/15 via-emerald-500/10 to-green-600/15 border-2 border-green-400/25 hover:border-green-400/40 transition-all duration-500 group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500/30 to-emerald-600/30 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
            <DollarSign className="text-green-400 w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-green-400 mb-2" data-testid="value-card-profit">
            R$ {totalProfitBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h1>
          <p className="text-lg text-gray-300 mb-4" data-testid="label-card-profit">Lucro Total</p>
          <div className="flex justify-center items-center space-x-4 text-sm">
            <div className={`px-3 py-1 rounded-full ${profitMargin >= 0 ? "text-green-400 bg-green-400/20" : "text-red-400 bg-red-400/20"}`}>
              {profitMargin >= 0 ? "+" : ""}{profitMargin.toFixed(1)}% margem
            </div>
            <div className="text-gray-400">•</div>
            <div className="text-green-400">{roi.toFixed(1)}% ROI</div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics - Large Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glassmorphism rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 group cursor-pointer border border-blue-500/20 hover:border-blue-400/40 bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <BarChart3 className="text-blue-400 w-7 h-7" />
            </div>
            <div className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
              Principal
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">R$ {totalRevenueBRL.toLocaleString('pt-BR')}</h3>
          <p className="text-gray-300 text-sm font-medium">Receita Total</p>
          <p className="text-xs text-blue-400 mt-2">{totalOrders} pedidos</p>
        </div>
        
        <div className="glassmorphism rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 group cursor-pointer border border-emerald-500/20 hover:border-emerald-400/40 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <CheckCircle className="text-emerald-400 w-7 h-7" />
            </div>
            <div className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
              Principal
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">{deliveryRate.toFixed(1)}%</h3>
          <p className="text-gray-300 text-sm font-medium">Taxa de Entrega</p>
          <p className="text-xs text-emerald-400 mt-2">{deliveredOrders} entregues</p>
        </div>
      </div>

      {/* Tertiary Metrics - Medium Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="glassmorphism rounded-xl p-5 hover:scale-[1.02] transition-all duration-300 group cursor-pointer border border-green-500/15 hover:border-green-400/30 bg-gradient-to-br from-green-500/5 to-green-600/5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="text-green-400 w-6 h-6" />
            </div>
          </div>
          <h4 className="text-xl font-bold text-white mb-1">{roi.toFixed(1)}%</h4>
          <p className="text-gray-300 text-sm">ROI</p>
          <p className="text-xs text-green-400 mt-1">Retorno</p>
        </div>
        
        <div className="glassmorphism rounded-xl p-5 hover:scale-[1.02] transition-all duration-300 group cursor-pointer border border-teal-500/15 hover:border-teal-400/30 bg-gradient-to-br from-teal-500/5 to-teal-600/5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <CheckSquare className="text-teal-400 w-6 h-6" />
            </div>
          </div>
          <h4 className="text-xl font-bold text-white mb-1">{confirmedOrders.toLocaleString()}</h4>
          <p className="text-gray-300 text-sm">Pedidos Confirmados</p>
          <p className="text-xs text-teal-400 mt-1">Processando</p>
        </div>
        
        <div className="glassmorphism rounded-xl p-5 hover:scale-[1.02] transition-all duration-300 group cursor-pointer border border-amber-500/15 hover:border-amber-400/30 bg-gradient-to-br from-amber-500/5 to-amber-600/5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <RotateCcw className="text-amber-400 w-6 h-6" />
            </div>
          </div>
          <h4 className="text-xl font-bold text-white mb-1">{returnedOrders.toLocaleString()}</h4>
          <p className="text-gray-300 text-sm">Pedidos Retornados</p>
          <p className="text-xs text-amber-400 mt-1">Devoluções</p>
        </div>
      </div>

      {/* Quaternary Metrics - Small Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glassmorphism rounded-lg p-4 hover:scale-105 transition-all duration-300 group cursor-pointer border border-purple-500/10 hover:border-purple-400/25">
          <div className="w-10 h-10 bg-purple-500/15 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
            <Target className="text-purple-400 w-5 h-5" />
          </div>
          <h5 className="text-lg font-bold text-white mb-1">R$ {marketingCostsBRL.toLocaleString('pt-BR')}</h5>
          <p className="text-gray-400 text-xs">Custos Marketing</p>
          <p className="text-xs text-purple-400 mt-1 opacity-80">
            {marketingCostsEUR > 0 ? `€ ${marketingCostsEUR.toFixed(2)}` : "Sem campanhas"}
          </p>
        </div>
        
        <div className="glassmorphism rounded-lg p-4 hover:scale-105 transition-all duration-300 group cursor-pointer border border-indigo-500/10 hover:border-indigo-400/25">
          <div className="w-10 h-10 bg-indigo-500/15 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
            <Calculator className="text-indigo-400 w-5 h-5" />
          </div>
          <h5 className="text-lg font-bold text-white mb-1">R$ {productCostsBRL.toLocaleString('pt-BR')}</h5>
          <p className="text-gray-400 text-xs">Custos Produtos</p>
          <p className="text-xs text-indigo-400 mt-1 opacity-80">€ {productCosts.toFixed(2)}</p>
        </div>
        
        <div className="glassmorphism rounded-lg p-4 hover:scale-105 transition-all duration-300 group cursor-pointer border border-red-500/10 hover:border-red-400/25">
          <div className="w-10 h-10 bg-red-500/15 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
            <XCircle className="text-red-400 w-5 h-5" />
          </div>
          <h5 className="text-lg font-bold text-white mb-1">{cancelledOrders.toLocaleString()}</h5>
          <p className="text-gray-400 text-xs">Cancelados</p>
          <p className="text-xs text-red-400 mt-1 opacity-80">Perdidos</p>
        </div>
        
        <div className="glassmorphism rounded-lg p-4 hover:scale-105 transition-all duration-300 group cursor-pointer border border-slate-500/10 hover:border-slate-400/25">
          <div className="w-10 h-10 bg-slate-500/15 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
            <ShoppingCart className="text-slate-400 w-5 h-5" />
          </div>
          <h5 className="text-lg font-bold text-white mb-1">{totalOrders.toLocaleString()}</h5>
          <p className="text-gray-400 text-xs">Total Pedidos</p>
          <p className="text-xs text-slate-400 mt-1 opacity-80">Todos os status</p>
        </div>
        
        <div className="glassmorphism rounded-lg p-4 hover:scale-105 transition-all duration-300 group cursor-pointer border border-cyan-500/10 hover:border-cyan-400/25">
          <div className="w-10 h-10 bg-cyan-500/15 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
            <Percent className="text-cyan-400 w-5 h-5" />
          </div>
          <h5 className="text-lg font-bold text-white mb-1">{deliveryRate.toFixed(1)}%</h5>
          <p className="text-gray-400 text-xs">% Entregue</p>
          <p className="text-xs text-cyan-400 mt-1 opacity-80">Taxa sucesso</p>
        </div>
        
        <div className="glassmorphism rounded-lg p-4 hover:scale-105 transition-all duration-300 group cursor-pointer border border-pink-500/10 hover:border-pink-400/25">
          <div className="w-10 h-10 bg-pink-500/15 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
            <BarChart3 className="text-pink-400 w-5 h-5" />
          </div>
          <h5 className="text-lg font-bold text-white mb-1">€{averageOrderValue.toFixed(0)}</h5>
          <p className="text-gray-400 text-xs">Ticket Médio</p>
          <p className="text-xs text-pink-400 mt-1 opacity-80">Por pedido</p>
        </div>
      </div>
    </div>
  );
}
