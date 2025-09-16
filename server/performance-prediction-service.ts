import OpenAI from 'openai';
import { CampaignDataService, type EnhancedCampaignData, type NormalizedPerformanceData } from './campaign-data-service.js';

interface PerformancePrediction {
  predictedMetrics: {
    ctr: number;
    cpc: number;
    cpm: number;
    roas: number;
    conversionRate: number;
    confidence: number; // 0-100%
  };
  predictionFactors: {
    historical: {
      campaignSimilarity: number;
      industryBenchmark: number;
      seasonality: number;
    };
    creative: {
      visualQuality: number;
      copyEffectiveness: number;
      brandAlignment: number;
    };
    targeting: {
      audienceRelevance: number;
      competitiveEnvironment: number;
      marketSaturation: number;
    };
  };
  insights: {
    strengths: string[];
    risks: string[];
    recommendations: string[];
    expectedPerformanceRange: {
      optimistic: Partial<NormalizedPerformanceData>;
      realistic: Partial<NormalizedPerformanceData>;
      pessimistic: Partial<NormalizedPerformanceData>;
    };
  };
  mlAnalysis: {
    algorithm: string;
    dataPoints: number;
    accuracy: number;
    features: string[];
  };
}

interface CampaignFeatures {
  // Campaign characteristics
  objective: string;
  dailyBudget: number;
  lifetimeBudget: number;
  duration: number; // days
  
  // Historical performance context
  accountPerformanceHistory: {
    avgCtr: number;
    avgCpc: number;
    avgRoas: number;
    campaignCount: number;
  };
  
  // Industry and competitive context
  industry: string;
  seasonality: number; // 0-10 seasonal impact
  competitiveIndex: number; // 0-10 competition level
  
  // Creative factors (when available)
  hasVideo: boolean;
  hasCarousel: boolean;
  creativeCount: number;
  estimatedQuality: number; // 0-10
}

