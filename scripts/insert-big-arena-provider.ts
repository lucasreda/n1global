import "dotenv/config";
import { ensureWarehouseProvidersCatalog } from "../server/warehouse-providers-catalog";

async function insertBigArenaProvider() {
  console.log("🔧 Ensuring Big Arena provider is in database...\n");

  try {
    await ensureWarehouseProvidersCatalog();
    console.log("\n✅ Big Arena provider should now be in database!");
    console.log("   Please run check-big-arena-provider.ts to verify.");
  } catch (error) {
    console.error("❌ Error ensuring Big Arena provider:", error);
    process.exit(1);
  }

  process.exit(0);
}

insertBigArenaProvider();

