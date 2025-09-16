import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Package, ExternalLink, Calendar, Pin, Plus, TrendingUp } from "lucide-react";
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
  description?: string;
  content: string;
  type: 'update' | 'tip' | 'maintenance' | 'promo';
  publishedAt: string;
  isPinned: boolean;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
}

export default function Hub() {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  
  // Pagination states for announcements
  const [announcementsCurrentPage, setAnnouncementsCurrentPage] = useState(1);
  const announcementsPerPage = 5;
  
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
    queryKey: ["/api/marketplace/products"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/marketplace/products");
      return response.json();
    },
  });

  // Fetch announcements (limited to 6 for news layout)
  const { data: announcementsData, isLoading: announcementsLoading } = useQuery({
    queryKey: ["/api/announcements"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/announcements?limit=6");
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

  // Pagination logic for announcements
  const totalAnnouncements = announcementsData?.data?.length || 0;
  const totalAnnouncementPages = Math.ceil(totalAnnouncements / announcementsPerPage);
  
  const paginatedAnnouncements = announcementsData?.data?.slice(
    (announcementsCurrentPage - 1) * announcementsPerPage,
    announcementsCurrentPage * announcementsPerPage
  ) || [];

  const handleAnnouncementPageChange = (page: number) => {
    setAnnouncementsCurrentPage(page);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-hub-title">N1 Hub</h1>
          <p className="text-muted-foreground" data-testid="text-hub-description">
            Descubra novos produtos e fique por dentro das últimas novidades
          </p>
        </div>
      </div>

      {/* Novidades Section - News Layout */}
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Últimas Novidades</h2>
          </div>
          <p className="text-muted-foreground">Fique por dentro das atualizações e dicas mais recentes</p>
        </div>
        
        {announcementsLoading ? (
          <div className="space-y-6">
            {/* First row: 2 cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i} className="h-64">
                  <CardContent className="p-0 h-full flex">
                    <div className="w-32 h-full">
                      <Skeleton className="w-full h-full" />
                    </div>
                    <div className="flex-1 p-4">
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-6 w-full mb-3" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {/* Second row: 3 cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i + 2} className="h-48">
                  <CardContent className="p-0 h-full flex">
                    <div className="w-24 h-full">
                      <Skeleton className="w-full h-full" />
                    </div>
                    <div className="flex-1 p-4">
                      <Skeleton className="h-4 w-16 mb-2" />
                      <Skeleton className="h-5 w-full mb-2" />
                      <Skeleton className="h-3 w-full mb-1" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : paginatedAnnouncements && paginatedAnnouncements.length > 0 ? (
          <>
            <div className="space-y-6">
              {/* First row: 2 cards, 50/50 */}
              {paginatedAnnouncements.slice(0, 2).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {paginatedAnnouncements.slice(0, 2).map((announcement: Announcement) => {
                    const cardClass = "h-64";

                    return (
                      <Card 
                        key={announcement.id} 
                        className={`${cardClass} overflow-hidden hover:shadow-lg transition-shadow cursor-pointer`} 
                        data-testid={`card-announcement-${announcement.id}`}
                      >
                        <CardContent className="p-0 h-full flex">
                          {/* Image or placeholder - Left side */}
                          <div className="w-32 h-full relative overflow-hidden flex-shrink-0">
                            {announcement.imageUrl ? (
                              <img 
                                src={announcement.imageUrl} 
                                alt={announcement.title}
                                className="w-full h-full object-cover"
                                style={{
                                  borderTopLeftRadius: '8px',
                                  borderBottomLeftRadius: '8px',
                                  clipPath: 'polygon(0 0, 85% 0, 100% 100%, 0 100%)'
                                }}
                              />
                            ) : (
                              <div 
                                className={`w-full h-full bg-gradient-to-r ${
                                  announcement.type === 'update' ? 'from-blue-400 to-blue-600' :
                                  announcement.type === 'tip' ? 'from-yellow-400 to-yellow-600' :
                                  announcement.type === 'maintenance' ? 'from-red-400 to-red-600' :
                                  'from-green-400 to-green-600'
                                } flex items-center justify-center`}
                                style={{
                                  borderTopLeftRadius: '8px',
                                  borderBottomLeftRadius: '8px',
                                  clipPath: 'polygon(0 0, 85% 0, 100% 100%, 0 100%)'
                                }}
                              >
                                <div className="text-white text-xl">
                                  {getAnnouncementIcon(announcement.type)}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Content - Right side */}
                          <div className="flex-1 p-4 flex flex-col">
                            <div className="flex items-center gap-2 mb-3">
                              <Badge {...getAnnouncementBadge(announcement.type)} data-testid={`badge-announcement-type-${announcement.id}`}>
                                {getAnnouncementBadge(announcement.type).label}
                              </Badge>
                              {announcement.isPinned && (
                                <Badge variant="secondary" data-testid={`badge-announcement-pinned-${announcement.id}`}>
                                  <Pin className="w-3 h-3 mr-1" />
                                  Fixado
                                </Badge>
                              )}
                            </div>
                          
                            <h3 className="font-semibold mb-2 line-clamp-2 text-base" data-testid={`text-announcement-title-${announcement.id}`}>
                              {announcement.title}
                            </h3>
                            
                            <p className="text-muted-foreground flex-1 line-clamp-4 text-sm" data-testid={`text-announcement-description-${announcement.id}`}>
                              {announcement.description || ''}
                            </p>
                            
                            <div className="flex items-center justify-between mt-3">
                              <span className="text-xs text-muted-foreground flex items-center" data-testid={`text-announcement-date-${announcement.id}`}>
                                <Calendar className="w-3 h-3 mr-1" />
                                {announcement.publishedAt ? new Date(announcement.publishedAt).toLocaleDateString('pt-BR', { 
                                  day: 'numeric', 
                                  month: 'short' 
                                }) : 'N/A'}
                              </span>
                              {announcement.ctaLabel && announcement.ctaUrl && (
                                <Button variant="ghost" size="sm" className="h-6 text-xs" data-testid={`button-announcement-cta-${announcement.id}`}>
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  {announcement.ctaLabel}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Second row: remaining cards, up to 3 */}
              {paginatedAnnouncements.slice(2).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedAnnouncements.slice(2).map((announcement: Announcement) => {
                    const cardClass = "h-48";

                    return (
                      <Card 
                        key={announcement.id} 
                        className={`${cardClass} overflow-hidden hover:shadow-lg transition-shadow cursor-pointer`} 
                        data-testid={`card-announcement-${announcement.id}`}
                      >
                        <CardContent className="p-0 h-full flex">
                          {/* Image or placeholder - Left side */}
                          <div className="w-24 h-full relative overflow-hidden flex-shrink-0">
                            {announcement.imageUrl ? (
                              <img 
                                src={announcement.imageUrl} 
                                alt={announcement.title}
                                className="w-full h-full object-cover"
                                style={{
                                  borderTopLeftRadius: '8px',
                                  borderBottomLeftRadius: '8px',
                                  clipPath: 'polygon(0 0, 85% 0, 100% 100%, 0 100%)'
                                }}
                              />
                            ) : (
                              <div 
                                className={`w-full h-full bg-gradient-to-r ${
                                  announcement.type === 'update' ? 'from-blue-400 to-blue-600' :
                                  announcement.type === 'tip' ? 'from-yellow-400 to-yellow-600' :
                                  announcement.type === 'maintenance' ? 'from-red-400 to-red-600' :
                                  'from-green-400 to-green-600'
                                } flex items-center justify-center`}
                                style={{
                                  borderTopLeftRadius: '8px',
                                  borderBottomLeftRadius: '8px',
                                  clipPath: 'polygon(0 0, 85% 0, 100% 100%, 0 100%)'
                                }}
                              >
                                <div className="text-white text-xl">
                                  {getAnnouncementIcon(announcement.type)}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Content - Right side */}
                          <div className="flex-1 p-4 flex flex-col">
                            <div className="flex items-center gap-2 mb-3">
                              <Badge {...getAnnouncementBadge(announcement.type)} data-testid={`badge-announcement-type-${announcement.id}`}>
                                {getAnnouncementBadge(announcement.type).label}
                              </Badge>
                              {announcement.isPinned && (
                                <Badge variant="secondary" data-testid={`badge-announcement-pinned-${announcement.id}`}>
                                  <Pin className="w-3 h-3 mr-1" />
                                  Fixado
                                </Badge>
                              )}
                            </div>
                          
                            <h3 className="font-semibold mb-2 line-clamp-2 text-base" data-testid={`text-announcement-title-${announcement.id}`}>
                              {announcement.title}
                            </h3>
                            
                            <p className="text-muted-foreground flex-1 line-clamp-3 text-sm" data-testid={`text-announcement-description-${announcement.id}`}>
                              {announcement.description || ''}
                            </p>
                            
                            <div className="flex items-center justify-between mt-3">
                              <span className="text-xs text-muted-foreground flex items-center" data-testid={`text-announcement-date-${announcement.id}`}>
                                <Calendar className="w-3 h-3 mr-1" />
                                {announcement.publishedAt ? new Date(announcement.publishedAt).toLocaleDateString('pt-BR', { 
                                  day: 'numeric', 
                                  month: 'short' 
                                }) : 'N/A'}
                              </span>
                              {announcement.ctaLabel && announcement.ctaUrl && (
                                <Button variant="ghost" size="sm" className="h-6 text-xs" data-testid={`button-announcement-cta-${announcement.id}`}>
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  {announcement.ctaLabel}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Announcements Pagination */}
            {totalAnnouncementPages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAnnouncementPageChange(announcementsCurrentPage - 1)}
                    disabled={announcementsCurrentPage === 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 w-8 h-8 p-0"
                    data-testid="button-prev-announcements"
                  >
                    ←
                  </Button>
                  
                  {[...Array(totalAnnouncementPages)].map((_, i) => (
                    <Button
                      key={i + 1}
                      variant={announcementsCurrentPage === i + 1 ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleAnnouncementPageChange(i + 1)}
                      className={`w-8 h-8 p-0 text-xs ${
                        announcementsCurrentPage === i + 1 
                          ? '' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      data-testid={`button-announcement-page-${i + 1}`}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAnnouncementPageChange(announcementsCurrentPage + 1)}
                    disabled={announcementsCurrentPage === totalAnnouncementPages}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 w-8 h-8 p-0"
                    data-testid="button-next-announcements"
                  >
                    →
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground" data-testid="text-no-announcements">
              Nenhuma novidade disponível
            </p>
          </div>
        )}
      </div>

      {/* Marketplace Section */}
      <div className="space-y-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5" />
              <h2 className="text-xl font-semibold">Produtos Disponíveis</h2>
            </div>
            <p className="text-muted-foreground">Encontre produtos para adicionar à sua operação</p>
          </div>

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
                  <CardContent className="p-0">
                    {/* Product image or placeholder based on category */}
                    {product.images && product.images.length > 0 ? (
                      <img 
                        src={product.images[0]} 
                        alt={product.name}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className={`w-full h-48 bg-gradient-to-br ${
                        product.category === 'electronics' ? 'from-blue-400 to-blue-600' :
                        product.category === 'fashion' ? 'from-purple-400 to-purple-600' :
                        product.category === 'home' ? 'from-yellow-400 to-yellow-600' :
                        product.category === 'health' ? 'from-green-400 to-green-600' :
                        'from-gray-400 to-gray-600'
                      } flex items-center justify-center`}>
                        <Package className="w-16 h-16 text-white opacity-80" />
                      </div>
                    )}
                    <div className="p-4">
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
      </div>

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