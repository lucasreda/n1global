import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Response } from "express";
import { randomUUID } from "crypto";
import { Readable } from "stream";

export interface StorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  privateBucket: string;
  publicBucket?: string;
  publicBaseUrl?: string;
}

type DownloadableObject = {
  bucket: string;
  key: string;
};

let cachedConfig: StorageConfig | null = null;
let cachedClient: S3Client | null = null;

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export function getStorageConfig(): StorageConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const endpoint = process.env.R2_ENDPOINT?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY?.trim();
  const secretAccessKey = process.env.R2_SECRET_KEY?.trim();
  const privateBucket = process.env.R2_BUCKET_PRIVATE?.trim();

  if (!endpoint || !accessKeyId || !secretAccessKey || !privateBucket) {
    throw new Error(
      "Cloudflare R2 não configurado. Defina R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY e R2_BUCKET_PRIVATE."
    );
  }

  cachedConfig = {
    endpoint: endpoint.replace(/\/+$/, ""),
    region: process.env.R2_REGION?.trim() || "auto",
    accessKeyId,
    secretAccessKey,
    privateBucket,
    publicBucket: process.env.R2_BUCKET_PUBLIC?.trim(),
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL?.trim()?.replace(/\/+$/, ""),
  };

  return cachedConfig;
}

export function getS3Client(): S3Client {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getStorageConfig();
  cachedClient = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });

  return cachedClient;
}

export class ObjectStorageService {
  private getConfig(): StorageConfig {
    return getStorageConfig();
  }

  private getClient(): S3Client {
    return getS3Client();
  }

  async downloadObject(
    objectRef: DownloadableObject,
    res: Response,
    cacheTtlSec: number = 3600
  ) {
    try {
      const response = await this.getClient().send(
        new GetObjectCommand({
          Bucket: objectRef.bucket,
          Key: objectRef.key,
        })
      );

      if (!response.Body) {
        throw new ObjectNotFoundError();
      }

      const bodyStream = response.Body as Readable;
      const contentType = response.ContentType || "application/octet-stream";
      const contentLength = response.ContentLength;

      res.set({
        "Content-Type": contentType,
        ...(contentLength ? { "Content-Length": String(contentLength) } : {}),
        "Cache-Control": `private, max-age=${cacheTtlSec}`,
      });

      bodyStream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      bodyStream.pipe(res);
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new ObjectNotFoundError();
      }
      console.error("Error downloading file:", error);
      throw error;
    }
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const config = this.getConfig();
    const key = `uploads/${randomUUID()}`;

    const command = new PutObjectCommand({
      Bucket: config.privateBucket,
      Key: key,
    });

    return getSignedUrl(this.getClient(), command, { expiresIn: 900 });
  }

  async getObjectEntityFile(objectPath: string): Promise<DownloadableObject> {
    const config = this.getConfig();
    const key = this.extractKeyFromObjectPath(objectPath);

    try {
      await this.getClient().send(
        new HeadObjectCommand({
          Bucket: config.privateBucket,
          Key: key,
        })
      );
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new ObjectNotFoundError();
      }
      throw error;
    }

    return {
      bucket: config.privateBucket,
      key,
    };
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath) {
      return rawPath;
    }

    const trimmed = rawPath.trim();

    if (trimmed.startsWith("/objects/")) {
      return trimmed;
    }

    // Legacy Replit storage paths
    if (trimmed.startsWith("/.private/uploads/")) {
      const legacyId = trimmed.split("/.private/uploads/")[1];
      if (legacyId) {
        return `/objects/uploads/${legacyId}`;
      }
    }

    try {
      const url = new URL(trimmed);
      const pathname = url.pathname.replace(/^\/+/, "");

      // Legacy Google Cloud Storage URLs
      if (url.host.includes("storage.googleapis.com")) {
        if (pathname.includes(".private/uploads/")) {
          const legacyId = pathname.split(".private/uploads/")[1];
          if (legacyId) {
            return `/objects/uploads/${legacyId}`;
          }
        }
        return trimmed;
      }

      const config = this.getConfig();
      const endpointHost = new URL(config.endpoint).host;
      const segments = pathname.split("/").filter(Boolean);

      if (url.host === endpointHost && segments.length >= 2) {
        const bucket = segments[0];
        const key = segments.slice(1).join("/");

        if (bucket === config.privateBucket) {
          return `/objects/${key}`;
        }

        if (config.publicBucket && bucket === config.publicBucket) {
          return config.publicBaseUrl
            ? `${config.publicBaseUrl}/${key}`
            : `/objects/${key}`;
        }
      }

      if (
        config.publicBaseUrl &&
        trimmed.startsWith(config.publicBaseUrl + "/")
      ) {
        const key = trimmed.slice(config.publicBaseUrl.length + 1);
        return `/objects/${key}`;
      }
    } catch {
      // Ignore URL parsing errors and fallback to original path
    }

    return trimmed;
  }

  async trySetObjectEntityAclPolicy(rawPath: string): Promise<string> {
    // Cloudflare R2 não oferece ACL customizável via API semelhante.
    return this.normalizeObjectEntityPath(rawPath);
  }

  async canAccessObjectEntity(): Promise<boolean> {
    // Mantido por compatibilidade com interface anterior.
    return true;
  }

  private extractKeyFromObjectPath(objectPath: string): string {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const key = objectPath.replace(/^\/objects\//, "");
    if (!key) {
      throw new ObjectNotFoundError();
    }

    return key;
  }

  private isNotFoundError(error: any): boolean {
    if (!error) return false;
    if (error instanceof ObjectNotFoundError) return true;

    const code =
      error?.name || error?.Code || error?.code || error?.$metadata?.httpStatusCode;

    return (
      code === "NotFound" ||
      code === "NoSuchKey" ||
      code === 404 ||
      error?.$metadata?.httpStatusCode === 404
    );
  }
}

