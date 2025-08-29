import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentOperation } from '@/hooks/use-current-operation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Target, DollarSign, TrendingUp, Plus, Globe, Filter, X, Users, BarChart3, CheckCircle2, Circle } from 'lucide-react';
import { FacebookIcon, GoogleAdsIcon, NetworkIcon } from '@/components/ui/social-icons';

type Campaign = {
  id: string;
  name: string;
  status: string;
  accountId: string;
  network: 'facebook' | 'google';
  amountSpent: string;
  impressions: number;
  clicks: number;
  ctr: number;
  isSelected?: boolean;
  originalAmountSpent?: string;
  originalCurrency?: string;
};

type AdAccount = {
  id: string;
  accountId: string;
  name: string;
  network: 'facebook' | 'google';
  accessToken: string;
  businessManagerId?: string;
  isActive: boolean;
  currency: string;
};

type SyncInfo = {
  lastSync: string;
  isRunning: boolean;
  progress: number;
};

const formatCurrency = (value: string | number, currency: string = 'BRL') => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return `${currency} 0,00`;
  
  if (currency === 'BRL') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(numValue);
};

const formatOriginalCurrency = (value: string | undefined, currency: string | undefined) => {
  if (!value || !currency || value === '0' || parseFloat(value) === 0) return null;
  return formatCurrency(value, currency);
};

const formatPercentage = (value: number) => {
  return `${(value * 100).toFixed(2)}%`;
};

const getStatusBadge = (status: string) => {
  const statusMap = {
    'ACTIVE': { label: 'Ativa', variant: 'default' as const, color: 'bg-green-500' },
    'PAUSED': { label: 'Pausada', variant: 'secondary' as const, color: 'bg-yellow-500' },
    'ARCHIVED': { label: 'Arquivada', variant: 'destructive' as const, color: 'bg-gray-500' },
  };
  
  const config = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const, color: 'bg-gray-500' };
  
  return (
    <Badge variant={config.variant} className="text-xs">
      <span className={`w-2 h-2 rounded-full mr-1 ${config.color}`}></span>
      {config.label}
    </Badge>
  );
};

