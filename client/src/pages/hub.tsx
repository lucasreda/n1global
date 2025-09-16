import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Package, Bell, ExternalLink, Calendar, Pin, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { authenticatedApiRequest } from "@/lib/auth";

// Form schema for linking products
const linkProductSchema = z.object({
  marketplaceProductId: z.string().min(1, "Produto é obrigatório"),
  sellingPrice: z.string().min(1, "Preço é obrigatório"),
  currency: z.string().default("EUR"),
  sku: z.string().optional(),
  notes: z.string().optional(),
});

type LinkProductForm = z.infer<typeof linkProductSchema>;

// Type definitions
interface MarketplaceProduct {
  id: string;
  name: string;
  description?: string;
  baseCost: string;
  currency: string;
  images: string[];
  category: string;
  tags: string[];
  supplier: string;
  status: string;
  specs: Record<string, any>;
  createdAt: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'update' | 'tip' | 'maintenance' | 'promo';
  publishedAt: string;
  isPinned: boolean;
  ctaLabel?: string;
  ctaUrl?: string;
}

export default function Hub() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedOperation } = useCurrentOperation();

  // Form for linking products
  const form = useForm<LinkProductForm>({
    resolver: zodResolver(linkProductSchema),
    defaultValues: {
      currency: "EUR",
    },
  });

  // Fetch marketplace products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/marketplace/products", searchTerm, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (selectedCategory) params.append("category", selectedCategory);
      
      const response = await authenticatedApiRequest("GET", `/api/marketplace/products?${params}`);
      return response.json();
    },
  });

  // Fetch announcements
  const { data: announcementsData, isLoading: announcementsLoading } = useQuery({
    queryKey: ["/api/announcements"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/announcements");
      return response.json();
    },
  });

  // Link product mutation
  const linkProductMutation = useMutation({
    mutationFn: async (data: LinkProductForm) => {
      const response = await authenticatedApiRequest("POST", "/api/marketplace/link", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Produto Vinculado",
        description: "Produto vinculado com sucesso à sua operação!",
      });
      setLinkModalOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao Vincular",
        description: error.message || "Falha ao vincular produto",
        variant: "destructive",
      });
    },
  });

  const handleLinkProduct = (product: MarketplaceProduct) => {
    setSelectedProduct(product);
    form.setValue("marketplaceProductId", product.id);
    form.setValue("sellingPrice", product.baseCost);
    setLinkModalOpen(true);
  };

  const onSubmitLink = (data: LinkProductForm) => {
    linkProductMutation.mutate(data);
  };

  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case 'tip': return '💡';
      case 'maintenance': return '🔧';
      case 'promo': return '🎁';
      default: return '📢';
    }
  };

  const getAnnouncementBadge = (type: string) => {
    const badges = {
      'update': { label: 'Atualização', variant: 'default' as const },
      'tip': { label: 'Dica', variant: 'secondary' as const },
      'maintenance': { label: 'Manutenção', variant: 'destructive' as const },
      'promo': { label: 'Promoção', variant: 'outline' as const },
    };
    return badges[type as keyof typeof badges] || badges.update;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-hub-title">N1 Hub</h1>
          <p className="text-muted-foreground" data-testid="text-hub-description">
            Descubra novos produtos e fique por dentro das últimas novidades
          </p>
        </div>
      </div>

      <Tabs defaultValue="marketplace" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="marketplace" data-testid="tab-marketplace">
            <Package className="w-4 h-4 mr-2" />
            Marketplace
          </TabsTrigger>
          <TabsTrigger value="announcements" data-testid="tab-announcements">
            <Bell className="w-4 h-4 mr-2" />
            Novidades
          </TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Produtos Disponíveis</CardTitle>
              <CardDescription>Encontre produtos para adicionar à sua operação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar produtos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                    data-testid="input-search-products"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48" data-testid="select-category">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    <SelectItem value="electronics">Eletrônicos</SelectItem>
                    <SelectItem value="fashion">Moda</SelectItem>
                    <SelectItem value="home">Casa</SelectItem>
                    <SelectItem value="health">Saúde</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="w-full h-48 mb-4" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : productsData?.data?.length > 0 ? (
              productsData.data.map((product: MarketplaceProduct) => (
                <Card key={product.id} className="overflow-hidden" data-testid={`card-product-${product.id}`}>
                  <CardContent className="p-4">
                    {product.images && product.images[0] && (
                      <div className="w-full h-48 bg-muted rounded-lg mb-4 flex items-center justify-center">
                        <Package className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <h3 className="font-semibold" data-testid={`text-product-name-${product.id}`}>
                        {product.name}
                      </h3>
                      <p className="text-sm text-muted-foreground" data-testid={`text-product-supplier-${product.id}`}>
                        {product.supplier}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-green-600" data-testid={`text-product-price-${product.id}`}>
                          €{product.baseCost}
                        </span>
                        <Badge variant="outline" data-testid={`badge-product-category-${product.id}`}>
                          {product.category}
                        </Badge>
                      </div>
                      {product.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-product-description-${product.id}`}>
                          {product.description}
                        </p>
                      )}
                      <Button
                        onClick={() => handleLinkProduct(product)}
                        className="w-full"
                        data-testid={`button-link-product-${product.id}`}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Vincular à Operação
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground" data-testid="text-no-products">
                  Nenhum produto encontrado
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="announcements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Novidades N1</CardTitle>
              <CardDescription>Fique por dentro das últimas atualizações e dicas</CardDescription>
            </CardHeader>
          </Card>

          <div className="space-y-4">
            {announcementsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : announcementsData?.data?.length > 0 ? (
              announcementsData.data.map((announcement: Announcement) => (
                <Card key={announcement.id} data-testid={`card-announcement-${announcement.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-xl">
                          {getAnnouncementIcon(announcement.type)}
                        </div>
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <Badge {...getAnnouncementBadge(announcement.type)} data-testid={`badge-announcement-type-${announcement.id}`}>
                            {getAnnouncementBadge(announcement.type).label}
                          </Badge>
                          {announcement.isPinned && (
                            <Badge variant="secondary" data-testid={`badge-announcement-pinned-${announcement.id}`}>
                              <Pin className="w-3 h-3 mr-1" />
                              Fixado
                            </Badge>
                          )}
                          <span className="text-sm text-muted-foreground flex items-center" data-testid={`text-announcement-date-${announcement.id}`}>
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(announcement.publishedAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold" data-testid={`text-announcement-title-${announcement.id}`}>
                          {announcement.title}
                        </h3>
                        <p className="text-muted-foreground" data-testid={`text-announcement-content-${announcement.id}`}>
                          {announcement.content}
                        </p>
                        {announcement.ctaLabel && announcement.ctaUrl && (
                          <Button variant="outline" size="sm" data-testid={`button-announcement-cta-${announcement.id}`}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            {announcement.ctaLabel}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground" data-testid="text-no-announcements">
                  Nenhuma novidade disponível
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Link Product Modal */}
      <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
        <DialogContent data-testid="modal-link-product">
          <DialogHeader>
            <DialogTitle>Vincular Produto à Operação</DialogTitle>
            <DialogDescription>
              Configure o produto para sua operação {selectedOperation}
            </DialogDescription>
          </DialogHeader>
          
          {selectedProduct && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitLink)} className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold" data-testid="text-selected-product-name">
                    {selectedProduct.name}
                  </h4>
                  <p className="text-sm text-muted-foreground" data-testid="text-selected-product-supplier">
                    Fornecedor: {selectedProduct.supplier}
                  </p>
                  <p className="text-sm text-muted-foreground" data-testid="text-selected-product-base-cost">
                    Custo base: €{selectedProduct.baseCost}
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="sellingPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço de Venda (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="29.99" 
                          {...field} 
                          data-testid="input-selling-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU (Opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="PRODUTO-001" 
                          {...field} 
                          data-testid="input-sku"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Observações sobre este produto..."
                          rows={3}
                          {...field} 
                          data-testid="input-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLinkModalOpen(false)}
                    data-testid="button-cancel-link"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={linkProductMutation.isPending}
                    data-testid="button-confirm-link"
                  >
                    {linkProductMutation.isPending ? "Vinculando..." : "Vincular Produto"}
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