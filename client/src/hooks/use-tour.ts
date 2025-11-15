import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from './use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useTranslation } from './use-translation';

export function useTour() {
  const { t } = useTranslation();
  const [isTourRunning, setIsTourRunning] = useState(false);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'integrations' | 'ads' | 'sync-orders'>('dashboard');
  const [tourWasCompletedOrSkipped, setTourWasCompletedOrSkipped] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  console.log('🎨 useTour hook state:', { isTourRunning, currentPage });

  // Mutation para completar o tour
  const completeTourMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/tour/complete', 'POST', {});
    },
    onSuccess: async () => {
      // Atualizar o cache manualmente ANTES de redirecionar
      queryClient.setQueryData(['/api/user'], (oldData: any) => {
        if (oldData) {
          return { ...oldData, tourCompleted: true };
        }
        return oldData;
      });
      
      // Forçar refetch para garantir sincronização
      await queryClient.refetchQueries({ queryKey: ['/api/user'] });
      
      toast({
        title: t('tour.toast.completed'),
        description: t('tour.toast.completedDescription'),
      });
      
      // Redirecionar para a página inicial
      setTimeout(() => {
        setLocation('/');
      }, 500);
    },
    onError: () => {
      toast({
        title: t('tour.toast.error'),
        description: t('tour.toast.errorSaving'),
        variant: 'destructive',
      });
    },
  });

  // Mutation para resetar o tour
  const resetTourMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/tour/reset', 'POST', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: t('tour.toast.restarted'),
        description: t('tour.toast.restartedDescription'),
      });
      setIsTourRunning(true);
      setCurrentPage('dashboard');
    },
    onError: () => {
      toast({
        title: t('tour.toast.error'),
        description: t('tour.toast.errorRestarting'),
        variant: 'destructive',
      });
    },
  });

  // Iniciar o tour
  const startTour = useCallback(() => {
    console.log('🚀 startTour called - setting isTourRunning to true');
    setIsTourRunning(true);
    setCurrentPage('dashboard');
  }, []);

  // Iniciar tour focado em Sync (após configurar integrações)
  const startSyncTour = useCallback(() => {
    console.log('🚀 startSyncTour called - starting sync-focused tour');
    setIsTourRunning(true);
    setCurrentPage('sync-orders');
  }, []);

  // Parar o tour
  const stopTour = useCallback(() => {
    setIsTourRunning(false);
  }, []);

  // Completar o tour (redireciona para dashboard)
  const completeTour = useCallback(() => {
    setIsTourRunning(false);
    setTourWasCompletedOrSkipped(true);
    completeTourMutation.mutate();
  }, [completeTourMutation]);

  // Pular o tour (salva como completo também e redireciona)
  const skipTour = useCallback(() => {
    setIsTourRunning(false);
    setTourWasCompletedOrSkipped(true);
    completeTourMutation.mutate();
  }, [completeTourMutation]);

  // Fechar tour de sync sem redirecionar (não salva como completo)
  const closeSyncTour = useCallback(() => {
    console.log('🚪 Closing sync tour without redirect');
    setIsTourRunning(false);
  }, []);

  // Resetar o tour
  const resetTour = useCallback(() => {
    resetTourMutation.mutate();
  }, [resetTourMutation]);

  // Navegar para outra página durante o tour
  const navigateToPage = useCallback((page: 'dashboard' | 'integrations' | 'ads' | 'sync-orders') => {
    setCurrentPage(page);
  }, []);

  return {
    isTourRunning,
    currentPage,
    startTour,
    startSyncTour,
    stopTour,
    completeTour,
    skipTour,
    closeSyncTour,
    resetTour,
    navigateToPage,
    isCompletingTour: completeTourMutation.isPending,
    isResettingTour: resetTourMutation.isPending,
    tourWasCompletedOrSkipped,
  };
}
