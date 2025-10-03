import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  ShoppingCart,
  Plus,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStore, setSelectedStore] = useState("all");
  const [selectedOperation, setSelectedOperation] = useState("all");
  const [dateRange, setDateRange] = useState("30");
  const [totalOrders, setTotalOrders] = useState(0);
  
  // Create order modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newOrder, setNewOrder] = useState({
    storeId: "",
    operationId: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    customerCity: "",
    customerState: "",
    customerCountry: "PT",
    customerZip: "",
    status: "pending",
    paymentMethod: "cod",
    total: "",
    currency: "EUR",
    productsJson: "[]",
    notes: ""
  });

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

  // Clients query for order creation
  const { data: clients } = useQuery<Array<{ id: string; name: string; email: string; role: string }>>({
    queryKey: ['/api/admin/clients'],
    enabled: isCreateModalOpen
  });

  // Client operations query for order creation
  const { data: clientOperations } = useQuery<Array<{ id: string; name: string; storeId: string; storeName: string }>>({
    queryKey: ['/api/admin/clients', selectedClientId, 'operations'],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/clients/${selectedClientId}/operations`, {
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch client operations');
      }
      
      return response.json();
    },
    enabled: !!selectedClientId && isCreateModalOpen
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: typeof newOrder) => {
      let products = [];
      try {
        products = JSON.parse(orderData.productsJson);
      } catch (e) {
        throw new Error("Formato JSON inválido para produtos");
      }

      const payload = {
        storeId: orderData.storeId,
        operationId: orderData.operationId || null,
        dataSource: "manual",
        customerName: orderData.customerName,
        customerEmail: orderData.customerEmail || null,
        customerPhone: orderData.customerPhone || null,
        customerAddress: orderData.customerAddress || null,
        customerCity: orderData.customerCity || null,
        customerState: orderData.customerState || null,
        customerCountry: orderData.customerCountry || "PT",
        customerZip: orderData.customerZip || null,
        status: orderData.status,
        paymentMethod: orderData.paymentMethod,
        total: orderData.total,
        currency: orderData.currency || "EUR",
        products: products,
        notes: orderData.notes || null
      };

      return apiRequest('/api/admin/orders', 'POST', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders/count'] });
      toast({
        title: "Pedido criado",
        description: "O pedido foi criado com sucesso.",
      });
      setIsCreateModalOpen(false);
      // Reset form
      setNewOrder({
        storeId: "",
        operationId: "",
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        customerAddress: "",
        customerCity: "",
        customerState: "",
        customerCountry: "PT",
        customerZip: "",
        status: "pending",
        paymentMethod: "cod",
        total: "",
        currency: "EUR",
        productsJson: "[]",
        notes: ""
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar pedido",
        description: error.message || "Ocorreu um erro ao criar o pedido.",
        variant: "destructive",
      });
    },
  });

  const handleCreateOrder = () => {
    if (!newOrder.storeId || !newOrder.customerName || !newOrder.total) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha Store, Nome do Cliente e Valor Total.",
        variant: "destructive",
      });
      return;
    }
    createOrderMutation.mutate(newOrder);
  };

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Pedidos
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie todos os pedidos do sistema
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          data-testid="button-create-order"
        >
          <Plus className="h-4 w-4 mr-2" />
          Criar Pedido
        </Button>
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
                    {globalOrders.map((order: GlobalOrder) => (
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

      {/* Create Order Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-200">Criar Novo Pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Client */}
              <div className="space-y-2">
                <Label className="text-slate-300">Cliente *</Label>
                <Select
                  value={selectedClientId}
                  onValueChange={(value) => {
                    setSelectedClientId(value);
                    setNewOrder({ ...newOrder, operationId: "", storeId: "" });
                  }}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id} className="text-slate-200">
                        {client.name} ({client.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Operation */}
              <div className="space-y-2">
                <Label className="text-slate-300">Operação *</Label>
                <Select
                  value={newOrder.operationId}
                  onValueChange={(value) => {
                    const selectedOp = clientOperations?.find(op => op.id === value);
                    setNewOrder({ 
                      ...newOrder, 
                      operationId: value,
                      storeId: selectedOp?.storeId || ""
                    });
                  }}
                  disabled={!selectedClientId}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                    <SelectValue placeholder="Selecione a operação" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {clientOperations?.map((op) => (
                      <SelectItem key={op.id} value={op.id} className="text-slate-200">
                        {op.name} ({op.storeName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Customer Info */}
            <div className="space-y-2">
              <Label className="text-slate-300">Nome do Cliente *</Label>
              <Input
                value={newOrder.customerName}
                onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
                placeholder="Nome completo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Email</Label>
                <Input
                  type="email"
                  value={newOrder.customerEmail}
                  onChange={(e) => setNewOrder({ ...newOrder, customerEmail: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-slate-200"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Telefone</Label>
                <Input
                  value={newOrder.customerPhone}
                  onChange={(e) => setNewOrder({ ...newOrder, customerPhone: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-slate-200"
                  placeholder="+351 xxx xxx xxx"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label className="text-slate-300">Morada</Label>
              <Input
                value={newOrder.customerAddress}
                onChange={(e) => setNewOrder({ ...newOrder, customerAddress: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
                placeholder="Rua, número, andar"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Cidade</Label>
                <Input
                  value={newOrder.customerCity}
                  onChange={(e) => setNewOrder({ ...newOrder, customerCity: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-slate-200"
                  placeholder="Lisboa"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Estado/Região</Label>
                <Input
                  value={newOrder.customerState}
                  onChange={(e) => setNewOrder({ ...newOrder, customerState: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-slate-200"
                  placeholder="Lisboa"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">País</Label>
                <Input
                  value={newOrder.customerCountry}
                  onChange={(e) => setNewOrder({ ...newOrder, customerCountry: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-slate-200"
                  placeholder="PT"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Código Postal</Label>
              <Input
                value={newOrder.customerZip}
                onChange={(e) => setNewOrder({ ...newOrder, customerZip: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
                placeholder="1000-001"
              />
            </div>

            {/* Order Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Status</Label>
                <Select
                  value={newOrder.status}
                  onValueChange={(value) => setNewOrder({ ...newOrder, status: value })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="pending" className="text-slate-200">Pendente</SelectItem>
                    <SelectItem value="confirmed" className="text-slate-200">Confirmado</SelectItem>
                    <SelectItem value="shipped" className="text-slate-200">Enviado</SelectItem>
                    <SelectItem value="delivered" className="text-slate-200">Entregue</SelectItem>
                    <SelectItem value="cancelled" className="text-slate-200">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Método de Pagamento</Label>
                <Select
                  value={newOrder.paymentMethod}
                  onValueChange={(value) => setNewOrder({ ...newOrder, paymentMethod: value })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="cod" className="text-slate-200">COD (Dinheiro na Entrega)</SelectItem>
                    <SelectItem value="prepaid" className="text-slate-200">Pré-pago</SelectItem>
                    <SelectItem value="credit_card" className="text-slate-200">Cartão de Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Valor Total *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newOrder.total}
                  onChange={(e) => setNewOrder({ ...newOrder, total: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-slate-200"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Moeda</Label>
                <Select
                  value={newOrder.currency}
                  onValueChange={(value) => setNewOrder({ ...newOrder, currency: value })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="EUR" className="text-slate-200">EUR (€)</SelectItem>
                    <SelectItem value="USD" className="text-slate-200">USD ($)</SelectItem>
                    <SelectItem value="GBP" className="text-slate-200">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Products JSON */}
            <div className="space-y-2">
              <Label className="text-slate-300">Produtos (JSON)</Label>
              <Textarea
                value={newOrder.productsJson}
                onChange={(e) => setNewOrder({ ...newOrder, productsJson: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200 font-mono text-sm"
                placeholder='[{"name":"Produto 1","quantity":1,"price":"10.00"}]'
                rows={3}
              />
              <p className="text-xs text-slate-400">
                Formato: Array JSON com name, quantity e price
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-slate-300">Notas</Label>
              <Textarea
                value={newOrder.notes}
                onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
                placeholder="Notas adicionais sobre o pedido"
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="bg-slate-800 border-slate-700 text-slate-300"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateOrder}
                disabled={createOrderMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-submit-create-order"
              >
                {createOrderMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Pedido'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}