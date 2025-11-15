// 📊 Dashboard Cache Service
// Gerencia cache e invalidação do dashboard para atualizações automáticas

import { db } from '../db';
import { orders, operations } from '@shared/schema';
import { eq, max, sql } from 'drizzle-orm';

// Cache de última atualização por operação
const lastUpdateCache = new Map<string, Date>();

/**
 * Invalida cache do dashboard para uma operação específica
 * Remove tanto o cache em memória quanto o cache no banco de dados (dashboard_metrics)
 */
export async function invalidateDashboardCache(operationId: string): Promise<void> {
  console.log(`🔄 Invalidando cache do dashboard para operação ${operationId}`);
  lastUpdateCache.delete(operationId);
  
  // Também invalidar cache no banco de dados (dashboard_metrics)
  try {
    const { dashboardMetrics } = await import('@shared/schema');
    await db
      .delete(dashboardMetrics)
      .where(eq(dashboardMetrics.operationId, operationId));
    console.log(`✅ Cache do banco de dados invalidado para operação ${operationId}`);
  } catch (error) {
    console.error(`⚠️ Erro ao invalidar cache do banco de dados para operação ${operationId}:`, error);
    // Não falha a operação se não conseguir invalidar o cache do banco
  }
}

/**
 * Invalida cache do dashboard para todas as operações
 */
export function invalidateAllDashboardCache(): void {
  console.log('🔄 Invalidando cache do dashboard para todas as operações');
  lastUpdateCache.clear();
}

/**
 * Obtém timestamp da última atualização para uma operação
 */
export async function getLastUpdate(operationId: string): Promise<Date | null> {
  try {
    // Verificar cache primeiro
    const cached = lastUpdateCache.get(operationId);
    if (cached) {
      return cached;
    }

    // Buscar última atualização do banco (mais recente entre created_at e updated_at)
    const [lastOrder] = await db
      .select({
        lastUpdate: sql<Date>`GREATEST(
          COALESCE(MAX(${orders.createdAt}), '1970-01-01'::timestamp),
          COALESCE(MAX(${orders.updatedAt}), '1970-01-01'::timestamp)
        )`.as('last_update')
      })
      .from(orders)
      .where(eq(orders.operationId, operationId));

    const lastUpdate = lastOrder?.lastUpdate ? new Date(lastOrder.lastUpdate) : null;

    // Atualizar cache
    if (lastUpdate) {
      lastUpdateCache.set(operationId, lastUpdate);
    }

    return lastUpdate;
  } catch (error) {
    console.error(`❌ Erro ao obter última atualização para operação ${operationId}:`, error);
    return null;
  }
}

/**
 * Obtém todas as operações e suas últimas atualizações
 */
export async function getAllLastUpdates(): Promise<Record<string, Date | null>> {
  try {
    // Buscar todas as operações
    const allOperations = await db
      .select({ id: operations.id })
      .from(operations);

    const updates: Record<string, Date | null> = {};

    for (const operation of allOperations) {
      updates[operation.id] = await getLastUpdate(operation.id);
    }

    return updates;
  } catch (error) {
    console.error('❌ Erro ao obter todas as últimas atualizações:', error);
    return {};
  }
}

