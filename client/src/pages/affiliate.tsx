import { AffiliateLayout } from "@/components/affiliate/affiliate-layout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Link2, 
  DollarSign, 
  TrendingUp, 
  Users, 
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Package,
  Bell
} from "lucide-react";

interface AffiliateProfile {
  id: string;
  userId: string;
  storeId: string;
  fiscalName?: string;
  fiscalId?: string;
  status: string;
  trackingPixel?: string;
  landingPageUrl?: string;
  landingPageId?: string;
  bankAccountHolder?: string;
  bankIban?: string;
  pixKey?: string;
  approvedAt?: string;
  suspendedReason?: string;
}

interface AffiliateStats {
  totalClicks: number;
  totalConversions: number;
  pendingCommission: number;
  approvedCommission: number;
  paidCommission: number;
  conversionRate?: number;
  avgOrderValue?: number;
  earningsPerClick?: number;
}

interface AffiliateLandingPage {
  id: string;
  title: string;
  status: 'draft' | 'active' | 'archived';
  deployUrl?: string;
}

interface AffiliateNotification {
  id: string;
  type: 'approval' | 'rejection' | 'payout' | 'conversion' | 'alert';
  message: string;
  createdAt: string;
  read: boolean;
}

export default function AffiliateDashboard() {
  const { user } = useAuth();

  const { data: profile, isLoading: isLoadingProfile } = useQuery<AffiliateProfile>({
    queryKey: ['/api/affiliate/profile'],
    enabled: !!user && user.role === 'affiliate',
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery<AffiliateStats>({
    queryKey: ['/api/affiliate/dashboard/stats'],
    enabled: !!user && user.role === 'affiliate',
  });

  const { data: landingPage } = useQuery<AffiliateLandingPage>({
    queryKey: ['/api/affiliate/landing-page/assigned'],
    enabled: !!user && user.role === 'affiliate',
  });

  const { data: notifications = [] } = useQuery<AffiliateNotification[]>({
    queryKey: ['/api/affiliate/notifications'],
    enabled: !!user && user.role === 'affiliate',
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string; icon: any }> = {
      pending: { label: 'Pendente', className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30', icon: Clock },
      approved: { label: 'Aprovado', className: 'bg-green-500/20 text-green-500 border-green-500/30', icon: CheckCircle },
      suspended: { label: 'Suspenso', className: 'bg-red-500/20 text-red-500 border-red-500/30', icon: XCircle },
      rejected: { label: 'Rejeitado', className: 'bg-gray-500/20 text-gray-500 border-gray-500/30', icon: XCircle },
    };
    
    const variant = variants[status] || variants.pending;
    const Icon = variant.icon;
    
    return (
      <Badge className={variant.className}>
        <Icon className="h-3 w-3 mr-1" />
        {variant.label}
      </Badge>
    );
  };

  const getComplianceStatus = () => {
    const checks = [
      { label: 'Informações Fiscais', completed: !!profile?.fiscalName && !!profile?.fiscalId },
      { label: 'Dados Bancários', completed: !!profile?.bankAccountHolder && (!!profile?.bankIban || !!profile?.pixKey) },
      { label: 'Pixel de Rastreamento', completed: !!profile?.trackingPixel },
      { label: 'Landing Page Atribuída', completed: !!profile?.landingPageUrl },
    ];
    
    const completedCount = checks.filter(c => c.completed).length;
    const progress = (completedCount / checks.length) * 100;
    
    return { checks, completedCount, total: checks.length, progress };
  };

  const compliance = getComplianceStatus();
  const unreadNotifications = notifications.filter(n => !n.read).length;

  if (isLoadingProfile) {
    return (
      <AffiliateLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      </AffiliateLayout>
    );
  }

  return (
    <AffiliateLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-bold tracking-tight text-gray-900 dark:text-gray-100" style={{ fontSize: '22px' }}>
              Visão Geral
            </h1>
            <p className="text-muted-foreground mt-2">
              Acompanhe seu desempenho e comissões
            </p>
          </div>
          <div className="flex items-center gap-3">
            {profile && getStatusBadge(profile.status)}
            {unreadNotifications > 0 && (
              <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                <Bell className="h-3 w-3 mr-1" />
                {unreadNotifications} novas
              </Badge>
            )}
          </div>
        </div>

        {/* Status Alerts */}
        {profile?.status === 'pending' && (
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}} className="border-yellow-500/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-yellow-500 font-medium">Conta Pendente de Aprovação</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Sua conta está sendo analisada pela equipe. Complete seu perfil para acelerar a aprovação.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {profile?.status === 'suspended' && (
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}} className="border-red-500/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="text-red-500 font-medium">Conta Suspensa</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {profile.suspendedReason || 'Entre em contato com o suporte para mais informações.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Compliance Checklist */}
        {profile?.status === 'approved' && compliance.progress < 100 && (
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center justify-between">
                <span>Complete seu Perfil</span>
                <span className="text-sm text-gray-400">{compliance.completedCount}/{compliance.total}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={compliance.progress} className="h-2" />
              <div className="space-y-2">
                {compliance.checks.map((check, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    {check.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-500" />
                    )}
                    <span className={check.completed ? 'text-gray-400' : 'text-gray-300'}>
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total de Clicks</CardTitle>
              <Link2 className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-total-clicks">
                {isLoadingStats ? '...' : stats?.totalClicks?.toLocaleString() || 0}
              </div>
              {stats?.conversionRate !== undefined && (
                <p className="text-xs text-gray-400 mt-2">
                  Taxa de conversão: {stats.conversionRate.toFixed(2)}%
                </p>
              )}
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Conversões</CardTitle>
              <Users className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-total-conversions">
                {isLoadingStats ? '...' : stats?.totalConversions?.toLocaleString() || 0}
              </div>
              {stats?.avgOrderValue !== undefined && (
                <p className="text-xs text-gray-400 mt-2">
                  AOV: €{stats.avgOrderValue.toFixed(2)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Comissão Pendente</CardTitle>
              <TrendingUp className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-pending-commission">
                {isLoadingStats ? '...' : `€${stats?.pendingCommission?.toFixed(2) || '0.00'}`}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Aguardando aprovação
              </p>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Pago</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-paid-commission">
                {isLoadingStats ? '...' : `€${stats?.paidCommission?.toFixed(2) || '0.00'}`}
              </div>
              {stats?.earningsPerClick !== undefined && (
                <p className="text-xs text-gray-400 mt-2">
                  EPC: €{stats.earningsPerClick.toFixed(2)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Link2 className="h-5 w-5 text-blue-400" />
                Links de Rastreamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400 mb-4">
                Gere links personalizados para rastrear suas vendas
              </p>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-create-tracking-link"
              >
                Criar Novo Link
              </Button>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-400" />
                Landing Page
              </CardTitle>
            </CardHeader>
            <CardContent>
              {landingPage ? (
                <>
                  <p className="text-sm text-gray-400 mb-2">
                    {landingPage.title}
                  </p>
                  <Badge className={landingPage.status === 'active' ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'}>
                    {landingPage.status}
                  </Badge>
                  {landingPage.deployUrl && (
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={() => window.open(landingPage.deployUrl, '_blank')}
                      data-testid="button-view-landing-page"
                    >
                      Ver Landing Page
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400">
                  Nenhuma landing page atribuída
                </p>
              )}
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Package className="h-5 w-5 text-green-400" />
                Produtos Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400 mb-4">
                Explore produtos para promover e ganhar comissões
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                data-testid="button-view-products"
              >
                Ver Catálogo
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Notifications */}
        {notifications.length > 0 && (
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificações Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.slice(0, 5).map((notification) => (
                  <div 
                    key={notification.id}
                    className={`p-3 rounded-lg border ${
                      notification.read ? 'border-gray-700 bg-gray-900/50' : 'border-blue-500/30 bg-blue-500/10'
                    }`}
                  >
                    <p className="text-sm text-gray-300">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AffiliateLayout>
  );
}
