// 🚀 Shared FHB Sync Service
// Otimiza sync de múltiplas operações que compartilham a mesma conta FHB
// Estratégia: 1 chamada API → filtrar por prefixo → distribuir para N operações

import { FHBService } from './fulfillment-providers/fhb-service';
import { db } from './db';
import { operations, fhbAccounts, fulfillmentIntegrations, orders } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface OperationSyncConfig {
  operationId: string;
  operationName: string;
  shopifyOrderPrefix: string | null;
  fhbAccountId: string;
}

interface SharedSyncResult {
  success: boolean;
  totalFhbOrders: number;
  operationsProcessed: number;
  operationResults: Array<{
    operationId: string;
    operationName: string;
    ordersMatched: number;
    ordersUpdated: number;
  }>;
  errors: string[];
  executionTimeMs: number;
}

export class SharedFHBSyncService {
  /**
   * Identifica operações que compartilham a mesma conta FHB e faz sync compartilhado
   * @param operationIds - Lista de operações para sincronizar (ou todas se não especificado)
   */
  async syncMultipleOperations(operationIds?: string[]): Promise<SharedSyncResult> {
    const startTime = Date.now();
    const result: SharedSyncResult = {
      success: true,
      totalFhbOrders: 0,
      operationsProcessed: 0,
      operationResults: [],
      errors: [],
      executionTimeMs: 0
    };

    try {
      console.log('🔄 SharedFHBSync: Iniciando sync compartilhado FHB');

      // 1. Buscar operações com FHB configurado
      const operationsWithFhb = await this.getOperationsWithFhb(operationIds);
      
      if (operationsWithFhb.length === 0) {
        console.log('ℹ️  Nenhuma operação com FHB configurado');
        result.executionTimeMs = Date.now() - startTime;
        return result;
      }

      // 2. Agrupar operações por fhbAccountId
      const groupedByAccount = this.groupOperationsByAccount(operationsWithFhb);

      console.log(`📊 Encontradas ${operationsWithFhb.length} operações em ${Object.keys(groupedByAccount).length} contas FHB`);

      // 3. Para cada conta FHB, fazer sync compartilhado
      for (const [fhbAccountId, ops] of Object.entries(groupedByAccount)) {
        try {
          const accountResult = await this.syncFhbAccount(fhbAccountId, ops);
          result.operationResults.push(...accountResult.operationResults);
          result.totalFhbOrders = Math.max(result.totalFhbOrders, accountResult.totalFhbOrders);
          result.operationsProcessed += accountResult.operationsProcessed;
          
          if (!accountResult.success) {
            result.success = false;
            result.errors.push(...accountResult.errors);
          }
        } catch (error: any) {
          console.error(`❌ Erro ao sincronizar conta FHB ${fhbAccountId}:`, error);
          result.errors.push(`Conta ${fhbAccountId}: ${error.message}`);
          result.success = false;
        }
      }

      result.executionTimeMs = Date.now() - startTime;
      console.log(`✅ SharedFHBSync concluído em ${result.executionTimeMs}ms`);
      console.log(`   📦 ${result.totalFhbOrders} pedidos FHB processados`);
      console.log(`   🏪 ${result.operationsProcessed} operações sincronizadas`);

      return result;
    } catch (error: any) {
      console.error('💥 SharedFHBSync: Erro crítico:', error);
      result.success = false;
      result.errors.push(error.message);
      result.executionTimeMs = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Busca operações com FHB configurado e seus dados necessários
   */
  private async getOperationsWithFhb(operationIds?: string[]): Promise<OperationSyncConfig[]> {
    const query = db
      .select({
        operationId: operations.id,
        operationName: operations.name,
        shopifyOrderPrefix: operations.shopifyOrderPrefix,
        fhbAccountId: fulfillmentIntegrations.fhbAccountId,
      })
      .from(operations)
      .innerJoin(
        fulfillmentIntegrations,
        eq(operations.id, fulfillmentIntegrations.operationId)
      )
      .where(
        and(
          eq(fulfillmentIntegrations.provider, 'fhb'),
          eq(fulfillmentIntegrations.status, 'active')
        )
      );

    const results = await query;

    // Filtrar por operationIds se especificado
    const filtered = operationIds
      ? results.filter(r => operationIds.includes(r.operationId))
      : results;

    return filtered.filter(r => r.fhbAccountId !== null) as OperationSyncConfig[];
  }

  /**
   * Agrupa operações pelo fhbAccountId
   */
  private groupOperationsByAccount(
    ops: OperationSyncConfig[]
  ): Record<string, OperationSyncConfig[]> {
    return ops.reduce((acc, op) => {
      const accountId = op.fhbAccountId;
      if (!acc[accountId]) {
        acc[accountId] = [];
      }
      acc[accountId].push(op);
      return acc;
    }, {} as Record<string, OperationSyncConfig[]>);
  }

  /**
   * Sincroniza todas as operações de uma conta FHB compartilhada
   */
  private async syncFhbAccount(
    fhbAccountId: string,
    operations: OperationSyncConfig[]
  ): Promise<{
    success: boolean;
    totalFhbOrders: number;
    operationsProcessed: number;
    operationResults: Array<{
      operationId: string;
      operationName: string;
      ordersMatched: number;
      ordersUpdated: number;
    }>;
    errors: string[];
  }> {
    console.log(`\n🏦 Sincronizando conta FHB: ${fhbAccountId}`);
    console.log(`   🏪 ${operations.length} operações compartilhando esta conta:`);
    operations.forEach(op => {
      console.log(`      - ${op.operationName} (prefix: ${op.shopifyOrderPrefix || 'none'})`);
    });

    const errors: string[] = [];
    const operationResults: Array<{
      operationId: string;
      operationName: string;
      ordersMatched: number;
      ordersUpdated: number;
    }> = [];

    try {
      // 1. Buscar credenciais da conta FHB
      const fhbAccount = await db.query.fhbAccounts.findFirst({
        where: eq(fhbAccounts.id, fhbAccountId)
      });

      if (!fhbAccount) {
        throw new Error(`Conta FHB ${fhbAccountId} não encontrada`);
      }

      // 2. Criar serviço FHB com as credenciais
      const fhbService = new FHBService({
        appId: fhbAccount.appId,
        secret: fhbAccount.secret,
        apiUrl: fhbAccount.apiUrl
      });

      // 3. Buscar TODOS os pedidos FHB (últimos 30 dias para otimizar)
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const from = thirtyDaysAgo.toISOString().split('T')[0];
      const to = today.toISOString().split('T')[0];

      console.log(`📅 Buscando pedidos FHB de ${from} até ${to}...`);

      let allFhbOrders: any[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        try {
          const response = await fhbService['makeAuthenticatedRequest'](
            `/order/history?from=${from}&to=${to}&page=${page}`
          );
          
          const pageOrders = response.orders || response.data || [];
          
          if (pageOrders.length === 0) {
            hasMore = false;
            break;
          }
          
          allFhbOrders = allFhbOrders.concat(pageOrders);
          
          console.log(`   📄 Página ${page}: ${pageOrders.length} pedidos`);
          
          if (pageOrders.length < 15) hasMore = false;
          page++;
        } catch (error: any) {
          console.error(`⚠️  Erro ao buscar página ${page}:`, error);
          errors.push(`Página ${page}: ${error.message}`);
          break;
        }
      }

      console.log(`✅ Total de pedidos FHB recuperados: ${allFhbOrders.length}`);

      // 4. Para cada operação, filtrar pedidos por prefixo e atualizar
      for (const operation of operations) {
        try {
          const opResult = await this.syncOperationOrders(
            operation,
            allFhbOrders,
            fhbService
          );
          operationResults.push(opResult);
        } catch (error: any) {
          console.error(`❌ Erro ao sincronizar operação ${operation.operationName}:`, error);
          errors.push(`${operation.operationName}: ${error.message}`);
        }
      }

      return {
        success: errors.length === 0,
        totalFhbOrders: allFhbOrders.length,
        operationsProcessed: operations.length,
        operationResults,
        errors
      };
    } catch (error: any) {
      console.error(`💥 Erro ao sincronizar conta FHB ${fhbAccountId}:`, error);
      return {
        success: false,
        totalFhbOrders: 0,
        operationsProcessed: 0,
        operationResults,
        errors: [error.message]
      };
    }
  }

  /**
   * Sincroniza pedidos de uma operação específica filtrando por prefixo
   */
  private async syncOperationOrders(
    operation: OperationSyncConfig,
    allFhbOrders: any[],
    fhbService: FHBService
  ): Promise<{
    operationId: string;
    operationName: string;
    ordersMatched: number;
    ordersUpdated: number;
  }> {
    console.log(`\n🔍 Filtrando pedidos para ${operation.operationName}...`);
    
    let ordersMatched = 0;
    let ordersUpdated = 0;

    // Buscar pedidos Shopify da operação
    const shopifyOrders = await db.query.orders.findMany({
      where: eq(orders.operationId, operation.operationId)
    });

    console.log(`   📦 ${shopifyOrders.length} pedidos Shopify na base`);

    // Filtrar pedidos FHB por prefixo (se definido)
    const relevantFhbOrders = operation.shopifyOrderPrefix
      ? allFhbOrders.filter(fhbOrder => {
          const ref = fhbOrder.variable_symbol || '';
          return ref.startsWith(operation.shopifyOrderPrefix!);
        })
      : allFhbOrders; // Se não tem prefixo, considerar todos (cenário legado)

    console.log(`   🎯 ${relevantFhbOrders.length} pedidos FHB com prefixo "${operation.shopifyOrderPrefix || 'nenhum'}"`);

    // Match e atualização
    for (const fhbOrder of relevantFhbOrders) {
      const matchingShopifyOrder = shopifyOrders.find(shopifyOrder => {
        const shopifyRef = shopifyOrder.shopifyOrderNumber || shopifyOrder.name || '';
        const fhbRef = fhbOrder.variable_symbol || '';
        
        // Remove prefixo para comparação se necessário
        const cleanShopifyRef = shopifyRef.replace('#', '').replace(operation.shopifyOrderPrefix || '', '');
        const cleanFhbRef = fhbRef.replace(operation.shopifyOrderPrefix || '', '');
        
        return (
          shopifyRef === fhbRef ||
          shopifyRef === `#${fhbRef}` ||
          cleanShopifyRef === cleanFhbRef ||
          shopifyRef.split('-')[0] === fhbRef
        );
      });

      if (matchingShopifyOrder) {
        ordersMatched++;
        
        // Atualizar pedido Shopify com dados FHB
        try {
          await db
            .update(orders)
            .set({
              status: this.mapFHBStatusToInternal(fhbOrder.status),
              trackingNumber: fhbOrder.tracking,
              carrierImported: true,
              carrierMatchedAt: new Date(),
              carrierOrderId: fhbOrder.id,
              carrierConfirmation: fhbOrder.status,
              providerData: {
                ...matchingShopifyOrder.providerData,
                fhb: {
                  orderId: fhbOrder.id,
                  status: fhbOrder.status,
                  variableSymbol: fhbOrder.variable_symbol,
                  tracking: fhbOrder.tracking,
                  value: fhbOrder.value,
                  updatedAt: new Date().toISOString()
                }
              },
              lastStatusUpdate: new Date()
            })
            .where(eq(orders.id, matchingShopifyOrder.id));
          
          ordersUpdated++;
          console.log(`      ✅ Match: Shopify ${matchingShopifyOrder.shopifyOrderNumber} ↔ FHB ${fhbOrder.variable_symbol}`);
        } catch (error: any) {
          console.error(`      ❌ Erro ao atualizar pedido ${matchingShopifyOrder.id}:`, error);
        }
      }
    }

    console.log(`   ✨ Resultado: ${ordersMatched} matches, ${ordersUpdated} atualizados`);

    return {
      operationId: operation.operationId,
      operationName: operation.operationName,
      ordersMatched,
      ordersUpdated
    };
  }

  /**
   * Mapeia status FHB para status interno
   */
  private mapFHBStatusToInternal(fhbStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'pending',
      'confirmed': 'processing',
      'sent': 'shipped',
      'delivered': 'delivered',
      'rejected': 'cancelled'
    };
    return statusMap[fhbStatus] || fhbStatus;
  }
}
