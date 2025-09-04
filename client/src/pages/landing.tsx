import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight, Package, Truck, HeadphonesIcon, BarChart3, Shield, Globe, Phone, Mail } from "lucide-react";
import logoPath from "@assets/logo_1756142152045.png";

export default function Landing() {
  const [, setLocation] = useLocation();

  const handleLoginClick = () => {
    setLocation('/login');
  };

  const benefits = [
    {
      icon: Package,
      title: "Estoque Local na Europa",
      description: "Recebemos e armazenamos seus produtos nos nossos centros na Europa"
    },
    {
      icon: Truck,
      title: "Entrega Rápida",
      description: "Enviamos com entrega rápida e rastreio confiável"
    },
    {
      icon: HeadphonesIcon,
      title: "Suporte Local",
      description: "Oferecemos suporte local com confirmação e reagendamento de pedidos"
    },
    {
      icon: BarChart3,
      title: "Relatórios Detalhados",
      description: "Fornecemos relatórios de RTS, conversão por país e gestão de estoque em tempo real"
    },
    {
      icon: Shield,
      title: "Estrutura Legal",
      description: "Operamos com estrutura fiscal e jurídica validada"
    },
    {
      icon: Globe,
      title: "Múltiplos Países",
      description: "Escale para múltiplos países com uma única operação"
    }
  ];

  const stats = [
    { number: "+15", label: "países com centros logísticos" },
    { number: "+20k", label: "pedidos processados por dia" },
    { number: "+120", label: "marcas vendendo conosco" },
    { number: "+55", label: "conexões com Marketplaces" }
  ];

  const faqItems = [
    {
      question: "Preciso ter empresa fora do Brasil para vender na Europa com a N1?",
      answer: "Não. A N1 ajuda você a operar legalmente mesmo com empresa brasileira, e também oferece suporte caso decida abrir empresa no exterior."
    },
    {
      question: "Quanto tempo leva para começar a vender com a N1?",
      answer: "Entre 7 e 14 dias após a sessão, dependendo da prontidão da sua loja e produtos. A N1 cuida da configuração logística, fiscal e de integração."
    },
    {
      question: "A N1 serve só para grandes empresas?",
      answer: "De forma alguma. Atendemos desde operações menores até grandes marcas, com soluções ajustadas à sua fase atual."
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
      <header className="relative z-10 border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <img src={logoPath} alt="N1 Global" className="h-8 w-auto" />
            <Button 
              onClick={handleLoginClick}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-xl transition-all duration-200 hover:scale-105"
              data-testid="button-login-header"
            >
              Acessar Dashboard
            </Button>
          </div>
        </div>
      </header>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="py-20 lg:py-32">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-4xl mx-auto">
              <Badge className="mb-6 bg-primary/20 text-primary border-primary/30">
                Cash-on-Delivery na Europa
              </Badge>
              <h1 className="text-4xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight mb-6">
                Venda com{" "}
                <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                  estrutura pronta
                </span>
                {" "}na Europa
              </h1>
              <p className="text-xl lg:text-2xl text-muted-foreground leading-relaxed mb-8 max-w-3xl mx-auto">
                Entregas rápidas, suporte local e logística pensada para seus produtos. 
                Transforme sua operação COD em uma estrutura escalável, legal e lucrativa.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg"
                  onClick={handleLoginClick}
                  className="bg-primary hover:bg-primary/90 text-white px-8 py-4 text-lg rounded-xl transition-all duration-200 hover:scale-105 shadow-lg"
                  data-testid="button-cta-hero"
                >
                  Acessar Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-border/50 text-foreground hover:bg-background/80 px-8 py-4 text-lg rounded-xl transition-all duration-200"
                  data-testid="button-learn-more"
                >
                  Saiba Mais
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <Card key={index} className="glassmorphism border-border/50 text-center">
                  <CardContent className="p-6">
                    <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">{stat.number}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-8">
                Você sabe o quão lucrativo é vender com COD…
              </h2>
              <p className="text-xl text-muted-foreground mb-12">
                Mas também sabe o quanto dói operar sem estrutura
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 text-left">
                {[
                  "Alta taxa de devoluções (RTS) por falta de contato com cliente",
                  "Logística lenta ou ineficiente que mina o seu LTV",
                  "Falta de suporte local (idioma, SAC, reagendamento)",
                  "Zero previsibilidade financeira, ROI instável"
                ].map((problem, index) => (
                  <Card key={index} className="glassmorphism border-destructive/20">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-destructive rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-foreground">{problem}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="mt-12 p-8 glassmorphism rounded-2xl border border-destructive/30">
                <h3 className="text-2xl font-bold text-destructive mb-4">
                  O resultado? ROAS ilusório, fluxo de caixa travado e operação imprevisível.
                </h3>
                <p className="text-muted-foreground">
                  Nos países onde o COD domina o e-commerce, como Romênia, Bulgária e Polônia, 
                  mais de 50% das compras online são pagas na entrega.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Solution Section */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6">
                A{" "}
                <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                  N1 Global
                </span>
                {" "}transforma sua operação COD
              </h2>
              <p className="text-xl text-muted-foreground">
                Você foca no produto e no tráfego. Nós cuidamos do resto.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => {
                const IconComponent = benefit.icon;
                return (
                  <Card key={index} className="glassmorphism border-border/50 hover:border-primary/50 transition-all duration-300">
                    <CardContent className="p-8 text-center">
                      <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <IconComponent className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-4">{benefit.title}</h3>
                      <p className="text-muted-foreground">{benefit.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <Card className="glassmorphism border-primary/30 max-w-4xl mx-auto">
              <CardContent className="p-12 text-center">
                <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
                  Agende um horário e leve sua operação COD a outro nível
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Conversa 100% gratuita com um especialista da N1. Você vai sair da reunião com:
                </p>
                
                <div className="grid md:grid-cols-2 gap-4 mb-8 text-left">
                  {[
                    "Diagnóstico do seu momento atual",
                    "Estratégia personalizada de entrada no mercado europeu",
                    "Mapeamento de oportunidades, riscos e próximos passos",
                    "Sem compromisso e sem enrolação"
                  ].map((item, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
                
                <Button 
                  size="lg"
                  onClick={handleLoginClick}
                  className="bg-primary hover:bg-primary/90 text-white px-8 py-4 text-lg rounded-xl transition-all duration-200 hover:scale-105 shadow-lg"
                  data-testid="button-cta-schedule"
                >
                  Acessar Dashboard Agora <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
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
        <footer className="py-12 border-t border-border/50">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-4 mb-6 md:mb-0">
                <img src={logoPath} alt="N1 Global" className="h-6 w-auto" />
                <span className="text-muted-foreground">A única plataforma que vende em toda Europa</span>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">Suporte 24/7</span>
                </div>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">contato@n1-global.com</span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}