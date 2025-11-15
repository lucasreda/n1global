import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Função de normalização EXATAMENTE como no código
function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.toLowerCase();
  cleaned = cleaned.replace(/\b(ext|extension|ramal|x)\s*\.?\s*\d+/gi, '');
  return cleaned.replace(/[^\d]/g, '');
}

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔍 Debugging matching por telefone...\n');
  
  // 1. Pegar pedidos já vinculados (que funcionaram) para comparar
  const linkedOrders = await pool.query(`
    SELECT 
      o.shopify_order_number,
      o.customer_phone as shopify_phone,
      o.customer_name,
      o.status,
      ef.order_number as ef_order,
      ef.recipient->>'phone' as ef_phone,
      ef.status as ef_status
    FROM orders o
    INNER JOIN european_fulfillment_orders ef ON 
      o.carrier_order_id = ef.european_order_id
      OR o.tracking_number = ef.tracking
    WHERE o.operation_id = $1
    AND o.provider = 'european_fulfillment'
    AND o.status = 'delivered'
    AND o.carrier_imported = true
    LIMIT 5
  `, [operationId]);
  
  console.log(`📦 Pedidos VINCULADOS (exemplos):`);
  linkedOrders.rows.forEach((row, idx) => {
    const shopifyNormalized = normalizePhone(row.shopify_phone);
    const efNormalized = normalizePhone(row.ef_phone);
    console.log(`\n${idx + 1}. Shopify ${row.shopify_order_number} ↔ EF ${row.ef_order}:`);
    console.log(`   Shopify phone: ${row.shopify_phone} → ${shopifyNormalized}`);
    console.log(`   EF phone: ${row.ef_phone} → ${efNormalized}`);
    console.log(`   Match: ${shopifyNormalized === efNormalized ? '✅' : '❌'}`);
  });
  
  // 2. Pegar os pedidos específicos que o usuário mencionou (#1109 e #1121)
  const specificOrders = await pool.query(`
    SELECT 
      o.id,
      o.shopify_order_number,
      o.customer_phone,
      o.customer_email,
      o.customer_name,
      o.total,
      o.status,
      o.carrier_imported,
      o.provider
    FROM orders o
    WHERE o.operation_id = $1
    AND (
      o.shopify_order_number LIKE '%1109%'
      OR o.shopify_order_number LIKE '%1121%'
    )
  `, [operationId]);
  
  console.log(`\n\n📋 Pedidos específicos (#1109 e #1121):`);
  for (const order of specificOrders.rows) {
    console.log(`\n${specificOrders.rows.indexOf(order) + 1}. Shopify ${order.shopify_order_number}:`);
    console.log(`   ID: ${order.id}`);
    console.log(`   Nome: ${order.customer_name}`);
    console.log(`   Telefone: ${order.customer_phone || 'N/A'}`);
    console.log(`   Email: ${order.customer_email || 'N/A'}`);
    console.log(`   Valor: €${order.total}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Carrier Imported: ${order.carrier_imported}`);
    console.log(`   Provider: ${order.provider || 'N/A'}`);
    
    if (order.customer_phone) {
      const normalized = normalizePhone(order.customer_phone);
      console.log(`   Telefone normalizado: ${normalized}`);
      console.log(`   Últimos 9 dígitos: ${normalized.length >= 9 ? normalized.slice(-9) : normalized}`);
      
      // Buscar pedidos EF com telefone similar
      const efMatches = await pool.query(`
        SELECT 
          order_number,
          recipient->>'phone' as ef_phone,
          recipient->>'name' as ef_name,
          status,
          value,
          processed_to_orders
        FROM european_fulfillment_orders
        WHERE account_id = $1
        AND status = 'delivered'
        AND recipient->>'phone' IS NOT NULL
        AND (
          REGEXP_REPLACE(recipient->>'phone', '[^0-9]', '', 'g') LIKE $2
          OR REGEXP_REPLACE(recipient->>'phone', '[^0-9]', '', 'g') LIKE $3
        )
        LIMIT 5
      `, [accountId, `%${normalized.length >= 9 ? normalized.slice(-9) : normalized}%`, `${normalized.length >= 9 ? normalized.slice(-9) : normalized}%`]);
      
      if (efMatches.rows.length > 0) {
        console.log(`   ✅ Encontrados ${efMatches.rows.length} pedidos EF com telefone similar:`);
        efMatches.rows.forEach(ef => {
          const efNormalized = normalizePhone(ef.ef_phone);
          const match = efNormalized === normalized || 
                       (efNormalized.length >= 9 && normalized.length >= 9 && 
                        efNormalized.slice(-9) === normalized.slice(-9));
          console.log(`      • EF ${ef.order_number}: ${ef.ef_phone} → ${efNormalized} (${match ? '✅ MATCH' : '❌'}) - Processado: ${ef.processed_to_orders}`);
        });
      } else {
        console.log(`   ❌ Nenhum pedido EF encontrado com telefone similar`);
      }
    }
  }
  
  // 3. Verificar quantos pedidos entregues ainda não foram processados
  const unprocessed = await pool.query(`
    SELECT COUNT(*) as count
    FROM european_fulfillment_orders
    WHERE account_id = $1
    AND status = 'delivered'
    AND processed_to_orders = false
  `, [accountId]);
  
  console.log(`\n\n📊 Estatísticas:`);
  console.log(`   Pedidos "delivered" não processados: ${unprocessed.rows[0].count}`);
  
  // 4. Verificar quantos pedidos entregues foram processados
  const processed = await pool.query(`
    SELECT COUNT(*) as count
    FROM european_fulfillment_orders
    WHERE account_id = $1
    AND status = 'delivered'
    AND processed_to_orders = true
  `, [accountId]);
  
  console.log(`   Pedidos "delivered" processados: ${processed.rows[0].count}`);
  
  // 5. Verificar total de pedidos entregues na tabela orders
  const deliveredInOrders = await pool.query(`
    SELECT COUNT(*) as count
    FROM orders
    WHERE operation_id = $1
    AND status = 'delivered'
    AND provider = 'european_fulfillment'
  `, [operationId]);
  
  console.log(`   Pedidos entregues na tabela orders (EF): ${deliveredInOrders.rows[0].count}`);
  
  // 6. Total de pedidos "delivered" na staging
  const totalDelivered = await pool.query(`
    SELECT COUNT(*) as count
    FROM european_fulfillment_orders
    WHERE account_id = $1
    AND status = 'delivered'
  `, [accountId]);
  
  console.log(`   Total pedidos "delivered" na staging: ${totalDelivered.rows[0].count}`);
  console.log(`   Esperado na API: 86`);
  console.log(`   Diferença: ${86 - totalDelivered.rows[0].count}`);
  
  await pool.end();
})();

