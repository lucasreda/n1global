import { writeFileSync, readFileSync, existsSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { nanoid } from 'nanoid';
import { funnelValidator, type ValidationResult } from './funnel-validator';

interface PreviewSession {
  id: string;
  files: Record<string, string>;
  createdAt: Date;
  expiresAt: Date;
  pages: Array<{
    path: string;
    name: string;
    pageType: string;
  }>;
  productInfo: {
    name: string;
    description: string;
    price: number;
    currency: string;
  };
  validation?: ValidationResult;
}

interface PreviewMetadata {
  id: string;
  name: string;
  pageCount: number;
  createdAt: string;
  expiresAt: string;
  previewUrl: string;
}

export class PreviewService {
  private previewDir = join(process.cwd(), '.previews');
  private sessions = new Map<string, PreviewSession>();
  private readonly PREVIEW_EXPIRY_HOURS = 2; // 2 horas de expiração

  constructor() {
    console.log('🎭 PreviewService initialized');
    this.ensurePreviewDirectory();
    this.loadPersistedSessions();
    this.setupCleanupInterval();
  }

  /**
   * Create a new preview session
   */
  async createPreview(
    funnelPages: Array<{
      id: string;
      name: string;
      pageType: 'landing' | 'checkout' | 'upsell' | 'downsell' | 'thankyou';
      path: string;
      model: any;
    }>,
    productInfo: {
      name: string;
      description: string;
      price: number;
      currency: string;
      targetAudience: string;
    },
    options: {
      colorScheme: 'modern' | 'vibrant' | 'minimal' | 'dark';
      layout: 'single_page' | 'multi_section' | 'video_first';
      trackingConfig?: any;
      enableSharedComponents?: boolean;
      enableProgressTracking?: boolean;
      enableRouting?: boolean;
    }
  ): Promise<PreviewMetadata> {
    console.log(`🎭 Creating preview session for ${funnelPages.length} pages`);

    // Import TemplateGenerator
    const { templateGenerator } = await import('./template-generator');

    // Generate files using TemplateGenerator
    const generatedFiles = templateGenerator.generateMultiPageFunnel(
      funnelPages,
      productInfo,
      options
    );

    // Create session with secure ID
    const sessionId = nanoid(21); // Increased security
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.PREVIEW_EXPIRY_HOURS * 60 * 60 * 1000);

    const session: PreviewSession = {
      id: sessionId,
      files: generatedFiles,
      createdAt: now,
      expiresAt,
      pages: funnelPages.map(page => ({
        path: page.path,
        name: page.name,
        pageType: page.pageType,
      })),
      productInfo: {
        name: productInfo.name,
        description: productInfo.description,
        price: productInfo.price,
        currency: productInfo.currency,
      },
    };

    // Save files to disk
    await this.saveSessionFiles(session);

    // Persist session metadata
    await this.persistSessionMetadata(session);

    // Store session in memory
    this.sessions.set(sessionId, session);

    console.log(`✅ Preview session created: ${sessionId} (expires in ${this.PREVIEW_EXPIRY_HOURS}h)`);

    // Run automatic validation
    try {
      console.log(`🧪 Running automatic validation for session: ${sessionId}`);
      const validation = await funnelValidator.validateFunnel(
        sessionId,
        generatedFiles,
        funnelPages,
        productInfo
      );

      // Update session with validation results
      session.validation = validation;
      this.sessions.set(sessionId, session);

      // Re-persist with validation results
      await this.persistSessionMetadata(session);

      console.log(`🧪 Validation completed - Score: ${validation.score}/100, Valid: ${validation.isValid}`);
    } catch (error) {
      console.warn(`⚠️ Validation failed for session ${sessionId}:`, error);
    }

    return {
      id: sessionId,
      name: productInfo.name,
      pageCount: funnelPages.length,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      previewUrl: `/api/preview/${sessionId}`,
    };
  }

  /**
   * Get preview session metadata
   */
  getPreviewMetadata(sessionId: string): PreviewMetadata | null {
    const session = this.sessions.get(sessionId);
    if (!session || this.isExpired(session)) {
      return null;
    }

    return {
      id: session.id,
      name: session.productInfo.name,
      pageCount: session.pages.length,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      previewUrl: `/api/preview/${sessionId}`,
    };
  }

  /**
   * Get file content for preview
   */
  getPreviewFile(sessionId: string, filePath: string): string | null {
    const session = this.sessions.get(sessionId);
    if (!session || this.isExpired(session)) {
      return null;
    }

    // Try to get from memory first
    if (session.files[filePath]) {
      return session.files[filePath];
    }

    // Try to read from disk
    const fullPath = join(this.previewDir, sessionId, filePath);
    if (existsSync(fullPath)) {
      return readFileSync(fullPath, 'utf-8');
    }

    return null;
  }

  /**
   * Get session pages list
   */
  getSessionPages(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session || this.isExpired(session)) {
      return null;
    }

    return {
      pages: session.pages,
      productInfo: session.productInfo,
      availableFiles: Object.keys(session.files),
    };
  }

  /**
   * List all active preview sessions
   */
  listActivePreviews(): PreviewMetadata[] {
    const activePreviews: PreviewMetadata[] = [];

    for (const [sessionId, session] of Array.from(this.sessions.entries())) {
      if (!this.isExpired(session)) {
        activePreviews.push({
          id: sessionId,
          name: session.productInfo.name,
          pageCount: session.pages.length,
          createdAt: session.createdAt.toISOString(),
          expiresAt: session.expiresAt.toISOString(),
          previewUrl: `/api/preview/${sessionId}`,
        });
      }
    }

    return activePreviews.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Delete a preview session
   */
  deletePreview(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Remove from memory
    this.sessions.delete(sessionId);

    // Remove files from disk
    const sessionDir = join(this.previewDir, sessionId);
    if (existsSync(sessionDir)) {
      rmSync(sessionDir, { recursive: true, force: true });
    }

    console.log(`🗑️ Preview session deleted: ${sessionId}`);
    return true;
  }

  /**
   * Validate preview files structure
   */
  validatePreviewFiles(sessionId: string): {
    isValid: boolean;
    missingFiles: string[];
    pageValidation: Array<{
      page: string;
      path: string;
      hasFile: boolean;
      fileName: string;
    }>;
  } {
    const session = this.sessions.get(sessionId);
    if (!session || this.isExpired(session)) {
      return {
        isValid: false,
        missingFiles: ['Session not found or expired'],
        pageValidation: [],
      };
    }

    // Check required files
    const requiredFiles = ['package.json', 'pages/_app.js', 'styles/globals.css'];
    const missingFiles = requiredFiles.filter(file => !session.files[file]);

    // Validate page files
    const pageValidation = session.pages.map(page => {
      const pageFile = page.path === '/' ? 'pages/index.js' : `pages${page.path}.js`;
      return {
        page: page.name,
        path: page.path,
        hasFile: !!session.files[pageFile],
        fileName: pageFile,
      };
    });

    const allPagesValid = pageValidation.every(p => p.hasFile);
    const isValid = missingFiles.length === 0 && allPagesValid;

    return {
      isValid,
      missingFiles,
      pageValidation,
    };
  }

  /**
   * Private methods
   */
  private ensurePreviewDirectory(): void {
    if (!existsSync(this.previewDir)) {
      mkdirSync(this.previewDir, { recursive: true });
    }
  }

  /**
   * Load persisted sessions from disk
   */
  private loadPersistedSessions(): void {
    try {
      if (!existsSync(this.previewDir)) {
        return;
      }

      const sessionDirs = readdirSync(this.previewDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      let loaded = 0;
      for (const sessionId of sessionDirs) {
        const metadataPath = join(this.previewDir, sessionId, 'metadata.json');
        if (existsSync(metadataPath)) {
          try {
            const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
            const session: PreviewSession = {
              ...metadata,
              createdAt: new Date(metadata.createdAt),
              expiresAt: new Date(metadata.expiresAt),
            };

            // Check if session is still valid
            if (!this.isExpired(session)) {
              this.sessions.set(sessionId, session);
              loaded++;
            } else {
              // Clean up expired session
              this.deletePreview(sessionId);
            }
          } catch (error) {
            console.warn(`⚠️ Failed to load session ${sessionId}:`, error);
            // Clean up corrupted session
            this.deletePreview(sessionId);
          }
        }
      }

      if (loaded > 0) {
        console.log(`🎭 Loaded ${loaded} persisted preview sessions`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load persisted sessions:', error);
    }
  }

  /**
   * Persist session metadata to disk
   */
  private async persistSessionMetadata(session: PreviewSession): Promise<void> {
    const sessionDir = join(this.previewDir, session.id);
    const metadataPath = join(sessionDir, 'metadata.json');
    
    const metadata = {
      ...session,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    };

    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
  }

  private async saveSessionFiles(session: PreviewSession): Promise<void> {
    const sessionDir = join(this.previewDir, session.id);
    mkdirSync(sessionDir, { recursive: true });

    for (const [filePath, content] of Object.entries(session.files)) {
      const fullPath = join(sessionDir, filePath);
      const dir = dirname(fullPath);
      
      // Ensure directory exists
      mkdirSync(dir, { recursive: true });
      
      // Write file
      writeFileSync(fullPath, content, 'utf-8');
    }

    console.log(`💾 Saved ${Object.keys(session.files).length} files for session ${session.id}`);
  }

  private isExpired(session: PreviewSession): boolean {
    return new Date() > session.expiresAt;
  }

  private setupCleanupInterval(): void {
    // Clean up expired sessions every 30 minutes
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 30 * 60 * 1000); // 30 minutes

    console.log('🧹 Preview cleanup interval setup (30 minutes)');
  }

  private cleanupExpiredSessions(): void {
    let cleaned = 0;
    const now = new Date();

    for (const [sessionId, session] of Array.from(this.sessions.entries())) {
      if (this.isExpired(session)) {
        this.deletePreview(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired preview sessions`);
    }
  }
}

// Export singleton instance
export const previewService = new PreviewService();