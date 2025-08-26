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
import logoImage from '@assets/COD DASHBOARD_1755806006009.png';

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
    // Haven't reached gradient part yet
    return displayedText;
  }
  
  // Split text into before gradient and gradient parts
  const beforeGradient = plain.slice(0, gradientStart);
  const gradientPart = displayedText.slice(gradientStart);
  
  return (
    <span>
      {beforeGradient}
      <span className="gradient-text">{gradientPart}</span>
    </span>
  );
}

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const [operationName, setOperationName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
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
                      <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Brain className="w-6 h-6 text-blue-400" />
                      </div>
                    </div>

                    <h2 className="text-2xl font-semibold text-white mb-3">
                      Quanto mais dados, mais inteligência
                    </h2>
                    <p className="text-white/70 text-base leading-relaxed mb-6 max-w-lg mx-auto">
                      Alimente a plataforma com informações da sua operação e obtenha insights precisos para decisões mais assertivas.
                    </p>
                  </CardContent>
                </Card>
                
                {/* Botão Continuar - Padrão da aplicação */}
                <div className="flex justify-center">
                  <Button 
                    onClick={handleContinueToStep1}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 font-medium rounded-lg transition-colors duration-200"
                    data-testid="button-continue-step1"
                  >
                    <ArrowRight className="w-5 h-5 mr-2" />
                    Começar Agora
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Steps Overview */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
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

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between text-white/60 text-sm mb-2">
                <span>Progresso do Onboarding</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Current Step Content */}
            <Card className="bg-white/10 border-white/20">
              <CardContent className="p-8">
                {currentStep === 1 && <OperationStep onComplete={() => handleStepComplete('step1_operation', 2)} />}
                {currentStep === 2 && <ShopifyStep onComplete={() => handleStepComplete('step2_shopify', 3)} />}
                {currentStep === 3 && <ShippingStep onComplete={() => handleStepComplete('step3_shipping', 4)} />}
                {currentStep === 4 && <AdAccountsStep onComplete={() => handleStepComplete('step4_ads', 5)} />}
                {currentStep === 5 && <SyncStep onComplete={() => handleStepComplete('step5_sync', 6)} />}
                {currentStep === 6 && (
                  <div className="text-center">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-xl text-white mb-4">Configuração Concluída!</h3>
                    <p className="text-white/60 mb-6">
                      Sua operação está configurada e pronta para uso.
                    </p>
                    <Button 
                      onClick={() => navigate('/')}
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

function OperationStep({ onComplete }: { onComplete: () => void }) {
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
    onSuccess: () => {
      toast({ title: 'Operação criada com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      onComplete();
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

function ShopifyStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <ShoppingCart className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <h3 className="text-xl text-white mb-2">Integração Shopify</h3>
        <p className="text-white/60">
          Conecte sua loja Shopify para sincronizar produtos automaticamente
        </p>
      </div>

      <div className="text-center py-8">
        <p className="text-white/80 mb-4">
          Conecte sua loja Shopify para sincronizar produtos automaticamente
        </p>
        <p className="text-white/60 text-sm mb-6">
          Você pode integrar agora ou configurar depois no dashboard
        </p>
        <div className="flex gap-4 justify-center">
          <Button 
            onClick={onComplete}
            className="bg-gray-600 hover:bg-gray-700 text-white"
            data-testid="button-skip-shopify"
          >
            Integrar Depois
          </Button>
          <Button 
            onClick={onComplete}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-connect-shopify"
          >
            Conectar Shopify
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
                value="European Fulfillment"
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

function SyncStep({ onComplete }: { onComplete: () => void }) {
  const [syncStatus, setSyncStatus] = useState({
    orders: { current: 0, total: 0, completed: false },
    campaigns: { current: 0, total: 0, completed: false }
  });
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const { toast } = useToast();

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/onboarding/sync-data', {});
      return response.json();
    },
    onSuccess: (data) => {
      setSyncStatus(data.status);
      if (data.status.orders.completed && data.status.campaigns.completed) {
        // Complete onboarding
        completeOnboardingMutation.mutate();
      } else if (retryCount < maxRetries) {
        // Retry if not completed
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          syncMutation.mutate();
        }, 2000);
      }
    },
    onError: () => {
      if (retryCount < maxRetries) {
        toast({ title: `Tentativa ${retryCount + 1}/${maxRetries} falhou, tentando novamente...` });
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          syncMutation.mutate();
        }, 2000);
      } else {
        toast({ title: 'Erro na sincronização', variant: 'destructive' });
      }
    }
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/onboarding/complete', {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Configuração concluída com sucesso!' });
      setTimeout(() => onComplete(), 1500);
    }
  });

  useEffect(() => {
    // Start sync on component mount
    syncMutation.mutate();
  }, []);

  const ordersProgress = syncStatus.orders.total > 0 
    ? (syncStatus.orders.current / syncStatus.orders.total) * 100 
    : 0;
  
  const campaignsProgress = syncStatus.campaigns.total > 0 
    ? (syncStatus.campaigns.current / syncStatus.campaigns.total) * 100 
    : 0;

  const overallCompleted = syncStatus.orders.completed && syncStatus.campaigns.completed;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Zap className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <h3 className="text-xl text-white mb-2">Sincronizando dados</h3>
        <p className="text-white/60">
          {overallCompleted 
            ? 'Sincronização concluída!' 
            : `Tentativa ${retryCount + 1}/${maxRetries + 1}`
          }
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-white/80 mb-2">
            <span>Pedidos sincronizados</span>
            <span>{syncStatus.orders.current}/{syncStatus.orders.total}</span>
          </div>
          <Progress value={ordersProgress} className="h-2" />
        </div>

        <div>
          <div className="flex justify-between text-white/80 mb-2">
            <span>Campanhas sincronizadas</span>
            <span>{syncStatus.campaigns.current}/{syncStatus.campaigns.total}</span>
          </div>
          <Progress value={campaignsProgress} className="h-2" />
        </div>
      </div>

      {syncMutation.isPending && (
        <div className="flex items-center justify-center text-white/60">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Sincronizando...
        </div>
      )}

      {overallCompleted && (
        <div className="text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <p className="text-green-400 font-medium">
            Configuração concluída! Redirecionando para o dashboard...
          </p>
        </div>
      )}
    </div>
  );
}