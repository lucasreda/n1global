import { useState, useEffect } from "react";
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
  Eye,
  Package,
  Plus,
  Pencil,
  Trash2,
  LogOut,
  User
} from "lucide-react";
import logoImage from "@assets/INSIDE_1756100933599.png";

interface AdminStats {
  totalUsers: number;
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

interface Product {
  id: string;
  sku: string;
  name: string;
  type: string;
  price: number;
  costPrice: number;
  shippingCost: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export default function InsidePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedOperation, setSelectedOperation] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [selectedTab, setSelectedTab] = useState("overview");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [showAddProduct, setShowAddProduct] = useState(false);
  
  const pageSize = 20;
  
  // Check if user has made any specific selection to enable orders query
  const hasActiveSearch = searchTerm.trim().length > 0 || 
                         selectedStore !== "all" || 
                         selectedOperation !== "all" || 
                         dateRange !== "all";
  

  const { data: adminStats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    enabled: true
  });

  const { data: ordersResponse, isLoading: ordersLoading, error: ordersError } = useQuery<{orders: GlobalOrder[], total: number}>({
    queryKey: ['/api/admin/orders', searchTerm, selectedStore, selectedOperation, dateRange, currentPage],
    enabled: selectedTab === "orders" && hasActiveSearch,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('searchTerm', searchTerm);
      if (selectedStore !== 'all') params.append('storeId', selectedStore);
      if (selectedOperation !== 'all') params.append('operationId', selectedOperation);
      if (dateRange !== 'all') params.append('dateRange', dateRange);
      params.append('limit', pageSize.toString());
      params.append('offset', ((currentPage - 1) * pageSize).toString());
      
      const url = `/api/admin/orders?${params.toString()}`;
      
      const token = localStorage.getItem("auth_token");
      const response = await fetch(url, {
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const orders = await response.json();
      
      // Fazer uma segunda consulta para obter o total de registros
      const countParams = new URLSearchParams();
      if (searchTerm) countParams.append('searchTerm', searchTerm);
      if (selectedStore !== 'all') countParams.append('storeId', selectedStore);
      if (selectedOperation !== 'all') countParams.append('operationId', selectedOperation);
      if (dateRange !== 'all') countParams.append('dateRange', dateRange);
      countParams.append('countOnly', 'true');
      
      const countResponse = await fetch(`/api/admin/orders/count?${countParams.toString()}`, {
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      
      let total = orders.length;
      if (countResponse.ok) {
        const countData = await countResponse.json();
        total = countData.total || 0;
      }
      
      return { orders, total };
    }
  });
  
  const globalOrders = ordersResponse?.orders || [];
  const totalPages = Math.ceil((ordersResponse?.total || 0) / pageSize);

  useEffect(() => {
    if (ordersResponse) {
      setTotalOrders(ordersResponse.total);
    }
  }, [ordersResponse]);
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStore, selectedOperation, dateRange]);

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
      <div className="min-h-screen admin-background flex items-center justify-center">
        <div className="text-white">Carregando painel administrativo...</div>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen admin-background">
      {/* Header */}
<div className="border-b border-white/5">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo na esquerda */}
            <div className="flex items-center">
              <img 
                src={logoImage} 
                alt="Logo" 
                className="h-12 w-auto object-contain"
              />
            </div>
            
            {/* Usuário e logout na direita */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-white">
                <User className="h-4 w-4" />
                <span className="text-sm">super@admin.com</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-white hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Painel Administrativo</h1>
          <p className="text-slate-300">Visão global de todas as operações e dados do sistema</p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/10 border border-white/20 backdrop-blur-md">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="stores" className="data-[state=active]:bg-blue-600">
              Lojas & Operações
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-blue-600">
              Pedidos Globais
            </TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:bg-blue-600">
              Produtos
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white/10 border-white/20 backdrop-blur-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-200">Total de Usuários</CardTitle>
                  <Users className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{adminStats?.totalUsers || 0}</div>
                  <p className="text-xs text-slate-400">Contas de usuário no sistema</p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 border-white/20 backdrop-blur-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-200">Total de Operações</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{adminStats?.totalOperations || 0}</div>
                  <p className="text-xs text-slate-400">Operações configuradas</p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 border-white/20 backdrop-blur-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-200">Total de Pedidos</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-orange-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{adminStats?.totalOrders?.toLocaleString() || 0}</div>
                  <p className="text-xs text-slate-400">Pedidos em toda a plataforma</p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 border-white/20 backdrop-blur-md">
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
            <Card className="bg-white/10 border-white/20 backdrop-blur-md">
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
            <Card className="bg-white/10 border-white/20 backdrop-blur-md">
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
            <Card className="bg-white/10 border-white/20 backdrop-blur-md">
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
                      <SelectTrigger className="bg-white/10 border-white/20 text-white backdrop-blur-sm">
                        <SelectValue placeholder="Selecionar loja" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/80 border-white/20 backdrop-blur-md">
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
                      <SelectTrigger className="bg-white/10 border-white/20 text-white backdrop-blur-sm">
                        <SelectValue placeholder="Selecionar operação" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/80 border-white/20 backdrop-blur-md">
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
                      <SelectTrigger className="bg-white/10 border-white/20 text-white backdrop-blur-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black/80 border-white/20 backdrop-blur-md">
                        <SelectItem value="all">Selecionar período</SelectItem>
                        <SelectItem value="7d">Últimos 7 dias</SelectItem>
                        <SelectItem value="30d">Últimos 30 dias</SelectItem>
                        <SelectItem value="90d">Últimos 90 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Orders Table */}
            <Card className="bg-white/10 border-white/20 backdrop-blur-md">
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
                {!hasActiveSearch ? (
                  <div className="text-center py-12 space-y-4">
                    <Search className="h-12 w-12 text-slate-500 mx-auto" />
                    <div className="space-y-2">
                      <p className="text-slate-300 font-medium">Realize uma pesquisa para visualizar os pedidos</p>
                      <p className="text-slate-400 text-sm">
                        Digite um termo de busca, selecione uma loja específica, operação ou período para começar
                      </p>
                    </div>
                  </div>
                ) : ordersLoading ? (
                  <div className="text-center py-8 text-slate-400">Carregando pedidos...</div>
                ) : !globalOrders || globalOrders.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    Nenhum pedido encontrado com os filtros selecionados
                  </div>
                ) : (
                  <div className="space-y-4">
                    {globalOrders.map((order: GlobalOrder) => (
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
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700">
                        <div className="text-sm text-slate-400">
                          Página {currentPage} de {totalPages} · {totalOrders} pedidos no total
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="border-slate-600 text-slate-300"
                          >
                            Anterior
                          </Button>
                          
                          {/* Page numbers */}
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                              return (
                                <Button
                                  key={pageNum}
                                  variant={currentPage === pageNum ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={currentPage === pageNum 
                                    ? "bg-blue-600 text-white" 
                                    : "border-slate-600 text-slate-300"
                                  }
                                >
                                  {pageNum}
                                </Button>
                              );
                            })}
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="border-slate-600 text-slate-300"
                          >
                            Próxima
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <ProductsManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Products Management Component
function ProductsManager() {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { data: productsData, isLoading: productsLoading, refetch } = useQuery<Product[]>({
    queryKey: ['/api/admin/products'],
    enabled: true
  });

  useEffect(() => {
    if (productsData) {
      setProducts(productsData);
    }
  }, [productsData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getTypeColor = (type: string) => {
    return type === 'nutraceutico' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white/10 border-white/20 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-slate-200 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Produtos Globais
            </CardTitle>
            <CardDescription className="text-slate-400">
              Gerencie o catálogo global de produtos para toda a aplicação
            </CardDescription>
          </div>
          <Button 
            onClick={() => setShowAddProduct(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Produto
          </Button>
        </CardHeader>
      </Card>

      {/* Products List */}
      <Card className="bg-white/10 border-white/20 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-slate-200">Lista de Produtos</CardTitle>
          <CardDescription className="text-slate-400">
            {products.length} produtos cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {productsLoading ? (
            <div className="text-center py-8 text-slate-400">Carregando produtos...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <Package className="h-12 w-12 text-slate-500 mx-auto" />
              <div className="space-y-2">
                <p className="text-slate-300 font-medium">Nenhum produto cadastrado</p>
                <p className="text-slate-400 text-sm">
                  Adicione produtos para que possam ser utilizados em toda a aplicação
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => (
                <div key={product.id} className="border border-white/20 rounded-lg p-4 bg-white/5 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium text-white">{product.name}</p>
                        <p className="text-sm text-slate-400">SKU: {product.sku}</p>
                      </div>
                      <Badge className={getTypeColor(product.type)}>
                        {product.type === 'nutraceutico' ? 'Nutracêutico' : 'Físico'}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-sm text-slate-400">Preço de Venda</p>
                        <p className="font-medium text-white">
                          {formatCurrency(Number(product.price))}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-400">Custo Produto</p>
                        <p className="font-medium text-orange-400">
                          {formatCurrency(Number(product.costPrice || 0))}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-400">Custo Envio</p>
                        <p className="font-medium text-purple-400">
                          {formatCurrency(Number(product.shippingCost || 0))}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingProduct(product)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-blue-400"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingProduct(product)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {product.description && (
                    <p className="text-sm text-slate-400 mt-2">{product.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Product Modal */}
      {showAddProduct && (
        <AddProductModal 
          onClose={() => setShowAddProduct(false)}
          onSuccess={() => {
            setShowAddProduct(false);
            refetch();
          }}
        />
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <EditProductModal 
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => {
            setEditingProduct(null);
            refetch();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <DeleteProductModal 
          product={deletingProduct}
          onClose={() => setDeletingProduct(null)}
          onSuccess={() => {
            setDeletingProduct(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

// Add Product Modal Component
function AddProductModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    type: 'fisico',
    price: '',
    costPrice: '',
    shippingCost: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          costPrice: parseFloat(formData.costPrice || '0'),
          shippingCost: parseFloat(formData.shippingCost || '0')
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao criar produto');
      }

      onSuccess();
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      alert('Erro ao criar produto. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-white/15 border-white/25 backdrop-blur-lg w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-white">Novo Produto</CardTitle>
          <CardDescription className="text-slate-400">
            Adicione um novo produto ao catálogo global
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1">SKU *</label>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData({...formData, sku: e.target.value})}
                className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
                placeholder="Ex: PROD001"
                required
              />
            </div>
            
            <div>
              <label className="text-sm text-slate-400 block mb-1">Nome *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
                placeholder="Nome do produto"
                required
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1">Tipo *</label>
              <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white backdrop-blur-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/80 border-white/20 backdrop-blur-md">
                  <SelectItem value="fisico">Físico</SelectItem>
                  <SelectItem value="nutraceutico">Nutracêutico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400 block mb-1">Preço de Venda (€) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <label className="text-sm text-slate-400 block mb-1">Custo Produto (€) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({...formData, costPrice: e.target.value})}
                  className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1">Custo do Envio (€) *</label>
              <Input
                type="number"
                step="0.01"
                value={formData.shippingCost}
                onChange={(e) => setFormData({...formData, shippingCost: e.target.value})}
                className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1">Descrição</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
                placeholder="Descrição opcional"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="border-slate-600 text-slate-300"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? 'Criando...' : 'Criar Produto'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Edit Product Modal Component
function EditProductModal({ product, onClose, onSuccess }: { 
  product: Product; 
  onClose: () => void; 
  onSuccess: () => void 
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    sku: product.sku,
    name: product.name,
    type: product.type,
    price: product.price.toString(),
    costPrice: product.costPrice?.toString() || '0',
    shippingCost: product.shippingCost?.toString() || '0',
    description: product.description || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          costPrice: parseFloat(formData.costPrice || '0'),
          shippingCost: parseFloat(formData.shippingCost || '0')
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao atualizar produto');
      }

      onSuccess();
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      alert('Erro ao atualizar produto: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-white/15 border-white/25 backdrop-blur-lg w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-white">Editar Produto</CardTitle>
          <CardDescription className="text-slate-400">
            Atualize as informações do produto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1">SKU *</label>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData({...formData, sku: e.target.value})}
                className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
                placeholder="Ex: PROD001"
                required
              />
            </div>
            
            <div>
              <label className="text-sm text-slate-400 block mb-1">Nome *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
                placeholder="Nome do produto"
                required
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1">Tipo *</label>
              <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white backdrop-blur-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/80 border-white/20 backdrop-blur-md">
                  <SelectItem value="fisico">Físico</SelectItem>
                  <SelectItem value="nutraceutico">Nutracêutico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400 block mb-1">Preço de Venda (€) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <label className="text-sm text-slate-400 block mb-1">Custo Produto (€) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({...formData, costPrice: e.target.value})}
                  className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1">Custo do Envio (€) *</label>
              <Input
                type="number"
                step="0.01"
                value={formData.shippingCost}
                onChange={(e) => setFormData({...formData, shippingCost: e.target.value})}
                className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1">Descrição</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
                placeholder="Descrição opcional"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="border-slate-600 text-slate-300"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Delete Product Confirmation Modal
function DeleteProductModal({ product, onClose, onSuccess }: { 
  product: Product; 
  onClose: () => void; 
  onSuccess: () => void 
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: 'DELETE',
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include"
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao excluir produto');
      }

      onSuccess();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      alert('Erro ao excluir produto: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-white/15 border-white/25 backdrop-blur-lg w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-white">Confirmar Exclusão</CardTitle>
          <CardDescription className="text-slate-400">
            Esta ação não pode ser desfeita
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
              <p className="text-red-200 text-sm mb-2">
                Você está prestes a excluir o produto:
              </p>
              <div className="bg-white/10 rounded p-3 backdrop-blur-sm">
                <p className="text-white font-medium">{product.name}</p>
                <p className="text-slate-400 text-sm">SKU: {product.sku}</p>
                <p className="text-slate-400 text-sm">
                  Tipo: {product.type === 'nutraceutico' ? 'Nutracêutico' : 'Físico'}
                </p>
              </div>
            </div>
            
            <p className="text-slate-300 text-sm">
              Tem certeza que deseja excluir este produto? Esta ação é permanente e não pode ser desfeita.
            </p>

            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="border-slate-600 text-slate-300"
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}