export class PerformancePredictionService {
  private openai: OpenAI;
  private campaignDataService: CampaignDataService;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });

    this.campaignDataService = new CampaignDataService();
  }

  /**
   * Predict performance for a new campaign based on historical data and features
   */
  async predictCampaignPerformance(
    campaignFeatures: CampaignFeatures,
    historicalCampaigns: EnhancedCampaignData[],
    industryBenchmarks?: any
  ): Promise<PerformancePrediction> {
    console.log(`🤖 Starting ML performance prediction for ${campaignFeatures.objective} campaign`);

    try {
      // Step 1: Prepare ML features and historical data
      const { features, trainingData } = this.prepareMLFeatures(campaignFeatures, historicalCampaigns);
      
      // Step 2: Run simple ML algorithms for numeric predictions
      const mlPredictions = this.runMLPrediction(features, trainingData);
      
      // Step 3: Get industry benchmarks for context
      const benchmarks = industryBenchmarks || await this.campaignDataService.getPerformanceBenchmarks(
        campaignFeatures.industry,
        'image', // default
        campaignFeatures.objective
      );
      
      // Step 4: Generate AI insights and qualitative analysis
      const aiInsights = await this.generateAIInsights(campaignFeatures, mlPredictions, benchmarks, historicalCampaigns);
      
      // Step 5: Combine predictions with confidence scoring
      const finalPrediction = this.combinePredictions(mlPredictions, aiInsights, benchmarks);
      
      console.log(`✅ Performance prediction completed - confidence: ${finalPrediction.predictedMetrics.confidence}%`);
      return finalPrediction;

    } catch (error) {
      console.error('Performance prediction error:', error);
      return this.getFallbackPrediction(campaignFeatures, industryBenchmarks);
    }
  }

  /**
   * Prepare features for ML algorithms
   */
  private prepareMLFeatures(
    campaignFeatures: CampaignFeatures,
    historicalCampaigns: EnhancedCampaignData[]
  ): { features: number[]; trainingData: Array<{ features: number[]; target: NormalizedPerformanceData }> } {
    // Feature engineering: convert campaign characteristics to numeric features
    const features = [
      this.encodeObjective(campaignFeatures.objective),
      Math.log(campaignFeatures.dailyBudget + 1), // Log transform budget
      campaignFeatures.duration / 30, // Normalize duration to months
      campaignFeatures.accountPerformanceHistory.avgCtr,
      campaignFeatures.accountPerformanceHistory.avgCpc,
      campaignFeatures.accountPerformanceHistory.avgRoas,
      Math.log(campaignFeatures.accountPerformanceHistory.campaignCount + 1),
      campaignFeatures.seasonality / 10,
      campaignFeatures.competitiveIndex / 10,
      campaignFeatures.hasVideo ? 1 : 0,
      campaignFeatures.hasCarousel ? 1 : 0,
      campaignFeatures.creativeCount / 10, // Normalize creative count
      campaignFeatures.estimatedQuality / 10
    ];

    // Prepare training data from historical campaigns
    const trainingData = historicalCampaigns
      .filter(campaign => campaign.performance) // Has performance data
      .map(campaign => ({
        features: this.extractCampaignFeatures(campaign),
        target: campaign.performance
      }))
      .slice(0, 100); // Limit to avoid overfitting with small datasets

    return { features, trainingData };
  }

  /**
   * Simple ML prediction using weighted similarity and linear regression
   */
  private runMLPrediction(
    features: number[],
    trainingData: Array<{ features: number[]; target: NormalizedPerformanceData }>
  ): {
    ctr: number;
    cpc: number;
    cpm: number;
    roas: number;
    conversionRate: number;
    confidence: number;
    algorithm: string;
    dataPoints: number;
    accuracy: number;
  } {
    if (trainingData.length < 3) {
      // Not enough data for ML - return industry averages
      return {
        ctr: 1.2, // Industry average
        cpc: 0.75,
        cpm: 12.0,
        roas: 4.0,
        conversionRate: 2.5,
        confidence: 20,
        algorithm: 'industry_fallback',
        dataPoints: trainingData.length,
        accuracy: 0.5
      };
    }

    // K-Nearest Neighbors with weighted similarity
    const similarities = trainingData.map(dataPoint => ({
      similarity: this.calculateCosineSimilarity(features, dataPoint.features),
      target: dataPoint.target
    }));

    // Sort by similarity and take top 5 neighbors
    const topNeighbors = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, Math.min(5, trainingData.length));

    // Weighted average prediction
    const totalWeight = topNeighbors.reduce((sum, neighbor) => sum + neighbor.similarity, 0);
    
    if (totalWeight === 0) {
      return {
        ctr: 1.2,
        cpc: 0.75,
        cpm: 12.0,
        roas: 4.0,
        conversionRate: 2.5,
        confidence: 30,
        algorithm: 'knn_fallback',
        dataPoints: trainingData.length,
        accuracy: 0.6
      };
    }

    const weightedPredictions = {
      ctr: topNeighbors.reduce((sum, neighbor) => 
        sum + (neighbor.target.ctr * neighbor.similarity), 0) / totalWeight,
      cpc: topNeighbors.reduce((sum, neighbor) => 
        sum + (neighbor.target.cpc * neighbor.similarity), 0) / totalWeight,
      cpm: topNeighbors.reduce((sum, neighbor) => 
        sum + (neighbor.target.cpm * neighbor.similarity), 0) / totalWeight,
      roas: topNeighbors.reduce((sum, neighbor) => 
        sum + (neighbor.target.roas * neighbor.similarity), 0) / totalWeight,
      conversionRate: topNeighbors.reduce((sum, neighbor) => 
        sum + (neighbor.target.conversionRate * neighbor.similarity), 0) / totalWeight
    };

    // Calculate confidence based on similarity scores and data quality
    const avgSimilarity = topNeighbors.reduce((sum, neighbor) => sum + neighbor.similarity, 0) / topNeighbors.length;
    const dataQuality = Math.min(1, trainingData.length / 20); // More data = higher quality
    const confidence = Math.round((avgSimilarity * dataQuality) * 100);

    return {
      ...weightedPredictions,
      confidence: Math.max(40, Math.min(95, confidence)), // Clamp confidence
      algorithm: 'weighted_knn',
      dataPoints: trainingData.length,
      accuracy: avgSimilarity
    };
  }

  /**
   * Generate AI-powered insights and qualitative analysis
   */
  private async generateAIInsights(
    campaignFeatures: CampaignFeatures,
    mlPredictions: any,
    benchmarks: any,
    historicalCampaigns: EnhancedCampaignData[]
  ): Promise<{
    strengths: string[];
    risks: string[];
    recommendations: string[];
    qualitativeFactors: any;
  }> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em performance de campanhas publicitárias com conhecimento avançado em Meta Ads.

Analise os dados fornecidos e retorne um JSON com insights estratégicos:

{
  "strengths": string[] - 3-5 pontos fortes da campanha proposta,
  "risks": string[] - 3-5 riscos potenciais identificados,
  "recommendations": string[] - 5-7 recomendações específicas e acionáveis,
  "qualitativeFactors": {
    "marketPosition": string - posição competitiva estimada,
    "growthPotential": string - potencial de crescimento,
    "optimizationOpportunities": string[] - oportunidades de otimização
  }
}

