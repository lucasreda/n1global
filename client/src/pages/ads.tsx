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
  Target
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface FacebookCampaign {
  id: string;
  campaignId: string;
  name: string;
  status: string;
  objective: string;
  dailyBudget: string;
  lifetimeBudget: string;
  amountSpent: string;
  impressions: number;
  clicks: number;
  cpm: string;
  cpc: string;
  ctr: string;
  isSelected: boolean;
  startTime: string;
  endTime: string;
  lastSync: string;
}

interface FacebookAdAccount {
  id: string;
  accountId: string;
  name: string;
  isActive: boolean;
  currency: string;
  timezone: string;
  lastSync: string;
}

export default function Ads() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    accountId: "",
    name: "",
    accessToken: "",
    appId: "",
    appSecret: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Facebook Ad Accounts
  const { data: adAccounts, isLoading: accountsLoading } = useQuery({
    queryKey: ["/api/facebook/accounts"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/facebook/accounts");
      return response.json() as Promise<FacebookAdAccount[]>;
    },
  });

  // Fetch Facebook Campaigns
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ["/api/facebook/campaigns"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/facebook/campaigns");
      return response.json() as Promise<FacebookCampaign[]>;
    },
    enabled: (adAccounts?.length || 0) > 0,
  });

  // Add new ad account
  const addAccountMutation = useMutation({
    mutationFn: async (accountData: any) => {
      const response = await authenticatedApiRequest("POST", "/api/facebook/accounts", accountData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Conta adicionada",
        description: "Conta do Facebook Ads configurada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/facebook/accounts"] });
      setDialogOpen(false);
      setNewAccount({
        accountId: "",
        name: "",
        accessToken: "",
        appId: "",
        appSecret: ""
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
      const response = await authenticatedApiRequest("POST", "/api/facebook/sync");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sincronização concluída",
        description: `${data.synced || 0} campanhas sincronizadas`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/facebook/campaigns"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/facebook/campaigns"] });
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

  const formatCurrency = (amount: string) => {
    return `€${parseFloat(amount || "0").toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;
  };

  const formatPercentage = (value: string) => {
    return `${parseFloat(value || "0").toFixed(2)}%`;
  };

  const selectedCampaigns = campaigns?.filter(c => c.isSelected) || [];
  const totalSpent = selectedCampaigns.reduce((sum, c) => sum + parseFloat(c.amountSpent || "0"), 0);

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
          <h1 className="text-2xl font-bold text-white">Anúncios Facebook</h1>
          <p className="text-gray-400">Gerencie campanhas e custos de marketing</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => syncCampaignsMutation.mutate()}
            disabled={syncCampaignsMutation.isPending || !adAccounts?.length}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-sync-campaigns"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncCampaignsMutation.isPending ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="button-add-account">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Conta
              </Button>
            </DialogTrigger>
            <DialogContent className="glassmorphism border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-white">Configurar Conta Facebook Ads</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Adicione suas credenciais do Facebook Ads para importar campanhas
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="accountId" className="text-right text-gray-300">ID da Conta</Label>
                  <Input
                    id="accountId"
                    value={newAccount.accountId}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, accountId: e.target.value }))}
                    className="col-span-3 bg-gray-800 border-gray-600 text-white"
                    placeholder="act_1234567890"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right text-gray-300">Nome</Label>
                  <Input
                    id="name"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                    className="col-span-3 bg-gray-800 border-gray-600 text-white"
                    placeholder="Minha Conta de Anúncios"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="accessToken" className="text-right text-gray-300">Access Token</Label>
                  <Input
                    id="accessToken"
                    value={newAccount.accessToken}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, accessToken: e.target.value }))}
                    className="col-span-3 bg-gray-800 border-gray-600 text-white"
                    placeholder="EAAxxxxxxxxxxxx..."
                    type="password"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="appId" className="text-right text-gray-300">App ID</Label>
                  <Input
                    id="appId"
                    value={newAccount.appId}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, appId: e.target.value }))}
                    className="col-span-3 bg-gray-800 border-gray-600 text-white"
                    placeholder="1234567890123456"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="appSecret" className="text-right text-gray-300">App Secret</Label>
                  <Input
                    id="appSecret"
                    value={newAccount.appSecret}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, appSecret: e.target.value }))}
                    className="col-span-3 bg-gray-800 border-gray-600 text-white"
                    placeholder="abcdef1234567890abcdef1234567890"
                    type="password"
                  />
                </div>
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
            <CardTitle className="text-white flex items-center space-x-2">
              <Target className="w-5 h-5 text-blue-400" />
              <span>Campanhas Selecionadas</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{selectedCampaigns.length}</div>
            <p className="text-gray-400 text-sm">de {campaigns?.length || 0} total</p>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span>Gasto Total</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{formatCurrency(totalSpent.toString())}</div>
            <p className="text-gray-400 text-sm">campanhas selecionadas</p>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center space-x-2">
              <Facebook className="w-5 h-5 text-blue-500" />
              <span>Contas Conectadas</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{adAccounts?.length || 0}</div>
            <p className="text-gray-400 text-sm">
              {adAccounts?.filter(a => a.isActive).length || 0} ativas
            </p>
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
      {campaigns?.length ? (
        <Card className="glassmorphism border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Campanhas do Facebook</CardTitle>
            <CardDescription className="text-gray-400">
              Selecione as campanhas que devem ser consideradas como custos de marketing no dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {campaignsLoading ? (
                [...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 glassmorphism-light" />
                ))
              ) : (
                campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className={`glassmorphism-light rounded-xl p-4 border transition-all duration-200 ${
                      campaign.isSelected 
                        ? 'border-blue-400/50 bg-blue-500/10' 
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Switch
                          checked={campaign.isSelected}
                          onCheckedChange={() => toggleCampaignMutation.mutate({
                            campaignId: campaign.id,
                            isSelected: campaign.isSelected
                          })}
                          data-testid={`switch-campaign-${campaign.campaignId}`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="font-medium text-white">{campaign.name}</h4>
                            {getStatusBadge(campaign.status)}
                          </div>
                          <p className="text-sm text-gray-400 mt-1">{campaign.objective}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-white">
                          {formatCurrency(campaign.amountSpent)}
                        </div>
                        <div className="text-xs text-gray-400">gasto</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-600">
                      <div className="flex items-center space-x-2">
                        <Eye className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-white">
                            {campaign.impressions.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-400">Impressões</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MousePointer className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-white">
                            {campaign.clicks.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-400">Cliques</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-white">
                            {formatPercentage(campaign.ctr)}
                          </div>
                          <div className="text-xs text-gray-400">CTR</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-white">
                            {formatCurrency(campaign.cpc)}
                          </div>
                          <div className="text-xs text-gray-400">CPC</div>
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
      ) : null}
    </div>
  );
}