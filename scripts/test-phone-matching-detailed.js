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
  // IMPORTANTE: O código atual remove o prefixo 34, mas isso pode estar causando problemas
  normalized = normalized.replace(/^34/, '');
  
  return normalized;
}

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔍 Testando matching por telefone em detalhes...\n');
  
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
    LIMIT 3
  `, [accountId]);
  
  for (const efOrder of unprocessed.rows) {
    console.log(`\n📞 Testando ${efOrder.order_number}:`);
    console.log(`   Telefone EF: ${efOrder.ef_phone}`);
    
    const normalizedEFPhone = normalizePhone(efOrder.ef_phone);
    console.log(`   Telefone normalizado EF: ${normalizedEFPhone}`);
    
    // 2. Buscar telefones na tabela orders e normalizar
    const shopifyOrders = await pool.query(`
      SELECT 
        shopify_order_number,
        customer_phone,
        customer_email,
        status
      FROM orders
      WHERE operation_id = $1
      AND customer_phone IS NOT NULL
      ORDER BY order_date DESC
      LIMIT 20
    `, [operationId]);
    
    console.log(`   \n   Verificando ${shopifyOrders.rows.length} pedidos da Shopify:`);
    
    let foundMatch = false;
    for (const shopifyOrder of shopifyOrders.rows) {
      if (!shopifyOrder.customer_phone) continue;
      
      const normalizedShopifyPhone = normalizePhone(shopifyOrder.customer_phone);
      
      // Testar match exato
      if (normalizedEFPhone === normalizedShopifyPhone) {
        console.log(`   ✅ MATCH EXATO encontrado!`);
        console.log(`      Shopify: ${shopifyOrder.shopify_order_number} (${shopifyOrder.customer_phone} → ${normalizedShopifyPhone})`);
        console.log(`      EF: ${efOrder.order_number} (${efOrder.ef_phone} → ${normalizedEFPhone})`);
        foundMatch = true;
        break;
      }
      
      // Testar match por sufixo (últimos 9 dígitos)
      if (normalizedEFPhone.length >= 9 && normalizedShopifyPhone.length >= 9) {
        const efSuffix = normalizedEFPhone.slice(-9);
        const shopifySuffix = normalizedShopifyPhone.slice(-9);
        
        if (efSuffix === shopifySuffix) {
          console.log(`   ✅ MATCH POR SUFIXO encontrado!`);
          console.log(`      Shopify: ${shopifyOrder.shopify_order_number} (${shopifyOrder.customer_phone} → ${normalizedShopifyPhone}, suffix: ${shopifySuffix})`);
          console.log(`      EF: ${efOrder.order_number} (${efOrder.ef_phone} → ${normalizedEFPhone}, suffix: ${efSuffix})`);
          foundMatch = true;
          break;
        }
      }
      
      // Mostrar alguns exemplos para debug
      if (shopifyOrders.rows.indexOf(shopifyOrder) < 3) {
        console.log(`      #${shopifyOrder.shopify_order_number}: ${shopifyOrder.customer_phone} → ${normalizedShopifyPhone} (suffix: ${normalizedShopifyPhone.length >= 9 ? normalizedShopifyPhone.slice(-9) : normalizedShopifyPhone})`);
      }
    }
    
    if (!foundMatch) {
      console.log(`   ❌ Nenhum match encontrado`);
    }
  }
  
  // 3. Estatísticas de formatos de telefone
  console.log(`\n📊 Analisando formatos de telefone:\n`);
  
  const efPhones = await pool.query(`
    SELECT 
      recipient->>'phone' as phone,
      COUNT(*) as count
    FROM european_fulfillment_orders
    WHERE account_id = $1
    AND status = 'delivered'
    AND processed_to_orders = false
    AND recipient->>'phone' IS NOT NULL
    GROUP BY recipient->>'phone'
    LIMIT 10
  `, [accountId]);
  
  console.log(`📦 Telefones EF (primeiros 10 formatos únicos):`);
  efPhones.rows.forEach(row => {
    const normalized = normalizePhone(row.phone);
    console.log(`   ${row.phone} → ${normalized} (${row.count} pedidos)`);
  });
  
  const shopifyPhones = await pool.query(`
    SELECT 
      customer_phone,
      COUNT(*) as count
    FROM orders
    WHERE operation_id = $1
    AND customer_phone IS NOT NULL
    GROUP BY customer_phone
    ORDER BY count DESC
    LIMIT 10
  `, [operationId]);
  
  console.log(`\n🛒 Telefones Shopify (primeiros 10 formatos únicos):`);
  shopifyPhones.rows.forEach(row => {
    const normalized = normalizePhone(row.customer_phone);
    console.log(`   ${row.customer_phone} → ${normalized} (${row.count} pedidos)`);
  });
  
  await pool.end();
})();

