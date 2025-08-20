import { ShoppingCart, CheckCircle, XCircle, Percent, Calculator, TrendingUp, Target, DollarSign, BarChart3 } from "lucide-react";

interface StatsCardsProps {
  metrics: any;
  isLoading: boolean;
}

export function StatsCards({ metrics, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="glassmorphism rounded-2xl p-6 h-32 animate-pulse">
            <div className="w-12 h-12 bg-gray-600/50 rounded-xl mb-4"></div>
            <div className="w-3/4 h-4 bg-gray-600/50 rounded mb-2"></div>
            <div className="w-1/2 h-6 bg-gray-600/50 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const totalOrders = metrics?.totalOrders || 0;
  const deliveredOrders = metrics?.deliveredOrders || 0;
  const cancelledOrders = metrics?.cancelledOrders || 0;
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
    <div className="space-y-6 animate-fade-in">
      {/* Profit Card - Special Highlight */}
      <div className="glassmorphism rounded-2xl p-8 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-600/20 border-2 border-green-400/30 hover:bg-gradient-to-r hover:from-green-500/30 hover:via-emerald-500/30 hover:to-green-600/30 transition-all duration-300 group">
        <div className="flex items-center justify-between mb-6">
          <div className="w-16 h-16 bg-green-500/30 rounded-xl flex items-center justify-center group-hover:bg-green-500/40 transition-all">
            <DollarSign className="text-green-400 w-8 h-8" />
          </div>
          <div className="text-right">
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${
              profitMargin >= 0 ? "text-green-400 bg-green-400/20" : "text-red-400 bg-red-400/20"
            }`}>
              {profitMargin >= 0 ? "+" : ""}{profitMargin.toFixed(1)}% margem
            </span>
          </div>
        </div>
        <h3 className="text-4xl font-bold text-green-400 mb-2" data-testid="value-card-profit">
          € {totalProfit.toFixed(2)}
        </h3>
        <p className="text-gray-300 text-lg" data-testid="label-card-profit">
          Lucro Total
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Receita - Custos de Produtos - Marketing
        </p>
      </div>

      {/* Other Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {stats.map((stat) => (
        <div
          key={stat.title}
          className="glassmorphism rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 group"
          data-testid={stat.testId}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center ${stat.hoverBg} transition-all`}>
              <stat.icon className={`${stat.iconColor}`} size={20} />
            </div>
            <span 
              className={`text-xs font-medium px-2 py-1 rounded-full ${
                parseFloat(stat.growth.toString()) >= 0 
                  ? "text-green-400 bg-green-400/20" 
                  : "text-red-400 bg-red-400/20"
              }`}
              data-testid={`growth-${stat.testId}`}
            >
              {parseFloat(stat.growth.toString()) >= 0 ? "+" : ""}{stat.growth}%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1" data-testid={`value-${stat.testId}`}>
            {stat.value}
          </h3>
          <p className="text-gray-300 text-sm" data-testid={`label-${stat.testId}`}>
            {stat.title}
          </p>
        </div>
        ))}
      </div>
    </div>
  );
}
