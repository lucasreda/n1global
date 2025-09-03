import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle, XCircle, Settings, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import { useCurrentOperation } from "@/hooks/use-current-operation";

export function EuropeanFulfillmentPanel() {
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const { toast } = useToast();
  const { selectedOperation: operationId } = useCurrentOperation();
  const queryClient = useQueryClient();

  // Test connection query
  const { data: connectionTest, isLoading: testLoading } = useQuery({
    queryKey: ["/api/integrations/european-fulfillment/test", operationId],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", `/api/integrations/european-fulfillment/test?operationId=${operationId}`);
      return response.json();
    },
    enabled: !!operationId,
  });

  // Get stores for display info
  const { data: stores } = useQuery({
    queryKey: ["/api/integrations/european-fulfillment/stores", operationId],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/integrations/european-fulfillment/stores");
      return response.json();
    },
    enabled: connectionTest?.connected && !!operationId,
  });

  // Credentials form schema
  const credentialsSchema = z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(1, "Senha é obrigatória"),
  });

  const credentialsForm = useForm<z.infer<typeof credentialsSchema>>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      email: "unit1@n1storeworld.com",
      password: "Ecom@2025",
    },
  });

  // Update credentials mutation
  const updateCredentialsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await authenticatedApiRequest("POST", "/api/integrations/european-fulfillment/credentials", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Credenciais salvas!" : "Erro ao salvar",
        description: data.message || (data.connected ? "Conexão estabelecida com sucesso" : "Falha na conexão"),
        variant: data.success ? "default" : "destructive"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/european-fulfillment/test"] });
      if (data.success) {
        setShowCredentialsForm(false);
      }
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar credenciais",
        description: "Não foi possível salvar as credenciais. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <Card className="glassmorphism border-0">
        <CardHeader>
          <CardDescription className="text-gray-300">
            Integração completa com centro de fulfillment europeu para gerenciamento de pedidos COD
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="glassmorphism-light rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium flex items-center space-x-2">
                <AlertCircle className="text-blue-400" size={18} />
                <span>Status da Conexão</span>
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCredentialsForm(!showCredentialsForm)}
                className="text-blue-400 border-blue-400/30 hover:bg-blue-400/10"
              >
                <Settings size={16} className="mr-2" />
                Configurar API
              </Button>
            </div>
            
            {testLoading ? (
              <div className="flex items-center space-x-2 text-gray-300">
                <Loader2 className="animate-spin" size={16} />
                <span>Testando conexão...</span>
              </div>
            ) : connectionTest ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  {connectionTest.connected ? (
                    <CheckCircle className="text-green-400" size={18} />
                  ) : (
                    <XCircle className="text-red-400" size={18} />
                  )}
                  <span className={connectionTest.connected ? "text-green-400" : "text-red-400"}>
                    {connectionTest.message}
                  </span>
                </div>
                
                {connectionTest.details && (
                  <div className={`glassmorphism rounded-lg p-3 ${
                    connectionTest.details.includes("simulado") 
                      ? "border-l-4 border-yellow-400" 
                      : ""
                  }`}>
                    <p className="text-gray-300 text-sm">{connectionTest.details}</p>
                    {connectionTest.details.includes("simulado") && (
                      <p className="text-yellow-400 text-xs mt-2">
                        ⚠️ As funcionalidades estão disponíveis para teste local
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {showCredentialsForm && (
              <div className="mt-4 glassmorphism rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">Configurar Credenciais da API</h4>
                <Form {...credentialsForm}>
                  <form onSubmit={credentialsForm.handleSubmit((data) => updateCredentialsMutation.mutate({ ...data, operationId }))} className="space-y-3">
                    <FormField
                      control={credentialsForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Email</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="glassmorphism border-gray-600/30 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={credentialsForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Senha</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              className="glassmorphism border-gray-600/30 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex space-x-2">
                      <Button
                        type="submit"
                        className="gradient-blue"
                        disabled={updateCredentialsMutation.isPending}
                      >
                        {updateCredentialsMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 animate-spin" size={16} />
                            Salvando...
                          </>
                        ) : (
                          "Salvar e Testar"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCredentialsForm(false)}
                        className="border-gray-600/30"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="glassmorphism rounded-lg p-3">
                <h4 className="text-white text-sm font-medium">Foco Regional</h4>
                <p className="text-gray-300 text-xs">Itália (ITALY)</p>
              </div>
              <div className="glassmorphism rounded-lg p-3">
                <h4 className="text-white text-sm font-medium">Lojas Ativas</h4>
                <p className="text-gray-300 text-xs">{stores?.length || 0} lojas</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}