import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  ShoppingCart
} from "lucide-react";

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
  shippingAddress: string;
  createdAt: string;
}

export default function AdminOrders() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStore, setSelectedStore] = useState("all");
  const [selectedOperation, setSelectedOperation] = useState("all");
  const [dateRange, setDateRange] = useState("30");
  const [totalOrders, setTotalOrders] = useState(0);

  const pageSize = 20;

  const { data: ordersResponse, isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/admin/orders', currentPage, searchTerm, selectedStore, selectedOperation, dateRange],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });
      
      if (searchTerm) params.append('searchTerm', searchTerm);
      if (selectedStore !== 'all') params.append('storeId', selectedStore);
      if (selectedOperation !== 'all') params.append('operationId', selectedOperation);
      if (dateRange !== 'all') params.append('dateRange', dateRange);
      
      const response = await fetch(`/api/admin/orders?${params.toString()}`, {
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      
      const orders = await response.json();
      
      // Get total count for pagination
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

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'shipped': 'bg-purple-100 text-purple-800',
      'delivered': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
    };
    
    const statusLabels = {
      'pending': 'Pendente',
      'confirmed': 'Confirmado',
      'shipped': 'Enviado',
      'delivered': 'Entregue',
      'cancelled': 'Cancelado',
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </Badge>
    );
  };

  const exportOrders = async () => {
    const token = localStorage.getItem("auth_token");
    const params = new URLSearchParams();
    
    if (searchTerm) params.append('searchTerm', searchTerm);
    if (selectedStore !== 'all') params.append('storeId', selectedStore);
    if (selectedOperation !== 'all') params.append('operationId', selectedOperation);
    if (dateRange !== 'all') params.append('dateRange', dateRange);
    params.append('export', 'true');
    
    try {
      const response = await fetch(`/api/admin/orders?${params.toString()}`, {
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pedidos_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Pedidos
        </h1>
        <p className="text-muted-foreground mt-2">
          Gerencie todos os pedidos do sistema
        </p>
      </div>

      {/* Filters */}
      <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por cliente, telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Store Filter */}
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todas as lojas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as lojas</SelectItem>
                {stores?.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Operation Filter */}
            {selectedStore !== "all" && (
              <Select value={selectedOperation} onValueChange={setSelectedOperation}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todas operações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas operações</SelectItem>
                  {operations?.map((operation) => (
                    <SelectItem key={operation.id} value={operation.id}>
                      {operation.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Date Range */}
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Hoje</SelectItem>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>

            {/* Export Button */}
            <Button onClick={exportOrders} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Pedidos ({totalOrders.toLocaleString()})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando pedidos...</p>
              </div>
            </div>
          ) : globalOrders.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-semibold">Cliente</th>
                      <th className="text-left py-3 px-4 font-semibold">Loja / Operação</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Valor</th>
                      <th className="text-left py-3 px-4 font-semibold">Data</th>
                      <th className="text-left py-3 px-4 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {globalOrders.map((order) => (
                      <tr key={order.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{order.customerName}</p>
                            <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{order.storeName}</p>
                            <p className="text-sm text-muted-foreground">{order.operationName}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium">
                            {order.currency} {order.amount.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm">
                            {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum pedido encontrado</h3>
              <p className="text-muted-foreground">
                Tente ajustar os filtros para encontrar pedidos
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}