import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { 
  Wallet,
  Calendar,
  DollarSign,
  Package,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { SupplierLayout } from "@/components/supplier/supplier-layout";

interface WalletOrder {
  orderId: string;
  shopifyOrderNumber?: string;
  orderDate: string;
  customerName: string;
  total: number;
  status: string;
  products: Array<{
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalValue: number;
  }>;
}

interface RecentPayment {
  id: string;
  amount: number;
  currency: string;
  paidAt: string;
  description?: string;
  status: string;
  referenceId?: string;
  orderCount: number;
}

interface SupplierWallet {
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  totalToReceive: number;
  totalOrdersCount: number;
  nextPaymentDate: string;
  availableOrders: WalletOrder[];
  recentPayments: RecentPayment[];
  totalPaid: number;
  totalOrdersPaid: number;
  averageOrderValue: number;
}

export default function SupplierWallet() {
  const { data: wallet, isLoading, refetch } = useQuery<SupplierWallet>({
    queryKey: ["/api/supplier/wallet"],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getDisplayOrderId = (order: WalletOrder) => {
    // Usar shopifyOrderNumber se disponível, senão usar orderId
    return order.shopifyOrderNumber || `#${order.orderId.slice(-6)}`;
  };

  const getFirstName = (fullName: string) => {
    return fullName.split(' ')[0];
  };

  const formatBRL = (amount: number) => {
    // Conversão EUR para BRL usando taxa atual (aproximada 6.3)
    const brlAmount = amount * 6.3;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(brlAmount);
  };

  const formatEUR = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'delivered':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'shipped':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Wallet className="h-8 w-8 animate-pulse text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-[#0f0f0f] border-[#252525]">
            <CardContent className="p-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <p className="text-gray-400">Erro ao carregar informações da wallet</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <SupplierLayout activeSection="wallet">
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black rounded-lg ml-5 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Wallet className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="font-semibold text-white" style={{ fontSize: '22px' }}>Minha Carteira</h1>
              <p className="text-gray-400">{wallet.supplierName}</p>
            </div>
          </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-[#0f0f0f] border-[#252525] relative">
            <div className="absolute top-3 right-3">
              <DollarSign className="h-3 w-3 text-green-400/60" />
            </div>
            <CardContent className="p-6">
              <div className="min-h-[64px] flex flex-col justify-center">
                <p className="text-sm text-gray-400 mb-2">Total a Receber</p>
                <div className="space-y-0.5">
                  <p className="text-xl font-bold text-green-400">
                    {formatBRL(wallet.totalToReceive)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatEUR(wallet.totalToReceive)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0f0f0f] border-[#252525] relative">
            <div className="absolute top-3 right-3">
              <Package className="h-3 w-3 text-green-400/60" />
            </div>
            <CardContent className="p-6">
              <div className="min-h-[64px] flex flex-col justify-center">
                <p className="text-sm text-gray-400 mb-2">A receber</p>
                <p className="text-xl font-bold text-green-400 mb-1">
                  {wallet.totalOrdersCount}
                </p>
                <p className="text-xs text-gray-500">
                  {wallet.totalOrdersPaid} já recebidos
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0f0f0f] border-[#252525] relative">
            <div className="absolute top-3 right-3">
              <Calendar className="h-3 w-3 text-blue-400/60" />
            </div>
            <CardContent className="p-6">
              <div className="min-h-[64px] flex flex-col justify-center">
                <p className="text-sm text-gray-400 mb-2">Próximo Pagamento</p>
                <p className="text-xl font-bold text-blue-400">
                  {formatDate(wallet.nextPaymentDate)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0f0f0f] border-[#252525] relative">
            <div className="absolute top-3 right-3">
              <TrendingUp className="h-3 w-3 text-purple-400/60" />
            </div>
            <CardContent className="p-6">
              <div className="min-h-[64px] flex flex-col justify-center">
                <p className="text-sm text-gray-400 mb-2">Total Recebido</p>
                <div className="space-y-0.5">
                  <p className="text-xl font-bold text-purple-400">
                    {formatBRL(wallet.totalPaid)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatEUR(wallet.totalPaid)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pedidos Disponíveis */}
          <Card className="bg-[#0f0f0f] border-[#252525]">
            <CardHeader>
              <CardTitle className="text-white" style={{ fontSize: '20px' }}>Pendentes de Recebimento</CardTitle>
              <p className="text-sm text-gray-400">
                Pedidos já pagos pelos clientes, aguardando pagamento do financeiro
              </p>
            </CardHeader>
            <CardContent>
              {wallet.availableOrders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Nenhum pedido disponível</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {wallet.availableOrders.slice(0, 5).map((order) => (
                    <div key={order.orderId} className="p-4 border border-gray-700 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white">{getDisplayOrderId(order)}</span>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-400">{getFirstName(order.customerName)}</p>
                          <p className="text-xs text-gray-500">{formatDate(order.orderDate)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-green-400">
                            {formatCurrency(order.total)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {order.products.length} produto(s)
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-800">
                        <div className="space-y-1">
                          {order.products.slice(0, 2).map((product, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-400">
                                {product.quantity}x {product.name}
                              </span>
                              <span className="text-gray-300">
                                {formatCurrency(product.totalValue)}
                              </span>
                            </div>
                          ))}
                          {order.products.length > 2 && (
                            <p className="text-xs text-gray-500">
                              +{order.products.length - 2} produto(s) adicional(is)
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {wallet.availableOrders.length > 5 && (
                    <p className="text-sm text-gray-400 text-center">
                      +{wallet.availableOrders.length - 5} pedidos adicionais
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico de Pagamentos */}
          <Card className="bg-[#0f0f0f] border-[#252525]">
            <CardHeader>
              <CardTitle className="text-xl text-white">Últimos Pagamentos Recebidos</CardTitle>
              <p className="text-sm text-gray-400">
                Histórico dos seus pagamentos processados
              </p>
            </CardHeader>
            <CardContent>
              {wallet.recentPayments.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Nenhum pagamento recebido ainda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {wallet.recentPayments.map((payment) => (
                    <div key={payment.id} className="p-4 border border-gray-700 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            <span className="text-sm text-gray-400">
                              {formatDate(payment.paidAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300">
                            {payment.description || 'Pagamento de pedidos'}
                          </p>
                          {payment.referenceId && (
                            <p className="text-xs text-gray-500">
                              Ref: {payment.referenceId}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-green-400">
                            {formatCurrency(payment.amount)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {payment.orderCount} unidade(s)
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>


        </div>
      </div>
    </SupplierLayout>
  );
}