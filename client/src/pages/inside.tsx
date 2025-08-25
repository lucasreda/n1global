import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  Building2, 
  ShoppingCart, 
  TrendingUp, 
  Calendar,
  Search,
  Filter,
  Download,
  Eye
} from "lucide-react";

interface AdminStats {
  totalStores: number;
  totalOperations: number;
  totalOrders: number;
  totalRevenue: number;
  recentStores: Array<{
    id: string;
    name: string;
    operationsCount: number;
    ordersCount: number;
    revenue: number;
    lastActivity: string;
  }>;
}

interface GlobalOrder {
  id: string;
  storeId: string;
  storeName: string;
  operationId: string;
  operationName: string;
  customerName: string;
  customerPhone: string;
  status: string;
  amount: number;
  currency: string;
  orderDate: string;
  provider: string;
  dataSource: string;
}

export default function InsidePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedOperation, setSelectedOperation] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30d");
  const [selectedTab, setSelectedTab] = useState("overview");

  const { data: adminStats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    enabled: true
  });

  const { data: globalOrders, isLoading: ordersLoading } = useQuery<GlobalOrder[]>({
    queryKey: ['/api/admin/orders', searchTerm, selectedStore, selectedOperation, dateRange],
    enabled: selectedTab === "orders"
  });

  const { data: stores } = useQuery<Array<{ id: string; name: string; operationsCount: number }>>({
    queryKey: ['/api/admin/stores'],
    enabled: true
  });

  const { data: operations } = useQuery<Array<{ id: string; name: string; storeId: string; storeName: string }>>({
    queryKey: ['/api/admin/operations', selectedStore],
    enabled: selectedStore !== "all"
  });

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'delivered': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'cancelled': 'bg-red-100 text-red-800',
      'shipped': 'bg-blue-100 text-blue-800',
      'returned': 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white">Carregando painel administrativo...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Painel Administrativo</h1>
          <p className="text-slate-300">Visão global de todas as operações e dados do sistema</p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="stores" className="data-[state=active]:bg-blue-600">
              Lojas & Operações
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-blue-600">
              Pedidos Globais
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-200">Total de Lojas</CardTitle>
                  <Building2 className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{adminStats?.totalStores || 0}</div>
                  <p className="text-xs text-slate-400">Lojas ativas no sistema</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-200">Total de Operações</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{adminStats?.totalOperations || 0}</div>
                  <p className="text-xs text-slate-400">Operações configuradas</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-200">Total de Pedidos</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-orange-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{adminStats?.totalOrders?.toLocaleString() || 0}</div>
                  <p className="text-xs text-slate-400">Pedidos em toda a plataforma</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-200">Receita Total</CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(adminStats?.totalRevenue || 0)}
                  </div>
                  <p className="text-xs text-slate-400">Receita consolidada</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Stores Activity */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-200">Atividade Recente das Lojas</CardTitle>
                <CardDescription className="text-slate-400">
                  Últimas atividades por loja
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {adminStats?.recentStores?.map((store) => (
                    <div key={store.id} className="flex items-center justify-between p-4 border border-slate-700 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{store.name}</p>
                          <p className="text-sm text-slate-400">
                            {store.operationsCount} operações • {store.ordersCount} pedidos
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-white">{formatCurrency(store.revenue)}</p>
                        <p className="text-sm text-slate-400">{formatDate(store.lastActivity)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stores Tab */}
          <TabsContent value="stores" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-200">Lojas e Operações</CardTitle>
                <CardDescription className="text-slate-400">
                  Gerenciamento de todas as lojas e suas operações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stores?.map((store) => (
                    <div key={store.id} className="border border-slate-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-white">{store.name}</h3>
                        <Badge variant="secondary" className="bg-blue-600/20 text-blue-400">
                          {store.operationsCount} operações
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400">ID: {store.id}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            {/* Filters */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-200">Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">Buscar</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Nome, telefone, ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">Loja</label>
                    <Select value={selectedStore} onValueChange={setSelectedStore}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Selecionar loja" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="all">Todas as lojas</SelectItem>
                        {stores?.map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">Operação</label>
                    <Select value={selectedOperation} onValueChange={setSelectedOperation}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Selecionar operação" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="all">Todas as operações</SelectItem>
                        {operations?.map((operation) => (
                          <SelectItem key={operation.id} value={operation.id}>
                            {operation.name} ({operation.storeName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">Período</label>
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="7d">Últimos 7 dias</SelectItem>
                        <SelectItem value="30d">Últimos 30 dias</SelectItem>
                        <SelectItem value="90d">Últimos 90 dias</SelectItem>
                        <SelectItem value="all">Todos os períodos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Orders Table */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-slate-200">Pedidos Globais</CardTitle>
                  <CardDescription className="text-slate-400">
                    Visualização unificada de todos os pedidos
                  </CardDescription>
                </div>
                <Button variant="outline" className="border-slate-600 text-slate-300">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="text-center py-8 text-slate-400">Carregando pedidos...</div>
                ) : (
                  <div className="space-y-4">
                    {globalOrders?.map((order) => (
                      <div key={order.id} className="border border-slate-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-4">
                            <div>
                              <p className="font-medium text-white">{order.customerName}</p>
                              <p className="text-sm text-slate-400">{order.customerPhone}</p>
                            </div>
                            <Separator orientation="vertical" className="h-8 bg-slate-600" />
                            <div>
                              <p className="text-sm text-slate-300">{order.storeName}</p>
                              <p className="text-xs text-slate-400">{order.operationName}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                            <div className="text-right">
                              <p className="font-medium text-white">
                                {formatCurrency(order.amount, order.currency)}
                              </p>
                              <p className="text-xs text-slate-400">
                                {formatDate(order.orderDate)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>ID: {order.id}</span>
                          <span>Fonte: {order.dataSource} | Provider: {order.provider}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}