import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { useOperationPermissions } from "@/hooks/use-operation-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
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
  Globe,
  Calculator,
  Trash2,
  Edit,
  Calendar
} from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import facebookIcon from "@assets/meta-icon_1756415603759.png";
import facebookIconMini from "@assets/metamini_1756416312919.png";
import googleAdsIcon from "@assets/gadsicon_1756416065444.png";
import googleAdsIconMini from "@assets/gadsmini_1756416199452.png";

// Componentes customizados para os ícones
const FacebookIcon = ({ size }: { size?: number }) => {
  // Use o ícone mini para tamanhos pequenos (até 24px) e o grande para botões
  const iconSrc = (size || 40) <= 24 ? facebookIconMini : facebookIcon;
  return (
    <img 
      src={iconSrc} 
      alt="Meta" 
      className="object-contain"
      style={{ width: size || 40, height: size || 40 }}
    />
  );
};

const GoogleAdsIcon = ({ size }: { size?: number }) => {
  // Use o ícone mini para tamanhos pequenos (até 24px) e o grande para botões
  const iconSrc = (size || 40) <= 24 ? googleAdsIconMini : googleAdsIcon;
  return (
    <img 
      src={iconSrc} 
      alt="Google Ads" 
      className="object-contain"
      style={{ width: size || 40, height: size || 40 }}
    />
  );
};

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

