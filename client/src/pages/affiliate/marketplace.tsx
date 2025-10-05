import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  ShoppingBag,
  Search,
  Check,
  Clock,
  X,
  Loader2,
  Package,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface MarketplaceProduct {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  type: string;
  operationId: string;
  operationName: string;
  isActive: boolean;
  membershipStatus: string | null;
  canJoin: boolean;
}

interface MyProduct {
  membershipId: string;
  membershipStatus: string;
  customCommissionPercent: string | null;
  approvedAt: string | null;
  createdAt: string;
  productId: string;
  productName: string;
  productDescription: string | null;
  productImageUrl: string | null;
  productPrice: string;
  operationName: string;
}

export default function AffiliateMarketplace() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [joiningProductId, setJoiningProductId] = useState<string | null>(null);

  const { data: products = [], isLoading } = useQuery<MarketplaceProduct[]>({
    queryKey: ['/api/affiliate/marketplace/products'],
  });

  const { data: myProducts = [], isLoading: isLoadingMyProducts } = useQuery<MyProduct[]>({
    queryKey: ['/api/affiliate/marketplace/my-products'],
  });

  const joinMutation = useMutation({
    mutationFn: async (productId: string) => {
      setJoiningProductId(productId);
      return await apiRequest(`/api/affiliate/marketplace/join/${productId}`, 'POST', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/marketplace/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/marketplace/my-products'] });
      toast({
        title: "✅ Solicitação enviada!",
        description: "Sua solicitação de afiliação foi enviada com sucesso. Aguarde aprovação.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao solicitar afiliação",
        description: error.message || "Não foi possível enviar a solicitação.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setJoiningProductId(null);
    },
  });

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.operationName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableProducts = filteredProducts.filter((p) => p.canJoin);

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      pending: { 
        label: "Pendente", 
        className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
        icon: Clock
      },
      active: { 
        label: "Ativo", 
        className: "bg-green-500/20 text-green-400 border-green-500/50",
        icon: Check
      },
      paused: { 
        label: "Pausado", 
        className: "bg-gray-500/20 text-gray-400 border-gray-500/50",
        icon: X
      },
      terminated: { 
        label: "Terminado", 
        className: "bg-red-500/20 text-red-400 border-red-500/50",
        icon: X
      },
    };

    const config = statusConfig[status];
    if (!config) return null;

    const Icon = config.icon;

    return (
      <Badge className={`${config.className} border flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const ProductCard = ({ product }: { product: MarketplaceProduct }) => (
    <Card className="bg-gray-900/50 border-gray-800 hover:border-purple-500/50 transition-all duration-300">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-white text-lg truncate">{product.name}</CardTitle>
            <CardDescription className="text-gray-400 text-sm mt-1">
              {product.operationName}
            </CardDescription>
          </div>
          {product.membershipStatus && getStatusBadge(product.membershipStatus)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {product.imageUrl && (
          <div className="w-full h-40 bg-gray-800 rounded-lg overflow-hidden">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <p className="text-gray-300 text-sm line-clamp-2">
          {product.description || "Sem descrição disponível"}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-gray-800">
          <div className="flex items-center gap-2 text-green-400">
            <DollarSign className="h-5 w-5" />
            <span className="text-xl font-bold">
              R$ {parseFloat(product.price).toFixed(2)}
            </span>
          </div>
          
          {product.canJoin ? (
            <Button
              onClick={() => joinMutation.mutate(product.id)}
              disabled={joiningProductId === product.id}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              data-testid={`button-join-${product.id}`}
            >
              {joiningProductId === product.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Solicitando...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Solicitar
                </>
              )}
            </Button>
          ) : (
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 border">
              Já solicitado
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const MyProductCard = ({ product }: { product: MyProduct }) => (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-white text-lg truncate">{product.productName}</CardTitle>
            <CardDescription className="text-gray-400 text-sm mt-1">
              {product.operationName}
            </CardDescription>
          </div>
          {getStatusBadge(product.membershipStatus)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {product.productImageUrl && (
          <div className="w-full h-40 bg-gray-800 rounded-lg overflow-hidden">
            <img
              src={product.productImageUrl}
              alt={product.productName}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <p className="text-gray-300 text-sm line-clamp-2">
          {product.productDescription || "Sem descrição disponível"}
        </p>

        <div className="space-y-2 pt-2 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Preço:</span>
            <span className="text-green-400 font-semibold">
              R$ {parseFloat(product.productPrice).toFixed(2)}
            </span>
          </div>
          
          {product.customCommissionPercent && (
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Comissão:</span>
              <span className="text-purple-400 font-semibold">
                {product.customCommissionPercent}%
              </span>
            </div>
          )}

          {product.membershipStatus === 'pending' && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-2">
              <p className="text-yellow-400 text-sm">
                ⏳ Sua solicitação está aguardando aprovação do administrador.
              </p>
            </div>
          )}

          {product.membershipStatus === 'active' && product.approvedAt && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mt-2">
              <p className="text-green-400 text-sm">
                ✅ Aprovado em {new Date(product.approvedAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <ShoppingBag className="h-8 w-8 text-purple-400" />
              Marketplace de Produtos
            </h1>
            <p className="text-gray-400 mt-2">
              Explore produtos disponíveis e solicite afiliação
            </p>
          </div>

          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
              data-testid="input-search-products"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="available" className="w-full">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger 
              value="available" 
              className="data-[state=active]:bg-purple-600"
              data-testid="tab-available"
            >
              <Package className="h-4 w-4 mr-2" />
              Disponíveis ({availableProducts.length})
            </TabsTrigger>
            <TabsTrigger 
              value="my-products" 
              className="data-[state=active]:bg-purple-600"
              data-testid="tab-my-products"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Meus Produtos ({myProducts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
              </div>
            ) : availableProducts.length === 0 ? (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                  <Package className="h-16 w-16 text-gray-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400">
                    {searchTerm ? "Nenhum produto encontrado" : "Nenhum produto disponível"}
                  </h3>
                  <p className="text-gray-500 mt-2">
                    {searchTerm 
                      ? "Tente buscar com outros termos" 
                      : "Novos produtos serão adicionados em breve"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-products" className="mt-6">
            {isLoadingMyProducts ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
              </div>
            ) : myProducts.length === 0 ? (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                  <TrendingUp className="h-16 w-16 text-gray-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400">
                    Você ainda não solicitou nenhum produto
                  </h3>
                  <p className="text-gray-500 mt-2">
                    Navegue pela aba "Disponíveis" e solicite afiliação a produtos
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myProducts.map((product) => (
                  <MyProductCard key={product.membershipId} product={product} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
