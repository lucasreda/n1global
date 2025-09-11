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
      // Create a proper File-like object for Node.js
      const audioFile = new Blob([audioBuffer], { type: 'audio/mp3' });
      
      const transcriptionResponse = await this.openai.audio.transcriptions.create({
        file: audioFile as any, // OpenAI SDK expects File but accepts Blob in Node.js
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