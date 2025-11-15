import { db } from "./db";
import { warehouseProviders } from "@shared/schema";

const DEFAULT_WAREHOUSE_PROVIDERS = [
  {
    key: "fhb",
    name: "FHB Fulfillment Hub",
    description: "FHB Fulfillment Hub - European warehouse and shipping service",
    requiredFields: [
      { fieldName: "username", fieldType: "text", label: "Usuário", placeholder: "seu_usuario", required: true },
      { fieldName: "password", fieldType: "password", label: "Senha", placeholder: "********", required: true },
    ],
    isActive: true,
  },
  {
    key: "european_fulfillment",
    name: "European Fulfillment",
    description: "European Fulfillment Center - Complete logistics solution",
    requiredFields: [
      { fieldName: "username", fieldType: "text", label: "Usuário", placeholder: "seu_usuario", required: true },
      { fieldName: "password", fieldType: "password", label: "Senha", placeholder: "********", required: true },
    ],
    isActive: true,
  },
  {
    key: "elogy",
    name: "eLogy Logistics",
    description: "eLogy - Smart logistics and fulfillment platform",
    requiredFields: [
      { fieldName: "username", fieldType: "text", label: "Usuário", placeholder: "seu_usuario", required: true },
      { fieldName: "password", fieldType: "password", label: "Senha", placeholder: "********", required: true },
    ],
    isActive: true,
  },
  {
    key: "big_arena",
    name: "Big Arena Logistics",
    description: "Integração Big Arena para pedidos, estoque, produtos e logística",
    requiredFields: [
      { fieldName: "apiToken", fieldType: "password", label: "API Token", placeholder: "seu_token_api", required: true },
    ],
    isActive: true,
  },
] as const;

type WarehouseProviderSeed = (typeof DEFAULT_WAREHOUSE_PROVIDERS)[number];

export async function ensureWarehouseProvidersCatalog() {
  for (const provider of DEFAULT_WAREHOUSE_PROVIDERS) {
    await upsertWarehouseProvider(provider);
  }
}

async function upsertWarehouseProvider(provider: WarehouseProviderSeed) {
  await db
    .insert(warehouseProviders)
    .values({
      key: provider.key,
      name: provider.name,
      description: provider.description,
      requiredFields: provider.requiredFields as any,
      isActive: provider.isActive,
    })
    .onConflictDoUpdate({
      target: warehouseProviders.key,
      set: {
        name: provider.name,
        description: provider.description,
        requiredFields: provider.requiredFields as any,
        isActive: provider.isActive,
        updatedAt: new Date(),
      },
    });
}

