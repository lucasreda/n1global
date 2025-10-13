import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Globe,
  Plus,
  Edit,
  Trash2,
  ShoppingCart,
  Users,
  Package,
  Search,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Settings,
  Plug
} from "lucide-react";

interface Operation {
  id: string;
  name: string;
  description?: string;
  storeId: string;
  storeName: string;
  ownerId?: string;
  country: string;
  currency: string;
  operationType: string;
  status: string;
  createdAt: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  type: string;
  description?: string;
  price: number;
  costPrice: number;
  shippingCost: number;
  imageUrl?: string;
  isActive: boolean;
  status: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const getCountryFlag = (countryCode: string) => {
  const flags: Record<string, string> = {
    'BR': '🇧🇷',
    'PT': '🇵🇹',
    'ES': '🇪🇸',
    'IT': '🇮🇹',
    'FR': '🇫🇷',
    'DE': '🇩🇪',
    'UK': '🇬🇧',
    'GB': '🇬🇧',
    'US': '🇺🇸',
    'PL': '🇵🇱',
    'NL': '🇳🇱',
    'BE': '🇧🇪',
    'AT': '🇦🇹',
    'CH': '🇨🇭',
    'SE': '🇸🇪',
    'NO': '🇳🇴',
    'DK': '🇩🇰',
    'FI': '🇫🇮',
    'IE': '🇮🇪',
    'GR': '🇬🇷',
    'CZ': '🇨🇿',
    'RO': '🇷🇴',
    'HU': '🇭🇺',
    'BG': '🇧🇬',
  };
  return flags[countryCode.toUpperCase()] || '🌍';
};

export default function AdminOperations() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [operationToDelete, setOperationToDelete] = useState<Operation | null>(null);
  const [operationToEdit, setOperationToEdit] = useState<Operation | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  
  // Integration modal states
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [showFulfillmentModal, setShowFulfillmentModal] = useState(false);
  const [showFacebookAdsModal, setShowFacebookAdsModal] = useState(false);
  const [shopifyData, setShopifyData] = useState({ shopName: '', accessToken: '' });
  const [fulfillmentData, setFulfillmentData] = useState({ provider: 'european_fulfillment', username: '', password: '' });
  const [facebookAdsData, setFacebookAdsData] = useState({ accountId: '', accountName: '', accessToken: '' });
  
  const [newOperationData, setNewOperationData] = useState({
    name: '',
    description: '',
    country: '',
    ownerId: '',
    currency: 'EUR',
    operationType: 'Cash on Delivery'
  });
  
  const [editOperationData, setEditOperationData] = useState({
    name: '',
    description: '',
    country: '',
    ownerId: '',
    currency: 'EUR',
    operationType: 'Cash on Delivery'
  });

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 10;

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch operations
  const { data: operations, isLoading: operationsLoading } = useQuery<Operation[]>({
    queryKey: ['/api/admin/operations']
  });

