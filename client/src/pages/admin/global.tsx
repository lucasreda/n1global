import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Globe,
  TrendingUp,
  Building2,
  Users,
  ShoppingCart,
  Package
} from "lucide-react";

interface GlobalStats {
  totalRevenue: number;
  totalOrders: number;
  totalStores: number;
  totalOperations: number;
  totalUsers: number;
  totalProducts: number;
  revenueByCountry: Array<{
    country: string;
    revenue: number;
    orders: number;
  }>;
  topCountries: Array<{
    country: string;
    orders: number;
    revenue: number;
  }>;
  monthlyGrowth: {
    orders: number;
    revenue: number;
    stores: number;
  };
}

export default function AdminGlobal() {
  const { data: globalStats, isLoading: statsLoading } = useQuery<GlobalStats>({
    queryKey: ['/api/admin/global-stats'],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch('/api/admin/global-stats', {
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch global stats');
      }
      
      return response.json();
    }
  });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando estatísticas globais...</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Visão Global
        </h1>
        <p className="text-muted-foreground mt-2">
          Métricas e análises globais do sistema
        </p>
      </div>

      {/* Global Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(globalStats?.totalRevenue || 0)}
            </div>
            {globalStats?.monthlyGrowth?.revenue && (
              <p className={`text-xs ${globalStats.monthlyGrowth.revenue > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(globalStats.monthlyGrowth.revenue)} vs mês anterior
              </p>
            )}
          </CardContent>
        </Card>

        <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(globalStats?.totalOrders || 0).toLocaleString()}</div>
            {globalStats?.monthlyGrowth?.orders && (
              <p className={`text-xs ${globalStats.monthlyGrowth.orders > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(globalStats.monthlyGrowth.orders)} vs mês anterior
              </p>
            )}
          </CardContent>
        </Card>

        <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lojas</CardTitle>
            <Building2 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats?.totalStores || 0}</div>
            {globalStats?.monthlyGrowth?.stores && (
              <p className={`text-xs ${globalStats.monthlyGrowth.stores > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(globalStats.monthlyGrowth.stores)} vs mês anterior
              </p>
            )}
          </CardContent>
        </Card>

        <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operações</CardTitle>
            <Globe className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats?.totalOperations || 0}</div>
            <p className="text-xs text-muted-foreground">operações ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <Users className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">usuários registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos</CardTitle>
            <Package className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats?.totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground">produtos no catálogo</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance by Country */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Countries by Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Países - Receita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {globalStats?.topCountries && globalStats.topCountries.length > 0 ? (
                globalStats.topCountries.map((country, index) => (
                  <div key={country.country} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{country.country}</p>
                        <p className="text-sm text-muted-foreground">
                          {country.orders.toLocaleString()} pedidos
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        {formatCurrency(country.revenue)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum dado disponível
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Distribution by Country */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Distribuição por País
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {globalStats?.revenueByCountry && globalStats.revenueByCountry.length > 0 ? (
                globalStats.revenueByCountry.map((country) => {
                  const totalRevenue = globalStats.totalRevenue || 1;
                  const percentage = (country.revenue / totalRevenue) * 100;
                  
                  return (
                    <div key={country.country} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{country.country}</span>
                        <span className="text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(country.revenue)}</span>
                        <span>{country.orders.toLocaleString()} pedidos</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum dado disponível
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Resumo do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {((globalStats?.totalOrders || 0) / (globalStats?.totalStores || 1)).toFixed(0)}
              </div>
              <p className="text-sm text-muted-foreground">Pedidos por Loja (média)</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {formatCurrency((globalStats?.totalRevenue || 0) / (globalStats?.totalOrders || 1))}
              </div>
              <p className="text-sm text-muted-foreground">Ticket Médio</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {((globalStats?.totalOperations || 0) / (globalStats?.totalStores || 1)).toFixed(1)}
              </div>
              <p className="text-sm text-muted-foreground">Operações por Loja</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}