import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye, Brain, Target, Zap, TrendingUp, Star, AlertCircle, CheckCircle, Play, Image as ImageIcon, Clock, Users, Palette, Volume2, Layers, BarChart3, Film, PenTool, Lightbulb, Award, Scissors, Mic, MessageSquare, PlayCircle, StopCircle, ChevronDown, ChevronUp, BookOpen, Activity, Sparkles, Heart, Database, Gauge, Edit3, LineChart, Rocket, Shield, Trophy, Radar, Network } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CreativeDetails {
  creative: {
    id: string;
    name: string;
    type: string;
    thumbnailUrl?: string;
    mediaUrl?: string;
    cpm?: string;
    cpc?: string;
    ctr?: string;
    conversions?: number;
    spend?: string;
    impressions?: number;
    clicks?: number;
    campaignName?: string;
  };
  analysis: {
    id: string;
    status: string;
    analysisType: string;
    actualCost: string;
    completedAt: string;
    result?: any;
    insights?: string[];
    recommendations?: string[];
    scores?: any;
    visualAnalysis?: any;
    audioAnalysis?: any;
    fusionAnalysis?: any;
  };
}

interface ProprietaryBenchmarks {
  competitive_position: string;
  improvement_potential: number;
  industry_percentile: number;
  benchmarks: {
    ctr: { value: number; percentile: number };
    cpc: { value: number; percentile: number };
    cpm: { value: number; percentile: number };
    conversion_rate: { value: number; percentile: number };
  };
  recommendations: string[];
  data_freshness: string;
  sample_size: number;
}

interface PerformancePrediction {
  predicted_ctr: number;
  predicted_cpc: number;
  predicted_conversions: number;
  confidence_score: number;
  risk_factors: string[];
  optimization_opportunities: string[];
}

interface EditPlan {
  editPlans: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    changes: Array<{
      type: string;
      description: string;
      rationale: string;
      difficulty: 'easy' | 'medium' | 'hard';
      estimated_impact: number;
    }>;
  }>;
  benchmarksUsed: boolean;
  analysisData: any;
  performanceData: any;
}