Foque em insights ACIONÁVEIS que possam impactar CTR, CPC e ROAS.`
          },
          {
            role: 'user',
            content: `DADOS PARA ANÁLISE:

CAMPANHA PROPOSTA:
- Objetivo: ${campaignFeatures.objective}
- Orçamento diário: $${campaignFeatures.dailyBudget}
- Duração: ${campaignFeatures.duration} dias
- Indústria: ${campaignFeatures.industry}
- Criatividade estimada: ${campaignFeatures.estimatedQuality}/10
- Tipos de criativo: ${campaignFeatures.hasVideo ? 'Vídeo' : ''} ${campaignFeatures.hasCarousel ? 'Carrossel' : ''} ${!campaignFeatures.hasVideo && !campaignFeatures.hasCarousel ? 'Imagem' : ''}

PREDIÇÕES ML:
- CTR previsto: ${mlPredictions.ctr.toFixed(2)}%
- CPC previsto: $${mlPredictions.cpc.toFixed(2)}
- ROAS previsto: ${mlPredictions.roas.toFixed(1)}x
- Confiança: ${mlPredictions.confidence}%

HISTÓRICO DA CONTA:
- CTR médio histórico: ${campaignFeatures.accountPerformanceHistory.avgCtr.toFixed(2)}%
- CPC médio histórico: $${campaignFeatures.accountPerformanceHistory.avgCpc.toFixed(2)}
- ROAS médio histórico: ${campaignFeatures.accountPerformanceHistory.avgRoas.toFixed(1)}x
- Campanhas executadas: ${campaignFeatures.accountPerformanceHistory.campaignCount}

CONTEXTO COMPETITIVO:
- Sazonalidade: ${campaignFeatures.seasonality}/10
- Competitividade: ${campaignFeatures.competitiveIndex}/10

BENCHMARKS DA INDÚSTRIA:
${benchmarks ? `CTR benchmark: ${benchmarks.median?.ctr || 'N/A'}% | CPC benchmark: $${benchmarks.median?.cpc || 'N/A'} | ROAS benchmark: ${benchmarks.median?.roas || 'N/A'}x` : 'Benchmarks não disponíveis'}

