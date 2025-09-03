// 🏭 Factory Pattern para gerenciar múltiplas transportadoras
// Centraliza criação e configuração de providers de fulfillment

import { BaseFulfillmentProvider, FulfillmentCredentials } from './base-fulfillment-provider';
import { ElogyService } from './elogy-service';

export type ProviderType = 'european_fulfillment' | 'elogy' | 'correios' | 'jadlog';

export class FulfillmentProviderFactory {
  
  /**
   * Cria uma instância do provider específico com credenciais
   */
  static createProvider(providerType: ProviderType, credentials: FulfillmentCredentials): BaseFulfillmentProvider {
    console.log(`🏭 Factory: Criando provider ${providerType} com credenciais`);
    
    switch (providerType) {
      case 'european_fulfillment':
        // Importação dinâmica para evitar dependências circulares
        return FulfillmentProviderFactory.createEuropeanFulfillmentProvider(credentials);
        
      case 'elogy':
        // Validar credenciais específicas da eLogy
        if (!credentials.authHeader || !credentials.warehouseId) {
          throw new Error("eLogy requer authHeader e warehouseId nas credenciais");
        }
        return new ElogyService(credentials as any);
        
      case 'correios':
        throw new Error("Correios provider ainda não implementado");
        
      case 'jadlog':
        throw new Error("Jadlog provider ainda não implementado");
        
      default:
        throw new Error(`Provider type '${providerType}' não suportado`);
    }
  }

  /**
   * Cria provider European Fulfillment (mantendo compatibilidade)
   */
  private static createEuropeanFulfillmentProvider(credentials: FulfillmentCredentials): BaseFulfillmentProvider {
    // Importação dinâmica para evitar problemas de importação circular
    const { EuropeanFulfillmentService } = require('../fulfillment-service');
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
        
      case 'correios':
        // TODO: Implementar validações específicas
        break;
        
      case 'jadlog':
        // TODO: Implementar validações específicas
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
      { type: 'european_fulfillment', name: 'European Fulfillment Center', status: 'active' },
      { type: 'elogy', name: 'eLogy Logistics', status: 'active' },
      { type: 'correios', name: 'Correios Brasil', status: 'planned' },
      { type: 'jadlog', name: 'Jadlog', status: 'planned' }
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