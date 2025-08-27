import { FinanceLayout } from "@/components/finance/finance-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, BarChart3, PieChart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface PaymentStats {
  pending: { count: number; total: number }; // EUR
  approved: { count: number; total: number }; // BRL
  paid: { count: number; total: number }; // BRL  
  rejected: { count: number; total: number }; // BRL
}

export default function FinanceDashboard() {
  const { data: stats, isLoading } = useQuery<PaymentStats>({
    queryKey: ["/api/finance/payment-stats"],
  });
  return (
    <FinanceLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="font-bold tracking-tight text-gray-900 dark:text-gray-100" style={{ fontSize: '22px' }}>
            Dashboard Financeiro
          </h1>
          <p className="text-muted-foreground mt-2">
            Visão geral das métricas financeiras e performance
          </p>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pendente</CardTitle>
              <DollarSign className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-yellow-600">
                  {isLoading ? "Carregando..." : `R$ ${((stats?.pending.total || 0) * 6.3).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </div>
                <div className="text-sm text-gray-400">
                  €{stats?.pending.total.toFixed(2) || "0.00"}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats?.pending.count || 0} pagamentos pendentes
              </p>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Aprovado</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-blue-600">
                  {isLoading ? "Carregando..." : `R$ ${(stats?.approved.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </div>
                <div className="text-sm text-gray-400">
                  €{((stats?.approved.total || 0) / 6.3).toFixed(2)}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats?.approved.count || 0} pagamentos aprovados
              </p>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
              <CreditCard className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-green-600">
                  {isLoading ? "Carregando..." : `R$ ${(stats?.paid.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </div>
                <div className="text-sm text-gray-400">
                  €{((stats?.paid.total || 0) / 6.3).toFixed(2)}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats?.paid.count || 0} pagamentos realizados
              </p>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rejeitado</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-red-600">
                  {isLoading ? "Carregando..." : `R$ ${(stats?.rejected.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </div>
                <div className="text-sm text-gray-400">
                  €{((stats?.rejected.total || 0) / 6.3).toFixed(2)}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats?.rejected.count || 0} pagamentos rejeitados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Evolução da Receita
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-600 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">Gráfico de receita será implementado</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Distribuição de Custos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-600 rounded-lg">
                <div className="text-center">
                  <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">Gráfico de custos será implementado</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer">
                <h3 className="font-medium text-white mb-2">Registrar Receita</h3>
                <p className="text-sm text-gray-400">Adicionar nova entrada de receita</p>
              </div>
              <div className="p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer">
                <h3 className="font-medium text-white mb-2">Lançar Custo</h3>
                <p className="text-sm text-gray-400">Registrar novos custos operacionais</p>
              </div>
              <div className="p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer">
                <h3 className="font-medium text-white mb-2">Gerar Relatório</h3>
                <p className="text-sm text-gray-400">Criar relatório financeiro personalizado</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FinanceLayout>
  );
}