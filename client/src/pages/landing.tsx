import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight, Calendar, Zap, Shield, Globe, Pill, Package2, Users, TrendingUp, Building, Scale, FileCheck, Phone, Mail, Sparkles, X, LogIn, MapPin, Clock, Award } from "lucide-react";
import cartLogo from "@assets/cart-logo_1757013744084.png";
import digistoreLogo from "@assets/digistore-logo_1757013744090.png";
import openLogo from "@assets/open-logo_1757013744090.png";
import shopifyLogo from "@assets/shopify-logo_1757013744091.png";
import logoPath from "@assets/logo_1756142152045.png";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [logoVisible, setLogoVisible] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  const fullText = "Venda seus produtos físicos na Europa\nsem burocracia";

  useEffect(() => {
    // Start logo animation after component mounts
    const timer = setTimeout(() => {
      setLogoVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Typewriting effect
  useEffect(() => {
    setDisplayedText("");
    setShowCursor(true);
    let currentIndex = 0;
    
    const typewriterInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typewriterInterval);
        // Hide cursor after a small delay
        setTimeout(() => {
          setShowCursor(false);
        }, 500);
      }
    }, 80); // Typing speed (80ms per character)

    return () => clearInterval(typewriterInterval);
  }, [fullText]);

  // Helper function to get the word at a specific position
  const getWordAtPosition = (text: string, position: number) => {
    // Find word boundaries around the position
    let start = position;
    let end = position;
    
    // Go back to find start of word
    while (start > 0 && text[start - 1] !== ' ' && text[start - 1] !== '\n') {
      start--;
    }
    
    // Go forward to find end of word
    while (end < text.length && text[end] !== ' ' && text[end] !== '\n') {
      end++;
    }
    
    return text.slice(start, end).trim();
  };

  const handleLoginClick = () => {
    setLocation('/login');
  };

  const handleScheduleMeeting = () => {
    const ctaSection = document.getElementById('cta-section');
    if (ctaSection) {
      ctaSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const solutions = [
    {
      icon: Building,
      title: "Estrutura Fiscal Completa",
      description: "Gestão fiscal e jurídica em todos os países europeus. Você não precisa abrir empresa ou lidar com papelada."
    },
    {
      icon: FileCheck,
      title: "Conformidade Regulatória",
      description: "Expertise em regulamentações para nutracêuticos e produtos físicos diversos. Todas as aprovações necessárias."
    },
    {
      icon: Globe,
      title: "Operação Pan-Europeia",
      description: "Acesso direto a 28 países europeus com uma única estrutura. Logística, vendas e suporte unificados."
    },
    {
      icon: Zap,
      title: "Zero Burocracia",
      description: "Nossa equipe cuida de toda complexidade operacional. Você foca exclusivamente no seu produto e marketing."
    },
    {
      icon: Scale,
      title: "Escalabilidade Instantânea",
      description: "Infraestrutura pronta para crescimento exponencial. De 100 a 100.000 pedidos sem fricção operacional."
    },
    {
      icon: Shield,
      title: "Gestão de Riscos",
      description: "Proteção total contra riscos fiscais, regulatórios e operacionais. Compliance garantido em todos os mercados."
    }
  ];

  const stats = [
    { number: "28", label: "países europeus", sublabel: "cobertura completa" },
    { number: "€50M+", label: "processados", sublabel: "em vendas anuais" },
    { number: "500+", label: "produtos ativos", sublabel: "diversos segmentos" },
    { number: "99.8%", label: "compliance", sublabel: "aprovação regulatória" }
  ];

  const faqItems = [
    {
      question: "A N1 trabalha com que tipos de produtos?",
      answer: "Especializamos em produtos físicos diversos e nutracêuticos. Nossa expertise regulatória cobre desde suplementos alimentares até produtos de consumo geral, sempre garantindo compliance total."
    },
    {
      question: "Como vocês lidam com regulamentações de nutracêuticos?",
      answer: "Temos especialistas dedicados em regulamentações europeias para nutracêuticos. Cuidamos de todas as aprovações necessárias, registros sanitários e conformidade com as normas de cada país."
    },
    {
      question: "Preciso me preocupar com questões fiscais na Europa?",
      answer: "Absolutamente não. Nossa estrutura fiscal está estabelecida em todos os países onde operamos. Você vende do Brasil e nós cuidamos de toda gestão fiscal, jurídica e compliance europeu."
    },
    {
      question: "Qual o tempo para começar a vender na Europa?",
      answer: "Entre 7 a 14 dias após a análise dos seus produtos. Para nutracêuticos, pode levar até 30 dias devido às aprovações regulatórias específicas. Todo processo é gerenciado pela nossa equipe."
    }
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Background gradient and blur effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/20 to-background"></div>
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-chart-1/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-chart-2/20 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative z-10">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <img 
              src={logoPath} 
              alt="N1 Global" 
              className={`h-8 w-auto transition-all duration-700 ease-out ${
                logoVisible 
                  ? 'translate-y-0 opacity-100' 
                  : '-translate-y-12 opacity-0'
              }`} 
            />
            <Button 
              onClick={handleLoginClick}
              variant="outline"
              className="border-border/50 text-foreground hover:bg-background/80 px-4 sm:px-6 py-2 text-sm sm:text-base rounded-xl transition-all duration-200"
              data-testid="button-login-header"
            >
              <LogIn className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Entrar</span>
              <span className="sm:hidden">Entrar</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-screen sm:py-20 lg:py-32 flex items-center">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center max-w-4xl mx-auto -translate-y-5 sm:translate-y-0">
              <h1 className="text-[28px] sm:text-4xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight mb-6 sm:mb-8 min-h-[120px] sm:min-h-[200px] xl:min-h-[240px] px-2">
                <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                  Venda
                </span>
                {" "}seus produtos físicos na Europa<br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                  {" "}sem burocracia
                </span>
                {showCursor && <span className="animate-pulse text-blue-500">|</span>}
              </h1>
              <p className="text-base sm:text-xl lg:text-2xl text-muted-foreground leading-relaxed mb-8 sm:mb-12 max-w-4xl mx-auto px-4">
                Estrutura completa para <strong className="text-foreground">produtos físicos diversos e nutracêuticos</strong>. 
                Fiscal, jurídico, regulatório e logística — tudo resolvido para você focar no que importa: <strong className="text-foreground">suas vendas</strong>.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
                <Button 
                  size="lg"
                  onClick={handleScheduleMeeting}
                  className="bg-primary hover:bg-primary/90 text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-xl transition-all duration-200 hover:scale-105 shadow-lg w-full sm:w-auto"
                  data-testid="button-cta-hero"
                >
                  Agendar Reunião <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-border/50 text-foreground hover:bg-background/80 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-xl transition-all duration-200 w-full sm:w-auto"
                  data-testid="button-learn-more"
                >
                  Saiba Mais
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 sm:py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="mb-10 sm:mb-16 text-center">
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto px-4">Infraestrutura consolidada e resultados comprovados no mercado europeu</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {stats.map((stat, index) => (
                <Card key={index} className="glassmorphism border-border/30 text-center group hover:border-primary/50 transition-all duration-300">
                  <CardContent className="p-4 sm:p-6 lg:p-8">
                    <div className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent mb-2 sm:mb-3">
                      {stat.number}
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-foreground mb-1">{stat.label}</div>
                    <div className="text-xs text-muted-foreground">{stat.sublabel}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Integrations Section */}
        <section className="py-12 sm:py-16 bg-gradient-to-b from-background to-primary/5">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center">
              <p className="text-sm sm:text-base text-muted-foreground mb-8 sm:mb-12 px-4">Integrações com as principais plataformas</p>
              <div className="grid grid-cols-2 gap-8 justify-items-center max-w-xs mx-auto sm:flex sm:justify-center sm:items-center sm:gap-8 lg:gap-12 xl:gap-16 px-4">
                <img 
                  src={cartLogo} 
                  alt="CartPanda" 
                  className="h-6 sm:h-5 lg:h-7"
                />
                <img 
                  src={digistoreLogo} 
                  alt="Digistore24" 
                  className="h-6 sm:h-5 lg:h-7"
                />
                <img 
                  src={openLogo} 
                  alt="OpenAI" 
                  className="h-6 sm:h-5 lg:h-7"
                />
                <img 
                  src={shopifyLogo} 
                  alt="Shopify" 
                  className="h-6 sm:h-5 lg:h-7"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className="py-12 sm:py-20 bg-gradient-to-b from-primary/5 to-secondary/5">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-5xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-foreground mb-6 sm:mb-8 mt-5 px-2">
                Vender na Europa deveria ser simples...
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-12 sm:mb-16 px-4">
                Mas você sabe quantas <strong className="text-foreground">barreiras complexas</strong> existem
              </p>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 text-left mb-8 sm:mb-12 px-2">
                {[
                  {
                    title: "Complexidade Regulatória",
                    desc: "Especialmente para nutracêuticos: registros sanitários, conformidade com EFSA, rotulagem específica por país"
                  },
                  {
                    title: "Estrutura Fiscal Fragmentada",
                    desc: "28 países, 28 sistemas fiscais diferentes. VAT, EORI, representação fiscal obrigatória"
                  },
                  {
                    title: "Logística Internacional",
                    desc: "Alfândega, armazenagem local, gestão de devoluções, prazos longos e custos imprevisíveis"
                  },
                  {
                    title: "Conformidade Legal",
                    desc: "GDPR, direitos do consumidor, políticas de reembolso locais, termos de uso específicos"
                  },
                  {
                    title: "Suporte Multilíngue",
                    desc: "Atendimento em 28+ idiomas, conhecimento local, gestão de fusos horários diferentes"
                  },
                  {
                    title: "Risco Operacional",
                    desc: "Zero previsibilidade, cash flow instável, exposição a mudanças regulatórias"
                  }
                ].map((problem, index) => (
                  <Card key={index} className="glassmorphism border-destructive/20 hover:border-destructive/40 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-destructive rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-2">{problem.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{problem.desc}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div 
                className="bg-red-900/20 border border-red-400/50 hover:bg-red-900/30 backdrop-blur-sm rounded-lg p-6 sm:p-8 transition-all duration-300 max-w-3xl mx-auto"
                style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
              >
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">
                  O resultado? Meses de planejamento, milhares em consultoria e risco de não conformidade.
                </h3>
                <p className="text-red-300 leading-relaxed">
                  <strong className="text-white">95% das empresas brasileiras</strong> que tentam entrar na Europa por conta própria 
                  abandonam o projeto ou operam fora da conformidade legal — expondo-se a multas de até €20 milhões.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Solution Section */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6">
                A{" "}
                <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                  N1 Global
                </span>
                {" "}oferece estrutura completa
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                <strong className="text-foreground">Especialistas em produtos físicos e nutracêuticos</strong>. 
                Você vende do Brasil, nós operamos toda a Europa.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {solutions.map((solution, index) => {
                const IconComponent = solution.icon;
                return (
                  <Card key={index} className="glassmorphism border-border/30 hover:border-primary/50 transition-all duration-500 group">
                    <CardContent className="p-8">
                      <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-chart-2/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <IconComponent className="h-7 w-7 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-4">{solution.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{solution.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Key Differentiators */}
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-foreground mb-3 mt-20">Por que escolher a N1?</h3>
                <p className="text-muted-foreground">Somos os únicos com essa expertise específica no mercado</p>
              </div>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <Pill className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h4 className="font-semibold text-foreground mb-2">Expertise em Nutracêuticos</h4>
                  <p className="text-sm text-muted-foreground">Únicos com aprovação regulatória para 500+ produtos</p>
                </div>
                <div>
                  <TrendingUp className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h4 className="font-semibold text-foreground mb-2">Crescimento Sem Limite</h4>
                  <p className="text-sm text-muted-foreground">Infraestrutura para escalar de 0 a €10M+ sem fricção</p>
                </div>
                <div>
                  <Users className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h4 className="font-semibold text-foreground mb-2">Time Especializado</h4>
                  <p className="text-sm text-muted-foreground">Regulatório, fiscal e jurídico dedicado ao seu sucesso</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="cta-section" className="py-12 sm:py-20 bg-gradient-to-b from-background to-primary/5">
          <div className="container mx-auto px-4 sm:px-6">
            <Card className="glassmorphism border-primary/40 max-w-5xl mx-auto relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/10 to-chart-2/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-chart-1/10 to-primary/10 rounded-full blur-3xl"></div>
              
              <CardContent className="p-12 relative z-10">
                <div className="text-center mb-12">
                  <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
                    Comece a vender na Europa
                    <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent"> sem burocracia</span>
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                    <strong className="text-foreground">Sessão estratégica 100% gratuita</strong> com nossos especialistas. 
                    Saia da reunião com um roadmap completo para o mercado europeu.
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6 mb-10">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground mb-3">O que você recebe:</h3>
                    {[
                      "Análise de viabilidade para seus produtos",
                      "Estratégia regulatória personalizada",
                      "Roadmap de entrada no mercado europeu"
                    ].map((item, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground mb-3">Especialistas dedicados:</h3>
                    {[
                      "Estrutura fiscal e operacional sob medida",
                      "Timeline realista e próximos passos",
                      "Sem compromisso e sem enrolação"
                    ].map((item, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="text-center">
                  <Button 
                    size="lg"
                    onClick={handleLoginClick}
                    className="bg-gradient-to-r from-primary to-chart-2 hover:from-primary/90 hover:to-chart-2/90 text-white px-10 py-4 text-lg rounded-xl transition-all duration-300 hover:scale-105 shadow-xl"
                    data-testid="button-cta-schedule"
                  >
                    Escolha um horário <Calendar className="ml-3 h-5 w-5" />
                  </Button>
                  <p className="text-sm text-muted-foreground mt-4">
                    ⚡ Agenda limitada para manter atendimento 100% personalizado
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground text-center mb-12">
                Perguntas Frequentes
              </h2>
              
              <div className="space-y-6">
                {faqItems.map((item, index) => (
                  <Card key={index} className="glassmorphism border-border/50">
                    <CardContent className="p-8">
                      <h3 className="text-xl font-semibold text-foreground mb-4">{item.question}</h3>
                      <p className="text-muted-foreground leading-relaxed">{item.answer}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gradient-to-b from-background to-secondary/10 border-t border-border/50">
          <div className="container mx-auto px-6">
            {/* Main Footer Content */}
            <div className="py-16">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
                
                {/* Company Info */}
                <div className="lg:col-span-1">
                  <div className="flex items-center space-x-3 mb-6">
                    <img src={logoPath} alt="N1 Global" className="h-8 w-auto" />
                    <span className="text-xl font-bold text-foreground">N1 Global</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    Especialistas em estrutura completa para vendas de produtos físicos e nutracêuticos na Europa. 
                    Compliance, logística e operação sem burocracia.
                  </p>
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">28 países europeus cobertos</span>
                  </div>
                </div>

                {/* Services */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-6">Serviços</h3>
                  <ul className="space-y-3">
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Estrutura Fiscal</a></li>
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Conformidade Regulatória</a></li>
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Logística Europeia</a></li>
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Nutracêuticos</a></li>
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Produtos Físicos</a></li>
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Gestão de Riscos</a></li>
                  </ul>
                </div>

                {/* Company */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-6">Empresa</h3>
                  <ul className="space-y-3">
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Sobre Nós</a></li>
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Nossa Equipe</a></li>
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Casos de Sucesso</a></li>
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Parceiros</a></li>
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Carreira</a></li>
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Imprensa</a></li>
                  </ul>
                </div>

                {/* Contact & Support */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-6">Contato</h3>
                  
                  {/* Europe Office */}
                  <div className="mb-6">
                    <h4 className="font-medium text-foreground mb-3">Escritório Europa</h4>
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">Amsterdã, Países Baixos<br />Zurich, Suíça</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-primary" />
                        <span className="text-sm text-muted-foreground">+31 20 345 6789</span>
                      </div>
                    </div>
                  </div>

                  {/* Brazil Office */}
                  <div className="mb-6">
                    <h4 className="font-medium text-foreground mb-3">Escritório Brasil</h4>
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">São Paulo, SP</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-primary" />
                        <span className="text-sm text-muted-foreground">+55 11 3456-7890</span>
                      </div>
                    </div>
                  </div>

                  {/* Support */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">contato@n1-global.com</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">Suporte 24/7 • 365 dias</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer */}
            <div className="border-t border-border/30 py-8">
              <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
                
                {/* Legal Links */}
                <div className="flex flex-wrap justify-center lg:justify-start items-center space-x-6 text-sm text-muted-foreground">
                  <a href="#" className="hover:text-foreground transition-colors">Política de Privacidade</a>
                  <a href="#" className="hover:text-foreground transition-colors">Termos de Uso</a>
                  <a href="#" className="hover:text-foreground transition-colors">Política de Cookies</a>
                  <a href="#" className="hover:text-foreground transition-colors">LGPD</a>
                  <a href="#" className="hover:text-foreground transition-colors">Compliance</a>
                </div>

                {/* Copyright */}
                <div className="text-sm text-muted-foreground text-center lg:text-right">
                  <p>© 2025 N1 Global Solutions. Todos os direitos reservados.</p>
                  <p className="mt-1">CNPJ: 00.000.000/0001-00</p>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}