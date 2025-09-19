import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useQuery } from "@tanstack/react-query";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Target, DollarSign, Clock } from "lucide-react";

export default function Analytics() {
  const { selectedOperation } = useCurrentOperation();
  const [selectedFunnel, setSelectedFunnel] = useState<string>("all");

  // Fetch available funnels for the current operation
  const { data: funnelsData } = useQuery({
    queryKey: ["/api/funnels", { operationId: selectedOperation?.id }],
    enabled: !!selectedOperation,
  });

  // Fetch analytics data for selected funnel
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: [`/api/analytics/funnels/${selectedFunnel}/analytics`, { 
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), 
      endDate: new Date().toISOString(),
      period: 'daily'
    }],
    enabled: selectedFunnel !== "all" && !!selectedOperation && !!selectedFunnel,
  });

  const analytics = analyticsData?.data;
  const availableFunnels = funnelsData?.funnels || [];

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title="Analytics Avançado" 
        subtitle="Análise completa de performance dos funnels de conversão" 
      />

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Select value={selectedFunnel} onValueChange={setSelectedFunnel}>
          <SelectTrigger className="w-[200px]" data-testid="select-funnel">
            <SelectValue placeholder="Selecionar Funil" />
          </SelectTrigger>
          <SelectContent>
            {availableFunnels.length === 0 ? (
              <SelectItem value="none" disabled>Nenhum funil disponível</SelectItem>
            ) : (
              availableFunnels.map((funnel: any) => (
                <SelectItem key={funnel.id} value={funnel.id}>
                  {funnel.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="glassmorphism rounded-2xl p-8 text-center">
          <div className="text-white text-lg">Carregando dados de analytics...</div>
        </div>
      )}

      {/* Empty State */}
      {!analytics && !isLoading && selectedFunnel !== "all" && (
        <div className="glassmorphism rounded-2xl p-8 text-center">
          <div className="text-white text-lg mb-2">Nenhum dado encontrado</div>
          <div className="text-gray-400">Selecione um funil para ver os dados de analytics</div>
        </div>
      )}

      {/* Default State */}
      {selectedFunnel === "all" && (
        <div className="glassmorphism rounded-2xl p-8 text-center">
          <div className="text-white text-lg mb-2">Selecione um Funil</div>
          <div className="text-gray-400">Escolha um funil específico para ver dados detalhados de analytics</div>
        </div>
      )}

      {/* Analytics Dashboard */}
      {analytics && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glassmorphism border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Total de Sessões</CardTitle>
                <Users className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white" data-testid="text-total-sessions">
                  {analytics.overview.totalSessions?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-gray-400">
                  Últimos 30 dias
                </p>
              </CardContent>
            </Card>

            <Card className="glassmorphism border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Taxa de Conversão</CardTitle>
                <Target className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white" data-testid="text-conversion-rate">
                  {analytics.overview.conversionRate?.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-gray-400">
                  Conversões / Sessões
                </p>
              </CardContent>
            </Card>

            <Card className="glassmorphism border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Receita Total</CardTitle>
                <DollarSign className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white" data-testid="text-total-revenue">
                  {formatCurrency(analytics.overview.totalRevenue || 0)}
                </div>
                <p className="text-xs text-gray-400">
                  Receita gerada
                </p>
              </CardContent>
            </Card>

            <Card className="glassmorphism border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Duração Média</CardTitle>
                <Clock className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white" data-testid="text-avg-duration">
                  {Math.round((analytics.overview.avgSessionDuration || 0) / 60)}m
                </div>
                <p className="text-xs text-gray-400">
                  Tempo por sessão
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Summary Card */}
          <Card className="glassmorphism border-0">
            <CardHeader>
              <CardTitle className="text-white">Resumo de Performance</CardTitle>
              <CardDescription className="text-gray-400">
                Dados principais do funil selecionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="text-2xl font-bold text-blue-400 mb-1">
                    {analytics.overview.uniqueVisitors?.toLocaleString() || 0}
                  </div>
                  <div className="text-sm text-gray-300">Visitantes Únicos</div>
                </div>
                
                <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="text-2xl font-bold text-green-400 mb-1">
                    {analytics.overview.conversions?.toLocaleString() || 0}
                  </div>
                  <div className="text-sm text-gray-300">Conversões</div>
                </div>
                
                <div className="text-center p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="text-2xl font-bold text-red-400 mb-1">
                    {analytics.overview.bounceRate?.toFixed(1) || 0}%
                  </div>
                  <div className="text-sm text-gray-300">Taxa de Rejeição</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Traffic Sources */}
          {analytics.trafficSources && Object.keys(analytics.trafficSources).length > 0 && (
            <Card className="glassmorphism border-0">
              <CardHeader>
                <CardTitle className="text-white">Fontes de Tráfego</CardTitle>
                <CardDescription className="text-gray-400">
                  Origem dos visitantes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.trafficSources).map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
                      <span className="text-white font-medium capitalize">{source}</span>
                      <span className="text-blue-400 font-bold">{count}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}