Analise especialmente se as predições estão acima ou abaixo dos benchmarks e histórico.`
          }
        ],
        temperature: 0.3,
        max_tokens: 1200,
        response_format: { type: "json_object" }
      });

      const insights = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        strengths: insights.strengths || [],
        risks: insights.risks || [],
        recommendations: insights.recommendations || [],
        qualitativeFactors: insights.qualitativeFactors || {}
      };

    } catch (error) {
      console.error('AI insights generation error:', error);
      return {
        strengths: ['Orçamento adequado para teste', 'Objetivo de campanha bem definido'],
        risks: ['Mercado competitivo', 'Necessidade de otimização contínua'],
        recommendations: ['Teste A/B com diferentes criativos', 'Monitore performance diariamente'],
        qualitativeFactors: {
          marketPosition: 'Posição competitiva moderada',
          growthPotential: 'Potencial de crescimento adequado',
          optimizationOpportunities: ['Otimização de segmentação', 'Melhoria de criativos']
        }
      };
    }
  }

  /**
   * Combine ML predictions with AI insights and benchmarks
   */
  private combinePredictions(
    mlPredictions: any,
    aiInsights: any,
    benchmarks: any
  ): PerformancePrediction {
    return {
      predictedMetrics: {
        ctr: mlPredictions.ctr,
        cpc: mlPredictions.cpc,
        cpm: mlPredictions.cpm,
        roas: mlPredictions.roas,
        conversionRate: mlPredictions.conversionRate,
        confidence: mlPredictions.confidence
      },
      predictionFactors: {
        historical: {
          campaignSimilarity: mlPredictions.accuracy * 10,
          industryBenchmark: this.calculateBenchmarkScore(mlPredictions, benchmarks),
          seasonality: 7.5 // Default moderate seasonality
        },
        creative: {
          visualQuality: 7.0, // Default until we have creative analysis
          copyEffectiveness: 7.0,
          brandAlignment: 7.5
        },
        targeting: {
          audienceRelevance: 8.0, // Default good targeting
          competitiveEnvironment: 6.5,
          marketSaturation: 7.0
        }
      },
      insights: {
        strengths: aiInsights.strengths,
        risks: aiInsights.risks,
        recommendations: aiInsights.recommendations,
        expectedPerformanceRange: {
          optimistic: {
            ctr: mlPredictions.ctr * 1.3,
            cpc: mlPredictions.cpc * 0.8,
            roas: mlPredictions.roas * 1.4
          },
          realistic: {
            ctr: mlPredictions.ctr,
            cpc: mlPredictions.cpc,
            roas: mlPredictions.roas
          },
          pessimistic: {
            ctr: mlPredictions.ctr * 0.7,
            cpc: mlPredictions.cpc * 1.3,
            roas: mlPredictions.roas * 0.6
          }
        }
      },
      mlAnalysis: {
        algorithm: mlPredictions.algorithm,
        dataPoints: mlPredictions.dataPoints,
        accuracy: mlPredictions.accuracy,
        features: [
          'campaign_objective',
          'daily_budget',
          'duration',
          'account_history',
          'seasonality',
          'competition',
          'creative_types',
          'quality_score'
        ]
      }
    };
  }

  /**
   * Calculate cosine similarity between feature vectors
   */
  private calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Extract numeric features from campaign data
   */
  private extractCampaignFeatures(campaign: EnhancedCampaignData): number[] {
    // Calculate duration from dates if available
    const duration = campaign.dates.start && campaign.dates.end 
      ? (campaign.dates.end.getTime() - campaign.dates.start.getTime()) / (1000 * 60 * 60 * 24)
      : 30; // Default 30 days

    return [
      this.encodeObjective(campaign.objective || 'conversions'),
      Math.log((campaign.budget.daily || 50) + 1),
      duration / 30, // Normalize to months
      campaign.performance.ctr,
      campaign.performance.cpc,
      campaign.performance.roas,
      Math.log(1 + 1), // Default campaign count
      5, // Default seasonality
      6, // Default competition
      0, // Default no video
      0, // Default no carousel  
      1, // Default 1 creative
      7  // Default quality score
    ];
  }

  /**
   * Encode campaign objective to numeric value
   */
  private encodeObjective(objective: string): number {
    const objectives: { [key: string]: number } = {
      'awareness': 1,
      'reach': 2,
      'traffic': 3,
      'engagement': 4,
      'app_installs': 5,
      'video_views': 6,
      'lead_generation': 7,
      'messages': 8,
      'conversions': 9,
      'catalog_sales': 10,
      'store_visits': 11
    };
    return objectives[objective.toLowerCase()] || 9; // Default to conversions
  }

  /**
   * Calculate benchmark comparison score
   */
  private calculateBenchmarkScore(predictions: any, benchmarks: any): number {
    if (!benchmarks?.median) return 7.0;

    const ctrScore = predictions.ctr >= benchmarks.median.ctr ? 8 : 6;
    const cpcScore = predictions.cpc <= benchmarks.median.cpc ? 8 : 6;
    const roasScore = predictions.roas >= benchmarks.median.roas ? 8 : 6;

    return (ctrScore + cpcScore + roasScore) / 3;
  }

  /**
   * Fallback prediction when ML fails
   */
  private getFallbackPrediction(
    campaignFeatures: CampaignFeatures,
    benchmarks: any
  ): PerformancePrediction {
    const defaultMetrics = benchmarks?.median || {
      ctr: 1.2,
      cpc: 0.75,
      cpm: 12.0,
      roas: 4.0
    };

    return {
      predictedMetrics: {
        ctr: defaultMetrics.ctr,
        cpc: defaultMetrics.cpc,
        cpm: defaultMetrics.cpm,
        roas: defaultMetrics.roas,
        conversionRate: 2.5,
        confidence: 50
      },
      predictionFactors: {
        historical: { campaignSimilarity: 5, industryBenchmark: 7, seasonality: 7 },
        creative: { visualQuality: 7, copyEffectiveness: 7, brandAlignment: 7 },
        targeting: { audienceRelevance: 7, competitiveEnvironment: 7, marketSaturation: 7 }
      },
      insights: {
        strengths: ['Campanha baseada em benchmarks da indústria'],
        risks: ['Predição limitada por falta de dados históricos'],
        recommendations: ['Colete mais dados para melhorar predições futuras'],
        expectedPerformanceRange: {
          optimistic: { ctr: defaultMetrics.ctr * 1.2, cpc: defaultMetrics.cpc * 0.9, roas: defaultMetrics.roas * 1.3 },
          realistic: defaultMetrics,
          pessimistic: { ctr: defaultMetrics.ctr * 0.8, cpc: defaultMetrics.cpc * 1.2, roas: defaultMetrics.roas * 0.7 }
        }
      },
      mlAnalysis: {
        algorithm: 'fallback_benchmarks',
        dataPoints: 0,
        accuracy: 0.5,
        features: []
      }
    };
  }
}