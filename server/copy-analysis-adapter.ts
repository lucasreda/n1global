import { CopyAnalysisService } from './copy-analysis-service.js';
import { AdvancedCopyAnalysisService } from './advanced-copy-analysis-service.js';

// Legacy interface from original copy-analysis-service.ts
interface LegacyCopyAnalysisResult {
  persuasion: {
    score: number;
    triggers: {
      scarcity: number;
      urgency: number;
      socialProof: number;
      authority: number;
      reciprocity: number;
      emotion: number;
    };
    examples: Array<{
      trigger: string;
      text: string;
      timestamp: number;
      sceneId: number;
      strength: 'high' | 'medium' | 'low';
    }>;
  };
  narrative: {
    framework: 'AIDA' | 'PAS' | 'BAB' | '4Ps' | 'FAB' | 'Other';
    confidence: number;
    completeness: number;
    stages: Array<{
      name: string;
      startSec: number;
      endSec: number;
      excerpt: string;
      present: boolean;
    }>;
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
    action: string[];
    emotional: string[];
    sensory: string[];
    benefitDensity: number;
    keywordDensity: Array<{
      word: string;
      count: number;
      density: number;
    }>;
    ctaPower: number;
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
    suggestions: string[];
    detectedElements: string[];
    improvementPriority: 'high' | 'medium' | 'low';
    gatilhosPresentes: string[];
  }>;
  persuasiveTimeline: Array<{
    startSec: number;
    endSec: number;
    elements: string[];
    cta?: string;
    strength: number;
    type: 'hook' | 'problem' | 'agitation' | 'solution' | 'cta' | 'proof' | 'benefit';
  }>;
}

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

export class CopyAnalysisAdapter {
  private legacyService: CopyAnalysisService;
  private advancedService: AdvancedCopyAnalysisService;
  private useAdvanced: boolean;

  constructor(useAdvanced: boolean = true) {
    this.legacyService = new CopyAnalysisService();
    this.advancedService = new AdvancedCopyAnalysisService();
    this.useAdvanced = useAdvanced;
    
    console.log(`🔄 CopyAnalysisAdapter initialized - Mode: ${useAdvanced ? 'Advanced AI' : 'Legacy'}`);
  }

  async analyze(
    transcriptData: TranscriptData,
    scenes: SceneData[],
    duration: number,
    creativeMetadata?: any
  ): Promise<LegacyCopyAnalysisResult & { advanced?: any }> {
    try {
      if (this.useAdvanced) {
        console.log('🧠 Using Advanced AI-powered copy analysis');
        
        // Get advanced analysis
        const advancedResult = await this.advancedService.analyze(
          transcriptData, 
          scenes, 
          duration, 
          creativeMetadata
        );
        
        // Check if advanced analysis produced meaningful results
        const hasValidResults = this.validateAdvancedResults(advancedResult);
        
        if (!hasValidResults) {
          console.warn('⚠️ Advanced analysis returned empty/zero results - likely API quota exceeded');
          console.log('🔄 Falling back to legacy analysis for meaningful results');
          const legacyResult = await this.legacyService.analyze(transcriptData, scenes, duration);
          return {
            ...legacyResult as unknown as LegacyCopyAnalysisResult,
            advanced: advancedResult // Keep advanced result for debugging
          };
        }
        
        // Convert to legacy format for backward compatibility
        const legacyResult = this.convertAdvancedToLegacy(advancedResult);
        
        // Return both formats
        return {
          ...legacyResult,
          advanced: advancedResult
        };
      } else {
        console.log('📊 Using Legacy copy analysis');
        
        // Use legacy service
        const legacyResult = await this.legacyService.analyze(transcriptData, scenes, duration);
        return legacyResult as unknown as LegacyCopyAnalysisResult;
      }
    } catch (error) {
      console.error('❌ Error in copy analysis adapter:', error);
      
      // Fallback to legacy service
      console.log('🔄 Falling back to legacy analysis due to error');
      this.useAdvanced = false;
      const legacyResult = await this.legacyService.analyze(transcriptData, scenes, duration);
      return legacyResult as unknown as LegacyCopyAnalysisResult;
    }
  }

