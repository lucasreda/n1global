import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Download, Upload, Calculator, Clock, DollarSign, FileText, CheckCircle, AlertTriangle, Eye, Search, Filter, Receipt, Building, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InvestmentLayout } from "@/components/investment/investment-layout";

interface PaymentTransaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  paymentReference: string;
  description: string;
  fundSource: string;
  fundSourceDescription: string;
  bankName: string;
  authenticationCode: string;
  isVerified: boolean;
  createdAt: string;
  receipt?: {
    id: string;
    fileName: string;
    fileUrl: string;
    receiptType: string;
  };
}

interface TaxCalculation {
  id: string;
  taxYear: number;
  referenceMonth: number;
  totalGains: number;
  taxableAmount: number;
  taxRate: number;
  taxDue: number;
  taxPaid: number;
  status: string;
  dueDate: string;
  calculationDetails: any;
}

interface TaxSchedule {
  id: string;
  taxType: string;
  paymentType: string;
  amount: number;
  dueDate: string;
  status: string;
  paymentReference: string;
}

interface PaymentsData {
  transactions: PaymentTransaction[];
  taxCalculations: TaxCalculation[];
  taxSchedule: TaxSchedule[];
  summary: {
    totalDeposits: number;
    totalWithdrawals: number;
    totalTaxesDue: number;
    totalTaxesPaid: number;
    pendingVerifications: number;
  };
}

