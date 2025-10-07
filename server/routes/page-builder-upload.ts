import express, { Request, Response } from 'express';
import multer from 'multer';
import { ObjectStorageClient } from '@replit/object-storage';
import { nanoid } from 'nanoid';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const client = new ObjectStorageClient();

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
router.post('/api/upload', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    const requestedPath = req.body.path;
    
    // Generate unique filename if path not provided
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    const uniqueFilename = requestedPath || `page-builder/images/${nanoid()}.${fileExtension}`;
    
    // Use public directory for page builder images
    const publicDir = process.env.PUBLIC_OBJECT_SEARCH_PATHS
      ? JSON.parse(process.env.PUBLIC_OBJECT_SEARCH_PATHS)[0]
      : '/public';
    
    const fullPath = `${publicDir}/${uniqueFilename}`;
    
    console.log(`📤 Uploading page builder image to: ${fullPath}`);
    
    // Upload to object storage
    await client.uploadFromBytes(fullPath, file.buffer);
    
    // Generate public URL
    const baseUrl = process.env.REPL_SLUG 
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : '';
    const url = `${baseUrl}/object/${uniqueFilename}`;
    
    console.log(`✅ Image uploaded successfully: ${uniqueFilename}`);
    
    return res.json({
      url,
      filename: file.originalname,
      size: file.size,
      path: fullPath,
    });
    
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    return res.status(500).json({ error: 'Failed to upload image' });
  }
});

/**
 * Get image from object storage
 */
router.get('/object/*', async (req: Request, res: Response) => {
  try {
    const imagePath = req.params[0];
    
    if (!imagePath) {
      return res.status(400).json({ error: 'No path specified' });
    }
    
    // Construct full path
    const publicDir = process.env.PUBLIC_OBJECT_SEARCH_PATHS
      ? JSON.parse(process.env.PUBLIC_OBJECT_SEARCH_PATHS)[0]
      : '/public';
    
    const fullPath = `${publicDir}/${imagePath}`;
    
    console.log(`📥 Fetching image from: ${fullPath}`);
    
    // Download from object storage
    const fileContent = await client.downloadAsBytes(fullPath);
    
    if (!fileContent) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Determine content type based on extension
    const ext = imagePath.split('.').pop()?.toLowerCase();
    let contentType = 'image/jpeg';
    
    if (ext === 'png') contentType = 'image/png';
    else if (ext === 'gif') contentType = 'image/gif';
    else if (ext === 'webp') contentType = 'image/webp';
    else if (ext === 'svg') contentType = 'image/svg+xml';
    
    // Set cache headers for performance
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    return res.send(fileContent);
    
  } catch (error) {
    console.error('❌ Error fetching image:', error);
    return res.status(404).json({ error: 'Image not found' });
  }
});

export default router;