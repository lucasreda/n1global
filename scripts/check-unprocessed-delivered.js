import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔍 Analisando pedidos "delivered" não processados...\n');
  
  // 1. Verificar quantos pedidos "delivered" não foram processados
  const unprocessed = await pool.query(`
    SELECT 
      ef.order_number,
      ef.status,
      ef.processed_to_orders,
      ef.raw_data->>'status_livrison' as api_status_livrison,
      ef.raw_data->>'status_confirmation' as api_status_confirmation,
      ef.raw_data->>'matchAttempts' as match_attempts,
      ef.raw_data->>'failedMatch' as failed_match,
      ef.recipient->>'phone' as phone,
      ef.recipient->>'email' as email
    FROM european_fulfillment_orders ef
    WHERE ef.account_id = $1
    AND ef.status = 'delivered'
    AND ef.processed_to_orders = false
    LIMIT 20
  `, [accountId]);
  
  console.log(`📊 Pedidos "delivered" não processados (primeiros 20):\n`);
  unprocessed.rows.forEach((row, idx) => {
    console.log(`${idx + 1}. ${row.order_number}`);
    console.log(`   Status: ${row.status}`);
    console.log(`   Processado: ${row.processed_to_orders}`);
    console.log(`   Match attempts: ${row.match_attempts || 0}`);
    console.log(`   Failed match: ${row.failed_match || 'false'}`);
    console.log(`   Phone: ${row.phone || 'N/A'}`);
    console.log(`   Email: ${row.email || 'N/A'}`);
    console.log('');
  });
  
  // 2. Verificar quantos têm failedMatch = true
  const failed = await pool.query(`
    SELECT COUNT(*) as count
    FROM european_fulfillment_orders
    WHERE account_id = $1
    AND status = 'delivered'
    AND processed_to_orders = false
    AND (raw_data->>'failedMatch')::boolean = true
  `, [accountId]);
  
  console.log(`⚠️ Pedidos "delivered" com failedMatch = true: ${failed.rows[0].count}`);
  
  // 3. Verificar quantos ainda estão tentando (matchAttempts < 5)
  const stillTrying = await pool.query(`
    SELECT COUNT(*) as count
    FROM european_fulfillment_orders
    WHERE account_id = $1
    AND status = 'delivered'
    AND processed_to_orders = false
    AND (raw_data->>'failedMatch')::boolean IS NOT TRUE
    AND COALESCE((raw_data->>'matchAttempts')::integer, 0) < 5
  `, [accountId]);
  
  console.log(`🔄 Pedidos "delivered" ainda tentando match (attempts < 5): ${stillTrying.rows[0].count}`);
  
  // 4. Verificar se há pedidos da Shopify que poderiam corresponder
  const sampleOrder = unprocessed.rows[0];
  if (sampleOrder) {
    console.log(`\n🔍 Verificando possíveis matches para ${sampleOrder.order_number}...`);
    
    // Extrair número base do pedido (sem prefixo)
    const baseNumber = sampleOrder.order_number.replace(/^[A-Z]+-?/, '');
    
    // Buscar possíveis matches por número
    const possibleMatches = await pool.query(`
      SELECT 
        shopify_order_number,
        customer_email,
        customer_phone,
        status
      FROM orders
      WHERE operation_id = $1
      AND (
        shopify_order_number LIKE $2
        OR shopify_order_number LIKE $3
        OR shopify_order_number = $4
        OR shopify_order_number = $5
      )
      LIMIT 5
    `, [operationId, `%${baseNumber}%`, `#${baseNumber}%`, sampleOrder.order_number, `#${sampleOrder.order_number}`]);
    
    if (possibleMatches.rows.length > 0) {
      console.log(`   ✅ Encontrados ${possibleMatches.rows.length} possíveis matches:`);
      possibleMatches.rows.forEach(match => {
        console.log(`      Shopify: ${match.shopify_order_number} (${match.status})`);
      });
    } else {
      console.log(`   ❌ Nenhum match encontrado para ${sampleOrder.order_number}`);
    }
  }
  
  // 5. Estatísticas gerais
  const stats = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE processed_to_orders = false AND (raw_data->>'failedMatch')::boolean = true) as failed,
      COUNT(*) FILTER (WHERE processed_to_orders = false AND (raw_data->>'failedMatch')::boolean IS NOT TRUE) as still_trying,
      COUNT(*) FILTER (WHERE processed_to_orders = false) as total_unprocessed
    FROM european_fulfillment_orders
    WHERE account_id = $1
    AND status = 'delivered'
  `, [accountId]);
  
  console.log(`\n📊 Estatísticas:`);
  console.log(`   Total não processados: ${stats.rows[0].total_unprocessed}`);
  console.log(`   Falharam no match (failedMatch = true): ${stats.rows[0].failed}`);
  console.log(`   Ainda tentando match: ${stats.rows[0].still_trying}`);
  
  await pool.end();
})();

