import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  
  console.log('🔧 Extraindo telefone do shopify_data para customer_phone...\n');
  
  // 1. Atualizar pedidos que têm telefone no shopify_data mas não no customer_phone
  const result = await pool.query(`
    UPDATE orders
    SET customer_phone = COALESCE(
      NULLIF(customer_phone, ''),
      shopify_data->>'phone',
      shopify_data->'shipping_address'->>'phone',
      shopify_data->'billing_address'->>'phone',
      shopify_data->'customer'->>'phone',
      shopify_data->'customer'->'default_address'->>'phone'
    )
    WHERE operation_id = $1
    AND (customer_phone IS NULL OR customer_phone = '')
    AND (
      shopify_data->>'phone' IS NOT NULL
      OR shopify_data->'shipping_address'->>'phone' IS NOT NULL
      OR shopify_data->'billing_address'->>'phone' IS NOT NULL
      OR shopify_data->'customer'->>'phone' IS NOT NULL
      OR shopify_data->'customer'->'default_address'->>'phone' IS NOT NULL
    )
    RETURNING id, shopify_order_number, customer_phone
  `, [operationId]);
  
  console.log(`✅ Atualizados ${result.rows.length} pedidos com telefone extraído do shopify_data`);
  
  if (result.rows.length > 0) {
    console.log(`\nPrimeiros 10 pedidos atualizados:`);
    result.rows.slice(0, 10).forEach(row => {
      console.log(`   ${row.shopify_order_number}: ${row.customer_phone || 'N/A'}`);
    });
  }
  
  // 2. Verificar quantos pedidos agora têm telefone
  const stats = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE customer_phone IS NOT NULL AND customer_phone != '') as with_phone,
      COUNT(*) FILTER (WHERE customer_phone IS NULL OR customer_phone = '') as no_phone
    FROM orders
    WHERE operation_id = $1
  `, [operationId]);
  
  console.log(`\n📊 Estatísticas após atualização:`);
  console.log(`   Pedidos com telefone: ${stats.rows[0].with_phone}`);
  console.log(`   Pedidos sem telefone: ${stats.rows[0].no_phone}`);
  
  await pool.end();
})();

