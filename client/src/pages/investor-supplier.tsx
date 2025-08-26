import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Users, 
  Package, 
  Calculator,
  ArrowRight,
  CheckCircle,
  DollarSign,
  BarChart3,
  Zap,
  Shield,
  Target,
  Clock,
  Crown,
  Star,
  Globe,
  PieChart
} from "lucide-react";
import supplierLogo from "@assets/SUPPLIER_1756234627506.png";

export default function InvestorSupplierLanding() {
  const [activeTab, setActiveTab] = useState<'benefits' | 'process' | 'roi'>('benefits');

  return (
    <div className="min-h-screen relative">
      {/* Dark Background similar to login page */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/20 to-background"></div>
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-chart-1/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-chart-2/10 rounded-full blur-3xl"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
      {/* Header */}
      <header className="border-b border-slate-700/30 backdrop-blur-sm bg-transparent">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img 
                src={supplierLogo} 
                alt="N1 Ecosystem" 
                className="h-5 sm:h-6"
              />
            </div>
            
            <div className="flex items-center">
              <Link href="/login">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm px-3 sm:px-4">
                  Começar Agora
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="container mx-auto text-center">
          <Badge className="mb-4 sm:mb-6 bg-transparent text-yellow-400 border-yellow-400/30 text-xs sm:text-sm">
            <Star className="h-3 w-3 mr-1 text-yellow-400" />
            Oportunidade Exclusiva para Produtores
          </Badge>
          
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-6 sm:mb-8 leading-tight px-2">
            Torne-se um{" "}
            <span className="bg-gradient-to-r from-blue-400 to-teal-200 bg-clip-text text-transparent">
              Investidor de<br />Produtos
            </span>{" "}
            no Ecossistema N1
          </h1>
          
          <p className="text-base sm:text-xl text-slate-300 mb-8 sm:mb-12 max-w-4xl mx-auto leading-relaxed px-2">
            Transforme seus produtos em <strong className="text-white">receita recorrente</strong> enquanto nossa 
            rede de afiliados especializados comercializa para você. 
            Foque apenas na <strong className="text-white">produção ou importação</strong> e deixe as vendas conosco. 
            Resultados consistentes com total transparência.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12 max-w-4xl mx-auto px-2">
            <Card className="glassmorphism border-slate-600/50">
              <CardContent className="p-4 sm:p-6 text-center">
                <TrendingUp className="h-6 sm:h-8 w-6 sm:w-8 text-green-400 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Retorno Rápido</h3>
                <p className="text-slate-300 text-sm sm:text-base">2-3 meses para ver resultados</p>
              </CardContent>
            </Card>
            
            <Card className="glassmorphism border-slate-600/50">
              <CardContent className="p-4 sm:p-6 text-center">
                <DollarSign className="h-6 sm:h-8 w-6 sm:w-8 text-blue-400 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Alta Lucratividade</h3>
                <p className="text-slate-300 text-sm sm:text-base">Margens de até 27% sobre custo</p>
              </CardContent>
            </Card>
            
            <Card className="glassmorphism border-slate-600/50 sm:col-span-2 md:col-span-1">
              <CardContent className="p-4 sm:p-6 text-center">
                <Users className="h-6 sm:h-8 w-6 sm:w-8 text-purple-400 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Rede Estabelecida</h3>
                <p className="text-slate-300 text-sm sm:text-base">Afiliados prontos para vender</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2">
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 hover:from-blue-700 hover:via-blue-600 hover:to-cyan-500 text-white px-6 sm:px-8 py-3 w-full sm:w-auto text-sm sm:text-base">
                <Crown className="h-4 sm:h-5 w-4 sm:w-5 mr-2" />
                Começar Como Investidor
                <ArrowRight className="h-4 sm:h-5 w-4 sm:w-5 ml-2" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 w-full sm:w-auto text-sm sm:text-base">
              Ver Demonstração
            </Button>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 border-t border-slate-700/50">
        <div className="container mx-auto">
          <div className="flex justify-center mb-8 sm:mb-12">
            <div className="flex space-x-1 p-1 bg-slate-800/50 rounded-lg w-full max-w-md sm:w-auto">
              {[
                { id: 'benefits', label: 'Benefícios', icon: CheckCircle },
                { id: 'process', label: 'Como Funciona', icon: Zap },
                { id: 'roi', label: 'ROI & Métricas', icon: BarChart3 }
              ].map(({ id, label, icon: Icon }) => (
                <Button
                  key={id}
                  variant={activeTab === id ? 'default' : 'ghost'}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex flex-col items-center justify-center px-2 sm:px-6 py-3 sm:py-3 text-xs sm:text-base flex-1 sm:flex-none min-h-[60px] sm:min-h-auto ${
                    activeTab === id 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="h-4 w-4 mb-1 sm:mb-0 sm:mr-2" />
                  <span className="text-xs sm:text-base sm:inline">{label.split(' ')[0]}</span>
                  <span className="hidden lg:inline">{label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="max-w-6xl mx-auto px-2 sm:px-0">
            {activeTab === 'benefits' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[
                  {
                    icon: Shield,
                    title: "Risco Controlado",
                    description: "Sistema de validação de produtos e monitoramento de performance em tempo real",
                    color: "text-green-400"
                  },
                  {
                    icon: Globe,
                    title: "Alcance Global",
                    description: "Sua produção alcança mercados europeus através de nossa rede estabelecida",
                    color: "text-blue-400"
                  },
                  {
                    icon: Calculator,
                    title: "Calculadora de Lucro",
                    description: "Ferramenta integrada para análise de rentabilidade e precificação inteligente",
                    color: "text-purple-400"
                  },
                  {
                    icon: Target,
                    title: "Vendas Direcionadas",
                    description: "Afiliados especializados comercializam seus produtos no nicho certo",
                    color: "text-orange-400"
                  },
                  {
                    icon: PieChart,
                    title: "Transparência Total",
                    description: "Dashboard completo com métricas de vendas, lucros e performance",
                    color: "text-cyan-400"
                  },
                  {
                    icon: Clock,
                    title: "Liquidez Rápida",
                    description: "Transforme seu estoque em receita recorrente em questão de semanas",
                    color: "text-yellow-400"
                  }
                ].map((benefit, index) => (
                  <Card key={index} className="glassmorphism border-slate-600/50 hover:border-slate-500/50 transition-all">
                    <CardContent className="p-4 sm:p-6">
                      <benefit.icon className={`h-6 sm:h-8 w-6 sm:w-8 ${benefit.color} mb-3 sm:mb-4`} />
                      <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">{benefit.title}</h3>
                      <p className="text-slate-300 text-sm sm:text-base leading-relaxed">{benefit.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === 'process' && (
              <div className="space-y-6 sm:space-y-8">
                <div className="text-center mb-8 sm:mb-12">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4 px-2">Processo Simples em 4 Etapas</h2>
                  <p className="text-slate-300 text-base sm:text-lg px-2">Do cadastro à primeira venda em menos de uma semana</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {[
                    {
                      step: "01",
                      title: "Cadastro de Produto",
                      description: "Upload de imagens, descrições e definição de custos usando nossa calculadora integrada",
                      icon: Package
                    },
                    {
                      step: "02", 
                      title: "Precificação Inteligente",
                      description: "Sistema sugere preços baseado em margem de 20%, com limite máximo de 27% sobre custo",
                      icon: Calculator
                    },
                    {
                      step: "03",
                      title: "Distribuição na Rede",
                      description: "Produto disponibilizado automaticamente para nossa rede de afiliados e operações",
                      icon: Users
                    },
                    {
                      step: "04",
                      title: "Monitoramento e Lucro",
                      description: "Acompanhe vendas em tempo real e receba pelos produtos comercializados",
                      icon: BarChart3
                    }
                  ].map((process, index) => (
                    <Card key={index} className="glassmorphism border-slate-600/50 relative overflow-hidden">
                      <CardContent className="p-4 sm:p-6">
                        <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                          <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 text-xs sm:text-sm">
                            {process.step}
                          </Badge>
                        </div>
                        
                        <process.icon className="h-6 sm:h-8 w-6 sm:w-8 text-blue-400 mb-3 sm:mb-4" />
                        <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">{process.title}</h3>
                        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">{process.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'roi' && (
              <div className="space-y-6 sm:space-y-8">
                <div className="text-center mb-8 sm:mb-12">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4 px-2">Potencial de Retorno</h2>
                  <p className="text-slate-300 text-base sm:text-lg px-2">Números reais baseados em dados da plataforma</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                  {/* ROI Calculator Example */}
                  <Card className="glassmorphism border-slate-600/50">
                    <CardContent className="p-4 sm:p-8">
                      <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center">
                        <Calculator className="h-5 sm:h-6 w-5 sm:w-6 text-blue-400 mr-2" />
                        Exemplo de ROI
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-slate-700/50">
                          <span className="text-slate-300">Custo de Produção</span>
                          <span className="text-white font-semibold">€50.00</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-slate-700/50">
                          <span className="text-slate-300">Preço de Venda B2B</span>
                          <span className="text-white font-semibold">€63.50</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-slate-700/50">
                          <span className="text-slate-300">Lucro por Unidade</span>
                          <span className="text-green-400 font-semibold">€13.50 (27%)</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-slate-700/50">
                          <span className="text-slate-300">Estoque Inicial</span>
                          <span className="text-white font-semibold">1.000 unidades</span>
                        </div>
                        <div className="flex justify-between items-center py-3 bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-lg px-4">
                          <span className="text-emerald-300 font-medium">Potencial de Lucro Total</span>
                          <span className="text-emerald-400 font-bold text-xl">€13.500</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Performance Metrics */}
                  <Card className="glassmorphism border-slate-600/50">
                    <CardContent className="p-8">
                      <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                        <BarChart3 className="h-6 w-6 text-purple-400 mr-2" />
                        Métricas da Plataforma
                      </h3>
                      
                      <div className="space-y-6">
                        <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                          <div className="text-3xl font-bold text-blue-400 mb-1">2.448</div>
                          <div className="text-slate-300 text-sm">Pedidos Processados (30 dias)</div>
                        </div>
                        
                        <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                          <div className="text-3xl font-bold text-green-400 mb-1">89.2%</div>
                          <div className="text-slate-300 text-sm">Taxa de Entrega</div>
                        </div>
                        
                        <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                          <div className="text-3xl font-bold text-purple-400 mb-1">67 dias</div>
                          <div className="text-slate-300 text-sm">Tempo Médio para Primeira Venda</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Profit Timeline */}
                <Card className="glassmorphism border-slate-600/50">
                  <CardContent className="p-8">
                    <h3 className="text-2xl font-bold text-white mb-6 text-center">
                      Timeline de Retorno do Investimento
                    </h3>
                    
                    <div className="grid md:grid-cols-4 gap-4">
                      {[
                        { month: "Mês 1", percentage: "25%", description: "Primeiras vendas" },
                        { month: "Mês 2", percentage: "65%", description: "Aceleração das vendas" },
                        { month: "Mês 3", percentage: "100%", description: "ROI completo" },
                        { month: "Mês 4+", percentage: "120%+", description: "Lucro líquido" }
                      ].map((timeline, index) => (
                        <div key={index} className="text-center p-4 bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-400 mb-2">{timeline.month}</div>
                          <div className="text-3xl font-bold text-green-400 mb-2">{timeline.percentage}</div>
                          <div className="text-slate-300 text-sm">{timeline.description}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 border-t border-slate-700/50 bg-gradient-to-br from-blue-900/20 to-purple-900/20">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 sm:mb-6 px-2">
            Pronto para Escalar sua Produção?
          </h2>
          <p className="text-base sm:text-xl text-slate-300 mb-8 sm:mb-12 max-w-3xl mx-auto px-2">
            Junte-se ao ecossistema N1 e transforme seus produtos em uma fonte de renda recorrente e escalável. 
            Comece hoje e veja resultados em 2-3 meses.
          </p>

          <div className="flex flex-col gap-4 sm:gap-6 justify-center items-center">
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 hover:from-blue-700 hover:via-blue-600 hover:to-cyan-500 text-white px-6 sm:px-8 py-4 text-base sm:text-lg w-full sm:w-auto">
                <Crown className="h-4 sm:h-5 w-4 sm:w-5 mr-2" />
                Começar Como Investidor Agora
                <ArrowRight className="h-4 sm:h-5 w-4 sm:w-5 ml-2" />
              </Button>
            </Link>
            
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-slate-300 text-sm sm:text-base">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 sm:h-5 w-4 sm:w-5 text-green-400" />
                <span>Sem taxas de setup</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 sm:h-5 w-4 sm:w-5 text-green-400" />
                <span>ROI garantido</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 sm:h-5 w-4 sm:w-5 text-green-400" />
                <span>Suporte completo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-8 px-4 sm:px-6 border-t border-slate-700/50 bg-slate-900/50">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <img 
              src={supplierLogo} 
              alt="N1 Ecosystem" 
              className="h-4 sm:h-5"
            />
          </div>
          <p className="text-slate-400 text-xs sm:text-sm px-2">
            © 2025 N1 Ecosystem. Plataforma de investimento em produtos para mercados europeus.
          </p>
        </div>
      </footer>
      </div>
    </div>
  );
}