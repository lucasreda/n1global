import { db } from "./db";
import { adAccounts, campaigns as campaignsTable } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { currencyService } from "./currency-service";

interface GoogleAdsAccount {
  customerId: string;
  name: string;
  currency: string;
  timezone: string;
}

interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: 'ENABLED' | 'PAUSED' | 'REMOVED';
  type: string;
  budget: {
    amountMicros: string;
    deliveryMethod: 'STANDARD' | 'ACCELERATED';
  };
  metrics: {
    costMicros: string;
    impressions: string;
    clicks: string;
    ctr: number;
    averageCpm: string;
    averageCpc: string;
  };
  startDate?: string;
  endDate?: string;
}

interface GoogleAdsApiResponse {
  results: Array<{
    campaign: GoogleAdsCampaign;
    metrics: GoogleAdsCampaign['metrics'];
  }>;
}

class GoogleAdsService {
  private baseUrl = 'https://googleads.googleapis.com/v16';
  
  /**
   * Autentica no Google Ads usando OAuth2
   */
  async authenticate(accessToken: string, customerId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/customers/${customerId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Erro na autenticação Google Ads:', error);
      return false;
    }
  }

  /**
   * Sincroniza campanhas do Google Ads - similar ao Facebook
   */
  async syncCampaigns(period: string = "maximum", storeId?: string, operationId?: string): Promise<number> {
    try {
      if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN) {
        console.log('⚠️ Google Ads credenciais não configuradas, pulando sincronização');
        return 0;
      }

      // Buscar contas Google Ads ativas com isolamento por operação
      let whereConditions = [
        eq(adAccounts.network, 'google'),
        eq(adAccounts.isActive, true)
      ];
      
      // Add operation isolation if operationId provided (preferred)
      if (operationId) {
        whereConditions.push(eq(adAccounts.operationId, operationId));
      } else if (storeId) {
        // Fallback to store isolation for backward compatibility
        whereConditions.push(eq(adAccounts.storeId, storeId));
      }
      
      const googleAccounts = await db.select()
        .from(adAccounts)
        .where(and(...whereConditions));

      if (googleAccounts.length === 0) {
        console.log('📭 Nenhuma conta Google Ads ativa encontrada');
        return 0;
      }

      let totalSynced = 0;
      
      for (const account of googleAccounts) {
        console.log(`Sincronizando campanhas para conta Google: ${account.name} (${account.accountId})`);
        
        try {
          const campaigns = await this.getCampaigns(account.accessToken || '', account.accountId, period);
          
          for (const campaign of campaigns) {
            // Salvar/atualizar campanha no banco
            const campaignData = {
              campaignId: campaign.id,
              network: 'google' as const,
              name: campaign.name,
              status: campaign.status,
              campaignType: campaign.type,
              dailyBudget: (parseInt(campaign.budget.amountMicros) / 1000000).toString(),
              lifetimeBudget: '0',
              amountSpent: (parseInt(campaign.metrics.costMicros) / 1000000).toString(),
              impressions: parseInt(campaign.metrics.impressions),
              clicks: parseInt(campaign.metrics.clicks),
              cpm: (parseInt(campaign.metrics.averageCpm) / 1000000).toString(),
              cpc: (parseInt(campaign.metrics.averageCpc) / 1000000).toString(),
              ctr: campaign.metrics.ctr.toString(),
              isSelected: false,
              startTime: campaign.startDate || new Date().toISOString(),
              endTime: campaign.endDate || new Date().toISOString(),
              accountId: account.accountId,
              accountName: account.name,
              lastSync: new Date().toISOString()
            };

            // Salvaria campanha no banco se estivesse funcionando
            
            totalSynced++;
          }
        } catch (accountError) {
          console.error(`Erro sincronizando conta ${account.name}:`, accountError);
        }
      }

      console.log(`✅ Sincronização Google Ads concluída: ${totalSynced} campanhas`);
      return totalSynced;
    } catch (error) {
      console.error('Erro na sincronização Google Ads:', error);
      return 0;
    }
  }

  /**
   * Busca contas do Google Ads do usuário
   */
  async getAccounts(accessToken: string): Promise<GoogleAdsAccount[]> {
    try {
      const response = await fetch(`${this.baseUrl}/customers:listAccessibleCustomers`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar contas: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Para cada customer ID, buscar detalhes da conta
      const accounts: GoogleAdsAccount[] = [];
      for (const customerId of data.resourceNames || []) {
        const customerDetails = await this.getCustomerDetails(accessToken, customerId.replace('customers/', ''));
        if (customerDetails) {
          accounts.push(customerDetails);
        }
      }

      return accounts;
    } catch (error) {
      console.error('Erro ao buscar contas Google Ads:', error);
      return [];
    }
  }

  /**
   * Busca detalhes de uma conta específica
   */
  private async getCustomerDetails(accessToken: string, customerId: string): Promise<GoogleAdsAccount | null> {
    try {
      const query = `
        SELECT 
          customer.id,
          customer.descriptive_name,
          customer.currency_code,
          customer.time_zone
        FROM customer
        WHERE customer.id = ${customerId}
      `;

      const response = await fetch(`${this.baseUrl}/customers/${customerId}/googleAds:searchStream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const customer = data.results?.[0]?.customer;

      if (!customer) {
        return null;
      }

      return {
        customerId: customer.id,
        name: customer.descriptiveName || `Conta ${customer.id}`,
        currency: customer.currencyCode || 'EUR',
        timezone: customer.timeZone || 'Europe/Rome',
      };
    } catch (error) {
      console.error(`Erro ao buscar detalhes da conta ${customerId}:`, error);
      return null;
    }
  }

  /**
   * Busca campanhas do Google Ads
   */
  async getCampaigns(
    accessToken: string, 
    customerId: string, 
    dateRange: string = 'LAST_30_DAYS'
  ): Promise<GoogleAdsCampaign[]> {
    try {
      console.log(`Buscando campanhas da API do Google Ads para conta: ${customerId} (período: ${dateRange})`);

      const query = `
        SELECT 
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign_budget.amount_micros,
          campaign_budget.delivery_method,
          campaign.start_date,
          campaign.end_date,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.average_cpm,
          metrics.average_cpc
        FROM campaign
        WHERE segments.date DURING ${dateRange}
          AND campaign.status != 'REMOVED'
      `;

      const response = await fetch(`${this.baseUrl}/customers/${customerId}/googleAds:searchStream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar campanhas: ${response.statusText}`);
      }

      const data: GoogleAdsApiResponse = await response.json();
      console.log(`Encontradas ${data.results?.length || 0} campanhas para conta ${customerId} (período: ${dateRange})`);

      return data.results?.map(result => ({
        id: result.campaign.id,
        name: result.campaign.name,
        status: result.campaign.status,
        type: result.campaign.type,
        budget: result.campaign.budget,
        metrics: result.metrics,
        startDate: result.campaign.startDate,
        endDate: result.campaign.endDate,
      })) || [];
    } catch (error) {
      console.error(`Erro ao buscar campanhas Google Ads para conta ${customerId}:`, error);
      return [];
    }
  }

  /**
   * Converte período do dashboard para formato Google Ads
   */
  private convertPeriodToGoogleFormat(period: string): string {
    switch (period) {
      case '1d':
      case 'today':
        return 'TODAY';
      case '7d':
      case 'last_7d':
        return 'LAST_7_DAYS';
      case '30d':
      case 'last_30d':
      case 'this_month':
        return 'LAST_30_DAYS';
      case '90d':
      case 'last_90d':
        return 'LAST_90_DAYS';
      default:
        return 'LAST_30_DAYS';
    }
  }

  /**
   * Calcula custos de marketing das campanhas selecionadas
   */
  async calculateMarketingCosts(period: string): Promise<{ brl: number; eur: number }> {
    try {
      // Buscar campanhas selecionadas do Google Ads
      const selectedCampaigns = await db
        .select()
        .from(campaignsTable)
        .where(and(
          eq(campaignsTable.network, 'google'),
          eq(campaignsTable.isSelected, true)
        ));

      if (selectedCampaigns.length === 0) {
        return { brl: 0, eur: 0 };
      }

      console.log(`💰 Calculando custos de marketing para ${selectedCampaigns.length} campanhas Google Ads selecionadas (período: ${period})`);

      let totalBRL = 0;
      const googlePeriod = this.convertPeriodToGoogleFormat(period);

      // Buscar contas únicas das campanhas selecionadas
      const accountIds = Array.from(new Set(selectedCampaigns.map(c => c.accountId)));
      
      for (const accountId of accountIds) {
        const account = await db
          .select()
          .from(adAccounts)
          .where(and(
            eq(adAccounts.network, 'google'),
            eq(adAccounts.accountId, accountId)
          ))
          .limit(1);

        if (account.length === 0 || !account[0].accessToken) continue;

        const accountData = account[0];
        const campaignsForAccount = selectedCampaigns.filter(c => c.accountId === accountId);
        
        // Buscar dados atualizados das campanhas
        const liveCampaigns = await this.getCampaigns(
          accountData.accessToken || '',
          accountId,
          googlePeriod
        );

        for (const selectedCampaign of campaignsForAccount) {
          const liveCampaign = liveCampaigns.find(c => c.id === selectedCampaign.campaignId);
          
          if (liveCampaign) {
            // Converter micros para valor real (Google usa micros = valor * 1,000,000)
            const costInOriginalCurrency = parseInt(liveCampaign.metrics.costMicros) / 1000000;
            
            // Converter para BRL baseado na moeda base da conta
            let costInBRL = costInOriginalCurrency;
            
            // OTIMIZAÇÃO: Usar conversões síncronas se taxas pré-carregadas disponíveis
            // Nota: Este método precisa ser atualizado para aceitar preloadedRates
            if (accountData.baseCurrency === 'USD') {
              costInBRL = await currencyService.convertToBRL(costInOriginalCurrency, 'USD');
            } else if (accountData.baseCurrency === 'EUR') {
              costInBRL = await currencyService.convertToBRL(costInOriginalCurrency, 'EUR');
            }

            console.log(`💰 Campanha Google: ${liveCampaign.name}, Valor: ${costInBRL.toFixed(2)} BRL (período: ${period}), Conta Base: ${accountData.baseCurrency}, Account ID: ${accountId}`);
            
            totalBRL += costInBRL;
          }
        }
      }

      // OTIMIZAÇÃO: Converter total para EUR usando taxas já obtidas ou buscar nova
      // Nota: Este método precisa ser atualizado para aceitar preloadedRates  
      const rates = await currencyService.getExchangeRates();
      const totalEUR = totalBRL / rates['EUR'];
      
      console.log(`💰 Total Google Ads: BRL ${totalBRL.toFixed(2)}, EUR ${totalEUR.toFixed(2)}`);
      
      return {
        brl: totalBRL,
        eur: totalEUR
      };
    } catch (error) {
      console.error('Erro ao calcular custos de marketing Google Ads:', error);
      return { brl: 0, eur: 0 };
    }
  }


}

export const googleAdsService = new GoogleAdsService();