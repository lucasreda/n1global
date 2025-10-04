import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Link2, DollarSign, TrendingUp, Settings, LogOut } from "lucide-react";

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
}

interface AffiliateStats {
  totalClicks: number;
  totalConversions: number;
  pendingCommission: number;
  approvedCommission: number;
  paidCommission: number;
}

export default function AffiliateDashboard() {
  const { user, logout } = useAuth();

  const { data: profile, isLoading: isLoadingProfile } = useQuery<AffiliateProfile>({
    queryKey: ['/api/affiliate/profile'],
    enabled: !!user && user.role === 'affiliate',
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery<AffiliateStats>({
    queryKey: ['/api/affiliate/dashboard/stats'],
    enabled: !!user && user.role === 'affiliate',
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pendente', className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' },
      approved: { label: 'Aprovado', className: 'bg-green-500/20 text-green-500 border-green-500/30' },
      suspended: { label: 'Suspenso', className: 'bg-red-500/20 text-red-500 border-red-500/30' },
      rejected: { label: 'Rejeitado', className: 'bg-gray-500/20 text-gray-500 border-gray-500/30' },
    };
    
    const variant = variants[status] || variants.pending;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="glassmorphism rounded-2xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">Dashboard de Afiliados</h1>
              {profile && getStatusBadge(profile.status)}
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-300">{user?.name}</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-gray-300 hover:text-white"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {profile?.status === 'pending' && (
          <Card className="mb-6 bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="pt-6">
              <p className="text-yellow-500">
                Sua conta está pendente de aprovação. Aguarde a análise da equipe.
              </p>
            </CardContent>
          </Card>
        )}

        {profile?.status === 'suspended' && (
          <Card className="mb-6 bg-red-500/10 border-red-500/30">
            <CardContent className="pt-6">
              <p className="text-red-500">
                Sua conta está suspensa. Entre em contato com o suporte para mais informações.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="glassmorphism border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total de Clicks</CardTitle>
              <Link2 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-total-clicks">
                {isLoadingStats ? '...' : stats?.totalClicks || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Conversões</CardTitle>
              <Users className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-total-conversions">
                {isLoadingStats ? '...' : stats?.totalConversions || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Comissão Pendente</CardTitle>
              <TrendingUp className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-pending-commission">
                {isLoadingStats ? '...' : `€${stats?.pendingCommission?.toFixed(2) || '0.00'}`}
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Comissão Paga</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-paid-commission">
                {isLoadingStats ? '...' : `€${stats?.paidCommission?.toFixed(2) || '0.00'}`}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Information */}
        <Card className="glassmorphism border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Informações do Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile?.fiscalName && (
              <div>
                <div className="text-sm text-gray-400">Nome Fiscal</div>
                <div className="text-white" data-testid="text-fiscal-name">{profile.fiscalName}</div>
              </div>
            )}
            {profile?.fiscalId && (
              <div>
                <div className="text-sm text-gray-400">ID Fiscal</div>
                <div className="text-white" data-testid="text-fiscal-id">{profile.fiscalId}</div>
              </div>
            )}
            {profile?.trackingPixel && (
              <div>
                <div className="text-sm text-gray-400">Pixel de Rastreamento</div>
                <div className="text-white font-mono text-xs break-all" data-testid="text-tracking-pixel">
                  {profile.trackingPixel}
                </div>
              </div>
            )}
            {profile?.landingPageUrl && (
              <div>
                <div className="text-sm text-gray-400">Landing Page</div>
                <a 
                  href={profile.landingPageUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                  data-testid="link-landing-page"
                >
                  {profile.landingPageUrl}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
