import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, RefreshCw, XCircle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { SyncTimeline } from "./SyncTimeline";
import { SyncSummaryCard } from "./SyncSummaryCard";

interface PlatformProgress {
  processedOrders: number;
  totalOrders: number;
  newOrders: number;
  updatedOrders: number;
  percentage: number;
}

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

interface CompleteSyncStatus {
  isRunning: boolean;
  phase: 'preparing' | 'syncing' | 'completed' | 'error';
  message: string;
  currentStep: 'shopify' | 'cartpanda' | 'digistore' | 'staging' | null;
  overallProgress: number;
  platformProgress: PlatformProgress;
  // Campos antigos mantidos temporariamente para compatibilidade
  shopifyProgress?: ShopifyProgress;
  stagingProgress?: StagingProgress;
  errors: number;
  startTime: string | null;
  endTime: string | null;
  // novos campos do backend (podem vir em mensagens SSE)
  runId?: string | null;
  version?: number;
}

interface CompleteSyncDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  onSyncStateChange?: (isRunning: boolean) => void;
  operationId?: string;
}

export function CompleteSyncDialog({ 
  isOpen, 
  onClose, 
  onComplete, 
  onSyncStateChange,
  operationId 
}: CompleteSyncDialogProps) {
  console.log('🟢 [DEBUG] CompleteSyncDialog render - isOpen:', isOpen);
  
  const [syncStatus, setSyncStatus] = useState<CompleteSyncStatus | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  const hasStartedSyncRef = useRef(false);
  const expectedRunIdRef = useRef<string | null>(null);

  // CRÍTICO: Monitorar quando sincronização termina para garantir que onSyncStateChange(false) seja chamado
  useEffect(() => {
    if (syncStatus && !syncStatus.isRunning && (syncStatus.phase === 'completed' || syncStatus.phase === 'error')) {
      console.log('🛑 [SYNC STATE] Sincronização finalizada, chamando onSyncStateChange(false):', {
        phase: syncStatus.phase,
        isRunning: syncStatus.isRunning,
        runId: (syncStatus as any)?.runId
      });
      // Garantir que o botão para de piscar/girar quando a sync termina
      onSyncStateChange?.(false);
    }
  }, [syncStatus?.phase, syncStatus?.isRunning, onSyncStateChange]);

  // Animate progress bar
  useEffect(() => {
    if (syncStatus) {
      const progress = syncStatus.overallProgress;
      // Garantir que nunca é NaN
      const safeProgress = isNaN(progress) || !isFinite(progress) ? 0 : Math.max(0, Math.min(100, progress));
      
      // CRÍTICO: Sempre ir para frente, nunca para trás
      // Isso previne a barra de "ir e voltar" quando o status é atualizado
      setAnimatedProgress((prev) => {
        // Permitir 100% quando completar, mas durante a sync sempre ir para frente
        let newProgress: number;
        if (syncStatus.phase === 'completed' && !syncStatus.isRunning) {
          // Quando completa, ir para 100% imediatamente
          newProgress = 100;
        } else {
          // Durante a sync, sempre ir para frente (nunca retroceder)
          newProgress = safeProgress > prev ? safeProgress : prev;
        }
        
        console.log('🎯 [PROGRESS BAR] Atualizando animatedProgress:', {
          syncStatusOverall: syncStatus.overallProgress,
          safeProgress,
          prevProgress: prev,
          newProgress,
          phase: syncStatus.phase,
          isRunning: syncStatus.isRunning,
          isCompleted: syncStatus.phase === 'completed'
        });
        
        return newProgress;
      });
    } else {
      setAnimatedProgress(0);
    }
  }, [syncStatus?.overallProgress, syncStatus?.phase, syncStatus?.isRunning]);

  // Start EventSource for SSE updates
  const startEventSource = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Get auth token from localStorage (corrigido para usar 'auth_token' que é o padrão do sistema)
    const token = localStorage.getItem('auth_token') || 
      localStorage.getItem('token') ||
      document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    
    if (!token) {
      console.error('❌ Token não encontrado para SSE. Verificando localStorage...', {
        auth_token: localStorage.getItem('auth_token') ? 'ENCONTRADO' : 'NÃO ENCONTRADO',
        token: localStorage.getItem('token') ? 'ENCONTRADO' : 'NÃO ENCONTRADO',
        cookies: document.cookie
      });
      return;
    }
    
    console.log('✅ [SSE] Token encontrado:', token ? `${token.slice(0, 20)}...` : 'NÃO ENCONTRADO');

    // Build URL with operationId and token
    const baseUrl = '/api/sync/complete-status-stream';
    const params = new URLSearchParams();
    if (operationId) {
      params.append('operationId', operationId);
    }
    params.append('token', token);
    const url = `${baseUrl}?${params.toString()}`;

    try {
      console.log('🔌 [SSE] Criando EventSource:', url);
      // Create EventSource with auth token in query param
      // Note: EventSource doesn't support custom headers, so we use query param
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('✅ [SSE] Conexão estabelecida');
        setSseConnected(true);
        
        // Parar polling se SSE conectou (SSE é mais eficiente)
        setTimeout(() => {
          if (pollingIntervalRef.current) {
            console.log('🔄 [SSE] Parando polling pois SSE conectou');
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }, 1000); // Dar tempo para SSE começar a receber mensagens
      };

      eventSource.onmessage = (event) => {
        try {
          console.log('📨 [SSE] Mensagem recebida:', event.data);
          let status: CompleteSyncStatus = JSON.parse(event.data);
          
          // ADAPTADOR: Converter novo formato (platformProgress) para formato antigo (shopifyProgress/stagingProgress)
          if ((status as any).platformProgress && !(status as any).shopifyProgress) {
            const platform = (status as any).platformProgress || {};
            status = {
              ...status,
              shopifyProgress: {
                processedOrders: platform.processedOrders || 0,
                totalOrders: platform.totalOrders || 0,
                newOrders: platform.newOrders || 0,
                updatedOrders: platform.updatedOrders || 0,
                currentPage: 0,
                totalPages: 0,
                percentage: platform.percentage || 0
              },
              stagingProgress: {
                processedLeads: 0,
                totalLeads: 0,
                newLeads: 0,
                updatedLeads: 0
              }
            } as any;
          } else if (!(status as any).shopifyProgress) {
            // Se não tem nenhum dos dois, criar estrutura padrão
            status = {
              ...status,
              shopifyProgress: {
                processedOrders: 0,
                totalOrders: 0,
                newOrders: 0,
                updatedOrders: 0,
                currentPage: 0,
                totalPages: 0,
                percentage: 0
              },
              stagingProgress: {
                processedLeads: 0,
                totalLeads: 0,
                newLeads: 0,
                updatedLeads: 0
              }
            } as any;
          }
          
          const incomingRunId = (status as any)?.runId || null;
          if (expectedRunIdRef.current && incomingRunId && incomingRunId !== expectedRunIdRef.current) {
            console.log('⏭️ [SSE] Ignorando update de outra execução', { expected: expectedRunIdRef.current, incomingRunId });
            return;
          }
          console.log('📊 [SSE] Status parseado:', {
            phase: status.phase,
            isRunning: status.isRunning,
            overallProgress: status.overallProgress,
            currentStep: status.currentStep,
            platform: {
              processed: status.platformProgress?.processedOrders,
              total: status.platformProgress?.totalOrders,
              new: status.platformProgress?.newOrders,
              updated: status.platformProgress?.updatedOrders
            }
          });
          
          // Sempre atualizar estado
          // MAS: Se for um status completed e não é da execução atual, ignorar
          const statusRunId = (status as any)?.runId || null;
          
          // CRÍTICO: Se não temos runId esperado ainda OU o runId não bate, IGNORAR completamente
          if (expectedRunIdRef.current) {
            if (!statusRunId || statusRunId !== expectedRunIdRef.current) {
              console.log(`⏭️ [SSE] Ignorando status de outra execução:`, {
                expected: expectedRunIdRef.current,
                received: statusRunId,
                phase: status.phase,
                isRunning: status.isRunning
              });
              return; // Ignorar completamente - não atualizar nada
            } else {
              console.log(`✅ [SSE] Status da execução atual aceito!`, {
                runId: statusRunId,
                phase: status.phase,
                isRunning: status.isRunning
              });
            }
          } else {
            // Se não temos runId esperado ainda, só aceitar se NÃO está completed
            if (status.phase === 'completed' && !status.isRunning) {
              console.log(`⏭️ [SSE] Ignorando status completed sem runId esperado (execução antiga) - Aguardando runId...`);
              return;
            } else {
              console.log(`✅ [SSE] Status aceito (sem runId esperado, mas não está completed):`, {
                phase: status.phase,
                isRunning: status.isRunning,
                runId: statusRunId
              });
            }
          }
          
          // SEMPRE atualizar estado - não verificar mudanças, pois React precisa de nova referência
          // CRÍTICO: Criar uma cópia profunda para garantir que React detecta a mudança
          const newStatus = {
            ...status,
            platformProgress: { ...status.platformProgress }
          };
          
          setSyncStatus(newStatus);
          console.log(`✅ [SSE] Estado atualizado FORÇADAMENTE com:`, {
            runId: statusRunId,
            expectedRunId: expectedRunIdRef.current,
            phase: newStatus.phase,
            isRunning: newStatus.isRunning,
            overallProgress: newStatus.overallProgress,
            currentStep: newStatus.currentStep,
            platformProcessed: newStatus.platformProgress?.processedOrders,
            platformTotal: newStatus.platformProgress?.totalOrders
          });
    onSyncStateChange?.(status.isRunning);

          // If completed, trigger onComplete callback
          if (status.phase === 'completed' && !status.isRunning && onComplete) {
            setTimeout(() => {
              onComplete();
            }, 2000);
          }

          // If error, close EventSource
          if (status.phase === 'error') {
            console.log('⚠️ [SSE] Erro detectado, fechando conexão');
            eventSource.close();
            eventSourceRef.current = null;
            hasStartedSyncRef.current = false;
          } else if (!status.isRunning && status.phase === 'completed') {
            console.log('✅ [SSE] Sync completo, fechando conexão');
            eventSource.close();
            eventSourceRef.current = null;
      hasStartedSyncRef.current = false;
          }
        } catch (error) {
          console.error('❌ [SSE] Erro ao processar mensagem:', error, event.data);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ [SSE] Erro no EventSource:', error);
        
        // Fechar conexão SSE imediatamente e usar apenas polling
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        
        console.warn("⚠️ [SSE] SSE desabilitado devido a erro, usando apenas polling");
        if (!pollingIntervalRef.current && syncStatus?.isRunning) {
          startPollingFallback();
        }
      };
    } catch (error) {
      console.error('❌ [SSE] Erro ao criar EventSource:', error);
    }
  };

  // Polling fallback caso SSE falhe (ou como método principal)
  const startPollingFallback = () => {
    // Se já está rodando, não iniciar novamente
    if (pollingIntervalRef.current) {
      console.log('🔄 [POLLING] Polling já está rodando');
      return;
    }

    console.log('🔄 [POLLING] Iniciando polling...');
    
    let pollCount = 0;
    const pollStatus = async () => {
      pollCount++;
      try {
        // NUNCA adicionar operationId na query - o endpoint usa userId do token
        const url = '/api/sync/complete-status';
        
        console.log(`📡 [POLLING] Poll #${pollCount} - Buscando status de: ${url}`);
        
        const response = await apiRequest(url, 'GET');
        
        // Se a rota não existe (404), parar o polling silenciosamente
        if (response.status === 404) {
          console.log('ℹ️ [POLLING] Rota /api/sync/complete-status não existe mais. Parando polling.');
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          return;
        }
        
        if (response.ok) {
          let status = await response.json();
          
          // ADAPTADOR: Converter novo formato (platformProgress) para formato antigo (shopifyProgress/stagingProgress)
          if ((status as any).platformProgress && !(status as any).shopifyProgress) {
            const platform = (status as any).platformProgress || {};
            status = {
              ...status,
              shopifyProgress: {
                processedOrders: platform.processedOrders || 0,
                totalOrders: platform.totalOrders || 0,
                newOrders: platform.newOrders || 0,
                updatedOrders: platform.updatedOrders || 0,
                currentPage: 0,
                totalPages: 0,
                percentage: platform.percentage || 0
              },
              stagingProgress: {
                processedLeads: 0,
                totalLeads: 0,
                newLeads: 0,
                updatedLeads: 0
              }
            };
          } else if (!(status as any).shopifyProgress) {
            // Se não tem nenhum dos dois, criar estrutura padrão
            status = {
              ...status,
              shopifyProgress: {
                processedOrders: 0,
                totalOrders: 0,
                newOrders: 0,
                updatedOrders: 0,
                currentPage: 0,
                totalPages: 0,
                percentage: 0
              },
              stagingProgress: {
                processedLeads: 0,
                totalLeads: 0,
                newLeads: 0,
                updatedLeads: 0
              }
            };
          }
          
          const incomingRunId = (status as any)?.runId || null;
          if (expectedRunIdRef.current && incomingRunId && incomingRunId !== expectedRunIdRef.current) {
            console.log('⏭️ [POLLING] Ignorando update de outra execução', { expected: expectedRunIdRef.current, incomingRunId });
            return;
          }
          
          // Validar se a resposta é realmente um status de sync
          if (!status || typeof status !== 'object' || !('isRunning' in status || 'phase' in status)) {
            console.error('❌ [POLLING] Resposta inválida do endpoint:', {
              url,
              receivedData: status,
              expectedFields: ['isRunning', 'phase', 'overallProgress', 'shopifyProgress', 'stagingProgress'],
              actualKeys: Object.keys(status || {})
            });
            return; // Não processar resposta inválida
          }
          
          // Log detalhado a cada 5 polls ou quando há mudanças significativas
          if (pollCount % 5 === 0 || status.isRunning || pollCount <= 3) {
            console.log(`📊 [POLLING] Poll #${pollCount} - Status recebido (DETALHADO):`, {
              phase: status.phase,
              isRunning: status.isRunning,
              overallProgress: status.overallProgress,
              currentStep: status.currentStep,
              shopify: {
                processed: status.shopifyProgress?.processedOrders,
                total: status.shopifyProgress?.totalOrders,
                percentage: status.shopifyProgress?.percentage,
                new: status.shopifyProgress?.newOrders,
                updated: status.shopifyProgress?.updatedOrders
              },
              staging: {
                processed: status.stagingProgress?.processedLeads,
                total: status.stagingProgress?.totalLeads,
                new: status.stagingProgress?.newLeads,
                updated: status.stagingProgress?.updatedLeads
              },
              runId: (status as any)?.runId,
              expectedRunId: expectedRunIdRef.current,
              willAccept: !(status.phase === 'completed' && !status.isRunning && !(status as any)?.runId)
            });
          }
          
          // SEMPRE atualizar estado para forçar re-render
          // MAS: Se for um status completed e não é da execução atual, ignorar
          const statusRunId = (status as any)?.runId || null;
          
          // CRÍTICO: Se não temos runId esperado ainda OU o runId não bate, IGNORAR completamente
          if (expectedRunIdRef.current) {
            if (!statusRunId || statusRunId !== expectedRunIdRef.current) {
              console.log(`⏭️ [POLLING] Ignorando status de outra execução:`, {
                expected: expectedRunIdRef.current,
                received: statusRunId,
                phase: status.phase,
                isRunning: status.isRunning
              });
              return; // Ignorar completamente - não atualizar nada
            } else {
              console.log(`✅ [POLLING] Status da execução atual aceito!`, {
                runId: statusRunId,
                phase: status.phase,
                isRunning: status.isRunning
              });
            }
          } else {
            // Se não temos runId esperado ainda, aceitar APENAS se:
            // 1. NÃO está completed OU
            // 2. Está completed MAS tem runId (pode ser de uma nova execução)
            if (status.phase === 'completed' && !status.isRunning && !statusRunId) {
              console.log(`⏭️ [POLLING] Ignorando status completed sem runId (execução antiga) - Aguardando nova sync...`);
              return;
            }
            
          // CRÍTICO: Se ainda não temos runId esperado, NÃO aceitar status que parece ser antigo
          // Ignorar qualquer status que tenha valores não-zero do Shopify se não temos runId ainda
          if (!expectedRunIdRef.current && !statusRunId) {
            // Se o status tem qualquer progresso do Shopify (processedOrders > 0, totalOrders > 0, ou percentage > 0),
            // E não está rodando, é provavelmente antigo e deve ser ignorado
            const hasOldShopifyData = 
              (status.shopifyProgress?.processedOrders > 0 || 
               status.shopifyProgress?.totalOrders > 0 ||
               status.shopifyProgress?.percentage > 0) &&
              !status.isRunning;
            
            if (hasOldShopifyData) {
              console.log(`⏭️ [POLLING] Ignorando status antigo com dados do Shopify mas sem runId (aguardando runId do POST):`, {
                phase: status.phase,
                isRunning: status.isRunning,
                overallProgress: status.overallProgress,
                shopifyProcessed: status.shopifyProgress?.processedOrders,
                shopifyTotal: status.shopifyProgress?.totalOrders,
                shopifyPercentage: status.shopifyProgress?.percentage,
                hasRunId: !!statusRunId
              });
              return;
            }
          }
          
          // CRÍTICO: Ignorar status que parece ser de sync antiga (Shopify já completo sem runId e não rodando)
          // Isso indica que é um status antigo que ainda está no backend
          const hasCompletedShopifyWithoutRunId = 
            status.shopifyProgress?.percentage === 100 && 
            status.shopifyProgress?.totalOrders > 0 && 
            status.shopifyProgress?.processedOrders >= status.shopifyProgress?.totalOrders &&
            !statusRunId &&
            !status.isRunning &&
            status.overallProgress >= 40;
          
          if (hasCompletedShopifyWithoutRunId) {
            console.log(`⏭️ [POLLING] Ignorando status antigo com Shopify completo mas sem runId:`, {
              shopifyPercentage: status.shopifyProgress?.percentage,
              shopifyTotal: status.shopifyProgress?.totalOrders,
              shopifyProcessed: status.shopifyProgress?.processedOrders,
              overallProgress: status.overallProgress,
              phase: status.phase,
              isRunning: status.isRunning,
              hasRunId: !!statusRunId
            });
            return;
          }
            
            // Aceitar status que não está completed OU que tem runId OU que está completamente zerado
            console.log(`✅ [POLLING] Status aceito (sem runId esperado):`, {
              phase: status.phase,
              isRunning: status.isRunning,
              runId: statusRunId,
              overallProgress: status.overallProgress,
              currentStep: status.currentStep,
              shopifyProcessed: status.shopifyProgress?.processedOrders,
              shopifyTotal: status.shopifyProgress?.totalOrders,
              shopifyPercentage: status.shopifyProgress?.percentage,
              stagingProcessed: status.stagingProgress?.processedLeads,
              stagingTotal: status.stagingProgress?.totalLeads
            });
            
            // Se tem runId mas não estávamos esperando, começar a esperar agora
            if (statusRunId && !expectedRunIdRef.current) {
              expectedRunIdRef.current = statusRunId;
              console.log(`🏷️ [RUN] runId definido do status: ${statusRunId}`);
            }
          }
          
          // SEMPRE atualizar estado se chegou até aqui (não foi ignorado)
          console.log(`🔄 [POLLING] Atualizando estado do modal com:`, {
            phase: status.phase,
            isRunning: status.isRunning,
            overallProgress: status.overallProgress,
            runId: statusRunId,
            expectedRunId: expectedRunIdRef.current
          });
          
          // SEMPRE atualizar estado - não verificar mudanças, pois React precisa de nova referência
          // CRÍTICO: Criar uma cópia profunda para garantir que React detecta a mudança
          const newStatus = {
            ...status,
            shopifyProgress: { ...status.shopifyProgress },
            stagingProgress: { ...status.stagingProgress }
          };
          
          setSyncStatus(newStatus);
          console.log(`✅ [POLLING] Estado atualizado FORÇADAMENTE com:`, {
            runId: statusRunId,
            expectedRunId: expectedRunIdRef.current,
            phase: newStatus.phase,
            isRunning: newStatus.isRunning,
            overallProgress: newStatus.overallProgress,
            currentStep: newStatus.currentStep,
            shopifyProcessed: newStatus.shopifyProgress?.processedOrders,
            shopifyTotal: newStatus.shopifyProgress?.totalOrders,
            stagingProcessed: newStatus.stagingProgress?.processedLeads,
            stagingTotal: newStatus.stagingProgress?.totalLeads
          });
          
          // CRÍTICO: Sempre atualizar onSyncStateChange quando status muda
          // Isso garante que o botão para de piscar/girar quando a sync termina
          onSyncStateChange?.(status.isRunning);
          
          // Se não está mais rodando, parar polling após algumas atualizações finais
          if (!status.isRunning && (status.phase === 'completed' || status.phase === 'error')) {
            // CRÍTICO: Garantir que onSyncStateChange(false) seja chamado IMEDIATAMENTE quando concluído
            // Não esperar pollCount >= 3 para isso
            console.log('🛑 [POLLING] Sync finalizada, chamando onSyncStateChange(false) imediatamente:', {
              phase: status.phase,
              isRunning: status.isRunning,
              pollCount
            });
            onSyncStateChange?.(false);
            
            // Continuar polling por mais algumas iterações para garantir que pegou o resultado final
            if (pollCount >= 3) {
              console.log('✅ [POLLING] Sync concluído, parando polling...');
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              
              if (status.phase === 'completed' && onComplete) {
                setTimeout(() => onComplete(), 2000);
              }
            }
          }
        } else {
          // Tentar ler a resposta mesmo se não OK para debug
          try {
            const errorData = await response.text();
            console.error(`❌ [POLLING] Resposta não OK (${response.status}):`, {
              url,
              status: response.status,
              statusText: response.statusText,
              body: errorData
            });
          } catch (e) {
            console.error(`❌ [POLLING] Resposta não OK (${response.status}):`, {
              url,
              status: response.status,
              statusText: response.statusText
            });
          }
        }
      } catch (error) {
        console.error(`❌ [POLLING] Erro ao buscar status (poll #${pollCount}):`, error);
      }
    };
    
    // Poll imediatamente e depois a cada 1 segundo
    console.log('🚀 [POLLING] Iniciando primeiro poll...');
    pollStatus();
    pollingIntervalRef.current = setInterval(pollStatus, 1000) as unknown as number;
    console.log('✅ [POLLING] Polling iniciado (intervalo de 1s)');
  };

  // Initialize EventSource for SSE
  useEffect(() => {
    if (!isOpen) {
      // Close EventSource when dialog closes
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      // Se dialog fecha mas sync ainda está rodando, o polling continua até terminar
      // O polling só para quando sync realmente termina ou quando componente desmonta
      return;
    }

    // Initialize dialog state
    const initDialog = async () => {
      console.log('🟣 [DEBUG] initDialog - Inicializando dialog...');
      try {
        console.log('🟣 [DEBUG] initDialog - Limpando error...');
        setError(null);
        
        // IMPORTANTE: Primeiro buscar o status atual para evitar barra ir e voltar
        // Se já há uma sincronização em andamento, mostrar o status atual imediatamente
        try {
          console.log('🟣 [DEBUG] initDialog - Buscando status atual...');
          const currentStatusResponse = await apiRequest('/api/sync/complete-status', 'GET');
          // Se a rota não existe (404), continuar normalmente sem status inicial
          if (currentStatusResponse.status === 404) {
            console.log('ℹ️ [INIT] Rota /api/sync/complete-status não existe. Continuando sem status inicial.');
            return;
          }
          if (currentStatusResponse.ok) {
            const currentStatus = await currentStatusResponse.json();
            
            // CRÍTICO: Ignorar status antigo que parece ser de sync anterior
            // Se o Shopify tem valores não-zero mas não há runId, isso é um status antigo que deve ser ignorado
            // TAMBÉM: Se tem valores do Shopify mas a sync não está rodando E não há runId, é antigo
            const hasOldShopifyData = 
              (currentStatus.shopifyProgress?.processedOrders > 0 || 
               currentStatus.shopifyProgress?.totalOrders > 0 ||
               currentStatus.shopifyProgress?.percentage > 0) &&
              (!currentStatus.runId || !currentStatus.isRunning);
            
            if (hasOldShopifyData) {
              console.log('⏭️ [INIT] Ignorando status antigo com dados do Shopify (zerando antes de iniciar nova sync):', {
                shopifyProcessed: currentStatus.shopifyProgress?.processedOrders,
                shopifyTotal: currentStatus.shopifyProgress?.totalOrders,
                shopifyPercentage: currentStatus.shopifyProgress?.percentage,
                overallProgress: currentStatus.overallProgress,
                phase: currentStatus.phase,
                isRunning: currentStatus.isRunning,
                hasRunId: !!currentStatus.runId
              });
              
              // CRÍTICO: Zerar explicitamente o shopifyProgress ANTES de iniciar nova sync
              // Isso previne que valores antigos sejam exibidos momentaneamente
              setSyncStatus({
                isRunning: false,
                phase: 'preparing',
                message: 'Iniciando sincronização...',
                currentStep: null,
                overallProgress: 0,
                shopifyProgress: {
                  processedOrders: 0,
                  totalOrders: 0,
                  newOrders: 0,
                  updatedOrders: 0,
                  currentPage: 0,
                  totalPages: 0,
                  percentage: 0
                },
                stagingProgress: {
                  processedLeads: 0,
                  totalLeads: 0,
                  newLeads: 0,
                  updatedLeads: 0
                },
                errors: 0,
                startTime: null,
                endTime: null,
                runId: null
              });
              setAnimatedProgress(0); // CRÍTICO: Zerar progresso animado
              hasStartedSyncRef.current = false;
              expectedRunIdRef.current = null;
              
              // Continuar para iniciar nova sync
            }
            // Se há uma sincronização rodando E tem runId válido, usar o status atual
            // MAS: Zerar shopifyProgress se ele parece ser antigo (não corresponde ao runId atual)
            else if (currentStatus.isRunning && currentStatus.phase !== 'completed' && currentStatus.runId) {
              console.log('✅ [INIT] Sincronização já em andamento, usando status atual:', {
                runId: currentStatus.runId,
                phase: currentStatus.phase,
                overallProgress: currentStatus.overallProgress,
                isRunning: currentStatus.isRunning,
                shopifyProcessed: currentStatus.shopifyProgress?.processedOrders,
                shopifyTotal: currentStatus.shopifyProgress?.totalOrders
              });
              
              // Converter para formato esperado
              // CRÍTICO: Se shopifyProgress tem valores mas não está na etapa 'shopify', pode ser antigo
              // Zerar se não corresponde ao estado atual
              const shopifyProgress = 
                (currentStatus.currentStep === 'shopify' && currentStatus.isRunning) ||
                (currentStatus.shopifyProgress?.processedOrders > 0 && 
                 currentStatus.shopifyProgress?.totalOrders > 0 &&
                 currentStatus.shopifyProgress?.processedOrders <= currentStatus.shopifyProgress?.totalOrders)
                  ? (currentStatus.shopifyProgress || {
                      processedOrders: 0,
                      totalOrders: 0,
                      newOrders: 0,
                      updatedOrders: 0,
                      currentPage: 0,
                      totalPages: 0,
                      percentage: 0
                    })
                  : {
                      processedOrders: 0,
                      totalOrders: 0,
                      newOrders: 0,
                      updatedOrders: 0,
                      currentPage: 0,
                      totalPages: 0,
                      percentage: 0
                    };
              
              const statusToUse: CompleteSyncStatus = {
                isRunning: currentStatus.isRunning,
                phase: currentStatus.phase,
                message: currentStatus.message || 'Sincronizando...',
                currentStep: currentStatus.currentStep,
                overallProgress: currentStatus.overallProgress || 0,
                shopifyProgress: shopifyProgress,
                stagingProgress: currentStatus.stagingProgress || {
                  processedLeads: 0,
                  totalLeads: 0,
                  newLeads: 0,
                  updatedLeads: 0
                },
                errors: currentStatus.errors || 0,
                startTime: currentStatus.startTime || new Date().toISOString(),
                endTime: currentStatus.endTime || null,
                runId: currentStatus.runId || null
              };
              
              setSyncStatus(statusToUse);
              expectedRunIdRef.current = statusToUse.runId || null;
              hasStartedSyncRef.current = true; // Marcar como já iniciado
              
              // Iniciar polling imediatamente para continuar recebendo updates
              startPollingFallback();
              return; // Não iniciar nova sync se já está rodando
            }
          }
        } catch (statusError) {
          console.log('ℹ️ [INIT] Não foi possível buscar status atual, iniciando nova sync:', statusError);
        }
        
        // Se não há sync rodando ou não conseguiu buscar status, iniciar nova sync
        // CRÍTICO: Resetar status do Shopify ANTES de iniciar nova sync
        // Isso garante que valores antigos não sejam exibidos momentaneamente
        setSyncStatus({
          isRunning: false,
          phase: 'preparing',
          message: 'Iniciando sincronização...',
          currentStep: null,
          overallProgress: 0,
          shopifyProgress: {
            processedOrders: 0,
            totalOrders: 0,
            newOrders: 0,
            updatedOrders: 0,
            currentPage: 0,
            totalPages: 0,
            percentage: 0
          },
          stagingProgress: {
            processedLeads: 0,
            totalLeads: 0,
            newLeads: 0,
            updatedLeads: 0
          },
          errors: 0,
          startTime: null,
          endTime: null,
          runId: null
        });
        setAnimatedProgress(0); // CRÍTICO: Resetar progresso animado para 0
        hasStartedSyncRef.current = false;
        expectedRunIdRef.current = null; // Resetar runId esperado
        
        // Garantir que modal sempre começa do zero apenas se não há sync rodando
        await startCompleteSync();
      } catch (error: any) {
        console.error("❌ Erro ao inicializar dialog:", error);
        setError(error?.message || 'Erro desconhecido ao inicializar sincronização');
        // Set error state to show something to user
        setSyncStatus({
          isRunning: false,
          phase: 'error',
          message: error?.message || 'Erro ao inicializar sincronização',
          currentStep: null,
          overallProgress: 0,
          shopifyProgress: {
            processedOrders: 0,
            totalOrders: 0,
            newOrders: 0,
            updatedOrders: 0,
            currentPage: 0,
            totalPages: 0,
            percentage: 0
          },
          stagingProgress: {
            processedLeads: 0,
            totalLeads: 0,
            newLeads: 0,
            updatedLeads: 0
          },
          errors: 0,
          startTime: null,
          endTime: null
        });
      }
    };

    // Only init if dialog is open
    if (isOpen) {
      initDialog();
    }

        return () => {
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
          // NÃO parar polling quando dialog fecha se sync ainda está rodando
          // O polling só para quando sync realmente termina (dentro de pollStatus)
          // Se componente desmontar completamente, aí sim parar tudo
          // Deixar o polling continuar até sync terminar para garantir onSyncStateChange(false)
          
          // CRÍTICO: Se o componente desmontar e não há sync rodando, garantir que o botão pare
          // Verificar status atual uma última vez antes de desmontar
          if (pollingIntervalRef.current) {
            // Continuar polling por mais alguns segundos para garantir que pegou o resultado final
            setTimeout(() => {
              // Verificar status uma última vez após desmontar
              apiRequest('/api/sync/complete-status', 'GET')
                .then(response => {
                  // Se a rota não existe, ignorar silenciosamente
                  if (response.status === 404) {
                    return null;
                  }
                  if (response.ok) {
                    return response.json();
                  }
                  return null;
                })
                .then((finalStatus: any) => {
                  if (finalStatus && !finalStatus.isRunning) {
                    console.log('🛑 [CLEANUP] Sync finalizada após desmontar, chamando onSyncStateChange(false)');
                    onSyncStateChange?.(false);
                  }
                })
                .catch(() => {
                  // Ignorar erros no cleanup
                });
              
              // Limpar polling após verificação final
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
            }, 2000);
          }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, operationId]);


  // Start complete sync
  const startCompleteSync = async () => {
    setIsStarting(true);
    hasStartedSyncRef.current = true;
    
    // CRÍTICO: Resetar progresso animado para 0 quando nova sync começa
    setAnimatedProgress(0);

    // Reset status to show "starting" state immediately
    // Garantir que NUNCA mostra como completo antes de começar
    const initialStatus: CompleteSyncStatus = {
      isRunning: true,
      phase: 'preparing',
      message: 'Iniciando sincronização...',
      currentStep: null,
      overallProgress: 0,
      shopifyProgress: {
        processedOrders: 0,
        totalOrders: 0,
        newOrders: 0,
        updatedOrders: 0,
        currentPage: 0,
        totalPages: 0,
        percentage: 0
      },
      stagingProgress: {
        processedLeads: 0,
        totalLeads: 0,
        newLeads: 0,
        updatedLeads: 0
      },
      errors: 0,
      startTime: new Date().toISOString(),
      endTime: null
    };
    
    console.log('🔄 [SYNC] Iniciando sync - Status inicial:', initialStatus);
    setSyncStatus(initialStatus);
    onSyncStateChange?.(true);

    try {
      const url = operationId 
        ? `/api/sync/complete-progressive?operationId=${operationId}`
        : '/api/sync/complete-progressive';
      
      console.log("🔄 Iniciando sync completo...", { url, operationId });
      
      const response = await apiRequest(url, 'POST', {
        forceComplete: true,
        maxRetries: 5
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("📊 Resposta do sync:", result);
      console.log("📊 [DEBUG] result.runId:", result.runId);
      console.log("📊 [DEBUG] result.success:", result.success);
      
      if (result.success) {
          // CRÍTICO: Guardar runId desta execução ANTES de qualquer outra coisa
          if (result.runId) {
            expectedRunIdRef.current = result.runId as string;
            console.log('🏷️ [RUN] runId atual definido:', expectedRunIdRef.current);
          } else {
            console.warn('⚠️ [RUN] runId não encontrado na resposta do backend! Resposta completa:', JSON.stringify(result, null, 2));
            expectedRunIdRef.current = null;
          }
          
        console.log("🚀 Sincronização completa iniciada");
          
          // FORÇAR estado inicial no modal - garantir que não está completed e está zerado
          setSyncStatus({
            isRunning: true,
            phase: 'preparing',
            message: 'Iniciando sincronização...',
            currentStep: null,
            overallProgress: 0,
            shopifyProgress: {
              processedOrders: 0,
              totalOrders: 0,
              newOrders: 0,
              updatedOrders: 0,
              currentPage: 0,
              totalPages: 0,
              percentage: 0
            },
            stagingProgress: {
              processedLeads: 0,
              totalLeads: 0,
              newLeads: 0,
              updatedLeads: 0
            },
            errors: 0,
            startTime: new Date().toISOString(),
            endTime: null,
            runId: expectedRunIdRef.current || undefined
          });
          
          // CRÍTICO: Aguardar um pouco para garantir que o backend resetou completamente
          // antes de começar o polling (evita pegar valores antigos)
          console.log("⏳ [INIT] Aguardando 500ms antes de iniciar polling para garantir reset completo...");
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Iniciar polling APÓS aguardar o reset ser aplicado
          console.log("🔄 [INIT] Iniciando polling fallback...");
          startPollingFallback();
          
          // SSE desabilitado temporariamente devido a problemas de serialização
          // Usar apenas polling que está funcionando corretamente
          console.log("ℹ️ [INIT] SSE desabilitado - usando apenas polling");
      } else {
        console.error("❌ Erro ao iniciar sincronização:", result.message);
        hasStartedSyncRef.current = false;
        onSyncStateChange?.(false);
        setSyncStatus(prev => prev ? {
          ...prev,
          phase: 'error',
          message: result.message || 'Erro ao iniciar sincronização',
          isRunning: false
        } : null);
      }
    } catch (error: any) {
      console.error("❌ Erro na requisição de sincronização:", error);
      hasStartedSyncRef.current = false;
      onSyncStateChange?.(false);
      setSyncStatus(prev => prev ? {
        ...prev,
        phase: 'error',
        message: error?.message || 'Erro ao iniciar sincronização',
        isRunning: false
      } : null);
    } finally {
      setIsStarting(false);
    }
  };

  // Initialize with default status if none exists (moved before getPhaseIcon)
  // This ensures we always have a valid status object even if syncStatus is null
  const defaultStatus: CompleteSyncStatus = {
    isRunning: isStarting,
    phase: isStarting ? 'preparing' : 'preparing',
    message: isStarting ? 'Iniciando sincronização...' : 'Preparando...',
    currentStep: null,
    overallProgress: 0,
    shopifyProgress: {
      processedOrders: 0,
      totalOrders: 0,
      newOrders: 0,
      updatedOrders: 0,
      currentPage: 0,
      totalPages: 0,
      percentage: 0
    },
    stagingProgress: {
      processedLeads: 0,
      totalLeads: 0,
      newLeads: 0,
      updatedLeads: 0
    },
    errors: 0,
    startTime: null,
    endTime: null
  };

  // Se não há status ainda OU o status tem NaN, usar default
  let displayStatus: CompleteSyncStatus = syncStatus || defaultStatus;
  
  // Log detalhado do status atual
  console.log('🎨 [MODAL RENDER] Status atual do modal:', {
    hasSyncStatus: !!syncStatus,
    phase: displayStatus.phase,
    isRunning: displayStatus.isRunning,
    overallProgress: displayStatus.overallProgress,
    currentStep: displayStatus.currentStep,
    shopifyProcessed: displayStatus.shopifyProgress?.processedOrders,
    shopifyTotal: displayStatus.shopifyProgress?.totalOrders,
    stagingProcessed: displayStatus.stagingProgress?.processedLeads,
    stagingTotal: displayStatus.stagingProgress?.totalLeads,
    animatedProgress
  });
  
  // Garantir que nunca mostra NaN
  if (displayStatus && (isNaN(displayStatus.overallProgress) || !isFinite(displayStatus.overallProgress))) {
    console.warn('⚠️ [MODAL] overallProgress é NaN, usando 0');
    displayStatus = { ...displayStatus, overallProgress: 0 };
  }
  
  // Se o status é completed mas não temos runId esperado ainda, tratar como preparando
  if (displayStatus.phase === 'completed' && !displayStatus.isRunning && expectedRunIdRef.current === null) {
    console.warn('⚠️ [MODAL] Status completed sem runId esperado, tratando como preparando');
    displayStatus = {
      ...displayStatus,
      phase: 'preparing',
      isRunning: true,
      endTime: null
    };
  }

  // Get phase icon
  const getPhaseIcon = () => {
    switch (displayStatus.phase) {
      case 'preparing':
        return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />;
      case 'syncing':
        return <RefreshCw className="h-6 w-6 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />;
    }
  };

  const handleClose = () => {
    // Don't close EventSource - let it continue in background
    if (isStarting || hasStartedSyncRef.current) {
      onSyncStateChange?.(true);
    }
    onClose();
  };

  // Safe access to displayStatus properties  
  // CRÍTICO: Só mostrar como completo se REALMENTE está completo E é da execução atual
  // - Deve ter runId E deve ser o runId esperado OU não ter runId (compatibilidade)
  // - phase deve ser 'completed'
  // - isRunning deve ser false
  // - endTime deve existir
  // - Deve ter passado pelo menos 2 segundos desde o startTime (para evitar flicker)
  const statusRunId = (displayStatus as any)?.runId || null;
  const isValidRunId = !expectedRunIdRef.current || !statusRunId || statusRunId === expectedRunIdRef.current;
  
  const hasValidTiming = displayStatus.startTime ? (() => {
    try {
      const start = new Date(displayStatus.startTime);
      const now = new Date();
      const elapsedSeconds = (now.getTime() - start.getTime()) / 1000;
      return elapsedSeconds >= 2; // Mínimo 2 segundos para evitar flicker
    } catch {
      return true; // Se não consegue calcular, assumir válido
    }
  })() : false;
  
  const isActuallyCompleted = 
    isValidRunId && // É da execução atual OU não estamos usando runId ainda
    displayStatus.phase === 'completed' && 
    !displayStatus.isRunning && 
    displayStatus.endTime !== null &&
    hasValidTiming; // Passou tempo suficiente
  
  const justStarted = 
    (!displayStatus.startTime || hasValidTiming === false) || // Não tem startTime ou passou menos de 2s
    (displayStatus.phase === 'preparing' && displayStatus.isRunning && displayStatus.overallProgress === 0);
    
  const isCompleted = isActuallyCompleted && !justStarted && isValidRunId;
  
  // Log detalhado para debug
  if (displayStatus) {
    console.log('🔍 [MODAL] Verificando status:', {
      phase: displayStatus.phase,
      isRunning: displayStatus.isRunning,
      overallProgress: displayStatus.overallProgress,
      hasEndTime: !!displayStatus.endTime,
      hasStartTime: !!displayStatus.startTime,
      expectedRunId: expectedRunIdRef.current,
      statusRunId: statusRunId,
      isValidRunId,
      hasValidTiming,
      isActuallyCompleted,
      justStarted,
      willShowCompleted: isCompleted
    });
  }
  
  const startTime = displayStatus.startTime ? (typeof displayStatus.startTime === 'string' ? new Date(displayStatus.startTime) : new Date(displayStatus.startTime)) : null;
  const endTime = displayStatus.endTime ? (typeof displayStatus.endTime === 'string' ? new Date(displayStatus.endTime) : new Date(displayStatus.endTime)) : null;

  // Error state - show simple error message
  if (error && !syncStatus) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl" data-testid="complete-sync-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <XCircle className="h-6 w-6 text-red-500" />
              Erro ao Inicializar
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Fechar
              </Button>
              <Button onClick={() => {
                setError(null);
                window.location.reload(); // Simple reload as fallback
              }}>
                Tentar Novamente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl" data-testid="complete-sync-dialog">
        <AnimatePresence mode="wait">
          {isCompleted ? (
            // Completed state with summary
            <motion.div
              key="completed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  Sincronização Completa
                </DialogTitle>
              </DialogHeader>

              {displayStatus && (
                <SyncSummaryCard
                  shopifyProgress={displayStatus.shopifyProgress || defaultStatus.shopifyProgress}
                  stagingProgress={displayStatus.stagingProgress || defaultStatus.stagingProgress}
                  startTime={startTime}
                  endTime={endTime}
                  errors={displayStatus.errors || 0}
                  onClose={handleClose}
                />
              )}
            </motion.div>
          ) : (
            // Active sync state
            <motion.div
              key="syncing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getPhaseIcon()}
            Sincronização Completa
          </DialogTitle>
        </DialogHeader>

              {/* Status message */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground" data-testid="sync-message">
                  {displayStatus?.message || "Preparando..."}
            </p>
          </div>

              {/* Overall progress bar */}
              {displayStatus && (
            <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-foreground">
                      Progresso Geral
                </span>
                    <span className="text-sm font-bold text-foreground">
                      {isNaN(animatedProgress) || !isFinite(animatedProgress) 
                        ? '0%' 
                        : `${Math.min(100, Math.max(0, Math.round(animatedProgress)))}%`}
                </span>
              </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.max(0, animatedProgress))}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
              </div>
            </div>
          )}

              {/* Timeline */}
              {displayStatus && (
                <SyncTimeline
                  currentStep={displayStatus.currentStep || null}
                  shopifyProgress={displayStatus.shopifyProgress || defaultStatus.shopifyProgress}
                  stagingProgress={displayStatus.stagingProgress || defaultStatus.stagingProgress}
                  phase={displayStatus.phase || 'preparing'}
                />
              )}

              {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
                {(displayStatus?.isRunning || isStarting) && (
                  <Button 
                    variant="secondary" 
                    onClick={handleClose}
                    data-testid="button-close-running"
                  >
                    Fechar (continua em background)
              </Button>
            )}
            
                {displayStatus?.phase === 'error' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={startCompleteSync}
                  disabled={isStarting}
                  data-testid="button-retry"
                >
                  {isStarting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Tentar Novamente
                </Button>
              </>
            )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}