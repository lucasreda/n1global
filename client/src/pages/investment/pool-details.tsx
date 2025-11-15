import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Calendar, Users, Target, Activity, AlertCircle, FileText, PieChart, Calculator, Shield, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { InvestmentLayout } from "@/components/investment/investment-layout";

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
    
    // Legal Documentation
    cnpj?: string;
    cvmRegistration?: string;
    auditReport?: string;
    
    // Portfolio Composition
    portfolioComposition?: Array<{
      asset: string;
      percentage: number;
      amount: number;
    }>;
    
    // Fiscal Performance
    managementFeeRate?: number;
    administrativeExpenses?: number;
    irRetentionHistory?: Array<{
      period: string;
      amount: number;
      rate: number;
    }>;
    benchmarkIndex?: string;
    comeCotasRate?: number;
    
    // Operational Transparency
    custodyProvider?: string;
    liquidationProcess?: string;
    monthlyReports?: Array<{
      month: string;
      url: string;
      performance: number;
    }>;
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
      <InvestmentLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-700 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-700 rounded-lg"></div>
        </div>
      </InvestmentLayout>
    );
  }

  if (error || !data) {
    return (
      <InvestmentLayout>
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
      </InvestmentLayout>
    );
  }

  return (
    <InvestmentLayout>
      <div className="space-y-6">
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
          <Badge variant={getRiskBadgeVariant(data.pool.riskLevel)} className="flex items-center justify-center text-center text-white">
            {getRiskLabel(data.pool.riskLevel)}
          </Badge>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pool Value */}
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500/50 to-blue-500/20"></div>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Valor da Pool</span>
                <div className="p-1.5 rounded-full bg-blue-500/10">
                  <Target className="h-3 w-3 text-blue-400" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-white mb-1">
                {formatCurrency(data.pool.totalValue, data.pool.currency)}
              </div>
              <p className="text-xs text-gray-500">
                Valor total da pool
              </p>
            </CardContent>
          </Card>

          {/* Monthly Return */}
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-green-500/50 to-green-500/20"></div>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Retorno Mensal</span>
                <div className="p-1.5 rounded-full bg-green-500/10">
                  <TrendingUp className="h-3 w-3 text-green-400" />
                </div>
              </div>
              <div className={`text-2xl font-semibold mb-1 ${data.pool.monthlyReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {data.pool.monthlyReturn >= 0 ? '+' : ''}{data.pool.monthlyReturn.toFixed(2)}%
              </div>
              <p className="text-xs text-gray-500">
                Performance mensal
              </p>
            </CardContent>
          </Card>

          {/* Yearly Return */}
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500/50 to-blue-500/20"></div>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Retorno Anual</span>
                <div className="p-1.5 rounded-full bg-blue-500/10">
                  <BarChart3 className="h-3 w-3 text-blue-400" />
                </div>
              </div>
              <div className={`text-2xl font-semibold mb-1 ${data.pool.yearlyReturn >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {data.pool.yearlyReturn >= 0 ? '+' : ''}{data.pool.yearlyReturn.toFixed(2)}%
              </div>
              <p className="text-xs text-gray-500">
                Performance anual
              </p>
            </CardContent>
          </Card>

          {/* Total Investors */}
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-500/50 to-purple-500/20"></div>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Investidores</span>
                <div className="p-1.5 rounded-full bg-purple-500/10">
                  <Users className="h-3 w-3 text-purple-400" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-white mb-1">
                {data.statistics.totalInvestors}
              </div>
              <p className="text-xs text-gray-500">
                Total de investidores
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Chart - Full Width */}
        <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader>
            <CardTitle className="text-white" style={{ fontSize: '20px' }}>
              Performance Histórica
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.performanceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#666"
                    tickFormatter={(date) => formatDate(date)}
                  />
                  <YAxis stroke="#666" tickFormatter={(value) => `${value}%`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
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
                    activeDot={{ r: 3, stroke: '#10B981', strokeWidth: 1, fill: '#10B981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout for Detailed Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Investment Summary or Call to Action */}
            {data.investment ? (
              <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
                <CardHeader>
                  <CardTitle className="text-white" style={{ fontSize: '20px' }}>
                    Meu Investimento
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Investido</p>
                      <p className="text-lg font-semibold text-white">
                        {formatCurrency(data.investment.totalInvested, data.pool.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Valor Atual</p>
                      <p className="text-lg font-semibold text-white">
                        {formatCurrency(data.investment.currentValue, data.pool.currency)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Retorno</p>
                      <p className={`text-lg font-semibold ${data.investment.totalReturns >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {data.investment.totalReturns >= 0 ? '+' : ''}{formatCurrency(data.investment.totalReturns, data.pool.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Taxa</p>
                      <p className={`text-lg font-semibold ${data.investment.returnRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {data.investment.returnRate >= 0 ? '+' : ''}{data.investment.returnRate.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
                <CardHeader>
                  <CardTitle className="text-white" style={{ fontSize: '20px' }}>
                    Investir nesta Pool
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
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

            {/* Legal Documentation */}
            <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2" style={{ fontSize: '20px' }}>
                  <FileText className="w-5 h-5" />
                  <span>Documentação Legal</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {data.pool.cnpj && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">CNPJ</span>
                    <span className="text-white font-mono">{data.pool.cnpj}</span>
                  </div>
                )}
                {data.pool.cvmRegistration && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Registro CVM</span>
                    <span className="text-white">{data.pool.cvmRegistration}</span>
                  </div>
                )}
                {data.pool.auditReport && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Auditoria</span>
                    <a 
                      href={data.pool.auditReport} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      Relatório 2024
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Portfolio Composition */}
            <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2" style={{ fontSize: '20px' }}>
                  <PieChart className="w-5 h-5" />
                  <span>Composição da Carteira</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {data.pool.portfolioComposition && data.pool.portfolioComposition.length > 0 ? (
                  data.pool.portfolioComposition.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">{item.asset}</span>
                        <span className="text-white font-semibold">{item.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <div className="text-right">
                        <span className="text-gray-400 text-sm">
                          {formatCurrency(item.amount, data.pool.currency)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400">Informações da carteira não disponíveis</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Pool Statistics */}
            <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
              <CardHeader>
                <CardTitle className="text-white" style={{ fontSize: '20px' }}>
                  Estatísticas da Pool
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Total Investido</p>
                    <p className="text-lg font-semibold text-white">
                      {formatCurrency(data.statistics.totalInvested, data.pool.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Inv. Médio</p>
                    <p className="text-lg font-semibold text-white">
                      {formatCurrency(data.statistics.avgInvestment, data.pool.currency)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Retorno Total Gerado</p>
                  <p className="text-lg font-semibold text-green-400">
                    {formatCurrency(data.statistics.totalReturns, data.pool.currency)}
                  </p>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-400">Status</span>
                  <Badge variant={data.pool.status === 'active' ? 'default' : 'secondary'} className="text-white">
                    {data.pool.status === 'active' ? 'Ativa' : data.pool.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Fiscal Performance */}
            <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2" style={{ fontSize: '20px' }}>
                  <Calculator className="w-5 h-5" />
                  <span>Performance Fiscal</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Taxa Admin.</p>
                    <p className="text-lg font-semibold text-white">
                      {((data.pool.managementFeeRate || 0) * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Benchmark</p>
                    <p className="text-lg font-semibold text-white">{data.pool.benchmarkIndex || 'CDI'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Despesas Admin.</p>
                  <p className="text-lg font-semibold text-white">
                    {formatCurrency(data.pool.administrativeExpenses || 0, data.pool.currency)}
                  </p>
                </div>
                <Separator className="bg-white/10" />
                <div className="space-y-2">
                  <span className="text-gray-400 text-sm">Últimas Retenções de IR</span>
                  {data.pool.irRetentionHistory && data.pool.irRetentionHistory.length > 0 ? (
                    data.pool.irRetentionHistory.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-400">{item.period}</span>
                        <span className="text-white">
                          {formatCurrency(item.amount, data.pool.currency)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm">Sem retenções registradas</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Operational Transparency */}
            <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2" style={{ fontSize: '20px' }}>
                  <Shield className="w-5 h-5" />
                  <span>Transparência Operacional</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {data.pool.custodyProvider && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Custodiante</span>
                    <span className="text-white">{data.pool.custodyProvider}</span>
                  </div>
                )}
                {data.pool.liquidationProcess && (
                  <div className="space-y-2">
                    <span className="text-gray-400">Processo de Liquidação</span>
                    <p className="text-white text-sm bg-gray-800/50 p-3 rounded">
                      {data.pool.liquidationProcess}
                    </p>
                  </div>
                )}
                <Separator className="bg-white/10" />
                <div className="space-y-2">
                  <span className="text-gray-400 text-sm">Relatórios Mensais</span>
                  {data.pool.monthlyReports && data.pool.monthlyReports.length > 0 ? (
                    data.pool.monthlyReports.slice(0, 3).map((report, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <a 
                          href={report.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          {report.month}
                        </a>
                        <span className={`font-semibold ${report.performance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {report.performance >= 0 ? '+' : ''}{report.performance.toFixed(1)}%
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm">Relatórios em breve</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </InvestmentLayout>
  );
}