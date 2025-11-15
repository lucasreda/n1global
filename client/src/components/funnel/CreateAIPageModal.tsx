import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { useToast } from "@/hooks/use-toast";
import { useAIProgressStream } from "@/hooks/useAIProgressStream";
import ProgressModal from "@/components/ui/ProgressModal";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, Lightbulb, Target, Users } from "lucide-react";
import { authenticatedApiRequest } from "@/lib/auth";

const createAIPageSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  pageType: z.enum(["landing", "checkout", "upsell", "downsell", "thankyou"]),
  product: z.string().min(1, "Produto/serviço é obrigatório"),
  targetAudience: z.string().min(1, "Público-alvo é obrigatório"),
  mainGoal: z.string().min(1, "Objetivo principal é obrigatório"),
  additionalInfo: z.string().optional(),
});

type CreateAIPageForm = z.infer<typeof createAIPageSchema>;

interface CreateAIPageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funnelId: string;
  onSuccess: () => void;
}

export function CreateAIPageModal({ open, onOpenChange, funnelId, onSuccess }: CreateAIPageModalProps) {
  const { selectedOperation } = useCurrentOperation();
  const { toast } = useToast();
  const [showProgressModal, setShowProgressModal] = useState(false);
  
  // AI Progress Stream hook
  const {
    isGenerating,
    currentStepIndex,
    overallProgress,
    steps,
    result,
    error: aiError,
    generatePage,
    reset: resetAI
  } = useAIProgressStream();

  const form = useForm<CreateAIPageForm>({
    resolver: zodResolver(createAIPageSchema),
    defaultValues: {
      name: "",
      pageType: "landing" as const,
      product: "",
      targetAudience: "",
      mainGoal: "",
      additionalInfo: "",
    },
  });

  // Show progress modal when generation starts
  useEffect(() => {
    if (isGenerating) {
      setShowProgressModal(true);
    }
  }, [isGenerating]);

  // Handle AI generation completion
  useEffect(() => {
    if (result) {
      // Wait 3 seconds to show completion state before closing
      setTimeout(() => {
        setShowProgressModal(false);
        toast({
          title: "Sucesso",
          description: "Página criada com IA com sucesso! Conteúdo otimizado gerado.",
        });
        form.reset();
        onSuccess();
        onOpenChange(false);
        // Reset AI state after successful completion
        setTimeout(() => resetAI(), 500);
      }, 3000);
    }
  }, [result, toast, form, onSuccess, onOpenChange, resetAI]);

  // Handle AI generation errors
  useEffect(() => {
    if (aiError) {
      setShowProgressModal(false);
      toast({
        title: "Erro na Geração IA",
        description: aiError,
        variant: "destructive",
      });
      setTimeout(() => resetAI(), 500);
    }
  }, [aiError, toast, resetAI]);

  const handleSubmit = async (data: CreateAIPageForm) => {
    console.log('🚀 Starting AI page generation with data:', data);
    
    // Close the form modal when generation starts
    onOpenChange(false);
    
    // Prepare brief data for AI generation
    const briefData = {
      productInfo: {
        name: data.product,
        description: data.additionalInfo || `${data.product} - ${data.mainGoal}`,
        targetAudience: data.targetAudience,
        mainGoal: data.mainGoal
      },
      pageInfo: {
        name: data.name,
        type: data.pageType,
        funnelId: funnelId
      },
      additionalContext: data.additionalInfo || ''
    };
    
    // Start AI generation with progress tracking
    await generatePage(briefData, {
      enableParallelization: true,
      qualityThreshold: 8.0,
      enableRollback: true
    });
  };

  const pageTypes = [
    { value: 'landing', label: 'Landing Page', description: 'Página de captura e apresentação' },
    { value: 'checkout', label: 'Checkout', description: 'Página de finalização de compra' },
    { value: 'upsell', label: 'Upsell', description: 'Oferta adicional após compra' },
    { value: 'downsell', label: 'Downsell', description: 'Oferta alternativa mais barata' },
    { value: 'thankyou', label: 'Obrigado', description: 'Página de confirmação' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Criar Página com IA
          </DialogTitle>
          <DialogDescription>
            Forneça algumas informações e nossa IA criará uma página otimizada para conversão
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Página</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: Landing Page Curso de Marketing"
                        className="bg-gray-800 border-gray-600"
                        data-testid="input-ai-page-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pageType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Página</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-gray-800 border-gray-600" data-testid="select-ai-page-type">
                          <SelectValue placeholder="Selecione o tipo de página" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pageTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-xs text-gray-500">{type.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="product"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Produto/Serviço
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: Curso online de Marketing Digital"
                        className="bg-gray-800 border-gray-600"
                        data-testid="input-ai-product"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetAudience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Público-Alvo
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: Empreendedores iniciantes, 25-45 anos"
                        className="bg-gray-800 border-gray-600"
                        data-testid="input-ai-audience"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mainGoal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Objetivo Principal
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: Capturar leads, Vender produto, Gerar interesse"
                        className="bg-gray-800 border-gray-600"
                        data-testid="input-ai-goal"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="additionalInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Informações Adicionais (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Descreva características especiais, benefícios únicos, tom de voz desejado, etc..."
                        className="bg-gray-800 border-gray-600"
                        rows={4}
                        data-testid="textarea-ai-additional"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-ai-create"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-create-ai-page"
              >
                {isGenerating && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                <Sparkles className="w-4 h-4 mr-2" />
                {isGenerating ? 'Iniciando IA...' : 'Criar com IA'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
      
      {/* Progress Modal */}
      <ProgressModal
        isOpen={showProgressModal}
        onClose={() => {
          // Only allow closing if there's an error or completed
          if (aiError || result) {
            setShowProgressModal(false);
            resetAI();
          }
        }}
        steps={steps}
        currentStepIndex={currentStepIndex}
        overallProgress={overallProgress}
        title="Gerando Página com IA"
        subtitle="Criando uma experiência premium otimizada para conversão"
      />
    </Dialog>
  );
}