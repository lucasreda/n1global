import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
  FileText,
  X,
  Send,
  XCircle
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
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [supportSearchTerm, setSupportSearchTerm] = useState("");
  const [selectedTicketStatus, setSelectedTicketStatus] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [isClosingTicket, setIsClosingTicket] = useState(false);
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const [newMessageRecipient, setNewMessageRecipient] = useState("");
  const [newMessageContent, setNewMessageContent] = useState("");
  const [isSendingNewMessage, setIsSendingNewMessage] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // Effect to scroll to last message when modal opens with conversations
  useEffect(() => {
    if (isTicketModalOpen && selectedTicket?.conversations && selectedTicket.conversations.length > 0) {
      // Multiple attempts to ensure scroll happens after DOM updates
      const scrollAttempts = [100, 300, 600, 1000];
      scrollAttempts.forEach(delay => {
        setTimeout(() => {
          scrollToLastMessage();
        }, delay);
      });
    }
  }, [isTicketModalOpen, selectedTicket?.conversations?.length]);

  // Function to open ticket modal with full conversation history
  const handleViewTicket = async (ticketResponse: any) => {
    try {
      console.log('📋 Loading full ticket details...');
      const token = localStorage.getItem("auth_token");
      
      const response = await fetch(`/api/support/tickets/${ticketResponse.ticket.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const fullTicketData = await response.json();
        console.log('📋 Full ticket data:', fullTicketData);
        
        // Merge the full data with the original ticket response
        setSelectedTicket({
          ...ticketResponse,
          ...fullTicketData,
          conversations: fullTicketData.conversations || []
        });
        
        // Mark ticket as read if it wasn't read
        if (!ticketResponse.ticket.isRead) {
          await markTicketAsRead(ticketResponse.ticket.id);
        }
      } else {
        console.error('❌ Failed to load full ticket data');
        // Fallback to original data
        setSelectedTicket(ticketResponse);
      }
    } catch (error) {
      console.error('❌ Error loading ticket details:', error);
      // Fallback to original data
      setSelectedTicket(ticketResponse);
    }
    
    setIsTicketModalOpen(true);
    setReplyMessage(""); // Reset reply message
  };

  // Function to mark ticket as read
  const markTicketAsRead = async (ticketId: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      await fetch(`/api/support/tickets/${ticketId}/mark-read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
      });
      
      // Refresh tickets list to update UI
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets'] });
    } catch (error) {
      console.error('❌ Error marking ticket as read:', error);
    }
  };

  // Function to scroll to last message in conversation
  const scrollToLastMessage = () => {
    const conversationContainer = document.getElementById('conversation-history');
    if (conversationContainer) {
      const messages = conversationContainer.children;
      
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1] as HTMLElement;
        lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
      } else {
        // Fallback to scrollTop method
        conversationContainer.scrollTop = conversationContainer.scrollHeight;
      }
    }
  };

  // Function to close ticket
  const handleCloseTicket = async () => {
    if (!selectedTicket) return;

    setIsClosingTicket(true);
    try {
      const token = localStorage.getItem("auth_token");
      console.log('🎫 Closing ticket:', selectedTicket.ticket.id);
      
      const response = await fetch(`/api/support/tickets/${selectedTicket.ticket.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        body: JSON.stringify({
          status: 'resolved'
        })
      });

      if (response.ok) {
        console.log('✅ Ticket closed successfully');
        // Update selected ticket status
        setSelectedTicket({
          ...selectedTicket,
          ticket: {
            ...selectedTicket.ticket,
            status: 'resolved'
          }
        });
        // Close the confirmation dialog
        setIsCloseConfirmOpen(false);
        // Invalidate queries to refresh the tickets list
        queryClient.invalidateQueries({ queryKey: ['/api/support/tickets'] });
        // Optionally close the ticket modal
        // setIsTicketModalOpen(false);
      } else {
        console.error('❌ Failed to close ticket');
        alert('Erro ao encerrar o ticket. Tente novamente.');
      }
    } catch (error) {
      console.error('❌ Error closing ticket:', error);
      alert('Erro ao encerrar o ticket. Tente novamente.');
    } finally {
      setIsClosingTicket(false);
    }
  };

  // Function to send reply
  const handleSendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;

    setIsSendingReply(true);
    try {
      const token = localStorage.getItem("auth_token");
      console.log('📧 Reply - Token exists:', !!token);
      console.log('📧 Reply - Token preview:', token ? token.substring(0, 50) + '...' : 'NO TOKEN');
      console.log('📧 Reply - Ticket ID:', selectedTicket.ticket.id);
      
      const response = await fetch(`/api/support/tickets/${selectedTicket.ticket.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        body: JSON.stringify({
          message: replyMessage.trim()
        })
      });

      const responseText = await response.text();
      console.log('📧 Reply response status:', response.status);
      console.log('📧 Reply response text:', responseText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      const result = JSON.parse(responseText);
      console.log('📧 Reply success:', result);

      // Reload the ticket to show the new conversation
      console.log('🔄 Reloading ticket with conversation...');
      await handleViewTicket(selectedTicket);

      setReplyMessage("");
      alert('Resposta enviada com sucesso!');
    } catch (error) {
      console.error('📧 Reply error:', error);
      alert(`Erro ao enviar resposta: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleSendNewMessage = async () => {
    if (!newMessageRecipient.trim() || !newMessageContent.trim()) return;

    setIsSendingNewMessage(true);
    try {
      const token = localStorage.getItem("auth_token");
      console.log('📧 New Message - Token exists:', !!token);
      console.log('📧 New Message - Recipient:', newMessageRecipient);
      
      const response = await fetch('/api/support/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
        body: JSON.stringify({
          recipient: newMessageRecipient.trim(),
          message: newMessageContent.trim(),
        }),
      });

      const responseText = await response.text();
      console.log('📧 New Message response status:', response.status);
      console.log('📧 New Message response text:', responseText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      const result = JSON.parse(responseText);
      console.log('📧 New Message success:', result);

      setShowSuccessPopup(true);
      refetchTickets();
      refetchOverview();
    } catch (error) {
      console.error('📧 New Message error:', error);
      alert(`Erro ao enviar mensagem: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSendingNewMessage(false);
    }
  };

  // Support system queries
  const { data: supportCategories, isLoading: categoriesLoading } = useQuery<SupportCategory[]>({
    queryKey: [`/api/customer-support/${selectedOperationId}/categories`],
    enabled: !!selectedOperationId
  });

  // Overview metrics for cards
  const { data: overviewMetrics, isLoading: overviewLoading } = useQuery<{
    openTickets: number;
    aiResponded: number;
    monthlyTickets: number;
    unreadTickets: number;
  }>({
    queryKey: [`/api/customer-support/${selectedOperationId}/overview`],
    enabled: !!selectedOperationId,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const hasSupportFilters = supportSearchTerm.trim().length > 0 || 
                           selectedCategory !== "all" || 
                           selectedTicketStatus !== "all";
                           
  // Always show tickets when any filter is applied OR when showing all
  const shouldLoadTickets = hasSupportFilters || (selectedCategory === "all" && selectedTicketStatus === "all" && !supportSearchTerm.trim());

  const { data: supportTicketsResponse, isLoading: ticketsLoading } = useQuery<{tickets: SupportTicket[], total: number}>({
    queryKey: [`/api/customer-support/${selectedOperationId}/tickets`, selectedCategory, selectedTicketStatus, supportSearchTerm],
    enabled: shouldLoadTickets && selectedOperationId,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (supportSearchTerm) params.append('search', supportSearchTerm);
      if (selectedCategory !== 'all') params.append('categoryId', selectedCategory);
      if (selectedTicketStatus !== 'all') params.append('status', selectedTicketStatus);
      params.append('limit', '50');
      
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/customer-support/${selectedOperationId}/tickets?${params.toString()}`, {
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🐛 DEBUG: Dados brutos da API:', data);
      console.log('🐛 DEBUG: Total de tickets:', data.tickets?.length);
      console.log('🐛 DEBUG: Primeiro ticket completo:', JSON.stringify(data.tickets?.[0], null, 2));
      console.log('🐛 DEBUG: Email do primeiro ticket:', data.tickets?.[0]?.email);
      console.log('🐛 DEBUG: hasAutoResponse do primeiro:', data.tickets?.[0]?.email?.hasAutoResponse);
      return { tickets: data.tickets || [], total: data.total || 0 };
    }
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Sistema de Suporte</h1>
          <p className="text-slate-300">Gerenciamento centralizado de atendimento ao cliente com IA</p>
        </div>
        <Button 
          variant="outline" 
          className="border-slate-600 text-slate-300 hover:bg-white/10" 
          onClick={() => setIsNewMessageModalOpen(true)}
          data-testid="button-send-message"
        >
          <Send className="h-4 w-4 mr-2" />
          Enviar Mensagem
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="bg-white/10 border-white/20 backdrop-blur-md">
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-slate-600 rounded mb-2"></div>
                  <div className="h-8 bg-slate-600 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="bg-white/10 border-white/20 backdrop-blur-md hover:bg-white/15 transition-colors" data-testid="card-tickets-abertos">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Tickets Abertos</p>
                    <p className="text-2xl font-bold text-white">{overviewMetrics?.openTickets || 0}</p>
                  </div>
                  <div className="h-12 w-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur-md hover:bg-white/15 transition-colors" data-testid="card-respondido-ia">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Respondido por IA</p>
                    <p className="text-2xl font-bold text-white">{overviewMetrics?.aiResponded || 0}</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur-md hover:bg-white/15 transition-colors" data-testid="card-tickets-mes">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Tickets no Mês</p>
                    <p className="text-2xl font-bold text-white">{overviewMetrics?.monthlyTickets || 0}</p>
                  </div>
                  <div className="h-12 w-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Clock className="h-6 w-6 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur-md hover:bg-white/15 transition-colors" data-testid="card-nao-lidos">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Não Lidos</p>
                    <p className="text-2xl font-bold text-white">{overviewMetrics?.unreadTickets || 0}</p>
                  </div>
                  <div className="h-12 w-12 bg-red-500/20 rounded-full flex items-center justify-center">
                    <Mail className="h-6 w-6 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
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
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-200 flex items-center gap-2 text-lg">
                <Search className="h-4 w-4" />
                Filtros de Tickets
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Email, assunto, ticket..."
                      value={supportSearchTerm}
                      onChange={(e) => setSupportSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-700 border-slate-600 text-white h-9"
                      data-testid="input-support-search"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Categoria</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white backdrop-blur-sm h-9" data-testid="select-category">
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

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Status</label>
                  <Select value={selectedTicketStatus} onValueChange={setSelectedTicketStatus}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white backdrop-blur-sm h-9" data-testid="select-status">
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
                <CardTitle className="text-slate-200 flex items-center gap-2 text-xl">
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
              {!shouldLoadTickets ? (
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
                  {supportTicketsResponse.tickets.map((ticketResponse: any) => {
                    console.log('🐛 DEBUG: ticketResponse:', ticketResponse);
                    console.log('🐛 DEBUG: ticketResponse.email:', ticketResponse.email);
                    console.log('🐛 DEBUG: hasAutoResponse:', ticketResponse.email?.hasAutoResponse);
                    return (
                    <div 
                      key={ticketResponse.id} 
                      className="relative border border-slate-700 rounded-lg p-4 hover:bg-white/5 transition-colors cursor-pointer" 
                      onClick={() => handleViewTicket(ticketResponse)}
                      data-testid={`ticket-${ticketResponse.ticketNumber}`}
                    >
                      {/* Círculo azul para tickets não lidos */}
                      {!ticketResponse.isRead && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border border-slate-900 z-10" style={{ backgroundColor: '#f87171' }} />
                      )}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-4">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0 mt-1" 
                            style={{ backgroundColor: ticketResponse.category?.color }}
                          />
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-medium text-white">{ticketResponse.ticketNumber}</h3>
                              <Badge className="bg-slate-700 text-slate-300 text-xs">
                                {ticketResponse.category?.displayName}
                              </Badge>
                              {(() => {
                                console.log(`🐛 BADGE DEBUG para ${ticketResponse.ticketNumber}:`, {
                                  hasEmail: !!ticketResponse.email,
                                  hasAutoResponse: ticketResponse.email?.hasAutoResponse,
                                  emailObject: ticketResponse.email
                                });
                                return ticketResponse.email?.hasAutoResponse;
                              })() && (
                                <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 text-xs">
                                  🤖 Sofia IA
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-300 font-medium">{ticketResponse.subject}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              De: {ticketResponse.customerEmail}
                              {ticketResponse.customerName && ` (${ticketResponse.customerName})`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge 
                            className={`text-xs ${
                              ticketResponse.status === 'open' ? 'bg-green-600/20 text-green-400 border-green-600/30' :
                              ticketResponse.status === 'in_progress' ? 'bg-blue-600/20 text-blue-400 border-blue-600/30' :
                              ticketResponse.status === 'resolved' ? 'bg-purple-600/20 text-purple-400 border-purple-600/30' :
                              'bg-gray-600/20 text-gray-400 border-gray-600/30'
                            }`}
                          >
                            {ticketResponse.status === 'open' ? 'Aberto' :
                             ticketResponse.status === 'in_progress' ? 'Em Andamento' :
                             ticketResponse.status === 'resolved' ? 'Resolvido' : 'Fechado'}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              ticketResponse.priority === 'high' ? 'border-red-600 text-red-400' :
                              ticketResponse.priority === 'medium' ? 'border-yellow-600 text-yellow-400' :
                              'border-slate-600 text-slate-400'
                            }`}
                          >
                            {ticketResponse.priority === 'high' ? 'Alta' :
                             ticketResponse.priority === 'medium' ? 'Média' : 'Baixa'}
                          </Badge>
                          <div className="flex items-center text-slate-400">
                            <Eye className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-700">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>Criado: {new Date(ticketResponse.createdAt).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageSquare className="h-3 w-3" />
                            <span>0 mensagens</span>
                          </div>
                          {ticketResponse.assignedToUserId && (
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>Atribuído</span>
                            </div>
                          )}
                        </div>
                        <span>Última atividade: {new Date(ticketResponse.updatedAt || ticketResponse.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ticket Details Modal */}
      <Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: selectedTicket?.category?.color || '#6b7280' }}
                />
                <span>{selectedTicket?.ticket?.ticketNumber || 'N/A'}</span>
                <Badge className="bg-slate-700 text-slate-300 text-xs">
                  {selectedTicket?.category?.displayName || 'Sem categoria'}
                </Badge>
              </div>
              {selectedTicket?.ticket?.status !== 'resolved' && selectedTicket?.ticket?.status !== 'closed' && (
                <AlertDialog open={isCloseConfirmOpen} onOpenChange={setIsCloseConfirmOpen}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="mr-8"
                      data-testid="button-close-ticket"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Encerrar Ticket
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-slate-900 border-slate-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-slate-200">
                        Encerrar Ticket
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-400">
                        Tem certeza de que deseja encerrar este ticket? Esta ação não pode ser desfeita.
                        O ticket será marcado como resolvido.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleCloseTicket}
                        disabled={isClosingTicket}
                        className="bg-red-600 hover:bg-red-700 text-white"
                        data-testid="button-confirm-close-ticket"
                      >
                        {isClosingTicket ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Encerrando...
                          </>
                        ) : (
                          'Sim, Encerrar'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-6">
              {/* Ticket Header */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-slate-200 mb-2">
                  {selectedTicket.ticket.subject}
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">De: </span>
                    <span className="text-slate-200">{selectedTicket.ticket.customerEmail}</span>
                    {selectedTicket.ticket.customerName && (
                      <span className="text-slate-400"> ({selectedTicket.ticket.customerName})</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400">Status: </span>
                    <Badge 
                      className={`text-xs ${
                        selectedTicket.ticket.status === 'open' ? 'bg-green-600/20 text-green-400 border-green-600/30' :
                        selectedTicket.ticket.status === 'in_progress' ? 'bg-blue-600/20 text-blue-400 border-blue-600/30' :
                        selectedTicket.ticket.status === 'resolved' ? 'bg-purple-600/20 text-purple-400 border-purple-600/30' :
                        'bg-gray-600/20 text-gray-400 border-gray-600/30'
                      }`}
                    >
                      {selectedTicket.ticket.status === 'open' ? 'Aberto' :
                       selectedTicket.ticket.status === 'in_progress' ? 'Em Andamento' :
                       selectedTicket.ticket.status === 'resolved' ? 'Resolvido' : 'Fechado'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-slate-400">Prioridade: </span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        selectedTicket.ticket.priority === 'high' ? 'border-red-600 text-red-400' :
                        selectedTicket.ticket.priority === 'medium' ? 'border-yellow-600 text-yellow-400' :
                        'border-slate-600 text-slate-400'
                      }`}
                    >
                      {selectedTicket.ticket.priority === 'high' ? 'Alta' :
                       selectedTicket.ticket.priority === 'medium' ? 'Média' : 'Baixa'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-slate-400">Criado: </span>
                    <span className="text-slate-200">
                      {new Date(selectedTicket.ticket.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Email Content */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="text-md font-semibold text-slate-200 mb-3 flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Email Original
                </h3>
                <div className="space-y-3">
                  {selectedTicket.email?.textContent && (
                    <div>
                      <span className="text-slate-400 text-sm">Conteúdo:</span>
                      <div className="mt-1 p-3 bg-slate-900/50 rounded border-l-4 border-blue-500">
                        <p className="text-slate-200 whitespace-pre-wrap">
                          {selectedTicket.email.textContent}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {selectedTicket.email?.aiReasoning && (
                    <div>
                      <span className="text-slate-400 text-sm flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Análise da IA:
                      </span>
                      <div className="mt-1 p-3 bg-slate-900/50 rounded border-l-4 border-purple-500">
                        <p className="text-slate-300 text-sm">
                          {selectedTicket.email.aiReasoning}
                        </p>
                        {selectedTicket.email.aiConfidence && (
                          <p className="text-slate-400 text-xs mt-2">
                            Confiança: {selectedTicket.email.aiConfidence}%
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {selectedTicket.ticket.description && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h3 className="text-md font-semibold text-slate-200 mb-3">Descrição</h3>
                  <p className="text-slate-300 whitespace-pre-wrap">
                    {selectedTicket.ticket.description}
                  </p>
                </div>
              )}

              {/* Conversation History */}
              {selectedTicket.conversations && selectedTicket.conversations.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h3 className="text-md font-semibold text-slate-200 mb-3 flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Histórico de Conversação ({selectedTicket.conversations.length})
                  </h3>
                  <div id="conversation-history" className="space-y-4 max-h-60 overflow-y-auto">
                    {selectedTicket.conversations.map((conversation: any, index: number) => (
                      <div 
                        key={conversation.id || index} 
                        className={`p-3 rounded border-l-4 ${
                          conversation.type === 'email_in' ? 'border-green-500 bg-green-900/20' :
                          conversation.type === 'email_out' ? 'border-blue-500 bg-blue-900/20' :
                          conversation.type === 'note' ? 'border-yellow-500 bg-yellow-900/20' :
                          'border-gray-500 bg-gray-900/20'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                          <span>
                            {conversation.type === 'email_in' ? 'Cliente' : 
                             conversation.type === 'email_out' ? 'Agente' : 
                             conversation.type === 'note' ? 'Nota Interna' : 
                             'Sistema'}
                          </span>
                          <span>
                            {new Date(conversation.createdAt).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        {conversation.subject && (
                          <div className="text-sm font-medium text-slate-200 mb-1">
                            {conversation.subject}
                          </div>
                        )}
                        <div className="text-sm text-slate-300 whitespace-pre-wrap">
                          {conversation.content}
                        </div>
                        {conversation.from && conversation.to && (
                          <div className="text-xs text-slate-500 mt-2">
                            De: {conversation.from} → Para: {conversation.to}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reply Section */}
              <div className="bg-slate-800/50 rounded-lg p-4 border-t-2 border-blue-500/50">
                <h3 className="text-md font-semibold text-slate-200 mb-3 flex items-center">
                  <Send className="h-4 w-4 mr-2" />
                  Responder Ticket
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">
                      Resposta para {selectedTicket.ticket.customerEmail}
                    </label>
                    <Textarea
                      placeholder="Digite sua resposta aqui..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="bg-slate-900/50 border-slate-600 text-slate-200 min-h-[120px] resize-none"
                      disabled={isSendingReply}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      Esta resposta será enviada por email para o cliente
                    </p>
                    <Button
                      onClick={handleSendReply}
                      disabled={!replyMessage.trim() || isSendingReply}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isSendingReply ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Enviar Resposta
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal para Enviar Nova Mensagem */}
      <Dialog open={isNewMessageModalOpen} onOpenChange={setIsNewMessageModalOpen}>
        <DialogContent className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-200 flex items-center gap-2">
              <Send className="h-5 w-5" />
              Enviar Nova Mensagem
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Remetente</label>
              <div className="bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white">
                suporte@n1global.app
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-400">Destinatário</label>
              <Input
                placeholder="email@exemplo.com"
                value={newMessageRecipient}
                onChange={(e) => setNewMessageRecipient(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                disabled={isSendingNewMessage}
                data-testid="input-recipient"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-400">Mensagem</label>
              <Textarea
                placeholder="Digite sua mensagem aqui..."
                value={newMessageContent}
                onChange={(e) => setNewMessageContent(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white min-h-[120px] resize-none"
                disabled={isSendingNewMessage}
                data-testid="textarea-message"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsNewMessageModalOpen(false)}
              disabled={isSendingNewMessage}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSendNewMessage}
              disabled={!newMessageRecipient.trim() || !newMessageContent.trim() || isSendingNewMessage}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-send-new-message"
            >
              {isSendingNewMessage ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Popup de Sucesso */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-lg p-8 max-w-md mx-4 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <Send className="h-8 w-8 text-green-400 animate-bounce" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Email enviado com sucesso!</h3>
              <p className="text-slate-300 mb-6">Sua mensagem foi enviada e um novo ticket foi criado.</p>
              <Button
                onClick={() => {
                  setShowSuccessPopup(false);
                  setIsNewMessageModalOpen(false);
                  setNewMessageRecipient("");
                  setNewMessageContent("");
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-close-success"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}