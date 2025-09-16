import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
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
  User,
  AlertTriangle,
  Shield,
  Briefcase,
  UserPlus,
  Edit,
  Trophy,
  Globe,
  Mail,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  MapPin,
  Ban,
  FileText
} from "lucide-react";
import logoImage from "@assets/INSIDE_1756100933599.png";

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
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
}

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: string;
  onboardingCompleted: boolean;
  createdAt: string;
  permissions?: string[];
}

interface SupportCategory {
  id: string;
  name: string;
  displayName: string;
  description: string;
  isAutomated: boolean;
  priority: number;
  color: string;
}

interface SupportTicket {
  id: string;
  ticketNumber: string;
  categoryId: string;
  category: SupportCategory;
  status: string;
  priority: string;
  customerEmail: string;
  customerName?: string;
  subject: string;
  createdAt: string;
  lastActivity: string;
  assignedToUserId?: string;
  assignedUser?: SystemUser;
  conversationCount: number;
}

export default function InsidePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedOperation, setSelectedOperation] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [selectedTab, setSelectedTab] = useState("overview");
  
  // Debug log
  console.log("Inside page rendering, selectedTab:", selectedTab);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState<SystemUser | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [supportSearchTerm, setSupportSearchTerm] = useState("");
  const [selectedTicketStatus, setSelectedTicketStatus] = useState<string>("all");
  
  // Product management states
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [showDeleteProductModal, setShowDeleteProductModal] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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

  const { data: systemUsers, isLoading: usersLoading } = useQuery<SystemUser[]>({
    queryKey: ['/api/admin/users'],
    enabled: selectedTab === "users"
  });

  // Products query
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/admin/products', productSearchTerm],
    enabled: selectedTab === "products",
    queryFn: async () => {
      const params = new URLSearchParams();
      if (productSearchTerm) params.append('search', productSearchTerm);
      
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/products?${params.toString()}`, {
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    }
  });

  // Support system queries
  const { data: supportCategories, isLoading: categoriesLoading } = useQuery<SupportCategory[]>({
    queryKey: ['/api/support/categories'],
    enabled: selectedTab === "support"
  });

  const hasSupportFilters = supportSearchTerm.trim().length > 0 || 
                           selectedCategory !== "all" || 
                           selectedTicketStatus !== "all";

  const { data: supportTicketsResponse, isLoading: ticketsLoading } = useQuery<{tickets: SupportTicket[], total: number}>({
    queryKey: ['/api/support/tickets', selectedCategory, selectedTicketStatus, supportSearchTerm],
    enabled: selectedTab === "support" && hasSupportFilters,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (supportSearchTerm) params.append('search', supportSearchTerm);
      if (selectedCategory !== 'all') params.append('categoryId', selectedCategory);
      if (selectedTicketStatus !== 'all') params.append('status', selectedTicketStatus);
      params.append('limit', '50');
      
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/support/tickets?${params.toString()}`, {
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return { tickets: data.tickets || [], total: data.total || 0 };
    }
  });

  // Product mutations
  const createProductMutation = useMutation({
    mutationFn: async (productData: Omit<Product, 'id' | 'createdAt'>) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
        body: JSON.stringify(productData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar produto');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      toast({
        title: "Produto criado",
        description: "O produto foi criado com sucesso.",
      });
      setShowAddProduct(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editProductMutation = useMutation({
    mutationFn: async (productData: Partial<Product> & { id: string }) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/products/${productData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
        body: JSON.stringify(productData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao editar produto');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      toast({
        title: "Produto atualizado",
        description: "O produto foi atualizado com sucesso.",
      });
      setShowEditProductModal(false);
      setProductToEdit(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao excluir produto');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      toast({
        title: "Produto excluído",
        description: "O produto foi removido com sucesso.",
      });
      setShowDeleteProductModal(false);
      setProductToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao excluir usuário');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Usuário excluído",
        description: "O usuário foi removido com sucesso do sistema.",
      });
      setShowDeleteModal(false);
      setUserToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: { name: string; email: string; password: string; role: string }) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar usuário');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Usuário criado",
        description: "O usuário foi criado com sucesso.",
      });
      setShowCreateUserModal(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editUserMutation = useMutation({
    mutationFn: async (userData: { id: string; name?: string; email?: string; password?: string; role?: string }) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/users/${userData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao editar usuário');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Usuário atualizado",
        description: "O usuário foi atualizado com sucesso.",
      });
      setShowEditUserModal(false);
      setUserToEdit(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteUser = (user: SystemUser) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleEditUser = (user: SystemUser) => {
    setUserToEdit(user);
    setShowEditUserModal(true);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  // Product handlers
  const handleEditProduct = (product: Product) => {
    setProductToEdit(product);
    setShowEditProductModal(true);
  };

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setShowDeleteProductModal(true);
  };

  const confirmDeleteProduct = () => {
    if (productToDelete) {
      deleteProductMutation.mutate(productToDelete.id);
    }
  };

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
      <div className="bg-black border-b border-gray-700/60 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo na esquerda */}
            <div className="flex items-center">
              <img 
                src={logoImage} 
                alt="Logo" 
                className="h-6 w-auto object-contain"
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
          {/* Navigation tabs with support tab included */}
          <TabsList className="flex w-full flex-wrap gap-2 bg-white/10 border border-white/20 backdrop-blur-md p-2">
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
            <TabsTrigger value="users" className="data-[state=active]:bg-blue-600">
              Usuários
            </TabsTrigger>
            <TabsTrigger value="support" className="data-[state=active]:bg-blue-600">
              Suporte
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Shopify Orders Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white/10 border-white/20 backdrop-blur-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-200">Pedidos Hoje</CardTitle>
                  <Calendar className="h-4 w-4 text-cyan-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{adminStats?.todayShopifyOrders?.toLocaleString() || 0}</div>
                  <p className="text-xs text-slate-400">Pedidos Shopify de hoje</p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 border-white/20 backdrop-blur-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-200">Pedidos no Mês</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{adminStats?.monthShopifyOrders?.toLocaleString() || 0}</div>
                  <p className="text-xs text-slate-400">Pedidos Shopify deste mês</p>
                </CardContent>
              </Card>
            </div>

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

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Top Lojas Globais */}
              <Card className="bg-white/10 border-white/20 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center gap-2 text-[19px]">
                    <Trophy className="h-5 w-5 text-yellow-400" />
                    Top Operações Globais
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Ranking por número total de pedidos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {adminStats?.topStoresGlobal?.map((store, index) => (
                      <div key={store.id} className="flex items-center justify-between p-3 border border-slate-700/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                            index === 1 ? 'bg-gray-400/20 text-gray-300' :
                            index === 2 ? 'bg-orange-500/20 text-orange-400' :
                            'bg-slate-600/20 text-slate-400'
                          }`}>
                            #{index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-white text-sm">{store.name}</p>
                            <p className="text-xs text-slate-400">{store.storeName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-white">{store.totalOrders}</p>
                          <p className="text-xs text-slate-400">pedidos</p>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-4 text-slate-400">
                        <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Carregando dados...</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Pedidos por Países (Mensal) */}
              <Card className="bg-white/10 border-white/20 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center gap-2 text-[19px]">
                    <Globe className="h-5 w-5 text-blue-400" />
                    Pedidos por Países
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Pedidos Shopify por país (últimos 30 dias)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {adminStats?.ordersByCountry?.map((country, index) => (
                      <div key={country.country} className="flex items-center justify-between p-3 border border-slate-700/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-400">
                              {country.country.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-white text-sm">{country.country}</p>
                            <p className="text-xs text-slate-400">
                              {((country.orders / (adminStats?.ordersByCountry?.reduce((acc, c) => acc + c.orders, 0) || 1)) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-white">{country.orders}</p>
                          <p className="text-xs text-slate-400">pedidos</p>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-4 text-slate-400">
                        <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Carregando dados...</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Lojas do Dia */}
              <Card className="bg-white/10 border-white/20 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center gap-2 text-[19px]">
                    <Calendar className="h-5 w-5 text-green-400" />
                    Top Operações do Dia
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Ranking por pedidos Shopify hoje
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {adminStats?.topStoresToday?.map((store, index) => (
                      <div key={store.id} className="flex items-center justify-between p-3 border border-slate-700/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-green-500/20 text-green-400' :
                            index === 1 ? 'bg-emerald-500/20 text-emerald-400' :
                            index === 2 ? 'bg-teal-500/20 text-teal-400' :
                            'bg-slate-600/20 text-slate-400'
                          }`}>
                            #{index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-white text-sm">{store.name}</p>
                            <p className="text-xs text-slate-400">{store.storeName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-white">{store.todayOrders}</p>
                          <p className="text-xs text-slate-400">hoje</p>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-4 text-slate-400">
                        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Carregando dados...</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
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
            <Card className="bg-white/10 border-white/20 backdrop-blur-md">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Gerenciar Produtos
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Visualize e gerencie todos os produtos do sistema
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setShowAddProduct(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="button-create-product"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Produto
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="mb-6">
                  <Input
                    type="text"
                    placeholder="Buscar produtos por nome, SKU..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder-slate-400"
                    data-testid="input-search-products"
                  />
                </div>

                {productsLoading ? (
                  <div className="text-center py-8 text-slate-400">
                    Carregando produtos...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {products && products.length > 0 ? (
                      products.map((product) => (
                        <div key={product.id} className="bg-white/5 border border-white/20 rounded-lg p-6 hover:bg-white/10 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <Package className="h-6 w-6 text-blue-400" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-white">{product.name}</h3>
                                <p className="text-slate-400">SKU: {product.sku}</p>
                                <div className="flex items-center gap-3 mt-1">
                                  <Badge 
                                    variant={product.isActive ? 'default' : 'secondary'}
                                    className={product.isActive ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'}
                                  >
                                    {product.isActive ? 'Ativo' : 'Inativo'}
                                  </Badge>
                                  <Badge variant="outline" className="border-blue-500 text-blue-400">
                                    {product.type}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="text-right mr-4">
                                <div className="text-lg font-semibold text-white">
                                  {formatCurrency(product.price)}
                                </div>
                                <div className="text-sm text-slate-400">
                                  Custo: {formatCurrency(product.costPrice)}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditProduct(product)}
                                className="text-blue-400 hover:bg-blue-500/20"
                                data-testid={`button-edit-product-${product.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteProduct(product)}
                                className="text-red-400 hover:bg-red-500/20"
                                data-testid={`button-delete-product-${product.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        {productSearchTerm ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado.'}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="bg-white/10 border-white/20 backdrop-blur-md">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Gerenciar Usuários
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Visualize e gerencie todas as contas de usuário do sistema
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setShowCreateUserModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="button-create-user"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Criar Usuário
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="text-center py-8 text-slate-400">
                    Carregando usuários...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {systemUsers && systemUsers.length > 0 ? (
                      systemUsers.map((user) => (
                        <div key={user.id} className="bg-white/5 border border-white/20 rounded-lg p-6 hover:bg-white/10 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                {user.role === 'super_admin' ? (
                                  <Shield className="h-6 w-6 text-blue-400" />
                                ) : user.role === 'supplier' ? (
                                  <Briefcase className="h-6 w-6 text-purple-400" />
                                ) : (
                                  <User className="h-6 w-6 text-green-400" />
                                )}
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-white">{user.name}</h3>
                                <p className="text-slate-400">{user.email}</p>
                                <div className="flex items-center gap-3 mt-1">
                                  <Badge 
                                    variant={user.role === 'super_admin' ? 'default' : 'secondary'}
                                    className={
                                      user.role === 'super_admin' 
                                        ? 'bg-blue-600 text-white' 
                                        : user.role === 'supplier'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-green-600 text-white'
                                    }
                                  >
                                    {user.role === 'super_admin' ? 'Super Admin' : 
                                     user.role === 'supplier' ? 'Supplier' : 
                                     user.role === 'admin' ? 'Admin' : 'Usuário'}
                                  </Badge>
                                  <Badge 
                                    variant={user.onboardingCompleted ? 'default' : 'destructive'}
                                    className={user.onboardingCompleted ? 'bg-green-600 text-white' : 'bg-orange-600 text-white'}
                                  >
                                    {user.onboardingCompleted ? 'Configurado' : 'Pendente'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="text-right text-sm text-slate-400">
                                <p>Criado em</p>
                                <p>{formatDate(user.createdAt)}</p>
                              </div>
                              <div className="flex space-x-2 ml-4">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditUser(user)}
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-blue-400"
                                  data-testid={`button-edit-user-${user.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteUser(user)}
                                  disabled={deleteUserMutation.isPending}
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                                  data-testid={`button-delete-user-${user.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        Nenhum usuário encontrado
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-6">
            {/* Support Categories Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {/* Categories Cards */}
              {categoriesLoading ? (
                <div className="col-span-full text-center py-8 text-slate-400">
                  Carregando categorias...
                </div>
              ) : supportCategories && supportCategories.length > 0 ? (
                supportCategories.map((category) => (
                  <Card key={category.id} className="bg-white/10 border-white/20 backdrop-blur-md hover:bg-white/15 transition-colors cursor-pointer"
                        onClick={() => setSelectedCategory(category.id)}
                        data-testid={`card-category-${category.name}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-white text-sm">{category.displayName}</h3>
                          <p className="text-xs text-slate-400 mt-1">{category.description}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {category.isAutomated ? (
                            <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Automático
                            </Badge>
                          ) : (
                            <Badge className="bg-orange-600/20 text-orange-400 border-orange-600/30">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Manual
                            </Badge>
                          )}
                        </div>
                        <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs">
                          P{category.priority}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="col-span-full bg-white/10 border-white/20 backdrop-blur-md">
                  <CardContent className="p-8 text-center">
                    <Mail className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">Sistema de Suporte</h3>
                    <p className="text-slate-400 mb-6">
                      O sistema de suporte com IA está sendo configurado. Em breve você poderá:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
                      <div className="bg-white/5 rounded-lg p-4">
                        <MessageSquare className="h-6 w-6 text-blue-400 mb-2" />
                        <h4 className="font-medium text-white mb-1">Categorização Automática</h4>
                        <p className="text-sm text-slate-400">Emails categorizados automaticamente por IA</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <RefreshCw className="h-6 w-6 text-green-400 mb-2" />
                        <h4 className="font-medium text-white mb-1">Respostas Inteligentes</h4>
                        <p className="text-sm text-slate-400">Respostas automáticas personalizadas</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <Clock className="h-6 w-6 text-yellow-400 mb-2" />
                        <h4 className="font-medium text-white mb-1">Gestão de Tickets</h4>
                        <p className="text-sm text-slate-400">Controle completo do fluxo de atendimento</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <FileText className="h-6 w-6 text-purple-400 mb-2" />
                        <h4 className="font-medium text-white mb-1">Relatórios Detalhados</h4>
                        <p className="text-sm text-slate-400">Métricas e análises de performance</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Filters */}
            <Card className="bg-white/10 border-white/20 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-slate-200 flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Filtros de Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">Buscar</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Email, assunto, ticket..."
                        value={supportSearchTerm}
                        onChange={(e) => setSupportSearchTerm(e.target.value)}
                        className="pl-10 bg-slate-700 border-slate-600 text-white"
                        data-testid="input-support-search"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">Categoria</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white backdrop-blur-sm" data-testid="select-category">
                        <SelectValue placeholder="Todas as categorias" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/80 border-white/20 backdrop-blur-md">
                        <SelectItem value="all">Todas as categorias</SelectItem>
                        {supportCategories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">Status</label>
                    <Select value={selectedTicketStatus} onValueChange={setSelectedTicketStatus}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white backdrop-blur-sm" data-testid="select-status">
                        <SelectValue placeholder="Todos os status" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/80 border-white/20 backdrop-blur-md">
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="open">Aberto</SelectItem>
                        <SelectItem value="in_progress">Em Andamento</SelectItem>
                        <SelectItem value="resolved">Resolvido</SelectItem>
                        <SelectItem value="closed">Fechado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tickets List */}
            <Card className="bg-white/10 border-white/20 backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-slate-200 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Tickets de Suporte
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Gerenciamento centralizado de atendimento ao cliente
                  </CardDescription>
                </div>
                <Button variant="outline" className="border-slate-600 text-slate-300" data-testid="button-export-tickets">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </CardHeader>
              <CardContent>
                {!hasSupportFilters ? (
                  <div className="text-center py-12 space-y-4">
                    <Search className="h-12 w-12 text-slate-500 mx-auto" />
                    <div className="space-y-2">
                      <p className="text-slate-300 font-medium">Use os filtros para visualizar tickets</p>
                      <p className="text-slate-400 text-sm">
                        Digite um termo de busca, selecione uma categoria ou status para começar
                      </p>
                    </div>
                  </div>
                ) : ticketsLoading ? (
                  <div className="text-center py-8 text-slate-400">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                    Carregando tickets...
                  </div>
                ) : !supportTicketsResponse || supportTicketsResponse.tickets.length === 0 ? (
                  <div className="text-center py-8 space-y-4">
                    <MessageSquare className="h-12 w-12 text-slate-500 mx-auto" />
                    <div className="space-y-2">
                      <p className="text-slate-300 font-medium">Nenhum ticket encontrado</p>
                      <p className="text-slate-400 text-sm">
                        Tente ajustar os filtros ou aguarde novos emails de suporte
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {supportTicketsResponse.tickets.map((ticket: SupportTicket) => (
                      <div key={ticket.id} className="border border-slate-700 rounded-lg p-4 hover:bg-white/5 transition-colors" data-testid={`ticket-${ticket.ticketNumber}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-4">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0 mt-1" 
                              style={{ backgroundColor: ticket.category.color }}
                            />
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-medium text-white">{ticket.ticketNumber}</h3>
                                <Badge className="bg-slate-700 text-slate-300 text-xs">
                                  {ticket.category.displayName}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-300 font-medium">{ticket.subject}</p>
                              <p className="text-xs text-slate-400 mt-1">
                                De: {ticket.customerEmail}
                                {ticket.customerName && ` (${ticket.customerName})`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge 
                              className={`text-xs ${
                                ticket.status === 'open' ? 'bg-green-600/20 text-green-400 border-green-600/30' :
                                ticket.status === 'in_progress' ? 'bg-blue-600/20 text-blue-400 border-blue-600/30' :
                                ticket.status === 'resolved' ? 'bg-purple-600/20 text-purple-400 border-purple-600/30' :
                                'bg-gray-600/20 text-gray-400 border-gray-600/30'
                              }`}
                            >
                              {ticket.status === 'open' ? 'Aberto' :
                               ticket.status === 'in_progress' ? 'Em Andamento' :
                               ticket.status === 'resolved' ? 'Resolvido' : 'Fechado'}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                ticket.priority === 'high' ? 'border-red-600 text-red-400' :
                                ticket.priority === 'medium' ? 'border-yellow-600 text-yellow-400' :
                                'border-slate-600 text-slate-400'
                              }`}
                            >
                              {ticket.priority === 'high' ? 'Alta' :
                               ticket.priority === 'medium' ? 'Média' : 'Baixa'}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-blue-400"
                              data-testid={`button-view-ticket-${ticket.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-700">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>Criado: {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MessageSquare className="h-3 w-3" />
                              <span>{ticket.conversationCount} mensagens</span>
                            </div>
                            {ticket.assignedUser && (
                              <div className="flex items-center space-x-1">
                                <User className="h-3 w-3" />
                                <span>Atribuído: {ticket.assignedUser.name}</span>
                              </div>
                            )}
                          </div>
                          <span>Última atividade: {new Date(ticket.lastActivity).toLocaleDateString('pt-BR')}</span>
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

      {/* Create User Modal */}
      <CreateUserModal 
        open={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onSubmit={createUserMutation.mutate}
        isLoading={createUserMutation.isPending}
      />

      {/* Edit User Modal */}
      {userToEdit && (
        <EditUserModal 
          open={showEditUserModal}
          onClose={() => {
            setShowEditUserModal(false);
            setUserToEdit(null);
          }}
          user={userToEdit}
          onSubmit={editUserMutation.mutate}
          isLoading={editUserMutation.isPending}
        />
      )}

      {/* Delete User Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Tem certeza que deseja excluir o usuário <strong className="text-white">{userToDelete?.name}</strong>?
              <br />
              <span className="text-red-400 font-medium">Esta ação não pode ser desfeita.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteModal(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteUser}
              disabled={deleteUserMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteUserMutation.isPending ? 'Excluindo...' : 'Excluir Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Product Modal */}
      <CreateProductModal 
        open={showAddProduct}
        onClose={() => setShowAddProduct(false)}
        onSubmit={createProductMutation.mutate}
        isLoading={createProductMutation.isPending}
      />

      {/* Edit Product Modal */}
      {productToEdit && (
        <EditProductModal 
          open={showEditProductModal}
          onClose={() => {
            setShowEditProductModal(false);
            setProductToEdit(null);
          }}
          product={productToEdit}
          onSubmit={editProductMutation.mutate}
          isLoading={editProductMutation.isPending}
        />
      )}

      {/* Delete Product Confirmation Modal */}
      <Dialog open={showDeleteProductModal} onOpenChange={setShowDeleteProductModal}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Tem certeza que deseja excluir o produto <strong className="text-white">{productToDelete?.name}</strong>?
              <br />
              <span className="text-red-400 font-medium">Esta ação não pode ser desfeita.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteProductModal(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteProduct}
              disabled={deleteProductMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteProductMutation.isPending ? 'Excluindo...' : 'Excluir Produto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Create User Modal Component
function CreateUserModal({ 
  open, 
  onClose, 
  onSubmit, 
  isLoading 
}: { 
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; email: string; password: string; role: string }) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email && formData.password) {
      onSubmit(formData);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', email: '', password: '', role: 'user' });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-400">
            <UserPlus className="h-5 w-5" />
            Criar Novo Usuário
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Adicione um novo usuário ao sistema. Todos os campos são obrigatórios.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm text-slate-400">Nome</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
              placeholder="Nome completo do usuário"
              required
              data-testid="input-create-user-name"
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-sm text-slate-400">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
              placeholder="usuario@exemplo.com"
              required
              data-testid="input-create-user-email"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-sm text-slate-400">Senha</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
              placeholder="Senha do usuário"
              required
              data-testid="input-create-user-password"
            />
          </div>
          <div>
            <Label htmlFor="role" className="text-sm text-slate-400">Tipo de Usuário</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white backdrop-blur-sm" data-testid="select-create-user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="user" className="text-white hover:bg-gray-700">Usuário</SelectItem>
                <SelectItem value="admin" className="text-white hover:bg-gray-700">Admin</SelectItem>
                <SelectItem value="supplier" className="text-white hover:bg-gray-700">Supplier</SelectItem>
                <SelectItem value="super_admin" className="text-white hover:bg-gray-700">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              type="button"
              variant="outline" 
              onClick={handleClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={isLoading || !formData.name || !formData.email || !formData.password}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-submit-create-user"
            >
              {isLoading ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Define available pages for each user type
const USER_PAGES = [
  { id: 'dashboard', name: 'Dashboard', description: 'Painel principal do cliente', icon: '📊' },
  { id: 'hub', name: 'Hub', description: 'Marketplace de produtos', icon: '🏪' },
  { id: 'orders', name: 'Pedidos', description: 'Gestão de pedidos do cliente', icon: '📦' },
  { id: 'ads', name: 'Anúncios', description: 'Campanhas publicitárias', icon: '🎯' },
  { id: 'analytics', name: 'Análises', description: 'Relatórios e métricas', icon: '📈' }
];

const ADMIN_PAGES = [
  { id: 'dashboard', name: 'Dashboard', description: 'Painel administrativo principal', icon: '📊' },
  { id: 'orders', name: 'Pedidos', description: 'Gerenciar pedidos globais', icon: '📦' },
  { id: 'stores', name: 'Lojas', description: 'Gerenciar lojas e operações', icon: '🏪' },
  { id: 'users', name: 'Usuários', description: 'Controle de usuários', icon: '👥' },
  { id: 'products', name: 'Produtos', description: 'Gerenciar produtos', icon: '📋' },
  { id: 'global', name: 'Global', description: 'Estatísticas globais', icon: '🌍' },
  { id: 'support', name: 'Suporte', description: 'Central de suporte', icon: '💬' },
  { id: 'hub-control', name: 'Hub Control', description: 'Controle do marketplace', icon: '⚙️' },
  { id: 'settings', name: 'Configurações', description: 'Configurações gerais', icon: '⚙️' }
];

// Edit User Modal Component
function EditUserModal({ 
  open, 
  onClose, 
  user,
  onSubmit, 
  isLoading 
}: { 
  open: boolean;
  onClose: () => void;
  user: SystemUser;
  onSubmit: (data: { id: string; name?: string; email?: string; password?: string; role?: string; permissions?: string[] }) => void;
  isLoading: boolean;
}) {
  const [activeTab, setActiveTab] = useState("general");
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    password: '',
    role: user.role,
    permissions: user.permissions || []
  });

  // Get available pages based on user role
  const getAvailablePages = (role: string) => {
    if (role === 'super_admin') return ADMIN_PAGES;
    return USER_PAGES;
  };

  // Toggle permission for a specific page
  const togglePermission = (pageId: string) => {
    const currentPermissions = formData.permissions;
    const hasPermission = currentPermissions.includes(pageId);
    
    if (hasPermission) {
      setFormData({
        ...formData,
        permissions: currentPermissions.filter(p => p !== pageId)
      });
    } else {
      setFormData({
        ...formData,
        permissions: [...currentPermissions, pageId]
      });
    }
  };

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        permissions: user.permissions || []
      });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updateData: any = { id: user.id };
    
    if (formData.name !== user.name) updateData.name = formData.name;
    if (formData.email !== user.email) updateData.email = formData.email;
    if (formData.password) updateData.password = formData.password;
    if (formData.role !== user.role) updateData.role = formData.role;
    if (JSON.stringify(formData.permissions) !== JSON.stringify(user.permissions || [])) {
      updateData.permissions = formData.permissions;
    }
    
    // Só envia se há alguma mudança
    if (Object.keys(updateData).length > 1) {
      onSubmit(updateData);
    }
  };

  const handleClose = () => {
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      permissions: user.permissions || []
    });
    setActiveTab("general");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-400">
            <Edit className="h-5 w-5" />
            Editar Usuário
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Edite as informações do usuário <strong className="text-white">{user.name}</strong>. 
            Deixe a senha em branco para não alterá-la.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/10 border border-white/20">
            <TabsTrigger value="general" className="data-[state=active]:bg-blue-600">
              Informações Gerais
            </TabsTrigger>
            <TabsTrigger value="permissions" className="data-[state=active]:bg-blue-600">
              Permissões
            </TabsTrigger>
          </TabsList>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <TabsContent value="general" className="mt-4 space-y-4">
              <div>
                <Label htmlFor="edit-name" className="text-sm text-slate-400">Nome</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
                  placeholder="Nome completo do usuário"
                  required
                  data-testid="input-edit-user-name"
                />
              </div>
              <div>
                <Label htmlFor="edit-email" className="text-sm text-slate-400">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
                  placeholder="usuario@exemplo.com"
                  required
                  data-testid="input-edit-user-email"
                />
              </div>
              <div>
                <Label htmlFor="edit-password" className="text-sm text-slate-400">
                  Nova Senha (deixe em branco para não alterar)
                </Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
                  placeholder="Nova senha (opcional)"
                  data-testid="input-edit-user-password"
                />
              </div>
              <div>
                <Label htmlFor="edit-role" className="text-sm text-slate-400">Tipo de Usuário</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white backdrop-blur-sm" data-testid="select-edit-user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="user" className="text-white hover:bg-gray-700">Usuário</SelectItem>
                    <SelectItem value="admin" className="text-white hover:bg-gray-700">Admin</SelectItem>
                    <SelectItem value="supplier" className="text-white hover:bg-gray-700">Supplier</SelectItem>
                    <SelectItem value="super_admin" className="text-white hover:bg-gray-700">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            
            <TabsContent value="permissions" className="mt-4">
              <div className="space-y-4">
                <div className="text-sm text-slate-400">
                  Controle as páginas que este usuário pode acessar baseado no seu tipo de conta.
                </div>
                
                <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-3">
                    {formData.role === 'super_admin' ? '🔧 Páginas Administrativas' : '👤 Páginas do Cliente'}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {getAvailablePages(formData.role).map((page) => {
                      const hasPermission = formData.permissions.includes(page.id);
                      
                      return (
                        <div 
                          key={page.id}
                          className={`flex items-start space-x-3 p-3 rounded-md border transition-colors cursor-pointer ${
                            hasPermission 
                              ? 'bg-blue-50/10 border-blue-500/30' 
                              : 'bg-white/5 border-white/20 hover:bg-white/10'
                          }`}
                          onClick={() => togglePermission(page.id)}
                          data-testid={`permission-${page.id}`}
                        >
                          <Checkbox 
                            checked={hasPermission}
                            onCheckedChange={() => togglePermission(page.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{page.icon}</span>
                              <span className="text-sm font-medium text-white">
                                {page.name}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              {page.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                    <div className="flex items-center gap-2 text-blue-400 text-sm">
                      <span>💡</span>
                      <span className="font-medium">Dica:</span>
                    </div>
                    <p className="text-xs text-blue-300 mt-1">
                      {formData.role === 'super_admin' 
                        ? 'Usuários super admin podem acessar páginas administrativas do painel /inside'
                        : 'Usuários normais podem acessar páginas do dashboard principal do cliente'
                      }
                    </p>
                  </div>
                </div>
                
                {/* Permissions summary */}
                <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-2">
                    📋 Resumo das Permissões
                  </h4>
                  <div className="text-xs text-slate-400">
                    {formData.permissions.length > 0 ? (
                      <>
                        <span className="text-green-400 font-medium">
                          {formData.permissions.length} páginas permitidas:
                        </span>{' '}
                        {formData.permissions.map(permissionId => {
                          const page = getAvailablePages(formData.role).find(p => p.id === permissionId);
                          return page?.name;
                        }).filter(Boolean).join(', ')}
                      </>
                    ) : (
                      <span className="text-orange-400">
                        ⚠️ Nenhuma página selecionada - usuário não terá acesso a nenhuma funcionalidade
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <DialogFooter className="gap-2 mt-6">
              <Button 
                type="button"
                variant="outline" 
                onClick={handleClose}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={isLoading || !formData.name || !formData.email}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-submit-edit-user"
              >
                {isLoading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Products Management Component
function ProductsManager() {
  const [showAddProduct, setShowAddProduct] = useState(false);
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
            className="bg-blue-600 hover:bg-blue-700 text-white"
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
                      {/* Product Thumbnail */}
                      <div className="flex-shrink-0">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded-lg border border-white/20"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-16 h-16 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center ${product.imageUrl ? 'hidden' : 'flex'}`}
                        >
                          <Package className="h-8 w-8 text-slate-400" />
                        </div>
                      </div>
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
                        <p className="text-sm text-slate-400">Preço B2B Fornecedor</p>
                        <p className="font-medium text-white">
                          {formatCurrency(Number(product.price))}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-400">Custo para o Fornecedor</p>
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
                          onClick={() => handleEditProduct(product)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-blue-400"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteProduct(product)}
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

    </div>
  );
}



// Create Product Modal Component
function CreateProductModal({ 
  open, 
  onClose, 
  onSubmit, 
  isLoading 
}: { 
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Product, 'id' | 'createdAt'>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    type: 'physical',
    price: 0,
    costPrice: 0,
    shippingCost: 0,
    description: '',
    imageUrl: '',
    isActive: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.sku && formData.price > 0) {
      onSubmit(formData);
    }
  };

  const handleClose = () => {
    setFormData({
      sku: '',
      name: '',
      type: 'physical',
      price: 0,
      costPrice: 0,
      shippingCost: 0,
      description: '',
      imageUrl: '',
      isActive: true
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Novo Produto
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Adicione um novo produto ao sistema
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do produto"
                className="bg-gray-800 border-gray-600 text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="SKU único"
                className="bg-gray-800 border-gray-600 text-white"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="type">Tipo de Produto</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="physical">Físico</SelectItem>
                <SelectItem value="nutraceutico">Nutracêutico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="price">Preço (€) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="bg-gray-800 border-gray-600 text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="costPrice">Custo (€)</Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="shippingCost">Frete (€)</Label>
              <Input
                id="shippingCost"
                type="number"
                step="0.01"
                min="0"
                value={formData.shippingCost}
                onChange={(e) => setFormData({ ...formData, shippingCost: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição do produto"
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>

          <div>
            <Label htmlFor="imageUrl">URL da Imagem</Label>
            <Input
              id="imageUrl"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://..."
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked as boolean })}
            />
            <Label htmlFor="isActive">Produto ativo</Label>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              type="button"
              variant="outline" 
              onClick={handleClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={isLoading || !formData.name || !formData.sku || formData.price <= 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Criando...' : 'Criar Produto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Product Modal Component
function EditProductModal({ 
  open, 
  onClose, 
  product,
  onSubmit, 
  isLoading 
}: { 
  open: boolean;
  onClose: () => void;
  product: Product;
  onSubmit: (data: Partial<Product> & { id: string }) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: product.name,
    sku: product.sku,
    type: product.type,
    price: product.price,
    costPrice: product.costPrice,
    shippingCost: product.shippingCost,
    description: product.description || '',
    imageUrl: product.imageUrl || '',
    isActive: product.isActive
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.sku && formData.price > 0) {
      onSubmit({ ...formData, id: product.id });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Produto
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Modifique as informações do produto
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-name">Nome do Produto *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do produto"
                className="bg-gray-800 border-gray-600 text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-sku">SKU *</Label>
              <Input
                id="edit-sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="SKU único"
                className="bg-gray-800 border-gray-600 text-white"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-type">Tipo de Produto</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="physical">Físico</SelectItem>
                <SelectItem value="nutraceutico">Nutracêutico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="edit-price">Preço (€) *</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="bg-gray-800 border-gray-600 text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-costPrice">Custo (€)</Label>
              <Input
                id="edit-costPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit-shippingCost">Frete (€)</Label>
              <Input
                id="edit-shippingCost"
                type="number"
                step="0.01"
                min="0"
                value={formData.shippingCost}
                onChange={(e) => setFormData({ ...formData, shippingCost: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-description">Descrição</Label>
            <Input
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição do produto"
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>

          <div>
            <Label htmlFor="edit-imageUrl">URL da Imagem</Label>
            <Input
              id="edit-imageUrl"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://..."
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit-isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked as boolean })}
            />
            <Label htmlFor="edit-isActive">Produto ativo</Label>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              type="button"
              variant="outline" 
              onClick={onClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={isLoading || !formData.name || !formData.sku || formData.price <= 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}