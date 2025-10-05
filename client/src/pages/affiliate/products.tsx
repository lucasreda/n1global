import { AffiliateLayout } from "@/components/affiliate/affiliate-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import {
  Package,
  Search,
  DollarSign,
  Percent,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  ExternalLink,
  AlertCircle
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  status: string;
  storeId: string;
  operationId?: string;
  operationName?: string;
}

interface CommissionRule {
  id: string;
  productId?: string;
  operationId?: string;
  commissionPercentage: number;
  isActive: boolean;
}

interface AffiliateMembership {
  id: string;
  productId?: string;
  operationId?: string;
  customCommissionPercentage?: number;
  status: string;
  approvedAt?: string;
  product?: Product;
}

interface ProductWithCommission extends Product {
  commissionRule?: CommissionRule;
  membership?: AffiliateMembership;
  estimatedCommission: number;
  isMember: boolean;
  membershipStatus?: string;
}

export default function AffiliateProducts() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: products = [], isLoading } = useQuery<ProductWithCommission[]>({
    queryKey: ['/api/affiliate/products'],
  });

  const joinProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      return await apiRequest('/api/affiliate/membership/join', 'POST', { productId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/products'] });
      toast({
        title: "Solicitação Enviada!",
        description: "Sua solicitação para promover este produto foi enviada para aprovação.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao solicitar",
        description: error.message || "Não foi possível enviar a solicitação.",
        variant: "destructive",
      });
    },
  });

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMembershipBadge = (status?: string) => {
    if (!status) {
      return (
        <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
          <XCircle className="h-3 w-3 mr-1" />
          Não Membro
        </Badge>
      );
    }

    const variants: Record<string, { label: string; className: string; icon: any }> = {
      pending: { label: 'Pendente', className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30', icon: AlertCircle },
      approved: { label: 'Aprovado', className: 'bg-green-500/20 text-green-500 border-green-500/30', icon: CheckCircle },
      rejected: { label: 'Rejeitado', className: 'bg-red-500/20 text-red-500 border-red-500/30', icon: XCircle },
    };
    
    const variant = variants[status] || variants.pending;
    const Icon = variant.icon;
    
    return (
      <Badge className={variant.className}>
        <Icon className="h-3 w-3 mr-1" />
        {variant.label}
      </Badge>
    );
  };

  const handleJoinProduct = (productId: string) => {
    joinProductMutation.mutate(productId);
  };

  const memberProducts = filteredProducts.filter(p => p.isMember && p.membershipStatus === 'approved');
  const pendingProducts = filteredProducts.filter(p => p.membershipStatus === 'pending');
  const availableProducts = filteredProducts.filter(p => !p.isMember);

  return (
    <AffiliateLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="font-bold tracking-tight text-gray-900 dark:text-gray-100" style={{ fontSize: '22px' }}>
            Catálogo de Produtos
          </h1>
          <p className="text-muted-foreground mt-2">
            Explore produtos disponíveis para promover e ganhar comissões
          </p>
        </div>

        {/* Search Bar */}
        <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-900 border-gray-700 text-white"
                data-testid="input-search-products"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Produtos Ativos</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-member-products">
                {memberProducts.length}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Aprovados para promover
              </p>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Pendentes</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-pending-products">
                {pendingProducts.length}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Aguardando aprovação
              </p>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Disponíveis</CardTitle>
              <Package className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-available-products">
                {availableProducts.length}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Produtos para participar
              </p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}
                </h3>
                <p className="text-gray-400">
                  {searchTerm ? 'Tente buscar com outros termos' : 'Novos produtos serão adicionados em breve'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Member Products */}
            {memberProducts.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Meus Produtos ({memberProducts.length})
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {memberProducts.map((product) => (
                    <Card key={product.id} style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}} className="border-green-500/30">
                      <CardContent className="pt-6">
                        <div className="flex gap-4">
                          {product.imageUrl && (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-20 h-20 rounded-lg object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-white mb-1">{product.name}</h3>
                                {product.operationName && (
                                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 mb-2">
                                    {product.operationName}
                                  </Badge>
                                )}
                              </div>
                              {getMembershipBadge(product.membershipStatus)}
                            </div>
                            
                            {product.description && (
                              <p className="text-sm text-gray-400 mb-3 line-clamp-2">{product.description}</p>
                            )}

                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div className="flex items-center gap-2 text-sm">
                                <DollarSign className="h-4 w-4 text-gray-400" />
                                <span className="text-white font-semibold">€{product.price.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Percent className="h-4 w-4 text-green-400" />
                                <span className="text-green-400 font-semibold">
                                  {product.membership?.customCommissionPercentage || product.commissionRule?.commissionPercentage || 10}%
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                              <div className="text-sm">
                                <span className="text-gray-400">Comissão estimada: </span>
                                <span className="text-white font-semibold">€{product.estimatedCommission.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Products */}
            {pendingProducts.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  Aguardando Aprovação ({pendingProducts.length})
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {pendingProducts.map((product) => (
                    <Card key={product.id} style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}} className="border-yellow-500/30">
                      <CardContent className="pt-6">
                        <div className="flex gap-4">
                          {product.imageUrl && (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-20 h-20 rounded-lg object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold text-white">{product.name}</h3>
                              {getMembershipBadge(product.membershipStatus)}
                            </div>
                            <p className="text-sm text-gray-400 mb-3">
                              Sua solicitação está sendo analisada pela equipe
                            </p>
                            <div className="flex items-center gap-2 text-sm">
                              <DollarSign className="h-4 w-4 text-gray-400" />
                              <span className="text-white">€{product.price.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Available Products */}
            {availableProducts.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-500" />
                  Produtos Disponíveis ({availableProducts.length})
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {availableProducts.map((product) => (
                    <Card key={product.id} style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
                      <CardContent className="pt-6">
                        <div className="flex gap-4">
                          {product.imageUrl && (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-20 h-20 rounded-lg object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-white mb-1">{product.name}</h3>
                            {product.operationName && (
                              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 mb-2">
                                {product.operationName}
                              </Badge>
                            )}
                            
                            {product.description && (
                              <p className="text-sm text-gray-400 mb-3 line-clamp-2">{product.description}</p>
                            )}

                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div className="flex items-center gap-2 text-sm">
                                <DollarSign className="h-4 w-4 text-gray-400" />
                                <span className="text-white font-semibold">€{product.price.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Percent className="h-4 w-4 text-blue-400" />
                                <span className="text-blue-400 font-semibold">
                                  {product.commissionRule?.commissionPercentage || 10}%
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                              <div className="text-sm">
                                <span className="text-gray-400">Comissão: </span>
                                <span className="text-white font-semibold">€{product.estimatedCommission.toFixed(2)}</span>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleJoinProduct(product.id)}
                                disabled={joinProductMutation.isPending}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                data-testid={`button-join-${product.id}`}
                              >
                                {joinProductMutation.isPending ? 'Solicitando...' : 'Solicitar'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Info Box */}
        <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}} className="border-blue-500/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
              <div>
                <p className="text-blue-400 font-medium mb-2">Como funciona?</p>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Solicite participação nos produtos que deseja promover</li>
                  <li>• Aguarde aprovação da equipe (pode levar até 48h)</li>
                  <li>• Após aprovado, você pode gerar links de rastreamento para o produto</li>
                  <li>• Ganhe comissão automática por cada venda através dos seus links</li>
                  <li>• Alguns produtos podem ter comissões personalizadas para você</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AffiliateLayout>
  );
}