export default function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedCalculation, setSelectedCalculation] = useState<TaxCalculation | null>(null);
  const [irCalculatorOpen, setIrCalculatorOpen] = useState(false);
  const [receiptViewerOpen, setReceiptViewerOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  const { data: paymentsData, isLoading } = useQuery<PaymentsData>({
    queryKey: ["/api/investment/payments"],
  });

  const formatCurrency = (amount: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': case 'paid': case 'verified':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending': case 'scheduled':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'failed': case 'overdue': case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'deposit':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'withdrawal':
        return <DollarSign className="h-4 w-4 text-red-500" />;
      case 'return_payment':
        return <Receipt className="h-4 w-4 text-blue-500" />;
      case 'fee':
        return <CreditCard className="h-4 w-4 text-orange-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getFundSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      'salary': 'Salário',
      'savings': 'Poupança',
      'business_income': 'Renda Empresarial',
      'investment_returns': 'Retorno de Investimentos',
      'inheritance': 'Herança',
      'loan': 'Empréstimo',
      'gift': 'Doação',
      'other': 'Outros'
    };
    return labels[source] || source;
  };

  const getTaxTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'income_tax': 'Imposto de Renda',
      'capital_gains': 'Ganho de Capital',
      'come_cotas': 'Come-Cotas'
    };
    return labels[type] || type;
  };

  const filteredTransactions = paymentsData?.transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.paymentReference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  }) || [];

  if (isLoading) {
    return (
      <InvestmentLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-700 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-700 rounded-lg"></div>
        </div>
      </InvestmentLayout>
    );
  }

  return (
    <InvestmentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Pagamentos</h1>
            <p className="text-gray-400 mt-1">Histórico completo, comprovantes e gestão fiscal</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setIrCalculatorOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Calculadora IR
            </Button>
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Upload Comprovante
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-green-500/50 to-green-500/20"></div>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Depositado</span>
                <div className="p-1.5 rounded-full bg-green-500/10">
                  <DollarSign className="h-3 w-3 text-green-400" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-white mb-1">
                {formatCurrency(paymentsData?.summary.totalDeposits || 0)}
              </div>
              <p className="text-xs text-gray-500">
                Aportes realizados
              </p>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-red-500/50 to-red-500/20"></div>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Sacado</span>
                <div className="p-1.5 rounded-full bg-red-500/10">
                  <DollarSign className="h-3 w-3 text-red-400" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-white mb-1">
                {formatCurrency(paymentsData?.summary.totalWithdrawals || 0)}
              </div>
              <p className="text-xs text-gray-500">
                Resgates realizados
              </p>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-orange-500/50 to-orange-500/20"></div>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Impostos Devidos</span>
                <div className="p-1.5 rounded-full bg-orange-500/10">
                  <AlertTriangle className="h-3 w-3 text-orange-400" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-white mb-1">
                {formatCurrency(paymentsData?.summary.totalTaxesDue || 0)}
              </div>
              <p className="text-xs text-gray-500">
                A pagar este ano
              </p>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-500/50 to-purple-500/20"></div>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Verificações</span>
                <div className="p-1.5 rounded-full bg-purple-500/10">
                  <CheckCircle className="h-3 w-3 text-purple-400" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-white mb-1">
                {paymentsData?.summary.pendingVerifications || 0}
              </div>
              <p className="text-xs text-gray-500">
                Comprovantes pendentes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="transactions" className="data-[state=active]:bg-white data-[state=active]:text-black">
              Histórico Completo
            </TabsTrigger>
            <TabsTrigger value="taxes" className="data-[state=active]:bg-white data-[state=active]:text-black">
              Impostos
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-white data-[state=active]:text-black">
              Cronograma
            </TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            {/* Filters */}
            <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Buscar transações..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="failed">Falhou</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Tipos</SelectItem>
                      <SelectItem value="deposit">Depósito</SelectItem>
                      <SelectItem value="withdrawal">Saque</SelectItem>
                      <SelectItem value="return_payment">Rendimento</SelectItem>
                      <SelectItem value="fee">Taxa</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="border-gray-700">
                    <Filter className="w-4 h-4 mr-2" />
                    Filtros Avançados
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Transactions List */}
            <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
              <CardHeader>
                <CardTitle className="text-white" style={{ fontSize: '20px' }}>
                  Histórico de Transações
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {filteredTransactions.map((transaction) => (
                    <div key={transaction.id} className="p-4 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {getTransactionIcon(transaction.type)}
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="text-white font-medium">{transaction.description}</p>
                              {transaction.isVerified && (
                                <CheckCircle className="h-4 w-4 text-green-400" />
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                              <span>{formatDate(transaction.createdAt)}</span>
                              <span>{transaction.paymentMethod}</span>
                              <span>{transaction.bankName}</span>
                              <span>Origem: {getFundSourceLabel(transaction.fundSource)}</span>
                            </div>
                            {transaction.fundSourceDescription && (
                              <p className="text-xs text-gray-500 mt-1">{transaction.fundSourceDescription}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className={`font-semibold ${
                              transaction.type === 'withdrawal' || transaction.type === 'fee' 
                                ? 'text-red-400' : 'text-green-400'
                            }`}>
                              {transaction.type === 'withdrawal' || transaction.type === 'fee' ? '-' : '+'}
                              {formatCurrency(transaction.amount, transaction.currency)}
                            </p>
                            <Badge variant="outline" className={getStatusColor(transaction.status)}>
                              {transaction.status}
                            </Badge>
                          </div>
                          <div className="flex space-x-2">
                            {transaction.receipt && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedReceipt(transaction.receipt);
                                  setReceiptViewerOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      {transaction.authenticationCode && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <div className="flex items-center space-x-2 text-xs text-gray-400">
                            <Building className="h-3 w-3" />
                            <span>Código de Autenticação: {transaction.authenticationCode}</span>
                            <span>•</span>
                            <span>Ref: {transaction.paymentReference}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Taxes Tab */}
          <TabsContent value="taxes" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tax Calculations */}
              <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
                <CardHeader>
                  <CardTitle className="text-white" style={{ fontSize: '20px' }}>
                    Cálculos de IR
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {paymentsData?.taxCalculations.map((calc) => (
                    <div key={calc.id} className="p-4 bg-gray-800/50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-medium">
                            Ano {calc.taxYear} {calc.referenceMonth && `- Mês ${calc.referenceMonth}`}
                          </p>
                          <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                            <div>
                              <span className="text-gray-400">Ganhos:</span>
                              <span className="text-white ml-2">{formatCurrency(calc.totalGains)}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Base Cálculo:</span>
                              <span className="text-white ml-2">{formatCurrency(calc.taxableAmount)}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-1 text-sm">
                            <div>
                              <span className="text-gray-400">Taxa:</span>
                              <span className="text-white ml-2">{(calc.taxRate * 100).toFixed(2)}%</span>
                            </div>
                            <div>
                              <span className="text-gray-400">IR Devido:</span>
                              <span className="text-orange-400 ml-2 font-semibold">
                                {formatCurrency(calc.taxDue)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className={getStatusColor(calc.status)}>
                            {calc.status}
                          </Badge>
                          {calc.dueDate && (
                            <p className="text-xs text-gray-400 mt-1">
                              Vence: {formatDate(calc.dueDate)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700">
                        <span className="text-sm text-gray-400">
                          Pago: {formatCurrency(calc.taxPaid)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCalculation(calc)}
                        >
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Tax Summary */}
              <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
                <CardHeader>
                  <CardTitle className="text-white" style={{ fontSize: '20px' }}>
                    Resumo Fiscal 2024
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Rendimentos Tributáveis</span>
                      <span className="text-white font-semibold">
                        {formatCurrency(117374)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">IR Retido na Fonte</span>
                      <span className="text-green-400 font-semibold">
                        {formatCurrency(2347)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Come-Cotas</span>
                      <span className="text-blue-400 font-semibold">
                        {formatCurrency(586)}
                      </span>
                    </div>
                    <Separator className="bg-gray-700" />
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total IR Devido</span>
                      <span className="text-orange-400 font-semibold">
                        {formatCurrency(17606)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Saldo a Pagar</span>
                      <span className="text-red-400 font-semibold">
                        {formatCurrency(14673)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-6 space-y-3">
                    <h4 className="text-white font-medium">Próximos Vencimentos</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">DARF Janeiro/2025</span>
                        <span className="text-white">31/01/2025</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">DIRPF 2024</span>
                        <span className="text-white">31/05/2025</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6">
            <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
              <CardHeader>
                <CardTitle className="text-white" style={{ fontSize: '20px' }}>
                  Cronograma de Recolhimentos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {paymentsData?.taxSchedule.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 rounded-full bg-orange-500/10">
                          <Calendar className="h-4 w-4 text-orange-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {getTaxTypeLabel(item.taxType)}
                          </p>
                          <p className="text-sm text-gray-400">
                            {item.paymentType} • {formatDate(item.dueDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-white font-semibold">
                            {formatCurrency(item.amount)}
                          </p>
                          <Badge variant="outline" className={getStatusColor(item.status)}>
                            {item.status}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Clock className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* IR Calculator Dialog */}
        <Dialog open={irCalculatorOpen} onOpenChange={setIrCalculatorOpen}>
          <DialogContent className="max-w-2xl bg-gray-900 text-white">
            <DialogHeader>
              <DialogTitle>Calculadora de Imposto de Renda</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gains">Ganhos de Capital (R$)</Label>
                  <Input id="gains" type="number" className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div>
                  <Label htmlFor="period">Período de Aplicação</Label>
                  <Select>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Até 180 dias (22.5%)</SelectItem>
                      <SelectItem value="medium">181-360 dias (20%)</SelectItem>
                      <SelectItem value="long">361-720 dias (17.5%)</SelectItem>
                      <SelectItem value="longest">Acima de 720 dias (15%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="p-4 bg-gray-800 rounded-lg">
                <h4 className="text-white font-medium mb-3">Resultado do Cálculo</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Ganho Bruto:</span>
                    <span className="text-white">R$ 0,00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Alíquota IR:</span>
                    <span className="text-white">0%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">IR a Recolher:</span>
                    <span className="text-orange-400 font-semibold">R$ 0,00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Ganho Líquido:</span>
                    <span className="text-green-400 font-semibold">R$ 0,00</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setIrCalculatorOpen(false)}>
                  Fechar
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Salvar Cálculo
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Receipt Viewer Dialog */}
        <Dialog open={receiptViewerOpen} onOpenChange={setReceiptViewerOpen}>
          <DialogContent className="max-w-4xl bg-gray-900 text-white">
            <DialogHeader>
              <DialogTitle>Comprovante de Pagamento</DialogTitle>
            </DialogHeader>
            {selectedReceipt && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Arquivo:</span>
                    <span className="text-white ml-2">{selectedReceipt.fileName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Tipo:</span>
                    <span className="text-white ml-2">{selectedReceipt.receiptType}</span>
                  </div>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-gray-400 text-center">
                    Visualização do comprovante será exibida aqui
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button variant="outline" onClick={() => setReceiptViewerOpen(false)}>
                    Fechar
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </InvestmentLayout>
  );
}