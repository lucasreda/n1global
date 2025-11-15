import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  Ban,
  Eye,
  Filter,
  Mail,
  Calendar,
  Package,
  DollarSign,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Affiliate {
  id: string;
  userId: string;
  email?: string;
  name?: string;
  status: 'pending' | 'active' | 'suspended';
  createdAt: string;
  landingPageUrl?: string;
  trackingPixel?: string;
}

export default function AffiliatesManage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string | null>(null);

  const { data: affiliates = [], isLoading, refetch } = useQuery<Affiliate[]>({
    queryKey: ['/api/affiliate/admin/list', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      const url = `/api/affiliate/admin/list${params.toString() ? `?${params.toString()}` : ''}`;
      
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, {
        credentials: 'include',
        headers
      });
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (affiliateId: string) => {
      return await apiRequest(`/api/affiliate/admin/${affiliateId}/approve`, 'PATCH', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/admin/list'] });
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/admin/stats'] });
      toast({
        title: "Afiliado aprovado!",
        description: "O afiliado foi aprovado com sucesso.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao aprovar",
        description: error.message || "Não foi possível aprovar o afiliado.",
        variant: "destructive",
      });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ affiliateId, reason }: { affiliateId: string; reason: string }) => {
      return await apiRequest(`/api/affiliate/admin/${affiliateId}/suspend`, 'PATCH', { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/admin/list'] });
      toast({
        title: "Afiliado suspendido",
        description: "O afiliado foi suspendido com sucesso.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao suspender",
        description: error.message || "Não foi possível suspender o afiliado.",
        variant: "destructive",
      });
    },
  });

  const { data: affiliateDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['/api/affiliate/admin/details', selectedAffiliateId],
    queryFn: async () => {
      if (!selectedAffiliateId) return null;
      
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/affiliate/admin/${selectedAffiliateId}/details`, {
        credentials: 'include',
        headers
      });
      return response.json();
    },
    enabled: !!selectedAffiliateId && detailsOpen,
  });

  const filteredAffiliates = affiliates.filter(affiliate => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      affiliate.email?.toLowerCase().includes(query) ||
      affiliate.name?.toLowerCase().includes(query) ||
      affiliate.id.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pendente', className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' },
      active: { label: 'Ativo', className: 'bg-green-500/20 text-green-500 border-green-500/30' },
      suspended: { label: 'Suspenso', className: 'bg-red-500/20 text-red-500 border-red-500/30' },
    };
    
    const variant = variants[status] || variants.pending;
    
    return (
      <Badge className={`${variant.className} border`}>
        {variant.label}
      </Badge>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="page-title">Gerenciar Afiliados</h1>
        <p className="text-gray-400">Visualize e gerencie todos os afiliados do programa</p>
      </div>

      {/* Filters */}
      <Card className="bg-[#1a1a1a] border-[#252525] mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por email, nome ou ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[#0f0f0f] border-[#252525]"
                  data-testid="input-search"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-[#0f0f0f] border-[#252525]" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="suspended">Suspensos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Affiliates Table */}
      <Card className="bg-[#1a1a1a] border-[#252525]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Afiliados ({filteredAffiliates.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Carregando...</div>
          ) : filteredAffiliates.length === 0 ? (
            <div className="text-center py-8 text-gray-400">Nenhum afiliado encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-[#252525]">
                  <tr className="text-left text-sm text-gray-400">
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Data de Cadastro</th>
                    <th className="pb-3 font-medium">Landing Page</th>
                    <th className="pb-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAffiliates.map((affiliate) => (
                    <tr key={affiliate.id} className="border-b border-[#252525]/50 hover:bg-[#252525]/30" data-testid={`row-affiliate-${affiliate.id}`}>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{affiliate.email || affiliate.userId}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        {getStatusBadge(affiliate.status)}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Calendar className="h-4 w-4" />
                          {new Date(affiliate.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="py-4">
                        {affiliate.landingPageUrl ? (
                          <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                            Atribuída
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-500">Nenhuma</span>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedAffiliate(affiliate);
                              setSelectedAffiliateId(affiliate.id);
                              setDetailsOpen(true);
                            }}
                            data-testid={`button-view-${affiliate.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {affiliate.status === 'pending' && (
                            <Button
                              size="sm"
                              className="bg-green-500/20 text-green-500 hover:bg-green-500/30"
                              onClick={() => approveMutation.mutate(affiliate.id)}
                              disabled={approveMutation.isPending}
                              data-testid={`button-approve-${affiliate.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                          )}
                          
                          {affiliate.status === 'active' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:bg-red-500/10"
                              onClick={() => suspendMutation.mutate({ 
                                affiliateId: affiliate.id, 
                                reason: "Suspenso pelo admin" 
                              })}
                              disabled={suspendMutation.isPending}
                              data-testid={`button-suspend-${affiliate.id}`}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#252525] text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Detalhes do Afiliado</DialogTitle>
          </DialogHeader>
          
          {isLoadingDetails ? (
            <div className="text-center py-8 text-gray-400">Carregando detalhes...</div>
          ) : selectedAffiliate && affiliateDetails ? (
            <div className="space-y-6">
              {/* Basic Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Nome</p>
                  <p className="font-medium">{affiliateDetails.userName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Email</p>
                  <p>{affiliateDetails.userEmail || selectedAffiliate.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Status</p>
                  {getStatusBadge(selectedAffiliate.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Data de Cadastro</p>
                  <p>{new Date(selectedAffiliate.createdAt).toLocaleString('pt-BR')}</p>
                </div>
              </div>

              {/* Landing Page */}
              {selectedAffiliate.landingPageUrl && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Landing Page</p>
                  <a 
                    href={selectedAffiliate.landingPageUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline break-all"
                  >
                    {selectedAffiliate.landingPageUrl}
                  </a>
                </div>
              )}

              {/* ID */}
              <div>
                <p className="text-sm text-gray-400 mb-1">ID</p>
                <p className="font-mono text-xs">{selectedAffiliate.id}</p>
              </div>

              {/* Tracking Pixel */}
              {selectedAffiliate.trackingPixel && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Tracking Pixel</p>
                  <code className="text-xs bg-[#0f0f0f] p-3 rounded block overflow-x-auto">
                    {selectedAffiliate.trackingPixel}
                  </code>
                </div>
              )}

              {/* Products Section */}
              <div className="border-t border-[#252525] pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="h-5 w-5 text-gray-400" />
                  <h3 className="text-lg font-semibold">Produtos Associados</h3>
                  <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30 border">
                    {affiliateDetails.memberships?.length || 0}
                  </Badge>
                </div>

                {affiliateDetails.memberships && affiliateDetails.memberships.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {affiliateDetails.memberships.map((membership: any) => (
                      <Card key={membership.id} className="bg-[#0f0f0f] border-[#252525] overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {/* Product Image */}
                            {membership.productImageUrl ? (
                              <img 
                                src={membership.productImageUrl} 
                                alt={membership.productName || 'Produto'}
                                className="w-20 h-20 object-cover rounded border border-[#252525]"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23252525" width="80" height="80"/%3E%3C/svg%3E';
                                }}
                              />
                            ) : (
                              <div className="w-20 h-20 bg-[#252525] rounded flex items-center justify-center">
                                <Package className="h-8 w-8 text-gray-600" />
                              </div>
                            )}
                            
                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium mb-1 truncate">
                                {membership.productName || 'Operação inteira'}
                              </h4>
                              {membership.productDescription && (
                                <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                                  {membership.productDescription}
                                </p>
                              )}
                              <div className="flex items-center gap-3 text-xs">
                                {membership.productPrice && (
                                  <div className="flex items-center gap-1 text-green-400">
                                    <DollarSign className="h-3 w-3" />
                                    R$ {Number(membership.productPrice).toFixed(2)}
                                  </div>
                                )}
                                {membership.customCommissionPercent && (
                                  <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30 border text-xs">
                                    {Number(membership.customCommissionPercent)}% comissão
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-2">
                                <Badge className={
                                  membership.status === 'active' 
                                    ? 'bg-green-500/20 text-green-500 border-green-500/30 border text-xs'
                                    : membership.status === 'pending'
                                    ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30 border text-xs'
                                    : 'bg-gray-500/20 text-gray-500 border-gray-500/30 border text-xs'
                                }>
                                  {membership.status === 'active' ? 'Ativo' : 
                                   membership.status === 'pending' ? 'Pendente' : 
                                   membership.status === 'paused' ? 'Pausado' : 'Terminado'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 bg-[#0f0f0f] rounded border border-[#252525]">
                    <Package className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                    <p>Nenhum produto associado</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">Nenhuma informação disponível</div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setDetailsOpen(false);
                setSelectedAffiliateId(null);
              }}
              className="border-[#252525]"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
