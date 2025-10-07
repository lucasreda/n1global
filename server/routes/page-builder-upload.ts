import express, { Request, Response } from 'express';
import multer from 'multer';
import { objectStorageClient } from '../objectStorage';
import { nanoid } from 'nanoid';
import { authenticateToken } from '../auth-middleware';

const router = express.Router();

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
    
    // Get the public directory from environment
    const publicDirs = process.env.PUBLIC_OBJECT_SEARCH_PATHS;
    if (!publicDirs) {
      return res.status(500).json({ error: 'Object storage not configured' });
    }
    
    // Use the first public directory
    const publicDir = publicDirs.split(',')[0].trim();
    if (!publicDir) {
      return res.status(500).json({ error: 'No public directory configured' });
    }
    
    // Parse the bucket name and path
    const pathParts = publicDir.split('/');
    const bucketName = pathParts[0];
    const dirPath = pathParts.slice(1).join('/');
    
    // Generate a unique filename
    const fileExt = file.originalname.split('.').pop() || 'png';
    const fileName = `${nanoid()}.${fileExt}`;
    const fullPath = dirPath ? `${dirPath}/${fileName}` : fileName;
    
    // Upload to bucket
    const bucket = objectStorageClient.bucket(bucketName);
    const gcsFile = bucket.file(fullPath);
    
    await gcsFile.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        cacheControl: 'public, max-age=31536000',
      },
      public: true,
      validation: false,
    });
    
    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fullPath}`;
    
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
    
    // Get the public directory from environment
    const publicDirs = process.env.PUBLIC_OBJECT_SEARCH_PATHS;
    if (!publicDirs) {
      return res.status(500).json({ error: 'Object storage not configured' });
    }
    
    // Use the first public directory
    const publicDir = publicDirs.split(',')[0].trim();
    if (!publicDir) {
      return res.status(500).json({ error: 'No public directory configured' });
    }
    
    // Parse the bucket name and path
    const pathParts = publicDir.split('/');
    const bucketName = pathParts[0];
    const dirPath = pathParts.slice(1).join('/');
    
    const bucket = objectStorageClient.bucket(bucketName);
    const urls: { desktop?: string; mobile?: string } = {};
    
    // Upload desktop version if provided
    if (files.desktop && files.desktop[0]) {
      const desktopFile = files.desktop[0];
      const fileExt = desktopFile.originalname.split('.').pop() || 'png';
      const fileName = `${nanoid()}_desktop.${fileExt}`;
      const fullPath = dirPath ? `${dirPath}/${fileName}` : fileName;
      
      const gcsFile = bucket.file(fullPath);
      await gcsFile.save(desktopFile.buffer, {
        metadata: {
          contentType: desktopFile.mimetype,
          cacheControl: 'public, max-age=31536000',
        },
        public: true,
        validation: false,
      });
      
      urls.desktop = `https://storage.googleapis.com/${bucketName}/${fullPath}`;
    }
    
    // Upload mobile version if provided
    if (files.mobile && files.mobile[0]) {
      const mobileFile = files.mobile[0];
      const fileExt = mobileFile.originalname.split('.').pop() || 'png';
      const fileName = `${nanoid()}_mobile.${fileExt}`;
      const fullPath = dirPath ? `${dirPath}/${fileName}` : fileName;
      
      const gcsFile = bucket.file(fullPath);
      await gcsFile.save(mobileFile.buffer, {
        metadata: {
          contentType: mobileFile.mimetype,
          cacheControl: 'public, max-age=31536000',
        },
        public: true,
        validation: false,
      });
      
      urls.mobile = `https://storage.googleapis.com/${bucketName}/${fullPath}`;
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