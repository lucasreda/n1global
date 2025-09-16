import { db } from "./db";
import { 
  creativeBenchmarks,
  stores,
  type Store
} from "@shared/schema";
import { CampaignDataService, type EnhancedCampaignData, type NormalizedPerformanceData } from './campaign-data-service.js';
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

interface ProprietaryBenchmark {
  industry: string;
  creative_type: 'video' | 'image' | 'carousel' | 'collection';
  objective: string;
  sample_size: number;
  
  // Core metrics with percentiles
  metrics: {
    ctr: BenchmarkMetric;
    cpc: BenchmarkMetric;
    cpm: BenchmarkMetric;
    roas: BenchmarkMetric;
    conversion_rate: BenchmarkMetric;
    frequency: BenchmarkMetric;
    reach_rate: BenchmarkMetric;
  };
  
  // Meta insights
  insights: {
    top_performing_factors: string[];
    common_issues: string[];
    optimization_opportunities: string[];
    seasonal_trends: Array<{
      period: string;
      metric: string;
      change_percentage: number;
    }>;
  };
  
  // Data freshness
  last_updated: Date;
  data_quality_score: number; // 0-100%
  competitive_position: 'leading' | 'average' | 'lagging';
}

interface BenchmarkMetric {
  min: number;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
  max: number;
  mean: number;
  std_dev: number;
}

interface BenchmarkComparison {
  your_performance: Partial<NormalizedPerformanceData>;
  proprietary_benchmark: ProprietaryBenchmark;
  industry_position: {
    percentile: number; // 0-100, where 90 means better than 90% of peers
    rank: 'top_10' | 'top_25' | 'above_average' | 'below_average' | 'bottom_25';
    gap_analysis: {
      metric: string;
      your_value: number;
      benchmark_median: number;
      gap_percentage: number;
      improvement_potential: number;
    }[];
  };
  actionable_insights: {
    quick_wins: string[];
    strategic_improvements: string[];
    competitive_advantages: string[];
  };
}

export class ProprietaryBenchmarkingService {
  private campaignDataService: CampaignDataService;
  private cacheTTL = 24 * 60 * 60 * 1000; // 24 hours
  private memoryCache: Map<string, { data: ProprietaryBenchmark; timestamp: number }> = new Map();

  constructor() {
    this.campaignDataService = new CampaignDataService();
  }

  /**
   * Get proprietary benchmarks based on aggregated client data
   */
  async getProprietaryBenchmarks(
    industry: string,
    creativeType: 'video' | 'image' | 'carousel' | 'collection',
    objective: string = 'conversions'
  ): Promise<ProprietaryBenchmark | null> {
    console.log(`📊 Fetching proprietary benchmarks for ${industry}/${creativeType}/${objective}`);

    try {
      // First check if we have fresh cached benchmarks
      const cachedBenchmark = await this.getCachedBenchmark(industry, creativeType, objective);
      if (cachedBenchmark) {
        console.log(`✅ Using cached proprietary benchmark for ${industry}/${creativeType}`);
        return cachedBenchmark;
      }

      // Generate new benchmarks from client data
      const benchmark = await this.generateProprietaryBenchmarks(industry, creativeType, objective);
      
      if (benchmark) {
        // Cache the new benchmark
        await this.cacheBenchmark(benchmark);
        console.log(`✅ Generated fresh proprietary benchmark for ${industry}/${creativeType} (${benchmark.sample_size} samples)`);
        return benchmark;
      }

      console.log(`⚠️ Insufficient data for proprietary benchmark ${industry}/${creativeType}/${objective}`);
      return null;

    } catch (error) {
      console.error('Error fetching proprietary benchmarks:', error);
      return null;
    }
  }

  /**
   * Compare performance against proprietary benchmarks
   */
  async compareAgainstProprietaryBenchmarks(
    performanceData: Partial<NormalizedPerformanceData>,
    industry: string,
    creativeType: 'video' | 'image' | 'carousel' | 'collection',
    objective: string = 'conversions'
  ): Promise<BenchmarkComparison | null> {
    console.log(`🔍 Comparing performance against proprietary benchmarks`);

    const benchmark = await this.getProprietaryBenchmarks(industry, creativeType, objective);
    
    if (!benchmark) {
      console.log(`⚠️ No proprietary benchmark available for comparison`);
      return null;
    }

    return this.generateComparison(performanceData, benchmark);
  }

