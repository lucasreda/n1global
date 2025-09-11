import { createCanvas, loadImage, Canvas } from 'canvas';

/**
 * Keyframe Extraction Service - Intelligently extract key moments from videos
 */
export class KeyframeExtractionService {
  
  /**
   * Extract strategic keyframes from video URL
   */
  async extractKeyframes(videoUrl: string, options?: {
    maxKeyframes?: number;
    minInterval?: number; // minimum seconds between keyframes
    includeMetadata?: boolean;
  }): Promise<Array<{
    timestamp: number;
    url: string;
    base64?: string;
    description: string;
    confidence: number;
    frameType: 'hook' | 'product' | 'cta' | 'transition' | 'end';
  }>> {
    const maxKeyframes = options?.maxKeyframes || 7;
    const minInterval = options?.minInterval || 2; // 2 seconds minimum between frames
    
    try {
      // Step 1: Download video and get basic info
      const videoBuffer = await this.downloadVideo(videoUrl);
      const videoDuration = await this.getVideoDuration(videoBuffer);
      
      // Step 2: Calculate strategic timestamps
      const strategicTimestamps = this.calculateStrategicTimestamps(videoDuration, maxKeyframes, minInterval);
      
      // Step 3: Extract frames at those timestamps
      const keyframes = await this.extractFramesAtTimestamps(videoBuffer, strategicTimestamps);
      
      // Step 4: Analyze and classify each keyframe
      const analyzedKeyframes = await this.analyzeKeyframes(keyframes);
      
      return analyzedKeyframes;
      
    } catch (error) {
      console.error('Keyframe extraction error:', error);
      throw new Error(`Keyframe extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate strategic timestamps for keyframes
   */
  private calculateStrategicTimestamps(duration: number, maxKeyframes: number, minInterval: number): number[] {
    const timestamps: number[] = [];
    
    // Always include start (hook)
    timestamps.push(1); // 1 second in to avoid black frames
    
    if (duration <= 10) {
      // Short videos (≤10s): beginning, middle, end
      if (duration > 5) {
        timestamps.push(Math.floor(duration / 2));
      }
      timestamps.push(Math.max(duration - 2, 2));
      
    } else if (duration <= 30) {
      // Medium videos (10-30s): strategic points
      timestamps.push(Math.floor(duration * 0.2)); // Early hook/problem
      timestamps.push(Math.floor(duration * 0.4)); // Product introduction  
      timestamps.push(Math.floor(duration * 0.7)); // Benefits/features
      timestamps.push(Math.floor(duration * 0.9)); // CTA/end
      
    } else {
      // Long videos (>30s): more comprehensive coverage
      timestamps.push(Math.floor(duration * 0.1)); // Hook/attention
      timestamps.push(Math.floor(duration * 0.25)); // Problem/setup
      timestamps.push(Math.floor(duration * 0.4)); // Product/solution
      timestamps.push(Math.floor(duration * 0.6)); // Benefits/demo
      timestamps.push(Math.floor(duration * 0.8)); // Social proof/urgency
      timestamps.push(Math.floor(duration * 0.95)); // CTA/end
    }
    
    // Remove duplicates and ensure minimum interval
    const filteredTimestamps = [];
    let lastTimestamp = 0;
    
    for (const timestamp of timestamps.sort((a, b) => a - b)) {
      if (timestamp - lastTimestamp >= minInterval) {
        filteredTimestamps.push(timestamp);
        lastTimestamp = timestamp;
      }
    }
    
    return filteredTimestamps.slice(0, maxKeyframes);
  }

  /**
   * Extract frames at specific timestamps
   */
  private async extractFramesAtTimestamps(
    videoBuffer: Buffer, 
    timestamps: number[]
  ): Promise<Array<{
    timestamp: number;
    imageBuffer: Buffer;
    width: number;
    height: number;
  }>> {
    const frames = [];
    
    try {
      // For now, we'll create placeholder frames
      // In a production environment, you'd use FFmpeg or similar
      for (const timestamp of timestamps) {
        const placeholderFrame = await this.createPlaceholderFrame(timestamp);
        frames.push({
          timestamp,
          imageBuffer: placeholderFrame,
          width: 1920,
          height: 1080
        });
      }
      
      return frames;
      
    } catch (error) {
      throw new Error(`Frame extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a placeholder frame (in production, this would be actual video frame)
   */
  private async createPlaceholderFrame(timestamp: number): Promise<Buffer> {
    const canvas = createCanvas(1920, 1080);
    const ctx = canvas.getContext('2d');
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 1920, 1080);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1920, 1080);
    
    // Add timestamp text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Frame at ${timestamp}s`, 960, 540);
    
    // Add frame info
    ctx.font = '36px Arial';
    ctx.fillText('Keyframe Extracted', 960, 620);
    
    return canvas.toBuffer('image/jpeg', { quality: 0.8 });
  }

  /**
   * Analyze keyframes to classify and describe them
   */
  private async analyzeKeyframes(frames: Array<{
    timestamp: number;
    imageBuffer: Buffer;
    width: number;
    height: number;
  }>): Promise<Array<{
    timestamp: number;
    url: string;
    base64?: string;
    description: string;
    confidence: number;
    frameType: 'hook' | 'product' | 'cta' | 'transition' | 'end';
  }>> {
    const analyzedFrames = [];
    
    for (const frame of frames) {
      // Convert to base64 for storage/display
      const base64 = frame.imageBuffer.toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64}`;
      
      // Classify frame type based on timestamp position
      const frameType = this.classifyFrameType(frame.timestamp, frames[frames.length - 1].timestamp);
      
      // Generate description based on frame type
      const description = this.generateFrameDescription(frameType, frame.timestamp);
      
      analyzedFrames.push({
        timestamp: frame.timestamp,
        url: dataUrl,
        base64: base64,
        description,
        confidence: 0.85, // Placeholder confidence
        frameType
      });
    }
    
    return analyzedFrames;
  }

  /**
   * Classify frame type based on timestamp position
   */
  private classifyFrameType(
    timestamp: number, 
    totalDuration: number
  ): 'hook' | 'product' | 'cta' | 'transition' | 'end' {
    const position = timestamp / totalDuration;
    
    if (position <= 0.15) return 'hook';
    if (position <= 0.5) return 'product';
    if (position <= 0.8) return 'transition';
    if (position <= 0.95) return 'cta';
    return 'end';
  }

  /**
   * Generate frame description based on type
   */
  private generateFrameDescription(
    frameType: 'hook' | 'product' | 'cta' | 'transition' | 'end',
    timestamp: number
  ): string {
    const descriptions = {
      hook: `Momento de abertura (${timestamp}s) - Captura de atenção inicial`,
      product: `Apresentação do produto (${timestamp}s) - Destaque principal`,
      transition: `Momento de transição (${timestamp}s) - Desenvolvimento da narrativa`,
      cta: `Call-to-action (${timestamp}s) - Momento de conversão`,
      end: `Fechamento (${timestamp}s) - Finalização da mensagem`
    };
    
    return descriptions[frameType];
  }

  /**
   * Download video from URL
   */
  private async downloadVideo(videoUrl: string): Promise<Buffer> {
    try {
      const response = await fetch(videoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
      
    } catch (error) {
      throw new Error(`Video download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get video duration (placeholder - would use FFprobe in production)
   */
  private async getVideoDuration(videoBuffer: Buffer): Promise<number> {
    // Placeholder: estimate duration based on file size
    // In production, you'd use FFprobe or similar to get exact duration
    const fileSizeMB = videoBuffer.length / (1024 * 1024);
    const estimatedDuration = Math.max(10, Math.min(60, fileSizeMB * 3)); // Rough estimate
    
    return Math.floor(estimatedDuration);
  }

  /**
   * Convert frame to different formats
   */
  async convertFrameFormat(
    imageBuffer: Buffer, 
    format: 'jpeg' | 'png' | 'webp' = 'jpeg',
    quality: number = 0.8
  ): Promise<Buffer> {
    try {
      const canvas = createCanvas(1920, 1080);
      const ctx = canvas.getContext('2d');
      
      const image = await loadImage(imageBuffer);
      ctx.drawImage(image, 0, 0, 1920, 1080);
      
      if (format === 'png') {
        return canvas.toBuffer('image/png');
      } else if (format === 'webp') {
        // Note: canvas doesn't support WebP directly, fall back to JPEG
        return canvas.toBuffer('image/jpeg', { quality });
      } else {
        return canvas.toBuffer('image/jpeg', { quality });
      }
      
    } catch (error) {
      throw new Error(`Format conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resize frame for optimal processing
   */
  async resizeFrame(
    imageBuffer: Buffer, 
    maxWidth: number = 1920, 
    maxHeight: number = 1080
  ): Promise<Buffer> {
    try {
      const image = await loadImage(imageBuffer);
      
      // Calculate aspect ratio and new dimensions
      const aspectRatio = image.width / image.height;
      let newWidth = maxWidth;
      let newHeight = maxHeight;
      
      if (aspectRatio > maxWidth / maxHeight) {
        newHeight = Math.floor(maxWidth / aspectRatio);
      } else {
        newWidth = Math.floor(maxHeight * aspectRatio);
      }
      
      const canvas = createCanvas(newWidth, newHeight);
      const ctx = canvas.getContext('2d');
      
      ctx.drawImage(image, 0, 0, newWidth, newHeight);
      
      return canvas.toBuffer('image/jpeg', { quality: 0.9 });
      
    } catch (error) {
      throw new Error(`Frame resize failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}