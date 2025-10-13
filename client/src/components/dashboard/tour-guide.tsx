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
      }, 800);
      
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
            Este tour tem 11 etapas e leva cerca de 2 minutos.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-testid="card-paid-revenue"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Receita Paga</h4>
          <p className="text-sm">
            Este card mostra a receita dos pedidos que já foram pagos.
            É a métrica mais importante para acompanhar seu fluxo de caixa real!
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-testid="card-product-costs-featured"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Custos de Produtos</h4>
          <p className="text-sm">
            Aqui você vê o total gasto com produtos vendidos.
            Importante para calcular sua margem de lucro.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
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
      disableBeacon: true,
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
      disableBeacon: true,
    },
    {
      target: '.recharts-wrapper',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Gráfico de Faturamento</h4>
          <p className="text-sm">
            Visualize a evolução do seu faturamento ao longo do tempo.
            Ideal para identificar tendências e padrões de crescimento.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
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
      disableBeacon: true,
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
      disableBeacon: true,
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
      placement: 'bottom',
      disableBeacon: true,
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
      disableBeacon: true,
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
      disableBeacon: true,
    },
  ];

  const getAllSteps = (): Step[] => {
    // Return steps based on current page
    if (currentPage === 'dashboard') {
      return getDashboardSteps();
    } else if (currentPage === 'integrations') {
      return getIntegrationsSteps();
    } else if (currentPage === 'ads') {
      return getAdsSteps();
    }
    
    return [];
  };

  const handleJoyrideCallback = useCallback(
    (data: CallBackProps) => {
      const { status, action, index, type } = data;
      
      console.log('🎯 Joyride callback:', { status, action, index, type, currentPage });
      
      // Se o tour foi completado ou pulado
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        console.log('✅ Tour finished or skipped');
        if (status === STATUS.SKIPPED) {
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

        console.log('➡️ Moving to next step:', { currentPage, index, dashboardLength: dashboardSteps.length });

        // Se terminou os steps do dashboard, vai para integrations
        if (currentPage === 'dashboard' && index === dashboardSteps.length - 1) {
          console.log('🔄 Navigating to integrations');
          setTimeout(() => {
            onNavigate('integrations');
          }, 300);
        }
        // Se terminou os steps de integrations, vai para ads
        else if (currentPage === 'integrations' && index === integrationsSteps.length - 1) {
          console.log('🔄 Navigating to ads');
          setTimeout(() => {
            onNavigate('ads');
          }, 300);
        }
        // Se terminou os steps de ads, completa o tour
        else if (currentPage === 'ads' && index === adsSteps.length - 1) {
          console.log('🎉 Tour completed!');
          setTimeout(() => {
            onComplete();
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
      scrollToFirstStep
      scrollOffset={100}
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
