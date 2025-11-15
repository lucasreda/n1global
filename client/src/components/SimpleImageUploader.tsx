import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, X, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Helper function to convert storage URLs to local object path for display
function convertStorageUrlToObjectPath(storageUrl: string): string {
  if (!storageUrl) {
    return storageUrl;
  }

  if (storageUrl.startsWith("/objects/")) {
    return storageUrl;
  }

  // Legacy Replit paths
  if (storageUrl.startsWith("/.private/uploads/")) {
    const legacyId = storageUrl.split("/.private/uploads/")[1];
    if (legacyId) {
      return `/objects/uploads/${legacyId}`;
    }
  }

  try {
    const url = new URL(storageUrl);
    const host = url.hostname;
    const pathParts = url.pathname.split("/").filter(Boolean);

    // Legacy Google Cloud Storage URLs
    if (host.includes("storage.googleapis.com")) {
      const objectPath = pathParts.slice(1).join("/");
      if (objectPath.includes(".private/uploads/")) {
        const objectId = objectPath.split(".private/uploads/")[1];
        if (objectId) {
          return `/objects/uploads/${objectId}`;
        }
      }
      return storageUrl;
    }

    // Cloudflare R2 path-style URLs: <account>.r2.cloudflarestorage.com/<bucket>/<key>
    if (host.includes(".r2.cloudflarestorage.com") && pathParts.length >= 2) {
      const key = pathParts.slice(1).join("/");
      return `/objects/${key}`;
    }
  } catch (error) {
    console.error("Error converting storage URL:", error);
  }

  return storageUrl;
}

interface SimpleImageUploaderProps {
  onImageUpload: (imageUrl: string) => void;
  currentImageUrl?: string;
  onImageRemove?: () => void;
}

export function SimpleImageUploader({ onImageUpload, currentImageUrl, onImageRemove }: SimpleImageUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      // Get upload URL from backend
      const response = await apiRequest('POST', '/api/objects/upload');
      const data = await response.json();
      
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

      // Extract the object path from the upload URL and convert to local path
      const uploadUrl = data.uploadURL;
      console.log('Upload successful, URL:', uploadUrl);
      
      // Convert storage URL to local object path for immediate display & persistence
      const objectPath = convertStorageUrlToObjectPath(uploadUrl);
      console.log('Original URL:', uploadUrl);
      console.log('Converted to object path:', objectPath);
      
      onImageUpload(objectPath);

      toast({
        title: "Imagem enviada!",
        description: "A imagem foi enviada com sucesso.",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: "Falha ao enviar a imagem. Tente novamente.",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    onImageRemove?.();
  };

  // Convert URL for display if needed
  const displayImageUrl = currentImageUrl ? convertStorageUrlToObjectPath(currentImageUrl) : '';

  return (
    <div>
      <div className="space-y-3">
        {displayImageUrl ? (
          <div className="relative inline-block">
            <img
              src={displayImageUrl}
              alt="Preview do produto"
              className="w-32 h-32 object-cover rounded-lg border"
              onError={(e) => {
                console.error('Image failed to load:', displayImageUrl);
                // Try with original URL if conversion failed
                if (displayImageUrl !== currentImageUrl) {
                  (e.target as HTMLImageElement).src = currentImageUrl || '';
                }
              }}
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={handleButtonClick}
            disabled={isUploading}
            className="w-full h-24 border-2 border-dashed hover:border-gray-400 transition-colors"
          >
            <div className="flex flex-col items-center justify-center gap-2">
              {isUploading ? (
                <>
                  <Upload className="h-5 w-5 text-gray-400 animate-pulse" />
                  <span className="text-sm text-gray-600">Enviando...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">Clique para adicionar imagem</span>
                </>
              )}
            </div>
          </Button>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <p className="text-xs text-muted-foreground">
          Formatos aceitos: JPG, PNG. Tamanho máximo: 5MB
        </p>
      </div>
    </div>
  );
}