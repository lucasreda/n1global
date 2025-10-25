/**
 * Seed Warehouse Providers
 * 
 * Populates warehouse_providers table with available fulfillment providers.
 * 
 * Execute with: tsx server/seeds/warehouse-providers.ts
 */

import { db } from '../db.js';
import { warehouseProviders } from '../../shared/schema.js';

const providers = [
  {
    key: 'fhb',
    name: 'FHB Fulfillment Hub',
    description: 'European fulfillment provider with warehouses in Slovakia and neighboring countries',
    requiredFields: [
      { fieldName: 'email', fieldType: 'email', label: 'Email FHB', required: true },
      { fieldName: 'password', fieldType: 'password', label: 'Senha FHB', required: true },
      { fieldName: 'apiUrl', fieldType: 'text', label: 'URL da API', required: false }
    ],
    isActive: true
  },
  {
    key: 'european_fulfillment',
    name: 'European Fulfillment',
    description: 'Multi-country European fulfillment network (Portugal, Spain, Italy, France, Germany)',
    requiredFields: [
      { fieldName: 'email', fieldType: 'email', label: 'Email European Fulfillment', required: true },
      { fieldName: 'password', fieldType: 'password', label: 'Senha European Fulfillment', required: true },
      { fieldName: 'country', fieldType: 'select', label: 'País', placeholder: 'portugal,spain,italy,france,germany', required: true },
      { fieldName: 'apiUrl', fieldType: 'text', label: 'URL da API', required: false }
    ],
    isActive: true
  },
  {
    key: 'elogy',
    name: 'eLogy Logistics',
    description: 'Polish logistics and fulfillment provider with advanced warehouse management',
    requiredFields: [
      { fieldName: 'email', fieldType: 'email', label: 'Email eLogy', required: true },
      { fieldName: 'password', fieldType: 'password', label: 'Senha eLogy', required: true },
      { fieldName: 'authHeader', fieldType: 'text', label: 'Auth Header', required: false },
      { fieldName: 'warehouseId', fieldType: 'text', label: 'Warehouse ID', required: false },
      { fieldName: 'apiUrl', fieldType: 'text', label: 'URL da API', required: false }
    ],
    isActive: true
  }
];

async function seed() {
  console.log('🌱 Seeding warehouse providers...\n');

  try {
    for (const provider of providers) {
      console.log(`📦 Inserting provider: ${provider.name}`);
      
      await db
        .insert(warehouseProviders)
        .values(provider)
        .onConflictDoUpdate({
          target: warehouseProviders.key,
          set: {
            name: provider.name,
            description: provider.description,
            requiredFields: provider.requiredFields,
            isActive: provider.isActive,
            updatedAt: new Date()
          }
        });
      
      console.log(`   ✅ ${provider.key} seeded successfully`);
    }

    console.log('\n✨ All warehouse providers seeded successfully!');
    
    // Verify
    console.log('\n📊 Current warehouse providers:');
    const allProviders = await db.select().from(warehouseProviders);
    allProviders.forEach(p => {
      console.log(`   - ${p.key}: ${p.name} (${p.isActive ? 'active' : 'inactive'})`);
    });

  } catch (error) {
    console.error('❌ Error seeding warehouse providers:', error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
