import { AffiliateLayout } from "@/components/affiliate/affiliate-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  TrendingUp,
  MousePointerClick,
  ShoppingCart,
  DollarSign,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface AffiliateStats {
  totalClicks: number;
  totalConversions: number;
  totalCommission: number;
  conversionRate: number;
  averageOrderValue: number;
  earningsPerClick: number;
  clicksChange: number;
  conversionsChange: number;
  commissionChange: number;
  dailyStats: Array<{
    date: string;
    clicks: number;
    conversions: number;
    commission: number;
  }>;
  productStats: Array<{
    productName: string;
    clicks: number;
    conversions: number;
    commission: number;
  }>;
  sourceStats: Array<{
    source: string;
    clicks: number;
    conversions: number;
  }>;
}

export default function AffiliateAnalytics() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  const { data: stats, isLoading } = useQuery<AffiliateStats>({
    queryKey: ['/api/affiliate/analytics', dateRange],
  });

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

  const formatCurrency = (value: number) => `€${value.toFixed(2)}`;
  const formatNumber = (value: number) => value.toLocaleString('pt-BR');

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    if (change < 0) return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    return null;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-400';
  };

  return (
    <AffiliateLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold tracking-tight text-gray-900 dark:text-gray-100" style={{ fontSize: '22px' }}>
              Analytics
            </h1>
            <p className="text-muted-foreground mt-2">
              Acompanhe o desempenho das suas campanhas e conversões
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={dateRange === '7d' ? 'default' : 'outline'}
              onClick={() => setDateRange('7d')}
              className={dateRange === '7d' ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-700'}
              data-testid="button-range-7d"
            >
              7 dias
            </Button>
            <Button
              size="sm"
              variant={dateRange === '30d' ? 'default' : 'outline'}
              onClick={() => setDateRange('30d')}
              className={dateRange === '30d' ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-700'}
              data-testid="button-range-30d"
            >
              30 dias
            </Button>
            <Button
              size="sm"
              variant={dateRange === '90d' ? 'default' : 'outline'}
              onClick={() => setDateRange('90d')}
              className={dateRange === '90d' ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-700'}
              data-testid="button-range-90d"
            >
              90 dias
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : stats ? (
          <>
            {/* Main Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Total de Clicks</CardTitle>
                  <MousePointerClick className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white" data-testid="text-total-clicks">
                    {formatNumber(stats.totalClicks)}
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {getChangeIcon(stats.clicksChange)}
                    <span className={`text-xs ${getChangeColor(stats.clicksChange)}`}>
                      {stats.clicksChange > 0 ? '+' : ''}{stats.clicksChange.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-500">vs período anterior</span>
                  </div>
                </CardContent>
              </Card>

              <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Conversões</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white" data-testid="text-total-conversions">
                    {formatNumber(stats.totalConversions)}
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {getChangeIcon(stats.conversionsChange)}
                    <span className={`text-xs ${getChangeColor(stats.conversionsChange)}`}>
                      {stats.conversionsChange > 0 ? '+' : ''}{stats.conversionsChange.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-500">vs período anterior</span>
                  </div>
                </CardContent>
              </Card>

              <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Comissão Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white" data-testid="text-total-commission">
                    {formatCurrency(stats.totalCommission)}
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {getChangeIcon(stats.commissionChange)}
                    <span className={`text-xs ${getChangeColor(stats.commissionChange)}`}>
                      {stats.commissionChange > 0 ? '+' : ''}{stats.commissionChange.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-500">vs período anterior</span>
                  </div>
                </CardContent>
              </Card>

              <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Taxa de Conversão</CardTitle>
                  <TrendingUp className="h-4 w-4 text-orange-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white" data-testid="text-conversion-rate">
                    {stats.conversionRate.toFixed(2)}%
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {stats.totalConversions} de {stats.totalClicks} clicks
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Valor Médio do Pedido (AOV)</CardTitle>
                  <BarChart3 className="h-4 w-4 text-cyan-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(stats.averageOrderValue)}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Média de valor por conversão
                  </p>
                </CardContent>
              </Card>

              <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Ganho por Click (EPC)</CardTitle>
                  <Activity className="h-4 w-4 text-pink-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(stats.earningsPerClick)}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Comissão média por click
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Daily Performance Chart */}
            <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  Desempenho Diário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats.dailyStats}>
                    <defs>
                      <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="clicks" stroke="#3b82f6" fillOpacity={1} fill="url(#colorClicks)" name="Clicks" />
                    <Area type="monotone" dataKey="conversions" stroke="#10b981" fillOpacity={1} fill="url(#colorConversions)" name="Conversões" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Product Performance and Sources */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Product Performance */}
              <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-400" />
                    Performance por Produto
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.productStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
                      <XAxis dataKey="productName" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Bar dataKey="clicks" fill="#3b82f6" name="Clicks" />
                      <Bar dataKey="conversions" fill="#10b981" name="Conversões" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Traffic Sources */}
              <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-orange-400" />
                    Fontes de Tráfego
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie
                        data={stats.sourceStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ source, percent }) => `${source}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="clicks"
                      >
                        {stats.sourceStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Commission Trend */}
            <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-400" />
                  Evolução de Comissões
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={stats.dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#252525" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Line type="monotone" dataKey="commission" stroke="#10b981" strokeWidth={2} name="Comissão (€)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Sem dados disponíveis</h3>
                <p className="text-gray-400">
                  Comece a gerar links e fazer vendas para ver suas estatísticas aqui
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AffiliateLayout>
  );
}
