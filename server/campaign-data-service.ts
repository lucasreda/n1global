import fetch from "node-fetch";
import { db } from "./db";
import { 
  facebookAdAccounts,
  adAccounts,
  type FacebookAdAccount
} from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { currencyService } from './currency-service';

// Enhanced interfaces for Meta Marketing API responses - using correct Meta API fields
interface MetaCampaignInsights {
  impressions: string;
  clicks: string;
  spend: string;
  cpm: string;
  cpc: string;
  ctr: string;
  cpp: string; // Cost per thousand people reached
  frequency: string;
  reach: string;
  actions?: Array<{
    action_type: string;
    value: string;
  }>;
  action_values?: Array<{
    action_type: string;
    value: string;
  }>;
  purchase_roas?: Array<{
    action_type: string;
    value: string;
  }>;
  website_purchase_roas?: Array<{
    action_type: string;
    value: string;
  }>;
  video_avg_time_watched_actions?: Array<{
    action_type: string;
    value: string;
  }>;
  video_p25_watched_actions?: Array<{
    action_type: string;
    value: string;
  }>;
  video_p50_watched_actions?: Array<{
    action_type: string;
    value: string;
  }>;
  video_p75_watched_actions?: Array<{
    action_type: string;
    value: string;
  }>;
  video_p100_watched_actions?: Array<{
    action_type: string;
    value: string;
  }>;
}

interface MetaCampaignData {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  created_time: string;
  start_time?: string;
  stop_time?: string;
  insights?: {
    data: MetaCampaignInsights[];
  };
}

interface MetaAdData {
  id: string;
  name: string;
  status: string;
  campaign_id: string;
  adset_id: string;
  creative: {
    id: string;
    name?: string;
    title?: string;
    body?: string;
    thumbnail_url?: string;
    image_url?: string;
    video_id?: string;
    call_to_action_type?: string;
    link_url?: string;
  };
  insights?: {
    data: MetaCampaignInsights[];
  };
}

// Normalized performance data
interface NormalizedPerformanceData {
  impressions: number;
  clicks: number;
  spend: number;
  cpm: number;
  cpc: number;
  ctr: number;
  cpp: number;
  frequency: number;
  reach: number;
  conversions: number;
  conversionRate: number;
  costPerConversion: number;
  roas: number;
  engagementRate: number;
  videoWatchTime: {
    avg: number;
    p25: number;
    p50: number;
    p75: number;
    p100: number;
  };
  actions: {
    [actionType: string]: number;
  };
  actionValues: {
    [actionType: string]: number;
  };
}

// Enhanced campaign data with performance insights
interface EnhancedCampaignData {
  campaignId: string;
  name: string;
  status: string;
  objective: string;
  budget: {
    daily?: number;
    lifetime?: number;
  };
  dates: {
    created: Date;
    start?: Date;
    end?: Date;
  };
  performance: NormalizedPerformanceData;
  metadata: {
    accountId: string;
    currency: string;
    timezone: string;
    lastUpdated: Date;
  };
}

export class CampaignDataService {
  private baseUrl = "https://graph.facebook.com/v18.0";
  
  constructor() {
    console.log("🚀 CampaignDataService initialized");
  }

  /**
   * Fetch enhanced campaign data with performance insights from Meta Marketing API
   */
  async fetchCampaignInsights(
    operationId: string,
    dateRange: 'last_7d' | 'last_14d' | 'last_30d' | 'last_90d' = 'last_30d',
    includeBreakdowns: boolean = true
  ): Promise<EnhancedCampaignData[]> {
    console.log(`📊 Fetching campaign insights for operation ${operationId}, period: ${dateRange}`);
    
    try {
      // Get ad accounts for this operation
      const operationAdAccounts = await db
        .select()
        .from(adAccounts)
        .where(and(
          eq(adAccounts.operationId, operationId),
          eq(adAccounts.network, 'facebook'),
          eq(adAccounts.isActive, true)
        ));

      if (operationAdAccounts.length === 0) {
        console.log(`⚠️ No Facebook ad accounts found for operation ${operationId}`);
        return [];
      }

      const allCampaignData: EnhancedCampaignData[] = [];

      // Process accounts in parallel for better performance
      await Promise.all(operationAdAccounts.map(async (account) => {
        try {
          const campaignData = await this.fetchAccountCampaignInsights(
            account.accountId,
            account.accessToken || '',
            dateRange,
            includeBreakdowns
          );
          allCampaignData.push(...campaignData);
        } catch (error) {
          console.error(`❌ Failed to fetch insights for account ${account.accountId}:`, error);
        }
      }));

      console.log(`✅ Successfully fetched insights for ${allCampaignData.length} campaigns`);
      return allCampaignData;

    } catch (error) {
      console.error('❌ Error fetching campaign insights:', error);
      throw error;
    }
  }

