import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  Package, 
  Plus, 
  Edit3, 
  Trash2, 
  Pin, 
  Calendar, 
  ExternalLink,
  Star,
  AlertTriangle,
  Info,
  Wrench,
  Search,
  Check,
  X,
  ImageIcon,
  Save,
  Eye
} from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import type { Announcement, MarketplaceProduct, Product } from '@shared/schema';

interface CreateAnnouncementModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ViewAnnouncementModalProps {
  open: boolean;
  onClose: () => void;
  announcement: Announcement | null;
}

interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productName: string;
  isLoading: boolean;
}

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateAnnouncementModal({ open, onClose, onSuccess }: CreateAnnouncementModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [type, setType] = useState('general');
  const [isPinned, setIsPinned] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      content: string;
      type: string;
      isPinned: boolean;
      imageFile?: File;
    }) => {
      const token = localStorage.getItem("auth_token");
      const formData = new FormData();
      
      formData.append('title', data.title);
      formData.append('content', data.content);
      formData.append('type', data.type);
      formData.append('isPinned', data.isPinned.toString());
      
      if (data.imageFile) {
        formData.append('image', data.imageFile);
      }

      const response = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar anúncio');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Anúncio criado!",
        description: "O novo anúncio foi publicado com sucesso.",
      });
      onSuccess();
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    }
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, digite um título para o anúncio.",
      });
      return;
    }

    if (!content.trim()) {
      toast({
        variant: "destructive",
        title: "Erro", 
        description: "Por favor, digite o conteúdo do anúncio.",
      });
      return;
    }

    createMutation.mutate({
      title,
      content,
      type,
      isPinned,
      imageFile: imageFile || undefined,
    });
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    setImageFile(null);
    setImagePreview('');
    setType('general');
    setIsPinned(false);
    setPreviewMode(false);
    onClose();
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub' }, { 'script': 'super' }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['blockquote', 'code-block'],
      ['clean']
    ],
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet', 'indent',
    'direction', 'align',
    'link', 'image', 'video',
    'blockquote', 'code-block'
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/95 backdrop-blur-sm">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-white/10 bg-black/20 backdrop-blur-md">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-blue-400" />
              <div>
                <h1 className="text-xl font-semibold text-white">
                  {previewMode ? 'Visualizar Anúncio' : 'Criar Novo Anúncio'}
                </h1>
                <p className="text-sm text-gray-400">
                  {previewMode ? 'Veja como ficará para os clientes' : 'Publique uma novidade para os clientes'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Eye className="w-4 h-4 mr-2" />
                {previewMode ? 'Editar' : 'Visualizar'}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || !title.trim() || !content.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {createMutation.isPending ? 'Salvando...' : 'Publicar'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {previewMode ? (
            /* Preview Mode */
            <div className="h-full overflow-auto p-8">
              <div className="max-w-4xl mx-auto">
                <Card className="bg-white/10 border-white/20 backdrop-blur-md">
                  <CardContent className="p-0">
                    {imagePreview && (
                      <div className="w-full h-64 overflow-hidden">
                        <img 
                          src={imagePreview} 
                          alt={title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Badge variant={type === 'update' ? 'default' : type === 'tip' ? 'secondary' : type === 'maintenance' ? 'destructive' : 'outline'}>
                          {type === 'update' ? 'Atualização' : type === 'tip' ? 'Dica' : type === 'maintenance' ? 'Manutenção' : 'Geral'}
                        </Badge>
                        {isPinned && (
                          <Badge variant="secondary">
                            <Pin className="w-3 h-3 mr-1" />
                            Fixado
                          </Badge>
                        )}
                      </div>
                      <h1 className="text-2xl font-bold text-white mb-4">{title || 'Título do anúncio'}</h1>
                      <div 
                        className="text-gray-300 prose prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: content || 'Conteúdo do anúncio...' }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            /* Edit Mode */
            <div className="h-full flex">
              {/* Left Panel - Form */}
              <div className="flex-1 p-8 overflow-auto">
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="title" className="text-white">Título do Anúncio</Label>
                        <Input
                          id="title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Digite o título do anúncio..."
                          className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="type" className="text-white">Categoria</Label>
                        <Select value={type} onValueChange={setType}>
                          <SelectTrigger className="bg-white/5 border-white/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem value="general">Geral</SelectItem>
                            <SelectItem value="update">Atualização</SelectItem>
                            <SelectItem value="tip">Dica</SelectItem>
                            <SelectItem value="maintenance">Manutenção</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-2">
                      <Label className="text-white">Imagem do Anúncio (Opcional)</Label>
                      <div className="border-2 border-dashed border-white/20 rounded-lg p-4 hover:border-white/40 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className="flex flex-col items-center justify-center cursor-pointer"
                        >
                          {imagePreview ? (
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="max-h-32 rounded-lg mb-2"
                            />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                          )}
                          <span className="text-sm text-gray-400">
                            {imagePreview ? 'Clique para alterar a imagem' : 'Clique para selecionar uma imagem'}
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Pin Option */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="pinned"
                        checked={isPinned}
                        onChange={(e) => setIsPinned(e.target.checked)}
                        className="rounded bg-white/5 border-white/20"
                      />
                      <Label htmlFor="pinned" className="text-white">
                        Fixar anúncio (aparecerá em destaque)
                      </Label>
                    </div>
                  </div>

                  {/* Rich Text Editor */}
                  <div className="space-y-2 flex-1 flex flex-col">
                    <Label className="text-white">Conteúdo do Anúncio</Label>
                    <div className="flex-1 overflow-hidden">
                      <style>
                        {`
                          .ql-toolbar {
                            background: transparent !important;
                            border: none !important;
                            border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                          }
                          .ql-toolbar .ql-stroke {
                            stroke: #ffffff !important;
                          }
                          .ql-toolbar .ql-fill {
                            fill: #ffffff !important;
                          }
                          .ql-toolbar .ql-picker-label {
                            color: #ffffff !important;
                          }
                          .ql-container {
                            background: transparent !important;
                            color: #ffffff !important;
                            border: none !important;
                            height: 100% !important;
                          }
                          .ql-editor {
                            background: transparent !important;
                            color: #ffffff !important;
                            border: none !important;
                            height: 100% !important;
                            min-height: 500px !important;
                          }
                          .ql-editor::before {
                            color: #9ca3af !important;
                          }
                          .quill {
                            height: 100% !important;
                            display: flex !important;
                            flex-direction: column !important;
                          }
                        `}
                      </style>
                      <ReactQuill
                        theme="snow"
                        value={content}
                        onChange={setContent}
                        modules={modules}
                        formats={formats}
                        placeholder="Digite o conteúdo do anúncio..."
                        style={{ 
                          height: '100%',
                          backgroundColor: 'transparent',
                          border: 'none'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ViewAnnouncementModal({ open, onClose, announcement }: ViewAnnouncementModalProps) {
  if (!announcement) return null;

  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case 'update':
        return <Star className="w-5 h-5" />;
      case 'tip':
        return <Info className="w-5 h-5" />;
      case 'maintenance':
        return <Wrench className="w-5 h-5" />;
      case 'general':
      default:
        return <TrendingUp className="w-5 h-5" />;
    }
  };

  const getAnnouncementBadge = (type: string) => {
    switch (type) {
      case 'update':
        return { variant: "default" as const, label: "Atualização" };
      case 'tip':
        return { variant: "secondary" as const, label: "Dica" };
      case 'maintenance':
        return { variant: "destructive" as const, label: "Manutenção" };
      case 'general':
      default:
        return { variant: "outline" as const, label: "Geral" };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="flex items-center gap-2">
              {getAnnouncementIcon(announcement.type)}
              <span>{announcement.title}</span>
            </div>
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge {...getAnnouncementBadge(announcement.type)}>
              {getAnnouncementBadge(announcement.type).label}
            </Badge>
            {announcement.isPinned && (
              <Badge variant="secondary">
                <Pin className="w-3 h-3 mr-1" />
                Fixado
              </Badge>
            )}
            <span className="text-xs text-slate-400 flex items-center ml-2">
              <Calendar className="w-3 h-3 mr-1" />
              {announcement.publishedAt ? new Date(announcement.publishedAt).toLocaleDateString('pt-BR', { 
                day: 'numeric', 
                month: 'long',
                year: 'numeric'
              }) : 'N/A'}
            </span>
          </div>
        </DialogHeader>

        <div className="mt-6">
          {announcement.imageUrl && (
            <div className="w-full h-64 mb-6 rounded-lg overflow-hidden">
              <img 
                src={announcement.imageUrl} 
                alt={announcement.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div 
            className="text-gray-300 prose prose-invert max-w-none leading-relaxed"
            dangerouslySetInnerHTML={{ __html: announcement.content }}
          />
        </div>

        <DialogFooter className="mt-8">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDeleteModal({ open, onClose, onConfirm, productName, isLoading }: ConfirmDeleteModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Confirmar Remoção
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Tem certeza que deseja remover "{productName}" da exibição para os clientes?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? 'Removendo...' : 'Remover'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddProductModal({ open, onClose, onSuccess }: AddProductModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available products
  const { data: availableProductsData, isLoading: productsLoading } = useQuery<{ data: Product[]; total: number }>({
    queryKey: ['/api/marketplace/available-products', searchTerm],
    enabled: open
  });

  // Add product to marketplace mutation
  const addProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch('/api/marketplace/products/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao adicionar produto');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/available-products'] });
      toast({
        title: "Produto adicionado",
        description: "O produto foi adicionado ao marketplace com sucesso.",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    }
  });

  const handleAddProduct = (productId: string) => {
    addProductMutation.mutate(productId);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Plus className="h-5 w-5 text-white" />
            Adicionar Produto ao Marketplace
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Selecione produtos do catálogo global para disponibilizar aos clientes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, descrição ou SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white"
            />
          </div>

          {/* Products List */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {productsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-white/20 rounded-lg p-4 bg-white/5">
                  <Skeleton className="h-4 w-3/4 mb-2 bg-white/20" />
                  <Skeleton className="h-3 w-1/2 mb-2 bg-white/20" />
                  <Skeleton className="h-8 w-24 bg-white/20" />
                </div>
              ))
            ) : availableProductsData?.data && availableProductsData.data.length > 0 ? (
              availableProductsData.data.map((product: Product) => (
                <div key={product.id} className="border border-white/20 rounded-lg p-4 bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-white">{product.name}</h4>
                        <Badge variant={product.type === 'nutraceutico' ? 'default' : 'secondary'}>
                          {product.type === 'nutraceutico' ? 'Nutracêutico' : 'Físico'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mb-1">{product.description || 'Sem descrição'}</p>
                      <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                      <p className="text-sm font-medium text-green-400">€{product.price}</p>
                    </div>
                    <Button
                      onClick={() => handleAddProduct(product.id)}
                      disabled={addProductMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      {addProductMutation.isPending ? (
                        'Adicionando...'
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Adicionar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{searchTerm ? 'Nenhum produto encontrado' : 'Todos os produtos já estão no marketplace'}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function HubControl() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [createAnnouncementModalOpen, setCreateAnnouncementModalOpen] = useState(false);
  const [viewAnnouncementModalOpen, setViewAnnouncementModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProductName, setSelectedProductName] = useState<string>('');

  // Fetch announcements
  const { 
    data: announcementsData, 
    isLoading: announcementsLoading 
  } = useQuery<{ data: Announcement[] }>({
    queryKey: ['/api/announcements']
  });

  // Fetch marketplace products
  const { 
    data: productsData, 
    isLoading: productsLoading 
  } = useQuery<{ data: MarketplaceProduct[] }>({
    queryKey: ['/api/marketplace/products']
  });

  // Remove product mutation
  const removeProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/marketplace/products/${productId}`, {
        method: 'DELETE',
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao remover produto');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/products'] });
      toast({
        title: "Produto removido",
        description: "O produto foi removido da exibição com sucesso.",
      });
      setDeleteModalOpen(false);
      setSelectedProductId('');
      setSelectedProductName('');
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    }
  });

  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case 'update':
        return <Star className="w-4 h-4" />;
      case 'tip':
        return <Info className="w-4 h-4" />;
      case 'maintenance':
        return <Wrench className="w-4 h-4" />;
      case 'general':
      default:
        return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getAnnouncementBadge = (type: string) => {
    switch (type) {
      case 'update':
        return { variant: "default" as const, label: "Atualização" };
      case 'tip':
        return { variant: "secondary" as const, label: "Dica" };
      case 'maintenance':
        return { variant: "destructive" as const, label: "Manutenção" };
      case 'general':
      default:
        return { variant: "outline" as const, label: "Geral" };
    }
  };

  const handleRemoveProduct = (productId: string, productName: string) => {
    setSelectedProductId(productId);
    setSelectedProductName(productName);
    setDeleteModalOpen(true);
  };

  const confirmRemoveProduct = () => {
    if (selectedProductId) {
      removeProductMutation.mutate(selectedProductId);
    }
  };

  const handleViewAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setViewAnnouncementModalOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Hub Control</h1>
        <p className="text-slate-300">Central de controle do que é exibido para os clientes no N1 Hub</p>
      </div>

        {/* Novidades Section - News Layout */}
        <div>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-semibold text-white">Últimas Novidades</h2>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setCreateAnnouncementModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
            <p className="text-slate-400">Gerencie as notícias exibidas para os clientes</p>
          </div>
          
          {announcementsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="h-48 bg-white/10 border-white/20 backdrop-blur-md">
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-20 mb-2 bg-white/20" />
                    <Skeleton className="h-6 w-full mb-3 bg-white/20" />
                    <Skeleton className="h-4 w-full mb-2 bg-white/20" />
                    <Skeleton className="h-4 w-3/4 bg-white/20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : announcementsData?.data && announcementsData.data.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {announcementsData.data.map((announcement: Announcement, index: number) => {
                // Make first announcement larger (hero style)
                const isHero = index === 0;
                const cardClass = isHero 
                  ? "md:col-span-2 lg:col-span-2 h-64" 
                  : "h-48";

                return (
                  <Card 
                    key={announcement.id} 
                    className={`${cardClass} overflow-hidden hover:shadow-lg transition-shadow cursor-pointer bg-white/10 border-white/20 backdrop-blur-md`} 
                    data-testid={`card-announcement-${announcement.id}`}
                    onClick={() => handleViewAnnouncement(announcement)}
                  >
                    <CardContent className="p-0 h-full flex">
                      {/* Image or placeholder - Left side */}
                      <div className={`${isHero ? 'w-32' : 'w-24'} h-full relative overflow-hidden flex-shrink-0`}>
                        {announcement.imageUrl ? (
                          <img 
                            src={announcement.imageUrl} 
                            alt={announcement.title}
                            className="w-full h-full object-cover"
                            style={{
                              borderTopLeftRadius: '8px',
                              borderBottomLeftRadius: '8px',
                              clipPath: 'polygon(0 0, 85% 0, 100% 100%, 0 100%)'
                            }}
                          />
                        ) : (
                          <div 
                            className={`w-full h-full bg-gradient-to-r ${
                              announcement.type === 'update' ? 'from-blue-400 to-blue-600' :
                              announcement.type === 'tip' ? 'from-yellow-400 to-yellow-600' :
                              announcement.type === 'maintenance' ? 'from-red-400 to-red-600' :
                              'from-green-400 to-green-600'
                            } flex items-center justify-center`}
                            style={{
                              borderTopLeftRadius: '8px',
                              borderBottomLeftRadius: '8px',
                              clipPath: 'polygon(0 0, 85% 0, 100% 100%, 0 100%)'
                            }}
                          >
                            <div className="text-white text-xl">
                              {getAnnouncementIcon(announcement.type)}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Content - Right side */}
                      <div className="flex-1 p-4 flex flex-col relative">
                        {/* Edit button overlay */}
                        <Button
                          size="sm"
                          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white border-0"
                          data-testid={`button-edit-announcement-${announcement.id}`}
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge {...getAnnouncementBadge(announcement.type)} data-testid={`badge-announcement-type-${announcement.id}`}>
                            {getAnnouncementBadge(announcement.type).label}
                          </Badge>
                          {announcement.isPinned && (
                            <Badge variant="secondary" data-testid={`badge-announcement-pinned-${announcement.id}`}>
                              <Pin className="w-3 h-3 mr-1" />
                              Fixado
                            </Badge>
                          )}
                        </div>
                      
                        <h3 className={`font-semibold mb-2 line-clamp-2 text-white ${isHero ? 'text-lg' : 'text-base'}`} data-testid={`text-announcement-title-${announcement.id}`}>
                          {announcement.title}
                        </h3>
                        
                        <p className={`text-slate-300 flex-1 ${isHero ? 'line-clamp-4' : 'line-clamp-3'} text-sm`} data-testid={`text-announcement-content-${announcement.id}`}>
                          {announcement.content.replace(/<[^>]*>/g, '')}
                        </p>
                        
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-slate-400 flex items-center" data-testid={`text-announcement-date-${announcement.id}`}>
                            <Calendar className="w-3 h-3 mr-1" />
                            {announcement.publishedAt ? new Date(announcement.publishedAt).toLocaleDateString('pt-BR', { 
                              day: 'numeric', 
                              month: 'short' 
                            }) : 'N/A'}
                          </span>
                          {announcement.ctaLabel && announcement.ctaUrl && (
                            <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-400 hover:text-white" data-testid={`button-announcement-cta-${announcement.id}`}>
                              <ExternalLink className="w-3 h-3 mr-1" />
                              {announcement.ctaLabel}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400" data-testid="text-no-announcements">
                Nenhuma novidade disponível
              </p>
            </div>
          )}
        </div>

        {/* Marketplace Section */}
        <div className="space-y-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-green-400" />
                <h2 className="text-xl font-semibold text-white">Marketplace</h2>
              </div>
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setAddProductModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
            <p className="text-slate-400">Gerencie os produtos exibidos para os clientes</p>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="bg-white/10 border-white/20 backdrop-blur-md">
                  <CardContent className="p-4">
                    <Skeleton className="w-full h-48 mb-4 bg-white/20" />
                    <Skeleton className="h-4 w-3/4 mb-2 bg-white/20" />
                    <Skeleton className="h-4 w-1/2 mb-4 bg-white/20" />
                    <Skeleton className="h-10 w-full bg-white/20" />
                  </CardContent>
                </Card>
              ))
            ) : productsData?.data && productsData.data.length > 0 ? (
              productsData.data.map((product: MarketplaceProduct) => (
                <Card key={product.id} className="overflow-hidden bg-white/10 border-white/20 backdrop-blur-md hover:bg-white/15 transition-colors" data-testid={`card-product-${product.id}`}>
                  <CardContent className="p-0">
                    {/* Product image */}
                    <div className="w-full h-48 relative">
                      {product.images && product.images.length > 0 ? (
                        <img 
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${
                          product.category === 'electronics' ? 'from-blue-400 to-blue-600' :
                          product.category === 'fashion' ? 'from-purple-400 to-purple-600' :
                          product.category === 'home' ? 'from-yellow-400 to-yellow-600' :
                          product.category === 'health' ? 'from-green-400 to-green-600' :
                          'from-gray-400 to-gray-600'
                        } flex items-center justify-center`}>
                          <Package className="w-16 h-16 text-white opacity-80" />
                        </div>
                      )}
                      {/* Remove button overlay */}
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-700/90 text-white border-0"
                        onClick={() => handleRemoveProduct(product.id, product.name)}
                        data-testid={`button-remove-product-${product.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="p-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-white" data-testid={`text-product-name-${product.id}`}>
                          {product.name}
                        </h3>
                        <p className="text-sm text-slate-400" data-testid={`text-product-supplier-${product.id}`}>
                          {product.supplier}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-green-400" data-testid={`text-product-price-${product.id}`}>
                            {product.baseCost ? `R$ ${product.baseCost}` : 'Preço não informado'}
                          </span>
                          <Badge 
                            variant={product.category === 'electronics' ? 'default' : 'secondary'} 
                            data-testid={`badge-product-category-${product.id}`}
                          >
                            {product.category}
                          </Badge>
                        </div>
                        <Button
                          className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                          disabled
                          data-testid={`button-link-product-${product.id}`}
                        >
                          <Package className="w-4 h-4 mr-2" />
                          Visível para Clientes
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Package className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400" data-testid="text-no-products">
                  Nenhum produto encontrado
                </p>
              </div>
            )}
          </div>
        </div>

      {/* Add Product Modal */}
      <AddProductModal
        open={addProductModalOpen}
        onClose={() => setAddProductModalOpen(false)}
        onSuccess={() => setAddProductModalOpen(false)}
      />

      {/* Create Announcement Modal */}
      <CreateAnnouncementModal
        open={createAnnouncementModalOpen}
        onClose={() => setCreateAnnouncementModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
          setCreateAnnouncementModalOpen(false);
        }}
      />

      {/* View Announcement Modal */}
      <ViewAnnouncementModal
        open={viewAnnouncementModalOpen}
        onClose={() => {
          setViewAnnouncementModalOpen(false);
          setSelectedAnnouncement(null);
        }}
        announcement={selectedAnnouncement}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmRemoveProduct}
        productName={selectedProductName}
        isLoading={removeProductMutation.isPending}
      />
    </div>
  );
}