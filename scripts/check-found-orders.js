import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Função de normalização igual à do código
function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.toLowerCase();
  cleaned = cleaned.replace(/\b(ext|extension|ramal|x)\s*\.?\s*\d+/gi, '');
  return cleaned.replace(/[^\d]/g, '');
}

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  
  console.log('🔍 Verificando pedidos encontrados manualmente...\n');
  
  // Buscar pedidos #1109 e #1121 na Shopify
  const shopifyOrders = await pool.query(`
    SELECT 
      id,
      shopify_order_number,
      customer_phone,
      customer_email,
      customer_name,
      order_date,
      total,
      status,
      operation_id
    FROM orders
    WHERE operation_id = $1
    AND (
      shopify_order_number LIKE '%1109%'
      OR shopify_order_number LIKE '%1121%'
    )
  `, [operationId]);
  
  console.log(`📦 Encontrados ${shopifyOrders.rows.length} pedidos na Shopify:\n`);
  
  for (const order of shopifyOrders.rows) {
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`Pedido Shopify: ${order.shopify_order_number}`);
    console.log(`   ID: ${order.id}`);
    console.log(`   Nome: ${order.customer_name || 'N/A'}`);
    console.log(`   Telefone: ${order.customer_phone || 'N/A'}`);
    console.log(`   Email: ${order.customer_email || 'N/A'}`);
    console.log(`   Data: ${order.order_date}`);
    console.log(`   Valor: €${order.total || 'N/A'}`);
    console.log(`   Status: ${order.status}`);
    
    if (order.customer_phone) {
      const normalized = normalizePhone(order.customer_phone);
      console.log(`   Telefone normalizado: ${normalized}`);
      console.log(`   Últimos 9 dígitos: ${normalized.length >= 9 ? normalized.slice(-9) : normalized}`);
    }
    
    // Buscar pedidos EF correspondentes
    const efPhone = order.customer_phone;
    if (efPhone) {
      const normalizedShopify = normalizePhone(efPhone);
      const suffix = normalizedShopify.length >= 9 ? normalizedShopify.slice(-9) : normalizedShopify;
      
      console.log(`\n   🔍 Buscando pedidos EF com telefone similar...`);
      
      const efOrders = await pool.query(`
        SELECT 
          order_number,
          status,
          recipient->>'phone' as phone,
          recipient->>'name' as name,
          value,
          processed_to_orders
        FROM european_fulfillment_orders
        WHERE account_id = '932839f6-c7df-4cb5-956e-26090ad32d35'
        AND status = 'delivered'
        AND recipient->>'phone' IS NOT NULL
        AND (
          REGEXP_REPLACE(recipient->>'phone', '[^0-9]', '', 'g') LIKE $1
          OR REGEXP_REPLACE(recipient->>'phone', '[^0-9]', '', 'g') LIKE $2
        )
      `, [`%${suffix}%`, `${suffix}%`]);
      
      if (efOrders.rows.length > 0) {
        console.log(`   ✅ Encontrados ${efOrders.rows.length} pedidos EF:`);
        efOrders.rows.forEach(ef => {
          const efNormalized = normalizePhone(ef.phone);
          console.log(`      • EF: ${ef.order_number} (${ef.phone} → ${efNormalized}) - ${ef.name} - €${ef.value} - Processado: ${ef.processed_to_orders}`);
          
          // Verificar se já está vinculado
          const linked = ef.processed_to_orders;
          if (!linked) {
            console.log(`         ⚠️ Este pedido EF NÃO está processado/vincular!`);
          }
        });
      } else {
        console.log(`   ❌ Nenhum pedido EF encontrado com telefone similar`);
      }
    }
    
    console.log(``);
  }
  
  await pool.end();
})();

