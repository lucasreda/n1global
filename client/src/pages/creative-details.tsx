import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye, Brain, Target, Zap, TrendingUp, Star, AlertCircle, CheckCircle, Play, Image as ImageIcon, Clock, Users, Palette, Volume2, Layers, BarChart3, Film, PenTool, Lightbulb, Award, Scissors, Mic, MessageSquare, PlayCircle, StopCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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

export default function CreativeDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  const { data: creativeDetails, isLoading, error } = useQuery<CreativeDetails>({
    queryKey: ['/api/creatives/details', id],
    enabled: !!id
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
  const insights = analysis?.insights || [];
  const recommendations = analysis?.recommendations || [];

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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content - Left Column (3/4) */}
          <div className="lg:col-span-3 space-y-8">
            
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
                            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Transcrição Original</span>
                          </div>
                          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-4">
                            <blockquote className="text-sm italic text-purple-800 dark:text-purple-200 border-l-4 border-purple-300 pl-4">
                              "{scene.audio.transcriptSnippet}"
                            </blockquote>
                          </div>
                        </div>
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
      </div>
    </div>
  );
}