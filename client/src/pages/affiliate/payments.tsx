import { AffiliateLayout } from "@/components/affiliate/affiliate-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import {
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  Download,
  Wallet
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Payout {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  requestedAt: string;
  processedAt?: string;
  paidAt?: string;
  conversionCount: number;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
}

interface PaymentStats {
  pendingAmount: number;
  processingAmount: number;
  paidAmount: number;
  totalEarnings: number;
  minimumPayout: number;
  nextPayoutDate?: string;
  pendingConversions: number;
  approvedConversions: number;
}

export default function AffiliatePayments() {
  const { toast } = useToast();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentDetails, setPaymentDetails] = useState("");

  const { data: stats, isLoading: isLoadingStats } = useQuery<PaymentStats>({
    queryKey: ['/api/affiliate/payments/stats'],
  });

  const { data: payouts = [], isLoading: isLoadingPayouts } = useQuery<Payout[]>({
    queryKey: ['/api/affiliate/payouts'],
  });

  const requestPayoutMutation = useMutation({
    mutationFn: async (data: { paymentMethod: string; paymentDetails: string }) => {
      return await apiRequest('/api/affiliate/payouts/request', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/payouts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/payments/stats'] });
      toast({
        title: "Solicitação Enviada!",
        description: "Sua solicitação de saque foi enviada para processamento.",
      });
      setRequestDialogOpen(false);
      setPaymentMethod("");
      setPaymentDetails("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao solicitar",
        description: error.message || "Não foi possível enviar a solicitação.",
        variant: "destructive",
      });
    },
  });

  const handleRequestPayout = () => {
    if (!paymentMethod.trim() || !paymentDetails.trim()) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    if (stats && stats.pendingAmount < stats.minimumPayout) {
      toast({
        title: "Valor insuficiente",
        description: `O valor mínimo para saque é €${stats.minimumPayout.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    requestPayoutMutation.mutate({ paymentMethod, paymentDetails });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string; icon: any }> = {
      pending: { label: 'Pendente', className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30', icon: Clock },
      processing: { label: 'Processando', className: 'bg-blue-500/20 text-blue-500 border-blue-500/30', icon: AlertCircle },
      paid: { label: 'Pago', className: 'bg-green-500/20 text-green-500 border-green-500/30', icon: CheckCircle },
      failed: { label: 'Falhou', className: 'bg-red-500/20 text-red-500 border-red-500/30', icon: XCircle },
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

  const formatCurrency = (value: number) => `€${value.toFixed(2)}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR');

  const isLoading = isLoadingStats || isLoadingPayouts;

  return (
    <AffiliateLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold tracking-tight text-gray-900 dark:text-gray-100" style={{ fontSize: '22px' }}>
              Pagamentos
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie suas comissões e solicite saques
            </p>
          </div>
          {stats && stats.pendingAmount >= stats.minimumPayout && (
            <Button
              onClick={() => setRequestDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-request-payout"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Solicitar Saque
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : stats ? (
          <>
            {/* Balance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Saldo Disponível</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white" data-testid="text-pending-amount">
                    {formatCurrency(stats.pendingAmount)}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {stats.approvedConversions} conversões aprovadas
                  </p>
                </CardContent>
              </Card>

              <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Em Processamento</CardTitle>
                  <Clock className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white" data-testid="text-processing-amount">
                    {formatCurrency(stats.processingAmount)}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Aguardando pagamento
                  </p>
                </CardContent>
              </Card>

              <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Total Recebido</CardTitle>
                  <CheckCircle className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white" data-testid="text-paid-amount">
                    {formatCurrency(stats.paidAmount)}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Histórico de pagamentos
                  </p>
                </CardContent>
              </Card>

              <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Total de Ganhos</CardTitle>
                  <TrendingUp className="h-4 w-4 text-orange-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white" data-testid="text-total-earnings">
                    {formatCurrency(stats.totalEarnings)}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Todas as comissões
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Payout Info */}
            <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}} className="border-blue-500/30">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-blue-400 font-medium mb-2">Informações de Saque</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Valor mínimo para saque: </span>
                        <span className="text-white font-semibold">{formatCurrency(stats.minimumPayout)}</span>
                      </div>
                      {stats.nextPayoutDate && (
                        <div>
                          <span className="text-gray-400">Próxima data de pagamento: </span>
                          <span className="text-white font-semibold">{formatDate(stats.nextPayoutDate)}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-400">Conversões pendentes: </span>
                        <span className="text-yellow-400 font-semibold">{stats.pendingConversions}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payout History */}
            <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Histórico de Saques
                </CardTitle>
              </CardHeader>
              <CardContent>
                {payouts.length === 0 ? (
                  <div className="text-center py-12">
                    <Wallet className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">Nenhum saque realizado</h3>
                    <p className="text-gray-400">
                      Quando você solicitar saques, eles aparecerão aqui
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {payouts.map((payout) => (
                      <div
                        key={payout.id}
                        className="p-4 bg-gray-900 border border-gray-700 rounded-lg"
                        data-testid={`payout-${payout.id}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-white">
                                {formatCurrency(payout.amount)}
                              </h3>
                              {getStatusBadge(payout.status)}
                            </div>
                            <p className="text-sm text-gray-400">
                              {payout.conversionCount} conversões • Solicitado em {formatDate(payout.requestedAt)}
                            </p>
                          </div>
                          {payout.status === 'paid' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-gray-400 hover:text-white"
                              data-testid={`button-download-${payout.id}`}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-700 pt-3">
                          {payout.paymentMethod && (
                            <div>
                              <span className="text-gray-500">Método: </span>
                              <span className="text-gray-300">{payout.paymentMethod}</span>
                            </div>
                          )}
                          {payout.transactionId && (
                            <div>
                              <span className="text-gray-500">ID: </span>
                              <span className="text-gray-300 font-mono text-xs">{payout.transactionId}</span>
                            </div>
                          )}
                          {payout.paidAt && (
                            <div>
                              <span className="text-gray-500">Pago em: </span>
                              <span className="text-green-400">{formatDate(payout.paidAt)}</span>
                            </div>
                          )}
                          {payout.notes && (
                            <div className="col-span-2">
                              <span className="text-gray-500">Nota: </span>
                              <span className="text-gray-300">{payout.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <DollarSign className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Sem dados disponíveis</h3>
                <p className="text-gray-400">
                  Comece a fazer vendas para acumular comissões
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Request Payout Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Solicitar Saque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-5 w-5 text-blue-400" />
                <span className="text-blue-400 font-medium">Valor disponível</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {stats ? formatCurrency(stats.pendingAmount) : '€0.00'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-method" className="text-gray-300">Método de Pagamento</Label>
              <Input
                id="payment-method"
                placeholder="Ex: Transferência Bancária, PayPal, PIX"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                data-testid="input-payment-method"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-details" className="text-gray-300">Detalhes do Pagamento</Label>
              <Input
                id="payment-details"
                placeholder="Ex: IBAN, Email PayPal, Chave PIX"
                value={paymentDetails}
                onChange={(e) => setPaymentDetails(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                data-testid="input-payment-details"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleRequestPayout}
                disabled={requestPayoutMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-confirm-payout"
              >
                {requestPayoutMutation.isPending ? 'Processando...' : 'Confirmar Saque'}
              </Button>
              <Button
                onClick={() => setRequestDialogOpen(false)}
                variant="outline"
                className="border-gray-700"
                data-testid="button-cancel-payout"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AffiliateLayout>
  );
}
