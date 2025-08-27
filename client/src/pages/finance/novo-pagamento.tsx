import { FinanceLayout } from "@/components/finance/finance-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useState } from "react";
import { 
  ArrowLeft,
  Package, 
  Calculator,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const paymentSchema = z.object({
  supplierId: z.string().min(1, "Selecione um fornecedor"),
  paymentMethod: z.string().min(1, "Selecione o método de pagamento"),
  dueDate: z.string().min(1, "Data de vencimento é obrigatória"),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentForm = z.infer<typeof paymentSchema>;

interface SupplierBalance {
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  totalOrdersValue: number;
  paidAmount: number;
  pendingAmount: number;
  pendingOrdersCount: number;
  pendingOrders: Array<{
    orderId: string;
    orderDate: string;
    customerName: string;
    total: number;
    products: string[];
  }>;
}

export default function FinanceNovoPagamento() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");

  const form = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      supplierId: "",
      paymentMethod: "",
      dueDate: "",
      description: "",
      notes: "",
    },
  });

  // Buscar fornecedores
  const { data: suppliers = [] } = useQuery<Array<{id: string; name: string; email: string}>>({
    queryKey: ["/api/finance/suppliers"],
  });

  // Buscar balanço do fornecedor selecionado
  const { data: supplierBalance, isLoading: isLoadingBalance } = useQuery<SupplierBalance>({
    queryKey: ["/api/finance/supplier-balance", selectedSupplierId],
    enabled: !!selectedSupplierId,
  });

  // Mutation para criar pagamento
  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentForm & { amount: number; orderIds: string[] }) => {
      return await apiRequest("/api/finance/supplier-payments", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Pagamento criado",
        description: "O pagamento foi criado com sucesso e está aguardando aprovação.",
      });
      setLocation("/finance/pagamentos");
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar pagamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PaymentForm) => {
    if (!supplierBalance || supplierBalance.pendingAmount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Não há valor pendente para este fornecedor.",
        variant: "destructive",
      });
      return;
    }

    const orderIds = supplierBalance.pendingOrders.map(order => order.orderId);
    
    createPaymentMutation.mutate({
      ...data,
      amount: supplierBalance.pendingAmount,
      orderIds,
    });
  };

  const handleSupplierChange = (value: string) => {
    setSelectedSupplierId(value);
    form.setValue("supplierId", value);
  };

  return (
    <FinanceLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/finance/pagamentos")}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-[22px] font-bold text-white">Novo Pagamento</h1>
            <p className="text-gray-400 mt-1">Criar novo pagamento para fornecedor</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário de Pagamento */}
          <Card style={{ backgroundColor: '#0f0f0f', borderColor: '#252525' }}>
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Dados do Pagamento
              </CardTitle>
              <CardDescription className="text-gray-400">
                Preencha as informações do pagamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Seleção do Fornecedor */}
                <div className="space-y-2">
                  <Label htmlFor="supplier" className="text-gray-300">Fornecedor</Label>
                  <Select onValueChange={handleSupplierChange} value={selectedSupplierId}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Selecione um fornecedor" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id} className="text-white hover:bg-gray-700">
                          <div className="flex flex-col">
                            <span>{supplier.name}</span>
                            <span className="text-sm text-gray-400">{supplier.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.supplierId && (
                    <p className="text-red-500 text-sm">{form.formState.errors.supplierId.message}</p>
                  )}
                </div>

                {/* Método de Pagamento */}
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod" className="text-gray-300">Método de Pagamento</Label>
                  <Select onValueChange={(value) => form.setValue("paymentMethod", value)}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Selecione o método" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="bank_transfer" className="text-white hover:bg-gray-700">Transferência Bancária</SelectItem>
                      <SelectItem value="pix" className="text-white hover:bg-gray-700">PIX</SelectItem>
                      <SelectItem value="paypal" className="text-white hover:bg-gray-700">PayPal</SelectItem>
                      <SelectItem value="other" className="text-white hover:bg-gray-700">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.paymentMethod && (
                    <p className="text-red-500 text-sm">{form.formState.errors.paymentMethod.message}</p>
                  )}
                </div>

                {/* Data de Vencimento */}
                <div className="space-y-2">
                  <Label htmlFor="dueDate" className="text-gray-300">Data de Vencimento</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    {...form.register("dueDate")}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                  {form.formState.errors.dueDate && (
                    <p className="text-red-500 text-sm">{form.formState.errors.dueDate.message}</p>
                  )}
                </div>

                {/* Descrição */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-gray-300">Descrição</Label>
                  <Input
                    id="description"
                    {...form.register("description")}
                    placeholder="Ex: Pagamento produtos mês de agosto"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-gray-300">Observações</Label>
                  <Textarea
                    id="notes"
                    {...form.register("notes")}
                    placeholder="Observações adicionais..."
                    className="bg-gray-800 border-gray-700 text-white"
                    rows={3}
                  />
                </div>

                <Separator className="bg-gray-700" />

                {/* Botões */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/finance/pagamentos")}
                    className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={!selectedSupplierId || !supplierBalance || supplierBalance.pendingAmount <= 0 || createPaymentMutation.isPending}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {createPaymentMutation.isPending ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Criar Pagamento
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Resumo do Fornecedor */}
          <Card style={{ backgroundColor: '#0f0f0f', borderColor: '#252525' }}>
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Calculator className="h-5 w-5 text-green-500" />
                Balanço do Fornecedor
              </CardTitle>
              <CardDescription className="text-gray-400">
                Resumo financeiro e pedidos pendentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedSupplierId ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-12 w-12 text-gray-600 mb-4" />
                  <p className="text-gray-400">Selecione um fornecedor para ver o balanço</p>
                </div>
              ) : isLoadingBalance ? (
                <div className="flex items-center justify-center py-12">
                  <Clock className="h-8 w-8 text-blue-500 animate-spin" />
                  <span className="ml-2 text-gray-400">Calculando balanço...</span>
                </div>
              ) : supplierBalance ? (
                <div className="space-y-6">
                  {/* Estatísticas */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-gray-400">Total de Pedidos</span>
                      </div>
                      <div className="text-lg font-bold text-white">
                        €{supplierBalance.totalOrdersValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-gray-400">Já Pago</span>
                      </div>
                      <div className="text-lg font-bold text-white">
                        €{supplierBalance.paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Valor Pendente */}
                  <div className="p-4 rounded-lg bg-yellow-900/20 border border-yellow-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                        <span className="text-lg font-semibold text-white">Valor Pendente</span>
                      </div>
                      <Badge className="bg-yellow-600 text-white">
                        {supplierBalance.pendingOrdersCount} pedidos
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-yellow-400 mt-2">
                      €{supplierBalance.pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Lista de Pedidos Pendentes */}
                  {supplierBalance.pendingOrders.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3">Pedidos Pendentes</h4>
                      <div className="border border-gray-700 rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-gray-700 hover:bg-gray-800/50">
                              <TableHead className="text-gray-300">Pedido</TableHead>
                              <TableHead className="text-gray-300">Cliente</TableHead>
                              <TableHead className="text-gray-300">Valor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {supplierBalance.pendingOrders.map((order) => (
                              <TableRow key={order.orderId} className="border-gray-700 hover:bg-gray-800/50">
                                <TableCell>
                                  <div>
                                    <div className="font-medium text-white">{order.orderId}</div>
                                    <div className="text-sm text-gray-400">
                                      {new Date(order.orderDate).toLocaleDateString('pt-BR')}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-gray-300">{order.customerName}</TableCell>
                                <TableCell className="text-white font-medium">
                                  €{order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
                  <p className="text-gray-400">Nenhum dado encontrado para este fornecedor</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </FinanceLayout>
  );
}