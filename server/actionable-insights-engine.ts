import OpenAI from 'openai';
import { CampaignDataService, type EnhancedCampaignData, type NormalizedPerformanceData } from './campaign-data-service.js';
import { PerformancePredictionService, type PerformancePrediction, type CampaignFeatures } from './performance-prediction-service.js';

interface EditPlan {
  id: string;
  creativeId: string;
  campaignId?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'visual' | 'copy' | 'targeting' | 'budget' | 'technical' | 'strategy';
  
  // Core edit plan structure
  title: string;
  description: string;
  estimatedImpact: {
    metric: 'ctr' | 'cpc' | 'roas' | 'conversionRate' | 'cpm';
    expectedChange: number; // Percentage change (+/- 20)
    confidence: number; // 0-100%
  };
  
  // Actionable steps
  editSteps: EditStep[];
  
  // Implementation details
  implementation: {
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedTimeMinutes: number;
    requiredTools: string[];
    skillLevel: 'beginner' | 'intermediate' | 'advanced';
  };
  
  // Performance prediction if applied
  performancePrediction?: {
    before: Partial<NormalizedPerformanceData>;
    after: Partial<NormalizedPerformanceData>;
    confidence: number;
  };
  
  // Evidence and reasoning
  evidence: {
    dataPoints: string[];
    benchmarkComparison: string;
    reasoning: string;
  };
  
  metadata: {
    generatedAt: Date;
    version: string;
    source: 'ai_analysis' | 'performance_data' | 'benchmark_comparison' | 'hybrid';
  };
}

interface EditStep {
  id: string;
  order: number;
  category: 'video_editing' | 'design' | 'copywriting' | 'technical' | 'strategy';
  action: string;
  details: string;
  visual_reference?: string; // Description or URL of what to aim for
  tools_needed: string[];
  estimated_minutes: number;
}

interface CreativeAnalysisInput {
  creativeId: string;
  campaignId?: string;
  performanceData: Partial<NormalizedPerformanceData>;
  benchmarkData?: any;
  visualAnalysis?: any;
  audioAnalysis?: any;
  copyAnalysis?: any;
  fusionAnalysis?: any;
}

interface InsightGenerationContext {
  objective: string;
  industry: string;
  budget: number;
  targetAudience?: string;
  competitorAnalysis?: any;
  seasonality?: number;
}

