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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/80">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img 
                src={supplierLogo} 
                alt="N1 Ecosystem" 
                className="h-6"
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" className="text-slate-300 hover:text-white">
                  Voltar ao Dashboard
                </Button>
              </Link>
              <Link href="/login">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Começar Agora
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center">
          <Badge className="mb-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-300 border-blue-500/30">
            <Star className="h-3 w-3 mr-1" />
            Oportunidade Exclusiva para Produtores
          </Badge>
          
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-8 leading-tight">
            Torne-se um{" "}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Investidor de<br />Produtos
            </span>{" "}
            no Ecossistema N1
          </h1>
          
          <p className="text-xl text-slate-300 mb-12 max-w-4xl mx-auto leading-relaxed">
            Disponibilize seus produtos como produtor e deixe que nossa rede de afiliados e parceiros 
            comercializem em larga escala. <strong className="text-white">Retorno rápido de 2-3 meses</strong> com 
            lucratividade e liquidez garantidas.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
            <Card className="glassmorphism border-slate-600/50">
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Retorno Rápido</h3>
                <p className="text-slate-300">2-3 meses para ver resultados</p>
              </CardContent>
            </Card>
            
            <Card className="glassmorphism border-slate-600/50">
              <CardContent className="p-6 text-center">
                <DollarSign className="h-8 w-8 text-blue-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Alta Lucratividade</h3>
                <p className="text-slate-300">Margens de até 27% sobre custo</p>
              </CardContent>
            </Card>
            
            <Card className="glassmorphism border-slate-600/50">
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 text-purple-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Rede Estabelecida</h3>
                <p className="text-slate-300">Afiliados prontos para vender</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3">
                <Crown className="h-5 w-5 mr-2" />
                Começar Como Investidor
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:text-white hover:border-slate-500">
              Ver Demonstração
            </Button>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <section className="py-16 px-6 border-t border-slate-700/50">
        <div className="container mx-auto">
          <div className="flex justify-center mb-12">
            <div className="flex space-x-1 p-1 bg-slate-800/50 rounded-lg">
              {[
                { id: 'benefits', label: 'Benefícios', icon: CheckCircle },
                { id: 'process', label: 'Como Funciona', icon: Zap },
                { id: 'roi', label: 'ROI & Métricas', icon: BarChart3 }
              ].map(({ id, label, icon: Icon }) => (
                <Button
                  key={id}
                  variant={activeTab === id ? 'default' : 'ghost'}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center space-x-2 px-6 py-3 ${
                    activeTab === id 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="max-w-6xl mx-auto">
            {activeTab === 'benefits' && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <CardContent className="p-6">
                      <benefit.icon className={`h-8 w-8 ${benefit.color} mb-4`} />
                      <h3 className="text-xl font-semibold text-white mb-3">{benefit.title}</h3>
                      <p className="text-slate-300 leading-relaxed">{benefit.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === 'process' && (
              <div className="space-y-8">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-white mb-4">Processo Simples em 4 Etapas</h2>
                  <p className="text-slate-300 text-lg">Do cadastro à primeira venda em menos de uma semana</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                      <CardContent className="p-6">
                        <div className="absolute top-4 right-4">
                          <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30">
                            {process.step}
                          </Badge>
                        </div>
                        
                        <process.icon className="h-8 w-8 text-blue-400 mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-3">{process.title}</h3>
                        <p className="text-slate-300 text-sm leading-relaxed">{process.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'roi' && (
              <div className="space-y-8">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-white mb-4">Potencial de Retorno</h2>
                  <p className="text-slate-300 text-lg">Números reais baseados em dados da plataforma</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* ROI Calculator Example */}
                  <Card className="glassmorphism border-slate-600/50">
                    <CardContent className="p-8">
                      <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                        <Calculator className="h-6 w-6 text-blue-400 mr-2" />
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
      <section className="py-20 px-6 border-t border-slate-700/50 bg-gradient-to-br from-blue-900/20 to-purple-900/20">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Pronto para Escalar sua Produção?
          </h2>
          <p className="text-xl text-slate-300 mb-12 max-w-3xl mx-auto">
            Junte-se ao ecossistema N1 e transforme seus produtos em uma fonte de renda recorrente e escalável. 
            Comece hoje e veja resultados em 2-3 meses.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link href="/login">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg">
                <Crown className="h-5 w-5 mr-2" />
                Começar Como Investidor Agora
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            
            <div className="flex items-center space-x-3 text-slate-300">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>Sem taxas de setup</span>
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>ROI garantido</span>
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>Suporte completo</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-700/50 bg-slate-900/50">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center mb-4">
            <img 
              src={supplierLogo} 
              alt="N1 Ecosystem" 
              className="h-5"
            />
          </div>
          <p className="text-slate-400 text-sm">
            © 2025 N1 Ecosystem. Plataforma de investimento em produtos para mercados europeus.
          </p>
        </div>
      </footer>
    </div>
  );
}