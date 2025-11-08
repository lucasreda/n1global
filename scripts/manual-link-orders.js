import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  
  console.log('🔗 Vinculando manualmente pedidos encontrados...\n');
  
  // Mapeamento manual dos pedidos encontrados pelo usuário
  const manualMatches = [
    { efOrder: 'LI-483757', shopifyOrder: '#1109', name: 'Jaume Arbona Vellida' },
    { efOrder: 'LI-484378', shopifyOrder: '#1121', name: 'Pilar herreiz' }
  ];
  
  for (const match of manualMatches) {
    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`Processando: EF ${match.efOrder} → Shopify ${match.shopifyOrder}`);
    
    // 1. Buscar pedido EF
    const efOrder = await pool.query(`
      SELECT 
        id,
        order_number,
        status,
        value,
        tracking,
        european_order_id,
        recipient,
        raw_data
      FROM european_fulfillment_orders
      WHERE account_id = '932839f6-c7df-4cb5-956e-26090ad32d35'
      AND order_number = $1
      LIMIT 1
    `, [match.efOrder]);
    
    if (efOrder.rows.length === 0) {
      console.log(`   ❌ Pedido EF ${match.efOrder} não encontrado`);
      continue;
    }
    
    const ef = efOrder.rows[0];
    console.log(`   ✅ Pedido EF encontrado: ${ef.order_number} (status: ${ef.status}, valor: €${ef.value})`);
    
    // 2. Buscar pedido Shopify
    const shopifyOrders = await pool.query(`
      SELECT 
        id,
        shopify_order_number,
        status,
        total,
        customer_name,
        customer_phone,
        customer_email
      FROM orders
      WHERE operation_id = $1
      AND (
        shopify_order_number = $2
        OR shopify_order_number = $3
        OR shopify_order_number LIKE $4
      )
      LIMIT 1
    `, [operationId, match.shopifyOrder, match.shopifyOrder.replace('#', ''), `%${match.shopifyOrder.replace('#', '')}%`]);
    
    if (shopifyOrders.rows.length === 0) {
      console.log(`   ❌ Pedido Shopify ${match.shopifyOrder} não encontrado`);
      continue;
    }
    
    const shopify = shopifyOrders.rows[0];
    console.log(`   ✅ Pedido Shopify encontrado: ${shopify.shopify_order_number} (status: ${shopify.status}, valor: €${shopify.total})`);
    
    // 3. Atualizar pedido Shopify com dados da transportadora
    const recipient = ef.recipient;
    const rawData = ef.raw_data;
    
    // Mapear status
    const mapStatus = (status) => {
      const statusMap = {
        'delivered': 'delivered',
        'unpacked': 'shipped',
        'returned': 'returned',
        'in transit': 'shipped',
        'incident': 'pending'
      };
      return statusMap[status?.toLowerCase()] || 'pending';
    };
    
    const newStatus = mapStatus(ef.status);
    
    const updateResult = await pool.query(`
      UPDATE orders
      SET 
        status = $1,
        tracking_number = $2,
        carrier_imported = true,
        carrier_order_id = $3,
        carrier_matched_at = NOW(),
        provider = 'european_fulfillment',
        last_sync_at = NOW(),
        needs_sync = false,
        provider_data = jsonb_set(
          COALESCE(provider_data, '{}'::jsonb),
          '{european_fulfillment}',
          $4::jsonb
        )
      WHERE id = $5
      RETURNING id, shopify_order_number, status
    `, [
      newStatus,
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
    
    if (updateResult.rows.length > 0) {
      console.log(`   ✅ Pedido Shopify atualizado: ${updateResult.rows[0].shopify_order_number} → status: ${updateResult.rows[0].status}`);
    }
    
    // 4. Marcar pedido EF como processado
    const markProcessed = await pool.query(`
      UPDATE european_fulfillment_orders
      SET 
        processed_to_orders = true,
        processed_at = NOW()
      WHERE id = $1
      RETURNING order_number
    `, [ef.id]);
    
    if (markProcessed.rows.length > 0) {
      console.log(`   ✅ Pedido EF marcado como processado: ${markProcessed.rows[0].order_number}`);
    }
    
    console.log(`   ✅ Vinculação completa: EF ${ef.order_number} ↔ Shopify ${shopify.shopify_order_number}`);
  }
  
  console.log(`\n✅ Processamento manual concluído!`);
  
  // 5. Verificar resultados
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
  
  await pool.end();
})();

