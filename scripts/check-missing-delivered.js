import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔍 Verificando por que faltam 35 pedidos entregues (84 esperados - 49 atuais)...\n');
  
  // 1. Verificar pedidos EF entregues na staging que não estão vinculados a pedidos entregues na tabela orders
  const unlinkedDelivered = await pool.query(`
    SELECT 
      ef.order_number,
      ef.status as ef_status,
      ef.european_order_id,
      ef.tracking,
      ef.processed_to_orders,
      ef.processed_at,
      o.id as order_id,
      o.shopify_order_number,
      o.status as order_status,
      o.carrier_imported
    FROM european_fulfillment_orders ef
    LEFT JOIN orders o ON 
      (o.carrier_order_id = ef.european_order_id
      OR o.tracking_number = ef.tracking
      OR (o.provider = 'european_fulfillment' AND o.provider_data->'european_fulfillment'->>'orderNumber' = ef.order_number))
      AND o.operation_id = $2
    WHERE ef.account_id = $1
    AND ef.status = 'delivered'
    AND (o.id IS NULL OR o.status != 'delivered')
    ORDER BY ef.processed_at DESC
    LIMIT 50
  `, [accountId, operationId]);
  
  console.log(`📦 Pedidos EF entregues na staging não vinculados a pedidos entregues na tabela orders:`);
  console.log(`   Total: ${unlinkedDelivered.rows.length}`);
  
  if (unlinkedDelivered.rows.length > 0) {
    console.log(`\n📋 Exemplos (primeiros 20):`);
    unlinkedDelivered.rows.slice(0, 20).forEach(row => {
      if (row.order_id) {
        console.log(`   EF ${row.order_number}: ef_status=${row.ef_status}, Shopify ${row.shopify_order_number}: order_status=${row.order_status}, carrier_imported=${row.carrier_imported}, processed=${row.processed_to_orders}`);
      } else {
        console.log(`   EF ${row.order_number}: ef_status=${row.ef_status}, NÃO ENCONTRADO NA SHOPIFY, processed=${row.processed_to_orders}`);
      }
    });
  }
  
  // 2. Verificar quantos pedidos EF entregues estão vinculados mas com status diferente
  const wrongStatus = await pool.query(`
    SELECT 
      COUNT(*) as total,
      o.status,
      COUNT(*) as count
    FROM european_fulfillment_orders ef
    INNER JOIN orders o ON 
      (o.carrier_order_id = ef.european_order_id
      OR o.tracking_number = ef.tracking
      OR (o.provider = 'european_fulfillment' AND o.provider_data->'european_fulfillment'->>'orderNumber' = ef.order_number))
      AND o.operation_id = $2
    WHERE ef.account_id = $1
    AND ef.status = 'delivered'
    AND o.status != 'delivered'
    GROUP BY o.status
    ORDER BY count DESC
  `, [accountId, operationId]);
  
  console.log(`\n📊 Pedidos EF entregues vinculados mas com status diferente:`);
  if (wrongStatus.rows.length > 0) {
    wrongStatus.rows.forEach(row => {
      console.log(`   Status ${row.status}: ${row.count} pedidos`);
    });
  } else {
    console.log(`   Nenhum`);
  }
  
  // 3. Verificar pedidos EF entregues que foram processados mas não foram atualizados
  const processedButNotUpdated = await pool.query(`
    SELECT 
      COUNT(*) as total,
      o.status,
      COUNT(*) as count
    FROM european_fulfillment_orders ef
    INNER JOIN orders o ON 
      (o.carrier_order_id = ef.european_order_id
      OR o.tracking_number = ef.tracking
      OR (o.provider = 'european_fulfillment' AND o.provider_data->'european_fulfillment'->>'orderNumber' = ef.order_number))
      AND o.operation_id = $2
    WHERE ef.account_id = $1
    AND ef.status = 'delivered'
    AND ef.processed_to_orders = true
    AND o.status != 'delivered'
    GROUP BY o.status
    ORDER BY count DESC
  `, [accountId, operationId]);
  
  console.log(`\n📊 Pedidos EF entregues processados mas com status errado:`);
  if (processedButNotUpdated.rows.length > 0) {
    processedButNotUpdated.rows.forEach(row => {
      console.log(`   Status ${row.status}: ${row.count} pedidos`);
    });
  } else {
    console.log(`   Nenhum`);
  }
  
  await pool.end();
})();