  // Validate if advanced analysis produced meaningful results
  private validateAdvancedResults(advanced: any): boolean {
    if (!advanced) return false;

    // Check if persuasion analysis has meaningful scores
    const persuasionScore = advanced.persuasion?.score || 0;
    const hasPersuasionTriggers = advanced.persuasion?.triggers && 
      Object.values(advanced.persuasion.triggers).some((trigger: any) => 
        trigger?.score > 0 || trigger?.examples?.length > 0
      );

    // Check if narrative analysis has meaningful results
    const hasNarrativeFrameworks = advanced.narrative?.detectedFrameworks?.length > 0;
    const narrativeCompleteness = advanced.narrative?.completeness || 0;

    // Check if there are any meaningful scores or content
    const hasEmotionalProfile = advanced.emotionalProfile && 
      Object.keys(advanced.emotionalProfile).length > 0;
    
    const hasCopyStructure = advanced.copyStructure && 
      Object.keys(advanced.copyStructure).length > 0;
    
    const hasPowerWords = advanced.powerWords && (
      advanced.powerWords.action?.length > 0 ||
      advanced.powerWords.emotional?.length > 0 ||
      advanced.powerWords.sensory?.length > 0
    );

    // STRICTER VALIDATION: Analysis is only valid if we have MEANINGFUL scores
    // Must have at least one of these core elements with actual values:
    const hasValidPersuasion = persuasionScore > 0 || hasPersuasionTriggers;
    const hasValidNarrative = narrativeCompleteness > 0; // Must have actual completeness score
    const hasValidPowerWords = hasPowerWords; // Must have actual power words detected
    
    // For the analysis to be considered valid, we need:
    // 1. EITHER meaningful persuasion analysis (score > 0 OR triggers with examples)
    // 2. OR meaningful narrative analysis (completeness > 0)  
    // 3. OR meaningful power words analysis (actual words detected)
    const isValid = hasValidPersuasion || hasValidNarrative || hasValidPowerWords;
    
    console.log(`🔍 Advanced analysis validation: ${isValid ? 'VALID' : 'INVALID'}`, {
      persuasionScore,
      hasPersuasionTriggers,
      hasNarrativeFrameworks,
      narrativeCompleteness,
      hasEmotionalProfile,
      hasCopyStructure,
      hasPowerWords,
      validationResult: {
        hasValidPersuasion,
        hasValidNarrative,
        hasValidPowerWords,
        finalResult: isValid
      }
    });

    return isValid;
  }

  // Convert advanced analysis result to legacy format for backward compatibility
  private convertAdvancedToLegacy(advanced: any): LegacyCopyAnalysisResult {
    // Extract first framework as primary for legacy compatibility
    const primaryFramework = advanced.narrative?.detectedFrameworks?.[0];
    
    // Convert advanced triggers to simple numbers
    const triggers = {
      scarcity: advanced.persuasion?.triggers?.scarcity?.score || 0,
      urgency: advanced.persuasion?.triggers?.urgency?.score || 0,
      socialProof: advanced.persuasion?.triggers?.socialProof?.score || 0,
      authority: advanced.persuasion?.triggers?.authority?.score || 0,
      reciprocity: advanced.persuasion?.triggers?.reciprocity?.score || 0,
      emotion: advanced.persuasion?.triggers?.emotion?.score || 0
    };

    // Convert advanced examples to legacy format
    const examples: Array<{
      trigger: string;
      text: string;
      timestamp: number;
      sceneId: number;
      strength: 'high' | 'medium' | 'low';
    }> = [];
    if (advanced.persuasion?.triggers) {
      Object.entries(advanced.persuasion.triggers).forEach(([triggerType, triggerData]: [string, any]) => {
        if (triggerData?.examples) {
          triggerData.examples.forEach((example: any) => {
            examples.push({
              trigger: triggerType,
              text: example.text || '',
              timestamp: example.timestamp || 0,
              sceneId: example.sceneId || 0,
              strength: example.strength || 'medium'
            });
          });
        }
      });
    }

    // Convert advanced power words to legacy format
    const powerWords = {
      action: advanced.powerWords?.action?.map((w: any) => w.word || w) || [],
      emotional: advanced.powerWords?.emotional?.map((w: any) => w.word || w) || [],
      sensory: advanced.powerWords?.sensory?.map((w: any) => w.word || w) || [],
      benefitDensity: advanced.powerWords?.benefitDensity || 0,
      keywordDensity: advanced.powerWords?.keywordDensity?.map((kw: any) => ({
        word: kw.word || '',
        count: kw.count || 0,
        density: kw.density || 0
      })) || [],
      ctaPower: advanced.powerWords?.ctaPower || 0
    };

    // Convert advanced scene insights to legacy format
    const sceneInsights = advanced.sceneInsights?.map((scene: any) => ({
      sceneId: scene.sceneId || 0,
      copyStrength: scene.copyStrength || 0,
      suggestions: scene.suggestions?.map((s: any) => s.suggestion || s) || [],
      detectedElements: scene.detectedElements?.map((e: any) => e.element || e) || [],
      improvementPriority: scene.improvementPriority || 'medium',
      gatilhosPresentes: scene.gatilhosPresentes || []
    })) || [];

    // Convert advanced persuasive timeline to legacy format
    const persuasiveTimeline = advanced.persuasiveTimeline?.map((item: any) => ({
      startSec: item.startSec || 0,
      endSec: item.endSec || 0,
      elements: item.elements || [],
      cta: item.cta,
      strength: item.strength || 0,
      type: item.type || 'benefit'
    })) || [];

    // Convert narrative stages to legacy format
    const narrativeStages = primaryFramework?.stages?.map((stage: any) => ({
      name: stage.stage || stage.name || '',
      startSec: stage.startTime || stage.startSec || 0,
      endSec: stage.endTime || stage.endSec || 0,
      excerpt: stage.content || stage.excerpt || '',
      present: stage.effectiveness > 0 || stage.present !== false
    })) || [];

    return {
      persuasion: {
        score: advanced.persuasion?.score || 0,
        triggers,
        examples
      },
      narrative: {
        framework: this.mapFrameworkToLegacy(primaryFramework?.framework || 'Other'),
        confidence: primaryFramework?.confidence || 0,
        completeness: this.calculateCompleteness(narrativeStages),
        stages: narrativeStages
      },
      performance: advanced.performance || {
        wpm: 0,
        wps: 0,
        avgPauseDuration: 0,
        pauses: [],
        attentionCurve: [],
        speechDensity: 0,
        clarity: 0
      },
      personaTone: advanced.personaTone || {
        audienceFit: 0,
        voiceConsistency: 0,
        tone: 'neutral',
        personas: [],
        toneShifts: [],
        empathyScore: 0
      },
      powerWords,
      hooks: advanced.hooks || {
        openingHookStrength: 0,
        openingHookType: 'none',
        closingHookStrength: 0,
        secondaryHooks: []
      },
      sceneInsights,
      persuasiveTimeline
    };
  }

