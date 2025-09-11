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
  
  // Pricing per 1K tokens (in USD)
  private modelPricing: Record<string, { input: number; output: number }> = {
    'gpt-4-vision-preview': { input: 0.01, output: 0.03 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
  };

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OpenAI API key not configured');
    }
    this.openai = new OpenAI({ apiKey });
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
        costEstimate: (estimatedCost / creativeIds.length).toString(),
        progress: 0,
        currentStep: 'Queued'
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
            
            // Update database
            await db
              .update(creativeAnalyses)
              .set({
                status: 'completed',
                result: analysis.result,
                insights: analysis.insights,
                recommendations: analysis.recommendations,
                scores: analysis.scores,
                actualCost: analysis.cost.toString(),
                inputTokens: analysis.inputTokens,
                outputTokens: analysis.outputTokens,
                progress: 100,
                completedAt: new Date()
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

  // Analyze individual creative
  private async analyzeCreative(
    creative: AdCreative,
    analysisType: string,
    model: string
  ): Promise<any> {
    try {
      const prompt = this.buildAnalysisPrompt(creative, analysisType);
      
      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: model === 'gpt-4-vision-preview' && creative.imageUrl ? 'gpt-4-vision-preview' : 'gpt-4-turbo-preview',
        messages: [
          {
            role: "system",
            content: "You are an expert marketing analyst specializing in Facebook Ads creative optimization. Analyze the provided ad creative and provide actionable insights."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });
      
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
      console.error('Error in creative analysis:', error);
      throw error;
    }
  }

  // Build analysis prompt based on type
  private buildAnalysisPrompt(creative: AdCreative, analysisType: string): string {
    const baseInfo = `
Ad Creative Analysis:
- Name: ${creative.name}
- Type: ${creative.type}
- Headline: ${creative.headline || 'N/A'}
- Primary Text: ${creative.primaryText || 'N/A'}
- CTA: ${creative.ctaType || 'N/A'}
- Performance Metrics:
  - Impressions: ${creative.impressions}
  - Clicks: ${creative.clicks}
  - CTR: ${creative.ctr}%
  - CPC: ${creative.cpc}
  - Spend: ${creative.spend}
  - Conversions: ${creative.conversions}
`;

    const prompts: Record<string, string> = {
      'audit': `${baseInfo}
Perform a comprehensive audit of this ad creative. Analyze:
1. Copy effectiveness and messaging clarity
2. Visual appeal and brand consistency (if applicable)
3. Call-to-action strength and placement
4. Target audience alignment
5. Performance metrics interpretation
6. Competitive positioning

Provide specific scores (1-10) for each aspect and actionable recommendations.`,

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
    
    return analyses;
  }
}

export const creativeAnalysisService = new CreativeAnalysisService();