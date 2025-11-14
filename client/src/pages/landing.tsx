import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight, Calendar, Zap, Shield, Globe, Pill, Package2, Users, TrendingUp, Building, Scale, FileCheck, Phone, Mail, Sparkles, X, LogIn, MapPin, Clock, Award, ChevronDown, ChevronUp, MessageSquare, Star, CheckCircle2 } from "lucide-react";
import cartLogo from "@assets/cart-logo_1757013744084.png";
import digistoreLogo from "@assets/digistore-logo_1757013744090.png";
import openLogo from "@assets/open-logo_1757013744090.png";
import shopifyLogo from "@assets/shopify-logo_1757013744091.png";
import logoPath from "@assets/logo_1756142152045.png";
import { useTranslation } from "@/hooks/use-translation";
import { LanguageSelector } from "@/components/ui/language-selector";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [logoVisible, setLogoVisible] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const fullText = t('landing.heroTitle');

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

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const howItWorksSteps = [
    {
      number: t('landing.steps.step1.number'),
      title: t('landing.steps.step1.title'),
      description: t('landing.steps.step1.description'),
      icon: MessageSquare
    },
    {
      number: t('landing.steps.step2.number'), 
      title: t('landing.steps.step2.title'),
      description: t('landing.steps.step2.description'),
      icon: Shield
    },
    {
      number: t('landing.steps.step3.number'),
      title: t('landing.steps.step3.title'),
      description: t('landing.steps.step3.description'),
      icon: TrendingUp
    }
  ];

  const testimonials = [
    {
      name: t('landing.testimonials.testimonial1.name'),
      company: t('landing.testimonials.testimonial1.company'),
      content: t('landing.testimonials.testimonial1.content'),
      revenue: t('landing.testimonials.testimonial1.revenue'),
      revenueLabel: t('landing.testimonials.testimonial1.revenueLabel')
    },
    {
      name: t('landing.testimonials.testimonial2.name'), 
      company: t('landing.testimonials.testimonial2.company'),
      content: t('landing.testimonials.testimonial2.content'),
      revenue: t('landing.testimonials.testimonial2.revenue'),
      revenueLabel: t('landing.testimonials.testimonial2.revenueLabel')
    }
  ];

  const solutions = [
    {
      icon: Building,
      key: 'fiscal',
      color: "text-blue-500"
    },
    {
      icon: FileCheck,
      key: 'regulatory',
      color: "text-green-500"
    },
    {
      icon: Globe,
      key: 'panEuropean',
      color: "text-purple-500"
    },
    {
      icon: Zap,
      key: 'zeroBureaucracy',
      color: "text-yellow-500"
    },
    {
      icon: Scale,
      key: 'scalability',
      color: "text-orange-500"
    },
    {
      icon: Shield,
      key: 'riskManagement',
      color: "text-red-500"
    }
  ];

  const faqItems = [
    {
      question: t('landing.faq.q1'),
      answer: t('landing.faq.a1')
    },
    {
      question: t('landing.faq.q2'),
      answer: t('landing.faq.a2')
    },
    {
      question: t('landing.faq.q3'),
      answer: t('landing.faq.a3')
    },
    {
      question: t('landing.faq.q4'),
      answer: t('landing.faq.a4')
    },
    {
      question: t('landing.faq.q5'),
      answer: t('landing.faq.a5')
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
      <header className="absolute top-0 left-0 w-full z-[100]">
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
            <div className="flex items-center gap-3">
              <LanguageSelector />
              <Button 
                onClick={handleLoginClick}
                variant="outline"
                className="border-white/50 bg-white/10 text-white hover:bg-white/20 px-4 sm:px-6 py-2 text-sm sm:text-base rounded-xl transition-all duration-200 backdrop-blur-md"
                data-testid="button-login-header"
              >
                <LogIn className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{t('landing.enter')}</span>
                <span className="sm:hidden">{t('landing.enter')}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-50">
        {/* Hero Section */}
        <section className="min-h-screen sm:py-20 lg:py-32 flex items-center relative overflow-hidden bg-black">
          {/* Background Video - apenas no hero */}
          <div className="absolute bottom-0 left-0 right-0 h-[70%] sm:inset-0 w-full sm:h-full">
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="w-full h-full object-cover object-right sm:object-center"
              style={{ filter: 'brightness(0.4)' }}
            >
              <source src="https://werocketz.com/wp-content/uploads/2025/06/bg1-3.mp4" type="video/mp4" />
            </video>
          </div>
          
          {/* Overlay gradiente para melhor contraste no hero */}
          <div className="absolute bottom-0 left-0 right-0 h-[70%] sm:inset-0 bg-gradient-to-b from-black/95 to-transparent sm:bg-gradient-to-r sm:from-black/80 sm:to-transparent"></div>
          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <div className="text-center max-w-4xl mx-auto -translate-y-5 sm:-translate-y-5">
              <h1 className="text-[30px] sm:text-4xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight mb-6 sm:mb-8 min-h-[120px] sm:min-h-[200px] xl:min-h-[240px] px-2">
                {displayedText.split('\n').map((line, index) => (
                  <span key={index}>
                    {(() => {
                      const words = line.split(' ');
                      const result = [];
                      let i = 0;
                      
                      // Palavras a destacar com gradiente por idioma
                      const sellWords = ['Venda', 'Vende', 'Sell'];
                      const bureaucracyPhrases = [
                        { first: 'sem', second: 'burocracia' },      // PT-BR
                        { first: 'sin', second: 'burocracia' },      // ES
                        { first: 'without', second: 'bureaucracy' }   // EN
                      ];
                      
                      while (i < words.length) {
                        const word = words[i];
                        let processed = false;
                        
                        // Verificar se é palavra de "vender/venda/sell"
                        if (sellWords.includes(word)) {
                          result.push(
                            <span key={`${index}-${i}`} className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                              {word}
                            </span>
                          );
                          processed = true;
                        } 
                        // Verificar se é frase de "sem/sin/without burocracia/bureaucracy"
                        else {
                          for (const phrase of bureaucracyPhrases) {
                            if (word === phrase.first && i + 1 < words.length && words[i + 1] === phrase.second) {
                              // Apply gradient to phrase as a single unit
                              result.push(
                                <span key={`${index}-${i}`} className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                                  {word} {words[i + 1]}
                                </span>
                              );
                              i++; // Skip next word since we've processed both
                              processed = true;
                              break;
                            }
                          }
                        }
                        
                        // Se não foi processado, adicionar palavra normal
                        if (!processed) {
                          result.push(
                            <span key={`${index}-${i}`}>
                              {word}
                            </span>
                          );
                        }
                        
                        // Add space if not the last word
                        if (i < words.length - 1) {
                          result.push(' ');
                        }
                        
                        i++;
                      }
                      
                      return result;
                    })()}
                    {index < displayedText.split('\n').length - 1 && <br />}
                  </span>
                ))}
                {showCursor && <span className="animate-pulse text-blue-500">|</span>}
              </h1>
              <p className="text-base sm:text-xl lg:text-2xl text-muted-foreground leading-relaxed mb-8 sm:mb-12 max-w-4xl mx-auto px-4" dangerouslySetInnerHTML={{ __html: t('landing.heroSubtitle') }} />
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
                <Button 
                  size="lg"
                  onClick={handleScheduleMeeting}
                  className="bg-primary hover:bg-primary/90 text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-xl transition-all duration-200 hover:scale-105 shadow-lg w-full sm:w-auto"
                  data-testid="button-cta-hero"
                >
                  {t('landing.ctaConsultation')} <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-border/50 text-foreground hover:bg-background/80 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-xl transition-all duration-200 w-full sm:w-auto"
                  data-testid="button-learn-more"
                >
                  {t('landing.learnMore')}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 sm:py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="mb-10 sm:mb-16 text-center">
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto px-4">{t('landing.statsSubtitle')}</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {[
                { number: "28", label: t('landing.stats.countries'), sublabel: t('landing.stats.countriesSub') },
                { number: "€127M", label: t('landing.stats.processed'), sublabel: t('landing.stats.processedSub') },
                { number: "847+", label: t('landing.stats.products'), sublabel: t('landing.stats.productsSub') },
                { number: "99.8%", label: t('landing.stats.compliance'), sublabel: t('landing.stats.complianceSub') }
              ].map((stat, index) => (
                <Card key={index} className="glassmorphism border-border/30 text-center group hover:border-primary/50 transition-all duration-300">
                  <CardContent className="p-4 sm:p-6 lg:p-8">
                    <div className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent mb-2 sm:mb-3">
                      {stat.number}
                    </div>
                    <div className="text-sm sm:text-base font-medium text-foreground mb-1">{stat.label}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">{stat.sublabel}</div>
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
              <p className="text-sm sm:text-base text-muted-foreground mb-8 sm:mb-12 px-4">{t('landing.integrationsTitle')}</p>
              <div className="grid grid-cols-2 gap-8 justify-items-center max-w-xs mx-auto sm:flex sm:justify-center sm:items-center sm:gap-8 lg:gap-12 xl:gap-16 px-4">
                <img 
                  src={cartLogo} 
                  alt="CartPanda - Plataforma de e-commerce integrada à N1 Global" 
                  className="h-6 sm:h-5 lg:h-7"
                  loading="lazy"
                />
                <img 
                  src={digistoreLogo} 
                  alt="Digistore24 - Gateway de pagamento integrado à estrutura N1" 
                  className="h-6 sm:h-5 lg:h-7"
                  loading="lazy"
                />
                <img 
                  src={openLogo} 
                  alt="OpenAI - Inteligência artificial para otimização de vendas" 
                  className="h-6 sm:h-5 lg:h-7"
                  loading="lazy"
                />
                <img 
                  src={shopifyLogo} 
                  alt="Shopify - Plataforma líder de e-commerce compatível com N1" 
                  className="h-6 sm:h-5 lg:h-7"
                  loading="lazy"
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
                {t('landing.problemTitle')}
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-12 sm:mb-16 px-4" dangerouslySetInnerHTML={{ __html: t('landing.problemSubtitle') }} />
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 text-left mb-8 sm:mb-12 px-2">
                {[
                  { key: 'regulatory' },
                  { key: 'fiscal' },
                  { key: 'logistics' },
                  { key: 'legal' },
                  { key: 'support' },
                  { key: 'risk' }
                ].map((problem, index) => {
                  const problemData = t(`landing.problems.${problem.key}`, { returnObjects: true }) as { title: string; desc: string };
                  return (
                  <Card key={index} className="glassmorphism border-destructive/20 hover:border-destructive/40 transition-all duration-300">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-destructive rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-2">{problemData.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{problemData.desc}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
              
              <div 
                className="bg-red-900/20 border border-red-400/50 hover:bg-red-900/30 backdrop-blur-sm rounded-lg p-6 sm:p-8 transition-all duration-300 max-w-3xl mx-auto"
                style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}
              >
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">
                  {t('landing.problemResult')}
                </h3>
                <p className="text-red-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: t('landing.problemResultDesc') }} />
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 sm:py-20 bg-gradient-to-b from-secondary/5 to-background">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                {t('landing.howItWorksTitle')}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('landing.howItWorksSubtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
              {howItWorksSteps.map((step, index) => {
                const IconComponent = step.icon;
                return (
                  <div key={index} className="text-center group">
                    <div className="relative mb-6">
                      <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-chart-2/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <IconComponent className="h-10 w-10 text-primary" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {step.number}
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-16 sm:py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4" dangerouslySetInnerHTML={{ __html: t('landing.testimonialsTitle') }} />
              <p className="text-lg text-muted-foreground">
                {t('landing.testimonialsSubtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="glassmorphism border-border/50 hover:border-primary/30 transition-all duration-300">
                  <CardContent className="p-8">
                    <div className="flex items-center mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-yellow-500 fill-current" />
                      ))}
                    </div>
                    <blockquote className="text-muted-foreground leading-relaxed mb-6 italic">
                      "{testimonial.content}"
                    </blockquote>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-foreground">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.company}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">{testimonial.revenue}</div>
                        <div className="text-xs text-muted-foreground">{testimonial.revenueLabel}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Solution Section */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6" dangerouslySetInnerHTML={{ __html: t('landing.solutionTitle') }} />
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto" dangerouslySetInnerHTML={{ __html: t('landing.solutionSubtitle') }} />
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {solutions.map((solution, index) => {
                const IconComponent = solution.icon;
                const solutionData = t(`landing.solutions.${solution.key}`, { returnObjects: true }) as { title: string; description: string };
                return (
                  <Card key={index} className="glassmorphism border-border/30 hover:border-primary/50 hover:shadow-xl hover:-translate-y-2 transition-all duration-500 group">
                    <CardContent className="p-4 sm:p-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-chart-2/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <IconComponent className={`h-8 w-8 ${solution.color} group-hover:scale-110 transition-transform duration-300`} />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-4 group-hover:text-primary transition-colors duration-300">{solutionData.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{solutionData.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Key Differentiators */}
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h3 className="text-2xl lg:text-[26px] font-bold text-foreground mb-3 mt-20">{t('landing.whyChooseTitle')}</h3>
                <p className="text-muted-foreground">{t('landing.whyChooseSubtitle')}</p>
              </div>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <Pill className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h4 className="font-semibold text-foreground mb-2 text-lg">{t('landing.differentiators.nutraceuticals.title')}</h4>
                  <p className="text-base text-muted-foreground">{t('landing.differentiators.nutraceuticals.description')}</p>
                </div>
                <div>
                  <TrendingUp className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h4 className="font-semibold text-foreground mb-2 text-lg">{t('landing.differentiators.growth.title')}</h4>
                  <p className="text-base text-muted-foreground">{t('landing.differentiators.growth.description')}</p>
                </div>
                <div>
                  <Users className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h4 className="font-semibold text-foreground mb-2 text-lg">{t('landing.differentiators.team.title')}</h4>
                  <p className="text-base text-muted-foreground">{t('landing.differentiators.team.description')}</p>
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
              
              <CardContent className="p-6 sm:p-12 relative z-10">
                <div className="text-center mb-12">
                  <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6" dangerouslySetInnerHTML={{ __html: t('landing.ctaTitle') }} />
                  <p className="text-lg text-muted-foreground max-w-3xl mx-auto" dangerouslySetInnerHTML={{ __html: t('landing.ctaSubtitle') }} />
                </div>
                
                <div className="grid md:grid-cols-2 gap-6 mb-10">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground mb-3">{t('landing.ctaWhatYouGet')}</h3>
                    {[
                      t('landing.ctaBenefits.feasibility'),
                      t('landing.ctaBenefits.strategy'),
                      t('landing.ctaBenefits.roadmap')
                    ].map((item, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground mb-3">{t('landing.ctaExperts')}</h3>
                    {[
                      t('landing.ctaExpertBenefits.structure'),
                      t('landing.ctaExpertBenefits.timeline'),
                      t('landing.ctaExpertBenefits.noCommitment')
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
                    className="bg-gradient-to-r from-primary to-chart-2 hover:from-primary/90 hover:to-chart-2/90 text-white px-4 sm:px-10 py-3 sm:py-4 text-base sm:text-lg rounded-xl transition-all duration-300 hover:scale-105 shadow-xl w-full sm:w-auto"
                    data-testid="button-cta-schedule"
                  >
                    {t('landing.ctaButton')} <Calendar className="ml-3 h-5 w-5" />
                  </Button>
                  <p className="text-sm text-muted-foreground mt-4">
                    {t('landing.ctaLimited')}
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
                {t('landing.faqTitle')}
              </h2>
              
              <div className="space-y-4">
                {faqItems.map((item, index) => (
                  <Card key={index} className="glassmorphism border-border/50">
                    <CardContent className="p-0">
                      {/* Question Header - Always Visible */}
                      <div 
                        className="p-4 sm:p-6 cursor-pointer flex items-center justify-between"
                        onClick={() => toggleFaq(index)}
                      >
                        <h3 className="text-base sm:text-lg font-semibold text-foreground pr-4">{item.question}</h3>
                        <div>
                          {openFaqIndex === index ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      
                      {/* Answer - toggle visibility for all screen sizes */}
                      {openFaqIndex === index && (
                        <div className="px-4 pb-4 border-t border-border/30">
                          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed pt-3">{item.answer}</p>
                        </div>
                      )}
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
                  <div className="flex justify-start mb-6">
                    <img src={logoPath} alt="N1 Global" className="h-6 w-auto" />
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    {t('landing.footer.description')}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">{t('landing.footer.countriesCovered')}</span>
                  </div>
                </div>

                {/* Services */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-6">{t('landing.footer.services.title')}</h3>
                  <ul className="space-y-3">
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t('landing.footer.services.fiscal')}</a></li>
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t('landing.footer.services.regulatory')}</a></li>
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t('landing.footer.services.logistics')}</a></li>
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t('landing.footer.services.nutraceuticals')}</a></li>
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t('landing.footer.services.physical')}</a></li>
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t('landing.footer.services.risk')}</a></li>
                  </ul>
                </div>

                {/* Company */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-6">{t('landing.footer.company.title')}</h3>
                  <ul className="space-y-3">
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t('landing.footer.company.about')}</a></li>
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t('landing.footer.company.team')}</a></li>
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t('landing.footer.company.success')}</a></li>
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t('landing.footer.company.partners')}</a></li>
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t('landing.footer.company.career')}</a></li>
                    <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t('landing.footer.company.press')}</a></li>
                  </ul>
                </div>

                {/* Contact & Support */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-6">{t('landing.footer.contact.title')}</h3>
                  
                  {/* Europe Office */}
                  <div className="mb-6">
                    <h4 className="font-medium text-foreground mb-3">{t('landing.footer.contact.europeOffice')}</h4>
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
                    <h4 className="font-medium text-foreground mb-3">{t('landing.footer.contact.brazilOffice')}</h4>
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
                      <span className="text-sm text-muted-foreground">{t('landing.footer.contact.support')}</span>
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
                  <a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.legal.privacy')}</a>
                  <a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.legal.terms')}</a>
                  <a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.legal.cookies')}</a>
                  <a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.legal.lgpd')}</a>
                  <a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.legal.compliance')}</a>
                </div>

                {/* Copyright */}
                <div className="text-sm text-muted-foreground text-center lg:text-right">
                  <p>{t('landing.footer.copyright')}</p>
                  <p className="mt-1">{t('landing.footer.cnpj')}</p>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}