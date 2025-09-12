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
                <div className="space-y-4">
                  {/* Timeline Overview */}
                  <div className="bg-muted rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-primary">
                          {analysis.result.fusionAnalysis.scenes.length}
                        </div>
                        <div className="text-muted-foreground">Cenas</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-primary">
                          {analysis.result.fusionAnalysis.totalDuration?.toFixed(1)}s
                        </div>
                        <div className="text-muted-foreground">Duração</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-primary">
                          {analysis.result.fusionAnalysis.overallScore?.toFixed(1)}/10
                        </div>
                        <div className="text-muted-foreground">Score Geral</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-primary">
                          {analysis.result.fusionAnalysis.averageSceneLength?.toFixed(1)}s
                        </div>
                        <div className="text-muted-foreground">Média/Cena</div>
                      </div>
                    </div>
                  </div>

                  {/* Scene Cards */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {analysis.result.fusionAnalysis.scenes.map((scene: any) => (
                      <div 
                        key={scene.id}
                        className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                      >
                        {/* Scene Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Cena {scene.id}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {scene.startSec.toFixed(1)}s - {scene.endSec.toFixed(1)}s
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={getScoreBadgeVariant(scene.visualScore)} 
                              className="text-xs"
                            >
                              {scene.visualScore}/10
                            </Badge>
                          </div>
                        </div>

                        {/* Technical Description */}
                        <div className="text-sm mb-3">
                          <p className="text-muted-foreground">
                            {scene.technicalDescription}
                          </p>
                        </div>

                        {/* Scene Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          {/* Objects */}
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <Layers className="w-3 h-3" />
                              <span className="font-medium">Objetos</span>
                            </div>
                            <div className="text-muted-foreground">
                              {scene.objects.length > 0 
                                ? scene.objects.slice(0, 2).map((obj: any) => obj.label).join(', ')
                                : 'Nenhum'
                              }
                              {scene.objects.length > 2 && ` +${scene.objects.length - 2}`}
                            </div>
                          </div>

                          {/* People */}
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <Users className="w-3 h-3" />
                              <span className="font-medium">Pessoas</span>
                            </div>
                            <div className="text-muted-foreground">
                              {scene.peopleCount || 0}
                            </div>
                          </div>

                          {/* Audio */}
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <Volume2 className="w-3 h-3" />
                              <span className="font-medium">Áudio</span>
                            </div>
                            <div className="text-muted-foreground">
                              {scene.audio?.voicePresent ? 'Voz' : 'Sem voz'}
                              {scene.audio?.musicDetected && ', Música'}
                            </div>
                          </div>

                          {/* Sync Quality */}
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <BarChart3 className="w-3 h-3" />
                              <span className="font-medium">Sinc</span>
                            </div>
                            <div className="text-muted-foreground">
                              {scene.syncQuality}/10
                            </div>
                          </div>
                        </div>

                        {/* Audio Transcript */}
                        {scene.audio?.transcriptSnippet && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-xs font-medium mb-1">Transcrição:</div>
                            <div className="text-xs text-muted-foreground italic">
                              "{scene.audio.transcriptSnippet}"
                            </div>
                          </div>
                        )}

                        {/* Keyframes Preview */}
                        {scene.keyframes && scene.keyframes.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-xs font-medium mb-2">Keyframes:</div>
                            <div className="flex gap-2 overflow-x-auto">
                              {scene.keyframes.slice(0, 3).map((keyframe: any, index: number) => (
                                <div key={index} className="flex-shrink-0">
                                  <img 
                                    src={keyframe.url} 
                                    alt={`Keyframe ${keyframe.timestamp.toFixed(1)}s`}
                                    className="w-16 h-12 object-cover rounded border"
                                  />
                                  <div className="text-xs text-center text-muted-foreground mt-1">
                                    {keyframe.timestamp.toFixed(1)}s
                                  </div>
                                </div>
                              ))}
                              {scene.keyframes.length > 3 && (
                                <div className="flex-shrink-0 w-16 h-12 bg-muted rounded border flex items-center justify-center">
                                  <span className="text-xs text-muted-foreground">
                                    +{scene.keyframes.length - 3}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Fallback para análise legada ou quando não há análise cena por cena
                <div className="bg-muted rounded-lg overflow-hidden">
                  {creative.type === 'video' ? (
                    <div className="aspect-video bg-black flex items-center justify-center">
                      {creative.mediaUrl ? (
                        <video 
                          controls 
                          className="w-full h-full"
                          poster={creative.thumbnailUrl}
                        >
                          <source src={creative.mediaUrl} type="video/mp4" />
                          Seu navegador não suporta reprodução de vídeo.
                        </video>
                      ) : (
                        <div className="text-white flex flex-col items-center gap-2">
                          <Play className="w-12 h-12" />
                          <p>Vídeo não disponível</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-video flex items-center justify-center">
                      {creative.thumbnailUrl || creative.mediaUrl ? (
                        <img 
                          src={creative.thumbnailUrl || creative.mediaUrl} 
                          alt={creative.name || 'Criativo'}
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <div className="text-muted-foreground flex flex-col items-center gap-2">
                          <ImageIcon className="w-12 h-12" />
                          <p>Imagem não disponível</p>
                        </div>
                      )}
                    </div>
                  )}
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