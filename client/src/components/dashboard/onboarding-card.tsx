import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: status, isLoading } = useQuery<IntegrationStatus>({
    queryKey: ["/api/onboarding/integrations-status"],
  });

  const hideCardMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/onboarding/hide-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to hide card");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
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

  if (!status || status.allCompleted) {
    return null; // Don't show card if all steps are completed
  }

  const steps = [
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
      description: "Configure pelo menos um armazém para envio",
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
          {steps.map((step) => (
            <div
              key={step.id}
              onClick={() => window.location.href = step.link}
              className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
