import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, 
  TrendingUp, 
  Eye, 
  DollarSign,
  Clock,
  Loader2,
  RefreshCw,
  Image,
  Video,
  FileText,
  Zap,
  Brain,
  Target,
  BarChart3,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import type { AdCreative, Campaign } from "@shared/schema";

interface AnalysisJob {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  costEstimate: number;
  actualCost: number;
  perCreativeStatus: Array<{
    creativeId: string;
    status: 'pending' | 'analyzing' | 'completed' | 'failed';
    progress: number;
  }>;
  results?: any;
  error?: string;
}

export default function Creatives() {
  const { toast } = useToast();
  const [selectedCreatives, setSelectedCreatives] = useState<Set<string>>(new Set());
  const [analysisType, setAnalysisType] = useState("audit");
  const [analysisModel, setAnalysisModel] = useState("gpt-4-turbo-preview");
  const [analysisSheetOpen, setAnalysisSheetOpen] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Fetch operation from localStorage
  const operationId = localStorage.getItem("current_operation_id");


  // Fetch campaigns
  const { data: allCampaigns = [] } = useQuery({
    queryKey: ["/api/campaigns", operationId],
    queryFn: async () => {
      const response = await apiRequest(`/api/campaigns?operationId=${operationId}`, "GET");
      return response.json() as Promise<Campaign[]>;
    },
    enabled: !!operationId
  });

  // Filter only selected campaigns from Ads page
  const selectedCampaignsFromAds = allCampaigns.filter((campaign: any) => campaign.isSelected);
  const selectedCampaignIds = selectedCampaignsFromAds.map((campaign: any) => campaign.campaignId);

  // Fetch creatives - only from selected campaigns
  const { 
    data: creatives = [], 
    isLoading: creativesLoading,
    refetch: refetchCreatives 
  } = useQuery({
    queryKey: ["/api/creatives", selectedCampaignIds, operationId],
    queryFn: async () => {
      // Only fetch if there are selected campaigns
      if (selectedCampaignIds.length === 0) {
        return [];
      }
      const campaignParam = `&campaignIds=${selectedCampaignIds.join(',')}`;
      const response = await apiRequest(`/api/creatives?operationId=${operationId}${campaignParam}`, "GET");
      return response.json() as Promise<AdCreative[]>;
    },
    enabled: !!operationId && selectedCampaignIds.length > 0
  });

  // Fetch analyzed creatives
  const { data: analyzedCreatives = [] } = useQuery({
    queryKey: ["/api/creatives/analyzed", operationId],
    queryFn: async () => {
      const response = await apiRequest(`/api/creatives/analyzed?operationId=${operationId}`, "GET");
      return response.json();
    },
    enabled: !!operationId
  });

  // Fetch new creatives that haven't been analyzed - only from selected campaigns
  const { data: newCreatives = [] } = useQuery({
    queryKey: ["/api/creatives/new", selectedCampaignIds, operationId],
    queryFn: async () => {
      // Only fetch if there are selected campaigns
      if (selectedCampaignIds.length === 0) {
        return [];
      }
      const campaignParam = `&campaignIds=${selectedCampaignIds.join(',')}`;
      const response = await apiRequest(`/api/creatives/new?operationId=${operationId}${campaignParam}`, "GET");
      return response.json() as Promise<AdCreative[]>;
    },
    enabled: !!operationId && selectedCampaignIds.length > 0
  });

  // Fetch cost estimate
  const { data: costEstimate } = useQuery({
    queryKey: ["/api/creatives/estimate", selectedCreatives.size, analysisType, analysisModel],
    queryFn: async () => {
      const response = await apiRequest(`/api/creatives/estimate?creativeCount=${selectedCreatives.size}&analysisType=${analysisType}&model=${analysisModel}`, "GET");
      return response.json();
    },
    enabled: selectedCreatives.size > 0
  });

  // Track job status with state instead of query
  const [jobStatus, setJobStatus] = useState<AnalysisJob | null>(null);
  
  // Setup SSE for real-time job updates
  useEffect(() => {
    if (!currentJobId) {
      setJobStatus(null);
      return;
    }
    
    // Get auth token for SSE connection
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No auth token for SSE");
      return;
    }
    
    // Create EventSource with authentication
    const eventSource = new EventSource(
      `/api/creatives/analyses/${currentJobId}/stream`,
      { withCredentials: true }
    );
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.error) {
          console.error("SSE error:", data.error);
          eventSource.close();
          return;
        }
        
        setJobStatus(data as AnalysisJob);
        
        // Close connection when job is complete
        if (data.status === 'completed' || data.status === 'failed') {
          eventSource.close();
        }
      } catch (error) {
        console.error("Failed to parse SSE data:", error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      eventSource.close();
      
      // Fall back to fetching once on error
      apiRequest(`/api/creatives/analyses/${currentJobId}`, "GET")
        .then(res => res.json())
        .then(data => setJobStatus(data))
        .catch(err => console.error("Failed to fetch job status:", err));
    };
    
    // Cleanup on unmount or when jobId changes
    return () => {
      eventSource.close();
    };
  }, [currentJobId]);

  // Create analysis job
  const createAnalysisMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/creatives/analyses", "POST", {
        creativeIds: Array.from(selectedCreatives),
        analysisType,
        model: analysisModel
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentJobId(data.jobId);
      setAnalysisSheetOpen(true);
      toast({
        title: "Análise iniciada",
        description: `Analisando ${selectedCreatives.size} criativos`
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao iniciar análise",
        variant: "destructive"
      });
    }
  });

  // Refresh creatives from Facebook
  const refreshCreativesMutation = useMutation({
    mutationFn: async () => {
      // Only refresh if there are selected campaigns
      if (selectedCampaignIds.length === 0) {
        throw new Error("Nenhuma campanha selecionada");
      }
      const campaignParam = `&campaignIds=${selectedCampaignIds.join(',')}`;
      const response = await apiRequest(`/api/creatives?operationId=${operationId}${campaignParam}&refresh=true`, "GET");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creatives"] });
      toast({
        title: "Atualizado",
        description: "Criativos sincronizados com Facebook Ads (dados históricos completos)"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao sincronizar criativos",
        variant: "destructive"
      });
    }
  });

  // Effect to clear job when analysis completes
  useEffect(() => {
    if (jobStatus?.status === 'completed') {
      queryClient.invalidateQueries({ queryKey: ["/api/creatives/analyzed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/creatives"] });
      
      // Clear the current job ID after successful completion
      setTimeout(() => {
        setCurrentJobId(null);
        setJobStatus(null);
      }, 3000);
      
      toast({
        title: "Análise concluída",
        description: `${selectedCreatives.size} criativos analisados com sucesso`
      });
      
      setSelectedCreatives(new Set());
      setTimeout(() => {
        setCurrentJobId(null);
        setAnalysisSheetOpen(false);
      }, 3000);
    }
  }, [jobStatus?.status]);

  const handleSelectAll = () => {
    if (selectedCreatives.size === creatives.length) {
      setSelectedCreatives(new Set());
    } else {
      setSelectedCreatives(new Set(creatives.map(c => c.id)));
    }
  };

  const toggleCreativeSelection = (creativeId: string) => {
    const newSelection = new Set(selectedCreatives);
    if (newSelection.has(creativeId)) {
      newSelection.delete(creativeId);
    } else {
      newSelection.add(creativeId);
    }
    setSelectedCreatives(newSelection);
  };

  const getCreativeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      case 'carousel': return <BarChart3 className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getAnalysisTypeIcon = (type: string) => {
    switch (type) {
      case 'audit': return <Eye className="w-4 h-4" />;
      case 'angles': return <Target className="w-4 h-4" />;
      case 'copy': return <FileText className="w-4 h-4" />;
      case 'variants': return <Zap className="w-4 h-4" />;
      case 'performance': return <TrendingUp className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Creative Intelligence</h1>
            <p className="text-muted-foreground">Análise inteligente de criativos com IA</p>
          </div>
        </div>
        
        <Button 
          onClick={() => refreshCreativesMutation.mutate()}
          disabled={refreshCreativesMutation.isPending}
          data-testid="button-refresh-creatives"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshCreativesMutation.isPending ? 'animate-spin' : ''}`} />
          Sincronizar
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex gap-4 flex-wrap items-center">
            {/* Campaign Info */}
            <div className="flex items-center gap-2 ml-auto">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {selectedCampaignsFromAds.length > 0 
                  ? `${selectedCampaignsFromAds.length} campanhas selecionadas na página de Anúncios`
                  : "Nenhuma campanha selecionada"
                }
              </span>
            </div>
          </div>

          {/* Show selected campaigns */}
          {selectedCampaignsFromAds.length === 0 ? (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-400">
                Para analisar criativos, primeiro selecione as campanhas desejadas na página de Anúncios.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedCampaignsFromAds.map((campaign: any) => (
                <Badge key={campaign.campaignId} variant="secondary" className="text-xs">
                  {campaign.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* New Creatives Section - 50% width */}
      {newCreatives.length > 0 && (
        <div className="w-1/2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-green-500" />
                Novos Criativos ({newCreatives.length})
              </h2>
            </div>
            
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {newCreatives.map((creative: AdCreative) => (
                <div 
                  key={creative.id} 
                  className={`group relative border border-border/50 rounded-xl p-4 hover:bg-muted/30 cursor-pointer transition-all duration-200 ${
                    selectedCreatives.has(creative.id) 
                      ? 'ring-2 ring-primary bg-primary/5 border-primary/20' 
                      : 'hover:border-border'
                  }`}
                  onClick={() => toggleCreativeSelection(creative.id)}
                  data-testid={`card-new-creative-${creative.id}`}
                >
                  <div className="flex items-center gap-4">
                    {/* Checkbox */}
                    <Checkbox
                      checked={selectedCreatives.has(creative.id)}
                      onCheckedChange={() => toggleCreativeSelection(creative.id)}
                      className="flex-shrink-0"
                      data-testid={`checkbox-new-creative-${creative.id}`}
                    />
                    
                    {/* Thumbnail - small and square */}
                    <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      {creative.thumbnailUrl ? (
                        <img 
                          src={creative.thumbnailUrl} 
                          alt={creative.name || 'Novo Criativo'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate mb-1" title={creative.name || 'Sem nome'}>
                            {creative.name || 'Sem nome'}
                          </h3>
                          <Badge variant="outline" className="text-xs px-2 py-0.5">
                            Novo
                          </Badge>
                        </div>
                        
                        {/* Priority Metrics */}
                        <div className="flex items-center gap-6 ml-4">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">CPM</p>
                            <p className="text-sm font-medium text-blue-600">
                              {creative.cpm ? formatCurrency(Number(creative.cpm)) : '--'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">CPC</p>
                            <p className="text-sm font-medium text-green-600">
                              {creative.cpc ? formatCurrency(Number(creative.cpc)) : '--'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">CTR</p>
                            <p className="text-sm font-medium text-purple-600">
                              {creative.ctr ? `${(Number(creative.ctr) * 100).toFixed(2)}%` : '--'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Resultados</p>
                            <p className="text-sm font-medium text-orange-600">
                              {creative.conversions !== null && creative.conversions !== undefined ? creative.conversions : '--'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {newCreatives.length > 0 && (
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  Estes criativos ainda não foram analisados. Selecione-os para incluir na análise.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}


      {/* Analysis Progress Sheet */}
      <Sheet open={analysisSheetOpen} onOpenChange={setAnalysisSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Análise em Progresso</SheetTitle>
            <SheetDescription>
              Analisando {selectedCreatives.size} criativos com IA
            </SheetDescription>
          </SheetHeader>
          
          {jobStatus && (
            <div className="mt-6 space-y-6">
              {/* Overall Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progresso geral</span>
                  <span>{jobStatus.progress}%</span>
                </div>
                <Progress value={jobStatus.progress} />
                <p className="text-xs text-muted-foreground">{jobStatus.currentStep}</p>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {jobStatus.status === 'running' && (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm">Processando...</span>
                  </>
                )}
                {jobStatus.status === 'completed' && (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Concluído!</span>
                  </>
                )}
                {jobStatus.status === 'failed' && (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm">Erro: {jobStatus.error}</span>
                  </>
                )}
              </div>

              {/* Cost Tracking */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Custo estimado</p>
                  <p className="font-medium">
                    {formatCurrency(jobStatus.costEstimate * 5.5)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Custo atual</p>
                  <p className="font-medium">
                    {formatCurrency(jobStatus.actualCost * 5.5)}
                  </p>
                </div>
              </div>

              {/* Per Creative Status */}
              {jobStatus.perCreativeStatus && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Status por criativo</h4>
                  <div className="space-y-2">
                    {jobStatus.perCreativeStatus.map((creative, idx) => (
                      <div key={creative.creativeId} className="flex items-center justify-between">
                        <span className="text-sm">Criativo {idx + 1}</span>
                        <Badge variant={
                          creative.status === 'completed' ? 'default' :
                          creative.status === 'analyzing' ? 'secondary' :
                          creative.status === 'failed' ? 'destructive' :
                          'outline'
                        }>
                          {creative.status === 'pending' && 'Aguardando'}
                          {creative.status === 'analyzing' && 'Analisando'}
                          {creative.status === 'completed' && 'Concluído'}
                          {creative.status === 'failed' && 'Erro'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}