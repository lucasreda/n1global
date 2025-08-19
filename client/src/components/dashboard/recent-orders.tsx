import { Eye, Edit, Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  customerName: string;
  amount: string;
  status: string;
  shippingProvider: string;
  createdAt: Date;
}

interface RecentOrdersProps {
  orders: Order[];
  onViewOrder?: (orderId: string) => void;
  onEditOrder?: (orderId: string) => void;
}

export function RecentOrders({ orders, onViewOrder, onEditOrder }: RecentOrdersProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500/20 text-green-400 hover:bg-green-500/30";
      case "processing":
        return "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30";
      case "refused":
        return "bg-red-500/20 text-red-400 hover:bg-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "paid":
        return "Pago";
      case "processing":
        return "Processando";
      case "refused":
        return "Recusado";
      default:
        return status;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatAmount = (amount: string) => {
    return `R$ ${parseFloat(amount).toFixed(2).replace('.', ',')}`;
  };

  return (
    <div className="glassmorphism rounded-2xl p-6 animate-fade-in" data-testid="section-recent-orders">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Pedidos Recentes</h3>
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            className="glassmorphism-light rounded-lg px-4 py-2 text-sm text-gray-200 hover:bg-white/20 transition-all"
            data-testid="button-filter-orders"
          >
            <Filter size={16} className="mr-2" />
            Filtrar
          </Button>
          <Button
            size="sm"
            className="gradient-blue hover:opacity-90 rounded-lg px-4 py-2 text-sm text-white transition-all"
            data-testid="button-new-order"
          >
            <Plus size={16} className="mr-2" />
            Novo Pedido
          </Button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full" data-testid="table-orders">
          <thead>
            <tr className="border-b border-gray-600/30">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">ID</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Cliente</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Valor</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Status</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Transportadora</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Data</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-300">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-600/30">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  Nenhum pedido encontrado
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr 
                  key={order.id} 
                  className="hover:bg-white/5 transition-colors"
                  data-testid={`row-order-${order.id}`}
                >
                  <td className="py-4 px-4 text-sm text-white font-mono" data-testid={`id-${order.id}`}>
                    #{order.id.slice(-6)}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-200" data-testid={`customer-${order.id}`}>
                    {order.customerName}
                  </td>
                  <td className="py-4 px-4 text-sm text-white font-semibold" data-testid={`amount-${order.id}`}>
                    {formatAmount(order.amount)}
                  </td>
                  <td className="py-4 px-4">
                    <Badge 
                      className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium border-0",
                        getStatusVariant(order.status)
                      )}
                      data-testid={`status-${order.id}`}
                    >
                      {getStatusLabel(order.status)}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-200 capitalize" data-testid={`provider-${order.id}`}>
                    {order.shippingProvider}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-300" data-testid={`date-${order.id}`}>
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewOrder?.(order.id)}
                        className="text-blue-400 hover:text-blue-300 transition-colors p-2 h-auto"
                        data-testid={`button-view-${order.id}`}
                      >
                        <Eye size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditOrder?.(order.id)}
                        className="text-gray-400 hover:text-gray-300 transition-colors p-2 h-auto"
                        data-testid={`button-edit-${order.id}`}
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
      
      {orders.length > 0 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-600/30">
          <p className="text-sm text-gray-300" data-testid="text-pagination-info">
            Mostrando {orders.length} pedidos
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="glassmorphism-light rounded-lg px-3 py-2 text-sm text-gray-200 hover:bg-white/20 transition-all"
              data-testid="button-prev-page"
            >
              Anterior
            </Button>
            <Button
              size="sm"
              className="gradient-blue rounded-lg px-3 py-2 text-sm text-white"
              data-testid="button-page-1"
            >
              1
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="glassmorphism-light rounded-lg px-3 py-2 text-sm text-gray-200 hover:bg-white/20 transition-all"
              data-testid="button-page-2"
            >
              2
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="glassmorphism-light rounded-lg px-3 py-2 text-sm text-gray-200 hover:bg-white/20 transition-all"
              data-testid="button-page-3"
            >
              3
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="glassmorphism-light rounded-lg px-3 py-2 text-sm text-gray-200 hover:bg-white/20 transition-all"
              data-testid="button-next-page"
            >
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
