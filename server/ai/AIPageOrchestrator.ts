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
      const finalModel = this.transformToPageModelV2({
        ...mediaResult.enrichedContent,
        metadata: {
          templateId: selectedTemplate.id,
          generationMethod: 'ai_orchestrated',
          conversionFramework: selectedTemplate.conversionFramework,
          qualityScore: qaResult.overallScore,
          generatedAt: new Date().toISOString()
        }
      });

      // Update draft with final results
      await db.update(pageGenerationDrafts)
        .set({
          templateId: selectedTemplate.id,
          generatedModel: finalModel,
          qualityScore: qaResult.overallScore,
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

  /**
   * Transform AI-generated content to PageModelV2 structure
   */
  private transformToPageModelV2(aiContent: any): any {
    console.log('🔄 Transforming AI content to PageModelV2 structure...');
    
    // Create sections from AI-generated content
    const sections = this.transformSections(aiContent.sections || []);
    
    return {
      version: 2,
      sections,
      theme: {
        colors: {
          primary: aiContent.style?.primaryColor || '#3b82f6',
          secondary: aiContent.style?.secondaryColor || '#64748b',
          accent: '#f59e0b',
          background: '#ffffff',
          text: '#1e293b',
          muted: '#9ca3af',
        },
        typography: {
          headingFont: aiContent.style?.fontFamily || 'Inter, sans-serif',
          bodyFont: aiContent.style?.fontFamily || 'Inter, sans-serif',
          fontSize: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem',
            '4xl': '2.25rem',
          },
        },
        spacing: {
          xs: '0.25rem',
          sm: '0.5rem',
          md: '1rem',
          lg: '1.5rem',
          xl: '2rem',
          '2xl': '3rem',
        },
        borderRadius: {
          sm: '0.25rem',
          md: '0.5rem',
          lg: '0.75rem',
        },
      },
      seo: aiContent.seo || {},
      settings: {
        containerMaxWidth: '1200px',
        showGrid: false,
        snapToGrid: true,
        enableAnimations: true,
      },
      metadata: aiContent.metadata || {}
    };
  }

  /**
   * Transform AI sections to BlockSection structure
   */
  private transformSections(aiSections: any[]): any[] {
    return aiSections.map((section) => ({
      id: section.id || this.generateId(),
      type: 'section',
      rows: [{
        id: this.generateId(),
        columns: [{
          id: this.generateId(),
          width: 'full',
          elements: [this.transformSectionToElement(section)]
        }],
        styles: {}
      }],
      styles: {
        padding: '4rem 0',
        backgroundColor: '#ffffff',
      },
      settings: {
        containerWidth: 'container',
      },
    }));
  }

  /**
   * Transform a single AI section to BlockElement
   */
  private transformSectionToElement(section: any): any {
    const baseElement = {
      id: section.id || this.generateId(),
      type: this.mapSectionTypeToElementType(section.type),
      props: {},
      styles: {},
      content: this.transformSectionContent(section),
    };

    return baseElement;
  }

  /**
   * Map AI section types to page builder element types
   */
  private mapSectionTypeToElementType(sectionType: string): string {
    const typeMap: { [key: string]: string } = {
      'hero': 'hero',
      'benefícios': 'benefits',
      'benefits': 'benefits',
      'prova-social': 'reviews',
      'testimonials': 'reviews',
      'cta': 'button',
      'faq': 'text',
      'problema': 'text',
      'solução': 'text',
      'objeções': 'text'
    };
    
    return typeMap[sectionType] || 'text';
  }

  /**
   * Transform section content with proper data structure
   */
  private transformSectionContent(section: any): any {
    const sectionType = section.type;
    
    switch (sectionType) {
      case 'benefícios':
      case 'benefits':
        return this.transformBenefitsContent(section.content);
        
      case 'prova-social':
      case 'testimonials':
        return this.transformTestimonialsContent(section.content);
        
      case 'hero':
        return this.transformHeroContent(section.content);
        
      case 'cta':
        return this.transformCTAContent(section.content);
        
      default:
        return this.transformTextContent(section.content);
    }
  }

  /**
   * Transform benefits content with proper IDs and icon mapping
   */
  private transformBenefitsContent(content: any): any {
    if (!content?.benefits) {
      return { benefits: [] };
    }

    const validIcons = ['check', 'star', 'zap', 'heart', 'trophy', 'shield'];
    
    const transformedBenefits = content.benefits.map((benefit: any) => ({
      id: this.generateId(),
      title: benefit.title || 'Benefício',
      description: benefit.description || 'Descrição do benefício',
      icon: this.mapIconName(benefit.icon) || 'check'
    }));

    return {
      ...content,
      benefits: transformedBenefits
    };
  }

  /**
   * Transform testimonials content with proper IDs and field mapping
   */
  private transformTestimonialsContent(content: any): any {
    if (!content?.testimonials) {
      return { reviews: [] };
    }

    const transformedReviews = content.testimonials.map((testimonial: any) => ({
      id: this.generateId(),
      name: testimonial.name || 'Cliente',
      comment: testimonial.text || testimonial.comment || 'Depoimento do cliente',
      rating: testimonial.rating || 5,
      role: testimonial.role || 'Cliente Verificado',
      avatar: testimonial.avatar
    }));

    return {
      ...content,
      reviews: transformedReviews
    };
  }

  /**
   * Transform hero content
   */
  private transformHeroContent(content: any): any {
    return {
      title: content.headline || content.title || 'Título Hero',
      subtitle: content.subheadline || content.subtitle || 'Subtítulo descritivo',
      ctaText: content.ctaText || 'Call to Action'
    };
  }

  /**
   * Transform CTA content
   */
  private transformCTAContent(content: any): any {
    return {
      text: content.ctaText || content.text || 'Call to Action'
    };
  }

  /**
   * Transform text content
   */
  private transformTextContent(content: any): any {
    return {
      text: content.text || content.title || 'Texto'
    };
  }

  /**
   * Map AI icon names to valid component icon names
   */
  private mapIconName(iconName: string): string {
    const iconMap: { [key: string]: string } = {
      'check': 'check',
      'checkmark': 'check',
      'tick': 'check',
      'star': 'star',
      'rating': 'star',
      'zap': 'zap',
      'lightning': 'zap',
      'bolt': 'zap',
      'heart': 'heart',
      'love': 'heart',
      'trophy': 'trophy',
      'award': 'trophy',
      'medal': 'trophy',
      'shield': 'shield',
      'security': 'shield',
      'protection': 'shield',
      'safe': 'shield'
    };
    
    return iconMap[iconName?.toLowerCase()] || 'check';
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
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