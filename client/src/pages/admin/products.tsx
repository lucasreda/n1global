import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Package,
  Search,
  Filter,
  Eye,
  Plus,
  ImageIcon
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  costPrice: number;
  status: 'pending' | 'approved' | 'rejected';
  supplierId: string;
  supplierName: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminProducts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/admin/products', searchTerm, statusFilter, supplierFilter],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (supplierFilter !== 'all') params.append('supplierId', supplierFilter);
      
      const response = await fetch(`/api/admin/products?${params.toString()}`, {
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      return response.json();
    }
  });

  const { data: suppliers } = useQuery<Array<{ id: string; name: string; email: string }>>({
    queryKey: ['/api/admin/suppliers'],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch('/api/admin/suppliers', {
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch suppliers');
      }
      
      return response.json();
    }
  });

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'approved': 'bg-green-100 text-green-800 border-green-300',
      'rejected': 'bg-red-100 text-red-800 border-red-300',
    };
    
    const statusLabels = {
      'pending': 'Pendente',
      'approved': 'Aprovado',
      'rejected': 'Rejeitado',
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 border-gray-300'}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </Badge>
    );
  };

  const getStatusCount = (status: string) => {
    if (!products) return 0;
    return products.filter(product => product.status === status).length;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Produtos
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie todos os produtos do sistema
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products?.length || 0}</div>
            <p className="text-xs text-muted-foreground">produtos no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <div className="h-4 w-4 rounded-full bg-yellow-400"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{getStatusCount('pending')}</div>
            <p className="text-xs text-muted-foreground">aguardando aprovação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
            <div className="h-4 w-4 rounded-full bg-green-400"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{getStatusCount('approved')}</div>
            <p className="text-xs text-muted-foreground">produtos ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejeitados</CardTitle>
            <div className="h-4 w-4 rounded-full bg-red-400"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{getStatusCount('rejected')}</div>
            <p className="text-xs text-muted-foreground">produtos rejeitados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
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
                  placeholder="Buscar por nome, SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
              </SelectContent>
            </Select>

            {/* Supplier Filter */}
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos fornecedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos fornecedores</SelectItem>
                {suppliers?.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produtos ({products?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {productsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando produtos...</p>
              </div>
            </div>
          ) : products && products.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold">Produto</th>
                    <th className="text-left py-3 px-4 font-semibold">SKU</th>
                    <th className="text-left py-3 px-4 font-semibold">Fornecedor</th>
                    <th className="text-left py-3 px-4 font-semibold">Preços</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Criado em</th>
                    <th className="text-left py-3 px-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.category && (
                              <p className="text-sm text-muted-foreground">{product.category}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {product.sku}
                        </code>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">{product.supplierName}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm">
                            <span className="font-medium">Venda:</span> €{product.price.toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <span>Custo:</span> €{product.costPrice.toFixed(2)}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(product.status)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">
                          {new Date(product.createdAt).toLocaleDateString('pt-BR')}
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
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
              <p className="text-muted-foreground">
                Tente ajustar os filtros para encontrar produtos
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}