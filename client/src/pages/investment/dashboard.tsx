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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

  // Dados fictícios para o gráfico de recebimentos mensais
  const monthlyReturnsData = [
    { month: 'Jun', returns: 3190, cumulative: 3190 },
    { month: 'Jul', returns: 3438, cumulative: 6628 },
    { month: 'Ago', returns: 3779, cumulative: 10407 },
    { month: 'Set', returns: 3916, cumulative: 14323 },
    { month: 'Out', returns: 3823, cumulative: 18146 },
    { month: 'Nov', returns: 4087, cumulative: 22233 },
    { month: 'Dez', returns: 4279, cumulative: 26512 },
    { month: 'Jan', returns: 4538, cumulative: 31050 },
    { month: 'Fev', returns: 4741, cumulative: 35791 },
    { month: 'Mar', returns: 4389, cumulative: 40180 },
    { month: 'Abr', returns: 4901, cumulative: 45081 },
    { month: 'Mai', returns: 5137, cumulative: 50218 }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
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
          <h1 className="font-medium tracking-tight text-gray-900 dark:text-gray-100 text-lg md:text-xl">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm mt-1">
            Portfolio Overview
          </p>
        </div>

        {/* Monthly Returns Chart */}
        <div className="mb-2 w-full md:w-1/2">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Recebimentos Mensais</h3>
          <div className="h-32 md:h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyReturnsData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <XAxis 
                  dataKey="month" 
                  stroke="#6B7280"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
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
                  formatter={(value: number) => [`R$${value.toLocaleString()}`, '']}
                  labelStyle={{ color: '#9CA3AF', fontSize: '11px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="returns" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, stroke: '#10B981', strokeWidth: 1, fill: '#10B981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Main Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500/50 to-blue-500/20"></div>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Investido</span>
                <div className="p-1.5 rounded-full bg-blue-500/10">
                  <DollarSign className="h-3 w-3 text-blue-400" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-white mb-1">
                {isLoading ? "..." : formatCurrency(dashboardData?.totalInvested || 0)}
              </div>
              <p className="text-xs text-gray-500">
                Principal aplicado
              </p>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-green-500/50 to-green-500/20"></div>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Valor Atual</span>
                <div className="p-1.5 rounded-full bg-green-500/10">
                  <TrendingUp className="h-3 w-3 text-green-400" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-green-400 mb-1">
                {isLoading ? "..." : formatCurrency(dashboardData?.currentValue || 0)}
              </div>
              <p className="text-xs text-gray-500">
                Portfolio atualizado
              </p>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500/50 to-blue-500/20"></div>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Rentabilidade</span>
                <div className="p-1.5 rounded-full bg-blue-500/10">
                  <BarChart3 className="h-3 w-3 text-blue-400" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-white mb-1">
                {isLoading ? "..." : formatPercentage(dashboardData?.returnRate || 0)}
              </div>
              <p className="text-xs text-gray-500">
                {formatCurrency(dashboardData?.totalReturns || 0)} em ganhos
              </p>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500/50 to-blue-500/20"></div>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Próximo Pagamento</span>
                <div className="p-1.5 rounded-full bg-blue-500/10">
                  <Calendar className="h-3 w-3 text-blue-400" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-white mb-1">
                {isLoading ? "..." : formatCurrency(dashboardData?.nextPaymentAmount || 0)}
              </div>
              <p className="text-xs text-gray-500">
                {dashboardData?.nextPaymentDate ? formatDate(dashboardData.nextPaymentDate) : 'Próximo mês'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pool Performance */}
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}} className="lg:col-span-2">
            <CardContent className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-gray-500">Carregando...</p>
                </div>
              ) : dashboardData?.poolPerformance ? (
                <div className="space-y-4">
                  {/* Pool Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-white">
                        {dashboardData.poolPerformance.poolName}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Fundo de Operações COD
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getRiskColor(dashboardData.poolPerformance.riskLevel)} bg-gray-900 border border-gray-700`}>
                        Risco Baixo
                      </div>
                    </div>
                  </div>
                  
                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Valor Total</p>
                      <p className="text-lg font-semibold text-white">
                        {formatCurrency(dashboardData.poolPerformance.totalValue)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Mensal</p>
                      <p className="text-lg font-semibold text-green-400">
                        +{formatPercentage(dashboardData.poolPerformance.monthlyReturn / 100)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Anual</p>
                      <p className="text-lg font-semibold text-blue-400">
                        +{formatPercentage(dashboardData.poolPerformance.yearlyReturn / 100)}
                      </p>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="pt-2">
                    <button className="text-xs text-gray-400 hover:text-white transition-colors">
                      Ver Detalhes →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">Nenhum investimento ativo</p>
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