import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Função de mapeamento de status igual à do código
function mapProviderStatus(status, provider) {
  const statusMap = {
    'pending': 'pending',
    'processing': 'confirmed',
    'shipped': 'shipped',
    'sent': 'shipped',
    'delivered': 'delivered',
    'canceled': 'cancelled',
    'cancelled': 'cancelled',
    'rejected': 'cancelled',
    'returned': 'returned',
    'in delivery': 'shipped',
    'unpacked': 'shipped',
    'redeployment': 'processing',
    'in transit': 'shipped',
    'incident': 'pending'
  };
  return statusMap[status?.toLowerCase()] || 'pending';
}

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔧 Processando pedidos entregues que foram resetados...\n');
  
  // 1. Buscar pedidos EF entregues que foram resetados (processed_to_orders = false)
  const unprocessedDelivered = await pool.query(`
    SELECT 
      ef.id,
      ef.order_number,
      ef.status,
      ef.european_order_id,
      ef.tracking,
      ef.value,
      ef.recipient
    FROM european_fulfillment_orders ef
    WHERE ef.account_id = $1
    AND ef.status = 'delivered'
    AND ef.processed_to_orders = false
  `, [accountId]);
  
  console.log(`📦 Encontrados ${unprocessedDelivered.rows.length} pedidos entregues não processados`);
  
  if (unprocessedDelivered.rows.length === 0) {
    console.log('✅ Nenhum pedido entregue para processar');
    await pool.end();
    return;
  }
  
  // 2. Para cada pedido, tentar encontrar match na Shopify e atualizar
  let processed = 0;
  let updated = 0;
  let notFound = 0;
  
  for (const efOrder of unprocessedDelivered.rows) {
    // Buscar pedido na Shopify que já está vinculado a este pedido EF
    const existingOrder = await pool.query(`
      SELECT 
        id,
        shopify_order_number,
        status,
        carrier_order_id
      FROM orders
      WHERE operation_id = $1
      AND (
        carrier_order_id = $2
        OR tracking_number = $3
        OR (provider = 'european_fulfillment' AND provider_data->'european_fulfillment'->>'orderNumber' = $4)
      )
      LIMIT 1
    `, [operationId, efOrder.european_order_id, efOrder.tracking || '', efOrder.order_number]);
    
    if (existingOrder.rows.length > 0) {
      const order = existingOrder.rows[0];
      
      // Atualizar status para 'delivered'
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
        efOrder.tracking || null,
        efOrder.european_order_id,
        JSON.stringify({
          orderId: efOrder.european_order_id,
          status: efOrder.status,
          orderNumber: efOrder.order_number,
          tracking: efOrder.tracking,
          value: efOrder.value,
          updatedAt: new Date().toISOString()
        }),
        order.id
      ]);
      
      if (result.rows.length > 0) {
        console.log(`✅ Atualizado: ${result.rows[0].shopify_order_number} → status: ${result.rows[0].status}`);
        updated++;
      }
      
      // Marcar como processado
      await pool.query(`
        UPDATE european_fulfillment_orders
        SET 
          processed_to_orders = true,
          processed_at = NOW()
        WHERE id = $1
      `, [efOrder.id]);
      
      processed++;
    } else {
      console.log(`⚠️ Pedido EF ${efOrder.order_number} não encontrado na Shopify`);
      notFound++;
    }
  }
  
  console.log(`\n📊 Resultado:`);
  console.log(`   Processados: ${processed}`);
  console.log(`   Atualizados: ${updated}`);
  console.log(`   Não encontrados: ${notFound}`);
  
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

