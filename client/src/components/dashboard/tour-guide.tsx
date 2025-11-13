import { useCallback, useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useTranslation } from '@/hooks/use-translation';

interface TourGuideProps {
  run: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onCloseSyncTour: () => void;
  currentPage: 'dashboard' | 'integrations' | 'ads' | 'sync-orders';
  onNavigate: (page: 'dashboard' | 'integrations' | 'ads' | 'sync-orders') => void;
}

export function TourGuide({ run, onComplete, onSkip, onCloseSyncTour, currentPage, onNavigate }: TourGuideProps) {
  const { t, currentLanguage } = useTranslation();
  console.log('🎭 TourGuide render:', { run, currentPage });
  
  // Local state to handle delayed tour start
  const [isRunning, setIsRunning] = useState(false);
  const [key, setKey] = useState(0); // Key to force remount
  
  // Force remount when language changes to update translations
  useEffect(() => {
    if (isRunning) {
      setKey(prev => prev + 1);
    }
  }, [currentLanguage]);
  
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
  
  const getDashboardSteps = useCallback((): Step[] => [
    {
      target: 'body',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold">{t('tour.dashboard.welcome')} 🎉</h3>
          <p className="text-sm">
            {t('tour.dashboard.welcomeDescription')}
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
          <h3 className="text-lg font-bold">{t('tour.dashboard.operationSelector')} 🏢</h3>
          <p className="text-sm">
            {t('tour.dashboard.operationSelectorStep1')}
          </p>
          <p className="text-sm">
            {t('tour.dashboard.operationSelectorStep2')}
          </p>
          <p className="text-sm text-blue-400">
            {t('tour.dashboard.operationSelectorStep3')}
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
          <h4 className="font-semibold">{t('tour.dashboard.platformRevenue')}</h4>
          <p className="text-sm">
            {t('tour.dashboard.platformRevenueDescription')}
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
          <h4 className="font-semibold">{t('tour.dashboard.cpaMarketing')}</h4>
          <p className="text-sm">
            {t('tour.dashboard.cpaMarketingDescription')}
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
          <h4 className="font-semibold">{t('tour.dashboard.n1Orders')}</h4>
          <p className="text-sm">
            {t('tour.dashboard.n1OrdersDescription')}
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
          <h4 className="font-semibold">{t('tour.dashboard.returnedCosts')}</h4>
          <p className="text-sm">
            {t('tour.dashboard.returnedCostsDescription')}
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
          <h4 className="font-semibold">{t('tour.dashboard.shippingCosts')}</h4>
          <p className="text-sm">
            {t('tour.dashboard.shippingCostsDescription')}
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
          <h4 className="font-semibold">{t('tour.dashboard.productCosts')}</h4>
          <p className="text-sm">
            {t('tour.dashboard.productCostsDescription')}
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
          <h4 className="font-semibold">{t('tour.dashboard.paidRevenue')}</h4>
          <p className="text-sm">
            {t('tour.dashboard.paidRevenueDescription')}
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
          <h4 className="font-semibold">{t('tour.dashboard.deliveryRate')}</h4>
          <p className="text-sm">
            {t('tour.dashboard.deliveryRateDescription')}
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
          <h4 className="font-semibold">{t('tour.dashboard.realCPA')}</h4>
          <p className="text-sm">
            {t('tour.dashboard.realCPADescription')}
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
          <h4 className="font-semibold">{t('tour.dashboard.totalProfit')}</h4>
          <p className="text-sm">
            {t('tour.dashboard.totalProfitDescription')} 💰
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
  ], [t]);

  const getIntegrationsSteps = useCallback((): Step[] => [
    {
      target: '[data-tour-id="section-shopify"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">{t('tour.integrations.platformIntegration')}</h4>
          <p className="text-sm">
            {t('tour.integrations.platformIntegrationDescription')}
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
    },
  ], [t]);

  const getAdsSteps = useCallback((): Step[] => [
    {
      target: '[data-tour-id="section-ad-accounts"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">{t('tour.ads.manageCampaigns')}</h4>
          <p className="text-sm">
            {t('tour.ads.manageCampaignsDescription')}
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
          <h3 className="text-lg font-bold">{t('tour.ads.completed')} 🎊</h3>
          <p className="text-sm">
            {t('tour.ads.completedDescription')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('tour.ads.completedFooter')}
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
  ], [t]);

  const getSyncOrdersSteps = useCallback((): Step[] => [
    {
      target: '[data-testid="button-sync-complete"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold">{t('tour.sync.importOrders')} 📦</h3>
          <p className="text-sm">
            {t('tour.sync.importOrdersDescription')}
          </p>
          <p className="text-sm">
            {t('tour.sync.importOrdersDescription2')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('tour.sync.importOrdersFooter')}
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
  ], [t]);

  const getAllSteps = useCallback((): Step[] => {
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
  }, [currentPage, getDashboardSteps, getIntegrationsSteps, getAdsSteps, getSyncOrdersSteps]);

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
    [currentPage, onComplete, onSkip, onNavigate, getDashboardSteps, getIntegrationsSteps, getAdsSteps, getSyncOrdersSteps]
  );

  // Get current step index for custom button labels
  const [stepIndex, setStepIndex] = useState(0);
  
  // Determinar o label do botão baseado na página e índice
  const getButtonLabel = useCallback(() => {
    const currentSteps = getAllSteps();
    const isLastStep = stepIndex === currentSteps.length - 1;
    
    // Se for sync-orders, mostrar "Fechar"
    if (currentPage === 'sync-orders' && isLastStep) {
      return t('tour.buttons.close');
    }
    
    // Se for o último step da página de Ads, mostrar "Finalizar"
    if (currentPage === 'ads' && isLastStep) {
      return t('tour.buttons.finish');
    }
    
    // Caso contrário, sempre mostrar "Próximo"
    return t('tour.buttons.next');
  }, [currentPage, stepIndex, getAllSteps, t]);
  
  const customCallback = useCallback((data: CallBackProps) => {
    setStepIndex(data.index);
    handleJoyrideCallback(data);
  }, [handleJoyrideCallback]);
  
  // Recalculate button label when step index or current page changes
  const buttonLabel = getButtonLabel();

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
        back: t('tour.buttons.back'),
        close: t('tour.buttons.close'),
        last: buttonLabel,
        next: t('tour.buttons.next'),
        skip: t('tour.buttons.skip'),
        open: t('tour.buttons.open'),
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
}
