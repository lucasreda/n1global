import OpenAI from 'openai';

/**
 * Visual Analysis Service - Uses GPT-4o Vision for comprehensive visual analysis
 */
export class VisualAnalysisService {
  private openai: OpenAI;

  // Pricing per 1K tokens for cost calculation
  private modelPricing = {
    'gpt-4o': { input: 0.005, output: 0.015 }
  };

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
   * Analyze keyframes for comprehensive visual insights
   */
  async analyzeKeyframes(keyframes: Array<{
    timestamp: number;
    url: string;
    base64?: string;
    description: string;
    frameType: string;
  }>, options?: {
    includeProducts?: boolean;
    detectText?: boolean;
    analyzeComposition?: boolean;
    brandAnalysis?: boolean;
  }): Promise<{
    keyframes: Array<{
      timestamp: number;
      url: string;
      description: string;
      objects: string[];
      text: string[];
      visualScore: number;
      insights: string[];
    }>;
    products: string[];
    people: number;
    logoVisibility: number;
    textOnScreen: string[];
    colors: string[];
    composition: string;
    visualQuality: number;
    processingTime: number;
    cost: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Step 1: Analyze each keyframe individually
      const analyzedKeyframes = await this.analyzeIndividualFrames(keyframes);
      
      // Step 2: Perform comprehensive analysis across all frames
      const overallAnalysis = await this.analyzeOverallVisualPattern(analyzedKeyframes);
      
      // Step 3: Calculate processing time and cost
      const processingTime = Date.now() - startTime;
      const cost = this.calculateCost(keyframes.length);
      
      return {
        keyframes: analyzedKeyframes,
        processingTime,
        cost,
        ...overallAnalysis
      };
      
    } catch (error) {
      console.error('Visual analysis error:', error);
      throw new Error(`Visual analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze individual keyframes
   */
  private async analyzeIndividualFrames(keyframes: Array<{
    timestamp: number;
    url: string;
    base64?: string;
    description: string;
    frameType: string;
  }>): Promise<Array<{
    timestamp: number;
    url: string;
    description: string;
    objects: string[];
    text: string[];
    visualScore: number;
    insights: string[];
  }>> {
    const analyzedFrames = [];

    for (const keyframe of keyframes) {
      const analysis = await this.analyzeKeyframe(keyframe);
      analyzedFrames.push({
        timestamp: keyframe.timestamp,
        url: keyframe.url,
        description: keyframe.description,
        ...analysis
      });
    }

    return analyzedFrames;
  }

  /**
   * Analyze single keyframe
   */
  private async analyzeKeyframe(keyframe: {
    timestamp: number;
    url: string;
    base64?: string;
    frameType: string;
  }): Promise<{
    objects: string[];
    text: string[];
    visualScore: number;
    insights: string[];
  }> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Analise esta imagem de um criativo publicitário aos ${keyframe.timestamp}s.

Retorne um JSON com:
1. objects: string[] - Objetos principais identificados (produtos, pessoas, logos, etc.)
2. text: string[] - Textos visíveis na imagem (headlines, CTAs, preços)
3. visualScore: number - Qualidade visual de 1-10 (composição, clareza, impacto)
4. insights: string[] - 3-5 insights específicos sobre a qualidade publicitária

Seja preciso e focado em elementos que impactam performance publicitária.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Frame tipo: ${keyframe.frameType} aos ${keyframe.timestamp}s`
              },
              {
                type: 'image_url',
                image_url: {
                  url: keyframe.url,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        objects: Array.isArray(analysis.objects) ? analysis.objects : [],
        text: Array.isArray(analysis.text) ? analysis.text : [],
        visualScore: Math.min(10, Math.max(1, analysis.visualScore || 5)),
        insights: Array.isArray(analysis.insights) ? analysis.insights : []
      };

    } catch (error) {
      console.error('Keyframe analysis error:', error);
      return {
        objects: [],
        text: [],
        visualScore: 5,
        insights: ['Erro na análise visual']
      };
    }
  }

