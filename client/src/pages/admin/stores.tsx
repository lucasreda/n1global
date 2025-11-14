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
  shopifyOrderPrefix?: string;
  fhbAccountId?: string;
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
    'HR': '🇭🇷',
    'SI': '🇸🇮',
    'EE': '🇪🇪',
    'LV': '🇱🇻',
    'LT': '🇱🇹',
    'SK': '🇸🇰',
  };
  return flags[countryCode.toUpperCase()] || '🌍';
};

const getCountryName = (countryCode: string) => {
  const countryNames: Record<string, string> = {
    'BR': 'Brasil',
    'PT': 'Portugal',
    'ES': 'Espanha',
    'IT': 'Itália',
    'FR': 'França',
    'DE': 'Alemanha',
    'UK': 'Reino Unido',
    'GB': 'Reino Unido',
    'US': 'Estados Unidos',
    'PL': 'Polônia',
    'NL': 'Holanda',
    'BE': 'Bélgica',
    'AT': 'Áustria',
    'CH': 'Suíça',
    'SE': 'Suécia',
    'NO': 'Noruega',
    'DK': 'Dinamarca',
    'FI': 'Finlândia',
    'IE': 'Irlanda',
    'GR': 'Grécia',
    'CZ': 'República Tcheca',
    'RO': 'Romênia',
    'HU': 'Hungria',
    'BG': 'Bulgária',
    'HR': 'Croácia',
    'SI': 'Eslovênia',
    'EE': 'Estônia',
    'LV': 'Letônia',
    'LT': 'Lituânia',
    'SK': 'Eslováquia',
  };
  return countryNames[countryCode.toUpperCase()] || countryCode;
};

