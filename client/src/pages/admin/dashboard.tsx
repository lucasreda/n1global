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
        <Card className="backdrop-blur-sm text-white" style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{adminStats?.totalUsers || 0}</div>
            <p className="text-xs text-gray-400">
              usuários no sistema
            </p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm text-white" style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Operações</CardTitle>
            <Building2 className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{adminStats?.totalOperations || 0}</div>
            <p className="text-xs text-gray-400">
              operações ativas
            </p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm text-white" style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Pedidos Totais</CardTitle>
            <ShoppingCart className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{adminStats?.totalOrders || 0}</div>
            <p className="text-xs text-gray-400">
              pedidos processados
            </p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm text-white" style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Receita Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              €{(adminStats?.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-400">
              receita acumulada
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Stores Today */}
        <Card className="backdrop-blur-sm text-white" style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <Trophy className="h-5 w-5 text-yellow-400" />
              Top Operações Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {adminStats?.topStoresToday && adminStats.topStoresToday.length > 0 ? (
                adminStats.topStoresToday.map((store, index) => (
                  <div key={store.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400 min-w-[24px]">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm text-white">{store.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-white">{store.todayOrders}</p>
                      <p className="text-xs text-gray-400">pedidos</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400 py-4">
                  Nenhum pedido hoje
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Operations Global */}
        <Card className="backdrop-blur-sm text-white" style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <TrendingUp className="h-5 w-5 text-green-400" />
              Top Operações Global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {adminStats?.topStoresGlobal && adminStats.topStoresGlobal.length > 0 ? (
                adminStats.topStoresGlobal.map((store, index) => (
                  <div key={store.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400 min-w-[24px]">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm text-white">{store.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-white">{store.totalOrders}</p>
                      <p className="text-xs text-gray-400">pedidos</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400 py-4">
                  Nenhuma loja encontrada
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders by Country */}
      {adminStats?.ordersByCountry && adminStats.ordersByCountry.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Pedidos por País</h3>
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
                  'Poland': '🇵🇱',
                  'United Kingdom': '🇬🇧',
                  'Netherlands': '🇳🇱',
                  'Belgium': '🇧🇪',
                  'Austria': '🇦🇹',
                  'Switzerland': '🇨🇭',
                  'Czech Republic': '🇨🇿',
                  'Slovakia': '🇸🇰',
                  'Hungary': '🇭🇺',
                  'Romania': '🇷🇴',
                  'Bulgaria': '🇧🇬',
                  'Greece': '🇬🇷',
                  'Croatia': '🇭🇷',
                  'Slovenia': '🇸🇮',
                  'Sweden': '🇸🇪',
                  'Norway': '🇳🇴',
                  'Denmark': '🇩🇰',
                  'Finland': '🇫🇮',
                  'Ireland': '🇮🇪',
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
                <div key={country.country} className="text-center p-3 bg-black/30 backdrop-blur-sm border border-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <span className="text-xl">{getCountryFlag(country.country)}</span>
                    <p className="text-lg font-bold text-white">{country.orders}</p>
                  </div>
                  <p className="text-sm text-gray-400">{country.country}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}