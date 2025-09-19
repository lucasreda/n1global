import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Eye, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  BarChart3,
  ExternalLink,
  FileText,
  Zap,
  Rocket
} from "lucide-react";
import { authenticatedApiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { FunnelDeployInterface } from "@/components/FunnelDeployInterface";

interface PreviewSession {
  id: string;
  name: string;
  pageCount: number;
  createdAt: string;
  expiresAt: string;
  previewUrl: string;
}

interface ValidationResult {
  score: number;
  isValid: boolean;
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    category: string;
    message: string;
    file?: string;
    line?: number;
  }>;
  recommendations: string[];
  metrics: {
    structure: number;
    content: number;
    performance: number;
    accessibility: number;
    seo: number;
  };
}

interface ValidationSummary {
  totalSessions: number;
  validatedSessions: number;
  averageScore: number;
  scoreDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  commonIssues: Record<string, number>;
  topRecommendations: string[];
}

export default function FunnelPreview() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch active preview sessions
  const { data: previewSessions, refetch: refetchSessions } = useQuery<PreviewSession[]>({
    queryKey: ['/api/preview'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/preview');
      const data = await response.json();
      return data.previews || [];
    },
  });

  // Fetch validation results for selected session
  const { data: validationData } = useQuery<{validation: ValidationResult | null}>({
    queryKey: ['/api/preview/validation', selectedSession],
    queryFn: async () => {
      if (!selectedSession) return { validation: null };
      const response = await authenticatedApiRequest('GET', `/api/preview/${selectedSession}/validation`);
      return await response.json();
    },
    enabled: !!selectedSession,
  });

  // Fetch validation summary
  const { data: validationSummary } = useQuery<{stats: ValidationSummary}>({
    queryKey: ['/api/validation/summary'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/validation/summary');
      return await response.json();
    },
  });

  // Delete preview session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await authenticatedApiRequest('DELETE', `/api/preview/${sessionId}`);
      if (!response.ok) {
        throw new Error('Falha ao deletar sessão de preview');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Sessão de preview deletada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/preview'] });
      setSelectedSession(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao deletar sessão de preview",
        variant: "destructive",
      });
    },
  });

  // Run manual validation mutation
  const validateSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await authenticatedApiRequest('POST', `/api/preview/${sessionId}/validate`, {});
      if (!response.ok) {
        throw new Error('Falha ao executar validação');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Validação executada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/preview/validation', selectedSession] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao executar validação",
        variant: "destructive",
      });
    },
  });

  const handleDeleteSession = (sessionId: string) => {
    deleteSessionMutation.mutate(sessionId);
  };

  const handleValidateSession = (sessionId: string) => {
    validateSessionMutation.mutate(sessionId);
  };

  const handleViewPreview = async (sessionId: string) => {
    try {
      const response = await authenticatedApiRequest('GET', `/api/preview/${sessionId}`);
      const result = await response.text();
      
      // Open preview in new window
      const previewWindow = window.open('', '_blank', 'width=1200,height=800');
      if (previewWindow) {
        previewWindow.document.write(result);
        previewWindow.document.close();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao abrir preview",
        variant: "destructive",
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-500";
    if (score >= 70) return "text-yellow-500";
    if (score >= 50) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 85) return <Badge className="bg-green-500 text-white">Excelente</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-500 text-white">Bom</Badge>;
    if (score >= 50) return <Badge className="bg-orange-500 text-white">Regular</Badge>;
    return <Badge className="bg-red-500 text-white">Ruim</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <DashboardHeader 
        title="Preview de Funnels"
        subtitle="Visualize e valide seus funnels antes do deploy"
      />
      
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="sessions" className="space-y-6">
          <TabsList className="glassmorphism border-white/10">
            <TabsTrigger value="sessions" data-testid="tab-sessions">
              Sessões de Preview
            </TabsTrigger>
            <TabsTrigger value="summary" data-testid="tab-summary">
              Relatório de Validação
            </TabsTrigger>
            <TabsTrigger value="deploy" data-testid="tab-deploy">
              <Rocket className="w-4 h-4 mr-1" />
              Deploy
            </TabsTrigger>
          </TabsList>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-6">
            {!previewSessions || previewSessions.length === 0 ? (
              <Card className="glassmorphism border-white/10">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Eye className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Nenhuma sessão de preview ativa
                  </h3>
                  <p className="text-muted-foreground text-center">
                    Crie um funil primeiro para gerar sessões de preview para validação
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sessions List */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Sessões Ativas ({previewSessions.length})
                  </h3>
                  
                  {previewSessions.map((session) => (
                    <Card 
                      key={session.id}
                      className={`glassmorphism border-white/10 cursor-pointer transition-all hover:bg-white/5 ${
                        selectedSession === session.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => setSelectedSession(session.id)}
                      data-testid={`card-session-${session.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground">{session.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {session.pageCount} páginas • Criado em {formatDate(session.createdAt)}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {isExpired(session.expiresAt) ? (
                                <Badge variant="destructive" className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Expirado
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Expira em {formatDate(session.expiresAt)}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewPreview(session.id);
                              }}
                              data-testid={`button-view-${session.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(session.id);
                              }}
                              disabled={deleteSessionMutation.isPending}
                              data-testid={`button-delete-${session.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Validation Details */}
                <div className="space-y-4">
                  {selectedSession ? (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-foreground">
                          Resultados de Validação
                        </h3>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleValidateSession(selectedSession)}
                          disabled={validateSessionMutation.isPending}
                          data-testid="button-revalidate"
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${validateSessionMutation.isPending ? 'animate-spin' : ''}`} />
                          {validateSessionMutation.isPending ? 'Validando...' : 'Validar Novamente'}
                        </Button>
                      </div>

                      {validationData?.validation ? (
                        <div className="space-y-4">
                          {/* Score Overview */}
                          <Card className="glassmorphism border-white/10">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-semibold text-foreground">Pontuação Geral</h4>
                                {getScoreBadge(validationData.validation.score)}
                              </div>
                              
                              <div className="text-center mb-4">
                                <div className={`text-3xl font-bold ${getScoreColor(validationData.validation.score)}`}>
                                  {validationData.validation.score}/100
                                </div>
                                <Progress 
                                  value={validationData.validation.score} 
                                  className="mt-2" 
                                />
                              </div>

                              {/* Metrics Breakdown */}
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Estrutura:</span>
                                  <span className="font-medium text-foreground">
                                    {validationData.validation.metrics.structure}/100
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Conteúdo:</span>
                                  <span className="font-medium text-foreground">
                                    {validationData.validation.metrics.content}/100
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Performance:</span>
                                  <span className="font-medium text-foreground">
                                    {validationData.validation.metrics.performance}/100
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Acessibilidade:</span>
                                  <span className="font-medium text-foreground">
                                    {validationData.validation.metrics.accessibility}/100
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">SEO:</span>
                                  <span className="font-medium text-foreground">
                                    {validationData.validation.metrics.seo}/100
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Issues */}
                          {validationData.validation.issues.length > 0 && (
                            <Card className="glassmorphism border-white/10">
                              <CardHeader>
                                <CardTitle className="text-sm font-semibold text-foreground">
                                  Problemas Encontrados ({validationData.validation.issues.length})
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-4">
                                <div className="space-y-2">
                                  {validationData.validation.issues.map((issue, index) => (
                                    <div key={index} className="flex items-start gap-2 p-2 rounded-md bg-white/5">
                                      {issue.type === 'error' && <XCircle className="w-4 h-4 text-red-500 mt-0.5" />}
                                      {issue.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />}
                                      {issue.type === 'info' && <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5" />}
                                      <div className="flex-1">
                                        <p className="text-sm text-foreground">{issue.message}</p>
                                        {issue.file && (
                                          <p className="text-xs text-muted-foreground">
                                            {issue.file}{issue.line ? `:${issue.line}` : ''}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* Recommendations */}
                          {validationData.validation.recommendations.length > 0 && (
                            <Card className="glassmorphism border-white/10">
                              <CardHeader>
                                <CardTitle className="text-sm font-semibold text-foreground">
                                  Recomendações ({validationData.validation.recommendations.length})
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-4">
                                <div className="space-y-2">
                                  {validationData.validation.recommendations.map((recommendation, index) => (
                                    <div key={index} className="flex items-start gap-2 p-2 rounded-md bg-white/5">
                                      <Zap className="w-4 h-4 text-blue-500 mt-0.5" />
                                      <p className="text-sm text-foreground">{recommendation}</p>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      ) : (
                        <Card className="glassmorphism border-white/10">
                          <CardContent className="flex flex-col items-center justify-center py-8">
                            <BarChart3 className="w-8 h-8 text-muted-foreground mb-4" />
                            <h4 className="font-semibold text-foreground mb-2">
                              Validação Pendente
                            </h4>
                            <p className="text-muted-foreground text-center text-sm">
                              A validação ainda não foi executada para esta sessão
                            </p>
                            <Button
                              className="mt-4"
                              onClick={() => handleValidateSession(selectedSession)}
                              disabled={validateSessionMutation.isPending}
                              data-testid="button-validate"
                            >
                              <RefreshCw className={`w-4 h-4 mr-2 ${validateSessionMutation.isPending ? 'animate-spin' : ''}`} />
                              {validateSessionMutation.isPending ? 'Validando...' : 'Executar Validação'}
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  ) : (
                    <Card className="glassmorphism border-white/10">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="w-8 h-8 text-muted-foreground mb-4" />
                        <h4 className="font-semibold text-foreground mb-2">
                          Selecione uma Sessão
                        </h4>
                        <p className="text-muted-foreground text-center text-sm">
                          Clique em uma sessão de preview para ver os resultados de validação
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-6">
            {validationSummary ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Stats Cards */}
                <Card className="glassmorphism border-white/10">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">
                        {validationSummary.stats.totalSessions}
                      </div>
                      <p className="text-sm text-muted-foreground">Total de Sessões</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glassmorphism border-white/10">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">
                        {validationSummary.stats.validatedSessions}
                      </div>
                      <p className="text-sm text-muted-foreground">Sessões Validadas</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glassmorphism border-white/10">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getScoreColor(validationSummary.stats.averageScore)}`}>
                        {validationSummary.stats.averageScore}
                      </div>
                      <p className="text-sm text-muted-foreground">Pontuação Média</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glassmorphism border-white/10">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">
                        {validationSummary.stats.scoreDistribution.excellent}
                      </div>
                      <p className="text-sm text-muted-foreground">Funnels Excelentes</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Score Distribution */}
                <Card className="glassmorphism border-white/10 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-foreground">Distribuição de Pontuação</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">Excelente (85-100)</span>
                        <Badge className="bg-green-500 text-white">
                          {validationSummary.stats.scoreDistribution.excellent}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">Bom (70-84)</span>
                        <Badge className="bg-yellow-500 text-white">
                          {validationSummary.stats.scoreDistribution.good}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">Regular (50-69)</span>
                        <Badge className="bg-orange-500 text-white">
                          {validationSummary.stats.scoreDistribution.fair}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">Ruim (0-49)</span>
                        <Badge className="bg-red-500 text-white">
                          {validationSummary.stats.scoreDistribution.poor}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Recommendations */}
                <Card className="glassmorphism border-white/10 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-foreground">Principais Recomendações</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {validationSummary.stats.topRecommendations.length > 0 ? (
                        validationSummary.stats.topRecommendations.map((recommendation, index) => (
                          <div key={index} className="flex items-start gap-2 p-2 rounded-md bg-white/5">
                            <Zap className="w-4 h-4 text-blue-500 mt-0.5" />
                            <p className="text-sm text-foreground">{recommendation}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma recomendação disponível</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="glassmorphism border-white/10">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Nenhum dado de validação disponível
                  </h3>
                  <p className="text-muted-foreground text-center">
                    Execute algumas validações primeiro para ver relatórios consolidados
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Deploy Tab */}
          <TabsContent value="deploy" className="space-y-6">
            {selectedSession ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Session Info */}
                <div className="space-y-4">
                  <Card className="glassmorphism border-white/10">
                    <CardHeader>
                      <CardTitle className="text-foreground text-lg">
                        Sessão Selecionada para Deploy
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(() => {
                        const session = previewSessions?.find(s => s.id === selectedSession);
                        if (!session) return <p className="text-muted-foreground">Sessão não encontrada</p>;
                        
                        return (
                          <>
                            <div className="space-y-2">
                              <div>
                                <span className="text-sm text-muted-foreground">Nome: </span>
                                <span className="text-sm font-medium text-foreground">{session.name}</span>
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">Páginas: </span>
                                <span className="text-sm font-medium text-foreground">{session.pageCount}</span>
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">Criado em: </span>
                                <span className="text-sm font-medium text-foreground">{formatDate(session.createdAt)}</span>
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">Expira em: </span>
                                <span className={`text-sm font-medium ${isExpired(session.expiresAt) ? 'text-red-500' : 'text-foreground'}`}>
                                  {formatDate(session.expiresAt)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="pt-3 border-t border-white/10">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(session.previewUrl, '_blank')}
                                className="w-full"
                                data-testid="button-preview-before-deploy"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Visualizar Preview
                              </Button>
                            </div>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  {/* Validation Status for Deploy */}
                  {validationData?.validation && (
                    <Card className="glassmorphism border-white/10">
                      <CardHeader>
                        <CardTitle className="text-foreground text-lg">
                          Status de Validação
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">Score Geral</span>
                          {getScoreBadge(validationData.validation.score)}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Pontuação:</span>
                            <span className={`font-medium ${getScoreColor(validationData.validation.score)}`}>
                              {validationData.validation.score}/100
                            </span>
                          </div>
                          <Progress value={validationData.validation.score} className="h-2" />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Estrutura:</span>
                            <span className="font-medium text-foreground">
                              {validationData.validation.metrics.structure}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Conteúdo:</span>
                            <span className="font-medium text-foreground">
                              {validationData.validation.metrics.content}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Performance:</span>
                            <span className="font-medium text-foreground">
                              {validationData.validation.metrics.performance}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">SEO:</span>
                            <span className="font-medium text-foreground">
                              {validationData.validation.metrics.seo}
                            </span>
                          </div>
                        </div>

                        {validationData.validation.issues.length > 0 && (
                          <div className="pt-2 border-t border-white/10">
                            <div className="flex items-center gap-2 text-sm">
                              {validationData.validation.isValid ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                              )}
                              <span className="text-muted-foreground">
                                {validationData.validation.issues.length} problema(s) encontrado(s)
                              </span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Deploy Interface */}
                <div>
                  <FunnelDeployInterface
                    sessionId={selectedSession}
                    previewData={validationData || undefined}
                    operationId={new URLSearchParams(window.location.search).get('operationId') || localStorage.getItem('selectedOperationId') || undefined}
                    onDeploymentComplete={(deployment) => {
                      toast({
                        title: "🎉 Deploy Concluído!",
                        description: `Seu funil está disponível em: ${deployment.url}`,
                      });
                    }}
                    className="h-fit"
                  />
                </div>
              </div>
            ) : (
              <Card className="glassmorphism border-white/10">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Rocket className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Selecione uma Sessão de Preview
                  </h3>
                  <p className="text-muted-foreground text-center">
                    Selecione uma sessão de preview validada na aba "Sessões de Preview" para fazer o deploy
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}