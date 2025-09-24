import OpenAI from 'openai';
import { stockImageTool } from '../../../tools/stockImageTool';

export interface MediaResult {
  enrichedContent: {
    layout: string;
    sections: Array<{
      id: string;
      type: string;
      config: any;
      content: any;
      responsive?: any;
      accessibility?: any;
      mediaAssets?: {
        images: string[];
        videos?: string[];
        icons?: string[];
      };
    }>;
    style: any;
    seo: any;
    performance?: any;
    globalMediaAssets: {
      heroImages: string[];
      productImages: string[];
      testimonialAvatars: string[];
      decorativeImages: string[];
      iconSet: string[];
    };
  };
  cost: number;
  mediaAdded: string[];
  mediaQualityScore: number;
}

export class MediaEnrichmentEngine {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async enrichWithMedia(content: any, enrichedBrief: any): Promise<MediaResult> {
    console.log('🖼️ Media enrichment - adding professional stock images...');
    
    try {
      let totalCost = 0;
      const mediaAdded = [];
      const globalMediaAssets = {
        heroImages: [],
        productImages: [],
        testimonialAvatars: [],
        decorativeImages: [],
        iconSet: []
      };

      // Step 1: Analyze content for media opportunities
      const mediaAnalysis = await this.analyzeMediaNeeds(content, enrichedBrief);
      totalCost += mediaAnalysis.cost;

      // Step 2: Generate section-specific media
      const enrichedSections = [];
      for (const section of content.sections) {
        console.log(`  🎨 Adding media to ${section.type} section...`);
        
        const sectionMedia = await this.addSectionMedia(section, enrichedBrief, mediaAnalysis);
        enrichedSections.push(sectionMedia.section);
        mediaAdded.push(...sectionMedia.mediaAdded);
        
        // Collect global assets
        if (sectionMedia.globalAssets) {
          Object.keys(sectionMedia.globalAssets).forEach(key => {
            if (globalMediaAssets[key]) {
              globalMediaAssets[key].push(...sectionMedia.globalAssets[key]);
            }
          });
        }
      }

      // Step 3: Add global decorative and branding images
      const brandingMedia = await this.addBrandingMedia(enrichedBrief);
      globalMediaAssets.decorativeImages.push(...brandingMedia.images);
      mediaAdded.push(...brandingMedia.mediaAdded);

      const result: MediaResult = {
        enrichedContent: {
          ...content,
          sections: enrichedSections,
          globalMediaAssets
        },
        cost: totalCost,
        mediaAdded,
        mediaQualityScore: this.calculateMediaQuality(enrichedSections, globalMediaAssets)
      };

      console.log(`✅ Media enriched - ${mediaAdded.length} assets added, Quality: ${result.mediaQualityScore}/10, Cost: $${totalCost.toFixed(4)}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Media enrichment failed:', error);
      
      // Fallback to basic media
      return this.generateFallbackMedia(content, enrichedBrief);
    }
  }

  private async analyzeMediaNeeds(content: any, enrichedBrief: any) {
    const prompt = `
Analise este conteúdo para identificar necessidades de mídia visual:

PRODUTO: ${enrichedBrief.originalBrief.productInfo.name}
INDÚSTRIA: ${enrichedBrief.marketContext.industry}
PÚBLICO: ${enrichedBrief.targetPersona.demographics}
SEÇÕES: ${content.sections.map(s => s.type).join(', ')}

Identifique necessidades de imagens para cada seção. Retorne JSON:
{
  "heroNeeds": {
    "primaryImage": "descrição da imagem principal",
    "style": "professional/lifestyle/product",
    "mood": "confident/exciting/trustworthy"
  },
  "sectionNeeds": [
    {
      "sectionType": "benefits",
      "imageType": "icons/illustrations/photos",
      "quantity": 3,
      "descriptions": ["icon representing benefit 1", "icon representing benefit 2"]
    }
  ],
  "brandingNeeds": {
    "decorativeImages": ["background pattern", "accent element"],
    "iconSet": ["checkmark", "star", "arrow"]
  },
  "overallStyle": "modern/classic/minimalist/bold",
  "colorScheme": "professional/vibrant/warm/cool"
}
    `;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Você é especialista em design visual e seleção de imagens para páginas de conversão. Identifique as necessidades visuais para maximizar impacto e conversão."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.6,
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(completion.choices[0].message.content || '{}');
    
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const cost = (inputTokens * 0.005 + outputTokens * 0.015) / 1000;

    return { analysis, cost };
  }

  private async addSectionMedia(section: any, enrichedBrief: any, mediaAnalysis: any) {
    const sectionNeed = mediaAnalysis.analysis.sectionNeeds?.find(
      need => need.sectionType === section.type
    );

    let mediaAssets = { images: [], videos: [], icons: [] };
    let mediaAdded = [];
    let globalAssets = {};

    try {
      switch (section.type) {
        case 'hero':
          const heroMedia = await this.addHeroMedia(section, enrichedBrief, mediaAnalysis);
          mediaAssets = heroMedia.mediaAssets;
          mediaAdded = heroMedia.mediaAdded;
          globalAssets = { heroImages: heroMedia.mediaAssets.images };
          break;

        case 'benefícios':
        case 'benefits':
          const benefitsMedia = await this.addBenefitsMedia(section, enrichedBrief, sectionNeed);
          mediaAssets = benefitsMedia.mediaAssets;
          mediaAdded = benefitsMedia.mediaAdded;
          break;

        case 'prova-social':
        case 'reviews':
        case 'testimonials':
          const socialMedia = await this.addSocialProofMedia(section, enrichedBrief);
          mediaAssets = socialMedia.mediaAssets;
          mediaAdded = socialMedia.mediaAdded;
          globalAssets = { testimonialAvatars: socialMedia.mediaAssets.images };
          break;

        case 'cta':
          const ctaMedia = await this.addCTAMedia(section, enrichedBrief, mediaAnalysis);
          mediaAssets = ctaMedia.mediaAssets;
          mediaAdded = ctaMedia.mediaAdded;
          break;

        default:
          // Generic content sections
          const genericMedia = await this.addGenericMedia(section, enrichedBrief, sectionNeed);
          mediaAssets = genericMedia.mediaAssets;
          mediaAdded = genericMedia.mediaAdded;
          break;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to add media to ${section.type} section:`, error.message);
      // Continue with empty media assets
    }

