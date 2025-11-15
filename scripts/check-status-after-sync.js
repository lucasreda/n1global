import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  
  console.log('🔍 Verificando status dos pedidos após sync...\n');
  
  // 1. Verificar pedidos entregues na tabela orders
  const deliveredOrders = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
      COUNT(*) FILTER (WHERE status = 'delivered' AND provider = 'european_fulfillment') as ef_delivered,
      COUNT(*) FILTER (WHERE status = 'delivered' AND carrier_imported = true) as carrier_delivered
    FROM orders
    WHERE operation_id = $1
  `, [operationId]);
  
  console.log(`📊 Pedidos entregues na tabela orders:`);
  console.log(`   Total entregues: ${deliveredOrders.rows[0].delivered}`);
  console.log(`   Entregues pela EF: ${deliveredOrders.rows[0].ef_delivered}`);
  console.log(`   Entregues com carrier_imported: ${deliveredOrders.rows[0].carrier_delivered}`);
  
  // 2. Verificar breakdown por status
  const statusBreakdown = await pool.query(`
    SELECT 
      status,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE carrier_imported = true) as carrier_imported,
      COUNT(*) FILTER (WHERE provider = 'european_fulfillment') as ef_provider
    FROM orders
    WHERE operation_id = $1
    GROUP BY status
    ORDER BY count DESC
  `, [operationId]);
  
  console.log(`\n📊 Breakdown por status:`);
  statusBreakdown.rows.forEach(row => {
    console.log(`   ${row.status}: ${row.count} (carrier_imported: ${row.carrier_imported}, ef_provider: ${row.ef_provider})`);
  });
  
  // 3. Verificar alguns pedidos específicos que eram entregues
  const specificOrders = await pool.query(`
    SELECT 
      shopify_order_number,
      status,
      carrier_imported,
      provider,
      carrier_order_id,
      tracking_number,
      provider_data->'european_fulfillment'->>'status' as ef_status
    FROM orders
    WHERE operation_id = $1
    AND provider = 'european_fulfillment'
    AND carrier_imported = true
    ORDER BY order_date DESC
    LIMIT 10
  `, [operationId]);
  
  console.log(`\n📋 Exemplos de pedidos EF (primeiros 10):`);
  specificOrders.rows.forEach(row => {
    console.log(`   ${row.shopify_order_number}: status=${row.status}, carrier_imported=${row.carrier_imported}, ef_status=${row.ef_status}`);
  });
  
  // 4. Verificar se staging sync está marcando pedidos como processados sem atualizar status
  const stagingDelivered = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE processed_to_orders = true) as processed,
      COUNT(*) FILTER (WHERE processed_to_orders = false) as unprocessed
    FROM european_fulfillment_orders
    WHERE account_id = '932839f6-c7df-4cb5-956e-26090ad32d35'
    AND status = 'delivered'
  `, []);
  
  console.log(`\n📦 Pedidos entregues na staging:`);
  console.log(`   Total: ${stagingDelivered.rows[0].total}`);
  console.log(`   Processados: ${stagingDelivered.rows[0].processed}`);
  console.log(`   Não processados: ${stagingDelivered.rows[0].unprocessed}`);
  
  await pool.end();
})();

