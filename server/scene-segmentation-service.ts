import ffmpeg from 'fluent-ffmpeg';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs/promises';
import { SceneDescription } from '@shared/schema';

interface SceneSegment {
  id: number;
  startSec: number;
  endSec: number;
  durationSec: number;
  keyframes: Array<{
    timestamp: number;
    url: string;
    tempPath?: string;
  }>;
}

interface SegmentationConfig {
  sceneThreshold: number; // Scene change sensitivity (0.1-1.0)
  minSceneDuration: number; // Minimum scene duration in seconds
  maxScenesPerVideo: number; // Maximum scenes to extract
  keyframesPerScene: number; // How many keyframes to extract per scene
}

export class SceneSegmentationService {
  private config: SegmentationConfig = {
    sceneThreshold: 0.3, // 30% change threshold
    minSceneDuration: 2.0, // Minimum 2 seconds per scene
    maxScenesPerVideo: 20, // Maximum 20 scenes
    keyframesPerScene: 3, // 3 keyframes per scene
  };

  private tempDir: string = '/tmp/scene-analysis';

  constructor() {
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  /**
   * Download video from URL to temporary file
   */
  private async downloadVideo(videoUrl: string): Promise<string> {
    try {
      console.log(`🎬 Downloading video: ${videoUrl}`);
      
      const response = await fetch(videoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const tempVideoPath = path.join(this.tempDir, `video_${Date.now()}.mp4`);
      const buffer = await response.buffer();
      await fs.writeFile(tempVideoPath, buffer);

      console.log(`✅ Video downloaded to: ${tempVideoPath}`);
      return tempVideoPath;
    } catch (error) {
      console.error('❌ Video download failed:', error);
      throw new Error(`Failed to download video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get video duration using ffprobe
   */
  private async getVideoDuration(videoPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err: any, metadata: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        const duration = metadata.format?.duration;
        if (!duration) {
          reject(new Error('Unable to determine video duration'));
          return;
        }
        
        resolve(duration);
      });
    });
  }

  /**
   * Extract audio from video as WAV for Whisper compatibility
   */
  async extractAudioFromVideo(videoPath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      console.log(`🎵 Extracting audio from: ${videoPath}`);
      
      const chunks: Buffer[] = [];
      
      // Extract as WAV with optimal settings for Whisper
      ffmpeg(videoPath)
        .noVideo()
        .audioCodec('pcm_s16le')  // PCM 16-bit for WAV
        .audioChannels(1)          // Mono for better transcription
        .audioFrequency(16000)     // 16kHz as recommended by Whisper
        .format('wav')             // WAV format for Whisper
        .on('error', (err) => {
          console.error('❌ Audio extraction error:', err);
          reject(err);
        })
        .on('end', () => {
          const audioBuffer = Buffer.concat(chunks);
          console.log(`✅ Audio extracted as WAV: ${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB`);
          resolve(audioBuffer);
        })
        .pipe()
        .on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
    });
  }

  /**
   * Detect scene changes using ffmpeg scene filter
   */
  private async detectSceneChanges(videoPath: string, duration: number): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const sceneTimestamps: number[] = [0]; // Always include start
      
      console.log(`🎬 Detecting scene changes with threshold: ${this.config.sceneThreshold}`);

      ffmpeg(videoPath)
        .videoFilters([
          `select=gt(scene,${this.config.sceneThreshold})`,
          'showinfo'
        ])
        .outputFormat('null')
        .output('-')
        .on('stderr', (stderrLine: string) => {
          // Parse scene detection output
          const sceneMatch = stderrLine.match(/pts_time:([\d.]+)/);
          if (sceneMatch) {
            const timestamp = parseFloat(sceneMatch[1]);
            // Collect ALL timestamps first, filter later for better partitioning
            sceneTimestamps.push(timestamp);
          }
        })
        .on('end', () => {
          // Add end timestamp
          sceneTimestamps.push(duration);
          
          // Remove duplicates and sort
          const uniqueTimestamps = Array.from(new Set(sceneTimestamps))
            .sort((a, b) => a - b)
            .slice(0, this.config.maxScenesPerVideo + 1);
          
          console.log(`✅ Detected ${uniqueTimestamps.length - 1} scenes:`, uniqueTimestamps);
          resolve(uniqueTimestamps);
        })
        .on('error', (err: any) => {
          console.warn('⚠️ Scene detection failed, using time-based fallback');
          // Fallback: Split video into equal segments
          const segments = Math.min(8, Math.ceil(duration / 5)); // 5-second segments, max 8
          const fallbackTimestamps = [];
          
          for (let i = 0; i <= segments; i++) {
            fallbackTimestamps.push((duration / segments) * i);
          }
          
          resolve(fallbackTimestamps);
        })
        .run();
    });
  }

  /**
   * Extract keyframes for specific time ranges
   */
  private async extractKeyframes(videoPath: string, sceneSegments: SceneSegment[]): Promise<SceneSegment[]> {
    console.log(`🎬 Extracting keyframes for ${sceneSegments.length} scenes`);

    for (const scene of sceneSegments) {
      const keyframes: Array<{ timestamp: number; url: string; tempPath: string }> = [];
      
      // Calculate keyframe timestamps within this scene
      const sceneDuration = scene.endSec - scene.startSec;
      const keyframeInterval = sceneDuration / (this.config.keyframesPerScene + 1);
      
      for (let i = 1; i <= this.config.keyframesPerScene; i++) {
        const timestamp = scene.startSec + (keyframeInterval * i);
        const frameFileName = `scene_${scene.id}_frame_${i}_${timestamp.toFixed(2)}s.jpg`;
        const framePath = path.join(this.tempDir, frameFileName);
        
        try {
          await this.extractSingleKeyframe(videoPath, timestamp, framePath);
          
          // Convert to data URL for immediate use
          const frameBuffer = await fs.readFile(framePath);
          const dataUrl = `data:image/jpeg;base64,${frameBuffer.toString('base64')}`;
          
          keyframes.push({
            timestamp,
            url: dataUrl,
            tempPath: framePath
          });
          
          console.log(`✅ Extracted keyframe at ${timestamp.toFixed(2)}s for scene ${scene.id}`);
        } catch (error) {
          console.warn(`⚠️ Failed to extract keyframe at ${timestamp.toFixed(2)}s:`, error);
        }
      }
      
      scene.keyframes = keyframes;
    }

    console.log(`✅ Extracted keyframes for all scenes`);
    return sceneSegments;
  }

  /**
   * Extract a single keyframe at specific timestamp
   */
  private async extractSingleKeyframe(videoPath: string, timestamp: number, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(timestamp)
        .frames(1)
        .size('640x360') // Reasonable size for analysis
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });
  }

  /**
   * Cleanup temporary files
   */
  private async cleanupTempFiles(filePaths: string[]) {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
        console.log(`🗑️ Cleaned up: ${filePath}`);
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup ${filePath}:`, error);
      }
    }
  }

  /**
   * Main method: Segment video into scenes with keyframes
   */
  async segmentVideo(videoUrl: string): Promise<SceneSegment[]> {
    console.log(`🎬 Starting scene segmentation for video: ${videoUrl}`);
    
    let tempVideoPath: string | null = null;
    const tempFiles: string[] = [];

    try {
      // 1. Download video
      tempVideoPath = await this.downloadVideo(videoUrl);
      tempFiles.push(tempVideoPath);

      // 2. Get video duration
      const duration = await this.getVideoDuration(tempVideoPath);
      console.log(`📏 Video duration: ${duration.toFixed(2)}s`);

      // 3. Detect scene changes
      const sceneTimestamps = await this.detectSceneChanges(tempVideoPath, duration);

      // 4. Create scene segments with post-processing for gap-free partitioning
      const rawSegments: SceneSegment[] = [];
      
      // First pass: create all segments
      for (let i = 0; i < sceneTimestamps.length - 1; i++) {
        const startSec = sceneTimestamps[i];
        const endSec = sceneTimestamps[i + 1];
        const durationSec = endSec - startSec;

        rawSegments.push({
          id: i + 1,
          startSec,
          endSec,
          durationSec,
          keyframes: []
        });
      }
      
      // Second pass: merge short scenes with neighbors and ensure no gaps
      const sceneSegments: SceneSegment[] = [];
      let currentSegment: SceneSegment | null = null;
      
      for (const segment of rawSegments) {
        if (segment.durationSec < this.config.minSceneDuration) {
          // Merge with previous segment if exists
          if (currentSegment) {
            currentSegment.endSec = segment.endSec;
            currentSegment.durationSec = currentSegment.endSec - currentSegment.startSec;
          } else {
            // Start new segment even if short (will merge with next)
            currentSegment = { ...segment };
          }
        } else {
          // Add previous segment if exists
          if (currentSegment) {
            sceneSegments.push(currentSegment);
          }
          // Start new segment
          currentSegment = { ...segment };
        }
      }
      
      // Add last segment
      if (currentSegment) {
        sceneSegments.push(currentSegment);
      }
      
      // Renumber segments and ensure perfect coverage
      for (let i = 0; i < sceneSegments.length; i++) {
        sceneSegments[i].id = i + 1;
        // Ensure no gaps between segments
        if (i > 0) {
          sceneSegments[i].startSec = sceneSegments[i - 1].endSec;
        }
      }
      
      // Ensure last segment ends at video duration
      if (sceneSegments.length > 0) {
        sceneSegments[sceneSegments.length - 1].endSec = duration;
        sceneSegments[sceneSegments.length - 1].durationSec = 
          duration - sceneSegments[sceneSegments.length - 1].startSec;
      }

      console.log(`🎬 Created ${sceneSegments.length} scene segments`);

      // 5. Extract keyframes for each scene
      const scenesWithKeyframes = await this.extractKeyframes(tempVideoPath, sceneSegments);

      // 6. Collect temp files for cleanup
      for (const scene of scenesWithKeyframes) {
        tempFiles.push(...scene.keyframes.map(kf => kf.tempPath).filter(Boolean) as string[]);
      }

      console.log(`✅ Scene segmentation complete: ${scenesWithKeyframes.length} scenes processed`);
      return scenesWithKeyframes;

    } catch (error) {
      console.error('❌ Scene segmentation failed:', error);
      throw error;
    } finally {
      // Cleanup temp files
      if (tempFiles.length > 0) {
        await this.cleanupTempFiles(tempFiles);
      }
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SegmentationConfig>) {
    this.config = { ...this.config, ...config };
    console.log('🔧 Scene segmentation config updated:', this.config);
  }
}

export const sceneSegmentationService = new SceneSegmentationService();