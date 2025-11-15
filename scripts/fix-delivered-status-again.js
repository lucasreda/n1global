import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔧 Corrigindo status de pedidos entregues que foram sobrescritos...\n');
  
  // 1. Buscar pedidos EF entregues vinculados mas com status diferente de "delivered"
  const wrongStatusOrders = await pool.query(`
    SELECT 
      ef.order_number,
      ef.status as ef_status,
      ef.european_order_id,
      ef.tracking,
      ef.value,
      o.id as order_id,
      o.shopify_order_number,
      o.status as order_status,
      o.carrier_imported,
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
    AND o.carrier_imported = true
  `, [accountId, operationId]);
  
  console.log(`📦 Encontrados ${wrongStatusOrders.rows.length} pedidos entregues com status errado`);
  
  if (wrongStatusOrders.rows.length === 0) {
    console.log('✅ Nenhum pedido para corrigir');
    await pool.end();
    return;
  }
  
  // 2. Atualizar status para "delivered"
  let updated = 0;
  for (const row of wrongStatusOrders.rows) {
    const result = await pool.query(`
      UPDATE orders
      SET 
        status = 'delivered',
        tracking_number = COALESCE($1, tracking_number),
        carrier_imported = true,
        carrier_order_id = $2,
        provider = 'european_fulfillment',
        last_sync_at = NOW(),
        needs_sync = false,
        provider_data = jsonb_set(
          COALESCE(provider_data, '{}'::jsonb),
          '{european_fulfillment}',
          $3::jsonb
        )
      WHERE id = $4
      RETURNING id, shopify_order_number, status
    `, [
      row.tracking || null,
      row.european_order_id,
      JSON.stringify({
        orderId: row.european_order_id,
        status: row.ef_status,
        orderNumber: row.order_number,
        tracking: row.tracking,
        value: row.value,
        updatedAt: new Date().toISOString()
      }),
      row.order_id
    ]);
    
    if (result.rows.length > 0) {
      console.log(`✅ Corrigido: ${result.rows[0].shopify_order_number} → status: ${result.rows[0].status}`);
      updated++;
    }
  }
  
  console.log(`\n📊 Resultado:`);
  console.log(`   Corrigidos: ${updated}`);
  
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
  console.log(`   Entregues pela EF: ${finalCount.rows[0].ef_delivered}`);
  
  await pool.end();
})();