export class ActionableInsightsEngine {
  private openai: OpenAI;
  private campaignDataService: CampaignDataService;
  private performancePredictionService?: PerformancePredictionService;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not provided - AI insights will be limited');
    }

    this.openai = new OpenAI({
      apiKey: apiKey || 'sk-dummy', // Allow service to run without API key
    });

    this.campaignDataService = new CampaignDataService();
    
    // Only instantiate PerformancePredictionService if API key is available
    // to avoid constructor errors
    try {
      if (apiKey) {
        this.performancePredictionService = new PerformancePredictionService();
      }
    } catch (error) {
      console.warn('⚠️ Could not initialize PerformancePredictionService:', error);
    }
  }

  /**
   * Generate comprehensive edit plan for a creative based on performance and analysis data
   */
  async generateEditPlan(
    creativeInput: CreativeAnalysisInput,
    context: InsightGenerationContext
  ): Promise<EditPlan[]> {
    console.log(`🔧 Generating edit plan for creative ${creativeInput.creativeId}`);

    try {
      // Step 1: Analyze current performance vs benchmarks
      const performanceAnalysis = await this.analyzePerformanceGaps(
        creativeInput.performanceData,
        creativeInput.benchmarkData,
        context
      );

      // Step 2: Generate AI-powered insights and recommendations
      const aiInsights = await this.generateAIInsights(creativeInput, context, performanceAnalysis);

      // Step 3: Create structured edit plans from insights
      const editPlans = await this.structureEditPlans(
        creativeInput,
        aiInsights,
        performanceAnalysis,
        context
      );

      // Step 4: Prioritize plans by impact and feasibility
      const prioritizedPlans = this.prioritizeEditPlans(editPlans, performanceAnalysis);

      // Step 5: Add performance predictions for top plans
      const plansWithPredictions = await this.addPerformancePredictions(
        prioritizedPlans,
        creativeInput,
        context
      );

      console.log(`✅ Generated ${plansWithPredictions.length} edit plans for creative ${creativeInput.creativeId}`);
      return plansWithPredictions;

    } catch (error) {
      console.error('Edit plan generation error:', error);
      return this.getFallbackEditPlans(creativeInput, context);
    }
  }

  /**
   * Analyze performance gaps against benchmarks
   */
  private async analyzePerformanceGaps(
    performanceData: Partial<NormalizedPerformanceData>,
    benchmarkData: any,
    context: InsightGenerationContext
  ): Promise<{
    gaps: Array<{
      metric: string;
      currentValue: number;
      benchmarkValue: number;
      gapPercentage: number;
      severity: 'critical' | 'high' | 'medium' | 'low';
    }>;
    strongPoints: string[];
    opportunities: string[];
  }> {
    const gaps: Array<{
      metric: string;
      currentValue: number;
      benchmarkValue: number;
      gapPercentage: number;
      severity: 'critical' | 'high' | 'medium' | 'low';
    }> = [];
    const strongPoints: string[] = [];
    const opportunities: string[] = [];

    // Get industry benchmarks if not provided
    const benchmarks = benchmarkData || await this.campaignDataService.getPerformanceBenchmarks(
      context.industry,
      'image', // Default creative type
      context.objective
    );

    if (benchmarks?.median && performanceData) {
      const metrics = [
        { key: 'ctr', name: 'CTR', isHigherBetter: true },
        { key: 'cpc', name: 'CPC', isHigherBetter: false },
        { key: 'cpm', name: 'CPM', isHigherBetter: false },
        { key: 'roas', name: 'ROAS', isHigherBetter: true },
        { key: 'conversionRate', name: 'Conversion Rate', isHigherBetter: true }
      ];

      metrics.forEach(metric => {
        const currentValue = (performanceData as any)[metric.key];
        const benchmarkValue = benchmarks.median[metric.key];

        if (currentValue !== undefined && benchmarkValue) {
          const gapPercentage = metric.isHigherBetter
            ? ((benchmarkValue - currentValue) / benchmarkValue) * 100
            : ((currentValue - benchmarkValue) / benchmarkValue) * 100;

          const severity = Math.abs(gapPercentage) > 30 ? 'critical' :
                          Math.abs(gapPercentage) > 20 ? 'high' :
                          Math.abs(gapPercentage) > 10 ? 'medium' : 'low';

          gaps.push({
            metric: metric.name,
            currentValue,
            benchmarkValue,
            gapPercentage,
            severity
          });

          // Identify opportunities and strong points
          if (gapPercentage > 15 && metric.isHigherBetter) {
            opportunities.push(`${metric.name} está ${gapPercentage.toFixed(1)}% abaixo do benchmark da indústria`);
          } else if (gapPercentage > 15 && !metric.isHigherBetter) {
            opportunities.push(`${metric.name} está ${gapPercentage.toFixed(1)}% acima do benchmark - há oportunidade de otimização`);
          } else if (
            (gapPercentage < -10 && metric.isHigherBetter) || 
            (gapPercentage < -10 && !metric.isHigherBetter)
          ) {
            strongPoints.push(`${metric.name} está performando ${Math.abs(gapPercentage).toFixed(1)}% melhor que o benchmark`);
          }
        }
      });
    }

    return { gaps, strongPoints, opportunities };
  }

  /**
   * Generate AI-powered insights using OpenAI
   */
  private async generateAIInsights(
    creativeInput: CreativeAnalysisInput,
    context: InsightGenerationContext,
    performanceAnalysis: any
  ): Promise<{
    visualImprovements: string[];
    copyImprovements: string[];
    strategicImprovements: string[];
    technicalImprovements: string[];
    prioritizedActions: Array<{ action: string; impact: string; difficulty: string }>;
  }> {
    if (!process.env.OPENAI_API_KEY) {
      return this.getFallbackAIInsights();
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em otimização de criativos publicitários com foco em melhorias ACIONÁVEIS e específicas.

Analise os dados fornecidos e retorne um JSON com recomendações precisas:

{
  "visualImprovements": string[] - 3-5 melhorias específicas para elementos visuais,
  "copyImprovements": string[] - 3-5 melhorias específicas para textos e copy,
  "strategicImprovements": string[] - 3-5 melhorias de estratégia e targeting,
  "technicalImprovements": string[] - 3-5 melhorias técnicas (audio, edição, etc),
  "prioritizedActions": [
    {
      "action": "ação específica e acionável",
      "impact": "alto/medio/baixo",
      "difficulty": "facil/medio/dificil"
    }
  ] - 5-7 ações priorizadas por impacto vs dificuldade
}

FOQUE EM:
1. Ações ESPECÍFICAS (não genéricas como "melhorar copy")
2. Melhorias baseadas nos gaps de performance identificados
3. Recomendações que um editor pode implementar diretamente
4. Priorização clara por impacto vs esforço`
          },
          {
            role: 'user',
            content: `ANÁLISE DE CRIATIVO:

CREATIVE ID: ${creativeInput.creativeId}
OBJETIVO: ${context.objective}
INDÚSTRIA: ${context.industry}
ORÇAMENTO: $${context.budget}

PERFORMANCE ATUAL:
- CTR: ${creativeInput.performanceData.ctr?.toFixed(2) || 'N/A'}%
- CPC: $${creativeInput.performanceData.cpc?.toFixed(2) || 'N/A'}
- ROAS: ${creativeInput.performanceData.roas?.toFixed(1) || 'N/A'}x
- Taxa de Conversão: ${creativeInput.performanceData.conversionRate?.toFixed(2) || 'N/A'}%

GAPS DE PERFORMANCE:
${performanceAnalysis.gaps.map((gap: any) => 
  `- ${gap.metric}: ${gap.gapPercentage > 0 ? 'abaixo' : 'acima'} do benchmark em ${Math.abs(gap.gapPercentage).toFixed(1)}% (${gap.severity})`
).join('\n')}

OPORTUNIDADES IDENTIFICADAS:
${performanceAnalysis.opportunities.join('\n')}

PONTOS FORTES:
${performanceAnalysis.strongPoints.join('\n')}

ANÁLISE DE CRIATIVO:
${creativeInput.visualAnalysis ? `Visual: ${JSON.stringify(creativeInput.visualAnalysis).substring(0, 500)}...` : 'N/A'}
${creativeInput.copyAnalysis ? `Copy: ${JSON.stringify(creativeInput.copyAnalysis).substring(0, 500)}...` : 'N/A'}
${creativeInput.audioAnalysis ? `Áudio: ${JSON.stringify(creativeInput.audioAnalysis).substring(0, 500)}...` : 'N/A'}

Gere recomendações específicas focadas nos gaps mais críticos e com maior potencial de impacto.`
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      });

      const insights = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        visualImprovements: insights.visualImprovements || [],
        copyImprovements: insights.copyImprovements || [],
        strategicImprovements: insights.strategicImprovements || [],
        technicalImprovements: insights.technicalImprovements || [],
        prioritizedActions: insights.prioritizedActions || []
      };

    } catch (error) {
      console.error('AI insights generation error:', error);
      return this.getFallbackAIInsights();
    }
  }

  /**
   * Structure edit plans from AI insights
   */
  private async structureEditPlans(
    creativeInput: CreativeAnalysisInput,
    aiInsights: any,
    performanceAnalysis: any,
    context: InsightGenerationContext
  ): Promise<EditPlan[]> {
    const editPlans: EditPlan[] = [];

    // Convert prioritized actions into structured edit plans
    aiInsights.prioritizedActions.forEach((action: any, index: number) => {
      const category = this.determineEditCategory(action.action);
      const steps = this.generateEditSteps(action.action, category);
      
      const editPlan: EditPlan = {
        id: `edit-${creativeInput.creativeId}-${index + 1}`,
        creativeId: creativeInput.creativeId,
        campaignId: creativeInput.campaignId,
        priority: this.mapImpactToPriority(action.impact),
        category,
        title: this.generateEditTitle(action.action),
        description: action.action,
        estimatedImpact: {
          metric: this.predictPrimaryMetricImpact(action.action, performanceAnalysis),
          expectedChange: this.estimatePercentageImpact(action.impact, category),
          confidence: this.calculateConfidence(action.impact, action.difficulty)
        },
        editSteps: steps,
        implementation: {
          difficulty: action.difficulty === 'facil' ? 'easy' : 
                     action.difficulty === 'medio' ? 'medium' : 'hard',
          estimatedTimeMinutes: this.estimateImplementationTime(action.difficulty, steps.length),
          requiredTools: this.determineRequiredTools(category, steps),
          skillLevel: this.determineSkillLevel(action.difficulty, category)
        },
        evidence: {
          dataPoints: this.extractRelevantDataPoints(performanceAnalysis, action.action),
          benchmarkComparison: this.generateBenchmarkEvidence(performanceAnalysis),
          reasoning: this.generateReasoningEvidence(action.action, performanceAnalysis)
        },
        metadata: {
          generatedAt: new Date(),
          version: '1.0',
          source: 'hybrid'
        }
      };

      editPlans.push(editPlan);
    });

    return editPlans;
  }

  /**
   * Prioritize edit plans by impact and feasibility
   */
  private prioritizeEditPlans(editPlans: EditPlan[], performanceAnalysis: any): EditPlan[] {
    return editPlans.sort((a, b) => {
      // Calculate priority score: impact × confidence ÷ difficulty
      const scoreA = this.calculatePriorityScore(a);
      const scoreB = this.calculatePriorityScore(b);
      
      return scoreB - scoreA; // Descending order
    });
  }

  /**
   * Add performance predictions for edit plans
   */
  private async addPerformancePredictions(
    editPlans: EditPlan[],
    creativeInput: CreativeAnalysisInput,
    context: InsightGenerationContext
  ): Promise<EditPlan[]> {
    // Add predictions for top 3 plans to avoid API limits
    const topPlans = editPlans.slice(0, 3);
    
    for (const plan of topPlans) {
      try {
        const before = creativeInput.performanceData;
        const after = this.simulatePostEditPerformance(before, plan);
        
        plan.performancePrediction = {
          before,
          after,
          confidence: plan.estimatedImpact.confidence
        };
        
      } catch (error) {
        console.error(`Performance prediction error for plan ${plan.id}:`, error);
        // Continue without prediction
      }
    }

    return editPlans;
  }

  // Helper methods for edit plan generation
  private determineEditCategory(action: string): EditPlan['category'] {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('video') || actionLower.includes('edição') || actionLower.includes('visual')) {
      return 'visual';
    } else if (actionLower.includes('texto') || actionLower.includes('copy') || actionLower.includes('título')) {
      return 'copy';
    } else if (actionLower.includes('targeting') || actionLower.includes('audience') || actionLower.includes('segmentação')) {
      return 'targeting';
    } else if (actionLower.includes('orçamento') || actionLower.includes('bid')) {
      return 'budget';
    } else if (actionLower.includes('técnico') || actionLower.includes('áudio') || actionLower.includes('qualidade')) {
      return 'technical';
    } else {
      return 'strategy';
    }
  }

  private generateEditSteps(action: string, category: EditPlan['category']): EditStep[] {
    // Generate contextual edit steps based on action and category
    const baseSteps: EditStep[] = [];
    let stepCounter = 1;

    switch (category) {
      case 'visual':
        baseSteps.push({
          id: `step-${stepCounter++}`,
          order: stepCounter - 1,
          category: 'design',
          action: 'Analisar elementos visuais atuais',
          details: 'Identificar elementos que precisam de melhoria baseado na análise',
          tools_needed: ['análise', 'screenshots'],
          estimated_minutes: 10
        });
        baseSteps.push({
          id: `step-${stepCounter++}`,
          order: stepCounter - 1,
          category: 'design',
          action: 'Implementar melhorias visuais',
          details: action,
          tools_needed: ['editor_de_imagem', 'editor_de_video'],
          estimated_minutes: 30
        });
        break;

      case 'copy':
        baseSteps.push({
          id: `step-${stepCounter++}`,
          order: stepCounter - 1,
          category: 'copywriting',
          action: 'Revisar copy atual',
          details: 'Analisar textos existentes e identificar oportunidades',
          tools_needed: ['editor_de_texto'],
          estimated_minutes: 15
        });
        baseSteps.push({
          id: `step-${stepCounter++}`,
          order: stepCounter - 1,
          category: 'copywriting',
          action: 'Reescrever copy',
          details: action,
          tools_needed: ['editor_de_texto', 'ferramentas_de_copy'],
          estimated_minutes: 25
        });
        break;

      default:
        baseSteps.push({
          id: `step-${stepCounter++}`,
          order: stepCounter - 1,
          category: 'strategy',
          action: 'Implementar melhoria',
          details: action,
          tools_needed: ['plataforma_de_ads'],
          estimated_minutes: 20
        });
    }

    return baseSteps;
  }

  private mapImpactToPriority(impact: string): EditPlan['priority'] {
    switch (impact.toLowerCase()) {
      case 'alto': return 'high';
      case 'medio': return 'medium';
      case 'baixo': return 'low';
      default: return 'medium';
    }
  }

  private predictPrimaryMetricImpact(action: string, performanceAnalysis: any): 'ctr' | 'cpc' | 'roas' | 'conversionRate' | 'cpm' {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('click') || actionLower.includes('ctr')) return 'ctr';
    if (actionLower.includes('conversão') || actionLower.includes('conversion')) return 'conversionRate';
    if (actionLower.includes('roas') || actionLower.includes('retorno')) return 'roas';
    if (actionLower.includes('custo') || actionLower.includes('cpc')) return 'cpc';
    
    // Default to the metric with the largest gap, with safety for empty gaps
    if (performanceAnalysis.gaps && performanceAnalysis.gaps.length > 0) {
      const largestGap = performanceAnalysis.gaps.reduce((max: any, gap: any) => 
        Math.abs(gap.gapPercentage) > Math.abs(max.gapPercentage) ? gap : max,
        performanceAnalysis.gaps[0] // Initial value to prevent reduce error
      );
      
      const metricKey = largestGap.metric.toLowerCase().replace(/\s+/g, '');
      if (['ctr', 'cpc', 'roas', 'conversionrate', 'cpm'].includes(metricKey)) {
        return metricKey === 'conversionrate' ? 'conversionRate' : metricKey as any;
      }
    }
    
    return 'ctr'; // Safe default
  }

  private estimatePercentageImpact(impact: string, category: EditPlan['category']): number {
    const baseImpact = impact === 'alto' ? 25 : impact === 'medio' ? 15 : 8;
    const categoryMultiplier = category === 'visual' ? 1.2 : 
                               category === 'copy' ? 1.1 : 
                               category === 'strategy' ? 1.3 : 1.0;
    
    return Math.round(baseImpact * categoryMultiplier);
  }

  private calculateConfidence(impact: string, difficulty: string): number {
    const impactScore = impact === 'alto' ? 80 : impact === 'medio' ? 65 : 50;
    const difficultyPenalty = difficulty === 'dificil' ? 15 : difficulty === 'medio' ? 8 : 0;
    
    return Math.max(40, Math.min(90, impactScore - difficultyPenalty));
  }

  private calculatePriorityScore(plan: EditPlan): number {
    const impactWeight = plan.estimatedImpact.expectedChange * (plan.estimatedImpact.confidence / 100);
    const difficultyPenalty = plan.implementation.difficulty === 'hard' ? 0.5 : 
                              plan.implementation.difficulty === 'medium' ? 0.8 : 1.0;
    
    return impactWeight * difficultyPenalty;
  }

  private simulatePostEditPerformance(
    before: Partial<NormalizedPerformanceData>,
    plan: EditPlan
  ): Partial<NormalizedPerformanceData> {
    const after = { ...before };
    const targetMetric = plan.estimatedImpact.metric;
    const change = plan.estimatedImpact.expectedChange / 100;
    
    if (after[targetMetric] !== undefined && (after as any)[targetMetric] !== null) {
      const currentValue = (after as any)[targetMetric];
      
      // Handle metrics where lower is better vs higher is better
      const lowerIsBetterMetrics = ['cpc', 'cpm'];
      const isLowerBetter = lowerIsBetterMetrics.includes(targetMetric);
      
      if (isLowerBetter) {
        // For CPC/CPM, a positive improvement means reducing the value
        (after as any)[targetMetric] = currentValue * (1 - change);
      } else {
        // For CTR/ROAS/conversionRate, a positive improvement means increasing the value
        (after as any)[targetMetric] = currentValue * (1 + change);
      }
      
      // Ensure no negative values
      if ((after as any)[targetMetric] < 0) {
        (after as any)[targetMetric] = 0;
      }
    }
    
    return after;
  }

  // Additional helper methods
  private generateEditTitle(action: string): string {
    return action.length > 50 ? action.substring(0, 47) + '...' : action;
  }

  private estimateImplementationTime(difficulty: string, stepCount: number): number {
    const baseTime = difficulty === 'dificil' ? 60 : difficulty === 'medio' ? 40 : 25;
    return baseTime + (stepCount * 10);
  }

  private determineRequiredTools(category: EditPlan['category'], steps: EditStep[]): string[] {
    const allTools = steps.flatMap(step => step.tools_needed);
    return Array.from(new Set(allTools)); // Remove duplicates
  }

  private determineSkillLevel(difficulty: string, category: EditPlan['category']): 'beginner' | 'intermediate' | 'advanced' {
    if (difficulty === 'dificil' || category === 'technical') return 'advanced';
    if (difficulty === 'medio' || category === 'strategy') return 'intermediate';
    return 'beginner';
  }

  private extractRelevantDataPoints(performanceAnalysis: any, action: string): string[] {
    return performanceAnalysis.gaps
      .filter((gap: any) => gap.severity === 'critical' || gap.severity === 'high')
      .map((gap: any) => `${gap.metric}: ${gap.gapPercentage.toFixed(1)}% gap vs benchmark`);
  }

  private generateBenchmarkEvidence(performanceAnalysis: any): string {
    const criticalGaps = performanceAnalysis.gaps.filter((gap: any) => gap.severity === 'critical');
    if (criticalGaps.length > 0) {
      return `${criticalGaps.length} métricas críticas abaixo do benchmark da indústria`;
    }
    return 'Performance dentro da faixa esperada para a indústria';
  }

  private generateReasoningEvidence(action: string, performanceAnalysis: any): string {
    return `Baseado na análise de performance que identificou ${performanceAnalysis.gaps.length} gaps vs benchmarks. ` +
           `Ação específica: ${action}`;
  }

  private getFallbackAIInsights() {
    return {
      visualImprovements: [
        'Melhorar contraste e legibilidade dos textos',
        'Adicionar elementos visuais mais chamativos',
        'Otimizar composição para mobile'
      ],
      copyImprovements: [
        'Tornar call-to-action mais direto e urgente',
        'Adicionar benefícios específicos do produto',
        'Simplificar linguagem para maior clareza'
      ],
      strategicImprovements: [
        'Testar diferentes segmentações de audiência',
        'Ajustar orçamento para horários de maior conversão',
        'Implementar remarketing para usuários engajados'
      ],
      technicalImprovements: [
        'Otimizar qualidade de áudio',
        'Melhorar tempo de carregamento',
        'Corrigir problemas de reprodução'
      ],
      prioritizedActions: [
        { action: 'Melhorar call-to-action para ser mais direto', impact: 'alto', difficulty: 'facil' },
        { action: 'Otimizar elementos visuais para mobile', impact: 'medio', difficulty: 'medio' }
      ]
    };
  }

  private getFallbackEditPlans(
    creativeInput: CreativeAnalysisInput,
    context: InsightGenerationContext
  ): EditPlan[] {
    return [{
      id: `fallback-${creativeInput.creativeId}`,
      creativeId: creativeInput.creativeId,
      campaignId: creativeInput.campaignId,
      priority: 'medium',
      category: 'copy',
      title: 'Otimizar call-to-action',
      description: 'Melhorar call-to-action para aumentar taxa de cliques',
      estimatedImpact: {
        metric: 'ctr',
        expectedChange: 15,
        confidence: 60
      },
      editSteps: [{
        id: 'step-1',
        order: 1,
        category: 'copywriting',
        action: 'Reescrever CTA',
        details: 'Tornar call-to-action mais direto e urgente',
        tools_needed: ['editor_de_texto'],
        estimated_minutes: 15
      }],
      implementation: {
        difficulty: 'easy',
        estimatedTimeMinutes: 20,
        requiredTools: ['editor_de_texto'],
        skillLevel: 'beginner'
      },
      evidence: {
        dataPoints: ['CTR abaixo da média da indústria'],
        benchmarkComparison: 'Performance requer otimização',
        reasoning: 'Call-to-action é um dos fatores mais impactantes para CTR'
      },
      metadata: {
        generatedAt: new Date(),
        version: '1.0',
        source: 'ai_analysis'
      }
    }];
  }

  /**
   * Transform internal EditPlan[] to frontend-compatible format
   */
  transformToFrontendFormat(editPlans: EditPlan[], analysisData?: any, performanceData?: any): any {
    // Group edit plans by category and transform to frontend format
    const transformedPlans = editPlans.map(plan => ({
      category: plan.category,
      priority: plan.priority === 'critical' ? 'high' : plan.priority, // Convert 'critical' to 'high' for frontend
      changes: plan.editSteps.map(step => ({
        type: step.category,
        description: step.action,
        rationale: step.details,
        difficulty: plan.implementation.difficulty,
        estimated_impact: Math.round(plan.estimatedImpact.expectedChange)
      }))
    }));

    // Group by category to avoid duplicates
    const groupedPlans = transformedPlans.reduce((acc, plan) => {
      const existing = acc.find(p => p.category === plan.category);
      if (existing) {
        existing.changes.push(...plan.changes);
      } else {
        acc.push(plan);
      }
      return acc;
    }, [] as any[]);

    return {
      editPlans: groupedPlans,
      benchmarksUsed: editPlans.some(plan => plan.evidence.benchmarkComparison !== 'Performance requer otimização'),
      analysisData: analysisData || {
        confidence: editPlans.length > 0 ? Math.round(editPlans.reduce((sum, plan) => sum + plan.estimatedImpact.confidence, 0) / editPlans.length) : 50,
        plansGenerated: editPlans.length,
        sources: Array.from(new Set(editPlans.map(plan => plan.metadata.source)))
      },
      performanceData: performanceData || {
        baseline: 'industry_average',
        potential_improvement: editPlans.length > 0 ? Math.max(...editPlans.map(plan => plan.estimatedImpact.expectedChange)) : 0
      }
    };
  }
}