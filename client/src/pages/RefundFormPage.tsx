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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUpload } from "@/components/ui/file-upload";
import { CheckCircle2, AlertCircle, Loader2, Package, Info, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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

  // File states
  const [orderProofFile, setOrderProofFile] = useState<File | null>(null);
  const [productPhotosFile, setProductPhotosFile] = useState<File | null>(null);
  const [returnProofFile, setReturnProofFile] = useState<File | null>(null);
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);

  const form = useForm<PublicRefundForm>({
    resolver: zodResolver(publicRefundFormSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      orderNumber: "",
      productName: "",
      purchaseDate: "",
      billingAddressCountry: "",
      billingAddressCity: "",
      billingAddressStreet: "",
      billingAddressNumber: "",
      billingAddressComplement: "",
      billingAddressState: "",
      billingAddressZip: "",
      refundAmount: "",
      currency: "EUR",
      bankIban: "",
      controlNumber: "",
      refundReason: "",
      additionalDetails: "",
      declarationFormCorrect: false,
      declarationAttachmentsProvided: false,
      declarationIbanCorrect: false,
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
      // Validate files
      if (!orderProofFile || !productPhotosFile || !returnProofFile || !idDocumentFile) {
        setErrorMessage('Todos os anexos obrigatórios devem ser enviados');
        setSubmitStatus('error');
        return;
      }

      // Create FormData for multipart/form-data
      const formData = new FormData();
      
      // Add all form fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      // Add files
      formData.append('orderProof', orderProofFile);
      formData.append('productPhotos', productPhotosFile);
      formData.append('returnProof', returnProofFile);
      formData.append('idDocument', idDocumentFile);

      const response = await fetch(`/api/support/refund-request/${ticketNumber}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao enviar solicitação');
      }

      setSubmitStatus('success');
    } catch (error) {
      console.error('Refund form error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao processar solicitação');
      setSubmitStatus('error');
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
                  <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                    Solicitação Enviada com Sucesso!
                  </h2>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Sua solicitação de reembolso foi recebida e está sendo analisada.
                    Você receberá uma resposta em breve por e-mail.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Formulário de Solicitação de Reembolso</CardTitle>
            <CardDescription>
              Ticket: <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{ticketNumber}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Important Information Alert */}
            <Alert className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-900 dark:text-blue-100">Informações Importantes</AlertTitle>
              <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm space-y-1 mt-2">
                <ul className="list-disc list-inside space-y-1">
                  <li>Apenas clientes que preencherem este formulário corretamente terão direito ao reembolso</li>
                  <li>Solicitações por e-mail sem o formulário não serão atendidas</li>
                  <li>Obrigatório: fotos dos produtos, comprovante de devolução e de pagamento</li>
                  <li>O reembolso será feito apenas por IBAN (não aceitamos dados bancários locais)</li>
                  <li>O processo pode levar até 30 dias para ser concluído</li>
                </ul>
              </AlertDescription>
            </Alert>

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
                    <p><span className="font-medium">Pedido:</span> <span className="font-mono">#{refundInfo.linkedOrder.id}</span></p>
                    <p><span className="font-medium">Produto:</span> {refundInfo.linkedOrder.productName}</p>
                    <p><span className="font-medium">Valor:</span> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(refundInfo.linkedOrder.totalPrice))}</p>
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                    Os campos foram preenchidos automaticamente com as informações do pedido.
                  </p>
                </div>
              </Alert>
            )}

            {submitStatus === 'error' && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Dados do Pedido */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">📝 Dados do Pedido</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      Informações sobre sua compra e identificação
                    </p>
                  </div>
                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="orderNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número do Pedido *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: NT-12345" readOnly className="bg-zinc-100 dark:bg-zinc-800" data-testid="input-order-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="purchaseDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data da Compra *</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" data-testid="input-purchase-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome (como cadastrado na compra) *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-customer-name" />
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
                          <FormLabel>E-mail (como cadastrado na compra) *</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" data-testid="input-customer-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-3">
                    <FormLabel>Endereço de Faturação</FormLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="billingAddressCountry"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} placeholder="País *" data-testid="input-billing-country" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="billingAddressCity"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} placeholder="Cidade *" data-testid="input-billing-city" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="billingAddressStreet"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} placeholder="Rua *" data-testid="input-billing-street" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="billingAddressNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} placeholder="Número *" data-testid="input-billing-number" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="billingAddressComplement"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} placeholder="Complemento (Apto, Andar...)" data-testid="input-billing-complement" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="billingAddressState"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} placeholder="Estado/Região *" data-testid="input-billing-state" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="billingAddressZip"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} placeholder="Código Postal *" data-testid="input-billing-zip" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FileUpload
                    id="order-proof"
                    label="Comprovativo de Encomenda"
                    value={orderProofFile}
                    onChange={setOrderProofFile}
                    required
                    helperText="Foto do comprovante com valor total pago e número do pedido"
                    testId="upload-order-proof"
                  />
                </div>

                {/* Informações de Reembolso */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">💰 Informações de Reembolso</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      Dados bancários e valor do reembolso
                    </p>
                  </div>
                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="refundAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Total a Reembolsar</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly className="bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed" data-testid="input-refund-amount" />
                          </FormControl>
                          <p className="text-xs text-zinc-500">Valor do produto + custos de devolução</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="controlNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Controlo *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Código de registo" data-testid="input-control-number" />
                          </FormControl>
                          <p className="text-xs text-zinc-500">Comprovativo de devolução</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="bankIban"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IBAN para Reembolso *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: PT50000201234567890154" className="font-mono" data-testid="input-bank-iban" />
                        </FormControl>
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          ⚠️ Atenção: apenas via IBAN, não aceitamos contas locais.
                          <a href="https://wise.com/br/iban/checker" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline hover:no-underline">
                            Verificar IBAN <ExternalLink className="h-3 w-3" />
                          </a>
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Anexos Obrigatórios */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">📷 Anexos Obrigatórios</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      Todos os anexos são necessários para processar o reembolso
                    </p>
                  </div>
                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FileUpload
                      id="product-photos"
                      label="Fotos dos Produtos"
                      value={productPhotosFile}
                      onChange={setProductPhotosFile}
                      required
                      testId="upload-product-photos"
                    />

                    <FileUpload
                      id="return-proof"
                      label="Comprovante de Devolução"
                      value={returnProofFile}
                      onChange={setReturnProofFile}
                      required
                      helperText="Foto do comprovante de devolução e pagamento da taxa"
                      testId="upload-return-proof"
                    />

                    <FileUpload
                      id="id-document"
                      label="Documento de Identificação"
                      value={idDocumentFile}
                      onChange={setIdDocumentFile}
                      required
                      helperText="Documento com fotografia"
                      testId="upload-id-document"
                    />
                  </div>
                </div>

                {/* Motivo */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="refundReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motivo do Reembolso *</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={4} placeholder="Descreva o motivo (mínimo 10 caracteres)" data-testid="textarea-refund-reason" />
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
                        <FormLabel>Detalhes Adicionais (Opcional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} placeholder="Informações adicionais" data-testid="textarea-additional-details" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Declarações */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">✅ Declarações do Cliente</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      Confirme que você leu e concorda com as condições
                    </p>
                  </div>
                  <Separator />

                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="declarationFormCorrect"
                      render={({ field }) => (
                        <FormItem className="flex items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-declaration-form" />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal">
                              Declaro que li atentamente e preenchi corretamente este formulário
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="declarationAttachmentsProvided"
                      render={({ field }) => (
                        <FormItem className="flex items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-declaration-attachments" />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal">
                              Anexei fotos dos produtos e do comprovante de devolução
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="declarationIbanCorrect"
                      render={({ field }) => (
                        <FormItem className="flex items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-declaration-iban" />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal">
                              Informei corretamente o IBAN e estou ciente de que só receberei o valor se o IBAN estiver correto
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
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
                        Enviando Solicitação...
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
