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
  ChevronRight,
  ChevronLeft,
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
  const [currentPage, setCurrentPage] = useState(1);
  const creativesPerPage = 8;

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

  // Fetch new creatives that haven't been analyzed
  const { data: newCreatives = [] } = useQuery({
    queryKey: ["/api/creatives/new", operationId],
    queryFn: async () => {
      const response = await apiRequest(`/api/creatives/new?operationId=${operationId}`, "GET");
      return response.json() as Promise<AdCreative[]>;
    },
    enabled: !!operationId
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

  // Pagination logic
  const totalPages = Math.ceil(creatives.length / creativesPerPage);
  const startIndex = (currentPage - 1) * creativesPerPage;
  const endIndex = startIndex + creativesPerPage;
  const paginatedCreatives = creatives.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCampaignIds.length]);

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
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

      {/* New Creatives Section */}
      {newCreatives.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-500" />
              Novos Criativos ({newCreatives.length})
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {newCreatives.map((creative: AdCreative) => (
              <div 
                key={creative.id} 
                className="border rounded-lg p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => toggleCreativeSelection(creative.id)}
                data-testid={`card-new-creative-${creative.id}`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedCreatives.has(creative.id)}
                    onCheckedChange={() => toggleCreativeSelection(creative.id)}
                    className="mt-1"
                    data-testid={`checkbox-new-creative-${creative.id}`}
                  />
                  
                  <div className="flex-1 min-w-0">
                    {/* Thumbnail */}
                    {creative.thumbnailUrl && (
                      <div className="w-full h-24 bg-muted rounded-md overflow-hidden mb-2">
                        <img 
                          src={creative.thumbnailUrl} 
                          alt={creative.name || 'Novo Criativo'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    {/* Content */}
                    <div className="space-y-1">
                      <h3 className="font-medium text-sm truncate" title={creative.name || 'Sem nome'}>
                        {creative.name || 'Sem nome'}
                      </h3>
                      {creative.primaryText && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {creative.primaryText}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          Novo
                        </Badge>
                        <span>•</span>
                        <span>{creative.impressions?.toLocaleString() || 0} impressões</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {newCreatives.length > 0 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Estes criativos ainda não foram analisados. Selecione-os para incluir na análise.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Best Ads Section */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Melhores Ads ({creatives.length})
              </h2>
              {totalPages > 1 && (
                <div className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </div>
              )}
            </div>
            
            {/* Analysis Controls */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  data-testid="button-select-all"
                >
                  {selectedCreatives.size === creatives.length ? "Desmarcar todos" : "Selecionar todos"}
                </Button>
                
                <span className="text-sm text-muted-foreground">
                  {selectedCreatives.size} de {creatives.length} selecionados
                </span>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <Select value={analysisType} onValueChange={setAnalysisType}>
                  <SelectTrigger className="w-[180px]" data-testid="select-analysis-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="audit">
                      <div className="flex items-center">
                        <Eye className="w-4 h-4 mr-2" />
                        Auditoria Completa
                      </div>
                    </SelectItem>
                    <SelectItem value="angles">
                      <div className="flex items-center">
                        <Target className="w-4 h-4 mr-2" />
                        Ângulos de Marketing
                      </div>
                    </SelectItem>
                    <SelectItem value="copy">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        Otimização de Copy
                      </div>
                    </SelectItem>
                    <SelectItem value="variants">
                      <div className="flex items-center">
                        <Zap className="w-4 h-4 mr-2" />
                        Gerar Variações
                      </div>
                    </SelectItem>
                    <SelectItem value="performance">
                      <div className="flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Análise de Performance
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select value={analysisModel} onValueChange={setAnalysisModel}>
                  <SelectTrigger className="w-[180px]" data-testid="select-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4-turbo-preview">GPT-4 Turbo</SelectItem>
                    <SelectItem value="gpt-4-vision-preview">GPT-4 Vision</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={() => createAnalysisMutation.mutate()}
                  disabled={selectedCreatives.size === 0 || createAnalysisMutation.isPending}
                  data-testid="button-analyze"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Analisar {selectedCreatives.size > 0 && `(${selectedCreatives.size})`}
                  {costEstimate && (
                    <span className="ml-2 text-xs opacity-80">
                      ~{formatCurrency(costEstimate.estimatedCostBRL)}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Creatives Grid */}
          {creativesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : creatives.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                Nenhum criativo encontrado. Sincronize suas campanhas do Facebook Ads.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-4">
              {paginatedCreatives.map((creative) => (
                <Card 
                  key={creative.id}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedCreatives.has(creative.id) ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => toggleCreativeSelection(creative.id)}
                  data-testid={`card-creative-${creative.id}`}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedCreatives.has(creative.id)}
                          onCheckedChange={() => toggleCreativeSelection(creative.id)}
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`checkbox-creative-${creative.id}`}
                        />
                        {getCreativeIcon(creative.type || 'unknown')}
                        <Badge variant={creative.isAnalyzed ? "secondary" : "outline"}>
                          {creative.isAnalyzed ? "Analisado" : "Novo"}
                        </Badge>
                      </div>
                    </div>

                    {/* Thumbnail */}
                    {creative.thumbnailUrl && (
                      <div className="aspect-video bg-muted rounded-md overflow-hidden">
                        <img 
                          src={creative.thumbnailUrl} 
                          alt={creative.name || 'Creative'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm line-clamp-1">
                        {creative.headline || creative.name || 'Sem título'}
                      </h4>
                      {creative.primaryText && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {creative.primaryText}
                        </p>
                      )}
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">CTR</p>
                        <p className="text-sm font-medium" data-testid={`text-ctr-${creative.id}`}>
                          {parseFloat(creative.ctr || "0").toFixed(2)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">CPC</p>
                        <p className="text-sm font-medium" data-testid={`text-cpc-${creative.id}`}>
                          {formatCurrency(parseFloat(creative.cpc || "0"))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Impressões</p>
                        <p className="text-sm font-medium" data-testid={`text-impressions-${creative.id}`}>
                          {creative.impressions?.toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Gasto</p>
                        <p className="text-sm font-medium" data-testid={`text-spend-${creative.id}`}>
                          {formatCurrency(parseFloat(creative.spend || "0"))}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1}-{Math.min(endIndex, creatives.length)} de {creatives.length} criativos
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    data-testid="button-previous-page"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                        data-testid={`button-page-${pageNum}`}
                      >
                        {pageNum}
                      </Button>
                    ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    data-testid="button-next-page"
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Analyzed Section */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                Analisados ({analyzedCreatives.length})
              </h2>
            
            {analyzedCreatives.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-muted-foreground">
                  Nenhum criativo analisado ainda. Selecione criativos e clique em Analisar.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[800px] overflow-y-auto">
              {analyzedCreatives.map((item: any) => (
                <Card key={item.analysis.id} className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    {item.creative.thumbnailUrl && (
                      <div className="w-24 h-24 bg-muted rounded-md overflow-hidden flex-shrink-0">
                        <img 
                          src={item.creative.thumbnailUrl} 
                          alt={item.creative.name || 'Creative'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Analysis Results */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm line-clamp-1">
                            {item.creative.headline || item.creative.name || 'Criativo'}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {getAnalysisTypeIcon(item.analysis.analysisType)}
                            <span className="text-xs text-muted-foreground">
                              {item.analysis.analysisType === 'audit' && 'Auditoria'}
                              {item.analysis.analysisType === 'angles' && 'Ângulos'}
                              {item.analysis.analysisType === 'copy' && 'Copy'}
                              {item.analysis.analysisType === 'variants' && 'Variações'}
                              {item.analysis.analysisType === 'performance' && 'Performance'}
                            </span>
                            <Badge variant="outline" className="text-xs py-0">
                              {item.analysis.model.replace('-preview', '')}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Insights */}
                      {item.analysis.insights && (
                        <div className="space-y-1">
                          <h4 className="text-xs font-medium flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            Principais Insights
                          </h4>
                          <div className="space-y-0.5">
                            {(Array.isArray(item.analysis.insights) ? item.analysis.insights : [item.analysis.insights])
                              .slice(0, 2)
                              .map((insight: string, idx: number) => (
                                <p key={idx} className="text-xs text-muted-foreground line-clamp-2">
                                  • {insight}
                                </p>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Recommendations */}
                      {item.analysis.recommendations && (
                        <div className="space-y-1">
                          <h4 className="text-xs font-medium flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            Ações Recomendadas
                          </h4>
                          <div className="space-y-0.5">
                            {(Array.isArray(item.analysis.recommendations) ? item.analysis.recommendations : [item.analysis.recommendations])
                              .slice(0, 2)
                              .map((rec: string, idx: number) => (
                                <p key={idx} className="text-xs text-muted-foreground line-clamp-2">
                                  • {rec}
                                </p>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Scores */}
                      {item.analysis.scores && Object.keys(item.analysis.scores).length > 0 && (
                        <div className="flex gap-4">
                          {Object.entries(item.analysis.scores).slice(0, 4).map(([key, value]: [string, any]) => (
                            <div key={key} className="text-center">
                              <p className="text-xs text-muted-foreground capitalize">{key}</p>
                              <p className="text-lg font-bold">{value}/10</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              </div>
            )}
            </div>
          </Card>
        </div>
      </div>

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