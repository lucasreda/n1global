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
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

interface SupportCategory {
  id: string;
  name: string;
  displayName: string;
  description: string;
  isAutomated: boolean;
  priority: number;
  color: string;
  aiEnabled: boolean;
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
  assignedAgentId?: string;
  assignedAgentName?: string;
  conversationCount: number;
  isRead?: boolean;
  isAutomated: boolean;
  email?: {
    hasAutoResponse: boolean;
    autoResponseSentAt: string;
    status: string;
  };
}

const getStatusBadge = (status: string) => {
  const statusConfig = {
    'open': { bg: 'bg-green-600/20', text: 'text-green-400', border: 'border-green-600/30', label: 'Aberto' },
    'in_progress': { bg: 'bg-blue-600/20', text: 'text-blue-400', border: 'border-blue-600/30', label: 'Em Andamento' },
    'resolved': { bg: 'bg-purple-600/20', text: 'text-purple-400', border: 'border-purple-600/30', label: 'Resolvido' },
    'auto_responded': { bg: 'bg-emerald-600/20', text: 'text-emerald-400', border: 'border-emerald-600/30', label: 'Auto Resposta' },
    'closed': { bg: 'bg-gray-600/20', text: 'text-gray-400', border: 'border-gray-600/30', label: 'Fechado' }
  };
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['closed'];
  
  return (
    <Badge className={`text-xs ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </Badge>
  );
};

const getPriorityBadge = (priority: string) => {
  const priorityConfig = {
    'urgent': { bg: 'bg-red-600/20', text: 'text-red-400', border: 'border-red-600/30', label: 'Urgente' },
    'high': { bg: 'bg-orange-600/20', text: 'text-orange-400', border: 'border-orange-600/30', label: 'Alto' },
    'medium': { bg: 'bg-blue-600/20', text: 'text-blue-400', border: 'border-blue-600/30', label: 'Médio' },
    'low': { bg: 'bg-gray-600/20', text: 'text-gray-400', border: 'border-gray-600/30', label: 'Baixo' }
  };
  const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig['low'];
  
  return (
    <Badge className={`text-xs ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </Badge>
  );
};

export default function CustomerSupportPage() {
  const { selectedOperation, operations } = useCurrentOperation();
  const currentOperationId = selectedOperation;
  const currentOperationName = operations.find(op => op.id === selectedOperation)?.name;
  const queryClient = useQueryClient();
  
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [supportSearchTerm, setSupportSearchTerm] = useState("");
  const [selectedTicketStatus, setSelectedTicketStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ticketsPerPage = 15;
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [isClosingTicket, setIsClosingTicket] = useState(false);
  const [isReplyExpanded, setIsReplyExpanded] = useState(false);
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const [newMessageRecipient, setNewMessageRecipient] = useState("");
  const [newMessageContent, setNewMessageContent] = useState("");
  const [isSendingNewMessage, setIsSendingNewMessage] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Effect to scroll to last message when modal opens with conversations
  useEffect(() => {
    const messages = selectedTicket?.conversations || selectedTicket?.messages || [];
    if (isTicketModalOpen && messages && messages.length > 0) {
      const scrollAttempts = [100, 300, 600, 1000];
      scrollAttempts.forEach(delay => {
        setTimeout(() => {
          scrollToLastMessage();
        }, delay);
      });
    }
  }, [isTicketModalOpen, selectedTicket?.conversations?.length, selectedTicket?.messages?.length]);

  // Effect to adjust scroll when reply section expands
  useEffect(() => {
    if (isReplyExpanded) {
      setTimeout(() => {
        const conversationContainer = document.getElementById('conversation-history');
        if (conversationContainer) {
          // Scroll to show the last few messages when reply expands
          const scrollTop = Math.max(0, conversationContainer.scrollHeight - conversationContainer.clientHeight - 100);
          conversationContainer.scrollTo({ top: scrollTop, behavior: 'smooth' });
        }
      }, 350); // Wait for expansion animation to complete
    }
  }, [isReplyExpanded]);

  // Function to scroll to last message in conversation
  const scrollToLastMessage = () => {
    try {
      const conversationContainer = document.getElementById('conversation-history');
      if (conversationContainer) {
        const messages = conversationContainer.children;
        
        if (messages && messages.length > 0) {
          const lastMessage = messages[messages.length - 1] as HTMLElement;
          if (lastMessage && lastMessage.scrollIntoView) {
            lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
          }
        } else {
          conversationContainer.scrollTop = conversationContainer.scrollHeight;
        }
      }
    } catch (error) {
      console.error('Error scrolling to last message:', error);
    }
  };

  // Initialize support for current operation
  const handleInitializeSupport = async () => {
    try {
      setIsInitializing(true);
      
      await apiRequest('/api/customer-support/init', 'POST', {
        operationId: currentOperationId,
        operationName: currentOperationName
      });

      toast({
        title: "Suporte Inicializado",
        description: "Sistema de suporte de clientes foi configurado com sucesso",
      });
      
      // Refresh queries
      await queryClient.invalidateQueries({
        queryKey: [`/api/customer-support/config/${currentOperationId}`]
      });
    } catch (error) {
      console.error('Error initializing support:', error);
      toast({
        title: "Erro",
        description: "Erro ao configurar suporte",
        variant: "destructive"
      });
    } finally {
      setIsInitializing(false);
    }
  };

  // Function to open ticket modal with full conversation history
  const handleViewTicket = async (ticketResponse: any) => {
    try {
      console.log('📋 Loading full ticket details...');
      
      const apiResponse = await apiRequest(`/api/customer-support/${currentOperationId}/tickets/${ticketResponse.id}`, 'GET');
      const response = await apiResponse.json();
      
      console.log('📋 Full ticket data:', response);
      console.log('📋 Messages count:', response?.messages?.length || 0);
      console.log('📋 First message:', response?.messages?.[0]);
      
      // Merge the full data with the original ticket response
      setSelectedTicket({
        ticket: response || ticketResponse, // Use full response if available
        conversations: response?.messages || [],
        messages: response?.messages || []
      });
      
      // Mark ticket as read if it wasn't read
      if (!ticketResponse.isRead) {
        await markTicketAsRead(ticketResponse.id);
      }
    } catch (error) {
      console.error('❌ Error loading ticket details:', error);
      // Fallback to original data
      setSelectedTicket({
        ticket: ticketResponse,
        conversations: [],
        messages: []
      });
    }
    
    setIsTicketModalOpen(true);
    setReplyMessage(""); // Reset reply message
  };

  // Function to mark ticket as read
  const markTicketAsRead = async (ticketId: string) => {
    try {
      await apiRequest(`/api/customer-support/${currentOperationId}/tickets/${ticketId}/mark-read`, 'PATCH');
      
      // Refresh tickets list and overview to update UI
      await queryClient.invalidateQueries({ queryKey: [`/api/customer-support/${currentOperationId}/tickets`] });
      await queryClient.invalidateQueries({ queryKey: [`/api/customer-support/${currentOperationId}/overview`] });
      
      // Force refetch tickets immediately
      await refetchTickets();
    } catch (error) {
      console.error('❌ Error marking ticket as read:', error);
    }
  };

  // Function to close ticket
  const handleCloseTicket = async () => {
    if (!selectedTicket) return;

    setIsClosingTicket(true);
    try {
      console.log('🎫 Closing ticket:', selectedTicket.ticket.id);
      
      await apiRequest(`/api/customer-support/${currentOperationId}/tickets/${selectedTicket.ticket.id}/status`, 'PATCH', {
        status: 'resolved'
      });

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
      queryClient.invalidateQueries({ queryKey: [`/api/customer-support/${currentOperationId}/tickets`] });
      
      toast({
        title: "Ticket Fechado",
        description: "Ticket foi marcado como resolvido com sucesso",
      });
    } catch (error) {
      console.error('❌ Error closing ticket:', error);
      toast({
        title: "Erro",
        description: "Erro ao encerrar o ticket. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsClosingTicket(false);
    }
  };

  // Function to send reply
  const handleSendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;

    setIsSendingReply(true);
    try {
      console.log('📧 Reply - Ticket ID:', selectedTicket.ticket.id);
      
      await apiRequest(`/api/customer-support/${currentOperationId}/tickets/${selectedTicket.ticket.id}/reply`, 'POST', {
        message: replyMessage.trim()
      });

      console.log('📧 Reply success');

      // Reload the ticket to show the new conversation
      console.log('🔄 Reloading ticket with conversation...');
      await handleViewTicket(selectedTicket.ticket);

      setReplyMessage("");
      toast({
        title: "Resposta Enviada",
        description: "Resposta enviada com sucesso!",
      });
    } catch (error) {
      console.error('📧 Reply error:', error);
      toast({
        title: "Erro",
        description: `Erro ao enviar resposta: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleSendNewMessage = async () => {
    if (!newMessageRecipient.trim() || !newMessageContent.trim()) return;

    setIsSendingNewMessage(true);
    try {
      console.log('📧 New Message - Recipient:', newMessageRecipient);
      
      await apiRequest(`/api/customer-support/${currentOperationId}/send-message`, 'POST', {
        recipient: newMessageRecipient.trim(),
        message: newMessageContent.trim(),
      });

      console.log('📧 New Message success');

      setShowSuccessPopup(true);
      // Clear form
      setNewMessageRecipient("");
      setNewMessageContent("");
      setIsNewMessageModalOpen(false);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/customer-support/${currentOperationId}/tickets`] });
      queryClient.invalidateQueries({ queryKey: [`/api/customer-support/${currentOperationId}/overview`] });

      toast({
        title: "Mensagem Enviada",
        description: "Mensagem enviada com sucesso!",
      });
    } catch (error) {
      console.error('📧 New Message error:', error);
      toast({
        title: "Erro",
        description: `Erro ao enviar mensagem: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsSendingNewMessage(false);
    }
  };

  // Create test data
  const handleCreateTestData = async () => {
    try {
      await apiRequest(`/api/customer-support/${currentOperationId}/test-data`, 'POST');

      toast({
        title: "Dados de Teste Criados",
        description: "Tickets de exemplo foram criados com sucesso",
      });

      // Refresh tickets and metrics
      queryClient.invalidateQueries({ queryKey: [`/api/customer-support/${currentOperationId}/tickets`] });
      queryClient.invalidateQueries({ queryKey: [`/api/customer-support/${currentOperationId}/overview`] });
    } catch (error) {
      console.error('Error creating test data:', error);
      toast({
        title: "Erro", 
        description: "Erro ao criar dados de teste",
        variant: "destructive"
      });
    }
  };

  // Get support configuration with error handling
  const { data: supportConfig, isLoading: isLoadingConfig, error: configError } = useQuery({
    queryKey: [`/api/customer-support/config/${currentOperationId}`],
    enabled: !!currentOperationId,
    retry: false,
    throwOnError: false,
  });

  // Support system queries
  const { data: supportCategories, isLoading: categoriesLoading } = useQuery<SupportCategory[]>({
    queryKey: [`/api/customer-support/${currentOperationId}/categories`],
    enabled: !!supportConfig && !!currentOperationId
  });


  // Overview metrics for cards - mesma estratégia dos tickets
  const { data: overviewMetrics, isLoading: overviewLoading, refetch: refetchOverview } = useQuery<{
    openTickets: number;
    aiResponded: number;
    monthlyTickets: number;
    unreadTickets: number;
  }>({
    queryKey: [`/api/customer-support/${currentOperationId}/overview`],
    enabled: !!supportConfig && !!currentOperationId,
  });

  // Overview metrics successfully connected

  const hasSupportFilters = supportSearchTerm.trim().length > 0 || 
                           selectedCategory !== "all" || 
                           selectedTicketStatus !== "all";
                           
  // Always show tickets when any filter is applied OR when showing all
  const shouldLoadTickets = true; // Simplificando: sempre carregar tickets

  const { data: supportTicketsResponse, isLoading: ticketsLoading, refetch: refetchTickets } = useQuery<{tickets: SupportTicket[], total: number, page: number, totalPages: number}>({
    queryKey: [`/api/customer-support/${currentOperationId}/tickets`, currentPage, ticketsPerPage],
    enabled: !!supportConfig && !!currentOperationId,
    queryFn: async () => {
      const response = await fetch(`/api/customer-support/${currentOperationId}/tickets?limit=${ticketsPerPage}&page=${currentPage}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("auth_token")}`,
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    }
  });

  if (!currentOperationId) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Selecione uma operação para ver o suporte de clientes</p>
      </div>
    );
  }

  if (isLoadingConfig) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando configuração...</p>
        </div>
      </div>
    );
  }

  // Check if support is not configured (404 error or no data)
  const isNotConfigured = !supportConfig || (configError as any)?.response?.status === 404;

  if (isNotConfigured) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Suporte de Clientes Não Configurado</h2>
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">
          Configure o sistema de suporte de clientes para sua operação. Isso inclui categorização automática,
          respostas com IA e gerenciamento de tickets.
        </p>
        <Button 
          onClick={handleInitializeSupport}
          disabled={isInitializing}
          className="mt-6"
          data-testid="button-configure-support"
        >
          {isInitializing ? "Configurando..." : "Configurar Suporte"}
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toString()?.toLowerCase()) {
      case 'open':
        return <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">Aberto</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30">Em Andamento</Badge>;
      case 'resolved':
        return <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Resolvido</Badge>;
      case 'closed':
        return <Badge className="bg-gray-600/20 text-gray-400 border-gray-600/30">Fechado</Badge>;
      default:
        return <Badge className="bg-gray-600/20 text-gray-400 border-gray-600/30">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toString()?.toLowerCase()) {
      case 'urgent':
        return <Badge className="bg-red-600/20 text-red-400 border-red-600/30">Urgente</Badge>;
      case 'high':
        return <Badge className="bg-orange-600/20 text-orange-400 border-orange-600/30">Alto</Badge>;
      case 'medium':
        return <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">Médio</Badge>;
      case 'low':
        return <Badge className="bg-gray-600/20 text-gray-400 border-gray-600/30">Baixo</Badge>;
      default:
        return <Badge className="bg-gray-600/20 text-gray-400 border-gray-600/30">{priority}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-white" style={{ fontSize: '22px' }}>Suporte de Clientes</h1>
            {(supportConfig as any)?.emailDomain && (
              <Badge variant="outline" className="bg-gray-800/50 border-gray-600/50 text-gray-300 text-xs px-3 py-1">
                suporte@{(supportConfig as any).emailDomain}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button 
              variant="outline" 
              size="sm"
              className="bg-green-900/30 border-green-500/50 text-green-300 hover:bg-green-800/50 hover:text-green-200 transition-colors text-xs sm:text-sm" 
              onClick={() => setIsNewMessageModalOpen(true)}
              data-testid="button-send-message"
            >
              <Send className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Enviar Mensagem</span>
            </Button>
          </div>
        </div>
        <p className="text-gray-400">Gerenciamento de atendimento ao cliente com IA</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-6">
        {overviewLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6 animate-pulse" style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gray-600/50 rounded-lg"></div>
                <div className="w-16 h-4 bg-gray-600/50 rounded"></div>
              </div>
              <div className="w-32 h-8 bg-gray-600/50 rounded mb-2"></div>
              <div className="w-20 h-4 bg-gray-600/50 rounded"></div>
            </div>
          ))
        ) : (
          <>
            <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6 transition-all duration-300 hover:bg-white/5 hover:border-white/20" style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}} data-testid="card-tickets-abertos">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2">
                  <MessageSquare className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-xs font-medium text-green-400 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                  ATIVO
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                {overviewMetrics ? overviewMetrics.openTickets : 0}
              </h3>
              <p className="text-gray-400 text-sm font-medium">
                Tickets Abertos
              </p>
            </div>

            <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6 transition-all duration-300 hover:bg-white/5 hover:border-white/20" style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}} data-testid="card-respondido-ia">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full border border-blue-500/20">
                  IA
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                {overviewMetrics ? overviewMetrics.aiResponded : 0}
              </h3>
              <p className="text-gray-400 text-sm font-medium">
                Respondido por IA
              </p>
            </div>

            <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6 transition-all duration-300 hover:bg-white/5 hover:border-white/20" style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}} data-testid="card-tickets-mes">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-xs font-medium text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full border border-purple-500/20">
                  MÊS
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                {overviewMetrics ? overviewMetrics.monthlyTickets : 0}
              </h3>
              <p className="text-gray-400 text-sm font-medium">
                Tickets no Mês
              </p>
            </div>

            <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6 transition-all duration-300 hover:bg-white/5 hover:border-white/20" style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}} data-testid="card-nao-lidos">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2">
                  <Mail className="w-5 h-5 text-red-400" />
                </div>
                <span className="text-xs font-medium text-red-400 bg-red-500/10 px-2 py-1 rounded-full border border-red-500/20">
                  NOVO
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                {overviewMetrics ? overviewMetrics.unreadTickets : 0}
              </h3>
              <p className="text-gray-400 text-sm font-medium">
                Não Lidos
              </p>
            </div>
          </>
        )}
      </div>

      {/* Layout com Cards de Tipos na Esquerda e Filtros/Tickets na Direita */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Coluna Esquerda - Cards dos Tipos de Email Empilhados */}
        <div className="xl:w-80 xl:flex-shrink-0 space-y-4">
          {categoriesLoading ? (
            <div className="text-center py-8 text-slate-400">
              Carregando categorias...
            </div>
          ) : supportCategories && supportCategories.length > 0 ? (
            supportCategories.map((category) => (
              <div key={category.id} className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4 transition-all duration-300 hover:bg-white/5 hover:border-white/20 cursor-pointer" style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}} 
                    onClick={() => setSelectedCategory(category.id)}
                    data-testid={`card-category-${category.name}`}>
                <div className="p-4">
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
                </div>
              </div>
            ))
          ) : (
            <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center transition-all duration-300 hover:bg-white/5 hover:border-white/20" style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}>
              <Mail className="h-8 w-8 text-gray-500 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-white mb-2">Sistema de Suporte</h3>
              <p className="text-xs text-gray-400">
                Sistema com IA configurado para {currentOperationName}
              </p>
            </div>
          )}
        </div>

        {/* Coluna Direita - Filtros e Lista de Tickets */}
        <div className="flex-1 space-y-4">

          {/* Lista de Tickets */}
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-6 transition-all duration-300 hover:bg-white/5 hover:border-white/20" style={{boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'}}>
            <div className="mb-6">
              <h3 className="text-gray-100 flex items-center justify-between text-lg font-semibold mb-4">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Tickets de Suporte
                </span>
                {supportTicketsResponse && (
                  <span className="text-sm text-gray-400">
                    {supportTicketsResponse.tickets?.length || 0} tickets
                  </span>
                )}
              </h3>
              
              {/* Filtros integrados */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Email, assunto, ticket..."
                      value={supportSearchTerm}
                      onChange={(e) => {
                        setSupportSearchTerm(e.target.value);
                        setCurrentPage(1); // Reset página ao filtrar
                      }}
                      className="pl-10 bg-slate-700 border-slate-600 text-white h-9"
                      data-testid="input-support-search"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Categoria</label>
                  <Select value={selectedCategory} onValueChange={(value) => {
                    setSelectedCategory(value);
                    setCurrentPage(1); // Reset página ao filtrar
                  }}>
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
                  <Select value={selectedTicketStatus} onValueChange={(value) => {
                    setSelectedTicketStatus(value);
                    setCurrentPage(1); // Reset página ao filtrar
                  }}>
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
            </div>
            <div>
              {ticketsLoading ? (
                <div className="text-center py-8 text-slate-400">
                  <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin" />
                  Carregando tickets...
                </div>
              ) : supportTicketsResponse?.tickets?.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Nenhum ticket encontrado</h3>
                  <p className="text-slate-400 mb-6">
                    {hasSupportFilters 
                      ? 'Não há tickets que correspondam aos filtros aplicados.'
                      : 'Não há tickets de suporte para esta operação ainda.'
                    }
                  </p>
                  {!hasSupportFilters && (
                    <Button onClick={handleCreateTestData} variant="outline" className="bg-blue-900/30 border-blue-500/50 text-blue-300 hover:bg-blue-800/50 hover:text-blue-200 transition-colors">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Criar Dados de Teste
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {supportTicketsResponse?.tickets?.map((ticket) => (
                    <div key={ticket.id} className="relative bg-black/10 backdrop-blur-sm border border-white/10 rounded-lg p-4 transition-all duration-300 hover:bg-white/5 hover:border-white/20 cursor-pointer" style={{boxShadow: '0 4px 16px rgba(31, 38, 135, 0.2)'}}
                          onClick={() => handleViewTicket(ticket)}>
                        {!ticket.email?.hasAutoResponse && !ticket.isRead && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-400 border-2 border-slate-900 z-10" />
                        )}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs text-slate-300">{ticket.ticketNumber}</span>
                            {ticket.isAutomated && (
                              <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/30 text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                IA
                              </Badge>
                            )}
                            {ticket.email?.hasAutoResponse && (
                              <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 text-xs">
                                🤖 Sofia IA
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(ticket.status)}
                            {getPriorityBadge(ticket.priority)}
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <h4 className="font-medium text-white text-sm mb-1">{ticket.subject}</h4>
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {ticket.customerName || 'N/A'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {ticket.customerEmail}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>
                            {ticket.category?.displayName || 'Sem categoria'}
                          </span>
                          <div className="flex items-center gap-4">
                            {ticket.conversationCount > 0 && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {ticket.conversationCount}
                              </span>
                            )}
                            <span>
                              {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Paginação */}
              {supportTicketsResponse && supportTicketsResponse.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                  <div className="text-sm text-slate-400">
                    Página {currentPage} de {supportTicketsResponse.totalPages} 
                    <span className="ml-2">({supportTicketsResponse.total} tickets no total)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      Anterior
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, supportTicketsResponse.totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={page === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={page === currentPage 
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                            }
                          >
                            {page}
                          </Button>
                        );
                      })}
                      {supportTicketsResponse.totalPages > 5 && (
                        <>
                          <span className="text-slate-400 px-2">...</span>
                          <Button
                            variant={supportTicketsResponse.totalPages === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(supportTicketsResponse.totalPages)}
                            className={supportTicketsResponse.totalPages === currentPage 
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                            }
                          >
                            {supportTicketsResponse.totalPages}
                          </Button>
                        </>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage >= supportTicketsResponse.totalPages}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal para Ver Ticket */}
      <Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen}>
        <DialogContent className="max-w-5xl h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Ticket #{selectedTicket?.ticket?.ticketNumber}
              </span>
              <div className="flex items-center gap-2">
                {selectedTicket?.ticket && getStatusBadge(selectedTicket.ticket.status)}
                {selectedTicket?.ticket?.status !== 'resolved' && selectedTicket?.ticket?.status !== 'closed' && (
                  <AlertDialog open={isCloseConfirmOpen} onOpenChange={setIsCloseConfirmOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <XCircle className="h-4 w-4 mr-1" />
                        Fechar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Fechar Ticket</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja marcar este ticket como resolvido? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCloseTicket} disabled={isClosingTicket}>
                          {isClosingTicket ? "Fechando..." : "Fechar Ticket"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0 gap-2">
              {/* Header Compacto */}
              <div className="bg-slate-800/50 rounded-lg p-3 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold text-slate-200 flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {selectedTicket.ticket.subject}
                  </h2>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedTicket.ticket.status)}
                    {getPriorityBadge(selectedTicket.ticket.priority)}
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-slate-400">
                  <span>
                    <span className="text-slate-300">{selectedTicket.ticket.customerEmail}</span>
                    {selectedTicket.ticket.customerName && (
                      <span className="ml-1">({selectedTicket.ticket.customerName})</span>
                    )}
                  </span>
                  <span>{selectedTicket.ticket.categoryName}</span>
                  <span>{new Date(selectedTicket.ticket.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              {/* IA Information - Compacta */}
              {(selectedTicket.ticket.aiConfidence || selectedTicket.ticket.aiReasoning) && (
                <div className="bg-slate-800/50 rounded-lg p-2 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-3 w-3 text-purple-400" />
                      <span className="text-xs text-slate-400">IA: {selectedTicket.ticket.aiConfidence}% confiança</span>
                    </div>
                    <Badge className="bg-purple-900/30 text-purple-300 text-xs">
                      {selectedTicket.ticket.categoryName}
                    </Badge>
                  </div>
                  {selectedTicket.ticket.aiReasoning && (
                    <p className="text-xs text-slate-400 mt-1 truncate" title={selectedTicket.ticket.aiReasoning}>
                      {selectedTicket.ticket.aiReasoning}
                    </p>
                  )}
                </div>
              )}

              {/* Histórico de Conversação - Prioridade */}
              {((selectedTicket?.conversations && selectedTicket.conversations.length > 0) || (selectedTicket?.messages && selectedTicket.messages.length > 0)) && (
                <div className="bg-slate-800/50 rounded-lg p-3 flex-1 min-h-0 flex flex-col overflow-hidden">
                  <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center flex-shrink-0">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Mensagens ({(selectedTicket?.messages || selectedTicket?.conversations || []).length})
                  </h3>
                  <div id="conversation-history" className="space-y-3 overflow-y-auto pr-2 flex-1" style={{ scrollBehavior: 'smooth' }}>
                    {(selectedTicket?.messages || selectedTicket?.conversations || []).map((conv: any, index: number) => (
                      <div 
                        key={conv.id || index} 
                        className={`p-2 rounded-lg border-l-3 ${
                          conv.sender === 'customer' ? 'border-green-500 bg-green-900/10' :
                          conv.sender === 'agent' ? 'border-blue-500 bg-blue-900/10' :
                          conv.sender === 'ai' ? 'border-purple-500 bg-purple-900/10' :
                          'border-gray-500 bg-gray-900/10'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              conv.sender === 'customer' ? 'bg-green-900/30 text-green-300' :
                              conv.sender === 'agent' ? 'bg-blue-900/30 text-blue-300' :
                              conv.sender === 'ai' ? 'bg-purple-900/30 text-purple-300' :
                              'bg-gray-900/30 text-gray-300'
                            }`}>
                              {conv.sender === 'customer' ? 'Cliente' : 
                               conv.sender === 'agent' ? 'Agente' : 
                               conv.sender === 'ai' ? 'Sofia' : 
                               'Sistema'}
                            </span>
                            <span className="text-slate-500">{conv.senderEmail}</span>
                          </div>
                          <span>
                            {new Date(conv.createdAt).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {conv.subject && (
                          <div className="text-sm font-medium text-slate-200 mb-1">
                            {conv.subject}
                          </div>
                        )}
                        <div className="text-sm text-slate-300 leading-relaxed">
                          {conv.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seção de Resposta - Dinâmica */}
              {selectedTicket.ticket?.status !== 'resolved' && selectedTicket.ticket?.status !== 'closed' && (
                <div 
                  className={`bg-slate-800/50 rounded-lg border-t-2 border-blue-500/50 flex-shrink-0 transition-all duration-300 ease-in-out ${
                    isReplyExpanded ? 'p-3' : 'p-2'
                  }`}
                  style={{ 
                    height: isReplyExpanded ? 'auto' : '50px',
                    maxHeight: isReplyExpanded ? '250px' : '50px'
                  }}
                >
                  {!isReplyExpanded ? (
                    <div 
                      className="flex items-center justify-center h-full cursor-text hover:bg-slate-700/30 rounded transition-colors"
                      onClick={() => setIsReplyExpanded(true)}
                    >
                      <div className="flex items-center gap-2 text-slate-400">
                        <Send className="h-4 w-4" />
                        <span className="text-sm">Clique para responder ao ticket...</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-md font-semibold text-slate-200 flex items-center">
                          <Send className="h-4 w-4 mr-2" />
                          Responder Ticket
                        </h3>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setIsReplyExpanded(false);
                            setReplyMessage("");
                          }}
                          className="text-slate-400 hover:text-slate-200"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">
                            Resposta para {selectedTicket.ticket.customerEmail}
                          </label>
                          <Textarea
                            placeholder="Digite sua resposta aqui..."
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            className="bg-slate-900/50 border-slate-600 text-slate-200 min-h-[80px] max-h-[120px] resize-none"
                            disabled={isSendingReply}
                            autoFocus
                            onBlur={(e) => {
                              // Só recolhe se não há texto, não está enviando e clicou fora da área de resposta
                              setTimeout(() => {
                                try {
                                  const activeElement = document.activeElement;
                                  const currentTarget = e.currentTarget;
                                  const clickedOutside = !activeElement || !currentTarget || !currentTarget.contains(activeElement);
                                  if (!replyMessage.trim() && !isSendingReply && clickedOutside) {
                                    setIsReplyExpanded(false);
                                  }
                                } catch (error) {
                                  console.error('Error in onBlur handler:', error);
                                }
                              }, 100);
                            }}
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
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal para Enviar Nova Mensagem */}
      <Dialog open={isNewMessageModalOpen} onOpenChange={setIsNewMessageModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Enviar Nova Mensagem
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Remetente</label>
              <Input
                type="email"
                value={`suporte@${(supportConfig as any)?.emailDomain || 'exemplo.com'}`}
                disabled
                className="bg-gray-700/50 text-gray-300 border-gray-600"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Email do Destinatário</label>
              <Input
                type="email"
                placeholder="cliente@exemplo.com"
                value={newMessageRecipient}
                onChange={(e) => setNewMessageRecipient(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Mensagem</label>
              <Textarea
                placeholder="Digite sua mensagem..."
                value={newMessageContent}
                onChange={(e) => setNewMessageContent(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsNewMessageModalOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSendNewMessage} 
                disabled={isSendingNewMessage || !newMessageRecipient.trim() || !newMessageContent.trim()}
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}