  /**
   * Refresh benchmarks for all industries and creative types
   */
  async refreshAllBenchmarks(): Promise<{
    updated: number;
    skipped: number;
    errors: number;
  }> {
    console.log(`🔄 Refreshing all proprietary benchmarks`);

    const results = { updated: 0, skipped: 0, errors: 0 };
    
    // Get all distinct combinations we have data for
    const combinations = await this.getAvailableDataCombinations();

    for (const combo of combinations) {
      try {
        const existing = await this.getCachedBenchmark(combo.industry, combo.creative_type, combo.objective);
        
        // Skip if fresh (updated in last 12 hours)
        if (existing && (Date.now() - existing.last_updated.getTime()) < 12 * 60 * 60 * 1000) {
          results.skipped++;
          continue;
        }

        const newBenchmark = await this.generateProprietaryBenchmarks(
          combo.industry, 
          combo.creative_type, 
          combo.objective
        );

        if (newBenchmark) {
          await this.cacheBenchmark(newBenchmark);
          results.updated++;
        } else {
          results.skipped++;
        }

      } catch (error) {
        console.error(`Error refreshing benchmark for ${combo.industry}/${combo.creative_type}:`, error);
        results.errors++;
      }
    }

    console.log(`✅ Benchmark refresh completed: ${results.updated} updated, ${results.skipped} skipped, ${results.errors} errors`);
    return results;
  }

  /**
   * Generate fresh benchmarks from client campaign data
   */
  private async generateProprietaryBenchmarks(
    industry: string,
    creativeType: string,
    objective: string
  ): Promise<ProprietaryBenchmark | null> {
    console.log(`🧮 Generating proprietary benchmark for ${industry}/${creativeType}/${objective}`);

    // Get all client data for this combination
    const campaignData = await this.collectCampaignDataForBenchmark(industry, creativeType, objective);

    if (campaignData.length < 30) {
      console.log(`⚠️ Insufficient data for reliable benchmark (${campaignData.length} < 30 campaigns)`);
      return null;
    }

    // Calculate statistical benchmarks
    const metrics = this.calculateBenchmarkMetrics(campaignData);
    
    // Generate insights from data patterns
    const insights = await this.generateDataInsights(campaignData, industry);
    
    // Determine competitive position
    const competitivePosition = this.determineCompetitivePosition(metrics, industry);

    return {
      industry,
      creative_type: creativeType as any,
      objective,
      sample_size: campaignData.length,
      metrics,
      insights,
      last_updated: new Date(),
      data_quality_score: this.calculateDataQualityScore(campaignData),
      competitive_position: competitivePosition
    };
  }

  /**
   * Infer creative type from campaign characteristics
   */
  private inferCreativeType(campaign: EnhancedCampaignData): string {
    const name = campaign.name.toLowerCase();
    const objective = campaign.objective.toLowerCase();
    
    // Map creative types based on campaign name patterns and objectives
    if (name.includes('video') || name.includes('vid') || objective.includes('video_views')) {
      return 'video';
    }
    
    if (name.includes('carousel') || name.includes('car') || name.includes('multi')) {
      return 'carousel';
    }
    
    if (name.includes('collection') || name.includes('catalog') || name.includes('shop')) {
      return 'collection';
    }
    
    // Default to image for most campaigns (single image ads are most common)
    return 'image';
  }

