import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface IntegrationStatus {
  hasPlatform: boolean;
  hasWarehouse: boolean;
  hasAdAccount: boolean;
  hasSupportEmail: boolean;
  allCompleted: boolean;
}

export function OnboardingCard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Get current operation ID from localStorage
  const currentOperationId = localStorage.getItem("current_operation_id");
  
  // Fetch user data to check if card was hidden
  const { data: userData } = useQuery<{
    id: string;
    email: string;
    name: string;
    role: string;
    tourCompleted: boolean;
    onboardingCompleted: boolean;
    onboardingCardHidden: boolean;
  }>({
    queryKey: ['/api/user'],
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache (v5 uses gcTime instead of cacheTime)
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/user?_=" + Date.now(), { // Add timestamp to URL to bypass cache
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
        cache: 'no-store',
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch user data");
      return res.json();
    },
  });
  
  const { data: status, isLoading } = useQuery<IntegrationStatus>({
    queryKey: ["/api/onboarding/integrations-status", { operationId: currentOperationId }],
    enabled: !!currentOperationId, // Only run if we have an operation
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/onboarding/integrations-status", {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-operation-id": currentOperationId || "",
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch integration status");
      return res.json();
    },
  });

  // Fetch user operations to check if user has created an operation
  const { data: operations = [] } = useQuery<{id: string, name: string}[]>({
    queryKey: ['/api/operations'],
  });

  const hideCardMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/onboarding/hide-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to hide card");
      return response.json();
    },
    onSuccess: async () => {
      // Force refetch to bypass HTTP cache
      await queryClient.refetchQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Card ocultado",
        description: "O card de onboarding foi ocultado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível ocultar o card. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleHideCard = () => {
    hideCardMutation.mutate();
    setIsDialogOpen(false);
  };

  if (isLoading) {
    return null; // Don't show anything while loading
  }

  // Debug: Log userData to see what we're receiving
  console.log('🔍 OnboardingCard userData:', userData);

  // Don't show card if user has hidden it
  if (userData?.onboardingCardHidden) {
    console.log('✅ Card hidden by user preference');
    return null;
  }

  if (!status || status.allCompleted) {
    return null; // Don't show card if all steps are completed
  }

  const steps = [
    {
      id: "operation",
      label: "Crie sua Operação de Negócio Digital",
      description: "Defina sua operação para começar a gerenciar seu negócio",
      completed: operations.length > 0,
      link: "/",
    },
    {
      id: "platform",
      label: "Plataforma Integrada",
      description: "Conecte sua loja Shopify ou CartPanda",
      completed: status.hasPlatform,
      link: "/integrations",
    },
    {
      id: "warehouse",
      label: "Armazém Conectado",
      description: "Nossa equipe já deixou sua integração com os armazéns pronta",
      completed: status.hasWarehouse,
      link: "/integrations",
    },
    {
      id: "ads",
      label: "Conta de Anúncios",
      description: "Conecte pelo menos uma conta de anúncios",
      completed: status.hasAdAccount,
      link: "/ads",
    },
  ];

  const completedSteps = steps.filter(step => step.completed).length;
  const totalSteps = steps.length;
  const progress = (completedSteps / totalSteps) * 100;
  
  // Check if first step (operation) is completed
  const hasOperation = operations.length > 0;

  return (
    <Card className="border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900" data-testid="card-onboarding" data-tour-id="onboarding-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg" data-testid="text-onboarding-title">Complete sua Configuração</CardTitle>
            <CardDescription data-testid="text-onboarding-description">
              {completedSteps} de {totalSteps} etapas concluídas
            </CardDescription>
          </div>
          <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mt-2 -mr-2"
                data-testid="button-close-onboarding"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent data-testid="dialog-confirm-hide">
              <AlertDialogHeader>
                <AlertDialogTitle data-testid="text-dialog-title">Ocultar card de onboarding?</AlertDialogTitle>
                <AlertDialogDescription data-testid="text-dialog-description">
                  Você ainda não completou todas as etapas de configuração. Tem certeza que deseja ocultar este card?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-hide">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleHideCard}
                  disabled={hideCardMutation.isPending}
                  data-testid="button-confirm-hide"
                >
                  {hideCardMutation.isPending ? "Ocultando..." : "Sim, ocultar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <Progress value={progress} className="h-2 mt-2" data-testid="progress-onboarding" />
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-3">
          {steps.map((step, index) => {
            // Only allow clicking if it's the first step OR if first step is completed
            const isClickable = index === 0 || hasOperation;
            
            return (
              <div
                key={step.id}
                onClick={() => isClickable && setLocation(step.link)}
                className={`flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 transition-colors ${
                  isClickable 
                    ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' 
                    : 'opacity-50 cursor-not-allowed'
                }`}
                data-testid={`step-${step.id}`}
              >
              {step.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" data-testid={`icon-completed-${step.id}`} />
              ) : (
                <Circle className="h-5 w-5 text-gray-300 dark:text-gray-600 mt-0.5 flex-shrink-0" data-testid={`icon-pending-${step.id}`} />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    step.completed ? "text-green-700 dark:text-green-400" : "text-gray-700 dark:text-gray-300"
                  }`}
                  data-testid={`text-label-${step.id}`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5" data-testid={`text-description-${step.id}`}>
                  {step.description}
                </p>
              </div>
            </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
