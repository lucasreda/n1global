import { db } from "./db";
import { users, products, shippingProviders, stores } from "@shared/schema";
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

    // Check if European Fulfillment provider exists for this store
    const [existingProvider] = await db
      .select()
      .from(shippingProviders)
      .where(eq(shippingProviders.storeId, defaultStore.id))
      .limit(1);

    if (!existingProvider) {
      const [provider] = await db
        .insert(shippingProviders)
        .values({
          storeId: defaultStore.id,
          name: "European Fulfillment Center",
          apiUrl: "https://api-test.ecomfulfilment.eu/",
          isActive: true,
        })
        .returning();
      
      console.log("✅ European Fulfillment provider created:", provider.name);
    } else {
      console.log("ℹ️  European Fulfillment provider already exists");
    }

    // Create sample products if none exist for this store
    const existingProducts = await db
      .select()
      .from(products)
      .where(eq(products.storeId, defaultStore.id))
      .limit(1);
    
    if (existingProducts.length === 0) {
      const sampleProducts = [
        {
          storeId: defaultStore.id,
          sku: "RS-8050",
          name: "Produto Premium",
          description: "Produto de alta qualidade",
          price: "149.90",
          stock: 25,
          lowStock: 5,
          imageUrl: "https://via.placeholder.com/300x300",
          videoUrl: "https://example.com/video",
          productUrl: "https://example.com/product",
          isActive: true,
        },
        {
          storeId: defaultStore.id,
          sku: "PD-933000", 
          name: "Parfum Luxo",
          description: "Perfume importado",
          price: "199.50",
          stock: 40,
          lowStock: 10,
          imageUrl: "https://via.placeholder.com/300x300",
          videoUrl: "https://example.com/video2",
          productUrl: "https://example.com/product2",
          isActive: true,
        },
      ];

      await db.insert(products).values(sampleProducts);
      console.log("✅ Sample products created");
    } else {
      console.log("ℹ️  Products already exist");
    }

    console.log("🌱 Database seeding completed!");
  } catch (error) {
    console.error("❌ Database seeding failed:", error);
    throw error;
  }
}