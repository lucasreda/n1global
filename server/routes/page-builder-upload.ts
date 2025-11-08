import express, { Request, Response } from 'express';
import multer from 'multer';
import { Client } from '@replit/object-storage';
import { nanoid } from 'nanoid';
import { authenticateToken } from '../auth-middleware';

const router = express.Router();

/**
 * Serve images from Object Storage
 */
router.get('/api/storage/public/page-builder/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const objectPath = `public/page-builder/${filename}`;
    
    console.log('🖼️ Attempting to serve image:', objectPath);
    
    // Initialize client for each request
    const client = new Client();
    
    // Download the file from Object Storage using the stream method
    const readableStream = await client.downloadAsStream(objectPath);
    
    // Determine content type based on file extension
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    };
    
    const contentType = contentTypes[ext || ''] || 'application/octet-stream';
    
    // Send the file with appropriate headers
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000',
    });
    
    // Stream the file to the response
    readableStream.pipe(res);
    
  } catch (error) {
    console.error('❌ Error serving image:', error);
    res.status(404).json({ error: 'Image not found' });
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
    
    // Initialize Replit Object Storage client (lazy)
    const client = new Client();
    
    // Generate a unique filename  
    const fileExt = file.originalname.split('.').pop() || 'png';
    const fileName = `${nanoid()}.${fileExt}`;
    const objectPath = `public/page-builder/${fileName}`;
    
    // Upload to Object Storage
    await client.uploadFromBytes(objectPath, file.buffer);
    
    // Construct the public URL for the uploaded file
    const baseUrl = process.env.REPLIT_DEV_DOMAIN ? 
      `https://${process.env.REPLIT_DEV_DOMAIN}` : 
      'http://localhost:5000';
    const publicUrl = `${baseUrl}/api/storage/public/page-builder/${fileName}`;
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
    
    // Initialize Replit Object Storage client (lazy)
    const client = new Client();
    const urls: { desktop?: string; mobile?: string } = {};
    
    // Upload desktop version if provided
    if (files.desktop && files.desktop[0]) {
      const desktopFile = files.desktop[0];
      const fileExt = desktopFile.originalname.split('.').pop() || 'png';
      const fileName = `${nanoid()}_desktop.${fileExt}`;
      const objectPath = `public/page-builder/${fileName}`;
      
      await client.uploadFromBytes(objectPath, desktopFile.buffer);
      
      const baseUrl = process.env.REPLIT_DEV_DOMAIN ? 
        `https://${process.env.REPLIT_DEV_DOMAIN}` : 
        'http://localhost:5000';
      urls.desktop = `${baseUrl}/api/storage/public/page-builder/${fileName}`;
    }
    
    // Upload mobile version if provided
    if (files.mobile && files.mobile[0]) {
      const mobileFile = files.mobile[0];
      const fileExt = mobileFile.originalname.split('.').pop() || 'png';
      const fileName = `${nanoid()}_mobile.${fileExt}`;
      const objectPath = `public/page-builder/${fileName}`;
      
      await client.uploadFromBytes(objectPath, mobileFile.buffer);
      
      const baseUrl = process.env.REPLIT_DEV_DOMAIN ? 
        `https://${process.env.REPLIT_DEV_DOMAIN}` : 
        'http://localhost:5000';
      urls.mobile = `${baseUrl}/api/storage/public/page-builder/${fileName}`;
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