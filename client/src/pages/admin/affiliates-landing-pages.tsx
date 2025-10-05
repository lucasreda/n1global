import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Layout,
  Plus,
  Edit,
  Trash2,
  Eye,
  Globe,
  FileCode,
  FileText,
  Code,
  Upload,
  Check,
  X,
  Loader2,
  Settings,
  Copy,
  ExternalLink,
  Wand2,
  ArrowLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface LandingPage {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'archived';
  htmlContent: string;
  cssContent?: string;
  jsContent?: string;
  model?: any;
  thumbnailUrl?: string;
  tags?: string[];
  vercelProjectId?: string;
  vercelDeploymentUrl?: string;
  lastDeployedAt?: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export default function AffiliatesLandingPages() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [deploySuccessDialogOpen, setDeploySuccessDialogOpen] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string>("");
  const [selectedPage, setSelectedPage] = useState<LandingPage | null>(null);
  const [deployingLandingPageId, setDeployingLandingPageId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    htmlContent: "",
    cssContent: "",
    jsContent: "",
  });
  
  const [currentStep, setCurrentStep] = useState(1);
  const [creationMethod, setCreationMethod] = useState<'blank' | 'html' | null>(null);
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const vercelConnected = urlParams.get('vercel_connected');
    const vercelError = urlParams.get('vercel_error');

    if (vercelConnected === 'true') {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/landing-pages/vercel/status'] });
      toast({
        title: "✅ Conta Vercel conectada!",
        description: "Sua integração com Vercel foi configurada com sucesso.",
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (vercelError === 'true') {
      toast({
        title: "❌ Erro ao conectar Vercel",
        description: "Não foi possível conectar sua conta Vercel. Tente novamente.",
        variant: "destructive",
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  const { data: pages = [], isLoading } = useQuery<LandingPage[]>({
    queryKey: ['/api/affiliate/landing-pages'],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/affiliate/landing-pages', {
        credentials: 'include',
        headers
      });
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/affiliate/landing-pages', 'POST', data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/landing-pages'] });
      toast({
        title: "Landing page criada!",
        description: "A landing page foi criada com sucesso.",
      });
      return data;
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar landing page",
        description: error.message || "Não foi possível criar a landing page.",
        variant: "destructive",
      });
    },
  });

  const convertToVisualMutation = useMutation({
    mutationFn: async (landingPageId: string) => {
      const response = await apiRequest(`/api/affiliate/landing-pages/${landingPageId}/convert-to-visual`, 'POST', {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "HTML convertido!",
        description: "O HTML foi convertido para o modelo visual com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao converter HTML",
        description: error.message || "Não foi possível converter o HTML.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest(`/api/affiliate/landing-pages/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/landing-pages'] });
      toast({
        title: "Landing page atualizada!",
        description: "A landing page foi atualizada com sucesso.",
      });
      setEditDialogOpen(false);
      setSelectedPage(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar landing page",
        description: error.message || "Não foi possível atualizar a landing page.",
        variant: "destructive",
      });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (pageId: string) => {
      return await apiRequest(`/api/affiliate/landing-pages/${pageId}/activate`, 'PATCH', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/landing-pages'] });
      toast({
        title: "Landing page ativada!",
        description: "A landing page foi ativada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao ativar landing page",
        description: error.message || "Não foi possível ativar a landing page.",
        variant: "destructive",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (pageId: string) => {
      return await apiRequest(`/api/affiliate/landing-pages/${pageId}/archive`, 'PATCH', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/landing-pages'] });
      toast({
        title: "Landing page arquivada!",
        description: "A landing page foi arquivada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao arquivar landing page",
        description: error.message || "Não foi possível arquivar a landing page.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (pageId: string) => {
      return await apiRequest(`/api/affiliate/landing-pages/${pageId}`, 'DELETE', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/landing-pages'] });
      toast({
        title: "Landing page excluída!",
        description: "A landing page foi excluída com sucesso.",
      });
      setDeleteDialogOpen(false);
      setSelectedPage(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir landing page",
        description: error.message || "Não foi possível excluir a landing page.",
        variant: "destructive",
      });
    },
  });

  const { data: linkedProducts = [], isLoading: isLoadingLinkedProducts } = useQuery({
    queryKey: ['/api/affiliate/landing-pages', selectedPage?.id, 'products'],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/affiliate/landing-pages/${selectedPage?.id}/products`, {
        credentials: 'include',
        headers
      });
      return await response.json();
    },
    enabled: !!selectedPage?.id && editDialogOpen,
  });

  const { data: allProducts = [], isLoading: isLoadingAllProducts } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/products', {
        credentials: 'include',
        headers
      });
      return await response.json();
    },
    enabled: editDialogOpen,
  });

  const linkProductMutation = useMutation({
    mutationFn: async ({ landingPageId, productId }: { landingPageId: string; productId: string }) => {
      return await apiRequest(`/api/affiliate/landing-pages/${landingPageId}/products/${productId}`, 'POST', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/landing-pages', selectedPage?.id, 'products'] });
      toast({
        title: "Produto vinculado!",
        description: "O produto foi vinculado à landing page com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao vincular produto",
        description: error.message || "Não foi possível vincular o produto.",
        variant: "destructive",
      });
    },
  });

  const unlinkProductMutation = useMutation({
    mutationFn: async ({ landingPageId, productId }: { landingPageId: string; productId: string }) => {
      return await apiRequest(`/api/affiliate/landing-pages/${landingPageId}/products/${productId}`, 'DELETE', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/landing-pages', selectedPage?.id, 'products'] });
      toast({
        title: "Produto desvinculado!",
        description: "O produto foi desvinculado da landing page com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao desvincular produto",
        description: error.message || "Não foi possível desvincular o produto.",
        variant: "destructive",
      });
    },
  });

  const { data: vercelStatus } = useQuery({
    queryKey: ['/api/affiliate/landing-pages/vercel/status'],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/affiliate/landing-pages/vercel/status', {
        credentials: 'include',
        headers
      });
      return await response.json();
    },
    enabled: settingsDialogOpen,
  });

  const deployMutation = useMutation({
    mutationFn: async (landingPageId: string) => {
      setDeployingLandingPageId(landingPageId);
      const response = await apiRequest(`/api/affiliate/landing-pages/${landingPageId}/deploy`, 'POST', {});
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/landing-pages'] });
      const fullUrl = data.deploymentUrl?.startsWith('http') 
        ? data.deploymentUrl 
        : `https://${data.deploymentUrl}`;
      setDeployedUrl(fullUrl);
      setDeploySuccessDialogOpen(true);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao fazer deploy",
        description: error.message || "Não foi possível fazer o deploy da landing page.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setDeployingLandingPageId(null);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      htmlContent: "",
      cssContent: "",
      jsContent: "",
    });
    setCurrentStep(1);
    setCreationMethod(null);
    setHtmlContent('');
  };

  const handleCreateBlank = async () => {
    const initialModel = {
      sections: [
        {
          id: `section_${Date.now()}`,
          type: 'content',
          name: 'Nova Seção',
          rows: [
            {
              id: `row_${Date.now()}`,
              columns: [
                {
                  id: `column_${Date.now()}`,
                  width: 'full',
                  elements: [
                    {
                      id: `element_${Date.now()}`,
                      type: 'heading',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    try {
      const newPage = await createMutation.mutateAsync({
        name: "Nova Landing Page",
        description: "",
        htmlContent: "",
        model: initialModel,
      });
      
      setCreateDialogOpen(false);
      resetForm();
      setLocation(`/inside/affiliates/landing-pages/${newPage.id}/edit`);
    } catch (error) {
      console.error("Error creating blank landing page:", error);
    }
  };

  const handleCreateFromHTML = async () => {
    if (!formData.name || !htmlContent) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e o conteúdo HTML.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newPage = await createMutation.mutateAsync({
        name: formData.name,
        description: formData.description,
        htmlContent: htmlContent,
      });
      
      await convertToVisualMutation.mutateAsync(newPage.id);
      
      setCreateDialogOpen(false);
      resetForm();
      setLocation(`/inside/affiliates/landing-pages/${newPage.id}/edit`);
    } catch (error) {
      console.error("Error creating landing page from HTML:", error);
    }
  };

  const handleEdit = () => {
    if (selectedPage) {
      updateMutation.mutate({
        id: selectedPage.id,
        data: formData,
      });
    }
  };

  const openEditDialog = (page: LandingPage) => {
    setSelectedPage(page);
    setFormData({
      name: page.name,
      description: page.description || "",
      htmlContent: page.htmlContent,
      cssContent: page.cssContent || "",
      jsContent: page.jsContent || "",
    });
    setEditDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: { label: "Rascunho", className: "bg-gray-500/20 text-gray-400 border-gray-500/50" },
      active: { label: "Ativa", className: "bg-green-500/20 text-green-400 border-green-500/50" },
      archived: { label: "Arquivada", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50" },
    };
    const variant = variants[status as keyof typeof variants];
    return (
      <Badge className={`${variant.className} border`}>
        {variant.label}
      </Badge>
    );
  };

  const activePages = pages.filter(p => p.status === 'active');
  const draftPages = pages.filter(p => p.status === 'draft');
  const archivedPages = pages.filter(p => p.status === 'archived');

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="page-title">Landing Pages</h1>
          <p className="text-gray-400">Gerencie as landing pages para seus afiliados</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => setSettingsDialogOpen(true)}
            variant="outline"
            className="border-[#333] hover:bg-[#252525]"
            data-testid="button-vercel-settings"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurações Vercel
          </Button>
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-create-page"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Landing Page
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-[#1a1a1a] border-[#252525]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Ativas</p>
                <p className="text-3xl font-bold text-green-500">{activePages.length}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#252525]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Rascunhos</p>
                <p className="text-3xl font-bold text-gray-400">{draftPages.length}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-gray-500/20 flex items-center justify-center">
                <Edit className="h-6 w-6 text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#252525]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Arquivadas</p>
                <p className="text-3xl font-bold text-yellow-500">{archivedPages.length}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <X className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pages List */}
      <Card className="bg-[#1a1a1a] border-[#252525]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Landing Pages
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-gray-400">
              Carregando landing pages...
            </div>
          ) : pages.length === 0 ? (
            <div className="text-center py-12">
              <Layout className="h-12 w-12 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 mb-2">Nenhuma landing page criada</p>
              <p className="text-sm text-gray-500">Crie sua primeira landing page para os afiliados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pages.map((page) => (
                <Card key={page.id} className="bg-[#0f0f0f] border-[#252525]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <Layout className="h-6 w-6 text-purple-500" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{page.name}</p>
                            {getStatusBadge(page.status)}
                          </div>
                          <p className="text-sm text-gray-400">{page.description || "Sem descrição"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {page.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => activateMutation.mutate(page.id)}
                            className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                            data-testid={`button-activate-${page.id}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Ativar
                          </Button>
                        )}
                        {page.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => archiveMutation.mutate(page.id)}
                            className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Arquivar
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPage(page);
                            setPreviewDialogOpen(true);
                          }}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {page.model ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/inside/affiliates/landing-pages/${page.id}/edit`)}
                            className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                            title="Editar com Editor Visual"
                            data-testid={`button-visual-edit-${page.id}`}
                          >
                            <Wand2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(page)}
                            className="text-gray-400 hover:text-white hover:bg-gray-500/10"
                            title="Editar HTML/CSS/JS"
                            data-testid={`button-edit-${page.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deployMutation.mutate(page.id)}
                          disabled={deployingLandingPageId === page.id || page.status !== 'active'}
                          className="text-green-400 hover:text-green-300 hover:bg-green-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={page.status !== 'active' ? 'Apenas landing pages ativas podem ser deployadas' : 'Fazer deploy no Vercel'}
                          data-testid={`button-deploy-${page.id}`}
                        >
                          {deployingLandingPageId === page.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPage(page);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog - Multi-step Modal */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="bg-[#1a1a1a] border-[#252525] text-white max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {currentStep === 1 ? 'Nova Landing Page' : 'Importar HTML'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {currentStep === 1 
                ? 'Escolha como você quer criar sua landing page'
                : 'Configure sua landing page e cole o código HTML'
              }
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex items-center gap-2 ${currentStep === 1 ? 'text-blue-400' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === 1 ? 'border-blue-400 bg-blue-400/20' : 'border-gray-600 bg-gray-600/20'
              }`}>
                1
              </div>
              <span className="text-sm font-medium">Método</span>
            </div>
            <div className={`flex-1 h-[2px] ${currentStep === 2 ? 'bg-blue-400' : 'bg-gray-600'}`} />
            <div className={`flex items-center gap-2 ${currentStep === 2 ? 'text-blue-400' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === 2 ? 'border-blue-400 bg-blue-400/20' : 'border-gray-600 bg-gray-600/20'
              }`}>
                2
              </div>
              <span className="text-sm font-medium">Configuração</span>
            </div>
          </div>

          {/* Step 1 - Choose Creation Method */}
          {currentStep === 1 && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Blank */}
                <Card 
                  className="bg-[#0f0f0f] border-[#252525] hover:border-blue-400/50 transition-all cursor-pointer group"
                  onClick={() => {
                    setCreationMethod('blank');
                  }}
                  data-testid="card-create-blank"
                >
                  <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                    <div className="h-16 w-16 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                      <FileText className="h-8 w-8 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Começar do Zero</h3>
                      <p className="text-sm text-gray-400">
                        Crie sua landing page usando o editor visual
                      </p>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateBlank();
                      }}
                      disabled={createMutation.isPending}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      data-testid="button-start-blank"
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Criando...
                        </>
                      ) : (
                        'Começar'
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Card 2: From HTML */}
                <Card 
                  className="bg-[#0f0f0f] border-[#252525] hover:border-purple-400/50 transition-all cursor-pointer group"
                  onClick={() => {
                    setCreationMethod('html');
                    setCurrentStep(2);
                  }}
                  data-testid="card-create-from-html"
                >
                  <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                    <div className="h-16 w-16 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                      <Code className="h-8 w-8 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Importar HTML</h3>
                      <p className="text-sm text-gray-400">
                        Cole seu código HTML e converta para o editor visual
                      </p>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreationMethod('html');
                        setCurrentStep(2);
                      }}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      data-testid="button-continue-html"
                    >
                      Continuar
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 2 - HTML Configuration */}
          {currentStep === 2 && creationMethod === 'html' && (
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="landing-page-name" className="text-gray-300">
                  Nome da Landing Page
                </Label>
                <Input
                  id="landing-page-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Landing Page Principal"
                  className="bg-[#0f0f0f] border-[#252525] text-white mt-2"
                  data-testid="input-landing-page-name"
                />
              </div>

              <div>
                <Label htmlFor="landing-page-description" className="text-gray-300">
                  Descrição (Opcional)
                </Label>
                <Input
                  id="landing-page-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Landing page para produtos premium"
                  className="bg-[#0f0f0f] border-[#252525] text-white mt-2"
                  data-testid="input-landing-page-description"
                />
              </div>

              <div>
                <Label htmlFor="html-content" className="text-gray-300">
                  Código HTML
                </Label>
                <Textarea
                  id="html-content"
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder="Cole o código HTML da sua landing page aqui..."
                  className="bg-[#0f0f0f] border-[#252525] text-white font-mono min-h-[300px] mt-2"
                  data-testid="textarea-html-content"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between">
            <div>
              {currentStep === 2 && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setCurrentStep(1);
                    setCreationMethod(null);
                  }}
                  className="text-gray-400 hover:text-white"
                  data-testid="button-back"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setCreateDialogOpen(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white"
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              {currentStep === 2 && creationMethod === 'html' && (
                <Button
                  onClick={handleCreateFromHTML}
                  disabled={!formData.name || !htmlContent || createMutation.isPending || convertToVisualMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                  data-testid="button-create-landing-page"
                >
                  {createMutation.isPending || convertToVisualMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {createMutation.isPending ? 'Criando...' : 'Convertendo...'}
                    </>
                  ) : (
                    'Criar Landing Page'
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Full Screen */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-none text-white w-screen h-screen max-w-none max-h-none p-0 m-0">
          <div className="w-full h-full overflow-y-auto">
            <div className="max-w-5xl mx-auto px-8 py-6">
              <DialogHeader className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-2xl">Editar Landing Page</DialogTitle>
                    <DialogDescription className="text-gray-400 mt-2">
                      Atualize o conteúdo e configure os produtos vinculados
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
                <div className="space-y-6">
                  {/* Informações Básicas */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-name" className="text-gray-300">Nome</Label>
                      <Input
                        id="edit-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="bg-[#0f0f0f] border-[#252525] text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-description" className="text-gray-300">Descrição (Opcional)</Label>
                      <Input
                        id="edit-description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Ex: Landing page para produtos premium"
                        className="bg-[#0f0f0f] border-[#252525] text-white"
                      />
                    </div>
                  </div>

                  {/* Abas principais: Conteúdo e Produtos */}
                  <Tabs defaultValue="content" className="w-full">
                    <TabsList className="bg-[#0f0f0f] border border-[#252525] w-full justify-start">
                      <TabsTrigger value="content" className="flex items-center gap-2">
                        <FileCode className="h-4 w-4" />
                        Conteúdo
                      </TabsTrigger>
                      <TabsTrigger value="products" className="flex items-center gap-2">
                        <Layout className="h-4 w-4" />
                        Produtos Vinculados
                      </TabsTrigger>
                    </TabsList>
                    
                    {/* Tab de Conteúdo (HTML/CSS/JS) */}
                    <TabsContent value="content" className="space-y-4 mt-6">
                      <Tabs defaultValue="html" className="w-full">
                        <TabsList className="bg-[#0f0f0f] border border-[#252525]">
                          <TabsTrigger value="html">HTML</TabsTrigger>
                          <TabsTrigger value="css">CSS</TabsTrigger>
                          <TabsTrigger value="js">JavaScript</TabsTrigger>
                        </TabsList>
                        <TabsContent value="html">
                          <div>
                            <Label htmlFor="edit-htmlContent" className="text-gray-300 mb-2 block">HTML</Label>
                            <Textarea
                              id="edit-htmlContent"
                              value={formData.htmlContent}
                              onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                              className="bg-[#0f0f0f] border-[#252525] text-white font-mono min-h-[400px]"
                            />
                          </div>
                        </TabsContent>
                        <TabsContent value="css">
                          <div>
                            <Label htmlFor="edit-cssContent" className="text-gray-300 mb-2 block">CSS (Opcional)</Label>
                            <Textarea
                              id="edit-cssContent"
                              value={formData.cssContent}
                              onChange={(e) => setFormData({ ...formData, cssContent: e.target.value })}
                              className="bg-[#0f0f0f] border-[#252525] text-white font-mono min-h-[400px]"
                            />
                          </div>
                        </TabsContent>
                        <TabsContent value="js">
                          <div>
                            <Label htmlFor="edit-jsContent" className="text-gray-300 mb-2 block">JavaScript (Opcional)</Label>
                            <Textarea
                              id="edit-jsContent"
                              value={formData.jsContent}
                              onChange={(e) => setFormData({ ...formData, jsContent: e.target.value })}
                              className="bg-[#0f0f0f] border-[#252525] text-white font-mono min-h-[400px]"
                            />
                          </div>
                        </TabsContent>
                      </Tabs>
                    </TabsContent>

                    {/* Tab de Produtos */}
                    <TabsContent value="products" className="mt-6">
                      <div className="bg-[#0f0f0f] rounded-lg border border-[#252525] p-6">
                        <h3 className="text-lg font-semibold mb-4">Vincular Produtos</h3>
                        <p className="text-gray-400 text-sm mb-6">
                          Selecione os produtos que terão acesso a esta landing page. Afiliados que se filiarem a estes produtos receberão automaticamente esta landing page.
                        </p>
                        
                        {isLoadingAllProducts || isLoadingLinkedProducts ? (
                          <div className="text-gray-500 text-center py-12">
                            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
                            <p>Carregando produtos...</p>
                          </div>
                        ) : allProducts.length === 0 ? (
                          <div className="text-gray-500 text-center py-12">
                            <Layout className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Nenhum produto cadastrado</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {allProducts.map((product: any) => {
                              const isLinked = linkedProducts.some((p: any) => p.id === product.id);
                              const isPending = linkProductMutation.isPending || unlinkProductMutation.isPending;
                              
                              return (
                                <div
                                  key={product.id}
                                  className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg border border-[#252525] hover:border-[#333] transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="checkbox"
                                      checked={isLinked}
                                      disabled={isPending}
                                      onChange={() => {
                                        if (selectedPage) {
                                          if (isLinked) {
                                            unlinkProductMutation.mutate({
                                              landingPageId: selectedPage.id,
                                              productId: product.id,
                                            });
                                          } else {
                                            linkProductMutation.mutate({
                                              landingPageId: selectedPage.id,
                                              productId: product.id,
                                            });
                                          }
                                        }
                                      }}
                                      className="h-5 w-5 rounded border-[#333] bg-[#0f0f0f] text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:opacity-50"
                                      data-testid={`checkbox-product-${product.id}`}
                                    />
                                    <div>
                                      <p className="font-medium text-white">{product.name}</p>
                                      {product.description && (
                                        <p className="text-sm text-gray-400 mt-0.5">{product.description}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {isLinked && (
                                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50 border">
                                        Vinculado
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Footer com botões */}
                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-[#252525]">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditDialogOpen(false);
                      setSelectedPage(null);
                      resetForm();
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleEdit}
                    disabled={!formData.name || !formData.htmlContent || updateMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </div>
            </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#252525] text-white">
          <DialogHeader>
            <DialogTitle>Excluir Landing Page</DialogTitle>
            <DialogDescription className="text-gray-400">
              Tem certeza que deseja excluir esta landing page? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedPage(null);
              }}
              className="text-gray-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => selectedPage && deleteMutation.mutate(selectedPage.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#252525] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configurações da Integração Vercel</DialogTitle>
            <DialogDescription className="text-gray-400">
              Conecte sua conta Vercel para fazer deploy automático das landing pages.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Status atual */}
            <div className={`${vercelStatus?.configured ? 'bg-green-500/10 border-green-500/20' : 'bg-yellow-500/10 border-yellow-500/20'} border rounded-lg p-4`}>
              <div className="flex gap-3">
                {vercelStatus?.configured ? (
                  <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <X className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 flex-1">
                  <p className={`text-sm font-medium ${vercelStatus?.configured ? 'text-green-300' : 'text-yellow-300'}`}>
                    {vercelStatus?.configured ? 'Conta Vercel Conectada ✓' : 'Conta Não Conectada'}
                  </p>
                  <p className="text-sm text-gray-400">
                    {vercelStatus?.configured 
                      ? 'A integração com Vercel está ativa. Você pode fazer deploy de landing pages.'
                      : 'Conecte sua conta Vercel para habilitar deploys automáticos.'}
                  </p>
                  {vercelStatus?.integration && (
                    <div className="mt-3 text-xs text-gray-500 space-y-1">
                      <p>User ID: <span className="text-gray-400">{vercelStatus.integration.vercelUserId}</span></p>
                      {vercelStatus.integration.vercelTeamId && (
                        <p>Team ID: <span className="text-gray-400">{vercelStatus.integration.vercelTeamId}</span></p>
                      )}
                      <p>Conectado em: <span className="text-gray-400">{new Date(vercelStatus.integration.connectedAt).toLocaleString('pt-BR')}</span></p>
                      {vercelStatus.integration.lastUsed && (
                        <p>Último uso: <span className="text-gray-400">{new Date(vercelStatus.integration.lastUsed).toLocaleString('pt-BR')}</span></p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex gap-3">
                <Globe className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm text-blue-300 font-medium">Conta Centralizada da Empresa</p>
                  <p className="text-sm text-gray-400">
                    Todas as landing pages serão deployadas na mesma conta Vercel da empresa. 
                    Cada landing page terá seu próprio projeto e URL única.
                  </p>
                </div>
              </div>
            </div>

            {!vercelStatus?.configured && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <div className="flex gap-3">
                  <Settings className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-3">
                    <p className="text-sm text-purple-300 font-medium">Como conectar?</p>
                    <div className="text-sm text-gray-400 space-y-2">
                      <p>
                        Clique no botão "Conectar com Vercel" abaixo. Você será redirecionado para fazer login na sua conta Vercel e autorizar a integração.
                      </p>
                      <p className="text-xs text-gray-500">
                        A autorização é segura e permite que o sistema faça deploy de landing pages automaticamente na sua conta.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setSettingsDialogOpen(false);
              }}
              className="text-gray-400 hover:text-white"
            >
              Fechar
            </Button>
            {!vercelStatus?.configured ? (
              <Button
                onClick={async () => {
                  try {
                    const response = await apiRequest('/api/affiliate/landing-pages/vercel/oauth-url', 'GET') as any;
                    if (response?.oauthUrl) {
                      window.location.href = response.oauthUrl;
                    }
                  } catch (error: any) {
                    toast({
                      title: "Erro ao gerar URL OAuth",
                      description: error.message || "Não foi possível gerar a URL de autenticação.",
                      variant: "destructive",
                    });
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-connect-vercel"
              >
                <Globe className="h-4 w-4 mr-2" />
                Conectar com Vercel
              </Button>
            ) : (
              <Button
                onClick={async () => {
                  try {
                    const response = await apiRequest('/api/affiliate/landing-pages/vercel/oauth-url', 'GET') as any;
                    if (response?.oauthUrl) {
                      window.location.href = response.oauthUrl;
                    }
                  } catch (error: any) {
                    toast({
                      title: "Erro ao gerar URL OAuth",
                      description: error.message || "Não foi possível gerar a URL de autenticação.",
                      variant: "destructive",
                    });
                  }
                }}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-reconnect-vercel"
              >
                <Globe className="h-4 w-4 mr-2" />
                Reconectar Vercel
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deploy Success Dialog */}
      <Dialog open={deploySuccessDialogOpen} onOpenChange={setDeploySuccessDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#252525] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Deploy Realizado com Sucesso!
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Sua landing page foi deployada na Vercel e está disponível online.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* URL Section */}
            <div className="bg-[#0f0f0f] border border-[#252525] rounded-lg p-4">
              <Label className="text-sm text-gray-400 mb-2 block">URL da Landing Page</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={deployedUrl}
                  readOnly
                  className="bg-[#1a1a1a] border-[#252525] text-white flex-1 font-mono text-sm"
                  data-testid="input-deployed-url"
                />
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(deployedUrl);
                    toast({
                      title: "URL copiada!",
                      description: "A URL foi copiada para a área de transferência.",
                    });
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-copy-url"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => window.open(deployedUrl, '_blank')}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-open-url"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex gap-3">
                <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm text-green-300 font-medium">Landing Page Online</p>
                  <p className="text-sm text-gray-400">
                    Sua landing page está acessível publicamente na URL acima. Você pode compartilhar este link com seus afiliados.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setDeploySuccessDialogOpen(false);
                setDeployedUrl("");
              }}
              className="text-gray-400 hover:text-white"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#252525] text-white max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Preview: {selectedPage?.name}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Visualização da landing page
            </DialogDescription>
          </DialogHeader>
          <div className="bg-white rounded-lg overflow-hidden" style={{ height: '600px' }}>
            {selectedPage && (
              <iframe
                srcDoc={selectedPage.htmlContent}
                className="w-full h-full"
                title="Landing Page Preview"
                sandbox="allow-scripts"
              />
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setPreviewDialogOpen(false);
                setSelectedPage(null);
              }}
              className="bg-gray-600 hover:bg-gray-700"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
