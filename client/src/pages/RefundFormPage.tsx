import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { publicRefundFormSchema, type PublicRefundForm } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2, Package } from "lucide-react";

interface LinkedOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  totalPrice: string;
  productName: string;
  status: string;
  createdAt: string;
}

interface RefundInfo {
  ticket: {
    ticketNumber: string;
    customerEmail: string;
    subject: string;
    status: string;
  };
  linkedOrder: LinkedOrder | null;
}

export default function RefundFormPage() {
  const params = useParams();
  const ticketNumber = params.ticketNumber || '';
  const [, navigate] = useLocation();
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [refundInfo, setRefundInfo] = useState<RefundInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(true);

  const form = useForm<PublicRefundForm>({
    resolver: zodResolver(publicRefundFormSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      orderNumber: "",
      productName: "",
      refundAmount: "",
      currency: "EUR",
      bankAccountNumber: "",
      bankAccountHolder: "",
      bankName: "",
      pixKey: "",
      refundReason: "",
      additionalDetails: "",
    },
  });

  // Fetch ticket and order information
  useEffect(() => {
    const fetchRefundInfo = async () => {
      try {
        setIsLoadingInfo(true);
        const response = await fetch(`/api/support/refund-info/${ticketNumber}`);
        const data = await response.json();
        
        if (data.success && data.linkedOrder) {
          setRefundInfo(data);
          
          // Pre-fill form with order information
          form.setValue('customerName', data.linkedOrder.customerName || '');
          form.setValue('customerEmail', data.linkedOrder.customerEmail || '');
          form.setValue('orderNumber', data.linkedOrder.id || '');
          form.setValue('productName', data.linkedOrder.productName || '');
          form.setValue('refundAmount', data.linkedOrder.totalPrice || '');
        } else if (data.success) {
          setRefundInfo(data);
          // Only set email if no linked order
          if (data.ticket.customerEmail) {
            form.setValue('customerEmail', data.ticket.customerEmail);
          }
        }
      } catch (error) {
        console.error('Error fetching refund info:', error);
      } finally {
        setIsLoadingInfo(false);
      }
    };

    if (ticketNumber) {
      fetchRefundInfo();
    }
  }, [ticketNumber]);

  const onSubmit = async (data: PublicRefundForm) => {
    setSubmitStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch(`/api/support/refund-request/${ticketNumber}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao enviar solicitação');
      }

      setSubmitStatus('success');
      
      // Reset form after 3 seconds and show success message
      setTimeout(() => {
        form.reset();
      }, 3000);

    } catch (error) {
      console.error('Error submitting refund request:', error);
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao processar solicitação');
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
                  <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                  Solicitação Enviada com Sucesso!
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Sua solicitação de reembolso foi recebida e está sendo analisada.
                  <br />
                  Você receberá um email com atualizações em breve.
                </p>
              </div>
              <div className="pt-4">
                <p className="text-sm text-zinc-500 dark:text-zinc-500">
                  Ticket: <span className="font-mono font-semibold">{ticketNumber}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Formulário de Solicitação de Reembolso</CardTitle>
            <CardDescription>
              Preencha os dados abaixo para solicitar o reembolso referente ao ticket{" "}
              <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{ticketNumber}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingInfo && (
              <div className="flex items-center justify-center py-8 mb-6">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                <span className="ml-2 text-zinc-500">Carregando informações do pedido...</span>
              </div>
            )}

            {!isLoadingInfo && refundInfo?.linkedOrder && (
              <Alert className="mb-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
                <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div className="ml-2">
                  <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
                    Pedido Vinculado ao Ticket
                  </h4>
                  <div className="space-y-1 text-sm text-green-800 dark:text-green-200">
                    <p>
                      <span className="font-medium">Pedido:</span>{" "}
                      <span className="font-mono">#{refundInfo.linkedOrder.id}</span>
                    </p>
                    <p>
                      <span className="font-medium">Produto:</span> {refundInfo.linkedOrder.productName}
                    </p>
                    <p>
                      <span className="font-medium">Valor:</span>{" "}
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(parseFloat(refundInfo.linkedOrder.totalPrice))}
                    </p>
                    <p>
                      <span className="font-medium">Status:</span>{" "}
                      <span className="capitalize">{refundInfo.linkedOrder.status}</span>
                    </p>
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                    Os campos do formulário foram preenchidos automaticamente com as informações deste pedido.
                  </p>
                </div>
              </Alert>
            )}

            {!isLoadingInfo && !refundInfo?.linkedOrder && (
              <Alert className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-900 dark:text-amber-100">
                  Este ticket não possui um pedido vinculado. Por favor, preencha todos os campos manualmente.
                </AlertDescription>
              </Alert>
            )}

            {submitStatus === 'error' && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Customer Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Informações Pessoais
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Seu nome completo"
                            data-testid="input-customer-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="seu@email.com"
                            data-testid="input-customer-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="+55 11 99999-9999"
                            data-testid="input-customer-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Order Information */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Informações do Pedido
                  </h3>

                  <FormField
                    control={form.control}
                    name="orderNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número do Pedido</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Ex: #1001"
                            data-testid="input-order-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="productName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Produto</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Nome do produto"
                            data-testid="input-product-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="refundAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor do Reembolso</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="0.00"
                              data-testid="input-refund-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Moeda</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="EUR"
                              data-testid="input-currency"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Banking Information */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Dados Bancários
                  </h3>

                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Banco *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Ex: Banco do Brasil"
                            data-testid="input-bank-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bankAccountHolder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Titular da Conta *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Nome do titular"
                            data-testid="input-bank-account-holder"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bankAccountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número da Conta *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Agência + Conta (Ex: 1234-5 / 67890-1)"
                            data-testid="input-bank-account-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pixKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chave PIX (Opcional - Apenas Brasil)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="CPF, email ou telefone"
                            data-testid="input-pix-key"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Reason */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Motivo do Reembolso
                  </h3>

                  <FormField
                    control={form.control}
                    name="refundReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motivo *</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Descreva o motivo do reembolso (mínimo 10 caracteres)"
                            rows={4}
                            data-testid="textarea-refund-reason"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="additionalDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Detalhes Adicionais</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Informações adicionais (opcional)"
                            rows={3}
                            data-testid="textarea-additional-details"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitStatus === 'loading'}
                    data-testid="button-submit-refund"
                  >
                    {submitStatus === 'loading' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar Solicitação de Reembolso'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