  private mapFrameworkToLegacy(framework: string): 'AIDA' | 'PAS' | 'BAB' | '4Ps' | 'FAB' | 'Other' {
    switch (framework) {
      case 'AIDA':
      case 'PAS':
      case 'BAB':
        return framework as 'AIDA' | 'PAS' | 'BAB';
      case 'Problem-Solution':
        return 'PAS';
      case 'Story-Brand':
      case 'Before-After-Bridge':
        return 'BAB';
      default:
        return 'Other';
    }
  }

  private calculateCompleteness(stages: any[]): number {
    if (!stages || stages.length === 0) return 0;
    const presentStages = stages.filter(s => s.present);
    return Math.round((presentStages.length / stages.length) * 100);
  }

  // Method to toggle between advanced and legacy modes
  setAdvancedMode(enabled: boolean): void {
    this.useAdvanced = enabled;
    console.log(`🔄 Copy analysis mode changed to: ${enabled ? 'Advanced AI' : 'Legacy'}`);
  }

  // Method to get analysis capabilities
  getCapabilities(): { 
    mode: string; 
    features: string[];
    advancedFeatures?: string[];
  } {
    const baseFeatures = [
      'Persuasion trigger detection',
      'Narrative framework analysis',
      'Performance metrics',
      'Persona and tone analysis',
      'Power words extraction',
      'Hook analysis',
      'Scene insights',
      'Persuasive timeline'
    ];

    if (this.useAdvanced) {
      return {
        mode: 'Advanced AI',
        features: baseFeatures,
        advancedFeatures: [
          'AI-powered contextual analysis',
          'Emotional profiling and journey mapping',
          'Copy structure analysis',
          'Predictive scoring',
          'Competitive analysis',
          'Industry benchmarking',
          'Optimization recommendations',
          'Psychological reasoning',
          'Advanced persuasion intensity analysis'
        ]
      };
    } else {
      return {
        mode: 'Legacy',
        features: baseFeatures
      };
    }
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; services: any }> {
    try {
      const capabilities = this.getCapabilities();
      
      return {
        status: 'healthy',
        services: {
          adapter: 'active',
          mode: capabilities.mode,
          legacy: 'available',
          advanced: 'available',
          features: capabilities.features.length,
          advancedFeatures: capabilities.advancedFeatures?.length || 0
        }
      };
    } catch (error) {
      return {
        status: 'degraded',
        services: {
          adapter: 'error',
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
}