interface ManualAdSpend {
  id: string;
  operationId: string;
  amount: string;
  currency: string;
  platform: string;
  spendDate: string;
  description?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function Ads() {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [networkSelectOpen, setNetworkSelectOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<'facebook' | 'google'>('facebook');
  const [bmDialogOpen, setBmDialogOpen] = useState(false);
  const [accountsModalOpen, setAccountsModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("last_30d");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [manualSpendDialogOpen, setManualSpendDialogOpen] = useState(false);
  const [editingSpend, setEditingSpend] = useState<ManualAdSpend | null>(null);
  const { canEdit: canEditAds, canCreate: canCreateAds, canDelete: canDeleteAds } = useOperationPermissions();
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
  const [newManualSpend, setNewManualSpend] = useState({
    amount: "",
    platform: "facebook",
    spendDate: new Date().toISOString().split('T')[0],
    description: "",
    notes: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedOperation } = useCurrentOperation();

  // Fetch sync info
  const { data: syncInfo } = useQuery({
    queryKey: ["/api/facebook/sync-info", selectedOperation],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/facebook/sync-info");
      return response.json() as Promise<{ lastSync: string | null; canAutoSync: boolean; nextAutoSync: string | null }>;
    },
    refetchInterval: 60000, // Refetch every minute
    enabled: !!selectedOperation,
  });

  // Fetch Ad Accounts (Facebook + Google)
  const { data: adAccounts, isLoading: accountsLoading, refetch: refetchAccounts } = useQuery({
    queryKey: ["/api/ad-accounts", selectedOperation],
    queryFn: async () => {
      // Use fresh operation ID from localStorage to avoid state timing issues
      const currentOperationId = localStorage.getItem("current_operation_id") || selectedOperation;
      console.log("🔍 Fetching ad accounts for operation:", currentOperationId);
      const response = await authenticatedApiRequest("GET", `/api/ad-accounts?operationId=${currentOperationId}`);
      const data = await response.json() as AdAccount[];
      console.log("📋 Ad accounts received:", data.length, "accounts");
      return data;
    },
    enabled: !!selectedOperation,
  });

  // Fetch Campaigns (Facebook + Google)
  const { data: campaigns, isLoading: campaignsLoading, refetch: refetchCampaigns } = useQuery({
    queryKey: ["/api/campaigns", selectedPeriod, selectedOperation],
    queryFn: async () => {
      // Use fresh operation ID from localStorage to avoid state timing issues
      const currentOperationId = localStorage.getItem("current_operation_id") || selectedOperation;
      console.log("🎯 Fetching campaigns for operation:", currentOperationId, "period:", selectedPeriod);
      const response = await authenticatedApiRequest("GET", `/api/campaigns?period=${selectedPeriod}&autoSync=true&operationId=${currentOperationId}`);
      const data = await response.json() as Campaign[];
      console.log("📊 Campaigns received:", data.length, "campaigns");
      return data;
    },
    enabled: !!selectedOperation && (adAccounts?.length || 0) >= 0,
  });

  // Fetch Manual Ad Spends
  const { data: manualSpends, isLoading: manualSpendsLoading, refetch: refetchManualSpends } = useQuery({
    queryKey: ["/api/manual-ad-spend", selectedOperation, selectedPeriod],
    queryFn: async () => {
      const currentOperationId = localStorage.getItem("current_operation_id") || selectedOperation;
      const response = await authenticatedApiRequest("GET", `/api/manual-ad-spend?operationId=${currentOperationId}`);
      return response.json() as Promise<ManualAdSpend[]>;
    },
    enabled: !!selectedOperation,
  });

  // Fetch operation details to get currency
  const { data: operationDetails } = useQuery({
    queryKey: ["/api/operation-details", selectedOperation],
    queryFn: async () => {
      const currentOperationId = localStorage.getItem("current_operation_id") || selectedOperation;
      const response = await authenticatedApiRequest("GET", `/api/operations/${currentOperationId}`);
      return response.json() as Promise<{id: string, name: string, currency: string, country: string}>;
    },
    enabled: !!selectedOperation,
  });

  // Add new ad account
  const addAccountMutation = useMutation({
    mutationFn: async (accountData: any) => {
      const response = await authenticatedApiRequest("POST", "/api/ad-accounts", {
        ...accountData,
        network: selectedNetwork,
        operationId: selectedOperation
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('ads.accountAdded'),
        description: t('ads.accountConfiguredSuccess', { network: selectedNetwork === 'facebook' ? t('ads.metaAds') : t('ads.googleAds') }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ad-accounts", selectedOperation] });
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
        title: t('common.error'),
        description: t('ads.failedToConfigureAccount'),
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
        title: t('ads.syncCompleted'),
        description: t('ads.campaignsSynced', { count: data.synced || 0 }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", selectedPeriod, selectedOperation] });
    },
    onError: () => {
      toast({
        title: t('ads.syncError'),
        description: t('ads.failedToSyncCampaigns'),
        variant: "destructive",
      });
    },
  });

  // Toggle campaign selection
  const toggleCampaignMutation = useMutation({
    mutationFn: async ({ campaignId, isSelected }: { campaignId: string; isSelected: boolean }) => {
      const response = await authenticatedApiRequest("PATCH", `/api/campaigns/${campaignId}`, {
        isSelected: !isSelected,
        operationId: selectedOperation
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", selectedPeriod, selectedOperation] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics", selectedOperation] });
      toast({
        title: t('ads.campaignUpdated'),
        description: t('ads.campaignSelectionChanged'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('ads.failedToUpdateCampaign'),
        variant: "destructive",
      });
    },
  });

  // Create manual ad spend
  const createManualSpendMutation = useMutation({
    mutationFn: async (spendData: any) => {
      const response = await authenticatedApiRequest("POST", "/api/manual-ad-spend", {
        ...spendData,
        operationId: selectedOperation,
        currency: operationDetails?.currency || "EUR"
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('ads.spendAdded'),
        description: t('ads.manualSpendCreated'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/manual-ad-spend", selectedOperation] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics", selectedOperation] });
      setManualSpendDialogOpen(false);
      setNewManualSpend({
        amount: "",
        platform: "facebook",
        spendDate: new Date().toISOString().split('T')[0],
        description: "",
        notes: ""
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('ads.failedToCreateManualSpend'),
        variant: "destructive",
      });
    },
  });

  // Update manual ad spend
  const updateManualSpendMutation = useMutation({
    mutationFn: async ({ id, ...spendData }: any) => {
      const response = await authenticatedApiRequest("PATCH", `/api/manual-ad-spend/${id}`, {
        ...spendData,
        operationId: selectedOperation
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('ads.spendUpdated'),
        description: t('ads.manualSpendUpdated'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/manual-ad-spend", selectedOperation] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics", selectedOperation] });
      setManualSpendDialogOpen(false);
      setEditingSpend(null);
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('ads.failedToUpdateManualSpend'),
        variant: "destructive",
      });
    },
  });

  // Delete manual ad spend
  const deleteManualSpendMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await authenticatedApiRequest("DELETE", `/api/manual-ad-spend/${id}?operationId=${selectedOperation}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('ads.spendRemoved'),
        description: t('ads.manualSpendRemoved'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/manual-ad-spend", selectedOperation] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics", selectedOperation] });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('ads.failedToRemoveManualSpend'),
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      "ACTIVE": { label: t('ads.statusActive'), variant: "default" as const, color: "text-green-400" },
      "PAUSED": { label: t('ads.statusPaused'), variant: "secondary" as const, color: "text-yellow-400" },
      "DELETED": { label: t('ads.statusDeleted'), variant: "destructive" as const, color: "text-red-400" },
      "ARCHIVED": { label: t('ads.statusArchived'), variant: "outline" as const, color: "text-gray-400" },
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
  const campaignsSpent = allSelectedCampaigns.reduce((sum, c) => sum + parseFloat((c as any).amountSpentBRL || c.amountSpent || "0"), 0);
  
  // Gasto manual total em BRL (convertido conforme a moeda de cada gasto)
  const manualSpentBRL = (manualSpends || []).reduce((sum, spend) => {
    const amount = parseFloat(spend.amount || "0");
    
    // Se for BRL, usar direto
    if (spend.currency === 'BRL') {
      return sum + amount;
    }
    // Se for EUR, converter usando taxa aproximada (6.37)
    else if (spend.currency === 'EUR') {
      return sum + (amount * 6.37);
    }
    // Para outras moedas, usar conversão aproximada via BRL
    else {
      // Assumir conversão simples para outras moedas
      return sum + amount;
    }
  }, 0);
  
  // Total consolidado: campanhas + gastos manuais
  const totalSpent = campaignsSpent + manualSpentBRL;

  if (accountsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('ads.metaAds')}</h1>
            <p className="text-gray-400">{t('ads.manageCampaignsAndCosts')}</p>
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
          <h1 className="text-xl font-bold text-white">{t('ads.title')}</h1>
          <p className="text-sm text-gray-400">{t('ads.subtitle')}</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-gray-800 border border-gray-600 text-white text-sm rounded px-3 py-1.5"
          >
            <option value="today">{t('ads.today')}</option>
            <option value="yesterday">{t('ads.yesterday')}</option>
            <option value="last_7d">{t('ads.last7Days')}</option>
            <option value="last_30d">{t('ads.last30Days')}</option>
            <option value="this_month">{t('ads.thisMonth')}</option>
            <option value="last_month">{t('ads.lastMonth')}</option>
            <option value="this_quarter">{t('ads.thisQuarter')}</option>
          </select>
          <div className="flex items-center space-x-2">
            {syncInfo?.lastSync && (
              <span className="text-xs text-gray-400">
                {t('ads.lastSync')}: {new Date(syncInfo.lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setManualSpendDialogOpen(true)}
              className="border-gray-600 text-white hover:bg-gray-700"
              data-testid="button-add-manual-spend"
            >
              <Calculator className="w-4 h-4 mr-2" />
              {t('ads.manualSpend')}
            </Button>
            <Button
              onClick={() => syncCampaignsMutation.mutate()}
              disabled={syncCampaignsMutation.isPending || !adAccounts?.length}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 h-8"
              data-testid="button-sync-campaigns"
            >
              <RefreshCw className={`w-3 h-3 mr-2 ${syncCampaignsMutation.isPending ? 'animate-spin' : ''}`} />
              {t('ads.sync')}
            </Button>
          </div>
          {/* Network Selection Dialog */}
          <Dialog open={networkSelectOpen} onOpenChange={setNetworkSelectOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 h-8" data-testid="button-add-account">
                <Plus className="w-3 h-3 mr-2" />
                {t('ads.account')}
              </Button>
            </DialogTrigger>
            <DialogContent className="glassmorphism border-gray-700 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">{t('ads.selectAdNetwork')}</DialogTitle>
                <DialogDescription className="text-gray-400">
                  {t('ads.choosePlatformToConfigure')}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-6">
                <Button
                  onClick={() => {
                    setSelectedNetwork('facebook');
                    setNetworkSelectOpen(false);
                    setDialogOpen(true);
                  }}
                  className="h-24 flex items-center justify-center bg-blue-600 hover:bg-blue-700 border border-blue-500"
                >
                  <FacebookIcon size={120} />
                </Button>
                <Button
                  onClick={() => {
                    setSelectedNetwork('google');
                    setNetworkSelectOpen(false);
                    setDialogOpen(true);
                  }}
                  className="h-24 flex items-center justify-center border border-gray-300 hover:border-gray-400"
                  style={{ backgroundColor: '#f8f8f8' }}
                >
                  <GoogleAdsIcon size={180} />
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
                    {t('ads.configureAccount', { network: selectedNetwork === 'facebook' ? t('ads.metaAds') : t('ads.googleAds') })}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  {t('ads.addCredentialsToSync', { network: selectedNetwork === 'facebook' ? t('ads.meta') : t('ads.google') })}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1">
                  <Label htmlFor="accountId" className="text-sm text-gray-300">
                    {selectedNetwork === 'facebook' ? t('ads.metaAccountId') : t('ads.googleCustomerId')}
                  </Label>
                  <Input
                    id="accountId"
                    value={newAccount.accountId}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, accountId: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white h-9"
                    placeholder={selectedNetwork === 'facebook' ? t('ads.metaAccountIdPlaceholder') : t('ads.googleCustomerIdPlaceholder')}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="name" className="text-sm text-gray-300">{t('ads.accountName')}</Label>
                  <Input
                    id="name"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white h-9"
                    placeholder={t('ads.accountNamePlaceholder')}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="currency" className="text-sm text-gray-300">{t('ads.accountCurrency')}</Label>
                  <select
                    id="currency"
                    value={newAccount.baseCurrency || 'BRL'}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, baseCurrency: e.target.value }))}
                    className="bg-gray-800 border border-gray-600 text-white text-sm rounded px-3 py-2 h-9 w-full"
                  >
                    <option value="BRL">{t('ads.currencyBRL')}</option>
                    <option value="USD">{t('ads.currencyUSD')}</option>
                    <option value="EUR">{t('ads.currencyEUR')}</option>
                    <option value="GBP">{t('ads.currencyGBP')}</option>
                    <option value="CAD">{t('ads.currencyCAD')}</option>
                    <option value="AUD">{t('ads.currencyAUD')}</option>
                  </select>
                </div>

                {selectedNetwork === 'facebook' ? (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="accessToken" className="text-sm text-gray-300">{t('ads.metaAccessToken')}</Label>
                      <Input
                        id="accessToken"
                        value={newAccount.accessToken}
                        onChange={(e) => setNewAccount(prev => ({ ...prev, accessToken: e.target.value }))}
                        className="bg-gray-800 border-gray-600 text-white h-9"
                        placeholder={t('ads.metaAccessTokenPlaceholder')}
                        type="password"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="appId" className="text-sm text-gray-300">{t('ads.appId')}</Label>
                      <Input
                        id="appId"
                        value={newAccount.appId}
                        onChange={(e) => setNewAccount(prev => ({ ...prev, appId: e.target.value }))}
                        className="bg-gray-800 border-gray-600 text-white h-9"
                        placeholder={t('ads.appIdPlaceholder')}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="appSecret" className="text-sm text-gray-300">{t('ads.appSecret')}</Label>
                      <Input
                        id="appSecret"
                        value={newAccount.appSecret}
                        onChange={(e) => setNewAccount(prev => ({ ...prev, appSecret: e.target.value }))}
                        className="bg-gray-800 border-gray-600 text-white h-9"
                        placeholder={t('ads.appSecretPlaceholder')}
                        type="password"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="accessToken" className="text-sm text-gray-300">{t('ads.googleAccessToken')}</Label>
                      <Input
                        id="accessToken"
                        value={newAccount.accessToken}
                        onChange={(e) => setNewAccount(prev => ({ ...prev, accessToken: e.target.value }))}
                        className="bg-gray-800 border-gray-600 text-white h-9"
                        placeholder={t('ads.googleAccessTokenPlaceholder')}
                        type="password"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="managerId" className="text-sm text-gray-300">{t('ads.managerAccountId')}</Label>
                      <Input
                        id="managerId"
                        value={newAccount.businessManagerId}
                        onChange={(e) => setNewAccount(prev => ({ ...prev, businessManagerId: e.target.value }))}
                        className="bg-gray-800 border-gray-600 text-white h-9"
                        placeholder={t('ads.managerAccountIdPlaceholder')}
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
                  {t('ads.connectAccount')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Manual Ad Spend Dialog */}
          <Dialog open={manualSpendDialogOpen} onOpenChange={setManualSpendDialogOpen}>
            <DialogContent className="glassmorphism border-gray-700 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center">
                  <Calculator className="w-5 h-5 mr-2 text-green-400" />
                  {editingSpend ? t('ads.editManualSpend') : t('ads.addManualSpend')}
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  {editingSpend ? t('ads.updateSpend') : t('ads.registerManualSpend')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1">
                  <Label htmlFor="amount" className="text-sm text-gray-300">
                    {t('ads.value')} ({operationDetails?.currency || 'EUR'})
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={editingSpend ? editingSpend.amount : newManualSpend.amount}
                    onChange={(e) => {
                      if (editingSpend) {
                        setEditingSpend({ ...editingSpend, amount: e.target.value });
                      } else {
                        setNewManualSpend(prev => ({ ...prev, amount: e.target.value }));
                      }
                    }}
                    className="bg-gray-800 border-gray-600 text-white h-9"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="platform" className="text-sm text-gray-300">{t('ads.platform')}</Label>
                  <Select 
                    value={editingSpend ? editingSpend.platform : newManualSpend.platform}
                    onValueChange={(value) => {
                      if (editingSpend) {
                        setEditingSpend({ ...editingSpend, platform: value });
                      } else {
                        setNewManualSpend(prev => ({ ...prev, platform: value }));
                      }
                    }}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="facebook" className="text-white">
                        <div className="flex items-center gap-2">
                          <FacebookIcon size={16} />
                          <span>{t('ads.metaAds')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="google" className="text-white">
                        <div className="flex items-center gap-2">
                          <GoogleAdsIcon size={16} />
                          <span>{t('ads.googleAds')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="taboola" className="text-white">{t('ads.taboola')}</SelectItem>
                      <SelectItem value="tiktok" className="text-white">{t('ads.tiktokAds')}</SelectItem>
                      <SelectItem value="influencer" className="text-white">{t('ads.influencer')}</SelectItem>
                      <SelectItem value="outro" className="text-white">{t('ads.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="spendDate" className="text-sm text-gray-300">{t('ads.spendDate')}</Label>
                  <Input
                    id="spendDate"
                    type="date"
                    value={editingSpend ? editingSpend.spendDate.split('T')[0] : newManualSpend.spendDate}
                    onChange={(e) => {
                      if (editingSpend) {
                        setEditingSpend({ ...editingSpend, spendDate: e.target.value });
                      } else {
                        setNewManualSpend(prev => ({ ...prev, spendDate: e.target.value }));
                      }
                    }}
                    className="bg-gray-800 border-gray-600 text-white h-9"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="description" className="text-sm text-gray-300">{t('ads.descriptionOptional')}</Label>
                  <Input
                    id="description"
                    value={editingSpend ? editingSpend.description || "" : newManualSpend.description}
                    onChange={(e) => {
                      if (editingSpend) {
                        setEditingSpend({ ...editingSpend, description: e.target.value });
                      } else {
                        setNewManualSpend(prev => ({ ...prev, description: e.target.value }));
                      }
                    }}
                    className="bg-gray-800 border-gray-600 text-white h-9"
                    placeholder={t('ads.descriptionPlaceholder')}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="notes" className="text-sm text-gray-300">{t('ads.notesOptional')}</Label>
                  <Textarea
                    id="notes"
                    value={editingSpend ? editingSpend.notes || "" : newManualSpend.notes}
                    onChange={(e) => {
                      if (editingSpend) {
                        setEditingSpend({ ...editingSpend, notes: e.target.value });
                      } else {
                        setNewManualSpend(prev => ({ ...prev, notes: e.target.value }));
                      }
                    }}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder={t('ads.notesPlaceholder')}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                {editingSpend && (
                  <Button 
                    onClick={() => deleteManualSpendMutation.mutate(editingSpend.id)}
                    disabled={deleteManualSpendMutation.isPending}
                    variant="destructive"
                    className="mr-auto"
                  >
                    {deleteManualSpendMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('common.delete')}
                  </Button>
                )}
                <Button 
                  onClick={() => {
                    if (editingSpend) {
                      updateManualSpendMutation.mutate({
                        id: editingSpend.id,
                        amount: editingSpend.amount,
                        platform: editingSpend.platform,
                        spendDate: editingSpend.spendDate,
                        description: editingSpend.description,
                        notes: editingSpend.notes
                      });
                    } else {
                      createManualSpendMutation.mutate(newManualSpend);
                    }
                  }}
                  disabled={createManualSpendMutation.isPending || updateManualSpendMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {(createManualSpendMutation.isPending || updateManualSpendMutation.isPending) && 
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                  {editingSpend ? t('ads.update') : t('ads.add')} {t('ads.spend')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glassmorphism border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span>{t('ads.totalSpend')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{formatCurrency(totalSpent.toString(), 'BRL')}</div>
            <p className="text-gray-400 text-sm">{t('ads.campaignsFromAllAccounts', { count: allSelectedCampaigns.length })}</p>
            
            {/* Breakdown por plataforma */}
            {filteredCampaigns && filteredCampaigns.length > 0 && (
              <div className="mt-3 space-y-2">
                {(() => {
                  // Usar campanhas selecionadas se houver, senão usar todas as filtradas
                  const campaignsToAnalyze = allSelectedCampaigns.length > 0 ? allSelectedCampaigns : filteredCampaigns;
                  
                  // Identificar Meta Ads e Google Ads por rede
                  const metaCampaigns = campaignsToAnalyze.filter(c => {
                    // Se tem network específico, usar isso
                    if (c.network === 'facebook') return true;
                    if (c.network === 'google') return false;
                    // Se não tem network definido, assumir que é Meta (padrão atual)
                    return !c.network;
                  });
                  
                  const googleCampaigns = campaignsToAnalyze.filter(c => c.network === 'google');
                  
                  // Calcular gastos das campanhas
                  const metaCampaignsSpent = metaCampaigns.reduce((sum, c) => sum + parseFloat(c.amountSpent || "0"), 0);
                  const googleCampaignsSpent = googleCampaigns.reduce((sum, c) => sum + parseFloat(c.amountSpent || "0"), 0);
                  
                  // Calcular gastos manuais por plataforma
                  const metaManualSpent = (manualSpends || []).reduce((sum, spend) => {
                    if (spend.platform === 'facebook') {
                      const amount = parseFloat(spend.amount || "0");
                      if (spend.currency === 'BRL') {
                        return sum + amount;
                      } else if (spend.currency === 'EUR') {
                        return sum + (amount * 6.37);
                      } else {
                        return sum + amount;
                      }
                    }
                    return sum;
                  }, 0);
                  
                  const googleManualSpent = (manualSpends || []).reduce((sum, spend) => {
                    if (spend.platform === 'google') {
                      const amount = parseFloat(spend.amount || "0");
                      if (spend.currency === 'BRL') {
                        return sum + amount;
                      } else if (spend.currency === 'EUR') {
                        return sum + (amount * 6.37);
                      } else {
                        return sum + amount;
                      }
                    }
                    return sum;
                  }, 0);
                  
                  // Totais consolidados por plataforma
                  const metaTotalSpent = metaCampaignsSpent + metaManualSpent;
                  const googleTotalSpent = googleCampaignsSpent + googleManualSpent;
                  
                  const hasAnySpending = metaTotalSpent > 0 || googleTotalSpent > 0;
                  
                  return (
                    <>
                      {hasAnySpending && (
                        <>
                          {metaTotalSpent > 0 && (
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-2">
                                <FacebookIcon size={12} />
                                <span className="text-gray-300">{t('ads.metaAds')}</span>
                              </div>
                              <span className="text-blue-400 font-medium">{formatCurrency(metaTotalSpent.toString(), 'BRL')}</span>
                            </div>
                          )}
                          {googleTotalSpent > 0 && (
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-2">
                                <GoogleAdsIcon size={12} />
                                <span className="text-gray-300">{t('ads.googleAds')}</span>
                              </div>
                              <span className="text-red-400 font-medium">{formatCurrency(googleTotalSpent.toString(), 'BRL')}</span>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glassmorphism border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-green-400" />
              <span>{t('ads.manualSpends')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{manualSpends?.length || 0}</div>
            <p className="text-gray-400 text-sm">
              {manualSpends && manualSpends.length > 0 
                ? `${manualSpends.reduce((sum, s) => sum + parseFloat(s.amount || "0"), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'EUR' })} ${t('ads.total')}`
                : t('ads.noManualSpend')}
            </p>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white flex items-center space-x-2">
              <Target className="w-4 h-4 text-blue-400" />
              <span>{t('ads.selectedCampaigns')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{filteredSelectedCampaigns.length}</div>
            <p className="text-gray-400 text-sm">{selectedAccountId === "all" ? t('ads.ofCampaignsTotal', { total: filteredCampaigns.length }) : t('ads.ofCampaignsAccount', { total: filteredCampaigns.length })}</p>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-gray-700" data-tour-id="section-ad-accounts">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white flex items-center space-x-2">
              {(() => {
                const metaAccounts = adAccounts?.filter(a => a.network === 'facebook') || [];
                const googleAccounts = adAccounts?.filter(a => a.network === 'google') || [];
                
                if (metaAccounts.length > 0 && googleAccounts.length > 0) {
                  return (
                    <>
                      <FacebookIcon size={16} />
                      <GoogleAdsIcon size={16} />
                    </>
                  );
                } else if (metaAccounts.length > 0) {
                  return <FacebookIcon size={16} />;
                } else if (googleAccounts.length > 0) {
                  return <GoogleAdsIcon size={16} />;
                } else {
                  return <Globe className="w-4 h-4 text-gray-400" />;
                }
              })()}
              <span>{t('ads.connectedAccounts')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{adAccounts?.length || 0}</div>
            <p className="text-gray-400 text-sm">
              {t('ads.activeAccounts', { count: adAccounts?.filter(a => a.isActive).length || 0 })}
            </p>
            
            {/* Estatísticas por plataforma */}
            {adAccounts && adAccounts.length > 0 && (
              <div className="mt-3 space-y-2">
                {(() => {
                  const metaAccounts = adAccounts.filter(a => a.network === 'facebook');
                  const googleAccounts = adAccounts.filter(a => a.network === 'google');
                  
                  return (
                    <>
                      {metaAccounts.length > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <FacebookIcon size={12} />
                            <span className="text-gray-300">{t('ads.metaAds')}</span>
                          </div>
                          <span className="text-blue-400 font-medium">{metaAccounts.length}</span>
                        </div>
                      )}
                      {googleAccounts.length > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <GoogleAdsIcon size={12} />
                            <span className="text-gray-300">{t('ads.googleAds')}</span>
                          </div>
                          <span className="text-red-400 font-medium">{googleAccounts.length}</span>
                        </div>
                      )}
                      
                      {/* Lista de contas mais compacta */}
                      <div className="mt-3 pt-2 border-t border-gray-600">
                        {adAccounts.slice(0, 2).map((account) => (
                          <div key={account.id} className="flex items-center space-x-2 text-xs py-1">
                            <NetworkIcon network={account.network as 'facebook' | 'google'} size={12} />
                            <span className="text-gray-300 truncate flex-1">{account.name}</span>
                            <span className={`text-[10px] ${account.isActive ? 'text-green-400' : 'text-red-400'}`}>●</span>
                          </div>
                        ))}
                        {adAccounts.length > 2 && (
                          <button 
                            onClick={() => setAccountsModalOpen(true)}
                            className="text-xs text-blue-400 hover:text-blue-300 text-center pt-1 w-full cursor-pointer transition-colors"
                          >
                            +{adAccounts.length - 2} {t('ads.more')}
                          </button>
                        )}
                      </div>
                    </>
                  );
                })()}
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
            <h3 className="text-xl font-semibold text-white mb-2">{t('ads.noAccountConnected')}</h3>
            <p className="text-gray-400 mb-6">
              {t('ads.configureFirstAccount')}
            </p>
            <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              {t('ads.addFirstAccount')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Campaigns List */}
      {filteredCampaigns?.length ? (
        <Card className="glassmorphism border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white">
              {t('ads.campaigns')} {selectedAccountId !== "all" && `- ${adAccounts?.find(acc => acc.accountId === selectedAccountId)?.name}`}
            </CardTitle>
            <CardDescription className="text-sm text-gray-400 mb-3">
              {t('ads.selectCampaignsForDashboard')}
            </CardDescription>
            <div className="mb-4">
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue placeholder={t('ads.selectAccount')} />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all" className="text-white">
                    <div className="flex items-center gap-2">
                      <Globe size={16} className="text-gray-400" />
                      <span>{t('ads.allAccounts')}</span>
                    </div>
                  </SelectItem>
                  {adAccounts?.map((account) => (
                    <SelectItem key={account.id} value={account.accountId} className="text-white">
                      <div className="flex items-center gap-2">
                        <NetworkIcon network={account.network as 'facebook' | 'google'} size={16} />
                        <span>{account.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                              <span className="text-gray-400">{t('ads.spend')}: </span>
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
                              <span className="text-gray-400">{t('ads.impressions')}: </span>
                              <span className="text-white font-medium">{campaign.impressions.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">{t('ads.clicks')}: </span>
                              <span className="text-white font-medium">{campaign.clicks.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">{t('ads.ctr')}: </span>
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
            <h3 className="text-xl font-semibold text-white mb-2">{t('ads.noCampaignsFound')}</h3>
            <p className="text-gray-400 mb-6">
              {t('ads.syncCampaignsToStart')}
            </p>
            <Button 
              onClick={() => syncCampaignsMutation.mutate()}
              disabled={syncCampaignsMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncCampaignsMutation.isPending ? 'animate-spin' : ''}`} />
              {t('ads.syncCampaigns')}
            </Button>
          </CardContent>
        </Card>
      ) : adAccounts?.length ? (
        <Card className="glassmorphism border-gray-700">
          <CardContent className="text-center py-12">
            <Facebook className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {selectedAccountId === "all" ? t('ads.noCampaignsFound') : t('ads.noCampaignsInSelectedAccount')}
            </h3>
            <p className="text-gray-400 mb-6">
              {t('ads.syncCampaignsToStart')}
            </p>
            <Button 
              onClick={() => syncCampaignsMutation.mutate()}
              disabled={syncCampaignsMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncCampaignsMutation.isPending ? 'animate-spin' : ''}`} />
              {t('ads.syncCampaigns')}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Modal de Todas as Contas Conectadas */}
      <Dialog open={accountsModalOpen} onOpenChange={setAccountsModalOpen}>
        <DialogContent className="glassmorphism border-gray-700 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center space-x-2">
              <FacebookIcon size={20} />
              <GoogleAdsIcon size={20} />
              <span>{t('ads.allConnectedAccounts')}</span>
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {t('ads.viewAllConnectedAccounts')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {adAccounts && adAccounts.length > 0 ? (
              <>
                {/* Contas Meta */}
                {(() => {
                  const metaAccounts = adAccounts.filter(a => a.network === 'facebook');
                  return metaAccounts.length > 0 ? (
                    <div>
                      <h3 className="text-sm font-medium text-white flex items-center space-x-2 mb-3">
                        <FacebookIcon size={16} />
                        <span>{t('ads.metaAds')} ({metaAccounts.length})</span>
                      </h3>
                      <div className="space-y-2">
                        {metaAccounts.map((account) => (
                          <div key={account.id} className="glassmorphism-light rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <FacebookIcon size={16} />
                                <div>
                                  <h4 className="text-white text-sm font-medium">{account.name}</h4>
                                  <p className="text-gray-400 text-xs">ID: {account.accountId}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className="text-xs text-gray-400">{account.currency}</span>
                                <span className={`w-2 h-2 rounded-full ${account.isActive ? 'bg-green-400' : 'bg-red-400'}`}></span>
                                <span className={`text-xs ${account.isActive ? 'text-green-400' : 'text-red-400'}`}>
                                  {account.isActive ? t('ads.active') : t('ads.inactive')}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Contas Google Ads */}
                {(() => {
                  const googleAccounts = adAccounts.filter(a => a.network === 'google');
                  return googleAccounts.length > 0 ? (
                    <div>
                      <h3 className="text-sm font-medium text-white flex items-center space-x-2 mb-3">
                        <GoogleAdsIcon size={16} />
                        <span>{t('ads.googleAds')} ({googleAccounts.length})</span>
                      </h3>
                      <div className="space-y-2">
                        {googleAccounts.map((account) => (
                          <div key={account.id} className="glassmorphism-light rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <GoogleAdsIcon size={16} />
                                <div>
                                  <h4 className="text-white text-sm font-medium">{account.name}</h4>
                                  <p className="text-gray-400 text-xs">ID: {account.accountId}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className="text-xs text-gray-400">{account.currency}</span>
                                <span className={`w-2 h-2 rounded-full ${account.isActive ? 'bg-green-400' : 'bg-red-400'}`}></span>
                                <span className={`text-xs ${account.isActive ? 'text-green-400' : 'text-red-400'}`}>
                                  {account.isActive ? t('ads.active') : t('ads.inactive')}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </>
            ) : (
              <div className="text-center py-8">
                <Globe className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-400">{t('ads.noAccountConnected')}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Ad Spends Details */}
      {manualSpends && manualSpends.length > 0 && (
        <Card className="glassmorphism border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-green-400" />
              <span>{t('ads.manualSpendsDetails')}</span>
            </CardTitle>
            <CardDescription className="text-sm text-gray-400">
              {t('ads.manualSpendsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {manualSpends.map((spend) => (
                <div
                  key={spend.id}
                  className="glassmorphism-light rounded-lg p-3 border border-gray-600 hover:border-gray-500 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          {spend.platform === 'facebook' && <FacebookIcon size={16} />}
                          {spend.platform === 'google' && <GoogleAdsIcon size={16} />}
                          {!['facebook', 'google'].includes(spend.platform) && <Globe className="w-4 h-4 text-gray-400" />}
                          <h4 className="text-sm font-medium text-white">
                            {spend.description || t('ads.spendFor', { platform: spend.platform === 'facebook' ? t('ads.metaAds') : 
                              spend.platform === 'google' ? t('ads.googleAds') : 
                              spend.platform.charAt(0).toUpperCase() + spend.platform.slice(1) })}
                          </h4>
                          <Badge variant="outline" className="text-green-400 border-green-400">
                            {t('ads.manual')}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div>
                            <span className="text-gray-400">{t('ads.value')}: </span>
                            <span className="text-white font-medium">{formatCurrency(spend.amount, spend.currency || 'EUR')}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">{t('ads.date')}: </span>
                            <span className="text-white font-medium">
                              {new Date(spend.spendDate).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">{t('ads.platform')}: </span>
                            <span className="text-white font-medium">
                              {spend.platform === 'facebook' ? t('ads.metaAds') : 
                               spend.platform === 'google' ? t('ads.googleAds') : 
                               spend.platform.charAt(0).toUpperCase() + spend.platform.slice(1)}
                            </span>
                          </div>
                        </div>
                        {spend.notes && (
                          <div className="mt-2 text-xs text-gray-400">
                            {spend.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {canEditAds('ads') && (
                        <Button
                          onClick={() => {
                            setEditingSpend(spend);
                            setManualSpendDialogOpen(true);
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                          title="Editar gasto manual"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}