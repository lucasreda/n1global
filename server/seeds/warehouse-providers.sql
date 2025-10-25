--
-- Seed data for warehouse_providers table
-- Defines available warehouse/fulfillment providers with their required fields
--
-- Execute with: psql $DATABASE_URL -f server/seeds/warehouse-providers.sql
--

-- FHB Provider
INSERT INTO warehouse_providers (key, name, description, required_fields, is_active) VALUES (
  'fhb',
  'FHB Fulfillment Hub',
  'European fulfillment provider with warehouses in Slovakia and neighboring countries',
  '[
    {"fieldName": "email", "fieldType": "email", "label": "Email FHB", "required": true},
    {"fieldName": "password", "fieldType": "password", "label": "Senha FHB", "required": true},
    {"fieldName": "apiUrl", "fieldType": "text", "label": "URL da API", "required": false}
  ]'::jsonb,
  true
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  required_fields = EXCLUDED.required_fields,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- European Fulfillment Provider
INSERT INTO warehouse_providers (key, name, description, required_fields, is_active) VALUES (
  'european_fulfillment',
  'European Fulfillment',
  'Multi-country European fulfillment network (Portugal, Spain, Italy, France, Germany)',
  '[
    {"fieldName": "email", "fieldType": "email", "label": "Email European Fulfillment", "required": true},
    {"fieldName": "password", "fieldType": "password", "label": "Senha European Fulfillment", "required": true},
    {"fieldName": "country", "fieldType": "select", "label": "País", "placeholder": "portugal,spain,italy,france,germany", "required": true},
    {"fieldName": "apiUrl", "fieldType": "text", "label": "URL da API", "required": false}
  ]'::jsonb,
  true
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  required_fields = EXCLUDED.required_fields,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- eLogy Provider
INSERT INTO warehouse_providers (key, name, description, required_fields, is_active) VALUES (
  'elogy',
  'eLogy Logistics',
  'Polish logistics and fulfillment provider with advanced warehouse management',
  '[
    {"fieldName": "email", "fieldType": "email", "label": "Email eLogy", "required": true},
    {"fieldName": "password", "fieldType": "password", "label": "Senha eLogy", "required": true},
    {"fieldName": "authHeader", "fieldType": "text", "label": "Auth Header", "required": false},
    {"fieldName": "warehouseId", "fieldType": "text", "label": "Warehouse ID", "required": false},
    {"fieldName": "apiUrl", "fieldType": "text", "label": "URL da API", "required": false}
  ]'::jsonb,
  true
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  required_fields = EXCLUDED.required_fields,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- Verify seeded data
SELECT key, name, is_active FROM warehouse_providers ORDER BY key;
