import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔍 Investigando discrepância entre API (86) e banco (49)...\n');
  
  // 1. Verificar todos os pedidos na tabela staging com status "delivered"
  const stagingDelivered = await pool.query(`
    SELECT 
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE processed_to_orders = true) as processed,
      COUNT(*) FILTER (WHERE processed_to_orders = false) as unprocessed
    FROM european_fulfillment_orders
    WHERE account_id = $1
    AND status = 'delivered'
  `, [accountId]);
  
  console.log(`📦 Pedidos com status "delivered" na tabela staging:`);
  console.log(`   Total: ${stagingDelivered.rows[0].count}`);
  console.log(`   Processados: ${stagingDelivered.rows[0].processed}`);
  console.log(`   Não processados: ${stagingDelivered.rows[0].unprocessed}`);
  
  // 2. Verificar quantos pedidos "delivered" foram realmente vinculados aos orders
  const linkedDelivered = await pool.query(`
    SELECT COUNT(DISTINCT ef.id) as count
    FROM european_fulfillment_orders ef
    INNER JOIN orders o ON 
      o.carrier_order_id = ef.european_order_id
      OR o.tracking_number = ef.tracking
    WHERE ef.account_id = $1
    AND ef.status = 'delivered'
    AND ef.processed_to_orders = true
    AND o.operation_id = $2
    AND o.status = 'delivered'
  `, [accountId, operationId]);
  
  console.log(`\n✅ Pedidos "delivered" vinculados e com status "delivered" na tabela orders: ${linkedDelivered.rows[0].count}`);
  
  // 3. Verificar se há pedidos "delivered" na staging que não foram processados
  const unprocessedDelivered = await pool.query(`
    SELECT 
      ef.order_number,
      ef.status,
      ef.processed_to_orders,
      ef.raw_data->>'status_livrison' as api_status_livrison,
      ef.raw_data->>'status_confirmation' as api_status_confirmation
    FROM european_fulfillment_orders ef
    WHERE ef.account_id = $1
    AND ef.status = 'delivered'
    AND ef.processed_to_orders = false
    LIMIT 10
  `, [accountId]);
  
  if (unprocessedDelivered.rows.length > 0) {
    console.log(`\n⚠️ Encontrados ${unprocessedDelivered.rows.length} pedidos "delivered" não processados (primeiros 10):`);
    unprocessedDelivered.rows.forEach(row => {
      console.log(`   ${row.order_number}: ${row.status} (processed: ${row.processed_to_orders})`);
    });
  }
  
  // 4. Verificar se há outros status na API que podem ser considerados como entregues
  const allStatuses = await pool.query(`
    SELECT 
      status,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE processed_to_orders = true) as processed,
      COUNT(*) FILTER (WHERE processed_to_orders = false) as unprocessed,
      COUNT(*) FILTER (WHERE processed_to_orders = false AND (raw_data->>'failedMatch')::boolean = true) as failed_match
    FROM european_fulfillment_orders
    WHERE account_id = $1
    GROUP BY status
    ORDER BY count DESC
  `, [accountId]);
  
  console.log(`\n📊 Todos os status na tabela staging:`);
  allStatuses.rows.forEach(row => {
    console.log(`   ${row.status}: ${row.count} total (${row.processed} processados, ${row.unprocessed} não processados, ${row.failed_match || 0} failed_match)`);
  });
  
  // 5. Verificar se há pedidos "delivered" na staging mas com status diferente na tabela orders
  const mismatchedStatus = await pool.query(`
    SELECT 
      ef.order_number,
      ef.status as staging_status,
      o.status as order_status,
      o.shopify_order_number
    FROM european_fulfillment_orders ef
    INNER JOIN orders o ON 
      o.carrier_order_id = ef.european_order_id
      OR o.tracking_number = ef.tracking
    WHERE ef.account_id = $1
    AND ef.status = 'delivered'
    AND ef.processed_to_orders = true
    AND o.operation_id = $2
    AND o.status != 'delivered'
    LIMIT 10
  `, [accountId, operationId]);
  
  if (mismatchedStatus.rows.length > 0) {
    console.log(`\n⚠️ Pedidos "delivered" na staging mas com status diferente na tabela orders (primeiros 10):`);
    mismatchedStatus.rows.forEach(row => {
      console.log(`   ${row.order_number}: staging=${row.staging_status} → order=${row.order_status} (Shopify: ${row.shopify_order_number})`);
    });
  }
  
  // 6. Contar pedidos entregues na tabela orders por provider
  const ordersDelivered = await pool.query(`
    SELECT 
      provider,
      COUNT(*) as count
    FROM orders
    WHERE operation_id = $1
    AND status = 'delivered'
    GROUP BY provider
  `, [operationId]);
  
  console.log(`\n📊 Pedidos entregues na tabela orders por provider:`);
  ordersDelivered.rows.forEach(row => {
    console.log(`   ${row.provider || 'NULL'}: ${row.count}`);
  });
  
  // 7. Verificar se há pedidos "delivered" que falharam no matching
  const failedDelivered = await pool.query(`
    SELECT COUNT(*) as count
    FROM european_fulfillment_orders
    WHERE account_id = $1
    AND status = 'delivered'
    AND processed_to_orders = true
    AND (raw_data->>'failedMatch')::boolean = true
  `, [accountId]);
  
  console.log(`\n⚠️ Pedidos "delivered" que falharam no matching: ${failedDelivered.rows[0].count}`);
  
  // 8. Verificar se a API está contando outros status também
  const apiStatusBreakdown = await pool.query(`
    SELECT 
      raw_data->>'status_livrison' as status_livrison,
      raw_data->>'status_confirmation' as status_confirmation,
      COUNT(*) as count
    FROM european_fulfillment_orders
    WHERE account_id = $1
    AND (
      raw_data->>'status_livrison' = 'delivered'
      OR raw_data->>'status_confirmation' = 'delivered'
    )
    GROUP BY raw_data->>'status_livrison', raw_data->>'status_confirmation'
    ORDER BY count DESC
  `, [accountId]);
  
  console.log(`\n📊 Breakdown por status da API (status_livrison/status_confirmation = 'delivered'):`);
  apiStatusBreakdown.rows.forEach(row => {
    console.log(`   Livrison: ${row.status_livrison || 'NULL'}, Confirmation: ${row.status_confirmation || 'NULL'} → ${row.count} pedidos`);
  });
  
  await pool.end();
})();

