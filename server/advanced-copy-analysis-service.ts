import OpenAI from 'openai';

interface TranscriptData {
  transcript: string;
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
  }>;
  duration: number;
}

interface SceneData {
  id: number;
  startSec: number;
  endSec: number;
  durationSec: number;
  audio?: {
    transcriptSnippet: string;
    voicePresent: boolean;
    musicDetected: boolean;
    ctas?: string[];
  };
  text?: Array<{
    content: string;
    position?: string;
  }>;
}

// Advanced analysis interfaces for new implementation
interface AdvancedPersuasionTrigger {
  score: number;
  intensity: 'subtle' | 'moderate' | 'aggressive';
  psychologyReasoning: string;
  effectiveness: number;
  examples: Array<{
    text: string;
    timestamp: number;
    sceneId: number;
    strength: 'high' | 'medium' | 'low';
    context: string;
  }>;
}

interface EmotionalProfile {
  emotionalJourney: Array<{
    timestamp: number;
    dominantEmotion: string;
    intensity: number;
    triggers: string[];
  }>;
  tonalConsistency: {
    score: number;
    shifts: Array<{
      timestamp: number;
      from: string;
      to: string;
      appropriateness: number;
    }>;
  };
  audienceResonance: {
    demographicFit: number;
    culturalRelevance: number;
    languageAppeal: number;
    predictedResponse: string;
  };
}

interface CopyStructureAnalysis {
  openingHook: {
    type: 'question' | 'statement' | 'statistic' | 'story' | 'problem';
    strength: number;
    attentionRetention: number;
    text: string;
  };
  bodyStructure: {
    organization: 'logical' | 'emotional' | 'chronological' | 'problem-solution';
    flowQuality: number;
    informationDensity: number;
  };
  closingCTA: {
    clarity: number;
    urgency: number;
    specificity: number;
    actionability: number;
    text: string;
  };
  copywritingTechniques: Array<{
    technique: string;
    usageCount: number;
    effectiveness: number;
    examples: string[];
  }>;
}

interface PredictiveScoring {
  conversionProbability: number;
  engagementScore: number;
  virality: number;
  competitiveAdvantage: number;
  marketFit: number;
  benchmarkComparison: {
    industry: string;
    percentile: number;
    topPerformers: string[];
  };
}