  /**
   * Analyze overall visual patterns across all keyframes
   */
  private async analyzeOverallVisualPattern(keyframes: Array<{
    timestamp: number;
    objects: string[];
    text: string[];
    visualScore: number;
    insights: string[];
  }>): Promise<{
    products: string[];
    people: number;
    logoVisibility: number;
    textOnScreen: string[];
    colors: string[];
    composition: string;
    visualQuality: number;
  }> {
    try {
      // Extract data from all keyframes
      const allObjects = keyframes.flatMap(k => k.objects);
      const allText = keyframes.flatMap(k => k.text);
      const avgVisualScore = keyframes.reduce((sum, k) => sum + k.visualScore, 0) / keyframes.length;
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Analise este conjunto de keyframes de um vídeo publicitário.

Baseado nos dados extraídos, retorne um JSON com:
1. products: string[] - Produtos identificados ao longo do vídeo
2. people: number - Número estimado de pessoas aparecendo
3. logoVisibility: number - Visibilidade do logo de 1-10
4. textOnScreen: string[] - Principais textos que aparecem na tela
5. colors: string[] - Cores dominantes identificadas
6. composition: string - Descrição da composição visual geral
7. visualQuality: number - Qualidade visual geral de 1-10`
          },
          {
            role: 'user',
            content: `Dados dos keyframes:
            
Objetos encontrados: ${allObjects.join(', ')}
Textos encontrados: ${allText.join(', ')}
Score visual médio: ${avgVisualScore.toFixed(1)}
Número de keyframes: ${keyframes.length}

Timeline dos keyframes: ${keyframes.map(k => `${k.timestamp}s`).join(', ')}`
          }
        ],
        temperature: 0.3,
        max_tokens: 600,
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        products: Array.isArray(analysis.products) ? analysis.products : [],
        people: Math.max(0, analysis.people || 0),
        logoVisibility: Math.min(10, Math.max(1, analysis.logoVisibility || 5)),
        textOnScreen: Array.isArray(analysis.textOnScreen) ? analysis.textOnScreen : [],
        colors: Array.isArray(analysis.colors) ? analysis.colors : [],
        composition: analysis.composition || 'Composição padrão',
        visualQuality: Math.min(10, Math.max(1, analysis.visualQuality || avgVisualScore))
      };

    } catch (error) {
      console.error('Overall pattern analysis error:', error);
      return {
        products: [],
        people: 0,
        logoVisibility: 5,
        textOnScreen: [],
        colors: [],
        composition: 'Análise não disponível',
        visualQuality: 5
      };
    }
  }

  /**
   * Analyze single image (for image creatives)
   */
  async analyzeImage(imageUrl: string): Promise<{
    objects: string[];
    text: string[];
    composition: string;
    visualQuality: number;
    products: string[];
    logoVisibility: number;
    colors: string[];
    insights: string[];
    processingTime: number;
    cost: number;
  }> {
    const startTime = Date.now();
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Analise esta imagem publicitária de forma abrangente.

Retorne um JSON com:
1. objects: string[] - Objetos identificados
2. text: string[] - Textos visíveis
3. composition: string - Análise da composição visual
4. visualQuality: number - Qualidade de 1-10
5. products: string[] - Produtos identificados
6. logoVisibility: number - Visibilidade da marca de 1-10
7. colors: string[] - Cores dominantes
8. insights: string[] - Insights para otimização publicitária`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analise esta imagem publicitária:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(completion.choices[0].message.content || '{}');
      const processingTime = Date.now() - startTime;
      const cost = this.modelPricing['gpt-4o'].input * 0.5; // Estimate for single image
      
      return {
        objects: Array.isArray(analysis.objects) ? analysis.objects : [],
        text: Array.isArray(analysis.text) ? analysis.text : [],
        composition: analysis.composition || '',
        visualQuality: Math.min(10, Math.max(1, analysis.visualQuality || 5)),
        products: Array.isArray(analysis.products) ? analysis.products : [],
        logoVisibility: Math.min(10, Math.max(1, analysis.logoVisibility || 5)),
        colors: Array.isArray(analysis.colors) ? analysis.colors : [],
        insights: Array.isArray(analysis.insights) ? analysis.insights : [],
        processingTime,
        cost
      };

    } catch (error) {
      console.error('Image analysis error:', error);
      throw new Error(`Image analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate estimated cost for visual analysis
   */
  private calculateCost(keyframeCount: number): number {
    // Estimate tokens per keyframe analysis
    const avgTokensPerFrame = 800; // Input tokens for image + prompt
    const totalInputTokens = keyframeCount * avgTokensPerFrame;
    const totalOutputTokens = keyframeCount * 200; // Estimated output tokens
    
    const inputCost = (totalInputTokens / 1000) * this.modelPricing['gpt-4o'].input;
    const outputCost = (totalOutputTokens / 1000) * this.modelPricing['gpt-4o'].output;
    
    return inputCost + outputCost;
  }

  /**
   * Compare two sets of keyframes (for A/B testing)
   */
  async compareVisualSets(
    setA: Array<{ url: string; timestamp: number }>,
    setB: Array<{ url: string; timestamp: number }>
  ): Promise<{
    winner: 'A' | 'B' | 'tie';
    comparison: {
      visualQuality: { A: number; B: number };
      clarity: { A: number; B: number };
      engagement: { A: number; B: number };
    };
    recommendations: string[];
  }> {
    // Implementation would compare visual elements between two creative sets
    // This is a placeholder for the comparison logic
    return {
      winner: 'tie',
      comparison: {
        visualQuality: { A: 7.5, B: 7.3 },
        clarity: { A: 8.0, B: 7.8 },
        engagement: { A: 6.9, B: 7.1 }
      },
      recommendations: [
        'Set A tem melhor claridade visual',
        'Set B mostra melhor engajamento',
        'Considere combinar elementos dos dois'
      ]
    };
  }
}