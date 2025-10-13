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
            Vamos fazer um tour rápido pelos principais indicadores e funcionalidades da plataforma.
            Este tour tem 13 etapas e leva cerca de 3 minutos.
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
      target: '[data-testid="card-cpa-marketing"]',
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
      target: '[data-testid="card-orders-delivered"]',
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
    {
      target: '[data-tour-id="section-warehouses"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Integração com Armazéns</h4>
          <p className="text-sm">
            Configure suas transportadoras e armazéns para gestão completa de envios.
            Gerencie todo o processo logístico em um só lugar.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
    },
  ];

  const getFinalStep = (): Step[] => [
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

  const getAllSteps = (): Step[] => {
    // Return steps based on current page
    if (currentPage === 'dashboard') {
      return getDashboardSteps();
    } else if (currentPage === 'integrations') {
      return getIntegrationsSteps();
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

        console.log('➡️ Moving to next step:', { currentPage, index, dashboardLength: dashboardSteps.length });

        // Se terminou os steps do dashboard, vai para integrations
        if (currentPage === 'dashboard' && index === dashboardSteps.length - 1) {
          console.log('🔄 Navigating to integrations');
          setTimeout(() => {
            onNavigate('integrations');
          }, 300);
        }
        // Se terminou os steps de integrations, completa o tour
        else if (currentPage === 'integrations' && index === integrationsSteps.length - 1) {
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
