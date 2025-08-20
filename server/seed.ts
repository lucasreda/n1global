import { db } from "./db";
import { users, products, shippingProviders } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

export async function seedDatabase() {
  try {
    console.log("🌱 Starting database seeding...");
    
    // Check if admin user already exists
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@cod-dashboard.com"))
      .limit(1);

    if (!existingAdmin) {
      // Create admin user
      const hashedPassword = await bcrypt.hash("admin123", 10);
      
      const [adminUser] = await db
        .insert(users)
        .values({
          name: "Administrador",
          email: "admin@cod-dashboard.com",
          password: hashedPassword,
          role: "admin",
        })
        .returning();
      
      console.log("✅ Admin user created:", adminUser.email);
    } else {
      console.log("ℹ️  Admin user already exists");
    }

    // Check if European Fulfillment provider exists
    const [existingProvider] = await db
      .select()
      .from(shippingProviders)
      .where(eq(shippingProviders.name, "European Fulfillment Center"))
      .limit(1);

    if (!existingProvider) {
      const [provider] = await db
        .insert(shippingProviders)
        .values({
          name: "European Fulfillment Center",
          apiUrl: "https://api-test.ecomfulfilment.eu/",
          isActive: true,
        })
        .returning();
      
      console.log("✅ European Fulfillment provider created:", provider.name);
    } else {
      console.log("ℹ️  European Fulfillment provider already exists");
    }

    // Create sample products if none exist
    const existingProducts = await db.select().from(products).limit(1);
    
    if (existingProducts.length === 0) {
      const sampleProducts = [
        {
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