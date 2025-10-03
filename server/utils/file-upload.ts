import { Client } from "@replit/object-storage";
import { nanoid } from "nanoid";

const client = new Client();

export interface UploadedFile {
  url: string;
  filename: string;
  size: number;
}

/**
 * Upload file to object storage in private directory
 * Returns the URL of the uploaded file
 */
export async function uploadFileToStorage(
  file: Express.Multer.File,
  prefix: string = "refund-attachments"
): Promise<UploadedFile> {
  try {
    // Generate unique filename
    const fileExtension = file.originalname.split(".").pop();
    const uniqueFilename = `${prefix}/${nanoid()}.${fileExtension}`;
    
    // Full path in private directory
    const privateDir = process.env.PRIVATE_OBJECT_DIR || "/.private";
    const fullPath = `${privateDir}/${uniqueFilename}`;
    
    console.log(`📤 Uploading file to: ${fullPath}`);
    
    // Upload to object storage
    await client.uploadFromBytes(fullPath, file.buffer);
    
    // Generate URL (object storage will handle access control)
    const url = fullPath;
    
    console.log(`✅ File uploaded successfully: ${uniqueFilename}`);
    
    return {
      url,
      filename: file.originalname,
      size: file.size,
    };
  } catch (error) {
    console.error("❌ Error uploading file to object storage:", error);
    throw new Error("Failed to upload file");
  }
}

/**
 * Validate file type and size
 */
export function validateFile(
  file: Express.Multer.File,
  allowedTypes: string[] = ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  maxSizeMB: number = 5
): { valid: boolean; error?: string } {
  // Check file type
  if (!allowedTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Tipo de arquivo inválido. Tipos aceitos: ${allowedTypes.join(", ")}`,
    };
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}
