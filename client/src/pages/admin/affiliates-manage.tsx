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

  const { data: affiliates = [], isLoading, refetch } = useQuery<Affiliate[]>({
    queryKey: ['/api/affiliate/admin/list', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      const url = `/api/affiliate/admin/list${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
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
        <DialogContent className="bg-[#1a1a1a] border-[#252525] text-white">
          <DialogHeader>
            <DialogTitle>Detalhes do Afiliado</DialogTitle>
          </DialogHeader>
          {selectedAffiliate && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">ID</p>
                <p className="font-mono text-sm">{selectedAffiliate.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Email</p>
                <p>{selectedAffiliate.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Status</p>
                {getStatusBadge(selectedAffiliate.status)}
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Data de Cadastro</p>
                <p>{new Date(selectedAffiliate.createdAt).toLocaleString('pt-BR')}</p>
              </div>
              {selectedAffiliate.landingPageUrl && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Landing Page</p>
                  <a 
                    href={selectedAffiliate.landingPageUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {selectedAffiliate.landingPageUrl}
                  </a>
                </div>
              )}
              {selectedAffiliate.trackingPixel && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Tracking Pixel</p>
                  <code className="text-xs bg-[#0f0f0f] p-2 rounded block overflow-x-auto">
                    {selectedAffiliate.trackingPixel}
                  </code>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
