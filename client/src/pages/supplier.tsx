import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, TrendingUp, ArrowUpDown, ArrowDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { CreateProductModal } from "@/components/supplier/create-product-modal";
import { SupplierProductCard } from "@/components/supplier/supplier-product-card";
import { SupplierOrdersTable } from "@/components/supplier/supplier-orders-table";

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
}

interface SupplierOrder {
  id: string;
  customerName?: string;
  customerCity?: string;
  customerCountry?: string;
  status: string;
  total?: string;
  currency?: string;
  orderDate?: string;
  shopifyOrderNumber?: string;
  products?: Array<{
    sku: string;
    quantity: number;
  }>;
  operation?: {
    name: string;
    country: string;
  };
}

export default function SupplierDashboard() {
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch supplier products (produtos globais criados por este supplier)
  const { data: supplierProducts = [], isLoading: isLoadingProducts, refetch: refetchProducts } = useQuery<SupplierProduct[]>({
    queryKey: ['/api/supplier/products'],
    enabled: !!user && user.role === 'supplier',
  });

  // Fetch global orders for supplier's SKUs (across all operations)
  const { data: globalOrders = [], isLoading: isLoadingOrders } = useQuery<SupplierOrder[]>({
    queryKey: ['/api/supplier/orders'],
    enabled: !!user && user.role === 'supplier',
  });

  // Fetch supplier metrics (orders, deliveries, returns)
  const { data: supplierMetrics, isLoading: isLoadingMetrics } = useQuery<SupplierMetrics>({
    queryKey: ['/api/supplier/metrics'],
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard do Fornecedor</h1>
          <p className="text-muted-foreground">
            Gerencie seus produtos globais e acompanhe pedidos em todas as operações
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-product">
          <Plus className="h-4 w-4 mr-2" />
          {hasProducts ? 'Novo Produto' : 'Criar Primeiro Produto'}
        </Button>
      </div>

      {/* Métricas Globais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  onUpdate={() => refetchProducts()}
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

      {/* Pedidos Globais dos SKUs do Supplier */}
      {hasProducts && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Pedidos Globais dos Meus SKUs
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Todos os pedidos dos seus produtos em todas as operações
            </p>
          </CardHeader>
          <CardContent>
            {isLoadingOrders ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Carregando pedidos...</p>
                </div>
              </div>
            ) : globalOrders && globalOrders.length > 0 ? (
              <SupplierOrdersTable orders={globalOrders} />
            ) : (
              <div className="text-center py-12" data-testid="empty-state-orders">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum pedido encontrado</h3>
                <p className="text-muted-foreground">
                  Ainda não há pedidos dos seus produtos. Quando alguém comprar seus SKUs, eles aparecerão aqui.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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