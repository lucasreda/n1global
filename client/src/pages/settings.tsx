import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Briefcase, PlayCircle, Clock, Plug, Plus, Trash2, Edit, TestTube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTourContext } from "@/contexts/tour-context";
import { useLocation } from "wouter";

// Common European timezones
const TIMEZONES = [
  { value: "Europe/Madrid", label: "Madrid (GMT+1)" },
  { value: "Europe/Lisbon", label: "Lisboa (GMT+0)" },
  { value: "Europe/Rome", label: "Roma (GMT+1)" },
  { value: "Europe/Paris", label: "Paris (GMT+1)" },
  { value: "Europe/Berlin", label: "Berlim (GMT+1)" },
  { value: "Europe/Amsterdam", label: "Amsterdam (GMT+1)" },
  { value: "Europe/Brussels", label: "Bruxelas (GMT+1)" },
  { value: "Europe/London", label: "Londres (GMT+0)" },
  { value: "Europe/Warsaw", label: "Varsóvia (GMT+1)" },
  { value: "Europe/Prague", label: "Praga (GMT+1)" },
  { value: "Europe/Vienna", label: "Viena (GMT+1)" },
  { value: "Europe/Athens", label: "Atenas (GMT+2)" },
];

export default function Settings() {
  const [operationType, setOperationType] = useState<string>("Cash on Delivery");
  const [originalOperationType, setOriginalOperationType] = useState<string>("Cash on Delivery");
  const [timezone, setTimezone] = useState<string>("Europe/Madrid");
  const [originalTimezone, setOriginalTimezone] = useState<string>("Europe/Madrid");
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
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
  
  const { selectedOperation } = useCurrentOperation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Tour context
  const { resetTour, isResettingTour } = useTourContext();

  const handleRestartTour = async () => {
    await resetTour();
    // Navigate to dashboard to start tour
    navigate('/');
  };

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
      updateFhbMutation.mutate({ id: currentAccount.id, data: fhbFormData });
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

  // Fetch full operations data to get operationType and timezone
  const { data: operations } = useQuery<Array<{ id: string; name: string; operationType?: string; timezone?: string }>>({
    queryKey: ['/api/operations'],
    enabled: !!selectedOperation,
  });

  // Set initial operationType and timezone from current operation
  useEffect(() => {
    if (operations && selectedOperation) {
      const operation = operations.find((op) => op.id === selectedOperation);
      if (operation?.operationType) {
        setOperationType(operation.operationType);
        setOriginalOperationType(operation.operationType);
      }
      if (operation?.timezone) {
        setTimezone(operation.timezone);
        setOriginalTimezone(operation.timezone);
      }
      setHasChanges(false);
    }
  }, [operations, selectedOperation]);

  const handleOperationTypeChange = (value: string) => {
    setOperationType(value);
    setHasChanges(value !== originalOperationType || timezone !== originalTimezone);
  };

  const handleTimezoneChange = (value: string) => {
    setTimezone(value);
    setHasChanges(operationType !== originalOperationType || value !== originalTimezone);
  };

  const handleSave = async () => {
    console.log('🔄 Starting handleSave, selectedOperation:', selectedOperation, 'operationType:', operationType, 'timezone:', timezone);
    
    if (!selectedOperation) {
      toast({
        title: "Erro",
        description: "Nenhuma operação selecionada",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      console.log('📤 Making API request to:', `/api/operations/${selectedOperation}/settings`, 'with data:', { operationType, timezone });
      
      const response = await apiRequest(`/api/operations/${selectedOperation}/settings`, 'PATCH', { operationType, timezone });
      
      console.log('✅ API response received:', response);

      setOriginalOperationType(operationType);
      setOriginalTimezone(timezone);
      setHasChanges(false);
      
      // Invalidate cache to refresh operations data across the app
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      
      toast({
        title: "Sucesso",
        description: "Configurações atualizadas com sucesso",
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar configurações",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title="Configurações do Sistema" 
        subtitle="Personalize e configure suas preferências" 
      />
      
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 bg-black/20 border border-white/10">
          <TabsTrigger value="general" className="data-[state=active]:bg-blue-600" data-testid="tab-general">
            Geral
          </TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-blue-600" data-testid="tab-integrations">
            <Plug className="mr-2 h-4 w-4" />
            Integrações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Negócio */}
        <div 
          className="group bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:bg-black/30 transition-all duration-300"
          style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-green-600/20 rounded-xl flex items-center justify-center">
              <Briefcase className="text-green-400" size={20} />
            </div>
            <div>
              <h3 className="text-white font-semibold">Negócio</h3>
              <p className="text-gray-400 text-sm">Configure o tipo de operação do seu negócio</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-black/10 border border-white/5 rounded-lg p-4 hover:bg-black/20 hover:border-white/10 transition-all duration-200">
              <label className="text-gray-300 text-sm mb-3 block">Tipo de Operação</label>
              <Select value={operationType} onValueChange={handleOperationTypeChange}>
                <SelectTrigger 
                  className="bg-black/20 border-white/10 text-white hover:bg-black/30"
                  data-testid="select-operation-type"
                >
                  <SelectValue placeholder="Selecione o tipo de operação" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-white/10">
                  <SelectItem value="Cash on Delivery" data-testid="option-cash-on-delivery">
                    Cash on Delivery
                  </SelectItem>
                  <SelectItem value="Pagamento no Cartão" data-testid="option-pagamento-cartao">
                    Pagamento no Cartão
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-black/10 border border-white/5 rounded-lg p-4 hover:bg-black/20 hover:border-white/10 transition-all duration-200">
              <label className="text-gray-300 text-sm mb-3 block flex items-center">
                <Clock className="mr-2" size={16} />
                Fuso Horário da Operação
              </label>
              <Select value={timezone} onValueChange={handleTimezoneChange}>
                <SelectTrigger 
                  className="bg-black/20 border-white/10 text-white hover:bg-black/30"
                  data-testid="select-timezone"
                >
                  <SelectValue placeholder="Selecione o fuso horário" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-white/10">
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value} data-testid={`option-timezone-${tz.value}`}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-gray-400 text-xs mt-2">
                Este fuso horário será usado para calcular as métricas e relatórios do dashboard
              </p>
            </div>
            
            <Button 
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`w-full transition-all duration-200 ${
                hasChanges && !isSaving
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
              }`}
              data-testid="button-save-settings"
            >
              {isSaving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </div>
        
        {/* Tour Interativo */}
        <div 
          className="group bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:bg-black/30 transition-all duration-300"
          style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center">
              <PlayCircle className="text-purple-400" size={20} />
            </div>
            <div>
              <h3 className="text-white font-semibold">Tour Interativo</h3>
              <p className="text-gray-400 text-sm">Conheça todas as funcionalidades do dashboard</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-black/10 border border-white/5 rounded-lg p-4">
              <p className="text-gray-300 text-sm mb-4">
                O tour guiado mostra os principais recursos do sistema, incluindo métricas, integrações e anúncios. 
                Perfeito para novos usuários ou para relembrar funcionalidades.
              </p>
              <Button 
                onClick={handleRestartTour}
                disabled={isResettingTour}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white transition-all duration-200"
                data-testid="button-restart-tour"
              >
                {isResettingTour ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Iniciando...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2" size={18} />
                    Refazer Tour Guiado
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div 
        className="group bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:bg-black/30 transition-all duration-300"
        style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.5)'}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)'}
      >
        <h3 className="text-xl font-semibold text-white mb-4">Sobre o Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-black/10 border border-white/5 rounded-lg p-4 hover:bg-black/20 hover:border-white/10 transition-all duration-200">
            <h4 className="text-white font-medium">Versão</h4>
            <p className="text-gray-400 text-sm">v1.0.0</p>
          </div>
          <div className="bg-black/10 border border-white/5 rounded-lg p-4 hover:bg-black/20 hover:border-white/10 transition-all duration-200">
            <h4 className="text-white font-medium">Última Atualização</h4>
            <p className="text-gray-400 text-sm">15/12/2024</p>
          </div>
          <div className="bg-black/10 border border-white/5 rounded-lg p-4 hover:bg-black/20 hover:border-white/10 transition-all duration-200">
            <h4 className="text-white font-medium">Suporte</h4>
            <p className="text-gray-400 text-sm">24/7 Online</p>
          </div>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-white">Integrações FHB</CardTitle>
                  <CardDescription className="text-gray-400">
                    Gerencie múltiplas integrações com o FHB European Fulfillment
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

          {/* Info Card */}
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-blue-400">Como funciona?</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 text-sm space-y-2">
              <p>
                As integrações FHB são centralizadas e compartilhadas. Todos os pedidos são importados para a base N1.
              </p>
              <p>
                O vínculo com cada operação é feito automaticamente através do <strong>Prefixo da Operação</strong> configurado em "Informações Gerais".
              </p>
              <p className="text-blue-400">
                💡 Configure o prefixo da operação (ex: ESP-, PT-) nas configurações da operação.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                placeholder="Ex: FHB Account PT"
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
            <Button onClick={handleCreateFhb} disabled={createFhbMutation.isPending} data-testid="button-save-fhb">
              {createFhbMutation.isPending ? 'Salvando...' : 'Criar Integração'}
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
              Atualizar configurações da integração FHB
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-fhb-name" className="text-gray-300">Nome</Label>
              <Input
                id="edit-fhb-name"
                value={fhbFormData.name}
                onChange={(e) => setFhbFormData({ ...fhbFormData, name: e.target.value })}
                placeholder="Ex: FHB Account PT"
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
