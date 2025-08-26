import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Package, DollarSign, TrendingUp, Calculator, Edit, Save, X, Search, Link2, Unlink } from "lucide-react";
import { authenticatedApiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Product cost configuration schema
const productCostSchema = z.object({
  costPrice: z.string().transform((val) => val === "" ? null : parseFloat(val)),
  shippingCost: z.string().transform((val) => val === "" ? null : parseFloat(val)),
  handlingFee: z.string().transform((val) => val === "" ? null : parseFloat(val)),
  marketingCost: z.string().transform((val) => val === "" ? null : parseFloat(val)),
  operationalCost: z.string().transform((val) => val === "" ? null : parseFloat(val)),
});

const skuSearchSchema = z.object({
  sku: z.string().min(1, "SKU é obrigatório"),
  customCostPrice: z.string().optional().transform((val) => val === "" || !val ? undefined : parseFloat(val)),
  customShippingCost: z.string().optional().transform((val) => val === "" || !val ? undefined : parseFloat(val)),
  customHandlingFee: z.string().optional().transform((val) => val === "" || !val ? undefined : parseFloat(val)),
});

type Product = {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: string;
  stock: number;
  lowStock: number;
  imageUrl?: string;
  videoUrl?: string;
  productUrl?: string;
  isActive: boolean;
  costPrice?: string;
  shippingCost?: string;
  handlingFee?: string;
  marketingCost?: string;
  operationalCost?: string;
  profitMargin?: string;
  lastCostUpdate?: string;
  createdAt: string;
  updatedAt: string;
};

type UserProduct = {
  id: string;
  userId: string;
  storeId: string;
  productId: string;
  sku: string;
  customCostPrice?: string;
  customShippingCost?: string;
  customHandlingFee?: string;
  linkedAt: string;
  lastUpdated: string;
  isActive: boolean;
  product: Product;
};

type StockInfo = {
  initialStock: number;
  soldQuantity: number;
  availableStock: number;
};

export default function ProductsPage() {
  const [isLinking, setIsLinking] = useState(false);
  const [searchedProduct, setSearchedProduct] = useState<Product | null>(null);
  const [searchSku, setSearchSku] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch linked products
  const { data: userProducts = [], isLoading } = useQuery({
    queryKey: ["/api/user-products"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/user-products");
      return response.json();
    },
  });

  // Fetch available stock for each product
  const { data: stockData = {} } = useQuery({
    queryKey: ["/api/products/stock", userProducts.map((up: UserProduct) => up.sku)],
    queryFn: async () => {
      const stockPromises = userProducts.map(async (userProduct: UserProduct) => {
        try {
          const response = await authenticatedApiRequest("GET", `/api/products/available-stock/${userProduct.sku}`);
          const stockInfo = await response.json();
          return { sku: userProduct.sku, ...stockInfo };
        } catch (error) {
          console.error(`Failed to fetch stock for ${userProduct.sku}:`, error);
          return { sku: userProduct.sku, initialStock: 0, soldQuantity: 0, availableStock: 0 };
        }
      });
      
      const stockResults = await Promise.all(stockPromises);
      return stockResults.reduce((acc, stock) => {
        acc[stock.sku] = stock;
        return acc;
      }, {} as Record<string, StockInfo & { sku: string }>);
    },
    enabled: userProducts.length > 0,
  });

  // Search product by SKU mutation
  const searchProductMutation = useMutation({
    mutationFn: async (sku: string) => {
      const response = await authenticatedApiRequest("GET", `/api/user-products/search/${sku}`);
      return response.json();
    },
    onSuccess: (product) => {
      setSearchedProduct(product);
      toast({
        title: "Produto encontrado",
        description: `${product.name} (${product.sku}) disponível para vinculação`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Produto não encontrado",
        description: error.message || "SKU não encontrado na base global",
        variant: "destructive",
      });
      setSearchedProduct(null);
    },
  });

  // Link product mutation
  const linkProductMutation = useMutation({
    mutationFn: async (linkData: { sku: string; customCostPrice?: number; customShippingCost?: number; customHandlingFee?: number }) => {
      const response = await authenticatedApiRequest("POST", "/api/user-products/link", linkData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-products"] });
      setIsLinking(false);
      setSearchedProduct(null);
      setSearchSku("");
      toast({
        title: "Produto vinculado",
        description: "Produto vinculado com sucesso à sua conta",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao vincular produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Unlink product mutation
  const unlinkProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await authenticatedApiRequest("DELETE", `/api/user-products/${productId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-products"] });
      toast({
        title: "Produto desvinculado",
        description: "Produto desvinculado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao desvincular produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });


  const handleSearchProduct = () => {
    if (searchSku.trim()) {
      searchProductMutation.mutate(searchSku.trim());
    }
  };

  const handleLinkProduct = () => {
    if (searchedProduct) {
      linkProductMutation.mutate({
        sku: searchedProduct.sku,
      });
    }
  };

  const handleUnlinkProduct = (productId: string) => {
    unlinkProductMutation.mutate(productId);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Produtos</h1>
        </div>
        <Card className="glassmorphism">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-white">Carregando produtos...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-white" style={{ fontSize: '20px' }}>Produtos Vinculados</h1>
        <Dialog open={isLinking} onOpenChange={setIsLinking}>
          <DialogTrigger asChild>
            <Button className="glassmorphism-light text-white border-blue-600" data-testid="button-link-product">
              <Link2 className="h-4 w-4 mr-2" />
              Vincular Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="glassmorphism max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Buscar e Vincular Produto</span>
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                Busque um produto pelo SKU na base global e configure custos personalizados
              </DialogDescription>
            </DialogHeader>

            {/* SKU Search */}
            <div className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  value={searchSku}
                  onChange={(e) => setSearchSku(e.target.value)}
                  placeholder="Digite o SKU do produto..."
                  className="glassmorphism-light text-white flex-1"
                  data-testid="input-search-sku"
                />
                <Button
                  onClick={handleSearchProduct}
                  disabled={searchProductMutation.isPending || !searchSku.trim()}
                  className="glassmorphism-light text-white border-blue-600"
                  data-testid="button-search-product"
                >
                  <Search className="h-4 w-4 mr-2" />
                  {searchProductMutation.isPending ? "Buscando..." : "Buscar"}
                </Button>
              </div>

              {/* Search Result */}
              {searchedProduct && (
                <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      {/* Product Thumbnail */}
                      <div className="flex-shrink-0 w-16 h-16">
                        {searchedProduct.imageUrl ? (
                          <img
                            src={searchedProduct.imageUrl}
                            alt={searchedProduct.name}
                            className="w-full h-full object-cover rounded-lg shadow-md"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full flex items-center justify-center bg-white/5 rounded-lg shadow-md ${searchedProduct.imageUrl ? 'hidden' : ''}`}>
                          <Package className="h-6 w-6 text-white/40" />
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h3 className="font-semibold text-white text-base">{searchedProduct.name}</h3>
                            <p className="text-sm text-white/50">SKU: {searchedProduct.sku}</p>
                            {searchedProduct.description && (
                              <p className="text-sm text-white/60 mt-2 line-clamp-2">{searchedProduct.description}</p>
                            )}
                          </div>
                          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 rounded-full px-3 py-1 text-xs font-medium ml-4">
                            Disponível
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Link Action Buttons */}
              {searchedProduct && (
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsLinking(false);
                      setSearchedProduct(null);
                      setSearchSku("");
                    }}
                    className="glassmorphism-light text-gray-200"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleLinkProduct}
                    disabled={linkProductMutation.isPending}
                    className="glassmorphism-light text-white border-blue-600"
                    data-testid="button-confirm-link"
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    {linkProductMutation.isPending ? "Vinculando..." : "Vincular Produto"}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Linked Products List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {userProducts.map((userProduct: UserProduct) => {
          const product = userProduct.product;
          return (
            <Card key={userProduct.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl hover:bg-white/8 transition-all duration-200 shadow-lg">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header with image and basic info */}
                  <div className="flex items-start gap-4">
                    {/* Product Thumbnail */}
                    <div className="flex-shrink-0 w-20 h-20">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-xl shadow-md"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center bg-white/5 rounded-xl shadow-md ${product.imageUrl ? 'hidden' : ''}`}>
                        <Package className="h-8 w-8 text-white/40" />
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-white font-semibold text-base mb-1" style={{ fontSize: '16px' }}>{product.name}</h3>
                          <p className="text-white/50 text-sm">SKU: {product.sku}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={`${product.isActive ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-gray-500/20 text-gray-300 border-gray-500/30'} rounded-full px-2 py-1 text-xs`}>
                              {product.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 rounded-full px-2 py-1 text-xs">
                              Vinculado
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnlinkProduct(userProduct.productId)}
                          className="text-white/40 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                          data-testid={`button-unlink-${product.id}`}
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 text-center">
                      <div className="text-lg font-semibold text-orange-300">€{product.price || "0.00"}</div>
                      <div className="text-xs text-white/50">Preço B2B</div>
                    </div>
                    <div className="p-3 text-center">
                      <div className="text-lg font-semibold text-purple-300">€{userProduct.customShippingCost || product.shippingCost || "0.00"}</div>
                      <div className="text-xs text-white/50">Envio</div>
                    </div>
                    <div className="p-3 text-center">
                      <div className="text-lg font-semibold text-blue-300">{stockData[product.sku]?.availableStock ?? product.stock}</div>
                      <div className="text-xs text-white/50">Stock</div>
                    </div>
                  </div>

                  {/* Description if available */}
                  {product.description && (
                    <div className="p-3">
                      <p className="text-white/70 text-sm">{product.description}</p>
                    </div>
                  )}

                  {/* Link date */}
                  {userProduct.linkedAt && (
                    <div className="text-xs text-white/40">
                      Vinculado em {new Date(userProduct.linkedAt).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {userProducts.length === 0 && (
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
              <Package className="h-16 w-16 text-white/40" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Nenhum produto vinculado</h3>
            <p className="text-white/60 mb-8 max-w-md">
              Busque e vincule produtos da base global para começar a gerenciar seu inventário
            </p>
            <Button 
              onClick={() => setIsLinking(true)}
              className="bg-blue-500/20 border-blue-500/30 text-blue-300 hover:bg-blue-500/30 hover:border-blue-500/50 rounded-xl px-6 py-3 font-medium transition-all duration-200"
              data-testid="button-link-first-product"
            >
              <Link2 className="h-4 w-4 mr-2" />
              Vincular Primeiro Produto
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}