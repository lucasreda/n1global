import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, Settings, Plus, TicketIcon, Clock, CheckCircle2, AlertCircle, Users } from "lucide-react";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Ticket = {
  id: string;
  ticketNumber: string;
  subject: string;
  customerEmail: string;
  customerName?: string;
  status: string;
  priority: string;
  categoryName?: string;
  createdAt: string;
  lastActivity?: string;
  isAutomated: boolean;
};

type SupportMetrics = {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  pendingTickets: number;
  avgResponseTime: string;
  automatedResponses: number;
};

export default function CustomerSupportPage() {
  const { selectedOperation, operations } = useCurrentOperation();
  const currentOperationId = selectedOperation;
  const currentOperationName = operations.find(op => op.id === selectedOperation)?.name;
  const queryClient = useQueryClient();
  
  const [isInitializing, setIsInitializing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

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

  // Create test data
  const handleCreateTestData = async () => {
    try {
      await apiRequest(`/api/customer-support/${currentOperationId}/test-data`, 'POST');

      toast({
        title: "Dados de Teste Criados",
        description: "Tickets de exemplo foram criados com sucesso",
      });

      // Refresh tickets and metrics
      await queryClient.invalidateQueries({
        queryKey: [`/api/customer-support/${currentOperationId}/tickets`]
      });
      await queryClient.invalidateQueries({
        queryKey: [`/api/customer-support/${currentOperationId}/metrics`]
      });
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

  // Get support metrics
  const { data: metrics } = useQuery({
    queryKey: [`/api/customer-support/${currentOperationId}/metrics`],
    enabled: !!supportConfig && !!currentOperationId,
    throwOnError: false,
  });

  // Get support tickets
  const { data: tickets, isLoading: isLoadingTickets } = useQuery({
    queryKey: [`/api/customer-support/${currentOperationId}/tickets`],
    enabled: !!supportConfig && !!currentOperationId,
    throwOnError: false,
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
      <div className="container mx-auto p-6">
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
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTickets = tickets?.filter((ticket: Ticket) => {
    if (selectedStatus === 'all') return true;
    return ticket.status.toLowerCase() === selectedStatus;
  }) || [];

  // Support is configured - show dashboard
  return (
    <div className="container mx-auto p-6" data-testid="customer-support-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Suporte de Clientes</h1>
          <p className="text-muted-foreground">{currentOperationName}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCreateTestData}
            data-testid="button-create-test-data"
          >
            <Plus className="w-4 h-4 mr-2" />
            Dados de Teste
          </Button>
          <Button data-testid="button-settings">
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TicketIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{metrics?.totalTickets || 0}</p>
                <p className="text-xs text-muted-foreground">Total de Tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{metrics?.openTickets || 0}</p>
                <p className="text-xs text-muted-foreground">Abertos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{metrics?.pendingTickets || 0}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{metrics?.resolvedTickets || 0}</p>
                <p className="text-xs text-muted-foreground">Resolvidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{metrics?.automatedResponses || 0}</p>
                <p className="text-xs text-muted-foreground">Automatizados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Support Configuration Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuração do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-muted-foreground">Domínio de Email</label>
              <p className="font-medium">{supportConfig?.emailDomain || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">IA Habilitada</label>
              <p className="font-medium">
                {supportConfig?.aiEnabled ? "Ativa" : "Desativada"}
              </p>
            </div>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="text-green-800 font-medium">✅ Sistema Ativo</h3>
            <p className="text-green-700 text-sm mt-1">
              O sistema de suporte está funcionando e configurado para esta operação.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Tickets de Suporte
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="open">Abertos</TabsTrigger>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
              <TabsTrigger value="closed">Fechados</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedStatus} className="mt-4">
              {isLoadingTickets ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Carregando tickets...</p>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium">Nenhum ticket encontrado</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedStatus === 'all' ? 'Não há tickets para esta operação ainda.' : `Não há tickets com status "${selectedStatus}".`}
                  </p>
                  <Button onClick={handleCreateTestData} className="mt-4" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Dados de Teste
                  </Button>
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket</TableHead>
                        <TableHead>Assunto</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead>IA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTickets.map((ticket: Ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-mono text-sm">
                            {ticket.ticketNumber}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {ticket.subject}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{ticket.customerName || 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">{ticket.customerEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(ticket.status)} variant="secondary">
                              {ticket.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityColor(ticket.priority)} variant="secondary">
                              {ticket.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {ticket.categoryName || 'N/A'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(ticket.createdAt)}
                          </TableCell>
                          <TableCell>
                            {ticket.isAutomated ? (
                              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                Auto
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                                Manual
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}