export default function AdsPage() {
  const { currentOperation } = useCurrentOperation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedPeriod, setSelectedPeriod] = useState('last_7d');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [networkSelectOpen, setNetworkSelectOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<'facebook' | 'google'>('facebook');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [accountsDialogOpen, setAccountsDialogOpen] = useState(false);
  
  const [newAccount, setNewAccount] = useState({
    accountId: '',
    name: '',
    accessToken: '',
    businessManagerId: ''
  });

  // Fetch accounts
  const { data: adAccounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['/api/ads/accounts', currentOperation?.id],
    enabled: !!currentOperation?.id
  });

  // Fetch campaigns
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['/api/ads/campaigns', currentOperation?.id, selectedPeriod],
    enabled: !!currentOperation?.id && !!adAccounts?.length
  });

  // Fetch sync info
  const { data: syncInfo } = useQuery<SyncInfo>({
    queryKey: ['/api/ads/sync-info', currentOperation?.id],
    enabled: !!currentOperation?.id,
    refetchInterval: 5000
  });

  const syncCampaignsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/ads/sync?operationId=${currentOperation?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao sincronizar campanhas');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ads/campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ads/sync-info'] });
      toast({
        title: "Sincronização iniciada",
        description: "As campanhas estão sendo sincronizadas...",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na sincronização",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const addAccountMutation = useMutation({
    mutationFn: async (account: typeof newAccount) => {
      const response = await fetch(`/api/ads/accounts?operationId=${currentOperation?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...account,
          network: selectedNetwork
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao adicionar conta');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ads/accounts'] });
      setDialogOpen(false);
      setNewAccount({ accountId: '', name: '', accessToken: '', businessManagerId: '' });
      toast({
        title: "Conta adicionada",
        description: "A conta foi conectada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao conectar conta",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Filter campaigns based on selected account
  const filteredCampaigns = campaigns?.filter(campaign => {
    if (selectedAccountId === "all") return true;
    return campaign.accountId === selectedAccountId;
  }) || [];

  // Selected campaigns from ALL accounts (unfiltered)
  const allSelectedCampaigns = campaigns?.filter(c => c.isSelected) || [];
  
  // Selected campaigns from filtered account (for display in counter)
  const filteredSelectedCampaigns = filteredCampaigns.filter(c => c.isSelected) || [];
  
  // Total spent from ALL selected campaigns (always in BRL for consolidation)
  const totalSpent = allSelectedCampaigns.reduce((sum, c) => sum + parseFloat((c as any).amountSpentBRL || c.amountSpent || "0"), 0);

  if (accountsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Anúncios</h1>
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
      {/* Header - Mobile responsive */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-white">Anúncios</h1>
            <p className="text-sm text-gray-400">Campanhas Meta Ads e Google Ads</p>
          </div>
          
          {/* Mobile: Layout vertical */}
          <div className="flex flex-col sm:flex-row gap-3 lg:flex-row lg:items-center lg:space-x-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-gray-800 border border-gray-600 text-white text-sm rounded px-3 py-2 h-10"
            >
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="last_7d">Últimos 7 dias</option>
              <option value="last_30d">Últimos 30 dias</option>
              <option value="this_month">Este mês</option>
              <option value="last_month">Mês passado</option>
              <option value="this_quarter">Este trimestre</option>
            </select>
            
            <div className="flex items-center gap-2">
              {syncInfo?.lastSync && (
                <span className="text-xs text-gray-400 hidden sm:block">
                  Último sync: {new Date(syncInfo.lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <Button
                onClick={() => syncCampaignsMutation.mutate()}
                disabled={syncCampaignsMutation.isPending || !adAccounts?.length}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 h-10 flex-1 sm:flex-none"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncCampaignsMutation.isPending ? 'animate-spin' : ''}`} />
                Sync
              </Button>
              
              <Dialog open={networkSelectOpen} onOpenChange={setNetworkSelectOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 h-10 flex-1 sm:flex-none">
                    <Plus className="w-4 h-4 mr-2" />
                    Conta
                  </Button>
                </DialogTrigger>
                <DialogContent className="glassmorphism border-gray-700 max-w-md mx-4">
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
                      className="h-24 flex items-center justify-center bg-blue-600 hover:bg-blue-700 border border-blue-500"
                    >
                      <FacebookIcon size={48} />
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
                      <GoogleAdsIcon size={48} />
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards - Mobile responsive grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
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
            <p className="text-gray-400 text-sm">{allSelectedCampaigns.length} campanhas selecionadas</p>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span>Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-purple-400">
              {filteredCampaigns.length > 0 ? 
                formatPercentage(filteredCampaigns.reduce((sum, c) => sum + c.ctr, 0) / filteredCampaigns.length) : 
                '0%'
              }
            </div>
            <p className="text-gray-400 text-sm">CTR médio</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Management - Mobile friendly */}
      {filteredCampaigns && filteredCampaigns.length > 0 && (
        <Card className="glassmorphism border-gray-700">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-white">Campanhas</CardTitle>
                <p className="text-gray-400 text-sm">Gerencie suas campanhas ativas</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white w-full sm:w-48">
                    <SelectValue placeholder="Filtrar por conta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Contas</SelectItem>
                    {adAccounts?.map((account: AdAccount) => (
                      <SelectItem key={account.id} value={account.accountId}>
                        {account.name} ({account.network})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  onClick={() => setAccountsDialogOpen(true)}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Contas ({adAccounts?.length || 0})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mobile: Stack layout, Desktop: Grid layout */}
            <div className="space-y-3 lg:space-y-4">
              {filteredCampaigns.map((campaign) => (
                <div key={campaign.id} className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <NetworkIcon network={campaign.network as 'facebook' | 'google'} size={16} />
                        <h4 className="text-sm font-medium text-white truncate">{campaign.name}</h4>
                      </div>
                      {getStatusBadge(campaign.status)}
                    </div>
                    
                    {/* Mobile: Stack layout, Desktop: Grid layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="flex justify-between sm:block">
                        <span className="text-gray-400">Gasto:</span>
                        <div className="text-right sm:text-left">
                          <div className="text-white font-medium">{formatCurrency(campaign.amountSpent, 'BRL')}</div>
                          {campaign.originalCurrency && campaign.originalCurrency !== 'BRL' && formatOriginalCurrency(campaign.originalAmountSpent, campaign.originalCurrency) && (
                            <div className="text-gray-500 text-xs">
                              {formatOriginalCurrency(campaign.originalAmountSpent, campaign.originalCurrency)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between sm:block">
                        <span className="text-gray-400">Impressões:</span>
                        <span className="text-white font-medium">{campaign.impressions.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between sm:block">
                        <span className="text-gray-400">Cliques:</span>
                        <span className="text-white font-medium">{campaign.clicks.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between sm:block">
                        <span className="text-gray-400">CTR:</span>
                        <span className="text-white font-medium">{formatPercentage(campaign.ctr)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Account Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glassmorphism border-gray-700 max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-white">
              Conectar Conta {selectedNetwork === 'facebook' ? 'Meta' : 'Google Ads'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Insira as credenciais da sua conta {selectedNetwork === 'facebook' ? 'Meta Business' : 'Google Ads'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="accountId" className="text-sm text-gray-300">ID da Conta</Label>
              <Input
                id="accountId"
                value={newAccount.accountId}
                onChange={(e) => setNewAccount(prev => ({ ...prev, accountId: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-9"
                placeholder={selectedNetwork === 'facebook' ? "ID da conta do Facebook Ads" : "ID da conta do Google Ads"}
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
                placeholder="Nome para identificar a conta"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="accessToken" className="text-sm text-gray-300">Token de Acesso</Label>
              <Input
                id="accessToken"
                value={newAccount.accessToken}
                onChange={(e) => setNewAccount(prev => ({ ...prev, accessToken: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white h-9"
                placeholder={selectedNetwork === 'facebook' ? "Token de acesso do Facebook" : "Token OAuth2 do Google Ads"}
                type="password"
                required
              />
            </div>

            {selectedNetwork === 'google' && (
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

      {/* Accounts Dialog */}
      <Dialog open={accountsDialogOpen} onOpenChange={setAccountsDialogOpen}>
        <DialogContent className="glassmorphism border-gray-700 max-w-2xl mx-4">
          <DialogHeader>
            <DialogTitle className="text-white">Contas Conectadas</DialogTitle>
            <DialogDescription className="text-gray-400">
              Gerencie suas contas de anúncios conectadas
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {adAccounts && adAccounts.length > 0 ? (
              <div className="space-y-4">
                {/* Meta Ads Accounts */}
                {(() => {
                  const facebookAccounts = adAccounts.filter(a => a.network === 'facebook');
                  return facebookAccounts.length > 0 ? (
                    <div>
                      <h3 className="text-sm font-medium text-white flex items-center space-x-2 mb-3">
                        <FacebookIcon size={16} />
                        <span>Meta Ads ({facebookAccounts.length})</span>
                      </h3>
                      <div className="space-y-2">
                        {facebookAccounts.map((account) => (
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
                                  {account.isActive ? 'Ativa' : 'Inativa'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Google Ads Accounts */}
                {(() => {
                  const googleAccounts = adAccounts.filter(a => a.network === 'google');
                  return googleAccounts.length > 0 ? (
                    <div>
                      <h3 className="text-sm font-medium text-white flex items-center space-x-2 mb-3">
                        <GoogleAdsIcon size={16} />
                        <span>Google Ads ({googleAccounts.length})</span>
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
                                  {account.isActive ? 'Ativa' : 'Inativa'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            ) : (
              <div className="text-center py-8">
                <Globe className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-400">Nenhuma conta conectada</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}