  /**
   * Fetch campaign insights for a specific ad account
   */
  private async fetchAccountCampaignInsights(
    accountId: string,
    accessToken: string,
    dateRange: string,
    includeBreakdowns: boolean
  ): Promise<EnhancedCampaignData[]> {
    console.log(`📊 Fetching campaign insights for account ${accountId}`);

    // Validate access token
    if (!accessToken || accessToken.trim() === '') {
      console.warn(`⚠️ Missing access token for account ${accountId}, skipping`);
      return [];
    }

    // Valid Meta API insight fields
    const insightFields = [
      'impressions',
      'clicks',
      'spend',
      'cpm',
      'cpc',
      'ctr',
      'cpp',
      'frequency',
      'reach',
      'actions',
      'action_values',
      'purchase_roas',
      'website_purchase_roas',
      'video_avg_time_watched_actions',
      'video_p25_watched_actions',
      'video_p50_watched_actions',
      'video_p75_watched_actions',
      'video_p100_watched_actions'
    ];

    // Build insights specification with proper aggregation
    // Always use time_increment(all_days) to get aggregated data
    // For now, disable breakdowns to get clean aggregated metrics
    const insightsSpec = `insights.date_preset(${dateRange}).time_increment(all_days){${insightFields.join(',')}}`;

    const fields = [
      'id',
      'name',
      'status',
      'objective',
      'daily_budget',
      'lifetime_budget',
      'created_time',
      'start_time',
      'stop_time',
      insightsSpec
    ].join(',');

    // URL encode the fields to prevent parsing issues
    const encodedFields = encodeURIComponent(fields);
    const url = `${this.baseUrl}/act_${accountId}/campaigns?fields=${encodedFields}&limit=500&access_token=${accessToken}`;

    console.log(`🌐 Meta API request for account ${accountId}`);

    // Fetch all campaigns with pagination support
    let allCampaigns: MetaCampaignData[] = [];
    let nextUrl: string | undefined = url;

    while (nextUrl) {
      const response = await fetch(nextUrl);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Meta API error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to fetch campaign insights: ${response.statusText}`);
      }

      const data = await response.json() as { 
        data: MetaCampaignData[];
        paging?: { next?: string };
      };
      
      allCampaigns.push(...(data.data || []));
      
      // Handle pagination
      nextUrl = data.paging?.next;
      
      console.log(`📊 Retrieved ${data.data?.length || 0} campaigns from Meta API (batch)`);
      
      // Safety limit to prevent infinite loops
      if (allCampaigns.length > 5000) {
        console.warn(`⚠️ Reached safety limit of 5000 campaigns for account ${accountId}`);
        break;
      }
    }

    console.log(`📊 Total retrieved: ${allCampaigns.length} campaigns from Meta API`);

    // Get account details for currency and timezone
    const accountDetails = await this.getAccountDetails(accountId, accessToken);

    // Process and normalize campaign data
    const enhancedCampaigns = allCampaigns.map(campaign => 
      this.normalizeCampaignData(campaign, accountDetails, accountId)
    );

    console.log(`✅ Processed ${enhancedCampaigns.length} campaigns for account ${accountId}`);
    return enhancedCampaigns;
  }

  /**
   * Get account details for currency and timezone context
   */
  private async getAccountDetails(accountId: string, accessToken: string): Promise<{
    currency: string;
    timezone: string;
  }> {
    const url = `${this.baseUrl}/act_${accountId}?fields=currency,timezone_name&access_token=${accessToken}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`⚠️ Could not fetch account details for ${accountId}, using defaults`);
        return { currency: 'USD', timezone: 'UTC' };
      }
      
