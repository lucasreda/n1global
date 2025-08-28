import { InvestmentLayout } from "@/components/investment/investment-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  BarChart3, 
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface InvestorDashboardData {
  totalInvested: number;
  currentValue: number;
  totalReturns: number;
  returnRate: number;
  monthlyReturn: number;
  nextPaymentAmount: number;
  nextPaymentDate: string;
  poolPerformance: {
    poolName: string;
    totalValue: number;
    monthlyReturn: number;
    yearlyReturn: number;
    riskLevel: string;
  };
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    date: string;
    status: string;
    description: string;
  }>;
}

export default function InvestmentDashboard() {
  const { data: dashboardData, isLoading } = useQuery<InvestorDashboardData>({
    queryKey: ["/api/investment/dashboard"],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowUpRight className="h-4 w-4 text-green-400" />;
      case 'withdrawal':
        return <ArrowDownRight className="h-4 w-4 text-red-400" />;
      case 'return_payment':
        return <TrendingUp className="h-4 w-4 text-blue-400" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'high':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <InvestmentLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="font-bold tracking-tight text-gray-900 dark:text-gray-100" style={{ fontSize: '22px' }}>
            Dashboard de Investimentos
          </h1>
          <p className="text-muted-foreground mt-2">
            Acompanhe seus investimentos e performance em tempo real
          </p>
        </div>

        {/* Main Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">
                {isLoading ? "..." : formatCurrency(dashboardData?.totalInvested || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Principal aplicado
              </p>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Atual</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {isLoading ? "..." : formatCurrency(dashboardData?.currentValue || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Valor atualizado do portfolio
              </p>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rentabilidade</CardTitle>
              <BarChart3 className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">
                {isLoading ? "..." : formatPercentage(dashboardData?.returnRate || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {formatCurrency(dashboardData?.totalReturns || 0)} em ganhos
              </p>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próximo Pagamento</CardTitle>
              <Calendar className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">
                {isLoading ? "..." : formatCurrency(dashboardData?.nextPaymentAmount || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {dashboardData?.nextPaymentDate ? formatDate(dashboardData.nextPaymentDate) : 'Próximo mês'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pool Performance */}
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}} className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2" style={{ fontSize: '20px' }}>
                <PieChart className="h-5 w-5" />
                Performance do Pool
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-gray-400">Carregando...</p>
                </div>
              ) : dashboardData?.poolPerformance ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">
                      {dashboardData.poolPerformance.poolName}
                    </h3>
                    <Badge className={getRiskColor(dashboardData.poolPerformance.riskLevel)}>
                      Risco {dashboardData.poolPerformance.riskLevel.charAt(0).toUpperCase() + dashboardData.poolPerformance.riskLevel.slice(1)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Valor Total</p>
                      <p className="text-xl font-bold text-white">
                        {formatCurrency(dashboardData.poolPerformance.totalValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Retorno Mensal</p>
                      <p className="text-xl font-bold text-green-400">
                        {formatPercentage(dashboardData.poolPerformance.monthlyReturn / 100)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Retorno Anual</p>
                      <p className="text-xl font-bold text-blue-400">
                        {formatPercentage(dashboardData.poolPerformance.yearlyReturn / 100)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      Ver Detalhes Completos
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">Nenhum investimento ativo</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader>
              <CardTitle className="text-white" style={{ fontSize: '20px' }}>
                Transações Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-800 rounded w-1/2 mt-1"></div>
                    </div>
                  ))}
                </div>
              ) : dashboardData?.recentTransactions && dashboardData.recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.recentTransactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border border-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <p className="text-sm font-medium text-white">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDate(transaction.date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          transaction.type === 'deposit' ? 'text-green-400' : 
                          transaction.type === 'withdrawal' ? 'text-red-400' : 
                          'text-blue-400'
                        }`}>
                          {transaction.type === 'withdrawal' ? '-' : '+'}
                          {formatCurrency(transaction.amount)}
                        </p>
                        <Badge variant="outline" className={getStatusColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  <Button variant="outline" className="w-full mt-4">
                    Ver Todas as Transações
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Nenhuma transação recente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </InvestmentLayout>
  );
}