    return {
      section: {
        ...section,
        mediaAssets
      },
      mediaAdded,
      globalAssets
    };
  }

  private async addHeroMedia(section: any, enrichedBrief: any, mediaAnalysis: any) {
    const heroNeed = mediaAnalysis.analysis.heroNeeds;
    
    // Generate professional hero image
    const imageDescription = heroNeed?.primaryImage || 
      `Professional ${enrichedBrief.marketContext.industry} ${heroNeed?.style || 'lifestyle'} image showing ${enrichedBrief.originalBrief.productInfo.name}`;

    try {
      const images = await stockImageTool({
        description: imageDescription,
        limit: 2,
        orientation: 'horizontal'
      });

      return {
        mediaAssets: {
          images: images.map(img => img.downloadUrl),
          videos: [],
          icons: []
        },
        mediaAdded: ['hero background image', 'hero secondary image']
      };
    } catch (error) {
      console.warn('Failed to fetch hero images:', error.message);
      return {
        mediaAssets: { images: [], videos: [], icons: [] },
        mediaAdded: []
      };
    }
  }

  private async addBenefitsMedia(section: any, enrichedBrief: any, sectionNeed: any) {
    const benefits = section.content?.benefits || [];
    const mediaAssets = { images: [], videos: [], icons: [] };
    const mediaAdded = [];

    // Add icons for each benefit
    for (let i = 0; i < Math.min(benefits.length, 4); i++) {
      const benefit = benefits[i];
      const iconDescription = `Simple ${benefit.icon || 'benefit'} icon vector illustration`;
      
      try {
        const icons = await stockImageTool({
          description: iconDescription,
          limit: 1,
          orientation: 'all'
        });

        if (icons.length > 0) {
          mediaAssets.icons.push(icons[0].downloadUrl);
          mediaAdded.push(`${benefit.title} icon`);
        }
      } catch (error) {
        console.warn(`Failed to fetch icon for benefit ${i + 1}:`, error.message);
      }
    }

    return { mediaAssets, mediaAdded };
  }

  private async addSocialProofMedia(section: any, enrichedBrief: any) {
    const testimonials = section.content?.testimonials || [];
    const mediaAssets = { images: [], videos: [], icons: [] };
    const mediaAdded = [];

    // Add avatar images for testimonials
    for (let i = 0; i < Math.min(testimonials.length, 5); i++) {
      const testimonial = testimonials[i];
      const avatarDescription = `Professional business person headshot portrait ${testimonial.name} style`;
      
      try {
        const avatars = await stockImageTool({
          description: avatarDescription,
          limit: 1,
          orientation: 'all'
        });

        if (avatars.length > 0) {
          mediaAssets.images.push(avatars[0].downloadUrl);
          mediaAdded.push(`${testimonial.name} avatar`);
        }
      } catch (error) {
        console.warn(`Failed to fetch avatar for testimonial ${i + 1}:`, error.message);
      }
    }

    return { mediaAssets, mediaAdded };
  }

