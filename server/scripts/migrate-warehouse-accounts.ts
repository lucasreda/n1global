/**
 * Script de Migração: Backfill user_warehouse_accounts
 * 
 * Este script migra dados das tabelas legadas (fhbAccounts, fulfillmentIntegrations)
 * para a nova arquitetura user_warehouse_accounts.
 * 
 * Mapeamento:
 * - fhbAccounts → user_warehouse_accounts (providerKey: 'fhb')
 * - fulfillmentIntegrations (FHB) → user_warehouse_accounts (providerKey: 'fhb')
 * - fulfillmentIntegrations (European) → user_warehouse_accounts (providerKey: 'european_fulfillment')
 * - fulfillmentIntegrations (eLogy) → user_warehouse_accounts (providerKey: 'elogy')
 * 
 * Execução:
 * tsx server/scripts/migrate-warehouse-accounts.ts
 */

import { db } from '../db.js';
import { 
  fhbAccounts, 
  fulfillmentIntegrations, 
  userWarehouseAccounts,
  userWarehouseAccountOperations,
  users,
  operations
} from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

interface MigrationStats {
  fhbAccountsMigrated: number;
  fulfillmentIntegrationsMigrated: number;
  accountsCreated: number;
  operationLinkingsCreated: number;
  errors: string[];
}

async function migrateFHBAccounts(stats: MigrationStats): Promise<void> {
  console.log('\n📦 Migrando fhbAccounts...');
  
  try {
    const accounts = await db.select().from(fhbAccounts);
    console.log(`   Encontrados ${accounts.length} registros em fhbAccounts`);
    
    for (const account of accounts) {
      try {
        // FHB accounts não têm userId, apenas operationId
        // Vamos buscar o primeiro usuário da operação
        if (!account.operationId) {
          console.warn(`   ⚠️  FHB Account ${account.id} sem operationId, pulando...`);
          stats.errors.push(`FHB Account ${account.id} sem operationId`);
          continue;
        }
        
        // Buscar operação
        const [operation] = await db.select()
          .from(operations)
          .where(eq(operations.id, account.operationId))
          .limit(1);
        
        if (!operation) {
          console.warn(`   ⚠️  Operação ${account.operationId} não encontrada, pulando...`);
          stats.errors.push(`Operação ${account.operationId} não encontrada para FHB ${account.id}`);
          continue;
        }
        
        // Buscar primeiro usuário admin ou super_admin para atribuir a conta
        const [adminUser] = await db.select()
          .from(users)
          .where(eq(users.role, 'admin'))
          .limit(1);
        
        if (!adminUser) {
          console.warn(`   ⚠️  Nenhum usuário admin encontrado, pulando FHB ${account.id}...`);
          stats.errors.push(`Nenhum admin disponível para FHB ${account.id}`);
          continue;
        }
        
        // Verificar se já existe warehouse account para este FHB
        const existing = await db.select()
          .from(userWarehouseAccounts)
          .where(
            and(
              eq(userWarehouseAccounts.userId, adminUser.id),
              eq(userWarehouseAccounts.providerKey, 'fhb'),
              eq(userWarehouseAccounts.displayName, account.displayName || `FHB Account ${account.id}`)
            )
          )
          .limit(1);
        
        if (existing.length > 0) {
          console.log(`   ✓ FHB ${account.displayName} já migrado, pulando...`);
          continue;
        }
        
        // Criar warehouse account
        const [newAccount] = await db.insert(userWarehouseAccounts).values({
          id: nanoid(),
          userId: adminUser.id,
          providerKey: 'fhb',
          displayName: account.displayName || `FHB Account ${account.id}`,
          credentials: {
            email: account.email,
            password: account.password,
            apiUrl: account.apiUrl || 'https://api.fhb.com'
          },
          isActive: account.isActive ?? true,
          initialSyncCompleted: account.initialSyncCompleted ?? false,
          initialSyncCompletedAt: account.initialSyncCompletedAt || null,
          lastTestedAt: account.lastTestedAt || null,
          lastSyncAt: account.lastSyncAt || null
        }).returning();
        
        stats.accountsCreated++;
        
        // Linkar com a operação
        await db.insert(userWarehouseAccountOperations).values({
          accountId: newAccount.id,
          operationId: account.operationId
        });
        
        stats.operationLinkingsCreated++;
        stats.fhbAccountsMigrated++;
        
        console.log(`   ✅ Migrado: ${account.displayName} → ${adminUser.email}`);
        
      } catch (error: any) {
        console.error(`   ❌ Erro ao migrar FHB ${account.id}:`, error.message);
        stats.errors.push(`FHB ${account.id}: ${error.message}`);
      }
    }
    
  } catch (error: any) {
    console.error('❌ Erro ao buscar fhbAccounts:', error.message);
    stats.errors.push(`Erro geral fhbAccounts: ${error.message}`);
  }
}

