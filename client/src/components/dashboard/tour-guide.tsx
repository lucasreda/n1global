import { useCallback, useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

interface TourGuideProps {
  run: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onCloseSyncTour: () => void;
  currentPage: 'dashboard' | 'integrations' | 'ads' | 'sync-orders';
  onNavigate: (page: 'dashboard' | 'integrations' | 'ads' | 'sync-orders') => void;
}

export function TourGuide({ run, onComplete, onSkip, onCloseSyncTour, currentPage, onNavigate }: TourGuideProps) {
  console.log('🎭 TourGuide render:', { run, currentPage });
  
  // Local state to handle delayed tour start
  const [isRunning, setIsRunning] = useState(false);
  const [key, setKey] = useState(0); // Key to force remount
  
  useEffect(() => {
    console.log('🎯 TourGuide useEffect - run or page changed:', { run, currentPage, isRunning });
    
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
  }, [run, isRunning]);
  
  // Restart tour when page changes
  useEffect(() => {
    if (run && isRunning) {
      console.log('🔄 Page changed, restarting tour:', currentPage);
      setIsRunning(false);
      setKey(prev => prev + 1);
      
      const timer = setTimeout(() => {
        console.log('⏰ Restarting tour after page change');
        setIsRunning(true);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [currentPage]);
  
  const getDashboardSteps = (): Step[] => [
    {
      target: 'body',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold">Bem-vindo ao N1 Dashboard! 🎉</h3>
          <p className="text-sm">
            Vamos fazer um tour rápido pelos principais indicadores e funcionalidades da plataforma.
            Este tour tem 14 etapas e leva cerca de 3 minutos.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour-id="operation-selector-section"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold">Seletor de Operação 🏢</h3>
          <p className="text-sm">
            O primeiro passo é <strong>criar sua Operação de Negócio Digital</strong>!
          </p>
          <p className="text-sm">
            Uma operação representa um negócio ou marca específica. Você pode ter várias operações (ex: diferentes lojas, países ou marcas) e alternar entre elas facilmente.
          </p>
          <p className="text-sm text-blue-400">
            Use o botão "Criar Operação" logo abaixo para começar.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '[data-tour-id="card-shopify-orders-desktop"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Faturamento e Pedidos da Plataforma</h4>
          <p className="text-sm">
            Este card mostra o faturamento total e o número de pedidos importados da sua plataforma de vendas (Shopify/CartPanda).
            É o valor bruto antes de descontar custos.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour-id="card-cpa-marketing-desktop"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">CPA Anúncios e Marketing</h4>
          <p className="text-sm">
            Aqui você vê o custo por aquisição (CPA) dos anúncios e o total gasto em marketing.
            Ajuda a entender quanto você investe para conseguir cada pedido.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour-id="card-orders-delivered-desktop"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Pedidos N1</h4>
          <p className="text-sm">
            Total de pedidos confirmados pelo armazém e entregues ao cliente.
            Mostra quantos pedidos foram processados e completados com sucesso.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-testid="card-custos-retornados"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Custos Retornados</h4>
          <p className="text-sm">
            Valor total dos custos de pedidos que foram devolvidos ou cancelados.
            Importante para calcular o prejuízo com devoluções.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-testid="card-shipping-costs"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Custos de Envio</h4>
          <p className="text-sm">
            Total gasto com envios e frete dos pedidos.
            Uma das principais despesas operacionais do negócio.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-testid="card-product-costs"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Custos de Produtos</h4>
          <p className="text-sm">
            Valor total gasto com os produtos vendidos (custo de aquisição).
            Fundamental para calcular a margem de lucro bruta.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-testid="card-paid-revenue"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Receita Paga</h4>
          <p className="text-sm">
            Valor efetivamente recebido pelos pedidos que foram entregues.
            Este é o dinheiro real que entrou no caixa, diferente do faturamento bruto.
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
            Porcentagem de pedidos que foram entregues com sucesso em relação ao total.
            Quanto maior, melhor é sua operação logística e satisfação do cliente.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-testid="card-cac"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">CPA Real</h4>
          <p className="text-sm">
            Custo real por aquisição calculado com base nos pedidos efetivamente entregues.
            Métrica mais precisa do que o CPA de anúncios, pois considera apenas vendas concretizadas.
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
            O lucro líquido final depois de descontar TODOS os custos (produtos, envio, marketing, devoluções).
            Este é o indicador mais importante da saúde financeira do seu negócio! 💰
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
          <h4 className="font-semibold">Integração com Plataformas</h4>
          <p className="text-sm">
            Conecte sua loja Shopify ou CartPanda para sincronizar pedidos automaticamente.
            É o primeiro passo essencial para começar a usar a plataforma!
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
            Conecte suas contas do Facebook Ads para acompanhar o desempenho das campanhas
            e otimizar seus anúncios diretamente na plataforma.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: 'body',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold">Tour Concluído! 🎊</h3>
          <p className="text-sm">
            Você agora conhece todos os principais indicadores e funcionalidades do N1 Dashboard.
            Está pronto para começar a gerenciar seu negócio de forma profissional!
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

  const getSyncOrdersSteps = (): Step[] => [
    {
      target: '[data-testid="button-sync-complete"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold">Importe seus Pedidos! 📦</h3>
          <p className="text-sm">
            Agora que você configurou sua plataforma e armazém, clique em <strong>Sync Completo</strong> para importar todos os seus pedidos.
          </p>
          <p className="text-sm">
            Esta sincronização vai trazer os dados da sua plataforma (Shopify/CartPanda) e do armazém, permitindo que você gerencie tudo em um só lugar.
          </p>
          <p className="text-sm text-muted-foreground">
            Pode levar alguns minutos dependendo da quantidade de pedidos.
          </p>
        </div>
      ),
      placement: 'bottom',
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
    } else if (currentPage === 'sync-orders') {
      return getSyncOrdersSteps();
    }
    
    return [];
  };

  const handleJoyrideCallback = useCallback(
    (data: CallBackProps) => {
      const { status, action, index, type } = data;
      
      console.log('🎯 Joyride callback:', { status, action, index, type, currentPage });
      
      const dashboardSteps = getDashboardSteps();
      const integrationsSteps = getIntegrationsSteps();
      const adsSteps = getAdsSteps();
      const syncOrdersSteps = getSyncOrdersSteps();

      // Lógica de navegação entre páginas ANTES de verificar status
      if (type === 'step:after' && action === 'next') {
        console.log('➡️ Moving to next step:', { 
          currentPage, 
          index, 
          dashboardLength: dashboardSteps.length,
          integrationsLength: integrationsSteps.length,
          adsLength: adsSteps.length,
          syncOrdersLength: syncOrdersSteps.length
        });

        // Se é tour de sync-orders (apenas 1 step), apenas para o tour sem redirecionar
        if (currentPage === 'sync-orders' && index === syncOrdersSteps.length - 1) {
          console.log('✅ Sync tour completed! Closing without redirect.');
          setTimeout(() => {
            onCloseSyncTour(); // Usa closeSyncTour para fechar sem redirecionar
          }, 300);
          return;
        }
        // Se terminou os steps do dashboard, vai para integrations
        else if (currentPage === 'dashboard' && index === dashboardSteps.length - 1) {
          console.log('🔄 Navigating to integrations');
          setTimeout(() => {
            onNavigate('integrations');
          }, 300);
          return; // Previne que o onComplete seja chamado
        }
        // Se terminou os steps de integrations, vai para ads
        else if (currentPage === 'integrations' && index === integrationsSteps.length - 1) {
          console.log('🔄 Navigating to ads');
          setTimeout(() => {
            onNavigate('ads');
          }, 300);
          return; // Previne que o onComplete seja chamado
        }
        // Se terminou os steps de ads, completa o tour
        else if (currentPage === 'ads' && index === adsSteps.length - 1) {
          console.log('🎉 Tour completed! Calling onComplete');
          setTimeout(() => {
            onComplete();
          }, 300);
          return;
        }
      }
      
      // Se o tour foi pulado
      if (status === STATUS.SKIPPED) {
        console.log('⏭️ Tour skipped');
        onSkip();
        return;
      }

      // Se o tour foi completado naturalmente
      if (status === STATUS.FINISHED) {
        console.log('✅ Tour finished naturally');
        // Não faz nada aqui porque a navegação já foi tratada acima
        return;
      }
    },
    [currentPage, onComplete, onSkip, onNavigate]
  );

  // Get current step index for custom button labels
  const [stepIndex, setStepIndex] = useState(0);
  
  const customCallback = useCallback((data: CallBackProps) => {
    setStepIndex(data.index);
    handleJoyrideCallback(data);
  }, [handleJoyrideCallback]);

  // Determinar o label do botão baseado na página e índice
  const getButtonLabel = () => {
    const currentSteps = getAllSteps();
    const isLastStep = stepIndex === currentSteps.length - 1;
    
    // Se for sync-orders, mostrar "Fechar"
    if (currentPage === 'sync-orders' && isLastStep) {
      return 'Fechar';
    }
    
    // Se for o último step da página de Ads, mostrar "Finalizar"
    if (currentPage === 'ads' && isLastStep) {
      return 'Finalizar';
    }
    
    // Caso contrário, sempre mostrar "Próximo"
    return 'Próximo';
  };

  return (
    <Joyride
      key={key}
      steps={getAllSteps()}
      run={isRunning}
      continuous
      showProgress={false}
      showSkipButton
      callback={customCallback}
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
        last: getButtonLabel(),
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
