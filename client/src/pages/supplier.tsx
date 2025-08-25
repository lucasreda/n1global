import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, TrendingUp, ArrowUpDown, ArrowDown, DollarSign, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { CreateProductModal } from "@/components/supplier/create-product-modal";
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dateFilter, setDateFilter] = useState("current_month");

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
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* Page Title */}
      <div className="glassmorphism rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Dashboard do Fornecedor
            </h1>
            <p className="text-gray-300 mt-1">
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

            <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-product">
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
              {isLoadingProducts ? '-' : (supplierProducts?.length || 0)}
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
          <CardTitle className="flex items-center gap-2">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-first-product">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Produto
              </Button>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Modal de Criação de Produto */}
      <CreateProductModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal}
        onProductCreated={() => {
          refetchProducts();
          setShowCreateModal(false);
        }}
      />
    </div>
  );
}