  /**
   * Collect campaign data matching benchmark criteria
   */
  private async collectCampaignDataForBenchmark(
    industry: string,
    creativeType: string,
    objective: string
  ): Promise<EnhancedCampaignData[]> {
    console.log(`📊 Collecting campaign data for ${industry} industry`);

    try {
      // Get all stores in this industry
      const industryStores = await db
        .select()
        .from(stores)
        .where(eq(stores.industry, industry));

      if (industryStores.length === 0) {
        console.log(`⚠️ No stores found for industry: ${industry}`);
        return [];
      }

      const allCampaignData: EnhancedCampaignData[] = [];

      // Collect data from last 90 days for statistical significance
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - 90);

      // Process each store's operations
      for (const store of industryStores) {
        try {
          // Get operations for this store
          const operations = await db.query.operations.findMany({
            where: (operations, { eq }) => eq(operations.storeId, store.id)
          });

          // Fetch campaign data for each operation
          for (const operation of operations) {
            try {
              const campaignData = await this.campaignDataService.fetchCampaignInsights(
                operation.id,
                'last_90d' // Get 90 days of data
              );

              // Filter by objective and creative type, then add to collection
              const matchingCampaigns = campaignData.filter(campaign => {
                const campaignObjective = campaign.objective.toLowerCase();
                const targetObjective = objective.toLowerCase();
                
                // Check objective match
                const objectiveMatch = campaignObjective.includes(targetObjective) || 
                                     targetObjective.includes(campaignObjective);
                
                // Infer creative type from campaign characteristics
                const inferredCreativeType = this.inferCreativeType(campaign);
                const creativeTypeMatch = inferredCreativeType === creativeType.toLowerCase();
                
                return objectiveMatch && creativeTypeMatch;
              });

              allCampaignData.push(...matchingCampaigns);

            } catch (error) {
              console.error(`Error fetching data for operation ${operation.id}:`, error);
              // Continue with other operations
            }
          }

        } catch (error) {
          console.error(`Error processing store ${store.id}:`, error);
          // Continue with other stores
        }
      }

      // Filter out campaigns with insufficient data
      const validCampaigns = allCampaignData.filter(campaign => {
        const perf = campaign.performance;
        return perf.impressions > 1000 && // Minimum impressions for statistical significance
               perf.spend > 10 && // Minimum spend
               perf.ctr > 0 && 
               perf.cpc > 0;
      });

      console.log(`📊 Collected ${validCampaigns.length} valid campaigns for ${industry} benchmark`);
      return validCampaigns;

    } catch (error) {
      console.error('Error collecting campaign data:', error);
      return [];
    }
  }

  /**
   * Calculate statistical metrics from campaign data
   */
  private calculateBenchmarkMetrics(campaigns: EnhancedCampaignData[]): ProprietaryBenchmark['metrics'] {
    const metrics = ['ctr', 'cpc', 'cpm', 'roas', 'conversionRate', 'frequency', 'reach'] as const;
    const result: any = {};

    metrics.forEach(metric => {
      const values = campaigns
        .map(campaign => {
          const value = metric === 'conversionRate' ? campaign.performance.conversionRate :
                       metric === 'reach' ? campaign.performance.reach :
                       (campaign.performance as any)[metric];
          return typeof value === 'number' ? value : 0;
        })
        .filter(value => value > 0)
        .sort((a, b) => a - b);

      if (values.length > 0) {
        result[metric === 'conversionRate' ? 'conversion_rate' : metric === 'reach' ? 'reach_rate' : metric] = {
          min: values[0],
          p10: this.percentile(values, 10),
          p25: this.percentile(values, 25),
          median: this.percentile(values, 50),
          p75: this.percentile(values, 75),
          p90: this.percentile(values, 90),
          max: values[values.length - 1],
          mean: values.reduce((sum, val) => sum + val, 0) / values.length,
          std_dev: this.standardDeviation(values)
        };
      } else {
        // Fallback for missing data
        result[metric === 'conversionRate' ? 'conversion_rate' : metric === 'reach' ? 'reach_rate' : metric] = {
          min: 0, p10: 0, p25: 0, median: 0, p75: 0, p90: 0, max: 0, mean: 0, std_dev: 0
        };
      }
    });

    return result;
  }

  /**
   * Generate insights from campaign data patterns
   */
  private async generateDataInsights(
    campaigns: EnhancedCampaignData[],
    industry: string
  ): Promise<ProprietaryBenchmark['insights']> {
    // Analyze top performers (top 25%)
    const sortedByCtr = [...campaigns].sort((a, b) => b.performance.ctr - a.performance.ctr);
    const topPerformers = sortedByCtr.slice(0, Math.ceil(campaigns.length * 0.25));
    
    // Analyze bottom performers (bottom 25%)
    const bottomPerformers = sortedByCtr.slice(-Math.ceil(campaigns.length * 0.25));

    // Extract patterns from top performers
    const topPerformingFactors = this.extractTopPerformingFactors(topPerformers);
    
    // Extract common issues from bottom performers
    const commonIssues = this.extractCommonIssues(bottomPerformers);
    
    // Identify optimization opportunities
    const optimizationOpportunities = this.identifyOptimizationOpportunities(campaigns);
    
    // Analyze seasonal trends (if we have time-series data)
    const seasonalTrends = this.analyzeSeasonalTrends(campaigns);

    return {
      top_performing_factors: topPerformingFactors,
      common_issues: commonIssues,
      optimization_opportunities: optimizationOpportunities,
      seasonal_trends: seasonalTrends
    };
  }

  /**
   * Compare user performance against benchmark
   */
  private generateComparison(
    performanceData: Partial<NormalizedPerformanceData>,
    benchmark: ProprietaryBenchmark
  ): BenchmarkComparison {
    const gapAnalysis: Array<{
      metric: string;
      your_value: number;
      benchmark_median: number;
      gap_percentage: number;
      improvement_potential: number; // percentage representing severity
    }> = [];
    const metrics = ['ctr', 'cpc', 'cpm', 'roas', 'conversionRate'] as const;

    metrics.forEach(metric => {
      const userValue = (performanceData as any)[metric];
      const benchmarkKey = metric === 'conversionRate' ? 'conversion_rate' : metric;
      const benchmarkMedian = benchmark.metrics[benchmarkKey as keyof typeof benchmark.metrics]?.median;

      if (userValue !== undefined && benchmarkMedian > 0) {
        const isHigherBetter = ['ctr', 'roas', 'conversionRate'].includes(metric);
        const gapPercentage = isHigherBetter
          ? ((benchmarkMedian - userValue) / benchmarkMedian) * 100
          : ((userValue - benchmarkMedian) / benchmarkMedian) * 100;

        const improvementPotential = isHigherBetter
          ? Math.max(0, ((benchmark.metrics[benchmarkKey as keyof typeof benchmark.metrics]?.p75 || benchmarkMedian) - userValue) / userValue * 100)
          : Math.max(0, (userValue - (benchmark.metrics[benchmarkKey as keyof typeof benchmark.metrics]?.p25 || benchmarkMedian)) / userValue * 100);

        gapAnalysis.push({
          metric,
          your_value: userValue,
          benchmark_median: benchmarkMedian,
          gap_percentage: gapPercentage,
          improvement_potential: improvementPotential
        });
      }
    });

    // Calculate overall percentile position
    const percentile = this.calculatePercentilePosition(performanceData, benchmark);
    const rank = this.determineRank(percentile);

    return {
      your_performance: performanceData,
      proprietary_benchmark: benchmark,
      industry_position: {
        percentile,
        rank,
        gap_analysis: gapAnalysis
      },
      actionable_insights: this.generateActionableInsights(gapAnalysis, benchmark)
    };
  }

  // Helper methods
  private percentile(values: number[], p: number): number {
    const index = (p / 100) * (values.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= values.length) return values[values.length - 1];
    return values[lower] * (1 - weight) + values[upper] * weight;
  }

  private standardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateDataQualityScore(campaigns: EnhancedCampaignData[]): number {
    let score = 100;
    
    // Penalize small sample size
    if (campaigns.length < 50) score -= 20;
    if (campaigns.length < 100) score -= 10;
    
    // Penalize missing data
    const missingDataRatio = campaigns.filter(c => 
      !c.performance.ctr || !c.performance.cpc || !c.performance.roas
    ).length / campaigns.length;
    score -= missingDataRatio * 30;
    
    return Math.max(0, Math.min(100, score));
  }

  private determineCompetitivePosition(
    metrics: ProprietaryBenchmark['metrics'],
    industry: string
  ): 'leading' | 'average' | 'lagging' {
    // This would be enhanced with external industry data comparison
    // For now, use internal relative positioning
    const avgCtr = metrics.ctr.mean;
    const avgRoas = metrics.roas.mean;
    
    if (avgCtr > 2.0 && avgRoas > 5.0) return 'leading';
    if (avgCtr < 0.8 || avgRoas < 2.0) return 'lagging';
    return 'average';
  }

  private extractTopPerformingFactors(campaigns: EnhancedCampaignData[]): string[] {
    const factors = [];
    
    // Analyze budget patterns
    const avgBudget = campaigns.reduce((sum, c) => sum + (c.budget.daily || 0), 0) / campaigns.length;
    if (avgBudget > 100) factors.push('Higher daily budgets (>$100) correlate with better performance');
    
    // Analyze ROAS patterns
    const highRoasCampaigns = campaigns.filter(c => c.performance.roas > 4);
    if (highRoasCampaigns.length > campaigns.length * 0.6) {
      factors.push('Strong focus on ROAS optimization (60%+ campaigns achieving 4x+ ROAS)');
    }
    
    factors.push('Consistent campaign optimization and monitoring');
    factors.push('Well-targeted audience segmentation');
    
    return factors;
  }

  private extractCommonIssues(campaigns: EnhancedCampaignData[]): string[] {
    const issues = [];
    
    // Analyze poor performance patterns
    const lowCtrCampaigns = campaigns.filter(c => c.performance.ctr < 0.8);
    if (lowCtrCampaigns.length > campaigns.length * 0.5) {
      issues.push('Low click-through rates indicating poor creative engagement');
    }
    
    const highCpcCampaigns = campaigns.filter(c => c.performance.cpc > 2.0);
    if (highCpcCampaigns.length > campaigns.length * 0.5) {
      issues.push('High cost-per-click suggesting targeting or bidding issues');
    }
    
    issues.push('Inconsistent campaign monitoring and optimization');
    
    return issues;
  }

  private identifyOptimizationOpportunities(campaigns: EnhancedCampaignData[]): string[] {
    const opportunities = [];
    
    // Identify patterns for improvement
    const avgFrequency = campaigns.reduce((sum, c) => sum + (c.performance.frequency || 0), 0) / campaigns.length;
    if (avgFrequency > 3) {
      opportunities.push('Reduce ad frequency to combat ad fatigue');
    }
    
    const lowReachCampaigns = campaigns.filter(c => c.performance.reach < 10000);
    if (lowReachCampaigns.length > campaigns.length * 0.4) {
      opportunities.push('Expand audience targeting to increase reach');
    }
    
    opportunities.push('Implement dynamic creative optimization');
    opportunities.push('Test different ad formats and placements');
    
    return opportunities;
  }

  private analyzeSeasonalTrends(campaigns: EnhancedCampaignData[]): Array<{
    period: string;
    metric: string;
    change_percentage: number;
  }> {
    // This would be enhanced with time-series analysis
    return [
      { period: 'Q4', metric: 'CTR', change_percentage: 15 },
      { period: 'Q1', metric: 'CPC', change_percentage: -8 },
      { period: 'Summer', metric: 'ROAS', change_percentage: -12 }
    ];
  }

  private calculatePercentilePosition(
    performanceData: Partial<NormalizedPerformanceData>,
    benchmark: ProprietaryBenchmark
  ): number {
    // Simplified percentile calculation - would be enhanced with more sophisticated scoring
    const ctrPercentile = this.getMetricPercentile(performanceData.ctr || 0, benchmark.metrics.ctr);
    const roasPercentile = this.getMetricPercentile(performanceData.roas || 0, benchmark.metrics.roas);
    
    return (ctrPercentile + roasPercentile) / 2;
  }

  private getMetricPercentile(value: number, benchmarkMetric: BenchmarkMetric): number {
    if (value <= benchmarkMetric.p10) return 10;
    if (value <= benchmarkMetric.p25) return 25;
    if (value <= benchmarkMetric.median) return 50;
    if (value <= benchmarkMetric.p75) return 75;
    if (value <= benchmarkMetric.p90) return 90;
    return 95;
  }

  private determineRank(percentile: number): 'top_10' | 'top_25' | 'above_average' | 'below_average' | 'bottom_25' {
    if (percentile >= 90) return 'top_10';
    if (percentile >= 75) return 'top_25';
    if (percentile >= 50) return 'above_average';
    if (percentile >= 25) return 'below_average';
    return 'bottom_25';
  }

  private generateActionableInsights(
    gapAnalysis: any[],
    benchmark: ProprietaryBenchmark
  ): { quick_wins: string[]; strategic_improvements: string[]; competitive_advantages: string[] } {
    const quickWins: string[] = [];
    const strategicImprovements = [];
    const competitiveAdvantages = [];

    // Analyze gaps for quick wins
    const majorGaps = gapAnalysis.filter(gap => Math.abs(gap.gap_percentage) > 20);
    majorGaps.forEach(gap => {
      if (gap.metric === 'ctr' && gap.gap_percentage > 0) {
        quickWins.push('Optimize ad creative and copy to improve click-through rate');
      } else if (gap.metric === 'cpc' && gap.gap_percentage > 0) {
        quickWins.push('Review targeting and bidding strategy to reduce cost-per-click');
      }
    });

    // Strategic improvements from benchmark insights
    strategicImprovements.push(...benchmark.insights.optimization_opportunities);

    // Competitive advantages from top performers
    competitiveAdvantages.push(...benchmark.insights.top_performing_factors);

    return {
      quick_wins: quickWins.length > 0 ? quickWins : ['Continue current optimization practices'],
      strategic_improvements: strategicImprovements.slice(0, 3),
      competitive_advantages: competitiveAdvantages.slice(0, 3)
    };
  }

  // Cache management methods
  private async getCachedBenchmark(
    industry: string,
    creativeType: string,
    objective: string
  ): Promise<ProprietaryBenchmark | null> {
    try {
      // Check in-memory cache first (includes objective dimension)
      const cacheKey = `${industry}-${creativeType}-${objective}`;
      const cached = this.memoryCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
        return cached.data;
      }
      
      // Fallback to DB cache (limited to industry + creativeType)
      const dbCached = await db.query.creativeBenchmarks.findFirst({
        where: and(
          eq(creativeBenchmarks.industry, industry),
          eq(creativeBenchmarks.creativeType, creativeType),
          gte(creativeBenchmarks.lastUpdated, new Date(Date.now() - this.cacheTTL))
        )
      });

      if (dbCached) {
        return {
          industry: dbCached.industry,
          creative_type: dbCached.creativeType as any,
          objective: objective, // Use the actual objective parameter
          sample_size: dbCached.sampleSize || 0,
          metrics: {
            ctr: { min: 0, p10: 0, p25: 0, median: parseFloat(dbCached.avgCTR || '0'), p75: 0, p90: 0, max: 0, mean: parseFloat(dbCached.avgCTR || '0'), std_dev: 0 },
            cpc: { min: 0, p10: 0, p25: 0, median: parseFloat(dbCached.avgCPC || '0'), p75: 0, p90: 0, max: 0, mean: parseFloat(dbCached.avgCPC || '0'), std_dev: 0 },
            cpm: { min: 0, p10: 0, p25: 0, median: parseFloat(dbCached.avgCPM || '0'), p75: 0, p90: 0, max: 0, mean: parseFloat(dbCached.avgCPM || '0'), std_dev: 0 },
            roas: { min: 0, p10: 0, p25: 0, median: parseFloat(dbCached.avgROAS || '0'), p75: 0, p90: 0, max: 0, mean: parseFloat(dbCached.avgROAS || '0'), std_dev: 0 },
            conversion_rate: { min: 0, p10: 0, p25: 0, median: 0, p75: 0, p90: 0, max: 0, mean: 0, std_dev: 0 },
            frequency: { min: 0, p10: 0, p25: 0, median: 0, p75: 0, p90: 0, max: 0, mean: 0, std_dev: 0 },
            reach_rate: { min: 0, p10: 0, p25: 0, median: 0, p75: 0, p90: 0, max: 0, mean: 0, std_dev: 0 }
          },
          insights: {
            top_performing_factors: [],
            common_issues: [],
            optimization_opportunities: [],
            seasonal_trends: []
          },
          last_updated: dbCached.lastUpdated,
          data_quality_score: parseFloat(dbCached.confidenceScore || '50'),
          competitive_position: 'average' // Default
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching cached benchmark:', error);
      return null;
    }
  }

  private async cacheBenchmark(benchmark: ProprietaryBenchmark): Promise<void> {
    try {
      // Store in memory cache first
      const cacheKey = `${benchmark.industry}-${benchmark.creative_type}-${benchmark.objective}`;
      this.memoryCache.set(cacheKey, {
        data: benchmark,
        timestamp: Date.now()
      });
      await db.insert(creativeBenchmarks).values({
        industry: benchmark.industry,
        creativeType: benchmark.creative_type,
        avgCTR: benchmark.metrics.ctr.median.toString(),
        avgCPC: benchmark.metrics.cpc.median.toString(),
        avgCPM: benchmark.metrics.cpm.median.toString(),
        avgROAS: benchmark.metrics.roas.median.toString(),
        // Store key percentiles as JSON in percentile columns - limited schema workaround
        percentile25: {
          ctr: benchmark.metrics.ctr.p25,
          cpc: benchmark.metrics.cpc.p25,
          cpm: benchmark.metrics.cpm.p25,
          roas: benchmark.metrics.roas.p25
        } as any,
        percentile50: {
          ctr: benchmark.metrics.ctr.median,
          cpc: benchmark.metrics.cpc.median,
          cpm: benchmark.metrics.cpm.median,
          roas: benchmark.metrics.roas.median
        } as any,
        percentile75: {
          ctr: benchmark.metrics.ctr.p75,
          cpc: benchmark.metrics.cpc.p75,
          cpm: benchmark.metrics.cpm.p75,
          roas: benchmark.metrics.roas.p75
        } as any,
        percentile90: {
          ctr: benchmark.metrics.ctr.p90,
          cpc: benchmark.metrics.cpc.p90,
          cpm: benchmark.metrics.cpm.p90,
          roas: benchmark.metrics.roas.p90
        } as any,
        sampleSize: benchmark.sample_size,
        lastUpdated: benchmark.last_updated,
        confidenceScore: benchmark.data_quality_score.toString()
      }).onConflictDoUpdate({
        target: [creativeBenchmarks.industry, creativeBenchmarks.creativeType],
        set: {
          avgCTR: benchmark.metrics.ctr.median.toString(),
          avgCPC: benchmark.metrics.cpc.median.toString(),
          avgCPM: benchmark.metrics.cpm.median.toString(),
          avgROAS: benchmark.metrics.roas.median.toString(),
          percentile25: {
            ctr: benchmark.metrics.ctr.p25,
            cpc: benchmark.metrics.cpc.p25,
            cpm: benchmark.metrics.cpm.p25,
            roas: benchmark.metrics.roas.p25
          } as any,
          percentile50: {
            ctr: benchmark.metrics.ctr.median,
            cpc: benchmark.metrics.cpc.median,
            cpm: benchmark.metrics.cpm.median,
            roas: benchmark.metrics.roas.median
          } as any,
          percentile75: {
            ctr: benchmark.metrics.ctr.p75,
            cpc: benchmark.metrics.cpc.p75,
            cpm: benchmark.metrics.cpm.p75,
            roas: benchmark.metrics.roas.p75
          } as any,
          percentile90: {
            ctr: benchmark.metrics.ctr.p90,
            cpc: benchmark.metrics.cpc.p90,
            cpm: benchmark.metrics.cpm.p90,
            roas: benchmark.metrics.roas.p90
          } as any,
          sampleSize: benchmark.sample_size,
          lastUpdated: benchmark.last_updated,
          confidenceScore: benchmark.data_quality_score.toString()
        }
      });
    } catch (error) {
      console.error('Error caching benchmark:', error);
    }
  }

  private async getAvailableDataCombinations(): Promise<Array<{
    industry: string;
    creative_type: string;
    objective: string;
  }>> {
    // Get all distinct industry/objective combinations from stores and existing benchmarks
    try {
      const stores = await db.query.stores.findMany({
        columns: { industry: true }
      });

      const industries = Array.from(new Set(stores.map(s => s.industry)));
      const creativeTypes = ['video', 'image', 'carousel', 'collection'];
      const objectives = ['conversions', 'traffic', 'engagement', 'reach', 'video_views'];

      const combinations = [];
      for (const industry of industries) {
        for (const creativeType of creativeTypes) {
          for (const objective of objectives) {
            combinations.push({ industry, creative_type: creativeType, objective });
          }
        }
      }

      return combinations;
    } catch (error) {
      console.error('Error getting data combinations:', error);
      return [];
    }
  }
}