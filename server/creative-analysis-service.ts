import OpenAI from "openai";
import { db } from "./db";
import { 
  adCreatives, 
  creativeAnalyses,
  type AdCreative,
  type CreativeAnalysis,
  type InsertCreativeAnalysis
} from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { AudioAnalysisService } from './audio-analysis-service';
import { KeyframeExtractionService } from './keyframe-extraction-service';
import { VisualAnalysisService } from './visual-analysis-service';
import { FusionAnalysisService } from './fusion-analysis-service';
import { SceneSegmentationService } from './scene-segmentation-service';
import { facebookAdsService } from './facebook-ads-service';

// In-memory job store for real-time progress tracking
interface AnalysisJob {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  costEstimate: number;
  actualCost: number;
  perCreativeStatus: Array<{
    creativeId: string;
    status: 'pending' | 'analyzing' | 'completed' | 'failed';
    progress: number;
  }>;
  results?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

class CreativeAnalysisService {
  private openai: OpenAI;
  private jobStore: Map<string, AnalysisJob> = new Map();
  
  // New hybrid analysis services (optional, may not be available without API key)
  private audioAnalysisService?: AudioAnalysisService;
  private keyframeExtractionService?: KeyframeExtractionService;
  private visualAnalysisService?: VisualAnalysisService;
  private fusionAnalysisService?: FusionAnalysisService;
  private sceneSegmentationService?: SceneSegmentationService;
  
