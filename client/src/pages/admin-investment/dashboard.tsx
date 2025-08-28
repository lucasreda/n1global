import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Building2,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Eye
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AdminInvestmentLayout } from "@/components/admin/admin-investment-layout";

interface AdminInvestmentDashboardData {
  totalPools: number;
  totalInvestors: number;
  totalInvested: number;
  totalValue: number;
  monthlyReturns: number;
  activeInvestments: number;
  pendingInvestments: number;
  pools: Array<{
    id: string;
    name: string;
    totalValue: number;
    totalInvested: number;
    investorCount: number;
    monthlyReturn: number;
    riskLevel: string;
    status: string;
  }>;
  recentTransactions: Array<{
    id: string;
    investorName: string;
    poolName: string;
    type: string;
    amount: number;
    date: string;
    status: string;
  }>;
}

export default function AdminInvestmentDashboard() {
  const { data: dashboardData, isLoading } = useQuery<AdminInvestmentDashboardData>({
    queryKey: ["/api/admin-investment/dashboard"],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
      case 'baixo':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'medium':
      case 'medio':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'high':
      case 'alto':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'ativo':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'paused':
      case 'pausado':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'closed':
      case 'fechado':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <AdminInvestmentLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      </AdminInvestmentLayout>
    );
  }

  return (
    <AdminInvestmentLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="font-medium tracking-tight text-gray-900 dark:text-gray-100 text-lg md:text-xl">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm mt-1">
            Gerencie pools e monitore investimentos
          </p>
        </div>

        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-400">Total em Pools</p>
                  <p className="text-lg md:text-xl font-bold text-white whitespace-nowrap overflow-hidden">
                    {formatCurrency(dashboardData?.totalValue || 0)}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <DollarSign className="h-8 w-8 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-400">Investidores Ativos</p>
                  <p className="text-xl md:text-2xl font-bold text-white">
                    {dashboardData?.totalInvestors || 0}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Users className="h-8 w-8 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-400">Pools Ativas</p>
                  <p className="text-xl md:text-2xl font-bold text-white">
                    {dashboardData?.totalPools || 0}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Building2 className="h-8 w-8 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-400">Retorno Mensal</p>
                  <p className="text-lg md:text-xl font-bold text-white whitespace-nowrap overflow-hidden">
                    {formatCurrency(dashboardData?.monthlyReturns || 0)}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <TrendingUp className="h-8 w-8 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pools e Transações */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pools de Investimento */}
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>Pools de Investimento</span>
                <PieChart className="h-5 w-5 text-blue-400" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-800 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : dashboardData?.pools && dashboardData.pools.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.pools.map((pool) => (
                    <div key={pool.id} className="border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-white font-medium">{pool.name}</h4>
                          <p className="text-sm text-gray-400">
                            {pool.investorCount} investidor{pool.investorCount !== 1 ? 'es' : ''}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getRiskColor(pool.riskLevel)}>
                            {pool.riskLevel === 'low' || pool.riskLevel === 'baixo' ? 'Baixo' : 
                             pool.riskLevel === 'medium' || pool.riskLevel === 'medio' ? 'Médio' : 'Alto'}
                          </Badge>
                          <Badge className={getStatusColor(pool.status)}>
                            {pool.status === 'active' || pool.status === 'ativo' ? 'Ativo' : 
                             pool.status === 'paused' || pool.status === 'pausado' ? 'Pausado' : 'Fechado'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-400">Valor Total</p>
                          <p className="text-sm font-medium text-white">
                            {formatCurrency(pool.totalValue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Retorno Mensal</p>
                          <p className="text-sm font-medium text-green-400">
                            {formatPercentage(pool.monthlyReturn)}
                          </p>
                        </div>
                      </div>

                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Nenhuma pool criada ainda</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transações Recentes */}
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>Transações Recentes</span>
                <Activity className="h-5 w-5 text-blue-400" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-800 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : dashboardData?.recentTransactions && dashboardData.recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.recentTransactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border border-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        {transaction.type === 'deposit' ? (
                          <ArrowUpRight className="h-4 w-4 text-green-400" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-blue-400" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-white">
                            {transaction.investorName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {transaction.poolName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          transaction.type === 'deposit' ? 'text-green-400' : 'text-blue-400'
                        }`}>
                          {formatCurrency(transaction.amount)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(transaction.date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
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
    </AdminInvestmentLayout>
  );
}