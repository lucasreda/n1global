import fetch from 'node-fetch';

export interface ExchangeRates {
  [currency: string]: number;
}

export class CurrencyService {
  private static instance: CurrencyService;
  private cachedRates: ExchangeRates = {};
  private lastValidRates: ExchangeRates = {}; // Backup das últimas taxas válidas
  private lastUpdate: Date | null = null;
  private lastValidUpdate: Date | null = null;
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutos
  private readonly BACKUP_FILE = './currency-backup.json';
  
  // Método para limpar cache e forçar atualização
  public clearCache(): void {
    this.cachedRates = {};
    this.lastUpdate = null;
  }

  // Carregar backup das taxas do arquivo
  private async loadBackupRates(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(this.BACKUP_FILE, 'utf-8');
      const backup = JSON.parse(data);
      this.lastValidRates = backup.rates || {};
      this.lastValidUpdate = backup.timestamp ? new Date(backup.timestamp) : null;
      console.log('📋 Backup de taxas carregado:', this.lastValidRates);
    } catch (error) {
      // Arquivo não existe ou erro - usar taxas padrão
      this.lastValidRates = {
        'BRL': 1,
        'USD': 5.2,
        'EUR': 5.8,
        'GBP': 6.5,
      };
      console.log('📋 Usando taxas padrão como backup');
    }
  }

  // Salvar backup das taxas em arquivo
  private async saveBackupRates(rates: ExchangeRates): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const backup = {
        rates,
        timestamp: new Date().toISOString()
      };
      await fs.writeFile(this.BACKUP_FILE, JSON.stringify(backup, null, 2));
      this.lastValidRates = rates;
      this.lastValidUpdate = new Date();
      console.log('💾 Backup de taxas salvo');
    } catch (error) {
      console.warn('⚠️ Erro ao salvar backup de taxas:', error);
    }
  }

  static getInstance(): CurrencyService {
    if (!CurrencyService.instance) {
      CurrencyService.instance = new CurrencyService();
    }
    return CurrencyService.instance;
  }

  private async fetchExchangeRates(): Promise<ExchangeRates> {
    // Carregar backup se ainda não foi carregado
    if (!this.lastValidUpdate) {
      await this.loadBackupRates();
    }

    try {
      const apiKey = process.env.CURRENCY_API_KEY;
      if (!apiKey) {
        console.warn('⚠️ CURRENCY_API_KEY não encontrada - usando backup');
        return this.lastValidRates;
      }

      console.log('📡 Fazendo chamada única para Currency API...');
      
      // Usando CurrencyAPI com USD como base (padrão) e incluindo BRL
      const response = await fetch(`https://api.currencyapi.com/v3/latest?apikey=${apiKey}&currencies=USD,EUR,GBP,BRL`);
      
      if (!response.ok) {
        console.warn(`⚠️ Currency API retornou status ${response.status} - usando backup`);
        return this.lastValidRates;
      }
      
      const data = await response.json() as any;
      
      if (!data.data) {
        console.warn('⚠️ Resposta inválida da Currency API - usando backup');
        return this.lastValidRates;
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
      
      // Salvar backup das taxas válidas
      await this.saveBackupRates(rates);
      console.log('✅ Taxas obtidas da Currency API e backup salvo');
      
      return rates;
    } catch (error) {
      console.error('❌ Erro ao buscar taxas da Currency API - usando backup:', error);
      
      // Se temos backup válido, usar ele
      if (this.lastValidRates && Object.keys(this.lastValidRates).length > 0) {
        console.log('🔄 Usando últimas taxas válidas do backup');
        return this.lastValidRates;
      }
      
      // Fallback final com taxas padrão
      const fallbackRates = {
        'BRL': 1,
        'USD': 5.2, // 1 USD = 5.2 BRL
        'EUR': 6.37, // 1 EUR = 6.37 BRL (atualizada dos logs)
        'GBP': 6.5, // 1 GBP = 6.5 BRL
      };
      
      console.log('🚨 Usando taxas padrão de emergência');
      return fallbackRates;
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

  async convertToBRL(amount: number, fromCurrency: string, preloadedRates?: ExchangeRates): Promise<number> {
    if (fromCurrency === 'BRL') {
      return amount;
    }

    const rates = preloadedRates || await this.getExchangeRates();
    const rate = rates[fromCurrency.toUpperCase()];
    
    if (!rate) {
      console.warn(`Taxa de câmbio não encontrada para ${fromCurrency}, usando valor original`);
      return amount;
    }
    
    const convertedAmount = amount * rate;
    if (!preloadedRates) {
      console.log(`💱 Convertendo ${amount} ${fromCurrency} para ${convertedAmount.toFixed(2)} BRL (taxa: ${rate})`);
    }
    
    return convertedAmount;
  }

  async convertMultipleToBRL(amounts: Array<{ amount: number; currency: string }>, preloadedRates?: ExchangeRates): Promise<number> {
    const rates = preloadedRates || await this.getExchangeRates();
    let total = 0;
    
    for (const item of amounts) {
      const converted = await this.convertToBRL(item.amount, item.currency, rates);
      total += converted;
    }
    
    return total;
  }

  // Novos métodos otimizados para conversões em lote
  convertToBRLSync(amount: number, fromCurrency: string, rates: ExchangeRates): number {
    if (fromCurrency === 'BRL') {
      return amount;
    }

    const rate = rates[fromCurrency.toUpperCase()];
    if (!rate) {
      console.warn(`Taxa de câmbio não encontrada para ${fromCurrency}, usando valor original`);
      return amount;
    }
    
    return amount * rate;
  }

  convertFromBRLSync(amountInBRL: number, toCurrency: string, rates: ExchangeRates): number {
    if (toCurrency === 'BRL') {
      return amountInBRL;
    }

    const rate = rates[toCurrency.toUpperCase()];
    if (!rate) {
      console.warn(`Taxa de câmbio não encontrada para ${toCurrency}, usando valor original`);
      return amountInBRL;
    }
    
    return amountInBRL / rate;
  }

  convertMultipleSync(conversions: Array<{ amount: number; fromCurrency: string; toCurrency: string }>, rates: ExchangeRates): Array<{ original: number; converted: number; fromCurrency: string; toCurrency: string }> {
    return conversions.map(conv => ({
      original: conv.amount,
      converted: conv.toCurrency === 'BRL' 
        ? this.convertToBRLSync(conv.amount, conv.fromCurrency, rates)
        : this.convertFromBRLSync(this.convertToBRLSync(conv.amount, conv.fromCurrency, rates), conv.toCurrency, rates),
      fromCurrency: conv.fromCurrency,
      toCurrency: conv.toCurrency
    }));
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

  async convertFromBRL(amountInBRL: number, toCurrency: string, preloadedRates?: ExchangeRates): Promise<number> {
    if (toCurrency === 'BRL') {
      return amountInBRL;
    }

    const rates = preloadedRates || await this.getExchangeRates();
    const rate = rates[toCurrency.toUpperCase()];
    
    if (!rate) {
      console.warn(`Taxa de câmbio não encontrada para ${toCurrency}, usando valor original`);
      return amountInBRL;
    }
    
    const convertedAmount = amountInBRL / rate;
    if (!preloadedRates) {
      console.log(`💱 Convertendo ${amountInBRL} BRL para ${convertedAmount.toFixed(2)} ${toCurrency} (taxa: ${rate})`);
    }
    
    return convertedAmount;
  }
}

export const currencyService = CurrencyService.getInstance();