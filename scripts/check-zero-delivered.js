import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔍 Investigando por que aparecem 0 entregues após sync...\n');
  
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
      COUNT(*) FILTER (WHERE provider = 'european_fulfillment') as ef_count,
      COUNT(*) FILTER (WHERE carrier_imported = true) as carrier_count
    FROM orders
    WHERE operation_id = $1
    GROUP BY status
    ORDER BY count DESC
  `, [operationId]);
  
  console.log(`\n📊 Breakdown por status na tabela orders:`);
  statusBreakdown.rows.forEach(row => {
    console.log(`   ${row.status}: ${row.count} (EF: ${row.ef_count}, carrier: ${row.carrier_count})`);
  });
  
  // 3. Verificar pedidos EF entregues na staging
  const stagingDelivered = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE processed_to_orders = true) as processed,
      COUNT(*) FILTER (WHERE processed_to_orders = false) as unprocessed
    FROM european_fulfillment_orders
    WHERE account_id = $1
    AND status = 'delivered'
  `, [accountId]);
  
  console.log(`\n📦 Pedidos entregues na staging:`);
  console.log(`   Total: ${stagingDelivered.rows[0].total}`);
  console.log(`   Processados: ${stagingDelivered.rows[0].processed}`);
  console.log(`   Não processados: ${stagingDelivered.rows[0].unprocessed}`);
  
  // 4. Verificar pedidos EF entregues vinculados mas com status diferente
  const wrongStatus = await pool.query(`
    SELECT 
      COUNT(DISTINCT ef.id) as ef_count,
      o.status,
      COUNT(DISTINCT o.id) as order_count
    FROM european_fulfillment_orders ef
    INNER JOIN orders o ON 
      o.carrier_order_id = ef.european_order_id
      OR o.tracking_number = ef.tracking
      OR (o.provider = 'european_fulfillment' AND o.provider_data->'european_fulfillment'->>'orderNumber' = ef.order_number)
    WHERE ef.account_id = $1
    AND ef.status = 'delivered'
    AND ef.processed_to_orders = true
    AND o.operation_id = $2
    GROUP BY o.status
    ORDER BY order_count DESC
  `, [accountId, operationId]);
  
  console.log(`\n📊 Pedidos EF entregues vinculados (breakdown por status):`);
  wrongStatus.rows.forEach(row => {
    console.log(`   Status ${row.status}: ${row.order_count} orders (${row.ef_count} EF)`);
  });
  
  // 5. Verificar alguns pedidos específicos
  const sampleOrders = await pool.query(`
    SELECT 
      ef.order_number,
      ef.status as ef_status,
      o.shopify_order_number,
      o.status as order_status,
      o.carrier_imported,
      o.provider,
      o.updated_at,
      ef.processed_at
    FROM european_fulfillment_orders ef
    INNER JOIN orders o ON 
      o.carrier_order_id = ef.european_order_id
      OR o.tracking_number = ef.tracking
      OR (o.provider = 'european_fulfillment' AND o.provider_data->'european_fulfillment'->>'orderNumber' = ef.order_number)
    WHERE ef.account_id = $1
    AND ef.status = 'delivered'
    AND ef.processed_to_orders = true
    AND o.operation_id = $2
    ORDER BY o.updated_at DESC
    LIMIT 10
  `, [accountId, operationId]);
  
  console.log(`\n📋 Exemplos de pedidos EF entregues vinculados (últimos 10 atualizados):`);
  sampleOrders.rows.forEach(row => {
    console.log(`   EF ${row.ef_order}: status=${row.ef_status}, Shopify ${row.shopify_order_number}: status=${row.order_status}, carrier_imported=${row.carrier_imported}, updated_at=${row.updated_at}`);
  });
  
  await pool.end();
})();

