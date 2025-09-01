import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Calendar, Users, Target, Activity, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PoolDetails {
  pool: {
    id: string;
    name: string;
    slug: string;
    description: string;
    totalValue: number;
    totalInvested: number;
    monthlyReturn: number;
    yearlyReturn: number;
    status: string;
    minInvestment: number;
    currency: string;
    riskLevel: string;
    investmentStrategy: string;
    createdAt: string;
  };
  investment?: {
    id: string;
    totalInvested: number;
    currentValue: number;
    totalReturns: number;
    totalPaidOut: number;
    returnRate: number;
    monthlyReturn: number;
    status: string;
    firstInvestmentDate: string;
  };
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    description: string;
    paymentMethod?: string;
    createdAt: string;
  }>;
  performanceHistory: Array<{
    date: string;
    totalValue: number;
    monthlyReturn: number;
  }>;
  statistics: {
    totalInvestors: number;
    totalInvested: number;
    avgInvestment: number;
    totalReturns: number;
  };
}

const formatCurrency = (amount: number, currency: string = 'BRL') => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount / 100);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('pt-BR');
};

const getRiskBadgeVariant = (riskLevel: string) => {
  switch (riskLevel.toLowerCase()) {
    case 'low': return 'secondary';
    case 'medium': return 'default';
    case 'high': return 'destructive';
    default: return 'default';
  }
};

const getRiskLabel = (riskLevel: string) => {
  switch (riskLevel.toLowerCase()) {
    case 'low': return 'Risco Baixo';
    case 'medium': return 'Risco Médio';
    case 'high': return 'Risco Alto';
    default: return riskLevel;
  }
};

const getTransactionTypeLabel = (type: string) => {
  switch (type.toLowerCase()) {
    case 'investment': return 'Investimento';
    case 'return': return 'Retorno';
    case 'withdrawal': return 'Saque';
    case 'fee': return 'Taxa';
    default: return type;
  }
};

const getTransactionIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'investment': return <TrendingUp className="w-4 h-4 text-green-500" />;
    case 'return': return <DollarSign className="w-4 h-4 text-blue-500" />;
    case 'withdrawal': return <TrendingDown className="w-4 h-4 text-red-500" />;
    case 'fee': return <AlertCircle className="w-4 h-4 text-orange-500" />;
    default: return <Activity className="w-4 h-4 text-gray-500" />;
  }
};

