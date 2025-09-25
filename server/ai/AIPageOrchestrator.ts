import { BriefEnrichmentEngine } from './engines/BriefEnrichmentEngine';
import { ContentGenerationEngine } from './engines/ContentGenerationEngine';
import { LayoutOptimizationEngine } from './engines/LayoutOptimizationEngine';
import { MediaEnrichmentEngine } from './engines/MediaEnrichmentEngine';
import { QAReviewService } from './engines/QAReviewService';
import { TemplateLibrary } from './engines/TemplateLibrary';
import { PromptLibrary } from './engines/PromptLibrary';
import { pageGenerationDrafts, pageGenerationTemplates } from '../../shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';

export interface AIGenerationRequest {
  operationId: string;
  userId: string;
  funnelId: string;
  pageId?: string;
  briefData: {
    productInfo: {
      name: string;
      description: string;
      price: number;
      currency: string;
      targetAudience: string;
      mainBenefits: string[];
      objections: string[];
      industry: string;
    };
    conversionGoal: string;
    brandGuidelines?: any;
  };
}

export interface AIGenerationResult {
  draftId: string;
  generatedModel: any;
  qualityScore: any;
  generationSteps: any;
  status: string;
  totalCost: number;
}

export class AIPageOrchestrator {
  private briefEngine: BriefEnrichmentEngine;
  private contentEngine: ContentGenerationEngine;
  private layoutEngine: LayoutOptimizationEngine;
  private mediaEngine: MediaEnrichmentEngine;
  private qaService: QAReviewService;
  private templateLibrary: TemplateLibrary;
  private promptLibrary: PromptLibrary;

  constructor() {
    this.briefEngine = new BriefEnrichmentEngine();
    this.contentEngine = new ContentGenerationEngine();
    this.layoutEngine = new LayoutOptimizationEngine();
    this.mediaEngine = new MediaEnrichmentEngine();
    this.qaService = new QAReviewService();
    this.templateLibrary = new TemplateLibrary();
    this.promptLibrary = new PromptLibrary();
  }

  async generatePage(request: AIGenerationRequest): Promise<AIGenerationResult> {
    const draftId = crypto.randomUUID();
    let totalCost = 0;
    let generationSteps: any = {};

    try {
      // Create initial draft record
      await db.insert(pageGenerationDrafts).values({
        id: draftId,
        funnelId: request.funnelId,
        pageId: request.pageId,
        operationId: request.operationId,
        userId: request.userId,
        briefData: request.briefData,
        status: 'generating'
      });

      // Step 1: Brief Enrichment & Template Selection
      console.log('🎯 Step 1: Brief enrichment & template selection...');
      const enrichmentResult = await this.briefEngine.enrichBrief(request.briefData);
      generationSteps.briefEnrichment = enrichmentResult;
      totalCost += enrichmentResult.cost || 0;

      // Select optimal template based on enriched brief
      const selectedTemplate = await this.templateLibrary.selectOptimalTemplate(
        enrichmentResult.enrichedBrief
      );
      generationSteps.templateSelection = {
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        conversionFramework: selectedTemplate.conversionFramework,
        matchScore: selectedTemplate.matchScore
      };

      // Step 2: Content Generation
      console.log('✍️ Step 2: Content generation...');
      const contentResult = await this.contentEngine.generateContent(
        enrichmentResult.enrichedBrief,
        selectedTemplate
      );
      generationSteps.contentGeneration = contentResult;
      totalCost += contentResult.cost || 0;

      // Step 3: Layout Optimization
      console.log('📱 Step 3: Layout optimization...');
      const layoutResult = await this.layoutEngine.optimizeLayout(
        contentResult.generatedContent,
        selectedTemplate,
        { mobileFirst: true, responsive: true }
      );
      generationSteps.layoutOptimization = layoutResult;
      totalCost += layoutResult.cost || 0;

      // Step 4: Media Enrichment
      console.log('🖼️ Step 4: Media enrichment...');
      const mediaResult = await this.mediaEngine.enrichWithMedia(
        layoutResult.optimizedContent,
        enrichmentResult.enrichedBrief
      );
      generationSteps.mediaEnrichment = mediaResult;
      totalCost += mediaResult.cost || 0;

      // Step 5: Quality Assurance
      console.log('✅ Step 5: Quality assurance...');
      const qaResult = await this.qaService.assessQuality(
        mediaResult.enrichedContent,
        enrichmentResult.enrichedBrief,
        selectedTemplate
      );
      generationSteps.qualityAssurance = qaResult;
      totalCost += qaResult.cost || 0;

      // Compile final page model
      const finalModel = {
        ...mediaResult.enrichedContent,
        metadata: {
          templateId: selectedTemplate.id,
          generationMethod: 'ai_orchestrated',
          conversionFramework: selectedTemplate.conversionFramework,
          qualityScore: qaResult.overallScore,
          generatedAt: new Date().toISOString()
        }
      };

      // Update draft with final results
      await db.update(pageGenerationDrafts)
        .set({
          templateId: selectedTemplate.id,
          generatedModel: finalModel,
          qualityScore: qaResult,
          generationSteps,
          status: qaResult.overallScore >= 8.0 ? 'review_pending' : 'needs_improvement',
          aiCost: totalCost.toString(),
          generatedAt: new Date(),
        })
        .where(eq(pageGenerationDrafts.id, draftId));

      console.log(`🚀 AI Generation Complete! Quality Score: ${qaResult.overallScore}/10`);
      console.log(`💰 Total Cost: $${totalCost.toFixed(4)}`);

      return {
        draftId,
        generatedModel: finalModel,
        qualityScore: qaResult.overallScore,
        generationSteps,
        status: qaResult.overallScore >= 8.0 ? 'review_pending' : 'needs_improvement',
        totalCost
      };

    } catch (error) {
      console.error('❌ AI Generation Failed:', error);
      
      // Update draft with error status
      await db.update(pageGenerationDrafts)
        .set({
          status: 'failed',
          generationSteps: { ...generationSteps, error: (error as Error).message },
          aiCost: totalCost.toString()
        })
        .where(eq(pageGenerationDrafts.id, draftId));

      throw error;
    }
  }

  async getGenerationStatus(draftId: string) {
    const draft = await db.select()
      .from(pageGenerationDrafts)
      .where(eq(pageGenerationDrafts.id, draftId))
      .limit(1);

    if (!draft.length) {
      throw new Error('Draft not found');
    }

    return {
      status: draft[0].status,
      progress: this.calculateProgress(draft[0].generationSteps),
      qualityScore: draft[0].qualityScore,
      estimatedCompletion: this.estimateCompletion(draft[0].status)
    };
  }

  private calculateProgress(generationSteps: any): number {
    if (!generationSteps) return 0;
    
    const stages = ['briefEnrichment', 'templateSelection', 'contentGeneration', 'layoutOptimization', 'mediaEnrichment', 'qualityAssurance'];
    const completedStages = stages.filter(stage => generationSteps[stage]).length;
    return (completedStages / stages.length) * 100;
  }

  private estimateCompletion(status: string): string {
    const estimates = {
      'generating': '2-3 minutes',
      'review_pending': 'Complete',
      'needs_improvement': 'Requires manual review',
      'failed': 'Failed'
    };
    
    return estimates[status as keyof typeof estimates] || 'Unknown';
  }
}