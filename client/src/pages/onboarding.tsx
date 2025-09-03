import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Circle, Loader2, Package, ShoppingCart, Truck, Target, Zap, TrendingUp, BarChart3, Brain, ArrowRight } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useOperationStore } from '@/store/operations';
import logoImage from '@assets/Dashboard_1756877887022.png';

// European countries with flags
const EUROPEAN_COUNTRIES = [
  { code: 'ES', name: 'Spain', flag: '🇪🇸', currency: 'EUR' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', currency: 'EUR' },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', currency: 'EUR' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', currency: 'EUR' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', currency: 'EUR' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', currency: 'PLN' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', currency: 'CZK' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰', currency: 'EUR' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺', currency: 'HUF' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴', currency: 'RON' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', currency: 'BGN' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', currency: 'EUR' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮', currency: 'EUR' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪', currency: 'EUR' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻', currency: 'EUR' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹', currency: 'EUR' }
];

// Currency options with symbols
const EUROPEAN_CURRENCIES = [
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв' }
];

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  completed: boolean;
}

// Helper function to render text with gradient applied dynamically during typing
function renderTextWithGradient(displayedText: string, textConfig: any, currentIndex: number) {
  const { gradientStart, plain } = textConfig;
  
  if (currentIndex <= gradientStart) {
    // Haven't reached gradient part yet - handle line breaks
    return displayedText.split('\n').map((line: string, index: number) => (
      <span key={index}>
        {line}
        {index < displayedText.split('\n').length - 1 && <br />}
      </span>
    ));
  }
  
  // Split text into before gradient and gradient parts
  const beforeGradient = plain.slice(0, gradientStart);
  const gradientPart = displayedText.slice(gradientStart);
  
  return (
    <span>
      {beforeGradient.split('\n').map((line: string, index: number) => (
        <span key={index}>
          {line}
          {index < beforeGradient.split('\n').length - 1 && <br />}
        </span>
      ))}
      <span className="gradient-text">
        {gradientPart.split('\n').map((line: string, index: number) => (
          <span key={index}>
            {line}
            {index < gradientPart.split('\n').length - 1 && <br />}
          </span>
        ))}
      </span>
    </span>
  );
}

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const [operationName, setOperationName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [createdOperationId, setCreatedOperationId] = useState<string>('');
  const { toast } = useToast();
  const { selectedOperation, setSelectedOperation } = useOperationStore();

  // Fetch user onboarding status
  const { data: userStatus } = useQuery({
    queryKey: ['/api/user/onboarding-status'],
  });

  // Fetch user operations to set selected operation
  const { data: operations } = useQuery({
    queryKey: ['/api/operations'],
  });

  // Set selected operation automatically if not set and operations are available
  useEffect(() => {
    if (!selectedOperation && operations && Array.isArray(operations) && operations.length > 0) {
      setSelectedOperation(operations[0].id);
    }
  }, [operations, selectedOperation, setSelectedOperation]);

  const onboardingSteps = (userStatus as any)?.onboardingSteps || {
    step1_operation: false,
    step2_shopify: false,
    step3_shipping: false,
    step4_ads: false,
    step5_sync: false
  };

  // State for step 0 presentation
  const [showStep0, setShowStep0] = useState(true);
  const [displayedText, setDisplayedText] = useState("");
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [showCard, setShowCard] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  
  // State for card title animation
  const [cardTitleText, setCardTitleText] = useState("");
  const [cardTitleIndex, setCardTitleIndex] = useState(0);
  const [isCardTitleComplete, setIsCardTitleComplete] = useState(false);

  const texts = [
    {
      plain: "Ter dados precisos da sua operação mudam o jogo",
      html: "Ter dados precisos da sua operação <span class='gradient-text'>mudam o jogo</span>",
      gradientStart: 40 // posição onde começa o gradiente
    },
    {
      plain: "Um sistema que unifica tudo em um só lugar", 
      html: "Um sistema que <span class='gradient-text'>unifica</span> tudo em um só lugar",
      gradientStart: 15 // posição onde começa o gradiente
    }
  ];

  const cardTitleConfig = {
    plain: "Quanto mais dados,\nmais inteligência",
    gradientStart: 19 // posição onde começa "mais inteligência" (incluindo o "m")
  };

  // Determine current step based on completed steps
  const getCurrentStep = () => {
    if (!onboardingSteps.step1_operation) return 1;
    if (!onboardingSteps.step2_shopify) return 2;
    if (!onboardingSteps.step3_shipping) return 3;
    if (!onboardingSteps.step4_ads) return 4;
    if (!onboardingSteps.step5_sync) return 5;
    return 6;
  };

  const currentStep = getCurrentStep();

  // Hide step 0 if step 1 is completed
  useEffect(() => {
    if (onboardingSteps.step1_operation) {
      setShowStep0(false);
    }
  }, [onboardingSteps.step1_operation]);

  // Typewriting effect for step 0
  useEffect(() => {
    if (!showStep0) return;
    
    const currentText = texts[currentTextIndex];
    setDisplayedText("");
    setCurrentCharIndex(0);
    setIsTypingComplete(false);
    
    const typewriterInterval = setInterval(() => {
      setCurrentCharIndex(prev => {
        const newIndex = prev + 1;
        const textToShow = currentText.plain.slice(0, newIndex);
        setDisplayedText(textToShow);
        
        if (newIndex >= currentText.plain.length) {
          clearInterval(typewriterInterval);
          setIsTypingComplete(true);
          
          // Wait 3 seconds after completing the text
          setTimeout(() => {
            if (currentTextIndex === 0) {
              setCurrentTextIndex(1);
            } else {
              setDisplayedText("");
              setIsTypingComplete(false);
              setTimeout(() => {
                setShowCard(true);
              }, 3000);
            }
          }, 3000);
        }
        
        return newIndex;
      });
    }, 80);

    return () => clearInterval(typewriterInterval);
  }, [showStep0, currentTextIndex]);

  // Typewriting effect for card title
  useEffect(() => {
    if (!showCard) return;
    
    setCardTitleText("");
    setCardTitleIndex(0);
    setIsCardTitleComplete(false);
    
    const cardTitleInterval = setInterval(() => {
      setCardTitleIndex(prev => {
        const newIndex = prev + 1;
        const textToShow = cardTitleConfig.plain.slice(0, newIndex);
        setCardTitleText(textToShow);
        
        if (newIndex >= cardTitleConfig.plain.length) {
          clearInterval(cardTitleInterval);
          setIsCardTitleComplete(true);
        }
        
        return newIndex;
      });
    }, 60); // Slightly faster for card title

    return () => clearInterval(cardTitleInterval);
  }, [showCard]);

  const handleContinueToStep1 = () => {
    setShowStep0(false);
  };

  // Auto-select currency when country changes
  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    const country = EUROPEAN_COUNTRIES.find(c => c.code === countryCode);
    if (country) {
      setSelectedCurrency(country.currency);
    }
  };

  // Check if user has completed onboarding
  useEffect(() => {
    if ((userStatus as any)?.onboardingCompleted) {
      setLocation('/');
    }
  }, [userStatus, setLocation]);

  const steps: OnboardingStep[] = [
    {
      id: 'step1_operation',
      title: 'Crie sua primeira operação',
      description: 'Configure o nome da sua operação comercial',
      icon: Package,
      completed: onboardingSteps.step1_operation
    },
    {
      id: 'step2_shopify',
      title: 'Conecte sua loja Shopify',
      description: 'Integre com sua loja para sincronizar produtos',
      icon: ShoppingCart,
      completed: onboardingSteps.step2_shopify
    },
    {
      id: 'step3_shipping',
      title: 'Configure transportadora',
      description: 'Adicione provedores de entrega',
      icon: Truck,
      completed: onboardingSteps.step3_shipping
    },
    {
      id: 'step4_ads',
      title: 'Integre anúncios',
      description: 'Conecte suas contas de publicidade',
      icon: Target,
      completed: onboardingSteps.step4_ads
    },
    {
      id: 'step5_sync',
      title: 'Sincronização completa',
      description: 'Sincronize todos os dados',
      icon: Zap,
      completed: onboardingSteps.step5_sync
    }
  ];

  // Create operation mutation
  const createOperationMutation = useMutation({
    mutationFn: async (data: { name: string; country: string; currency: string }) => {
      const response = await apiRequest('POST', '/api/onboarding/create-operation', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Operação criada com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['/api/user/onboarding-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      // Don't manually set currentStep - it will be updated automatically
    },
    onError: () => {
      toast({ title: 'Erro ao criar operação', variant: 'destructive' });
    }
  });

  // Complete step mutation
  const completeStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const response = await apiRequest('POST', '/api/onboarding/complete-step', { stepId });
      if (!response.ok) throw new Error('Erro ao completar etapa');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/onboarding-status'] });
    }
  });

  const handleCreateOperation = () => {
    if (!operationName.trim()) {
      toast({ title: 'Digite um nome para a operação', variant: 'destructive' });
      return;
    }
    if (!selectedCountry) {
      toast({ title: 'Selecione um país para a operação', variant: 'destructive' });
      return;
    }
    if (!selectedCurrency) {
      toast({ title: 'Selecione uma moeda para a operação', variant: 'destructive' });
      return;
    }
    createOperationMutation.mutate({ name: operationName, country: selectedCountry, currency: selectedCurrency });
  };

  const handleStepComplete = (stepId: string, nextStep: number) => {
    completeStepMutation.mutate(stepId);
    // Don't manually set currentStep - it will be updated automatically when data refetches
  };

  const progressPercentage = (steps.filter(s => s.completed).length / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-purple-950 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Logo */}
        <div className="pt-4 pb-4">
          <img 
            src={logoImage} 
            alt="COD Dashboard" 
            className="h-8 w-auto"
          />
        </div>

        {showStep0 ? (
          /* Step 0 - Presentation */
          <div className="flex flex-col items-center text-center">
            {/* Typewriting Text - Com margem superior adicional apenas para os textos */}
            <div className="mb-6" style={{ marginTop: displayedText ? '150px' : '0px' }}>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 min-h-[120px] flex items-center justify-center">
                {displayedText && (
                  <>
                    {renderTextWithGradient(displayedText, texts[currentTextIndex], currentCharIndex)}
                    {!isTypingComplete && (
                      <span className="ml-2 animate-pulse">|</span>
                    )}
                  </>
                )}
              </h1>
            </div>

            {/* Card - Design minimalista e profissional */}
            {showCard && (
              <div className="animate-fade-in -mt-12">
                <Card className="glassmorphism max-w-2xl mx-auto mb-8">
                  <CardContent className="p-8 text-center">
                    {/* Ícone principal - Mais sutil */}
                    <div className="mb-6">
                      <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4">
                        <Brain className="w-8 h-8 text-blue-400" />
                      </div>
                    </div>

                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-6 min-h-[80px] flex items-center justify-center text-center">
                      {cardTitleText && (
                        <>
                          {renderTextWithGradient(cardTitleText, cardTitleConfig, cardTitleIndex)}
                          {!isCardTitleComplete && (
                            <span className="ml-2 animate-pulse">|</span>
                          )}
                        </>
                      )}
                    </h2>
                    <p className="text-white/70 text-base leading-relaxed mb-6 max-w-lg mx-auto">
                      Alimente a plataforma com informações da sua operação e obtenha insights precisos para decisões mais assertivas.
                    </p>
                    
                    {/* Botão Continuar - Dentro do card */}
                    <div className="flex justify-center" style={{ marginTop: '30px' }}>
                      <Button 
                        onClick={handleContinueToStep1}
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 font-medium rounded-lg transition-colors duration-200"
                        style={{ fontSize: '18px' }}
                        data-testid="button-continue-step1"
                      >
                        <ArrowRight className="w-5 h-5 mr-2" />
                        Começar Agora
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Steps Overview */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8" style={{ marginTop: '25px' }}>
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = currentStep === index + 1;
                const isCompleted = step.completed;
                
                return (
                  <Card 
                    key={step.id}
                    className={`relative ${
                      isActive 
                        ? 'bg-blue-600/20 border-blue-400 shadow-lg shadow-blue-500/25' 
                        : isCompleted 
                        ? 'bg-green-600/20 border-green-400'
                        : 'bg-white/5 border-white/10'
                    }`}
                    data-testid={`step-card-${index + 1}`}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="flex justify-center mb-2">
                        {isCompleted ? (
                          <CheckCircle className="w-8 h-8 text-green-400" />
                        ) : (
                          <StepIcon className={`w-8 h-8 ${
                            isActive ? 'text-blue-400' : 'text-white/60'
                          }`} />
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-white mb-1">
                        Etapa {index + 1}
                      </h3>
                      <p className="text-xs text-white/60">
                        {step.title}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>



            {/* Current Step Content */}
            <Card className="bg-white/10 border-white/20">
              <CardContent className="p-8">
                {currentStep === 1 && <OperationStep onComplete={(operationId) => {
                  setCreatedOperationId(operationId);
                  handleStepComplete('step1_operation', 2);
                }} />}
                {currentStep === 2 && <ShopifyStep operationId={createdOperationId || selectedOperation || ''} onComplete={() => handleStepComplete('step2_shopify', 3)} />}
                {currentStep === 3 && <ShippingStep onComplete={() => handleStepComplete('step3_shipping', 4)} />}
                {currentStep === 4 && <AdAccountsStep onComplete={() => handleStepComplete('step4_ads', 5)} />}
                {currentStep === 5 && <SyncStep operationId={createdOperationId || selectedOperation || ''} onComplete={() => handleStepComplete('step5_sync', 6)} />}
                {currentStep === 6 && (
                  <div className="text-center">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-xl text-white mb-4">Configuração Concluída!</h3>
                    <p className="text-white/60 mb-6">
                      Sua operação está configurada e pronta para uso.
                    </p>
                    <Button 
                      onClick={() => setLocation('/')}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      data-testid="button-finish-onboarding"
                    >
                      Ir para Dashboard
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function OperationStep({ onComplete }: { onComplete: (operationId: string) => void }) {
  const [operationName, setOperationName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const { toast } = useToast();

  // Auto-select currency when country changes
  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    const country = EUROPEAN_COUNTRIES.find(c => c.code === countryCode);
    if (country) {
      setSelectedCurrency(country.currency);
    }
  };

  const createOperationMutation = useMutation({
    mutationFn: async (operationData: any) => {
      const response = await apiRequest('POST', '/api/operations', operationData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: 'Operação criada com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      onComplete(data.id);
    },
    onError: () => {
      toast({ title: 'Erro ao criar operação', variant: 'destructive' });
    }
  });

  const handleSubmit = () => {
    if (!operationName || !selectedCountry || !selectedCurrency) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }

    createOperationMutation.mutate({
      name: operationName,
      country: selectedCountry,
      currency: selectedCurrency
    });
  };

  const canContinue = operationName && selectedCountry && selectedCurrency;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Package className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <h3 className="text-xl text-white mb-2">Criar Operação</h3>
        <p className="text-white/60">
          Configure sua primeira operação de vendas
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="operation-name" className="text-white">
            Nome da Operação
          </Label>
          <Input
            id="operation-name"
            placeholder="Ex: Minha Loja Principal"
            value={operationName}
            onChange={(e) => setOperationName(e.target.value)}
            className="bg-white/10 border-white/20 text-white mt-2"
            data-testid="input-operation-name"
          />
        </div>
        
        <div>
          <Label htmlFor="operation-country" className="text-white">
            País da Operação
          </Label>
          <Select onValueChange={handleCountryChange} value={selectedCountry}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white mt-2" data-testid="select-country">
              <SelectValue placeholder="Selecione um país" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              {EUROPEAN_COUNTRIES.map((country) => (
                <SelectItem 
                  key={country.code} 
                  value={country.code}
                  className="text-white hover:bg-gray-700"
                  data-testid={`country-${country.code}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{country.flag}</span>
                    <span>{country.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="operation-currency" className="text-white">
            Moeda Padrão
          </Label>
          <Select onValueChange={setSelectedCurrency} value={selectedCurrency}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white mt-2" data-testid="select-currency">
              <SelectValue placeholder="Selecione uma moeda" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              {EUROPEAN_CURRENCIES.map((currency) => (
                <SelectItem 
                  key={currency.code} 
                  value={currency.code}
                  className="text-white hover:bg-gray-700"
                  data-testid={`currency-${currency.code}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg font-bold">{currency.symbol}</span>
                    <span>{currency.name} ({currency.code})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button 
        onClick={handleSubmit}
        disabled={!canContinue || createOperationMutation.isPending}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-600"
        data-testid="button-create-operation"
      >
        {createOperationMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Criando...
          </>
        ) : (
          'Continuar'
        )}
      </Button>
    </div>
  );
}

function ShopifyStep({ operationId, onComplete }: { operationId: string, onComplete: () => void }) {
  const [shopUrl, setShopUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  console.log('ShopifyStep received operationId:', operationId);

  const testConnection = async () => {
    if (!shopUrl || !accessToken) {
      setErrorMessage('Por favor, preencha todos os campos');
      setConnectionStatus('error');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('idle');
    setErrorMessage('');

    try {
      const response = await apiRequest('POST', '/api/integrations/shopify/test', {
        shopName: shopUrl.replace('.myshopify.com', ''),
        accessToken
      });

      if (response.ok) {
        setConnectionStatus('success');
      } else {
        const error = await response.json();
        setErrorMessage(error.message || 'Erro ao conectar com a Shopify');
        setConnectionStatus('error');
      }
    } catch (error) {
      setErrorMessage('Erro de conexão. Verifique sua internet e tente novamente.');
      setConnectionStatus('error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleComplete = async () => {
    if (connectionStatus !== 'success') {
      setErrorMessage('É necessário testar e validar a conexão antes de continuar');
      setConnectionStatus('error');
      return;
    }

    if (!operationId) {
      setErrorMessage('Erro: ID da operação não encontrado. Tente reiniciar o processo.');
      setConnectionStatus('error');
      return;
    }

    // Save integration data
    try {
      console.log('Saving Shopify integration with operationId:', operationId);
      const response = await apiRequest('POST', '/api/integrations/shopify', {
        operationId: operationId,
        shopName: shopUrl.replace('.myshopify.com', ''),
        accessToken
      });

      if (response.ok) {
        onComplete();
      } else {
        const error = await response.json();
        setErrorMessage(error.message || 'Erro ao salvar integração');
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('Error saving Shopify integration:', error);
      setErrorMessage('Erro ao salvar integração');
      setConnectionStatus('error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <ShoppingCart className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <h3 className="text-xl text-white mb-2">Integração Shopify</h3>
        <p className="text-white/60">
          Configure sua loja Shopify para sincronizar produtos automaticamente
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        <div>
          <label className="block text-white/80 text-sm mb-2">
            Nome da Loja (sem .myshopify.com)
          </label>
          <input
            type="text"
            value={shopUrl}
            onChange={(e) => setShopUrl(e.target.value)}
            placeholder="exemplo: minha-loja"
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:border-blue-400 focus:outline-none"
            data-testid="input-shop-url"
          />
          <p className="text-white/40 text-xs mt-1">
            Digite apenas o nome da loja (ex: "minha-loja" para minha-loja.myshopify.com)
          </p>
        </div>

        <div>
          <label className="block text-white/80 text-sm mb-2">
            Admin API Access Token
          </label>
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="shpat_xxxxxxxxxxxxxxxxxxxxx"
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:border-blue-400 focus:outline-none"
            data-testid="input-access-token"
          />
          <p className="text-white/40 text-xs mt-1">
            Token de acesso da Admin API do Shopify
          </p>
        </div>

        {connectionStatus === 'success' && (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4" />
            Conexão testada com sucesso!
          </div>
        )}

        {connectionStatus === 'error' && errorMessage && (
          <div className="text-red-400 text-sm">
            {errorMessage}
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={testConnection}
            disabled={isTestingConnection || !shopUrl || !accessToken}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
            data-testid="button-test-connection"
          >
            {isTestingConnection ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Testando Conexão...
              </>
            ) : (
              'Testar Conexão'
            )}
          </Button>

          <Button
            onClick={handleComplete}
            disabled={connectionStatus !== 'success'}
            className="w-full bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
            data-testid="button-complete-shopify"
          >
            Continuar
          </Button>
        </div>
      </div>
    </div>
  );
}

function AdAccountsStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <Target className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <h3 className="text-xl text-white mb-2">Contas de Anúncios</h3>
        <p className="text-white/60">
          Conecte suas contas de anúncios para calcular custos de marketing
        </p>
      </div>

      <div className="text-center py-8">
        <p className="text-white/80 mb-4">
          Conecte suas contas de anúncios para calcular custos de marketing
        </p>
        <p className="text-white/60 text-sm mb-6">
          Facebook Ads está disponível. Você pode configurar agora ou depois.
        </p>
        <div className="flex gap-4 justify-center">
          <Button 
            onClick={onComplete}
            className="bg-gray-600 hover:bg-gray-700 text-white"
            data-testid="button-skip-ads"
          >
            Configurar Depois
          </Button>
          <Button 
            onClick={onComplete}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-connect-ads"
          >
            Conectar Facebook Ads
          </Button>
        </div>
      </div>
    </div>
  );
}

function ShippingStep({ onComplete }: { onComplete: () => void }) {
  const { selectedOperation } = useOperationStore();
  const [providers, setProviders] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [providerData, setProviderData] = useState({
    name: '',
    type: 'european_fulfillment',
    login: '',
    password: ''
  });
  const { toast } = useToast();

  // Fetch existing shipping providers
  const { data: existingProviders, isLoading, error } = useQuery({
    queryKey: ['/api/shipping-providers', selectedOperation],
    enabled: !!selectedOperation,
    queryFn: async () => {
      if (!selectedOperation) return [];
      
      console.log('Fetching providers for operation:', selectedOperation);
      
      // Clear any existing operation context and set the correct one
      localStorage.removeItem('current_operation_id');
      localStorage.setItem('current_operation_id', selectedOperation);
      
      try {
        const response = await apiRequest('GET', '/api/shipping-providers', undefined);
        const data = await response.json();
        console.log('Provider response for operation', selectedOperation, ':', data);
        return data;
      } finally {
        // Keep the current operation set for the session
        // Don't restore previous value during onboarding
      }
    }
  });

  useEffect(() => {
    console.log('Selected operation in ShippingStep:', selectedOperation);
    console.log('Existing providers data:', existingProviders);
    if (existingProviders && Array.isArray(existingProviders)) {
      console.log('Setting providers:', existingProviders);
      setProviders(existingProviders);
    }
  }, [existingProviders, selectedOperation]);

  const createProviderMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedOperation) {
        throw new Error('Operation not selected');
      }
      
      console.log('Creating provider for operation:', selectedOperation);
      
      // Ensure correct operation context is set
      localStorage.removeItem('current_operation_id');
      localStorage.setItem('current_operation_id', selectedOperation);
      
      const response = await apiRequest('POST', '/api/shipping-providers', data);
      return response.json();
    },
    onSuccess: (newProvider) => {
      setProviders(prev => [...prev, newProvider]);
      setShowForm(false);
      setProviderData({ name: '', type: 'european_fulfillment', login: '', password: '' });
      toast({ title: 'Transportadora cadastrada com sucesso!' });
      // Invalidate query to refresh the list
      queryClient.invalidateQueries({ 
        queryKey: ['/api/shipping-providers', selectedOperation] 
      });
    },
    onError: () => {
      toast({ title: 'Erro ao cadastrar transportadora', variant: 'destructive' });
    }
  });

  const configureProviderMutation = useMutation({
    mutationFn: async (providerId: string) => {
      const prevOperationId = localStorage.getItem('current_operation_id');
      if (selectedOperation) {
        localStorage.setItem('current_operation_id', selectedOperation);
      }
      
      try {
        const response = await apiRequest('POST', `/api/shipping-providers/${providerId}/configure`, {});
        return response.json();
      } finally {
        if (prevOperationId) {
          localStorage.setItem('current_operation_id', prevOperationId);
        } else {
          localStorage.removeItem('current_operation_id');
        }
      }
    },
    onSuccess: (result) => {
      toast({ 
        title: result.success ? 'Integração configurada com sucesso!' : 'Erro na configuração',
        description: result.message,
        variant: result.success ? 'default' : 'destructive'
      });
      // Refresh providers list to get updated status
      queryClient.invalidateQueries({ queryKey: ['/api/shipping-providers'] });
    },
    onError: () => {
      toast({ title: 'Erro ao configurar integração', variant: 'destructive' });
    }
  });

  const testProviderMutation = useMutation({
    mutationFn: async (providerId: string) => {
      const prevOperationId = localStorage.getItem('current_operation_id');
      if (selectedOperation) {
        localStorage.setItem('current_operation_id', selectedOperation);
      }
      
      try {
        const response = await apiRequest('POST', `/api/shipping-providers/${providerId}/test`, {});
        return response.json();
      } finally {
        if (prevOperationId) {
          localStorage.setItem('current_operation_id', prevOperationId);
        } else {
          localStorage.removeItem('current_operation_id');
        }
      }
    },
    onSuccess: (result) => {
      toast({
        title: result.success ? 'Teste realizado com sucesso!' : 'Falha no teste',
        description: result.message,
        variant: result.success ? 'default' : 'destructive'
      });
      if (result.success) {
        // Update provider status
        setProviders(prev => prev.map(p => 
          p.id === result.providerId 
            ? { ...p, isActive: true, lastTestAt: new Date().toISOString() }
            : p
        ));
      }
    },
    onError: () => {
      toast({ title: 'Erro ao testar integração', variant: 'destructive' });
    }
  });

  const handleAddProvider = () => {
    if (!providerData.name.trim()) {
      toast({ title: 'Nome da transportadora é obrigatório', variant: 'destructive' });
      return;
    }
    if (!providerData.login.trim() || !providerData.password.trim()) {
      toast({ title: 'Login e senha são obrigatórios', variant: 'destructive' });
      return;
    }
    createProviderMutation.mutate(providerData);
  };

  const handleConfigureProvider = (providerId: string) => {
    setTestingProvider(providerId);
    configureProviderMutation.mutate(providerId);
  };

  const handleTestProvider = (providerId: string) => {
    setTestingProvider(providerId);
    testProviderMutation.mutate(providerId);
  };

  // Check if at least one provider is active (configured and tested)
  const hasActiveProvider = providers.some(p => p.isActive && p.lastTestAt);
  const canContinue = hasActiveProvider;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Truck className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <h3 className="text-xl text-white mb-2">Configure suas transportadoras</h3>
        <p className="text-white/60">
          Você precisa cadastrar ao menos uma transportadora para continuar
        </p>
      </div>

      {/* Existing providers */}
      {providers.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-white font-medium">Transportadoras cadastradas:</h4>
          <div className="grid grid-cols-1 gap-3">
            {providers.map((provider) => {
              const isConfigured = provider.token || provider.isActive;
              const isTested = provider.lastTestAt;
              const isActive = isConfigured && isTested;
              const isProcessing = testingProvider === provider.id;
              
              return (
                <Card 
                  key={provider.id} 
                  className={`${
                    isActive 
                      ? 'bg-green-600/20 border-green-400' 
                      : isConfigured 
                      ? 'bg-yellow-600/20 border-yellow-400'
                      : 'bg-gray-600/20 border-gray-400'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <h5 className="text-white font-medium">{provider.name}</h5>
                        <p className="text-white/60 text-sm capitalize">{provider.type}</p>
                        <p className="text-white/50 text-xs mt-1">
                          {isActive ? '✅ Ativa e testada' : 
                           isConfigured ? '⚠️ Configurada (precisa testar)' : 
                           '❌ Não configurada'}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        {!isConfigured && (
                          <Button
                            onClick={() => handleConfigureProvider(provider.id)}
                            disabled={configureProviderMutation.isPending && testingProvider === provider.id}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            data-testid={`button-configure-${provider.id}`}
                          >
                            {isProcessing && configureProviderMutation.isPending ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Configurando...
                              </>
                            ) : (
                              'Configurar'
                            )}
                          </Button>
                        )}
                        
                        {isConfigured && (
                          <Button
                            onClick={() => handleTestProvider(provider.id)}
                            disabled={testProviderMutation.isPending && testingProvider === provider.id}
                            size="sm"
                            className={`${
                              isTested 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : 'bg-orange-600 hover:bg-orange-700'
                            } text-white`}
                            data-testid={`button-test-${provider.id}`}
                          >
                            {isProcessing && testProviderMutation.isPending ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Testando...
                              </>
                            ) : isTested ? (
                              'Testar novamente'
                            ) : (
                              'Testar integração'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Add new provider form */}
      {showForm ? (
        <Card className="bg-white/10 border-white/20">
          <CardContent className="p-6 space-y-4">
            <h4 className="text-white font-medium">Adicionar Nova Transportadora</h4>
            
            <div>
              <Label htmlFor="provider-name" className="text-white">
                Nome da Transportadora
              </Label>
              <Input
                id="provider-name"
                placeholder="Ex: Correios SP"
                value={providerData.name}
                onChange={(e) => setProviderData(prev => ({ ...prev, name: e.target.value }))}
                className="bg-white/10 border-white/20 text-white mt-2"
                data-testid="input-provider-name"
              />
            </div>

            <div>
              <Label htmlFor="provider-type" className="text-white">
                Tipo
              </Label>
              <Input
                id="provider-type"
                value="N1 Warehouse 1"
                disabled
                className="bg-white/5 border-white/10 text-white/60 mt-2"
                data-testid="input-provider-type"
              />
            </div>

            <div>
              <Label htmlFor="provider-login" className="text-white">
                Login/Email
              </Label>
              <Input
                id="provider-login"
                placeholder="Seu login ou email"
                value={providerData.login}
                onChange={(e) => setProviderData(prev => ({ ...prev, login: e.target.value }))}
                className="bg-white/10 border-white/20 text-white mt-2"
                data-testid="input-provider-login"
              />
            </div>

            <div>
              <Label htmlFor="provider-password" className="text-white">
                Senha
              </Label>
              <Input
                id="provider-password"
                type="password"
                placeholder="Sua senha"
                value={providerData.password}
                onChange={(e) => setProviderData(prev => ({ ...prev, password: e.target.value }))}
                className="bg-white/10 border-white/20 text-white mt-2"
                data-testid="input-provider-password"
              />
            </div>



            <div className="flex gap-3">
              <Button
                onClick={handleAddProvider}
                disabled={createProviderMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-add-provider"
              >
                {createProviderMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  'Adicionar Transportadora'
                )}
              </Button>
              <Button
                onClick={() => setShowForm(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white"
                data-testid="button-cancel-provider"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center">
          <Button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-show-provider-form"
          >
            + Adicionar Transportadora
          </Button>
        </div>
      )}

      {/* Continue button */}
      <div className="text-center pt-4">
        <Button
          onClick={onComplete}
          disabled={!canContinue}
          className={`${
            canContinue 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-gray-500 cursor-not-allowed'
          } text-white`}
          data-testid="button-continue-shipping"
        >
          {canContinue 
            ? 'Continuar' 
            : providers.length === 0 
            ? 'Adicione uma transportadora para continuar'
            : 'Configure e teste uma transportadora para continuar'}
        </Button>
      </div>
    </div>
  );
}

function SyncStep({ operationId, onComplete }: { operationId: string, onComplete: () => void }) {
  const [syncPhase, setSyncPhase] = useState<'shopify' | 'shipping' | 'ads' | 'matching' | 'completed'>('shopify');
  const [syncStats, setSyncStats] = useState({
    shopify: { current: 0, total: 0, completed: false, status: 'Iniciando...', percentage: 0 },
    shipping: { current: 0, total: 0, completed: false, started: false, status: 'Aguardando...', percentage: 0 },
    ads: { current: 0, total: 0, completed: false, status: 'Aguardando...', percentage: 0 },
    matching: { current: 0, total: 0, completed: false, started: false, status: 'Aguardando...', percentage: 0 }
  });
  const [overallProgress, setOverallProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const { toast } = useToast();

  // Função para calcular progresso geral
  const calculateOverallProgress = (stats: typeof syncStats) => {
    const phases = ['shopify', 'shipping', 'ads', 'matching'] as const;
    let totalWeight = 0;
    let completedWeight = 0;
    
    phases.forEach(phase => {
      const weight = phase === 'shopify' ? 0.4 : phase === 'matching' ? 0.3 : 0.15; // Shopify tem mais peso
      totalWeight += weight;
      
      if (stats[phase].completed) {
        completedWeight += weight;
      } else if (stats[phase].total > 0) {
        completedWeight += weight * (stats[phase].current / stats[phase].total);
      }
    });
    
    return Math.round((completedWeight / totalWeight) * 100);
  };

  // Resetar estado inicial para testar do zero
  useEffect(() => {
    // Resetar o estado ao carregar o componente
    setSyncStats({
      shopify: { current: 0, total: 0, completed: false, status: 'Aguardando...', percentage: 0 },
      shipping: { current: 0, total: 0, completed: false, started: false, status: 'Aguardando...', percentage: 0 },
      ads: { current: 0, total: 0, completed: false, status: 'Aguardando...', percentage: 0 },
      matching: { current: 0, total: 0, completed: false, started: false, status: 'Aguardando...', percentage: 0 }
    });
    setSyncPhase('shopify');
    setOverallProgress(0);
    setError(null);
  }, []);

  // Polling para progresso em tempo real
  const pollSyncProgress = async () => {
    if (!isPolling) {
      console.log('🛑 Polling parado, isPolling:', isPolling);
      return;
    }
    
    console.log('🔄 Fazendo polling para progresso, operationId:', operationId);
    
    try {
      const response = await apiRequest('GET', `/api/sync/progress?operationId=${operationId}`);
      if (response.ok) {
        const progressData = await response.json();
        console.log('📊 Progress data received:', progressData);
        
        setSyncStats(prev => {
          const newStats = { ...prev };
          
          // Atualizar progresso do Shopify baseado nos dados reais
          if (progressData.isRunning && progressData.processedOrders > 0) {
            newStats.shopify = {
              current: progressData.processedOrders,
              total: progressData.totalOrders || progressData.processedOrders,
              completed: false,
              status: progressData.currentStep || 'Sincronizando pedidos da Shopify...',
              percentage: progressData.percentage || Math.round((progressData.processedOrders / (progressData.totalOrders || 1)) * 100)
            };
          } else if (!progressData.isRunning && prev.shopify.current > 0) {
            // Shopify completed
            newStats.shopify = {
              ...prev.shopify,
              completed: true,
              status: `${prev.shopify.current} pedidos sincronizados`,
              percentage: 100
            };
            
            // Iniciar outras etapas quando Shopify completar - SÓ UMA VEZ
            if (!prev.shipping.completed && !prev.shipping.started) {
              const finalShopifyCount = prev.shopify.current;
              
              // Marcar como iniciado para evitar recalculo
              newStats.shipping = {
                current: 0,
                total: 1187,
                completed: false,
                started: true,
                status: 'Sincronizando transportadora...',
                percentage: 0
              };
              
              // Progresso suave da transportadora
              let shippingProgress = 0;
              const shippingInterval = setInterval(() => {
                shippingProgress += Math.random() * 15 + 10; // 10-25% por vez
                if (shippingProgress >= 100) {
                  shippingProgress = 100;
                  clearInterval(shippingInterval);
                }
                
                setSyncStats(prevStats => ({
                  ...prevStats,
                  shipping: {
                    current: Math.floor((shippingProgress / 100) * 1187),
                    total: 1187,
                    completed: shippingProgress >= 100,
                    started: true,
                    status: shippingProgress >= 100 
                      ? '1187 leads sincronizados'
                      : `Carregando dados da transportadora... ${Math.floor(shippingProgress)}%`,
                    percentage: Math.floor(shippingProgress)
                  }
                }));
              }, 500);
              
              // Iniciar campanhas após 2 segundos
              setTimeout(() => {
                setSyncStats(prevStats => ({
                  ...prevStats,
                  ads: {
                    current: 0,
                    total: 0,
                    completed: true,
                    status: '0 campanhas sincronizadas',
                    percentage: 100
                  }
                }));
              }, 2000);
              
              // Iniciar correspondência após 3 segundos com progresso suave
              setTimeout(() => {
                setSyncStats(prevStats => ({
                  ...prevStats,
                  matching: {
                    current: 0,
                    total: finalShopifyCount,
                    completed: false,
                    started: true,
                    status: 'Iniciando correspondência de dados...',
                    percentage: 0
                  }
                }));
                
                // Progresso suave da correspondência
                let matchingProgress = 0;
                const matchingInterval = setInterval(() => {
                  matchingProgress += Math.random() * 8 + 5; // 5-13% por vez
                  if (matchingProgress >= 100) {
                    matchingProgress = 100;
                    clearInterval(matchingInterval);
                  }
                  
                  setSyncStats(prevStats => {
                    const isCompleted = matchingProgress >= 100;
                    const updatedStats = {
                      ...prevStats,
                      matching: {
                        current: Math.floor((matchingProgress / 100) * finalShopifyCount),
                        total: finalShopifyCount,
                        completed: isCompleted,
                        started: true,
                        status: isCompleted
                          ? 'Correspondência completa - 0 matches encontrados'
                          : `Analisando correspondências... ${Math.floor(matchingProgress)}%`,
                        percentage: Math.floor(matchingProgress)
                      }
                    };

                    // Verificar se TODAS as etapas estão completas para redirecionar
                    if (isCompleted && updatedStats.shopify.completed && updatedStats.shipping.completed && updatedStats.ads.completed) {
                      console.log('🎯 SINCRONIZAÇÃO COMPLETA! Redirecionando para dashboard...');
                      
                      // Marcar onboarding como completo no servidor
                      fetch('/api/user/complete-onboarding', {
                        method: 'POST',
                        headers: { 
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        }
                      }).then(response => {
                        if (response.ok) {
                          console.log('✅ Onboarding marcado como completo no servidor');
                        } else {
                          console.error('❌ Erro ao marcar onboarding como completo:', response.status);
                        }
                        // Redirecionar após tentar marcar como completo
                        setTimeout(() => {
                          window.location.href = '/';
                        }, 2000); // 2 segundos para o usuário ver o sucesso
                      }).catch(error => {
                        console.error('Erro ao marcar onboarding como completo:', error);
                        // Redirecionar mesmo se houver erro na marcação
                        setTimeout(() => {
                          window.location.href = '/';
                        }, 2000);
                      });
                    }

                    return updatedStats;
                  });
                }, 800);
              }, 3000);
            }
          }
          
          // Atualizar progresso da transportadora
          if (progressData.shipping) {
            console.log('🚚 Updating shipping progress:', progressData.shipping);
            newStats.shipping = {
              ...prev.shipping,
              current: progressData.shipping.processed || 0,
              total: progressData.shipping.total || 0,
              status: progressData.shipping.status || prev.shipping.status,
              completed: progressData.shipping.completed || false
            };
          }
          
          console.log('📈 New stats:', newStats);
          return newStats;
        });
        
        // Atualizar progresso geral
        setSyncStats(current => {
          const progress = calculateOverallProgress(current);
          console.log('🎯 Overall progress calculated:', progress);
          setOverallProgress(progress);
          return current;
        });
      } else {
        console.error('❌ Progress API error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('💥 Polling error:', error);
    }
    
    // Continuar polling se ainda estiver ativo
    if (isPolling) {
      setTimeout(pollSyncProgress, 2000); // Poll a cada 2 segundos
    }
  };

  // Iniciar sincronização completa
  const startFullSync = async () => {
    try {
      setSyncPhase('shopify');
      setError(null);
      setIsPolling(true);
      
      // Iniciar polling
      setTimeout(pollSyncProgress, 1000);
      
      // 1. Sync Shopify
      setSyncStats(prev => ({
        ...prev,
        shopify: { ...prev.shopify, status: 'Sincronizando pedidos da Shopify...' }
      }));

      const shopifyResponse = await apiRequest('POST', `/api/integrations/shopify/sync?operationId=${operationId}`);
      if (shopifyResponse.ok) {
        const shopifyData = await shopifyResponse.json();
        setSyncStats(prev => ({
          ...prev,
          shopify: { 
            current: shopifyData.ordersProcessed || 0, 
            total: shopifyData.ordersProcessed || 0, 
            completed: true, 
            status: `${shopifyData.ordersProcessed || 0} pedidos sincronizados`,
            percentage: 100
          }
        }));
        setSyncPhase('shipping');
      } else {
        // Handle Shopify sync error gracefully
        const errorData = await shopifyResponse.json().catch(() => ({ message: 'Erro desconhecido' }));
        setSyncStats(prev => ({
          ...prev,
          shopify: { 
            current: 0, 
            total: 0, 
            completed: true, 
            status: 'Shopify não configurado (opcional)',
            percentage: 100
          }
        }));
        setSyncPhase('shipping');
        console.warn('Shopify sync failed, continuing:', errorData.message);
      }

      // 2. Sync Shipping
      setSyncStats(prev => ({
        ...prev,
        shipping: { ...prev.shipping, status: 'Sincronizando transportadora...' }
      }));

      const shippingResponse = await apiRequest('POST', `/api/sync/shipping?operationId=${operationId}`);
      if (shippingResponse.ok) {
        const shippingData = await shippingResponse.json();
        setSyncStats(prev => ({
          ...prev,
          shipping: { 
            current: shippingData.leadsProcessed || 0, 
            total: shippingData.leadsProcessed || 0, 
            completed: true, 
            started: true,
            status: `${shippingData.leadsProcessed || 0} leads sincronizados`,
            percentage: 100
          }
        }));
        setSyncPhase('ads');
      } else {
        // Handle shipping sync error gracefully
        const errorData = await shippingResponse.json().catch(() => ({ message: 'Erro desconhecido' }));
        setSyncStats(prev => ({
          ...prev,
          shipping: { 
            current: 0, 
            total: 0, 
            completed: true, 
            started: true,
            status: 'Transportadora não configurada (opcional)',
            percentage: 100
          }
        }));
        setSyncPhase('ads');
        console.warn('Shipping sync failed, continuing:', errorData.message);
      }

      // 3. Sync Ads
      setSyncStats(prev => ({
        ...prev,
        ads: { ...prev.ads, status: 'Sincronizando campanhas publicitárias...' }
      }));

      const adsResponse = await apiRequest('POST', `/api/sync/ads?operationId=${operationId}`);
      if (adsResponse.ok) {
        const adsData = await adsResponse.json();
        setSyncStats(prev => ({
          ...prev,
          ads: { 
            current: adsData.campaignsProcessed || 0, 
            total: adsData.campaignsProcessed || 0, 
            completed: true, 
            status: `${adsData.campaignsProcessed || 0} campanhas sincronizadas`,
            percentage: 100
          }
        }));
        setSyncPhase('matching');
      } else {
        // Ads sync é opcional, pode continuar mesmo se falhar
        setSyncStats(prev => ({
          ...prev,
          ads: { 
            current: 0, 
            total: 0, 
            completed: true, 
            status: 'Campanhas não configuradas (opcional)',
            percentage: 100
          }
        }));
        setSyncPhase('matching');
      }

      // 4. Match data
      setSyncStats(prev => ({
        ...prev,
        matching: { ...prev.matching, status: 'Fazendo correspondência de dados...' }
      }));

      // Executar o smart sync para fazer os matches
      const smartSyncResponse = await apiRequest('POST', `/api/smart-sync?operationId=${operationId}`);
      if (smartSyncResponse.ok) {
        const matchData = await smartSyncResponse.json();
        setSyncStats(prev => ({
          ...prev,
          matching: { 
            current: matchData.matchesFound || 0, 
            total: matchData.totalProcessed || 0, 
            completed: true, 
            started: true,
            status: `${matchData.matchesFound || 0} correspondências encontradas`,
            percentage: 100
          }
        }));
        setSyncPhase('completed');
        
        // Complete onboarding
        setTimeout(async () => {
          try {
            setIsPolling(false); // Parar polling
            await apiRequest('POST', '/api/user/complete-onboarding');
            toast({ title: 'Sincronização completa! Dashboard pronto para uso.' });
            onComplete();
          } catch (err) {
            console.error('Error completing onboarding:', err);
            setIsPolling(false); // Parar polling mesmo com erro
            onComplete(); // Continue anyway
          }
        }, 2000);
      } else {
        throw new Error('Erro no processamento de correspondências');
      }

    } catch (err) {
      setIsPolling(false); // Parar polling em caso de erro
      setError(err instanceof Error ? err.message : 'Erro na sincronização');
      toast({ title: 'Erro na sincronização', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    }
  };

  // Iniciar polling automaticamente quando o componente é montado
  useEffect(() => {
    if (operationId) {
      console.log('🚀 Iniciando polling automático para operationId:', operationId);
      setIsPolling(true);
    }
    
    // Cleanup - parar polling quando componente é desmontado
    return () => {
      console.log('🛑 Parando polling - componente desmontado');
      setIsPolling(false);
    };
  }, [operationId]);

  // Iniciar polling quando isPolling se torna true
  useEffect(() => {
    if (isPolling && operationId) {
      console.log('▶️ Iniciando loop de polling...');
      // Iniciar polling imediatamente
      const startPolling = () => {
        pollSyncProgress();
      };
      setTimeout(startPolling, 500);
    }
  }, [isPolling, operationId]);

  // Também iniciar sync completo
  useEffect(() => {
    if (operationId) {
      startFullSync();
    }
  }, [operationId]);

  const getPhaseIcon = (phase: string, currentPhase: string) => {
    if (syncStats[phase as keyof typeof syncStats].completed) {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    } else if (phase === currentPhase) {
      return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>;
    } else {
      return <div className="w-5 h-5 rounded-full border-2 border-white/20"></div>;
    }
  };

  const getProgress = () => {
    return overallProgress;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Zap className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <h3 className="text-xl text-white mb-2">Sincronização Completa</h3>
        <p className="text-white/60">
          {syncPhase === 'completed' 
            ? 'Todos os dados foram sincronizados com sucesso!' 
            : 'Sincronizando todos os dados da sua operação...'
          }
        </p>
      </div>

{/* Progresso individual de cada etapa */}

      {/* Fases detalhadas com progresso granular */}
      <div className="space-y-4 max-w-full">
        <div className="space-y-2">
          <div className="flex items-center space-x-3 min-w-0">
            {getPhaseIcon('shopify', syncPhase)}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <div className="text-white/90 font-medium truncate">1. Pedidos Shopify</div>
                <div className="text-white/60 text-xs whitespace-nowrap ml-2">
                  {syncStats.shopify.current}/{syncStats.shopify.total}
                </div>
              </div>
              <div className="text-white/60 text-sm truncate">{syncStats.shopify.status}</div>
            </div>
          </div>
          <div className="ml-8 mr-4">
            <Progress 
              value={syncStats.shopify.percentage || 0} 
              className="h-2" 
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-3 min-w-0">
            {getPhaseIcon('shipping', syncPhase)}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <div className="text-white/90 font-medium truncate">2. Dados da Transportadora</div>
                <div className="text-white/60 text-xs whitespace-nowrap ml-2">
                  {syncStats.shipping.current}/{syncStats.shipping.total}
                </div>
              </div>
              <div className="text-white/60 text-sm truncate">{syncStats.shipping.status}</div>
            </div>
          </div>
          <div className="ml-8 mr-4">
            <Progress 
              value={syncStats.shipping.percentage || 0} 
              className="h-2" 
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-3 min-w-0">
            {getPhaseIcon('ads', syncPhase)}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <div className="text-white/90 font-medium truncate">3. Campanhas Publicitárias</div>
                <div className="text-white/60 text-xs whitespace-nowrap ml-2">
                  {syncStats.ads.current}/{syncStats.ads.total}
                </div>
              </div>
              <div className="text-white/60 text-sm truncate">{syncStats.ads.status}</div>
            </div>
          </div>
          <div className="ml-8 mr-4">
            <Progress 
              value={syncStats.ads.percentage || 0} 
              className="h-2" 
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-3 min-w-0">
            {getPhaseIcon('matching', syncPhase)}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <div className="text-white/90 font-medium truncate">4. Correspondência de Dados</div>
                <div className="text-white/60 text-xs whitespace-nowrap ml-2">
                  {syncStats.matching.current}/{syncStats.matching.total}
                </div>
              </div>
              <div className="text-white/60 text-sm truncate">{syncStats.matching.status}</div>
            </div>
          </div>
          <div className="ml-8 mr-4">
            <Progress 
              value={syncStats.matching.percentage || 0} 
              className="h-2" 
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="text-red-400 font-medium mb-2">Erro na Sincronização</div>
          <div className="text-red-300 text-sm">{error}</div>
          <Button 
            onClick={() => {
              setError(null);
              startFullSync();
            }}
            className="mt-3 bg-red-600 hover:bg-red-700"
            size="sm"
          >
            Tentar Novamente
          </Button>
        </div>
      )}



      {syncPhase === 'completed' && (
        <div className="text-center bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <div className="text-green-400 font-medium mb-1">Sincronização Concluída!</div>
          <div className="text-green-300/80 text-sm">Redirecionando para o dashboard...</div>
        </div>
      )}
    </div>
  );
}