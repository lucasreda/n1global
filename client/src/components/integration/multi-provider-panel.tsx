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
  });

  const credentialsForm = useForm<z.infer<typeof credentialsSchema>>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      email: "",
      password: "",
      authHeader: "",
      warehouseId: "",
      apiUrl: "",
    },
  });

  // Configurar credenciais
  const configureProviderMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedProvider) throw new Error("Nenhum provider selecionado");
      const response = await authenticatedApiRequest("POST", `/api/integrations/${selectedProvider}/credentials`, { ...data, operationId });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Credenciais configuradas!" : "Erro na configuração",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/integrations/providers"] });
        setShowCredentialsForm(false);
        setSelectedProvider(null);
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
    
    // Reset form com valores padrão específicos do provider
    if (providerType === "european_fulfillment") {
      credentialsForm.reset({
        email: "unit1@n1storeworld.com",
        password: "Ecom@2025",
        authHeader: "",
        warehouseId: "",
        apiUrl: "",
      });
    } else if (providerType === "elogy") {
      credentialsForm.reset({
        email: "",
        password: "",
        authHeader: "",
        warehouseId: "",
        apiUrl: "https://api.elogy.io",
      });
    } else {
      credentialsForm.reset();
    }
  };

  const getProviderFields = (providerType: string) => {
    switch (providerType) {
      case "european_fulfillment":
        return ["email", "password"];
      case "elogy":
        return ["email", "password", "warehouseId"];
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
      default: return field;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com botão de sync unificado */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Provedores de Fulfillment</h2>
        <Button
          onClick={() => syncAllMutation.mutate()}
          disabled={syncAllMutation.isPending || syncInProgress}
          className="gradient-blue text-white"
          data-testid="button-sync-all-providers"
        >
          {syncAllMutation.isPending || syncInProgress ? (
            <>
              <Loader2 className="mr-2 animate-spin" size={16} />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2" size={16} />
              Sincronizar Todos
            </>
          )}
        </Button>
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
          {providers?.map((provider: Provider) => (
            <Card key={provider.type} className="glassmorphism border-0" data-testid={`provider-card-${provider.type}`}>
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="text-blue-400" size={20} />
                    <span>{provider.name}</span>
                  </div>
                  <Badge 
                    variant={provider.configured ? "default" : "secondary"}
                    className={provider.configured ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}
                    data-testid={`status-${provider.type}`}
                  >
                    {provider.configured ? "Configurado" : "Pendente"}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-gray-300">
                  {provider.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center">
                  {provider.configured ? (
                    <CheckCircle className="text-green-400" size={48} />
                  ) : (
                    <AlertCircle className="text-yellow-400" size={48} />
                  )}
                </div>
                
                <Button
                  variant="outline"
                  className="w-full text-blue-400 border-blue-400/30 hover:bg-blue-400/10"
                  onClick={() => handleConfigureProvider(provider.type)}
                  data-testid={`button-configure-${provider.type}`}
                >
                  <Settings size={16} className="mr-2" />
                  {provider.configured ? "Reconfigurar" : "Configurar"}
                </Button>
              </CardContent>
            </Card>
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
                Configurar {providers?.find(p => p.type === selectedProvider)?.name}
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