import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Layout,
  Plus,
  Edit,
  Trash2,
  Eye,
  Globe,
  FileCode,
  Upload,
  Check,
  X,
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
  slug: string;
  status: 'draft' | 'active' | 'archived';
  htmlContent: string;
  cssContent?: string;
  jsContent?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AffiliatesLandingPages() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<LandingPage | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    htmlContent: "",
    cssContent: "",
    jsContent: "",
  });

  const { data: pages = [], isLoading } = useQuery<LandingPage[]>({
    queryKey: ['/api/affiliate/landing-pages/list'],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/affiliate/landing-pages/list', {
        credentials: 'include',
        headers
      });
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/affiliate/landing-pages', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/landing-pages/list'] });
      toast({
        title: "Landing page criada!",
        description: "A landing page foi criada com sucesso.",
      });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar landing page",
        description: error.message || "Não foi possível criar a landing page.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest(`/api/affiliate/landing-pages/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/landing-pages/list'] });
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
      return await apiRequest(`/api/affiliate/landing-pages/${pageId}/activate`, 'POST', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/landing-pages/list'] });
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
      return await apiRequest(`/api/affiliate/landing-pages/${pageId}/archive`, 'POST', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/landing-pages/list'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/landing-pages/list'] });
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

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      htmlContent: "",
      cssContent: "",
      jsContent: "",
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
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
      slug: page.slug,
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
        <Button 
          onClick={() => setCreateDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="button-create-page"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Landing Page
        </Button>
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
                          <p className="text-sm text-gray-400">/{page.slug}</p>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(page)}
                          className="text-gray-400 hover:text-white hover:bg-gray-500/10"
                        >
                          <Edit className="h-4 w-4" />
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

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#252525] text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Landing Page</DialogTitle>
            <DialogDescription className="text-gray-400">
              Crie uma nova landing page para seus afiliados
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-gray-300">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Landing Page Principal"
                  className="bg-[#0f0f0f] border-[#252525] text-white"
                />
              </div>
              <div>
                <Label htmlFor="slug" className="text-gray-300">Slug (URL)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="Ex: principal"
                  className="bg-[#0f0f0f] border-[#252525] text-white"
                />
              </div>
            </div>

            <Tabs defaultValue="html" className="w-full">
              <TabsList className="bg-[#0f0f0f] border border-[#252525]">
                <TabsTrigger value="html">HTML</TabsTrigger>
                <TabsTrigger value="css">CSS</TabsTrigger>
                <TabsTrigger value="js">JavaScript</TabsTrigger>
              </TabsList>
              <TabsContent value="html">
                <div>
                  <Label htmlFor="htmlContent" className="text-gray-300">HTML</Label>
                  <Textarea
                    id="htmlContent"
                    value={formData.htmlContent}
                    onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                    placeholder="Cole o código HTML da landing page"
                    className="bg-[#0f0f0f] border-[#252525] text-white font-mono min-h-[300px]"
                  />
                </div>
              </TabsContent>
              <TabsContent value="css">
                <div>
                  <Label htmlFor="cssContent" className="text-gray-300">CSS (Opcional)</Label>
                  <Textarea
                    id="cssContent"
                    value={formData.cssContent}
                    onChange={(e) => setFormData({ ...formData, cssContent: e.target.value })}
                    placeholder="Cole o código CSS"
                    className="bg-[#0f0f0f] border-[#252525] text-white font-mono min-h-[300px]"
                  />
                </div>
              </TabsContent>
              <TabsContent value="js">
                <div>
                  <Label htmlFor="jsContent" className="text-gray-300">JavaScript (Opcional)</Label>
                  <Textarea
                    id="jsContent"
                    value={formData.jsContent}
                    onChange={(e) => setFormData({ ...formData, jsContent: e.target.value })}
                    placeholder="Cole o código JavaScript"
                    className="bg-[#0f0f0f] border-[#252525] text-white font-mono min-h-[300px]"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setCreateDialogOpen(false);
                resetForm();
              }}
              className="text-gray-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.name || !formData.slug || !formData.htmlContent || createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createMutation.isPending ? "Criando..." : "Criar Landing Page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#252525] text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Landing Page</DialogTitle>
            <DialogDescription className="text-gray-400">
              Atualize o conteúdo da landing page
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                <Label htmlFor="edit-slug" className="text-gray-300">Slug (URL)</Label>
                <Input
                  id="edit-slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="bg-[#0f0f0f] border-[#252525] text-white"
                />
              </div>
            </div>

            <Tabs defaultValue="html" className="w-full">
              <TabsList className="bg-[#0f0f0f] border border-[#252525]">
                <TabsTrigger value="html">HTML</TabsTrigger>
                <TabsTrigger value="css">CSS</TabsTrigger>
                <TabsTrigger value="js">JavaScript</TabsTrigger>
              </TabsList>
              <TabsContent value="html">
                <div>
                  <Label htmlFor="edit-htmlContent" className="text-gray-300">HTML</Label>
                  <Textarea
                    id="edit-htmlContent"
                    value={formData.htmlContent}
                    onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                    className="bg-[#0f0f0f] border-[#252525] text-white font-mono min-h-[300px]"
                  />
                </div>
              </TabsContent>
              <TabsContent value="css">
                <div>
                  <Label htmlFor="edit-cssContent" className="text-gray-300">CSS (Opcional)</Label>
                  <Textarea
                    id="edit-cssContent"
                    value={formData.cssContent}
                    onChange={(e) => setFormData({ ...formData, cssContent: e.target.value })}
                    className="bg-[#0f0f0f] border-[#252525] text-white font-mono min-h-[300px]"
                  />
                </div>
              </TabsContent>
              <TabsContent value="js">
                <div>
                  <Label htmlFor="edit-jsContent" className="text-gray-300">JavaScript (Opcional)</Label>
                  <Textarea
                    id="edit-jsContent"
                    value={formData.jsContent}
                    onChange={(e) => setFormData({ ...formData, jsContent: e.target.value })}
                    className="bg-[#0f0f0f] border-[#252525] text-white font-mono min-h-[300px]"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
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
              disabled={!formData.name || !formData.slug || !formData.htmlContent || updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
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
