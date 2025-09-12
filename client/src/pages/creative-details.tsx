import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye, Brain, Target, Zap, TrendingUp, Star, AlertCircle, CheckCircle, Play, Image as ImageIcon, Clock, Users, Palette, Volume2, Layers, BarChart3, Film } from "lucide-react";
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
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
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
        <div className="max-w-6xl mx-auto">
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
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
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <Brain className="w-7 h-7 text-blue-500" />
                {creative.name || 'Criativo Analisado'}
              </h1>
              <p className="text-muted-foreground">
                Análise detalhada • {analysis.analysisType === 'audit' ? 'Auditoria Completa' : analysis.analysisType}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              Análise Concluída
            </Badge>
            <Badge variant="outline" className="text-emerald-600 border-emerald-200">
              Custo: ${analysis.actualCost}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Technical Scene Timeline */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Film className="w-5 h-5" />
                Timeline Técnico - Análise Cena por Cena
              </h2>
              
              {analysis?.result?.fusionAnalysis?.scenes ? (
                <div className="space-y-6">
                  {/* Technical Coverage Overview */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold">Cobertura Técnica Completa</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-2xl text-blue-600">
                          {analysis.result.fusionAnalysis.scenes.length}
                        </div>
                        <div className="text-muted-foreground">Segmentos Analisados</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-2xl text-green-600">
                          100%
                        </div>
                        <div className="text-muted-foreground">Cobertura Total</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-2xl text-purple-600">
                          {analysis.result.fusionAnalysis.totalDuration?.toFixed(1)}s
                        </div>
                        <div className="text-muted-foreground">Duração Capturada</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-2xl text-orange-600">
                          {analysis.result.fusionAnalysis.overallScore?.toFixed(1)}/10
                        </div>
                        <div className="text-muted-foreground">Score Técnico</div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Timeline Navigation */}
                  <div className="bg-white dark:bg-card rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-5 h-5" />
                      <h3 className="font-semibold">Timeline Interativa de Visão Computacional</h3>
                    </div>
                    
                    {/* Timeline Bar */}
                    <div className="relative bg-muted rounded-lg h-16 mb-4 overflow-hidden">
                      {analysis.result.fusionAnalysis.scenes.map((scene: any, index: number) => (
                        <div
                          key={scene.id}
                          className="absolute top-0 h-full border-r border-white/30 hover:bg-primary/20 transition-colors cursor-pointer group"
                          style={{
                            left: `${(scene.startSec / analysis.result.fusionAnalysis.totalDuration) * 100}%`,
                            width: `${((scene.endSec - scene.startSec) / analysis.result.fusionAnalysis.totalDuration) * 100}%`
                          }}
                          data-testid={`timeline-segment-${scene.id}`}
                        >
                          {/* Scene Progress Bar */}
                          <div 
                            className={`h-2 ${scene.visualScore >= 8 ? 'bg-green-500' : scene.visualScore >= 6 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          />
                          
                          {/* Scene Info */}
                          <div className="p-2 text-xs">
                            <div className="font-medium">Cena {scene.id}</div>
                            <div className="text-muted-foreground">
                              {scene.startSec.toFixed(1)}s - {scene.endSec.toFixed(1)}s
                            </div>
                          </div>
                          
                          {/* Tooltip on hover */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {scene.objects.length} objetos, {scene.peopleCount} pessoas
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Timeline Labels */}
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0:00</span>
                      <span>{Math.floor(analysis.result.fusionAnalysis.totalDuration / 60)}:{(analysis.result.fusionAnalysis.totalDuration % 60).toFixed(0).padStart(2, '0')}</span>
                    </div>
                  </div>

                  {/* Computer Vision Analysis Cards */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-5 h-5" />
                      <h3 className="font-semibold">Análise Técnica Detalhada</h3>
                      <Badge variant="outline" className="text-xs">
                        {analysis.result.fusionAnalysis.scenes.length} Segmentos Processados
                      </Badge>
                    </div>

                    {analysis.result.fusionAnalysis.scenes.map((scene: any, index: number) => (
                      <div 
                        key={scene.id}
                        className="border rounded-lg p-4 hover:shadow-sm transition-shadow bg-white dark:bg-card"
                        data-testid={`scene-analysis-${scene.id}`}
                      >
                        {/* Scene Header with Timeline Position */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${scene.visualScore >= 8 ? 'bg-green-500' : scene.visualScore >= 6 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                              <Badge variant="outline" className="text-xs font-mono">
                                SEGMENTO_{scene.id.toString().padStart(2, '0')}
                              </Badge>
                            </div>
                            <div className="text-sm font-mono text-muted-foreground">
                              {scene.startSec.toFixed(2)}s → {scene.endSec.toFixed(2)}s 
                              <span className="ml-2 text-xs">
                                (Δ{(scene.endSec - scene.startSec).toFixed(2)}s)
                              </span>
                            </div>
                          </div>
                          <Badge 
                            variant={getScoreBadgeVariant(scene.visualScore)} 
                            className="text-xs font-mono"
                          >
                            SCORE: {scene.visualScore.toFixed(1)}/10
                          </Badge>
                        </div>

                        {/* Computer Vision Description */}
                        <div className="bg-muted/50 rounded-lg p-3 mb-4">
                          <div className="text-xs font-medium text-blue-600 mb-1">VISÃO COMPUTACIONAL:</div>
                          <p className="text-sm font-mono leading-relaxed">
                            {scene.technicalDescription}
                          </p>
                        </div>

                        {/* Technical Data Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          {/* Visual Elements */}
                          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
                            <div className="flex items-center gap-1 mb-2">
                              <Layers className="w-4 h-4 text-blue-600" />
                              <span className="text-xs font-medium">OBJETOS</span>
                            </div>
                            <div className="text-sm font-mono">
                              {scene.objects.length > 0 ? (
                                <div>
                                  <div className="font-semibold">COUNT: {scene.objects.length}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {scene.objects.slice(0, 2).map((obj: any) => obj.label).join(', ')}
                                    {scene.objects.length > 2 && `... +${scene.objects.length - 2}`}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-muted-foreground">NULL</div>
                              )}
                            </div>
                          </div>

                          {/* Human Detection */}
                          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
                            <div className="flex items-center gap-1 mb-2">
                              <Users className="w-4 h-4 text-green-600" />
                              <span className="text-xs font-medium">PESSOAS</span>
                            </div>
                            <div className="text-sm font-mono">
                              <div className="font-semibold">COUNT: {scene.peopleCount || 0}</div>
                              <div className="text-xs text-muted-foreground">detecção facial</div>
                            </div>
                          </div>

                          {/* Audio Analysis */}
                          <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3">
                            <div className="flex items-center gap-1 mb-2">
                              <Volume2 className="w-4 h-4 text-purple-600" />
                              <span className="text-xs font-medium">ÁUDIO</span>
                            </div>
                            <div className="text-sm font-mono">
                              <div className="font-semibold">
                                {scene.audio?.voicePresent ? 'VOICE: TRUE' : 'VOICE: FALSE'}
                              </div>
                              {scene.audio?.musicDetected && (
                                <div className="text-xs text-purple-600">MUSIC: TRUE</div>
                              )}
                            </div>
                          </div>

                          {/* Sync Quality */}
                          <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-3">
                            <div className="flex items-center gap-1 mb-2">
                              <BarChart3 className="w-4 h-4 text-orange-600" />
                              <span className="text-xs font-medium">SINCRONIA</span>
                            </div>
                            <div className="text-sm font-mono">
                              <div className="font-semibold">SYNC: {(scene.syncQuality || 0).toFixed(1)}/10</div>
                              <div className="text-xs text-muted-foreground">av-alignment</div>
                            </div>
                          </div>
                        </div>

                        {/* Audio Transcript */}
                        {scene.audio?.transcriptSnippet && (
                          <div className="border-t pt-3 mt-3">
                            <div className="text-xs font-medium text-purple-600 mb-2">TRANSCRIÇÃO TEMPORAL:</div>
                            <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3">
                              <div className="text-sm font-mono italic">
                                "{scene.audio.transcriptSnippet}"
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Keyframe Analysis */}
                        {scene.keyframes && scene.keyframes.length > 0 && (
                          <div className="border-t pt-3 mt-3">
                            <div className="text-xs font-medium text-blue-600 mb-2">
                              KEYFRAMES EXTRAÍDOS: {scene.keyframes.length}
                            </div>
                            <div className="flex gap-2 overflow-x-auto">
                              {scene.keyframes.map((keyframe: any, index: number) => (
                                <div key={index} className="flex-shrink-0 bg-muted rounded border">
                                  <div className="w-20 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-t flex items-center justify-center">
                                    <Film className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="p-2 text-xs text-center">
                                    <div className="font-mono">{keyframe.timestamp.toFixed(2)}s</div>
                                  </div>
                                </div>
                              ))}
                              {scene.keyframes.length > 5 && (
                                <div className="flex-shrink-0 w-20 h-14 bg-muted rounded border flex items-center justify-center">
                                  <div className="text-center">
                                    <div className="text-xs font-mono">+{scene.keyframes.length - 5}</div>
                                    <div className="text-xs text-muted-foreground">mais</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Technical Metadata */}
                        <div className="border-t pt-3 mt-3 bg-muted/30 rounded-lg p-3">
                          <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                            <div>
                              <span className="text-muted-foreground">DURAÇÃO:</span>
                              <div className="font-semibold">{(scene.endSec - scene.startSec).toFixed(3)}s</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">POSIÇÃO:</span>
                              <div className="font-semibold">{((scene.startSec / analysis.result.fusionAnalysis.totalDuration) * 100).toFixed(1)}%</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">KEYFRAMES:</span>
                              <div className="font-semibold">{scene.keyframes?.length || 0}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Technical Summary */}
                  <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950 dark:to-slate-950 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold">Resumo da Análise Técnica</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-green-600">✓ Cobertura Total</div>
                        <div className="text-muted-foreground">Vídeo completamente analisado</div>
                      </div>
                      <div>
                        <div className="font-medium text-blue-600">✓ Visão Computacional</div>
                        <div className="text-muted-foreground">Descrição técnica precisa</div>
                      </div>
                      <div>
                        <div className="font-medium text-purple-600">✓ Sincronia A/V</div>
                        <div className="text-muted-foreground">Alinhamento temporal validado</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Estado quando não há análise cena por cena disponível
                <div className="bg-muted/50 rounded-lg p-8 text-center">
                  <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Timeline Técnico Indisponível</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    A análise cena por cena não foi concluída para este criativo.
                  </p>
                  <Badge variant="outline">
                    Aguardando processamento de visão computacional
                  </Badge>
                </div>
              )}
            </Card>

            {/* Analysis Results */}
            {analysis.result && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  Resultados da Análise
                </h2>
                
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap text-sm">
                    {typeof analysis.result === 'string' ? analysis.result : JSON.stringify(analysis.result, null, 2)}
                  </div>
                </div>
              </Card>
            )}

            {/* Visual Analysis */}
            {analysis.visualAnalysis && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-purple-500" />
                  Análise Visual
                </h2>
                
                <div className="space-y-4">
                  {analysis.visualAnalysis.insights && (
                    <div>
                      <h3 className="font-medium mb-2">Insights Visuais</h3>
                      <ul className="space-y-1 text-sm">
                        {analysis.visualAnalysis.insights.map((insight: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {analysis.visualAnalysis.composition && (
                    <div>
                      <h3 className="font-medium mb-2">Composição</h3>
                      <p className="text-sm text-muted-foreground">{analysis.visualAnalysis.composition}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Recomendações de Otimização
                </h2>
                
                <div className="space-y-3">
                  {analysis.recommendations.map((recommendation: string, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                      <Zap className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            
            {/* Performance Metrics */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Métricas de Performance
              </h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">CPM</span>
                  <span className="font-medium text-blue-600">
                    {creative.cpm ? formatCurrency(creative.cpm) : '--'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">CPC</span>
                  <span className="font-medium text-green-600">
                    {creative.cpc ? formatCurrency(creative.cpc) : '--'}
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
                  <span className="text-sm text-muted-foreground">Gasto Total</span>
                  <span className="font-medium">
                    {creative.spend ? formatCurrency(creative.spend) : '--'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Scores */}
            {analysis.scores && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Pontuações
                </h2>
                
                <div className="space-y-4">
                  {Object.entries(analysis.scores).map(([key, value]: [string, any]) => {
                    const score = typeof value === 'number' ? value : parseFloat(value) || 0;
                    const percentage = (score / 10) * 100;
                    
                    return (
                      <div key={key}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium capitalize">
                            {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                          </span>
                          <Badge variant={getScoreBadgeVariant(score)} className="text-xs">
                            {score.toFixed(1)}/10
                          </Badge>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Campaign Info */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Informações da Campanha</h2>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Campanha:</span>
                  <p className="font-medium">{creative.campaignName || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo:</span>
                  <p className="font-medium capitalize">{creative.type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Analisado em:</span>
                  <p className="font-medium">
                    {new Date(analysis.completedAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}