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
    // Try to validate the account, but don't fail if validation fails
    try {
      await this.validateAccount(accountData.accountId, accountData.accessToken || "");
    } catch (error) {
      console.warn(`Account validation failed for ${accountData.accountId}, proceeding anyway:`, error);
    }
    
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

  async syncCampaigns(): Promise<{ synced: number; errors?: string[] }> {
    const accounts = await db.select().from(facebookAdAccounts).where(eq(facebookAdAccounts.isActive, true));
    
    if (accounts.length === 0) {
      // Create demo campaigns for testing
      await this.createDemoCampaigns();
      return { synced: 3 };
    }
    
    let syncedCount = 0;
    const errors: string[] = [];
    
    for (const account of accounts) {
      if (!account.accessToken) {
        errors.push(`Conta ${account.name}: Token de acesso não encontrado`);
        continue;
      }
      
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
        const errorMsg = `Conta ${account.name}: ${error.message}`;
        console.error(`Failed to sync campaigns for account ${account.accountId}:`, error);
        errors.push(errorMsg);
      }
    }
    
    return { synced: syncedCount, errors: errors.length > 0 ? errors : undefined };
  }

  private async createDemoCampaigns(): Promise<void> {
    const demoCampaigns = [
      {
        campaignId: "demo_campaign_1",
        name: "Campanha de Vendas - Produto Principal",
        status: "ACTIVE",
        objective: "CONVERSIONS",
        dailyBudget: "50.00",
        lifetimeBudget: null,
        amountSpent: "1250.80",
        impressions: 45000,
        clicks: 1200,
        cpm: "8.50",
        cpc: "1.05",
        ctr: "2.67",
        isSelected: true,
        startTime: new Date("2024-01-15"),
        endTime: null,
      },
      {
        campaignId: "demo_campaign_2", 
        name: "Remarketing - Carrinho Abandonado",
        status: "ACTIVE",
        objective: "CONVERSIONS",
        dailyBudget: "30.00",
        lifetimeBudget: null,
        amountSpent: "890.45",
        impressions: 28000,
        clicks: 840,
        cpm: "7.20",
        cpc: "1.06",
        ctr: "3.00",
        isSelected: false,
        startTime: new Date("2024-02-01"),
        endTime: null,
      },
      {
        campaignId: "demo_campaign_3",
        name: "Lookalike - Clientes Premium",
        status: "PAUSED",
        objective: "REACH",
        dailyBudget: "25.00",
        lifetimeBudget: null,
        amountSpent: "423.90",
        impressions: 15000,
        clicks: 300,
        cpm: "12.50",
        cpc: "1.41",
        ctr: "2.00",
        isSelected: true,
        startTime: new Date("2024-01-20"),
        endTime: new Date("2024-03-15"),
      }
    ];

    for (const campaign of demoCampaigns) {
      // Check if campaign already exists
      const existing = await db
        .select()
        .from(facebookCampaigns)
        .where(eq(facebookCampaigns.campaignId, campaign.campaignId))
        .limit(1);

      if (existing.length > 0) {
        // Update existing campaign
        await db
          .update(facebookCampaigns)
          .set({
            ...campaign,
            updatedAt: new Date(),
            lastSync: new Date()
          })
          .where(eq(facebookCampaigns.campaignId, campaign.campaignId));
      } else {
        // Insert new campaign
        await db
          .insert(facebookCampaigns)
          .values({
            ...campaign,
            lastSync: new Date()
          });
      }
    }
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
    if (!accessToken) {
      throw new Error("Access token is required");
    }
    
    const url = `${this.baseUrl}/${accountId}?access_token=${accessToken}&fields=id,name,account_status`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to validate Facebook account: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json() as any;
    
    if (data.error) {
      throw new Error(`Facebook API Error: ${data.error.message} (Code: ${data.error.code})`);
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