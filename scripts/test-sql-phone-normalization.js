import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Função de normalização igual à do código
function normalizePhone(phone) {
  if (!phone) return null;
  
  // Remove espaços, hífens, parênteses
  let normalized = phone.replace(/[\s\-\(\)]/g, '');
  
  // Remove prefixos internacionais comuns
  normalized = normalized.replace(/^\+/, '');
  normalized = normalized.replace(/^00/, '');
  normalized = normalized.replace(/^011/, '');
  
  // Remove prefixos de país comuns (34 para Espanha)
  normalized = normalized.replace(/^34/, '');
  
  return normalized;
}

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔍 Testando normalização SQL vs JavaScript...\n');
  
  // 1. Pegar um pedido não processado com telefone
  const unprocessed = await pool.query(`
    SELECT 
      ef.order_number,
      ef.recipient->>'phone' as ef_phone,
      ef.status
    FROM european_fulfillment_orders ef
    WHERE ef.account_id = $1
    AND ef.status = 'delivered'
    AND ef.processed_to_orders = false
    AND ef.recipient->>'phone' IS NOT NULL
    LIMIT 1
  `, [accountId]);
  
  if (unprocessed.rows.length === 0) {
    console.log('❌ Nenhum pedido não processado encontrado');
    await pool.end();
    return;
  }
  
  const efOrder = unprocessed.rows[0];
  const efPhone = efOrder.ef_phone;
  const normalizedEFPhone = normalizePhone(efPhone);
  
  console.log(`📞 Testando ${efOrder.order_number}:`);
  console.log(`   Telefone EF original: ${efPhone}`);
  console.log(`   Telefone EF normalizado (JS): ${normalizedEFPhone}`);
  
  // 2. Testar normalização SQL (igual à do código)
  // O código usa: REGEXP_REPLACE(REGEXP_REPLACE(customerPhone, '\\b(ext|extension|ramal|x)\\s*\\.?\\s*\\d+', '', 'gi'), '[^0-9]', '', 'g')
  // Mas NÃO remove o prefixo 34!
  
  // Testar match exato usando SQL
  const exactMatch = await pool.query(`
    SELECT 
      shopify_order_number,
      customer_phone,
      REGEXP_REPLACE(REGEXP_REPLACE(customer_phone, '\\b(ext|extension|ramal|x)\\s*\\.?\\s*\\d+', '', 'gi'), '[^0-9]', '', 'g') as normalized_phone
    FROM orders
    WHERE operation_id = $1
    AND customer_phone IS NOT NULL
    AND REGEXP_REPLACE(REGEXP_REPLACE(customer_phone, '\\b(ext|extension|ramal|x)\\s*\\.?\\s*\\d+', '', 'gi'), '[^0-9]', '', 'g') = $2
    LIMIT 5
  `, [operationId, normalizedEFPhone]);
  
  console.log(`\n   Match exato (SQL com telefone normalizado JS): ${exactMatch.rows.length} encontrados`);
  if (exactMatch.rows.length > 0) {
    exactMatch.rows.forEach(row => {
      console.log(`      ✅ ${row.shopify_order_number}: ${row.customer_phone} → ${row.normalized_phone}`);
    });
  }
  
  // 3. Testar match por sufixo (últimos 9 dígitos)
  if (normalizedEFPhone && normalizedEFPhone.length >= 9) {
    const suffix = normalizedEFPhone.slice(-9);
    
    const suffixMatch = await pool.query(`
      SELECT 
        shopify_order_number,
        customer_phone,
        REGEXP_REPLACE(REGEXP_REPLACE(customer_phone, '\\b(ext|extension|ramal|x)\\s*\\.?\\s*\\d+', '', 'gi'), '[^0-9]', '', 'g') as normalized_phone
      FROM orders
      WHERE operation_id = $1
      AND customer_phone IS NOT NULL
      AND REGEXP_REPLACE(REGEXP_REPLACE(customer_phone, '\\b(ext|extension|ramal|x)\\s*\\.?\\s*\\d+', '', 'gi'), '[^0-9]', '', 'g') LIKE $2
      LIMIT 5
    `, [operationId, `%${suffix}`]);
    
    console.log(`\n   Match por sufixo (últimos 9 dígitos: ${suffix}): ${suffixMatch.rows.length} encontrados`);
    if (suffixMatch.rows.length > 0) {
      suffixMatch.rows.forEach(row => {
        console.log(`      ✅ ${row.shopify_order_number}: ${row.customer_phone} → ${row.normalized_phone}`);
      });
    }
  }
  
  // 4. Mostrar alguns telefones da Shopify para comparar
  const shopifyPhones = await pool.query(`
    SELECT 
      shopify_order_number,
      customer_phone,
      REGEXP_REPLACE(REGEXP_REPLACE(customer_phone, '\\b(ext|extension|ramal|x)\\s*\\.?\\s*\\d+', '', 'gi'), '[^0-9]', '', 'g') as normalized_phone
    FROM orders
    WHERE operation_id = $1
    AND customer_phone IS NOT NULL
    ORDER BY order_date DESC
    LIMIT 10
  `, [operationId]);
  
  console.log(`\n   Telefones Shopify (normalizados pelo SQL):`);
  shopifyPhones.rows.forEach(row => {
    const normalizedJS = normalizePhone(row.customer_phone);
    const match = normalizedJS === normalizedEFPhone || (normalizedEFPhone && normalizedEFPhone.length >= 9 && normalizedJS.length >= 9 && normalizedEFPhone.slice(-9) === normalizedJS.slice(-9));
    console.log(`      ${row.shopify_order_number}: ${row.customer_phone} → SQL: ${row.normalized_phone}, JS: ${normalizedJS} ${match ? '✅ MATCH' : ''}`);
  });
  
  // 5. PROBLEMA ENCONTRADO: A normalização SQL NÃO remove o prefixo 34!
  // O código JS remove o 34, mas a query SQL não!
  console.log(`\n⚠️ PROBLEMA ENCONTRADO:`);
  console.log(`   A normalização JavaScript remove o prefixo 34: ${efPhone} → ${normalizedEFPhone}`);
  console.log(`   Mas a query SQL mantém o prefixo 34!`);
  console.log(`   Isso pode causar falhas no matching!`);
  
  await pool.end();
})();