      const data = await response.json() as { currency: string; timezone_name: string };
      return {
        currency: data.currency || 'USD',
        timezone: data.timezone_name || 'UTC'
      };
    } catch (error) {
      console.warn(`⚠️ Error fetching account details for ${accountId}:`, error);
      return { currency: 'USD', timezone: 'UTC' };
    }
  }

  /**
   * Normalize raw Meta API campaign data into structured format
   */
  private normalizeCampaignData(
    campaign: MetaCampaignData,
    accountDetails: { currency: string; timezone: string },
    accountId: string
  ): EnhancedCampaignData {
    // With time_increment(all_days), we should get a single aggregated row
    // But handle multiple rows by aggregating them ourselves for safety
    const insightRows = campaign.insights?.data || [];
    const insights = insightRows.length === 1 
      ? insightRows[0] 
      : this.aggregateInsights(insightRows);
    
    // Helper function to safely parse numeric values
    const parseNumber = (value: string | undefined, defaultValue: number = 0): number => {
      if (!value) return defaultValue;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? defaultValue : parsed;
    };

    // Extract action values
    const actions: { [key: string]: number } = {};
    const actionValues: { [key: string]: number } = {};

    insights?.actions?.forEach((action: { action_type: string; value: string }) => {
      actions[action.action_type] = parseNumber(action.value);
    });

    insights?.action_values?.forEach((actionValue: { action_type: string; value: string }) => {
      actionValues[actionValue.action_type] = parseNumber(actionValue.value);
    });

    // Calculate derived metrics
    const impressions = parseNumber(insights?.impressions);
    const clicks = parseNumber(insights?.clicks);
    const spend = parseNumber(insights?.spend);
    const reach = parseNumber(insights?.reach);
    
    // Extract conversions from actions (common conversion action types)
    const conversions = 
      actions['offsite_conversion.fb_pixel_purchase'] ||
      actions['omni_purchase'] ||
      actions['purchase'] ||
      actions['offsite_conversion.custom'] ||
      actions['lead'] ||
      0;

    const engagementRate = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
    const costPerConversion = conversions > 0 ? spend / conversions : 0;
    
    // Extract ROAS from purchase_roas or website_purchase_roas arrays
    const roas = parseNumber(
      insights?.purchase_roas?.[0]?.value || 
      insights?.website_purchase_roas?.[0]?.value
    );

    // Extract video metrics
    const videoWatchTime = {
      avg: parseNumber(insights?.video_avg_time_watched_actions?.[0]?.value),
      p25: parseNumber(insights?.video_p25_watched_actions?.[0]?.value),
      p50: parseNumber(insights?.video_p50_watched_actions?.[0]?.value),
      p75: parseNumber(insights?.video_p75_watched_actions?.[0]?.value),
      p100: parseNumber(insights?.video_p100_watched_actions?.[0]?.value)
    };

    return {
      campaignId: campaign.id,
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      budget: {
        daily: campaign.daily_budget ? parseNumber(campaign.daily_budget) : undefined,
        lifetime: campaign.lifetime_budget ? parseNumber(campaign.lifetime_budget) : undefined
      },
      dates: {
        created: new Date(campaign.created_time),
        start: campaign.start_time ? new Date(campaign.start_time) : undefined,
        end: campaign.stop_time ? new Date(campaign.stop_time) : undefined
      },
      performance: {
        impressions,
        clicks,
        spend,
        cpm: parseNumber(insights?.cpm),
        cpc: parseNumber(insights?.cpc),
        ctr: parseNumber(insights?.ctr),
        cpp: parseNumber(insights?.cpp),
        frequency: parseNumber(insights?.frequency),
        reach,
        conversions,
        conversionRate,
        costPerConversion,
        roas,
        engagementRate,
        videoWatchTime,
        actions,
        actionValues
      },
      metadata: {
        accountId: accountId,
        currency: accountDetails.currency,
        timezone: accountDetails.timezone,
        lastUpdated: new Date()
      }
    };
  }

  /**
   * Aggregate multiple insight rows into a single aggregated row
   */
  private aggregateInsights(insightRows: MetaCampaignInsights[]): MetaCampaignInsights {
    if (insightRows.length === 0) {
      return {} as MetaCampaignInsights;
    }

    if (insightRows.length === 1) {
      return insightRows[0];
    }

    // Aggregate numeric metrics
    const aggregated: Partial<MetaCampaignInsights> = {};
    
    const sumMetrics = ['impressions', 'clicks', 'spend', 'reach'] as const;
    sumMetrics.forEach(metric => {
      const total = insightRows.reduce((sum, row) => {
        const value = parseFloat(row[metric] || '0');
        return sum + (isNaN(value) ? 0 : value);
      }, 0);
      (aggregated as any)[metric] = total.toString();
    });

    // Calculate derived metrics from aggregated values
    const totalImpressions = parseFloat(aggregated.impressions || '0');
    const totalClicks = parseFloat(aggregated.clicks || '0');
    const totalSpend = parseFloat(aggregated.spend || '0');
    const totalReach = parseFloat(aggregated.reach || '0');

    if (totalImpressions > 0) {
      aggregated.ctr = ((totalClicks / totalImpressions) * 100).toFixed(6);
      aggregated.cpm = ((totalSpend / totalImpressions) * 1000).toFixed(6);
    }

    if (totalClicks > 0) {
      aggregated.cpc = (totalSpend / totalClicks).toFixed(6);
    }

    if (totalReach > 0) {
      aggregated.cpp = ((totalSpend / totalReach) * 1000).toFixed(6);
      aggregated.frequency = (totalImpressions / totalReach).toFixed(6);
    }

    // Aggregate actions and action_values
    const aggregatedActions: { [key: string]: number } = {};
    const aggregatedActionValues: { [key: string]: number } = {};

    insightRows.forEach(row => {
      row.actions?.forEach(action => {
        const value = parseFloat(action.value || '0');
        aggregatedActions[action.action_type] = (aggregatedActions[action.action_type] || 0) + value;
      });

      row.action_values?.forEach(actionValue => {
        const value = parseFloat(actionValue.value || '0');
        aggregatedActionValues[actionValue.action_type] = (aggregatedActionValues[actionValue.action_type] || 0) + value;
      });
    });

    // Convert back to API format
    aggregated.actions = Object.entries(aggregatedActions).map(([action_type, value]) => ({
      action_type,
      value: value.toString()
    }));

    aggregated.action_values = Object.entries(aggregatedActionValues).map(([action_type, value]) => ({
      action_type,
      value: value.toString()
    }));

    // For ROAS arrays, take the first non-zero value (these are usually already aggregated)
    const firstRowWithRoas = insightRows.find(row => 
      row.purchase_roas?.[0]?.value || row.website_purchase_roas?.[0]?.value
    );
    if (firstRowWithRoas) {
      aggregated.purchase_roas = firstRowWithRoas.purchase_roas;
      aggregated.website_purchase_roas = firstRowWithRoas.website_purchase_roas;
    }

    // For video metrics, average them (approximate)
    const videoMetrics = [
      'video_avg_time_watched_actions',
      'video_p25_watched_actions', 
      'video_p50_watched_actions',
      'video_p75_watched_actions',
      'video_p100_watched_actions'
    ] as const;

    videoMetrics.forEach(metric => {
      const values = insightRows
        .map(row => parseFloat(row[metric]?.[0]?.value || '0'))
        .filter(val => !isNaN(val) && val > 0);
      
      if (values.length > 0) {
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        (aggregated as any)[metric] = [{ action_type: 'video_view', value: avg.toString() }];
      }
    });

    return aggregated as MetaCampaignInsights;
  }

  /**
   * Get performance benchmarks for specific industry and creative type
   */
  async getPerformanceBenchmarks(
    industry: string,
    creativeType: 'video' | 'image' | 'carousel' | 'collection',
    objective: string = 'conversions'
  ): Promise<{
    median: NormalizedPerformanceData;
    percentiles: {
      p25: Partial<NormalizedPerformanceData>;
      p50: Partial<NormalizedPerformanceData>;
      p75: Partial<NormalizedPerformanceData>;
      p90: Partial<NormalizedPerformanceData>;
    };
    sampleSize: number;
  } | null> {
    console.log(`📊 Getting performance benchmarks for ${industry}/${creativeType}/${objective}`);
    
    // This would typically query the creativeBenchmarks table
    // For now, returning industry-standard benchmarks as fallback
    const fallbackBenchmarks = this.getFallbackBenchmarks(industry, creativeType);
    
    console.log(`📊 Returning fallback benchmarks for ${industry}/${creativeType}`);
    return fallbackBenchmarks;
  }

  /**
   * Industry-standard benchmark fallbacks
   */
  private getFallbackBenchmarks(
    industry: string,
    creativeType: string
  ): {
    median: NormalizedPerformanceData;
    percentiles: {
      p25: Partial<NormalizedPerformanceData>;
      p50: Partial<NormalizedPerformanceData>;
      p75: Partial<NormalizedPerformanceData>;
      p90: Partial<NormalizedPerformanceData>;
    };
    sampleSize: number;
  } {
    // Industry-specific benchmark data
    const benchmarks: { [key: string]: any } = {
      ecommerce: {
        ctr: { p25: 0.8, p50: 1.2, p75: 1.8, p90: 2.5 },
        cpc: { p25: 0.45, p50: 0.75, p75: 1.20, p90: 2.00 },
        cpm: { p25: 8.50, p50: 12.00, p75: 18.00, p90: 25.00 },
        roas: { p25: 2.5, p50: 4.0, p75: 6.5, p90: 10.0 }
      },
      saas: {
        ctr: { p25: 1.2, p50: 1.8, p75: 2.8, p90: 4.2 },
        cpc: { p25: 1.20, p50: 2.50, p75: 4.50, p90: 8.00 },
        cpm: { p25: 15.00, p50: 25.00, p75: 40.00, p90: 65.00 },
        roas: { p25: 3.0, p50: 5.0, p75: 8.0, p90: 12.0 }
      },
      health: {
        ctr: { p25: 0.6, p50: 1.0, p75: 1.6, p90: 2.4 },
        cpc: { p25: 0.80, p50: 1.50, p75: 2.80, p90: 5.00 },
        cpm: { p25: 12.00, p50: 18.00, p75: 28.00, p90: 45.00 },
        roas: { p25: 2.0, p50: 3.5, p75: 5.5, p90: 8.5 }
      }
    };

    const industryData = benchmarks[industry.toLowerCase()] || benchmarks.ecommerce;
    
    return {
      median: {
        impressions: 50000,
        clicks: 600,
        spend: 450,
        cpm: industryData.cpm.p50,
        cpc: industryData.cpc.p50,
        ctr: industryData.ctr.p50,
        cpp: industryData.cpm.p50 * 0.8,
        frequency: 2.1,
        reach: 25000,
        conversions: 18,
        conversionRate: 3.0,
        costPerConversion: 25.00,
        roas: industryData.roas.p50,
        engagementRate: 4.5,
        videoWatchTime: {
          avg: 12.5,
          p25: 8.0,
          p50: 15.0,
          p75: 25.0,
          p100: 45.0
        },
        actions: {},
        actionValues: {}
      },
      percentiles: {
        p25: {
          ctr: industryData.ctr.p25,
          cpc: industryData.cpc.p25,
          cpm: industryData.cpm.p25,
          roas: industryData.roas.p25
        },
        p50: {
          ctr: industryData.ctr.p50,
          cpc: industryData.cpc.p50,
          cpm: industryData.cpm.p50,
          roas: industryData.roas.p50
        },
        p75: {
          ctr: industryData.ctr.p75,
          cpc: industryData.cpc.p75,
          cpm: industryData.cpm.p75,
          roas: industryData.roas.p75
        },
        p90: {
          ctr: industryData.ctr.p90,
          cpc: industryData.cpc.p90,
          cpm: industryData.cpm.p90,
          roas: industryData.roas.p90
        }
      },
      sampleSize: 1500
    };
  }

  /**
   * Compare campaign performance against benchmarks
   */
  async comparePerformance(
    campaignData: EnhancedCampaignData,
    industry: string
  ): Promise<{
    overallScore: number;
    metrics: {
      [key: string]: {
        value: number;
        benchmark: number;
        percentile: number;
        status: 'excellent' | 'good' | 'average' | 'poor';
      };
    };
    recommendations: string[];
  }> {
    console.log(`📊 Comparing performance for campaign ${campaignData.name}`);
    
    const benchmarks = await this.getPerformanceBenchmarks(
      industry,
      'video', // Default to video for now
      campaignData.objective
    );

    if (!benchmarks) {
      throw new Error('Unable to get performance benchmarks');
    }

    const metrics: any = {};
    const keyMetrics = ['ctr', 'cpc', 'cpm', 'roas'];
    
    let totalScore = 0;
    let scoreCount = 0;

    for (const metric of keyMetrics) {
      const value = campaignData.performance[metric as keyof NormalizedPerformanceData] as number;
      const benchmark = benchmarks.median[metric as keyof NormalizedPerformanceData] as number;
      
      if (value && benchmark) {
        // Calculate percentile based on benchmark data
        const p25 = benchmarks.percentiles.p25[metric as keyof NormalizedPerformanceData] as number;
        const p50 = benchmarks.percentiles.p50[metric as keyof NormalizedPerformanceData] as number;
        const p75 = benchmarks.percentiles.p75[metric as keyof NormalizedPerformanceData] as number;
        const p90 = benchmarks.percentiles.p90[metric as keyof NormalizedPerformanceData] as number;

        let percentile = 50; // Default to median
        let status: 'excellent' | 'good' | 'average' | 'poor' = 'average';

        // For "lower is better" metrics like CPC, CPC
        if (metric === 'cpc' || metric === 'cpm') {
          if (value <= p25) { percentile = 90; status = 'excellent'; }
          else if (value <= p50) { percentile = 75; status = 'good'; }
          else if (value <= p75) { percentile = 50; status = 'average'; }
          else { percentile = 25; status = 'poor'; }
        } 
        // For "higher is better" metrics like CTR, ROAS
        else {
          if (value >= p90) { percentile = 90; status = 'excellent'; }
          else if (value >= p75) { percentile = 75; status = 'good'; }
          else if (value >= p50) { percentile = 50; status = 'average'; }
          else { percentile = 25; status = 'poor'; }
        }

        metrics[metric] = {
          value,
          benchmark,
          percentile,
          status
        };

        totalScore += percentile;
        scoreCount++;
      }
    }

    const overallScore = scoreCount > 0 ? totalScore / scoreCount : 0;

    // Generate recommendations based on performance
    const recommendations: string[] = [];
    
    if (metrics.ctr?.status === 'poor') {
      recommendations.push("CTR está abaixo da média. Considere testar novos títulos e descrições mais envolventes.");
    }
    if (metrics.cpc?.status === 'poor') {
      recommendations.push("CPC alto detectado. Otimize o targeting e teste diferentes formatos de anúncio.");
    }
    if (metrics.roas?.status === 'poor') {
      recommendations.push("ROAS baixo indica necessidade de revisão da estratégia de conversão e landing pages.");
    }

    if (overallScore >= 75) {
      recommendations.push("Performance excelente! Considere escalar o orçamento desta campanha.");
    } else if (overallScore <= 40) {
      recommendations.push("Performance precisa de atenção imediata. Considere pausar e otimizar antes de continuar.");
    }

    console.log(`✅ Performance comparison completed. Overall score: ${overallScore.toFixed(1)}`);

    return {
      overallScore,
      metrics,
      recommendations
    };
  }
}

// Singleton instance
export const campaignDataService = new CampaignDataService();