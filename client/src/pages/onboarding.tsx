import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Loader2, Package, ShoppingCart, Truck, Target, Zap } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import logoImage from '@assets/COD DASHBOARD_1755806006009.png';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  completed: boolean;
}

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [operationName, setOperationName] = useState('');
  const { toast } = useToast();

  // Fetch user onboarding status
  const { data: userStatus } = useQuery({
    queryKey: ['/api/user/onboarding-status'],
  });

  const onboardingSteps = userStatus?.onboardingSteps || {
    step1_operation: false,
    step2_shopify: false,
    step3_shipping: false,
    step4_ads: false,
    step5_sync: false
  };

  // Check if user has completed onboarding
  useEffect(() => {
    if (userStatus?.onboardingCompleted) {
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
    mutationFn: async (name: string) => {
      const response = await apiRequest('POST', '/api/onboarding/create-operation', { name });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Operação criada com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['/api/user/onboarding-status'] });
      setCurrentStep(2);
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
    createOperationMutation.mutate(operationName);
  };

  const handleStepComplete = (stepId: string, nextStep: number) => {
    completeStepMutation.mutate(stepId);
    setCurrentStep(nextStep);
  };

  const progressPercentage = (steps.filter(s => s.completed).length / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Logo */}
        <div className="pt-4 pb-8">
          <img 
            src={logoImage} 
            alt="COD Dashboard" 
            className="mb-8 h-8 w-auto"
          />
          <div className="text-center">
            <p className="text-xl text-white/80 mb-6">
              Configure sua conta em 5 etapas simples
            </p>
            <Progress 
              value={progressPercentage} 
              className="w-full max-w-md mx-auto h-3"
            />
            <p className="text-white/60 mt-2">
              {Math.round(progressPercentage)}% concluído
            </p>
          </div>
        </div>

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

        {/* Current Step Content */}
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-2xl">
              {steps[currentStep - 1]?.title}
            </CardTitle>
            <p className="text-white/80">
              {steps[currentStep - 1]?.description}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Create Operation */}
            {currentStep === 1 && (
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
                <Button 
                  onClick={handleCreateOperation}
                  disabled={createOperationMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
            )}

            {/* Step 2: Shopify Integration */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <ShoppingCart className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                  <p className="text-white/80 mb-4">
                    Conecte sua loja Shopify para sincronizar produtos automaticamente
                  </p>
                  <p className="text-white/60 text-sm mb-6">
                    Você pode integrar agora ou configurar depois no dashboard
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button 
                      onClick={() => handleStepComplete('step2_shopify', 3)}
                      className="bg-gray-600 hover:bg-gray-700 text-white"
                      data-testid="button-skip-shopify"
                    >
                      Integrar Depois
                    </Button>
                    <Button 
                      onClick={() => handleStepComplete('step2_shopify', 3)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      data-testid="button-connect-shopify"
                    >
                      Conectar Shopify
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Shipping Integration */}
            {currentStep === 3 && (
              <ShippingStep onComplete={() => handleStepComplete('step3_shipping', 4)} />
            )}

            {/* Step 4: Ads Integration */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <Target className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                  <p className="text-white/80 mb-4">
                    Conecte suas contas de anúncios para calcular custos de marketing
                  </p>
                  <p className="text-white/60 text-sm mb-6">
                    Facebook Ads está disponível. Você pode configurar agora ou depois.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button 
                      onClick={() => handleStepComplete('step4_ads', 5)}
                      className="bg-gray-600 hover:bg-gray-700 text-white"
                      data-testid="button-skip-ads"
                    >
                      Configurar Depois
                    </Button>
                    <Button 
                      onClick={() => handleStepComplete('step4_ads', 5)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      data-testid="button-connect-ads"
                    >
                      Conectar Facebook Ads
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Final Sync */}
            {currentStep === 5 && (
              <SyncStep onComplete={() => setLocation('/')} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ShippingStep({ onComplete }: { onComplete: () => void }) {
  const [providers, setProviders] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [providerData, setProviderData] = useState({
    name: '',
    type: 'correios',
    login: '',
    password: '',
    apiKey: '',
    description: ''
  });
  const { toast } = useToast();

  // Fetch existing shipping providers
  const { data: existingProviders } = useQuery({
    queryKey: ['/api/shipping-providers'],
  });

  useEffect(() => {
    if (existingProviders) {
      setProviders(existingProviders);
    }
  }, [existingProviders]);

  const createProviderMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/shipping-providers', data);
      return response.json();
    },
    onSuccess: (newProvider) => {
      setProviders(prev => [...prev, newProvider]);
      setShowForm(false);
      setProviderData({ name: '', type: 'correios', login: '', password: '', apiKey: '', description: '' });
      toast({ title: 'Transportadora cadastrada com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao cadastrar transportadora', variant: 'destructive' });
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

  const canContinue = providers.length > 0;

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
            {providers.map((provider) => (
              <Card key={provider.id} className="bg-green-600/20 border-green-400">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h5 className="text-white font-medium">{provider.name}</h5>
                      <p className="text-white/60 text-sm">{provider.type}</p>
                    </div>
                    <div className="text-green-400">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
              <select
                id="provider-type"
                value={providerData.type}
                onChange={(e) => setProviderData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full mt-2 p-2 bg-white/10 border border-white/20 rounded-md text-white"
                data-testid="select-provider-type"
              >
                <option value="correios">Correios</option>
                <option value="jadlog">Jadlog</option>
                <option value="european_fulfillment">European Fulfillment</option>
                <option value="custom">Personalizada</option>
              </select>
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

            <div>
              <Label htmlFor="provider-api-key" className="text-white">
                Chave de API (opcional)
              </Label>
              <Input
                id="provider-api-key"
                placeholder="Sua chave de API (se disponível)"
                value={providerData.apiKey}
                onChange={(e) => setProviderData(prev => ({ ...prev, apiKey: e.target.value }))}
                className="bg-white/10 border-white/20 text-white mt-2"
                data-testid="input-provider-api-key"
              />
            </div>

            <div>
              <Label htmlFor="provider-description" className="text-white">
                Observações (opcional)
              </Label>
              <Input
                id="provider-description"
                placeholder="Observações sobre esta transportadora"
                value={providerData.description}
                onChange={(e) => setProviderData(prev => ({ ...prev, description: e.target.value }))}
                className="bg-white/10 border-white/20 text-white mt-2"
                data-testid="input-provider-description"
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
          {canContinue ? 'Continuar' : 'Adicione uma transportadora para continuar'}
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