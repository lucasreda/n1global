/**
 * Migration: Legacy fulfillment accounts → user_warehouse_accounts
 * 
 * Backfills user_warehouse_accounts from:
 * 1. fhbAccounts (global FHB accounts)
 * 2. fulfillmentIntegrations (operation-level European/eLogy)
 * 
 * Also creates user_warehouse_account_operations to preserve operation links.
 * 
 * Execute: tsx server/scripts/migrate-warehouse-accounts.ts
 */

import { db } from '../db.js';
import { 
  fhbAccounts, 
  fulfillmentIntegrations, 
  operations,
  userWarehouseAccounts,
  userWarehouseAccountOperations,
  userOperationAccess
} from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';

async function migrate() {
  console.log('🔄 Starting warehouse accounts migration...\n');

  let stats = {
    fhbAccountsMigrated: 0,
    europeanMigrated: 0,
    elogyMigrated: 0,
    operationLinkagesCreated: 0,
    skipped: 0
  };

  try {
    // Step 1: Migrate fhbAccounts → user_warehouse_accounts
    console.log('📦 Step 1: Migrating fhbAccounts...');
    
    const fhbAccountsData = await db
      .select({
        fhbId: fhbAccounts.id,
        name: fhbAccounts.name,
        appId: fhbAccounts.appId,
        secret: fhbAccounts.secret,
        apiUrl: fhbAccounts.apiUrl,
        status: fhbAccounts.status,
        lastTestedAt: fhbAccounts.lastTestedAt,
        testResult: fhbAccounts.testResult,
        initialSyncCompleted: fhbAccounts.initialSyncCompleted,
        initialSyncCompletedAt: fhbAccounts.initialSyncCompletedAt,
        createdAt: fhbAccounts.createdAt,
      })
      .from(fhbAccounts);

    console.log(`   Found ${fhbAccountsData.length} FHB accounts`);

    for (const fhb of fhbAccountsData) {
      // Find operations using this FHB account
      const linkedOps = await db
        .select({
          operationId: fulfillmentIntegrations.operationId
        })
        .from(fulfillmentIntegrations)
        .where(
          and(
            eq(fulfillmentIntegrations.fhbAccountId, fhb.fhbId),
            eq(fulfillmentIntegrations.provider, 'fhb')
          )
        );

      if (linkedOps.length === 0) {
        console.log(`   ⚠️  Skipping FHB account "${fhb.name}" - no linked operations found`);
        stats.skipped++;
        continue;
      }

      // Find owner via userOperationAccess (role='owner')
      const firstOpId = linkedOps[0].operationId;
      const [ownerAccess] = await db
        .select({ userId: userOperationAccess.userId })
        .from(userOperationAccess)
        .where(
          and(
            eq(userOperationAccess.operationId, firstOpId),
            eq(userOperationAccess.role, 'owner')
          )
        )
        .limit(1);

      const userId = ownerAccess?.userId;
      if (!userId) {
        console.log(`   ⚠️  Skipping FHB account "${fhb.name}" - no owner found for operation`);
        stats.skipped++;
        continue;
      }

      // Check if already migrated (idempotency)
      const existing = await db
        .select({ id: userWarehouseAccounts.id })
        .from(userWarehouseAccounts)
        .where(
          and(
            eq(userWarehouseAccounts.userId, userId),
            eq(userWarehouseAccounts.providerKey, 'fhb'),
            eq(userWarehouseAccounts.displayName, fhb.name)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        console.log(`   ℹ️  FHB account "${fhb.name}" already migrated, skipping...`);
        stats.skipped++;
        continue;
      }

      // Create user_warehouse_account
      const [newAccount] = await db
        .insert(userWarehouseAccounts)
        .values({
          userId,
          providerKey: 'fhb',
          displayName: fhb.name,
          credentials: {
            appId: fhb.appId,
            secret: fhb.secret,
            apiUrl: fhb.apiUrl
          },
          status: fhb.status,
          lastTestedAt: fhb.lastTestedAt,
          testResult: fhb.testResult,
          initialSyncCompleted: fhb.initialSyncCompleted,
          initialSyncCompletedAt: fhb.initialSyncCompletedAt,
          createdAt: fhb.createdAt
        })
        .returning({ id: userWarehouseAccounts.id });

      stats.fhbAccountsMigrated++;
      console.log(`   ✅ Migrated FHB account "${fhb.name}" → ${newAccount.id}`);

      // Create user_warehouse_account_operations links
      for (const op of linkedOps) {
        await db
          .insert(userWarehouseAccountOperations)
          .values({
            accountId: newAccount.id,
            operationId: op.operationId,
            isDefault: true
          })
          .onConflictDoNothing();
        
        stats.operationLinkagesCreated++;
      }
    }

    // Step 2: Migrate European Fulfillment integrations
    console.log('\n📦 Step 2: Migrating European Fulfillment integrations...');
    
    const europeanIntegrations = await db
      .select({
        id: fulfillmentIntegrations.id,
        operationId: fulfillmentIntegrations.operationId,
        credentials: fulfillmentIntegrations.credentials,
        status: fulfillmentIntegrations.status,
        lastSyncAt: fulfillmentIntegrations.lastSyncAt,
        createdAt: fulfillmentIntegrations.createdAt,
        operationName: operations.name
      })
      .from(fulfillmentIntegrations)
      .innerJoin(operations, eq(operations.id, fulfillmentIntegrations.operationId))
      .where(eq(fulfillmentIntegrations.provider, 'european_fulfillment'));

    console.log(`   Found ${europeanIntegrations.length} European integrations`);

    for (const integration of europeanIntegrations) {
      // Find owner via userOperationAccess
      const [ownerAccess] = await db
        .select({ userId: userOperationAccess.userId })
        .from(userOperationAccess)
        .where(
          and(
            eq(userOperationAccess.operationId, integration.operationId),
            eq(userOperationAccess.role, 'owner')
          )
        )
        .limit(1);

      const userId = ownerAccess?.userId;
      if (!userId) {
        console.log(`   ⚠️  Skipping European integration for operation "${integration.operationName}" - no owner`);
        stats.skipped++;
        continue;
      }

      // Check if already migrated (idempotency)
      const displayName = `European Fulfillment - ${integration.operationName}`;
      const existing = await db
        .select({ id: userWarehouseAccounts.id })
        .from(userWarehouseAccounts)
        .where(
          and(
            eq(userWarehouseAccounts.userId, userId),
            eq(userWarehouseAccounts.providerKey, 'european_fulfillment'),
            eq(userWarehouseAccounts.displayName, displayName)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        console.log(`   ℹ️  European integration for "${integration.operationName}" already migrated, skipping...`);
        stats.skipped++;
        continue;
      }

      // Determine initialSyncCompleted based on legacy data
      // If integration was active and has lastSyncAt, assume initial sync was completed
      const initialSyncCompleted = integration.status === 'active' && !!integration.lastSyncAt;

      const [newAccount] = await db
        .insert(userWarehouseAccounts)
        .values({
          userId,
          providerKey: 'european_fulfillment',
          displayName,
          credentials: integration.credentials,
          status: integration.status,
          lastSyncAt: integration.lastSyncAt,
          initialSyncCompleted,
          initialSyncCompletedAt: integration.lastSyncAt, // Use lastSyncAt as proxy for completion time
          createdAt: integration.createdAt
        })
        .returning({ id: userWarehouseAccounts.id });

      stats.europeanMigrated++;
      console.log(`   ✅ Migrated European integration → ${newAccount.id}`);

      await db
        .insert(userWarehouseAccountOperations)
        .values({
          accountId: newAccount.id,
          operationId: integration.operationId,
          isDefault: true
        })
        .onConflictDoNothing();
      
      stats.operationLinkagesCreated++;
    }

    // Step 3: Migrate eLogy integrations
    console.log('\n📦 Step 3: Migrating eLogy integrations...');
    
    const elogyIntegrations = await db
      .select({
        id: fulfillmentIntegrations.id,
        operationId: fulfillmentIntegrations.operationId,
        credentials: fulfillmentIntegrations.credentials,
        status: fulfillmentIntegrations.status,
        lastSyncAt: fulfillmentIntegrations.lastSyncAt,
        createdAt: fulfillmentIntegrations.createdAt,
        operationName: operations.name
      })
      .from(fulfillmentIntegrations)
      .innerJoin(operations, eq(operations.id, fulfillmentIntegrations.operationId))
      .where(eq(fulfillmentIntegrations.provider, 'elogy'));

    console.log(`   Found ${elogyIntegrations.length} eLogy integrations`);

    for (const integration of elogyIntegrations) {
      // Find owner via userOperationAccess
      const [ownerAccess] = await db
        .select({ userId: userOperationAccess.userId })
        .from(userOperationAccess)
        .where(
          and(
            eq(userOperationAccess.operationId, integration.operationId),
            eq(userOperationAccess.role, 'owner')
          )
        )
        .limit(1);

      const userId = ownerAccess?.userId;
      if (!userId) {
        console.log(`   ⚠️  Skipping eLogy integration for operation "${integration.operationName}" - no owner`);
        stats.skipped++;
        continue;
      }

      // Check if already migrated (idempotency)
      const displayName = `eLogy - ${integration.operationName}`;
      const existing = await db
        .select({ id: userWarehouseAccounts.id })
        .from(userWarehouseAccounts)
        .where(
          and(
            eq(userWarehouseAccounts.userId, userId),
            eq(userWarehouseAccounts.providerKey, 'elogy'),
            eq(userWarehouseAccounts.displayName, displayName)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        console.log(`   ℹ️  eLogy integration for "${integration.operationName}" already migrated, skipping...`);
        stats.skipped++;
        continue;
      }

      // Determine initialSyncCompleted based on legacy data
      // If integration was active and has lastSyncAt, assume initial sync was completed
      const initialSyncCompleted = integration.status === 'active' && !!integration.lastSyncAt;

      const [newAccount] = await db
        .insert(userWarehouseAccounts)
        .values({
          userId,
          providerKey: 'elogy',
          displayName,
          credentials: integration.credentials,
          status: integration.status,
          lastSyncAt: integration.lastSyncAt,
          initialSyncCompleted,
          initialSyncCompletedAt: integration.lastSyncAt, // Use lastSyncAt as proxy for completion time
          createdAt: integration.createdAt
        })
        .returning({ id: userWarehouseAccounts.id });

      stats.elogyMigrated++;
      console.log(`   ✅ Migrated eLogy integration → ${newAccount.id}`);

      await db
        .insert(userWarehouseAccountOperations)
        .values({
          accountId: newAccount.id,
          operationId: integration.operationId,
          isDefault: true
        })
        .onConflictDoNothing();
      
      stats.operationLinkagesCreated++;
    }

    console.log('\n✨ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - FHB accounts migrated: ${stats.fhbAccountsMigrated}`);
    console.log(`   - European integrations migrated: ${stats.europeanMigrated}`);
    console.log(`   - eLogy integrations migrated: ${stats.elogyMigrated}`);
    console.log(`   - Operation linkages created: ${stats.operationLinkagesCreated}`);
    console.log(`   - Skipped (no owner): ${stats.skipped}`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

migrate();
