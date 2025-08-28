import { useState } from "react";
import { InvestmentLayout } from "@/components/investment/investment-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  PiggyBank,
  Plus,
  TrendingUp,
  Calculator,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface InvestmentOpportunity {
  id: string;
  name: string;
  description: string;
  minInvestment: number;
  monthlyReturn: number;
  yearlyReturn: number;
  riskLevel: string;
  totalValue: number;
  remainingSlots: number;
  strategy: string;
}

interface PortfolioDistribution {
  poolName: string;
  allocation: number;
  value: number;
  returnRate: number;
  riskLevel: string;
}

export default function InvestmentsPage() {
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [investOpen, setInvestOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState<InvestmentOpportunity | null>(null);
  const [simulatorParams, setSimulatorParams] = useState({
    initialAmount: 5000,
    monthlyContribution: 500,
    months: 12
  });

  const { data: opportunities, isLoading: opportunitiesLoading } = useQuery<InvestmentOpportunity[]>({
    queryKey: ["/api/investment/opportunities"],
  });

  const { data: portfolio, isLoading: portfolioLoading } = useQuery<PortfolioDistribution[]>({
    queryKey: ["/api/investment/portfolio"],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate).toFixed(2)}%`;
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      case 'medium':
        return <Clock className="h-4 w-4" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  // Simulador de rentabilidade
  const calculateSimulation = () => {
    const monthlyReturn = 2.5; // 2.5% ao mês
    let currentValue = simulatorParams.initialAmount;
    let totalInvested = simulatorParams.initialAmount;

    for (let i = 1; i <= simulatorParams.months; i++) {
      currentValue *= (1 + monthlyReturn / 100);
      totalInvested += simulatorParams.monthlyContribution;
      currentValue += simulatorParams.monthlyContribution;
    }

    const totalReturns = currentValue - totalInvested;
    const returnRate = (totalReturns / totalInvested) * 100;

    return {
      finalValue: currentValue,
      totalInvested,
      totalReturns,
      returnRate
    };
  };

  const simulation = calculateSimulation();

  return (
    <InvestmentLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="font-bold tracking-tight text-gray-900 dark:text-gray-100" style={{ fontSize: '22px' }}>
              Meus Investimentos
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie seus investimentos e explore novas oportunidades
            </p>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={simulatorOpen} onOpenChange={setSimulatorOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Calculator className="h-4 w-4" />
                  Simulador
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md" style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
                <DialogHeader>
                  <DialogTitle className="text-white">Simulador de Rentabilidade</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Simule o crescimento do seu investimento ao longo do tempo
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="initial" className="text-gray-300">Investimento Inicial</Label>
                    <Input
                      id="initial"
                      type="number"
                      value={simulatorParams.initialAmount}
                      onChange={(e) => setSimulatorParams(prev => ({
                        ...prev,
                        initialAmount: Number(e.target.value)
                      }))}
                      className="bg-[#252525] border-[#404040] text-white"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="monthly" className="text-gray-300">Aporte Mensal</Label>
                    <Input
                      id="monthly"
                      type="number"
                      value={simulatorParams.monthlyContribution}
                      onChange={(e) => setSimulatorParams(prev => ({
                        ...prev,
                        monthlyContribution: Number(e.target.value)
                      }))}
                      className="bg-[#252525] border-[#404040] text-white"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="months" className="text-gray-300">Período (meses)</Label>
                    <Input
                      id="months"
                      type="number"
                      value={simulatorParams.months}
                      onChange={(e) => setSimulatorParams(prev => ({
                        ...prev,
                        months: Number(e.target.value)
                      }))}
                      className="bg-[#252525] border-[#404040] text-white"
                    />
                  </div>
                  
                  <div className="border-t border-[#252525] pt-4">
                    <h4 className="font-medium text-white mb-2">Projeção</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-400">Total Investido</p>
                        <p className="text-blue-400 font-medium">{formatCurrency(simulation.totalInvested)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Valor Final</p>
                        <p className="text-green-400 font-medium">{formatCurrency(simulation.finalValue)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Rendimento</p>
                        <p className="text-purple-400 font-medium">{formatCurrency(simulation.totalReturns)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Rentabilidade</p>
                        <p className="text-yellow-400 font-medium">{formatPercentage(simulation.returnRate)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button onClick={() => setSimulatorOpen(false)} className="bg-blue-600 hover:bg-blue-700">
                    Fechar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Novo Investimento
            </Button>
          </div>
        </div>

        {/* Portfolio Distribution */}
        {!portfolioLoading && portfolio && portfolio.length > 0 && (
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader>
              <CardTitle className="text-white" style={{ fontSize: '20px' }}>
                Distribuição do Portfolio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {portfolio.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-700 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <PiggyBank className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">{item.poolName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getRiskColor(item.riskLevel)}>
                            {getRiskIcon(item.riskLevel)}
                            Risco {item.riskLevel}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">{formatCurrency(item.value)}</div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">{formatPercentage(item.allocation)}%</span>
                        <span className={`${item.returnRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatPercentage(item.returnRate)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Investment Opportunities */}
        <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader>
            <CardTitle className="text-white" style={{ fontSize: '20px' }}>
              Oportunidades de Investimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {opportunitiesLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse border border-gray-700 rounded-lg p-4">
                    <div className="h-6 bg-gray-700 rounded w-1/3 mb-2"></div>
                    <div className="h-4 bg-gray-800 rounded w-2/3 mb-4"></div>
                    <div className="flex gap-4">
                      <div className="h-4 bg-gray-800 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-800 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-800 rounded w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : opportunities && opportunities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {opportunities.map((opportunity) => (
                  <div key={opportunity.id} className="border border-gray-700 rounded-lg p-6 hover:border-blue-500 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-white">{opportunity.name}</h3>
                      <Badge className={getRiskColor(opportunity.riskLevel)}>
                        {getRiskIcon(opportunity.riskLevel)}
                        {opportunity.riskLevel}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {opportunity.description}
                    </p>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Investimento Mínimo</span>
                        <span className="text-white font-medium">{formatCurrency(opportunity.minInvestment)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400">Retorno Mensal</span>
                        <span className="text-green-400 font-medium">{formatPercentage(opportunity.monthlyReturn)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400">Retorno Anual</span>
                        <span className="text-blue-400 font-medium">{formatPercentage(opportunity.yearlyReturn)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400">Vagas Restantes</span>
                        <span className="text-yellow-400 font-medium">{opportunity.remainingSlots}</span>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        setSelectedPool(opportunity);
                        setInvestOpen(true);
                      }}
                      disabled={opportunity.remainingSlots === 0}
                    >
                      {opportunity.remainingSlots === 0 ? 'Esgotado' : 'Investir Agora'}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">Nenhuma oportunidade disponível no momento</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </InvestmentLayout>
  );
}