  // Pricing per 1K tokens (in USD)
  private modelPricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 0.005, output: 0.015 }, // Updated GPT-4o pricing
    'gpt-4-vision-preview': { input: 0.01, output: 0.03 }, // Legacy (deprecated)
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
  };

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OpenAI API key not configured - hybrid analysis disabled');
      this.openai = new OpenAI({ apiKey: 'dummy' }); // Dummy instance to prevent crashes
      return;
    }
    
    this.openai = new OpenAI({ apiKey });
    
    // Initialize hybrid analysis services only if API key is available
    try {
      this.audioAnalysisService = new AudioAnalysisService();
      this.keyframeExtractionService = new KeyframeExtractionService();
      this.visualAnalysisService = new VisualAnalysisService();
      this.fusionAnalysisService = new FusionAnalysisService();
      this.sceneSegmentationService = new SceneSegmentationService();
      console.log('✅ Hybrid analysis services initialized successfully');
    } catch (error) {
      console.error('⚠️ Failed to initialize hybrid analysis services:', error);
      // Services will remain undefined, fallback to legacy analysis
    }
  }

  // Map step names to numbers for database compatibility
  private getStepNumber(stepName: string): number {
    const stepMap: Record<string, number> = {
      'Initializing': 1,
      'Queued': 1,
      'Fetching creatives': 2,
      'Resolving media URLs': 3,
      'Extracting audio': 4,
      'Analyzing audio': 5,
      'Extracting keyframes': 6,
      'Analyzing visuals': 7,
      'Processing keyframes': 8,
      'Fusing insights': 9,
      'Analysis complete': 10,
      'Failed': -1
    };
    
    // Handle dynamic steps like "Analyzing creative X of Y"
    if (stepName.includes('Analyzing creative')) {
      return 3; // Start of creative analysis
    }
    if (stepName.includes('Processing frame')) {
      return 8; // Frame processing phase
    }
    
    return stepMap[stepName] || 0;
  }

  // Download video to temporary file
  private async downloadVideoTemp(videoUrl: string): Promise<string> {
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    const tempPath = `/tmp/video_${Date.now()}.mp4`;
    
    // Import fs at runtime to avoid top-level dependency
    const fs = await import('fs/promises');
    await fs.writeFile(tempPath, Buffer.from(buffer));
    
    console.log(`✅ Video downloaded to: ${tempPath}`);
    return tempPath;
  }

  // Estimate cost for analysis
  async estimateCost(
    creativeCount: number,
    analysisType: string = 'audit',
    model: string = 'gpt-4-turbo-preview'
  ): Promise<{ estimatedCost: number; estimatedTokens: number }> {
    // Estimate tokens based on analysis type
    const tokensPerCreative: Record<string, number> = {
      'audit': 2000,      // Full creative audit
      'angles': 1500,     // Marketing angles analysis
      'copy': 1000,       // Copy optimization
      'variants': 2500,   // Generate variations
      'performance': 1200 // Performance analysis
    };

    const estimatedInputTokens = (tokensPerCreative[analysisType] || 1500) * creativeCount;
    const estimatedOutputTokens = estimatedInputTokens * 0.5; // Assume 50% output ratio
    
    const pricing = this.modelPricing[model] || this.modelPricing['gpt-4-turbo-preview'];
    const inputCost = (estimatedInputTokens / 1000) * pricing.input;
    const outputCost = (estimatedOutputTokens / 1000) * pricing.output;
    
    return {
      estimatedCost: inputCost + outputCost,
      estimatedTokens: estimatedInputTokens + estimatedOutputTokens
    };
  }

  // Create analysis job
  async createAnalysisJob(
    operationId: string,
    creativeIds: string[],
    analysisType: string = 'audit',
    model: string = 'gpt-4-turbo-preview',
    options?: any
  ): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const batchId = `batch_${Date.now()}`;
    
    // Estimate cost
    const { estimatedCost } = await this.estimateCost(creativeIds.length, analysisType, model);
    
    // Create job in memory
    const job: AnalysisJob = {
      id: jobId,
      status: 'queued',
      progress: 0,
      currentStep: 'Initializing',
      costEstimate: estimatedCost,
      actualCost: 0,
      perCreativeStatus: creativeIds.map(id => ({
        creativeId: id,
        status: 'pending' as const,
        progress: 0
      }))
    };
    
    this.jobStore.set(jobId, job);
    
    // Create analysis records in database
    for (const creativeId of creativeIds) {
      await db.insert(creativeAnalyses).values({
        operationId,
        creativeId,
        batchId,
        status: 'queued',
        analysisType,
        provider: 'openai',
        model,
        costEstimate: (estimatedCost / creativeIds.length).toFixed(4),
        progress: { percent: 0, step: 'Queued' }, // Store as JSON
        currentStep: this.getStepNumber('Queued')
      });
    }
    
    // Start processing in background
    this.processJob(jobId, operationId, creativeIds, analysisType, model, options).catch(error => {
      console.error('Job processing error:', error);
      const job = this.jobStore.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
      }
    });
    
    return jobId;
  }

  // Process analysis job
  private async processJob(
    jobId: string,
    operationId: string,
    creativeIds: string[],
    analysisType: string,
    model: string,
    options?: any
  ): Promise<void> {
    const job = this.jobStore.get(jobId);
    if (!job) return;
    
    job.status = 'running';
    job.startedAt = new Date();
    job.currentStep = 'Fetching creatives';
    
    try {
      // Fetch creative data
      const creatives = await db
        .select()
        .from(adCreatives)
        .where(inArray(adCreatives.id, creativeIds));
      
      const results = [];
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalCost = 0;
      
      // Process each creative
      for (let i = 0; i < creatives.length; i++) {
        const creative = creatives[i];
        const creativeStatus = job.perCreativeStatus[i];
        
        if (creativeStatus) {
          creativeStatus.status = 'analyzing';
          creativeStatus.progress = 0;
        }
        
        job.currentStep = `Analyzing creative ${i + 1} of ${creatives.length}`;
        job.progress = Math.floor((i / creatives.length) * 100);
        
        try {
          // Perform analysis based on type
          const analysis = await this.analyzeCreative(creative, analysisType, model);
          
          if (analysis) {
            results.push(analysis);
            
            // Update tokens and cost
            totalInputTokens += analysis.inputTokens || 0;
            totalOutputTokens += analysis.outputTokens || 0;
            totalCost += analysis.cost || 0;
            
            // Update database with hybrid analysis data
            await db
              .update(creativeAnalyses)
              .set({
                status: 'completed',
                result: analysis.result,
                insights: analysis.insights,
                recommendations: analysis.recommendations,
                scores: analysis.scores,
                actualCost: analysis.cost.toFixed(4),
                inputTokens: analysis.inputTokens,
                outputTokens: analysis.outputTokens,
                progress: 100,
                completedAt: new Date(),
                // Store hybrid analysis data
                audioAnalysis: analysis.audioAnalysis,
                visualAnalysis: analysis.visualAnalysis,
                fusionAnalysis: analysis.fusedInsights
              })
              .where(and(
                eq(creativeAnalyses.creativeId, creative.id),
                eq(creativeAnalyses.status, 'queued')
              ));
            
            // Mark creative as analyzed
            await db
              .update(adCreatives)
              .set({ isAnalyzed: true })
              .where(eq(adCreatives.id, creative.id));
            
            if (creativeStatus) {
              creativeStatus.status = 'completed';
              creativeStatus.progress = 100;
            }
          }
        } catch (error) {
          console.error(`Error analyzing creative ${creative.id}:`, error);
          if (creativeStatus) {
            creativeStatus.status = 'failed';
          }
        }
      }
      
      // Complete job
      job.status = 'completed';
      job.progress = 100;
      job.currentStep = 'Analysis complete';
      job.actualCost = totalCost;
      job.results = results;
      job.completedAt = new Date();
      
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.currentStep = 'Failed';
      
      // Update database records
      await db
        .update(creativeAnalyses)
        .set({
          status: 'failed',
          error: job.error
        })
        .where(and(
          eq(creativeAnalyses.operationId, operationId),
          inArray(creativeAnalyses.creativeId, creativeIds),
          eq(creativeAnalyses.status, 'queued')
        ));
    }
  }

  // Analyze individual creative using hybrid architecture
  private async analyzeCreative(
    creative: AdCreative,
    analysisType: string,
    model: string
  ): Promise<any> {
    try {
      let totalCost = 0;
      let audioAnalysis = null;
      let visualAnalysis = null;
      let keyframes = null;
      let fusedInsights = null;
      
      console.log(`🎯 Starting hybrid analysis for creative: ${creative.name} (${creative.type})`);
      
      // Check if hybrid analysis services are available
      if (!this.audioAnalysisService || !this.visualAnalysisService || !this.fusionAnalysisService || !this.keyframeExtractionService) {
        console.log(`⚠️ Hybrid analysis services not available, falling back to legacy analysis`);
        return this.legacyAnalyzeCreative(creative, analysisType, model);
      }
      
      // Step 1: Handle video creatives with new scene-by-scene analysis
      if (creative.type === 'video' && creative.videoUrl) {
        try {
          console.log(`🎥 Video creative detected, performing scene-by-scene analysis...`);
          
          // Check if scene analysis services are available
          if (!this.sceneSegmentationService) {
            throw new Error('Scene segmentation service not available');
          }
          
          // Step 1a: Resolve media URL for Facebook videos
          let resolvedVideoUrl = creative.videoUrl;
          if (creative.network === 'facebook') {
            const videoId = creative.videoUrl.includes('facebook.com/video.php?v=') 
              ? creative.videoUrl.match(/v=([^&]+)/)?.[1] || creative.videoUrl
              : creative.videoUrl;
            
            console.log(`🔗 Resolving Facebook video URL for videoId: ${videoId}`);
            const resolvedUrl = await facebookAdsService.resolveMediaUrl(
              videoId, 
              'video', 
              creative.accountId
            );
            if (resolvedUrl) {
              resolvedVideoUrl = resolvedUrl;
              console.log(`✅ Facebook video URL resolved successfully`);
            } else {
              console.warn(`⚠️ Failed to resolve Facebook video URL, using original: ${creative.videoUrl}`);
            }
          }
          
          // Step 1b: Scene Segmentation - Detect scenes and extract keyframes per scene
          console.log(`🎬 Starting scene segmentation...`);
          const sceneSegments = await this.sceneSegmentationService.segmentVideo(resolvedVideoUrl);
          console.log(`✂️ Detected ${sceneSegments.length} scenes`);
          
          // Step 1c: Audio Analysis with timestamps
          console.log(`🎵 Analyzing audio with timestamps...`);
          // Download video and extract audio properly
          const tempVideoPath = await this.downloadVideoTemp(resolvedVideoUrl);
          const audioBuffer = await this.sceneSegmentationService.extractAudioFromVideo(tempVideoPath);
          const audioWithTimestamps = await this.audioAnalysisService!.analyzeAudioWithTimestamps(audioBuffer);
          totalCost += audioWithTimestamps.cost;
          
          // Step 1d: Align audio with scene timeline
          console.log(`🎵 Aligning audio with scene timeline...`);
          const alignedAudioScenes = this.audioAnalysisService!.alignTranscriptWithScenes(
            audioWithTimestamps,
            sceneSegments
          );
          
          // Step 1e: Technical visual analysis for each scene
          console.log(`👁️ Performing technical scene analysis...`);
          const analyzedVisualScenes = await this.visualAnalysisService!.analyzeScenes(sceneSegments);
          const visualCost = this.visualAnalysisService!.calculateSceneAnalysisCost(
            sceneSegments.length,
            3 // average keyframes per scene
          );
          totalCost += visualCost;
          
          // Step 1f: Calculate audio-visual sync quality
          console.log(`🔄 Calculating sync quality...`);
          const syncQualityData = this.audioAnalysisService!.calculateSyncQuality(
            alignedAudioScenes,
            analyzedVisualScenes
          );
          
          // Step 1g: Create structured scene timeline
          console.log(`🔥 Creating structured scene timeline...`);
          fusedInsights = await this.fusionAnalysisService!.createSceneTimeline(
            analyzedVisualScenes,
            alignedAudioScenes,
            syncQualityData
          );
          totalCost += fusedInsights.totalCost;
          
          console.log(`✅ Scene-by-scene analysis completed! Overall score: ${fusedInsights.overallScore.toFixed(1)}/10`);
          
          // Update legacy variables for compatibility
          audioAnalysis = {
            transcript: audioWithTimestamps.transcript,
            duration: audioWithTimestamps.duration,
            cost: audioWithTimestamps.cost
          };
          
          visualAnalysis = {
            keyframes: fusedInsights.scenes.flatMap(scene => scene.keyframes),
            cost: visualCost
          };
          
        } catch (error) {
          console.warn(`⚠️ Scene-by-scene analysis failed, falling back to legacy: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Fallback to legacy analysis for videos
          return this.legacyAnalyzeCreative(creative, analysisType, model);
        }
        
      // Step 2: Handle image creatives with visual analysis only
      } else if (creative.type === 'image' && creative.imageUrl) {
        try {
          console.log(`🖼️ Image creative detected, performing visual analysis...`);
          
          // Step 2a: Resolve media URL for Facebook images
          let resolvedImageUrl = creative.imageUrl;
          if (creative.network === 'facebook' && creative.creativeId) {
            console.log(`🔗 Resolving Facebook image URL for creativeId: ${creative.creativeId}`);
            const resolvedUrl = await facebookAdsService.resolveMediaUrl(
              creative.creativeId, 
              'image', 
              creative.accountId
            );
            if (resolvedUrl) {
              resolvedImageUrl = resolvedUrl;
              console.log(`✅ Facebook image URL resolved successfully`);
            } else {
              console.warn(`⚠️ Failed to resolve Facebook image URL, using original: ${creative.imageUrl}`);
            }
          }
          
          // Step 2b: Analyze image
          visualAnalysis = await this.visualAnalysisService.analyzeImage(resolvedImageUrl);
          totalCost += visualAnalysis.cost;
          console.log(`👁️ Image analysis completed (cost: $${visualAnalysis.cost.toFixed(4)})`);
          
          // Step 2b: Generate insights for static image
          
          // For images, we don't have audio, so no fusion needed
          fusedInsights = {
            overallScore: visualAnalysis.visualQuality,
            timeline: [],
            audioVisualSync: 'not_applicable',
            narrativeFlow: 'Imagem estática',
            ctaAlignment: 'Baseado apenas em elementos visuais',
            predictedPerformance: {
              ctr: visualAnalysis.visualQuality * 0.15, // Simple estimation
              cvr: visualAnalysis.visualQuality * 0.08,
              engagement: visualAnalysis.visualQuality > 7 ? 'alto' : visualAnalysis.visualQuality > 5 ? 'médio' : 'baixo'
            },
            keyStrengths: visualAnalysis.insights.slice(0, 3),
            improvements: ['Considere criar variações em vídeo para maior engajamento'],
            processingTime: visualAnalysis.processingTime
          };
          
        } catch (error) {
          console.warn(`⚠️ Image analysis failed, falling back to legacy: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return this.legacyAnalyzeCreative(creative, analysisType, model);
        }
        
      // Step 3: Fallback for other types or missing URLs
      } else {
        console.log(`📝 Text-only creative or missing media, using legacy analysis...`);
        return this.legacyAnalyzeCreative(creative, analysisType, model);
      }
      
      // Build comprehensive analysis result
      const analysis = this.buildHybridAnalysisResult(
        creative,
        audioAnalysis,
        visualAnalysis,
        keyframes,
        fusedInsights,
        analysisType
      );
      
      console.log(`✅ Hybrid analysis completed for ${creative.name}. Total cost: $${totalCost.toFixed(4)}`);
      
      return {
        result: analysis,
        insights: analysis.insights || [],
        recommendations: analysis.recommendations || [],
        scores: analysis.scores || {},
        
        // Store detailed analysis data for future reference
        audioAnalysis,
        keyframes,
        visualAnalysis,
        fusedInsights,
        
        inputTokens: Math.floor(totalCost * 200), // Estimate tokens from cost
        outputTokens: Math.floor(totalCost * 100),
        cost: totalCost
      };
      
    } catch (error) {
      console.error('Error in hybrid creative analysis:', error);
      throw error;
    }
  }

  // Legacy analysis method for fallback
  private async legacyAnalyzeCreative(
    creative: AdCreative,
    analysisType: string,
    model: string
  ): Promise<any> {
    try {
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        console.warn(`⚠️ No OpenAI API key available, returning placeholder analysis for ${creative.name}`);
        return this.createPlaceholderAnalysis(creative, 'API key não configurada');
      }

      const prompt = this.buildAnalysisPrompt(creative, analysisType);
      
      // Use GPT-4o for vision (supports both text and images)
      const shouldUseVision = creative.imageUrl || creative.videoUrl;
      const selectedModel = shouldUseVision ? 'gpt-4o' : 'gpt-4-turbo-preview';
      
      // Prepare messages with visual content if available
      const messages: any[] = [
        {
          role: "system",
          content: `Você é um especialista em marketing digital com foco na otimização de criativos para Facebook Ads. 
          Sua expertise inclui análise visual, psicologia do consumidor, copywriting persuasivo e performance de campanhas.
          Forneça insights acionáveis e recomendações específicas em português brasileiro.`
        }
      ];

      // Try with image first, fall back to text-only if image fails
      let completion;
      let usedVision = false;
      
      if (shouldUseVision && creative.imageUrl) {
        try {
          // First try with vision
          messages.push({
            role: "user",
            content: [
              {
                type: "text",
                text: prompt + "\n\nNOTA: Analise também o elemento visual da imagem do criativo."
              },
              {
                type: "image_url",
                image_url: {
                  url: creative.imageUrl,
                  detail: "high"
                }
              }
            ]
          });
          
          completion = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages,
            temperature: 0.7,
            max_tokens: 3000
          });
          usedVision = true;
          
        } catch (imageError: any) {
          console.log("⚠️ Vision analysis failed, falling back to text-only:", imageError.message);
          // Fall back to text-only analysis
          messages.pop(); // Remove the vision message
          messages.push({
            role: "user",
            content: prompt + "\n\nNOTA: Análise baseada apenas em dados textuais, pois a imagem não estava acessível."
          });
          
          completion = await this.openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages,
            temperature: 0.7,
            max_tokens: 3000
          });
        }
      } else {
        // Text-only analysis
        messages.push({
          role: "user",
          content: prompt
        });
        
        completion = await this.openai.chat.completions.create({
          model: selectedModel,
          messages,
          temperature: 0.7,
          max_tokens: 3000
        });
      }
      
      const response = completion.choices[0].message.content;
      const usage = completion.usage;
      
      // Parse response
      const analysis = this.parseAnalysisResponse(response, analysisType);
      
      // Calculate cost
      const pricing = this.modelPricing[model] || this.modelPricing['gpt-4-turbo-preview'];
      const cost = ((usage?.prompt_tokens || 0) / 1000) * pricing.input + 
                   ((usage?.completion_tokens || 0) / 1000) * pricing.output;
      
      return {
        result: analysis,
        insights: analysis.insights || [],
        recommendations: analysis.recommendations || [],
        scores: analysis.scores || {},
        inputTokens: usage?.prompt_tokens || 0,
        outputTokens: usage?.completion_tokens || 0,
        cost
      };
      
    } catch (error) {
      console.error('Error in legacy creative analysis:', error);
      throw error;
    }
  }

  // Create placeholder analysis when services are not available
  private createPlaceholderAnalysis(creative: AdCreative, reason: string): any {
    return {
      result: {
        summary: `Análise não disponível: ${reason}`,
        type: 'placeholder_analysis',
        insights: [
          `Análise do criativo "${creative.name}" não pôde ser realizada`,
          `Motivo: ${reason}`,
          'Para ativar análises completas, configure a chave da API OpenAI'
        ],
        recommendations: [
          'Configure a variável de ambiente OPENAI_API_KEY',
          'Tente novamente após a configuração da API key'
        ],
        scores: {},
        strengths: [],
        weaknesses: [],
        optimization_opportunities: []
      },
      insights: [`Análise indisponível: ${reason}`],
      recommendations: ['Configure OPENAI_API_KEY para análises completas'],
      scores: {},
      inputTokens: 0,
      outputTokens: 0,
      cost: 0
    };
  }

  // Build hybrid analysis result combining all services
  private buildHybridAnalysisResult(
    creative: AdCreative,
    audioAnalysis: any,
    visualAnalysis: any,
    keyframes: any,
    fusedInsights: any,
    analysisType: string
  ): any {
    // Combine insights from all analysis services
    const insights = [];
    const recommendations = [];
    const scores: any = {};

    // Add audio insights
    if (audioAnalysis) {
      const transcript = audioAnalysis.transcript || [];
      insights.push(`🔊 Áudio: ${transcript.length > 0 ? 'Transcrição clara detectada' : 'Sem áudio detectado'}`);
      if (audioAnalysis.musicDetected) {
        insights.push(`🎵 Música: ${audioAnalysis.musicType || 'Música de fundo detectada'}`);
      }
      if (audioAnalysis.ctaAudio && Array.isArray(audioAnalysis.ctaAudio)) {
        insights.push(...audioAnalysis.ctaAudio.map((cta: string) => `📢 CTA Áudio: ${cta}`));
      }
      scores.audio_quality = audioAnalysis.audioQuality || 0;
    }

    // Add visual insights  
    if (visualAnalysis) {
      if (visualAnalysis.keyframes) {
        insights.push(`👁️ Visual: ${visualAnalysis.keyframes.length} keyframes analisados`);
        insights.push(`🏷️ Produtos: ${(visualAnalysis.products || []).join(', ')}`);
        insights.push(`📝 Textos: ${(visualAnalysis.textOnScreen || []).join(', ')}`);
      } else {
        insights.push(`🖼️ Imagem: Qualidade visual ${visualAnalysis.visualQuality}/10`);
        insights.push(`🏷️ Elementos: ${(visualAnalysis.objects || []).join(', ')}`);
        insights.push(`📝 Textos: ${(visualAnalysis.text || []).join(', ')}`);
      }
      scores.visual_quality = visualAnalysis.visualQuality;
      scores.logo_visibility = visualAnalysis.logoVisibility;
    }

    // Add fusion insights
    if (fusedInsights) {
      insights.push(`🧠 Score Geral: ${fusedInsights.overallScore}/10`);
      
      // Safe access to nested properties
      if (fusedInsights.predictedPerformance) {
        insights.push(`🎯 Performance Prevista: CTR ${fusedInsights.predictedPerformance.ctr}%, CVR ${fusedInsights.predictedPerformance.cvr}%`);
        scores.predicted_ctr = fusedInsights.predictedPerformance.ctr;
        scores.predicted_cvr = fusedInsights.predictedPerformance.cvr;
      }
      
      if (fusedInsights.keyStrengths && Array.isArray(fusedInsights.keyStrengths)) {
        recommendations.push(...fusedInsights.keyStrengths.map((strength: string) => `✅ ${strength}`));
      }
      if (fusedInsights.improvements && Array.isArray(fusedInsights.improvements)) {
        recommendations.push(...fusedInsights.improvements.map((improvement: string) => `🔧 ${improvement}`));
      }
      
      scores.overall_performance = fusedInsights.overallScore;
    }

    // Build final analysis structure
    return {
      summary: `Análise Híbrida Completa: ${creative.name}`,
      type: 'hybrid_analysis',
      insights,
      recommendations,
      scores,
      strengths: fusedInsights?.keyStrengths || [],
      weaknesses: fusedInsights?.improvements || [],
      optimization_opportunities: [
        ...(audioAnalysis ? [`Otimizar qualidade de áudio (atual: ${audioAnalysis.audioQuality}/10)`] : []),
        ...(visualAnalysis ? [`Melhorar impacto visual (atual: ${visualAnalysis.visualQuality}/10)`] : []),
        ...((fusedInsights?.audioVisualSync === 'poor') ? ['Melhorar sincronização áudio-visual'] : [])
      ],
      timeline: fusedInsights?.scenes || [],
      fusionScore: fusedInsights?.overallScore || null,
      analysisMethod: 'OpenAI Whisper + GPT-4o Vision + Fusion Intelligence',
      // Add the structure that the frontend expects for Timeline Técnico
      fusionAnalysis: {
        scenes: fusedInsights?.scenes || [],
        totalDuration: fusedInsights?.totalDuration || 0,
        overallScore: fusedInsights?.overallScore || 0
      }
    };
  }

  // Build analysis prompt based on type
  private buildAnalysisPrompt(creative: AdCreative, analysisType: string): string {
    const baseInfo = `
CREATIVE INTELLIGENCE - ANÁLISE COMPLETA:

=== INFORMAÇÕES BÁSICAS ===
- Nome: ${creative.name}
- Tipo: ${creative.type}
- Headline: ${creative.headline || 'N/A'}
- Texto Principal: ${creative.primaryText || 'N/A'}
- CTA: ${creative.ctaType || 'N/A'}
- URL da Imagem: ${creative.imageUrl || 'N/A'}
- URL do Vídeo: ${creative.videoUrl || 'N/A'}

=== PERFORMANCE ATUAL ===
- Impressões: ${creative.impressions}
- Cliques: ${creative.clicks}
- CTR: ${creative.ctr}%
- CPC: ${creative.cpc}
- Investimento: ${creative.spend}
- Conversões: ${creative.conversions}

=== ANÁLISE SOLICITADA ===
Por favor, realize uma análise COMPLETA e DETALHADA do criativo, incluindo:
`;

    const prompts: Record<string, string> = {
      'audit': `${baseInfo}

🎯 ANÁLISE COMPLETA DO CRIATIVO:

1. **ANÁLISE VISUAL & VÍDEO**
   - Qualidade e resolução da imagem/vídeo
   - Composição visual e hierarquia
   - Cores dominantes e psicologia das cores
   - Elementos visuais que chamam atenção
   - Se vídeo: ritmo, transições, elementos visuais
   - Consistência com identidade da marca

2. **ANÁLISE DE ÁUDIO** (se aplicável)
   - Qualidade do áudio
   - Tom de voz e energia
   - Música de fundo e efeitos sonoros
   - Sincronização com elementos visuais
   - Impacto emocional do áudio

3. **ANÁLISE DE COPY & MENSAGEM**
   - Clareza e impacto do headline
   - Persuasão do texto principal
   - Tom de voz e personalidade da marca
   - Estrutura e flow da mensagem
   - Benefit vs feature presentation
   - Legibilidade e formatação

4. **GATILHOS EMOCIONAIS & PSICOLÓGICOS**
   - Gatilhos de urgência (tempo limitado)
   - Gatilhos de escassez (quantidade limitada)
   - Social proof (depoimentos, números)
   - Autoridade (especialistas, certificações)
   - Reciprocidade (ofertas, bônus)
   - Medo da perda (FOMO)
   - Aspiração e desejo

5. **GANCHOS & ATENÇÃO**
   - Hook inicial (primeiros 3 segundos)
   - Elementos de surpresa ou curiosidade
   - Padrão interrupt (quebra de expectativa)
   - Storytelling e narrativa
   - Proposta de valor única

6. **CALL-TO-ACTION (CTA)**
   - Clareza e específicidade do CTA
   - Posicionamento e visibilidade
   - Urgência e motivação para ação
   - Facilidade de compreensão
   - Design e contraste visual

7. **PERFORMANCE & CONVERSÃO**
   - Análise das métricas atuais
   - Benchmarking com padrões do setor
   - Potencial de otimização
   - Audience-creative fit
   - Funnel stage appropriateness

8. **COMPETITIVE INTELLIGENCE**
   - Diferenciação vs concorrentes
   - Trends e padrões do mercado
   - Oportunidades de positioning

**FORMATO DA RESPOSTA:**
Por favor, estruture sua resposta em JSON com:
{
  "scores": {
    "visual_impact": (1-10),
    "copy_effectiveness": (1-10),
    "emotional_triggers": (1-10),
    "cta_strength": (1-10),
    "overall_performance": (1-10)
  },
  "insights": [
    "insight detalhado 1",
    "insight detalhado 2"
  ],
  "recommendations": [
    "recomendação específica 1",
    "recomendação específica 2"
  ],
  "strengths": ["força 1", "força 2"],
  "weaknesses": ["fraqueza 1", "fraqueza 2"],
  "optimization_opportunities": [
    "oportunidade 1",
    "oportunidade 2"
  ]
}`,

      'angles': `${baseInfo}
Identify and analyze the marketing angles used in this creative:
1. Primary emotional appeal
2. Value proposition clarity
3. Pain points addressed
4. Benefits highlighted
5. Social proof elements
6. Urgency/scarcity tactics

Suggest 3-5 alternative angles that could improve performance.`,

      'copy': `${baseInfo}
Analyze the copy and suggest improvements:
1. Headline impact and clarity
2. Body copy persuasiveness
3. Language and tone appropriateness
4. Keywords and SEO optimization
5. Readability and flow

Provide 3 optimized variations of the headline and primary text.`,

      'variants': `${baseInfo}
Generate creative variations to test:
1. 3 alternative headlines
2. 3 alternative primary text versions
3. 2 different CTA options
4. Suggested visual style changes
5. Audience targeting adjustments

Explain the hypothesis behind each variation.`,

      'performance': `${baseInfo}
Analyze performance and provide insights:
1. CTR analysis and benchmarking
2. CPC optimization opportunities
3. Conversion rate assessment
4. Audience engagement patterns
5. Budget efficiency recommendations
6. Scaling potential

Provide specific KPI targets and optimization strategies.`
    };

    return prompts[analysisType] || prompts['audit'];
  }

  // Parse analysis response
  private parseAnalysisResponse(response: string | null, analysisType: string): any {
    if (!response) {
      return {
        insights: [],
        recommendations: [],
        scores: {}
      };
    }

    try {
      // Try to parse as JSON if the response is structured
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Otherwise, structure the text response
      const sections = response.split(/\n\n+/);
      const insights: string[] = [];
      const recommendations: string[] = [];
      const scores: Record<string, number> = {};
      
      sections.forEach(section => {
        if (section.toLowerCase().includes('insight') || section.toLowerCase().includes('analysis')) {
          insights.push(section.trim());
        } else if (section.toLowerCase().includes('recommend') || section.toLowerCase().includes('suggest')) {
          recommendations.push(section.trim());
        }
        
        // Extract scores if present
        const scoreMatches = Array.from(section.matchAll(/(\w+):\s*(\d+)\/10/g));
        for (const match of scoreMatches) {
          scores[match[1].toLowerCase()] = parseInt(match[2]);
        }
      });
      
      return {
        raw: response,
        insights,
        recommendations,
        scores,
        summary: sections[0] || response.substring(0, 500)
      };
      
    } catch (error) {
      console.error('Error parsing analysis response:', error);
      return {
        raw: response,
        insights: [response],
        recommendations: [],
        scores: {}
      };
    }
  }

  // Get job status
  getJobStatus(jobId: string): AnalysisJob | undefined {
    return this.jobStore.get(jobId);
  }

  // Get analyzed creatives
  async getAnalyzedCreatives(operationId: string): Promise<any[]> {
    console.log(`🔍 DEBUG: getAnalyzedCreatives called with operationId: ${operationId}`);
    
    const analyses = await db
      .select({
        analysis: creativeAnalyses,
        creative: adCreatives
      })
      .from(creativeAnalyses)
      .innerJoin(adCreatives, eq(creativeAnalyses.creativeId, adCreatives.id))
      .where(and(
        eq(creativeAnalyses.operationId, operationId),
        eq(creativeAnalyses.status, 'completed')
      ))
      .orderBy(creativeAnalyses.completedAt);
    
    console.log(`🔍 DEBUG: Found ${analyses.length} total analyzed creatives (including duplicates)`);
    
    // Remove duplicates by keeping only the most recent analysis for each creative
    const uniqueAnalyses = new Map<string, any>();
    
    for (const analysis of analyses) {
      const creativeId = analysis.analysis.creativeId;
      
      // Skip if creativeId is null
      if (!creativeId) {
        console.warn('⚠️ Skipping analysis with null creativeId');
        continue;
      }
      
      const existing = uniqueAnalyses.get(creativeId);
      
      // Keep the most recent analysis (latest completedAt)
      if (!existing) {
        uniqueAnalyses.set(creativeId, analysis);
      } else {
        // Compare dates safely
        const currentDate = analysis.analysis.completedAt ? new Date(analysis.analysis.completedAt) : new Date(0);
        const existingDate = existing.analysis.completedAt ? new Date(existing.analysis.completedAt) : new Date(0);
        
        if (currentDate > existingDate) {
          uniqueAnalyses.set(creativeId, analysis);
        }
      }
    }
    
    const uniqueResults = Array.from(uniqueAnalyses.values());
    
    // Sort by completedAt descending to maintain consistent UI ordering (most recent first)
    uniqueResults.sort((a, b) => {
      const dateA = a.analysis.completedAt ? new Date(a.analysis.completedAt) : new Date(0);
      const dateB = b.analysis.completedAt ? new Date(b.analysis.completedAt) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    
    console.log(`🔍 DEBUG: After deduplication: ${uniqueResults.length} unique analyzed creatives`);
    if (uniqueResults.length > 0) {
      console.log(`🔍 DEBUG: First unique result:`, {
        creativeId: uniqueResults[0].analysis.creativeId,
        status: uniqueResults[0].analysis.status,
        completedAt: uniqueResults[0].analysis.completedAt
      });
    }
    
    return uniqueResults;
  }
}

export const creativeAnalysisService = new CreativeAnalysisService();