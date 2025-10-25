import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  UserPlus,
  Edit,
  Trash2,
  Shield,
  User,
  Briefcase,
  Crown,
  Settings,
  DollarSign,
  Store,
  Truck,
  Plus,
  X,
  Check
} from "lucide-react";
import { WarehouseAccountCard } from "@/components/admin/warehouse-account-card";
import { 
  FHBIntegrationForm, 
  EuropeanFulfillmentIntegrationForm, 
  ElogyIntegrationForm,
  type WarehouseFormData 
} from "@/components/admin/warehouse-integration-forms";
import { apiRequest } from "@/lib/queryClient";

// Define available pages for different user types
const USER_PAGES = [
  { id: 'dashboard', name: 'Dashboard', description: 'Visão geral e métricas', icon: '📊' },
  { id: 'hub', name: 'Hub', description: 'Marketplace e produtos', icon: '🛍️' },
  { id: 'orders', name: 'Pedidos', description: 'Gestão de pedidos', icon: '📦' },
  { id: 'ads', name: 'Anúncios', description: 'Campanhas publicitárias', icon: '📢' },
  { id: 'analytics', name: 'Analytics', description: 'Análises e relatórios', icon: '📈' },
  { id: 'creatives', name: 'Criativos', description: 'Gestão de criativos publicitários', icon: '🎨' },
  { id: 'funnels', name: 'Funis de Venda', description: 'Criação e edição de funis de vendas', icon: '🔄' },
  { id: 'support', name: 'Suporte', description: 'Central de suporte ao cliente', icon: '🎧' },
  { id: 'integrations', name: 'Integrações', description: 'Configuração de integrações', icon: '🔌' },
  { id: 'tools', name: 'Ferramentas', description: 'Ferramentas do sistema', icon: '🔧' }
];

const ADMIN_PAGES = [
  { id: 'dashboard', name: 'Dashboard', description: 'Painel administrativo', icon: '📊' },
  { id: 'orders', name: 'Pedidos', description: 'Gestão global de pedidos', icon: '📦' },
  { id: 'stores', name: 'Lojas', description: 'Gestão de lojas', icon: '🏪' },
  { id: 'users', name: 'Usuários', description: 'Gestão de usuários', icon: '👥' },
  { id: 'products', name: 'Produtos', description: 'Gestão de produtos', icon: '📋' },
  { id: 'global', name: 'Global', description: 'Configurações globais', icon: '🌍' },
  { id: 'support', name: 'Suporte', description: 'Central de suporte', icon: '🎧' },
  { id: 'hub-control', name: 'Hub Control', description: 'Controle do marketplace', icon: '⚙️' },
  { id: 'settings', name: 'Configurações', description: 'Configurações gerais', icon: '⚙️' }
];

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  permissions?: string[];
  isSupplier?: boolean;
  supplierType?: string;
  lastLoginAt?: string;
  isActive?: boolean;
  onboardingCompleted?: boolean;
}

