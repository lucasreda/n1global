// 🔄 Staging Sync Worker - ATIVO
// Este worker é responsável por:
// - Sincronizar dados das TRANSPORTADORAS (FHB, eLogy, European Fulfillment, Big Arena)
// - Fazer matching de pedidos das transportadoras com pedidos existentes (Shopify, CartPanda, Digistore24)
// - Atualizar APENAS status, tracking e informações de entrega (NÃO cria novos pedidos)
// - Os pedidos são criados/atualizados via webhooks das plataformas de venda
// Processa staging tables continuamente - novos itens a cada 2-3 minutos para fazer matching automático

import { performStagingSync } from '../services/staging-sync-service';
import { db } from '../db';
import { userWarehouseAccounts, userWarehouseAccountOperations, operations, stores } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

// Tracking de usuários já processados neste ciclo
const processedUsers = new Set<string>();

// Reentrancy guard
let isStagingSyncRunning = false;

/**
 * Worker contínuo de staging sync
 * Processa apenas novos itens (processedToOrders = false)
 */
async function processStagingTables() {
  if (isStagingSyncRunning) {
    console.log('⏭️  Staging sync já em execução, pulando...');
    return;
  }

  isStagingSyncRunning = true;

  try {
    // Buscar todos os usuários com contas de warehouse ativas
    const accountsWithOperations = await db
      .select({
        userId: userWarehouseAccounts.userId,
      })
      .from(userWarehouseAccounts)
      .innerJoin(
        userWarehouseAccountOperations,
        eq(userWarehouseAccounts.id, userWarehouseAccountOperations.accountId)
      )
      .where(eq(userWarehouseAccounts.status, 'active'))
      .groupBy(userWarehouseAccounts.userId);

    console.log(`🔍 [STAGING SYNC] Verificando ${accountsWithOperations.length} usuários com contas ativas...`);

    for (const account of accountsWithOperations) {
      const userId = account.userId;
      
      // Pular se já foi processado neste ciclo (evitar spam)
      if (processedUsers.has(userId)) {
        continue;
      }

      try {
        console.log(`🔄 [STAGING SYNC] Processando staging para usuário ${userId}...`);

        // Usar performStagingSync que já tem toda a lógica otimizada
        // Ela processa apenas itens com processedToOrders = false
        await performStagingSync(userId);

        // Marcar usuário como processado neste ciclo
        processedUsers.add(userId);

        console.log(`✅ [STAGING SYNC] Processamento concluído para usuário ${userId}`);
      } catch (error) {
        console.error(`❌ Erro no staging sync para usuário ${userId}:`, error);
        // Continuar com outros usuários mesmo se um falhar
      }
    }

    // Limpar tracking após ciclo completo
    processedUsers.clear();
  } catch (error) {
    console.error('❌ Erro no staging sync worker:', error);
    processedUsers.clear(); // Limpar em caso de erro
  } finally {
    isStagingSyncRunning = false;
  }
}

/**
 * Inicia worker de staging sync contínuo
 */
export function startStagingSyncWorker() {
  console.log('🔄 Staging Sync Worker iniciado (executa a cada 3 minutos)');

  // Executar imediatamente na inicialização
  processStagingTables().catch(error => {
    console.error('❌ Erro na execução inicial do staging sync:', error);
  });

  // Configurar intervalo de 3 minutos
  setInterval(() => {
    processStagingTables().catch(error => {
      console.error('❌ Erro no staging sync:', error);
    });
  }, 3 * 60 * 1000); // 3 minutos
}

