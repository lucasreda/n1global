import "dotenv/config";
import { db } from "../server/db";
import { warehouseProviders } from "@shared/schema";
import { eq } from "drizzle-orm";

async function checkBigArenaProvider() {
  console.log("🔍 Checking Big Arena provider in database...\n");

  try {
    // Check all providers
    const allProviders = await db.select().from(warehouseProviders);
    console.log(`📦 Found ${allProviders.length} total providers in database:`);
    allProviders.forEach((p) => {
      console.log(`   - ${p.key}: ${p.name} (active: ${p.isActive})`);
    });

    // Check specifically for Big Arena
    const [bigArena] = await db
      .select()
      .from(warehouseProviders)
      .where(eq(warehouseProviders.key, "big_arena"))
      .limit(1);

    if (bigArena) {
      console.log("\n✅ Big Arena provider found in database:");
      console.log(`   Key: ${bigArena.key}`);
      console.log(`   Name: ${bigArena.name}`);
      console.log(`   Active: ${bigArena.isActive}`);
      console.log(`   Required Fields:`, JSON.stringify(bigArena.requiredFields, null, 2));
    } else {
      console.log("\n❌ Big Arena provider NOT found in database!");
      console.log("   This should be fixed by ensureWarehouseProvidersCatalog() on server startup.");
    }

    // Check active providers only
    const activeProviders = await db
      .select()
      .from(warehouseProviders)
      .where(eq(warehouseProviders.isActive, true));
    console.log(`\n✅ Found ${activeProviders.length} active providers:`);
    activeProviders.forEach((p) => {
      console.log(`   - ${p.key}: ${p.name}`);
    });

    const hasActiveBigArena = activeProviders.some((p) => p.key === "big_arena");
    if (!hasActiveBigArena) {
      console.log("\n⚠️ Big Arena is NOT active in database!");
    } else {
      console.log("\n✅ Big Arena is active in database!");
    }
  } catch (error) {
    console.error("❌ Error checking Big Arena provider:", error);
    process.exit(1);
  }

  process.exit(0);
}

checkBigArenaProvider();

