import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Zap, 
  Plus, 
  ExternalLink, 
  Settings, 
  Eye,
  Rocket,
  Globe,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Clock,
  Star,
  Sparkles,
  ShoppingCart,
  Pill,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Check
} from "lucide-react";
import { Link } from "wouter";
import { authenticatedApiRequest } from "@/lib/auth";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  createFunnelSchema, 
  CreateFunnelData,
  VercelIntegration, 
  Funnel, 
  FunnelTemplate 
} from "@shared/schema";

export default function Funnels() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState(1);
  const { selectedOperation } = useCurrentOperation();
  const { toast } = useToast();

  // Handle OAuth callback from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      toast({
        title: "Erro de OAuth",
        description: `Falha na conexão: ${error}`,
        variant: "destructive",
      });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (code && state) {
      // Extract operationId from state (format: userId_timestamp_random_operationId)
      const stateParts = state.split('_');
      let operationId = selectedOperation;
      
      // Try to find operationId in state (if it was included in the state)
      if (stateParts.length >= 4) {
        operationId = stateParts.slice(3).join('_'); // Get everything after the third underscore
      }
      
      // Use selectedOperation as fallback
      if (!operationId) {
        operationId = selectedOperation;
      }
      
      // Only process if we have an operationId
      if (operationId) {
        console.log('🔐 Processing OAuth callback with operation:', operationId);
        handleOAuthCallback(code, state, operationId);
      } else {
        console.warn('⚠️ OAuth callback received but no operation selected');
        toast({
          title: "Aviso",
          description: "Por favor, selecione uma operação e tente conectar novamente",
          variant: "default",
        });
      }
    }
  }, [selectedOperation, toast]);

  // Handle OAuth callback and connect integration
  const handleOAuthCallback = async (code: string, state: string, operationId: string) => {
    try {
      console.log('🔄 Connecting Vercel integration...');
      const response = await authenticatedApiRequest('POST', '/api/funnels/vercel/connect', {
        operationId: operationId,
        code: code,
        state: state,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Vercel connected:', result);
        toast({
          title: "Sucesso",
          description: "Integração Vercel conectada com sucesso!",
        });
        refetchVercel();
      } else {
        const errorData = await response.json();
        console.error('❌ Connection failed:', errorData);
        throw new Error(errorData.error || 'Erro ao conectar integração');
      }
    } catch (error) {
      console.error('❌ OAuth callback error:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao conectar integração Vercel",
        variant: "destructive",
      });
    } finally {
      // Clean URL parameters
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  // Form for creating funnels
  const form = useForm<CreateFunnelData>({
    resolver: zodResolver(createFunnelSchema),
    defaultValues: {
      name: "",
      type: "ecommerce" as const,
      language: "pt-BR" as const,
      currency: "EUR" as const,
    },
  });

  // Fetch Vercel integration status
  const { data: vercelIntegration, refetch: refetchVercel } = useQuery<VercelIntegration>({
    queryKey: ['/api/funnels/vercel/status', selectedOperation],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', `/api/funnels/vercel/status?operationId=${selectedOperation}`);
      return await response.json();
    },
    enabled: !!selectedOperation,
  });

  // Fetch funnel templates
  const { data: templates } = useQuery<{ templates: FunnelTemplate[] }>({
    queryKey: ['/api/funnels/templates'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/funnels/templates');
      return await response.json();
    },
  });

  // Fetch funnels for current operation
  const { data: funnelsData, refetch: refetchFunnels } = useQuery<{ funnels: Funnel[] }>({
    queryKey: ['/api/funnels', selectedOperation],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', `/api/funnels?operationId=${selectedOperation}`);
      return await response.json();
    },
    enabled: !!selectedOperation,
  });

  // Connect to Vercel
  const handleConnectVercel = async () => {
    try {
      if (!selectedOperation) {
        toast({
          title: "Aviso",
          description: "Por favor, selecione uma operação primeiro",
          variant: "default",
        });
        return;
      }
      
      const response = await authenticatedApiRequest('GET', `/api/funnels/vercel/oauth-url?operationId=${selectedOperation}`);
      
      if (response.ok) {
        const { oauthUrl } = await response.json();
        window.open(oauthUrl, '_blank', 'width=800,height=700'); // Volta a abrir em nova janela como antes
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao obter URL OAuth');
      }
    } catch (error) {
      console.error('❌ Error connecting to Vercel:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao conectar com Vercel",
        variant: "destructive",
      });
    }
  };

  // Reset modal steps when closing
  const handleCloseModal = () => {
    setOpenDialog(null);
    setModalStep(1);
    form.reset();
  };

  // Navigate modal steps
  const handleNextStep = (e?: React.MouseEvent) => {
    // Prevent any form submission
    e?.preventDefault();
    e?.stopPropagation();
    
    setModalStep(prev => Math.min(prev + 1, 3));
  };

  const handlePrevStep = (e?: React.MouseEvent) => {
    // Prevent any form submission
    e?.preventDefault();
    e?.stopPropagation();
    
    setModalStep(prev => Math.max(prev - 1, 1));
  };

  // Create new funnel
  const handleCreateFunnel = async (data: CreateFunnelData) => {
    // Only allow creation in step 3
    if (modalStep !== 3) {
      console.warn('Tentativa de criar funil fora da etapa 3, ignorando');
      return;
    }
    
    // Validate required data
    if (!selectedOperation) {
      toast({
        title: "Erro",
        description: "Nenhuma operação selecionada. Por favor, selecione uma operação.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      console.log('🚀 Criando funil:', { data, operationId: selectedOperation });
      const response = await authenticatedApiRequest('POST', '/api/funnels', {
        ...data,
        operationId: selectedOperation,
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Sucesso",
          description: "Funil criado com sucesso! IA está gerando conteúdo...",
        });
        handleCloseModal();
        refetchFunnels();
      } else {
        throw new Error('Erro ao criar funil');
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar funil",
        variant: "destructive",
      });
    }
  };

  // Get funnel type info
  const getFunnelTypeInfo = (type: string) => {
    const types = {
      ecommerce: { 
        title: "E-commerce", 
        description: "Funil para venda de produtos físicos",
        icon: ShoppingCart,
      },
      nutraceutico: { 
        title: "Nutracêutico", 
        description: "Funil para suplementos e produtos de saúde",
        icon: Pill,
      },
      infoproduto: { 
        title: "Infoproduto", 
        description: "Funil para cursos, ebooks e conteúdo digital",
        icon: BookOpen,
      },
    };
    return types[type as keyof typeof types] || types.ecommerce;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Rascunho", variant: "secondary" as const },
      generating: { label: "Gerando IA", variant: "default" as const },
      ready: { label: "Pronto", variant: "default" as const },
      deploying: { label: "Deploy...", variant: "default" as const },
      deployed: { label: "Online", variant: "default" as const },
      error: { label: "Erro", variant: "destructive" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      ecommerce: "🛒",
      lead_gen: "📧", 
      webinar: "🎥",
      app: "📱",
      service: "⚡",
    };
    return icons[category as keyof typeof icons] || "📄";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <DashboardHeader 
        title="Funis de Venda"
        subtitle="Crie landing pages com IA e deploy automático no Vercel"
      />
      
      <main className="container mx-auto px-6 py-8">
        {/* Action Buttons */}
        <div className="flex items-center justify-end mb-8">
          
          <div className="flex gap-4">
            {!vercelIntegration?.connected ? (
              <Button 
                onClick={handleConnectVercel}
                className="bg-black text-white hover:bg-gray-800"
                data-testid="button-connect-vercel"
              >
                <Zap className="w-4 h-4 mr-2" />
                Conectar Vercel
              </Button>
            ) : (
              <Dialog open={openDialog === 'create'} onOpenChange={handleCloseModal}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    data-testid="button-create-funnel"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Funil
                  </Button>
                </DialogTrigger>
                <DialogContent className="glassmorphism sm:max-w-[800px] max-h-[90vh] overflow-hidden bg-transparent backdrop-blur-lg border-white/10">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-foreground">
                      <Sparkles className="w-5 h-5 text-primary" />
                      Criar Funil com IA
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-4">
                      <div className="flex gap-2">
                        {[1, 2, 3].map((step) => (
                          <div
                            key={step}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors
                              ${modalStep >= step 
                                ? 'gradient-blue text-white' 
                                : 'bg-white/10 text-muted-foreground border border-white/20'
                              }`}
                          >
                            {modalStep > step ? <Check className="w-4 h-4" /> : step}
                          </div>
                        ))}
                      </div>
                      <div className="flex-1 bg-white/10 h-1 rounded-full mx-4">
                        <div 
                          className="gradient-blue h-1 rounded-full transition-all duration-300"
                          style={{ width: `${((modalStep - 1) / 2) * 100}%` }}
                        />
                      </div>
                    </div>
                  </DialogHeader>
                  
                  <form onSubmit={form.handleSubmit(handleCreateFunnel)} className="mt-6">
                    {/* Step 1: Tipo do Funil */}
                    {modalStep === 1 && (
                      <div className="space-y-6">
                        <div className="text-center">
                          <h3 className="text-xl font-semibold mb-2 text-foreground">Escolha o Tipo do Funil</h3>
                          <p className="text-muted-foreground text-sm">
                            Selecione o tipo que melhor se adapta ao seu produto ou serviço
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {["ecommerce", "nutraceutico", "infoproduto"].map((type) => {
                            const typeInfo = getFunnelTypeInfo(type);
                            const IconComponent = typeInfo.icon;
                            const isSelected = form.watch("type") === type;
                            
                            return (
                              <Card
                                key={type}
                                className={`glassmorphism-light cursor-pointer transition-all hover:bg-white/5 border-white/10 ${
                                  isSelected 
                                    ? 'bg-blue-600 border-blue-500 ring-2 ring-blue-400' 
                                    : 'hover:border-white/20'
                                }`}
                                onClick={() => form.setValue("type", type as any)}
                                data-testid={`card-funnel-type-${type}`}
                              >
                                <CardContent className="p-6 text-center">
                                  <IconComponent className={`w-12 h-12 mx-auto mb-4 ${isSelected ? 'text-white' : 'text-primary'}`} />
                                  <h4 className={`font-semibold text-lg mb-2 ${isSelected ? 'text-white' : 'text-foreground'}`}>{typeInfo.title}</h4>
                                  <p className={`text-sm ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>{typeInfo.description}</p>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Step 2: Configurações Básicas */}
                    {modalStep === 2 && (
                      <div className="space-y-6">
                        <div className="text-center">
                          <h3 className="text-xl font-semibold mb-2 text-foreground">Configurações Básicas</h3>
                          <p className="text-muted-foreground text-sm">
                            Configure as informações principais do seu funil
                          </p>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="name" className="text-foreground">Nome do Funil</Label>
                            <Input
                              id="name"
                              {...form.register("name")}
                              placeholder="Ex: Lançamento Produto X"
                              className="bg-secondary text-foreground border-border placeholder:text-muted-foreground"
                              data-testid="input-funnel-name"
                            />
                            {form.formState.errors.name && (
                              <p className="text-destructive text-sm mt-1">{form.formState.errors.name.message}</p>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="language" className="text-foreground">Idioma</Label>
                              <Select 
                                onValueChange={(value) => form.setValue("language", value as any)}
                                defaultValue={form.getValues("language")}
                              >
                                <SelectTrigger data-testid="select-language" className="bg-secondary text-foreground border-border">
                                  <SelectValue placeholder="Selecione o idioma" className="placeholder:text-muted-foreground" />
                                </SelectTrigger>
                                <SelectContent className="glassmorphism border-white/10">
                                  <SelectItem value="pt-BR">🇧🇷 Português (Brasil)</SelectItem>
                                  <SelectItem value="en-US">🇺🇸 English (US)</SelectItem>
                                  <SelectItem value="es-ES">🇪🇸 Español (España)</SelectItem>
                                  <SelectItem value="fr-FR">🇫🇷 Français (France)</SelectItem>
                                  <SelectItem value="de-DE">🇩🇪 Deutsch (Deutschland)</SelectItem>
                                  <SelectItem value="it-IT">🇮🇹 Italiano (Italia)</SelectItem>
                                  <SelectItem value="nl-NL">🇳🇱 Nederlands (Nederland)</SelectItem>
                                  <SelectItem value="ru-RU">🇷🇺 Русский (Россия)</SelectItem>
                                  <SelectItem value="pl-PL">🇵🇱 Polski (Polska)</SelectItem>
                                  <SelectItem value="sv-SE">🇸🇪 Svenska (Sverige)</SelectItem>
                                  <SelectItem value="da-DK">🇩🇰 Dansk (Danmark)</SelectItem>
                                  <SelectItem value="no-NO">🇳🇴 Norsk (Norge)</SelectItem>
                                  <SelectItem value="fi-FI">🇫🇮 Suomi (Suomi)</SelectItem>
                                  <SelectItem value="el-GR">🇬🇷 Ελληνικά (Ελλάδα)</SelectItem>
                                  <SelectItem value="hu-HU">🇭🇺 Magyar (Magyarország)</SelectItem>
                                  <SelectItem value="cs-CZ">🇨🇿 Čeština (Česká republika)</SelectItem>
                                  <SelectItem value="ar-SA">🇸🇦 العربية (السعودية)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label htmlFor="currency" className="text-foreground">Moeda</Label>
                              <Select 
                                onValueChange={(value) => form.setValue("currency", value as any)}
                                defaultValue={form.getValues("currency")}
                              >
                                <SelectTrigger data-testid="select-currency" className="bg-secondary text-foreground border-border">
                                  <SelectValue placeholder="Selecione a moeda" className="placeholder:text-muted-foreground" />
                                </SelectTrigger>
                                <SelectContent className="glassmorphism border-white/10">
                                  <SelectItem value="EUR">🇪🇺 EUR (€)</SelectItem>
                                  <SelectItem value="USD">🇺🇸 USD ($)</SelectItem>
                                  <SelectItem value="BRL">🇧🇷 BRL (R$)</SelectItem>
                                  <SelectItem value="GBP">🇬🇧 GBP (£)</SelectItem>
                                  <SelectItem value="CHF">🇨🇭 CHF (CHF)</SelectItem>
                                  <SelectItem value="SEK">🇸🇪 SEK (kr)</SelectItem>
                                  <SelectItem value="DKK">🇩🇰 DKK (kr)</SelectItem>
                                  <SelectItem value="NOK">🇳🇴 NOK (kr)</SelectItem>
                                  <SelectItem value="PLN">🇵🇱 PLN (zł)</SelectItem>
                                  <SelectItem value="CZK">🇨🇿 CZK (Kč)</SelectItem>
                                  <SelectItem value="HUF">🇭🇺 HUF (Ft)</SelectItem>
                                  <SelectItem value="RON">🇷🇴 RON (lei)</SelectItem>
                                  <SelectItem value="BGN">🇧🇬 BGN (лв)</SelectItem>
                                  <SelectItem value="AED">🇦🇪 AED (د.إ)</SelectItem>
                                  <SelectItem value="SAR">🇸🇦 SAR (﷼)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Revisão */}
                    {modalStep === 3 && (
                      <div className="space-y-6">
                        <div className="text-center">
                          <h3 className="text-xl font-semibold mb-2 text-foreground">Revisar e Criar</h3>
                          <p className="text-muted-foreground text-sm">
                            Confira as informações antes de criar seu funil
                          </p>
                        </div>
                        
                        <Card className="glassmorphism-light border-white/10">
                          <CardContent className="p-6">
                            <h4 className="font-semibold mb-4 text-foreground">Resumo do Funil</h4>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Tipo:</span>
                                <span className="font-medium text-foreground">{getFunnelTypeInfo(form.watch("type")).title}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Nome:</span>
                                <span className="font-medium text-foreground">{form.watch("name") || "Sem nome"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Idioma:</span>
                                <span className="font-medium text-foreground">
                                  {form.watch("language") === "pt-BR" && "🇧🇷 Português (Brasil)"}
                                  {form.watch("language") === "en-US" && "🇺🇸 English (US)"}
                                  {form.watch("language") === "es-ES" && "🇪🇸 Español (España)"}
                                  {form.watch("language") === "fr-FR" && "🇫🇷 Français (France)"}
                                  {form.watch("language") === "de-DE" && "🇩🇪 Deutsch (Deutschland)"}
                                  {form.watch("language") === "it-IT" && "🇮🇹 Italiano (Italia)"}
                                  {form.watch("language") === "nl-NL" && "🇳🇱 Nederlands (Nederland)"}
                                  {form.watch("language") === "ru-RU" && "🇷🇺 Русский (Россия)"}
                                  {form.watch("language") === "pl-PL" && "🇵🇱 Polski (Polska)"}
                                  {form.watch("language") === "sv-SE" && "🇸🇪 Svenska (Sverige)"}
                                  {form.watch("language") === "da-DK" && "🇩🇰 Dansk (Danmark)"}
                                  {form.watch("language") === "no-NO" && "🇳🇴 Norsk (Norge)"}
                                  {form.watch("language") === "fi-FI" && "🇫🇮 Suomi (Suomi)"}
                                  {form.watch("language") === "el-GR" && "🇬🇷 Ελληνικά (Ελλάδα)"}
                                  {form.watch("language") === "hu-HU" && "🇭🇺 Magyar (Magyarország)"}
                                  {form.watch("language") === "cs-CZ" && "🇨🇿 Čeština (Česká republika)"}
                                  {form.watch("language") === "ar-SA" && "🇸🇦 العربية (السعودية)"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Moeda:</span>
                                <span className="font-medium text-foreground">
                                  {form.watch("currency") === "EUR" && "🇪🇺 EUR (€)"}
                                  {form.watch("currency") === "USD" && "🇺🇸 USD ($)"}
                                  {form.watch("currency") === "BRL" && "🇧🇷 BRL (R$)"}
                                  {form.watch("currency") === "GBP" && "🇬🇧 GBP (£)"}
                                  {form.watch("currency") === "CHF" && "🇨🇭 CHF (CHF)"}
                                  {form.watch("currency") === "SEK" && "🇸🇪 SEK (kr)"}
                                  {form.watch("currency") === "DKK" && "🇩🇰 DKK (kr)"}
                                  {form.watch("currency") === "NOK" && "🇳🇴 NOK (kr)"}
                                  {form.watch("currency") === "PLN" && "🇵🇱 PLN (zł)"}
                                  {form.watch("currency") === "CZK" && "🇨🇿 CZK (Kč)"}
                                  {form.watch("currency") === "HUF" && "🇭🇺 HUF (Ft)"}
                                  {form.watch("currency") === "RON" && "🇷🇴 RON (lei)"}
                                  {form.watch("currency") === "BGN" && "🇧🇬 BGN (лв)"}
                                  {form.watch("currency") === "AED" && "🇦🇪 AED (د.إ)"}
                                  {form.watch("currency") === "SAR" && "🇸🇦 SAR (﷼)"}
                                </span>
                              </div>
                            </div>
                            
                            <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
                              <div className="flex items-start gap-2">
                                <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                                <div>
                                  <p className="font-medium text-primary">IA irá gerar:</p>
                                  <ul className="text-sm text-primary/80 mt-1 space-y-1">
                                    <li>• Landing page otimizada para conversão</li>
                                    <li>• Conteúdo personalizado para seu nicho</li>
                                    <li>• Design responsivo e moderno</li>
                                    <li>• Deploy automático no Vercel</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                    
                    {/* Navigation Buttons */}
                    <div className="flex justify-between pt-6 border-t border-white/10">
                      <div className="flex gap-2">
                        {modalStep > 1 && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={(e) => {
                              e.preventDefault();
                              handlePrevStep(e);
                            }}
                            className="border-white/20 text-muted-foreground hover:text-foreground hover:bg-white/5"
                            data-testid="button-prev-step"
                          >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Voltar
                          </Button>
                        )}
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleCloseModal}
                          className="border-white/20 text-muted-foreground hover:text-foreground hover:bg-white/5"
                          data-testid="button-cancel"
                        >
                          Cancelar
                        </Button>
                      </div>
                      
                      <div>
                        {modalStep < 3 ? (
                          <Button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleNextStep(e);
                            }}
                            className="gradient-blue text-white"
                            data-testid="button-next-step"
                          >
                            Continuar
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        ) : (
                          <Button 
                            type="submit" 
                            disabled={!selectedOperation}
                            className="gradient-blue text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            data-testid="button-submit-funnel"
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Criar Funil
                          </Button>
                        )}
                      </div>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Vercel Integration Status */}
        {!vercelIntegration?.connected && (
          <Card className="bg-yellow-500/10 border-yellow-500/20 mb-8">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <div>
                  <h3 className="text-white font-semibold">Conectar com Vercel</h3>
                  <p className="text-gray-400 text-sm">
                    Conecte sua conta Vercel para criar e hospedar funis automaticamente
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleConnectVercel}
                className="bg-black text-white hover:bg-gray-800"
                data-testid="button-connect-vercel-card"
              >
                <Zap className="w-4 h-4 mr-2" />
                Conectar Agora
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Templates Section */}
        {templates?.templates && templates.templates.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4" data-testid="text-templates-title">
              Templates Disponíveis
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.templates.slice(0, 3).map((template) => (
                <Card key={template.id} className="bg-black/20 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <span className="text-lg">{getCategoryIcon(template.category)}</span>
                      {template.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 text-xs mb-3">{template.description}</p>
                    <div className="flex gap-2 flex-wrap">
                      {template.templateConfig?.sections?.slice(0, 3).map((section) => (
                        <Badge key={section} variant="outline" className="text-xs">
                          {section}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Funnels List */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4" data-testid="text-funnels-title">
            Meus Funis
          </h2>
          
          {!funnelsData?.funnels || funnelsData.funnels.length === 0 ? (
            <Card className="bg-black/20 backdrop-blur-sm border-white/10">
              <CardContent className="text-center py-12">
                <Rocket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-white font-semibold mb-2">Nenhum funil criado ainda</h3>
                <p className="text-gray-400 mb-6">
                  Crie seu primeiro funil de venda com IA e comece a converter visitantes em clientes
                </p>
                {vercelIntegration?.connected && (
                  <Button 
                    onClick={() => setOpenDialog('create')}
                    className="bg-gradient-to-r from-blue-600 to-purple-600"
                    data-testid="button-create-first-funnel"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Funil
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {funnelsData.funnels.map((funnel) => (
                <Card key={funnel.id} className="bg-black/20 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-white text-lg" data-testid={`text-funnel-name-${funnel.id}`}>
                        {funnel.name}
                      </CardTitle>
                      {getStatusBadge(funnel.status)}
                    </div>
                    {funnel.description && (
                      <CardDescription className="text-gray-400" data-testid={`text-funnel-description-${funnel.id}`}>
                        {funnel.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Star className="w-4 h-4" />
                      {getFunnelTypeInfo(funnel.type).title}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Criado em {funnel.createdAt ? new Date(funnel.createdAt).toLocaleDateString('pt-BR') : 'Data não disponível'}</span>
                      {funnel.aiCost && parseFloat(funnel.aiCost) > 0 && (
                        <span>IA: ${parseFloat(funnel.aiCost).toFixed(4)}</span>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Link href={`/funnels/${funnel.id}`}>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          data-testid={`button-view-details-${funnel.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Detalhes
                        </Button>
                      </Link>
                      {funnel.status === 'ready' && (
                        <Button 
                          size="sm" 
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          data-testid={`button-deploy-${funnel.id}`}
                        >
                          <Rocket className="w-4 h-4 mr-1" />
                          Deploy
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}