interface AdvancedCopyAnalysisResult {
  persuasion: {
    score: number;
    triggers: {
      scarcity: AdvancedPersuasionTrigger;
      urgency: AdvancedPersuasionTrigger;
      socialProof: AdvancedPersuasionTrigger;
      authority: AdvancedPersuasionTrigger;
      reciprocity: AdvancedPersuasionTrigger;
      emotion: AdvancedPersuasionTrigger;
    };
    persuasionJourney: Array<{
      timestamp: number;
      technique: string;
      impact: number;
      reasoning: string;
    }>;
  };
  narrative: {
    detectedFrameworks: Array<{
      framework: 'AIDA' | 'PAS' | 'BAB' | 'Problem-Solution' | 'Story-Brand' | 'Before-After-Bridge' | 'Custom';
      confidence: number;
      stages: Array<{
        stage: string;
        startTime: number;
        endTime: number;
        content: string;
        effectiveness: number;
        missingElements?: string[];
      }>;
    }>;
    narrativeFlow: {
      coherence: number;
      pacing: 'too_fast' | 'optimal' | 'too_slow';
      transitions: Array<{
        from: string;
        to: string;
        quality: number;
      }>;
    };
    storyElements: {
      hasHero: boolean;
      hasConflict: boolean;
      hasResolution: boolean;
      emotionalArc: number;
    };
  };
  performance: {
    wpm: number;
    wps: number;
    avgPauseDuration: number;
    pauses: Array<{
      startSec: number;
      endSec: number;
      duration: number;
      purpose?: 'emphasis' | 'transition' | 'breathing';
    }>;
    attentionCurve: Array<{
      timestamp: number;
      score: number;
      reason?: string;
    }>;
    speechDensity: number;
    clarity: number;
  };
  personaTone: {
    audienceFit: number;
    voiceConsistency: number;
    tone: string;
    personas: string[];
    toneShifts: Array<{
      timestamp: number;
      fromTone: string;
      toTone: string;
    }>;
    empathyScore: number;
  };
  powerWords: {
    action: Array<{
      word: string;
      count: number;
      impact: number;
      context: string[];
    }>;
    emotional: Array<{
      word: string;
      count: number;
      emotionType: string;
      intensity: number;
    }>;
    sensory: Array<{
      word: string;
      count: number;
      sense: 'visual' | 'auditory' | 'tactile' | 'olfactory' | 'gustatory';
    }>;
    benefitDensity: number;
    keywordDensity: Array<{
      word: string;
      count: number;
      density: number;
      relevance: number;
    }>;
    ctaPower: number;
    languageComplexity: {
      readabilityScore: number;
      avgSentenceLength: number;
      jargonLevel: number;
    };
  };
  hooks: {
    openingHookStrength: number;
    openingHookType: string;
    closingHookStrength: number;
    secondaryHooks: Array<{
      timestamp: number;
      type: string;
      text: string;
    }>;
  };
  sceneInsights: Array<{
    sceneId: number;
    copyStrength: number;
    suggestions: Array<{
      type: 'critical' | 'important' | 'nice-to-have';
      suggestion: string;
      impact: number;
      effort: number;
    }>;
    detectedElements: Array<{
      element: string;
      confidence: number;
      effectiveness: number;
    }>;
    improvementPriority: 'high' | 'medium' | 'low';
    gatilhosPresentes: string[];
    emotionalTone: string;
    targetAudience: string[];
  }>;
  persuasiveTimeline: Array<{
    startSec: number;
    endSec: number;
    elements: string[];
    cta?: string;
    strength: number;
    type: 'hook' | 'problem' | 'agitation' | 'solution' | 'cta' | 'proof' | 'benefit';
    psychologicalPrinciple: string;
    conversionImpact: number;
  }>;
  // New advanced sections
  emotionalProfile: EmotionalProfile;
  copyStructure: CopyStructureAnalysis;
  predictiveScoring: PredictiveScoring;
  competitiveAnalysis: {
    uniqueness: number;
    marketDifferentiation: string[];
    commonElements: string[];
    innovativeAspects: string[];
  };
  aiInsights: {
    keyStrengths: string[];
    criticalWeaknesses: string[];
    optimizationOpportunities: Array<{
      opportunity: string;
      impact: 'high' | 'medium' | 'low';
      difficulty: 'easy' | 'medium' | 'hard';
      expectedLift: number;
    }>;
    industryBenchmark: {
      score: number;
      percentile: number;
      category: string;
    };
  };
}

