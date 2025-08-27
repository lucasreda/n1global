import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, TrendingUp, ArrowUpDown, ArrowDown, DollarSign, Calendar, Crown, LayoutDashboard, FileText, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { SupplierProductCard } from "@/components/supplier/supplier-product-card";

// Types for API responses
interface SupplierProduct {
  id: string;
  sku: string;
  name: string;
  description?: string;
  type: string;
  price: number;
  costPrice?: number;
  shippingCost?: number;
  initialStock?: number;
  lowStock?: number;
  imageUrl?: string;
  videoUrl?: string;
  productUrl?: string;
  status?: string; // pending, approved, rejected
  createdAt: string;
  updatedAt: string;
}

interface SupplierMetrics {
  totalOrders: number;
  deliveredOrders: number;
  returnedOrders: number;
  cancelledOrders: number;
  totalProfit: number;
}


export default function SupplierDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [dateFilter, setDateFilter] = useState("current_month");
  const [activeSection, setActiveSection] = useState<'dashboard' | 'contracts' | 'wallet'>('dashboard');

  // Fetch supplier products (produtos globais criados por este supplier)
  const { data: supplierProducts = [], isLoading: isLoadingProducts, refetch: refetchProducts } = useQuery<SupplierProduct[]>({
    queryKey: ['/api/supplier/products'],
    enabled: !!user && user.role === 'supplier',
  });


  // Fetch supplier metrics (orders, deliveries, returns)  
  const { data: supplierMetrics, isLoading: isLoadingMetrics } = useQuery<SupplierMetrics>({
    queryKey: [`/api/supplier/metrics?period=${dateFilter}`],
    enabled: !!user && user.role === 'supplier',
  });

  if (user?.role !== 'supplier') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Acesso Negado</h2>
              <p className="text-muted-foreground mb-4">
                Esta área é exclusiva para fornecedores. 
              </p>
              <p className="text-sm text-muted-foreground">
                Seu perfil: {user?.role || 'Não identificado'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasProducts = supplierProducts && supplierProducts.length > 0;

  return (
    <div className="container mx-auto py-8">
      <div className="flex gap-4">
        {/* Sidebar Menu */}
        <div className="flex-shrink-0 w-32">
          <div className="grid grid-cols-1 gap-2">
            {[
              { 
                id: 'dashboard', 
                label: 'Dashboard', 
                icon: LayoutDashboard,
                active: activeSection === 'dashboard'
              },
              { 
                id: 'contracts', 
                label: 'Contratos', 
                icon: FileText,
                active: activeSection === 'contracts'
              },
              { 
                id: 'wallet', 
                label: 'Carteira', 
                icon: Wallet,
                active: activeSection === 'wallet'
              }
            ].map((item) => (
              <Card 
                key={item.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  item.active 
                    ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' 
                    : 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
                }`}
                onClick={() => setActiveSection(item.id as 'dashboard' | 'contracts' | 'wallet')}
                data-testid={`menu-${item.id}`}
              >
                <CardContent className="p-3 text-center">
                  <item.icon className={`h-5 w-5 mx-auto mb-1.5 ${
                    item.active 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`} />
                  <h3 className={`text-xs font-medium ${
                    item.active 
                      ? 'text-blue-900 dark:text-blue-100' 
                      : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {item.label}
                  </h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {activeSection === 'dashboard' && (
            <>
              {/* Page Title */}
              <div className="p-6" style={{ marginTop: '-25px' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">
                      Dashboard do Fornecedor
                    </h1>
                    <p className="text-muted-foreground mt-1">
                      Gerencie seus produtos globais e acompanhe pedidos em todas as operações
                    </p>
                  </div>

          {/* Action buttons and Date Filter */}
          <div className="flex items-center space-x-3">
            {/* Date Filter */}
            <div className="flex items-center space-x-2 bg-gray-900/30 border border-gray-700/50 rounded-lg px-3 py-2">
              <Calendar className="text-gray-400" size={16} />
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-36 bg-transparent border-0 text-gray-300 text-sm h-auto p-0">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent className="glassmorphism border-gray-600">
                  <SelectItem value="current_month">Este Mês</SelectItem>
                  <SelectItem value="1">Hoje</SelectItem>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="90">3 meses</SelectItem>
                  <SelectItem value="365">1 ano</SelectItem>
                  <SelectItem value="all">Tudo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => setLocation('/supplier/create-product')} data-testid="button-create-product" className="text-white">
              <Plus className="h-4 w-4 mr-2" />
              {hasProducts ? 'Novo Produto' : 'Criar Primeiro Produto'}
            </Button>
          </div>
        </div>
      </div>

      {/* Métricas Globais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Ativos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-active-products">
              {isLoadingProducts ? '-' : (supplierProducts?.filter(p => p.status === 'approved').length || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasProducts ? 'produtos no catálogo global' : 'nenhum produto cadastrado'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Globais</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-total-orders">
              {isLoadingMetrics ? '-' : (supplierMetrics?.totalOrders || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              de todas as operações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregues</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="metric-delivered-orders">
              {isLoadingMetrics ? '-' : (supplierMetrics?.deliveredOrders || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {supplierMetrics?.totalOrders ? 
                `${((supplierMetrics.deliveredOrders / supplierMetrics.totalOrders) * 100).toFixed(1)}% dos pedidos` : 
                'taxa de entrega'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retornados</CardTitle>
            <ArrowDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="metric-returned-orders">
              {isLoadingMetrics ? '-' : (supplierMetrics?.returnedOrders || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {supplierMetrics?.totalOrders ? 
                `${((supplierMetrics.returnedOrders / supplierMetrics.totalOrders) * 100).toFixed(1)}% dos pedidos` : 
                'taxa de retorno'
              }
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 border-emerald-200 dark:border-emerald-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Lucro Total</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="metric-total-profit">
              {isLoadingMetrics ? '-' : `€${(supplierMetrics?.totalProfit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              de produtos entregues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Produtos do Fornecedor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Package className="h-5 w-5" />
            Meus Produtos Globais
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingProducts ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando produtos...</p>
              </div>
            </div>
          ) : hasProducts ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {supplierProducts.map((product) => (
                <SupplierProductCard 
                  key={product.id} 
                  product={product} 
                  onUpdate={refetchProducts}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12" data-testid="empty-state-products">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum produto cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Comece criando seu primeiro produto global. Ele ficará disponível para todas as operações que quiserem vendê-lo.
              </p>
              <Button onClick={() => setLocation('/supplier/create-product')} data-testid="button-create-first-product">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Produto
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
            </>
          )}

          {activeSection === 'contracts' && (
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-4">Contratos</h1>
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Área de Contratos</h3>
                  <p className="text-muted-foreground">
                    Gerencie seus contratos e acordos comerciais.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'wallet' && (
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-4">Carteira</h1>
              <Card>
                <CardContent className="p-8 text-center">
                  <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Carteira Digital</h3>
                  <p className="text-muted-foreground">
                    Acompanhe seus pagamentos e saldo disponível.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}


        </div>
      </div>
    </div>
  );
}