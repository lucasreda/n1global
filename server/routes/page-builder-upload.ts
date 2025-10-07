import express, { Request, Response } from 'express';
import multer from 'multer';
import { Client } from '@replit/object-storage';
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
    
    // Initialize Replit Object Storage client
    const client = new Client();
    
    // Generate a unique filename  
    const fileExt = file.originalname.split('.').pop() || 'png';
    const fileName = `${nanoid()}.${fileExt}`;
    const objectPath = `public/page-builder/${fileName}`;
    
    // Upload to Object Storage
    await client.uploadFromBuffer(objectPath, file.buffer, {
      type: file.mimetype
    });
    
    // Get the public URL
    const publicUrl = await client.downloadUrl(objectPath);
    
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
    
    // Initialize Replit Object Storage client
    const client = new Client();
    const urls: { desktop?: string; mobile?: string } = {};
    
    // Upload desktop version if provided
    if (files.desktop && files.desktop[0]) {
      const desktopFile = files.desktop[0];
      const fileExt = desktopFile.originalname.split('.').pop() || 'png';
      const fileName = `${nanoid()}_desktop.${fileExt}`;
      const objectPath = `public/page-builder/${fileName}`;
      
      await client.uploadFromBuffer(objectPath, desktopFile.buffer, {
        type: desktopFile.mimetype
      });
      
      urls.desktop = await client.downloadUrl(objectPath);
    }
    
    // Upload mobile version if provided
    if (files.mobile && files.mobile[0]) {
      const mobileFile = files.mobile[0];
      const fileExt = mobileFile.originalname.split('.').pop() || 'png';
      const fileName = `${nanoid()}_mobile.${fileExt}`;
      const objectPath = `public/page-builder/${fileName}`;
      
      await client.uploadFromBuffer(objectPath, mobileFile.buffer, {
        type: mobileFile.mimetype
      });
      
      urls.mobile = await client.downloadUrl(objectPath);
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