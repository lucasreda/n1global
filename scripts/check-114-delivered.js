import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔍 Verificando por que aparecem 114 entregues em vez de 84...\n');
  
  // 1. Verificar total de pedidos entregues na tabela orders
  const totalDelivered = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE provider = 'european_fulfillment') as ef_count,
      COUNT(*) FILTER (WHERE carrier_imported = true) as carrier_count
    FROM orders
    WHERE operation_id = $1
    AND status = 'delivered'
  `, [operationId]);
  
  console.log(`📊 Total de pedidos entregues na tabela orders:`);
  console.log(`   Total: ${totalDelivered.rows[0].total}`);
  console.log(`   Entregues pela EF: ${totalDelivered.rows[0].ef_count}`);
  console.log(`   Entregues com carrier_imported: ${totalDelivered.rows[0].carrier_count}`);
  
  // 2. Verificar pedidos entregues na staging EF
  const stagingDelivered = await pool.query(`
    SELECT COUNT(*) as count
    FROM european_fulfillment_orders
    WHERE account_id = $1
    AND status = 'delivered'
  `, [accountId]);
  
  console.log(`\n📦 Pedidos entregues na staging EF:`);
  console.log(`   Total: ${stagingDelivered.rows[0].count}`);
  
  // 3. Verificar quantos pedidos entregues estão vinculados aos 84 da staging atual
  const linkedToCurrent = await pool.query(`
    SELECT COUNT(DISTINCT o.id) as count
    FROM european_fulfillment_orders ef
    INNER JOIN orders o ON 
      o.carrier_order_id = ef.european_order_id
      OR o.tracking_number = ef.tracking
      OR (o.provider = 'european_fulfillment' AND o.provider_data->'european_fulfillment'->>'orderNumber' = ef.order_number)
    WHERE ef.account_id = $1
    AND ef.status = 'delivered'
    AND o.operation_id = $2
    AND o.status = 'delivered'
  `, [accountId, operationId]);
  
  console.log(`\n🔗 Pedidos entregues vinculados aos 84 da staging atual:`);
  console.log(`   Total: ${linkedToCurrent.rows[0].count}`);
  
  // 4. Verificar pedidos entregues que não estão vinculados aos 84 da staging atual
  const unlinkedDelivered = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(DISTINCT o.shopify_order_number) as unique_orders
    FROM orders o
    WHERE o.operation_id = $1
    AND o.status = 'delivered'
    AND o.provider = 'european_fulfillment'
    AND NOT EXISTS (
      SELECT 1
      FROM european_fulfillment_orders ef
      WHERE ef.account_id = $2
      AND ef.status = 'delivered'
      AND (
        ef.european_order_id = o.carrier_order_id
        OR ef.tracking = o.tracking_number
        OR ef.order_number = o.provider_data->'european_fulfillment'->>'orderNumber'
      )
    )
  `, [operationId, accountId]);
  
  console.log(`\n📊 Pedidos entregues não vinculados aos 84 da staging atual:`);
  console.log(`   Total: ${unlinkedDelivered.rows[0].total}`);
  console.log(`   Pedidos únicos: ${unlinkedDelivered.rows[0].unique_orders}`);
  
  // 5. Verificar exemplos de pedidos entregues não vinculados
  const sampleUnlinked = await pool.query(`
    SELECT 
      o.shopify_order_number,
      o.status,
      o.carrier_order_id,
      o.tracking_number,
      o.provider_data->'european_fulfillment'->>'orderNumber' as ef_order_number,
      o.provider_data->'european_fulfillment'->>'status' as ef_status,
      o.updated_at
    FROM orders o
    WHERE o.operation_id = $1
    AND o.status = 'delivered'
    AND o.provider = 'european_fulfillment'
    AND NOT EXISTS (
      SELECT 1
      FROM european_fulfillment_orders ef
      WHERE ef.account_id = $2
      AND ef.status = 'delivered'
      AND (
        ef.european_order_id = o.carrier_order_id
        OR ef.tracking = o.tracking_number
        OR ef.order_number = o.provider_data->'european_fulfillment'->>'orderNumber'
      )
    )
    ORDER BY o.updated_at DESC
    LIMIT 10
  `, [operationId, accountId]);
  
  if (sampleUnlinked.rows.length > 0) {
    console.log(`\n📋 Exemplos de pedidos entregues não vinculados (primeiros 10):`);
    sampleUnlinked.rows.forEach(row => {
      console.log(`   ${row.shopify_order_number}: carrier_order_id=${row.carrier_order_id}, ef_order_number=${row.ef_order_number}, ef_status=${row.ef_status}, updated_at=${row.updated_at}`);
    });
  }
  
  // 6. Verificar se há pedidos entregues duplicados (mesmo pedido Shopify múltiplas vezes)
  const duplicates = await pool.query(`
    SELECT 
      shopify_order_number,
      COUNT(*) as count
    FROM orders
    WHERE operation_id = $1
    AND status = 'delivered'
    AND provider = 'european_fulfillment'
    GROUP BY shopify_order_number
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 10
  `, [operationId]);
  
  if (duplicates.rows.length > 0) {
    console.log(`\n⚠️ Pedidos entregues duplicados (primeiros 10):`);
    duplicates.rows.forEach(row => {
      console.log(`   ${row.shopify_order_number}: ${row.count} vezes`);
    });
  } else {
    console.log(`\n✅ Nenhum pedido entregue duplicado`);
  }
  
  // 7. Verificar breakdown por status na staging
  const stagingStatus = await pool.query(`
    SELECT 
      status,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE processed_to_orders = true) as processed
    FROM european_fulfillment_orders
    WHERE account_id = $1
    GROUP BY status
    ORDER BY count DESC
  `, [accountId]);
  
  console.log(`\n📊 Breakdown por status na staging:`);
  stagingStatus.rows.forEach(row => {
    console.log(`   ${row.status}: ${row.count} (processados: ${row.processed})`);
  });
  
  await pool.end();
})();