  private async addCTAMedia(section: any, enrichedBrief: any, mediaAnalysis: any) {
    const ctaStyle = mediaAnalysis.analysis.overallStyle || 'modern';
    
    // Add urgent/action-oriented image
    const imageDescription = `${ctaStyle} call to action background ${enrichedBrief.marketContext.industry} professional`;
    
    try {
      const images = await stockImageTool({
        description: imageDescription,
        limit: 1,
        orientation: 'horizontal'
      });

      return {
        mediaAssets: {
          images: images.map(img => img.downloadUrl),
          videos: [],
          icons: []
        },
        mediaAdded: ['CTA background image']
      };
    } catch (error) {
      console.warn('Failed to fetch CTA image:', error.message);
      return {
        mediaAssets: { images: [], videos: [], icons: [] },
        mediaAdded: []
      };
    }
  }

  private async addGenericMedia(section: any, enrichedBrief: any, sectionNeed: any) {
    if (!sectionNeed) {
      return {
        mediaAssets: { images: [], videos: [], icons: [] },
        mediaAdded: []
      };
    }

    const mediaAssets = { images: [], videos: [], icons: [] };
    const mediaAdded = [];

    // Add images based on section needs
    if (sectionNeed.imageType === 'photos' && sectionNeed.descriptions) {
      for (const description of sectionNeed.descriptions.slice(0, 2)) {
        try {
          const images = await stockImageTool({
            description,
            limit: 1,
            orientation: 'horizontal'
          });

          if (images.length > 0) {
            mediaAssets.images.push(images[0].downloadUrl);
            mediaAdded.push(`${section.type} section image`);
          }
        } catch (error) {
          console.warn(`Failed to fetch image for ${section.type}:`, error.message);
        }
      }
    }

    return { mediaAssets, mediaAdded };
  }

  private async addBrandingMedia(enrichedBrief: any) {
    const industry = enrichedBrief.marketContext.industry;
    const style = enrichedBrief.copyStrategy.tone;
    
    const brandingImages = [];
    const mediaAdded = [];

    // Add decorative background elements
    try {
      const decorative = await stockImageTool({
        description: `${style} ${industry} abstract background pattern decoration`,
        limit: 2,
        orientation: 'horizontal'
      });

      brandingImages.push(...decorative.map(img => img.downloadUrl));
      mediaAdded.push('decorative background', 'accent pattern');
    } catch (error) {
      console.warn('Failed to fetch branding images:', error.message);
    }

    return {
      images: brandingImages,
      mediaAdded
    };
  }

  private calculateMediaQuality(sections: any[], globalAssets: any): number {
    let score = 7.0; // Base score
    
    // Bonus for hero section with images
    const heroSection = sections.find(s => s.type === 'hero');
    if (heroSection?.mediaAssets?.images?.length > 0) score += 0.5;
    
    // Bonus for benefits with icons
    const benefitsSection = sections.find(s => s.type === 'benefícios' || s.type === 'benefits');
    if (benefitsSection?.mediaAssets?.icons?.length >= 3) score += 0.5;
    
    // Bonus for testimonials with avatars
    const socialSection = sections.find(s => s.type === 'prova-social' || s.type === 'reviews');
    if (socialSection?.mediaAssets?.images?.length >= 3) score += 0.5;
    
    // Bonus for comprehensive media coverage
    const sectionsWithMedia = sections.filter(s => 
      s.mediaAssets && (s.mediaAssets.images.length > 0 || s.mediaAssets.icons.length > 0)
    );
    
    const mediaCoverage = sectionsWithMedia.length / sections.length;
    score += mediaCoverage * 1.0;
    
    // Bonus for global asset diversity
    const assetTypes = Object.values(globalAssets).filter(assets => assets.length > 0).length;
    score += (assetTypes / 5) * 0.5;
    
    return Math.min(score, 10);
  }

  private generateFallbackMedia(content: any, enrichedBrief: any): MediaResult {
    const sectionsWithPlaceholderMedia = content.sections.map(section => ({
      ...section,
      mediaAssets: {
        images: section.type === 'hero' ? ['/api/placeholder/hero.jpg'] : [],
        videos: [],
        icons: section.type === 'benefícios' || section.type === 'benefits' ? ['/api/placeholder/icon.svg'] : []
      }
    }));

    return {
      enrichedContent: {
        ...content,
        sections: sectionsWithPlaceholderMedia,
        globalMediaAssets: {
          heroImages: ['/api/placeholder/hero.jpg'],
          productImages: [],
          testimonialAvatars: [],
          decorativeImages: [],
          iconSet: []
        }
      },
      cost: 0.001,
      mediaAdded: ['placeholder media'],
      mediaQualityScore: 6.0
    };
  }
}