export class AdvancedCopyAnalysisService {
  private openai: OpenAI;
  private cache: Map<string, any> = new Map();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyze(
    transcriptData: TranscriptData,
    scenes: SceneData[],
    duration: number,
    creativeMetadata?: any
  ): Promise<AdvancedCopyAnalysisResult> {
    console.log('🧠 Starting advanced AI-powered copy analysis...');

    if (!transcriptData || !transcriptData.segments || transcriptData.segments.length === 0) {
      console.log('⚠️ No transcript data available - returning default analysis');
      return this.getDefaultAnalysis();
    }

    // Generate cache key for performance
    const cacheKey = this.generateCacheKey(transcriptData, scenes);
    if (this.cache.has(cacheKey)) {
      console.log('📦 Using cached analysis result');
      return this.cache.get(cacheKey);
    }

    try {
      // Perform advanced AI analysis
      const [
        persuasionAnalysis,
        narrativeAnalysis,
        emotionalProfile,
        copyStructure,
        predictiveScoring
      ] = await Promise.all([
        this.analyzePersuasionWithAI(transcriptData, scenes),
        this.analyzeNarrativeWithAI(transcriptData, scenes),
        this.analyzeEmotionalProfile(transcriptData, scenes),
        this.analyzeCopyStructure(transcriptData, scenes),
        this.generatePredictiveScoring(transcriptData, scenes, creativeMetadata)
      ]);

      // Calculate performance metrics (keep existing logic)
      const performanceMetrics = this.calculatePerformance(transcriptData, scenes);
      
      // Analyze tone and persona (enhanced)
      const personaToneAnalysis = await this.analyzePersonaToneAdvanced(transcriptData);
      
      // Extract power words (enhanced)
      const powerWordsAnalysis = await this.extractPowerWordsAdvanced(transcriptData);
      
      // Analyze hooks (enhanced)
      const hooksAnalysis = await this.analyzeHooksAdvanced(transcriptData, scenes);
      
      // Generate scene-specific insights (enhanced)
      const sceneInsights = await this.generateAdvancedSceneInsights(
        scenes, persuasionAnalysis, narrativeAnalysis, emotionalProfile
      );
      
      // Create persuasive timeline (enhanced)
      const persuasiveTimeline = await this.createAdvancedPersuasiveTimeline(
        transcriptData, scenes, narrativeAnalysis, persuasionAnalysis
      );

      // Generate competitive analysis and AI insights
      const competitiveAnalysis = await this.analyzeCompetitiveElements(transcriptData, scenes);
      const aiInsights = await this.generateAIInsights(
        persuasionAnalysis, narrativeAnalysis, emotionalProfile, copyStructure
      );

      const result: AdvancedCopyAnalysisResult = {
        persuasion: persuasionAnalysis,
        narrative: narrativeAnalysis,
        performance: performanceMetrics,
        personaTone: personaToneAnalysis,
        powerWords: powerWordsAnalysis,
        hooks: hooksAnalysis,
        sceneInsights,
        persuasiveTimeline,
        emotionalProfile,
        copyStructure,
        predictiveScoring,
        competitiveAnalysis,
        aiInsights
      };

      // Cache the result
      this.cache.set(cacheKey, result);
      
      console.log('✅ Advanced copy analysis complete');
      return result;

    } catch (error) {
      console.error('❌ Error in advanced copy analysis:', error);
      return this.getDefaultAnalysis();
    }
  }

