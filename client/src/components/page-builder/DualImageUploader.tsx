import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, X, Upload, Monitor, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Helper function to convert GCS URL to local object path for display
function convertGcsUrlToObjectPath(gcsUrl: string): string {
  if (!gcsUrl.startsWith('https://storage.googleapis.com/')) {
    return gcsUrl;
  }
  
  try {
    const url = new URL(gcsUrl);
    const pathParts = url.pathname.split('/');
    
    // Extract bucket and object path
    if (pathParts.length >= 3) {
      const bucketName = pathParts[1];
      const objectPath = pathParts.slice(2).join('/');
      
      // Check if it's in the private directory structure
      if (objectPath.includes('.private/uploads/')) {
        const objectId = objectPath.split('.private/uploads/')[1];
        return `/objects/uploads/${objectId}`;
      }
    }
    
    return gcsUrl; // Return original if we can't convert
  } catch (error) {
    console.error('Error converting GCS URL:', error);
    return gcsUrl;
  }
}

interface DualImageUploaderProps {
  onImageUpload: (imageUrls: { desktop?: string; mobile?: string }) => void;
  currentDesktopUrl?: string;
  currentMobileUrl?: string;
  onImageRemove?: (type: 'desktop' | 'mobile') => void;
}

export function DualImageUploader({ 
  onImageUpload, 
  currentDesktopUrl, 
  currentMobileUrl, 
  onImageRemove 
}: DualImageUploaderProps) {
  const { toast } = useToast();
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingDesktop, setIsUploadingDesktop] = useState(false);
  const [isUploadingMobile, setIsUploadingMobile] = useState(false);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>, 
    type: 'desktop' | 'mobile'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem (JPG, PNG, etc.)",
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5242880) {
      toast({
        variant: "destructive",
        title: "Arquivo muito grande",
        description: "Por favor, selecione uma imagem menor que 5MB",
      });
      return;
    }

    await uploadFile(file, type);
  };

  const uploadFile = async (file: File, type: 'desktop' | 'mobile') => {
    if (type === 'desktop') {
      setIsUploadingDesktop(true);
    } else {
      setIsUploadingMobile(true);
    }

    try {
      console.log(`🚀 [${type}] Starting upload process for file:`, file.name);
      
      // Get upload URL from backend
      const response = await apiRequest('/api/objects/upload', 'POST');
      console.log(`🔗 [${type}] API response received, status:`, response.status);
      const data = await response.json();
      console.log(`📦 [${type}] Upload URL data:`, data);
      
      // Upload file directly to storage
      const uploadResponse = await fetch(data.uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Falha no upload');
      }

      const uploadUrl = data.uploadURL;
      
      // Call onImageUpload with the new URL for the specific type
      if (type === 'desktop') {
        onImageUpload({ desktop: uploadUrl });
      } else {
        onImageUpload({ mobile: uploadUrl });
      }

      toast({
        title: "Imagem enviada!",
        description: `Imagem ${type === 'desktop' ? 'desktop' : 'mobile'} foi enviada com sucesso.`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: "Falha ao enviar a imagem. Tente novamente.",
      });
    } finally {
      if (type === 'desktop') {
        setIsUploadingDesktop(false);
        if (desktopInputRef.current) {
          desktopInputRef.current.value = '';
        }
      } else {
        setIsUploadingMobile(false);
        if (mobileInputRef.current) {
          mobileInputRef.current.value = '';
        }
      }
    }
  };

  const handleButtonClick = (type: 'desktop' | 'mobile') => {
    if (type === 'desktop') {
      desktopInputRef.current?.click();
    } else {
      mobileInputRef.current?.click();
    }
  };

  const handleRemoveImage = (type: 'desktop' | 'mobile') => {
    onImageRemove?.(type);
  };

  // Convert URLs for display if needed
  const displayDesktopUrl = currentDesktopUrl ? convertGcsUrlToObjectPath(currentDesktopUrl) : '';
  const displayMobileUrl = currentMobileUrl ? convertGcsUrlToObjectPath(currentMobileUrl) : '';

  const ImageUploadButton = ({ 
    type, 
    isUploading, 
    currentUrl, 
    displayUrl 
  }: { 
    type: 'desktop' | 'mobile'; 
    isUploading: boolean; 
    currentUrl?: string; 
    displayUrl: string; 
  }) => (
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-2">
        {type === 'desktop' ? <Monitor className="h-4 w-4 text-red-600" /> : <Smartphone className="h-4 w-4 text-blue-600" />}
        <span className="text-sm font-bold text-black bg-white px-1 rounded">
          {type === 'desktop' ? '🖥️ Desktop' : '📱 Mobile'}
        </span>
      </div>
      
      {displayUrl ? (
        <div className="relative inline-block">
          <img
            src={displayUrl}
            alt={`Preview ${type}`}
            className="w-20 h-20 object-cover rounded-lg border"
            onError={(e) => {
              console.error(`${type} image failed to load:`, displayUrl);
              if (displayUrl !== currentUrl) {
                (e.target as HTMLImageElement).src = currentUrl || '';
              }
            }}
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => handleRemoveImage(type)}
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => handleButtonClick(type)}
          disabled={isUploading}
          className="w-full h-16 border-2 border-dashed hover:border-gray-400 transition-colors"
        >
          <div className="flex flex-col items-center justify-center gap-1">
            {isUploading ? (
              <>
                <Upload className="h-4 w-4 text-gray-400 animate-pulse" />
                <span className="text-xs text-red-600 font-bold">Enviando...</span>
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-blue-600 font-bold">Adicionar</span>
              </>
            )}
          </div>
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <ImageUploadButton
          type="desktop"
          isUploading={isUploadingDesktop}
          currentUrl={currentDesktopUrl}
          displayUrl={displayDesktopUrl}
        />
        
        <ImageUploadButton
          type="mobile"
          isUploading={isUploadingMobile}
          currentUrl={currentMobileUrl}
          displayUrl={displayMobileUrl}
        />
      </div>
      
      <input
        ref={desktopInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileSelect(e, 'desktop')}
        className="hidden"
      />
      
      <input
        ref={mobileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileSelect(e, 'mobile')}
        className="hidden"
      />
      
      <p className="text-xs text-muted-foreground">
        Formatos aceitos: JPG, PNG. Tamanho máximo: 5MB por imagem
      </p>
    </div>
  );
}