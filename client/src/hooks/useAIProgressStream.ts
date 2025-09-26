import { useState, useEffect, useRef, useCallback } from 'react';

interface ProgressStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress?: number;
  duration?: number;
}

interface ProgressData {
  type: 'connected' | 'step_started' | 'step_progress' | 'step_completed' | 'completed' | 'error';
  sessionId: string;
  step?: string;
  stepIndex?: number;
  totalSteps?: number;
  progress?: number;
  title?: string;
  description?: string;
  timestamp: string;
  result?: any;
}

export function useAIProgressStream() {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const [, setAbortController] = useState<AbortController | null>(null);

  // Initialize default steps
  const initializeSteps = useCallback(() => {
    return [
      {
        id: 'analyze',
        title: 'Analisando Brief',
        description: 'Processando informações do produto e mercado',
        icon: 'Brain',
        status: 'pending' as const
      },
      {
        id: 'content',
        title: 'Gerando Conteúdo',
        description: 'Criando textos persuasivos e estrutura',
        icon: 'Sparkles',
        status: 'pending' as const
      },
      {
        id: 'design',
        title: 'Definindo Design',
        description: 'Aplicando paleta de cores e tipografia',
        icon: 'Palette',
        status: 'pending' as const
      },
      {
        id: 'media',
        title: 'Criando Imagens IA',
        description: 'Gerando imagens profissionais com DALL-E',
        icon: 'Image',
        status: 'pending' as const
      },
      {
        id: 'optimize',
        title: 'Otimizando Qualidade',
        description: 'Aplicando gates de qualidade visual',
        icon: 'Zap',
        status: 'pending' as const
      }
    ];
  }, []);

  // Connect to progress stream
  const connectToStream = useCallback((sessionId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    console.log(`🔌 Connecting to progress stream: ${sessionId}`);
    
    const eventSource = new EventSource(`/api/ai/progress-stream/${sessionId}`);
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      console.log('✅ Progress stream connected');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: ProgressData = JSON.parse(event.data);
        console.log('📡 Progress update:', data);
        
        handleProgressUpdate(data);
      } catch (error) {
        console.error('❌ Failed to parse progress data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ Progress stream error:', error);
      setIsConnected(false);
      setError('Conexão com servidor perdida');
    };

    setSessionId(sessionId);
  }, []);

  // Handle progress updates
  const handleProgressUpdate = useCallback((data: ProgressData) => {
    switch (data.type) {
      case 'connected':
        console.log('🔗 Stream connected for session:', data.sessionId);
        break;

      case 'step_started':
        setCurrentStepIndex(data.stepIndex || 0);
        setOverallProgress(data.progress || 0);
        setSteps(prev => prev.map((step, index) => {
          if (index === data.stepIndex) {
            return { ...step, status: 'running' as const };
          }
          return step;
        }));
        break;

      case 'step_progress':
        setOverallProgress(data.progress || 0);
        setSteps(prev => prev.map((step, index) => {
          if (index === data.stepIndex) {
            return { ...step, progress: data.progress };
          }
          return step;
        }));
        break;

      case 'step_completed':
        setSteps(prev => prev.map((step, index) => {
          if (index === data.stepIndex) {
            return { ...step, status: 'completed' as const, progress: 100 };
          }
          return step;
        }));
        break;

      case 'completed':
        setOverallProgress(100);
        setResult(data.result);
        setIsGenerating(false);
        setSteps(prev => prev.map(step => ({ ...step, status: 'completed' as const })));
        
        // Close connection after completion
        setTimeout(() => {
          disconnect();
        }, 2000);
        break;

      case 'error':
        setError(data.description || 'Erro na geração');
        setIsGenerating(false);
        setSteps(prev => prev.map((step, index) => {
          if (index === data.stepIndex) {
            return { ...step, status: 'error' as const };
          }
          return step;
        }));
        break;
    }
  }, []);

  // Start AI generation with progress tracking
  const generatePage = useCallback(async (briefData: any, options?: any) => {
    try {
      setIsGenerating(true);
      setError(null);
      setResult(null);
      setSteps(initializeSteps());
      setCurrentStepIndex(0);
      setOverallProgress(0);

      console.log('🚀 Starting AI page generation...');

      const abortController = new AbortController();
      setAbortController(abortController);

      const response = await fetch('/api/ai/generate-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          briefData,
          options
        }),
        signal: abortController.signal,
      });

      const data = await response.json();

      if (data.success && data.sessionId) {
        console.log('✅ Generation started, connecting to stream...');
        connectToStream(data.sessionId);
      } else {
        throw new Error(data.details || 'Failed to start generation');
      }

    } catch (error) {
      console.error('❌ Failed to start generation:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      setIsGenerating(false);
    }
  }, [initializeSteps, connectToStream]);

  // Disconnect from stream
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setSessionId(null);
  }, []);

  // Reset state
  const reset = useCallback(() => {
    disconnect();
    setIsGenerating(false);
    setError(null);
    setResult(null);
    setSteps(initializeSteps());
    setCurrentStepIndex(0);
    setOverallProgress(0);
  }, [disconnect, initializeSteps]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // State
    isConnected,
    isGenerating,
    sessionId,
    currentStepIndex,
    overallProgress,
    steps,
    result,
    error,
    
    // Actions
    generatePage,
    reset,
    disconnect
  };
}