export default function AdminStores() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterId, setFilterId] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [operationToDelete, setOperationToDelete] = useState<Operation | null>(null);
  const [operationToEdit, setOperationToEdit] = useState<Operation | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  
  // Integration modal states
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [showFulfillmentModal, setShowFulfillmentModal] = useState(false);
  const [showAdsModal, setShowAdsModal] = useState(false);
  const [platformData, setPlatformData] = useState({ 
    platform: 'shopify',
    shopName: '', 
    accessToken: '',
    storeSlug: '',
    bearerToken: ''
  });
  const [editingPlatformId, setEditingPlatformId] = useState<string | null>(null);
  const [fulfillmentData, setFulfillmentData] = useState({ 
    provider: 'european_fulfillment', 
    username: '', 
    password: '',
    appId: '',
    secret: ''
  });
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null);
  const [adsData, setAdsData] = useState({ 
    platform: 'meta',
    accountId: '', 
    accountName: '', 
    accessToken: '',
    customerId: '',
    refreshToken: ''
  });
  const [editingAdsId, setEditingAdsId] = useState<string | null>(null);
  

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch operations
  const { data: operations, isLoading: operationsLoading } = useQuery<Operation[]>({
    queryKey: ['/api/admin/operations']
  });

  // Filter operations based on search and filters
  const filteredOperations = operations?.filter(operation => {
    // Search filter (nome e descrição apenas)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        operation.name.toLowerCase().includes(searchLower) ||
        operation.description?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // ID filter (filtro específico)
    if (filterId) {
      const idLower = filterId.toLowerCase();
      if (!operation.id.toLowerCase().includes(idLower)) return false;
    }

    // Date filter (data de criação)
    if (filterDateFrom || filterDateTo) {
      const operationDate = new Date(operation.createdAt);
      operationDate.setHours(0, 0, 0, 0); // Reset time to start of day
      
      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (operationDate < fromDate) return false;
      }
      
      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (operationDate > toDate) return false;
      }
    }

    // Country filter
    if (filterCountry !== "all" && operation.country !== filterCountry) return false;

    return true;
  }) || [];

  // Get unique countries for filter dropdown
  const uniqueCountries = Array.from(new Set(operations?.map(op => op.country) || [])).sort();

  // Fetch users for owner selection
  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/admin/users']
  });

  // Removed all operation-related mutations and functions - stores page only displays stores list

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

      {/* Search and Filters */}
      <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* First Row: Search and ID Filter */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Input - Nome e Descrição */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* ID Filter */}
              <div className="w-full md:w-[200px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filtrar por ID..."
                  value={filterId}
                  onChange={(e) => setFilterId(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Second Row: Date Filters and Operations Filter */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Date From Filter */}
              <div className="w-full md:w-[180px]">
                <Label htmlFor="filter-date-from" className="text-sm text-muted-foreground mb-2 block">
                  Data de criação (De)
                </Label>
                <Input
                  id="filter-date-from"
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                />
              </div>

              {/* Date To Filter */}
              <div className="w-full md:w-[180px]">
                <Label htmlFor="filter-date-to" className="text-sm text-muted-foreground mb-2 block">
                  Data de criação (Até)
                </Label>
                <Input
                  id="filter-date-to"
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  min={filterDateFrom || undefined}
                />
              </div>

              {/* Filter by Country */}
              <div className="w-full md:w-[200px]">
                <Label htmlFor="filter-country" className="text-sm text-muted-foreground mb-2 block">
                  Filtrar por país
                </Label>
                <Select value={filterCountry} onValueChange={setFilterCountry}>
                  <SelectTrigger id="filter-country" className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      {filterCountry !== "all" ? (
                        getCountryName(filterCountry)
                      ) : (
                        <span className="text-muted-foreground">Todos os países</span>
                      )}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <span className="flex items-center gap-1.5">
                        <span className="text-base">🌍</span>
                        <span>Todos os países</span>
                      </span>
                    </SelectItem>
                    {uniqueCountries.map((country) => (
                      <SelectItem key={country} value={country}>
                        <span className="flex items-center gap-1.5">
                          <span className="text-base">{getCountryFlag(country)}</span>
                          <span>{getCountryName(country)}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters Button */}
              {(searchTerm || filterId || filterDateFrom || filterDateTo || filterCountry !== "all") && (
                <div className="w-full md:w-auto flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setFilterId("");
                      setFilterDateFrom("");
                      setFilterDateTo("");
                      setFilterCountry("all");
                    }}
                    className="w-full md:w-auto"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
            <div className="text-2xl font-bold text-green-600">
              {operations?.filter(op => op.status === 'active').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">operações ativas</p>
          </CardContent>
        </Card>

        <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Países Únicos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {uniqueCountries.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">países diferentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Operations Table */}
      <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ fontSize: '20px' }}>
            <Globe className="h-5 w-5" />
            Operações ({filteredOperations.length} de {operations?.length || 0})
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
          ) : filteredOperations && filteredOperations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold">Operação</th>
                    <th className="text-left py-3 px-4 font-semibold">País</th>
                    <th className="text-left py-3 px-4 font-semibold">Moeda</th>
                    <th className="text-left py-3 px-4 font-semibold">Loja</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Criada em</th>
                    <th className="text-left py-3 px-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOperations.map((operation) => (
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
                          <span>{getCountryFlag(operation.country)}</span>
                          <span className="text-sm font-medium">{operation.country}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">
                          {operation.currency}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">{operation.storeName || 'N/A'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={operation.status === 'active' ? "default" : "secondary"}>
                          {operation.status === 'active' ? 'Ativa' : operation.status === 'paused' ? 'Pausada' : 'Arquivada'}
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
                            onClick={() => {
                              setOperationToEdit(operation);
                              setShowEditModal(true);
                            }}
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
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm || filterId || filterDateFrom || filterDateTo || filterCountry !== "all"
                  ? "Nenhuma operação encontrada" 
                  : "Nenhuma operação encontrada"}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm || filterId || filterDateFrom || filterDateTo || filterCountry !== "all"
                  ? "Tente ajustar os filtros de busca"
                  : "Comece criando a primeira operação do sistema"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals removed - operations page only displays operations list */}
      {/* Create Operation Modal - TODO: Implement operation creation when API is available */}
      {/* Edit Operation Modal - TODO: Implement operation editing when API is available */}
      {/* Delete Operation Modal - TODO: Implement operation deletion when API is available */}
      {/* All modals below are disabled until APIs are implemented */}
      {/* @ts-ignore - Modals disabled, variables not defined */}
      {false && (
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
            <div>
              <Label htmlFor="operation-prefix">Prefixo de Pedidos (para FHB/Warehouse)</Label>
              <Input
                id="operation-prefix"
                value={newOperationData.shopifyOrderPrefix}
                onChange={(e) => setNewOperationData({ ...newOperationData, shopifyOrderPrefix: e.target.value })}
                placeholder="Ex: Ox, LOJA01-, ES-"
                data-testid="input-operation-prefix"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Prefixo usado para identificar pedidos desta operação (ex: "Ox" para pedidos Ox173, Ox174...)
              </p>
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
      )}

      {/* Edit Operation Modal - Disabled until APIs are implemented */}
      {/* @ts-ignore - Modal disabled, variables not defined */}
      {false && (
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
                <div>
                  <Label htmlFor="edit-operation-prefix" className="text-sm text-slate-400">Prefixo da Operação</Label>
                  <Input
                    id="edit-operation-prefix"
                    value={editOperationData.shopifyOrderPrefix}
                    onChange={(e) => setEditOperationData({ ...editOperationData, shopifyOrderPrefix: e.target.value })}
                    className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
                    placeholder="Ex: ESP-, PT-, IT-"
                    data-testid="input-operation-prefix"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Prefixo usado para identificar pedidos desta operação
                  </p>
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
                      {/* Platforms Section */}
                      <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                              <ShoppingCart className="h-5 w-5 text-green-400" />
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-white">Plataformas</h5>
                              <p className="text-xs text-slate-400">
                                {operationIntegrations?.platforms?.length || 0} {operationIntegrations?.platforms?.length === 1 ? 'plataforma configurada' : 'plataformas configuradas'}
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setPlatformData({
                                platform: 'shopify',
                                shopName: '',
                                accessToken: '',
                                storeSlug: '',
                                bearerToken: ''
                              });
                              setEditingPlatformId(null);
                              setShowPlatformModal(true);
                            }}
                            className="text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                          >
                            <Plus className="h-3 w-3 mr-2" />
                            Adicionar
                          </Button>
                        </div>
                        
                        {/* List of configured platforms */}
                        <div className="space-y-2">
                          {operationIntegrations?.platforms && operationIntegrations.platforms.length > 0 ? (
                            operationIntegrations.platforms.map((platform) => {
                              const platformNames: Record<string, string> = {
                                'shopify': 'Shopify',
                                'cartpanda': 'CartPanda'
                              };
                              
                              const platformInfo = platform.platform === 'shopify'
                                ? `Loja: ${(platform as any).shopName || 'N/A'}`
                                : `Slug: ${(platform as any).storeSlug || 'N/A'}`;
                              
                              return (
                                <div key={platform.id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium text-white">
                                        {platformNames[platform.platform] || platform.platform}
                                      </span>
                                      <span className="text-xs text-slate-400">
                                        {platformInfo}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${
                                        platform.status === 'active' 
                                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                          : platform.status === 'pending'
                                          ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      {platform.status === 'active' ? 'Ativo' : platform.status === 'pending' ? 'Pendente' : 'Erro'}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (platform.platform === 'shopify') {
                                          setPlatformData({
                                            platform: 'shopify',
                                            shopName: (platform as any).shopName || '',
                                            accessToken: '',
                                            storeSlug: '',
                                            bearerToken: ''
                                          });
                                        } else {
                                          setPlatformData({
                                            platform: 'cartpanda',
                                            shopName: '',
                                            accessToken: '',
                                            storeSlug: (platform as any).storeSlug || '',
                                            bearerToken: ''
                                          });
                                        }
                                        setEditingPlatformId(platform.id);
                                        setShowPlatformModal(true);
                                      }}
                                      className="h-8 px-2 text-slate-400 hover:text-white"
                                      data-testid={`button-edit-platform-${platform.id}`}
                                    >
                                      <Settings className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeletePlatform(platform.id, platform.platform)}
                                      className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                      data-testid={`button-delete-platform-${platform.id}`}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-6 text-slate-400 text-sm">
                              <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>Nenhuma plataforma configurada</p>
                              <p className="text-xs mt-1">Clique em "Adicionar" para começar</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Ads Accounts Section */}
                      <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                              <Globe className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-white">Anúncios</h5>
                              <p className="text-xs text-slate-400">
                                {operationIntegrations?.adsAccounts?.length || 0} {operationIntegrations?.adsAccounts?.length === 1 ? 'conta configurada' : 'contas configuradas'}
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setAdsData({
                                platform: 'meta',
                                accountId: '', 
                                accountName: '', 
                                accessToken: '',
                                customerId: '',
                                refreshToken: ''
                              });
                              setEditingAdsId(null);
                              setShowAdsModal(true);
                            }}
                            className="text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                          >
                            <Plus className="h-3 w-3 mr-2" />
                            Adicionar
                          </Button>
                        </div>
                        
                        {/* List of configured ads accounts */}
                        <div className="space-y-2">
                          {operationIntegrations?.adsAccounts && operationIntegrations.adsAccounts.length > 0 ? (
                            operationIntegrations.adsAccounts.map((account) => {
                              const platformNames: Record<string, string> = {
                                'meta': 'Meta Ads',
                                'google': 'Google Ads'
                              };
                              
                              const accountInfo = account.platform === 'meta'
                                ? `Conta: ${(account as any).accountId || 'N/A'}`
                                : `Cliente: ${(account as any).customerId || 'N/A'}`;
                              
                              return (
                                <div key={account.id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium text-white">
                                        {platformNames[account.platform] || account.platform}
                                      </span>
                                      <span className="text-xs text-slate-400">
                                        {accountInfo}
                                      </span>
                                      {(account as any).accountName && (
                                        <span className="text-xs text-slate-500">
                                          {(account as any).accountName}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${
                                        account.status === 'active' 
                                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                          : account.status === 'pending'
                                          ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      {account.status === 'active' ? 'Ativo' : account.status === 'pending' ? 'Pendente' : 'Erro'}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (account.platform === 'meta') {
                                          setAdsData({
                                            platform: 'meta',
                                            accountId: (account as any).accountId || '',
                                            accountName: (account as any).accountName || '',
                                            accessToken: '',
                                            customerId: '',
                                            refreshToken: ''
                                          });
                                        } else {
                                          setAdsData({
                                            platform: 'google',
                                            accountId: '',
                                            accountName: (account as any).accountName || '',
                                            accessToken: '',
                                            customerId: (account as any).customerId || '',
                                            refreshToken: ''
                                          });
                                        }
                                        setEditingAdsId(account.id);
                                        setShowAdsModal(true);
                                      }}
                                      className="h-8 px-2 text-slate-400 hover:text-white"
                                      data-testid={`button-edit-ads-${account.id}`}
                                    >
                                      <Settings className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteAds(account.id, account.platform)}
                                      className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                      data-testid={`button-delete-ads-${account.id}`}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-6 text-slate-400 text-sm">
                              <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>Nenhuma conta de anúncios configurada</p>
                              <p className="text-xs mt-1">Clique em "Adicionar" para começar</p>
                            </div>
                          )}
                        </div>
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
      )}

      {/* Delete Confirmation Modal - Disabled until APIs are implemented */}
      {/* @ts-ignore - Modal disabled, variables not defined */}
      {false && (
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
      )}

      {/* Platform Integration Modal - Disabled until APIs are implemented */}
      {/* @ts-ignore - Modal disabled, variables not defined */}
      {false && (
      <Dialog open={showPlatformModal} onOpenChange={(open) => {
        setShowPlatformModal(open);
        if (!open) {
          setEditingPlatformId(null);
          setPlatformData({ 
            platform: 'shopify',
            shopName: '', 
            accessToken: '',
            storeSlug: '',
            bearerToken: ''
          });
        }
      }}>
        <DialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-white/20">
          <DialogHeader>
            <DialogTitle>{editingPlatformId ? 'Editar Plataforma' : 'Adicionar Plataforma'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure sua plataforma de e-commerce
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="platform-type" className="text-sm text-slate-400">Plataforma</Label>
              <Select value={platformData.platform} onValueChange={(value) => setPlatformData({ ...platformData, platform: value })}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="shopify" className="text-white hover:bg-gray-700">Shopify</SelectItem>
                  <SelectItem value="cartpanda" className="text-white hover:bg-gray-700">CartPanda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {platformData.platform === 'shopify' ? (
              <>
                <div>
                  <Label htmlFor="platform-shopname" className="text-sm text-slate-400">Nome da Loja</Label>
                  <Input
                    id="platform-shopname"
                    placeholder="minhaloja.myshopify.com"
                    value={platformData.shopName}
                    onChange={(e) => setPlatformData({ ...platformData, shopName: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="platform-token" className="text-sm text-slate-400">Access Token</Label>
                  <Input
                    id="platform-token"
                    type="password"
                    placeholder="shpat_..."
                    value={platformData.accessToken}
                    onChange={(e) => setPlatformData({ ...platformData, accessToken: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="platform-slug" className="text-sm text-slate-400">Store Slug</Label>
                  <Input
                    id="platform-slug"
                    placeholder="minhaloja-test"
                    value={platformData.storeSlug}
                    onChange={(e) => setPlatformData({ ...platformData, storeSlug: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="platform-bearer" className="text-sm text-slate-400">Bearer Token</Label>
                  <Input
                    id="platform-bearer"
                    type="password"
                    placeholder="Bearer token..."
                    value={platformData.bearerToken}
                    onChange={(e) => setPlatformData({ ...platformData, bearerToken: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlatformModal(false)} className="border-white/20 text-white hover:bg-white/10">
              Cancelar
            </Button>
            <Button 
              onClick={() => savePlatformIntegrationMutation.mutate(platformData)}
              disabled={
                savePlatformIntegrationMutation.isPending || 
                (platformData.platform === 'shopify' 
                  ? (!platformData.shopName || !platformData.accessToken)
                  : (!platformData.storeSlug || !platformData.bearerToken)
                )
              }
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {savePlatformIntegrationMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      {/* Fulfillment Integration Modal - Disabled until APIs are implemented */}
      {/* @ts-ignore - Modal disabled, variables not defined */}
      {false && (
      <Dialog open={showFulfillmentModal} onOpenChange={(open) => {
        setShowFulfillmentModal(open);
        if (!open) {
          setEditingWarehouseId(null);
          setFulfillmentData({ 
            provider: 'european_fulfillment', 
            username: '', 
            password: '',
            appId: '',
            secret: ''
          });
        }
      }}>
        <DialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-white/20">
          <DialogHeader>
            <DialogTitle>{editingWarehouseId ? 'Editar Armazém' : 'Adicionar Armazém'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure seu provedor de armazenamento
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
              disabled={
                saveFulfillmentIntegrationMutation.isPending || 
                !fulfillmentData.username || 
                !fulfillmentData.password
              }
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saveFulfillmentIntegrationMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      {/* Ads Integration Modal - Disabled until APIs are implemented */}
      {/* @ts-ignore - Modal disabled, variables not defined */}
      {false && (
      <Dialog open={showAdsModal} onOpenChange={(open) => {
        setShowAdsModal(open);
        if (!open) {
          setEditingAdsId(null);
          setAdsData({ 
            platform: 'meta',
            accountId: '', 
            accountName: '', 
            accessToken: '',
            customerId: '',
            refreshToken: ''
          });
        }
      }}>
        <DialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-white/20">
          <DialogHeader>
            <DialogTitle>{editingAdsId ? 'Editar Conta de Anúncios' : 'Adicionar Conta de Anúncios'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure sua conta de anúncios (Meta ou Google)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ads-platform" className="text-sm text-slate-400">Plataforma</Label>
              <Select value={adsData.platform} onValueChange={(value) => setAdsData({ ...adsData, platform: value })}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="meta" className="text-white hover:bg-gray-700">Meta Ads</SelectItem>
                  <SelectItem value="google" className="text-white hover:bg-gray-700">Google Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {adsData.platform === 'meta' ? (
              <>
                <div>
                  <Label htmlFor="ads-account-id" className="text-sm text-slate-400">Account ID</Label>
                  <Input
                    id="ads-account-id"
                    placeholder="act_123456789"
                    value={adsData.accountId}
                    onChange={(e) => setAdsData({ ...adsData, accountId: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="ads-account-name" className="text-sm text-slate-400">Nome da Conta (opcional)</Label>
                  <Input
                    id="ads-account-name"
                    placeholder="Minha Conta de Anúncios"
                    value={adsData.accountName}
                    onChange={(e) => setAdsData({ ...adsData, accountName: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="ads-access-token" className="text-sm text-slate-400">Access Token</Label>
                  <Input
                    id="ads-access-token"
                    type="password"
                    placeholder="EAAx..."
                    value={adsData.accessToken}
                    onChange={(e) => setAdsData({ ...adsData, accessToken: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="ads-customer-id" className="text-sm text-slate-400">Customer ID</Label>
                  <Input
                    id="ads-customer-id"
                    placeholder="123-456-7890"
                    value={adsData.customerId}
                    onChange={(e) => setAdsData({ ...adsData, customerId: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="ads-account-name-google" className="text-sm text-slate-400">Nome da Conta (opcional)</Label>
                  <Input
                    id="ads-account-name-google"
                    placeholder="Minha Conta Google Ads"
                    value={adsData.accountName}
                    onChange={(e) => setAdsData({ ...adsData, accountName: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="ads-refresh-token" className="text-sm text-slate-400">Refresh Token</Label>
                  <Input
                    id="ads-refresh-token"
                    type="password"
                    placeholder="Refresh token..."
                    value={adsData.refreshToken}
                    onChange={(e) => setAdsData({ ...adsData, refreshToken: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdsModal(false)} className="border-white/20 text-white hover:bg-white/10">
              Cancelar
            </Button>
            <Button 
              onClick={() => saveAdsIntegrationMutation.mutate(adsData)}
              disabled={
                saveAdsIntegrationMutation.isPending || 
                (adsData.platform === 'meta' 
                  ? (!adsData.accountId || !adsData.accessToken)
                  : (!adsData.customerId || !adsData.refreshToken)
                )
              }
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {saveAdsIntegrationMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
