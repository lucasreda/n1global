import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, TestTube, ArrowRight, Settings, Database, CheckCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function AdminFHBAccounts() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    appId: "",
    secret: "",
    apiUrl: "https://api.fhb.sk/v3"
  });

  // Fetch FHB accounts
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["/api/admin/fhb-accounts"],
  });

  // Create account mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/admin/fhb-accounts", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fhb-accounts"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Conta FHB criada",
        description: "A conta foi criada com sucesso. Initial sync iniciado automaticamente (pode levar alguns minutos).",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar conta FHB",
        variant: "destructive",
      });
    },
  });

  // Update account mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`/api/admin/fhb-accounts/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fhb-accounts"] });
      setIsEditDialogOpen(false);
      setCurrentAccount(null);
      resetForm();
      toast({
        title: "Conta atualizada",
        description: "A conta foi atualizada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar conta FHB",
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/fhb-accounts/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fhb-accounts"] });
      toast({
        title: "Conta deletada",
        description: "A conta foi deletada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao deletar conta FHB",
        variant: "destructive",
      });
    },
  });

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/fhb-accounts/${id}/test`, "POST"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fhb-accounts"] });
      toast({
        title: data.connected ? "Conexão OK" : "Conexão Falhou",
        description: data.message,
        variant: data.connected ? "default" : "destructive",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao testar conexão",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      appId: "",
      secret: "",
      apiUrl: "https://api.fhb.sk/v3"
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (currentAccount) {
      updateMutation.mutate({ id: currentAccount.id, data: formData });
    }
  };

  const handleEdit = (account: any) => {
    setCurrentAccount(account);
    setFormData({
      name: account.name,
      appId: account.appId,
      secret: "",  // Don't pre-fill secret for security
      apiUrl: account.apiUrl
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja deletar esta conta FHB?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleTest = (id: string) => {
    testMutation.mutate(id);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Contas FHB</h1>
          <p className="text-muted-foreground">Gerenciar contas FHB compartilhadas (Admin)</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Conta
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contas Configuradas</CardTitle>
          <CardDescription>
            Estas contas são compartilhadas entre múltiplas operações
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando...</p>
          ) : accounts.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma conta FHB configurada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>App ID</TableHead>
                  <TableHead>API URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Initial Sync</TableHead>
                  <TableHead>Último Teste</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account: any) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell>{account.appId}</TableCell>
                    <TableCell className="text-sm">{account.apiUrl}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        account.status === 'active' 
                          ? 'bg-green-50 text-green-700' 
                          : 'bg-gray-50 text-gray-700'
                      }`}>
                        {account.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {account.initialSyncCompleted ? (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-green-600">Concluído</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm">
                          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                          <span className="text-blue-600">Em andamento...</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {account.lastTestedAt ? new Date(account.lastTestedAt).toLocaleString() : 'Nunca'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTest(account.id)}
                          disabled={testMutation.isPending}
                        >
                          <TestTube className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(account)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(account.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Next Step Card */}
      {accounts.length > 0 && (
        <Card className="border-blue-500/20 bg-blue-50/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Próximo Passo
            </CardTitle>
            <CardDescription>
              Agora que você criou contas FHB, configure suas operações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Para cada operação, você precisa configurar:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li><strong>Prefixo Shopify:</strong> Identificador único dos pedidos (ex: ESP-, PT-)</li>
              <li><strong>Conta FHB:</strong> Selecionar qual conta FHB usar para sync</li>
            </ul>
            <Link href="/inside/stores">
              <Button className="mt-3 w-full" data-testid="button-configure-operations">
                <Settings className="mr-2 h-4 w-4" />
                Configurar Operações
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Conta FHB</DialogTitle>
            <DialogDescription>
              Adicionar uma nova conta FHB compartilhada
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: FHB Account PT"
              />
            </div>
            <div>
              <Label htmlFor="appId">App ID</Label>
              <Input
                id="appId"
                value={formData.appId}
                onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                placeholder="App ID da FHB"
              />
            </div>
            <div>
              <Label htmlFor="secret">Secret</Label>
              <Input
                id="secret"
                type="password"
                value={formData.secret}
                onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                placeholder="Secret da FHB"
              />
            </div>
            <div>
              <Label htmlFor="apiUrl">API URL</Label>
              <Input
                id="apiUrl"
                value={formData.apiUrl}
                onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                placeholder="https://api.fhb.sk/v3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Conta FHB</DialogTitle>
            <DialogDescription>
              Atualizar informações da conta FHB
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-appId">App ID</Label>
              <Input
                id="edit-appId"
                value={formData.appId}
                onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-secret">Secret (deixar vazio para manter)</Label>
              <Input
                id="edit-secret"
                type="password"
                value={formData.secret}
                onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                placeholder="Digite para atualizar"
              />
            </div>
            <div>
              <Label htmlFor="edit-apiUrl">API URL</Label>
              <Input
                id="edit-apiUrl"
                value={formData.apiUrl}
                onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Atualizando..." : "Atualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
