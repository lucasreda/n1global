import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Settings, Mail, MessageSquare, BarChart3, Plus, Search, Filter, ExternalLink, Bot, User, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { apiRequest } from "@/lib/queryClient";

interface CustomerSupportOperation {
  id: string;
  operationId: string;
  operationName: string;
  emailDomain: string;
  isCustomDomain: boolean;
  aiEnabled: boolean;
  aiCategories?: string[];
  brandingConfig?: any;
  businessHours?: any;
}

interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerEmail: string;
  customerName?: string;
  subject: string;
  status: string;
  priority: string;
  categoryName: string;
  isAutomated: boolean;
  lastActivity: string;
  createdAt: string;
  category?: {
    displayName: string;
    color: string;
  };
}

interface SupportMetrics {
  period: string;
  overview: {
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    avgResponseTime: number;
    automationRate: number;
  };
  statusDistribution: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  categoryDistribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
}

export default function CustomerSupportPage() {
  const { selectedOperation, operations } = useCurrentOperation();
  const currentOperationId = selectedOperation;
  const currentOperationName = operations.find(op => op.id === selectedOperation)?.name;
  const queryClient = useQueryClient();
  
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    search: ''
  });

  // Initialize support for current operation
  const initializeSupportMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/customer-support/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operationId: currentOperationId,
          operationName: currentOperationName
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customer-support/config`, currentOperationId] });
      toast({
        title: "Suporte Inicializado",
        description: "Sistema de suporte de clientes foi configurado com sucesso",
      });
    },
  });

  // Get support configuration
  const { data: supportConfig, isLoading: isLoadingConfig, error: configError } = useQuery({
    queryKey: [`/api/customer-support/config/${currentOperationId}`],
    enabled: !!currentOperationId,
    retry: false, // Don't retry on 404
  });

  // Get support metrics
  const { data: metrics, isLoading: isLoadingMetrics } = useQuery<SupportMetrics>({
    queryKey: [`/api/customer-support/${currentOperationId}/metrics`, { period: '7d' }],
    enabled: !!currentOperationId && !!supportConfig,
  });

  // Get tickets
  const { data: ticketsData, isLoading: isLoadingTickets } = useQuery({
    queryKey: [`/api/customer-support/${currentOperationId}/tickets`, filters],
    enabled: !!currentOperationId && !!supportConfig,
  });

  // Create test data mutation
  const createTestDataMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/customer-support/${currentOperationId}/test-data`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customer-support/${currentOperationId}/tickets`] });
      queryClient.invalidateQueries({ queryKey: [`/api/customer-support/${currentOperationId}/metrics`] });
      toast({
        title: "Dados de Teste Criados",
        description: "Tickets de exemplo foram criados com sucesso",
      });
    },
  });

  const getStatusColor = (status: string) => {
    const colors = {
      'open': 'bg-blue-100 text-blue-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'resolved': 'bg-green-100 text-green-800',
      'closed': 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || colors.open;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'low': 'bg-gray-100 text-gray-800',
      'medium': 'bg-blue-100 text-blue-800', 
      'high': 'bg-orange-100 text-orange-800',
      'urgent': 'bg-red-100 text-red-800',
    };
    return colors[priority as keyof typeof colors] || colors.medium;
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

  if (!currentOperationId) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Selecione uma operação para ver o suporte de clientes</p>
      </div>
    );
  }

  // Show initialization screen if not configured (404 error means not configured yet)
  const isNotConfigured = !isLoadingConfig && (!supportConfig || (configError as any)?.response?.status === 404);
  
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
            onClick={() => initializeSupportMutation.mutate()}
            disabled={initializeSupportMutation.isPending}
            className="mt-6"
          >
            {initializeSupportMutation.isPending ? "Configurando..." : "Configurar Suporte"}
          </Button>
        </div>
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
            onClick={() => createTestDataMutation.mutate()}
            disabled={createTestDataMutation.isPending}
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

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" data-testid="tab-overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="tickets" data-testid="tab-tickets">Tickets</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Métricas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Support Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuração do Suporte
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Domínio de Email</Label>
                  <p className="font-medium">{(supportConfig as any)?.emailDomain}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">IA Habilitada</Label>
                  <div className="flex items-center gap-2">
                    {(supportConfig as any)?.aiEnabled ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <Bot className="w-3 h-3 mr-1" />
                        Ativa
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Desativada</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          {metrics && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Total de Tickets</p>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-bold">{metrics.overview.totalTickets}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Tickets Abertos</p>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-bold text-orange-600">{metrics.overview.openTickets}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Taxa de Automação</p>
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-bold text-blue-600">{metrics.overview.automationRate}%</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Tempo Médio</p>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-bold">{metrics.overview.avgResponseTime}h</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por ticket, email ou assunto..."
                      className="pl-8"
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      data-testid="input-search-tickets"
                    />
                  </div>
                </div>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="w-40" data-testid="select-status-filter">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="open">Aberto</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="resolved">Resolvido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tickets List */}
          <Card>
            <CardHeader>
              <CardTitle>Tickets de Suporte</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTickets ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2">Carregando tickets...</span>
                </div>
              ) : (ticketsData as any)?.tickets?.length > 0 ? (
                <div className="space-y-2">
                  {(ticketsData as any).tickets.map((ticket: SupportTicket) => (
                    <div
                      key={ticket.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      data-testid={`ticket-item-${ticket.ticketNumber}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-sm font-medium">{ticket.ticketNumber}</span>
                            <Badge className={getStatusColor(ticket.status)}>
                              {ticket.status}
                            </Badge>
                            <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                            {ticket.isAutomated && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                <Bot className="w-3 h-3 mr-1" />
                                IA
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-medium">{ticket.subject}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>{ticket.customerEmail}</span>
                            <span>•</span>
                            <span>{formatDate(ticket.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid={`button-reply-${ticket.ticketNumber}`}
                          >
                            <Mail className="w-4 h-4 mr-2" />
                            Responder
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Nenhum ticket encontrado</h3>
                  <p className="text-muted-foreground">
                    Não há tickets de suporte para os filtros selecionados.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {metrics && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.statusDistribution.map((item) => (
                      <div key={item.status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(item.status).split(' ')[0]}`} />
                          <span className="capitalize">{item.status}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{item.count}</div>
                          <div className="text-sm text-muted-foreground">{item.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Category Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.categoryDistribution.map((item) => (
                      <div key={item.category} className="flex items-center justify-between">
                        <span className="capitalize">{item.category}</span>
                        <div className="text-right">
                          <div className="font-medium">{item.count}</div>
                          <div className="text-sm text-muted-foreground">{item.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}