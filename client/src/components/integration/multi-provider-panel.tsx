import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle, XCircle, Settings, Loader2, Package, Play, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { useTourContext } from "@/contexts/tour-context";
import { useLocation } from "wouter";

interface Provider {
  type: string;
  name: string;
  description: string;
  configured: boolean;
  requiresCredentials: string[];
}

export function MultiProviderPanel() {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const { toast } = useToast();
  const { selectedOperation: operationId } = useCurrentOperation();
  const queryClient = useQueryClient();
  const { startSyncTour } = useTourContext();
  const [, setLocation] = useLocation();

  // Buscar status das integrações
  const { data: integrationsStatus } = useQuery({
    queryKey: ['/api/onboarding/integrations-status', { operationId }],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/onboarding/integrations-status');
      return response.json();
    },
    enabled: !!operationId,
  });

  // Buscar todos os providers disponíveis
  const { data: providers, isLoading: providersLoading } = useQuery({
    queryKey: ["/api/integrations/providers", operationId],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", `/api/integrations/providers?operationId=${operationId}`);
      return response.json();
    },
    enabled: !!operationId,
  });

  // Schema para credenciais genéricas
  const credentialsSchema = z.object({
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    password: z.string().optional(),
    authHeader: z.string().optional(),
    warehouseId: z.string().optional(),
    apiUrl: z.string().url("URL inválida").optional().or(z.literal("")),
    appId: z.string().optional(),
    secret: z.string().optional(),
  });

  const credentialsForm = useForm<z.infer<typeof credentialsSchema>>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      email: "",
      password: "",
      authHeader: "",
      warehouseId: "",
      apiUrl: "",
      appId: "",
      secret: "",
    },
  });

  // Configurar credenciais
  const configureProviderMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedProvider) throw new Error("Nenhum provider selecionado");
      
      // Converter nome do provider para formato da URL (underscore -> hífen)
      const providerUrlName = selectedProvider.replace(/_/g, '-');
      
      // Para FHB, usar rota com operationId como parâmetro
      const url = selectedProvider === 'fhb' 
        ? `/api/integrations/${providerUrlName}/${operationId}/credentials`
        : `/api/integrations/${providerUrlName}/credentials`;
      
      const payload = selectedProvider === 'fhb'
        ? data // Para FHB, operationId vai na URL, não no body
        : { ...data, operationId }; // Para outros providers, operationId vai no body
      
      console.log('🔧 Configurando provider:', { selectedProvider, url, payload });
      
      const response = await authenticatedApiRequest("POST", url, payload);
      const result = await response.json();
      
      console.log('📊 Resposta do servidor:', result);
      
      return result;
    },
    onSuccess: async (data) => {
      toast({
        title: data.success ? "Credenciais configuradas!" : "Erro na configuração",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
      if (data.success) {
        await queryClient.invalidateQueries({ queryKey: ["/api/integrations/providers"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/onboarding/integrations-status"] });
        setShowCredentialsForm(false);
        setSelectedProvider(null);

        // Verificar se já tem plataforma configurada (com tratamento de erro)
        try {
          const status = await queryClient.fetchQuery({
            queryKey: ['/api/onboarding/integrations-status', { operationId }],
            queryFn: async () => {
              const response = await authenticatedApiRequest('GET', '/api/onboarding/integrations-status');
              return response.json();
            },
          });

          // Se já tem plataforma, redirecionar para orders e iniciar tour
          if (status?.hasPlatform) {
            toast({
              title: "Pronto para Sincronizar!",
              description: "Agora você pode importar seus pedidos.",
            });
            setTimeout(() => {
              setLocation('/orders');
              setTimeout(() => {
                startSyncTour();
              }, 1000);
            }, 1500);
          }
        } catch (error) {
          console.error('Erro ao verificar status das integrações:', error);
          // Silenciosamente falhar - não atrapalhar o fluxo do usuário
        }
      }
    },
    onError: (error) => {
      toast({
        title: "Erro ao configurar provider",
        description: "Não foi possível salvar as credenciais. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Sync unificado de todos os providers
  const syncAllMutation = useMutation({
    mutationFn: async () => {
      setSyncInProgress(true);
      const response = await authenticatedApiRequest("POST", "/api/integrations/sync-all", { operationId });
      return response.json();
    },
    onSuccess: (data) => {
      setSyncInProgress(false);
      toast({
        title: data.success ? "Sincronização concluída!" : "Sincronização com problemas",
        description: `${data.totalOrdersProcessed} pedidos processados, ${data.totalOrdersCreated} novos, ${data.totalOrdersUpdated} atualizados`,
        variant: data.success ? "default" : "destructive"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sync/stats"] });
    },
    onError: () => {
      setSyncInProgress(false);
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar os providers. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleConfigureProvider = (providerType: string) => {
    setSelectedProvider(providerType);
    setShowCredentialsForm(true);
    
    // Reset form com valores vazios - usuário deve inserir suas próprias credenciais
    credentialsForm.reset({
      email: "",
      password: "",
      authHeader: "",
      warehouseId: "",
      apiUrl: providerType === "elogy" ? "https://api.elogy.io" : providerType === "fhb" ? "https://api.fhb.sk/v3" : "",
      appId: "",
      secret: "",
    });
  };

  const getProviderFields = (providerType: string) => {
    switch (providerType) {
      case "european_fulfillment":
        return ["email", "password"];
      case "elogy":
        return ["email", "password"];
      case "fhb":
        return ["appId", "secret"];
      default:
        return ["email", "password"];
    }
  };

  const getFieldLabel = (field: string) => {
    switch (field) {
      case "email": return "Email";
      case "password": return "Senha";
      case "authHeader": return "Authorization Header";
      case "warehouseId": return "Warehouse ID";
      case "apiUrl": return "URL da API";
      case "appId": return "App ID";
      case "secret": return "Secret";
      default: return field;
    }
  };

  return (
    <div className="p-6">
      {/* Header com título padronizado */}
      <div className="flex items-center space-x-3 mb-6">
        <Package className="text-blue-400" size={20} />
        <h2 className="text-white font-semibold" style={{ fontSize: '20px' }}>Armazéns</h2>
      </div>

      {providersLoading ? (
        <Card className="glassmorphism border-0">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin mr-2" />
            <span className="text-gray-300">Carregando providers...</span>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers?.map((provider: Provider, index: number) => (
            <div key={provider.type} className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6" style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}} data-testid={`provider-card-${provider.type}`}>
              <div className="flex items-center space-x-3 mb-4">
                <div className="text-blue-400 text-3xl font-bold w-8 h-8 flex items-center justify-center">
                  {index + 1}
                </div>
                <div>
                  <h4 className="text-white font-medium">{provider.name}</h4>
                  <p className="text-gray-400 text-sm">{provider.description}</p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                onClick={() => handleConfigureProvider(provider.type)}
                data-testid={`button-configure-${provider.type}`}
              >
                <Settings size={16} className="mr-2" />
                {provider.configured ? "Reconfigurar" : "Configurar"}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Dialog para configuração de credenciais */}
      <Dialog open={showCredentialsForm} onOpenChange={setShowCredentialsForm}>
        <DialogContent className="glassmorphism border-0 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center space-x-2">
              <Package className="text-blue-400" size={20} />
              <span>
                Configurar {providers?.find((p: any) => p.type === selectedProvider)?.name}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedProvider && (
            <Form {...credentialsForm}>
              <form 
                onSubmit={credentialsForm.handleSubmit((data) => configureProviderMutation.mutate(data))} 
                className="space-y-4"
              >
                {getProviderFields(selectedProvider).map((field) => (
                  <FormField
                    key={field}
                    control={credentialsForm.control}
                    name={field as any}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel className="text-gray-200">{getFieldLabel(field)}</FormLabel>
                        <FormControl>
                          <Input
                            {...formField}
                            type={field === "password" ? "password" : "text"}
                            className="glassmorphism border-gray-600/30 text-white"
                            data-testid={`input-${field}-${selectedProvider}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                
                <div className="flex space-x-2 pt-4">
                  <Button
                    type="submit"
                    className="gradient-blue text-white flex-1"
                    disabled={configureProviderMutation.isPending}
                    data-testid="button-save-credentials"
                  >
                    {configureProviderMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 animate-spin" size={16} />
                        Configurando...
                      </>
                    ) : (
                      "Testar e Salvar"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCredentialsForm(false)}
                    className="border-gray-600/30"
                    data-testid="button-cancel-credentials"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}