import OpenAI from 'openai';

export interface QAResult {
  overallScore: number;
  detailedReview: {
    contentQuality: {
      score: number;
      issues: string[];
      suggestions: string[];
    };
    conversionOptimization: {
      score: number;
      issues: string[];
      suggestions: string[];
    };
    technicalImplementation: {
      score: number;
      issues: string[];
      suggestions: string[];
    };
    userExperience: {
      score: number;
      issues: string[];
      suggestions: string[];
    };
  };
  criticalIssues: string[];
  autoFixSuggestions: string[];
  reviewStatus: 'approved' | 'needs_review' | 'requires_fixes';
  cost: number;
}

export interface QAInput {
  generatedContent: any;
  enrichedBrief: any;
  templateUsed: any;
  layoutOptimizations: any;
  mediaAssets: any;
}

export class QAReviewService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async assessQuality(content: any, enrichedBrief: any, template: any): Promise<QAResult> {
    console.log('✅ Quality assurance - reviewing generated page...');
    
    const input: QAInput = {
      generatedContent: content,
      enrichedBrief: enrichedBrief,
      templateUsed: template,
      layoutOptimizations: content.layoutOptimizations || {},
      mediaAssets: content.mediaAssets || {}
    };

    return this.performQualityReview(input);
  }

  async performQualityReview(input: QAInput): Promise<QAResult> {
    console.log('🔍 Quality review - comprehensive analysis starting...');
    
    try {
      let totalCost = 0;
      
      // Step 1: Content Quality Review
      const contentReview = await this.reviewContentQuality(input);
      totalCost += contentReview.cost;

      // Step 2: Conversion Optimization Review
      const conversionReview = await this.reviewConversionOptimization(input);
      totalCost += conversionReview.cost;

      // Step 3: Technical Implementation Review
      const technicalReview = this.reviewTechnicalImplementation(input);

      // Step 4: User Experience Review
      const uxReview = this.reviewUserExperience(input);

      // Step 5: Compile Overall Assessment
      const overallScore = this.calculateOverallScore([
        contentReview.score,
        conversionReview.score,
        technicalReview.score,
        uxReview.score
      ]);

      const criticalIssues = this.identifyCriticalIssues([
        ...contentReview.issues,
        ...conversionReview.issues,
        ...technicalReview.issues,
        ...uxReview.issues
      ]);

      const autoFixSuggestions = this.generateAutoFixSuggestions(
        contentReview,
        conversionReview,
        technicalReview,
        uxReview
      );

      const reviewStatus = this.determineReviewStatus(overallScore, criticalIssues);

      const result: QAResult = {
        overallScore,
        detailedReview: {
          contentQuality: contentReview,
          conversionOptimization: conversionReview,
          technicalImplementation: technicalReview,
          userExperience: uxReview
        },
        criticalIssues,
        autoFixSuggestions,
        reviewStatus,
        cost: totalCost
      };

      console.log(`✅ Quality review complete - Score: ${overallScore}/10, Status: ${reviewStatus}, Cost: $${totalCost.toFixed(4)}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Quality review failed:', error);
      
      return this.generateFallbackReview(input);
    }
  }

  private async reviewContentQuality(input: QAInput) {
    const prompt = `
Analise a qualidade do conteúdo gerado para esta página de conversão:

PRODUTO: ${input.enrichedBrief.originalBrief.productInfo.name}
FRAMEWORK: ${input.enrichedBrief.conversionFramework}
INDÚSTRIA: ${input.enrichedBrief.marketContext.industry}

CONTEÚDO GERADO:
${JSON.stringify(input.generatedContent.sections?.slice(0, 3) || [], null, 2)}

Analise os seguintes aspectos:
1. Clareza e persuasão do copy
2. Alinhamento com o público-alvo
3. Uso correto do framework de conversão
4. Gramática e ortografia
5. Consistência de tom e voz

Retorne JSON:
{
  "score": 8.5,
  "issues": [
    "Hero headline pode ser mais impactante",
    "Benefícios precisam ser mais específicos"
  ],
  "suggestions": [
    "Reescrever headline com número específico",
    "Adicionar resultados mensuráveis aos benefícios"
  ]
}
    `;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Você é um especialista em copywriting e qualidade de conteúdo para páginas de conversão. Seja crítico mas construtivo na sua análise. Retorne sua resposta no formato JSON."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const review = JSON.parse(completion.choices[0].message.content || '{}');
    
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const cost = (inputTokens * 0.005 + outputTokens * 0.015) / 1000;

    return {
      score: review.score || 7.0,
      issues: review.issues || [],
      suggestions: review.suggestions || [],
      cost
    };
  }

  private async reviewConversionOptimization(input: QAInput) {
    const prompt = `
Analise a otimização para conversão desta página:

OBJETIVO: ${input.enrichedBrief.originalBrief.conversionGoal}
FRAMEWORK: ${input.enrichedBrief.conversionFramework}
PÚBLICO: ${input.enrichedBrief.targetPersona.demographics}

SEÇÕES DA PÁGINA:
${input.generatedContent.sections?.map(s => s.type).join(', ') || 'Não especificado'}

Analise:
1. Sequência lógica das seções
2. Presença de elementos de urgência/escassez
3. Clareza da proposta de valor
4. Força dos CTAs
5. Tratamento de objeções

Retorne JSON:
{
  "score": 7.8,
  "issues": [
    "Falta elemento de urgência no CTA principal",
    "Objeções não são tratadas adequadamente"
  ],
  "suggestions": [
    "Adicionar countdown timer ao CTA",
    "Expandir seção de FAQ com objeções comuns"
  ]
}
    `;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Você é especialista em CRO (Conversion Rate Optimization) e psicologia de vendas. Analise criticamente os elementos de conversão. Retorne sua resposta no formato JSON."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const review = JSON.parse(completion.choices[0].message.content || '{}');
    
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const cost = (inputTokens * 0.005 + outputTokens * 0.015) / 1000;

    return {
      score: review.score || 7.0,
      issues: review.issues || [],
      suggestions: review.suggestions || [],
      cost
    };
  }

  private reviewTechnicalImplementation(input: QAInput) {
    const issues = [];
    const suggestions = [];
    let score = 9.0;

    // Check sections structure
    const sections = input.generatedContent.sections || [];
    const requiredSections = ['hero', 'cta'];
    const presentSections = sections.map(s => s.type);
    const missingSections = requiredSections.filter(section => !presentSections.includes(section));
    
    if (missingSections.length > 0) {
      issues.push(`Missing critical sections: ${missingSections.join(', ')}`);
      suggestions.push('Add missing essential sections');
      score -= 1.0;
    }

    // Check SEO
    if (!input.generatedContent.seo?.title || input.generatedContent.seo.title.length < 30) {
      issues.push('SEO title is too short or missing');
      suggestions.push('Optimize SEO title length (50-60 chars)');
      score -= 0.2;
    }

    // Check layout optimization
    if (input.layoutOptimizations?.mobileScore && input.layoutOptimizations.mobileScore < 8) {
      issues.push('Mobile optimization score is below 8/10');
      suggestions.push('Improve mobile responsive design');
      score -= 0.5;
    }

    return {
      score: Math.max(score, 0),
      issues,
      suggestions
    };
  }

  private reviewUserExperience(input: QAInput) {
    const issues = [];
    const suggestions = [];
    let score = 8.0;

    // Check user flow
    const sectionCount = input.generatedContent.sections?.length || 0;
    if (sectionCount < 4) {
      issues.push('Page may be too short for effective conversion');
      suggestions.push('Add more sections to build stronger case');
      score -= 0.3;
    } else if (sectionCount > 12) {
      issues.push('Page may be too long, could cause fatigue');
      suggestions.push('Consider reducing sections or splitting into multiple pages');
      score -= 0.3;
    }

    // Check CTA placement
    const ctaSections = input.generatedContent.sections?.filter(s => s.type === 'cta') || [];
    if (ctaSections.length === 0) {
      issues.push('No call-to-action sections found');
      suggestions.push('Add clear CTA sections');
      score -= 2.0;
    } else if (ctaSections.length === 1) {
      suggestions.push('Consider adding multiple CTAs throughout the page');
    }

    // Check visual hierarchy
    const hasHero = input.generatedContent.sections?.some(s => s.type === 'hero') || false;
    if (!hasHero) {
      issues.push('Missing hero section for strong first impression');
      suggestions.push('Add compelling hero section at the top');
      score -= 1.0;
    }

    return {
      score: Math.max(score, 0),
      issues,
      suggestions
    };
  }

  private calculateOverallScore(scores: number[]): number {
    const weights = [0.3, 0.35, 0.2, 0.15]; // Content, Conversion, Technical, UX
    const weightedSum = scores.reduce((sum, score, index) => sum + (score * weights[index]), 0);
    return Math.round(weightedSum * 10) / 10;
  }

  private identifyCriticalIssues(allIssues: string[]): string[] {
    const criticalKeywords = ['missing', 'no call-to-action', 'too short', 'critical sections'];
    
    return allIssues.filter(issue => 
      criticalKeywords.some(keyword => 
        issue.toLowerCase().includes(keyword.toLowerCase())
      )
    );
  }

  private generateAutoFixSuggestions(
    contentReview: any,
    conversionReview: any,
    technicalReview: any,
    uxReview: any
  ): string[] {
    const suggestions = [];

    // High-impact fixes first
    if (contentReview.score < 7) {
      suggestions.push('Regenerate content with more specific prompts');
    }

    if (conversionReview.score < 7) {
      suggestions.push('Add urgency elements and social proof');
    }

    if (technicalReview.score < 8) {
      suggestions.push('Re-run layout optimization with stricter parameters');
    }

    if (uxReview.score < 7) {
      suggestions.push('Restructure sections for better user flow');
    }

    // Specific auto-fixes
    suggestions.push('Run spell-check and grammar optimization');
    suggestions.push('Optimize all images for web performance');
    suggestions.push('Ensure mobile responsiveness across all sections');

    return suggestions.slice(0, 5); // Top 5 suggestions
  }

  private determineReviewStatus(overallScore: number, criticalIssues: string[]): 'approved' | 'needs_review' | 'requires_fixes' {
    if (criticalIssues.length > 0) {
      return 'requires_fixes';
    }
    
    if (overallScore >= 8.5) {
      return 'approved';
    } else if (overallScore >= 7.0) {
      return 'needs_review';
    } else {
      return 'requires_fixes';
    }
  }

  private generateFallbackReview(input: QAInput): QAResult {
    return {
      overallScore: 7.0,
      detailedReview: {
        contentQuality: {
          score: 7.0,
          issues: ['Review system temporarily unavailable'],
          suggestions: ['Manual review recommended']
        },
        conversionOptimization: {
          score: 7.0,
          issues: ['Unable to analyze conversion elements'],
          suggestions: ['Check CTAs and urgency elements manually']
        },
        technicalImplementation: {
          score: 7.0,
          issues: ['Technical review incomplete'],
          suggestions: ['Verify mobile optimization manually']
        },
        userExperience: {
          score: 7.0,
          issues: ['UX analysis unavailable'],
          suggestions: ['Test user flow manually']
        }
      },
      criticalIssues: [],
      autoFixSuggestions: ['Run manual quality check', 'Verify all sections are present'],
      reviewStatus: 'needs_review',
      cost: 0.001
    };
  }
}