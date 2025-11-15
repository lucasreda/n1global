import { AffiliateLayout } from "@/components/affiliate/affiliate-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useRoute, Link } from "wouter";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  Loader2,
  Code2,
  Facebook,
  type LucideIcon,
} from "lucide-react";
import { SiGoogle, SiTiktok } from "react-icons/si";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface AffiliateProductPixel {
  id: string;
  affiliateId: string;
  productId: string;
  landingPageId: string | null;
  pixelType: string;
  pixelId: string;
  accessToken: string | null;
  events: {
    pageView?: boolean;
    purchase?: boolean;
    lead?: boolean;
    addToCart?: boolean;
    initiateCheckout?: boolean;
    custom?: string[];
  };
  customCode: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PixelTypeConfig {
  label: string;
  icon: LucideIcon | React.ComponentType<any>;
  color: string;
  description: string;
}

const pixelTypes: Record<string, PixelTypeConfig> = {
  meta: {
    label: "Meta (Facebook)",
    icon: Facebook,
    color: "text-blue-500",
    description: "Meta Pixel para Facebook e Instagram Ads",
  },
  google_ads: {
    label: "Google Ads",
    icon: SiGoogle,
    color: "text-red-500",
    description: "Google Ads Conversion Tracking",
  },
  tiktok: {
    label: "TikTok",
    icon: SiTiktok,
    color: "text-pink-500",
    description: "TikTok Pixel para anúncios",
  },
  custom: {
    label: "Custom",
    icon: Code2,
    color: "text-purple-500",
    description: "Código personalizado de tracking",
  },
};

export default function ProductPixels() {
  const { toast } = useToast();
  const [, params] = useRoute("/affiliate/products/:productId/pixels");
  const productId = params?.productId || "";
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewCode, setPreviewCode] = useState("");
  const [selectedPixelType, setSelectedPixelType] = useState<string>("");
  const [pixelId, setPixelId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [events, setEvents] = useState({
    pageView: true,
    purchase: true,
    lead: false,
    addToCart: false,
    initiateCheckout: false,
  });

  const { data: pixels = [], isLoading } = useQuery<AffiliateProductPixel[]>({
    queryKey: ['/api/affiliate/pixels/products', productId],
    enabled: !!productId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/affiliate/pixels', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/pixels/products', productId] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Pixel criado!",
        description: "O pixel foi configurado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar pixel",
        description: error.message || "Não foi possível criar o pixel.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (pixelId: string) => {
      return await apiRequest(`/api/affiliate/pixels/${pixelId}`, 'DELETE', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/pixels/products', productId] });
      toast({
        title: "Pixel excluído",
        description: "O pixel foi removido com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir pixel",
        description: error.message || "Não foi possível excluir o pixel.",
        variant: "destructive",
      });
    },
  });

  const previewMutation = useMutation({
    mutationFn: async (pixelId: string) => {
      const response = await apiRequest(`/api/affiliate/pixels/${pixelId}/preview`, 'GET', {});
      return response;
    },
    onSuccess: (data: any) => {
      setPreviewCode(data.code);
      setIsPreviewDialogOpen(true);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao gerar preview",
        description: error.message || "Não foi possível gerar o preview do pixel.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedPixelType("");
    setPixelId("");
    setAccessToken("");
    setCustomCode("");
    setEvents({
      pageView: true,
      purchase: true,
      lead: false,
      addToCart: false,
      initiateCheckout: false,
    });
  };

  const handleSubmit = () => {
    if (!selectedPixelType || (!pixelId && selectedPixelType !== 'custom')) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (selectedPixelType === 'custom' && !customCode) {
      toast({
        title: "Código personalizado obrigatório",
        description: "Informe o código HTML/JavaScript personalizado.",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      productId,
      pixelType: selectedPixelType,
      pixelId: pixelId || 'N/A',
      accessToken: accessToken || null,
      customCode: customCode || null,
      events,
      isActive: true,
    });
  };

  const PixelCard = ({ pixel }: { pixel: AffiliateProductPixel }) => {
    const config = pixelTypes[pixel.pixelType] || pixelTypes.custom;
    const Icon = config.icon;

    return (
      <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gray-800 ${config.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-white text-base">{config.label}</CardTitle>
                <CardDescription className="text-xs">
                  {pixel.pixelType === 'custom' ? 'Código Personalizado' : `ID: ${pixel.pixelId}`}
                </CardDescription>
              </div>
            </div>
            <Badge className={pixel.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>
              {pixel.isActive ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <p className="text-xs text-gray-400">Eventos configurados:</p>
            <div className="flex flex-wrap gap-2">
              {pixel.events.pageView && (
                <Badge variant="outline" className="text-xs">Page View</Badge>
              )}
              {pixel.events.purchase && (
                <Badge variant="outline" className="text-xs">Purchase</Badge>
              )}
              {pixel.events.lead && (
                <Badge variant="outline" className="text-xs">Lead</Badge>
              )}
              {pixel.events.addToCart && (
                <Badge variant="outline" className="text-xs">Add to Cart</Badge>
              )}
              {pixel.events.initiateCheckout && (
                <Badge variant="outline" className="text-xs">Initiate Checkout</Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => previewMutation.mutate(pixel.id)}
              disabled={previewMutation.isPending}
              className="flex-1"
              data-testid={`button-preview-${pixel.id}`}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate(pixel.id)}
              disabled={deleteMutation.isPending}
              data-testid={`button-delete-${pixel.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AffiliateLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/affiliate/marketplace">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-bold tracking-tight text-gray-900 dark:text-gray-100" style={{ fontSize: '22px' }}>
              Configuração de Pixels
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure pixels de rastreamento para este produto
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-create-pixel">
                <Plus className="h-4 w-4 mr-2" />
                Novo Pixel
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">Criar Novo Pixel</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Configure um novo pixel de rastreamento para este produto
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="pixel-type" className="text-white">Tipo de Pixel *</Label>
                  <Select value={selectedPixelType} onValueChange={setSelectedPixelType}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white" data-testid="select-pixel-type">
                      <SelectValue placeholder="Selecione o tipo de pixel" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {Object.entries(pixelTypes).map(([key, config]) => {
                        const Icon = config.icon;
                        return (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${config.color}`} />
                              <span>{config.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {selectedPixelType && (
                    <p className="text-xs text-gray-400">{pixelTypes[selectedPixelType].description}</p>
                  )}
                </div>

                {selectedPixelType && selectedPixelType !== 'custom' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="pixel-id" className="text-white">Pixel ID *</Label>
                      <Input
                        id="pixel-id"
                        placeholder="Ex: 123456789"
                        value={pixelId}
                        onChange={(e) => setPixelId(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white"
                        data-testid="input-pixel-id"
                      />
                    </div>

                    {selectedPixelType === 'meta' && (
                      <div className="space-y-2">
                        <Label htmlFor="access-token" className="text-white">Access Token (Opcional)</Label>
                        <Input
                          id="access-token"
                          placeholder="Para Conversions API (opcional)"
                          value={accessToken}
                          onChange={(e) => setAccessToken(e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                          type="password"
                          data-testid="input-access-token"
                        />
                        <p className="text-xs text-gray-400">
                          Apenas se você deseja usar a Conversions API do Meta
                        </p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <Label className="text-white">Eventos</Label>
                      <div className="space-y-2">
                        {Object.entries({
                          pageView: "Page View",
                          purchase: "Purchase",
                          lead: "Lead",
                          addToCart: "Add to Cart",
                          initiateCheckout: "Initiate Checkout",
                        }).map(([key, label]) => (
                          <div key={key} className="flex items-center space-x-2">
                            <Checkbox
                              id={key}
                              checked={events[key as keyof typeof events]}
                              onCheckedChange={(checked) => 
                                setEvents({ ...events, [key]: checked })
                              }
                              data-testid={`checkbox-${key}`}
                            />
                            <Label htmlFor={key} className="text-white text-sm cursor-pointer">
                              {label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {selectedPixelType === 'custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="custom-code" className="text-white">Código Personalizado *</Label>
                    <Textarea
                      id="custom-code"
                      placeholder="Cole aqui seu código HTML/JavaScript de tracking"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white font-mono text-xs min-h-[200px]"
                      data-testid="textarea-custom-code"
                    />
                    <p className="text-xs text-gray-400">
                      Cole o código completo fornecido pela plataforma de tracking
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-submit"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Pixel'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Pixels List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        ) : pixels.length === 0 ? (
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardContent className="flex flex-col items-center justify-center h-64 text-center">
              <Code2 className="h-16 w-16 text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-400">
                Nenhum pixel configurado
              </h3>
              <p className="text-gray-500 mt-2 max-w-md">
                Configure pixels de rastreamento para este produto para acompanhar conversões e otimizar suas campanhas
              </p>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)} 
                className="mt-4 bg-blue-600 hover:bg-blue-700"
                data-testid="button-create-first-pixel"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Pixel
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pixels.map((pixel) => (
              <PixelCard key={pixel.id} pixel={pixel} />
            ))}
          </div>
        )}

        {/* Preview Dialog */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-white">Preview do Código do Pixel</DialogTitle>
              <DialogDescription className="text-gray-400">
                Este é o código que será injetado na sua landing page
              </DialogDescription>
            </DialogHeader>
            <div className="bg-gray-800 rounded-lg p-4 max-h-[500px] overflow-auto">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                {previewCode}
              </pre>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(previewCode);
                  toast({
                    title: "Código copiado!",
                    description: "O código foi copiado para a área de transferência.",
                  });
                }}
                data-testid="button-copy-code"
              >
                Copiar Código
              </Button>
              <Button onClick={() => setIsPreviewDialogOpen(false)} data-testid="button-close-preview">
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AffiliateLayout>
  );
}
