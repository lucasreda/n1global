import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔍 Investigando por que aparecem 40 entregues em vez de 84...\n');
  
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
  
  // 2. Verificar pedidos entregues na staging
  const stagingDelivered = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE processed_to_orders = true) as processed,
      COUNT(*) FILTER (WHERE processed_to_orders = false) as unprocessed,
      COUNT(*) FILTER (WHERE processed_to_orders = true AND (raw_data->>'failedMatch')::boolean = true) as failed_match
    FROM european_fulfillment_orders
    WHERE account_id = $1
    AND status = 'delivered'
  `, [accountId]);
  
  console.log(`\n📦 Pedidos entregues na staging:`);
  console.log(`   Total: ${stagingDelivered.rows[0].total}`);
  console.log(`   Processados: ${stagingDelivered.rows[0].processed}`);
  console.log(`   Não processados: ${stagingDelivered.rows[0].unprocessed}`);
  console.log(`   Falharam no match: ${stagingDelivered.rows[0].failed_match}`);
  
  // 3. Verificar quantos pedidos entregues foram vinculados aos orders
  const linkedDelivered = await pool.query(`
    SELECT 
      COUNT(DISTINCT ef.id) as ef_count,
      COUNT(DISTINCT o.id) as order_count,
      COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') as delivered_count
    FROM european_fulfillment_orders ef
    LEFT JOIN orders o ON 
      o.carrier_order_id = ef.european_order_id
      OR o.tracking_number = ef.tracking
      OR (o.provider = 'european_fulfillment' AND o.provider_data->'european_fulfillment'->>'orderNumber' = ef.order_number)
    WHERE ef.account_id = $1
    AND ef.status = 'delivered'
    AND ef.processed_to_orders = true
  `, [accountId]);
  
  console.log(`\n🔗 Pedidos EF entregues vinculados:`);
  console.log(`   Total EF entregues processados: ${linkedDelivered.rows[0].ef_count}`);
  console.log(`   Total orders vinculados: ${linkedDelivered.rows[0].order_count}`);
  console.log(`   Orders vinculados com status delivered: ${linkedDelivered.rows[0].delivered_count}`);
  
  // 4. Verificar breakdown por status na tabela orders
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
  
  // 5. Verificar alguns pedidos entregues não processados
  const unprocessedSample = await pool.query(`
    SELECT 
      order_number,
      status,
      processed_to_orders,
      raw_data->>'matchAttempts' as match_attempts,
      raw_data->>'failedMatch' as failed_match,
      recipient->>'name' as name,
      recipient->>'phone' as phone
    FROM european_fulfillment_orders
    WHERE account_id = $1
    AND status = 'delivered'
    AND processed_to_orders = false
    LIMIT 10
  `, [accountId]);
  
  if (unprocessedSample.rows.length > 0) {
    console.log(`\n📋 Exemplos de pedidos entregues não processados (primeiros 10):`);
    unprocessedSample.rows.forEach(row => {
      console.log(`   ${row.order_number}: processed=${row.processed_to_orders}, attempts=${row.match_attempts || 0}, failed=${row.failed_match || 'false'}, name=${row.name || 'N/A'}, phone=${row.phone || 'N/A'}`);
    });
  }
  
  // 6. Verificar se há pedidos entregues que foram marcados como failed_match
  const failedMatches = await pool.query(`
    SELECT 
      COUNT(*) as count
    FROM european_fulfillment_orders
    WHERE account_id = $1
    AND status = 'delivered'
    AND processed_to_orders = true
    AND (raw_data->>'failedMatch')::boolean = true
  `, [accountId]);
  
  console.log(`\n⚠️ Pedidos entregues marcados como failed_match: ${failedMatches.rows[0].count}`);
  
  await pool.end();
})();

