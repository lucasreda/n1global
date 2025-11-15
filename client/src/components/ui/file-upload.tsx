import { useState, useRef, ChangeEvent } from "react";
import { Upload, X, FileImage, AlertCircle } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  id: string;
  value?: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  maxSize?: number; // in MB
  label: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  testId?: string;
  helperText?: string;
}

export function FileUpload({
  id,
  value,
  onChange,
  accept = "image/*",
  maxSize = 5,
  label,
  required = false,
  error,
  disabled = false,
  testId,
  helperText,
}: FileUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null) => {
    if (!file) {
      onChange(null);
      setPreview(null);
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      alert(`Arquivo muito grande. Tamanho máximo: ${maxSize}MB`);
      return;
    }

    // Validate file type
    if (accept && !file.type.match(accept.replace("*", ".*"))) {
      alert(`Tipo de arquivo inválido. Aceito: ${accept}`);
      return;
    }

    onChange(file);

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const file = e.dataTransfer.files?.[0] || null;
    handleFile(file);
  };

  const handleRemove = () => {
    onChange(null);
    setPreview(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {helperText && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{helperText}</p>
      )}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
        data-testid={testId}
      />

      {!value ? (
        <div
          onClick={() => !disabled && inputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer",
            "hover:border-zinc-400 dark:hover:border-zinc-600",
            dragActive
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
              : "border-zinc-300 dark:border-zinc-700",
            disabled && "opacity-50 cursor-not-allowed",
            error && "border-red-500 dark:border-red-500"
          )}
        >
          <div className="flex flex-col items-center justify-center text-center space-y-2">
            <Upload className="h-10 w-10 text-zinc-400 dark:text-zinc-600" />
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                <span className="font-semibold">Clique para fazer upload</span> ou
                arraste e solte
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                {accept === "image/*" ? "Imagens" : accept} (máx. {maxSize}MB)
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative border-2 border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={disabled}
            className="absolute top-2 right-2 h-8 w-8 p-0"
            data-testid={`${testId}-remove`}
          >
            <X className="h-4 w-4" />
          </Button>

          {preview ? (
            <div className="flex items-center space-x-3">
              <img
                src={preview}
                alt="Preview"
                className="h-20 w-20 object-cover rounded-md"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {value.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {(value.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <FileImage className="h-10 w-10 text-zinc-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {value.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {(value.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
