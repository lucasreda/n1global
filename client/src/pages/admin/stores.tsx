import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2,
  Plus,
  Eye,
  Edit,
  Trash2,
  Users,
  ShoppingCart
} from "lucide-react";

interface Store {
  id: string;
  name: string;
  domain: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  operationsCount: number;
  totalOrders: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminStores() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [storeToEdit, setStoreToEdit] = useState<Store | null>(null);
  const [newStoreData, setNewStoreData] = useState({
    name: '',
    domain: '',
    ownerEmail: ''
  });
  const [editStoreData, setEditStoreData] = useState({
    name: '',
    domain: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stores, isLoading: storesLoading } = useQuery<Store[]>({
    queryKey: ['/api/admin/stores']
  });

  const createStoreMutation = useMutation({
    mutationFn: async (storeData: { name: string; domain: string; ownerEmail: string }) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch('/api/admin/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
        body: JSON.stringify(storeData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar loja');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Loja criada",
        description: "A loja foi criada com sucesso.",
      });
      setShowCreateModal(false);
      setNewStoreData({ name: '', domain: '', ownerEmail: '' });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar loja",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteStoreMutation = useMutation({
    mutationFn: async (storeId: string) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/stores/${storeId}`, {
        method: 'DELETE',
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao excluir loja');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Loja excluída",
        description: "A loja foi removida com sucesso do sistema.",
      });
      setShowDeleteModal(false);
      setStoreToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir loja",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editStoreMutation = useMutation({
    mutationFn: async (storeData: { id: string; name?: string; domain?: string }) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/stores/${storeData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
        body: JSON.stringify(storeData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao editar loja');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Loja atualizada",
        description: "Os dados da loja foram atualizados com sucesso.",
      });
      setShowEditModal(false);
      setStoreToEdit(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao editar loja",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditStore = (store: Store) => {
    setStoreToEdit(store);
    setEditStoreData({
      name: store.name,
      domain: store.domain
    });
    setShowEditModal(true);
  };

  const handleSubmitEdit = () => {
    if (!storeToEdit) return;
    
    const updateData: any = { id: storeToEdit.id };
    if (editStoreData.name !== storeToEdit.name) updateData.name = editStoreData.name;
    if (editStoreData.domain !== storeToEdit.domain) updateData.domain = editStoreData.domain;
    
    editStoreMutation.mutate(updateData);
  };

  const getActiveStoresCount = () => {
    if (!stores) return 0;
    return stores.filter(store => store.isActive).length;
  };

  const getTotalOperations = () => {
    if (!stores) return 0;
    return stores.reduce((total, store) => total + store.operationsCount, 0);
  };

  const getTotalOrders = () => {
    if (!stores) return 0;
    return stores.reduce((total, store) => total + store.totalOrders, 0);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Lojas
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie todas as lojas do sistema
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Loja
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Lojas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stores?.length || 0}</div>
            <p className="text-xs text-muted-foreground">lojas registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lojas Ativas</CardTitle>
            <div className="h-4 w-4 rounded-full bg-green-400"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{getActiveStoresCount()}</div>
            <p className="text-xs text-muted-foreground">lojas funcionando</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Operações</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalOperations()}</div>
            <p className="text-xs text-muted-foreground">operações ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalOrders()}</div>
            <p className="text-xs text-muted-foreground">pedidos processados</p>
          </CardContent>
        </Card>
      </div>

      {/* Stores Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Lojas ({stores?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {storesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando lojas...</p>
              </div>
            </div>
          ) : stores && stores.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold">Loja</th>
                    <th className="text-left py-3 px-4 font-semibold">Proprietário</th>
                    <th className="text-left py-3 px-4 font-semibold">Operações</th>
                    <th className="text-left py-3 px-4 font-semibold">Pedidos</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Criada em</th>
                    <th className="text-left py-3 px-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((store) => (
                    <tr key={store.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{store.name}</p>
                          <p className="text-sm text-muted-foreground">{store.domain}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{store.ownerName}</p>
                          <p className="text-sm text-muted-foreground">{store.ownerEmail}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">{store.operationsCount}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">{store.totalOrders.toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={store.isActive ? "default" : "secondary"}>
                          {store.isActive ? "Ativa" : "Inativa"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">
                          {new Date(store.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditStore(store)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setStoreToDelete(store);
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
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma loja encontrada</h3>
              <p className="text-muted-foreground">
                Comece criando a primeira loja do sistema
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Store Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Loja</DialogTitle>
            <DialogDescription>
              Adicione uma nova loja ao sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="store-name">Nome da Loja</Label>
              <Input
                id="store-name"
                value={newStoreData.name}
                onChange={(e) => setNewStoreData({ ...newStoreData, name: e.target.value })}
                placeholder="Nome da loja"
              />
            </div>
            <div>
              <Label htmlFor="store-domain">Domínio</Label>
              <Input
                id="store-domain"
                value={newStoreData.domain}
                onChange={(e) => setNewStoreData({ ...newStoreData, domain: e.target.value })}
                placeholder="exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="owner-email">Email do Proprietário</Label>
              <Input
                id="owner-email"
                type="email"
                value={newStoreData.ownerEmail}
                onChange={(e) => setNewStoreData({ ...newStoreData, ownerEmail: e.target.value })}
                placeholder="proprietario@exemplo.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => createStoreMutation.mutate(newStoreData)}
              disabled={createStoreMutation.isPending}
            >
              {createStoreMutation.isPending ? 'Criando...' : 'Criar Loja'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Store Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Loja</DialogTitle>
            <DialogDescription>
              Altere as informações da loja
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-store-name">Nome da Loja</Label>
              <Input
                id="edit-store-name"
                value={editStoreData.name}
                onChange={(e) => setEditStoreData({ ...editStoreData, name: e.target.value })}
                placeholder="Nome da loja"
              />
            </div>
            <div>
              <Label htmlFor="edit-store-domain">Domínio</Label>
              <Input
                id="edit-store-domain"
                value={editStoreData.domain}
                onChange={(e) => setEditStoreData({ ...editStoreData, domain: e.target.value })}
                placeholder="exemplo.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmitEdit}
              disabled={editStoreMutation.isPending}
            >
              {editStoreMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a loja <strong>{storeToDelete?.name}</strong>?
              <br /><br />
              <span className="text-red-600 font-medium">
                Esta ação não pode ser desfeita e todas as operações e dados associados serão perdidos.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => storeToDelete && deleteStoreMutation.mutate(storeToDelete.id)}
              disabled={deleteStoreMutation.isPending}
            >
              {deleteStoreMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}