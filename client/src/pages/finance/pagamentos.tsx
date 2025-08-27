import { FinanceLayout } from "@/components/finance/finance-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Users, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Search,
  Filter,
  Download,
  DollarSign
} from "lucide-react";

interface Payment {
  id: string;
  type: 'supplier' | 'affiliate';
  recipient: string;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  date: string;
  dueDate: string;
  description: string;
}

// Mock data para fornecedores
const supplierPayments: Payment[] = [
  {
    id: "PAY-001",
    type: "supplier",
    recipient: "TechSupply Co.",
    amount: 15000.00,
    status: "pending",
    date: "2025-08-26",
    dueDate: "2025-09-05",
    description: "Pagamento produtos eletrônicos - Lote #342"
  },
  {
    id: "PAY-002",
    type: "supplier",
    recipient: "Fashion World Ltd.",
    amount: 8750.50,
    status: "approved",
    date: "2025-08-25",
    dueDate: "2025-09-03",
    description: "Roupas femininas - Coleção Outono"
  },
  {
    id: "PAY-003",
    type: "supplier",
    recipient: "Home & Garden Inc.",
    amount: 12300.75,
    status: "paid",
    date: "2025-08-20",
    dueDate: "2025-08-30",
    description: "Produtos para casa - Pedido #1847"
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-600';
    case 'approved': return 'bg-blue-600';
    case 'paid': return 'bg-green-600';
    case 'rejected': return 'bg-red-600';
    default: return 'bg-gray-600';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return 'Pendente';
    case 'approved': return 'Aprovado';
    case 'paid': return 'Pago';
    case 'rejected': return 'Rejeitado';
    default: return 'Desconhecido';
  }
};

export default function FinancePagamentos() {
  return (
    <FinanceLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-[22px] font-bold text-white">Pagamentos</h1>
            <p className="text-gray-400 mt-1">Gerencie pagamentos para fornecedores e afiliados</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card style={{ backgroundColor: '#0f0f0f', borderColor: '#252525' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Pendente</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">R$ 23.750,50</div>
              <p className="text-xs text-gray-400">3 pagamentos aguardando</p>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: '#0f0f0f', borderColor: '#252525' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Aprovados</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">R$ 8.750,50</div>
              <p className="text-xs text-gray-400">1 pagamento aprovado</p>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: '#0f0f0f', borderColor: '#252525' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Pagos Este Mês</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">R$ 45.800,25</div>
              <p className="text-xs text-gray-400">+12% vs mês anterior</p>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: '#0f0f0f', borderColor: '#252525' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Fornecedores Ativos</CardTitle>
              <Package className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">12</div>
              <p className="text-xs text-gray-400">3 novos este mês</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fornecedores */}
          <Card style={{ backgroundColor: '#0f0f0f', borderColor: '#252525' }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-xl text-white">Pagamentos Fornecedores</CardTitle>
                </div>
                <Badge className="bg-blue-600 text-white">Ativo</Badge>
              </div>
              <CardDescription className="text-gray-400">
                Gerencie pagamentos para fornecedores de produtos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search and Filter */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      placeholder="Buscar fornecedor..."
                      className="pl-10 bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>

                {/* Payments Table */}
                <div className="border border-gray-700 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700 hover:bg-gray-800/50">
                        <TableHead className="text-gray-300">Fornecedor</TableHead>
                        <TableHead className="text-gray-300">Valor</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Vencimento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplierPayments.map((payment) => (
                        <TableRow key={payment.id} className="border-gray-700 hover:bg-gray-800/50">
                          <TableCell>
                            <div>
                              <div className="font-medium text-white">{payment.recipient}</div>
                              <div className="text-sm text-gray-400">{payment.description}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-white font-medium">
                            R$ {payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(payment.status)}>
                              {getStatusText(payment.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {new Date(payment.dueDate).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between items-center">
                  <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                    Ver Todos
                  </Button>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                    Novo Pagamento
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Afiliados */}
          <Card style={{ backgroundColor: '#0f0f0f', borderColor: '#252525' }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-yellow-500" />
                  <CardTitle className="text-xl text-white">Pagamentos Afiliados</CardTitle>
                </div>
                <Badge className="bg-yellow-600 text-white">Em Breve</Badge>
              </div>
              <CardDescription className="text-gray-400">
                Sistema de comissionamento para afiliados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/20 p-6 mb-4">
                  <Users className="h-12 w-12 text-yellow-600" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Funcionalidade em Desenvolvimento</h3>
                <p className="text-gray-400 mb-6 max-w-sm">
                  O sistema de pagamentos para afiliados está sendo desenvolvido e estará disponível em breve.
                </p>
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Cálculo automático de comissões</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Relatórios de performance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Pagamentos automáticos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span>Dashboard de afiliados</span>
                  </div>
                </div>
                <Button disabled className="mt-6 bg-gray-700 text-gray-400 cursor-not-allowed">
                  <Clock className="h-4 w-4 mr-2" />
                  Aguardar Lançamento
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </FinanceLayout>
  );
}