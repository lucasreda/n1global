import { useState, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link, Image as ImageIcon, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BackgroundImageProps {
  url: string;
  size?: string;
  position?: string;
  repeat?: string;
  attachment?: string;
}

interface BackgroundImageControlsProps {
  value: BackgroundImageProps;
  onChange: (value: BackgroundImageProps) => void;
  'data-testid'?: string;
}

const SIZE_OPTIONS = [
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
  { value: 'auto', label: 'Auto' },
  { value: 'custom', label: 'Custom' }
];

const POSITION_OPTIONS = [
  { value: 'center', label: 'Center' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'top left', label: 'Top Left' },
  { value: 'top right', label: 'Top Right' },
  { value: 'bottom left', label: 'Bottom Left' },
  { value: 'bottom right', label: 'Bottom Right' }
];

const REPEAT_OPTIONS = [
  { value: 'no-repeat', label: 'No Repeat' },
  { value: 'repeat', label: 'Repeat' },
  { value: 'repeat-x', label: 'Repeat X' },
  { value: 'repeat-y', label: 'Repeat Y' },
  { value: 'space', label: 'Space' },
  { value: 'round', label: 'Round' }
];

const ATTACHMENT_OPTIONS = [
  { value: 'scroll', label: 'Scroll' },
  { value: 'fixed', label: 'Fixed (Parallax)' },
  { value: 'local', label: 'Local' }
];

export function BackgroundImageControls({ value, onChange, 'data-testid': testId }: BackgroundImageControlsProps) {
  const [uploadMode, setUploadMode] = useState<'url' | 'upload'>('url');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', `page-builder/backgrounds/${Date.now()}-${file.name}`);
      
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
      const imageUrl = `${data.url}?t=${Date.now()}`;
      
      onChange({ ...value, url: imageUrl });
      
      toast({
        title: 'Imagem enviada',
        description: 'Background image atualizado com sucesso',
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

  const handleUrlChange = (url: string) => {
    onChange({ ...value, url });
  };

  const handleSizeChange = (size: string) => {
    onChange({ ...value, size });
  };

  const handlePositionChange = (position: string) => {
    onChange({ ...value, position });
  };

  const handleRepeatChange = (repeat: string) => {
    onChange({ ...value, repeat });
  };

  const handleAttachmentChange = (attachment: string) => {
    onChange({ ...value, attachment });
  };

  const clearBackground = () => {
    onChange({ url: '', size: 'cover', position: 'center', repeat: 'no-repeat', attachment: 'scroll' });
  };

  return (
    <div className="space-y-4" data-testid={testId}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-foreground">Background Image</Label>
        {value.url && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearBackground}
            className="h-7 text-xs"
            data-testid="clear-bg-image"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Upload Mode */}
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

      {/* URL or Upload Input */}
      {uploadMode === 'url' ? (
        <Input
          type="url"
          placeholder="https://example.com/image.jpg"
          value={value.url}
          onChange={(e) => handleUrlChange(e.target.value)}
          className="text-sm"
          data-testid="bg-image-url"
        />
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            data-testid="upload-bg-image"
          >
            <Upload className="h-3.5 w-3.5 mr-2" />
            {isUploading ? 'Enviando...' : 'Escolher Imagem'}
          </Button>
        </>
      )}

      {/* Preview */}
      {value.url && (
        <div className="relative w-full h-32 rounded-lg border overflow-hidden bg-muted">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `url(${value.url})`,
              backgroundSize: value.size || 'cover',
              backgroundPosition: value.position || 'center',
              backgroundRepeat: value.repeat || 'no-repeat',
              backgroundAttachment: value.attachment === 'fixed' ? 'scroll' : value.attachment || 'scroll' // Fixed doesn't work well in preview
            }}
            data-testid="bg-image-preview"
          />
        </div>
      )}

      {/* Background Size */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Background Size</Label>
        <div className="grid grid-cols-4 gap-2">
          {SIZE_OPTIONS.map(option => (
            <Button
              key={option.value}
              variant={(value.size || 'cover') === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSizeChange(option.value)}
              className="h-8 text-xs"
              data-testid={`bg-size-${option.value}`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Background Position */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Background Position</Label>
        <div className="grid grid-cols-3 gap-2">
          {POSITION_OPTIONS.map(option => (
            <Button
              key={option.value}
              variant={(value.position || 'center') === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePositionChange(option.value)}
              className="h-8 text-xs"
              data-testid={`bg-position-${option.value.replace(' ', '-')}`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Background Repeat */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Background Repeat</Label>
        <div className="grid grid-cols-3 gap-2">
          {REPEAT_OPTIONS.map(option => (
            <Button
              key={option.value}
              variant={(value.repeat || 'no-repeat') === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleRepeatChange(option.value)}
              className="h-8 text-xs"
              data-testid={`bg-repeat-${option.value}`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Background Attachment */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Background Attachment</Label>
        <div className="grid grid-cols-3 gap-2">
          {ATTACHMENT_OPTIONS.map(option => (
            <Button
              key={option.value}
              variant={(value.attachment || 'scroll') === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleAttachmentChange(option.value)}
              className="h-8 text-xs"
              data-testid={`bg-attachment-${option.value}`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
