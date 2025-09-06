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

    // Check and create N1 Warehouse providers
    const existingProviders = await db
      .select()
      .from(shippingProviders)
      .where(eq(shippingProviders.operationId, defaultOperation.id));

    const providerNames = existingProviders.map(p => p.name);

    // Create N1 Warehouse 1 if it doesn't exist
    if (!providerNames.includes("N1 Warehouse 1")) {
      const [provider1] = await db
        .insert(shippingProviders)
        .values({
          storeId: defaultStore.id,
          operationId: defaultOperation.id,
          name: "N1 Warehouse 1",
          type: "european_fulfillment",
          apiUrl: "https://api-test.ecomfulfilment.eu/",
          isActive: true,
        })
        .returning();
      
      console.log("✅ N1 Warehouse 1 provider created:", provider1.name);
    } else {
      console.log("ℹ️  N1 Warehouse 1 provider already exists");
    }

    // Create N1 Warehouse 2 if it doesn't exist
    if (!providerNames.includes("N1 Warehouse 2")) {
      const [provider2] = await db
        .insert(shippingProviders)
        .values({
          storeId: defaultStore.id,
          operationId: defaultOperation.id,
          name: "N1 Warehouse 2",
          type: "european_fulfillment",
          apiUrl: "https://api-test.ecomfulfilment.eu/",
          isActive: true,
        })
        .returning();
      
      console.log("✅ N1 Warehouse 2 provider created:", provider2.name);
    } else {
      console.log("ℹ️  N1 Warehouse 2 provider already exists");
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

    // Check if investment admin already exists
    const [existingInvestmentAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin.investment@codashboard.com"))
      .limit(1);

    if (!existingInvestmentAdmin) {
      // Create investment admin user
      const hashedPassword = await bcrypt.hash("AdminInvest2025!@#", 10);
      
      const [investmentAdmin] = await db
        .insert(users)
        .values({
          name: "Admin Investimentos",
          email: "admin.investment@codashboard.com",
          password: hashedPassword,
          role: "admin_investimento",
          onboardingCompleted: true,
        })
        .returning();
      
      console.log("✅ Investment admin created:", investmentAdmin.email);
    } else {
      console.log("ℹ️  Investment admin already exists");
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
          slug: "cod-operations-fund-i",
          description: "Fundo de investimento focado em operações Cash on Delivery na Europa, com retorno mensal consistente baseado nas margens das operações.",
          totalValue: "10000000.00", // R$10,000,000
          totalInvested: "1000000.00", // R$1,000,000 invested
          monthlyReturn: "0.08", // 8% monthly
          yearlyReturn: "1.51", // 151% yearly (compound calculation)
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

    // Create second investment pool
    const [existingPool2] = await db
      .select()
      .from(investmentPools)
      .where(eq(investmentPools.name, "Fundo Digital Elite"))
      .limit(1);

    let pool2Id;
    if (!existingPool2) {
      // Create second investment pool
      const [pool2] = await db
        .insert(investmentPools)
        .values({
          name: "Fundo Digital Elite",
          slug: "fundo-digital-elite",
          description: "Fundo de investimento premium focado em operações digitais de alta performance, com retorno mensal de 7% e gestão exclusiva.",
          totalValue: "1000000.00", // R$1,000,000
          totalInvested: "0.00", // Available for investment
          monthlyReturn: "0.07", // 7% monthly
          yearlyReturn: "1.25", // 125% yearly (compound calculation)
          minInvestment: "50000.00", // R$50,000 minimum
          riskLevel: "high",
          investmentStrategy: "Fundo exclusivo para investidores qualificados, focado em operações digitais de alto retorno e inovação tecnológica."
        })
        .returning();
      
      pool2Id = pool2.id;
      console.log("✅ Second investment pool created:", pool2.name);
    } else {
      pool2Id = existingPool2.id;
      console.log("ℹ️  Second investment pool already exists");
    }

    // Get investor if exists (to fix reference issue)
    const [investor] = await db
      .select()
      .from(users)
      .where(eq(users.email, "investor@codashboard.com"))
      .limit(1);

    // Create sample investment for the investor
    if (investor) {
      const [existingInvestment] = await db
        .select()
        .from(investments)
        .where(and(
          eq(investments.investorId, investor.id),
          eq(investments.poolId, poolId)
        ))
        .limit(1);

      if (!existingInvestment) {
        // Create investment record
        const [investment] = await db
          .insert(investments)
          .values({
            investorId: investor.id,
            poolId: poolId,
            totalInvested: "1000000.00", // R$1,000,000 invested
            currentValue: "1586874.32", // R$1,586,874.32 current value (58.7% gain over 6 months)
            totalReturns: "586874.32", // R$586,874.32 in returns
            returnRate: "0.10", // 10% return rate
            monthlyReturn: "0.08", // 8% monthly
            firstInvestmentDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000), // 6 months ago
            lastTransactionDate: new Date()
          })
          .returning();

        console.log("✅ Sample investment created for investor");

        // Create sample transactions
        const transactions = [
          {
            investmentId: investment.id,
            investorId: investor.id,
            poolId: poolId,
            type: "deposit",
            amount: "1000000.00",
            description: "Investimento inicial",
            paymentMethod: "bank_transfer",
            paymentStatus: "completed",
            processedAt: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
          },
          {
            investmentId: investment.id,
            investorId: investor.id,
            poolId: poolId,
            type: "return_payment",
            amount: "25000.00",
            description: "Janeiro",
            paymentStatus: "completed",
            processedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          },
          {
            investmentId: investment.id,
            investorId: investor.id,
            poolId: poolId,
            type: "return_payment",
            amount: "27500.00",
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

    // =========================================
    // SUPPORT SYSTEM SEED DATA (TEMPORARILY DISABLED)
    // =========================================
    
    console.log("📧 Setting up support system...");
    
    // Create support categories
    const { supportCategories, supportResponses } = await import("@shared/schema");
    
    const defaultCategories = [
      {
        name: 'duvidas',
        displayName: 'Dúvidas',
        description: 'Perguntas sobre rastreamento, produtos e serviços',
        isAutomated: true,
        priority: 1,
        color: '#3b82f6'
      },
      {
        name: 'reclamacoes',
        displayName: 'Reclamações',
        description: 'Problemas com produtos ou serviços',
        isAutomated: false,
        priority: 5,
        color: '#ef4444'
      },
      {
        name: 'alteracao_endereco',
        displayName: 'Alteração de Endereço',
        description: 'Solicitações de mudança de endereço de entrega',
        isAutomated: true,
        priority: 3,
        color: '#f59e0b'
      },
      {
        name: 'cancelamento',
        displayName: 'Cancelamento',
        description: 'Solicitações de cancelamento de pedidos',
        isAutomated: true,
        priority: 4,
        color: '#f97316'
      },
      {
        name: 'manual',
        displayName: 'Manual',
        description: 'Emails que requerem análise manual da equipe',
        isAutomated: false,
        priority: 10,
        color: '#6b7280'
      }
    ];

    for (const categoryData of defaultCategories) {
      const existing = await db
        .select()
        .from(supportCategories)
        .where(eq(supportCategories.name, categoryData.name))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(supportCategories).values(categoryData);
        console.log(`✅ Created support category: ${categoryData.displayName}`);
      } else {
        console.log(`ℹ️  Support category ${categoryData.displayName} already exists`);
      }
    }

    // Create default response templates
    const categories = await db.select().from(supportCategories);
    
    const defaultResponses = [
      {
        categoryName: 'duvidas',
        name: 'Resposta Automática - Dúvidas',
        subject: 'Re: {{original_subject}}',
        textContent: `Olá {{customer_name}},

Recebemos sua mensagem e agradecemos por entrar em contato conosco.

Para dúvidas sobre rastreamento, você pode consultar o status do seu pedido através do nosso sistema.

Se precisar de mais informações, nossa equipe retornará em breve.

Atenciosamente,
Equipe de Suporte N1`,
        isDefault: true,
        isActive: true
      },
      {
        categoryName: 'alteracao_endereco',
        name: 'Resposta Automática - Alteração de Endereço',
        subject: 'Re: {{original_subject}} - Alteração de Endereço',
        textContent: `Olá {{customer_name}},

Recebemos sua solicitação de alteração de endereço.

Nossa equipe está analisando sua solicitação e retornará com as instruções necessárias em até 24 horas.

Atenciosamente,
Equipe de Suporte N1`,
        isDefault: true,
        isActive: true
      },
      {
        categoryName: 'cancelamento',
        name: 'Resposta Automática - Cancelamento',
        subject: 'Re: {{original_subject}} - Solicitação de Cancelamento',
        textContent: `Olá {{customer_name}},

Recebemos sua solicitação de cancelamento.

Nossa equipe está processando sua solicitação e retornará com os detalhes do processo em até 24 horas.

Atenciosamente,
Equipe de Suporte N1`,
        isDefault: true,
        isActive: true
      }
    ];

    for (const responseData of defaultResponses) {
      const category = categories.find(c => c.name === responseData.categoryName);
      if (!category) continue;

      const existing = await db
        .select()
        .from(supportResponses)
        .where(and(
          eq(supportResponses.categoryId, category.id),
          eq(supportResponses.isDefault, true)
        ))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(supportResponses).values({
          categoryId: category.id,
          name: responseData.name,
          subject: responseData.subject,
          textContent: responseData.textContent,
          isDefault: responseData.isDefault,
          isActive: responseData.isActive
        });
        console.log(`✅ Created default response for: ${category.displayName}`);
      } else {
        console.log(`ℹ️  Default response for ${category.displayName} already exists`);
      }
    }

    console.log("📧 Support system setup completed!");

    console.log("🌱 Database seeding completed!");
  } catch (error) {
    console.error("❌ Database seeding failed:", error);
    throw error;
  }
}