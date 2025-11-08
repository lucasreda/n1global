import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔧 Corrigindo status dos pedidos entregues...\n');
  
  // 1. Buscar pedidos EF entregues que foram processados mas estão com status errado na tabela orders
  const wrongStatus = await pool.query(`
    SELECT 
      ef.order_number,
      ef.status as ef_status,
      o.id as order_id,
      o.shopify_order_number,
      o.status as order_status,
      o.provider
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
    AND o.provider = 'european_fulfillment'
  `, [accountId, operationId]);
  
  console.log(`📊 Encontrados ${wrongStatus.rows.length} pedidos com status incorreto`);
  
  if (wrongStatus.rows.length > 0) {
    // 2. Atualizar status para 'delivered'
    const updateResult = await pool.query(`
      UPDATE orders
      SET 
        status = 'delivered',
        updated_at = NOW()
      WHERE id = ANY($1::varchar[])
      RETURNING id, shopify_order_number, status
    `, [wrongStatus.rows.map(row => row.order_id)]);
    
    console.log(`✅ Atualizados ${updateResult.rows.length} pedidos para status 'delivered'`);
    
    if (updateResult.rows.length > 0) {
      console.log(`\nPrimeiros 10 pedidos atualizados:`);
      updateResult.rows.slice(0, 10).forEach(row => {
        console.log(`   ${row.shopify_order_number}: ${row.status}`);
      });
    }
  }
  
  // 3. Verificar resultado final
  const finalCount = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
      COUNT(*) FILTER (WHERE status = 'delivered' AND provider = 'european_fulfillment') as ef_delivered
    FROM orders
    WHERE operation_id = $1
  `, [operationId]);
  
  console.log(`\n📊 Status final:`);
  console.log(`   Total entregues: ${finalCount.rows[0].delivered}`);
  console.log(`   Entregues pela European Fulfillment: ${finalCount.rows[0].ef_delivered}`);
  
  // 4. Verificar se ainda há pedidos EF entregues não vinculados
  const unlinked = await pool.query(`
    SELECT COUNT(*) as count
    FROM european_fulfillment_orders ef
    LEFT JOIN orders o ON 
      o.carrier_order_id = ef.european_order_id
      OR o.tracking_number = ef.tracking
      OR (o.provider = 'european_fulfillment' AND o.provider_data->'european_fulfillment'->>'orderNumber' = ef.order_number)
    WHERE ef.account_id = $1
    AND ef.status = 'delivered'
    AND ef.processed_to_orders = true
    AND o.id IS NULL
  `, [accountId]);
  
  console.log(`\n⚠️ Pedidos EF entregues processados mas não vinculados: ${unlinked.rows[0].count}`);
  
  await pool.end();
})();

