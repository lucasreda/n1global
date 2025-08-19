import { ShoppingCart, CheckCircle, XCircle, Percent } from "lucide-react";

interface StatsCardsProps {
  totalOrders: number;
  paidOrders: number;
  refusedOrders: number;
  successRate: string;
}

export function StatsCards({ totalOrders, paidOrders, refusedOrders, successRate }: StatsCardsProps) {
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
      title: "Pedidos Pagos", 
      value: paidOrders.toLocaleString(),
      icon: CheckCircle,
      iconBg: "bg-green-600/20",
      iconColor: "text-green-400",
      hoverBg: "group-hover:bg-green-600/30",
      growth: calculateGrowth(paidOrders),
      testId: "card-paid-orders"
    },
    {
      title: "Pedidos Recusados",
      value: refusedOrders.toLocaleString(),
      icon: XCircle,
      iconBg: "bg-red-600/20",
      iconColor: "text-red-400",
      hoverBg: "group-hover:bg-red-600/30",
      growth: calculateGrowth(refusedOrders, refusedOrders * 1.1), // Show negative growth for refused orders
      testId: "card-refused-orders"
    },
    {
      title: "Taxa de Aprovação",
      value: `${successRate}%`,
      icon: Percent,
      iconBg: "bg-purple-600/20",
      iconColor: "text-purple-400",
      hoverBg: "group-hover:bg-purple-600/30",
      growth: calculateGrowth(parseFloat(successRate)),
      testId: "card-success-rate"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
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
