import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .trim();
}

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔗 Vinculando pedidos EF não vinculados...\n');
  
  // Mapeamento dos matches encontrados
  const matches = [
    { efOrder: 'LI-484361', shopifyOrder: '#1120', efName: 'Montse', shopifyName: 'Montse Casademont', value: 77.00 },
    { efOrder: 'LI-482548', shopifyOrder: '#1084', efName: 'Edith Coloma', shopifyName: 'Edith Coloma', value: 97.00 },
    // Os outros 2 têm múltiplos matches, vamos vincular ao mais recente
    { efOrder: 'LI-482180', shopifyOrder: '#1076', efName: 'Manuela tabuenca', shopifyName: 'Manuela tabuenca alvarez', value: 77.00 },
    { efOrder: 'LI-482466', shopifyOrder: '#1062', efName: 'Manuela tabuenca', shopifyName: 'Manuela tabuenca alvarez', value: 77.00 }
  ];
  
  for (const match of matches) {
    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`Vinculando: EF ${match.efOrder} → Shopify ${match.shopifyOrder}`);
    
    // 1. Buscar pedido EF
    const efOrder = await pool.query(`
      SELECT 
        id,
        order_number,
        status,
        value,
        tracking,
        european_order_id
      FROM european_fulfillment_orders
      WHERE account_id = $1
      AND order_number = $2
      LIMIT 1
    `, [accountId, match.efOrder]);
    
    if (efOrder.rows.length === 0) {
      console.log(`   ❌ Pedido EF não encontrado`);
      continue;
    }
    
    const ef = efOrder.rows[0];
    console.log(`   ✅ Pedido EF encontrado: ${ef.order_number} (status: ${ef.status}, valor: €${ef.value})`);
    
    // 2. Buscar pedido Shopify
    const shopifyOrder = await pool.query(`
      SELECT 
        id,
        shopify_order_number,
        status,
        total
      FROM orders
      WHERE operation_id = $1
      AND (
        shopify_order_number = $2
        OR shopify_order_number = $3
        OR shopify_order_number LIKE $4
      )
      LIMIT 1
    `, [operationId, match.shopifyOrder, match.shopifyOrder.replace('#', ''), `%${match.shopifyOrder.replace('#', '')}%`]);
    
    if (shopifyOrder.rows.length === 0) {
      console.log(`   ❌ Pedido Shopify não encontrado`);
      continue;
    }
    
    const shopify = shopifyOrder.rows[0];
    console.log(`   ✅ Pedido Shopify encontrado: ${shopify.shopify_order_number} (status: ${shopify.status}, valor: €${shopify.total})`);
    
    // 3. Vincular pedidos
    try {
      const linkResult = await pool.query(`
        UPDATE orders
        SET 
          status = 'delivered',
          tracking_number = $1,
          carrier_imported = true,
          carrier_order_id = $2,
          carrier_matched_at = NOW(),
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
        ef.tracking || null,
        ef.european_order_id,
        JSON.stringify({
          orderId: ef.european_order_id,
          status: ef.status,
          orderNumber: ef.order_number,
          tracking: ef.tracking,
          value: ef.value,
          updatedAt: new Date().toISOString()
        }),
        shopify.id
      ]);
      
      if (linkResult.rows.length > 0) {
        console.log(`   ✅ Vinculado com sucesso: ${linkResult.rows[0].shopify_order_number} → status: ${linkResult.rows[0].status}`);
      }
    } catch (error) {
      console.log(`   ❌ Erro ao vincular: ${error.message}`);
    }
  }
  
  // Verificar resultado final
  const finalCount = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'delivered' AND provider = 'european_fulfillment') as ef_delivered,
      COUNT(*) FILTER (WHERE status = 'delivered') as total_delivered
    FROM orders
    WHERE operation_id = $1
  `, [operationId]);
  
  console.log(`\n\n📊 Status final:`);
  console.log(`   Total entregues: ${finalCount.rows[0].total_delivered}`);
  console.log(`   Entregues pela European Fulfillment: ${finalCount.rows[0].ef_delivered}`);
  
  await pool.end();
})();

