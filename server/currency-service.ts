import fetch from 'node-fetch';

export interface ExchangeRates {
  [currency: string]: number;
}

export class CurrencyService {
  private static instance: CurrencyService;
  private cachedRates: ExchangeRates = {};
  private lastUpdate: Date | null = null;
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutos

  static getInstance(): CurrencyService {
    if (!CurrencyService.instance) {
      CurrencyService.instance = new CurrencyService();
    }
    return CurrencyService.instance;
  }

  private async fetchExchangeRates(): Promise<ExchangeRates> {
    try {
      // Usando API gratuita exchangerate.host (sem necessidade de API key)
      const response = await fetch('https://api.exchangerate.host/latest?base=BRL');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as any;
      
      if (!data.success) {
        throw new Error('Failed to fetch exchange rates');
      }

      // Converter para taxa de BRL como base (inverter as taxas)
      const rates: ExchangeRates = {};
      for (const [currency, rate] of Object.entries(data.rates as Record<string, number>)) {
        rates[currency] = 1 / rate; // Inverter para ter BRL como base
      }
      
      // BRL sempre 1
      rates['BRL'] = 1;
      
      return rates;
    } catch (error) {
      console.error('Erro ao buscar taxas de câmbio:', error);
      
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