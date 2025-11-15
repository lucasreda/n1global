import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔍 Testando matching por telefone...\n');
  
  // Pegar um pedido "delivered" não processado com telefone
  const sampleUnprocessed = await pool.query(`
    SELECT 
      ef.order_number,
      ef.recipient->>'phone' as ef_phone,
      ef.status
    FROM european_fulfillment_orders ef
    WHERE ef.account_id = $1
    AND ef.status = 'delivered'
    AND ef.processed_to_orders = false
    AND ef.recipient->>'phone' IS NOT NULL
    LIMIT 5
  `, [accountId]);
  
  for (const efOrder of sampleUnprocessed.rows) {
    console.log(`\n📞 Testando match para ${efOrder.order_number} (phone: ${efOrder.ef_phone})`);
    
    // Normalizar telefone (igual à função do código)
    const normalizePhone = (phone) => {
      if (!phone) return null;
      let normalized = phone.replace(/[\s\-\(\)]/g, '');
      normalized = normalized.replace(/^\+/, '');
      normalized = normalized.replace(/^00/, '');
      normalized = normalized.replace(/^011/, '');
      // Remover prefixos de país comuns (34 para Espanha)
      normalized = normalized.replace(/^34/, '');
      return normalized;
    };
    
    const efPhoneNormalized = normalizePhone(efOrder.ef_phone);
    console.log(`   Telefone normalizado: ${efPhoneNormalized}`);
    
    // Buscar matches por telefone na tabela orders
    const matches = await pool.query(`
      SELECT 
        shopify_order_number,
        customer_phone,
        customer_email,
        status
      FROM orders
      WHERE operation_id = $1
      AND customer_phone IS NOT NULL
      AND (
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(customer_phone, '+', ''), ' ', ''), '-', ''), '(', ''), ')', '') LIKE $2
        OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(customer_phone, '+', ''), ' ', ''), '-', ''), '(', ''), ')', '') LIKE $3
      )
      LIMIT 5
    `, [operationId, `%${efPhoneNormalized}%`, `${efPhoneNormalized}%`]);
    
    if (matches.rows.length > 0) {
      console.log(`   ✅ Encontrados ${matches.rows.length} possíveis matches:`);
      matches.rows.forEach(match => {
        console.log(`      Shopify: ${match.shopify_order_number} (${match.status}) - Phone: ${match.customer_phone} - Email: ${match.customer_email || 'N/A'}`);
      });
    } else {
      console.log(`   ❌ Nenhum match encontrado por telefone`);
      
      // Verificar quantos pedidos da Shopify têm telefone similar
      const similarPhones = await pool.query(`
        SELECT 
          shopify_order_number,
          customer_phone
        FROM orders
        WHERE operation_id = $1
        AND customer_phone IS NOT NULL
        AND customer_phone LIKE $2
        LIMIT 3
      `, [operationId, `%${efOrder.ef_phone.slice(-9)}%`]);
      
      if (similarPhones.rows.length > 0) {
        console.log(`   🔍 Telefones similares encontrados (últimos dígitos):`);
        similarPhones.rows.forEach(row => {
          console.log(`      ${row.shopify_order_number}: ${row.customer_phone}`);
        });
      }
    }
  }
  
  // Estatísticas gerais
  const phoneStats = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE ef.recipient->>'phone' IS NOT NULL) as has_phone,
      COUNT(*) FILTER (WHERE ef.recipient->>'phone' IS NULL) as no_phone
    FROM european_fulfillment_orders ef
    WHERE ef.account_id = $1
    AND ef.status = 'delivered'
    AND ef.processed_to_orders = false
  `, [accountId]);
  
  console.log(`\n📊 Estatísticas dos pedidos não processados:`);
  console.log(`   Com telefone: ${phoneStats.rows[0].has_phone}`);
  console.log(`   Sem telefone: ${phoneStats.rows[0].no_phone}`);
  
  await pool.end();
})();

