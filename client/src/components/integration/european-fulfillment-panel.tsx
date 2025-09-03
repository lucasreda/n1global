import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authenticatedApiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Package, Send, Eye, AlertCircle, Settings } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useCurrentOperation } from "@/hooks/use-current-operation";

const createLeadSchema = z.object({
  customerName: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  customerEmail: z.string().email("Email inválido").optional(),
  customerPhone: z.string().min(8, "Telefone deve ter no mínimo 8 caracteres"),
  address: z.string().min(5, "Endereço deve ter no mínimo 5 caracteres"),
  city: z.string().min(2, "Cidade deve ter no mínimo 2 caracteres"),
  province: z.string().min(1, "Província é obrigatória"),
  zipcode: z.string().min(4, "CEP deve ter no mínimo 4 caracteres"),
  country: z.string().min(2, "País é obrigatório"),
  total: z.string().min(1, "Total é obrigatório"),
  paymentType: z.enum(["COD", "prepaid"]),
  items: z.string().min(1, "Itens são obrigatórios"),
});

type CreateLeadForm = z.infer<typeof createLeadSchema>;

export function EuropeanFulfillmentPanel() {
  const [activeTab, setActiveTab] = useState("test");
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const { toast } = useToast();
  const { selectedOperation: operationId } = useCurrentOperation();

  // Test connection query
  const { data: connectionTest, isLoading: testLoading } = useQuery({
    queryKey: ["/api/integrations/european-fulfillment/test", operationId],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/integrations/european-fulfillment/test");
      return response.json();
    },
    enabled: !!operationId,
  });

  // Get countries (filtered to Italy)
  const { data: countries } = useQuery({
    queryKey: ["/api/integrations/european-fulfillment/countries", operationId],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/integrations/european-fulfillment/countries");
      return response.json();
    },
    enabled: connectionTest?.connected && !!operationId,
  });

  // Get stores
  const { data: stores, isLoading: storesLoading } = useQuery({
    queryKey: ["/api/integrations/european-fulfillment/stores", operationId],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/integrations/european-fulfillment/stores");
      return response.json();
    },
    enabled: connectionTest?.connected && !!operationId,
  });

  // Get leads from API (Italy specific)
  const { data: apiLeads, isLoading: apiLeadsLoading } = useQuery({
    queryKey: ["/api/integrations/european-fulfillment/leads", "ITALY", operationId],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/integrations/european-fulfillment/leads?country=ITALY");
      return response.json();
    },
    enabled: connectionTest?.connected && !!operationId,
  });

  // Get fulfillment leads
  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ["/api/fulfillment-leads", operationId],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", `/api/fulfillment-leads?operationId=${operationId}`);
      return response.json();
    },
    enabled: !!operationId,
  });

  // Get products
  const { data: products } = useQuery({
    queryKey: ["/api/products", operationId],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", `/api/products?operationId=${operationId}`);
      return response.json();
    },
    enabled: !!operationId,
  });

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async (data: CreateLeadForm) => {
      const response = await authenticatedApiRequest("POST", "/api/fulfillment-leads", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Lead criado com sucesso!",
        description: "O lead foi enviado para o European Fulfillment Center",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fulfillment-leads"] });
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro ao criar lead",
        description: "Não foi possível criar o lead. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Credentials form schema
  const credentialsSchema = z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(1, "Senha é obrigatória"),
    apiUrl: z.string().url("URL inválida").optional(),
  });

  const form = useForm<CreateLeadForm>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      address: "",
      city: "",
      province: "",
      zipcode: "",
      country: "",
      total: "",
      paymentType: "COD",
      items: JSON.stringify([{ sku: "RS-8050", quantity: "1", total: "149.90" }]),
    },
  });

  const credentialsForm = useForm<z.infer<typeof credentialsSchema>>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      email: "tester@exemple.com",
      password: "password",
      apiUrl: "https://api-test.ecomfulfilment.eu/",
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
        title: "Credenciais atualizadas!",
        description: data.testResult.connected ? "Conexão estabelecida com sucesso" : "Conexão falhou, mas credenciais salvas",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/european-fulfillment/test"] });
      setShowCredentialsForm(false);
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar credenciais",
        description: "Não foi possível salvar as credenciais. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateLeadForm) => {
    createLeadMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-400 border-yellow-400">Pendente</Badge>;
      case "sent":
        return <Badge variant="outline" className="text-blue-400 border-blue-400">Enviado</Badge>;
      case "delivered":
        return <Badge variant="outline" className="text-green-400 border-green-400">Entregue</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="text-red-400 border-red-400">Cancelado</Badge>;
      default:
        return <Badge variant="outline" className="text-gray-400 border-gray-400">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glassmorphism border-0">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Package className="text-blue-400" />
            <span>N1 Warehouse 1</span>
          </CardTitle>
          <CardDescription className="text-gray-300">
            Integração completa com centro de fulfillment europeu para gerenciamento de pedidos COD
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="glassmorphism-light grid w-full grid-cols-5">
              <TabsTrigger value="test" data-testid="tab-connection-test">Status</TabsTrigger>
              <TabsTrigger value="stores" data-testid="tab-stores">Lojas</TabsTrigger>
              <TabsTrigger value="leads" data-testid="tab-leads">Leads</TabsTrigger>
              <TabsTrigger value="create" data-testid="tab-create-lead">Criar Lead</TabsTrigger>
              <TabsTrigger value="products" data-testid="tab-products">Produtos</TabsTrigger>
            </TabsList>

            <TabsContent value="test" className="space-y-4">
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
                      <form onSubmit={credentialsForm.handleSubmit((data) => updateCredentialsMutation.mutate(data))} className="space-y-3">
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
                        <FormField
                          control={credentialsForm.control}
                          name="apiUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-200">API URL (Opcional)</FormLabel>
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
                    <h4 className="text-white text-sm font-medium">API URL</h4>
                    <p className="text-gray-300 text-xs">api.ecomfulfilment.eu</p>
                  </div>
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
            </TabsContent>

            <TabsContent value="stores" className="space-y-4">
              <div className="glassmorphism-light rounded-lg p-4">
                <h3 className="text-white font-medium mb-4 flex items-center space-x-2">
                  <Package className="text-blue-400" size={18} />
                  <span>Lojas Cadastradas</span>
                </h3>
                
                {storesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-blue-400" size={24} />
                  </div>
                ) : stores && stores.length > 0 ? (
                  <div className="space-y-3">
                    {stores.map((store: any, index: number) => (
                      <div key={store.id || index} className="glassmorphism rounded-lg p-4" data-testid={`store-${store.id || index}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="text-white font-medium">{store.name || store.store_name || `Loja ${index + 1}`}</h4>
                            {store.link && (
                              <p className="text-blue-400 text-sm hover:underline cursor-pointer" onClick={() => window.open(store.link, '_blank')}>
                                {store.link}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-green-400 border-green-400">Ativa</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">ID:</span>
                            <span className="text-white ml-2">{store.id || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Foco:</span>
                            <span className="text-white ml-2">Itália</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="mx-auto text-gray-500 mb-4" size={48} />
                    <p className="text-gray-400">Nenhuma loja encontrada</p>
                    <p className="text-gray-500 text-sm mt-2">
                      A conta ainda não possui lojas cadastradas na European Fulfillment Center.
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Use a API para criar lojas através do endpoint: POST api/stores/store
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="leads" className="space-y-4">
              <div className="glassmorphism-light rounded-lg p-4">
                <h3 className="text-white font-medium mb-4 flex items-center space-x-2">
                  <Eye className="text-blue-400" size={18} />
                  <span>Leads da Itália</span>
                  <Badge variant="outline" className="text-blue-400 border-blue-400 ml-2">Dados Reais</Badge>
                </h3>
                
                {(leadsLoading || apiLeadsLoading) ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-blue-400" size={24} />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* API Leads from European Fulfillment */}
                    {apiLeads && apiLeads.length > 0 && (
                      <div>
                        <h4 className="text-white text-sm font-medium mb-3 flex items-center space-x-2">
                          <Package className="text-green-400" size={16} />
                          <span>Leads da API European Fulfillment</span>
                        </h4>
                        <div className="space-y-3">
                          {apiLeads.map((lead: any, index: number) => (
                            <div key={lead.id || index} className="glassmorphism rounded-lg p-4 border-l-4 border-green-400" data-testid={`api-lead-${lead.id || index}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <h5 className="text-white font-medium">{lead.name || lead.customer_name || `Lead ${index + 1}`}</h5>
                                  <p className="text-gray-400 text-sm">Lead: {lead.lead_number || lead.leadNumber || 'N/A'}</p>
                                </div>
                                <Badge variant="outline" className="text-green-400 border-green-400">API Real</Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-400">País:</span>
                                  <span className="text-white ml-2">{lead.country || 'ITALY'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Total:</span>
                                  <span className="text-white ml-2">€{lead.total || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Local Leads */}
                    {leads && leads.length > 0 && (
                      <div>
                        <h4 className="text-white text-sm font-medium mb-3 flex items-center space-x-2">
                          <Package className="text-blue-400" size={16} />
                          <span>Leads Locais</span>
                        </h4>
                        <div className="space-y-3">
                          {leads.map((lead: any) => (
                            <div key={lead.id} className="glassmorphism rounded-lg p-4" data-testid={`lead-${lead.id}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <h5 className="text-white font-medium">{lead.customerName}</h5>
                                  <p className="text-gray-400 text-sm">Lead: {lead.leadNumber}</p>
                                </div>
                                {getStatusBadge(lead.status)}
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-400">País:</span>
                                  <span className="text-white ml-2">{lead.country}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Total:</span>
                                  <span className="text-white ml-2">€{lead.total}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(!apiLeads || apiLeads.length === 0) && (!leads || leads.length === 0) && (
                      <div className="text-center py-8">
                        <Eye className="mx-auto text-gray-500 mb-4" size={48} />
                        <p className="text-gray-400">Nenhum lead encontrado para a Itália</p>
                        <p className="text-gray-500 text-sm mt-2">Crie leads usando a aba "Criar Lead" ou aguarde dados da API</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              <div className="glassmorphism-light rounded-lg p-4">
                <h3 className="text-white font-medium mb-4 flex items-center space-x-2">
                  <Send className="text-blue-400" size={18} />
                  <span>Criar Novo Lead</span>
                </h3>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="customerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-200">Nome do Cliente</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="glassmorphism border-gray-600/30 text-white"
                                data-testid="input-customer-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="customerEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-200">Email (Opcional)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                className="glassmorphism border-gray-600/30 text-white"
                                data-testid="input-customer-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="customerPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-200">Telefone</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="glassmorphism border-gray-600/30 text-white"
                                data-testid="input-customer-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-200">País</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="glassmorphism border-gray-600/30 text-white" data-testid="select-country">
                                  <SelectValue placeholder="Selecione o país" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="glassmorphism border-0">
                                <SelectItem value="PORTUGAL">Portugal</SelectItem>
                                <SelectItem value="SPAIN">Espanha</SelectItem>
                                <SelectItem value="FRANCE">França</SelectItem>
                                <SelectItem value="ITALY">Itália</SelectItem>
                                <SelectItem value="GERMANY">Alemanha</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Endereço</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="glassmorphism border-gray-600/30 text-white"
                              data-testid="input-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-200">Cidade</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="glassmorphism border-gray-600/30 text-white"
                                data-testid="input-city"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="province"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-200">Província</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="glassmorphism border-gray-600/30 text-white"
                                data-testid="input-province"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="zipcode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-200">CEP</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="glassmorphism border-gray-600/30 text-white"
                                data-testid="input-zipcode"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="total"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-200">Total (€)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                step="0.01"
                                className="glassmorphism border-gray-600/30 text-white"
                                data-testid="input-total"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="paymentType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-200">Tipo de Pagamento</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="glassmorphism border-gray-600/30 text-white" data-testid="select-payment-type">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="glassmorphism border-0">
                                <SelectItem value="COD">Cash on Delivery</SelectItem>
                                <SelectItem value="prepaid">Pré-pago</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="items"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Itens (JSON)</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              className="glassmorphism border-gray-600/30 text-white font-mono text-sm"
                              rows={3}
                              placeholder='[{"sku": "RS-8050", "quantity": "1", "total": "149.90"}]'
                              data-testid="textarea-items"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full gradient-blue hover:opacity-90"
                      disabled={createLeadMutation.isPending}
                      data-testid="button-create-lead"
                    >
                      {createLeadMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 animate-spin" size={16} />
                          Criando Lead...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2" size={16} />
                          Criar Lead
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            </TabsContent>

            <TabsContent value="products" className="space-y-4">
              <div className="glassmorphism-light rounded-lg p-4">
                <h3 className="text-white font-medium mb-4 flex items-center space-x-2">
                  <Package className="text-blue-400" size={18} />
                  <span>Produtos Disponíveis</span>
                </h3>
                
                {products && products.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.map((product: any) => (
                      <div key={product.id} className="glassmorphism rounded-lg p-4" data-testid={`product-${product.id}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-medium">{product.name}</h4>
                          <Badge variant="outline" className="text-blue-400 border-blue-400">
                            {product.sku}
                          </Badge>
                        </div>
                        <p className="text-gray-400 text-sm mb-3">{product.description}</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Preço:</span>
                            <span className="text-white ml-2">€{product.price}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Estoque:</span>
                            <span className="text-white ml-2">{product.stock}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8">Nenhum produto encontrado</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}