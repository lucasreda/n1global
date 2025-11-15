import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Calendar,
  Package,
  User,
  Briefcase,
  Eye,
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface MembershipRequest {
  id: string;
  affiliateId: string;
  operationId: string;
  productId: string | null;
  status: 'pending' | 'active' | 'paused' | 'terminated';
  customCommissionPercent: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  affiliateName: string;
  affiliateEmail: string;
  operationName: string;
  productName: string | null;
}

export default function AffiliatesRequests() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedRequest, setSelectedRequest] = useState<MembershipRequest | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [customCommission, setCustomCommission] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const { data: requests = [], isLoading, refetch } = useQuery<MembershipRequest[]>({
    queryKey: ['/api/affiliate/admin/membership-requests', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      const url = `/api/affiliate/admin/membership-requests${params.toString() ? `?${params.toString()}` : ''}`;
      
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
    mutationFn: async ({ requestId, customCommission }: { requestId: string; customCommission?: number }) => {
      return await apiRequest(
        `/api/affiliate/admin/membership-requests/${requestId}/approve`, 
        'PATCH', 
        customCommission ? { customCommissionPercent: customCommission } : {}
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/admin/membership-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/admin/stats'] });
      toast({
        title: "Solicitação aprovada!",
        description: "A solicitação de afiliação foi aprovada com sucesso.",
      });
      setApproveDialogOpen(false);
      setCustomCommission("");
      setSelectedRequest(null);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao aprovar",
        description: error.message || "Não foi possível aprovar a solicitação.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason?: string }) => {
      return await apiRequest(
        `/api/affiliate/admin/membership-requests/${requestId}/reject`, 
        'PATCH', 
        reason ? { reason } : {}
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/admin/membership-requests'] });
      toast({
        title: "Solicitação rejeitada",
        description: "A solicitação de afiliação foi rejeitada.",
      });
      setRejectDialogOpen(false);
      setRejectReason("");
      setSelectedRequest(null);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao rejeitar",
        description: error.message || "Não foi possível rejeitar a solicitação.",
        variant: "destructive",
      });
    },
  });

  const filteredRequests = requests.filter(request => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      request.affiliateEmail?.toLowerCase().includes(query) ||
      request.affiliateName?.toLowerCase().includes(query) ||
      request.productName?.toLowerCase().includes(query) ||
      request.operationName?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pendente', className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' },
      active: { label: 'Ativo', className: 'bg-green-500/20 text-green-500 border-green-500/30' },
      paused: { label: 'Pausado', className: 'bg-gray-500/20 text-gray-500 border-gray-500/30' },
      terminated: { label: 'Rejeitado', className: 'bg-red-500/20 text-red-500 border-red-500/30' },
    };
    
    const variant = variants[status] || variants.pending;
    
    return (
      <Badge className={`${variant.className} border`}>
        {variant.label}
      </Badge>
    );
  };

  const handleApprove = (request: MembershipRequest) => {
    setSelectedRequest(request);
    setCustomCommission("");
    setApproveDialogOpen(true);
  };

  const handleReject = (request: MembershipRequest) => {
    setSelectedRequest(request);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const confirmApprove = () => {
    if (!selectedRequest) return;
    approveMutation.mutate({
      requestId: selectedRequest.id,
      customCommission: customCommission ? parseFloat(customCommission) : undefined,
    });
  };

  const confirmReject = () => {
    if (!selectedRequest) return;
    rejectMutation.mutate({
      requestId: selectedRequest.id,
      reason: rejectReason,
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="page-title">Solicitações de Afiliação</h1>
        <p className="text-gray-400">Gerencie solicitações de afiliados para produtos</p>
      </div>

      {/* Filters */}
      <Card className="bg-[#1a1a1a] border-[#252525] mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por afiliado, produto ou operação..."
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
                <SelectItem value="active">Aprovados</SelectItem>
                <SelectItem value="terminated">Rejeitados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card className="bg-[#1a1a1a] border-[#252525]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Solicitações ({filteredRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Carregando...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-400">Nenhuma solicitação encontrada</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-[#252525]">
                  <tr className="text-left text-sm text-gray-400">
                    <th className="pb-3 font-medium">Afiliado</th>
                    <th className="pb-3 font-medium">Produto</th>
                    <th className="pb-3 font-medium">Operação</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Data</th>
                    <th className="pb-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="border-b border-[#252525]/50 hover:bg-[#252525]/30" data-testid={`row-request-${request.id}`}>
                      <td className="py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{request.affiliateName}</span>
                          </div>
                          <span className="text-sm text-gray-400 ml-6">{request.affiliateEmail}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span>{request.productName || 'Operação inteira'}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-gray-400" />
                          <span>{request.operationName}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Calendar className="h-4 w-4" />
                          {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center justify-end gap-2">
                          {request.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApprove(request)}
                                className="border-green-500 text-green-500 hover:bg-green-500/10"
                                data-testid={`button-approve-${request.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(request)}
                                className="border-red-500 text-red-500 hover:bg-red-500/10"
                                data-testid={`button-reject-${request.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Rejeitar
                              </Button>
                            </>
                          )}
                          {request.status === 'active' && (
                            <Badge className="bg-green-500/20 text-green-500 border-green-500/30 border">
                              Aprovado em {request.approvedAt ? new Date(request.approvedAt).toLocaleDateString('pt-BR') : '-'}
                            </Badge>
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

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#252525]">
          <DialogHeader>
            <DialogTitle>Aprovar Solicitação</DialogTitle>
            <DialogDescription className="text-gray-400">
              Aprovar a solicitação de {selectedRequest?.affiliateName} para {selectedRequest?.productName || 'a operação'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="custom-commission">Comissão Personalizada (%) - Opcional</Label>
              <Input
                id="custom-commission"
                type="number"
                placeholder="10"
                value={customCommission}
                onChange={(e) => setCustomCommission(e.target.value)}
                className="bg-[#0f0f0f] border-[#252525]"
                data-testid="input-custom-commission"
              />
              <p className="text-xs text-gray-400">Deixe em branco para usar a comissão padrão do produto</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
              className="border-[#252525]"
              data-testid="button-cancel-approve"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmApprove}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending ? "Aprovando..." : "Aprovar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#252525]">
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação</DialogTitle>
            <DialogDescription className="text-gray-400">
              Rejeitar a solicitação de {selectedRequest?.affiliateName} para {selectedRequest?.productName || 'a operação'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Motivo (Opcional)</Label>
              <Input
                id="reject-reason"
                placeholder="Motivo da rejeição..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="bg-[#0f0f0f] border-[#252525]"
                data-testid="input-reject-reason"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              className="border-[#252525]"
              data-testid="button-cancel-reject"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmReject}
              disabled={rejectMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? "Rejeitando..." : "Rejeitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
