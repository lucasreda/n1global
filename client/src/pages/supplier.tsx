import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Package, TrendingUp, ArrowUpDown, ArrowDown, DollarSign, Calendar, Crown, LayoutDashboard, FileText, Wallet, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { SupplierProductCard } from "@/components/supplier/supplier-product-card";

// Types for API responses
interface SupplierProduct {
  id: string;
  sku: string;
  name: string;
  description?: string;
  type: string;
  price: number;
  costPrice?: number;
  shippingCost?: number;
  initialStock?: number;
  lowStock?: number;
  imageUrl?: string;
  videoUrl?: string;
  productUrl?: string;
  status?: string; // pending, approved, rejected
  createdAt: string;
  updatedAt: string;
}

interface SupplierMetrics {
  totalOrders: number;
  deliveredOrders: number;
  returnedOrders: number;
  cancelledOrders: number;
  totalProfit: number;
}

interface SupplierContract {
  id: string;
  contractTitle: string;
  contractContent: string;
  contractTerms: any;
  status: 'sent' | 'viewed' | 'signed' | 'rejected';
  sentAt: string;
  viewedAt?: string;
  respondedAt?: string;
  deliveryDays: number;
  minimumOrder: number;
  commissionRate: string;
  productName: string;
  productSku: string;
  productPrice: string;
}


