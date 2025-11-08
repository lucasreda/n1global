import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  
  console.log('🔧 Corrigindo pedidos com status "unpacked" marcados incorretamente como "delivered"...\n');
  
  // 1. Contar pedidos que precisam ser corrigidos
  const toFix = await pool.query(`
    SELECT COUNT(*) as count
    FROM orders o
    WHERE o.operation_id = $1
    AND o.status = 'delivered'
    AND o.provider = 'european_fulfillment'
    AND o.provider_data->'european_fulfillment'->>'status' = 'unpacked'
  `, [operationId]);
  
  console.log(`📊 Pedidos a corrigir: ${toFix.rows[0].count}`);
  
  if (toFix.rows[0].count === '0') {
    console.log('✅ Nenhum pedido precisa ser corrigido!');
    await pool.end();
    return;
  }
  
  // 2. Atualizar status dos pedidos
  const result = await pool.query(`
    UPDATE orders
    SET 
      status = 'shipped',
      updated_at = NOW()
    WHERE operation_id = $1
    AND status = 'delivered'
    AND provider = 'european_fulfillment'
    AND provider_data->'european_fulfillment'->>'status' = 'unpacked'
    RETURNING id, shopify_order_number, status
  `, [operationId]);
  
  console.log(`✅ Corrigidos ${result.rows.length} pedidos de "delivered" para "shipped"`);
  
  // 3. Verificar resultado final
  const finalCount = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
      COUNT(*) FILTER (WHERE status = 'shipped') as shipped,
      COUNT(*) FILTER (WHERE status = 'delivered' AND provider_data->'european_fulfillment'->>'status' = 'delivered') as real_delivered
    FROM orders
    WHERE operation_id = $1
    AND provider = 'european_fulfillment'
  `, [operationId]);
  
  const stats = finalCount.rows[0];
  console.log(`\n📊 Status final:`);
  console.log(`   Total entregues (status = 'delivered'): ${stats.delivered}`);
  console.log(`   Total enviados (status = 'shipped'): ${stats.shipped}`);
  console.log(`   Realmente entregues (delivered na API): ${stats.real_delivered}`);
  
  await pool.end();
})();

