import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from './use-toast';
import { apiRequest } from '@/lib/queryClient';

export function useTour() {
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
        title: 'Tour Concluído!',
        description: 'Você pode refazer o tour a qualquer momento nas configurações.',
      });
      
      // Redirecionar para a página inicial
      setTimeout(() => {
        setLocation('/');
      }, 500);
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o progresso do tour.',
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
        title: 'Tour Reiniciado',
        description: 'O tour será iniciado automaticamente.',
      });
      setIsTourRunning(true);
      setCurrentPage('dashboard');
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível reiniciar o tour.',
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

  // Completar o tour
  const completeTour = useCallback(() => {
    setIsTourRunning(false);
    setTourWasCompletedOrSkipped(true);
    completeTourMutation.mutate();
  }, [completeTourMutation]);

  // Pular o tour (salva como completo também)
  const skipTour = useCallback(() => {
    setIsTourRunning(false);
    setTourWasCompletedOrSkipped(true);
    completeTourMutation.mutate();
  }, [completeTourMutation]);

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
    resetTour,
    navigateToPage,
    isCompletingTour: completeTourMutation.isPending,
    isResettingTour: resetTourMutation.isPending,
    tourWasCompletedOrSkipped,
  };
}
