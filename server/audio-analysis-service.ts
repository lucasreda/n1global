import OpenAI from 'openai';
import * as fft from 'fft-js';
// @ts-ignore
import { Matrix } from 'ml-matrix';

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
      // Create a proper File object for OpenAI SDK with correct MIME type
      const audioFile = new File([audioBuffer], 'audio.wav', { 
        type: 'audio/wav',
        lastModified: Date.now()
      });
      
      const transcriptionResponse = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        // Remove language to auto-detect the original language
        response_format: 'verbose_json',
        timestamp_granularities: ['word', 'segment']
      });

      // Step 2: Extract complete transcript with all timestamps
      const transcript = transcriptionResponse.text;
      const duration = transcriptionResponse.duration || 0;
      const language = (transcriptionResponse as any).language || 'unknown';
      const words = (transcriptionResponse as any).words || [];
      const segments = (transcriptionResponse as any).segments || [];
      
      console.log(`🎵 Transcription complete:`);
      console.log(`   Language detected: ${language}`);
      console.log(`   Total words: ${words.length}`);
      console.log(`   Total segments: ${segments.length}`);
      console.log(`   Duration: ${duration}s`);
      
      // Step 3: Analyze transcript content for insights
      const contentAnalysis = await this.analyzeTranscriptContent(transcript);
      
      // Step 4: Detect music and audio quality (using enhanced analysis with spectral data)
      const audioQualityAnalysis = await this.analyzeAudioQuality(transcript, duration, audioBuffer);
      
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
   * Analyze audio quality and detect music with advanced heuristics and spectral analysis
   */
  private async analyzeAudioQuality(transcript: string, duration: number, audioBuffer?: Buffer): Promise<{
    audioQuality: number;
    musicDetected: boolean;
    musicType?: string;
    silencePercentage: number;
    voiceClarity: number;
    backgroundMusicPresence: number;
    spectralAnalysis?: any;
  }> {
    // Step 1: Spectral analysis if buffer is available
    let spectralAnalysis = null;
    let spectralInsights = '';
    
    if (audioBuffer) {
      spectralAnalysis = await this.performSpectralAnalysis(audioBuffer);
      spectralInsights = `
Análise Espectral:
- Energia musical detectada: ${spectralAnalysis.musicEnergyScore}/10
- Clareza vocal: ${spectralAnalysis.voiceClarity}/10
- Presença de graves (música): ${spectralAnalysis.bassPresence}/10
- Harmônicos instrumentais: ${spectralAnalysis.harmonicContent}/10
- Variação dinâmica: ${spectralAnalysis.dynamicRange}/10`;
    }

    // Step 2: Enhanced GPT-4o analysis with rich context
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em análise de áudio para conteúdo publicitário. 
          Analise com ALTA PRECISÃO baseado na transcrição, duração e análise espectral.

INSTRUÇÕES CRÍTICAS:
1. Vídeos comerciais de 15-60s COM fala fluida GERALMENTE têm música de fundo
2. Se transcrição é clara E duração > 10s É PROVÁVEL música de fundo presente
3. Música instrumental NÃO aparece na transcrição - use contexto e heurísticas
4. Analise padrões típicos de áudio comercial profissional

Retorne JSON com:
{
  "audioQuality": number (1-10, baseado na clareza da transcrição),
  "voiceClarity": number (1-10, clareza específica da voz),
  "musicDetected": boolean (MÚSICA DE FUNDO presente),
  "backgroundMusicPresence": number (1-10, confiança da presença musical),
  "musicType": string ("energetic", "calm", "dramatic", "upbeat", "corporate", "emotional"),
  "musicGenre": string ("pop", "instrumental", "corporate", "cinematic", "electronic"),
  "silencePercentage": number (0-100),
  "commercialMusicLikely": boolean (baseado em padrões comerciais),
  "reasoning": string (explique seu raciocínio)
}`
        },
        {
          role: 'user',
          content: `DADOS PARA ANÁLISE:
Transcrição: "${transcript}"
Duração: ${duration}s
Palavras na transcrição: ${transcript.split(' ').length}
Densidade de fala: ${(transcript.split(' ').length / duration * 60).toFixed(1)} palavras/minuto
Tipo de conteúdo: ${duration < 30 ? 'Anúncio curto' : duration < 60 ? 'Anúncio médio' : 'Conteúdo longo'}
${spectralInsights}

CONTEXTO ADICIONAL:
- Áudio comercial profissional típico: música + narração
- Transcrição clara + duração significativa = provável música de fundo
- Energia sonora consistente indica camadas musicais instrumentais`
        }
      ],
      temperature: 0.2, // Mais determinístico para precisão
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    try {
      const analysis = JSON.parse(completion.choices[0].message.content || '{}');
      
      // Enhanced confidence scoring based on multiple factors
      let musicConfidence = analysis.backgroundMusicPresence || 5;
      
      // Boost confidence if spectral analysis detected music
      if (spectralAnalysis && spectralAnalysis.musicEnergyScore > 6) {
        musicConfidence = Math.min(10, musicConfidence + 2);
      }
      
      // Commercial heuristics boost
      if (analysis.commercialMusicLikely && duration > 15 && transcript.length > 50) {
        musicConfidence = Math.min(10, musicConfidence + 1.5);
      }
      
      console.log(`🎵 Enhanced Audio Analysis Result:`);
      console.log(`   Music detected: ${analysis.musicDetected} (confidence: ${musicConfidence}/10)`);
      console.log(`   Voice clarity: ${analysis.voiceClarity}/10`);
      console.log(`   Audio quality: ${analysis.audioQuality}/10`);
      console.log(`   Reasoning: ${analysis.reasoning}`);
      
      return {
        audioQuality: Math.min(10, Math.max(1, analysis.audioQuality || 5)),
        voiceClarity: Math.min(10, Math.max(1, analysis.voiceClarity || 5)),
        musicDetected: analysis.musicDetected || musicConfidence > 6,
        backgroundMusicPresence: Math.round(musicConfidence),
        musicType: analysis.musicType,
        silencePercentage: Math.min(100, Math.max(0, analysis.silencePercentage || 0)),
        spectralAnalysis
      };
    } catch (error) {
      console.error('Error parsing enhanced audio quality analysis:', error);
      return {
        audioQuality: 5,
        voiceClarity: 5,
        musicDetected: false,
        backgroundMusicPresence: 3,
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
        // Try Web File API (Node 18+) with correct WAV format
        audioFile = new File([audioBuffer], 'audio.wav', { 
          type: 'audio/wav',
          lastModified: Date.now()
        });
      } catch {
        // Fallback for older Node.js versions with correct WAV format
        const Blob = require('buffer').Blob || global.Blob;
        if (Blob) {
          audioFile = new Blob([audioBuffer], { type: 'audio/wav' }) as any;
          (audioFile as any).name = 'audio.wav';
        } else {
          // Last resort - create a minimal File-like object
          audioFile = Object.assign(audioBuffer, {
            name: 'audio.wav',
            type: 'audio/wav',
            size: audioBuffer.length,
            lastModified: Date.now()
          }) as any;
        }
      }
      
      // Use Whisper with auto language detection for original language transcription
      const transcriptionResponse = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        // No language specified - Whisper will auto-detect
        response_format: 'verbose_json',
        timestamp_granularities: ['word', 'segment']
      });
      
      const language = (transcriptionResponse as any).language || 'unknown';
      console.log(`🎵 Detected language: ${language}`);
      console.log(`🎵 Total words with timestamps: ${((transcriptionResponse as any).words || []).length}`);
      console.log(`🎵 Total segments: ${((transcriptionResponse as any).segments || []).length}`);

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
      // Find words that fall within this scene's time range (precise alignment)
      const wordsInScene = transcriptData.words.filter(word => {
        // Include word if its center point falls within the scene
        const wordCenter = (word.start + word.end) / 2;
        return wordCenter >= scene.startSec && wordCenter < scene.endSec;
      });

      // Find segments that overlap with this scene  
      const segmentsInScene = transcriptData.segments.filter(segment => {
        // Include segment if it overlaps with the scene
        return segment.start < scene.endSec && segment.end > scene.startSec;
      });

      // Extract transcript snippet for this scene
      const transcriptSnippet = segmentsInScene
        .map(segment => segment.text.trim())
        .join(' ')
        .trim();

      // Analyze audio characteristics for this scene
      const audioAnalysis = this.analyzeSceneAudio(transcriptSnippet, wordsInScene, scene);

      console.log(`🎵 Scene ${scene.id}: ${wordsInScene.length} words, ${segmentsInScene.length} segments`);
      
      // Log first and last word timestamps for validation
      if (wordsInScene.length > 0) {
        console.log(`   First word: "${wordsInScene[0].word}" at ${wordsInScene[0].start.toFixed(2)}s`);
        console.log(`   Last word: "${wordsInScene[wordsInScene.length - 1].word}" at ${wordsInScene[wordsInScene.length - 1].end.toFixed(2)}s`);
      }

      return {
        sceneId: scene.id,
        startSec: scene.startSec,
        endSec: scene.endSec,
        audio: audioAnalysis,
        wordsInScene,
        segmentsInScene
      };
    });

    // Validation: Check coverage and completeness
    const totalWordsInScenes = alignedScenes.reduce((sum, scene) => sum + scene.wordsInScene.length, 0);
    const coveragePercentage = (totalWordsInScenes / transcriptData.words.length) * 100;
    
    console.log(`✅ Audio alignment complete for all scenes`);
    console.log(`📊 Transcript coverage: ${totalWordsInScenes}/${transcriptData.words.length} words (${coveragePercentage.toFixed(1)}%)`);
    
    // Warn if coverage is less than 95%
    if (coveragePercentage < 95) {
      console.warn(`⚠️ Low transcript coverage: ${coveragePercentage.toFixed(1)}%. Some words may be missing between scenes.`);
    }
    
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
    
    // Ensure minimum audio quality of 3 for detected speech, 1 for no speech
    const baseQuality = words.length > 0 ? 3 : 1;
    const audioQuality = Math.max(baseQuality, Math.round(avgConfidence * 10));

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