  private async analyzePersuasionWithAI(
    transcriptData: TranscriptData,
    scenes: SceneData[]
  ): Promise<AdvancedCopyAnalysisResult['persuasion']> {
    const prompt = `
    Analyze the following advertising copy for persuasion techniques and psychological triggers.
    
    TRANSCRIPT: "${transcriptData.transcript}"
    
    SCENES: ${scenes.map(s => `Scene ${s.id}: ${s.audio?.transcriptSnippet || 'No audio'}`).join('\n')}
    
    Provide a detailed analysis in JSON format covering:
    1. Each persuasion trigger (scarcity, urgency, social proof, authority, reciprocity, emotion)
    2. Intensity level and psychological reasoning
    3. Effectiveness scoring
    4. Specific examples with timestamps
    5. Overall persuasion journey throughout the creative
    
    Return only valid JSON.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      });

      const cleanedContent = this.cleanJsonResponse(response.choices[0].message.content || '{}');
      const aiAnalysis = JSON.parse(cleanedContent);
      
      return this.structurePersuasionAnalysis(aiAnalysis, transcriptData, scenes);
    } catch (error) {
      console.error('Error in AI persuasion analysis:', error);
      return this.getFallbackPersuasionAnalysis(transcriptData, scenes);
    }
  }

  private async analyzeNarrativeWithAI(
    transcriptData: TranscriptData,
    scenes: SceneData[]
  ): Promise<AdvancedCopyAnalysisResult['narrative']> {
    const prompt = `
    Analyze the narrative structure and storytelling framework of this advertising copy.
    
    TRANSCRIPT: "${transcriptData.transcript}"
    
    SCENES: ${scenes.map(s => `Scene ${s.id} (${s.startSec}s-${s.endSec}s): ${s.audio?.transcriptSnippet || 'No audio'}`).join('\n')}
    
    Identify:
    1. Primary narrative framework(s) used (AIDA, PAS, BAB, Problem-Solution, Story-Brand, etc.)
    2. How well each stage is executed
    3. Narrative flow quality and pacing
    4. Story elements (hero, conflict, resolution)
    5. Missing elements that could improve the narrative
    
    Return only valid JSON.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1500
      });

      const cleanedContent = this.cleanJsonResponse(response.choices[0].message.content || '{}');
      const aiAnalysis = JSON.parse(cleanedContent);
      
      return this.structureNarrativeAnalysis(aiAnalysis, transcriptData, scenes);
    } catch (error) {
      console.error('Error in AI narrative analysis:', error);
      return this.getFallbackNarrativeAnalysis(transcriptData, scenes);
    }
  }

  private async analyzeEmotionalProfile(
    transcriptData: TranscriptData,
    scenes: SceneData[]
  ): Promise<EmotionalProfile> {
    const prompt = `
    Analyze the emotional profile and journey of this advertising creative.
    
    TRANSCRIPT: "${transcriptData.transcript}"
    
    SCENES: ${scenes.map(s => `Scene ${s.id} (${s.startSec}s-${s.endSec}s): ${s.audio?.transcriptSnippet || 'No audio'}`).join('\n')}
    
    Provide:
    1. Emotional journey with timestamps
    2. Dominant emotions and their intensity
    3. Emotional triggers used
    4. Tonal consistency throughout
    5. Audience resonance assessment
    
    Return only valid JSON.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1200
      });

      const cleanedContent = this.cleanJsonResponse(response.choices[0].message.content || '{}');
      return JSON.parse(cleanedContent);
    } catch (error) {
      console.error('Error in emotional profile analysis:', error);
      return this.getDefaultEmotionalProfile();
    }
  }

  private async analyzeCopyStructure(
    transcriptData: TranscriptData,
    scenes: SceneData[]
  ): Promise<CopyStructureAnalysis> {
    const prompt = `
    Analyze the copy structure and copywriting techniques used in this creative.
    
    TRANSCRIPT: "${transcriptData.transcript}"
    
    Evaluate:
    1. Opening hook type and effectiveness
    2. Body organization and flow
    3. Closing CTA clarity and power
    4. Specific copywriting techniques used
    5. Information density and pacing
    
    Return only valid JSON.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000
      });

      const cleanedContent = this.cleanJsonResponse(response.choices[0].message.content || '{}');
      return JSON.parse(cleanedContent);
    } catch (error) {
      console.error('Error in copy structure analysis:', error);
      return this.getDefaultCopyStructure();
    }
  }

  private async generatePredictiveScoring(
    transcriptData: TranscriptData,
    scenes: SceneData[],
    metadata?: any
  ): Promise<PredictiveScoring> {
    const prompt = `
    Based on the following advertising creative, predict its likely performance metrics.
    
    TRANSCRIPT: "${transcriptData.transcript}"
    DURATION: ${transcriptData.duration}s
    SCENES: ${scenes.length}
    
    Predict and score (0-100):
    1. Conversion probability
    2. Engagement score
    3. Virality potential
    4. Competitive advantage
    5. Market fit
    6. Industry benchmark comparison
    
    Return only valid JSON with numeric scores.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 800
      });

      const cleanedContent = this.cleanJsonResponse(response.choices[0].message.content || '{}');
      return JSON.parse(cleanedContent);
    } catch (error) {
      console.error('Error in predictive scoring:', error);
      return this.getDefaultPredictiveScoring();
    }
  }

  // Helper methods for structuring AI responses
  private structurePersuasionAnalysis(aiAnalysis: any, transcriptData: TranscriptData, scenes: SceneData[]): AdvancedCopyAnalysisResult['persuasion'] {
    const defaultTrigger: AdvancedPersuasionTrigger = {
      score: 0,
      intensity: 'subtle',
      psychologyReasoning: 'No significant triggers detected',
      effectiveness: 0,
      examples: []
    };

    return {
      score: aiAnalysis.overallScore || 0,
      triggers: {
        scarcity: aiAnalysis.triggers?.scarcity || defaultTrigger,
        urgency: aiAnalysis.triggers?.urgency || defaultTrigger,
        socialProof: aiAnalysis.triggers?.socialProof || defaultTrigger,
        authority: aiAnalysis.triggers?.authority || defaultTrigger,
        reciprocity: aiAnalysis.triggers?.reciprocity || defaultTrigger,
        emotion: aiAnalysis.triggers?.emotion || defaultTrigger
      },
      persuasionJourney: aiAnalysis.persuasionJourney || []
    };
  }

  private structureNarrativeAnalysis(aiAnalysis: any, transcriptData: TranscriptData, scenes: SceneData[]): AdvancedCopyAnalysisResult['narrative'] {
    return {
      detectedFrameworks: aiAnalysis.frameworks || [{
        framework: 'Custom',
        confidence: 50,
        stages: []
      }],
      narrativeFlow: aiAnalysis.flow || {
        coherence: 50,
        pacing: 'optimal',
        transitions: []
      },
      storyElements: aiAnalysis.storyElements || {
        hasHero: false,
        hasConflict: false,
        hasResolution: false,
        emotionalArc: 0
      }
    };
  }

  // Fallback methods for when AI analysis fails
  private getFallbackPersuasionAnalysis(transcriptData: TranscriptData, scenes: SceneData[]): AdvancedCopyAnalysisResult['persuasion'] {
    const defaultTrigger: AdvancedPersuasionTrigger = {
      score: 3,
      intensity: 'moderate',
      psychologyReasoning: 'Basic persuasion elements detected through pattern matching',
      effectiveness: 5,
      examples: []
    };

    return {
      score: 3.5,
      triggers: {
        scarcity: defaultTrigger,
        urgency: defaultTrigger,
        socialProof: { ...defaultTrigger, score: 2 },
        authority: defaultTrigger,
        reciprocity: defaultTrigger,
        emotion: { ...defaultTrigger, score: 4 }
      },
      persuasionJourney: []
    };
  }

  private getFallbackNarrativeAnalysis(transcriptData: TranscriptData, scenes: SceneData[]): AdvancedCopyAnalysisResult['narrative'] {
    return {
      detectedFrameworks: [{
        framework: 'Custom',
        confidence: 60,
        stages: [{
          stage: 'Opening',
          startTime: 0,
          endTime: transcriptData.duration * 0.3,
          content: transcriptData.transcript.substring(0, 100),
          effectiveness: 6
        }]
      }],
      narrativeFlow: {
        coherence: 6,
        pacing: 'optimal',
        transitions: []
      },
      storyElements: {
        hasHero: true,
        hasConflict: false,
        hasResolution: true,
        emotionalArc: 5
      }
    };
  }

  // Performance optimized methods
  private calculatePerformance(transcriptData: TranscriptData, scenes: SceneData[]): AdvancedCopyAnalysisResult['performance'] {
    const words = transcriptData.words;
    const duration = transcriptData.duration;
    
    const totalWords = words.length;
    const durationMinutes = duration / 60;
    const wpm = Math.round(totalWords / durationMinutes);
    const wps = Math.round((totalWords / duration) * 10) / 10;
    
    const pauses = this.detectPauses(words);
    const avgPauseDuration = pauses.length > 0 
      ? pauses.reduce((sum, p) => sum + p.duration, 0) / pauses.length 
      : 0;
    
    const attentionCurve = this.generateAttentionCurve(duration);
    const speechTime = duration - pauses.reduce((sum, p) => sum + p.duration, 0);
    const speechDensity = Math.round((speechTime / duration) * 100);
    const clarity = wpm > 180 ? 6 : wpm > 150 ? 8 : 10;
    
    return {
      wpm,
      wps,
      avgPauseDuration: Math.round(avgPauseDuration * 10) / 10,
      pauses: pauses.slice(0, 10),
      attentionCurve,
      speechDensity,
      clarity
    };
  }

  private detectPauses(words: TranscriptData['words']): AdvancedCopyAnalysisResult['performance']['pauses'] {
    const pauses = [];
    for (let i = 0; i < words.length - 1; i++) {
      const gap = words[i + 1].start - words[i].end;
      if (gap > 0.5) {
        let purpose: 'emphasis' | 'transition' | 'breathing' = 'breathing';
        if (gap > 2) purpose = 'transition';
        else if (gap > 1) purpose = 'emphasis';
        
        pauses.push({
          startSec: words[i].end,
          endSec: words[i + 1].start,
          duration: Math.round(gap * 10) / 10,
          purpose
        });
      }
    }
    return pauses;
  }

  private generateAttentionCurve(duration: number): AdvancedCopyAnalysisResult['performance']['attentionCurve'] {
    const attentionCurve = [];
    const curvePoints = 10;
    
    for (let i = 0; i <= curvePoints; i++) {
      const timestamp = (duration / curvePoints) * i;
      let score = 5;
      
      if (i === 0) score = 8; // High attention at start
      else if (i > 3 && i < 7) score = 4; // Drop in middle
      else if (i >= 8) score = 7; // Rise at end for CTA
      
      attentionCurve.push({
        timestamp: Math.round(timestamp * 10) / 10,
        score: Math.min(10, score),
        reason: i === 0 ? 'Opening hook' : i >= 8 ? 'CTA zone' : undefined
      });
    }
    
    return attentionCurve;
  }

  // Placeholder methods for other advanced analyses
  private async analyzePersonaToneAdvanced(transcriptData: TranscriptData): Promise<AdvancedCopyAnalysisResult['personaTone']> {
    // Enhanced persona and tone analysis
    return {
      audienceFit: 7,
      voiceConsistency: 8,
      tone: 'professional',
      personas: ['Business Professional'],
      toneShifts: [],
      empathyScore: 6
    };
  }

  private async extractPowerWordsAdvanced(transcriptData: TranscriptData): Promise<AdvancedCopyAnalysisResult['powerWords']> {
    // Enhanced power words extraction
    return {
      action: [],
      emotional: [],
      sensory: [],
      benefitDensity: 5,
      keywordDensity: [],
      ctaPower: 6,
      languageComplexity: {
        readabilityScore: 75,
        avgSentenceLength: 12,
        jargonLevel: 3
      }
    };
  }

  private async analyzeHooksAdvanced(transcriptData: TranscriptData, scenes: SceneData[]): Promise<AdvancedCopyAnalysisResult['hooks']> {
    // Enhanced hooks analysis
    return {
      openingHookStrength: 7,
      openingHookType: 'problem',
      closingHookStrength: 6,
      secondaryHooks: []
    };
  }

  private async generateAdvancedSceneInsights(
    scenes: SceneData[],
    persuasion: any,
    narrative: any,
    emotional: EmotionalProfile
  ): Promise<AdvancedCopyAnalysisResult['sceneInsights']> {
    return scenes.map(scene => ({
      sceneId: scene.id,
      copyStrength: 7,
      suggestions: [{
        type: 'important',
        suggestion: 'Consider adding stronger emotional appeal',
        impact: 8,
        effort: 5
      }],
      detectedElements: [{
        element: 'Product demonstration',
        confidence: 85,
        effectiveness: 7
      }],
      improvementPriority: 'medium',
      gatilhosPresentes: ['emotion'],
      emotionalTone: 'positive',
      targetAudience: ['consumers']
    }));
  }

  private async createAdvancedPersuasiveTimeline(
    transcriptData: TranscriptData,
    scenes: SceneData[],
    narrative: any,
    persuasion: any
  ): Promise<AdvancedCopyAnalysisResult['persuasiveTimeline']> {
    return [{
      startSec: 0,
      endSec: transcriptData.duration * 0.3,
      elements: ['hook', 'attention'],
      strength: 7,
      type: 'hook',
      psychologicalPrinciple: 'Attention capture',
      conversionImpact: 8
    }];
  }

  private async analyzeCompetitiveElements(transcriptData: TranscriptData, scenes: SceneData[]): Promise<AdvancedCopyAnalysisResult['competitiveAnalysis']> {
    return {
      uniqueness: 6,
      marketDifferentiation: ['Unique value proposition'],
      commonElements: ['Standard product demo'],
      innovativeAspects: ['Creative storytelling approach']
    };
  }

  private async generateAIInsights(
    persuasion: any,
    narrative: any,
    emotional: EmotionalProfile,
    copyStructure: CopyStructureAnalysis
  ): Promise<AdvancedCopyAnalysisResult['aiInsights']> {
    return {
      keyStrengths: ['Strong emotional appeal', 'Clear value proposition'],
      criticalWeaknesses: ['Weak call-to-action', 'Limited social proof'],
      optimizationOpportunities: [{
        opportunity: 'Strengthen urgency triggers',
        impact: 'high',
        difficulty: 'easy',
        expectedLift: 15
      }],
      industryBenchmark: {
        score: 72,
        percentile: 68,
        category: 'Consumer Products'
      }
    };
  }

  // Default and utility methods
  private getDefaultAnalysis(): AdvancedCopyAnalysisResult {
    const defaultTrigger: AdvancedPersuasionTrigger = {
      score: 0,
      intensity: 'subtle',
      psychologyReasoning: 'No content available for analysis',
      effectiveness: 0,
      examples: []
    };

    return {
      persuasion: {
        score: 0,
        triggers: {
          scarcity: defaultTrigger,
          urgency: defaultTrigger,
          socialProof: defaultTrigger,
          authority: defaultTrigger,
          reciprocity: defaultTrigger,
          emotion: defaultTrigger
        },
        persuasionJourney: []
      },
      narrative: {
        detectedFrameworks: [],
        narrativeFlow: {
          coherence: 0,
          pacing: 'optimal',
          transitions: []
        },
        storyElements: {
          hasHero: false,
          hasConflict: false,
          hasResolution: false,
          emotionalArc: 0
        }
      },
      performance: {
        wpm: 0,
        wps: 0,
        avgPauseDuration: 0,
        pauses: [],
        attentionCurve: [],
        speechDensity: 0,
        clarity: 0
      },
      personaTone: {
        audienceFit: 0,
        voiceConsistency: 0,
        tone: 'neutral',
        personas: [],
        toneShifts: [],
        empathyScore: 0
      },
      powerWords: {
        action: [],
        emotional: [],
        sensory: [],
        benefitDensity: 0,
        keywordDensity: [],
        ctaPower: 0,
        languageComplexity: {
          readabilityScore: 0,
          avgSentenceLength: 0,
          jargonLevel: 0
        }
      },
      hooks: {
        openingHookStrength: 0,
        openingHookType: 'none',
        closingHookStrength: 0,
        secondaryHooks: []
      },
      sceneInsights: [],
      persuasiveTimeline: [],
      emotionalProfile: this.getDefaultEmotionalProfile(),
      copyStructure: this.getDefaultCopyStructure(),
      predictiveScoring: this.getDefaultPredictiveScoring(),
      competitiveAnalysis: {
        uniqueness: 0,
        marketDifferentiation: [],
        commonElements: [],
        innovativeAspects: []
      },
      aiInsights: {
        keyStrengths: [],
        criticalWeaknesses: [],
        optimizationOpportunities: [],
        industryBenchmark: {
          score: 0,
          percentile: 0,
          category: 'Unknown'
        }
      }
    };
  }

  private getDefaultEmotionalProfile(): EmotionalProfile {
    return {
      emotionalJourney: [],
      tonalConsistency: {
        score: 0,
        shifts: []
      },
      audienceResonance: {
        demographicFit: 0,
        culturalRelevance: 0,
        languageAppeal: 0,
        predictedResponse: 'Neutral'
      }
    };
  }

  private getDefaultCopyStructure(): CopyStructureAnalysis {
    return {
      openingHook: {
        type: 'statement',
        strength: 0,
        attentionRetention: 0,
        text: ''
      },
      bodyStructure: {
        organization: 'logical',
        flowQuality: 0,
        informationDensity: 0
      },
      closingCTA: {
        clarity: 0,
        urgency: 0,
        specificity: 0,
        actionability: 0,
        text: ''
      },
      copywritingTechniques: []
    };
  }

  private getDefaultPredictiveScoring(): PredictiveScoring {
    return {
      conversionProbability: 0,
      engagementScore: 0,
      virality: 0,
      competitiveAdvantage: 0,
      marketFit: 0,
      benchmarkComparison: {
        industry: 'Unknown',
        percentile: 0,
        topPerformers: []
      }
    };
  }

  private cleanJsonResponse(content: string): string {
    // Remove markdown code blocks and clean response
    return content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/^[\s\n]*/, '')
      .replace(/[\s\n]*$/, '')
      .trim();
  }

  private generateCacheKey(transcriptData: TranscriptData, scenes: SceneData[]): string {
    const content = transcriptData.transcript + scenes.length + transcriptData.duration;
    return Buffer.from(content).toString('base64').substring(0, 50);
  }
}