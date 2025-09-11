import fetch from "node-fetch";
import { db } from "./db";
import { 
  facebookCampaigns, 
  facebookAdAccounts,
  facebookBusinessManagers,
  adCreatives,
  type FacebookCampaign,
  type FacebookAdAccount,
  type FacebookBusinessManager,
  type AdCreative,
  type InsertFacebookCampaign,
  type InsertFacebookAdAccount,
  type InsertFacebookBusinessManager,
  type InsertAdCreative
} from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { currencyService } from './currency-service';

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

interface FacebookApiAd {
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
    object_story_spec?: any;
    thumbnail_url?: string;
    image_url?: string;
    video_id?: string;
    call_to_action_type?: string;
    link_url?: string;
  };
  insights?: {
    data: Array<{
      impressions: string;
      clicks: string;
      spend: string;
      cpm: string;
      cpc: string;
      ctr: string;
      conversions?: string;
      cost_per_conversion?: string;
    }>;
  };
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

  async getCampaignsWithPeriod(datePeriod: string = "maximum", storeId?: string, operationId?: string, preloadedRates?: any): Promise<any[]> {
    // CRITICAL: Use unified adAccounts table with operation isolation
    const { adAccounts } = await import("@shared/schema");
    const { and } = await import("drizzle-orm");
    
    let whereConditions = [
      eq(adAccounts.network, 'facebook'),
      eq(adAccounts.isActive, true)
    ];
    
    // Add operation isolation if operationId provided (preferred)
    if (operationId) {
      whereConditions.push(eq(adAccounts.operationId, operationId));
    } else if (storeId) {
      // Fallback to store isolation for backward compatibility
      whereConditions.push(eq(adAccounts.storeId, storeId));
    }
    
    const accounts = await db
      .select()
      .from(adAccounts)
      .where(and(...whereConditions));
    
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
          const { campaigns } = await import("@shared/schema");
          
          const existing = await db
            .select()
            .from(campaigns)
            .where(and(
              eq(campaigns.campaignId, liveCampaign.campaignId),
              eq(campaigns.accountId, account.accountId),
              eq(campaigns.network, 'facebook')
            ))
            .limit(1);

          // Converter valores para a moeda base configurada da conta
          const baseCurrency = account.baseCurrency || 'BRL';
          const originalCurrency = account.currency || 'EUR'; // Moeda retornada pela API do Facebook
          const originalAmount = parseFloat(liveCampaign.amountSpent || "0");
          
          let convertedAmount = originalAmount;
          
          // Para contas configuradas como BRL, assumir que os valores já estão em BRL
          if (baseCurrency === 'BRL') {
            // Não fazer conversão - os valores já são considerados em BRL
            convertedAmount = originalAmount;
          } else {
            // OTIMIZAÇÃO: Para outras moedas base (USD, EUR), usar taxas pré-carregadas
            const brlValue = preloadedRates 
              ? currencyService.convertToBRLSync(originalAmount, originalCurrency, preloadedRates)
              : await currencyService.convertToBRL(originalAmount, originalCurrency);
            convertedAmount = preloadedRates 
              ? currencyService.convertFromBRLSync(brlValue, baseCurrency, preloadedRates)
              : await currencyService.convertFromBRL(brlValue, baseCurrency);
          }

          // Calcular valor em BRL para o total consolidado
          let amountSpentBRL = originalAmount;
          
          // Para contas BRL, o valor já está em BRL - não converter
          if (baseCurrency === 'BRL') {
            amountSpentBRL = originalAmount;
          } else if (originalCurrency !== 'BRL') {
            // OTIMIZAÇÃO: Para outras contas, usar taxas pré-carregadas
            amountSpentBRL = preloadedRates 
              ? currencyService.convertToBRLSync(originalAmount, originalCurrency, preloadedRates)
              : await currencyService.convertToBRL(originalAmount, originalCurrency);
          }

          // Usar dados ao vivo da API mas manter configurações locais (isSelected)
          campaignsWithLiveData.push({
            ...liveCampaign,
            id: existing[0]?.id || liveCampaign.campaignId,
            isSelected: existing[0]?.isSelected || false,
            accountId: account.accountId, // Adicionar ID da conta
            accountName: account.name, // Adicionar nome da conta
            baseCurrency: baseCurrency, // Moeda base configurada
            amountSpent: amountSpentBRL.toFixed(2), // SEMPRE em BRL (valor principal)
            amountSpentBRL: amountSpentBRL.toFixed(2), // Valor em BRL para total consolidado
            originalAmountSpent: convertedAmount.toFixed(2), // Valor na moeda configurada da conta
            originalCurrency: baseCurrency, // Moeda configurada da conta
            facebookAmountSpent: liveCampaign.amountSpent, // Valor real da API do Facebook
            facebookCurrency: originalCurrency, // Moeda real da API do Facebook
            lastSync: new Date()
          });
        }
      } catch (error) {
        console.error(`Erro ao buscar campanhas ao vivo para conta ${account.name}:`, error);
        // Em caso de erro, usar dados do banco como fallback
        const { campaigns } = await import("@shared/schema");
        const storedCampaigns = await db
          .select()
          .from(campaigns)
          .where(and(
            eq(campaigns.accountId, account.accountId),
            eq(campaigns.network, 'facebook')
          ));
        campaignsWithLiveData.push(...storedCampaigns);
      }
    }

    return campaignsWithLiveData;
  }

  async syncCampaigns(datePeriod: string = "maximum", storeId?: string, operationId?: string): Promise<{ synced: number; errors?: string[] }> {
    // CRITICAL: Use unified adAccounts table with operation isolation
    const { adAccounts } = await import("@shared/schema");
    const { and } = await import("drizzle-orm");
    
    let whereConditions = [
      eq(adAccounts.network, 'facebook'),
      eq(adAccounts.isActive, true)
    ];
    
    // Add operation isolation if operationId provided (preferred)
    if (operationId) {
      whereConditions.push(eq(adAccounts.operationId, operationId));
    } else if (storeId) {
      // Fallback to store isolation for backward compatibility
      whereConditions.push(eq(adAccounts.storeId, storeId));
    }
    
    const accounts = await db
      .select()
      .from(adAccounts)
      .where(and(...whereConditions));
    
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
          const { campaigns: campaignsTable } = await import("@shared/schema");
          
          // Check if campaign already exists
          const existing = await db
            .select()
            .from(campaignsTable)
            .where(and(
              eq(campaignsTable.campaignId, campaignData.campaignId),
              eq(campaignsTable.accountId, account.accountId),
              eq(campaignsTable.network, 'facebook')
            ))
            .limit(1);

          if (existing.length > 0) {
            // Update existing campaign - preserve isSelected state
            const { isSelected: _, ...updateData } = campaignData; // Remove isSelected from API data
            await db
              .update(campaignsTable)
              .set({
                ...updateData,
                network: 'facebook',
                accountId: account.accountId,
                updatedAt: new Date(),
                lastSync: new Date()
                // isSelected is NOT updated here - preserving user selection
              })
              .where(and(
                eq(campaignsTable.campaignId, campaignData.campaignId),
                eq(campaignsTable.accountId, account.accountId),
                eq(campaignsTable.network, 'facebook')
              ));
          } else {
            // Insert new campaign
            await db
              .insert(campaignsTable)
              .values({
                ...campaignData,
                network: 'facebook',
                accountId: account.accountId,
                lastSync: new Date()
              });
          }
          syncedCount++;
        }
        
        // Update last sync time
        await db
          .update(adAccounts)
          .set({ lastSync: new Date() })
          .where(eq(adAccounts.id, account.id));
          
      } catch (error) {
        const errorMsg = `Conta ${account.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
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

  private async fetchCampaignsFromAPI(accountId: string, accessToken: string, datePeriod: string = "maximum"): Promise<any[]> {
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
      accountId: accountId, // Adicionar o ID da conta
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
      isSelected: false, // Default for new campaigns only
      startTime: campaign.start_time ? new Date(campaign.start_time) : null,
      endTime: campaign.stop_time ? new Date(campaign.stop_time) : null,
    })) || [];
    
    console.log(`Encontradas ${campaigns.length} campanhas para conta ${formattedAccountId} (período: ${datePeriod})`);
    return campaigns;
  }

  async updateCampaignSelection(campaignId: string, isSelected: boolean): Promise<any> {
    const { campaigns } = await import("@shared/schema");
    
    const [campaign] = await db
      .update(campaigns)
      .set({ 
        isSelected,
        updatedAt: new Date()
      })
      .where(eq(campaigns.id, campaignId))
      .returning();
      
    if (!campaign) {
      throw new Error("Campaign not found");
    }
    
    return campaign;
  }

  async getSelectedCampaignsSpend(): Promise<number> {
    const { campaigns } = await import("@shared/schema");
    const { and, eq } = await import("drizzle-orm");
    const campaignsList = await db
      .select()
      .from(campaigns)
      .where(and(
        eq(campaigns.isSelected, true),
        eq(campaigns.network, 'facebook')
      ));
      
    return campaignsList.reduce((total, campaign) => {
      return total + parseFloat(campaign.amountSpent || "0");
    }, 0);
  }

  async getMarketingCostsByPeriod(period: string = "maximum", storeId?: string | null, operationId?: string | null, preloadedRates?: any): Promise<{ totalBRL: number; totalEUR: number; campaigns: any[] }> {
    // Buscar campanhas selecionadas e seus dados ao vivo para o período específico, filtradas por operação ou store
    const { campaigns, adAccounts } = await import("@shared/schema");
    const { and, eq, inArray, isNull } = await import("drizzle-orm");
    
    let selectedCampaigns;
    
    if (operationId) {
      // First get adAccount IDs for this operation (preferred method)
      const operationAdAccounts = await db
        .select({ accountId: adAccounts.accountId })
        .from(adAccounts)
        .where(and(
          eq(adAccounts.operationId, operationId),
          eq(adAccounts.network, 'facebook'),
          eq(adAccounts.isActive, true)
        ));
      
      const accountIds = operationAdAccounts.map(acc => acc.accountId);
      
      console.log(`🔍 Debug: operationId ${operationId} - Encontradas ${operationAdAccounts.length} contas, accountIds: [${accountIds.join(', ')}]`);
      
      if (accountIds.length === 0) {
        console.log(`💰 Nenhuma conta Facebook encontrada para operação ${operationId} - retornando custos zero`);
        return { totalBRL: 0, totalEUR: 0, campaigns: [] };
      }
      
      // Then get campaigns for those accounts
      selectedCampaigns = await db
        .select()
        .from(campaigns)
        .where(and(
          eq(campaigns.isSelected, true),
          eq(campaigns.network, 'facebook'),
          inArray(campaigns.accountId, accountIds)
        ));
    } else if (storeId) {
      // Fallback: get adAccount IDs for this store (but prefer operationId)
      const storeAdAccounts = await db
        .select({ accountId: adAccounts.accountId })
        .from(adAccounts)
        .where(and(
          eq(adAccounts.storeId, storeId),
          eq(adAccounts.network, 'facebook'),
          eq(adAccounts.isActive, true)
        ));
      
      const accountIds = storeAdAccounts.map(acc => acc.accountId);
      
      console.log(`🔍 Debug fallback: storeId ${storeId} - Encontradas ${storeAdAccounts.length} contas, accountIds: [${accountIds.join(', ')}]`);
      
      if (accountIds.length === 0) {
        console.log(`💰 Nenhuma conta Facebook encontrada para store ${storeId} - retornando custos zero`);
        return { totalBRL: 0, totalEUR: 0, campaigns: [] };
      }
      
      // Then get campaigns for those accounts
      selectedCampaigns = await db
        .select()
        .from(campaigns)
        .where(and(
          eq(campaigns.isSelected, true),
          eq(campaigns.network, 'facebook'),
          inArray(campaigns.accountId, accountIds)
        ));
    } else {
      // No filter - get all selected campaigns
      selectedCampaigns = await db
        .select()
        .from(campaigns)
        .where(and(
          eq(campaigns.isSelected, true),
          eq(campaigns.network, 'facebook')
        ));
    }
    
    console.log(`💰 Calculando custos de marketing para ${selectedCampaigns.length} campanhas selecionadas (período: ${period})`);
    
    let totalBRL = 0;
    let totalEUR = 0;
    
    // 🚀 OTIMIZAÇÃO CRÍTICA: Agrupar campanhas por conta e fazer chamadas paralelas
    const campaignsByAccount = new Map<string, typeof selectedCampaigns>();
    for (const campaign of selectedCampaigns) {
      const accountId = campaign.accountId || "";
      if (!campaignsByAccount.has(accountId)) {
        campaignsByAccount.set(accountId, []);
      }
      campaignsByAccount.get(accountId)!.push(campaign);
    }
    
    console.log(`🚀 Processando ${campaignsByAccount.size} contas em paralelo...`);
    
    // Buscar informações de todas as contas necessárias de uma vez
    const { adAccounts: adAccountsSchema } = await import("@shared/schema");
    const accountIds = Array.from(campaignsByAccount.keys());
    const accounts = await db
      .select()
      .from(adAccountsSchema)
      .where(and(
        inArray(adAccountsSchema.accountId, accountIds),
        eq(adAccountsSchema.network, 'facebook')
      ));
    
    // Criar mapa de contas para acesso rápido
    const accountMap = new Map(accounts.map(acc => [acc.accountId, acc]));
    
    // 🚀 PARALELIZAÇÃO: Processar todas as contas simultaneamente
    const accountPromises = Array.from(campaignsByAccount.entries()).map(async ([accountId, accountCampaigns]) => {
      const account = accountMap.get(accountId);
      
      if (!account?.accessToken) {
        console.warn(`Account ${accountId} has no access token, skipping ${accountCampaigns.length} campaigns`);
        return { totalBRL: 0, totalEUR: 0 };
      }
      
      let accountTotalBRL = 0;
      let accountTotalEUR = 0;
      
      try {
        // Uma única chamada à API para todas as campanhas desta conta
        const liveCampaigns = await this.fetchCampaignsFromAPI(account.accountId, account.accessToken, period);
        
        for (const campaign of accountCampaigns) {
          let liveAmount = 0;
          
          try {
            const liveCampaign = liveCampaigns.find(c => c.campaignId === campaign.campaignId);
            
            if (liveCampaign) {
              const originalAmount = parseFloat(liveCampaign.amountSpent || "0");
              const baseCurrency = account.baseCurrency || "BRL";
              
              // Para contas BRL, valor já está em BRL. Para USD, converter para BRL
              if (baseCurrency === "BRL") {
                liveAmount = originalAmount;
              } else {
                // OTIMIZAÇÃO: Converter de EUR usando taxas pré-carregadas
                liveAmount = preloadedRates 
                  ? currencyService.convertToBRLSync(originalAmount, "EUR", preloadedRates)
                  : await currencyService.convertToBRL(originalAmount, "EUR");
              }
              
              console.log(`💰 Campanha: ${campaign.name}, Valor: ${liveAmount} BRL (período: ${period}), Conta Base: ${baseCurrency}, Account ID: ${campaign.accountId}`);
            } else {
              // Fallback para dados armazenados
              liveAmount = parseFloat(campaign.amountSpent || "0");
              console.log(`💰 Campanha: ${campaign.name}, Valor: ${liveAmount} BRL (dados armazenados), Account ID: ${campaign.accountId}`);
            }
          } catch (error) {
            console.warn(`Failed to process campaign ${campaign.name}, using stored data:`, error);
            liveAmount = parseFloat(campaign.amountSpent || "0");
          }
          
          accountTotalBRL += liveAmount;
          
          // OTIMIZAÇÃO: Para EUR, usar taxas pré-carregadas
          const eurValue = preloadedRates 
            ? currencyService.convertFromBRLSync(liveAmount, 'EUR', preloadedRates)
            : await currencyService.convertFromBRL(liveAmount, 'EUR');
          accountTotalEUR += eurValue;
        }
      } catch (error) {
        console.error(`💰 Erro ao processar conta ${accountId}:`, error);
        // Fallback para dados armazenados de todas as campanhas da conta
        for (const campaign of accountCampaigns) {
          const liveAmount = parseFloat(campaign.amountSpent || "0");
          accountTotalBRL += liveAmount;
          const eurValue = preloadedRates 
            ? currencyService.convertFromBRLSync(liveAmount, 'EUR', preloadedRates)
            : await currencyService.convertFromBRL(liveAmount, 'EUR');
          accountTotalEUR += eurValue;
        }
      }
      
      return { totalBRL: accountTotalBRL, totalEUR: accountTotalEUR };
    });
    
    // 🚀 Aguardar todas as contas em paralelo
    const accountResults = await Promise.all(accountPromises);
    
    // Somar todos os resultados
    for (const result of accountResults) {
      totalBRL += result.totalBRL;
      totalEUR += result.totalEUR;
    }
    
    console.log(`💰 Total calculado: BRL ${totalBRL.toFixed(2)}, EUR ${totalEUR.toFixed(2)}`);
    
    return {
      totalBRL: Math.round(totalBRL * 100) / 100,
      totalEUR: Math.round(totalEUR * 100) / 100,
      campaigns: selectedCampaigns
    };
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

  async fetchCreativesForCampaigns(
    accountId: string, 
    accessToken: string, 
    campaignIds: string[], 
    datePeriod: string = "maximum",
    operationId: string
  ): Promise<AdCreative[]> {
    try {
      console.log(`🎨 Fetching creatives for account ${accountId}, campaigns: ${campaignIds.join(',')}, period: ${datePeriod}`);
      
      // Build the filter for campaign IDs
      const campaignFilter = campaignIds.length > 0 
        ? `&filtering=[{"field":"campaign_id","operator":"IN","value":${JSON.stringify(campaignIds)}}]`
        : '';
      
      // If no campaigns specified, log that we're fetching ALL ads
      if (campaignIds.length === 0) {
        console.log(`🎨 Fetching ALL ads for account ${accountId} (no campaign filter)`);
      }
      
      // Fetch ads with creative data and insights - removed effective_status filter to get all ads
      const fields = [
        'id',
        'name',
        'status',
        'campaign_id',
        'adset_id',
        'creative{id,name,title,body,object_story_spec,thumbnail_url,image_url,video_id,call_to_action_type,link_url}',
        `insights.date_preset(${datePeriod}){impressions,clicks,spend,cpm,cpc,ctr,conversions,cost_per_conversion,actions,action_values}`
      ].join(',');
      
      // Remove effective_status filter to get all ads, not just active ones
      const url = `${this.baseUrl}/act_${accountId}/ads?fields=${fields}${campaignFilter}&limit=500&access_token=${accessToken}`;
      
      console.log(`🎨 Facebook API URL: ${url.replace(accessToken, 'HIDDEN')}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🎨 Facebook API error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to fetch ads: ${response.statusText}`);
      }
      
      const data = await response.json() as { data: FacebookApiAd[] };
      
      console.log(`🎨 Facebook API returned ${data.data?.length || 0} ads`);
      
      // Process and upsert creative data
      const creatives: AdCreative[] = [];
      
      for (const ad of data.data || []) {
        console.log(`🎨 Processing ad ${ad.id} from campaign ${ad.campaign_id}`);
        const creative = await this.upsertCreative(ad, operationId, accountId, datePeriod);
        if (creative) {
          creatives.push(creative);
        }
      }
      
      console.log(`🎨 Successfully processed ${creatives.length} creatives`);
      return creatives;
    } catch (error) {
      console.error('Error fetching creatives:', error);
      throw error;
    }
  }

  async getBestCreatives(
    operationId: string, 
    filters?: {
      accountId?: string;
      campaignIds?: string[];
      period?: string;
      minImpressions?: number;
      limit?: number;
    }
  ): Promise<AdCreative[]> {
    const { desc, gte } = await import("drizzle-orm");
    
    let whereConditions: any[] = [
      eq(adCreatives.operationId, operationId),
      eq(adCreatives.network, 'facebook')
    ];
    
    if (filters?.accountId) {
      whereConditions.push(eq(adCreatives.accountId, filters.accountId));
    }
    
    if (filters?.campaignIds && filters.campaignIds.length > 0) {
      whereConditions.push(inArray(adCreatives.campaignId, filters.campaignIds));
    }
    
    if (filters?.minImpressions) {
      whereConditions.push(gte(adCreatives.impressions, filters.minImpressions));
    }
    
    const creatives = await db
      .select()
      .from(adCreatives)
      .where(and(...whereConditions))
      .orderBy(
        desc(adCreatives.ctr),
        adCreatives.cpc
      )
      .limit(filters?.limit || 50);
    
    return creatives;
  }

  private extractConversions(insights: any): number {
    // Tenta extrair conversões de diferentes campos da API do Facebook
    if (insights?.conversions) {
      return parseInt(insights.conversions);
    }
    
    // Verifica no campo actions para diferentes tipos de conversão
    if (insights?.actions && Array.isArray(insights.actions)) {
      for (const action of insights.actions) {
        // Procura por ações de conversão comuns
        if (action.action_type?.includes('conversion') || 
            action.action_type === 'purchase' ||
            action.action_type === 'lead' ||
            action.action_type === 'complete_registration') {
          return parseInt(action.value || '0');
        }
      }
    }
    
    return 0; // Sem conversões encontradas
  }

  private async upsertCreative(ad: FacebookApiAd, operationId: string, accountId: string, period: string): Promise<AdCreative | null> {
    try {
      const insights = ad.insights?.data?.[0];
      const creative = ad.creative;
      
      
      if (!creative) {
        return null;
      }
      
      // Extract text from object_story_spec if available
      let primaryText = creative.body;
      let headline = creative.title;
      let linkUrl = creative.link_url;
      
      if (creative.object_story_spec) {
        const spec = creative.object_story_spec;
        if (spec.link_data) {
          primaryText = spec.link_data.message || primaryText;
          headline = spec.link_data.name || headline;
          linkUrl = spec.link_data.link || linkUrl;
        } else if (spec.video_data) {
          primaryText = spec.video_data.message || primaryText;
          headline = spec.video_data.title || headline;
          linkUrl = spec.video_data.call_to_action?.value?.link || linkUrl;
        }
      }
      
      // Determine creative type and extract URLs
      let type: string = 'unknown';
      let videoUrl: string | null = null;
      let imageUrl: string | null = null;
      
      // Check for video in object_story_spec.video_data
      if (creative.object_story_spec?.video_data?.video_id) {
        type = 'video';
        videoUrl = `https://www.facebook.com/video.php?v=${creative.object_story_spec.video_data.video_id}`;
        // Use image_url from video_data as thumbnail if available
        imageUrl = creative.object_story_spec.video_data.image_url || creative.image_url || null;
      } 
      // Check for direct video_id (backup method)
      else if (creative.video_id) {
        type = 'video';
        videoUrl = `https://www.facebook.com/video.php?v=${creative.video_id}`;
      } 
      // Check for image
      else if (creative.image_url) {
        type = 'image';
        imageUrl = creative.image_url;
      } 
      // Check for carousel
      else if (creative.object_story_spec?.link_data?.child_attachments) {
        type = 'carousel';
      }
      
      // Convert spend to base currency if needed
      let spend = insights?.spend ? parseFloat(insights.spend) : 0;
      
      const creativeData: InsertAdCreative = {
        operationId,
        network: 'facebook',
        accountId,
        campaignId: ad.campaign_id,
        adId: ad.id,
        creativeId: creative.id,
        name: ad.name,
        status: ad.status.toLowerCase(),
        type,
        thumbnailUrl: creative.thumbnail_url || null,
        imageUrl: imageUrl,
        videoUrl: videoUrl,
        primaryText: primaryText || null,
        headline: headline || null,
        description: null, // Facebook doesn't always provide this separately
        linkUrl: linkUrl || null,
        ctaType: creative.call_to_action_type || null,
        period,
        impressions: insights?.impressions ? parseInt(insights.impressions) : 0,
        clicks: insights?.clicks ? parseInt(insights.clicks) : 0,
        spend: spend.toString(),
        cpm: insights?.cpm || "0",
        cpc: insights?.cpc || "0",
        ctr: insights?.ctr || "0",
        conversions: this.extractConversions(insights),
        conversionRate: "0", // Calculate if needed
        roas: "0", // Calculate if needed
        providerData: ad
      };
      
      // Check if creative exists
      const existing = await db
        .select()
        .from(adCreatives)
        .where(eq(adCreatives.adId, ad.id))
        .limit(1);
      
      if (existing.length > 0) {
        // Update existing
        await db
          .update(adCreatives)
          .set({
            ...creativeData,
            updatedAt: new Date()
          })
          .where(eq(adCreatives.adId, ad.id));
        
        return existing[0];
      } else {
        // Insert new - mark as new creative
        const [newCreative] = await db
          .insert(adCreatives)
          .values({
            ...creativeData,
            isNew: true
          })
          .returning();
        
        return newCreative;
      }
    } catch (error) {
      console.error('Error upserting creative:', error, ad);
      return null;
    }
  }

  private async upsertCampaign(campaignData: FacebookApiCampaign): Promise<void> {
    const insights = campaignData.insights?.data?.[0];
    
    const campaignRecord: InsertFacebookCampaign = {
      campaignId: campaignData.id,
      accountId: (campaignData as any).accountId || "",
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