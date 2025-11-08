import { PutObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import { getS3Client, getStorageConfig } from "../objectStorage";

export interface UploadedFile {
  url: string;
  filename: string;
  size: number;
  contentType?: string;
  publicUrl?: string;
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
    const config = getStorageConfig();
    const client = getS3Client();

    const fileExtension = file.originalname.split(".").pop();
    const sanitizedExtension = fileExtension ? fileExtension.toLowerCase() : null;
    const uniqueKey = `${prefix}/${nanoid()}${sanitizedExtension ? `.${sanitizedExtension}` : ""}`;

    console.log(`📤 Uploading file to R2: ${uniqueKey}`);

    await client.send(
      new PutObjectCommand({
        Bucket: config.privateBucket,
        Key: uniqueKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    const url = `/objects/${uniqueKey}`;
    console.log(`✅ File uploaded successfully to R2: ${uniqueKey}`);

    return {
      url,
      filename: file.originalname,
      size: file.size,
      contentType: file.mimetype,
      publicUrl: config.publicBaseUrl
        ? `${config.publicBaseUrl}/${uniqueKey}`
        : undefined,
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
