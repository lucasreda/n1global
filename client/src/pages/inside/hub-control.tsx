import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  Package, 
  Plus, 
  Edit3, 
  Trash2, 
  Pin, 
  Calendar, 
  ExternalLink,
  Star,
  AlertTriangle,
  Info,
  Wrench,
  Search,
  Check
} from 'lucide-react';
import type { Announcement, MarketplaceProduct, Product } from '@shared/schema';

interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productName: string;
  isLoading: boolean;
}

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function ConfirmDeleteModal({ open, onClose, onConfirm, productName, isLoading }: ConfirmDeleteModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Confirmar Remoção
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Tem certeza que deseja remover "{productName}" da exibição para os clientes?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? 'Removendo...' : 'Remover'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddProductModal({ open, onClose, onSuccess }: AddProductModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available products
  const { data: availableProductsData, isLoading: productsLoading } = useQuery<{ data: Product[]; total: number }>({
    queryKey: ['/api/marketplace/available-products', searchTerm],
    enabled: open
  });

  // Add product to marketplace mutation
  const addProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch('/api/marketplace/products/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao adicionar produto');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/available-products'] });
      toast({
        title: "Produto adicionado",
        description: "O produto foi adicionado ao marketplace com sucesso.",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    }
  });

  const handleAddProduct = (productId: string) => {
    addProductMutation.mutate(productId);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Plus className="h-5 w-5 text-white" />
            Adicionar Produto ao Marketplace
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Selecione produtos do catálogo global para disponibilizar aos clientes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, descrição ou SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white"
            />
          </div>

          {/* Products List */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {productsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-white/20 rounded-lg p-4 bg-white/5">
                  <Skeleton className="h-4 w-3/4 mb-2 bg-white/20" />
                  <Skeleton className="h-3 w-1/2 mb-2 bg-white/20" />
                  <Skeleton className="h-8 w-24 bg-white/20" />
                </div>
              ))
            ) : availableProductsData?.data && availableProductsData.data.length > 0 ? (
              availableProductsData.data.map((product: Product) => (
                <div key={product.id} className="border border-white/20 rounded-lg p-4 bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-white">{product.name}</h4>
                        <Badge variant={product.type === 'nutraceutico' ? 'default' : 'secondary'}>
                          {product.type === 'nutraceutico' ? 'Nutracêutico' : 'Físico'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mb-1">{product.description || 'Sem descrição'}</p>
                      <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                      <p className="text-sm font-medium text-green-400">€{product.price}</p>
                    </div>
                    <Button
                      onClick={() => handleAddProduct(product.id)}
                      disabled={addProductMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      {addProductMutation.isPending ? (
                        'Adicionando...'
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Adicionar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{searchTerm ? 'Nenhum produto encontrado' : 'Todos os produtos já estão no marketplace'}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function HubControl() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProductName, setSelectedProductName] = useState<string>('');

  // Fetch announcements
  const { 
    data: announcementsData, 
    isLoading: announcementsLoading 
  } = useQuery<{ data: Announcement[] }>({
    queryKey: ['/api/announcements', { limit: 6 }]
  });

  // Fetch marketplace products
  const { 
    data: productsData, 
    isLoading: productsLoading 
  } = useQuery<{ data: MarketplaceProduct[] }>({
    queryKey: ['/api/marketplace/products']
  });

  // Remove product mutation
  const removeProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/marketplace/products/${productId}`, {
        method: 'DELETE',
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao remover produto');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/products'] });
      toast({
        title: "Produto removido",
        description: "O produto foi removido da exibição com sucesso.",
      });
      setDeleteModalOpen(false);
      setSelectedProductId('');
      setSelectedProductName('');
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    }
  });

  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case 'update':
        return <Star className="w-4 h-4" />;
      case 'tip':
        return <Info className="w-4 h-4" />;
      case 'maintenance':
        return <Wrench className="w-4 h-4" />;
      case 'general':
      default:
        return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getAnnouncementBadge = (type: string) => {
    switch (type) {
      case 'update':
        return { variant: "default" as const, label: "Atualização" };
      case 'tip':
        return { variant: "secondary" as const, label: "Dica" };
      case 'maintenance':
        return { variant: "destructive" as const, label: "Manutenção" };
      case 'general':
      default:
        return { variant: "outline" as const, label: "Geral" };
    }
  };

  const handleRemoveProduct = (productId: string, productName: string) => {
    setSelectedProductId(productId);
    setSelectedProductName(productName);
    setDeleteModalOpen(true);
  };

  const confirmRemoveProduct = () => {
    if (selectedProductId) {
      removeProductMutation.mutate(selectedProductId);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Hub Control</h1>
        <p className="text-slate-300">Central de controle do que é exibido para os clientes no N1 Hub</p>
      </div>

        {/* Novidades Section - News Layout */}
        <div>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-semibold text-white">Últimas Novidades</h2>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
            <p className="text-slate-400">Gerencie as notícias exibidas para os clientes</p>
          </div>
          
          {announcementsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="h-48 bg-white/10 border-white/20 backdrop-blur-md">
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-20 mb-2 bg-white/20" />
                    <Skeleton className="h-6 w-full mb-3 bg-white/20" />
                    <Skeleton className="h-4 w-full mb-2 bg-white/20" />
                    <Skeleton className="h-4 w-3/4 bg-white/20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : announcementsData?.data && announcementsData.data.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {announcementsData.data.map((announcement: Announcement, index: number) => {
                // Make first announcement larger (hero style)
                const isHero = index === 0;
                const cardClass = isHero 
                  ? "md:col-span-2 lg:col-span-2 h-64" 
                  : "h-48";

                return (
                  <Card key={announcement.id} className={`${cardClass} overflow-hidden hover:shadow-lg transition-shadow cursor-pointer bg-white/10 border-white/20 backdrop-blur-md`} data-testid={`card-announcement-${announcement.id}`}>
                    <CardContent className="p-0 h-full flex flex-col">
                      {/* Image placeholder based on announcement type */}
                      <div className={`w-full bg-gradient-to-r ${
                        announcement.type === 'update' ? 'from-blue-400 to-blue-600' :
                        announcement.type === 'tip' ? 'from-yellow-400 to-yellow-600' :
                        announcement.type === 'maintenance' ? 'from-red-400 to-red-600' :
                        'from-green-400 to-green-600'
                      } ${isHero ? 'h-32' : 'h-24'} flex items-center justify-center relative`}>
                        <div className="text-white text-2xl">
                          {getAnnouncementIcon(announcement.type)}
                        </div>
                        {/* Edit button overlay */}
                        <Button
                          size="sm"
                          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white border-0"
                          data-testid={`button-edit-announcement-${announcement.id}`}
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <div className="p-4 flex-1 flex flex-col">
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
                      
                        <h3 className={`font-semibold mb-2 line-clamp-2 text-white ${isHero ? 'text-lg' : 'text-base'}`} data-testid={`text-announcement-title-${announcement.id}`}>
                          {announcement.title}
                        </h3>
                        
                        <p className={`text-slate-300 flex-1 ${isHero ? 'line-clamp-4' : 'line-clamp-3'} text-sm`} data-testid={`text-announcement-content-${announcement.id}`}>
                          {announcement.content}
                        </p>
                        
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-slate-400 flex items-center" data-testid={`text-announcement-date-${announcement.id}`}>
                            <Calendar className="w-3 h-3 mr-1" />
                            {announcement.publishedAt ? new Date(announcement.publishedAt).toLocaleDateString('pt-BR', { 
                              day: 'numeric', 
                              month: 'short' 
                            }) : 'N/A'}
                          </span>
                          {announcement.ctaLabel && announcement.ctaUrl && (
                            <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-400 hover:text-white" data-testid={`button-announcement-cta-${announcement.id}`}>
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
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400" data-testid="text-no-announcements">
                Nenhuma novidade disponível
              </p>
            </div>
          )}
        </div>

        {/* Marketplace Section */}
        <div className="space-y-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-green-400" />
                <h2 className="text-xl font-semibold text-white">Marketplace</h2>
              </div>
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setAddProductModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
            <p className="text-slate-400">Gerencie os produtos exibidos para os clientes</p>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="bg-white/10 border-white/20 backdrop-blur-md">
                  <CardContent className="p-4">
                    <Skeleton className="w-full h-48 mb-4 bg-white/20" />
                    <Skeleton className="h-4 w-3/4 mb-2 bg-white/20" />
                    <Skeleton className="h-4 w-1/2 mb-4 bg-white/20" />
                    <Skeleton className="h-10 w-full bg-white/20" />
                  </CardContent>
                </Card>
              ))
            ) : productsData?.data && productsData.data.length > 0 ? (
              productsData.data.map((product: MarketplaceProduct) => (
                <Card key={product.id} className="overflow-hidden bg-white/10 border-white/20 backdrop-blur-md hover:bg-white/15 transition-colors" data-testid={`card-product-${product.id}`}>
                  <CardContent className="p-0">
                    {/* Product image placeholder based on category */}
                    <div className={`w-full h-48 bg-gradient-to-br ${
                      product.category === 'electronics' ? 'from-blue-400 to-blue-600' :
                      product.category === 'fashion' ? 'from-purple-400 to-purple-600' :
                      product.category === 'home' ? 'from-yellow-400 to-yellow-600' :
                      product.category === 'health' ? 'from-green-400 to-green-600' :
                      'from-gray-400 to-gray-600'
                    } flex items-center justify-center relative`}>
                      <Package className="w-16 h-16 text-white opacity-80" />
                      {/* Remove button overlay */}
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-700/90 text-white border-0"
                        onClick={() => handleRemoveProduct(product.id, product.name)}
                        data-testid={`button-remove-product-${product.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="p-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-white" data-testid={`text-product-name-${product.id}`}>
                          {product.name}
                        </h3>
                        <p className="text-sm text-slate-400" data-testid={`text-product-supplier-${product.id}`}>
                          {product.supplier}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-green-400" data-testid={`text-product-price-${product.id}`}>
                            {product.baseCost ? `R$ ${product.baseCost}` : 'Preço não informado'}
                          </span>
                          <Badge 
                            variant={product.category === 'electronics' ? 'default' : 'secondary'} 
                            data-testid={`badge-product-category-${product.id}`}
                          >
                            {product.category}
                          </Badge>
                        </div>
                        <Button
                          className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                          disabled
                          data-testid={`button-link-product-${product.id}`}
                        >
                          <Package className="w-4 h-4 mr-2" />
                          Visível para Clientes
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Package className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400" data-testid="text-no-products">
                  Nenhum produto encontrado
                </p>
              </div>
            )}
          </div>
        </div>

      {/* Add Product Modal */}
      <AddProductModal
        open={addProductModalOpen}
        onClose={() => setAddProductModalOpen(false)}
        onSuccess={() => setAddProductModalOpen(false)}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmRemoveProduct}
        productName={selectedProductName}
        isLoading={removeProductMutation.isPending}
      />
    </div>
  );
}