export default function SupplierDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [dateFilter, setDateFilter] = useState("current_month");
  const [activeSection, setActiveSection] = useState<'dashboard' | 'contracts' | 'wallet'>('dashboard');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Modal states for contract actions
  const [contractToSign, setContractToSign] = useState<SupplierContract | null>(null);
  const [contractToReject, setContractToReject] = useState<SupplierContract | null>(null);

  // Fetch supplier products (produtos globais criados por este supplier)
  const { data: supplierProducts = [], isLoading: isLoadingProducts, refetch: refetchProducts } = useQuery<SupplierProduct[]>({
    queryKey: ['/api/supplier/products'],
    enabled: !!user && user.role === 'supplier',
  });


  // Fetch supplier metrics (orders, deliveries, returns)  
  const { data: supplierMetrics, isLoading: isLoadingMetrics } = useQuery<SupplierMetrics>({
    queryKey: [`/api/supplier/metrics?period=${dateFilter}`],
    enabled: !!user && user.role === 'supplier',
  });

  // Fetch supplier contracts
  const { data: supplierContracts = [], isLoading: isLoadingContracts } = useQuery<SupplierContract[]>({
    queryKey: ['/api/supplier/contracts'],
    enabled: !!user && user.role === 'supplier',
  });

  // Contract response mutations
  const signContractMutation = useMutation({
    mutationFn: async (contractId: string) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/supplier/contracts/${contractId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao assinar contrato');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contrato assinado",
        description: "O contrato foi assinado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/supplier/contracts'] });
      setContractToSign(null); // Close modal
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      setContractToSign(null); // Close modal
    }
  });

  const rejectContractMutation = useMutation({
    mutationFn: async (contractId: string) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/supplier/contracts/${contractId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao rejeitar contrato');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contrato rejeitado",
        description: "O contrato foi rejeitado.",
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/supplier/contracts'] });
      setContractToReject(null); // Close modal
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      setContractToReject(null); // Close modal
    }
  });

  // Confirmation handlers
  const handleSignContract = () => {
    if (contractToSign) {
      signContractMutation.mutate(contractToSign.id);
    }
  };

  const handleRejectContract = () => {
    if (contractToReject) {
      rejectContractMutation.mutate(contractToReject.id);
    }
  };

  if (user?.role !== 'supplier') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Acesso Negado</h2>
              <p className="text-muted-foreground mb-4">
                Esta área é exclusiva para fornecedores. 
              </p>
              <p className="text-sm text-muted-foreground">
                Seu perfil: {user?.role || 'Não identificado'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasProducts = supplierProducts && supplierProducts.length > 0;

  return (
    <div className="container mx-auto py-8">
      <div className="flex gap-4">
        {/* Sidebar Menu */}
        <div className="flex-shrink-0 w-24">
          <div className="grid grid-cols-1 gap-2">
            {[
              { 
                id: 'dashboard', 
                label: 'Dashboard', 
                icon: LayoutDashboard,
                active: activeSection === 'dashboard'
              },
              { 
                id: 'contracts', 
                label: 'Contratos', 
                icon: FileText,
                active: activeSection === 'contracts'
              },
              { 
                id: 'wallet', 
                label: 'Carteira', 
                icon: Wallet,
                active: activeSection === 'wallet'
              }
            ].map((item) => (
              <Card 
                key={item.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  item.active 
                    ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' 
                    : 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
                }`}
                onClick={() => {
                  if (item.id === 'wallet') {
                    setLocation('/supplier/wallet');
                  } else {
                    setActiveSection(item.id as 'dashboard' | 'contracts' | 'wallet');
                  }
                }}
                data-testid={`menu-${item.id}`}
              >
                <CardContent className="p-2 text-center">
                  <item.icon className={`h-5 w-5 mx-auto mb-1.5 ${
                    item.active 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`} />
                  <h3 className={`text-xs font-medium ${
                    item.active 
                      ? 'text-blue-900 dark:text-blue-100' 
                      : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {item.label}
                  </h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {activeSection === 'dashboard' && (
            <>
              {/* Page Title */}
              <div className="p-6" style={{ marginTop: '-25px' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">
                      Dashboard do Fornecedor
                    </h1>
                    <p className="text-muted-foreground mt-1">
                      Gerencie seus produtos globais e acompanhe pedidos em todas as operações
                    </p>
                  </div>

          {/* Action buttons and Date Filter */}
          <div className="flex items-center space-x-3">
            {/* Date Filter */}
            <div className="flex items-center space-x-2 bg-gray-900/30 border border-gray-700/50 rounded-lg px-3 py-2">
              <Calendar className="text-gray-400" size={16} />
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-36 bg-transparent border-0 text-gray-300 text-sm h-auto p-0">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent className="glassmorphism border-gray-600">
                  <SelectItem value="current_month">Este Mês</SelectItem>
                  <SelectItem value="1">Hoje</SelectItem>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="90">3 meses</SelectItem>
                  <SelectItem value="365">1 ano</SelectItem>
                  <SelectItem value="all">Tudo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => setLocation('/supplier/create-product')} data-testid="button-create-product" className="text-white">
              <Plus className="h-4 w-4 mr-2" />
              {hasProducts ? 'Novo Produto' : 'Criar Primeiro Produto'}
            </Button>
          </div>
        </div>
      </div>

      {/* Métricas Globais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Ativos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-active-products">
              {isLoadingProducts ? '-' : (supplierProducts?.filter(p => p.status === 'approved').length || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasProducts ? 'produtos no catálogo global' : 'nenhum produto cadastrado'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Globais</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-total-orders">
              {isLoadingMetrics ? '-' : (supplierMetrics?.totalOrders || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              de todas as operações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregues</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="metric-delivered-orders">
              {isLoadingMetrics ? '-' : (supplierMetrics?.deliveredOrders || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {supplierMetrics?.totalOrders ? 
                `${((supplierMetrics.deliveredOrders / supplierMetrics.totalOrders) * 100).toFixed(1)}% dos pedidos` : 
                'taxa de entrega'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retornados</CardTitle>
            <ArrowDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="metric-returned-orders">
              {isLoadingMetrics ? '-' : (supplierMetrics?.returnedOrders || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {supplierMetrics?.totalOrders ? 
                `${((supplierMetrics.returnedOrders / supplierMetrics.totalOrders) * 100).toFixed(1)}% dos pedidos` : 
                'taxa de retorno'
              }
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 border-emerald-200 dark:border-emerald-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Lucro Total</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="metric-total-profit">
              {isLoadingMetrics ? '-' : `€${(supplierMetrics?.totalProfit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              de produtos entregues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Produtos do Fornecedor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Package className="h-5 w-5" />
            Meus Produtos Globais
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingProducts ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando produtos...</p>
              </div>
            </div>
          ) : hasProducts ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {supplierProducts.map((product) => (
                <SupplierProductCard 
                  key={product.id} 
                  product={product} 
                  onUpdate={refetchProducts}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12" data-testid="empty-state-products">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum produto cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Comece criando seu primeiro produto global. Ele ficará disponível para todas as operações que quiserem vendê-lo.
              </p>
              <Button onClick={() => setLocation('/supplier/create-product')} data-testid="button-create-first-product">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Produto
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
            </>
          )}

          {activeSection === 'contracts' && (
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-4">Contratos</h1>
              
              {isLoadingContracts ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Carregando contratos...</p>
                  </CardContent>
                </Card>
              ) : supplierContracts.length > 0 ? (
                <div className="space-y-4">
                  {supplierContracts.map((contract) => (
                    <Card key={contract.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2" style={{ fontSize: '19px' }}>
                            <FileText className="h-5 w-5" />
                            {contract.productName}
                          </CardTitle>
                          <Badge 
                            variant={
                              contract.status === 'signed' ? 'default' : 
                              contract.status === 'rejected' ? 'destructive' : 
                              contract.status === 'viewed' ? 'secondary' : 
                              'outline'
                            }
                          >
                            {contract.status === 'sent' && 'Enviado'}
                            {contract.status === 'viewed' && 'Visualizado'}
                            {contract.status === 'signed' && 'Assinado'}
                            {contract.status === 'rejected' && 'Rejeitado'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Product Details */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">SKU</p>
                              <p className="font-medium">{contract.productSku}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Preço</p>
                              <p className="font-medium">€{Number(contract.productPrice).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Comissão</p>
                              <p className="font-medium">{contract.commissionRate}%</p>
                            </div>
                          </div>

                          {/* Contract Terms */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Prazo de Entrega</p>
                              <p className="font-medium">{contract.deliveryDays} dias úteis</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Pedido Mínimo</p>
                              <p className="font-medium">{contract.minimumOrder} unidade(s)</p>
                            </div>
                          </div>

                          {/* Timeline */}
                          <div className="border-t pt-4">
                            <p className="text-sm text-muted-foreground mb-2">Status do Contrato:</p>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-sm">
                                  Enviado em {new Date(contract.sentAt).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                              {contract.viewedAt && (
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                  <span className="text-sm">
                                    Visualizado em {new Date(contract.viewedAt).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                              )}
                              {contract.respondedAt && (
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    contract.status === 'signed' ? 'bg-green-500' : 'bg-red-500'
                                  }`}></div>
                                  <span className="text-sm">
                                    Respondido em {new Date(contract.respondedAt).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          {contract.status === 'sent' && (
                            <div className="border-t pt-4">
                              <p className="text-sm text-muted-foreground mb-3">
                                O que deseja fazer com este contrato?
                              </p>
                              <div className="flex gap-3">
                                <Button
                                  onClick={() => setContractToSign(contract)}
                                  disabled={signContractMutation.isPending || rejectContractMutation.isPending}
                                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <CheckCircle className="h-4 w-4 text-white" />
                                  Assinar Contrato
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => setContractToReject(contract)}
                                  disabled={signContractMutation.isPending || rejectContractMutation.isPending}
                                  className="flex items-center gap-2"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Rejeitar
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Contract Content */}
                          <details className="border rounded p-3">
                            <summary className="cursor-pointer text-sm font-medium">
                              Ver Contrato Completo
                            </summary>
                            <div className="mt-3 pt-3 border-t">
                              <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                                {contract.contractContent}
                              </pre>
                            </div>
                          </details>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum Contrato</h3>
                    <p className="text-muted-foreground mb-4">
                      Você ainda não possui contratos enviados.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Contratos aparecerão aqui quando seus produtos forem aprovados pelo administrador.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeSection === 'wallet' && (
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-4">Carteira</h1>
              <Card>
                <CardContent className="p-8 text-center">
                  <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Carteira Digital</h3>
                  <p className="text-muted-foreground">
                    Acompanhe seus pagamentos e saldo disponível.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}


        </div>
      </div>

      {/* Sign Contract Confirmation Modal */}
      <Dialog open={!!contractToSign} onOpenChange={() => setContractToSign(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Assinar Contrato
            </DialogTitle>
            <DialogDescription>
              Tem certeza de que deseja assinar este contrato para o produto "{contractToSign?.productName}"?
            </DialogDescription>
          </DialogHeader>
          
          {contractToSign && (
            <div className="py-4">
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">SKU:</span> {contractToSign.productSku}
                </div>
                <div>
                  <span className="font-medium">Preço:</span> €{Number(contractToSign.productPrice).toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">Comissão:</span> {contractToSign.commissionRate}%
                </div>
                <div>
                  <span className="font-medium">Prazo de Entrega:</span> {contractToSign.deliveryDays} dias úteis
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setContractToSign(null)}
              disabled={signContractMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSignContract}
              disabled={signContractMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {signContractMutation.isPending ? 'Assinando...' : 'Confirmar Assinatura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Contract Confirmation Modal */}
      <Dialog open={!!contractToReject} onOpenChange={() => setContractToReject(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Rejeitar Contrato
            </DialogTitle>
            <DialogDescription>
              Tem certeza de que deseja rejeitar este contrato para o produto "{contractToReject?.productName}"?
            </DialogDescription>
          </DialogHeader>
          
          {contractToReject && (
            <div className="py-4">
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">SKU:</span> {contractToReject.productSku}
                </div>
                <div>
                  <span className="font-medium">Preço:</span> €{Number(contractToReject.productPrice).toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">Comissão:</span> {contractToReject.commissionRate}%
                </div>
              </div>
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">
                  <strong>Atenção:</strong> Esta ação não pode ser desfeita. Após rejeitar, não será possível assinar este contrato.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setContractToReject(null)}
              disabled={rejectContractMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectContract}
              disabled={rejectContractMutation.isPending}
            >
              {rejectContractMutation.isPending ? 'Rejeitando...' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}