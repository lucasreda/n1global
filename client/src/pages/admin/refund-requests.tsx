import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Eye, Loader2, DollarSign } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ReimbursementRequest } from "@shared/schema";

interface ReimbursementRequestWithTicket extends ReimbursementRequest {
  ticket?: {
    ticketNumber: string;
    subject: string;
  };
}

export default function AdminRefundRequests() {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<ReimbursementRequestWithTicket | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const { data: requests, isLoading } = useQuery<ReimbursementRequestWithTicket[]>({
    queryKey: ['/api/support/refund-requests'],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: 'approved' | 'rejected'; notes: string }) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/support/refund-requests/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status, reviewNotes: notes }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao atualizar status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/refund-requests'] });
      toast({
        title: "Status atualizado",
        description: "Solicitação de reembolso atualizada com sucesso",
      });
      setSelectedRequest(null);
      setActionType(null);
      setReviewNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar status",
        variant: "destructive",
      });
    },
  });

  const handleAction = (request: ReimbursementRequestWithTicket, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setReviewNotes("");
  };

  const handleConfirmAction = () => {
    if (!selectedRequest || !actionType) return;

    updateStatusMutation.mutate({
      id: selectedRequest.id,
      status: actionType === 'approve' ? 'approved' : 'rejected',
      notes: reviewNotes,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Pendente" },
      under_review: { variant: "secondary", label: "Em Análise" },
      approved: { variant: "default", label: "Aprovado" },
      rejected: { variant: "destructive", label: "Rejeitado" },
      completed: { variant: "default", label: "Concluído" },
    };

    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: string | null, currency: string | null) => {
    if (!amount) return "-";
    const num = parseFloat(amount);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(num);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const pendingCount = requests?.filter(r => r.status === 'pending').length || 0;
  const totalAmount = requests?.reduce((sum, r) => sum + (parseFloat(r.refundAmount || '0')), 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Solicitações de Reembolso
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Gerencie solicitações de reembolso dos clientes
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <XCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-zinc-500">Aguardando análise</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Solicitado</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalAmount.toString(), 'EUR')}
            </div>
            <p className="text-xs text-zinc-500">Todas as solicitações</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Solicitações</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests?.length || 0}</div>
            <p className="text-xs text-zinc-500">Todas as solicitações</p>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitações</CardTitle>
          <CardDescription>
            Lista de todas as solicitações de reembolso
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </div>
          ) : requests && requests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id} data-testid={`row-refund-${request.id}`}>
                    <TableCell>
                      <div className="font-mono text-sm">
                        {request.ticket?.ticketNumber || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-sm">{request.customerName}</div>
                        <div className="text-xs text-zinc-500">{request.customerEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">
                        {formatCurrency(request.refundAmount, request.currency)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div className="font-medium">{request.bankName}</div>
                        <div className="text-xs text-zinc-500">
                          {request.bankAccountHolder}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {formatDate(request.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setActionType(null);
                          }}
                          data-testid={`button-view-${request.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {request.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleAction(request, 'approve')}
                              data-testid={`button-approve-${request.id}`}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleAction(request, 'reject')}
                              data-testid={`button-reject-${request.id}`}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-zinc-500">
              Nenhuma solicitação de reembolso encontrada
            </div>
          )}
        </CardContent>
      </Card>

      {/* View/Action Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {actionType ? (actionType === 'approve' ? 'Aprovar' : 'Rejeitar') + ' Reembolso' : 'Detalhes da Solicitação'}
            </DialogTitle>
            <DialogDescription>
              {actionType ? 
                `Confirme a ${actionType === 'approve' ? 'aprovação' : 'rejeição'} desta solicitação de reembolso` :
                'Informações completas da solicitação de reembolso'
              }
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-zinc-500">Ticket</Label>
                  <div className="font-mono">{selectedRequest.ticket?.ticketNumber || '-'}</div>
                </div>
                <div>
                  <Label className="text-xs text-zinc-500">Status</Label>
                  <div>{getStatusBadge(selectedRequest.status)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Informações do Cliente</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-zinc-500">Nome</Label>
                    <div>{selectedRequest.customerName}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500">Email</Label>
                    <div>{selectedRequest.customerEmail}</div>
                  </div>
                  {selectedRequest.customerPhone && (
                    <div>
                      <Label className="text-xs text-zinc-500">Telefone</Label>
                      <div>{selectedRequest.customerPhone}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Dados Bancários</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-zinc-500">Banco</Label>
                    <div>{selectedRequest.bankName}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500">Titular</Label>
                    <div>{selectedRequest.bankAccountHolder}</div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-zinc-500">Conta</Label>
                    <div className="font-mono">{selectedRequest.bankAccountNumber}</div>
                  </div>
                  {selectedRequest.pixKey && (
                    <div className="col-span-2">
                      <Label className="text-xs text-zinc-500">Chave PIX</Label>
                      <div className="font-mono">{selectedRequest.pixKey}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Detalhes do Reembolso</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-zinc-500">Valor</Label>
                    <div className="font-semibold text-lg">
                      {formatCurrency(selectedRequest.refundAmount, selectedRequest.currency)}
                    </div>
                  </div>
                  {selectedRequest.orderNumber && (
                    <div>
                      <Label className="text-xs text-zinc-500">Pedido</Label>
                      <div>{selectedRequest.orderNumber}</div>
                    </div>
                  )}
                  {selectedRequest.productName && (
                    <div className="col-span-2">
                      <Label className="text-xs text-zinc-500">Produto</Label>
                      <div>{selectedRequest.productName}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-zinc-500">Motivo</Label>
                <div className="text-sm bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 p-3 rounded-md">
                  {selectedRequest.refundReason}
                </div>
              </div>

              {selectedRequest.additionalDetails && (
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-500">Detalhes Adicionais</Label>
                  <div className="text-sm bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 p-3 rounded-md">
                    {selectedRequest.additionalDetails}
                  </div>
                </div>
              )}

              {actionType && (
                <div className="space-y-2 border-t pt-4">
                  <Label htmlFor="review-notes">
                    Notas de Revisão {actionType === 'reject' && <span className="text-red-600">*</span>}
                  </Label>
                  <Textarea
                    id="review-notes"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder={actionType === 'reject' ? 
                      "Explique o motivo da rejeição..." : 
                      "Adicione notas internas (opcional)..."}
                    rows={4}
                    data-testid="textarea-review-notes"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {actionType ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setActionType(null);
                    setReviewNotes("");
                  }}
                  disabled={updateStatusMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  variant={actionType === 'approve' ? 'default' : 'destructive'}
                  onClick={handleConfirmAction}
                  disabled={updateStatusMutation.isPending || (actionType === 'reject' && !reviewNotes.trim())}
                  data-testid="button-confirm-action"
                >
                  {updateStatusMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    actionType === 'approve' ? 'Aprovar Reembolso' : 'Rejeitar Reembolso'
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={() => setSelectedRequest(null)}>
                Fechar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
