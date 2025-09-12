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
- Timeline: ${visualAnalysis.keyframes.map((k: any) => `${k.timestamp}s: ${k.description}`).join(' | ')}`
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

  // ========================================
  // SCENE-BY-SCENE FUSION ANALYSIS
  // ========================================

  /**
   * Create structured scene timeline by fusing visual and audio analysis
   */
  async createSceneTimeline(
    visualScenes: Array<{
      id: number;
      startSec: number;
      endSec: number;
      durationSec: number;
      technicalDescription: string;
      objects: Array<{ label: string; count: number; confidence?: number }>;
      text: Array<{ content: string; position?: string; fontSize?: string; color?: string }>;
      peopleCount: number;
      dominantColors: string[];
      brandElements: string[];
      composition: any;
      transitionIn?: any;
      transitionOut?: any;
      motionIntensity: number;
      visualComplexity: number;
      visualScore: number;
      engagementScore: number;
      keyframes: Array<{ timestamp: number; url: string; description: string }>;
    }>,
    audioScenes: Array<{
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
        volume: string;
        ctas?: string[];
      };
    }>,
    syncQualityData: Array<{
      sceneId: number;
      syncQuality: number;
      syncAnalysis: {
        audioVisualMatch: number;
        ctaTextAlignment: number;
        brandMention: number;
      };
    }>
  ): Promise<{
    scenes: Array<{
      id: number;
      startSec: number;
      endSec: number;
      durationSec: number;
      technicalDescription: string;
      objects: any[];
      text: any[];
      peopleCount: number;
      dominantColors: string[];
      brandElements: string[];
      composition: any;
      transitionIn?: any;
      transitionOut?: any;
      motionIntensity: number;
      visualComplexity: number;
      audio: any;
      visualScore: number;
      engagementScore: number;
      syncQuality: number;
      keyframes: any[];
    }>;
    totalDuration: number;
    overallScore: number;
    overallSummary: string;
    totalObjects: any[];
    allTextContent: string[];
    dominantColorPalette: string[];
    averageSceneLength: number;
    technicalQuality: number;
    narrativeFlow: number;
    audioVisualSync: number;
    brandConsistency: number;
    keyStrengths: string[];
    improvements: string[];
    recommendations: string[];
    analysisVersion: string;
    processingTime: number;
    totalCost: number;
  }> {
    const startTime = Date.now();
    
    console.log(`🔥 Creating structured scene timeline for ${visualScenes.length} scenes`);

    // Merge visual and audio data per scene
    const fusedScenes = visualScenes.map(visualScene => {
      const audioScene = audioScenes.find(a => a.sceneId === visualScene.id);
      const syncData = syncQualityData.find(s => s.sceneId === visualScene.id);

      return {
        id: visualScene.id,
        startSec: visualScene.startSec,
        endSec: visualScene.endSec,
        durationSec: visualScene.durationSec,
        technicalDescription: visualScene.technicalDescription,
        objects: visualScene.objects,
        text: visualScene.text,
        peopleCount: visualScene.peopleCount,
        dominantColors: visualScene.dominantColors,
        brandElements: visualScene.brandElements,
        composition: visualScene.composition,
        transitionIn: visualScene.transitionIn,
        transitionOut: visualScene.transitionOut,
        motionIntensity: visualScene.motionIntensity,
        visualComplexity: visualScene.visualComplexity,
        audio: audioScene ? audioScene.audio : {
          transcriptSnippet: '',
          voicePresent: false,
          musicDetected: false,
          audioQuality: 3,
          volume: 'quiet'
        },
        visualScore: visualScene.visualScore,
        engagementScore: visualScene.engagementScore,
        syncQuality: syncData ? syncData.syncQuality : 3,
        keyframes: visualScene.keyframes
      };
    });

    // Calculate aggregated metrics
    const totalDuration = Math.max(...visualScenes.map(s => s.endSec));
    const averageSceneLength = totalDuration / fusedScenes.length;

    // Aggregate all objects across scenes
    const totalObjects = this.aggregateObjects(fusedScenes);

    // Aggregate all text content
    const allTextContent = this.aggregateTextContent(fusedScenes);

    // Calculate dominant color palette
    const dominantColorPalette = this.calculateDominantColorPalette(fusedScenes);

    // Calculate quality scores
    const scores = this.calculateQualityScores(fusedScenes);
    const overallScore = scores.overall;

    // Generate insights and recommendations
    const insights = await this.generateSceneTimelineInsights(fusedScenes, scores);

    // Create overall summary
    const overallSummary = this.createOverallSummary(fusedScenes, scores);

    const processingTime = Date.now() - startTime;
    const totalCost = this.calculateTotalFusionCost(fusedScenes.length);

    console.log(`✅ Scene timeline created: ${fusedScenes.length} scenes, overall score: ${overallScore.toFixed(1)}`);

    return {
      scenes: fusedScenes,
      totalDuration,
      overallScore,
      overallSummary,
      totalObjects,
      allTextContent,
      dominantColorPalette,
      averageSceneLength,
      technicalQuality: scores.technical,
      narrativeFlow: scores.narrative,
      audioVisualSync: scores.sync,
      brandConsistency: scores.brand,
      keyStrengths: insights.strengths,
      improvements: insights.improvements,
      recommendations: insights.recommendations,
      analysisVersion: '2.0.0-scene-timeline',
      processingTime,
      totalCost
    };
  }

  /**
   * Aggregate objects across all scenes
   */
  private aggregateObjects(scenes: any[]): any[] {
    const objectMap = new Map<string, { label: string; count: number; scenes: number[] }>();

    scenes.forEach(scene => {
      scene.objects.forEach((obj: any) => {
        const key = obj.label.toLowerCase();
        if (objectMap.has(key)) {
          const existing = objectMap.get(key)!;
          existing.count += obj.count;
          existing.scenes.push(scene.id);
        } else {
          objectMap.set(key, {
            label: obj.label,
            count: obj.count,
            scenes: [scene.id]
          });
        }
      });
    });

    return Array.from(objectMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 most frequent objects
  }

  /**
   * Aggregate text content across all scenes
   */
  private aggregateTextContent(scenes: any[]): string[] {
    const textSet = new Set<string>();

    scenes.forEach(scene => {
      scene.text.forEach((textItem: any) => {
        if (textItem.content && textItem.content.trim().length > 0) {
          textSet.add(textItem.content.trim());
        }
      });
    });

    return Array.from(textSet)
      .sort((a, b) => b.length - a.length) // Longer texts first
      .slice(0, 50); // Top 50 text elements
  }

  /**
   * Calculate dominant color palette across all scenes
   */
  private calculateDominantColorPalette(scenes: any[]): string[] {
    const colorFrequency = new Map<string, number>();

    scenes.forEach(scene => {
      scene.dominantColors.forEach((color: string) => {
        colorFrequency.set(color, (colorFrequency.get(color) || 0) + 1);
      });
    });

    return Array.from(colorFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([color]) => color)
      .slice(0, 10); // Top 10 most frequent colors
  }

  /**
   * Calculate quality scores across all dimensions
   */
  private calculateQualityScores(scenes: any[]): {
    overall: number;
    technical: number;
    narrative: number;
    sync: number;
    brand: number;
  } {
    if (scenes.length === 0) {
      return { overall: 3, technical: 3, narrative: 3, sync: 3, brand: 3 };
    }

    const technical = scenes.reduce((sum, scene) => sum + scene.visualScore, 0) / scenes.length;
    const engagement = scenes.reduce((sum, scene) => sum + scene.engagementScore, 0) / scenes.length;
    const sync = scenes.reduce((sum, scene) => sum + scene.syncQuality, 0) / scenes.length;

    // Calculate narrative flow based on scene transitions and consistency
    const narrative = this.calculateNarrativeFlow(scenes);

    // Calculate brand consistency based on brand elements presence
    const brand = this.calculateBrandConsistency(scenes);

    const overall = (technical + engagement + sync + narrative + brand) / 5;

    return {
      overall: Math.round(overall * 10) / 10,
      technical: Math.round(technical * 10) / 10,
      narrative: Math.round(narrative * 10) / 10,
      sync: Math.round(sync * 10) / 10,
      brand: Math.round(brand * 10) / 10
    };
  }

  /**
   * Calculate narrative flow score
   */
  private calculateNarrativeFlow(scenes: any[]): number {
    if (scenes.length <= 1) return 7; // Single scene gets neutral score

    let flowScore = 7; // Start with neutral

    // Check for smooth transitions
    const hasTransitions = scenes.some(scene => scene.transitionIn || scene.transitionOut);
    if (hasTransitions) flowScore += 1;

    // Check for consistent pacing (scene length variation)
    const sceneLengths = scenes.map(s => s.durationSec);
    const avgLength = sceneLengths.reduce((sum, len) => sum + len, 0) / sceneLengths.length;
    const variance = sceneLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / sceneLengths.length;
    const consistency = variance < 2 ? 1 : variance < 5 ? 0 : -1;
    flowScore += consistency;

    // Check for CTAs progression
    const ctaScenes = scenes.filter(scene => scene.audio.ctas && scene.audio.ctas.length > 0).length;
    if (ctaScenes > 0 && ctaScenes <= scenes.length / 2) flowScore += 1; // Good CTA distribution

    return Math.max(1, Math.min(10, flowScore));
  }

  /**
   * Calculate brand consistency score
   */
  private calculateBrandConsistency(scenes: any[]): number {
    const scenesWithBrand = scenes.filter(scene => scene.brandElements.length > 0).length;
    const brandConsistency = scenesWithBrand / scenes.length;

    // Check for consistent colors across scenes
    const allColors = scenes.flatMap(scene => scene.dominantColors);
    const uniqueColors = new Set(allColors);
    const colorConsistency = uniqueColors.size <= 6 ? 1 : uniqueColors.size <= 10 ? 0.5 : 0;

    const overallBrandScore = (brandConsistency * 7) + (colorConsistency * 3);
    return Math.max(1, Math.min(10, overallBrandScore));
  }

  /**
   * Generate insights and recommendations based on scene timeline
   */
  private async generateSceneTimelineInsights(scenes: any[], scores: any): Promise<{
    strengths: string[];
    improvements: string[];
    recommendations: string[];
  }> {
    const strengths: string[] = [];
    const improvements: string[] = [];
    const recommendations: string[] = [];

    // Analyze strengths
    if (scores.technical >= 8) {
      strengths.push('Excelente qualidade visual técnica consistente');
    }
    if (scores.sync >= 8) {
      strengths.push('Sincronização áudio-visual de alta qualidade');
    }
    if (scores.brand >= 8) {
      strengths.push('Identidade visual da marca bem estabelecida');
    }

    const totalCtas = scenes.reduce((sum, scene) => sum + (scene.audio.ctas ? scene.audio.ctas.length : 0), 0);
    if (totalCtas >= 3) {
      strengths.push('Múltiplos call-to-actions bem distribuídos');
    }

    // Analyze improvements
    if (scores.technical < 6) {
      improvements.push('Melhorar qualidade técnica visual (iluminação, composição, clareza)');
    }
    if (scores.sync < 6) {
      improvements.push('Alinhar melhor narração com elementos visuais');
    }
    if (scores.narrative < 6) {
      improvements.push('Criar fluxo narrativo mais consistente entre cenas');
    }

    // Generate recommendations
    const shortScenes = scenes.filter(scene => scene.durationSec < 2).length;
    if (shortScenes > scenes.length * 0.3) {
      recommendations.push('Considere cenas mais longas para melhor absorção da mensagem');
    }

    const textHeavyScenes = scenes.filter(scene => scene.text.length > 3).length;
    if (textHeavyScenes > scenes.length * 0.5) {
      recommendations.push('Reduza quantidade de texto por cena para melhor legibilidade');
    }

    if (scores.brand < 7) {
      recommendations.push('Reforce elementos de marca (logo, cores) ao longo do vídeo');
    }

    return { strengths, improvements, recommendations };
  }

  /**
   * Create overall summary of the analysis
   */
  private createOverallSummary(scenes: any[], scores: any): string {
    const duration = Math.max(...scenes.map(s => s.endSec));
    const avgSceneLength = duration / scenes.length;
    const totalObjects = scenes.reduce((sum, scene) => sum + scene.objects.length, 0);
    const totalText = scenes.reduce((sum, scene) => sum + scene.text.length, 0);

    return `Análise técnica de ${scenes.length} cenas (${duration.toFixed(1)}s total, média ${avgSceneLength.toFixed(1)}s por cena). ` +
           `Detectados ${totalObjects} tipos de objetos e ${totalText} elementos de texto. ` +
           `Qualidade técnica: ${scores.technical.toFixed(1)}/10, ` +
           `Sincronização: ${scores.sync.toFixed(1)}/10, ` +
           `Consistência da marca: ${scores.brand.toFixed(1)}/10. ` +
           `Score geral: ${scores.overall.toFixed(1)}/10.`;
  }

  /**
   * Calculate total cost for fusion analysis
   */
  private calculateTotalFusionCost(sceneCount: number): number {
    // Fusion analysis has minimal additional cost as it processes already analyzed data
    const baseCost = 0.001; // Base cost per scene for fusion processing
    return sceneCount * baseCost;
  }
}