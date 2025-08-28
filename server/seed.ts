import { db } from "./db";
import { users, products, shippingProviders, stores, operations, userOperationAccess } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq, inArray, and } from "drizzle-orm";

export async function seedDatabase() {
  try {
    console.log("🌱 Starting database seeding...");
    
    // Check if store owner already exists
    const [existingOwner] = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@cod-dashboard.com"))
      .limit(1);

    let storeOwner;
    let defaultStore;

    if (!existingOwner) {
      // Create store owner user (convert admin to store)
      const hashedPassword = await bcrypt.hash("admin123", 10);
      
      [storeOwner] = await db
        .insert(users)
        .values({
          name: "Store Owner",
          email: "admin@cod-dashboard.com",
          password: hashedPassword,
          role: "store",
        })
        .returning();
      
      console.log("✅ Store owner created:", storeOwner.email);
    } else {
      // Update existing admin to store role
      [storeOwner] = await db
        .update(users)
        .set({ role: "store" })
        .where(eq(users.email, "admin@cod-dashboard.com"))
        .returning();
      
      console.log("✅ Updated admin to store role");
    }

    // Check if default store exists
    const [existingStore] = await db
      .select()
      .from(stores)
      .where(eq(stores.ownerId, storeOwner.id))
      .limit(1);

    if (!existingStore) {
      // Create default store
      [defaultStore] = await db
        .insert(stores)
        .values({
          name: "COD Dashboard Store",
          description: "Primary store for COD operations",
          ownerId: storeOwner.id,
          settings: {},
        })
        .returning();
      
      console.log("✅ Default store created:", defaultStore.name);
    } else {
      defaultStore = existingStore;
      console.log("ℹ️  Default store already exists");
    }

    // Check if default operation exists
    let defaultOperation;
    const [existingOperation] = await db
      .select()
      .from(operations)
      .where(eq(operations.storeId, defaultStore.id))
      .limit(1);

    if (!existingOperation) {
      [defaultOperation] = await db
        .insert(operations)
        .values({
          storeId: defaultStore.id,
          name: "PureDreams",
          description: "Default operation for COD business",
          country: "IT", // Default to Italy
          currency: "EUR", // Default to Euro
          status: "active",
        })
        .returning();
      
      console.log("✅ Default operation created:", defaultOperation.name);
    } else {
      defaultOperation = existingOperation;
      console.log("ℹ️  Default operation already exists");
    }

    // Check if European Fulfillment provider exists for this operation
    const [existingProvider] = await db
      .select()
      .from(shippingProviders)
      .where(eq(shippingProviders.operationId, defaultOperation.id))
      .limit(1);

    if (!existingProvider) {
      const [provider] = await db
        .insert(shippingProviders)
        .values({
          storeId: defaultStore.id,
          operationId: defaultOperation.id,
          name: "European Fulfillment Center",
          type: "european_fulfillment",
          apiUrl: "https://api-test.ecomfulfilment.eu/",
          isActive: true,
        })
        .returning();
      
      console.log("✅ European Fulfillment provider created:", provider.name);
    } else {
      console.log("ℹ️  European Fulfillment provider already exists");
    }

    // Sample products removed - no longer creating automatic demo products
    console.log("ℹ️  Skipped sample products creation (disabled)");

    // Check if fresh user already exists
    const [existingFreshUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, "fresh@teste.com"))
      .limit(1);

    if (!existingFreshUser) {
      // Create fresh regular user
      const hashedPassword = await bcrypt.hash("password123", 10);
      
      const [freshUser] = await db
        .insert(users)
        .values({
          name: "Fresh User",
          email: "fresh@teste.com",
          password: hashedPassword,
          role: "user",
          onboardingCompleted: true,
        })
        .returning();
      
      console.log("✅ Fresh user created:", freshUser.email);
    } else {
      console.log("ℹ️  Fresh user already exists");
      // Fix password if needed
      const hashedPassword = await bcrypt.hash("password123", 10);
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.email, "fresh@teste.com"));
      console.log("🔧 Fresh user password updated");
    }

    // Check if super admin already exists
    const [existingSuperAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, "super@admin.com"))
      .limit(1);

    if (!existingSuperAdmin) {
      // Create super admin user
      const hashedPassword = await bcrypt.hash("password123", 10);
      
      const [superAdmin] = await db
        .insert(users)
        .values({
          name: "Super Administrator",
          email: "super@admin.com",
          password: hashedPassword,
          role: "super_admin",
          onboardingCompleted: true,
        })
        .returning();
      
      console.log("✅ Super admin created:", superAdmin.email);
    } else {
      console.log("ℹ️  Super admin already exists");
    }

    // Check if finance admin already exists
    const [existingFinanceAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, "finance@codashboard.com"))
      .limit(1);

    if (!existingFinanceAdmin) {
      // Create finance admin user (sem storeId - é um usuário global)
      const hashedPassword = await bcrypt.hash("FinanceCOD2025!@#", 10);
      
      const [financeAdmin] = await db
        .insert(users)
        .values({
          name: "Finance Admin",
          email: "finance@codashboard.com",
          password: hashedPassword,
          role: "admin_financeiro",
          onboardingCompleted: true,
        })
        .returning();
      
      console.log("✅ Finance admin created:", financeAdmin.email);
    } else {
      console.log("ℹ️  Finance admin already exists");
      // Remove storeId se existir - usuários financeiros são globais
      await db
        .update(users)
        .set({ storeId: null })
        .where(eq(users.email, "finance@codashboard.com"));
      console.log("🔧 Finance admin storeId removed (global user)");
    }

    // Check if investor user already exists
    const [existingInvestor] = await db
      .select()
      .from(users)
      .where(eq(users.email, "investor@codashboard.com"))
      .limit(1);

    if (!existingInvestor) {
      // Create investor user
      const hashedPassword = await bcrypt.hash("InvestorCOD2025!@#", 10);
      
      const [investor] = await db
        .insert(users)
        .values({
          name: "João Investidor",
          email: "investor@codashboard.com",
          password: hashedPassword,
          role: "investor",
          onboardingCompleted: true,
        })
        .returning();
      
      console.log("✅ Investor created:", investor.email);
    } else {
      console.log("ℹ️  Investor already exists");
    }

    // ⚠️ CRITICAL: Clean and setup fresh user access to correct operations
    const [freshUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, "fresh@teste.com"))
      .limit(1);

    if (freshUser) {
      // First, remove ALL existing accesses for fresh user to clean state
      console.log("🧹 Cleaning existing fresh user accesses...");
      await db
        .delete(userOperationAccess)
        .where(eq(userOperationAccess.userId, freshUser.id));

      // Get specific operations for fresh user (exclude PureDreams - it's for admin only)
      const relevantOperations = await db
        .select()
        .from(operations)
        .where(inArray(operations.name, ['Dss', 'test 2', 'Test 3']));
      
      console.log(`🎯 Setting up access for fresh user to ${relevantOperations.length} operations...`);
      
      for (const operation of relevantOperations) {
        await db
          .insert(userOperationAccess)
          .values({
            userId: freshUser.id,
            operationId: operation.id,
            role: 'owner' // Fresh user gets owner access to his relevant operations
          });
        
        console.log(`✅ Granted fresh user access to operation: ${operation.name}`);
      }
      
      // Verify final state
      const finalAccess = await db
        .select()
        .from(userOperationAccess)
        .innerJoin(operations, eq(userOperationAccess.operationId, operations.id))
        .where(eq(userOperationAccess.userId, freshUser.id));
      
      console.log("🔍 Final fresh user operations:", finalAccess.map(item => item.operations.name));
      
      // PRODUCTION DEBUG: Extra verification
      const verifyAccess = await db
        .select()
        .from(userOperationAccess)
        .where(eq(userOperationAccess.userId, freshUser.id));
      console.log("🔍 SEED VERIFICATION - Access count:", verifyAccess.length);
      console.log("🔍 SEED VERIFICATION - Access details:", verifyAccess.map(a => a.operationId));
    }

    // Create investment pool and sample data for investor
    const { investmentPools, investments, investmentTransactions } = await import("@shared/schema");
    
    // Check if investment pool exists
    const [existingPool] = await db
      .select()
      .from(investmentPools)
      .where(eq(investmentPools.name, "COD Operations Fund I"))
      .limit(1);

    let poolId;
    if (!existingPool) {
      // Create investment pool
      const [pool] = await db
        .insert(investmentPools)
        .values({
          name: "COD Operations Fund I",
          description: "Fundo de investimento focado em operações Cash on Delivery na Europa, com retorno mensal consistente baseado nas margens das operações.",
          totalValue: "1375000.00", // R$1,375,000
          totalInvested: "825000.00", // R$825,000 invested
          monthlyReturn: "0.025", // 2.5% monthly
          yearlyReturn: "0.30", // 30% yearly
          minInvestment: "27500.00", // R$27,500 minimum
          riskLevel: "medium",
          investmentStrategy: "Investimento em operações COD de alto volume com margens consistentes. Diversificação em múltiplos países europeus e categorias de produtos."
        })
        .returning();
      
      poolId = pool.id;
      console.log("✅ Investment pool created:", pool.name);
    } else {
      poolId = existingPool.id;
      console.log("ℹ️  Investment pool already exists");
    }

    // Create sample investment for the investor
    if (existingInvestor) {
      const [existingInvestment] = await db
        .select()
        .from(investments)
        .where(and(
          eq(investments.investorId, existingInvestor.id),
          eq(investments.poolId, poolId)
        ))
        .limit(1);

      if (!existingInvestment) {
        // Create investment record
        const [investment] = await db
          .insert(investments)
          .values({
            investorId: existingInvestor.id,
            poolId: poolId,
            totalInvested: "137500.00", // R$137,500 invested
            currentValue: "151250.00", // R$151,250 current value (10% gain)
            totalReturns: "13750.00", // R$13,750 in returns
            returnRate: "0.10", // 10% return rate
            monthlyReturn: "0.025", // 2.5% monthly
            firstInvestmentDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000), // 6 months ago
            lastTransactionDate: new Date()
          })
          .returning();

        console.log("✅ Sample investment created for investor");

        // Create sample transactions
        const transactions = [
          {
            investmentId: investment.id,
            investorId: existingInvestor.id,
            poolId: poolId,
            type: "deposit",
            amount: "137500.00",
            description: "Investimento inicial",
            paymentMethod: "bank_transfer",
            paymentStatus: "completed",
            processedAt: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
          },
          {
            investmentId: investment.id,
            investorId: existingInvestor.id,
            poolId: poolId,
            type: "return_payment",
            amount: "3437.50",
            description: "Janeiro",
            paymentStatus: "completed",
            processedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          },
          {
            investmentId: investment.id,
            investorId: existingInvestor.id,
            poolId: poolId,
            type: "return_payment",
            amount: "3781.25",
            description: "Fevereiro",
            paymentStatus: "completed",
            processedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
          }
        ];

        for (const txData of transactions) {
          await db
            .insert(investmentTransactions)
            .values(txData);
        }

        console.log("✅ Sample transactions created");
      }
    }

    console.log("🌱 Database seeding completed!");
  } catch (error) {
    console.error("❌ Database seeding failed:", error);
    throw error;
  }
}