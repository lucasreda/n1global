import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  
  console.log('🔍 Verificando telefone no shopify_data...\n');
  
  // 1. Verificar pedidos #1109 e #1121
  const orders = await pool.query(`
    SELECT 
      id,
      shopify_order_number,
      customer_phone,
      customer_email,
      customer_name,
      shopify_data
    FROM orders
    WHERE operation_id = $1
    AND (
      shopify_order_number LIKE '%1109%'
      OR shopify_order_number LIKE '%1121%'
    )
  `, [operationId]);
  
  for (const order of orders.rows) {
    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`Pedido: ${order.shopify_order_number}`);
    console.log(`Customer Phone (campo): ${order.customer_phone || 'N/A'}`);
    console.log(`Customer Name: ${order.customer_name}`);
    console.log(`Customer Email: ${order.customer_email}`);
    
    if (order.shopify_data) {
      const shopifyData = order.shopify_data;
      console.log(`\nShopify Data (telefone):`);
      console.log(`   Phone: ${shopifyData.phone || shopifyData.customer?.phone || shopifyData.shipping_address?.phone || 'N/A'}`);
      console.log(`   Shipping Phone: ${shopifyData.shipping_address?.phone || 'N/A'}`);
      console.log(`   Billing Phone: ${shopifyData.billing_address?.phone || 'N/A'}`);
      console.log(`   Customer Phone: ${shopifyData.customer?.phone || 'N/A'}`);
      
      // Mostrar estrutura completa do shipping_address se existir
      if (shopifyData.shipping_address) {
        console.log(`\n   Shipping Address completo:`);
        console.log(JSON.stringify(shopifyData.shipping_address, null, 2));
      }
      
      // Mostrar estrutura completa do customer se existir
      if (shopifyData.customer) {
        console.log(`\n   Customer completo:`);
        console.log(JSON.stringify(shopifyData.customer, null, 2));
      }
    }
  }
  
  // 2. Verificar quantos pedidos têm telefone no shopify_data mas não no customer_phone
  const ordersWithPhoneInData = await pool.query(`
    SELECT 
      COUNT(*) as count
    FROM orders
    WHERE operation_id = $1
    AND (customer_phone IS NULL OR customer_phone = '')
    AND (
      shopify_data->>'phone' IS NOT NULL
      OR shopify_data->'shipping_address'->>'phone' IS NOT NULL
      OR shopify_data->'billing_address'->>'phone' IS NOT NULL
      OR shopify_data->'customer'->>'phone' IS NOT NULL
    )
  `, [operationId]);
  
  console.log(`\n\n📊 Estatísticas:`);
  console.log(`   Pedidos com telefone em shopify_data mas não em customer_phone: ${ordersWithPhoneInData.rows[0].count}`);
  
  await pool.end();
})();