export function PoolDetailsPage() {
  const { slug } = useParams();

  const { data, isLoading, error } = useQuery<PoolDetails>({
    queryKey: ['/api/investment/pools', slug],
    queryFn: () => fetch(`/api/investment/pools/${slug}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    }).then(res => {
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Pool não encontrada');
        }
        throw new Error('Erro ao carregar detalhes da pool');
      }
      return res.json();
    }),
    enabled: !!slug
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-700 rounded w-1/4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-96 bg-gray-700 rounded-lg"></div>
              </div>
              <div className="space-y-6">
                <div className="h-48 bg-gray-700 rounded-lg"></div>
                <div className="h-48 bg-gray-700 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Pool não encontrada</h2>
              <p className="text-gray-400 mb-4">
                {error?.message || 'A pool de investimento que você está procurando não foi encontrada.'}
              </p>
              <Link href="/investment">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Back Button */}
        <div className="flex items-center">
          <Link href="/investment">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">{data.pool.name}</h1>
            <p className="text-gray-400 mt-1">{data.pool.description}</p>
          </div>
          <Badge variant={getRiskBadgeVariant(data.pool.riskLevel)}>
            {getRiskLabel(data.pool.riskLevel)}
          </Badge>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts and Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Chart */}
            <Card className="bg-black/20 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Performance da Pool</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.performanceHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9CA3AF"
                        tickFormatter={(date) => formatDate(date)}
                      />
                      <YAxis stroke="#9CA3AF" tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                        formatter={(value: number) => [`${value.toFixed(2)}%`, 'Retorno Mensal']}
                        labelFormatter={(label) => formatDate(label)}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="monthlyReturn" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pool Strategy */}
            {data.pool.investmentStrategy && (
              <Card className="bg-black/20 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Estratégia de Investimento</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">{data.pool.investmentStrategy}</p>
                </CardContent>
              </Card>
            )}

            {/* Transactions History */}
            <Card className="bg-black/20 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Histórico de Transações</CardTitle>
              </CardHeader>
              <CardContent>
                {data.transactions.length > 0 ? (
                  <div className="space-y-4">
                    {data.transactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getTransactionIcon(transaction.type)}
                          <div>
                            <p className="text-white font-medium">{getTransactionTypeLabel(transaction.type)}</p>
                            <p className="text-gray-400 text-sm">{formatDate(transaction.createdAt)}</p>
                            {transaction.description && (
                              <p className="text-gray-500 text-xs">{transaction.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${transaction.type === 'withdrawal' || transaction.type === 'fee' 
                            ? 'text-red-400' : 'text-green-400'}`}>
                            {transaction.type === 'withdrawal' || transaction.type === 'fee' ? '-' : '+'}
                            {formatCurrency(transaction.amount, data.pool.currency)}
                          </p>
                          <p className="text-gray-400 text-sm capitalize">{transaction.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">Nenhuma transação encontrada</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary Cards */}
          <div className="space-y-6">
            {/* Your Investment */}
            {data.investment ? (
              <Card className="bg-black/20 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Seu Investimento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Valor Investido</span>
                    <span className="text-white font-semibold">
                      {formatCurrency(data.investment.totalInvested, data.pool.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Valor Atual</span>
                    <span className="text-white font-semibold">
                      {formatCurrency(data.investment.currentValue, data.pool.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Retorno Total</span>
                    <span className={`font-semibold ${data.investment.totalReturns >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {data.investment.totalReturns >= 0 ? '+' : ''}{formatCurrency(data.investment.totalReturns, data.pool.currency)}
                    </span>
                  </div>
                  <Separator className="bg-white/10" />
                  <div className="flex justify-between">
                    <span className="text-gray-400">Taxa de Retorno</span>
                    <span className={`font-semibold ${data.investment.returnRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {data.investment.returnRate >= 0 ? '+' : ''}{data.investment.returnRate.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Primeiro Investimento</span>
                    <span className="text-white text-sm">
                      {formatDate(data.investment.firstInvestmentDate)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-black/20 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Investir nesta Pool</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-400">Você ainda não investiu nesta pool.</p>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Investimento Mínimo</span>
                    <span className="text-white font-semibold">
                      {formatCurrency(data.pool.minInvestment, data.pool.currency)}
                    </span>
                  </div>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    Investir Agora
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Pool Statistics */}
            <Card className="bg-black/20 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Estatísticas da Pool</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Total de Investidores</span>
                  </div>
                  <span className="text-white font-semibold">{data.statistics.totalInvestors}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Total Investido</span>
                  </div>
                  <span className="text-white font-semibold">
                    {formatCurrency(data.statistics.totalInvested, data.pool.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Investimento Médio</span>
                  </div>
                  <span className="text-white font-semibold">
                    {formatCurrency(data.statistics.avgInvestment, data.pool.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Retorno Total Gerado</span>
                  </div>
                  <span className="text-green-400 font-semibold">
                    {formatCurrency(data.statistics.totalReturns, data.pool.currency)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Pool Performance */}
            <Card className="bg-black/20 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Retorno Mensal</span>
                  <span className={`font-semibold ${data.pool.monthlyReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {data.pool.monthlyReturn >= 0 ? '+' : ''}{data.pool.monthlyReturn.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Retorno Anual</span>
                  <span className={`font-semibold ${data.pool.yearlyReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {data.pool.yearlyReturn >= 0 ? '+' : ''}{data.pool.yearlyReturn.toFixed(2)}%
                  </span>
                </div>
                <Separator className="bg-white/10" />
                <div className="flex justify-between">
                  <span className="text-gray-400">Valor Total da Pool</span>
                  <span className="text-white font-semibold">
                    {formatCurrency(data.pool.totalValue, data.pool.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <Badge variant={data.pool.status === 'active' ? 'default' : 'secondary'}>
                    {data.pool.status === 'active' ? 'Ativa' : data.pool.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}