import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔍 Verificando status dos pedidos EF...\n');
  
  // Verificar status dos pedidos EF entregues
  const efOrders = await pool.query(`
    SELECT 
      order_number,
      status,
      raw_data->>'status_livrison' as api_status_livrison,
      raw_data->>'status_confirmation' as api_status_confirmation
    FROM european_fulfillment_orders
    WHERE account_id = $1
    AND status = 'delivered'
    LIMIT 10
  `, [accountId]);
  
  console.log(`Status dos pedidos EF entregues (primeiros 10):`);
  efOrders.rows.forEach(row => {
    console.log(`   ${row.order_number}: status=${row.status}, api_livrison=${row.api_status_livrison}, api_confirmation=${row.api_status_confirmation}`);
  });
  
  await pool.end();
})();

