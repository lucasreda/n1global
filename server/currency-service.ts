import fetch from 'node-fetch';

export interface ExchangeRates {
  [currency: string]: number;
}

export class CurrencyService {
  private static instance: CurrencyService;
  private cachedRates: ExchangeRates = {};
  private lastUpdate: Date | null = null;
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutos
  
  // Método para limpar cache e forçar atualização
  public clearCache(): void {
    this.cachedRates = {};
    this.lastUpdate = null;
  }

  static getInstance(): CurrencyService {
    if (!CurrencyService.instance) {
      CurrencyService.instance = new CurrencyService();
    }
    return CurrencyService.instance;
  }

  private async fetchExchangeRates(): Promise<ExchangeRates> {
    try {
      const apiKey = process.env.CURRENCY_API_KEY;
      if (!apiKey) {
        throw new Error('CURRENCY_API_KEY not found');
      }

      // Usando CurrencyAPI com USD como base (padrão) e incluindo BRL
      const response = await fetch(`https://api.currencyapi.com/v3/latest?apikey=${apiKey}&currencies=USD,EUR,GBP,BRL`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as any;
      
      if (!data.data) {
        throw new Error('Invalid response format from CurrencyAPI');
      }

      // Converter resposta da CurrencyAPI para nosso formato (com BRL como base)
      const usdToBrl = data.data.BRL?.value || 5.2; // Taxa USD -> BRL
      const rates: ExchangeRates = { 'BRL': 1 };
      
      for (const [currency, info] of Object.entries(data.data as Record<string, any>)) {
        if (currency === 'BRL') continue; // Já definimos BRL = 1
        
        // Converter de USD para BRL: (USD -> currency) -> (BRL -> currency)
        // Se 1 USD = X currency e 1 USD = Y BRL, então 1 BRL = X/Y currency
        // Para obter quantos BRL valem 1 unidade da moeda: Y/X
        const currencyRate = info.value; // USD para a moeda
        rates[currency] = usdToBrl / currencyRate; // BRL para a moeda
      }
      
      return rates;
    } catch (error) {
      console.error('Erro ao buscar taxas de câmbio da CurrencyAPI:', error);
      
      // Fallback com taxas aproximadas (atualizadas manualmente)
      return {
        'BRL': 1,
        'USD': 5.2, // 1 USD = 5.2 BRL
        'EUR': 5.8, // 1 EUR = 5.8 BRL
        'GBP': 6.5, // 1 GBP = 6.5 BRL
      };
    }
  }

  async getExchangeRates(): Promise<ExchangeRates> {
    const now = new Date();
    
    // Verificar se precisa atualizar o cache
    if (!this.lastUpdate || (now.getTime() - this.lastUpdate.getTime()) > this.CACHE_DURATION) {
      console.log('🔄 Atualizando taxas de câmbio...');
      this.cachedRates = await this.fetchExchangeRates();
      this.lastUpdate = now;
      console.log('✅ Taxas de câmbio atualizadas:', this.cachedRates);
    }
    
    return this.cachedRates;
  }

  async convertToBRL(amount: number, fromCurrency: string): Promise<number> {
    if (fromCurrency === 'BRL') {
      return amount;
    }

    const rates = await this.getExchangeRates();
    const rate = rates[fromCurrency.toUpperCase()];
    
    if (!rate) {
      console.warn(`Taxa de câmbio não encontrada para ${fromCurrency}, usando valor original`);
      return amount;
    }
    
    const convertedAmount = amount * rate;
    console.log(`💱 Convertendo ${amount} ${fromCurrency} para ${convertedAmount.toFixed(2)} BRL (taxa: ${rate})`);
    
    return convertedAmount;
  }

  async convertMultipleToBRL(amounts: Array<{ amount: number; currency: string }>): Promise<number> {
    let total = 0;
    
    for (const item of amounts) {
      const converted = await this.convertToBRL(item.amount, item.currency);
      total += converted;
    }
    
    return total;
  }

  // Detectar moeda baseada no símbolo ou código
  detectCurrency(text: string): string {
    if (text.includes('$') || text.includes('USD')) return 'USD';
    if (text.includes('€') || text.includes('EUR')) return 'EUR';
    if (text.includes('£') || text.includes('GBP')) return 'GBP';
    if (text.includes('R$') || text.includes('BRL')) return 'BRL';
    
    // Default para USD se não conseguir detectar
    return 'USD';
  }
}

export const currencyService = CurrencyService.getInstance();