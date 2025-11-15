import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Função de normalização igual à do código
function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.toLowerCase();
  cleaned = cleaned.replace(/\b(ext|extension|ramal|x)\s*\.?\s*\d+/gi, '');
  return cleaned.replace(/[^\d]/g, '');
}

function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .trim();
}

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔍 Investigando pedidos EF entregues não vinculados...\n');
  
  // 1. Buscar pedidos EF entregues processados mas não vinculados
  const unlinked = await pool.query(`
    SELECT 
      ef.id,
      ef.order_number,
      ef.status,
      ef.value,
      ef.tracking,
      ef.european_order_id,
      ef.recipient->>'name' as name,
      ef.recipient->>'phone' as phone,
      ef.recipient->>'email' as email,
      ef.recipient->>'city' as city,
      ef.raw_data->>'status_livrison' as api_status_livrison,
      ef.raw_data->>'status_confirmation' as api_status_confirmation
    FROM european_fulfillment_orders ef
    LEFT JOIN orders o ON 
      o.carrier_order_id = ef.european_order_id
      OR o.tracking_number = ef.tracking
      OR (o.provider = 'european_fulfillment' AND o.provider_data->'european_fulfillment'->>'orderNumber' = ef.order_number)
    WHERE ef.account_id = $1
    AND ef.status = 'delivered'
    AND ef.processed_to_orders = true
    AND o.id IS NULL
  `, [accountId]);
  
  console.log(`📦 Encontrados ${unlinked.rows.length} pedidos EF entregues não vinculados:\n`);
  
  for (const efOrder of unlinked.rows) {
    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`Pedido EF: ${efOrder.order_number}`);
    console.log(`   Status: ${efOrder.status}`);
    console.log(`   Valor: €${efOrder.value}`);
    console.log(`   Tracking: ${efOrder.tracking || 'N/A'}`);
    console.log(`   Nome: ${efOrder.name || 'N/A'}`);
    console.log(`   Telefone: ${efOrder.phone || 'N/A'}`);
    console.log(`   Email: ${efOrder.email || 'N/A'}`);
    console.log(`   Cidade: ${efOrder.city || 'N/A'}`);
    
    // Tentar encontrar match na Shopify
    console.log(`\n   🔍 Tentando encontrar match na Shopify...`);
    
    let matchesByPhone = { rows: [] };
    
    // 1. Por telefone
    if (efOrder.phone) {
      const normalizedEFPhone = normalizePhone(efOrder.phone);
      const suffix = normalizedEFPhone.length >= 9 ? normalizedEFPhone.slice(-9) : normalizedEFPhone;
      
      matchesByPhone = await pool.query(`
        SELECT 
          id,
          shopify_order_number,
          customer_name,
          customer_phone,
          customer_email,
          total,
          status,
          REGEXP_REPLACE(REGEXP_REPLACE(
            COALESCE(
              NULLIF(customer_phone, ''),
              shopify_data->>'phone',
              shopify_data->'shipping_address'->>'phone',
              ''
            ),
            '\\b(ext|extension|ramal|x)\\s*\\.?\\s*\\d+', '', 'gi'), '[^0-9]', '', 'g') as normalized_phone
        FROM orders
        WHERE operation_id = $1
        AND (
          REGEXP_REPLACE(REGEXP_REPLACE(
            COALESCE(
              NULLIF(customer_phone, ''),
              shopify_data->>'phone',
              shopify_data->'shipping_address'->>'phone',
              ''
            ),
            '\\b(ext|extension|ramal|x)\\s*\\.?\\s*\\d+', '', 'gi'), '[^0-9]', '', 'g') = $2
          OR REGEXP_REPLACE(REGEXP_REPLACE(
            COALESCE(
              NULLIF(customer_phone, ''),
              shopify_data->>'phone',
              shopify_data->'shipping_address'->>'phone',
              ''
            ),
            '\\b(ext|extension|ramal|x)\\s*\\.?\\s*\\d+', '', 'gi'), '[^0-9]', '', 'g') LIKE $3
        )
        LIMIT 5
      `, [operationId, normalizedEFPhone, `%${suffix}%`]);
      
      if (matchesByPhone.rows.length > 0) {
        console.log(`   ✅ Encontrados ${matchesByPhone.rows.length} matches por telefone:`);
        matchesByPhone.rows.forEach(match => {
          console.log(`      • Shopify ${match.shopify_order_number}: ${match.customer_name} (${match.customer_phone || 'N/A'}) - €${match.total} - ${match.status}`);
          console.log(`        Phone normalized: ${match.normalized_phone}`);
        });
        
        // Tentar vincular o primeiro match
        if (matchesByPhone.rows.length === 1) {
          const match = matchesByPhone.rows[0];
          console.log(`\n   🔗 Vinculando automaticamente...`);
          
          try {
            const linkResult = await pool.query(`
              UPDATE orders
              SET 
                status = 'delivered',
                tracking_number = $1,
                carrier_imported = true,
                carrier_order_id = $2,
                carrier_matched_at = NOW(),
                provider = 'european_fulfillment',
                last_sync_at = NOW(),
                needs_sync = false,
                provider_data = jsonb_set(
                  COALESCE(provider_data, '{}'::jsonb),
                  '{european_fulfillment}',
                  $3::jsonb
                )
              WHERE id = $4
              RETURNING id, shopify_order_number, status
            `, [
              efOrder.tracking || null,
              efOrder.european_order_id,
              JSON.stringify({
                orderId: efOrder.european_order_id,
                status: efOrder.status,
                orderNumber: efOrder.order_number,
                tracking: efOrder.tracking,
                value: efOrder.value,
                updatedAt: new Date().toISOString()
              }),
              match.id
            ]);
            
            if (linkResult.rows.length > 0) {
              console.log(`   ✅ Vinculado com sucesso: EF ${efOrder.order_number} ↔ Shopify ${linkResult.rows[0].shopify_order_number}`);
            }
          } catch (error) {
            console.log(`   ❌ Erro ao vincular: ${error.message}`);
          }
        }
      } else {
        console.log(`   ❌ Nenhum match por telefone`);
      }
    }
    
    // 2. Por email
    if (efOrder.email && matchesByPhone.rows.length === 0) {
      const matchesByEmail = await pool.query(`
        SELECT 
          id,
          shopify_order_number,
          customer_name,
          customer_email,
          total,
          status
        FROM orders
        WHERE operation_id = $1
        AND LOWER(TRIM(customer_email)) = $2
        LIMIT 5
      `, [operationId, efOrder.email.toLowerCase().trim()]);
      
      if (matchesByEmail.rows.length > 0) {
        console.log(`   ✅ Encontrados ${matchesByEmail.rows.length} matches por email:`);
        matchesByEmail.rows.forEach(match => {
          console.log(`      • Shopify ${match.shopify_order_number}: ${match.customer_name} (${match.customer_email}) - €${match.total} - ${match.status}`);
        });
      } else {
        console.log(`   ❌ Nenhum match por email`);
      }
    }
    
    // 3. Por nome + valor
    if (efOrder.name && efOrder.value) {
      const normalizedName = normalizeName(efOrder.name);
      const totalValue = parseFloat(efOrder.value);
      
      if (normalizedName.length >= 3 && !isNaN(totalValue)) {
        const matchesByNameValue = await pool.query(`
          SELECT 
            id,
            shopify_order_number,
            customer_name,
            total,
            status
          FROM orders
          WHERE operation_id = $1
          AND LOWER(REGEXP_REPLACE(customer_name, '[^a-zA-Z0-9\\s]', '', 'g')) LIKE $2
          AND ABS(CAST(total AS DECIMAL) - $3) <= 1.0
          LIMIT 5
        `, [operationId, `%${normalizedName}%`, totalValue]);
        
        if (matchesByNameValue.rows.length > 0) {
          console.log(`   ✅ Encontrados ${matchesByNameValue.rows.length} matches por nome + valor:`);
          matchesByNameValue.rows.forEach(match => {
            console.log(`      • Shopify ${match.shopify_order_number}: ${match.customer_name} - €${match.total} - ${match.status}`);
          });
        } else {
          console.log(`   ❌ Nenhum match por nome + valor`);
        }
      }
    }
  }
  
  // Verificar resultado final
  const finalCount = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'delivered' AND provider = 'european_fulfillment') as ef_delivered
    FROM orders
    WHERE operation_id = $1
  `, [operationId]);
  
  console.log(`\n\n📊 Status final:`);
  console.log(`   Entregues pela European Fulfillment: ${finalCount.rows[0].ef_delivered}`);
  
  await pool.end();
})();