export default function CreativeDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  
  // Auto-detected creative characteristics
  const [intelligenceData, setIntelligenceData] = useState<any>(null);

  const { data: creativeDetails, isLoading, error } = useQuery<CreativeDetails>({
    queryKey: ['/api/creatives/details', id],
    enabled: !!id
  });

  // Auto-execute global benchmarks (using all creatives across platform)
  const { data: globalBenchmarks, isLoading: benchmarksLoading } = useQuery<ProprietaryBenchmarks>({
    queryKey: ['/api/benchmarks/proprietary', 'global', creativeDetails?.creative?.type || 'video'],
    enabled: !!creativeDetails?.creative
  });

  // Auto-execute creative insights with global intelligence
  const { data: creativeInsights } = useQuery({
    queryKey: ['/api/creatives', id, 'insights'],
    enabled: !!id
  });

  // Auto-generate edit plans using global intelligence
  const { data: editPlans, isLoading: editPlansLoading } = useQuery<EditPlan>({
    queryKey: ['/api/creatives', id, 'edit-plans'],
    enabled: !!id && !!creativeDetails?.creative,
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  // Auto-execute performance predictions with global ML
  const { data: performancePrediction, isLoading: predictionLoading } = useQuery<PerformancePrediction | null>({
    queryKey: ['/api/predictions/campaign-performance', id, creativeDetails?.creative?.type],
    queryFn: async () => {
      if (!creativeDetails?.creative) return null;
      
      // Auto-detect characteristics from creative data
      const autoDetectedFeatures = {
        creativeType: creativeDetails.creative.type,
        objective: 'performance_optimization',
        placement: 'auto_detect',
        format: creativeDetails.creative.type,
        creativeName: creativeDetails.creative.name,
        campaignContext: creativeDetails.creative.campaignName
      };
      
      const response = await apiRequest('/api/predictions/campaign-performance', 'POST', autoDetectedFeatures) as any;
      return response as PerformancePrediction;
    },
    enabled: !!creativeDetails?.creative,
    staleTime: 10 * 60 * 1000 // Cache predictions for 10 minutes
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3 space-y-6">
                <div className="h-64 bg-muted rounded-lg"></div>
                <div className="h-48 bg-muted rounded-lg"></div>
              </div>
              <div className="space-y-6">
                <div className="h-32 bg-muted rounded-lg"></div>
                <div className="h-48 bg-muted rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !creativeDetails) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Erro ao carregar detalhes</h2>
            <p className="text-muted-foreground mb-4">Não foi possível encontrar este criativo ou sua análise.</p>
            <Button onClick={() => setLocation('/creatives')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar aos Criativos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { creative, analysis } = creativeDetails;

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 8) return 'default';
    if (score >= 6) return 'secondary';
    return 'destructive';
  };

  // Extract data from analysis
  const scenes = analysis?.result?.fusionAnalysis?.scenes || [];
  const totalDuration = analysis?.result?.fusionAnalysis?.totalDuration || 0;
  const overallScore = analysis?.result?.fusionAnalysis?.overallScore || 0;
  const scores = analysis?.scores || {};
  let insights = analysis?.insights || [];
  let recommendations = analysis?.recommendations || [];
  
  // REMOVED: Example data was overriding real analysis results
  // The component now uses actual analysis data from the API
  
  // Debug: Log para verificar dados
  console.log('🔍 Debug - Dados recebidos:', { 
    hasAnalysis: !!analysis, 
    insightsCount: insights.length, 
    recommendationsCount: recommendations.length,
    insights: insights.slice(0, 3),
    recommendations: recommendations.slice(0, 3),
    hasCopyAnalysis: !!analysis?.result?.copyAnalysis,
    copyAnalysisScore: analysis?.result?.copyAnalysis?.persuasion?.score,
    fullResult: analysis?.result
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation('/creatives')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Brain className="w-8 h-8 text-blue-500" />
                {creative.name || 'Criativo Analisado'}
              </h1>
              <p className="text-muted-foreground mt-1">
                Análise Profissional para Editores • {analysis.analysisType === 'audit' ? 'Auditoria Completa' : analysis.analysisType}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 text-white">
              <CheckCircle className="w-3 h-3 mr-1" />
              Análise Concluída
            </Badge>
            <Badge variant="outline" className="text-emerald-600 border-emerald-200">
              Custo: ${analysis.actualCost}
            </Badge>
          </div>
        </div>

        {/* Creative Intelligence - Unified Dashboard */}
        <div className="space-y-8">
          {/* Global Intelligence Overview */}
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500 rounded-lg">
                  <Network className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    Central de Creative Intelligence
                  </h2>
                  <p className="text-blue-700 dark:text-blue-300">
                    Análise proprietária baseada em {globalBenchmarks?.sample_size?.toLocaleString() || '10.000+'} criativos da plataforma
                  </p>
                </div>
              </div>
              <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                <Radar className="w-4 h-4 mr-2" />
                Inteligência Global
              </Badge>
            </div>

            {/* Key Intelligence Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Global Ranking */}
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border">
                <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {globalBenchmarks ? `Top ${globalBenchmarks.industry_percentile}%` : 'Analisando...'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Ranking Global</div>
              </div>

              {/* Performance Prediction */}
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border">
                <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {performancePrediction ? `${(performancePrediction.predicted_ctr * 100).toFixed(1)}%` : 'Calculando...'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">CTR Predito (ML)</div>
              </div>

              {/* Edit Impact */}
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border">
                <Rocket className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {editPlans ? `+${Math.max(...(editPlans.editPlans?.map(p => Math.max(...p.changes.map(c => c.estimated_impact))) || [0]))}%` : 'Gerando...'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Potencial Melhoria</div>
              </div>

              {/* Competitive Position */}
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border">
                <Shield className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {globalBenchmarks ? globalBenchmarks.competitive_position : 'Avaliando...'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Posição Competitiva</div>
              </div>
            </div>
          </Card>
          {/* Main Intelligence Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content - Left Column (3/4) */}
            <div className="lg:col-span-3 space-y-8">
              
              {/* Performance vs Global Benchmarks */}
              {globalBenchmarks && (
                <Card className="p-6">
                  <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-500" />
                    Performance vs. Benchmarks Globais
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* CTR Comparison */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Click-Through Rate</span>
                        <Badge variant={globalBenchmarks.benchmarks?.ctr?.percentile > 75 ? 'default' : globalBenchmarks.benchmarks?.ctr?.percentile > 50 ? 'secondary' : 'destructive'}>
                          P{globalBenchmarks.benchmarks?.ctr?.percentile}
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="h-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-600" 
                          style={{ width: `${globalBenchmarks.benchmarks?.ctr?.percentile || 0}%` }}
                        ></div>
                      </div>
                      <div className="text-sm text-gray-600">
                        Seu criativo: {(globalBenchmarks.benchmarks?.ctr?.value * 100)?.toFixed(2)}%
                      </div>
                    </div>

                    {/* CPC Comparison */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Custo por Click</span>
                        <Badge variant={globalBenchmarks.benchmarks?.cpc?.percentile < 25 ? 'default' : globalBenchmarks.benchmarks?.cpc?.percentile < 50 ? 'secondary' : 'destructive'}>
                          P{globalBenchmarks.benchmarks?.cpc?.percentile}
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="h-3 rounded-full bg-gradient-to-r from-green-400 to-green-600" 
                          style={{ width: `${100 - (globalBenchmarks.benchmarks?.cpc?.percentile || 0)}%` }}
                        ></div>
                      </div>
                      <div className="text-sm text-gray-600">
                        Seu criativo: R${globalBenchmarks.benchmarks?.cpc?.value?.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* AI-Powered Insights */}
              {performancePrediction && (
                <Card className="p-6">
                  <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-indigo-500" />
                    Insights de Machine Learning
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {(performancePrediction.predicted_ctr * 100).toFixed(2)}%
                      </div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">CTR Predito</div>
                    </div>
                    
                    <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                        R${performancePrediction.predicted_cpc?.toFixed(2)}
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-400">CPC Predito</div>
                    </div>
                    
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                      <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                        {performancePrediction.confidence_score?.toFixed(0)}%
                      </div>
                      <div className="text-sm text-purple-600 dark:text-purple-400">Confiança</div>
                    </div>
                  </div>

                  {/* ML Recommendations */}
                  {performancePrediction.optimization_opportunities && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-indigo-700 dark:text-indigo-300">Oportunidades de Otimização:</h4>
                      {performancePrediction.optimization_opportunities.map((opportunity, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg">
                          <Lightbulb className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-indigo-800 dark:text-indigo-200">{opportunity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {/* Actionable Edit Plans */}
              {editPlans && editPlans.editPlans && (
                <Card className="p-6">
                  <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-orange-500" />
                    Plano de Melhoria Personalizado
                  </h3>
                  
                  <div className="space-y-4">
                    {editPlans.editPlans.map((plan: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              plan.priority === 'high' ? 'bg-red-500' :
                              plan.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                            }`}></span>
                            {plan.category}
                          </h4>
                          <Badge variant={plan.priority === 'high' ? 'destructive' : plan.priority === 'medium' ? 'default' : 'secondary'}>
                            {plan.priority === 'high' ? 'Alta Prioridade' :
                             plan.priority === 'medium' ? 'Média Prioridade' : 'Baixa Prioridade'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          {plan.changes.map((change: any, changeIndex: number) => (
                            <div key={changeIndex} className="bg-gray-50 dark:bg-gray-800 rounded p-3">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-medium text-sm">{change.type}</span>
                                <span className="text-xs text-green-600 font-semibold">+{change.estimated_impact}%</span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{change.description}</p>
                              <p className="text-xs text-gray-500 italic">{change.rationale}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            
            {/* Performance Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Score Geral</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {overallScore ? overallScore.toFixed(1) : '--'}/10
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">Visual</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {scores.visual_quality ? scores.visual_quality.toFixed(1) : '--'}/10
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Volume2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Áudio</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      {scores.audio_quality ? scores.audio_quality.toFixed(1) : '--'}/10
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-300">CTR Previsto</p>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                      {scores.predicted_ctr ? `${scores.predicted_ctr}%` : '--'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Análise de Copywriting - Fase 2: Cards Expansíveis */}
            {analysis?.result?.copyAnalysis && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
                  <PenTool className="w-6 h-6 text-indigo-500" />
                  Análise de Copywriting
                </h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Card 1: Gatilhos de Persuasão */}
                  <Collapsible>
                    <Card className="p-4 hover:shadow-lg transition-shadow">
                      <CollapsibleTrigger className="w-full cursor-pointer" data-testid="trigger-gatilhos">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Brain className="w-5 h-5 text-purple-500" />
                            <span className="font-medium">Gatilhos de Persuasão</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={analysis.result.copyAnalysis.persuasion.score >= 7 ? "default" : "secondary"}>
                              {analysis.result.copyAnalysis.persuasion.score.toFixed(1)}/10
                            </Badge>
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                        
                        {/* Mini preview - sempre visível */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {Object.entries(analysis.result.copyAnalysis.persuasion.triggers)
                            .sort(([,a], [,b]) => (b as number) - (a as number))
                            .slice(0, 3)
                            .map(([trigger, score]) => (
                              <Badge key={trigger} variant="outline" className="text-xs">
                                {trigger === 'scarcity' && '🔥 Escassez'}
                                {trigger === 'urgency' && '⏰ Urgência'}
                                {trigger === 'socialProof' && '👥 Prova Social'}
                                {trigger === 'authority' && '🏆 Autoridade'}
                                {trigger === 'reciprocity' && '🎁 Reciprocidade'}
                                {trigger === 'emotion' && '❤️ Emoção'}
                                : {(score as number).toFixed(0)}
                              </Badge>
                            ))}
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="pt-4 border-t mt-4">
                        <div className="space-y-3">
                          {/* Métricas detalhadas com exemplos */}
                          {Object.entries(analysis.result.copyAnalysis.persuasion.triggers).map(([trigger, score]) => (
                            <div key={trigger} className={`p-3 rounded-lg ${
                              (score as number) >= 7 ? 'bg-green-50 dark:bg-green-950/20' :
                              (score as number) >= 4 ? 'bg-yellow-50 dark:bg-yellow-950/20' :
                              'bg-red-50 dark:bg-red-950/20'
                            }`}>
                              <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium capitalize">
                                  {trigger === 'scarcity' && '🔥 Escassez'}
                                  {trigger === 'urgency' && '⏰ Urgência'}
                                  {trigger === 'socialProof' && '👥 Prova Social'}
                                  {trigger === 'authority' && '🏆 Autoridade'}
                                  {trigger === 'reciprocity' && '🎁 Reciprocidade'}
                                  {trigger === 'emotion' && '❤️ Emoção'}
                                </span>
                                <span className="text-sm font-bold">{(score as number).toFixed(1)}/10</span>
                              </div>
                              <Progress value={(score as number) * 10} className="h-2 mb-2" />
                              {/* Exemplos do gatilho */}
                              {analysis.result.copyAnalysis.persuasion.examples
                                .filter((ex: any) => ex.trigger.toLowerCase().includes(trigger.substring(0, 4)))
                                .slice(0, 1)
                                .map((example: any, idx: number) => (
                                  <p key={idx} className="text-xs text-muted-foreground italic">
                                    "{example.text.substring(0, 80)}..." ({example.timestamp.toFixed(1)}s)
                                  </p>
                                ))}
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>

                  {/* Card 2: Estrutura Narrativa */}
                  <Collapsible>
                    <Card className="p-4 hover:shadow-lg transition-shadow">
                      <CollapsibleTrigger className="w-full cursor-pointer" data-testid="trigger-narrativa">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <BookOpen className="w-5 h-5 text-blue-500" />
                            <span className="font-medium">Estrutura Narrativa</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="default">
                              {analysis.result.copyAnalysis.narrative.framework}
                            </Badge>
                            <Badge variant="outline">
                              {analysis.result.copyAnalysis.narrative.confidence}%
                            </Badge>
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="pt-4 border-t mt-4">
                        <div className="space-y-3">
                          {/* Completude do framework */}
                          <div className="mb-4">
                            <div className="flex justify-between text-sm mb-2">
                              <span>Completude da Estrutura</span>
                              <span className="font-bold">{analysis.result.copyAnalysis.narrative.completeness}%</span>
                            </div>
                            <Progress value={analysis.result.copyAnalysis.narrative.completeness} className="h-2" />
                          </div>
                          
                          {/* Estágios do framework */}
                          {analysis.result.copyAnalysis.narrative.stages.map((stage: any, idx: number) => (
                            <div key={idx} className={`p-3 rounded-lg ${
                              stage.present ? 'bg-green-50 dark:bg-green-950/20' : 'bg-gray-50 dark:bg-gray-950/20'
                            }`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">{stage.name}</span>
                                <Badge variant={stage.present ? "default" : "outline"} className="text-xs">
                                  {stage.present ? '✓ Presente' : 'Ausente'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {stage.startSec.toFixed(1)}s - {stage.endSec.toFixed(1)}s
                              </p>
                              {stage.excerpt && (
                                <p className="text-xs italic mt-2 text-gray-600 dark:text-gray-400">
                                  "{stage.excerpt.substring(0, 100)}..."
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>

                  {/* Card 3: Performance de Copy */}
                  <Collapsible>
                    <Card className="p-4 hover:shadow-lg transition-shadow">
                      <CollapsibleTrigger className="w-full cursor-pointer" data-testid="trigger-performance">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Activity className="w-5 h-5 text-green-500" />
                            <span className="font-medium">Performance de Copy</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {analysis.result.copyAnalysis.performance.wpm} WPM
                            </Badge>
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="pt-4 border-t mt-4">
                        <div className="space-y-4">
                          {/* Métricas de velocidade */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600">
                                {analysis.result.copyAnalysis.performance.wpm}
                              </div>
                              <div className="text-xs text-muted-foreground">Palavras/minuto</div>
                            </div>
                            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                              <div className="text-2xl font-bold text-green-600">
                                {analysis.result.copyAnalysis.performance.speechDensity}%
                              </div>
                              <div className="text-xs text-muted-foreground">Densidade de fala</div>
                            </div>
                          </div>
                          
                          {/* Pausas estratégicas */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">Pausas Detectadas</h4>
                            <div className="space-y-2">
                              {analysis.result.copyAnalysis.performance.pauses.slice(0, 3).map((pause: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-xs p-2 bg-gray-50 dark:bg-gray-900 rounded">
                                  <span>{pause.startSec.toFixed(1)}s - {pause.duration.toFixed(1)}s</span>
                                  <Badge variant="outline" className="text-xs">
                                    {pause.purpose === 'emphasis' && 'Ênfase'}
                                    {pause.purpose === 'transition' && 'Transição'}
                                    {pause.purpose === 'breathing' && 'Respiração'}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Clareza */}
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span>Clareza da Mensagem</span>
                              <span className="font-bold">{analysis.result.copyAnalysis.performance.clarity}/10</span>
                            </div>
                            <Progress value={analysis.result.copyAnalysis.performance.clarity * 10} className="h-2" />
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>

                  {/* Card 4: Persona & Tom */}
                  <Collapsible>
                    <Card className="p-4 hover:shadow-lg transition-shadow">
                      <CollapsibleTrigger className="w-full cursor-pointer" data-testid="trigger-persona">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-orange-500" />
                            <span className="font-medium">Persona & Tom</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs capitalize">
                              {analysis.result.copyAnalysis.personaTone.tone}
                            </Badge>
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="pt-4 border-t mt-4">
                        <div className="space-y-4">
                          {/* Scores principais */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span>Adequação ao Público</span>
                                <span className="font-bold">{analysis.result.copyAnalysis.personaTone.audienceFit}/10</span>
                              </div>
                              <Progress value={analysis.result.copyAnalysis.personaTone.audienceFit * 10} className="h-2" />
                            </div>
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span>Consistência de Voz</span>
                                <span className="font-bold">{analysis.result.copyAnalysis.personaTone.voiceConsistency}/10</span>
                              </div>
                              <Progress value={analysis.result.copyAnalysis.personaTone.voiceConsistency * 10} className="h-2" />
                            </div>
                          </div>
                          
                          {/* Personas identificadas */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">Personas Identificadas</h4>
                            <div className="flex flex-wrap gap-2">
                              {analysis.result.copyAnalysis.personaTone.personas.map((persona: string) => (
                                <Badge key={persona} variant="outline">
                                  {persona}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          {/* Mudanças de tom */}
                          {analysis.result.copyAnalysis.personaTone.toneShifts.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Mudanças de Tom Detectadas</h4>
                              <div className="space-y-2">
                                {analysis.result.copyAnalysis.personaTone.toneShifts.map((shift: any, idx: number) => (
                                  <div key={idx} className="text-xs p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                                    {shift.timestamp.toFixed(1)}s: {shift.fromTone} → {shift.toTone}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Score de empatia */}
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span>Score de Empatia</span>
                              <span className="font-bold">{analysis.result.copyAnalysis.personaTone.empathyScore}/10</span>
                            </div>
                            <Progress value={analysis.result.copyAnalysis.personaTone.empathyScore * 10} className="h-2" />
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>

                  {/* Card 5: Poder das Palavras */}
                  <Collapsible>
                    <Card className="p-4 hover:shadow-lg transition-shadow">
                      <CollapsibleTrigger className="w-full cursor-pointer" data-testid="trigger-palavras">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Sparkles className="w-5 h-5 text-yellow-500" />
                            <span className="font-medium">Poder das Palavras</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              CTA: {analysis.result.copyAnalysis.powerWords.ctaPower}/10
                            </Badge>
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="pt-4 border-t mt-4">
                        <div className="space-y-4">
                          {/* Palavras de ação */}
                          {analysis.result.copyAnalysis.powerWords.action.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">🎯 Palavras de Ação</h4>
                              <div className="flex flex-wrap gap-2">
                                {analysis.result.copyAnalysis.powerWords.action.map((word: string) => (
                                  <Badge key={word} variant="default" className="bg-red-500">
                                    {word}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Palavras emocionais */}
                          {analysis.result.copyAnalysis.powerWords.emotional.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">❤️ Palavras Emocionais</h4>
                              <div className="flex flex-wrap gap-2">
                                {analysis.result.copyAnalysis.powerWords.emotional.map((word: string) => (
                                  <Badge key={word} variant="default" className="bg-pink-500">
                                    {word}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Palavras sensoriais */}
                          {analysis.result.copyAnalysis.powerWords.sensory.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">✨ Palavras Sensoriais</h4>
                              <div className="flex flex-wrap gap-2">
                                {analysis.result.copyAnalysis.powerWords.sensory.map((word: string) => (
                                  <Badge key={word} variant="default" className="bg-purple-500">
                                    {word}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Densidade de benefícios */}
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span>Densidade de Benefícios</span>
                              <span className="font-bold">{analysis.result.copyAnalysis.powerWords.benefitDensity.toFixed(1)}/10</span>
                            </div>
                            <Progress value={analysis.result.copyAnalysis.powerWords.benefitDensity * 10} className="h-2" />
                          </div>
                          
                          {/* Palavras-chave mais frequentes */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">📊 Palavras Mais Frequentes</h4>
                            <div className="space-y-2">
                              {analysis.result.copyAnalysis.powerWords.keywordDensity.slice(0, 5).map((kw: any) => (
                                <div key={kw.word} className="flex items-center justify-between text-xs">
                                  <span className="font-medium">{kw.word}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">{kw.count}x</span>
                                    <Badge variant="outline" className="text-xs">
                                      {kw.density}%
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>

                  {/* Card 6: Hooks & Ganchos */}
                  <Collapsible>
                    <Card className="p-4 hover:shadow-lg transition-shadow">
                      <CollapsibleTrigger className="w-full cursor-pointer" data-testid="trigger-hooks">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 text-red-500" />
                            <span className="font-medium">Hooks & Ganchos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={analysis.result.copyAnalysis.hooks.openingHookStrength >= 7 ? "default" : "secondary"}>
                              Abertura: {analysis.result.copyAnalysis.hooks.openingHookStrength}/10
                            </Badge>
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="pt-4 border-t mt-4">
                        <div className="space-y-4">
                          {/* Hook de abertura */}
                          <div className="p-3 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium">🎬 Hook de Abertura</span>
                              <Badge variant="default">
                                {analysis.result.copyAnalysis.hooks.openingHookType}
                              </Badge>
                            </div>
                            <Progress value={analysis.result.copyAnalysis.hooks.openingHookStrength * 10} className="h-2 mb-2" />
                            <p className="text-xs text-muted-foreground">
                              Força: {analysis.result.copyAnalysis.hooks.openingHookStrength}/10
                            </p>
                          </div>
                          
                          {/* Hook de fechamento */}
                          <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium">🎯 Hook de Fechamento</span>
                              <Badge variant="default">
                                CTA
                              </Badge>
                            </div>
                            <Progress value={analysis.result.copyAnalysis.hooks.closingHookStrength * 10} className="h-2 mb-2" />
                            <p className="text-xs text-muted-foreground">
                              Força: {analysis.result.copyAnalysis.hooks.closingHookStrength}/10
                            </p>
                          </div>
                          
                          {/* Hooks secundários */}
                          {analysis.result.copyAnalysis.hooks.secondaryHooks.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">🔗 Hooks Secundários</h4>
                              <div className="space-y-2">
                                {analysis.result.copyAnalysis.hooks.secondaryHooks.map((hook: any, idx: number) => (
                                  <div key={idx} className="p-2 bg-gray-50 dark:bg-gray-900 rounded">
                                    <div className="flex items-center justify-between mb-1">
                                      <Badge variant="outline" className="text-xs">
                                        {hook.type}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {hook.timestamp.toFixed(1)}s
                                      </span>
                                    </div>
                                    <p className="text-xs italic">
                                      "{hook.text}..."
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                </div>
              </Card>
            )}

            {/* Insights Profissionais para Editores */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
                <Lightbulb className="w-6 h-6 text-yellow-500" />
                Insights Profissionais para Editores
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Pontos Fortes Identificados
                  </h3>
                  <div className="space-y-2">
                    {insights.filter(insight => insight.includes('✅')).slice(0, 8).map((insight, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-green-800 dark:text-green-200">{insight.replace('✅', '').trim()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-orange-700 dark:text-orange-300 mb-3 flex items-center gap-2">
                    <Scissors className="w-4 h-4" />
                    Recomendações de Edição
                  </h3>
                  <div className="space-y-2">
                    {/* Recomendações do array recommendations com 🔧 */}
                    {recommendations.filter(rec => rec.includes('🔧')).slice(0, 5).map((rec, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                        <PenTool className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-orange-800 dark:text-orange-200">{rec.replace(/^✅\s*/, '').replace(/^🔧\s*/, '')}</p>
                      </div>
                    ))}
                    {/* Insights que são recomendações (não são pontos fortes) */}
                    {insights.filter(insight => !insight.includes('✅') && !insight.includes('🎯')).slice(0, 6).map((insight, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                        <PenTool className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-orange-800 dark:text-orange-200">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Timeline de Cenas - Redesenhado para Editores */}
            {scenes.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
                  <Film className="w-6 h-6 text-purple-500" />
                  Timeline de Cenas - Guia de Edição
                </h2>
                
                {/* Visão Geral do Vídeo */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950 rounded-lg p-6 mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-3xl font-bold text-purple-600">{scenes.length}</div>
                      <div className="text-sm text-muted-foreground">Cenas Analisadas</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-blue-600">{totalDuration.toFixed(1)}s</div>
                      <div className="text-sm text-muted-foreground">Duração Total</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-green-600">100%</div>
                      <div className="text-sm text-muted-foreground">Cobertura</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-orange-600">{overallScore.toFixed(1)}/10</div>
                      <div className="text-sm text-muted-foreground">Score Final</div>
                    </div>
                  </div>
                </div>

                {/* Timeline Visual */}
                <div className="bg-white dark:bg-card rounded-lg border p-4 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <PlayCircle className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold">Timeline Visual Interativa</h3>
                  </div>
                  
                  <div className="relative bg-muted rounded-lg h-20 mb-4 overflow-hidden">
                    {scenes.map((scene: any, index: number) => (
                      <div
                        key={scene.id}
                        className="absolute top-0 h-full border-r border-white/50 hover:bg-primary/20 transition-colors cursor-pointer group"
                        style={{
                          left: `${(scene.startSec / totalDuration) * 100}%`,
                          width: `${((scene.endSec - scene.startSec) / totalDuration) * 100}%`
                        }}
                        data-testid={`timeline-scene-${scene.id}`}
                      >
                        <div className={`h-3 ${scene.visualScore >= 8 ? 'bg-green-500' : scene.visualScore >= 6 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                        
                        <div className="p-2 text-xs">
                          <div className="font-medium">Cena {scene.id}</div>
                          <div className="text-muted-foreground">
                            {scene.startSec.toFixed(1)}s - {scene.endSec.toFixed(1)}s
                          </div>
                        </div>
                        
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          Score: {scene.visualScore}/10 • {scene.objects.length} objetos
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0:00</span>
                    <span>{Math.floor(totalDuration / 60)}:{(totalDuration % 60).toFixed(0).padStart(2, '0')}</span>
                  </div>
                </div>

                {/* Timeline Persuasiva - Gatilhos ao Longo do Tempo */}
                {analysis?.result?.copyAnalysis && (
                  <div className="mt-8 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      <h4 className="font-semibold text-indigo-700 dark:text-indigo-300">Timeline Persuasiva</h4>
                      <Badge variant="outline" className="text-xs">
                        {analysis.result.copyAnalysis.persuasion.examples.length} Gatilhos Detectados
                      </Badge>
                    </div>
                    
                    {/* Timeline de Gatilhos */}
                    <div className="relative bg-white/50 dark:bg-black/20 rounded-lg h-20 mb-4 overflow-hidden">
                      {/* Linha base da timeline */}
                      <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
                      
                      {/* Markers de gatilhos */}
                      {analysis.result.copyAnalysis.persuasion.examples.map((example: any, idx: number) => {
                        const position = (example.timestamp / totalDuration) * 100;
                        const triggerIcons: { [key: string]: string } = {
                          'urgency': '⏰',
                          'scarcity': '🔥', 
                          'social': '👥',
                          'authority': '🏆',
                          'reciprocity': '🎁',
                          'emotion': '❤️'
                        };
                        
                        const triggerColor: { [key: string]: string } = {
                          'urgency': 'bg-red-500',
                          'scarcity': 'bg-orange-500',
                          'social': 'bg-blue-500',
                          'authority': 'bg-purple-500',
                          'reciprocity': 'bg-green-500',
                          'emotion': 'bg-pink-500'
                        };
                        
                        const triggerKey = Object.keys(triggerIcons).find(key => 
                          example.trigger.toLowerCase().includes(key)
                        ) || 'emotion';
                        
                        return (
                          <div
                            key={idx}
                            className="absolute group cursor-pointer"
                            style={{
                              left: `${position}%`,
                              top: '50%',
                              transform: 'translate(-50%, -50%)'
                            }}
                            data-testid={`persuasion-marker-${idx}`}
                          >
                            {/* Marker visual */}
                            <div className={`w-8 h-8 ${triggerColor[triggerKey]} rounded-full flex items-center justify-center text-white shadow-lg transform hover:scale-125 transition-transform`}>
                              <span className="text-sm">{triggerIcons[triggerKey]}</span>
                            </div>
                            
                            {/* Linha vertical */}
                            <div className={`absolute w-0.5 h-4 ${triggerColor[triggerKey]} opacity-50 left-1/2 transform -translate-x-1/2 -top-4`}></div>
                            
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                              <div className="font-medium mb-1">{example.trigger}</div>
                              <div className="text-gray-300">{example.timestamp.toFixed(1)}s</div>
                              <div className="text-gray-300 max-w-xs truncate">"{example.text.substring(0, 50)}..."</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Legenda dos gatilhos */}
                    <div className="flex flex-wrap gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span>⏰ Urgência</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span>🔥 Escassez</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>👥 Prova Social</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span>🏆 Autoridade</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>🎁 Reciprocidade</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                        <span>❤️ Emoção</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Análise Detalhada por Cena */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Scissors className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold">Análise Detalhada por Cena</h3>
                    <Badge variant="outline" className="text-xs">{scenes.length} Cenas</Badge>
                  </div>

                  {scenes.map((scene: any, index: number) => (
                    <div 
                      key={scene.id}
                      className="border rounded-lg p-5 hover:shadow-md transition-all bg-white dark:bg-card"
                      data-testid={`scene-detail-${scene.id}`}
                    >
                      {/* Cabeçalho da Cena */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-sm font-mono bg-purple-50 text-purple-700 border-purple-200">
                            CENA {scene.id.toString().padStart(2, '0')}
                          </Badge>
                          <div className="text-sm font-mono text-muted-foreground">
                            {scene.startSec.toFixed(2)}s → {scene.endSec.toFixed(2)}s 
                            <span className="ml-2 text-xs bg-muted px-2 py-1 rounded">
                              {(scene.endSec - scene.startSec).toFixed(2)}s
                            </span>
                          </div>
                        </div>
                        <Badge 
                          variant={getScoreBadgeVariant(scene.visualScore)} 
                          className="text-sm font-bold"
                        >
                          {scene.visualScore.toFixed(1)}/10
                        </Badge>
                      </div>

                      {/* Descrição Visual para Editores */}
                      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 rounded-lg p-4 mb-4">
                        <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          Descrição Visual
                        </div>
                        <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                          {scene.technicalDescription || 'Análise visual detalhada não disponível'}
                        </p>
                      </div>

                      {/* Grid de Informações Técnicas */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {/* Elementos Visuais */}
                        <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 text-center">
                          <Layers className="w-5 h-5 text-green-600 mx-auto mb-2" />
                          <div className="text-sm font-medium text-green-700 dark:text-green-300">Objetos</div>
                          <div className="text-xl font-bold text-green-900 dark:text-green-100">
                            {scene.objects?.length || 0}
                          </div>
                        </div>

                        {/* Detecção Humana */}
                        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-center">
                          <Users className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                          <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Pessoas</div>
                          <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                            {scene.peopleCount || 0}
                          </div>
                        </div>

                        {/* Análise de Áudio */}
                        <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3 text-center">
                          <Mic className="w-5 h-5 text-purple-600 mx-auto mb-2" />
                          <div className="text-sm font-medium text-purple-700 dark:text-purple-300">Áudio</div>
                          <div className="text-sm font-bold text-purple-900 dark:text-purple-100">
                            {scene.audio?.voicePresent ? 'Voz' : 'Sem Voz'}
                          </div>
                        </div>

                        {/* Qualidade de Sincronia */}
                        <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-3 text-center">
                          <BarChart3 className="w-5 h-5 text-orange-600 mx-auto mb-2" />
                          <div className="text-sm font-medium text-orange-700 dark:text-orange-300">Sincronia</div>
                          <div className="text-xl font-bold text-orange-900 dark:text-orange-100">
                            {(scene.syncQuality || 0).toFixed(1)}/10
                          </div>
                        </div>
                      </div>

                      {/* Transcrição da Cena */}
                      {scene.audio?.transcriptSnippet && (
                        <div className="border-t pt-4 mt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <MessageSquare className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Transcrição Completa</span>
                          </div>
                          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-4">
                            <blockquote className="text-sm italic text-purple-800 dark:text-purple-200 border-l-4 border-purple-300 pl-4">
                              "{scene.audio.transcriptSnippet}"
                            </blockquote>
                          </div>
                        </div>
                      )}

                      {/* Sugestões de Copywriting Contextuais */}
                      {analysis?.result?.copyAnalysis?.sceneInsights && (
                        (() => {
                          const sceneInsight = analysis.result.copyAnalysis.sceneInsights.find((insight: any) => 
                            insight.sceneId === scene.id || 
                            (insight.timestamp >= scene.startSec && insight.timestamp <= scene.endSec)
                          );
                          
                          if (!sceneInsight || sceneInsight.suggestions.length === 0) return null;
                          
                          return (
                            <div className="border-t pt-4 mt-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Lightbulb className="w-4 h-4 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                                  Sugestões de Copywriting
                                </span>
                                <Badge 
                                  variant={
                                    sceneInsight.improvementPriority === 'high' ? 'destructive' : 
                                    sceneInsight.improvementPriority === 'medium' ? 'secondary' : 
                                    'outline'
                                  } 
                                  className="text-xs"
                                >
                                  Prioridade {
                                    sceneInsight.improvementPriority === 'high' ? 'Alta' :
                                    sceneInsight.improvementPriority === 'medium' ? 'Média' :
                                    'Baixa'
                                  }
                                </Badge>
                              </div>
                              
                              <div className="space-y-2">
                                {/* Gatilhos detectados nesta cena */}
                                {sceneInsight.triggers && sceneInsight.triggers.length > 0 && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs text-muted-foreground">Gatilhos:</span>
                                    <div className="flex gap-1">
                                      {sceneInsight.triggers.map((trigger: string) => (
                                        <Badge key={trigger} variant="outline" className="text-xs">
                                          {trigger === 'urgency' && '⏰'}
                                          {trigger === 'scarcity' && '🔥'}
                                          {trigger === 'social' && '👥'}
                                          {trigger === 'authority' && '🏆'}
                                          {trigger === 'reciprocity' && '🎁'}
                                          {trigger === 'emotion' && '❤️'}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Lista de sugestões */}
                                {sceneInsight.suggestions.map((suggestion: string, idx: number) => (
                                  <div 
                                    key={idx} 
                                    className={`flex items-start gap-2 p-3 rounded-lg ${
                                      sceneInsight.improvementPriority === 'high' ? 
                                        'bg-red-50 dark:bg-red-950/20' :
                                      sceneInsight.improvementPriority === 'medium' ? 
                                        'bg-yellow-50 dark:bg-yellow-950/20' :
                                        'bg-green-50 dark:bg-green-950/20'
                                    }`}
                                  >
                                    <PenTool className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                      sceneInsight.improvementPriority === 'high' ? 
                                        'text-red-600' :
                                      sceneInsight.improvementPriority === 'medium' ? 
                                        'text-yellow-600' :
                                        'text-green-600'
                                    }`} />
                                    <p className={`text-sm ${
                                      sceneInsight.improvementPriority === 'high' ? 
                                        'text-red-800 dark:text-red-200' :
                                      sceneInsight.improvementPriority === 'medium' ? 
                                        'text-yellow-800 dark:text-yellow-200' :
                                        'text-green-800 dark:text-green-200'
                                    }`}>
                                      {suggestion}
                                    </p>
                                  </div>
                                ))}
                                
                                {/* Score de persuasão da cena */}
                                {sceneInsight.persuasionScore !== undefined && (
                                  <div className="mt-3 p-2 bg-indigo-50 dark:bg-indigo-950/20 rounded">
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-indigo-700 dark:text-indigo-300">
                                        Score de Persuasão da Cena
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <Progress 
                                          value={sceneInsight.persuasionScore * 10} 
                                          className="w-20 h-2"
                                        />
                                        <span className="text-xs font-bold text-indigo-900 dark:text-indigo-100">
                                          {sceneInsight.persuasionScore.toFixed(1)}/10
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar - Right Column (1/4) */}
          <div className="space-y-6">
            {/* Miniatura do Criativo */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Criativo
              </h3>
              
              <div className="aspect-square bg-muted rounded-lg overflow-hidden mb-4">
                {creative.thumbnailUrl ? (
                  <img 
                    src={creative.thumbnailUrl} 
                    alt={creative.name || 'Criativo'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <Badge variant="outline">{creative.type}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Campanha:</span>
                  <span className="text-right text-xs max-w-32 truncate">{creative.campaignName || 'N/A'}</span>
                </div>
              </div>
            </Card>

            {/* Métricas de Performance */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Performance do Anúncio
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">CPM</span>
                  <span className="font-medium text-blue-600">
                    {creative.cpm ? formatCurrency(Number(creative.cpm)) : '--'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">CPC</span>
                  <span className="font-medium text-green-600">
                    {creative.cpc ? formatCurrency(Number(creative.cpc)) : '--'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">CTR</span>
                  <span className="font-medium text-purple-600">
                    {creative.ctr ? `${(Number(creative.ctr) * 100).toFixed(2)}%` : '--'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Conversões</span>
                  <span className="font-medium text-orange-600">
                    {creative.conversions !== null && creative.conversions !== undefined ? creative.conversions : '--'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Investimento</span>
                  <span className="font-medium text-red-600">
                    {creative.spend ? formatCurrency(Number(creative.spend)) : '--'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Análise Técnica Resumida */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Resumo Técnico
              </h3>
              
              <div className="space-y-3">
                <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {overallScore ? overallScore.toFixed(1) : '--'}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">Score Final</div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="font-bold">{scores.visual_quality || '--'}</div>
                    <div className="text-muted-foreground">Visual</div>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="font-bold">{scores.audio_quality || '--'}</div>
                    <div className="text-muted-foreground">Áudio</div>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground text-center">
                    Análise completa em {new Date(analysis.completedAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

              {/* Global Insights from All Platform Data */}
              {globalBenchmarks && globalBenchmarks.recommendations && (
                <Card className="p-6">
                  <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    Insights Proprietários da Plataforma
                  </h3>
                  
                  <div className="space-y-3">
                    {globalBenchmarks.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-lg">
                        <Star className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">{rec}</p>
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                            Baseado em análise de {globalBenchmarks.sample_size?.toLocaleString()} criativos similares
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Vantagem Competitiva Proprietária
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Estes insights são exclusivos da nossa plataforma, baseados em dados agregados e anônimos de 
                      {globalBenchmarks.sample_size?.toLocaleString()} análises de criativos. 
                      Dados atualizados em: {globalBenchmarks.data_freshness}
                    </p>
                  </div>
                </Card>
              )}
        </div>
      </div>
    </div>
  );
}