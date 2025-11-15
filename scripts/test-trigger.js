import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  
  console.log('🧪 Testando trigger de proteção de status...\n');
  
  // 1. Verificar se há pedidos entregues
  const delivered = await pool.query(`
    SELECT COUNT(*) as count
    FROM orders
    WHERE operation_id = $1
    AND status = 'delivered'
    AND carrier_imported = true
  `, [operationId]);
  
  console.log(`📊 Pedidos entregues com carrier_imported: ${delivered.rows[0].count}`);
  
  if (delivered.rows[0].count === 0) {
    console.log('⚠️ Nenhum pedido entregue encontrado para testar');
    await pool.end();
    return;
  }
  
  // 2. Tentar atualizar um pedido entregue para "pending" (deve ser bloqueado pelo trigger)
  const testOrder = await pool.query(`
    SELECT id, shopify_order_number, status, carrier_imported
    FROM orders
    WHERE operation_id = $1
    AND status = 'delivered'
    AND carrier_imported = true
    LIMIT 1
  `, [operationId]);
  
  if (testOrder.rows.length === 0) {
    console.log('⚠️ Nenhum pedido encontrado para testar');
    await pool.end();
    return;
  }
  
  const order = testOrder.rows[0];
  console.log(`\n🧪 Testando com pedido: ${order.shopify_order_number} (${order.id})`);
  console.log(`   Status atual: ${order.status}, carrier_imported: ${order.carrier_imported}`);
  
  // 3. Tentar atualizar para "pending" (deve ser bloqueado)
  console.log(`\n⚠️ Tentando atualizar status para "pending"...`);
  await pool.query(`
    UPDATE orders
    SET status = 'pending', updated_at = NOW()
    WHERE id = $1
  `, [order.id]);
  
  // 4. Verificar se o status foi protegido
  const afterUpdate = await pool.query(`
    SELECT status
    FROM orders
    WHERE id = $1
  `, [order.id]);
  
  if (afterUpdate.rows[0].status === 'delivered') {
    console.log(`✅ SUCESSO: Trigger protegeu o status! Status ainda é "delivered"`);
  } else {
    console.log(`❌ FALHA: Status foi alterado para "${afterUpdate.rows[0].status}" (deveria ser "delivered")`);
  }
  
  // Restaurar status original se necessário
  if (afterUpdate.rows[0].status !== 'delivered') {
    await pool.query(`
      UPDATE orders
      SET status = 'delivered'
      WHERE id = $1
    `, [order.id]);
    console.log(`🔧 Status restaurado para "delivered"`);
  }
  
  await pool.end();
})();

