import express, { Request, Response } from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { authenticateToken } from '../auth-middleware';
import {
  getS3Client,
  getStorageConfig,
  ObjectNotFoundError,
  ObjectStorageService,
} from '../objectStorage';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const router = express.Router();
const objectStorageService = new ObjectStorageService();

/**
 * Serve images from Object Storage
 */
router.get('/api/storage/public/page-builder/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const objectKey = `public/page-builder/${filename}`;
    
    console.log('🖼️ Attempting to serve image:', objectKey);

    const objectRef = await objectStorageService.getObjectEntityFile(`/objects/${objectKey}`);
    await objectStorageService.downloadObject(objectRef, res, 31536000);
    
  } catch (error) {
    console.error('❌ Error serving image:', error);
    if (error instanceof ObjectNotFoundError) {
      return res.status(404).json({ error: 'Image not found' });
    }
    res.status(500).json({ error: 'Failed to load image' });
  }
});

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for images
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  },
});

/**
 * Upload image for page builder
 */
router.post('/api/upload', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const s3 = getS3Client();
    const config = getStorageConfig();
    
    // Generate a unique filename  
    const fileExt = file.originalname.split('.').pop() || 'png';
    const fileName = `${nanoid()}.${fileExt}`;
    const objectKey = `public/page-builder/${fileName}`;
    
    await s3.send(new PutObjectCommand({
      Bucket: config.privateBucket,
      Key: objectKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    const baseUrl = process.env.R2_PUBLIC_BASE_URL
      ? `${process.env.R2_PUBLIC_BASE_URL.replace(/\/+$/, '')}/${objectKey}`
      : `${req.protocol}://${req.get('host')}/api/storage/public/page-builder/${fileName}`;

    const publicUrl = process.env.R2_PUBLIC_BASE_URL
      ? baseUrl
      : `${req.protocol}://${req.get('host')}/api/storage/public/page-builder/${fileName}`;

    console.log(`✅ Upload successful - URL: ${publicUrl}`);
    
    // Return the URL
    res.json({ url: publicUrl });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Upload responsive images (desktop and mobile versions)
 */
router.post('/api/upload/responsive', authenticateToken, upload.fields([
  { name: 'desktop', maxCount: 1 },
  { name: 'mobile', maxCount: 1 }
]), async (req: Request, res: Response) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files || (!files.desktop && !files.mobile)) {
      return res.status(400).json({ error: 'No files provided' });
    }
    
    const s3 = getS3Client();
    const config = getStorageConfig();
    const urls: { desktop?: string; mobile?: string } = {};
    
    // Upload desktop version if provided
    if (files.desktop && files.desktop[0]) {
      const desktopFile = files.desktop[0];
      const fileExt = desktopFile.originalname.split('.').pop() || 'png';
      const fileName = `${nanoid()}_desktop.${fileExt}`;
      const objectKey = `public/page-builder/${fileName}`;
      
      await s3.send(new PutObjectCommand({
        Bucket: config.privateBucket,
        Key: objectKey,
        Body: desktopFile.buffer,
        ContentType: desktopFile.mimetype,
      }));
      
      urls.desktop = process.env.R2_PUBLIC_BASE_URL
        ? `${process.env.R2_PUBLIC_BASE_URL.replace(/\/+$/, '')}/${objectKey}`
        : `${req.protocol}://${req.get('host')}/api/storage/public/page-builder/${fileName}`;
    }
    
    // Upload mobile version if provided
    if (files.mobile && files.mobile[0]) {
      const mobileFile = files.mobile[0];
      const fileExt = mobileFile.originalname.split('.').pop() || 'png';
      const fileName = `${nanoid()}_mobile.${fileExt}`;
      const objectKey = `public/page-builder/${fileName}`;
      
      await s3.send(new PutObjectCommand({
        Bucket: config.privateBucket,
        Key: objectKey,
        Body: mobileFile.buffer,
        ContentType: mobileFile.mimetype,
      }));
      
      urls.mobile = process.env.R2_PUBLIC_BASE_URL
        ? `${process.env.R2_PUBLIC_BASE_URL.replace(/\/+$/, '')}/${objectKey}`
        : `${req.protocol}://${req.get('host')}/api/storage/public/page-builder/${fileName}`;
    }
    
    // Return the URLs
    res.json(urls);
    
  } catch (error) {
    console.error('Responsive upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload images',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;