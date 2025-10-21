import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  User, 
  Bell, 
  Shield, 
  Database, 
  Save, 
  Settings as SettingsIcon,
  Globe,
  Users,
  Building,
  TrendingUp,
  Loader2,
  Plug,
  Plus,
  Trash2,
  Edit,
  TestTube
} from "lucide-react";

export default function AdminSettings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [backupEnabled, setBackupEnabled] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // FHB Integrations state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<any>(null);
  const [fhbFormData, setFhbFormData] = useState({
    name: "",
    appId: "",
    secret: "",
    apiUrl: "https://api.fhb.sk/v3"
  });

  // Query para verificar status do histórico de moedas
  const { data: currencyStatus, isLoading: statusLoading } = useQuery<{
    isUpToDate: boolean;
    lastUpdate: string | null;
    recordCount: number;
    startDate: string;
    today: string;
    enabledCurrencies: string[];
  }>({
    queryKey: ['/api/currency/history/status'],
    refetchInterval: 10000, // Refresh every 10 seconds during population
  });

  // Query para configurações de moedas
  const { data: currencySettings, isLoading: settingsLoading } = useQuery<Array<{
    id: string;
    currency: string;
    enabled: boolean;
    baseCurrency: string;
  }>>({
    queryKey: ['/api/currency/settings'],
  });

  // Mutation para atualizar configurações de moedas
  const updateCurrencySettingsMutation = useMutation({
    mutationFn: async (currencyUpdates: Array<{ currency: string; enabled: boolean }>) => {
      return apiRequest('/api/currency/settings', 'POST', { currencyUpdates });
    },
    onSuccess: () => {
      toast({
        title: "Configurações atualizadas!",
        description: "As configurações de moedas foram salvas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/currency/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/currency/history/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar configurações",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  // Mutation para preencher histórico
  const populateHistoryMutation = useMutation<{
    message: string;
    recordsAdded: number;
    startDate: string;
    endDate: string;
    currencies: string[];
    records: Array<{ date: string; currency: string; rate: number }>;
  }>({
    mutationFn: async () => {
      return apiRequest('/api/currency/history/populate', 'POST', {});
    },
    onSuccess: (data) => {
      toast({
        title: "Histórico preenchido com sucesso!",
        description: `${data.recordsAdded} registros adicionados para ${data.currencies?.join(', ')} desde ${data.startDate}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/currency/history/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao preencher histórico",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  // Fetch FHB accounts
  const { data: fhbAccounts = [], isLoading: isLoadingFhb } = useQuery<any[]>({
    queryKey: ["/api/admin/fhb-accounts"],
  });

  // Create FHB account mutation
  const createFhbMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/admin/fhb-accounts", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fhb-accounts"] });
      setIsCreateDialogOpen(false);
      resetFhbForm();
      toast({
        title: "Integração FHB criada",
        description: "A integração foi criada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar integração FHB",
        variant: "destructive",
      });
    },
  });

  // Update FHB account mutation
  const updateFhbMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`/api/admin/fhb-accounts/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fhb-accounts"] });
      setIsEditDialogOpen(false);
      setCurrentAccount(null);
      resetFhbForm();
      toast({
        title: "Integração atualizada",
        description: "A integração foi atualizada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar integração FHB",
        variant: "destructive",
      });
    },
  });

  // Delete FHB account mutation
  const deleteFhbMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/fhb-accounts/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fhb-accounts"] });
      toast({
        title: "Integração deletada",
        description: "A integração foi deletada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao deletar integração FHB",
        variant: "destructive",
      });
    },
  });

  // Test FHB connection mutation
  const testFhbMutation = useMutation({
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

  const resetFhbForm = () => {
    setFhbFormData({
      name: "",
      appId: "",
      secret: "",
      apiUrl: "https://api.fhb.sk/v3"
    });
  };

  const handleCreateFhb = () => {
    createFhbMutation.mutate(fhbFormData);
  };

  const handleUpdateFhb = () => {
    if (currentAccount) {
      const updateData: any = {
        name: fhbFormData.name,
        appId: fhbFormData.appId,
        apiUrl: fhbFormData.apiUrl,
      };
      
      // Only include secret if it's not empty (user wants to change it)
      if (fhbFormData.secret && fhbFormData.secret.trim() !== '') {
        updateData.secret = fhbFormData.secret;
      }
      
      updateFhbMutation.mutate({ id: currentAccount.id, data: updateData });
    }
  };

  const handleEditFhb = (account: any) => {
    setCurrentAccount(account);
    setFhbFormData({
      name: account.name,
      appId: account.appId,
      secret: "",  // Don't pre-fill secret for security
      apiUrl: account.apiUrl
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteFhb = (id: string) => {
    if (confirm("Tem certeza que deseja deletar esta integração FHB?")) {
      deleteFhbMutation.mutate(id);
    }
  };

  const handleTestFhb = (id: string) => {
    testFhbMutation.mutate(id);
  };

  const handleCurrencyToggle = (currency: string, enabled: boolean) => {
    if (!currencySettings) return;
    
    const updatedSettings = currencySettings.map(setting => 
      setting.currency === currency ? { ...setting, enabled } : setting
    );
    
    // Update local state and trigger mutation
    const currencyUpdates = [{ currency, enabled }];
    updateCurrencySettingsMutation.mutate(currencyUpdates);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
          <SettingsIcon className="text-blue-400" size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Configurações</h1>
          <p className="text-gray-400">Gerencie as configurações do sistema administrativo</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-black/40">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <SettingsIcon size={16} />
            Geral
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users size={16} />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Database size={16} />
            Sistema
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2" data-testid="tab-integrations">
            <Plug size={16} />
            Integrações
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield size={16} />
            Segurança
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-black/40 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-xl flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Configurações Globais
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Configurações que afetam todo o sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="app-name" className="text-gray-300">Nome da Aplicação</Label>
                  <Input 
                    id="app-name" 
                    defaultValue="N1 Dashboard" 
                    className="bg-gray-800 border-gray-600 text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone" className="text-gray-300">Fuso Horário</Label>
                  <Select defaultValue="america/sao_paulo">
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="america/sao_paulo">America/São Paulo</SelectItem>
                      <SelectItem value="europe/lisbon">Europe/Lisbon</SelectItem>
                      <SelectItem value="utc">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency" className="text-gray-300">Moeda Padrão</Label>
                  <Select defaultValue="eur">
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eur">EUR (€)</SelectItem>
                      <SelectItem value="brl">BRL (R$)</SelectItem>
                      <SelectItem value="usd">USD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-xl flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notificações
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Configure alertas e notificações do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notifications" className="text-gray-300">
                    Notificações Ativas
                  </Label>
                  <Switch 
                    id="notifications"
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-alerts" className="text-gray-300">
                    Alertas por Email
                  </Label>
                  <Switch 
                    id="email-alerts"
                    checked={emailAlerts}
                    onCheckedChange={setEmailAlerts}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notification-email" className="text-gray-300">Email para Alertas</Label>
                  <Input 
                    id="notification-email" 
                    type="email"
                    placeholder="admin@empresa.com"
                    className="bg-gray-800 border-gray-600 text-white" 
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <Card className="bg-black/40 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-xl flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Histórico de Conversão de Moedas
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Configure quais moedas importar e gerencie dados históricos desde 2024
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Currency Selection */}
                <div>
                  <Label className="text-white font-medium mb-3 block">Moedas para Importação</Label>
                  {settingsLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-gray-400">Carregando moedas...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {currencySettings?.map((setting) => (
                        <div key={setting.currency} className="flex items-center space-x-2">
                          <Checkbox
                            id={`currency-${setting.currency}`}
                            checked={setting.enabled}
                            onCheckedChange={(checked) => 
                              handleCurrencyToggle(setting.currency, checked as boolean)
                            }
                            disabled={updateCurrencySettingsMutation.isPending}
                          />
                          <Label
                            htmlFor={`currency-${setting.currency}`}
                            className="text-sm text-gray-300 cursor-pointer"
                          >
                            {setting.currency}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Information */}
                {statusLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-gray-400">Verificando status...</span>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <Label className="text-gray-400">Status</Label>
                        <p className={`font-medium ${currencyStatus?.isUpToDate ? 'text-green-400' : 'text-yellow-400'}`}>
                          {currencyStatus?.isUpToDate ? 'Atualizado' : 'Pendente'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-gray-400">Registros</Label>
                        <p className="text-white font-medium">{currencyStatus?.recordCount || 0}</p>
                      </div>
                      <div>
                        <Label className="text-gray-400">Última Atualização</Label>
                        <p className="text-white font-medium">
                          {currencyStatus?.lastUpdate || 'Nunca'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-gray-400">Moedas Ativas</Label>
                        <p className="text-white font-medium">
                          {currencyStatus?.enabledCurrencies?.join(', ') || 'Nenhuma'}
                        </p>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => populateHistoryMutation.mutate()}
                      disabled={
                        currencyStatus?.isUpToDate || 
                        populateHistoryMutation.isPending ||
                        !currencyStatus?.enabledCurrencies?.length
                      }
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                      {populateHistoryMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Preenchendo Histórico...
                        </>
                      ) : currencyStatus?.isUpToDate ? (
                        "Histórico Atualizado"
                      ) : !currencyStatus?.enabledCurrencies?.length ? (
                        "Selecione moedas para importar"
                      ) : (
                        `Preencher Histórico (${currencyStatus?.enabledCurrencies?.length} moedas)`
                      )}
                    </Button>

                    {currencyStatus?.isUpToDate && currencyStatus?.enabledCurrencies?.length > 0 && (
                      <p className="text-green-400 text-sm">
                        ✅ Histórico completo desde 2024 para {currencyStatus.enabledCurrencies.join(', ')}
                      </p>
                    )}

                    {!currencyStatus?.enabledCurrencies?.length && (
                      <p className="text-yellow-400 text-sm">
                        ⚠️ Selecione pelo menos uma moeda para importar dados históricos
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card className="bg-black/40 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-xl flex items-center gap-2">
                <Users className="h-5 w-5" />
                Configurações de Usuários
              </CardTitle>
              <CardDescription className="text-gray-400">
                Gerencie configurações relacionadas aos usuários do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="default-role" className="text-gray-300">Papel Padrão para Novos Usuários</Label>
                  <Select defaultValue="user">
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="supplier">Fornecedor</SelectItem>
                      <SelectItem value="admin_financeiro">Admin Financeiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-timeout" className="text-gray-300">Timeout de Sessão (minutos)</Label>
                  <Input 
                    id="session-timeout" 
                    type="number"
                    defaultValue="60"
                    className="bg-gray-800 border-gray-600 text-white" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card className="bg-black/40 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-xl flex items-center gap-2">
                <Database className="h-5 w-5" />
                Configurações do Sistema
              </CardTitle>
              <CardDescription className="text-gray-400">
                Configurações técnicas e de manutenção
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-backup" className="text-gray-300">
                  Backup Automático
                </Label>
                <Switch 
                  id="auto-backup"
                  checked={backupEnabled}
                  onCheckedChange={setBackupEnabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="backup-frequency" className="text-gray-300">Frequência do Backup</Label>
                <Select defaultValue="daily">
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">A cada hora</SelectItem>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="log-level" className="text-gray-300">Nível de Log</Label>
                <Select defaultValue="info">
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debug">Debug</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-white">Integrações FHB</CardTitle>
                  <CardDescription className="text-gray-400">
                    Gerencie múltiplas integrações globais com o FHB European Fulfillment
                  </CardDescription>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-fhb">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Integração
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingFhb ? (
                <p className="text-gray-400">Carregando...</p>
              ) : fhbAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <Plug className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">Nenhuma integração FHB configurada</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Clique em "Nova Integração" para começar
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-gray-300">Nome</TableHead>
                      <TableHead className="text-gray-300">App ID</TableHead>
                      <TableHead className="text-gray-300">API URL</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Último Teste</TableHead>
                      <TableHead className="text-right text-gray-300">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fhbAccounts.map((account: any) => (
                      <TableRow key={account.id} className="border-white/10">
                        <TableCell className="font-medium text-white">{account.name}</TableCell>
                        <TableCell className="text-gray-300">{account.appId}</TableCell>
                        <TableCell className="text-sm text-gray-400">{account.apiUrl}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            account.status === 'active' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {account.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-400">
                          {account.lastTestedAt ? new Date(account.lastTestedAt).toLocaleString() : 'Nunca'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTestFhb(account.id)}
                              disabled={testFhbMutation.isPending}
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                              data-testid={`button-test-fhb-${account.id}`}
                            >
                              <TestTube className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditFhb(account)}
                              className="text-gray-400 hover:text-gray-300 hover:bg-gray-500/10"
                              data-testid={`button-edit-fhb-${account.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFhb(account.id)}
                              disabled={deleteFhbMutation.isPending}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              data-testid={`button-delete-fhb-${account.id}`}
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

          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-blue-400">Como funciona?</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 text-sm space-y-2">
              <p>
                As integrações FHB são centralizadas e globais. Todos os pedidos são importados para a base N1.
              </p>
              <p>
                O vínculo com cada operação é feito automaticamente através do <strong>Prefixo da Operação</strong> configurado nas configurações de cada operação.
              </p>
              <p className="text-blue-400">
                💡 Configure o prefixo da operação (ex: ESP-, PT-) no editor de operações em Stores → Operações.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="bg-black/40 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-xl flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configurações de Segurança
              </CardTitle>
              <CardDescription className="text-gray-400">
                Configurações relacionadas à segurança do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password-length" className="text-gray-300">Tamanho Mínimo da Senha</Label>
                  <Input 
                    id="password-length" 
                    type="number"
                    defaultValue="8"
                    className="bg-gray-800 border-gray-600 text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-attempts" className="text-gray-300">Tentativas de Login Máximas</Label>
                  <Input 
                    id="login-attempts" 
                    type="number"
                    defaultValue="5"
                    className="bg-gray-800 border-gray-600 text-white" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jwt-expiry" className="text-gray-300">Expiração do Token JWT (horas)</Label>
                <Input 
                  id="jwt-expiry" 
                  type="number"
                  defaultValue="24"
                  className="bg-gray-800 border-gray-600 text-white" 
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Save className="h-4 w-4 mr-2" />
          Salvar Configurações
        </Button>
      </div>

      {/* Create FHB Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-gray-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Nova Integração FHB</DialogTitle>
            <DialogDescription className="text-gray-400">
              Adicionar uma nova integração com o FHB European Fulfillment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fhb-name" className="text-gray-300">Nome</Label>
              <Input
                id="fhb-name"
                value={fhbFormData.name}
                onChange={(e) => setFhbFormData({ ...fhbFormData, name: e.target.value })}
                placeholder="Nome da integração"
                className="bg-white/10 border-white/20 text-white"
                data-testid="input-fhb-name"
              />
            </div>
            <div>
              <Label htmlFor="fhb-appid" className="text-gray-300">App ID</Label>
              <Input
                id="fhb-appid"
                value={fhbFormData.appId}
                onChange={(e) => setFhbFormData({ ...fhbFormData, appId: e.target.value })}
                placeholder="ID da aplicação FHB"
                className="bg-white/10 border-white/20 text-white"
                data-testid="input-fhb-appid"
              />
            </div>
            <div>
              <Label htmlFor="fhb-secret" className="text-gray-300">Secret</Label>
              <Input
                id="fhb-secret"
                type="password"
                value={fhbFormData.secret}
                onChange={(e) => setFhbFormData({ ...fhbFormData, secret: e.target.value })}
                placeholder="Chave secreta"
                className="bg-white/10 border-white/20 text-white"
                data-testid="input-fhb-secret"
              />
            </div>
            <div>
              <Label htmlFor="fhb-apiurl" className="text-gray-300">API URL</Label>
              <Input
                id="fhb-apiurl"
                value={fhbFormData.apiUrl}
                onChange={(e) => setFhbFormData({ ...fhbFormData, apiUrl: e.target.value })}
                placeholder="https://api.fhb.sk/v3"
                className="bg-white/10 border-white/20 text-white"
                data-testid="input-fhb-apiurl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)} className="text-gray-400">
              Cancelar
            </Button>
            <Button onClick={handleCreateFhb} disabled={createFhbMutation.isPending} data-testid="button-create-fhb-submit">
              {createFhbMutation.isPending ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit FHB Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-gray-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Integração FHB</DialogTitle>
            <DialogDescription className="text-gray-400">
              Atualizar credenciais da integração FHB
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-fhb-name" className="text-gray-300">Nome</Label>
              <Input
                id="edit-fhb-name"
                value={fhbFormData.name}
                onChange={(e) => setFhbFormData({ ...fhbFormData, name: e.target.value })}
                placeholder="Nome da integração"
                className="bg-white/10 border-white/20 text-white"
                data-testid="input-edit-fhb-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-fhb-appid" className="text-gray-300">App ID</Label>
              <Input
                id="edit-fhb-appid"
                value={fhbFormData.appId}
                onChange={(e) => setFhbFormData({ ...fhbFormData, appId: e.target.value })}
                placeholder="ID da aplicação FHB"
                className="bg-white/10 border-white/20 text-white"
                data-testid="input-edit-fhb-appid"
              />
            </div>
            <div>
              <Label htmlFor="edit-fhb-secret" className="text-gray-300">Secret (deixe em branco para manter)</Label>
              <Input
                id="edit-fhb-secret"
                type="password"
                value={fhbFormData.secret}
                onChange={(e) => setFhbFormData({ ...fhbFormData, secret: e.target.value })}
                placeholder="Nova chave secreta (opcional)"
                className="bg-white/10 border-white/20 text-white"
                data-testid="input-edit-fhb-secret"
              />
            </div>
            <div>
              <Label htmlFor="edit-fhb-apiurl" className="text-gray-300">API URL</Label>
              <Input
                id="edit-fhb-apiurl"
                value={fhbFormData.apiUrl}
                onChange={(e) => setFhbFormData({ ...fhbFormData, apiUrl: e.target.value })}
                placeholder="https://api.fhb.sk/v3"
                className="bg-white/10 border-white/20 text-white"
                data-testid="input-edit-fhb-apiurl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="text-gray-400">
              Cancelar
            </Button>
            <Button onClick={handleUpdateFhb} disabled={updateFhbMutation.isPending} data-testid="button-update-fhb">
              {updateFhbMutation.isPending ? 'Salvando...' : 'Atualizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}