import fetch from "node-fetch";
import { db } from "./db";
import { 
  facebookCampaigns, 
  facebookAdAccounts,
  facebookBusinessManagers,
  type FacebookCampaign,
  type FacebookAdAccount,
  type FacebookBusinessManager,
  type InsertFacebookCampaign,
  type InsertFacebookAdAccount,
  type InsertFacebookBusinessManager
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

  async getBusinessManagers(): Promise<FacebookBusinessManager[]> {
    const businessManagers = await db.select().from(facebookBusinessManagers);
    return businessManagers;
  }

  async addBusinessManager(bmData: InsertFacebookBusinessManager): Promise<FacebookBusinessManager> {
    try {
      await this.validateBusinessManager(bmData.businessId, bmData.accessToken || "");
    } catch (error) {
      console.warn(`Business Manager validation failed for ${bmData.businessId}, proceeding anyway:`, error);
    }
    
    const [businessManager] = await db
      .insert(facebookBusinessManagers)
      .values(bmData)
      .returning();
    
    return businessManager;
  }

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
    
    // Limpar businessManagerId se estiver vazio para evitar violações de FK
    const cleanedData = {
      ...accountData,
      businessManagerId: accountData.businessManagerId || null
    };
    
    const [account] = await db
      .insert(facebookAdAccounts)
      .values(cleanedData)
      .returning();
    
    return account;
  }

  async getCampaigns(): Promise<FacebookCampaign[]> {
    const campaigns = await db.select().from(facebookCampaigns);
    return campaigns;
  }

  async getCampaignsWithPeriod(datePeriod: string = "last_30d"): Promise<any[]> {
    // Buscar contas ativas
    const accounts = await db.select().from(facebookAdAccounts).where(eq(facebookAdAccounts.isActive, true));
    
    if (accounts.length === 0) {
      return [];
    }

    const campaignsWithLiveData: any[] = [];

    for (const account of accounts) {
      if (!account.accessToken) {
        continue;
      }

      try {
        console.log(`Buscando campanhas ao vivo para período: ${datePeriod}`);
        // Buscar campanhas da API do Facebook com o período específico
        const liveCampaigns = await this.fetchCampaignsFromAPI(account.accountId, account.accessToken, datePeriod);
        
        // Para cada campanha da API, verificar se existe no banco e manter configurações locais
        for (const liveCampaign of liveCampaigns) {
          const existing = await db
            .select()
            .from(facebookCampaigns)
            .where(eq(facebookCampaigns.campaignId, liveCampaign.campaignId))
            .limit(1);

          // Usar dados ao vivo da API mas manter configurações locais (isSelected)
          campaignsWithLiveData.push({
            ...liveCampaign,
            id: existing[0]?.id || liveCampaign.campaignId,
            isSelected: existing[0]?.isSelected || false,
            lastSync: new Date()
          });
        }
      } catch (error) {
        console.error(`Erro ao buscar campanhas ao vivo para conta ${account.name}:`, error);
        // Em caso de erro, usar dados do banco como fallback
        const storedCampaigns = await db.select().from(facebookCampaigns);
        campaignsWithLiveData.push(...storedCampaigns);
      }
    }

    return campaignsWithLiveData;
  }

  async syncCampaigns(datePeriod: string = "last_30d"): Promise<{ synced: number; errors?: string[] }> {
    const accounts = await db.select().from(facebookAdAccounts).where(eq(facebookAdAccounts.isActive, true));
    
    if (accounts.length === 0) {
      throw new Error("Nenhuma conta do Facebook Ads configurada. Adicione uma conta primeiro.");
    }
    
    let syncedCount = 0;
    const errors: string[] = [];
    
    for (const account of accounts) {
      if (!account.accessToken) {
        errors.push(`Conta ${account.name}: Token de acesso não encontrado`);
        continue;
      }
      
      try {
        console.log(`Sincronizando campanhas para conta: ${account.name} (${account.accountId})`);
        const campaigns = await this.fetchCampaignsFromAPI(account.accountId, account.accessToken, datePeriod);
        
        for (const campaignData of campaigns) {
          // Check if campaign already exists
          const existing = await db
            .select()
            .from(facebookCampaigns)
            .where(eq(facebookCampaigns.campaignId, campaignData.campaignId))
            .limit(1);

          if (existing.length > 0) {
            // Update existing campaign
            await db
              .update(facebookCampaigns)
              .set({
                ...campaignData,
                updatedAt: new Date(),
                lastSync: new Date()
              })
              .where(eq(facebookCampaigns.campaignId, campaignData.campaignId));
          } else {
            // Insert new campaign
            await db
              .insert(facebookCampaigns)
              .values({
                ...campaignData,
                lastSync: new Date()
              });
          }
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

  async getBusinessManagerAccounts(businessId: string, accessToken: string): Promise<any[]> {
    const url = `${this.baseUrl}/${businessId}/owned_ad_accounts?access_token=${accessToken}&fields=id,name,account_status,currency,timezone_name`;
    
    console.log(`Buscando contas de anúncios do Business Manager: ${businessId}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Falha ao buscar contas do Business Manager: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json() as any;
    
    if (data.error) {
      throw new Error(`Erro da API do Facebook: ${data.error.message} (Código: ${data.error.code})`);
    }
    
    return data.data || [];
  }

  private async fetchCampaignsFromAPI(accountId: string, accessToken: string, datePeriod: string = "last_30d"): Promise<any[]> {
    // Ensure account ID has the 'act_' prefix for Facebook API
    const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    
    const url = `${this.baseUrl}/${formattedAccountId}/campaigns?access_token=${accessToken}&fields=id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time,start_time,stop_time,insights.date_preset(${datePeriod}){spend,impressions,clicks,cpm,cpc,ctr}`;
    
    console.log(`Buscando campanhas da API do Facebook para conta: ${formattedAccountId} (período: ${datePeriod})`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Falha ao buscar campanhas: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json() as any;
    
    if (data.error) {
      throw new Error(`Erro da API do Facebook: ${data.error.message} (Código: ${data.error.code})`);
    }
    
    const campaigns = data.data?.map((campaign: any) => ({
      campaignId: campaign.id,
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      dailyBudget: campaign.daily_budget ? (parseFloat(campaign.daily_budget) / 100).toString() : null,
      lifetimeBudget: campaign.lifetime_budget ? (parseFloat(campaign.lifetime_budget) / 100).toString() : null,
      amountSpent: campaign.insights?.data?.[0]?.spend || "0.00",
      impressions: parseInt(campaign.insights?.data?.[0]?.impressions || "0"),
      clicks: parseInt(campaign.insights?.data?.[0]?.clicks || "0"),
      cpm: campaign.insights?.data?.[0]?.cpm || "0.00",
      cpc: campaign.insights?.data?.[0]?.cpc || "0.00",
      ctr: campaign.insights?.data?.[0]?.ctr || "0.00",
      isSelected: false,
      startTime: campaign.start_time ? new Date(campaign.start_time) : null,
      endTime: campaign.stop_time ? new Date(campaign.stop_time) : null,
    })) || [];
    
    console.log(`Encontradas ${campaigns.length} campanhas para conta ${formattedAccountId} (período: ${datePeriod})`);
    return campaigns;
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

  private async validateBusinessManager(businessId: string, accessToken: string): Promise<void> {
    if (!accessToken) {
      throw new Error("Access token is required");
    }
    
    const url = `${this.baseUrl}/${businessId}?access_token=${accessToken}&fields=id,name`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to validate Business Manager: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json() as any;
    
    if (data.error) {
      throw new Error(`Facebook API Error: ${data.error.message} (Code: ${data.error.code})`);
    }
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