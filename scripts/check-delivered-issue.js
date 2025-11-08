import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔍 Investigando problema com entregues zerados...\n');
  
  // 1. Verificar pedidos entregues na tabela orders
  const deliveredOrders = await pool.query(`
    SELECT 
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE provider = 'european_fulfillment') as ef_count,
      COUNT(*) FILTER (WHERE carrier_imported = true) as carrier_imported_count
    FROM orders
    WHERE operation_id = $1
    AND status = 'delivered'
  `, [operationId]);
  
  console.log(`📊 Pedidos entregues na tabela orders:`);
  console.log(`   Total entregues: ${deliveredOrders.rows[0].count}`);
  console.log(`   Entregues pela EF: ${deliveredOrders.rows[0].ef_count}`);
  console.log(`   Com carrier_imported: ${deliveredOrders.rows[0].carrier_imported_count}`);
  
  // 2. Verificar pedidos entregues na staging
  const stagingDelivered = await pool.query(`
    SELECT 
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE processed_to_orders = true) as processed,
      COUNT(*) FILTER (WHERE processed_to_orders = false) as unprocessed
    FROM european_fulfillment_orders
    WHERE account_id = $1
    AND status = 'delivered'
  `, [accountId]);
  
  console.log(`\n📦 Pedidos entregues na staging:`);
  console.log(`   Total: ${stagingDelivered.rows[0].count}`);
  console.log(`   Processados: ${stagingDelivered.rows[0].processed}`);
  console.log(`   Não processados: ${stagingDelivered.rows[0].unprocessed}`);
  
  // 3. Verificar se há pedidos entregues mas com status diferente
  const statusBreakdown = await pool.query(`
    SELECT 
      status,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE provider = 'european_fulfillment') as ef_count
    FROM orders
    WHERE operation_id = $1
    GROUP BY status
    ORDER BY count DESC
  `, [operationId]);
  
  console.log(`\n📊 Breakdown por status na tabela orders:`);
  statusBreakdown.rows.forEach(row => {
    console.log(`   ${row.status}: ${row.count} (EF: ${row.ef_count})`);
  });
  
  // 4. Verificar pedidos EF que foram processados recentemente
  const recentProcessed = await pool.query(`
    SELECT 
      order_number,
      status,
      processed_to_orders,
      processed_at
    FROM european_fulfillment_orders
    WHERE account_id = $1
    AND status = 'delivered'
    ORDER BY processed_at DESC NULLS LAST
    LIMIT 10
  `, [accountId]);
  
  console.log(`\n🕐 Últimos pedidos entregues processados:`);
  recentProcessed.rows.forEach(row => {
    console.log(`   ${row.order_number}: status=${row.status}, processed=${row.processed_to_orders}, at=${row.processed_at || 'NULL'}`);
  });
  
  // 5. Verificar se algum pedido foi desvinculado (status mudou)
  const unlinked = await pool.query(`
    SELECT 
      ef.order_number,
      ef.status as ef_status,
      ef.processed_to_orders,
      o.id as order_id,
      o.shopify_order_number,
      o.status as order_status,
      o.provider
    FROM european_fulfillment_orders ef
    LEFT JOIN orders o ON 
      o.carrier_order_id = ef.european_order_id
      OR o.tracking_number = ef.tracking
    WHERE ef.account_id = $1
    AND ef.status = 'delivered'
    AND ef.processed_to_orders = true
    AND (o.id IS NULL OR o.status != 'delivered' OR o.provider != 'european_fulfillment')
    LIMIT 10
  `, [accountId]);
  
  if (unlinked.rows.length > 0) {
    console.log(`\n⚠️ Pedidos EF entregues processados mas não vinculados ou com status diferente:`);
    unlinked.rows.forEach(row => {
      console.log(`   EF ${row.ef_order}: processed=${row.processed_to_orders}, order_id=${row.order_id || 'NULL'}, order_status=${row.order_status || 'NULL'}, provider=${row.provider || 'NULL'}`);
    });
  }
  
  await pool.end();
})();