export default function AdminUsers() {
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);
  const [userToEdit, setUserToEdit] = useState<SystemUser | null>(null);
  const [createWizardStep, setCreateWizardStep] = useState<'basic' | 'integrations'>('basic');
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'store',
    operationIds: [] as string[]
  });
  
  // State for warehouse accounts being configured
  const [newWarehouseAccounts, setNewWarehouseAccounts] = useState<Array<{
    tempId: string;
    providerKey: string;
    accountName: string;
    credentials: Record<string, string>;
    operationIds: string[];
  }>>([]);
  
  // State for adding new warehouse account
  const [addingAccount, setAddingAccount] = useState<{
    providerKey: string;
    accountName: string;
    credentials: Record<string, string>;
    operationIds: string[];
  } | null>(null);
  const [editUserData, setEditUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    permissions: [] as string[],
    onboardingCompleted: false,
    isActive: true,
    forcePasswordChange: false
  });
  const [activeTab, setActiveTab] = useState("general");
  
  // State for warehouse accounts in edit modal
  const [addingEditWarehouseAccount, setAddingEditWarehouseAccount] = useState<{
    providerKey: string;
    formData: WarehouseFormData;
  } | null>(null);
  const [editingWarehouseAccountId, setEditingWarehouseAccountId] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: systemUsers, isLoading: usersLoading } = useQuery<SystemUser[]>({
    queryKey: ['/api/admin/users']
  });

  // Buscar warehouse providers catalog
  const { data: warehouseProviders, isLoading: warehouseProvidersLoading, isError: warehouseProvidersError } = useQuery<Array<{
    key: string;
    name: string;
    description: string | null;
    requiredFields: Array<{ fieldName: string; label: string; fieldType: string; required: boolean }>;
  }>>({
    queryKey: ['/api/warehouse/providers'],
    enabled: (showCreateUserModal && createWizardStep === 'integrations') || (showEditModal && activeTab === 'warehouse')
  });

  // Buscar todas as operações disponíveis
  const { data: allOperations, isLoading: operationsLoading } = useQuery<{ id: string; name: string; country: string }[]>({
    queryKey: ['/api/operations'],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      console.log('🔑 Fetching operations with token:', token ? 'exists' : 'missing');
      const response = await fetch('/api/operations', {
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      console.log('📡 Operations response status:', response.status);
      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Operations fetch error:', error);
        throw new Error(error.message || 'Erro ao buscar operações');
      }
      const data = await response.json();
      console.log('✅ Operations loaded:', data.length, 'items');
      return data;
    }
  });

  // Buscar operações do usuário atual sendo editado
  const { data: userOperations } = useQuery<{ operationId: string }[]>({
    queryKey: ['/api/admin/users', userToEdit?.id, 'operations'],
    enabled: !!userToEdit?.id,
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/users/${userToEdit?.id}/operations`, {
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error('Erro ao buscar operações do usuário');
      return response.json();
    }
  });

  // Buscar warehouse accounts do usuário em edição
  const { data: userWarehouseAccounts } = useQuery<Array<{
    id: string;
    displayName: string;
    providerKey: string;
    providerName: string;
    isActive: boolean;
    initialSyncCompleted: boolean;
    initialSyncCompletedAt?: string | null;
    lastTestedAt?: string | null;
    lastSyncAt?: string | null;
    operationIds?: string[];
  }>>({
    queryKey: ['/api/user/warehouse-accounts', userToEdit?.id],
    enabled: !!userToEdit?.id,
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/user/warehouse-accounts?userId=${userToEdit?.id}`, {
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error('Erro ao buscar warehouse accounts');
      return response.json();
    }
  });

  // Mutation para criar warehouse account
  const createWarehouseAccountMutation = useMutation({
    mutationFn: async (accountData: {
      userId: string;
      providerKey: string;
      accountName: string;
      credentials: Record<string, string>;
      operationIds: string[];
    }) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch('/api/user/warehouse-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
        body: JSON.stringify(accountData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar conta');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/warehouse-accounts', userToEdit?.id] });
      toast({
        title: "Conta criada",
        description: "A conta de warehouse foi criada com sucesso."
      });
      setAddingEditWarehouseAccount(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar conta",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation para deletar warehouse account
  const deleteWarehouseAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/user/warehouse-accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include"
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao deletar conta');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/warehouse-accounts', userToEdit?.id] });
      toast({
        title: "Conta excluída",
        description: "A conta de warehouse foi removida com sucesso."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir conta",
        description: error.message,
        variant: "destructive"
      });
    }
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
    mutationFn: async (userData: { name: string; email: string; password: string; role: string; operationIds: string[] }) => {
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
    onSuccess: async (createdUser) => {
      // Criar warehouse accounts se houver alguma configurada
      let successCount = 0;
      let failedAccounts: string[] = [];
      
      if (newWarehouseAccounts.length > 0) {
        const token = localStorage.getItem("auth_token");
        
        for (const account of newWarehouseAccounts) {
          try {
            const accountResponse = await fetch('/api/user/warehouse-accounts', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token && { "Authorization": `Bearer ${token}` }),
              },
              credentials: "include",
              body: JSON.stringify({
                userId: createdUser.user.id,
                providerKey: account.providerKey,
                accountName: account.accountName,
                credentials: account.credentials,
                isActive: true,
                operationIds: account.operationIds
              }),
            });
            
            if (accountResponse.ok) {
              successCount++;
            } else {
              failedAccounts.push(account.accountName);
              console.error(`Erro ao criar conta ${account.accountName}:`, await accountResponse.text());
            }
          } catch (error) {
            failedAccounts.push(account.accountName);
            console.error(`Erro ao criar conta ${account.accountName}:`, error);
          }
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      
      // Mensagem de sucesso personalizada
      let message = "O usuário foi criado com sucesso.";
      if (successCount > 0 && failedAccounts.length === 0) {
        message = `Usuário criado com ${successCount} conta(s) de warehouse.`;
      } else if (successCount > 0 && failedAccounts.length > 0) {
        message = `Usuário criado com ${successCount} conta(s). ${failedAccounts.length} falhou(aram).`;
      }
      
      toast({
        title: "Usuário criado",
        description: message,
      });
      
      // Alerta separado para contas que falharam
      if (failedAccounts.length > 0) {
        setTimeout(() => {
          toast({
            title: "Algumas contas não foram criadas",
            description: `Configure manualmente: ${failedAccounts.join(', ')}`,
            variant: "destructive"
          });
        }, 1000);
      }
      
      setShowCreateUserModal(false);
      setNewUserData({ name: '', email: '', password: '', role: 'store', operationIds: [] });
      setNewWarehouseAccounts([]);
      setAddingAccount(null);
      setCreateWizardStep('basic');
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
    mutationFn: async (userData: { 
      id: string; 
      name?: string; 
      email?: string; 
      password?: string; 
      role?: string; 
      permissions?: string[];
      onboardingCompleted?: boolean;
      isActive?: boolean;
      forcePasswordChange?: boolean;
    }) => {
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
        description: "Os dados do usuário foram atualizados com sucesso.",
      });
      setShowEditModal(false);
      setUserToEdit(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao editar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      'super_admin': { 
        label: 'Super Admin', 
        icon: Crown, 
        color: 'text-red-500' 
      },
      'admin': { 
        label: 'Administrador', 
        icon: Settings, 
        color: 'text-purple-500' 
      },
      'admin_financeiro': { 
        label: 'Admin Financeiro', 
        icon: DollarSign, 
        color: 'text-yellow-500' 
      },
      'store': { 
        label: 'Loja', 
        icon: Store, 
        color: 'text-blue-500' 
      },
      'supplier': { 
        label: 'Fornecedor', 
        icon: Truck, 
        color: 'text-green-500' 
      },
      'user': { 
        label: 'Cliente', 
        icon: User, 
        color: 'text-gray-500' 
      },
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || {
      label: role,
      icon: User,
      color: 'text-gray-500'
    };
    
    const IconComponent = config.icon;
    
    return (
      <div className="flex items-center gap-2 py-1">
        <IconComponent className={`h-4 w-4 ${config.color}`} />
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
      </div>
    );
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Shield className="h-4 w-4 text-red-600" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-purple-600" />;
      case 'admin_financeiro':
        return <Briefcase className="h-4 w-4 text-yellow-600" />;
      case 'supplier':
        return <Briefcase className="h-4 w-4 text-green-600" />;
      default:
        return <User className="h-4 w-4 text-blue-600" />;
    }
  };

  // Get available pages based on user role
  const getAvailablePages = (role: string) => {
    if (role === 'super_admin') return ADMIN_PAGES;
    return USER_PAGES;
  };

  // Toggle permission for a specific page - functional and idempotent
  const togglePermission = (pageId: string, nextChecked?: boolean) => {
    setEditUserData(prev => {
      const has = prev.permissions.includes(pageId);
      const shouldAdd = nextChecked !== undefined ? Boolean(nextChecked) : !has;
      if (shouldAdd === has) return prev; // no-op prevents extra renders
      
      const permissions = shouldAdd 
        ? [...prev.permissions, pageId] 
        : prev.permissions.filter(p => p !== pageId);
      
      return { ...prev, permissions };
    });
  };

  const handleEditUser = (user: SystemUser) => {
    setUserToEdit(user);
    setEditUserData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      permissions: user.permissions || [],
      onboardingCompleted: user.onboardingCompleted || false,
      isActive: user.isActive ?? true,
      forcePasswordChange: false
    });
    setActiveTab("general");
    setShowEditModal(true);
  };

  const handleSubmitEdit = () => {
    if (!userToEdit) return;
    
    const updateData: any = { id: userToEdit.id };
    let hasChanges = false;
    
    if (editUserData.name !== userToEdit.name) {
      updateData.name = editUserData.name;
      hasChanges = true;
    }
    if (editUserData.email !== userToEdit.email) {
      updateData.email = editUserData.email;
      hasChanges = true;
    }
    if (editUserData.password) {
      updateData.password = editUserData.password;
      hasChanges = true;
    }
    if (editUserData.role !== userToEdit.role) {
      updateData.role = editUserData.role;
      hasChanges = true;
    }
    if (JSON.stringify(editUserData.permissions) !== JSON.stringify(userToEdit.permissions || [])) {
      updateData.permissions = editUserData.permissions;
      hasChanges = true;
    }
    if (editUserData.onboardingCompleted !== (userToEdit.onboardingCompleted || false)) {
      updateData.onboardingCompleted = editUserData.onboardingCompleted;
      hasChanges = true;
    }
    if (editUserData.isActive !== (userToEdit.isActive ?? true)) {
      updateData.isActive = editUserData.isActive;
      hasChanges = true;
    }
    if (editUserData.forcePasswordChange) {
      updateData.forcePasswordChange = editUserData.forcePasswordChange;
      hasChanges = true;
    }
    
    // Só fazer a mutação se houver mudanças
    if (!hasChanges) {
      toast({
        title: "Nenhuma alteração",
        description: "Nenhum campo foi modificado.",
      });
      setShowEditModal(false);
      return;
    }
    
    editUserMutation.mutate(updateData);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold tracking-tight text-gray-900 dark:text-gray-100" style={{fontSize: '22px'}}>
            Usuários
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie todos os usuários do sistema
          </p>
        </div>
        <Button onClick={() => setShowCreateUserModal(true)} className="text-white">
          <UserPlus className="h-4 w-4 mr-2 text-white" />
          Novo Usuário
        </Button>
      </div>

      {/* Users Table */}
      <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
        <CardContent>
          <div className="mt-[15px] mb-4">
            <p className="text-sm text-gray-400">
              {systemUsers?.length || 0} usuários
            </p>
          </div>
          {usersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando usuários...</p>
              </div>
            </div>
          ) : systemUsers && systemUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold">Usuário</th>
                    <th className="text-left py-3 px-4 font-semibold">Função</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Criado em</th>
                    <th className="text-left py-3 px-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {systemUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {getRoleIcon(user.role)}
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge 
                          variant={user.isActive !== false ? "default" : "secondary"}
                          className={user.isActive !== false ? "text-white" : ""}
                        >
                          {user.isActive !== false ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">
                          {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setUserToDelete(user);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-700"
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
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum usuário encontrado</h3>
              <p className="text-muted-foreground">
                Comece criando o primeiro usuário do sistema
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Modal - 2 Step Wizard */}
      <Dialog open={showCreateUserModal} onOpenChange={(open) => {
        setShowCreateUserModal(open);
        if (!open) {
          setCreateWizardStep('basic');
          setNewUserData({ name: '', email: '', password: '', role: 'store', operationIds: [] });
          setNewWarehouseAccounts([]);
          setAddingAccount(null);
        }
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>
              {createWizardStep === 'basic' 
                ? 'Preencha as informações básicas do usuário' 
                : 'Configure as integrações de warehouse (opcional)'}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={createWizardStep} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic" disabled>
                1. Informações Básicas
              </TabsTrigger>
              <TabsTrigger 
                value="integrations" 
                disabled={newUserData.role !== 'user'}
                className="disabled:opacity-50"
              >
                2. Integrações{newUserData.role !== 'user' && ' (somente clientes)'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  placeholder="Nome completo"
                  data-testid="input-new-user-name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  data-testid="input-new-user-email"
                />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  placeholder="Senha segura"
                  data-testid="input-new-user-password"
                />
              </div>
              <div>
                <Label htmlFor="role">Função</Label>
                <Select 
                  value={newUserData.role} 
                  onValueChange={(value) => {
                    setNewUserData({ ...newUserData, role: value });
                    if (value !== 'user' && createWizardStep === 'integrations') {
                      setCreateWizardStep('basic');
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-new-user-role">
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Cliente</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="admin_financeiro">Administrador Financeiro</SelectItem>
                    <SelectItem value="supplier">Fornecedor</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="integrations" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      Integrações de Warehouse (Opcional)
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Configure contas de warehouse (FHB, European Fulfillment, eLogy) para este usuário. 
                      Você pode pular esta etapa e configurar depois.
                    </p>
                  </div>
                </div>

                {warehouseProvidersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">Carregando providers...</p>
                  </div>
                ) : warehouseProvidersError ? (
                  <div className="text-center py-8">
                    <Badge variant="destructive">Erro ao carregar providers</Badge>
                    <p className="text-xs text-muted-foreground mt-2">
                      Você pode configurar as integrações depois na edição do usuário
                    </p>
                  </div>
                ) : warehouseProviders && warehouseProviders.length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {warehouseProviders.map((provider) => (
                      <AccordionItem key={provider.key} value={provider.key} data-testid={`accordion-provider-${provider.key}`}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-3">
                              <Truck className="h-4 w-4 text-muted-foreground" />
                              <div className="text-left">
                                <p className="font-medium">{provider.name}</p>
                                {provider.description && (
                                  <p className="text-xs text-muted-foreground">{provider.description}</p>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline" className="ml-auto mr-2">
                              {newWarehouseAccounts.filter(acc => acc.providerKey === provider.key).length} conta(s)
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            {newWarehouseAccounts
                              .filter(acc => acc.providerKey === provider.key)
                              .map((account) => (
                                <div 
                                  key={account.tempId} 
                                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                  data-testid={`warehouse-account-${account.tempId}`}
                                >
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{account.accountName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Configurar operações após criação
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setNewWarehouseAccounts(prev => prev.filter(a => a.tempId !== account.tempId));
                                      toast({
                                        title: "Conta removida",
                                        description: "A conta foi removida da lista."
                                      });
                                    }}
                                    data-testid={`button-remove-account-${account.tempId}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}

                            {addingAccount?.providerKey === provider.key ? (
                              <div className="p-4 border rounded-lg space-y-3" data-testid={`form-add-account-${provider.key}`}>
                                <div>
                                  <Label htmlFor={`account-name-${provider.key}`}>Nome da Conta</Label>
                                  <Input
                                    id={`account-name-${provider.key}`}
                                    placeholder="Ex: FHB Principal"
                                    value={addingAccount.accountName}
                                    onChange={(e) => setAddingAccount({ ...addingAccount, accountName: e.target.value })}
                                    data-testid={`input-account-name-${provider.key}`}
                                  />
                                </div>

                                {provider.requiredFields.map((field) => (
                                  <div key={field.fieldName}>
                                    <Label htmlFor={`${provider.key}-${field.fieldName}`}>
                                      {field.label} {field.required && <span className="text-destructive">*</span>}
                                    </Label>
                                    {field.fieldType === 'select' && field.fieldName === 'country' ? (
                                      <Select
                                        value={addingAccount.credentials[field.fieldName] || ''}
                                        onValueChange={(value) => setAddingAccount({
                                          ...addingAccount,
                                          credentials: { ...addingAccount.credentials, [field.fieldName]: value }
                                        })}
                                      >
                                        <SelectTrigger data-testid={`select-credential-${provider.key}-${field.fieldName}`}>
                                          <SelectValue placeholder="Selecione o país" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="spain">🇪🇸 Espanha</SelectItem>
                                          <SelectItem value="portugal">🇵🇹 Portugal</SelectItem>
                                          <SelectItem value="italy">🇮🇹 Itália</SelectItem>
                                          <SelectItem value="poland">🇵🇱 Polônia</SelectItem>
                                          <SelectItem value="slovakia">🇸🇰 Eslováquia</SelectItem>
                                          <SelectItem value="czechrepublic">🇨🇿 República Tcheca</SelectItem>
                                          <SelectItem value="romania">🇷🇴 Romênia</SelectItem>
                                          <SelectItem value="bulgaria">🇧🇬 Bulgária</SelectItem>
                                          <SelectItem value="greece">🇬🇷 Grécia</SelectItem>
                                          <SelectItem value="hungary">🇭🇺 Hungria</SelectItem>
                                          <SelectItem value="slovenia">🇸🇮 Eslovênia</SelectItem>
                                          <SelectItem value="croatia">🇭🇷 Croácia</SelectItem>
                                          <SelectItem value="austria">🇦🇹 Áustria</SelectItem>
                                          <SelectItem value="germany">🇩🇪 Alemanha</SelectItem>
                                          <SelectItem value="france">🇫🇷 França</SelectItem>
                                          <SelectItem value="belgium">🇧🇪 Bélgica</SelectItem>
                                          <SelectItem value="netherlands">🇳🇱 Holanda</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <Input
                                        id={`${provider.key}-${field.fieldName}`}
                                        type={field.fieldType === 'password' ? 'password' : 'text'}
                                        placeholder={`Digite ${field.label.toLowerCase()}`}
                                        value={addingAccount.credentials[field.fieldName] || ''}
                                        onChange={(e) => setAddingAccount({
                                          ...addingAccount,
                                          credentials: { ...addingAccount.credentials, [field.fieldName]: e.target.value }
                                        })}
                                        data-testid={`input-credential-${provider.key}-${field.fieldName}`}
                                      />
                                    )}
                                  </div>
                                ))}

                                <div className="flex gap-2 justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAddingAccount(null)}
                                    data-testid={`button-cancel-add-${provider.key}`}
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      if (!addingAccount.accountName.trim()) {
                                        toast({
                                          title: "Nome obrigatório",
                                          description: "Preencha o nome da conta.",
                                          variant: "destructive"
                                        });
                                        return;
                                      }

                                      const missingFields = provider.requiredFields
                                        .filter(f => f.required && !addingAccount.credentials[f.fieldName]?.trim());
                                      
                                      if (missingFields.length > 0) {
                                        toast({
                                          title: "Campos obrigatórios faltando",
                                          description: `Preencha: ${missingFields.map(f => f.label).join(', ')}`,
                                          variant: "destructive"
                                        });
                                        return;
                                      }

                                      const newAccount = {
                                        ...addingAccount,
                                        tempId: `temp-${Date.now()}-${Math.random()}`,
                                        operationIds: []
                                      };
                                      setNewWarehouseAccounts(prev => [...prev, newAccount]);
                                      setAddingAccount(null);
                                      toast({
                                        title: "Conta adicionada",
                                        description: `${addingAccount.accountName} foi adicionada.`
                                      });
                                    }}
                                    data-testid={`button-save-add-${provider.key}`}
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Adicionar Conta
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => setAddingAccount({
                                  providerKey: provider.key,
                                  accountName: '',
                                  credentials: {},
                                  operationIds: []
                                })}
                                data-testid={`button-add-account-${provider.key}`}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Adicionar Conta {provider.name}
                              </Button>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Nenhum provider disponível</p>
                  </div>
                )}

                {newWarehouseAccounts.length > 0 && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-900 dark:text-green-100">
                      <Check className="h-4 w-4 inline mr-1" />
                      {newWarehouseAccounts.length} conta(s) de warehouse configurada(s)
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex justify-between items-center">
            <div>
              {createWizardStep === 'integrations' && (
                <Button 
                  variant="ghost" 
                  onClick={() => setCreateWizardStep('basic')}
                  data-testid="button-wizard-back"
                >
                  ← Voltar
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateUserModal(false)}
                data-testid="button-cancel-create-user"
              >
                Cancelar
              </Button>
              {createWizardStep === 'basic' ? (
                newUserData.role === 'user' ? (
                  <Button 
                    onClick={() => {
                      if (!newUserData.name.trim() || !newUserData.email.trim() || !newUserData.password.trim()) {
                        toast({
                          title: "Campos obrigatórios",
                          description: "Preencha nome, email e senha antes de continuar.",
                          variant: "destructive"
                        });
                        return;
                      }
                      setCreateWizardStep('integrations');
                    }}
                    data-testid="button-wizard-next"
                  >
                    Próximo →
                  </Button>
                ) : (
                  <Button 
                    onClick={() => {
                      if (!newUserData.name.trim() || !newUserData.email.trim() || !newUserData.password.trim()) {
                        toast({
                          title: "Campos obrigatórios",
                          description: "Preencha nome, email e senha antes de criar o usuário.",
                          variant: "destructive"
                        });
                        return;
                      }
                      createUserMutation.mutate(newUserData);
                    }}
                    disabled={createUserMutation.isPending}
                    data-testid="button-create-user-submit"
                  >
                    {createUserMutation.isPending ? 'Criando...' : 'Criar Usuário'}
                  </Button>
                )
              ) : (
                <Button 
                  onClick={() => createUserMutation.mutate(newUserData)}
                  disabled={createUserMutation.isPending}
                  data-testid="button-create-user-complete"
                >
                  {createUserMutation.isPending ? 'Criando...' : 'Concluir e Criar'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={(open) => {
        if (!open) {
          setActiveTab("general");
          setShowEditModal(false);
        }
      }}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-400">
              <Edit className="h-5 w-5" />
              Editar Usuário
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Edite as informações do usuário <strong className="text-white">{userToEdit?.name}</strong>. 
              Deixe a senha em branco para não alterá-la.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-white/10 border border-white/20">
              <TabsTrigger value="general" className="data-[state=active]:bg-blue-600">
                Informações Gerais
              </TabsTrigger>
              <TabsTrigger value="permissions" className="data-[state=active]:bg-blue-600">
                Permissões
              </TabsTrigger>
              <TabsTrigger value="operations" className="data-[state=active]:bg-blue-600">
                Operações
              </TabsTrigger>
              <TabsTrigger value="warehouse" className="data-[state=active]:bg-blue-600" data-testid="tab-warehouse">
                Warehouse
              </TabsTrigger>
            </TabsList>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSubmitEdit(); }} className="space-y-4">
              <TabsContent value="general" className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="edit-name" className="text-sm text-slate-400">Nome</Label>
                  <Input
                    id="edit-name"
                    value={editUserData.name}
                    onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
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
                    value={editUserData.email}
                    onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
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
                    value={editUserData.password}
                    onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })}
                    className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
                    placeholder="Nova senha (opcional)"
                    data-testid="input-edit-user-password"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-role" className="text-sm text-slate-400">Tipo de Usuário</Label>
                  <Select value={editUserData.role} onValueChange={(value) => setEditUserData({ ...editUserData, role: value })}>
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

                {/* Account Status Card */}
                <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${editUserData.isActive ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        {editUserData.isActive ? '✅' : '🔒'}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white mb-1">
                        Status da Conta
                      </h4>
                      <p className="text-xs text-slate-400">
                        {editUserData.isActive 
                          ? 'Conta ativa - usuário pode fazer login'
                          : 'Conta desativada - acesso bloqueado'
                        }
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <Checkbox
                        checked={editUserData.isActive}
                        onCheckedChange={(checked) => 
                          setEditUserData({ ...editUserData, isActive: checked === true })
                        }
                        data-testid="checkbox-user-active"
                      />
                    </div>
                  </div>
                  {!editUserData.isActive && (
                    <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                      ⚠️ Este usuário não poderá acessar o sistema até que a conta seja reativada
                    </div>
                  )}
                </div>

                {/* Activity Statistics Card */}
                {userToEdit?.lastLoginAt && (
                  <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500/20">
                          📊
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-white mb-1">
                          Atividade Recente
                        </h4>
                        <p className="text-xs text-slate-400">
                          Último login: {new Date(userToEdit.lastLoginAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Card */}
                <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${editUserData.forcePasswordChange ? 'bg-orange-500/20' : 'bg-gray-500/20'}`}>
                        🔐
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white mb-1">
                        Segurança da Senha
                      </h4>
                      <p className="text-xs text-slate-400">
                        {editUserData.forcePasswordChange 
                          ? 'Usuário será obrigado a alterar a senha no próximo login'
                          : 'Nenhuma ação de segurança pendente'
                        }
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <Checkbox
                        checked={editUserData.forcePasswordChange}
                        onCheckedChange={(checked) => 
                          setEditUserData({ ...editUserData, forcePasswordChange: checked === true })
                        }
                        data-testid="checkbox-force-password-change"
                      />
                    </div>
                  </div>
                  {editUserData.forcePasswordChange && (
                    <div className="mt-3 p-2 bg-orange-500/10 border border-orange-500/20 rounded text-xs text-orange-400">
                      🔔 O usuário receberá um aviso para alterar sua senha imediatamente após o login
                    </div>
                  )}
                </div>

                {/* Onboarding Status Card */}
                <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${editUserData.onboardingCompleted ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                        {editUserData.onboardingCompleted ? '✅' : '👤'}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white mb-1">
                        Status do Onboarding
                      </h4>
                      <p className="text-xs text-slate-400">
                        {editUserData.onboardingCompleted 
                          ? 'O onboarding foi concluído pelo usuário'
                          : 'O onboarding ainda não foi concluído'
                        }
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <Checkbox
                        checked={editUserData.onboardingCompleted}
                        onCheckedChange={(checked) => 
                          setEditUserData({ ...editUserData, onboardingCompleted: checked === true })
                        }
                        data-testid="checkbox-onboarding-completed"
                      />
                    </div>
                  </div>
                  {editUserData.onboardingCompleted && (
                    <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400">
                      ✨ Usuário pode acessar todas as funcionalidades do sistema
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="permissions" className="mt-4">
                <div className="space-y-4">
                  <div className="text-sm text-slate-400">
                    Controle as páginas que este usuário pode acessar baseado no seu tipo de conta.
                  </div>
                  
                  <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white mb-3">
                      {editUserData.role === 'super_admin' ? '🔧 Páginas Administrativas' : '👤 Páginas do Cliente'}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {getAvailablePages(editUserData.role).map((page) => {
                        const hasPermission = editUserData.permissions.includes(page.id);
                        
                        return (
                          <div 
                            key={page.id}
                            className={`flex items-start space-x-3 p-3 rounded-md border transition-colors ${
                              hasPermission 
                                ? 'bg-blue-50/10 border-blue-500/30' 
                                : 'bg-white/5 border-white/20'
                            }`}
                            data-testid={`permission-${page.id}`}
                          >
                            <Checkbox 
                              checked={hasPermission}
                              onCheckedChange={(checked) => togglePermission(page.id, checked === true)}
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
                        {editUserData.role === 'super_admin' 
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
                      {editUserData.permissions.length > 0 ? (
                        <>
                          <span className="text-green-400 font-medium">
                            {editUserData.permissions.length} páginas permitidas:
                          </span>{' '}
                          {editUserData.permissions.map(permissionId => {
                            const page = getAvailablePages(editUserData.role).find(p => p.id === permissionId);
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
              
              <TabsContent value="operations" className="mt-4">
                <div className="space-y-4">
                  <div className="text-sm text-slate-400">
                    Operações (lojas/regiões) às quais este usuário tem acesso.
                  </div>
                  
                  {!userOperations ? (
                    <div className="bg-white/5 border border-white/20 rounded-lg p-6 text-center">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">
                        Carregando operações do usuário...
                      </p>
                    </div>
                  ) : userOperations.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userOperations.map((userOp) => {
                        const operation = allOperations?.find(op => op.id === userOp.operationId);
                        if (!operation) return null;
                        
                        return (
                          <div 
                            key={userOp.operationId}
                            className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-4 backdrop-blur-sm"
                            data-testid={`user-operation-${userOp.operationId}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                  <span className="text-lg">🏪</span>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-white mb-1">
                                  {operation.name}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                                  <span>📍</span>
                                  <span>{operation.country}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-xs text-green-400">
                                    ✓ Acesso ativo
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/20 rounded-lg p-8 text-center">
                      <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">⚠️</span>
                      </div>
                      <h4 className="text-sm font-medium text-white mb-2">
                        Nenhuma operação atribuída
                      </h4>
                      <p className="text-xs text-slate-400">
                        Este usuário não tem acesso a nenhuma operação no momento.
                      </p>
                    </div>
                  )}
                  
                  {/* Operations summary */}
                  {userOperations && userOperations.length > 0 && (
                    <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">📊</span>
                        <h4 className="text-sm font-medium text-white">
                          Resumo de Acesso
                        </h4>
                      </div>
                      <div className="text-xs text-slate-400">
                        <span className="text-green-400 font-medium">
                          {userOperations.length} {userOperations.length === 1 ? 'operação' : 'operações'}
                        </span>
                        {' '}com acesso ativo
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="warehouse" className="mt-4">
                <div className="space-y-4">
                  <div className="text-sm text-slate-400">
                    Gerencie as contas de warehouse (FHB, European Fulfillment, eLogy) deste usuário.
                  </div>
                  
                  {/* Lista de warehouse accounts existentes */}
                  {!userWarehouseAccounts ? (
                    <div className="bg-white/5 border border-white/20 rounded-lg p-6 text-center">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">
                        Carregando warehouse accounts...
                      </p>
                    </div>
                  ) : userWarehouseAccounts.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-white">
                        Contas Configuradas ({userWarehouseAccounts.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {userWarehouseAccounts.map((account) => (
                          <WarehouseAccountCard
                            key={account.id}
                            account={account}
                            operations={allOperations}
                            onDelete={(accountId) => {
                              if (confirm(`Tem certeza que deseja excluir a conta "${account.displayName}"?`)) {
                                deleteWarehouseAccountMutation.mutate(accountId);
                              }
                            }}
                            showActions={true}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/20 rounded-lg p-8 text-center">
                      <div className="w-16 h-16 rounded-full bg-gray-500/20 flex items-center justify-center mx-auto mb-4">
                        <Truck className="h-8 w-8 text-gray-400" />
                      </div>
                      <h4 className="text-sm font-medium text-white mb-2">
                        Nenhuma conta configurada
                      </h4>
                      <p className="text-xs text-slate-400">
                        Adicione contas de warehouse para sincronizar pedidos.
                      </p>
                    </div>
                  )}
                  
                  {/* Adicionar nova conta */}
                  <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Adicionar Nova Conta
                    </h4>
                    
                    {warehouseProvidersLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
                        <p className="text-xs text-muted-foreground mt-2">Carregando providers...</p>
                      </div>
                    ) : warehouseProvidersError ? (
                      <div className="text-center py-4">
                        <Badge variant="destructive">Erro ao carregar providers</Badge>
                      </div>
                    ) : warehouseProviders && warehouseProviders.length > 0 ? (
                      <Accordion type="single" collapsible className="w-full">
                        {warehouseProviders.map((provider) => (
                          <AccordionItem key={provider.key} value={provider.key} data-testid={`accordion-edit-provider-${provider.key}`}>
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-3">
                                <Truck className="h-4 w-4 text-muted-foreground" />
                                <div className="text-left">
                                  <p className="font-medium">{provider.name}</p>
                                  {provider.description && (
                                    <p className="text-xs text-muted-foreground">{provider.description}</p>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              {addingEditWarehouseAccount?.providerKey === provider.key ? (
                                <div className="p-4 border border-white/20 rounded-lg space-y-3 bg-white/5">
                                  {provider.key === 'fhb' && (
                                    <FHBIntegrationForm
                                      formData={addingEditWarehouseAccount.formData}
                                      onChange={(formData) => setAddingEditWarehouseAccount({ providerKey: provider.key, formData })}
                                      availableOperations={userOperations ? allOperations?.filter(op => userOperations.some(uo => uo.operationId === op.id)) || [] : []}
                                    />
                                  )}
                                  {provider.key === 'european_fulfillment' && (
                                    <EuropeanFulfillmentIntegrationForm
                                      formData={addingEditWarehouseAccount.formData}
                                      onChange={(formData) => setAddingEditWarehouseAccount({ providerKey: provider.key, formData })}
                                      availableOperations={userOperations ? allOperations?.filter(op => userOperations.some(uo => uo.operationId === op.id)) || [] : []}
                                    />
                                  )}
                                  {provider.key === 'elogy' && (
                                    <ElogyIntegrationForm
                                      formData={addingEditWarehouseAccount.formData}
                                      onChange={(formData) => setAddingEditWarehouseAccount({ providerKey: provider.key, formData })}
                                      availableOperations={userOperations ? allOperations?.filter(op => userOperations.some(uo => uo.operationId === op.id)) || [] : []}
                                    />
                                  )}
                                  
                                  <div className="flex gap-2 justify-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setAddingEditWarehouseAccount(null)}
                                      data-testid={`button-cancel-add-${provider.key}`}
                                    >
                                      Cancelar
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        if (!addingEditWarehouseAccount.formData.accountName.trim()) {
                                          toast({
                                            title: "Campo obrigatório",
                                            description: "Preencha o nome da conta.",
                                            variant: "destructive"
                                          });
                                          return;
                                        }
                                        if (!userToEdit?.id) return;
                                        createWarehouseAccountMutation.mutate({
                                          userId: userToEdit.id,
                                          providerKey: provider.key,
                                          accountName: addingEditWarehouseAccount.formData.accountName,
                                          credentials: addingEditWarehouseAccount.formData.credentials,
                                          operationIds: addingEditWarehouseAccount.formData.operationIds
                                        });
                                      }}
                                      disabled={createWarehouseAccountMutation.isPending}
                                      data-testid={`button-save-add-${provider.key}`}
                                    >
                                      {createWarehouseAccountMutation.isPending ? 'Salvando...' : 'Salvar Conta'}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => setAddingEditWarehouseAccount({
                                    providerKey: provider.key,
                                    formData: { accountName: '', credentials: {}, operationIds: [] }
                                  })}
                                  data-testid={`button-add-${provider.key}`}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Adicionar Conta {provider.name}
                                </Button>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Nenhum provider disponível
                      </p>
                    )}
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
                  data-testid="button-cancel-edit-user"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={editUserMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-save-edit-user"
                >
                  {editUserMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </Button>
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
              Tem certeza que deseja excluir o usuário <strong>{userToDelete?.name}</strong> ({userToDelete?.email})?
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
              onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}