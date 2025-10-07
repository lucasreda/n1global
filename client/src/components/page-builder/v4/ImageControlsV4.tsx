import { useState, useRef } from 'react';
import { PageNodeV4, ResponsiveStylesV4 } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Upload, Link, Image as ImageIcon, Monitor, Smartphone } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ImageControlsV4Props {
  node: PageNodeV4;
  breakpoint: 'desktop' | 'tablet' | 'mobile';
  onUpdateNode: (updates: Partial<PageNodeV4>) => void;
}

export function ImageControlsV4({ node, breakpoint, onUpdateNode }: ImageControlsV4Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'upload' | 'url'>('url');
  const fileInputRefDesktop = useRef<HTMLInputElement>(null);
  const fileInputRefMobile = useRef<HTMLInputElement>(null);
  
  // Extract current image URLs from attributes
  const getImageSrc = (bp: 'desktop' | 'mobile') => {
    // Check responsive attributes first
    const responsiveAttr = node.attributes?.[`data-src-${bp}`];
    if (responsiveAttr) return responsiveAttr;
    
    // Fallback to regular src
    if (bp === 'desktop') {
      return node.attributes?.src || '';
    }
    
    return '';
  };
  
  const desktopSrc = getImageSrc('desktop');
  const mobileSrc = getImageSrc('mobile');
  const altText = node.attributes?.alt || '';
  
  const handleImageUpload = async (file: File, targetBreakpoint: 'desktop' | 'mobile') => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', `page-builder/images/${Date.now()}-${file.name}`);
      
      // Get the auth token from localStorage
      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await response.json();
      const imageUrl = data.url;
      
      // Update the node attributes with responsive image
      const newAttributes = {
        ...node.attributes,
        [`data-src-${targetBreakpoint}`]: imageUrl,
        src: imageUrl, // Always update src for immediate display
      };
      
      // CRITICAL: Update responsiveAttributes to make the image display immediately
      const newResponsiveAttributes = { ...node.responsiveAttributes };
      if (!newResponsiveAttributes.src) {
        newResponsiveAttributes.src = {};
      }
      newResponsiveAttributes.src = {
        ...newResponsiveAttributes.src,
        [targetBreakpoint]: imageUrl
      };
      
      console.log('🎯 Updating image node with:', {
        attributes: newAttributes,
        responsiveAttributes: newResponsiveAttributes,
        imageUrl
      });
      
      onUpdateNode({ 
        attributes: newAttributes,
        responsiveAttributes: newResponsiveAttributes
      });
      
      toast({
        title: 'Imagem enviada',
        description: `Imagem ${targetBreakpoint === 'desktop' ? 'desktop' : 'mobile'} atualizada com sucesso`,
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível enviar a imagem',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleUrlChange = (url: string, targetBreakpoint: 'desktop' | 'mobile') => {
    // Update the node attributes with responsive image
    const newAttributes = {
      ...node.attributes,
      [`data-src-${targetBreakpoint}`]: url,
      src: url, // Always update src for immediate display
    };
    
    // CRITICAL: Update responsiveAttributes to make the image display immediately
    const newResponsiveAttributes = { ...node.responsiveAttributes };
    if (!newResponsiveAttributes.src) {
      newResponsiveAttributes.src = {};
    }
    newResponsiveAttributes.src = {
      ...newResponsiveAttributes.src,
      [targetBreakpoint]: url
    };
    
    onUpdateNode({ 
      attributes: newAttributes,
      responsiveAttributes: newResponsiveAttributes
    });
  };
  
  const handleAltChange = (alt: string) => {
    onUpdateNode({
      attributes: {
        ...node.attributes,
        alt
      }
    });
  };
  
  return (
    <div className="space-y-4">
      {/* Image Mode Selector */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Modo de Imagem</Label>
        <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as 'upload' | 'url')}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="url">
              <Link className="h-3.5 w-3.5 mr-1.5" />
              URL
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Desktop Image */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Imagem Desktop
          </Label>
        </div>
        
        {/* Desktop Preview */}
        {desktopSrc && (
          <div className="relative w-full aspect-video bg-muted rounded overflow-hidden">
            <img 
              src={desktopSrc} 
              alt={altText || 'Desktop preview'}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        
        {uploadMode === 'url' ? (
          <Input
            type="url"
            placeholder="https://exemplo.com/imagem.jpg"
            value={desktopSrc}
            onChange={(e) => handleUrlChange(e.target.value, 'desktop')}
            className="text-sm"
            data-testid="image-url-desktop"
          />
        ) : (
          <>
            <input
              ref={fileInputRefDesktop}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, 'desktop');
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => fileInputRefDesktop.current?.click()}
              disabled={isUploading}
              data-testid="upload-desktop"
            >
              <Upload className="h-3.5 w-3.5 mr-2" />
              {isUploading ? 'Enviando...' : 'Escolher Imagem Desktop'}
            </Button>
          </>
        )}
      </Card>
      
      {/* Mobile Image */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Imagem Mobile
          </Label>
          {!mobileSrc && desktopSrc && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleUrlChange(desktopSrc, 'mobile')}
              className="text-xs"
              data-testid="copy-desktop-to-mobile"
            >
              Usar mesma do desktop
            </Button>
          )}
        </div>
        
        {/* Mobile Preview */}
        {mobileSrc && (
          <div className="relative w-full aspect-video bg-muted rounded overflow-hidden">
            <img 
              src={mobileSrc} 
              alt={altText || 'Mobile preview'}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        
        {uploadMode === 'url' ? (
          <Input
            type="url"
            placeholder="https://exemplo.com/imagem-mobile.jpg"
            value={mobileSrc}
            onChange={(e) => handleUrlChange(e.target.value, 'mobile')}
            className="text-sm"
            data-testid="image-url-mobile"
          />
        ) : (
          <>
            <input
              ref={fileInputRefMobile}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, 'mobile');
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => fileInputRefMobile.current?.click()}
              disabled={isUploading}
              data-testid="upload-mobile"
            >
              <Upload className="h-3.5 w-3.5 mr-2" />
              {isUploading ? 'Enviando...' : 'Escolher Imagem Mobile'}
            </Button>
          </>
        )}
      </Card>
      
      {/* Alt Text */}
      <div className="space-y-2">
        <Label htmlFor="alt-text" className="text-sm font-medium">
          Texto Alternativo (Alt)
        </Label>
        <Input
          id="alt-text"
          type="text"
          placeholder="Descrição da imagem para acessibilidade"
          value={altText}
          onChange={(e) => handleAltChange(e.target.value)}
          className="text-sm"
          data-testid="image-alt-text"
        />
        <p className="text-xs text-muted-foreground">
          Importante para SEO e acessibilidade
        </p>
      </div>
    </div>
  );
}