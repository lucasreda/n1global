import fetch from "node-fetch";
import { db } from "./db";
import { 
  facebookCampaigns, 
  facebookAdAccounts, 
  type FacebookCampaign,
  type FacebookAdAccount,
  type InsertFacebookCampaign,
  type InsertFacebookAdAccount
} from "@shared/schema";
import { eq } from "drizzle-orm";

interface FacebookApiCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  created_time?: string;
  start_time?: string;
  stop_time?: string;
  insights?: {
    data: Array<{
      impressions: string;
      clicks: string;
      spend: string;
      cpm: string;
      cpc: string;
      ctr: string;
    }>;
  };
}

interface FacebookApiAccount {
  id: string;
  name: string;
  account_status: string;
  currency: string;
  timezone_name: string;
}

export class FacebookAdsService {
  private baseUrl = "https://graph.facebook.com/v18.0";

  async getAdAccounts(): Promise<FacebookAdAccount[]> {
    const accounts = await db.select().from(facebookAdAccounts);
    return accounts;
  }

  async addAdAccount(accountData: InsertFacebookAdAccount): Promise<FacebookAdAccount> {
    // Verify the account exists and is accessible
    await this.validateAccount(accountData.accountId, accountData.accessToken || "");
    
    const [account] = await db
      .insert(facebookAdAccounts)
      .values(accountData)
      .returning();
    
    return account;
  }

  async getCampaigns(): Promise<FacebookCampaign[]> {
    const campaigns = await db.select().from(facebookCampaigns);
    return campaigns;
  }

  async syncCampaigns(): Promise<{ synced: number }> {
    const accounts = await db.select().from(facebookAdAccounts).where(eq(facebookAdAccounts.isActive, true));
    
    let syncedCount = 0;
    
    for (const account of accounts) {
      if (!account.accessToken) continue;
      
      try {
        const campaigns = await this.fetchCampaignsFromFacebook(account.accountId, account.accessToken);
        
        for (const campaignData of campaigns) {
          await this.upsertCampaign(campaignData);
          syncedCount++;
        }
        
        // Update last sync time
        await db
          .update(facebookAdAccounts)
          .set({ lastSync: new Date() })
          .where(eq(facebookAdAccounts.id, account.id));
          
      } catch (error) {
        console.error(`Failed to sync campaigns for account ${account.accountId}:`, error);
      }
    }
    
    return { synced: syncedCount };
  }

  async updateCampaignSelection(campaignId: string, isSelected: boolean): Promise<FacebookCampaign> {
    const [campaign] = await db
      .update(facebookCampaigns)
      .set({ 
        isSelected,
        updatedAt: new Date()
      })
      .where(eq(facebookCampaigns.id, campaignId))
      .returning();
      
    if (!campaign) {
      throw new Error("Campaign not found");
    }
    
    return campaign;
  }

  async getSelectedCampaignsSpend(): Promise<number> {
    const campaigns = await db
      .select()
      .from(facebookCampaigns)
      .where(eq(facebookCampaigns.isSelected, true));
      
    return campaigns.reduce((total, campaign) => {
      return total + parseFloat(campaign.amountSpent || "0");
    }, 0);
  }

  private async validateAccount(accountId: string, accessToken: string): Promise<void> {
    const url = `${this.baseUrl}/${accountId}?access_token=${accessToken}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to validate Facebook account: ${response.statusText}`);
    }
    
    const data = await response.json() as any;
    
    if (data.error) {
      throw new Error(`Facebook API Error: ${data.error.message}`);
    }
  }

  private async fetchCampaignsFromFacebook(accountId: string, accessToken: string): Promise<FacebookApiCampaign[]> {
    const fields = "id,name,status,objective,daily_budget,lifetime_budget,created_time,start_time,stop_time";
    const url = `${this.baseUrl}/${accountId}/campaigns?fields=${fields}&access_token=${accessToken}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
    }
    
    const data = await response.json() as any;
    
    if (data.error) {
      throw new Error(`Facebook API Error: ${data.error.message}`);
    }
    
    // Fetch insights for each campaign
    const campaignsWithInsights = await Promise.all(
      (data.data || []).map(async (campaign: any) => {
        try {
          const insights = await this.fetchCampaignInsights(campaign.id, accessToken);
          return { ...campaign, insights };
        } catch (error) {
          console.warn(`Failed to fetch insights for campaign ${campaign.id}:`, error);
          return campaign;
        }
      })
    );
    
    return campaignsWithInsights;
  }

  private async fetchCampaignInsights(campaignId: string, accessToken: string): Promise<any> {
    const fields = "impressions,clicks,spend,cpm,cpc,ctr";
    const url = `${this.baseUrl}/${campaignId}/insights?fields=${fields}&access_token=${accessToken}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  }

  private async upsertCampaign(campaignData: FacebookApiCampaign): Promise<void> {
    const insights = campaignData.insights?.data?.[0];
    
    const campaignRecord: InsertFacebookCampaign = {
      campaignId: campaignData.id,
      name: campaignData.name,
      status: campaignData.status,
      objective: campaignData.objective || null,
      dailyBudget: campaignData.daily_budget ? (parseFloat(campaignData.daily_budget) / 100).toString() : null,
      lifetimeBudget: campaignData.lifetime_budget ? (parseFloat(campaignData.lifetime_budget) / 100).toString() : null,
      amountSpent: insights?.spend ? (parseFloat(insights.spend)).toString() : "0",
      impressions: insights?.impressions ? parseInt(insights.impressions) : 0,
      clicks: insights?.clicks ? parseInt(insights.clicks) : 0,
      cpm: insights?.cpm || "0",
      cpc: insights?.cpc || "0",
      ctr: insights?.ctr || "0",
      startTime: campaignData.start_time ? new Date(campaignData.start_time) : null,
      endTime: campaignData.stop_time ? new Date(campaignData.stop_time) : null,
    };
    
    // Try to update existing campaign first
    const existingCampaign = await db
      .select()
      .from(facebookCampaigns)
      .where(eq(facebookCampaigns.campaignId, campaignData.id))
      .limit(1);
    
    if (existingCampaign.length > 0) {
      await db
        .update(facebookCampaigns)
        .set({
          ...campaignRecord,
          updatedAt: new Date(),
          lastSync: new Date(),
        })
        .where(eq(facebookCampaigns.campaignId, campaignData.id));
    } else {
      await db
        .insert(facebookCampaigns)
        .values({
          ...campaignRecord,
          lastSync: new Date(),
        });
    }
  }
}

export const facebookAdsService = new FacebookAdsService();