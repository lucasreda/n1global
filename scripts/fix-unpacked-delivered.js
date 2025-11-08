import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔧 Corrigindo pedidos com status unpacked que estão marcados como delivered...\n');
  
  // 1. Buscar pedidos que têm ef_status=unpacked mas estão marcados como delivered
  const unpackedDelivered = await pool.query(`
    SELECT 
      o.id,
      o.shopify_order_number,
      o.status,
      o.carrier_order_id,
      o.provider_data->'european_fulfillment'->>'status' as ef_status,
      o.provider_data->'european_fulfillment'->>'orderNumber' as ef_order_number
    FROM orders o
    WHERE o.operation_id = $1
    AND o.status = 'delivered'
    AND o.provider = 'european_fulfillment'
    AND o.provider_data->'european_fulfillment'->>'status' = 'unpacked'
    ORDER BY o.updated_at DESC
  `, [operationId]);
  
  console.log(`📦 Encontrados ${unpackedDelivered.rows.length} pedidos com status unpacked marcados como delivered`);
  
  if (unpackedDelivered.rows.length === 0) {
    console.log('✅ Nenhum pedido para corrigir');
    await pool.end();
    return;
  }
  
  // 2. Atualizar status para "shipped" (unpacked deve ser shipped, não delivered)
  let updated = 0;
  for (const row of unpackedDelivered.rows) {
    const result = await pool.query(`
      UPDATE orders
      SET 
        status = 'shipped',
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, shopify_order_number, status
    `, [row.id]);
    
    if (result.rows.length > 0) {
      console.log(`✅ Corrigido: ${result.rows[0].shopify_order_number} → status: ${result.rows[0].status} (era delivered, agora shipped)`);
      updated++;
    }
  }
  
  console.log(`\n📊 Resultado:`);
  console.log(`   Corrigidos: ${updated}`);
  
  // 3. Verificar resultado final
  const finalCount = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
      COUNT(*) FILTER (WHERE status = 'shipped') as shipped,
      COUNT(*) FILTER (WHERE status = 'delivered' AND provider = 'european_fulfillment') as ef_delivered,
      COUNT(*) FILTER (WHERE status = 'shipped' AND provider = 'european_fulfillment') as ef_shipped
    FROM orders
    WHERE operation_id = $1
  `, [operationId]);
  
  console.log(`\n📊 Status final:`);
  console.log(`   Total entregues: ${finalCount.rows[0].delivered}`);
  console.log(`   Total enviados: ${finalCount.rows[0].shipped}`);
  console.log(`   Entregues pela EF: ${finalCount.rows[0].ef_delivered}`);
  console.log(`   Enviados pela EF: ${finalCount.rows[0].ef_shipped}`);
  
  // 4. Verificar quantos pedidos entregues estão vinculados aos 84 da staging atual
  const linkedDelivered = await pool.query(`
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
  console.log(`   Total: ${linkedDelivered.rows[0].count}`);
  
  await pool.end();
})();

