import OpenAI from 'openai';

/**
 * Audio Analysis Service - Uses OpenAI Whisper for comprehensive audio analysis
 */
export class AudioAnalysisService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  /**
   * Analyze audio from video URL or buffer
   */
  async analyzeAudio(audioBuffer: Buffer, options?: {
    detectMusic?: boolean;
    analyzeQuality?: boolean;
    detectCTAs?: boolean;
  }): Promise<{
    transcript: string;
    audioQuality: number;
    voiceStyle: string;
    musicDetected: boolean;
    musicType?: string;
    silencePercentage: number;
    speechRate: number;
    ctaAudio: string[];
    duration: number;
    processingTime: number;
    cost: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Step 1: Transcription with Whisper
      // Create a proper File object for OpenAI SDK
      const audioFile = new File([audioBuffer], 'audio.mp3', { 
        type: 'audio/mp3',
        lastModified: Date.now()
      });
      
      const transcriptionResponse = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'pt', // Portuguese
        response_format: 'verbose_json',
        timestamp_granularities: ['word', 'segment']
      });

      // Step 2: Extract basic audio metrics
      const transcript = transcriptionResponse.text;
      const duration = transcriptionResponse.duration || 0;
      
      // Step 3: Analyze transcript content for insights
      const contentAnalysis = await this.analyzeTranscriptContent(transcript);
      
      // Step 4: Detect music and audio quality (using GPT-4o audio analysis)
      const audioQualityAnalysis = await this.analyzeAudioQuality(transcript, duration);
      
      // Step 5: Calculate metrics
      const processingTime = Date.now() - startTime;
      const cost = this.calculateCost(duration);
      
      const result = {
        transcript,
        duration,
        processingTime,
        cost,
        ...contentAnalysis,
        ...audioQualityAnalysis
      };

      return result;
      
    } catch (error) {
      console.error('Audio analysis error:', error);
      throw new Error(`Audio analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze transcript content for marketing insights
   */
  private async analyzeTranscriptContent(transcript: string): Promise<{
    voiceStyle: string;
    speechRate: number;
    ctaAudio: string[];
  }> {
    if (!transcript.trim()) {
      return {
        voiceStyle: 'sem áudio detectado',
        speechRate: 0,
        ctaAudio: []
      };
    }

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Analise este texto transcrito de um áudio publicitário.
          
Retorne um JSON com:
1. voiceStyle: string - Descrição do estilo da voz (ex: "energético, masculino, confiável")
2. speechRate: number - Velocidade da fala (palavras por minuto estimado)  
3. ctaAudio: string[] - Calls-to-action identificados no áudio

Seja preciso e objetivo.`
        },
        {
          role: 'user',
          content: `Transcrição: "${transcript}"`
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    try {
      const analysis = JSON.parse(completion.choices[0].message.content || '{}');
      return {
        voiceStyle: analysis.voiceStyle || 'não identificado',
        speechRate: analysis.speechRate || 0,
        ctaAudio: Array.isArray(analysis.ctaAudio) ? analysis.ctaAudio : []
      };
    } catch (error) {
      console.error('Error parsing transcript analysis:', error);
      return {
        voiceStyle: 'erro na análise',
        speechRate: 0,
        ctaAudio: []
      };
    }
  }

  /**
   * Analyze audio quality and detect music
   */
  private async analyzeAudioQuality(transcript: string, duration: number): Promise<{
    audioQuality: number;
    musicDetected: boolean;
    musicType?: string;
    silencePercentage: number;
  }> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Analise a qualidade de áudio baseado na transcrição e duração.
          
Retorne um JSON com:
1. audioQuality: number - Score de 1-10 (10 = excelente qualidade)
2. musicDetected: boolean - Se há música de fundo detectável
3. musicType: string - Tipo de música se detectada (ex: "upbeat", "calm", "dramatic")
4. silencePercentage: number - Estimativa de % de silêncio (0-100)

Base sua análise na clareza da transcrição e completude do conteúdo.`
        },
        {
          role: 'user',
          content: `Transcrição: "${transcript}"\nDuração: ${duration}s`
        }
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    try {
      const analysis = JSON.parse(completion.choices[0].message.content || '{}');
      return {
        audioQuality: Math.min(10, Math.max(1, analysis.audioQuality || 5)),
        musicDetected: analysis.musicDetected || false,
        musicType: analysis.musicType,
        silencePercentage: Math.min(100, Math.max(0, analysis.silencePercentage || 0))
      };
    } catch (error) {
      console.error('Error parsing audio quality analysis:', error);
      return {
        audioQuality: 5,
        musicDetected: false,
        silencePercentage: 20
      };
    }
  }

  /**
   * Calculate Whisper API cost
   */
  private calculateCost(durationSeconds: number): number {
    const durationMinutes = durationSeconds / 60;
    return durationMinutes * 0.003; // $0.003 per minute for Whisper
  }

  /**
   * Download and extract audio from video URL
   */
  async extractAudioFromVideo(videoUrl: string): Promise<Buffer> {
    try {
      // For Facebook videos, we need to download the video first
      const response = await fetch(videoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.status}`);
      }
      
      const videoBuffer = await response.arrayBuffer();
      
      // For now, we'll assume the video contains audio directly
      // In a production environment, you might want to use FFmpeg to extract audio
      return Buffer.from(videoBuffer);
      
    } catch (error) {
      throw new Error(`Failed to extract audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ========================================
  // SCENE-BASED AUDIO ALIGNMENT
  // ========================================

  /**
   * Analyze audio with detailed timestamps for scene alignment
   */
  async analyzeAudioWithTimestamps(audioBuffer: Buffer): Promise<{
    transcript: string;
    duration: number;
    words: Array<{
      word: string;
      start: number;
      end: number;
      confidence?: number;
    }>;
    segments: Array<{
      text: string;
      start: number;
      end: number;
      avgLogprob?: number;
      noSpeechProb?: number;
    }>;
    processingTime: number;
    cost: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Create File object for Whisper API - Node.js compatible
      let audioFile: File;
      try {
        // Try Web File API (Node 18+)
        audioFile = new File([audioBuffer], 'audio.mp3', { 
          type: 'audio/mp3',
          lastModified: Date.now()
        });
      } catch {
        // Fallback for older Node.js versions
        const Blob = require('buffer').Blob || global.Blob;
        if (Blob) {
          audioFile = new Blob([audioBuffer], { type: 'audio/mp3' }) as any;
          (audioFile as any).name = 'audio.mp3';
        } else {
          // Last resort - create a minimal File-like object
          audioFile = Object.assign(audioBuffer, {
            name: 'audio.mp3',
            type: 'audio/mp3',
            size: audioBuffer.length,
            lastModified: Date.now()
          }) as any;
        }
      }
      
      // Use Whisper with detailed timestamp data
      const transcriptionResponse = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'pt',
        response_format: 'verbose_json',
        timestamp_granularities: ['word', 'segment']
      });

      const processingTime = Date.now() - startTime;
      const cost = this.calculateCost(transcriptionResponse.duration || 0);

      return {
        transcript: transcriptionResponse.text,
        duration: transcriptionResponse.duration || 0,
        words: (transcriptionResponse as any).words || [],
        segments: (transcriptionResponse as any).segments || [],
        processingTime,
        cost
      };
      
    } catch (error) {
      console.error('❌ Audio analysis with timestamps failed:', error);
      throw new Error(`Audio analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Align transcript segments with scene timeline
   */
  alignTranscriptWithScenes(
    transcriptData: {
      transcript: string;
      words: Array<{ word: string; start: number; end: number; confidence?: number }>;
      segments: Array<{ text: string; start: number; end: number }>;
    },
    sceneSegments: Array<{
      id: number;
      startSec: number;
      endSec: number;
      durationSec: number;
    }>
  ): Array<{
    sceneId: number;
    startSec: number;
    endSec: number;
    audio: {
      transcriptSnippet: string;
      voicePresent: boolean;
      voiceStyle?: string;
      musicDetected: boolean;
      musicType?: string;
      soundEffects?: string[];
      audioQuality: number;
      volume: 'quiet' | 'normal' | 'loud';
      ctas?: string[];
    };
    wordsInScene: Array<{ word: string; start: number; end: number; confidence?: number }>;
    segmentsInScene: Array<{ text: string; start: number; end: number }>;
  }> {
    console.log(`🎵 Aligning transcript with ${sceneSegments.length} scenes`);
    
    const alignedScenes = sceneSegments.map(scene => {
      // Find words that OVERLAP with this scene's time range (more inclusive)
      const wordsInScene = transcriptData.words.filter(word => 
        this.hasTimeOverlap(
          { start: word.start, end: word.end },
          { startSec: scene.startSec, endSec: scene.endSec }
        )
      );

      // Find segments that overlap with this scene
      const segmentsInScene = transcriptData.segments.filter(segment => 
        this.hasTimeOverlap(segment, scene)
      );

      // Extract transcript snippet for this scene
      const transcriptSnippet = segmentsInScene
        .map(segment => segment.text.trim())
        .join(' ')
        .trim();

      // Analyze audio characteristics for this scene
      const audioAnalysis = this.analyzeSceneAudio(transcriptSnippet, wordsInScene, scene);

      console.log(`🎵 Scene ${scene.id}: ${wordsInScene.length} words, ${segmentsInScene.length} segments`);

      return {
        sceneId: scene.id,
        startSec: scene.startSec,
        endSec: scene.endSec,
        audio: audioAnalysis,
        wordsInScene,
        segmentsInScene
      };
    });

    console.log(`✅ Audio alignment complete for all scenes`);
    return alignedScenes;
  }

  /**
   * Check if two time ranges overlap
   */
  private hasTimeOverlap(
    segment: { start: number; end: number },
    scene: { startSec: number; endSec: number }
  ): boolean {
    return segment.start < scene.endSec && segment.end > scene.startSec;
  }

  /**
   * Analyze audio characteristics for a specific scene
   */
  private analyzeSceneAudio(
    transcriptSnippet: string,
    words: Array<{ word: string; start: number; end: number; confidence?: number }>,
    scene: { startSec: number; endSec: number; durationSec: number }
  ) {
    const voicePresent = transcriptSnippet.length > 0;
    
    // Calculate speech rate (words per minute)
    const speechRate = voicePresent ? (words.length / scene.durationSec) * 60 : 0;
    
    // Detect CTAs in transcript
    const ctaKeywords = [
      'compre', 'comprar', 'adquira', 'garanta', 'aproveite', 'clique', 'acesse',
      'visite', 'ligue', 'contate', 'cadastre-se', 'inscreva-se', 'baixe',
      'download', 'oferta', 'desconto', 'promoção', 'agora', 'hoje',
      'últimos dias', 'por tempo limitado'
    ];
    
    const ctas = ctaKeywords.filter(keyword => 
      transcriptSnippet.toLowerCase().includes(keyword.toLowerCase())
    );

    // Analyze voice style based on transcript content
    let voiceStyle: string | undefined;
    if (voicePresent) {
      if (transcriptSnippet.includes('!') || transcriptSnippet.includes('incrível')) {
        voiceStyle = 'energetic';
      } else if (transcriptSnippet.includes('profissional') || transcriptSnippet.includes('qualidade')) {
        voiceStyle = 'professional';
      } else if (transcriptSnippet.includes('você') || transcriptSnippet.includes('seu')) {
        voiceStyle = 'casual';
      } else {
        voiceStyle = 'neutral';
      }
    }

    // Estimate audio quality based on word confidence
    const avgConfidence = words.length > 0 
      ? words.reduce((sum, word) => sum + (word.confidence || 0.8), 0) / words.length
      : 0.5;
    const audioQuality = Math.round(avgConfidence * 10);

    // Estimate volume based on speech density
    let volume: 'quiet' | 'normal' | 'loud';
    if (speechRate < 100) {
      volume = 'quiet';
    } else if (speechRate > 180) {
      volume = 'loud';
    } else {
      volume = 'normal';
    }

    // Simple music detection (would need more advanced analysis in production)
    const musicIndicators = ['música', 'instrumental', 'beat', 'som'];
    const musicDetected = musicIndicators.some(indicator => 
      transcriptSnippet.toLowerCase().includes(indicator)
    );

    return {
      transcriptSnippet,
      voicePresent,
      voiceStyle,
      musicDetected,
      musicType: musicDetected ? 'instrumental' : undefined,
      soundEffects: [], // Would need advanced audio analysis
      audioQuality,
      volume,
      ctas: ctas.length > 0 ? ctas : undefined
    };
  }

  /**
   * Calculate audio-visual sync quality for scenes
   */
  calculateSyncQuality(
    alignedScenes: Array<{
      sceneId: number;
      audio: { transcriptSnippet: string; voicePresent: boolean; ctas?: string[] };
    }>,
    visualScenes: Array<{
      id: number;
      text: Array<{ content: string }>;
      objects: Array<{ label: string }>;
      brandElements: string[];
    }>
  ): Array<{
    sceneId: number;
    syncQuality: number;
    syncAnalysis: {
      audioVisualMatch: number;
      ctaTextAlignment: number;
      brandMention: number;
    };
  }> {
    return alignedScenes.map(audioScene => {
      const visualScene = visualScenes.find(v => v.id === audioScene.sceneId);
      
      if (!visualScene) {
        return {
          sceneId: audioScene.sceneId,
          syncQuality: 3,
          syncAnalysis: {
            audioVisualMatch: 3,
            ctaTextAlignment: 3,
            brandMention: 3
          }
        };
      }

      // Check if audio matches visual text
      const visualTexts = visualScene.text.map(t => t.content.toLowerCase());
      const audioText = audioScene.audio.transcriptSnippet.toLowerCase();
      
      let audioVisualMatch = 5; // Default neutral
      for (const visualText of visualTexts) {
        if (audioText.includes(visualText) || visualText.includes(audioText.substring(0, 20))) {
          audioVisualMatch = Math.min(10, audioVisualMatch + 2);
        }
      }

      // Check CTA alignment
      const ctaTextAlignment = audioScene.audio.ctas && audioScene.audio.ctas.length > 0 
        ? (visualTexts.some(vt => audioScene.audio.ctas!.some(cta => vt.includes(cta))) ? 9 : 6)
        : 5;

      // Check brand mention alignment
      const brandMention = visualScene.brandElements.length > 0 && audioScene.audio.voicePresent
        ? (visualScene.brandElements.some(brand => audioText.includes(brand.toLowerCase())) ? 8 : 4)
        : 5;

      const syncQuality = Math.round((audioVisualMatch + ctaTextAlignment + brandMention) / 3);

      return {
        sceneId: audioScene.sceneId,
        syncQuality,
        syncAnalysis: {
          audioVisualMatch,
          ctaTextAlignment,
          brandMention
        }
      };
    });
  }

  /**
   * Validate if file is a valid audio/video format
   */
  isValidAudioFormat(buffer: Buffer): boolean {
    // Check magic numbers for common audio/video formats
    const magic = buffer.slice(0, 4);
    
    // MP3
    if (magic[0] === 0xFF && (magic[1] & 0xE0) === 0xE0) return true;
    
    // MP4/M4A
    if (buffer.slice(4, 8).toString() === 'ftyp') return true;
    
    // WAV
    if (magic.toString() === 'RIFF') return true;
    
    // WebM
    if (magic.slice(0, 4).toString('hex') === '1a45dfa3') return true;
    
    return false;
  }
}