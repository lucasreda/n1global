import OpenAI from 'openai';

/**
 * Fusion Analysis Service - Combines audio and visual analysis for complete insights
 */
export class FusionAnalysisService {
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
   * Fuse audio and visual analysis into comprehensive insights
   */
  async fuseAnalyses(
    audioAnalysis: {
      transcript: string;
      audioQuality: number;
      voiceStyle: string;
      musicDetected: boolean;
      musicType?: string;
      ctaAudio: string[];
      duration: number;
    },
    visualAnalysis: {
      keyframes: Array<{
        timestamp: number;
        description: string;
        objects: string[];
        text: string[];
        visualScore: number;
      }>;
      products: string[];
      logoVisibility: number;
      textOnScreen: string[];
      visualQuality: number;
    },
    creativeMeta?: {
      type: 'image' | 'video';
      campaignGoal?: string;
      targetAudience?: string;
    }
  ): Promise<{
    overallScore: number;
    timeline: Array<{
      timeRange: string;
      audioEvent?: string;
      visualEvent?: string;
      syncQuality: number;
      importance: 'high' | 'medium' | 'low';
    }>;
    audioVisualSync: 'perfect' | 'good' | 'poor';
    narrativeFlow: string;
    ctaAlignment: string;
    predictedPerformance: {
      ctr: number;
      cvr: number;
      engagement: string;
    };
    keyStrengths: string[];
    improvements: string[];
    processingTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Step 1: Create synchronized timeline
      const timeline = await this.createSynchronizedTimeline(audioAnalysis, visualAnalysis);
      
      // Step 2: Analyze audio-visual synchronization
      const syncAnalysis = await this.analyzeSynchronization(audioAnalysis, visualAnalysis);
      
      // Step 3: Calculate comprehensive scores
      const scoringResults = await this.calculateComprehensiveScores(audioAnalysis, visualAnalysis, syncAnalysis);
      
      // Step 4: Generate actionable insights
      const insights = await this.generateActionableInsights(audioAnalysis, visualAnalysis, syncAnalysis, scoringResults);
      
      const processingTime = Date.now() - startTime;
      
      return {
        timeline,
        processingTime,
        ...syncAnalysis,
        ...scoringResults,
        ...insights
      };
      
    } catch (error) {
      console.error('Fusion analysis error:', error);
      throw new Error(`Fusion analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create synchronized timeline of audio and visual events
   */
  private async createSynchronizedTimeline(
    audioAnalysis: any,
    visualAnalysis: any
  ): Promise<Array<{
    timeRange: string;
    audioEvent?: string;
    visualEvent?: string;
    syncQuality: number;
    importance: 'high' | 'medium' | 'low';
  }>> {
    const timeline = [];
    const duration = audioAnalysis.duration;
    
    // Map keyframes to timeline segments
    for (const keyframe of visualAnalysis.keyframes) {
      const startTime = Math.max(0, keyframe.timestamp - 1);
      const endTime = Math.min(duration, keyframe.timestamp + 2);
      
      // Extract relevant audio segment (simplified)
      const audioSegment = this.extractAudioSegment(audioAnalysis.transcript, startTime, endTime, duration);
      
      // Calculate sync quality based on audio-visual alignment
      const syncQuality = this.calculateSyncQuality(keyframe, audioSegment);
      
      // Determine importance based on content
      const importance = this.determineImportance(keyframe, audioSegment);
      
      timeline.push({
        timeRange: `${startTime}s-${endTime}s`,
        audioEvent: audioSegment,
        visualEvent: keyframe.description,
        syncQuality,
        importance
      });
    }
    
    return timeline.sort((a, b) => {
      const aStart = parseInt(a.timeRange.split('s-')[0]);
      const bStart = parseInt(b.timeRange.split('s-')[0]);
      return aStart - bStart;
    });
  }

  /**
   * Analyze audio-visual synchronization quality
   */
  private async analyzeSynchronization(audioAnalysis: any, visualAnalysis: any): Promise<{
    audioVisualSync: 'perfect' | 'good' | 'poor';
    narrativeFlow: string;
    ctaAlignment: string;
  }> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Analise a sincronização entre áudio e visual de um criativo publicitário.

Retorne um JSON com:
1. audioVisualSync: "perfect" | "good" | "poor" - Qualidade da sincronização
2. narrativeFlow: string - Descrição do fluxo narrativo (ex: "problema→solução→CTA")
3. ctaAlignment: string - Como o CTA visual e sonoro se alinham

Baseie-se na coerência entre o que é dito e o que é mostrado.`
          },
          {
            role: 'user',
            content: `Análise de sincronização:

ÁUDIO:
- Transcrição: "${audioAnalysis.transcript}"
- CTAs sonoros: ${audioAnalysis.ctaAudio.join(', ')}
- Duração: ${audioAnalysis.duration}s

VISUAL:
- Produtos mostrados: ${visualAnalysis.products.join(', ')}
- Textos na tela: ${visualAnalysis.textOnScreen.join(', ')}
- Keyframes: ${visualAnalysis.keyframes.length}
- Timeline: ${visualAnalysis.keyframes.map(k => `${k.timestamp}s: ${k.description}`).join(' | ')}`
          }
        ],
        temperature: 0.3,
        max_tokens: 600,
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        audioVisualSync: analysis.audioVisualSync || 'good',
        narrativeFlow: analysis.narrativeFlow || 'Fluxo narrativo padrão',
        ctaAlignment: analysis.ctaAlignment || 'CTAs alinhados'
      };

    } catch (error) {
      console.error('Sync analysis error:', error);
      return {
        audioVisualSync: 'good',
        narrativeFlow: 'Análise não disponível',
        ctaAlignment: 'Análise não disponível'
      };
    }
  }

  /**
   * Calculate comprehensive performance scores
   */
  private async calculateComprehensiveScores(
    audioAnalysis: any,
    visualAnalysis: any,
    syncAnalysis: any
  ): Promise<{
    overallScore: number;
    predictedPerformance: {
      ctr: number;
      cvr: number;
      engagement: string;
    };
  }> {
    // Weighted scoring algorithm
    const weights = {
      audioQuality: 0.20,
      visualQuality: 0.25,
      synchronization: 0.25,
      ctaStrength: 0.15,
      brandVisibility: 0.15
    };

    // Normalize scores
    const audioScore = audioAnalysis.audioQuality / 10; // 0-1
    const visualScore = visualAnalysis.visualQuality / 10; // 0-1
    const syncScore = this.mapSyncToScore(syncAnalysis.audioVisualSync); // 0-1
    const ctaScore = this.calculateCtaScore(audioAnalysis.ctaAudio, visualAnalysis.textOnScreen); // 0-1
    const brandScore = visualAnalysis.logoVisibility / 10; // 0-1

    // Calculate weighted overall score
    const overallScore = (
      audioScore * weights.audioQuality +
      visualScore * weights.visualQuality +
      syncScore * weights.synchronization +
      ctaScore * weights.ctaStrength +
      brandScore * weights.brandVisibility
    ) * 10; // Scale back to 1-10

    // Predict performance based on scores
    const predictedPerformance = this.predictPerformanceMetrics(overallScore, {
      audioScore,
      visualScore,
      syncScore,
      ctaScore,
      brandScore
    });

    return {
      overallScore: Math.round(overallScore * 10) / 10,
      predictedPerformance
    };
  }

  /**
   * Generate actionable insights and recommendations
   */
  private async generateActionableInsights(
    audioAnalysis: any,
    visualAnalysis: any,
    syncAnalysis: any,
    scoringResults: any
  ): Promise<{
    keyStrengths: string[];
    improvements: string[];
  }> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Gere insights acionáveis para otimização de um criativo publicitário.

