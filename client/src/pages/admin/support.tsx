import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
  XCircle,
  Lightbulb,
  Sparkles,
  Bot,
  Globe,
  Plus,
  Edit3,
  Trash2,
  Package
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

interface AIDirective {
  id: string;
  type: 'n1_info' | 'product_info' | 'response_style' | 'custom';
  title: string;
  content: string;
  isActive: boolean;
}

export default function AdminSupport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
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

  const [isAddDirectiveModalOpen, setIsAddDirectiveModalOpen] = useState(false);
  const [isEditDirectiveModalOpen, setIsEditDirectiveModalOpen] = useState(false);
  const [newDirectiveType, setNewDirectiveType] = useState<AIDirective['type']>('n1_info');
  const [newDirectiveTitle, setNewDirectiveTitle] = useState('');
  const [newDirectiveContent, setNewDirectiveContent] = useState('');
  const [editingDirective, setEditingDirective] = useState<AIDirective | null>(null);

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
      // refetchTickets();
      // refetchOverview();
    } catch (error) {
      console.error('📧 New Message error:', error);
      alert(`Erro ao enviar mensagem: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSendingNewMessage(false);
    }
  };

  // N1 Admin Support - Global (não vinculado a operações específicas)
  
  // Support system queries
  const { data: supportCategories, isLoading: categoriesLoading } = useQuery<SupportCategory[]>({
    queryKey: ['/api/support/categories']
  });

  // Overview metrics for cards
  const { data: overviewMetrics, isLoading: overviewLoading } = useQuery<{
    openTickets: number;
    aiResponded: number;
    monthlyTickets: number;
    unreadTickets: number;
  }>({
    queryKey: ['/api/support/overview'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const hasSupportFilters = supportSearchTerm.trim().length > 0 || 
                           selectedCategory !== "all" || 
                           selectedTicketStatus !== "all";
                           
  // Always show tickets when any filter is applied OR when showing all
  const shouldLoadTickets = hasSupportFilters || (selectedCategory === "all" && selectedTicketStatus === "all" && !supportSearchTerm.trim());

  const { data: supportTicketsResponse, isLoading: ticketsLoading } = useQuery<{tickets: SupportTicket[], total: number}>({
    queryKey: ['/api/support/tickets', selectedCategory, selectedTicketStatus, supportSearchTerm],
    enabled: shouldLoadTickets,
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
      console.log('🐛 DEBUG: Dados brutos da API:', data);
      console.log('🐛 DEBUG: Total de tickets:', data.tickets?.length);
      console.log('🐛 DEBUG: Primeiro ticket completo:', JSON.stringify(data.tickets?.[0], null, 2));
      console.log('🐛 DEBUG: Email do primeiro ticket:', data.tickets?.[0]?.email);
      console.log('🐛 DEBUG: hasAutoResponse do primeiro:', data.tickets?.[0]?.email?.hasAutoResponse);
      return { tickets: data.tickets || [], total: data.total || 0 };
    }
  });

  const { data: aiDirectives, isLoading: directivesLoading } = useQuery<AIDirective[]>({
    queryKey: ['/api/support/directives'],
    select: (data: any[]) => {
      // Transform snake_case from backend to camelCase for frontend
      return data.map(directive => ({
        ...directive,
        isActive: directive.is_active ?? directive.isActive ?? true,
      }));
    },
  });

  // Query to fetch suggested orders for the selected ticket
  const { data: suggestedOrders, isLoading: suggestedOrdersLoading } = useQuery<Array<{
    order: any;
    score: number;
    confidence: 'high' | 'medium' | 'low';
    reasons: string[];
  }>>({
    queryKey: ['/api/support/tickets', selectedTicket?.ticket?.id, 'suggested-orders'],
    enabled: isTicketModalOpen && !!selectedTicket?.ticket?.id,
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/support/tickets/${selectedTicket.ticket.id}/suggested-orders`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    }
  });

  // Mutation to link an order to the ticket
  const linkOrderMutation = useMutation({
    mutationFn: async ({ ticketId, orderId }: { ticketId: string; orderId: string }) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/support/tickets/${ticketId}/link-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        body: JSON.stringify({ orderId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao vincular pedido');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Update the selected ticket with the new linked order data
      setSelectedTicket({
        ...selectedTicket,
        ticket: {
          ...selectedTicket.ticket,
          linkedOrderId: data.linkedOrderId,
          orderMatchConfidence: data.orderMatchConfidence,
          orderMatchMethod: data.orderMatchMethod,
          orderLinkedAt: data.orderLinkedAt,
        }
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets', selectedTicket?.ticket?.id, 'suggested-orders'] });

      toast({
        title: "Pedido vinculado",
        description: "O pedido foi vinculado ao ticket com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao vincular pedido",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLinkOrder = (orderId: string) => {
    if (!selectedTicket?.ticket?.id) return;
    linkOrderMutation.mutate({ ticketId: selectedTicket.ticket.id, orderId });
  };

  const getDirectiveTypeIcon = (type: AIDirective['type']) => {
    switch (type) {
      case 'n1_info': return <Globe className="w-4 h-4" />;
      case 'product_info': return <Sparkles className="w-4 h-4" />;
      case 'response_style': return <Bot className="w-4 h-4" />;
      case 'custom': return <Lightbulb className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getDirectiveTypeLabel = (type: AIDirective['type']) => {
    switch (type) {
      case 'n1_info': return 'Informações da Plataforma N1';
      case 'product_info': return 'Informações de Produto';
      case 'response_style': return 'Estilo de Resposta';
      case 'custom': return 'Customizado';
      default: return 'Customizado';
    }
  };

  const createDirectiveMutation = useMutation({
    mutationFn: async (directive: Omit<AIDirective, 'id'>) => {
      return apiRequest('/api/support/directives', 'POST', directive);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/directives'] });
      toast({
        title: "Diretiva criada",
        description: "A diretiva foi criada com sucesso.",
      });
      setIsAddDirectiveModalOpen(false);
      setNewDirectiveTitle('');
      setNewDirectiveContent('');
      setNewDirectiveType('n1_info');
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar diretiva",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const updateDirectiveMutation = useMutation({
    mutationFn: async ({ id, ...data }: AIDirective) => {
      return apiRequest(`/api/support/directives/${id}`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/directives'] });
      toast({
        title: "Diretiva atualizada",
        description: "A diretiva foi atualizada com sucesso.",
      });
      setIsEditDirectiveModalOpen(false);
      setEditingDirective(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar diretiva",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const deleteDirectiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/support/directives/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/directives'] });
      toast({
        title: "Diretiva removida",
        description: "A diretiva foi removida com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover diretiva",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const toggleDirectiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest(`/api/support/directives/${id}`, 'PATCH', { isActive });
    },
    onMutate: async ({ id, isActive }) => {
      // Cancel ongoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/support/directives'] });
      
      // Snapshot previous value
      const previousDirectives = queryClient.getQueryData(['/api/support/directives']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['/api/support/directives'], (old: AIDirective[] | undefined) => {
        if (!old) return old;
        return old.map((directive) =>
          directive.id === id ? { ...directive, isActive } : directive
        );
      });
      
      return { previousDirectives };
    },
    onError: (error: any, variables, context: any) => {
      // Rollback on error
      queryClient.setQueryData(['/api/support/directives'], context?.previousDirectives);
      toast({
        title: "Erro ao atualizar status",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/directives'] });
    },
  });

  const handleAddDirective = () => {
    if (!newDirectiveTitle.trim() || !newDirectiveContent.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Título e conteúdo são obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    createDirectiveMutation.mutate({
      type: newDirectiveType,
      title: newDirectiveTitle.trim(),
      content: newDirectiveContent.trim(),
      isActive: true,
    });
  };

  const handleEditDirective = () => {
    if (!editingDirective || !editingDirective.title.trim() || !editingDirective.content.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Título e conteúdo são obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    updateDirectiveMutation.mutate(editingDirective);
  };

  const handleDeleteDirective = (id: string) => {
    deleteDirectiveMutation.mutate(id);
  };

  const handleToggleDirective = (directive: AIDirective) => {
    toggleDirectiveMutation.mutate({ 
      id: directive.id, 
      isActive: !directive.isActive 
    });
  };

  const startEditDirective = (directive: AIDirective) => {
    setEditingDirective(directive);
    setIsEditDirectiveModalOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Suporte N1</h1>
          <p className="text-slate-300">Central de atendimento aos clientes da plataforma N1 Hub</p>
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

      <Tabs defaultValue="tickets" className="w-full">
        <TabsList className="bg-white/10 border-white/20 backdrop-blur-md">
          <TabsTrigger value="tickets" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">
            <MessageSquare className="h-4 w-4 mr-2" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="directives" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">
            <Bot className="h-4 w-4 mr-2" />
            Diretivas de IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-6 mt-6">
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
                    const ticket = ticketResponse.ticket;
                    return (
                    <div 
                      key={ticket.id} 
                      className="relative border border-slate-700 rounded-lg p-4 hover:bg-white/5 transition-colors cursor-pointer" 
                      onClick={() => handleViewTicket(ticketResponse)}
                      data-testid={`ticket-${ticket.ticketNumber}`}
                    >
                      {/* Círculo vermelho para tickets não lidos */}
                      {!ticket.isRead && (
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
                              <h3 className="font-medium text-white">{ticket.ticketNumber}</h3>
                              <Badge className="bg-slate-700 text-slate-300 text-xs">
                                {ticketResponse.category?.displayName}
                              </Badge>
                              {ticketResponse.email?.hasAutoResponse && (
                                <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 text-xs">
                                  🤖 Sofia IA
                                </Badge>
                              )}
                              {ticket.linkedOrderId && (
                                <Badge className="bg-orange-600/20 text-orange-400 border-orange-600/30 text-xs flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  Pedido: #{ticket.linkedOrderId}
                                </Badge>
                              )}
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
                          <div className="flex items-center text-slate-400">
                            <Eye className="h-4 w-4" />
                          </div>
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
                            <span>0 mensagens</span>
                          </div>
                          {ticket.assignedToUserId && (
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>Atribuído</span>
                            </div>
                          )}
                        </div>
                        <span>Última atividade: {new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString('pt-BR')}</span>
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

              {/* Linked Order Section */}
              {selectedTicket?.ticket?.linkedOrderId && (
                <div className="bg-slate-800/50 rounded-lg p-4 border-l-4 border-blue-500">
                  <h3 className="text-md font-semibold text-slate-200 mb-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      Pedido Vinculado
                    </div>
                    <Badge 
                      className={`text-xs ${
                        selectedTicket?.ticket?.orderMatchConfidence === 'high' ? 'bg-green-600/20 text-green-400 border-green-600/30' :
                        selectedTicket?.ticket?.orderMatchConfidence === 'medium' ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30' :
                        selectedTicket?.ticket?.orderMatchConfidence === 'manual' ? 'bg-purple-600/20 text-purple-400 border-purple-600/30' :
                        'bg-gray-600/20 text-gray-400 border-gray-600/30'
                      }`}
                    >
                      {selectedTicket?.ticket?.orderMatchConfidence === 'high' ? '🎯 Alta Confiança' :
                       selectedTicket?.ticket?.orderMatchConfidence === 'medium' ? '⚠️ Média Confiança' :
                       selectedTicket?.ticket?.orderMatchConfidence === 'manual' ? '👤 Vínculo Manual' :
                       '❓ Baixa Confiança'}
                    </Badge>
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">ID do Pedido:</span>
                      <span className="text-slate-200 font-mono">{selectedTicket?.ticket?.linkedOrderId}</span>
                    </div>
                    {selectedTicket?.ticket?.orderMatchMethod && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Método de Vinculação:</span>
                        <span className="text-slate-300">
                          {selectedTicket?.ticket?.orderMatchMethod === 'explicit_mention' ? 'Menção Explícita' :
                           selectedTicket?.ticket?.orderMatchMethod === 'temporal' ? 'Proximidade Temporal' :
                           selectedTicket?.ticket?.orderMatchMethod === 'score' ? 'Score de Relevância' :
                           selectedTicket?.ticket?.orderMatchMethod === 'manual' ? 'Manual' :
                           selectedTicket?.ticket?.orderMatchMethod}
                        </span>
                      </div>
                    )}
                    {selectedTicket?.ticket?.orderLinkedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Vinculado em:</span>
                        <span className="text-slate-300">
                          {new Date(selectedTicket?.ticket?.orderLinkedAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

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

              {/* Customer Orders Section */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="text-md font-semibold text-slate-200 mb-3 flex items-center">
                  <Package className="h-4 w-4 mr-2" />
                  Pedidos do Cliente
                  {selectedTicket?.ticket?.linkedOrderId && (
                    <span className="ml-2 text-xs text-slate-400">
                      (outros pedidos disponíveis para vínculo)
                    </span>
                  )}
                </h3>
                
                {suggestedOrdersLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
                    <span className="ml-2 text-slate-400">Carregando pedidos...</span>
                  </div>
                ) : suggestedOrders && suggestedOrders.length > 0 ? (
                  <div className="space-y-3">
                    {(() => {
                      // Sort orders: currently linked first, then by score
                      const sortedOrders = [...suggestedOrders].sort((a, b) => {
                        const aIsLinked = selectedTicket?.ticket?.linkedOrderId === a.order.id;
                        const bIsLinked = selectedTicket?.ticket?.linkedOrderId === b.order.id;
                        if (aIsLinked) return -1;
                        if (bIsLinked) return 1;
                        return b.score - a.score;
                      });
                      
                      return sortedOrders.map((suggestion, index) => {
                        const isCurrentlyLinked = selectedTicket?.ticket?.linkedOrderId === suggestion.order.id;
                        const isTopSuggestion = index === 0 && !isCurrentlyLinked && suggestion.confidence !== 'low';
                        return (
                        <div 
                          key={suggestion.order.id}
                          className={`p-3 rounded-lg border ${
                            isCurrentlyLinked
                              ? 'bg-green-900/20 border-green-600/40'
                              : index === 0 && suggestion.confidence !== 'low'
                              ? 'bg-blue-900/20 border-blue-600/40'
                              : 'bg-slate-900/30 border-slate-700/40'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-slate-200 font-mono text-sm">
                                  #{suggestion.order.id}
                                </span>
                                <Badge 
                                  className={`text-xs ${
                                    suggestion.confidence === 'high' ? 'bg-green-600/20 text-green-400 border-green-600/30' :
                                    suggestion.confidence === 'medium' ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30' :
                                    'bg-gray-600/20 text-gray-400 border-gray-600/30'
                                  }`}
                                >
                                  {suggestion.confidence === 'high' ? '🎯 Alta' :
                                   suggestion.confidence === 'medium' ? '⚠️ Média' :
                                   '❓ Baixa'}
                                </Badge>
                                {isCurrentlyLinked && (
                                  <Badge className="text-xs bg-green-600/20 text-green-400 border-green-600/30">
                                    ✓ Vinculado Atualmente
                                  </Badge>
                                )}
                                {isTopSuggestion && (
                                  <Badge className="text-xs bg-blue-600/20 text-blue-400 border-blue-600/30">
                                    ⭐ Sugestão Automática
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">Valor:</span>
                                  <span className="text-slate-200">
                                    {new Intl.NumberFormat('pt-BR', { 
                                      style: 'currency', 
                                      currency: 'BRL' 
                                    }).format(parseFloat(suggestion.order.totalPrice))}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">Data:</span>
                                  <span className="text-slate-300">
                                    {new Date(suggestion.order.createdAt).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">Status:</span>
                                  <span className="text-slate-300">{suggestion.order.status}</span>
                                </div>
                                {suggestion.score > 0 && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-400">Score:</span>
                                    <span className="text-blue-400 font-mono">{suggestion.score} pts</span>
                                  </div>
                                )}
                                {suggestion.reasons && suggestion.reasons.length > 0 && (
                                  <div className="mt-2">
                                    <span className="text-slate-400 text-xs">Motivos:</span>
                                    <ul className="mt-1 space-y-1">
                                      {suggestion.reasons.map((reason, i) => (
                                        <li key={i} className="text-xs text-slate-300 flex items-start">
                                          <span className="mr-1">•</span>
                                          <span>{reason}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <Button
                              size="sm"
                              onClick={() => handleLinkOrder(suggestion.order.id)}
                              disabled={linkOrderMutation.isPending}
                              className={`ml-3 ${
                                isCurrentlyLinked 
                                  ? 'bg-green-700 hover:bg-green-800 text-white' 
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                              data-testid={`button-link-order-${suggestion.order.id}`}
                            >
                              {linkOrderMutation.isPending ? (
                                <>
                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  Vinculando...
                                </>
                              ) : isCurrentlyLinked ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Re-confirmar
                                </>
                              ) : (
                                'Vincular'
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                  </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-slate-400 text-sm">
                        Nenhum pedido encontrado para este cliente.
                      </p>
                    </div>
                  )}
                </div>

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
        </TabsContent>

        <TabsContent value="directives" className="space-y-6 mt-6">
          <Card className="bg-white/10 border-white/20 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-slate-200 flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Diretivas de IA
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Configure as diretrizes que a IA Sofia seguirá ao responder tickets de suporte
                </CardDescription>
              </div>
              <Button 
                onClick={() => setIsAddDirectiveModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-add-directive"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Diretiva
              </Button>
            </CardHeader>
            <CardContent>
              {directivesLoading ? (
                <div className="text-center py-8 text-slate-400">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                  Carregando diretivas...
                </div>
              ) : !aiDirectives || aiDirectives.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <Bot className="h-12 w-12 text-slate-500 mx-auto" />
                  <div className="space-y-2">
                    <p className="text-slate-300 font-medium">Nenhuma diretiva configurada</p>
                    <p className="text-slate-400 text-sm">
                      Adicione diretivas para treinar a IA Sofia sobre como responder tickets de suporte
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {aiDirectives.map((directive) => (
                    <div 
                      key={directive.id}
                      className="border border-slate-700 rounded-lg p-4 bg-slate-800/50 hover:bg-slate-800/70 transition-colors"
                      data-testid={`directive-${directive.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="mt-1">
                            {getDirectiveTypeIcon(directive.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-medium text-white">{directive.title}</h3>
                              <Badge className="bg-slate-700 text-slate-300 text-xs">
                                {getDirectiveTypeLabel(directive.type)}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-400 whitespace-pre-wrap">
                              {directive.content}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Switch
                            checked={directive.isActive}
                            onCheckedChange={() => handleToggleDirective(directive)}
                            data-testid={`switch-directive-${directive.id}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditDirective(directive)}
                            className="text-slate-400 hover:text-white hover:bg-slate-700"
                            data-testid={`button-edit-directive-${directive.id}`}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                data-testid={`button-delete-directive-${directive.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-900 border-slate-700">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-slate-200">
                                  Remover Diretiva
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400">
                                  Tem certeza de que deseja remover esta diretiva? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
                                  Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteDirective(directive.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Sim, Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Directive Modal */}
      <Dialog open={isAddDirectiveModalOpen} onOpenChange={setIsAddDirectiveModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-200">Adicionar Nova Diretiva</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Tipo de Diretiva</label>
              <Select value={newDirectiveType} onValueChange={(value) => setNewDirectiveType(value as AIDirective['type'])}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="n1_info">Informações da Plataforma N1</SelectItem>
                  <SelectItem value="product_info">Informações de Produto</SelectItem>
                  <SelectItem value="response_style">Estilo de Resposta</SelectItem>
                  <SelectItem value="custom">Customizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Título</label>
              <Input
                placeholder="Digite o título da diretiva"
                value={newDirectiveTitle}
                onChange={(e) => setNewDirectiveTitle(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                data-testid="input-directive-title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Conteúdo</label>
              <Textarea
                placeholder="Digite o conteúdo da diretiva..."
                value={newDirectiveContent}
                onChange={(e) => setNewDirectiveContent(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white min-h-[120px]"
                data-testid="textarea-directive-content"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDirectiveModalOpen(false);
                setNewDirectiveTitle('');
                setNewDirectiveContent('');
                setNewDirectiveType('n1_info');
              }}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddDirective}
              disabled={createDirectiveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-save-directive"
            >
              {createDirectiveMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Diretiva'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Directive Modal */}
      <Dialog open={isEditDirectiveModalOpen} onOpenChange={setIsEditDirectiveModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-200">Editar Diretiva</DialogTitle>
          </DialogHeader>
          {editingDirective && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Tipo de Diretiva</label>
                <Select 
                  value={editingDirective.type} 
                  onValueChange={(value) => setEditingDirective({ ...editingDirective, type: value as AIDirective['type'] })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="n1_info">Informações da Plataforma N1</SelectItem>
                    <SelectItem value="product_info">Informações de Produto</SelectItem>
                    <SelectItem value="response_style">Estilo de Resposta</SelectItem>
                    <SelectItem value="custom">Customizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Título</label>
                <Input
                  placeholder="Digite o título da diretiva"
                  value={editingDirective.title}
                  onChange={(e) => setEditingDirective({ ...editingDirective, title: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  data-testid="input-edit-directive-title"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Conteúdo</label>
                <Textarea
                  placeholder="Digite o conteúdo da diretiva..."
                  value={editingDirective.content}
                  onChange={(e) => setEditingDirective({ ...editingDirective, content: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white min-h-[120px]"
                  data-testid="textarea-edit-directive-content"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDirectiveModalOpen(false);
                setEditingDirective(null);
              }}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEditDirective}
              disabled={updateDirectiveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-update-directive"
            >
              {updateDirectiveMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                'Atualizar Diretiva'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}