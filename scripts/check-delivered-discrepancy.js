import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  
  console.log('🔍 Verificando discrepância de pedidos entregues...\n');
  
  // 1. Contar pedidos entregues na tabela orders
  const deliveredOrders = await pool.query(`
    SELECT COUNT(*) as count
    FROM orders
    WHERE operation_id = $1
    AND status = 'delivered'
  `, [operationId]);
  
  console.log(`✅ Pedidos marcados como 'delivered' na tabela orders: ${deliveredOrders.rows[0].count}`);
  
  // 2. Verificar status original da transportadora nos dados do provider
  const ordersWithProviderData = await pool.query(`
    SELECT 
      o.status as order_status,
      o.provider_data->'european_fulfillment'->>'status' as carrier_status,
      COUNT(*) as count
    FROM orders o
    WHERE o.operation_id = $1
    AND o.status = 'delivered'
    AND o.provider = 'european_fulfillment'
    AND o.provider_data->'european_fulfillment' IS NOT NULL
    GROUP BY o.status, o.provider_data->'european_fulfillment'->>'status'
    ORDER BY count DESC
  `, [operationId]);
  
  console.log(`\n📊 Breakdown por status original da transportadora (orders com status 'delivered'):`);
  ordersWithProviderData.rows.forEach(row => {
    console.log(`   Status transportadora: ${row.carrier_status || 'NULL'} → Order status: ${row.order_status} (Count: ${row.count})`);
  });
  
  // 3. Verificar status na tabela de staging (todos os processados)
  const stagingStatuses = await pool.query(`
    SELECT 
      status,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
      COUNT(*) FILTER (WHERE status = 'unpacked') as unpacked_count
    FROM european_fulfillment_orders
    WHERE account_id = '932839f6-c7df-4cb5-956e-26090ad32d35'
    AND processed_to_orders = true
    GROUP BY status
    ORDER BY count DESC
  `);
  
  console.log(`\n📦 Status na tabela european_fulfillment_orders (staging):`);
  stagingStatuses.rows.forEach(row => {
    console.log(`   ${row.status}: ${row.count}`);
  });
  
  // 4. Verificar quantos pedidos "unpacked" estão sendo mapeados como "delivered"
  const unpackedMapped = await pool.query(`
    SELECT COUNT(*) as count
    FROM orders o
    WHERE o.operation_id = $1
    AND o.status = 'delivered'
    AND o.provider = 'european_fulfillment'
    AND o.provider_data->'european_fulfillment'->>'status' = 'unpacked'
  `, [operationId]);
  
  console.log(`\n⚠️ Pedidos com status 'unpacked' que estão marcados como 'delivered': ${unpackedMapped.rows[0].count}`);
  
  // 5. Contar quantos pedidos realmente entregues na API (delivered)
  const realDelivered = await pool.query(`
    SELECT COUNT(*) as count
    FROM european_fulfillment_orders
    WHERE account_id = '932839f6-c7df-4cb5-956e-26090ad32d35'
    AND processed_to_orders = true
    AND status = 'delivered'
  `);
  
  console.log(`\n📦 Pedidos realmente 'delivered' na tabela staging: ${realDelivered.rows[0].count}`);
  
  // 6. Verificar duplicação: mesmo carrier_order_id em múltiplos orders
  const duplicates = await pool.query(`
    SELECT 
      o.carrier_order_id,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE o.status = 'delivered') as delivered_count
    FROM orders o
    WHERE o.operation_id = $1
    AND o.provider = 'european_fulfillment'
    AND o.carrier_order_id IS NOT NULL
    GROUP BY o.carrier_order_id
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 10
  `, [operationId]);
  
  if (duplicates.rows.length > 0) {
    console.log(`\n⚠️ Encontrados ${duplicates.rows.length} carrier_order_ids duplicados (primeiros 10):`);
    duplicates.rows.forEach(row => {
      console.log(`   ${row.carrier_order_id}: ${row.count} pedidos (${row.delivered_count} entregues)`);
    });
  } else {
    console.log(`\n✅ Nenhuma duplicação encontrada por carrier_order_id`);
  }
  
  await pool.end();
})();

