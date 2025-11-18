import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Upload, Image as ImageIcon, Video, FileImage, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  name: string;
  size?: number;
  width?: number;
  height?: number;
  uploadedAt?: Date;
}

interface MediaLibraryProps {
  onSelect: (url: string) => void;
  trigger?: React.ReactNode;
  allowedTypes?: ('image' | 'video')[];
  multiSelect?: boolean;
  onMultiSelect?: (urls: string[]) => void;
}

export function MediaLibrary({ 
  onSelect, 
  trigger,
  allowedTypes = ['image'],
  multiSelect = false,
  onMultiSelect
}: MediaLibraryProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MediaItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'images' | 'videos'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Load media items
  const loadMediaItems = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      // For now, we'll use a mock list
      const mockItems: MediaItem[] = [
        {
          id: '1',
          type: 'image',
          url: '/api/storage/public/page-builder/placeholder-1.jpg',
          name: 'placeholder-1.jpg',
          uploadedAt: new Date(Date.now() - 86400000), // 1 day ago
          width: 1920,
          height: 1080,
          size: 245000,
        },
        {
          id: '2',
          type: 'image',
          url: '/api/storage/public/page-builder/placeholder-2.jpg',
          name: 'placeholder-2.jpg',
          uploadedAt: new Date(Date.now() - 3600000), // 1 hour ago
          width: 1920,
          height: 1080,
          size: 312000,
        },
      ];
      
      // Filter by allowed types
      const filtered = mockItems.filter(item => allowedTypes.includes(item.type));
      setMediaItems(filtered);
      setFilteredItems(filtered);
    } catch (error) {
      console.error('Error loading media items:', error);
      toast({
        title: 'Erro ao carregar mídia',
        description: 'Não foi possível carregar os arquivos de mídia',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [allowedTypes, toast]);

  // Load items when dialog opens
  useEffect(() => {
    if (open) {
      loadMediaItems();
    }
  }, [open, loadMediaItems]);

  // Filter items based on search and tab
  useEffect(() => {
    let filtered = mediaItems;

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(search) ||
        item.type.toLowerCase().includes(search)
      );
    }

    // Filter by tab
    if (activeTab === 'images') {
      filtered = filtered.filter(item => item.type === 'image');
    } else if (activeTab === 'videos') {
      filtered = filtered.filter(item => item.type === 'video');
    }

    setFilteredItems(filtered);
  }, [searchTerm, activeTab, mediaItems]);

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList) => {
    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        const isValidType = allowedTypes.some(type => {
          if (type === 'image') return file.type.startsWith('image/');
          if (type === 'video') return file.type.startsWith('video/');
          return false;
        });

        if (!isValidType) {
          toast({
            title: 'Arquivo inválido',
            description: `Tipo de arquivo não permitido: ${file.name}`,
            variant: 'destructive',
          });
          continue;
        }

        // Validate file size (10MB for images, 100MB for videos)
        const maxSize = file.type.startsWith('image/') ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
        if (file.size > maxSize) {
          toast({
            title: 'Arquivo muito grande',
            description: `${file.name} excede o limite de ${maxSize / 1024 / 1024}MB`,
            variant: 'destructive',
          });
          continue;
        }

        // Upload file
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', `page-builder/media/${Date.now()}-${file.name}`);

        const token = localStorage.getItem('auth_token');
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/upload', {
          method: 'POST',
          headers,
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        const imageUrl = `${data.url}?t=${Date.now()}`;

        // Add to media list
        const newItem: MediaItem = {
          id: Date.now().toString(),
          type: file.type.startsWith('image/') ? 'image' : 'video',
          url: imageUrl,
          name: file.name,
          size: file.size,
          uploadedAt: new Date(),
        };

        setMediaItems(prev => [newItem, ...prev]);
      }

      toast({
        title: 'Upload concluído',
        description: 'Arquivos enviados com sucesso',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível enviar os arquivos',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [allowedTypes, toast]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  // Handle item selection
  const handleItemSelect = useCallback((item: MediaItem) => {
    if (multiSelect) {
      setSelectedItems(prev => {
        const next = new Set(prev);
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
        return next;
      });
    } else {
      onSelect(item.url);
      setOpen(false);
    }
  }, [multiSelect, onSelect]);

  // Handle multi-select done
  const handleMultiSelectDone = useCallback(() => {
    if (selectedItems.size === 0) {
      toast({
        title: 'Nenhum item selecionado',
        description: 'Selecione pelo menos um item',
        variant: 'destructive',
      });
      return;
    }

    const selectedUrls = mediaItems
      .filter(item => selectedItems.has(item.id))
      .map(item => item.url);

    onMultiSelect?.(selectedUrls);
    setOpen(false);
    setSelectedItems(new Set());
  }, [selectedItems, mediaItems, onMultiSelect, toast]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date?: Date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <ImageIcon className="h-4 w-4 mr-2" />
            Biblioteca de Mídia
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Biblioteca de Mídia</DialogTitle>
        </DialogHeader>

        {/* Search and Upload */}
        <div className="flex items-center gap-2 border-b pb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar mídia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={allowedTypes.map(t => t === 'image' ? 'image/*' : 'video/*').join(',')}
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            {allowedTypes.includes('image') && <TabsTrigger value="images">Imagens</TabsTrigger>}
            {allowedTypes.includes('video') && <TabsTrigger value="videos">Vídeos</TabsTrigger>}
          </TabsList>
        </Tabs>

        {/* Media Grid */}
        <ScrollArea className="flex-1 -mx-6 px-6 mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg bg-muted/30"
            >
              {searchTerm ? (
                <>
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum resultado encontrado</p>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">
                    Arraste arquivos aqui ou clique em Upload
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Formatos: {allowedTypes.map(t => t === 'image' ? 'JPG, PNG, WebP' : 'MP4, WebM').join(', ')}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4"
            >
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemSelect(item)}
                  className={cn(
                    'group relative aspect-square cursor-pointer rounded-lg border-2 transition-all hover:border-primary overflow-hidden',
                    selectedItems.has(item.id) ? 'border-primary bg-primary/5' : 'border-border'
                  )}
                >
                  {/* Thumbnail */}
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Video className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}

                  {/* Overlay info */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <p className="text-xs text-white text-center px-2 truncate w-full">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-white/80">
                      {item.width && item.height && (
                        <span>
                          {item.width}×{item.height}
                        </span>
                      )}
                      {item.size && (
                        <>
                          {item.width && ' • '}
                          <span>{formatFileSize(item.size)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Selection badge */}
                  {selectedItems.has(item.id) && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <X className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Multi-select actions */}
        {multiSelect && (
          <div className="flex items-center justify-between border-t pt-4 mt-4">
            <span className="text-sm text-muted-foreground">
              {selectedItems.size} item(s) selecionado(s)
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setSelectedItems(new Set())}>
                Limpar
              </Button>
              <Button onClick={handleMultiSelectDone}>
                Confirmar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}




