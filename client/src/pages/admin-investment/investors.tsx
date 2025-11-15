import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Mail, 
  Building2, 
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AdminInvestmentLayout } from "@/components/admin/admin-investment-layout";

interface InvestorProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  riskTolerance: string | null;
  investmentExperience: string | null;
}

interface InvestorData {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  profile: InvestorProfile | null;
  totalInvested: number;
  currentValue: number;
  totalReturns: number;
  poolCount: number;
  latestTransaction: {
    amount: number;
    type: string;
    createdAt: string;
  } | null;
}

export default function AdminInvestmentInvestors() {
  const { data: investors, isLoading } = useQuery<InvestorData[]>({
    queryKey: ["/api/admin-investment/investors"],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getRiskColor = (riskLevel: string | null) => {
    if (!riskLevel) return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    
    switch (riskLevel) {
      case 'conservative':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'aggressive':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getExperienceColor = (experience: string | null) => {
    if (!experience) return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    
    switch (experience) {
      case 'beginner':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'intermediate':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'experienced':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'investment':
        return 'text-green-400';
      case 'withdrawal':
        return 'text-red-400';
      case 'return':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'investment':
        return <ArrowUpRight className="h-4 w-4" />;
      case 'withdrawal':
        return <ArrowDownRight className="h-4 w-4" />;
      case 'return':
        return <Activity className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <AdminInvestmentLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-white">Carregando investidores...</div>
        </div>
      </AdminInvestmentLayout>
    );
  }

  return (
    <AdminInvestmentLayout>
      <div className="space-y-6" data-testid="investors-page">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Investidores</h1>
            <p className="text-gray-400">Visualize todos os investidores e seus portfólios</p>
          </div>
        </div>

        {/* Investors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {investors?.map((investor) => (
            <Card key={investor.id} style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}} className="relative">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-white mb-2" data-testid={`text-investor-name-${investor.id}`}>
                      {investor.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-400" data-testid={`text-investor-email-${investor.id}`}>
                        {investor.email}
                      </span>
                    </div>
                    <div className="flex gap-2 mb-2">
                      {investor.profile?.riskTolerance && (
                        <Badge className={getRiskColor(investor.profile.riskTolerance)} data-testid={`badge-risk-${investor.id}`}>
                          {investor.profile.riskTolerance === 'conservative' ? 'Conservador' : 
                           investor.profile.riskTolerance === 'medium' ? 'Moderado' : 
                           investor.profile.riskTolerance === 'aggressive' ? 'Agressivo' : 'N/A'}
                        </Badge>
                      )}
                      {investor.profile?.investmentExperience && (
                        <Badge className={getExperienceColor(investor.profile.investmentExperience)} data-testid={`badge-experience-${investor.id}`}>
                          {investor.profile.investmentExperience === 'beginner' ? 'Iniciante' : 
                           investor.profile.investmentExperience === 'intermediate' ? 'Intermediário' : 
                           investor.profile.investmentExperience === 'experienced' ? 'Experiente' : 'N/A'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <p className="text-xs text-gray-400">Total Investido</p>
                    </div>
                    <p className="text-sm font-semibold text-white" data-testid={`text-total-invested-${investor.id}`}>
                      {formatCurrency(investor.totalInvested)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-gray-400" />
                      <p className="text-xs text-gray-400">Valor Atual</p>
                    </div>
                    <p className="text-sm font-semibold text-white" data-testid={`text-current-value-${investor.id}`}>
                      {formatCurrency(investor.currentValue)}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <ArrowUpRight className="h-4 w-4 text-green-400" />
                      <p className="text-xs text-gray-400">Retornos</p>
                    </div>
                    <p className="text-sm font-semibold text-green-400" data-testid={`text-returns-${investor.id}`}>
                      {formatCurrency(investor.totalReturns)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <p className="text-xs text-gray-400">Pools</p>
                    </div>
                    <p className="text-sm font-semibold text-white" data-testid={`text-pool-count-${investor.id}`}>
                      {investor.poolCount}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-700">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <p className="text-xs text-gray-400">Membro desde</p>
                  </div>
                  <p className="text-sm text-white" data-testid={`text-member-since-${investor.id}`}>
                    {formatDate(investor.createdAt)}
                  </p>
                </div>

                {investor.latestTransaction && (
                  <div className="pt-2 border-t border-gray-700">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={getTransactionTypeColor(investor.latestTransaction.type)}>
                        {getTransactionIcon(investor.latestTransaction.type)}
                      </div>
                      <p className="text-xs text-gray-400">Última Transação</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-sm font-semibold ${getTransactionTypeColor(investor.latestTransaction.type)}`} data-testid={`text-last-transaction-${investor.id}`}>
                        {formatCurrency(investor.latestTransaction.amount)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(investor.latestTransaction.createdAt)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {investors?.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Nenhum investidor encontrado</h3>
            <p className="text-gray-400">
              Quando houver investidores cadastrados, eles aparecerão aqui.
            </p>
          </div>
        )}
      </div>
    </AdminInvestmentLayout>
  );
}