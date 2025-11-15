export interface Template {
  id: string;
  name: string;
  industry: string;
  category: string;
  framework: 'PAS' | 'AIDA' | 'VSL' | 'BAB';
  targetAudience: string;
  priceRange: 'budget' | 'mid-range' | 'premium' | 'luxury';
  sections: Array<{
    type: string;
    required: boolean;
    defaultConfig: any;
  }>;
  style: {
    theme: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
  description: string;
  conversionFocus: string[];
  sampleResults: {
    conversionRate: string;
    industry: string;
  };
}

export interface TemplateMatch {
  id: string;
  name: string;
  conversionFramework: string;
  matchScore: number;
  sectionsConfig: any;
  template: Template;
}

export class TemplateLibrary {
  private templates: Template[] = [
    // 1. E-commerce/Produtos Físicos
    {
      id: 'ecommerce-fashion',
      name: 'Fashion & Lifestyle',
      industry: 'fashion',
      category: 'e-commerce',
      framework: 'AIDA',
      targetAudience: 'Mulheres 25-45, interessadas em moda',
      priceRange: 'mid-range',
      sections: [
        { type: 'hero', required: true, defaultConfig: { variant: 'fashion-hero', showImage: true } },
        { type: 'problema', required: true, defaultConfig: { style: 'lifestyle-problem' } },
        { type: 'solução', required: true, defaultConfig: { style: 'elegant-solution' } },
        { type: 'benefícios', required: true, defaultConfig: { layout: 'grid', columns: 3 } },
        { type: 'prova-social', required: true, defaultConfig: { layout: 'testimonials-grid' } },
        { type: 'objeções', required: false, defaultConfig: { style: 'faq-elegant' } },
        { type: 'cta', required: true, defaultConfig: { style: 'fashion-cta', urgency: 'medium' } }
      ],
      style: {
        theme: 'elegant',
        primaryColor: '#E91E63',
        secondaryColor: '#AD1457',
        fontFamily: 'Playfair Display'
      },
      description: 'Template otimizado para produtos de moda e lifestyle com foco em aspecto visual e elegância',
      conversionFocus: ['visual appeal', 'lifestyle aspiration', 'social proof'],
      sampleResults: {
        conversionRate: '4.2%',
        industry: 'fashion e-commerce'
      }
    },

    // 2. SaaS/Software
    {
      id: 'saas-business',
      name: 'SaaS Business Tools',
      industry: 'software',
      category: 'saas',
      framework: 'PAS',
      targetAudience: 'Empresários e gestores 30-50',
      priceRange: 'premium',
      sections: [
        { type: 'hero', required: true, defaultConfig: { variant: 'business-hero', showDemo: true } },
        { type: 'problema', required: true, defaultConfig: { style: 'business-pain' } },
        { type: 'solução', required: true, defaultConfig: { style: 'tech-solution', showFeatures: true } },
        { type: 'benefícios', required: true, defaultConfig: { layout: 'features-grid', icons: true } },
        { type: 'prova-social', required: true, defaultConfig: { layout: 'business-testimonials' } },
        { type: 'pricing', required: true, defaultConfig: { style: 'saas-pricing', tiers: 3 } },
        { type: 'objeções', required: true, defaultConfig: { style: 'business-faq' } },
        { type: 'cta', required: true, defaultConfig: { style: 'trial-cta', urgency: 'high' } }
      ],
      style: {
        theme: 'professional',
        primaryColor: '#2563EB',
        secondaryColor: '#1D4ED8',
        fontFamily: 'Inter'
      },
      description: 'Template para ferramentas SaaS B2B com foco em ROI e eficiência empresarial',
      conversionFocus: ['ROI demonstration', 'efficiency gains', 'enterprise trust'],
      sampleResults: {
        conversionRate: '3.8%',
        industry: 'B2B SaaS'
      }
    },

    // 3. Saúde/Nutracêuticos
    {
      id: 'health-supplements',
      name: 'Health & Supplements',
      industry: 'health',
      category: 'nutraceuticals',
      framework: 'VSL',
      targetAudience: 'Adultos 35-65 preocupados com saúde',
      priceRange: 'mid-range',
      sections: [
        { type: 'hero', required: true, defaultConfig: { variant: 'health-hero', medical: true } },
        { type: 'problema', required: true, defaultConfig: { style: 'health-urgency' } },
        { type: 'solução', required: true, defaultConfig: { style: 'scientific-solution' } },
        { type: 'benefícios', required: true, defaultConfig: { layout: 'health-benefits', icons: true } },
        { type: 'ingredients', required: true, defaultConfig: { style: 'scientific-breakdown' } },
        { type: 'prova-social', required: true, defaultConfig: { layout: 'health-testimonials' } },
        { type: 'clinical', required: true, defaultConfig: { style: 'studies-section' } },
        { type: 'objeções', required: true, defaultConfig: { style: 'health-faq' } },
        { type: 'guarantee', required: true, defaultConfig: { style: 'money-back' } },
        { type: 'cta', required: true, defaultConfig: { style: 'health-cta', urgency: 'high' } }
      ],
      style: {
        theme: 'medical',
        primaryColor: '#059669',
        secondaryColor: '#047857',
        fontFamily: 'Inter'
      },
      description: 'Template para suplementos e produtos de saúde com foco científico e credibilidade médica',
      conversionFocus: ['scientific credibility', 'health benefits', 'safety assurance'],
      sampleResults: {
        conversionRate: '5.1%',
        industry: 'health supplements'
      }
    },

    // 4. Educação Online
    {
      id: 'education-courses',
      name: 'Online Education & Courses',
      industry: 'education',
      category: 'online-learning',
      framework: 'AIDA',
      targetAudience: 'Profissionais buscando qualificação 25-45',
      priceRange: 'premium',
      sections: [
        { type: 'hero', required: true, defaultConfig: { variant: 'education-hero', video: true } },
        { type: 'problema', required: true, defaultConfig: { style: 'career-problem' } },
        { type: 'solução', required: true, defaultConfig: { style: 'learning-solution' } },
        { type: 'curriculum', required: true, defaultConfig: { style: 'course-modules' } },
        { type: 'instructor', required: true, defaultConfig: { style: 'expert-profile' } },
        { type: 'benefícios', required: true, defaultConfig: { layout: 'learning-outcomes' } },
        { type: 'prova-social', required: true, defaultConfig: { layout: 'student-success' } },
        { type: 'pricing', required: true, defaultConfig: { style: 'course-pricing' } },
        { type: 'bonus', required: true, defaultConfig: { style: 'course-bonus' } },
        { type: 'guarantee', required: true, defaultConfig: { style: 'satisfaction-guarantee' } },
        { type: 'cta', required: true, defaultConfig: { style: 'enroll-cta', urgency: 'medium' } }
      ],
      style: {
        theme: 'academic',
        primaryColor: '#7C3AED',
        secondaryColor: '#6D28D9',
        fontFamily: 'Inter'
      },
      description: 'Template para cursos online com foco em transformação profissional e resultados',
      conversionFocus: ['career advancement', 'skill acquisition', 'expert instruction'],
      sampleResults: {
        conversionRate: '6.3%',
        industry: 'online education'
      }
    },

    // 5. Fitness/Bem-estar
    {
      id: 'fitness-programs',
      name: 'Fitness & Wellness Programs',
      industry: 'fitness',
      category: 'wellness',
      framework: 'BAB',
      targetAudience: 'Adultos ativos 25-50 buscando forma física',
      priceRange: 'mid-range',
      sections: [
        { type: 'hero', required: true, defaultConfig: { variant: 'fitness-hero', transformation: true } },
        { type: 'problema', required: true, defaultConfig: { style: 'fitness-struggle' } },
        { type: 'solução', required: true, defaultConfig: { style: 'workout-solution' } },
        { type: 'program', required: true, defaultConfig: { style: 'workout-breakdown' } },
        { type: 'benefícios', required: true, defaultConfig: { layout: 'fitness-benefits' } },
        { type: 'transformations', required: true, defaultConfig: { style: 'before-after' } },
        { type: 'trainer', required: true, defaultConfig: { style: 'expert-trainer' } },
        { type: 'equipment', required: false, defaultConfig: { style: 'minimal-equipment' } },
        { type: 'guarantee', required: true, defaultConfig: { style: 'results-guarantee' } },
        { type: 'cta', required: true, defaultConfig: { style: 'fitness-cta', urgency: 'high' } }
      ],
      style: {
        theme: 'energetic',
        primaryColor: '#F59E0B',
        secondaryColor: '#D97706',
        fontFamily: 'Inter'
      },
      description: 'Template para programas de fitness com foco em transformação corporal e motivação',
      conversionFocus: ['body transformation', 'fitness motivation', 'proven results'],
      sampleResults: {
        conversionRate: '4.7%',
        industry: 'fitness programs'
      }
    }
  ];

  async selectOptimalTemplate(enrichedBrief: any): Promise<TemplateMatch> {
    console.log('📋 Template selection - finding optimal structure...');
    
    const criteria = {
      industry: enrichedBrief.marketContext?.industry,
      priceRange: enrichedBrief.marketContext?.pricePosition,
      framework: enrichedBrief.conversionFramework,
      targetAudience: enrichedBrief.targetPersona?.demographics
    };

    const bestTemplate = this.findBestTemplate(criteria);
    const matchScore = this.calculateMatchScore(bestTemplate, criteria);

    return {
      id: bestTemplate.id,
      name: bestTemplate.name,
      conversionFramework: bestTemplate.framework,
      matchScore,
      template: bestTemplate,
      sectionsConfig: {
        sections: bestTemplate.sections.map((section, index) => ({
          id: section.type,
          type: section.type,
          required: section.required,
          order: index + 1,
          config: section.defaultConfig
        })),
        conversionFramework: bestTemplate.framework,
        targetPersona: bestTemplate.targetAudience,
        industrySpecific: {
          industry: bestTemplate.industry,
          category: bestTemplate.category,
          conversionFocus: bestTemplate.conversionFocus
        }
      }
    };
  }

  getTemplatesByIndustry(industry: string): Template[] {
    return this.templates.filter(template => template.industry === industry);
  }

  getTemplatesByPriceRange(priceRange: string): Template[] {
    return this.templates.filter(template => template.priceRange === priceRange);
  }

  getTemplatesByFramework(framework: string): Template[] {
    return this.templates.filter(template => template.framework === framework);
  }

  getTemplateById(id: string): Template | undefined {
    return this.templates.find(template => template.id === id);
  }

  getAllTemplates(): Template[] {
    return this.templates;
  }

  findBestTemplate(criteria: {
    industry?: string;
    priceRange?: string;
    framework?: string;
    targetAudience?: string;
  }): Template {
    let candidates = this.templates;

    // Filter by exact matches first
    if (criteria.industry) {
      const exactMatch = candidates.filter(t => t.industry === criteria.industry);
      if (exactMatch.length > 0) candidates = exactMatch;
    }

    if (criteria.priceRange) {
      const priceMatch = candidates.filter(t => t.priceRange === criteria.priceRange);
      if (priceMatch.length > 0) candidates = priceMatch;
    }

    if (criteria.framework) {
      const frameworkMatch = candidates.filter(t => t.framework === criteria.framework);
      if (frameworkMatch.length > 0) candidates = frameworkMatch;
    }

    // Score templates based on multiple criteria
    const scoredTemplates = candidates.map(template => {
      let score = 0;
      
      // Industry match bonus
      if (criteria.industry && template.industry === criteria.industry) score += 10;
      
      // Price range match bonus
      if (criteria.priceRange && template.priceRange === criteria.priceRange) score += 8;
      
      // Framework match bonus
      if (criteria.framework && template.framework === criteria.framework) score += 6;
      
      // Target audience similarity (basic text matching)
      if (criteria.targetAudience && 
          typeof criteria.targetAudience === 'string' &&
          template.targetAudience && 
          typeof template.targetAudience === 'string' &&
          template.targetAudience.toLowerCase().includes(
            criteria.targetAudience.toLowerCase().split(' ')[0]
          )) {
        score += 4;
      }

      return { template, score };
    });

    // Return highest scoring template
    scoredTemplates.sort((a, b) => b.score - a.score);
    return scoredTemplates[0]?.template || this.templates[0];
  }

  private calculateMatchScore(template: Template, criteria: any): number {
    let score = 0.7; // Base score
    
    if (criteria.industry === template.industry) score += 0.15;
    if (criteria.priceRange === template.priceRange) score += 0.1;
    if (criteria.framework === template.framework) score += 0.05;
    
    return Math.min(score, 1.0);
  }

  getTemplateStatistics() {
    const stats = {
      totalTemplates: this.templates.length,
      byIndustry: {},
      byFramework: {},
      byPriceRange: {},
      averageConversionRate: 0
    };

    // Count by industry
    this.templates.forEach(template => {
      stats.byIndustry[template.industry] = (stats.byIndustry[template.industry] || 0) + 1;
      stats.byFramework[template.framework] = (stats.byFramework[template.framework] || 0) + 1;
      stats.byPriceRange[template.priceRange] = (stats.byPriceRange[template.priceRange] || 0) + 1;
    });

    // Calculate average conversion rate
    const conversionRates = this.templates.map(t => parseFloat(t.sampleResults.conversionRate));
    stats.averageConversionRate = conversionRates.reduce((a, b) => a + b, 0) / conversionRates.length;

    return stats;
  }
}