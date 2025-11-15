import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  ShoppingCart,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  User,
  Package,
  Calendar,
  Check,
} from "lucide-react";

interface Conversion {
  id: string;
  affiliateId: string;
  orderId: string;
  orderAmount: string;
  commissionAmount: string;
  commissionPercent: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  approvedByUserId?: string;
  productId?: string;
}

export default function AffiliatesConversions() {
  const { toast } = useToast();
  const [selectedConversions, setSelectedConversions] = useState<string[]>([]);

  const { data: conversions = [], isLoading, refetch } = useQuery<Conversion[]>({
    queryKey: ['/api/affiliate/commission/conversions'],
    queryFn: async () => {
      return fetch('/api/affiliate/commission/conversions', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      }).then(res => res.json());
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (conversionId: string) => {
      return await apiRequest(`/api/affiliate/commission/conversion/${conversionId}/approve`, 'POST', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/commission/conversions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/admin/stats'] });
      toast({
        title: "Conversão aprovada!",
        description: "A conversão foi aprovada com sucesso.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao aprovar",
        description: error.message || "Não foi possível aprovar a conversão.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ conversionId, reason }: { conversionId: string; reason: string }) => {
      return await apiRequest(`/api/affiliate/commission/conversion/${conversionId}/reject`, 'POST', { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/commission/conversions'] });
      toast({
        title: "Conversão rejeitada",
        description: "A conversão foi rejeitada.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao rejeitar",
        description: error.message || "Não foi possível rejeitar a conversão.",
        variant: "destructive",
      });
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (conversionIds: string[]) => {
      return await apiRequest('/api/affiliate/commission/conversions/bulk-approve', 'POST', { conversionIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/commission/conversions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/admin/stats'] });
      toast({
        title: "Conversões aprovadas!",
        description: `${selectedConversions.length} conversões aprovadas com sucesso.`,
      });
      setSelectedConversions([]);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao aprovar em lote",
        description: error.message || "Não foi possível aprovar as conversões.",
        variant: "destructive",
      });
    },
  });

  const pendingConversions = conversions.filter(c => c.status === 'pending');
  const approvedConversions = conversions.filter(c => c.status === 'approved');

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string; icon: any }> = {
      pending: { label: 'Pendente', className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30', icon: Clock },
      approved: { label: 'Aprovada', className: 'bg-green-500/20 text-green-500 border-green-500/30', icon: CheckCircle },
      rejected: { label: 'Rejeitada', className: 'bg-red-500/20 text-red-500 border-red-500/30', icon: XCircle },
      paid: { label: 'Paga', className: 'bg-blue-500/20 text-blue-500 border-blue-500/30', icon: DollarSign },
    };
    
    const variant = variants[status] || variants.pending;
    const Icon = variant.icon;
    
    return (
      <Badge className={`${variant.className} border flex items-center gap-1 w-fit`}>
        <Icon className="h-3 w-3" />
        {variant.label}
      </Badge>
    );
  };

  const toggleSelection = (conversionId: string) => {
    setSelectedConversions(prev =>
      prev.includes(conversionId)
        ? prev.filter(id => id !== conversionId)
        : [...prev, conversionId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedConversions.length === pendingConversions.length) {
      setSelectedConversions([]);
    } else {
      setSelectedConversions(pendingConversions.map(c => c.id));
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="page-title">Conversões</h1>
        <p className="text-gray-400">Aprovar ou rejeitar conversões de afiliados</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-[#1a1a1a] border-[#252525]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total de Conversões</p>
                <p className="text-3xl font-bold" data-testid="stat-total-conversions">{conversions.length}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#252525]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Pendentes de Aprovação</p>
                <p className="text-3xl font-bold text-yellow-500" data-testid="stat-pending-conversions">
                  {pendingConversions.length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#252525]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Aprovadas</p>
                <p className="text-3xl font-bold text-green-500" data-testid="stat-approved-conversions">
                  {approvedConversions.length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {pendingConversions.length > 0 && (
        <Card className="bg-[#1a1a1a] border-[#252525] mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedConversions.length === pendingConversions.length}
                  onCheckedChange={toggleSelectAll}
                  data-testid="checkbox-select-all"
                />
                <span className="text-sm text-gray-400">
                  {selectedConversions.length} conversões selecionadas
                </span>
              </div>
              
              {selectedConversions.length > 0 && (
                <Button
                  onClick={() => bulkApproveMutation.mutate(selectedConversions)}
                  disabled={bulkApproveMutation.isPending}
                  className="bg-green-500 hover:bg-green-600"
                  data-testid="button-bulk-approve"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Aprovar Selecionadas ({selectedConversions.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Conversions */}
      {pendingConversions.length > 0 && (
        <Card className="bg-[#1a1a1a] border-[#252525] mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Pendentes de Aprovação ({pendingConversions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-[#252525]">
                  <tr className="text-left text-sm text-gray-400">
                    <th className="pb-3 font-medium w-12"></th>
                    <th className="pb-3 font-medium">Pedido</th>
                    <th className="pb-3 font-medium">Afiliado</th>
                    <th className="pb-3 font-medium">Valor</th>
                    <th className="pb-3 font-medium">Comissão</th>
                    <th className="pb-3 font-medium">Data</th>
                    <th className="pb-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingConversions.map((conversion) => (
                    <tr key={conversion.id} className="border-b border-[#252525]/50 hover:bg-[#252525]/30" data-testid={`row-conversion-${conversion.id}`}>
                      <td className="py-4">
                        <Checkbox
                          checked={selectedConversions.includes(conversion.id)}
                          onCheckedChange={() => toggleSelection(conversion.id)}
                          data-testid={`checkbox-conversion-${conversion.id}`}
                        />
                      </td>
                      <td className="py-4">
                        <span className="font-mono text-sm">{conversion.orderId.substring(0, 8)}...</span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-mono text-sm">{conversion.affiliateId.substring(0, 8)}...</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="font-medium">€{parseFloat(conversion.orderAmount).toFixed(2)}</span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-500" />
                          <span className="font-medium text-green-500">
                            €{parseFloat(conversion.commissionAmount).toFixed(2)}
                          </span>
                          <Badge className="bg-gray-700 text-xs">
                            {parseFloat(conversion.commissionPercent).toFixed(0)}%
                          </Badge>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Calendar className="h-4 w-4" />
                          {new Date(conversion.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            className="bg-green-500/20 text-green-500 hover:bg-green-500/30"
                            onClick={() => approveMutation.mutate(conversion.id)}
                            disabled={approveMutation.isPending}
                            data-testid={`button-approve-${conversion.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:bg-red-500/10"
                            onClick={() => rejectMutation.mutate({ 
                              conversionId: conversion.id, 
                              reason: "Rejeitado pelo admin" 
                            })}
                            disabled={rejectMutation.isPending}
                            data-testid={`button-reject-${conversion.id}`}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Conversions */}
      <Card className="bg-[#1a1a1a] border-[#252525]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Todas as Conversões ({conversions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Carregando...</div>
          ) : conversions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">Nenhuma conversão encontrada</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-[#252525]">
                  <tr className="text-left text-sm text-gray-400">
                    <th className="pb-3 font-medium">Pedido</th>
                    <th className="pb-3 font-medium">Afiliado</th>
                    <th className="pb-3 font-medium">Valor</th>
                    <th className="pb-3 font-medium">Comissão</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {conversions.map((conversion) => (
                    <tr key={conversion.id} className="border-b border-[#252525]/50" data-testid={`row-all-conversion-${conversion.id}`}>
                      <td className="py-4">
                        <span className="font-mono text-sm">{conversion.orderId.substring(0, 8)}...</span>
                      </td>
                      <td className="py-4">
                        <span className="font-mono text-sm">{conversion.affiliateId.substring(0, 8)}...</span>
                      </td>
                      <td className="py-4">
                        <span className="font-medium">€{parseFloat(conversion.orderAmount).toFixed(2)}</span>
                      </td>
                      <td className="py-4">
                        <span className="font-medium text-green-500">
                          €{parseFloat(conversion.commissionAmount).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-4">
                        {getStatusBadge(conversion.status)}
                      </td>
                      <td className="py-4">
                        <span className="text-sm text-gray-400">
                          {new Date(conversion.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
