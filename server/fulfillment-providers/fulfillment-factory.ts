// 🏭 Factory Pattern para gerenciar múltiplas transportadoras
// Centraliza criação e configuração de providers de fulfillment

import { BaseFulfillmentProvider, FulfillmentCredentials } from './base-fulfillment-provider';
import { ElogyService } from './elogy-service';
import { FHBService } from './fhb-service';

export type ProviderType = 'european_fulfillment' | 'elogy' | 'fhb';

export class FulfillmentProviderFactory {
  
  /**
   * Cria uma instância do provider específico com credenciais
   */
  static async createProvider(providerType: ProviderType, credentials: FulfillmentCredentials): Promise<BaseFulfillmentProvider> {
    console.log(`🏭 Factory: Criando provider ${providerType} com credenciais`);
    
    switch (providerType) {
      case 'european_fulfillment':
        // Importação dinâmica para evitar dependências circulares
        return await FulfillmentProviderFactory.createEuropeanFulfillmentProvider(credentials);
        
      case 'elogy':
        // Validar credenciais específicas da eLogy
        if (!credentials.authHeader || !credentials.warehouseId) {
          throw new Error("eLogy requer authHeader e warehouseId nas credenciais");
        }
        return new ElogyService(credentials as any);
        
      case 'fhb':
        // Validar credenciais específicas da FHB
        if (!credentials.appId || !credentials.secret) {
          throw new Error("FHB requer appId e secret nas credenciais");
        }
        return new FHBService(credentials as any);
        
      default:
        throw new Error(`Provider type '${providerType}' não suportado`);
    }
  }

  /**
   * Cria provider European Fulfillment (mantendo compatibilidade)
   */
  private static async createEuropeanFulfillmentProvider(credentials: FulfillmentCredentials): Promise<BaseFulfillmentProvider> {
    // Importação dinâmica para evitar problemas de importação circular
    const { EuropeanFulfillmentService } = await import('../fulfillment-service.js');
    return new EuropeanFulfillmentService(credentials.email, credentials.password, credentials.apiUrl);
  }

  /**
   * Valida se as credenciais estão completas para o provider
   */
  static validateCredentials(providerType: ProviderType, credentials: FulfillmentCredentials): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    
    // Validações comuns
    if (!credentials.email) missing.push('email');
    if (!credentials.password) missing.push('password');
    
    // Validações específicas por provider
    switch (providerType) {
      case 'european_fulfillment':
        // European só precisa de email/password/apiUrl (opcional)
        break;
        
      case 'elogy':
        if (!credentials.authHeader) missing.push('authHeader');
        if (!credentials.warehouseId) missing.push('warehouseId');
        break;
        
      case 'fhb':
        if (!credentials.appId) missing.push('appId');
        if (!credentials.secret) missing.push('secret');
        break;
        
    }
    
    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Retorna lista de providers disponíveis
   */
  static getAvailableProviders(): Array<{ type: ProviderType; name: string; status: string }> {
    return [
      { type: 'european_fulfillment', name: 'N1 Warehouse 1', status: 'active' },
      { type: 'elogy', name: 'N1 Warehouse 2', status: 'active' },
      { type: 'fhb', name: 'N1 Warehouse 3', status: 'active' }
    ];
  }

  /**
   * Cria múltiplos providers para uma operação
   */
  static async createMultipleProviders(providerConfigs: Array<{ type: ProviderType; credentials: FulfillmentCredentials }>): Promise<BaseFulfillmentProvider[]> {
    const providers: BaseFulfillmentProvider[] = [];
    
    for (const config of providerConfigs) {
      try {
        const provider = this.createProvider(config.type, config.credentials);
        providers.push(provider);
        console.log(`✅ Provider ${config.type} criado com sucesso`);
      } catch (error) {
        console.error(`❌ Erro criando provider ${config.type}:`, error);
        // Continuar com outros providers mesmo se um falhar
      }
    }
    
    return providers;
  }
}