import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Loader2
} from "lucide-react";

export default function AdminSettings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [backupEnabled, setBackupEnabled] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para verificar status do histórico de moedas
  const { data: currencyStatus, isLoading: statusLoading } = useQuery<{
    isUpToDate: boolean;
    lastUpdate: string | null;
    recordCount: number;
    startDate: string;
    today: string;
  }>({
    queryKey: ['/api/currency/history/status'],
    refetchInterval: 10000, // Refresh every 10 seconds during population
  });

  // Mutation para preencher histórico
  const populateHistoryMutation = useMutation<{
    message: string;
    recordsAdded: number;
    startDate: string;
    endDate: string;
    records: Array<{ date: string; eurToBrl: number }>;
  }>({
    mutationFn: async () => {
      return apiRequest('/api/currency/history/populate', 'POST', {});
    },
    onSuccess: (data) => {
      toast({
        title: "Histórico preenchido com sucesso!",
        description: `${data.recordsAdded} registros adicionados desde ${data.startDate}`,
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
        <TabsList className="grid w-full grid-cols-4 bg-black/40">
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
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield size={16} />
            Segurança
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-black/40 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
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
                <CardTitle className="text-white flex items-center gap-2">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-black/40 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Histórico de Conversão de Moedas
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Dados históricos EUR/BRL desde 2021 para análises financeiras
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {statusLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-gray-400">Verificando status...</span>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-sm">
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
                        <Label className="text-gray-400">Período</Label>
                        <p className="text-white font-medium">2021 - Hoje</p>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => populateHistoryMutation.mutate()}
                      disabled={currencyStatus?.isUpToDate || populateHistoryMutation.isPending}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                      {populateHistoryMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Preenchendo Histórico...
                        </>
                      ) : currencyStatus?.isUpToDate ? (
                        "Histórico Atualizado"
                      ) : (
                        "Preencher Histórico de Moedas"
                      )}
                    </Button>

                    {currencyStatus?.isUpToDate && (
                      <p className="text-green-400 text-sm">
                        ✅ Histórico completo desde 2021 até hoje
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
              <CardTitle className="text-white flex items-center gap-2">
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
              <CardTitle className="text-white flex items-center gap-2">
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

        <TabsContent value="security" className="space-y-6">
          <Card className="bg-black/40 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
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
    </div>
  );
}