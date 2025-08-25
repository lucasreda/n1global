import { db } from "./db";
import { users, products, shippingProviders, stores, operations, userOperationAccess } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

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

    // ⚠️ CRITICAL: Give fresh user access to all existing operations
    // This is what was missing causing the operations selector to be empty in production!
    const [freshUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, "fresh@teste.com"))
      .limit(1);

    if (freshUser) {
      // Get all existing operations
      const allOperations = await db.select().from(operations);
      
      for (const operation of allOperations) {
        // Check if access already exists
        const [existingAccess] = await db
          .select()
          .from(userOperationAccess)
          .where(eq(userOperationAccess.userId, freshUser.id))
          .where(eq(userOperationAccess.operationId, operation.id))
          .limit(1);

        if (!existingAccess) {
          await db
            .insert(userOperationAccess)
            .values({
              userId: freshUser.id,
              operationId: operation.id,
              role: 'viewer' // Fresh user gets viewer access to all operations
            });
          
          console.log(`✅ Granted fresh user access to operation: ${operation.name}`);
        }
      }
    }

    console.log("🌱 Database seeding completed!");
  } catch (error) {
    console.error("❌ Database seeding failed:", error);
    throw error;
  }
}