import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Circle, Loader2, Package, ShoppingCart, Truck, Target, Zap, X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

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

interface NewOperationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOperationCreated?: (operationId: string) => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  completed: boolean;
}

export function NewOperationDialog({ open, onOpenChange, onOperationCreated }: NewOperationDialogProps) {
  const [operationName, setOperationName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [operationId, setOperationId] = useState<string>('');
  const [completedSteps, setCompletedSteps] = useState({
    step1_operation: false,
    step2_shopify: false,
    step3_shipping: false,
    step4_ads: false,
    step5_sync: false
  });
  const { toast } = useToast();

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setOperationName('');
      setSelectedCountry('');
      setSelectedCurrency('');
      setCurrentStep(1);
      setOperationId('');
      setCompletedSteps({
        step1_operation: false,
        step2_shopify: false,
        step3_shipping: false,
        step4_ads: false,
        step5_sync: false
      });
    }
  }, [open]);

  // Auto-select currency when country changes
  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    const country = EUROPEAN_COUNTRIES.find(c => c.code === countryCode);
    if (country) {
      setSelectedCurrency(country.currency);
    }
  };

  const steps: OnboardingStep[] = [
    {
      id: 'step1_operation',
      title: 'Criar nova operação',
      description: 'Configure o nome da sua nova operação comercial',
      icon: Package,
      completed: completedSteps.step1_operation
    },
    {
      id: 'step2_shopify',
      title: 'Integração Shopify',
      description: 'Configure a integração com sua loja Shopify',
      icon: ShoppingCart,
      completed: completedSteps.step2_shopify
    },
    {
      id: 'step3_shipping',
      title: 'Provedor de envios',
      description: 'Configure as credenciais do provedor de envios',
      icon: Truck,
      completed: completedSteps.step3_shipping
    },
    {
      id: 'step4_ads',
      title: 'Integração de anúncios',
      description: 'Conecte suas contas de publicidade',
      icon: Target,
      completed: completedSteps.step4_ads
    },
    {
      id: 'step5_sync',
      title: 'Sincronização de dados',
      description: 'Importe seus pedidos e dados',
      icon: Zap,
      completed: completedSteps.step5_sync
    }
  ];

  // Create operation mutation
  const createOperationMutation = useMutation({
    mutationFn: async (data: { name: string; country: string; currency: string }) => {
      const response = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create operation');
      return response.json();
    },
    onSuccess: (response: any) => {
      setOperationId(response.id);
      setCompletedSteps(prev => ({ ...prev, step1_operation: true }));
      setCurrentStep(2);
      toast({
        title: "Operação criada com sucesso!",
        description: `A operação "${operationName}" foi criada.`,
      });
    },
    onError: (error: any) => {
      console.error('Erro ao criar operação:', error);
      toast({
        variant: "destructive",
        title: "Erro ao criar operação",
        description: error.message || "Ocorreu um erro inesperado.",
      });
    },
  });

  // Skip step mutation
  const skipStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const response = await fetch('/api/onboarding/skip-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId, operationId }),
      });
      if (!response.ok) throw new Error('Failed to skip step');
      return response.json();
    },
    onSuccess: (_, stepId) => {
      setCompletedSteps(prev => ({ ...prev, [stepId]: true }));
      
      // Move to next step
      if (currentStep < 5) {
        setCurrentStep(currentStep + 1);
      } else {
        // All steps completed
        toast({
          title: "Configuração concluída!",
          description: "Sua nova operação foi configurada com sucesso.",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
        onOperationCreated?.(operationId);
        onOpenChange(false);
      }
    },
    onError: (error: any) => {
      console.error('Erro ao pular etapa:', error);
      toast({
        variant: "destructive",
        title: "Erro ao pular etapa",
        description: error.message || "Ocorreu um erro inesperado.",
      });
    },
  });

  const handleCreateOperation = () => {
    if (!operationName.trim()) {
      toast({
        variant: "destructive",
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para a operação.",
      });
      return;
    }
    if (!selectedCountry || !selectedCurrency) {
      toast({
        variant: "destructive",
        title: "Seleções obrigatórias",
        description: "Por favor, selecione o país e a moeda.",
      });
      return;
    }

    createOperationMutation.mutate({
      name: operationName,
      country: selectedCountry,
      currency: selectedCurrency,
    });
  };

  const handleSkipStep = (stepId: string) => {
    skipStepMutation.mutate(stepId);
  };

  const handleCompleteSetup = () => {
    toast({
      title: "Configuração concluída!",
      description: "Sua nova operação foi configurada com sucesso.",
    });
    queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
    onOperationCreated?.(operationId);
    onOpenChange(false);
  };

  const progress = (completedSteps.step1_operation ? 20 : 0) +
                  (completedSteps.step2_shopify ? 20 : 0) +
                  (completedSteps.step3_shipping ? 20 : 0) +
                  (completedSteps.step4_ads ? 20 : 0) +
                  (completedSteps.step5_sync ? 20 : 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl text-white">
              Criar Nova Operação
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Progresso da configuração</span>
              <span className="text-gray-300">{Math.round(progress)}% concluído</span>
            </div>
            <Progress value={progress} className="w-full bg-gray-700" />
          </div>

          {/* Steps Overview */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index + 1 === currentStep;
              const isCompleted = step.completed;
              
              return (
                <div
                  key={step.id}
                  className={`text-center p-3 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-blue-600/20 border border-blue-500/30' 
                      : isCompleted 
                        ? 'bg-green-600/20 border border-green-500/30'
                        : 'bg-gray-800/50 border border-gray-700'
                  }`}
                >
                  <div className="flex justify-center mb-2">
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    ) : (
                      <StepIcon className={`w-6 h-6 ${
                        isActive ? 'text-blue-400' : 'text-gray-500'
                      }`} />
                    )}
                  </div>
                  <p className={`text-xs font-medium ${
                    isActive ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                {steps[currentStep - 1]?.icon && (() => {
                  const StepIcon = steps[currentStep - 1].icon;
                  return <StepIcon className="w-5 h-5 text-blue-400" />;
                })()}
                {steps[currentStep - 1]?.title}
              </CardTitle>
              <p className="text-gray-300">
                {steps[currentStep - 1]?.description}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white">Nome da Operação</Label>
                      <Input
                        type="text"
                        placeholder="Ex: Loja Europa"
                        value={operationName}
                        onChange={(e) => setOperationName(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white"
                        data-testid="input-operation-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">País</Label>
                      <Select value={selectedCountry} onValueChange={handleCountryChange}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue placeholder="Selecione o país" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {EUROPEAN_COUNTRIES.map((country) => (
                            <SelectItem 
                              key={country.code} 
                              value={country.code}
                              className="text-white hover:bg-gray-700"
                            >
                              {country.flag} {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-white">Moeda</Label>
                    <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Selecione a moeda" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {EUROPEAN_CURRENCIES.map((currency) => (
                          <SelectItem 
                            key={currency.code} 
                            value={currency.code}
                            className="text-white hover:bg-gray-700"
                          >
                            {currency.symbol} {currency.name} ({currency.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button
                    onClick={handleCreateOperation}
                    disabled={createOperationMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    data-testid="button-create-operation"
                  >
                    {createOperationMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando operação...
                      </>
                    ) : (
                      'Criar Operação'
                    )}
                  </Button>
                </div>
              )}

              {currentStep > 1 && currentStep <= 5 && (
                <div className="text-center space-y-4">
                  <p className="text-gray-300">
                    Esta etapa pode ser configurada posteriormente nas integrações.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => handleSkipStep(steps[currentStep - 1].id)}
                      disabled={skipStepMutation.isPending}
                      className="border-gray-600 text-white hover:bg-gray-700"
                    >
                      {skipStepMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Pulando...
                        </>
                      ) : (
                        'Pular por Agora'
                      )}
                    </Button>
                    {currentStep === 5 && (
                      <Button
                        onClick={handleCompleteSetup}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Concluir Configuração
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}