import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  UserCheck,
  ShoppingCart,
  Wallet,
} from "lucide-react";

interface AdminStats {
  totalAffiliates: number;
  activeAffiliates: number;
  pendingAffiliates: number;
  totalConversions: number;
  pendingConversions: number;
  approvedConversions: number;
  totalCommissions: number;
  pendingCommissions: number;
  monthConversions: number;
}

export default function AffiliatesHub() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ['/api/affiliate/admin/stats'],
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="page-title">Hub de Afiliados</h1>
        <p className="text-gray-400">Gerencie todo o programa de afiliados</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Affiliates */}
        <Card className="bg-[#1a1a1a] border-[#252525]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total de Afiliados</p>
                <p className="text-3xl font-bold" data-testid="stat-total-affiliates">
                  {isLoading ? "..." : stats?.totalAffiliates || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Affiliates */}
        <Card className="bg-[#1a1a1a] border-[#252525]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Ativos</p>
                <p className="text-3xl font-bold" data-testid="stat-active-affiliates">
                  {isLoading ? "..." : stats?.activeAffiliates || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Approval */}
        <Card className="bg-[#1a1a1a] border-[#252525]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Pendentes</p>
                <p className="text-3xl font-bold text-yellow-500" data-testid="stat-pending-affiliates">
                  {isLoading ? "..." : stats?.pendingAffiliates || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Month Conversions */}
        <Card className="bg-[#1a1a1a] border-[#252525]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Conversões (Mês)</p>
                <p className="text-3xl font-bold" data-testid="stat-month-conversions">
                  {isLoading ? "..." : stats?.monthConversions || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-700/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Comissões Totais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-500" data-testid="stat-total-commissions">
              €{isLoading ? "..." : (stats?.totalCommissions || 0).toFixed(2)}
            </p>
            <p className="text-sm text-gray-400 mt-1">Aprovadas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 border-yellow-700/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Comissões Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-500" data-testid="stat-pending-commissions">
              €{isLoading ? "..." : (stats?.pendingCommissions || 0).toFixed(2)}
            </p>
            <p className="text-sm text-gray-400 mt-1">Aguardando aprovação</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-700/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              Conversões Aprovadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-500" data-testid="stat-approved-conversions">
              {isLoading ? "..." : stats?.approvedConversions || 0}
            </p>
            <p className="text-sm text-gray-400 mt-1">Total aprovado</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/inside/affiliates/manage">
          <Card className="bg-[#1a1a1a] border-[#252525] hover:border-blue-500/50 transition-all cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold mb-1">Gerenciar Afiliados</p>
                  <p className="text-sm text-gray-400">Ver todos os afiliados</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/inside/affiliates/conversions">
          <Card className="bg-[#1a1a1a] border-[#252525] hover:border-yellow-500/50 transition-all cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold mb-1">Conversões</p>
                  <p className="text-sm text-gray-400">
                    {stats?.pendingConversions || 0} pendentes
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-yellow-500 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/inside/affiliates/commission-rules">
          <Card className="bg-[#1a1a1a] border-[#252525] hover:border-green-500/50 transition-all cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold mb-1">Regras de Comissão</p>
                  <p className="text-sm text-gray-400">Configurar comissões</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-500 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/inside/affiliates/landing-pages">
          <Card className="bg-[#1a1a1a] border-[#252525] hover:border-purple-500/50 transition-all cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold mb-1">Landing Pages</p>
                  <p className="text-sm text-gray-400">Gerenciar páginas</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Pending Actions Alert */}
      {!isLoading && (stats?.pendingAffiliates || 0) > 0 && (
        <Card className="mt-8 bg-yellow-900/20 border-yellow-700/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <AlertCircle className="h-8 w-8 text-yellow-500" />
              <div className="flex-1">
                <p className="font-semibold text-yellow-500">Ações Pendentes</p>
                <p className="text-sm text-gray-300">
                  Você tem {stats?.pendingAffiliates} afiliados aguardando aprovação
                </p>
              </div>
              <Link href="/inside/affiliates/manage?status=pending">
                <Button variant="outline" className="border-yellow-500 text-yellow-500 hover:bg-yellow-500/10">
                  Ver Afiliados Pendentes
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
