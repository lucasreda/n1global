import { motion } from "framer-motion";
import { CheckCircle, Loader2, Circle, Store, Package } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "@/hooks/use-translation";

interface ShopifyProgress {
  processedOrders: number;
  totalOrders: number;
  newOrders: number;
  updatedOrders: number;
  currentPage: number;
  totalPages: number;
  percentage: number;
}

interface StagingProgress {
  processedLeads: number;
  totalLeads: number;
  newLeads: number;
  updatedLeads: number;
}

interface SyncTimelineProps {
  currentStep: 'shopify' | 'staging' | null;
  shopifyProgress: ShopifyProgress;
  stagingProgress: StagingProgress;
  phase: 'preparing' | 'syncing' | 'completed' | 'error';
}

export function SyncTimeline({
  currentStep,
  shopifyProgress,
  stagingProgress,
  phase
}: SyncTimelineProps) {
  const { t } = useTranslation();
  
  const steps = [
    {
      id: 'shopify',
      title: t('dashboard.syncTimeline.importShopifyOrders'),
      description: t('dashboard.syncTimeline.importShopifyDescription'),
      icon: Store,
      status: currentStep === 'shopify' 
        ? (phase === 'completed' ? 'completed' : 'running')
        : currentStep === 'staging' || phase === 'completed'
        ? 'completed'
        : 'pending',
      progress: shopifyProgress,
      formatProgress: (p: ShopifyProgress) => 
        `${p.processedOrders.toLocaleString()} / ${p.totalOrders.toLocaleString()} ${t('dashboard.syncTimeline.orders')}`
    },
    {
      id: 'staging',
      title: t('dashboard.syncTimeline.matchingCarrier'),
      description: t('dashboard.syncTimeline.matchingCarrierDescription'),
      icon: Package,
      status: currentStep === 'staging'
        ? (phase === 'completed' ? 'completed' : 'running')
        : phase === 'completed'
        ? 'completed'
        : 'pending',
      progress: stagingProgress,
      formatProgress: (p: StagingProgress) =>
        p.totalLeads > 0
          ? `${p.processedLeads.toLocaleString()} / ${p.totalLeads.toLocaleString()} ${t('dashboard.syncTimeline.matches')}`
          : t('dashboard.syncTimeline.noOrdersForMatching')
    }
  ];

  const getStepIcon = (step: typeof steps[0]) => {
    const Icon = step.icon;
    switch (step.status) {
      case 'completed':
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="flex items-center justify-center"
          >
            <CheckCircle className="w-6 h-6 text-green-500" />
          </motion.div>
        );
      case 'running':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="flex items-center justify-center"
          >
            <Loader2 className="w-6 h-6 text-blue-500" />
          </motion.div>
        );
      default:
        return <Circle className="w-6 h-6 text-muted-foreground" />;
    }
  };

  const getStepBorderColor = (step: typeof steps[0]) => {
    switch (step.status) {
      case 'completed':
        return 'border-green-500';
      case 'running':
        return 'border-blue-500';
      default:
        return 'border-border';
    }
  };

  const getStepBgColor = (step: typeof steps[0]) => {
    switch (step.status) {
      case 'completed':
        return 'bg-green-500/10';
      case 'running':
        return 'bg-blue-500/10';
      default:
        return 'bg-muted/30';
    }
  };

  const getConnectorColor = (index: number) => {
    if (index === 0 && steps[0].status === 'completed') {
      return 'bg-green-500';
    }
    if (index === 0 && steps[0].status === 'running') {
      return 'bg-blue-500';
    }
    if (index === 0) {
      return 'bg-border';
    }
    if (steps[0].status === 'completed' && steps[1].status === 'completed') {
      return 'bg-green-500';
    }
    if (steps[0].status === 'completed' && steps[1].status === 'running') {
      return 'bg-blue-500';
    }
    return 'bg-border';
  };

  return (
    <div className="space-y-6">
      {steps.map((step, index) => {
        // Garantir que o card de staging apareça como ativo quando não houver pedidos
        const isStagingWithNoLeads = step.id === 'staging' && stagingProgress.totalLeads === 0 && currentStep === 'staging' && phase === 'syncing';
        const isActive = step.status === 'running' || isStagingWithNoLeads;
        const isCompleted = step.status === 'completed';
        const progress = step.id === 'shopify' 
          ? shopifyProgress.percentage 
          : stagingProgress.totalLeads > 0
          ? Math.round((stagingProgress.processedLeads / stagingProgress.totalLeads) * 100)
          : 0;

        return (
          <div key={step.id} className="relative">
            {/* Connector line - REMOVIDO conforme solicitado */}

            {/* Step card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative z-10 flex gap-4 p-4 rounded-xl border-2 ${
                isActive ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20' : getStepBorderColor(step) + ' ' + getStepBgColor(step)
              } transition-all duration-300`}
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-1">
                {isStagingWithNoLeads ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="flex items-center justify-center"
                  >
                    <Loader2 className="w-6 h-6 text-blue-500" />
                  </motion.div>
                ) : (
                  getStepIcon(step)
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <h3 className={`font-semibold ${
                    (step.id === 'staging' && stagingProgress.totalLeads === 0 && currentStep === 'staging' && phase === 'syncing')
                      ? 'text-white'
                      : isActive 
                        ? 'text-blue-500' 
                        : isCompleted 
                          ? 'text-green-500' 
                          : 'text-foreground'
                  }`}>
                    {step.title}
                  </h3>
                  <p className={`text-sm ${
                    (step.id === 'staging' && stagingProgress.totalLeads === 0 && currentStep === 'staging' && phase === 'syncing')
                      ? 'text-white'
                      : 'text-muted-foreground'
                  }`}>
                    {step.description}
                  </p>
                </div>

                {/* Progress info */}
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2"
                  >
                    {/* Mostrar mensagem especial quando não houver pedidos para matching */}
                    {step.id === 'staging' && stagingProgress.totalLeads === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="text-sm text-white italic py-2"
                      >
                        {t('dashboard.syncTimeline.noOrdersUpdated')}
                      </motion.div>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              {step.formatProgress(step.progress as any)}
                            </span>
                            <span className="font-medium text-foreground">
                              {progress}%
                            </span>
                          </div>
                          <Progress 
                            value={progress} 
                            className="h-2"
                          />
                        </div>

                        {/* Statistics */}
                        {step.id === 'shopify' && (
                          <div className="flex gap-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">{t('dashboard.syncTimeline.new')}: </span>
                              <span className="font-medium text-green-600">
                                +{shopifyProgress.newOrders.toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('dashboard.syncTimeline.updated')}: </span>
                              <span className="font-medium text-blue-600">
                                ~{shopifyProgress.updatedOrders.toLocaleString()}
                              </span>
                            </div>
                            {shopifyProgress.totalPages > 0 && (
                              <div>
                                <span className="text-muted-foreground">{t('dashboard.syncTimeline.page')}: </span>
                                <span className="font-medium">
                                  {shopifyProgress.currentPage}/{shopifyProgress.totalPages}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {step.id === 'staging' && stagingProgress.totalLeads > 0 && (
                          <div className="flex gap-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">{t('dashboard.syncTimeline.new')}: </span>
                              <span className="font-medium text-green-600">
                                +{stagingProgress.newLeads.toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('dashboard.syncTimeline.updated')}: </span>
                              <span className="font-medium text-blue-600">
                                ~{stagingProgress.updatedLeads.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                )}

                {/* Completed stats */}
                {isCompleted && !isActive && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-4 text-xs text-muted-foreground"
                  >
                    <span>✓ {t('dashboard.syncTimeline.completed')}</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
