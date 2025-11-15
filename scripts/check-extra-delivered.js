import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔍 Verificando pedidos entregues adicionais...\n');
  
  // 1. Verificar pedidos entregues que não estão vinculados aos 84 da staging
  const extraDelivered = await pool.query(`
    SELECT 
      o.id,
      o.shopify_order_number,
      o.status,
      o.carrier_order_id,
      o.tracking_number,
      o.provider,
      o.carrier_imported,
      o.provider_data->'european_fulfillment'->>'orderNumber' as ef_order_number
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
    ORDER BY o.order_date DESC
    LIMIT 50
  `, [operationId, accountId]);
  
  console.log(`📊 Pedidos entregues não vinculados aos 84 da staging:`);
  console.log(`   Total: ${extraDelivered.rows.length}`);
  
  if (extraDelivered.rows.length > 0) {
    console.log(`\n📋 Exemplos (primeiros 10):`);
    extraDelivered.rows.slice(0, 10).forEach(row => {
      console.log(`   ${row.shopify_order_number}: carrier_order_id=${row.carrier_order_id}, tracking=${row.tracking_number}, ef_order_number=${row.ef_order_number}`);
    });
  }
  
  // 2. Verificar histórico de atualizações (último sync pode ter mudado status de alguns pedidos)
  const allEfDelivered = await pool.query(`
    SELECT COUNT(*) as count
    FROM european_fulfillment_orders
    WHERE account_id = $1
    AND status = 'delivered'
    AND processed_to_orders = true
  `, [accountId]);
  
  console.log(`\n📦 Pedidos EF entregues processados (histórico):`);
  console.log(`   Total: ${allEfDelivered.rows[0].count}`);
  
  // 3. Verificar se há pedidos entregues com status diferente na staging
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
  
  // 4. Verificar se há pedidos que foram processados múltiplas vezes
  const multipleProcessing = await pool.query(`
    SELECT 
      ef.order_number,
      COUNT(DISTINCT o.id) as order_count
    FROM european_fulfillment_orders ef
    INNER JOIN orders o ON 
      o.carrier_order_id = ef.european_order_id
      OR o.tracking_number = ef.tracking
      OR (o.provider = 'european_fulfillment' AND o.provider_data->'european_fulfillment'->>'orderNumber' = ef.order_number)
    WHERE ef.account_id = $1
    AND ef.status = 'delivered'
    AND o.operation_id = $2
    AND o.status = 'delivered'
    GROUP BY ef.order_number
    HAVING COUNT(DISTINCT o.id) > 1
    LIMIT 10
  `, [accountId, operationId]);
  
  if (multipleProcessing.rows.length > 0) {
    console.log(`\n⚠️ Pedidos EF processados múltiplas vezes (primeiros 10):`);
    multipleProcessing.rows.forEach(row => {
      console.log(`   ${row.order_number}: ${row.order_count} orders`);
    });
  } else {
    console.log(`\n✅ Nenhum pedido EF processado múltiplas vezes`);
  }
  
  await pool.end();
})();

