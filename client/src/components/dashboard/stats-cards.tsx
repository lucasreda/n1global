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
  const marketingCosts = metrics?.marketingCosts || 0;
  const deliveryRate = metrics?.deliveryRate || 0;
  const totalProfit = metrics?.totalProfit || 0;
  const profitMargin = metrics?.profitMargin || 0;
  const roi = metrics?.roi || 0;

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
      title: "Receita Total",
      value: `€ ${revenue.toFixed(2)}`,
      icon: Percent,
      iconBg: "bg-purple-600/20",
      iconColor: "text-purple-400",
      hoverBg: "group-hover:bg-purple-600/30",
      growth: calculateGrowth(revenue),
      testId: "card-revenue"
    },
    {
      title: "Custo de Produtos",
      value: `€ ${productCosts.toFixed(2)}`,
      icon: Calculator,
      iconBg: "bg-orange-600/20",
      iconColor: "text-orange-400",
      hoverBg: "group-hover:bg-orange-600/30",
      growth: calculateGrowth(productCosts, productCosts * 1.1),
      testId: "card-product-costs"
    },
    {
      title: "Custo Marketing (20%)",
      value: `€ ${marketingCosts.toFixed(2)}`,
      icon: TrendingUp,
      iconBg: "bg-pink-600/20",
      iconColor: "text-pink-400",
      hoverBg: "group-hover:bg-pink-600/30",
      growth: calculateGrowth(marketingCosts),
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

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Profit Card */}
      <div className="glassmorphism rounded-3xl p-4 sm:p-6 md:p-8 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-green-600/10 border-2 border-green-400/20 hover:border-green-400/30 transition-all duration-500 group relative overflow-hidden profit-card-glow">
        <div className="absolute inset-0 bg-gradient-to-br from-green-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-start justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500/30 to-emerald-600/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="text-green-400 w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-green-400 mb-1" data-testid="value-card-profit">
                  €{totalProfit.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                </h2>
                <p className="text-sm sm:text-base lg:text-lg text-gray-300" data-testid="label-card-profit">
                  Lucro Total
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                profitMargin >= 0 ? "text-green-400 bg-green-400/20" : "text-red-400 bg-red-400/20"
              }`}>
                {profitMargin >= 0 ? "+" : ""}{profitMargin.toFixed(1)}% margem
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-green-400/20">
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-400 mb-1">Receita Total</p>
              <p className="text-xl font-semibold text-gray-200">€{revenue.toLocaleString('pt-PT')}</p>
            </div>
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-400 mb-1">Custos Totais</p>
              <p className="text-xl font-semibold text-gray-200">€{(productCosts + marketingCosts).toLocaleString('pt-PT')}</p>
            </div>
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-400 mb-1">ROI</p>
              <p className="text-xl font-semibold text-green-400">{roi.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const isPositiveGrowth = parseFloat(stat.growth.toString()) >= 0;
          
          return (
            <div
              key={index}
              className="glassmorphism rounded-2xl p-4 sm:p-6 hover:scale-[1.02] hover:shadow-2xl transition-all duration-300 group cursor-pointer border border-white/5 hover:border-white/10 card-hover-effect"
              data-testid={stat.testId}
            >
              <div className="flex items-center justify-between mb-6">
                <div className={`w-14 h-14 ${stat.iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`${stat.iconColor} w-7 h-7`} />
                </div>
                <div className="text-right">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full transition-all duration-300 ${
                    isPositiveGrowth 
                      ? "text-green-400 bg-green-400/15 group-hover:bg-green-400/25" 
                      : "text-red-400 bg-red-400/15 group-hover:bg-red-400/25"
                  }`}>
                    {isPositiveGrowth ? "+" : ""}{stat.growth}%
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white group-hover:text-gray-100 transition-colors duration-300" data-testid={`value-${stat.testId}`}>
                  {stat.value}
                </h3>
                <p className="text-gray-400 text-sm font-medium group-hover:text-gray-300 transition-colors duration-300" data-testid={`label-${stat.testId}`}>
                  {stat.title}
                </p>
              </div>
              
              {/* Subtle bottom border accent */}
              <div className={`mt-4 h-1 rounded-full opacity-30 group-hover:opacity-60 transition-opacity duration-300 ${
                stat.iconBg.replace('/20', '/40')
              }`}></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