  // Fetch stores for create modal
  const { data: stores } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/admin/stores']
  });

  // Fetch users for owner selection
  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/admin/users']
  });

  // Fetch all products
  const { data: allProducts } = useQuery<Product[]>({
    queryKey: ['/api/admin/products']
  });

  // Fetch operation products when editing
  const { data: operationProducts } = useQuery<Product[]>({
    queryKey: ['/api/admin/operations', operationToEdit?.id, 'products'],
    enabled: !!operationToEdit && showEditModal
  });

  const createOperationMutation = useMutation({
    mutationFn: async (operationData: typeof newOperationData) => {
      const token = localStorage.getItem("auth_token");
      
      // Use first store as default
      const defaultStoreId = stores?.[0]?.id;
      if (!defaultStoreId) {
        throw new Error('Nenhuma loja disponível');
      }

      const response = await fetch('/api/admin/operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
        body: JSON.stringify({
          ...operationData,
          storeId: defaultStoreId
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar operação');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/operations'] });
      toast({
        title: "Operação criada",
        description: "A operação foi criada com sucesso.",
      });
      setShowCreateModal(false);
      setNewOperationData({
        name: '',
        description: '',
        country: '',
        ownerId: '',
        currency: 'EUR',
        operationType: 'Cash on Delivery'
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar operação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteOperationMutation = useMutation({
    mutationFn: async (operationId: string) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/operations/${operationId}`, {
        method: 'DELETE',
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao excluir operação');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/operations'] });
      toast({
        title: "Operação excluída",
        description: "A operação foi removida com sucesso do sistema.",
      });
      setShowDeleteModal(false);
      setOperationToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir operação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editOperationMutation = useMutation({
    mutationFn: async (operationData: { id: string } & Partial<typeof editOperationData>) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/operations/${operationData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
        body: JSON.stringify(operationData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao editar operação');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/operations'] });
      toast({
        title: "Operação atualizada",
        description: "Os dados da operação foram atualizados com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao editar operação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const linkProductMutation = useMutation({
    mutationFn: async ({ operationId, productId }: { operationId: string; productId: string }) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/operations/${operationId}/products/${productId}`, {
        method: 'POST',
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao vincular produto');
      }
      
      return response.json();
    },
    onSuccess: () => {
      if (operationToEdit) {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/operations', operationToEdit.id, 'products'] });
      }
      toast({
        title: "Produto vinculado",
        description: "O produto foi vinculado à operação com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao vincular produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unlinkProductMutation = useMutation({
    mutationFn: async ({ operationId, productId }: { operationId: string; productId: string }) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/operations/${operationId}/products/${productId}`, {
        method: 'DELETE',
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao desvincular produto');
      }
      
      return response.json();
    },
    onSuccess: () => {
      if (operationToEdit) {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/operations', operationToEdit.id, 'products'] });
      }
      toast({
        title: "Produto desvinculado",
        description: "O produto foi desvinculado da operação com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao desvincular produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch integrations for the operation
  const { data: operationIntegrations, refetch: refetchIntegrations } = useQuery<{
    shopify: any | null;
    fulfillment: any | null;
    facebookAds: any | null;
  }>({
    queryKey: ['/api/admin/operations', operationToEdit?.id, 'integrations'],
    enabled: !!operationToEdit && showEditModal && activeTab === 'integrations'
  });

  const saveShopifyIntegrationMutation = useMutation({
    mutationFn: async (data: typeof shopifyData) => {
      if (!operationToEdit) throw new Error('Operação não selecionada');
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/operations/${operationToEdit.id}/integrations/shopify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao salvar integração');
      }
      
      return response.json();
    },
    onSuccess: () => {
      refetchIntegrations();
      setShowShopifyModal(false);
      setShopifyData({ shopName: '', accessToken: '' });
      toast({
        title: "Integração Shopify salva",
        description: "A integração foi configurada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar integração",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveFulfillmentIntegrationMutation = useMutation({
    mutationFn: async (data: typeof fulfillmentData) => {
      if (!operationToEdit) throw new Error('Operação não selecionada');
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/operations/${operationToEdit.id}/integrations/fulfillment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
        body: JSON.stringify({
          provider: data.provider,
          credentials: {
            username: data.username,
            password: data.password
          }
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao salvar integração');
      }
      
      return response.json();
    },
    onSuccess: () => {
      refetchIntegrations();
      setShowFulfillmentModal(false);
      setFulfillmentData({ provider: 'european_fulfillment', username: '', password: '' });
      toast({
        title: "Integração de envio salva",
        description: "A integração foi configurada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar integração",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveFacebookAdsIntegrationMutation = useMutation({
    mutationFn: async (data: typeof facebookAdsData) => {
      if (!operationToEdit) throw new Error('Operação não selecionada');
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/operations/${operationToEdit.id}/integrations/facebook-ads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao salvar integração');
      }
      
      return response.json();
    },
    onSuccess: () => {
      refetchIntegrations();
      setShowFacebookAdsModal(false);
      setFacebookAdsData({ accountId: '', accountName: '', accessToken: '' });
      toast({
        title: "Integração Facebook Ads salva",
        description: "A integração foi configurada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar integração",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditOperation = (operation: Operation) => {
    setOperationToEdit(operation);
    setEditOperationData({
      name: operation.name,
      description: operation.description || '',
      country: operation.country,
      ownerId: operation.ownerId || '',
      currency: operation.currency,
      operationType: operation.operationType
    });
    setActiveTab("general");
    setShowEditModal(true);
  };

  const handleSubmitEdit = () => {
    if (!operationToEdit) return;
    
    const updateData: any = { id: operationToEdit.id };
    let hasChanges = false;
    
    if (editOperationData.name !== operationToEdit.name) {
      updateData.name = editOperationData.name;
      hasChanges = true;
    }
    if (editOperationData.description !== (operationToEdit.description || '')) {
      updateData.description = editOperationData.description;
      hasChanges = true;
    }
    if (editOperationData.country !== operationToEdit.country) {
      updateData.country = editOperationData.country;
      hasChanges = true;
    }
    if (editOperationData.ownerId !== (operationToEdit.ownerId || '')) {
      updateData.ownerId = editOperationData.ownerId;
      hasChanges = true;
    }
    if (editOperationData.currency !== operationToEdit.currency) {
      updateData.currency = editOperationData.currency;
      hasChanges = true;
    }
    if (editOperationData.operationType !== operationToEdit.operationType) {
      updateData.operationType = editOperationData.operationType;
      hasChanges = true;
    }
    
    if (!hasChanges) {
      toast({
        title: "Nenhuma alteração",
        description: "Nenhum campo foi modificado.",
      });
      setShowEditModal(false);
      return;
    }
    
    editOperationMutation.mutate(updateData);
  };

  const handleSaveProducts = async () => {
    if (!operationToEdit || !operationProducts) return;

    const currentProductIds = operationProducts.map(p => p.id);
    const productsToLink = selectedProductIds.filter(id => !currentProductIds.includes(id));
    const productsToUnlink = currentProductIds.filter(id => !selectedProductIds.includes(id));

    try {
      // Link new products
      for (const productId of productsToLink) {
        await linkProductMutation.mutateAsync({ 
          operationId: operationToEdit.id, 
          productId 
        });
      }

      // Unlink removed products
      for (const productId of productsToUnlink) {
        await unlinkProductMutation.mutateAsync({ 
          operationId: operationToEdit.id, 
          productId 
        });
      }

      toast({
        title: "Produtos atualizados",
        description: "Os produtos da operação foram atualizados com sucesso.",
      });
      
      setShowEditModal(false);
    } catch (error) {
      // Errors are already handled by mutations
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProductIds(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Initialize selected products when operation products load
  useEffect(() => {
    if (operationProducts) {
      setSelectedProductIds(operationProducts.map(p => p.id));
    }
  }, [operationProducts]);

  const getActiveOperationsCount = () => {
    if (!operations) return 0;
    return operations.filter(op => op.status === 'active').length;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold tracking-tight text-gray-900 dark:text-gray-100" style={{ fontSize: '22px' }}>
            Operações
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie todas as operações do sistema
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          data-testid="button-create-operation"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Operação
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Operações</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{operations?.length || 0}</div>
            <p className="text-xs text-muted-foreground">operações registradas</p>
          </CardContent>
        </Card>

        <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operações Ativas</CardTitle>
            <div className="h-4 w-4 rounded-full bg-green-400"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{getActiveOperationsCount()}</div>
            <p className="text-xs text-muted-foreground">operações funcionando</p>
          </CardContent>
        </Card>

        <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários com Acesso</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
            <p className="text-xs text-muted-foreground">usuários cadastrados</p>
          </CardContent>
        </Card>
      </div>

      {/* Operations Table */}
      <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ fontSize: '20px' }}>
            <Globe className="h-5 w-5" />
            Operações ({operations?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {operationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando operações...</p>
              </div>
            </div>
          ) : operations && operations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold">Operação</th>
                    <th className="text-left py-3 px-4 font-semibold">País</th>
                    <th className="text-left py-3 px-4 font-semibold">Moeda</th>
                    <th className="text-left py-3 px-4 font-semibold">Tipo</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Criada em</th>
                    <th className="text-left py-3 px-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.map((operation) => (
                    <tr 
                      key={operation.id} 
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      data-testid={`row-operation-${operation.id}`}
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{operation.name}</p>
                          {operation.description && (
                            <p className="text-sm text-muted-foreground">{operation.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getCountryFlag(operation.country)}</span>
                          <span className="font-medium">{operation.country}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">{operation.currency}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">{operation.operationType}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={operation.status === 'active' ? "default" : "secondary"}>
                          {operation.status === 'active' ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">
                          {new Date(operation.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditOperation(operation)}
                            data-testid={`button-edit-operation-${operation.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setOperationToDelete(operation);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-operation-${operation.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma operação encontrada</h3>
              <p className="text-muted-foreground">
                Comece criando a primeira operação do sistema
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Operation Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Operação</DialogTitle>
            <DialogDescription>
              Adicione uma nova operação ao sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="operation-name">Nome da Operação</Label>
              <Input
                id="operation-name"
                value={newOperationData.name}
                onChange={(e) => setNewOperationData({ ...newOperationData, name: e.target.value })}
                placeholder="Nome da operação"
                data-testid="input-operation-name"
              />
            </div>
            <div>
              <Label htmlFor="operation-description">Descrição (opcional)</Label>
              <Input
                id="operation-description"
                value={newOperationData.description}
                onChange={(e) => setNewOperationData({ ...newOperationData, description: e.target.value })}
                placeholder="Descrição da operação"
                data-testid="input-operation-description"
              />
            </div>
            <div>
              <Label htmlFor="operation-country">País</Label>
              <Input
                id="operation-country"
                value={newOperationData.country}
                onChange={(e) => setNewOperationData({ ...newOperationData, country: e.target.value })}
                placeholder="Código do país (ex: BR, ES, IT)"
                data-testid="input-operation-country"
              />
            </div>
            <div>
              <Label htmlFor="operation-owner">Usuário Dono (opcional)</Label>
              <Select 
                value={newOperationData.ownerId || undefined} 
                onValueChange={(value) => setNewOperationData({ ...newOperationData, ownerId: value === 'none' ? '' : value })}
              >
                <SelectTrigger data-testid="select-operation-owner">
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="none" className="text-white hover:bg-gray-700">Nenhum</SelectItem>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id} className="text-white hover:bg-gray-700">
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="operation-currency">Moeda</Label>
              <Input
                id="operation-currency"
                value={newOperationData.currency}
                onChange={(e) => setNewOperationData({ ...newOperationData, currency: e.target.value })}
                placeholder="EUR, USD, BRL..."
                data-testid="input-operation-currency"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => createOperationMutation.mutate(newOperationData)}
              disabled={createOperationMutation.isPending}
              data-testid="button-submit-create-operation"
            >
              {createOperationMutation.isPending ? 'Criando...' : 'Criar Operação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Operation Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-white/20">
          <DialogHeader>
            <DialogTitle className="text-2xl">Editar Operação</DialogTitle>
            <DialogDescription className="text-slate-400">
              Altere as informações da operação e gerencie produtos vinculados
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white/10 border border-white/20">
              <TabsTrigger value="general" className="data-[state=active]:bg-blue-600">
                Informações Gerais
              </TabsTrigger>
              <TabsTrigger value="products" className="data-[state=active]:bg-blue-600">
                Produtos
              </TabsTrigger>
              <TabsTrigger value="integrations" className="data-[state=active]:bg-blue-600">
                Integrações
              </TabsTrigger>
            </TabsList>
            
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              if (activeTab === 'general') {
                handleSubmitEdit();
              } else if (activeTab === 'products') {
                handleSaveProducts();
              }
              // Integrations tab doesn't need form submission yet
            }} className="space-y-4">
              <TabsContent value="general" className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="edit-operation-name" className="text-sm text-slate-400">Nome da Operação</Label>
                  <Input
                    id="edit-operation-name"
                    value={editOperationData.name}
                    onChange={(e) => setEditOperationData({ ...editOperationData, name: e.target.value })}
                    className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
                    placeholder="Nome da operação"
                    data-testid="input-edit-operation-name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-operation-description" className="text-sm text-slate-400">Descrição</Label>
                  <Input
                    id="edit-operation-description"
                    value={editOperationData.description}
                    onChange={(e) => setEditOperationData({ ...editOperationData, description: e.target.value })}
                    className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
                    placeholder="Descrição da operação"
                    data-testid="input-edit-operation-description"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-operation-country" className="text-sm text-slate-400">País</Label>
                  <Input
                    id="edit-operation-country"
                    value={editOperationData.country}
                    onChange={(e) => setEditOperationData({ ...editOperationData, country: e.target.value })}
                    className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
                    placeholder="Código do país"
                    data-testid="input-edit-operation-country"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-operation-owner" className="text-sm text-slate-400">Usuário Dono</Label>
                  <Select 
                    value={editOperationData.ownerId || undefined} 
                    onValueChange={(value) => setEditOperationData({ ...editOperationData, ownerId: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white backdrop-blur-sm" data-testid="select-edit-operation-owner">
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="none" className="text-white hover:bg-gray-700">Nenhum</SelectItem>
                      {users?.map((user) => (
                        <SelectItem key={user.id} value={user.id} className="text-white hover:bg-gray-700">
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-operation-currency" className="text-sm text-slate-400">Moeda</Label>
                  <Input
                    id="edit-operation-currency"
                    value={editOperationData.currency}
                    onChange={(e) => setEditOperationData({ ...editOperationData, currency: e.target.value })}
                    className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
                    placeholder="EUR, USD, BRL..."
                    data-testid="input-edit-operation-currency"
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="products" className="mt-4">
                <div className="space-y-4">
                  <div className="text-sm text-slate-400">
                    Selecione os produtos que farão parte desta operação.
                  </div>
                  
                  <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white mb-3">
                      <Package className="inline h-4 w-4 mr-2" />
                      Produtos Disponíveis
                      {productSearchTerm && (
                        <span className="ml-2 text-xs text-slate-400">
                          (filtrado)
                        </span>
                      )}
                    </h4>
                    
                    {/* Search field */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Buscar por nome ou SKU..."
                        value={productSearchTerm}
                        onChange={(e) => {
                          setProductSearchTerm(e.target.value);
                          setCurrentPage(1); // Reset to first page on search
                        }}
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-500"
                      />
                    </div>
                    
                    <div className="max-h-[350px] overflow-y-auto">
                    
                    {allProducts && allProducts.length > 0 ? (
                      (() => {
                        const filteredProducts = allProducts.filter(product => {
                          if (!productSearchTerm) return true;
                          const searchLower = productSearchTerm.toLowerCase();
                          return (
                            product.name.toLowerCase().includes(searchLower) ||
                            product.sku.toLowerCase().includes(searchLower)
                          );
                        });
                        
                        // Pagination calculations
                        const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
                        const startIndex = (currentPage - 1) * productsPerPage;
                        const endIndex = startIndex + productsPerPage;
                        const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
                        
                        return filteredProducts.length > 0 ? (
                          <>
                            <div className="grid grid-cols-1 gap-3">
                              {paginatedProducts.map((product) => {
                              const isSelected = selectedProductIds.includes(product.id);
                              
                              return (
                                <div 
                                  key={product.id}
                                  className={`flex items-start space-x-3 p-3 rounded-md border transition-colors ${
                                    isSelected 
                                      ? 'bg-blue-50/10 border-blue-500/30' 
                                      : 'bg-white/5 border-white/20'
                                  }`}
                                  data-testid={`product-${product.id}`}
                                >
                                  {/* Product Image or Placeholder */}
                                  {product.imageUrl ? (
                                    <img 
                                      src={product.imageUrl} 
                                      alt={product.name}
                                      className="w-12 h-12 rounded-md object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-md bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                                      <ImageIcon className="h-6 w-6 text-slate-500" />
                                    </div>
                                  )}
                                  
                                  <Checkbox 
                                    checked={isSelected}
                                    onCheckedChange={() => toggleProduct(product.id)}
                                    className="mt-1"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-white">
                                        {product.name}
                                      </span>
                                      <Badge variant="outline" className="text-xs">
                                        {product.sku}
                                      </Badge>
                                    </div>
                                    {product.description && (
                                      <p className="text-xs text-slate-400 mt-1">
                                        {product.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                                      <span>Preço: €{product.price.toFixed(2)}</span>
                                      <span>•</span>
                                      <span>Custo: €{product.costPrice.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                              })}
                            </div>
                            
                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
                                <div className="text-xs text-slate-400">
                                  Mostrando {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} de {filteredProducts.length} produtos
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="h-8 w-8 p-0 border-white/20 text-white hover:bg-white/10"
                                  >
                                    <ChevronLeft className="h-4 w-4" />
                                  </Button>
                                  <span className="text-xs text-white">
                                    Página {currentPage} de {totalPages}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="h-8 w-8 p-0 border-white/20 text-white hover:bg-white/10"
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-8 text-slate-400">
                            Nenhum produto encontrado com esse termo de busca.
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        Nenhum produto disponível no momento.
                      </div>
                    )}
                    </div>
                  </div>
                  
                  {/* Products summary */}
                  <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white mb-2">
                      📋 Resumo dos Produtos
                    </h4>
                    <div className="text-xs text-slate-400">
                      {selectedProductIds.length > 0 ? (
                        <>
                          <span className="text-blue-400 font-medium">
                            {selectedProductIds.length} produtos selecionados
                          </span>
                        </>
                      ) : (
                        <span className="text-orange-400">
                          ⚠️ Nenhum produto selecionado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="integrations" className="mt-4">
                <div className="space-y-4">
                  <div className="text-sm text-slate-400">
                    Gerencie as integrações configuradas para esta operação.
                  </div>
                  
                  <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white mb-3">
                      <Plug className="inline h-4 w-4 mr-2" />
                      Integrações Disponíveis
                    </h4>
                    
                    <div className="space-y-3">
                      {/* Shopify Integration */}
                      <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                              <ShoppingCart className="h-5 w-5 text-green-400" />
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-white">Shopify</h5>
                              <p className="text-xs text-slate-400">
                                {operationIntegrations?.shopify ? 
                                  `Loja: ${operationIntegrations.shopify.shopName}` : 
                                  'Integração com loja Shopify'
                                }
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              operationIntegrations?.shopify?.status === 'active' 
                                ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                                : operationIntegrations?.shopify?.status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                : 'text-slate-400'
                            }`}
                          >
                            {operationIntegrations?.shopify ? 
                              (operationIntegrations.shopify.status === 'active' ? 'Ativo' : 
                               operationIntegrations.shopify.status === 'pending' ? 'Pendente' : 'Erro') 
                              : 'Não configurado'
                            }
                          </Badge>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (operationIntegrations?.shopify) {
                              setShopifyData({
                                shopName: operationIntegrations.shopify.shopName || '',
                                accessToken: operationIntegrations.shopify.accessToken || ''
                              });
                            }
                            setShowShopifyModal(true);
                          }}
                          className="w-full border-white/20 text-white hover:bg-white/10"
                        >
                          <Settings className="h-3 w-3 mr-2" />
                          {operationIntegrations?.shopify ? 'Editar' : 'Configurar'}
                        </Button>
                      </div>
                      
                      {/* Shipping Integration */}
                      <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                              <Package className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-white">Envio</h5>
                              <p className="text-xs text-slate-400">
                                {operationIntegrations?.fulfillment ? 
                                  `Provider: ${operationIntegrations.fulfillment.provider}` : 
                                  'Integração de fulfillment'
                                }
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              operationIntegrations?.fulfillment?.status === 'active' 
                                ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                                : 'text-slate-400'
                            }`}
                          >
                            {operationIntegrations?.fulfillment ? 
                              (operationIntegrations.fulfillment.status === 'active' ? 'Ativo' : 'Erro') 
                              : 'Não configurado'
                            }
                          </Badge>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (operationIntegrations?.fulfillment) {
                              setFulfillmentData({
                                provider: operationIntegrations.fulfillment.provider || 'european_fulfillment',
                                username: operationIntegrations.fulfillment.credentials?.username || '',
                                password: ''
                              });
                            }
                            setShowFulfillmentModal(true);
                          }}
                          className="w-full border-white/20 text-white hover:bg-white/10"
                        >
                          <Settings className="h-3 w-3 mr-2" />
                          {operationIntegrations?.fulfillment ? 'Editar' : 'Configurar'}
                        </Button>
                      </div>
                      
                      {/* Facebook Ads Integration */}
                      <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                              <Globe className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-white">Facebook Ads</h5>
                              <p className="text-xs text-slate-400">
                                {operationIntegrations?.facebookAds ? 
                                  `Conta: ${operationIntegrations.facebookAds.accountName || operationIntegrations.facebookAds.accountId}` : 
                                  'Campanhas publicitárias'
                                }
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              operationIntegrations?.facebookAds?.status === 'active' 
                                ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                                : 'text-slate-400'
                            }`}
                          >
                            {operationIntegrations?.facebookAds ? 
                              (operationIntegrations.facebookAds.status === 'active' ? 'Ativo' : 'Erro') 
                              : 'Não configurado'
                            }
                          </Badge>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (operationIntegrations?.facebookAds) {
                              setFacebookAdsData({
                                accountId: operationIntegrations.facebookAds.accountId || '',
                                accountName: operationIntegrations.facebookAds.accountName || '',
                                accessToken: operationIntegrations.facebookAds.accessToken || ''
                              });
                            }
                            setShowFacebookAdsModal(true);
                          }}
                          className="w-full border-white/20 text-white hover:bg-white/10"
                        >
                          <Settings className="h-3 w-3 mr-2" />
                          {operationIntegrations?.facebookAds ? 'Editar' : 'Configurar'}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Integration Info */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Settings className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-white mb-1">
                          Configuração de Integrações
                        </h5>
                        <p className="text-xs text-slate-300">
                          Configure as integrações necessárias para esta operação. As credenciais são armazenadas de forma segura e podem ser atualizadas a qualquer momento.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <DialogFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setActiveTab("general");
                    setShowEditModal(false);
                  }}
                  className="border-white/20 text-white hover:bg-white/10"
                  data-testid="button-cancel-edit-operation"
                >
                  Cancelar
                </Button>
                {activeTab !== 'integrations' && (
                  <Button 
                    type="submit"
                    disabled={activeTab === 'general' ? editOperationMutation.isPending : (linkProductMutation.isPending || unlinkProductMutation.isPending)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="button-save-edit-operation"
                  >
                    {(activeTab === 'general' ? editOperationMutation.isPending : (linkProductMutation.isPending || unlinkProductMutation.isPending)) ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar Alterações'
                    )}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a operação <strong>{operationToDelete?.name}</strong>?
              <br /><br />
              <span className="text-red-600 font-medium">
                Esta ação não pode ser desfeita e todos os dados associados serão perdidos.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => operationToDelete && deleteOperationMutation.mutate(operationToDelete.id)}
              disabled={deleteOperationMutation.isPending}
              data-testid="button-confirm-delete-operation"
            >
              {deleteOperationMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shopify Integration Modal */}
      <Dialog open={showShopifyModal} onOpenChange={setShowShopifyModal}>
        <DialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-white/20">
          <DialogHeader>
            <DialogTitle>Configurar Integração Shopify</DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure sua loja Shopify para esta operação
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="shopify-shop-name" className="text-sm text-slate-400">Nome da Loja</Label>
              <Input
                id="shopify-shop-name"
                placeholder="minhaloja.myshopify.com"
                value={shopifyData.shopName}
                onChange={(e) => setShopifyData({ ...shopifyData, shopName: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <Label htmlFor="shopify-token" className="text-sm text-slate-400">Access Token</Label>
              <Input
                id="shopify-token"
                type="password"
                placeholder="shpat_..."
                value={shopifyData.accessToken}
                onChange={(e) => setShopifyData({ ...shopifyData, accessToken: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShopifyModal(false)} className="border-white/20 text-white hover:bg-white/10">
              Cancelar
            </Button>
            <Button 
              onClick={() => saveShopifyIntegrationMutation.mutate(shopifyData)}
              disabled={saveShopifyIntegrationMutation.isPending || !shopifyData.shopName || !shopifyData.accessToken}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {saveShopifyIntegrationMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fulfillment Integration Modal */}
      <Dialog open={showFulfillmentModal} onOpenChange={setShowFulfillmentModal}>
        <DialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-white/20">
          <DialogHeader>
            <DialogTitle>Configurar Integração de Envio</DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure seu provedor de fulfillment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fulfillment-provider" className="text-sm text-slate-400">Provedor</Label>
              <Select value={fulfillmentData.provider} onValueChange={(value) => setFulfillmentData({ ...fulfillmentData, provider: value })}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="european_fulfillment" className="text-white hover:bg-gray-700">European Fulfillment</SelectItem>
                  <SelectItem value="elogy" className="text-white hover:bg-gray-700">Elogy</SelectItem>
                  <SelectItem value="fhb" className="text-white hover:bg-gray-700">FHB</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fulfillment-username" className="text-sm text-slate-400">Usuário</Label>
              <Input
                id="fulfillment-username"
                placeholder="usuário"
                value={fulfillmentData.username}
                onChange={(e) => setFulfillmentData({ ...fulfillmentData, username: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <Label htmlFor="fulfillment-password" className="text-sm text-slate-400">Senha</Label>
              <Input
                id="fulfillment-password"
                type="password"
                placeholder="senha"
                value={fulfillmentData.password}
                onChange={(e) => setFulfillmentData({ ...fulfillmentData, password: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFulfillmentModal(false)} className="border-white/20 text-white hover:bg-white/10">
              Cancelar
            </Button>
            <Button 
              onClick={() => saveFulfillmentIntegrationMutation.mutate(fulfillmentData)}
              disabled={saveFulfillmentIntegrationMutation.isPending || !fulfillmentData.username || !fulfillmentData.password}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saveFulfillmentIntegrationMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Facebook Ads Integration Modal */}
      <Dialog open={showFacebookAdsModal} onOpenChange={setShowFacebookAdsModal}>
        <DialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-white/20">
          <DialogHeader>
            <DialogTitle>Configurar Integração Facebook Ads</DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure sua conta de anúncios do Facebook
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="facebook-account-id" className="text-sm text-slate-400">Account ID</Label>
              <Input
                id="facebook-account-id"
                placeholder="act_123456789"
                value={facebookAdsData.accountId}
                onChange={(e) => setFacebookAdsData({ ...facebookAdsData, accountId: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <Label htmlFor="facebook-account-name" className="text-sm text-slate-400">Nome da Conta (opcional)</Label>
              <Input
                id="facebook-account-name"
                placeholder="Minha Conta de Anúncios"
                value={facebookAdsData.accountName}
                onChange={(e) => setFacebookAdsData({ ...facebookAdsData, accountName: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <Label htmlFor="facebook-token" className="text-sm text-slate-400">Access Token</Label>
              <Input
                id="facebook-token"
                type="password"
                placeholder="EAAx..."
                value={facebookAdsData.accessToken}
                onChange={(e) => setFacebookAdsData({ ...facebookAdsData, accessToken: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFacebookAdsModal(false)} className="border-white/20 text-white hover:bg-white/10">
              Cancelar
            </Button>
            <Button 
              onClick={() => saveFacebookAdsIntegrationMutation.mutate(facebookAdsData)}
              disabled={saveFacebookAdsIntegrationMutation.isPending || !facebookAdsData.accountId || !facebookAdsData.accessToken}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {saveFacebookAdsIntegrationMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