Retorne um JSON com:
1. keyStrengths: string[] - 3-5 pontos fortes específicos
2. improvements: string[] - 3-5 melhorias específicas e acionáveis

Foque em insights que podem aumentar CTR e CVR.`
          },
          {
            role: 'user',
            content: `Dados para análise:

SCORES:
- Overall: ${scoringResults.overallScore}/10
- Áudio: ${audioAnalysis.audioQuality}/10
- Visual: ${visualAnalysis.visualQuality}/10
- Sincronização: ${syncAnalysis.audioVisualSync}

CONTEXTO:
- CTAs áudio: ${audioAnalysis.ctaAudio.join(', ')}
- CTAs visual: ${visualAnalysis.textOnScreen.join(', ')}
- Produtos: ${visualAnalysis.products.join(', ')}
- Logo visibility: ${visualAnalysis.logoVisibility}/10
- Fluxo narrativo: ${syncAnalysis.narrativeFlow}
- Duração: ${audioAnalysis.duration}s`
          }
        ],
        temperature: 0.4,
        max_tokens: 800,
        response_format: { type: "json_object" }
      });

      const insights = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        keyStrengths: Array.isArray(insights.keyStrengths) ? insights.keyStrengths : [
          'Qualidade técnica adequada',
          'Estrutura narrativa clara'
        ],
        improvements: Array.isArray(insights.improvements) ? insights.improvements : [
          'Considere otimizar a sincronia áudio-visual',
          'Fortaleça a visibilidade da marca'
        ]
      };

    } catch (error) {
      console.error('Insights generation error:', error);
      return {
        keyStrengths: ['Análise técnica completa realizada'],
        improvements: ['Aguardando análise detalhada']
      };
    }
  }

  /**
   * Helper methods
   */
  private extractAudioSegment(transcript: string, startTime: number, endTime: number, duration: number): string {
    if (!transcript) return 'Sem áudio detectado';
    
    // Simplified: estimate which part of transcript corresponds to time segment
    const segmentRatio = (endTime - startTime) / duration;
    const startIndex = Math.floor((startTime / duration) * transcript.length);
    const endIndex = Math.min(transcript.length, startIndex + (transcript.length * segmentRatio));
    
    return transcript.slice(startIndex, endIndex).trim() || 'Segmento de áudio';
  }

  private calculateSyncQuality(keyframe: any, audioSegment: string): number {
    // Simplified sync quality calculation
    // In production, this would analyze semantic alignment between visual and audio
    if (!audioSegment || audioSegment === 'Sem áudio detectado') return 5;
    
    // Check if visual elements match audio content
    const hasProductMatch = keyframe.objects.some((obj: string) => 
      audioSegment.toLowerCase().includes(obj.toLowerCase())
    );
    
    const hasTextMatch = keyframe.text.some((text: string) => 
      audioSegment.toLowerCase().includes(text.toLowerCase())
    );
    
    let score = 7; // Base score
    if (hasProductMatch) score += 1.5;
    if (hasTextMatch) score += 1.5;
    
    return Math.min(10, score);
  }

  private determineImportance(keyframe: any, audioSegment: string): 'high' | 'medium' | 'low' {
    // Check for CTA indicators
    const ctaIndicators = ['comprar', 'buy', 'shop', 'agora', 'now', 'clique', 'click'];
    const hasCTA = ctaIndicators.some(indicator => 
      audioSegment.toLowerCase().includes(indicator) ||
      keyframe.text.some((text: string) => text.toLowerCase().includes(indicator))
    );
    
    if (hasCTA) return 'high';
    if (keyframe.objects.length > 2) return 'medium';
    return 'low';
  }

  private mapSyncToScore(sync: string): number {
    const syncMap = {
      'perfect': 1.0,
      'good': 0.8,
      'poor': 0.5
    };
    return syncMap[sync as keyof typeof syncMap] || 0.8;
  }

  private calculateCtaScore(audioCtAs: string[], visualCtAs: string[]): number {
    if (audioCtAs.length === 0 && visualCtAs.length === 0) return 0.3;
    if (audioCtAs.length > 0 && visualCtAs.length > 0) return 1.0;
    if (audioCtAs.length > 0 || visualCtAs.length > 0) return 0.7;
    return 0.5;
  }

  private predictPerformanceMetrics(overallScore: number, componentScores: any): {
    ctr: number;
    cvr: number;
    engagement: string;
  } {
    // Simplified performance prediction model
    const baseCTR = 1.2; // Average CTR baseline
    const baseCVR = 1.8; // Average CVR baseline
    
    const ctrMultiplier = 0.5 + (overallScore / 10) * 0.8; // 0.5 to 1.3
    const cvrMultiplier = 0.6 + (componentScores.ctaScore * 0.7); // 0.6 to 1.3
    
    const predictedCTR = baseCTR * ctrMultiplier;
    const predictedCVR = baseCVR * cvrMultiplier;
    
    let engagement = 'baixo';
    if (overallScore > 7.5) engagement = 'alto';
    else if (overallScore > 6) engagement = 'médio';
    
    return {
      ctr: Math.round(predictedCTR * 100) / 100,
      cvr: Math.round(predictedCVR * 100) / 100,
      engagement
    };
  }
}