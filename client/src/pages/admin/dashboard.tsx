import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Building2, 
  ShoppingCart, 
  TrendingUp,
  Trophy
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalOperations: number;
  totalOrders: number;
  totalRevenue: number;
  topStoresGlobal: Array<{
    id: string;
    name: string;
    storeName: string;
    totalOrders: number;
  }>;
  ordersByCountry: Array<{
    country: string;
    orders: number;
  }>;
  topStoresToday: Array<{
    id: string;
    name: string;
    storeName: string;
    todayOrders: number;
  }>;
  todayShopifyOrders: number;
  monthShopifyOrders: number;
}

export default function AdminDashboard() {
  const { data: adminStats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats']
  });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando estatísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminStats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              usuários no sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operações</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminStats?.totalOperations || 0}</div>
            <p className="text-xs text-muted-foreground">
              operações ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Totais</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminStats?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              pedidos processados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              €{(adminStats?.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              receita acumulada
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Stores Today */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5" />
              Top Lojas Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {adminStats?.topStoresToday && adminStats.topStoresToday.length > 0 ? (
                adminStats.topStoresToday.map((store, index) => (
                  <div key={store.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{store.storeName}</p>
                        <p className="text-xs text-muted-foreground">{store.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{store.todayOrders}</p>
                      <p className="text-xs text-muted-foreground">pedidos</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum pedido hoje
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Stores Global */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Top Lojas Global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {adminStats?.topStoresGlobal && adminStats.topStoresGlobal.length > 0 ? (
                adminStats.topStoresGlobal.map((store, index) => (
                  <div key={store.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{store.storeName}</p>
                        <p className="text-xs text-muted-foreground">{store.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{store.totalOrders}</p>
                      <p className="text-xs text-muted-foreground">pedidos</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Nenhuma loja encontrada
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders by Country */}
      {adminStats?.ordersByCountry && adminStats.ordersByCountry.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pedidos por País</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {adminStats.ordersByCountry.map((country) => {
                const getCountryFlag = (countryName: string) => {
                  const flags: { [key: string]: string } = {
                    'Brazil': '🇧🇷',
                    'Portugal': '🇵🇹',
                    'Spain': '🇪🇸',
                    'France': '🇫🇷',
                    'Germany': '🇩🇪',
                    'Italy': '🇮🇹',
                    'United Kingdom': '🇬🇧',
                    'Netherlands': '🇳🇱',
                    'Belgium': '🇧🇪',
                    'Austria': '🇦🇹',
                    'Switzerland': '🇨🇭',
                    'United States': '🇺🇸',
                    'Canada': '🇨🇦',
                    'Mexico': '🇲🇽',
                    'Argentina': '🇦🇷',
                    'Chile': '🇨🇱',
                    'Colombia': '🇨🇴',
                    'Peru': '🇵🇪',
                    'Uruguay': '🇺🇾',
                    'Ecuador': '🇪🇨'
                  };
                  return flags[countryName] || '🌍';
                };
                
                return (
                  <div key={country.country} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <span className="text-xl">{getCountryFlag(country.country)}</span>
                      <p className="text-lg font-bold">{country.orders}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{country.country}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}