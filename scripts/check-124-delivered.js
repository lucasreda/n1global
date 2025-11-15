import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔍 Verificando por que aparecem 124 entregues em vez de 84...\n');
  
  // 1. Verificar total de pedidos entregues
  const totalDelivered = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE provider = 'european_fulfillment') as ef_count,
      COUNT(*) FILTER (WHERE carrier_imported = true) as carrier_count
    FROM orders
    WHERE operation_id = $1
    AND status = 'delivered'
  `, [operationId]);
  
  console.log(`📊 Total de pedidos entregues:`);
  console.log(`   Total: ${totalDelivered.rows[0].total}`);
  console.log(`   Entregues pela EF: ${totalDelivered.rows[0].ef_count}`);
  console.log(`   Entregues com carrier_imported: ${totalDelivered.rows[0].carrier_count}`);
  
  // 2. Verificar quantos pedidos EF entregues temos na staging
  const stagingDelivered = await pool.query(`
    SELECT COUNT(*) as count
    FROM european_fulfillment_orders
    WHERE account_id = $1
    AND status = 'delivered'
  `, [accountId]);
  
  console.log(`\n📦 Pedidos entregues na staging (EF):`);
  console.log(`   Total: ${stagingDelivered.rows[0].count}`);
  
  // 3. Verificar se há pedidos duplicados ou outros pedidos entregues não da EF
  const nonEfDelivered = await pool.query(`
    SELECT 
      COUNT(*) as count,
      provider,
      carrier_imported
    FROM orders
    WHERE operation_id = $1
    AND status = 'delivered'
    AND (provider != 'european_fulfillment' OR provider IS NULL)
    GROUP BY provider, carrier_imported
    ORDER BY count DESC
  `, [operationId]);
  
  if (nonEfDelivered.rows.length > 0) {
    console.log(`\n📊 Pedidos entregues não da EF:`);
    nonEfDelivered.rows.forEach(row => {
      console.log(`   Provider: ${row.provider || 'NULL'}, carrier_imported: ${row.carrier_imported}, count: ${row.count}`);
    });
  }
  
  // 4. Verificar se há pedidos entregues duplicados (mesmo pedido Shopify vinculado a múltiplos EF)
  const duplicates = await pool.query(`
    SELECT 
      o.shopify_order_number,
      COUNT(*) as count,
      COUNT(DISTINCT ef.id) as ef_count
    FROM orders o
    INNER JOIN european_fulfillment_orders ef ON 
      ef.european_order_id = o.carrier_order_id
      OR ef.tracking = o.tracking_number
      OR (o.provider = 'european_fulfillment' AND o.provider_data->'european_fulfillment'->>'orderNumber' = ef.order_number)
    WHERE o.operation_id = $1
    AND o.status = 'delivered'
    AND ef.account_id = $2
    AND ef.status = 'delivered'
    GROUP BY o.shopify_order_number
    HAVING COUNT(*) > 1
    LIMIT 10
  `, [operationId, accountId]);
  
  if (duplicates.rows.length > 0) {
    console.log(`\n⚠️ Pedidos entregues possivelmente duplicados (primeiros 10):`);
    duplicates.rows.forEach(row => {
      console.log(`   ${row.shopify_order_number}: ${row.count} vínculos, ${row.ef_count} pedidos EF`);
    });
  } else {
    console.log(`\n✅ Nenhum pedido entregue duplicado encontrado`);
  }
  
  // 5. Verificar se há pedidos entregues que não estão vinculados a EF
  const unlinkedDelivered = await pool.query(`
    SELECT COUNT(*) as count
    FROM orders o
    WHERE o.operation_id = $1
    AND o.status = 'delivered'
    AND o.provider = 'european_fulfillment'
    AND NOT EXISTS (
      SELECT 1
      FROM european_fulfillment_orders ef
      WHERE ef.account_id = $2
      AND (
        ef.european_order_id = o.carrier_order_id
        OR ef.tracking = o.tracking_number
        OR (o.provider_data->'european_fulfillment'->>'orderNumber' = ef.order_number)
      )
    )
  `, [operationId, accountId]);
  
  console.log(`\n📊 Pedidos entregues da EF não vinculados: ${unlinkedDelivered.rows[0].count}`);
  
  await pool.end();
})();

