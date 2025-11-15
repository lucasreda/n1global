import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔍 Verificando estrutura completa dos dados...\n');
  
  // Verificar estrutura completa do recipient
  const result = await pool.query(`
    SELECT 
      order_number,
      recipient,
      raw_data
    FROM european_fulfillment_orders
    WHERE account_id = $1
    AND status = 'delivered'
    AND processed_to_orders = false
    LIMIT 3
  `, [accountId]);
  
  for (const row of result.rows) {
    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`Pedido: ${row.order_number}`);
    console.log(`\nEstrutura do recipient:`);
    console.log(JSON.stringify(row.recipient, null, 2));
    console.log(`\nEstrutura do raw_data (campos relevantes):`);
    const rawData = row.raw_data;
    console.log(JSON.stringify({
      n_lead: rawData.n_lead,
      name: rawData.name,
      phone: rawData.phone,
      email: rawData.email,
      city: rawData.city,
      lead_value: rawData.lead_value,
      method_payment: rawData.method_payment,
      status_livrison: rawData.status_livrison,
      status_confirmation: rawData.status_confirmation
    }, null, 2));
  }
  
  await pool.end();
})();

