import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔍 Investigando breakdown dos pedidos entregues...\n');
  
  // 1. Verificar quantos pedidos EF entregues estão vinculados aos orders entregues
  const efToOrdersDelivered = await pool.query(`
    SELECT 
      COUNT(DISTINCT ef.id) as ef_delivered_linked,
      COUNT(DISTINCT o.id) as orders_delivered_linked
    FROM european_fulfillment_orders ef
    INNER JOIN orders o ON 
      o.carrier_order_id = ef.european_order_id
      OR o.tracking_number = ef.tracking
      OR (o.provider = 'european_fulfillment' AND o.provider_data->'european_fulfillment'->>'orderNumber' = ef.order_number)
    WHERE ef.account_id = $1
    AND ef.status = 'delivered'
    AND ef.processed_to_orders = true
    AND o.operation_id = $2
    AND o.status = 'delivered'
  `, [accountId, operationId]);
  
  console.log(`📊 Pedidos EF entregues vinculados aos orders entregues:`);
  console.log(`   EF entregues vinculados: ${efToOrdersDelivered.rows[0].ef_delivered_linked}`);
  console.log(`   Orders entregues vinculados: ${efToOrdersDelivered.rows[0].orders_delivered_linked}`);
  
  // 2. Verificar quantos pedidos EF entregues estão vinculados mas com status diferente
  const efToOrdersOtherStatus = await pool.query(`
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
    AND o.status != 'delivered'
    GROUP BY o.status
    ORDER BY order_count DESC
  `, [accountId, operationId]);
  
  console.log(`\n📊 Pedidos EF entregues vinculados mas com status diferente:`);
  efToOrdersOtherStatus.rows.forEach(row => {
    console.log(`   Status ${row.status}: ${row.order_count} orders (${row.ef_count} EF)`);
  });
  
  // 3. Verificar alguns pedidos específicos que estão com status errado
  const wrongStatusSample = await pool.query(`
    SELECT 
      ef.order_number,
      ef.status as ef_status,
      o.shopify_order_number,
      o.status as order_status,
      o.carrier_imported,
      o.provider,
      o.provider_data->'european_fulfillment'->>'status' as ef_status_in_data
    FROM european_fulfillment_orders ef
    INNER JOIN orders o ON 
      o.carrier_order_id = ef.european_order_id
      OR o.tracking_number = ef.tracking
      OR (o.provider = 'european_fulfillment' AND o.provider_data->'european_fulfillment'->>'orderNumber' = ef.order_number)
    WHERE ef.account_id = $1
    AND ef.status = 'delivered'
    AND ef.processed_to_orders = true
    AND o.operation_id = $2
    AND o.status != 'delivered'
    LIMIT 10
  `, [accountId, operationId]);
  
  if (wrongStatusSample.rows.length > 0) {
    console.log(`\n📋 Exemplos de pedidos EF entregues com status errado (primeiros 10):`);
    wrongStatusSample.rows.forEach(row => {
      console.log(`   EF ${row.ef_order}: status=${row.ef_status}, Shopify ${row.shopify_order_number}: status=${row.order_status}, carrier_imported=${row.carrier_imported}, provider=${row.provider}, ef_status_in_data=${row.ef_status_in_data}`);
    });
  }
  
  // 4. Contar total de pedidos entregues esperados
  const totalExpected = await pool.query(`
    SELECT COUNT(*) as count
    FROM european_fulfillment_orders
    WHERE account_id = $1
    AND status = 'delivered'
  `, [accountId]);
  
  console.log(`\n📊 Resumo:`);
  console.log(`   Total pedidos entregues esperados (staging): ${totalExpected.rows[0].count}`);
  console.log(`   Pedidos entregues na tabela orders: 40`);
  console.log(`   Diferença: ${totalExpected.rows[0].count - 40}`);
  
  await pool.end();
})();

