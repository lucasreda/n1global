import { ShoppingCart, CheckCircle, XCircle, Percent, Calculator } from "lucide-react";

interface StatsCardsProps {
  metrics: any;
  isLoading: boolean;
}

export function StatsCards({ metrics, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[...Array(5)].map((_, i) => (
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
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 animate-fade-in">
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
  );
}
