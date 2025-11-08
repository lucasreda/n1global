import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Função de normalização igual à do código (mantém todos os dígitos)
function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.toLowerCase();
  cleaned = cleaned.replace(/\b(ext|extension|ramal|x)\s*\.?\s*\d+/gi, '');
  return cleaned.replace(/[^\d]/g, '');
}

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔍 Testando TODOS os matches possíveis por telefone...\n');
  
  // 1. Buscar TODOS os pedidos não processados com telefone
  const unprocessed = await pool.query(`
    SELECT 
      ef.order_number,
      ef.recipient->>'phone' as ef_phone
    FROM european_fulfillment_orders ef
    WHERE ef.account_id = $1
    AND ef.status = 'delivered'
    AND ef.processed_to_orders = false
    AND ef.recipient->>'phone' IS NOT NULL
  `, [accountId]);
  
  console.log(`📦 Pedidos EF não processados: ${unprocessed.rows.length}`);
  
  // 2. Buscar TODOS os pedidos da Shopify com telefone
  const shopifyOrders = await pool.query(`
    SELECT 
      shopify_order_number,
      customer_phone,
      order_date,
      status
    FROM orders
    WHERE operation_id = $1
    AND customer_phone IS NOT NULL
    ORDER BY order_date DESC
  `, [operationId]);
  
  console.log(`🛒 Pedidos Shopify com telefone: ${shopifyOrders.rows.length}\n`);
  
  // 3. Normalizar todos os telefones
  const efPhonesMap = new Map();
  unprocessed.rows.forEach(ef => {
    const normalized = normalizePhone(ef.ef_phone);
    if (normalized && normalized.length >= 9) {
      const suffix = normalized.slice(-9);
      if (!efPhonesMap.has(suffix)) {
        efPhonesMap.set(suffix, []);
      }
      efPhonesMap.get(suffix).push({ order: ef.order_number, phone: ef.ef_phone, normalized, suffix });
    }
  });
  
  const shopifyPhonesMap = new Map();
  shopifyOrders.rows.forEach(sp => {
    const normalized = normalizePhone(sp.customer_phone);
    if (normalized) {
      const suffix = normalized.length >= 9 ? normalized.slice(-9) : normalized;
      if (!shopifyPhonesMap.has(suffix)) {
        shopifyPhonesMap.set(suffix, []);
      }
      shopifyPhonesMap.get(suffix).push({ order: sp.shopify_order_number, phone: sp.customer_phone, normalized, suffix });
    }
  });
  
  // 4. Encontrar matches
  let matchesFound = 0;
  const matches = [];
  
  efPhonesMap.forEach((efOrders, efSuffix) => {
    if (shopifyPhonesMap.has(efSuffix)) {
      const spOrders = shopifyPhonesMap.get(efSuffix);
      efOrders.forEach(ef => {
        spOrders.forEach(sp => {
          matchesFound++;
          matches.push({
            ef: ef.order,
            efPhone: ef.phone,
            efNormalized: ef.normalized,
            shopify: sp.order,
            shopifyPhone: sp.phone,
            shopifyNormalized: sp.normalized,
            suffix: efSuffix
          });
        });
      });
    }
  });
  
  console.log(`✅ Encontrados ${matchesFound} matches potenciais!\n`);
  
  if (matches.length > 0) {
    console.log(`📋 Primeiros 10 matches:`);
    matches.slice(0, 10).forEach((match, idx) => {
      console.log(`\n${idx + 1}. Match encontrado:`);
      console.log(`   EF: ${match.ef} (${match.efPhone} → ${match.efNormalized})`);
      console.log(`   Shopify: ${match.shopify} (${match.shopifyPhone} → ${match.shopifyNormalized})`);
      console.log(`   Sufixo comum: ${match.suffix}`);
    });
    
    if (matches.length > 10) {
      console.log(`\n   ... e mais ${matches.length - 10} matches`);
    }
  } else {
    console.log(`❌ Nenhum match encontrado!`);
    console.log(`\n📊 Estatísticas:`);
    console.log(`   EF telefones únicos: ${efPhonesMap.size}`);
    console.log(`   Shopify telefones únicos: ${shopifyPhonesMap.size}`);
    console.log(`   Sufixos EF únicos: ${[...efPhonesMap.keys()].join(', ')}`);
    console.log(`   Sufixos Shopify únicos (primeiros 10): ${[...shopifyPhonesMap.keys()].slice(0, 10).join(', ')}`);
  }
  
  await pool.end();
})();

