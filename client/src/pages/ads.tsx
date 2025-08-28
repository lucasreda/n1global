import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Facebook, 
  Settings, 
  RefreshCw, 
  DollarSign, 
  Eye, 
  MousePointer, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Plus,
  Target,
  Globe
} from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import facebookIcon from "@assets/meta-icon_1756415603759.png";
import googleAdsIcon from "@assets/g-adsi-icon_1756415633788.png";

// Componentes customizados para os ícones
const FacebookIcon = ({ size }: { size?: number }) => (
  <img 
    src={facebookIcon} 
    alt="Meta" 
    className="object-contain"
    style={{ width: size || 40, height: size || 40 }}
  />
);

const GoogleAdsIcon = ({ size }: { size?: number }) => (
  <img 
    src={googleAdsIcon} 
    alt="Google Ads" 
    className="object-contain"
    style={{ width: size || 40, height: size || 40 }}
  />
);

interface Campaign {
  id: string;
  campaignId: string;
  network: 'facebook' | 'google';
  name: string;
  status: string;
  objective?: string; // Facebook
  campaignType?: string; // Google
  dailyBudget: string;
  lifetimeBudget: string;
  amountSpent: string; // Valor em BRL
  originalAmountSpent?: string; // Valor original
  originalCurrency?: string; // Moeda original
  impressions: number;
  clicks: number;
  cpm: string;
  cpc: string;
  ctr: string;
  isSelected: boolean;
  startTime: string;
  endTime: string;
  lastSync: string;
  accountId?: string;
  accountName?: string;
}

interface FacebookBusinessManager {
  id: string;
  businessId: string;
  name: string;
  isActive: boolean;
  lastSync: string;
}

interface AdAccount {
  id: string;
  network: 'facebook' | 'google';
  accountId: string;
  name: string;
  businessManagerId?: string;
  managerId?: string; // For Google Ads
  isActive: boolean;
  currency: string;
  baseCurrency: string;
  timezone: string;
  lastSync: string;
}

// Network Icon Component
const NetworkIcon = ({ network, size = 16 }: { network: 'facebook' | 'google'; size?: number }) => {
  switch (network) {
    case 'facebook':
      return <FacebookIcon size={size} />;
    case 'google':
      return <GoogleAdsIcon size={size} />;
    default:
      return <Globe size={size} className="text-gray-500" />;
  }
};

