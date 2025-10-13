import { useCallback, useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

interface TourGuideProps {
  run: boolean;
  onComplete: () => void;
  onSkip: () => void;
  currentPage: 'dashboard' | 'integrations' | 'ads';
  onNavigate: (page: 'dashboard' | 'integrations' | 'ads') => void;
}

export function TourGuide({ run, onComplete, onSkip, currentPage, onNavigate }: TourGuideProps) {
  console.log('🎭 TourGuide render:', { run, currentPage });
  
  // Local state to handle delayed tour start
  const [isRunning, setIsRunning] = useState(false);
  
  useEffect(() => {
    console.log('🎯 TourGuide useEffect - run changed:', { run, currentPage });
    
    if (run && !isRunning) {
      // Small delay to ensure all elements are rendered
      const timer = setTimeout(() => {
        console.log('⏰ Starting tour after delay');
        setIsRunning(true);
      }, 500);
      
      return () => clearTimeout(timer);
    } else if (!run && isRunning) {
      setIsRunning(false);
    }
  }, [run, isRunning, currentPage]);
  
  const getDashboardSteps = (): Step[] => [
    {
      target: 'body',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold">Bem-vindo ao N1 Dashboard! 🎉</h3>
          <p className="text-sm">
            Vamos fazer um tour rápido pelas principais funcionalidades da plataforma.
            Você pode pular o tour a qualquer momento.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-testid="card-shopify-orders"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Faturamento e Pedidos</h4>
          <p className="text-sm">
            Este card mostra seu faturamento total e número de pedidos.
            Acompanhe o crescimento do seu negócio em tempo real!
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-testid="card-cpa-marketing"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">CPA e Marketing</h4>
          <p className="text-sm">
            Aqui você vê o Custo Por Aquisição (CPA) e o total gasto em marketing.
            Métricas essenciais para avaliar o desempenho das suas campanhas.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-testid="card-total-profit"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Lucro Total</h4>
          <p className="text-sm">
            O lucro líquido depois de descontar todos os custos (produtos, envio, marketing).
            Este é o indicador mais importante da saúde financeira do seu negócio.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-testid="card-taxa-entrega"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Taxa de Entrega</h4>
          <p className="text-sm">
            A porcentagem de pedidos que foram entregues com sucesso.
            Uma taxa alta indica boa qualidade logística e satisfação do cliente.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
  ];

  const getIntegrationsSteps = (): Step[] => [
    {
      target: '[data-tour-id="section-shopify"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Conecte sua Loja</h4>
          <p className="text-sm">
            Aqui você conecta sua loja Shopify ou CartPanda para sincronizar pedidos
            automaticamente. É o primeiro passo para começar a usar a plataforma!
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour-id="section-warehouses"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Configure Transportadoras</h4>
          <p className="text-sm">
            Adicione suas transportadoras para gestão de envios. Você pode conectar
            múltiplos armazéns e gerenciar todo o processo logístico em um só lugar.
          </p>
        </div>
      ),
      placement: 'right',
    },
  ];

  const getAdsSteps = (): Step[] => [
    {
      target: '[data-tour-id="section-ad-accounts"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Gerencie suas Campanhas</h4>
          <p className="text-sm">
            Conecte suas contas do Facebook Ads para acompanhar o desempenho das
            suas campanhas e otimizar seus anúncios diretamente na plataforma.
          </p>
        </div>
      ),
      placement: 'right',
    },
  ];

  const getOnboardingCardStep = (): Step[] => [
    {
      target: '[data-tour-id="onboarding-card"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Card de Progresso</h4>
          <p className="text-sm">
            Use este card para acompanhar seu progresso de configuração inicial.
            Ele desaparece automaticamente quando todas as integrações estiverem completas!
          </p>
        </div>
      ),
      placement: 'bottom',
    },
  ];

  const getFinalStep = (): Step[] => [
    {
      target: 'body',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold">Pronto! 🎊</h3>
          <p className="text-sm">
            Você concluiu o tour do N1 Dashboard. Agora você já conhece as principais
            funcionalidades da plataforma.
          </p>
          <p className="text-sm text-muted-foreground">
            Você pode refazer este tour a qualquer momento nas configurações.
          </p>
        </div>
      ),
      placement: 'center',
    },
  ];

  const getAllSteps = (): Step[] => {
    // Return all steps in the correct sequence for the current page
    const dashboardSteps = getDashboardSteps();
    const integrationsSteps = getIntegrationsSteps();
    const adsSteps = getAdsSteps();
    const onboardingSteps = getOnboardingCardStep();
    const finalSteps = getFinalStep();

    // Calculate the starting index based on current page
    if (currentPage === 'dashboard') {
      // Show dashboard steps only
      return dashboardSteps;
    } else if (currentPage === 'integrations') {
      // Show integrations steps only
      return integrationsSteps;
    } else if (currentPage === 'ads') {
      // Show ads steps only
      return adsSteps;
    }
    
    return [];
  };

  const handleJoyrideCallback = useCallback(
    (data: CallBackProps) => {
      const { status, action, index, type } = data;
      
      // Se o tour foi completado ou pulado
      if (status === 'finished' || status === 'skipped') {
        if (status === 'skipped') {
          onSkip();
        } else {
          onComplete();
        }
        return;
      }

      // Lógica de navegação entre páginas
      if (type === 'step:after' && action === 'next') {
        const dashboardSteps = getDashboardSteps();
        const integrationsSteps = getIntegrationsSteps();
        const adsSteps = getAdsSteps();

        // Se terminou os steps do dashboard, vai para integrations
        if (currentPage === 'dashboard' && index === dashboardSteps.length - 1) {
          setTimeout(() => {
            onNavigate('integrations');
          }, 300);
        }
        // Se terminou os steps de integrations, vai para ads
        else if (currentPage === 'integrations' && index === integrationsSteps.length - 1) {
          setTimeout(() => {
            onNavigate('ads');
          }, 300);
        }
        // Se terminou os steps de ads, volta para dashboard para mostrar onboarding card e step final
        else if (currentPage === 'ads' && index === adsSteps.length - 1) {
          setTimeout(() => {
            onNavigate('dashboard');
          }, 300);
        }
      }
    },
    [currentPage, onComplete, onSkip, onNavigate]
  );

  return (
    <Joyride
      steps={getAllSteps()}
      run={isRunning}
      continuous
      showProgress={false}
      showSkipButton
      callback={handleJoyrideCallback}
      disableOverlayClose
      disableCloseOnEsc={false}
      spotlightPadding={8}
      styles={{
        options: {
          arrowColor: '#1a1a1a',
          backgroundColor: '#1a1a1a',
          overlayColor: 'rgba(0, 0, 0, 0.7)',
          primaryColor: '#3b82f6',
          textColor: '#ffffff',
          zIndex: 10000,
        },
        tooltip: {
          backgroundColor: 'rgba(26, 26, 26, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 8px 32px rgba(31, 38, 135, 0.5)',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipTitle: {
          color: '#ffffff',
          fontSize: 18,
          fontWeight: 600,
          marginBottom: 12,
        },
        tooltipContent: {
          color: '#e5e7eb',
          fontSize: 14,
          lineHeight: 1.6,
        },
        buttonNext: {
          backgroundColor: '#3b82f6',
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: 14,
          fontWeight: 500,
          transition: 'all 0.2s',
        },
        buttonBack: {
          color: '#9ca3af',
          marginRight: 10,
          fontSize: 14,
        },
        buttonSkip: {
          color: '#9ca3af',
          fontSize: 14,
        },
        buttonClose: {
          color: '#ffffff',
        },
        spotlight: {
          borderRadius: 8,
        },
      }}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Finalizar',
        next: 'Próximo',
        skip: 'Pular tour',
        open: 'Abrir',
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
}
