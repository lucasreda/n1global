import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authenticatedApiRequest } from '@/lib/auth';
import { AIContentRequest, AIContentResponse } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface UseAIContentOptions {
  onSuccess?: (data: AIContentResponse) => void;
  onError?: (error: Error) => void;
}

export function useAIContent(options: UseAIContentOptions = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generate section content
  const generateSection = useMutation({
    mutationFn: async (request: AIContentRequest) => {
      const response = await authenticatedApiRequest('/api/ai/generate-section', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      return response.json() as Promise<AIContentResponse>;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Conteúdo gerado",
          description: "A IA gerou novo conteúdo para sua seção.",
        });
        options.onSuccess?.(data);
      } else {
        toast({
          title: "Erro na geração",
          description: data.error || "Não foi possível gerar o conteúdo.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro na geração",
        description: "Falha ao conectar com o serviço de IA.",
        variant: "destructive",
      });
      options.onError?.(error);
    },
  });

  // Rewrite existing text
  const rewriteText = useMutation({
    mutationFn: async (params: {
      text: string;
      goal?: string;
      tone?: string;
      elementType?: string;
      businessContext?: string;
    }) => {
      const response = await authenticatedApiRequest('/api/ai/rewrite-text', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      return response.json() as Promise<AIContentResponse>;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Texto reescrito",
          description: "A IA gerou variações do seu texto.",
        });
        options.onSuccess?.(data);
      } else {
        toast({
          title: "Erro na reescrita",
          description: data.error || "Não foi possível reescrever o texto.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro na reescrita",
        description: "Falha ao conectar com o serviço de IA.",
        variant: "destructive",
      });
      options.onError?.(error);
    },
  });

  // Generate CTA variations
  const generateCTA = useMutation({
    mutationFn: async (params: {
      businessInfo?: {
        name: string;
        industry: string;
        targetAudience: string;
        valueProposition: string;
      };
      pageType?: string;
      currentCTA?: string;
    }) => {
      const response = await authenticatedApiRequest('/api/ai/generate-cta', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      return response.json() as Promise<AIContentResponse>;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "CTAs gerados",
          description: "A IA gerou várias opções de call-to-action.",
        });
        options.onSuccess?.(data);
      } else {
        toast({
          title: "Erro na geração de CTA",
          description: data.error || "Não foi possível gerar os CTAs.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro na geração de CTA",
        description: "Falha ao conectar com o serviço de IA.",
        variant: "destructive",
      });
      options.onError?.(error);
    },
  });

  // Get improvement suggestions
  const getSuggestions = useMutation({
    mutationFn: async (params: {
      elementType: string;
      currentContent: string;
      pageContext?: string;
    }) => {
      const response = await authenticatedApiRequest('/api/ai/suggest-improvements', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      return response.json() as Promise<AIContentResponse>;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Sugestões geradas",
          description: "A IA analisou seu conteúdo e gerou sugestões.",
        });
        options.onSuccess?.(data);
      } else {
        toast({
          title: "Erro nas sugestões",
          description: data.error || "Não foi possível gerar sugestões.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro nas sugestões",
        description: "Falha ao conectar com o serviço de IA.",
        variant: "destructive",
      });
      options.onError?.(error);
    },
  });

  return {
    // Mutations
    generateSection,
    rewriteText,
    generateCTA,
    getSuggestions,
    
    // Loading states
    isGenerating: generateSection.isPending || rewriteText.isPending || generateCTA.isPending || getSuggestions.isPending,
    
    // Individual loading states
    isGeneratingSection: generateSection.isPending,
    isRewritingText: rewriteText.isPending,
    isGeneratingCTA: generateCTA.isPending,
    isGettingSuggestions: getSuggestions.isPending,
  };
}

// Specific hooks for common AI tasks
export function useTextRewriter() {
  const aiContent = useAIContent();

  const rewriteForConversion = (text: string, elementType: string = 'text') => {
    return aiContent.rewriteText.mutate({
      text,
      goal: 'increase_conversion',
      tone: 'persuasive',
      elementType,
    });
  };

  const rewriteForClarity = (text: string, elementType: string = 'text') => {
    return aiContent.rewriteText.mutate({
      text,
      goal: 'improve_clarity',
      tone: 'friendly',
      elementType,
    });
  };

  const makeUrgent = (text: string, elementType: string = 'button') => {
    return aiContent.rewriteText.mutate({
      text,
      goal: 'create_urgency',
      tone: 'urgent',
      elementType,
    });
  };

  return {
    rewriteForConversion,
    rewriteForClarity,
    makeUrgent,
    isLoading: aiContent.isRewritingText,
  };
}

export function useSectionGenerator() {
  const aiContent = useAIContent();

  const generateHeroSection = (businessInfo: any) => {
    const request: AIContentRequest = {
      type: 'generate_section',
      context: {
        sectionType: 'hero',
        businessInfo,
        goal: 'increase_conversion',
        tone: 'professional',
        language: 'pt-BR',
      },
    };
    return aiContent.generateSection.mutate(request);
  };

  const generateBenefitsSection = (businessInfo: any) => {
    const request: AIContentRequest = {
      type: 'generate_section',
      context: {
        sectionType: 'benefits',
        businessInfo,
        goal: 'increase_conversion',
        tone: 'trustworthy',
        language: 'pt-BR',
      },
    };
    return aiContent.generateSection.mutate(request);
  };

  const generateTestimonialsSection = (businessInfo: any) => {
    const request: AIContentRequest = {
      type: 'generate_section',
      context: {
        sectionType: 'testimonials',
        businessInfo,
        goal: 'increase_conversion',
        tone: 'trustworthy',
        language: 'pt-BR',
      },
    };
    return aiContent.generateSection.mutate(request);
  };

  const generateCTASection = (businessInfo: any) => {
    const request: AIContentRequest = {
      type: 'generate_section',
      context: {
        sectionType: 'cta',
        businessInfo,
        goal: 'increase_conversion',
        tone: 'urgent',
        language: 'pt-BR',
      },
    };
    return aiContent.generateSection.mutate(request);
  };

  return {
    generateHeroSection,
    generateBenefitsSection,
    generateTestimonialsSection,
    generateCTASection,
    isLoading: aiContent.isGeneratingSection,
  };
}

export function useCTAGenerator() {
  const aiContent = useAIContent();

  const generateVariations = (businessInfo: any, currentCTA?: string) => {
    return aiContent.generateCTA.mutate({
      businessInfo,
      pageType: 'sales',
      currentCTA,
    });
  };

  const generateForCheckout = (businessInfo: any) => {
    return aiContent.generateCTA.mutate({
      businessInfo,
      pageType: 'checkout',
    });
  };

  const generateForUpsell = (businessInfo: any) => {
    return aiContent.generateCTA.mutate({
      businessInfo,
      pageType: 'upsell',
    });
  };

  return {
    generateVariations,
    generateForCheckout,
    generateForUpsell,
    isLoading: aiContent.isGeneratingCTA,
  };
}