export default function Ads() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [networkSelectOpen, setNetworkSelectOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<'facebook' | 'google'>('facebook');
  const [bmDialogOpen, setBmDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("last_30d");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [newAccount, setNewAccount] = useState({
    accountId: "",
    name: "",
    accessToken: "",
    appId: "",
    appSecret: "",
    businessManagerId: "",
    baseCurrency: "BRL"
  });
  const [newBusinessManager, setNewBusinessManager] = useState({
    businessId: "",
    name: "",
    accessToken: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch sync info
  const { data: syncInfo } = useQuery({
    queryKey: ["/api/facebook/sync-info"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/facebook/sync-info");
      return response.json() as Promise<{ lastSync: string | null; canAutoSync: boolean; nextAutoSync: string | null }>;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch Ad Accounts (Facebook + Google)
  const { data: adAccounts, isLoading: accountsLoading } = useQuery({
    queryKey: ["/api/ad-accounts"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/ad-accounts");
      return response.json() as Promise<AdAccount[]>;
    },
  });

  // Fetch Campaigns (Facebook + Google)
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ["/api/campaigns", selectedPeriod],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", `/api/campaigns?period=${selectedPeriod}&autoSync=true`);
      return response.json() as Promise<Campaign[]>;
    },
    enabled: (adAccounts?.length || 0) > 0,
  });

  // Add new ad account
  const addAccountMutation = useMutation({
    mutationFn: async (accountData: any) => {
      const response = await authenticatedApiRequest("POST", "/api/ad-accounts", {
        ...accountData,
        network: selectedNetwork
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Conta adicionada",
        description: `Conta do ${selectedNetwork === 'facebook' ? 'Facebook Ads' : 'Google Ads'} configurada com sucesso`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ad-accounts"] });
      setDialogOpen(false);
      setNetworkSelectOpen(false);
      setNewAccount({
        accountId: "",
        name: "",
        accessToken: "",
        appId: "",
        appSecret: "",
        businessManagerId: "",
        baseCurrency: "BRL"
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao configurar conta do Facebook Ads",
        variant: "destructive",
      });
    },
  });

  // Sync campaigns from Facebook
  const syncCampaignsMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedApiRequest("POST", "/api/facebook/sync-period", { period: selectedPeriod });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sincronização concluída",
        description: `${data.synced || 0} campanhas sincronizadas`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/facebook/campaigns", selectedPeriod] });
    },
    onError: () => {
      toast({
        title: "Erro na sincronização",
        description: "Falha ao sincronizar campanhas do Facebook",
        variant: "destructive",
      });
    },
  });

  // Toggle campaign selection
  const toggleCampaignMutation = useMutation({
    mutationFn: async ({ campaignId, isSelected }: { campaignId: string; isSelected: boolean }) => {
      const response = await authenticatedApiRequest("PATCH", `/api/facebook/campaigns/${campaignId}`, {
        isSelected: !isSelected
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facebook/campaigns", selectedPeriod] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Campanha atualizada",
        description: "Seleção da campanha alterada",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar campanha",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      "ACTIVE": { label: "Ativa", variant: "default" as const, color: "text-green-400" },
      "PAUSED": { label: "Pausada", variant: "secondary" as const, color: "text-yellow-400" },
      "DELETED": { label: "Deletada", variant: "destructive" as const, color: "text-red-400" },
      "ARCHIVED": { label: "Arquivada", variant: "outline" as const, color: "text-gray-400" },
    };
    const config = statusMap[status as keyof typeof statusMap] || statusMap.ACTIVE;
    return <Badge variant={config.variant} className={config.color}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: string, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(parseFloat(amount || "0"));
  };

  const formatOriginalCurrency = (originalAmount?: string, originalCurrency?: string) => {
    if (!originalAmount || !originalCurrency || originalCurrency === 'BRL') return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: originalCurrency,
    }).format(parseFloat(originalAmount));
  };

  const formatPercentage = (value: string) => {
    return `${parseFloat(value || "0").toFixed(2)}%`;
  };

  // Filtrar campanhas por conta selecionada para exibição
  const filteredCampaigns = campaigns?.filter(campaign => {
    if (selectedAccountId === "all") return true;
    return campaign.accountId === selectedAccountId;
  }) || [];

  // Campanhas selecionadas de TODAS as contas (não filtradas)
  const allSelectedCampaigns = campaigns?.filter(c => c.isSelected) || [];
  
  // Campanhas selecionadas da conta filtrada (para exibir no contador)
  const filteredSelectedCampaigns = filteredCampaigns.filter(c => c.isSelected) || [];
  
  // Gasto total de TODAS as campanhas selecionadas (sempre em BRL para consolidação)
  const totalSpent = allSelectedCampaigns.reduce((sum, c) => sum + parseFloat((c as any).amountSpentBRL || c.amountSpent || "0"), 0);

  if (accountsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Anúncios Facebook</h1>
            <p className="text-gray-400">Gerencie campanhas e custos de marketing</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 glassmorphism" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Anúncios</h1>
          <p className="text-sm text-gray-400">Campanhas Facebook Ads e Google Ads</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-gray-800 border border-gray-600 text-white text-sm rounded px-3 py-1.5"
          >
            <option value="today">Hoje</option>
            <option value="yesterday">Ontem</option>
            <option value="last_7d">Últimos 7 dias</option>
            <option value="last_30d">Últimos 30 dias</option>
            <option value="this_month">Este mês</option>
            <option value="last_month">Mês passado</option>
            <option value="this_quarter">Este trimestre</option>
          </select>
          <div className="flex items-center space-x-2">
            {syncInfo?.lastSync && (
              <span className="text-xs text-gray-400">
                Último sync: {new Date(syncInfo.lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <Button
              onClick={() => syncCampaignsMutation.mutate()}
              disabled={syncCampaignsMutation.isPending || !adAccounts?.length}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 h-8"
              data-testid="button-sync-campaigns"
            >
              <RefreshCw className={`w-3 h-3 mr-2 ${syncCampaignsMutation.isPending ? 'animate-spin' : ''}`} />
              Sync
            </Button>
          </div>
          {/* Network Selection Dialog */}
          <Dialog open={networkSelectOpen} onOpenChange={setNetworkSelectOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 h-8" data-testid="button-add-account">
                <Plus className="w-3 h-3 mr-2" />
                Conta
              </Button>
            </DialogTrigger>
            <DialogContent className="glassmorphism border-gray-700 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">Selecionar Rede de Anúncios</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Escolha a plataforma de anúncios que deseja configurar
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-6">
                <Button
                  onClick={() => {
                    setSelectedNetwork('facebook');
                    setNetworkSelectOpen(false);
                    setDialogOpen(true);
                  }}
                  className="h-32 flex items-center justify-center bg-blue-600 hover:bg-blue-700 border border-blue-500"
                >
                  <FacebookIcon size={80} />
                </Button>
                <Button
                  onClick={() => {
                    setSelectedNetwork('google');
                    setNetworkSelectOpen(false);
                    setDialogOpen(true);
                  }}
                  className="h-32 flex items-center justify-center border border-gray-300 hover:border-gray-400"
                  style={{ backgroundColor: '#f8f8f8' }}
                >
                  <GoogleAdsIcon size={80} />
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Account Configuration Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="glassmorphism border-gray-700 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center">
                  <NetworkIcon network={selectedNetwork} size={20} />
                  <span className="ml-2">
                    Configurar {selectedNetwork === 'facebook' ? 'Facebook Ads' : 'Google Ads'}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Adicione suas credenciais reais do {selectedNetwork === 'facebook' ? 'Facebook' : 'Google'} para sincronizar campanhas
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1">
                  <Label htmlFor="accountId" className="text-sm text-gray-300">
                    {selectedNetwork === 'facebook' ? 'ID da Conta Facebook' : 'Customer ID Google Ads'}
                  </Label>
                  <Input
                    id="accountId"
                    value={newAccount.accountId}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, accountId: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white h-9"
                    placeholder={selectedNetwork === 'facebook' ? '1234567890 (sem act_)' : '123-456-7890'}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="name" className="text-sm text-gray-300">Nome da Conta</Label>
                  <Input
                    id="name"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white h-9"
                    placeholder="Nome descritivo para identificar"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="currency" className="text-sm text-gray-300">Moeda da Conta</Label>
                  <select
                    id="currency"
                    value={newAccount.baseCurrency || 'BRL'}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, baseCurrency: e.target.value }))}
                    className="bg-gray-800 border border-gray-600 text-white text-sm rounded px-3 py-2 h-9 w-full"
                  >
                    <option value="BRL">BRL - Real Brasileiro</option>
                    <option value="USD">USD - Dólar Americano</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - Libra Esterlina</option>
                    <option value="CAD">CAD - Dólar Canadense</option>
                    <option value="AUD">AUD - Dólar Australiano</option>
                  </select>
                </div>

                {selectedNetwork === 'facebook' ? (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="accessToken" className="text-sm text-gray-300">Access Token do Facebook</Label>
                      <Input
                        id="accessToken"
                        value={newAccount.accessToken}
                        onChange={(e) => setNewAccount(prev => ({ ...prev, accessToken: e.target.value }))}
                        className="bg-gray-800 border-gray-600 text-white h-9"
                        placeholder="EAAxxxxxx... (token real do Facebook)"
                        type="password"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="appId" className="text-sm text-gray-300">App ID</Label>
                      <Input
                        id="appId"
                        value={newAccount.appId}
                        onChange={(e) => setNewAccount(prev => ({ ...prev, appId: e.target.value }))}
                        className="bg-gray-800 border-gray-600 text-white h-9"
                        placeholder="ID da aplicação Facebook"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="appSecret" className="text-sm text-gray-300">App Secret</Label>
                      <Input
                        id="appSecret"
                        value={newAccount.appSecret}
                        onChange={(e) => setNewAccount(prev => ({ ...prev, appSecret: e.target.value }))}
                        className="bg-gray-800 border-gray-600 text-white h-9"
                        placeholder="Chave secreta da aplicação"
                        type="password"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="accessToken" className="text-sm text-gray-300">Access Token do Google Ads</Label>
                      <Input
                        id="accessToken"
                        value={newAccount.accessToken}
                        onChange={(e) => setNewAccount(prev => ({ ...prev, accessToken: e.target.value }))}
                        className="bg-gray-800 border-gray-600 text-white h-9"
                        placeholder="Token OAuth2 do Google Ads"
                        type="password"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="managerId" className="text-sm text-gray-300">Manager Account ID (opcional)</Label>
                      <Input
                        id="managerId"
                        value={newAccount.businessManagerId}
                        onChange={(e) => setNewAccount(prev => ({ ...prev, businessManagerId: e.target.value }))}
                        className="bg-gray-800 border-gray-600 text-white h-9"
                        placeholder="ID da conta gerenciadora Google Ads"
                      />
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button 
                  onClick={() => addAccountMutation.mutate(newAccount)}
                  disabled={addAccountMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {addAccountMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                  Conectar Conta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glassmorphism border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white flex items-center space-x-2">
              <Target className="w-4 h-4 text-blue-400" />
              <span>Campanhas Selecionadas</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{filteredSelectedCampaigns.length}</div>
            <p className="text-gray-400 text-sm">de {filteredCampaigns.length} {selectedAccountId === "all" ? "total" : "da conta"}</p>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span>Gasto Total</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{formatCurrency(totalSpent.toString(), 'BRL')}</div>
            <p className="text-gray-400 text-sm">{allSelectedCampaigns.length} campanhas de todas as contas</p>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white flex items-center space-x-2">
              <Facebook className="w-4 h-4 text-blue-500" />
              <span>Contas Conectadas</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{adAccounts?.length || 0}</div>
            <p className="text-gray-400 text-sm">
              {adAccounts?.filter(a => a.isActive).length || 0} ativas
            </p>
            {adAccounts && adAccounts.length > 0 && (
              <div className="mt-3 space-y-2">
                {adAccounts.slice(0, 3).map((account) => (
                  <div key={account.id} className="flex items-center space-x-2 text-xs">
                    <Facebook className="w-3 h-3 text-blue-400" />
                    <span className="text-gray-300 truncate">{account.name}</span>
                    <span className="text-green-400">●</span>
                  </div>
                ))}
                {adAccounts.length > 3 && (
                  <div className="text-xs text-gray-400">
                    +{adAccounts.length - 3} mais contas
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* No accounts state */}
      {!adAccounts?.length && (
        <Card className="glassmorphism border-gray-700">
          <CardContent className="text-center py-12">
            <Facebook className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Nenhuma conta conectada</h3>
            <p className="text-gray-400 mb-6">
              Configure sua primeira conta do Facebook Ads para começar a importar campanhas
            </p>
            <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeira Conta
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Campaigns List */}
      {filteredCampaigns?.length ? (
        <Card className="glassmorphism border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white flex items-center space-x-2">
              <Facebook className="w-4 h-4 text-blue-500" />
              <span>Campanhas {selectedAccountId !== "all" && `- ${adAccounts?.find(acc => acc.accountId === selectedAccountId)?.name}`}</span>
            </CardTitle>
            <CardDescription className="text-sm text-gray-400 mb-3">
              Selecione campanhas para incluir no dashboard
            </CardDescription>
            <div className="mb-4">
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="bg-gray-800 border border-gray-600 text-white text-sm rounded px-3 py-2 w-full"
              >
                <option value="all">Todas as contas</option>
                {adAccounts?.map((account) => (
                  <option key={account.id} value={account.accountId}>
                    {account.network === 'facebook' ? '📘' : '🔍'} {account.name}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {campaignsLoading ? (
                [...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 glassmorphism-light" />
                ))
              ) : (
                filteredCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className={`glassmorphism-light rounded-lg p-3 border transition-all duration-200 ${
                      campaign.isSelected 
                        ? 'border-blue-400/50 bg-blue-500/10' 
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <Switch
                          checked={campaign.isSelected}
                          onCheckedChange={() => toggleCampaignMutation.mutate({
                            campaignId: campaign.id,
                            isSelected: campaign.isSelected
                          })}
                          className="scale-75"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <NetworkIcon network={campaign.network as 'facebook' | 'google'} size={16} />
                            <h4 className="text-sm font-medium text-white truncate">{campaign.name}</h4>
                            {getStatusBadge(campaign.status)}
                          </div>
                          <div className="grid grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-gray-400">Gasto: </span>
                              <div className="flex flex-col">
                                <span className="text-white font-medium">{formatCurrency(campaign.amountSpent, 'BRL')}</span>
                                {campaign.originalCurrency && campaign.originalCurrency !== 'BRL' && formatOriginalCurrency(campaign.originalAmountSpent, campaign.originalCurrency) && (
                                  <span className="text-gray-500 text-xs">
                                    {formatOriginalCurrency(campaign.originalAmountSpent, campaign.originalCurrency)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-400">Impressões: </span>
                              <span className="text-white font-medium">{campaign.impressions.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Cliques: </span>
                              <span className="text-white font-medium">{campaign.clicks.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">CTR: </span>
                              <span className="text-white font-medium">{formatPercentage(campaign.ctr)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      ) : adAccounts?.length ? (
        <Card className="glassmorphism border-gray-700">
          <CardContent className="text-center py-12">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Nenhuma campanha encontrada</h3>
            <p className="text-gray-400 mb-6">
              Sincronize suas campanhas do Facebook Ads para começar
            </p>
            <Button 
              onClick={() => syncCampaignsMutation.mutate()}
              disabled={syncCampaignsMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncCampaignsMutation.isPending ? 'animate-spin' : ''}`} />
              Sincronizar Campanhas
            </Button>
          </CardContent>
        </Card>
      ) : adAccounts?.length ? (
        <Card className="glassmorphism border-gray-700">
          <CardContent className="text-center py-12">
            <Facebook className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {selectedAccountId === "all" ? "Nenhuma campanha encontrada" : "Nenhuma campanha na conta selecionada"}
            </h3>
            <p className="text-gray-400 mb-6">
              Sincronize suas campanhas do Facebook Ads para começar
            </p>
            <Button 
              onClick={() => syncCampaignsMutation.mutate()}
              disabled={syncCampaignsMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncCampaignsMutation.isPending ? 'animate-spin' : ''}`} />
              Sincronizar Campanhas
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}