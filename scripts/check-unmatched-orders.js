import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Função de normalização igual à do código
function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.toLowerCase();
  cleaned = cleaned.replace(/\b(ext|extension|ramal|x)\s*\.?\s*\d+/gi, '');
  return cleaned.replace(/[^\d]/g, '');
}

(async () => {
  const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
  const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
  
  console.log('🔍 Verificando pedidos não processados e dados para busca manual...\n');
  
  // 1. Pegar alguns pedidos não processados com TODOS os dados
  const unprocessed = await pool.query(`
    SELECT 
      ef.order_number,
      ef.status,
      ef.recipient->>'phone' as phone,
      ef.recipient->>'email' as email,
      ef.recipient->>'name' as name,
      ef.recipient->>'city' as city,
      ef.value,
      ef.raw_data->>'n_lead' as n_lead,
      ef.raw_data->>'method_payment' as payment_method,
      ef.raw_data->>'status_livrison' as status_livrison,
      ef.raw_data->>'status_confirmation' as status_confirmation,
      ef.processed_to_orders,
      ef.raw_data->>'matchAttempts' as match_attempts
    FROM european_fulfillment_orders ef
    WHERE ef.account_id = $1
    AND ef.status = 'delivered'
    AND ef.processed_to_orders = false
    LIMIT 5
  `, [accountId]);
  
  console.log(`📦 Encontrados ${unprocessed.rows.length} pedidos não processados:\n`);
  
  for (const order of unprocessed.rows) {
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`📋 Pedido EF: ${order.order_number}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Número do Lead: ${order.n_lead || 'N/A'}`);
    console.log(`   Valor: €${order.value || 'N/A'}`);
    console.log(`   Método de Pagamento: ${order.payment_method || 'N/A'}`);
    console.log(`   Status Entrega: ${order.status_livrison || 'N/A'}`);
    console.log(`   Status Confirmação: ${order.status_confirmation || 'N/A'}`);
    console.log(`   Tentativas de Match: ${order.match_attempts || 0}`);
    console.log(``);
    console.log(`👤 Dados do Cliente:`);
    console.log(`   Nome: ${order.name || 'N/A'}`);
    console.log(`   Telefone: ${order.phone || 'N/A'}`);
    console.log(`   Email: ${order.email || 'N/A'}`);
    console.log(`   Cidade: ${order.city || 'N/A'}`);
    console.log(``);
    
    if (order.phone) {
      const normalizedPhone = normalizePhone(order.phone);
      console.log(`   🔢 Telefone normalizado: ${normalizedPhone}`);
      console.log(`   🔢 Últimos 9 dígitos: ${normalizedPhone.length >= 9 ? normalizedPhone.slice(-9) : normalizedPhone}`);
    }
    
    console.log(``);
    console.log(`🔍 Para buscar na Shopify, procure por:`);
    console.log(`   • Telefone: ${order.phone || 'N/A'}`);
    if (order.phone) {
      const normalizedPhone = normalizePhone(order.phone);
      console.log(`   • Telefone normalizado: ${normalizedPhone}`);
      console.log(`   • Últimos 9 dígitos: ${normalizedPhone.length >= 9 ? normalizedPhone.slice(-9) : normalizedPhone}`);
    }
    console.log(`   • Email: ${order.email || 'N/A'}`);
    console.log(`   • Nome: ${order.name || 'N/A'}`);
    console.log(`   • Cidade: ${order.city || 'N/A'}`);
    console.log(`   • Valor: €${order.value || 'N/A'}`);
    console.log(`   • Número do Lead: ${order.n_lead || 'N/A'}`);
    console.log(`   • Order Number: ${order.order_number}`);
    console.log(``);
    
    // Verificar se existe algum pedido na Shopify com esses dados
    const phone = order.phone;
    const email = order.email;
    const name = order.name;
    
    if (phone) {
      const normalizedPhone = normalizePhone(phone);
      const suffix = normalizedPhone.length >= 9 ? normalizedPhone.slice(-9) : normalizedPhone;
      
      // Buscar por telefone
      const matchesByPhone = await pool.query(`
        SELECT 
          shopify_order_number,
          customer_phone,
          customer_email,
          customer_name,
          order_date,
          total,
          status
        FROM orders
        WHERE operation_id = $1
        AND customer_phone IS NOT NULL
        AND (
          REGEXP_REPLACE(REGEXP_REPLACE(customer_phone, '\\b(ext|extension|ramal|x)\\s*\\.?\\s*\\d+', '', 'gi'), '[^0-9]', '', 'g') LIKE $2
          OR REGEXP_REPLACE(REGEXP_REPLACE(customer_phone, '\\b(ext|extension|ramal|x)\\s*\\.?\\s*\\d+', '', 'gi'), '[^0-9]', '', 'g') LIKE $3
        )
        LIMIT 5
      `, [operationId, `%${suffix}%`, `${suffix}%`]);
      
      if (matchesByPhone.rows.length > 0) {
        console.log(`   ⚠️ ENCONTRADOS ${matchesByPhone.rows.length} PEDIDOS COM TELEFONE SIMILAR:`);
        matchesByPhone.rows.forEach(match => {
          console.log(`      • Shopify #${match.shopify_order_number}: ${match.customer_phone} (${match.customer_email || 'sem email'}) - ${match.order_date} - €${match.total} - ${match.status}`);
        });
      } else {
        console.log(`   ❌ Nenhum pedido encontrado com telefone similar na Shopify`);
      }
    }
    
    if (email) {
      // Buscar por email
      const matchesByEmail = await pool.query(`
        SELECT 
          shopify_order_number,
          customer_phone,
          customer_email,
          customer_name,
          order_date,
          total,
          status
        FROM orders
        WHERE operation_id = $1
        AND LOWER(TRIM(customer_email)) = $2
        LIMIT 5
      `, [operationId, email.toLowerCase().trim()]);
      
      if (matchesByEmail.rows.length > 0) {
        console.log(`   ⚠️ ENCONTRADOS ${matchesByEmail.rows.length} PEDIDOS COM EMAIL:`);
        matchesByEmail.rows.forEach(match => {
          console.log(`      • Shopify #${match.shopify_order_number}: ${match.customer_email} (${match.customer_phone || 'sem telefone'}) - ${match.order_date} - €${match.total} - ${match.status}`);
        });
      }
    }
    
    console.log(``);
  }
  
  // Estatísticas gerais
  const stats = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE recipient->>'phone' IS NOT NULL) as has_phone,
      COUNT(*) FILTER (WHERE recipient->>'phone' IS NULL) as no_phone,
      COUNT(*) FILTER (WHERE recipient->>'email' IS NOT NULL) as has_email,
      COUNT(*) FILTER (WHERE recipient->>'email' IS NULL) as no_email
    FROM european_fulfillment_orders
    WHERE account_id = $1
    AND status = 'delivered'
    AND processed_to_orders = false
  `, [accountId]);
  
  const s = stats.rows[0];
  console.log(`📊 Estatísticas dos pedidos não processados:`);
  console.log(`   Com telefone: ${s.has_phone}`);
  console.log(`   Sem telefone: ${s.no_phone}`);
  console.log(`   Com email: ${s.has_email}`);
  console.log(`   Sem email: ${s.no_email}`);
  
  await pool.end();
})();

