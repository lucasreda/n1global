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
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  UserPlus,
  Edit,
  Trash2,
  Shield,
  User,
  Briefcase
} from "lucide-react";

// Define available pages for different user types
const USER_PAGES = [
  { id: 'dashboard', name: 'Dashboard', description: 'Visão geral e métricas', icon: '📊' },
  { id: 'hub', name: 'Hub', description: 'Marketplace e produtos', icon: '🛍️' },
  { id: 'orders', name: 'Pedidos', description: 'Gestão de pedidos', icon: '📦' },
  { id: 'ads', name: 'Anúncios', description: 'Campanhas publicitárias', icon: '📢' },
  { id: 'analytics', name: 'Analytics', description: 'Análises e relatórios', icon: '📈' },
  { id: 'creatives', name: 'Criativos', description: 'Gestão de criativos publicitários', icon: '🎨' },
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
}

export default function AdminUsers() {
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);
  const [userToEdit, setUserToEdit] = useState<SystemUser | null>(null);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'store'
  });
  const [editUserData, setEditUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    permissions: [] as string[]
  });
  const [activeTab, setActiveTab] = useState("general");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: systemUsers, isLoading: usersLoading } = useQuery<SystemUser[]>({
    queryKey: ['/api/admin/users']
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
      setNewUserData({ name: '', email: '', password: '', role: 'store' });
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
    mutationFn: async (userData: { id: string; name?: string; email?: string; password?: string; role?: string; permissions?: string[] }) => {
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
    const roleColors = {
      'super_admin': 'bg-red-100 text-red-800',
      'admin': 'bg-purple-100 text-purple-800',
      'admin_financeiro': 'bg-yellow-100 text-yellow-800',
      'store': 'bg-blue-100 text-blue-800',
      'supplier': 'bg-green-100 text-green-800',
    };
    
    const roleLabels = {
      'super_admin': 'Super Admin',
      'admin': 'Administrador',
      'admin_financeiro': 'Administrador Financeiro',
      'store': 'Loja',
      'supplier': 'Fornecedor',
    };
    
    return (
      <Badge className={roleColors[role as keyof typeof roleColors] || 'bg-gray-100 text-gray-800'}>
        {roleLabels[role as keyof typeof roleLabels] || role}
      </Badge>
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
      permissions: user.permissions || []
    });
    setActiveTab("general");
    setShowEditModal(true);
  };

  const handleSubmitEdit = () => {
    if (!userToEdit) return;
    
    const updateData: any = { id: userToEdit.id };
    if (editUserData.name !== userToEdit.name) updateData.name = editUserData.name;
    if (editUserData.email !== userToEdit.email) updateData.email = editUserData.email;
    if (editUserData.password) updateData.password = editUserData.password;
    if (editUserData.role !== userToEdit.role) updateData.role = editUserData.role;
    if (JSON.stringify(editUserData.permissions) !== JSON.stringify(userToEdit.permissions || [])) {
      updateData.permissions = editUserData.permissions;
    }
    
    editUserMutation.mutate(updateData);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
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
          <div className="mb-4">
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
                        <Badge variant={user.isActive !== false ? "default" : "secondary"}>
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

      {/* Create User Modal */}
      <Dialog open={showCreateUserModal} onOpenChange={setShowCreateUserModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>
              Adicione um novo usuário ao sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={newUserData.name}
                onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                placeholder="Nome completo"
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
              />
            </div>
            <div>
              <Label htmlFor="role">Função</Label>
              <Select value={newUserData.role} onValueChange={(value) => setNewUserData({ ...newUserData, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="store">Loja</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="admin_financeiro">Administrador Financeiro</SelectItem>
                  <SelectItem value="supplier">Fornecedor</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateUserModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => createUserMutation.mutate(newUserData)}
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending ? 'Criando...' : 'Criar Usuário'}
            </Button>
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
            <TabsList className="grid w-full grid-cols-2 bg-white/10 border border-white/20">
              <TabsTrigger value="general" className="data-[state=active]:bg-blue-600">
                Informações Gerais
              </TabsTrigger>
              <TabsTrigger value="permissions" className="data-[state=active]:bg-blue-600">
                Permissões
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