import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search,
  Download,
  Eye,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  User,
  Mail,
  FileText
} from "lucide-react";

interface SupportCategory {
  id: string;
  name: string;
  displayName: string;
  description: string;
  isAutomated: boolean;
  priority: number;
  color: string;
}

interface SupportTicket {
  id: string;
  ticketNumber: string;
  categoryId: string;
  category: SupportCategory;
  status: string;
  priority: string;
  customerEmail: string;
  customerName?: string;
  subject: string;
  createdAt: string;
  lastActivity: string;
  assignedToUserId?: string;
  assignedUser?: { name: string };
  conversationCount: number;
}

export default function AdminSupport() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [supportSearchTerm, setSupportSearchTerm] = useState("");
  const [selectedTicketStatus, setSelectedTicketStatus] = useState<string>("all");

  // Support system queries
  const { data: supportCategories, isLoading: categoriesLoading } = useQuery<SupportCategory[]>({
    queryKey: ['/api/support/categories'],
    enabled: true
  });

  const hasSupportFilters = supportSearchTerm.trim().length > 0 || 
                           selectedCategory !== "all" || 
                           selectedTicketStatus !== "all";

  const { data: supportTicketsResponse, isLoading: ticketsLoading } = useQuery<{tickets: SupportTicket[], total: number}>({
    queryKey: ['/api/support/tickets', selectedCategory, selectedTicketStatus, supportSearchTerm],
    enabled: hasSupportFilters,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (supportSearchTerm) params.append('search', supportSearchTerm);
      if (selectedCategory !== 'all') params.append('categoryId', selectedCategory);
      if (selectedTicketStatus !== 'all') params.append('status', selectedTicketStatus);
      params.append('limit', '50');
      
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/support/tickets?${params.toString()}`, {
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return { tickets: data.tickets || [], total: data.total || 0 };
    }
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Sistema de Suporte</h1>
        <p className="text-slate-300">Gerenciamento centralizado de atendimento ao cliente com IA</p>
      </div>

      {/* Layout com Cards de Tipos na Esquerda e Filtros/Tickets na Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Coluna Esquerda - Cards dos Tipos de Email Empilhados */}
        <div className="lg:col-span-1 space-y-4">
          {categoriesLoading ? (
            <div className="text-center py-8 text-slate-400">
              Carregando categorias...
            </div>
          ) : supportCategories && supportCategories.length > 0 ? (
            supportCategories.map((category) => (
              <Card key={category.id} className="bg-white/10 border-white/20 backdrop-blur-md hover:bg-white/15 transition-colors cursor-pointer"
                    onClick={() => setSelectedCategory(category.id)}
                    data-testid={`card-category-${category.name}`}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-white text-sm">{category.displayName}</h3>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{category.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {category.isAutomated ? (
                        <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Auto
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-600/20 text-orange-400 border-orange-600/30 text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Manual
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs">
                      P{category.priority}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-white/10 border-white/20 backdrop-blur-md">
              <CardContent className="p-6 text-center">
                <Mail className="h-8 w-8 text-slate-500 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-white mb-2">Sistema de Suporte</h3>
                <p className="text-xs text-slate-400">
                  Sistema com IA sendo configurado
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coluna Direita - Filtros e Lista de Tickets */}
        <div className="lg:col-span-3 space-y-6">
          {/* Filtros */}
          <Card className="bg-white/10 border-white/20 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-slate-200 flex items-center gap-2">
                <Search className="h-5 w-5" />
                Filtros de Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Email, assunto, ticket..."
                      value={supportSearchTerm}
                      onChange={(e) => setSupportSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-700 border-slate-600 text-white"
                      data-testid="input-support-search"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Categoria</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white backdrop-blur-sm" data-testid="select-category">
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/80 border-white/20 backdrop-blur-md">
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      {supportCategories?.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Status</label>
                  <Select value={selectedTicketStatus} onValueChange={setSelectedTicketStatus}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white backdrop-blur-sm" data-testid="select-status">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/80 border-white/20 backdrop-blur-md">
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="open">Aberto</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="resolved">Resolvido</SelectItem>
                      <SelectItem value="closed">Fechado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tickets List */}
          <Card className="bg-white/10 border-white/20 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-slate-200 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Tickets de Suporte
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Gerenciamento centralizado de atendimento ao cliente
                </CardDescription>
              </div>
              <Button variant="outline" className="border-slate-600 text-slate-300" data-testid="button-export-tickets">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </CardHeader>
            <CardContent>
              {!hasSupportFilters ? (
                <div className="text-center py-12 space-y-4">
                  <Search className="h-12 w-12 text-slate-500 mx-auto" />
                  <div className="space-y-2">
                    <p className="text-slate-300 font-medium">Use os filtros para visualizar tickets</p>
                    <p className="text-slate-400 text-sm">
                      Digite um termo de busca, selecione uma categoria ou status para começar
                    </p>
                  </div>
                </div>
              ) : ticketsLoading ? (
                <div className="text-center py-8 text-slate-400">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                  Carregando tickets...
                </div>
              ) : !supportTicketsResponse || supportTicketsResponse.tickets.length === 0 ? (
                <div className="text-center py-8 space-y-4">
                  <MessageSquare className="h-12 w-12 text-slate-500 mx-auto" />
                  <div className="space-y-2">
                    <p className="text-slate-300 font-medium">Nenhum ticket encontrado</p>
                    <p className="text-slate-400 text-sm">
                      Tente ajustar os filtros ou aguarde novos emails de suporte
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {supportTicketsResponse.tickets.map((ticket: SupportTicket) => (
                    <div key={ticket.id} className="border border-slate-700 rounded-lg p-4 hover:bg-white/5 transition-colors" data-testid={`ticket-${ticket.ticketNumber}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-4">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0 mt-1" 
                            style={{ backgroundColor: ticket.category.color }}
                          />
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-medium text-white">{ticket.ticketNumber}</h3>
                              <Badge className="bg-slate-700 text-slate-300 text-xs">
                                {ticket.category.displayName}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-300 font-medium">{ticket.subject}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              De: {ticket.customerEmail}
                              {ticket.customerName && ` (${ticket.customerName})`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge 
                            className={`text-xs ${
                              ticket.status === 'open' ? 'bg-green-600/20 text-green-400 border-green-600/30' :
                              ticket.status === 'in_progress' ? 'bg-blue-600/20 text-blue-400 border-blue-600/30' :
                              ticket.status === 'resolved' ? 'bg-purple-600/20 text-purple-400 border-purple-600/30' :
                              'bg-gray-600/20 text-gray-400 border-gray-600/30'
                            }`}
                          >
                            {ticket.status === 'open' ? 'Aberto' :
                             ticket.status === 'in_progress' ? 'Em Andamento' :
                             ticket.status === 'resolved' ? 'Resolvido' : 'Fechado'}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              ticket.priority === 'high' ? 'border-red-600 text-red-400' :
                              ticket.priority === 'medium' ? 'border-yellow-600 text-yellow-400' :
                              'border-slate-600 text-slate-400'
                            }`}
                          >
                            {ticket.priority === 'high' ? 'Alta' :
                             ticket.priority === 'medium' ? 'Média' : 'Baixa'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-blue-400"
                            data-testid={`button-view-ticket-${ticket.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-700">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>Criado: {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageSquare className="h-3 w-3" />
                            <span>{ticket.conversationCount} mensagens</span>
                          </div>
                          {ticket.assignedUser && (
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>Atribuído: {ticket.assignedUser.name}</span>
                            </div>
                          )}
                        </div>
                        <span>Última atividade: {new Date(ticket.lastActivity).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}