async function migrateFulfillmentIntegrations(stats: MigrationStats): Promise<void> {
  console.log('\n📦 Migrando fulfillmentIntegrations...');
  
  try {
    const integrations = await db.select().from(fulfillmentIntegrations);
    console.log(`   Encontrados ${integrations.length} registros em fulfillmentIntegrations`);
    
    for (const integration of integrations) {
      try {
        // Verificar se há owner/cliente válido
        if (!integration.owner) {
          console.warn(`   ⚠️  Integration ${integration.id} sem owner, pulando...`);
          stats.errors.push(`Integration ${integration.id} sem owner`);
          continue;
        }
        
        // Buscar usuário pelo nome do owner (simplificado - pode precisar de lógica mais robusta)
        const [user] = await db.select()
          .from(users)
          .where(eq(users.name, integration.owner))
          .limit(1);
        
        if (!user) {
          console.warn(`   ⚠️  Usuário '${integration.owner}' não encontrado, pulando...`);
          stats.errors.push(`Usuário '${integration.owner}' não encontrado para integration ${integration.id}`);
          continue;
        }
        
        // Determinar providerKey baseado no tipo
        let providerKey: string;
        if (integration.type === 'fhb') {
          providerKey = 'fhb';
        } else if (integration.type === 'european_fulfillment') {
          providerKey = 'european_fulfillment';
        } else if (integration.type === 'elogy') {
          providerKey = 'elogy';
        } else {
          console.warn(`   ⚠️  Tipo desconhecido '${integration.type}', pulando...`);
          stats.errors.push(`Tipo desconhecido '${integration.type}' para integration ${integration.id}`);
          continue;
        }
        
        // Verificar se já existe warehouse account
        const existing = await db.select()
          .from(userWarehouseAccounts)
          .where(
            and(
              eq(userWarehouseAccounts.userId, user.id),
              eq(userWarehouseAccounts.providerKey, providerKey),
              eq(userWarehouseAccounts.displayName, integration.integrationName || `${providerKey} ${integration.id}`)
            )
          )
          .limit(1);
        
        if (existing.length > 0) {
          console.log(`   ✓ Integration ${integration.integrationName} já migrada, pulando...`);
          continue;
        }
        
        // Criar warehouse account
        const [newAccount] = await db.insert(userWarehouseAccounts).values({
          id: nanoid(),
          userId: user.id,
          providerKey,
          displayName: integration.integrationName || `${providerKey} ${integration.id}`,
          credentials: integration.credentials || {},
          isActive: integration.isActive ?? true,
          initialSyncCompleted: false,
          initialSyncCompletedAt: null,
          lastTestedAt: integration.lastTestedAt || null,
          lastSyncAt: null
        }).returning();
        
        stats.accountsCreated++;
        
        // Linkar com operação se houver
        if (integration.operationId) {
          await db.insert(userWarehouseAccountOperations).values({
            accountId: newAccount.id,
            operationId: integration.operationId
          });
          stats.operationLinkingsCreated++;
        }
        
        stats.fulfillmentIntegrationsMigrated++;
        
        console.log(`   ✅ Migrado: ${integration.integrationName} (${providerKey}) → ${user.email}`);
        
      } catch (error: any) {
        console.error(`   ❌ Erro ao migrar integration ${integration.id}:`, error.message);
        stats.errors.push(`Integration ${integration.id}: ${error.message}`);
      }
    }
    
  } catch (error: any) {
    console.error('❌ Erro ao buscar fulfillmentIntegrations:', error.message);
    stats.errors.push(`Erro geral fulfillmentIntegrations: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Iniciando migração de warehouse accounts...\n');
  
  const stats: MigrationStats = {
    fhbAccountsMigrated: 0,
    fulfillmentIntegrationsMigrated: 0,
    accountsCreated: 0,
    operationLinkingsCreated: 0,
    errors: []
  };
  
  try {
    // Migrar fhbAccounts
    await migrateFHBAccounts(stats);
    
    // Migrar fulfillmentIntegrations
    await migrateFulfillmentIntegrations(stats);
    
    // Relatório final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO FINAL DA MIGRAÇÃO');
    console.log('='.repeat(60));
    console.log(`✅ FHB Accounts migrados: ${stats.fhbAccountsMigrated}`);
    console.log(`✅ Fulfillment Integrations migrados: ${stats.fulfillmentIntegrationsMigrated}`);
    console.log(`📦 Total de warehouse accounts criados: ${stats.accountsCreated}`);
    console.log(`🔗 Total de operation linkings criados: ${stats.operationLinkingsCreated}`);
    
    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Erros encontrados (${stats.errors.length}):`);
      stats.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    } else {
      console.log('\n✨ Migração concluída sem erros!');
    }
    
    console.log('='.repeat(60) + '\n');
    
  } catch (error: any) {
    console.error('\n❌ Erro fatal durante migração:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Executar migração
main();
