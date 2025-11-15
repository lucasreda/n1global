// 🧪 Script de Teste do Sistema de Sincronização Automática
// Testa todos os componentes: webhooks, workers, endpoints, cache

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "cod-dashboard-secret-key-development-2025";
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5001';

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'blue');
  console.log('='.repeat(60) + '\n');
}

// Testes
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

async function test1_ShopifyIntegrations() {
  section('1. Verificando Integrações Shopify');
  
  try {
    const integrations = await pool.query(`
      SELECT id, operation_id, shop_name, status, created_at, updated_at
      FROM shopify_integrations
    `);
    
    if (integrations.rows.length === 0) {
      warning('Nenhuma integração Shopify encontrada');
      results.warnings++;
      return;
    }
    
    success(`Encontradas ${integrations.rows.length} integração(ões) Shopify`);
    
    for (const integration of integrations.rows) {
      info(`  - Loja: ${integration.shop_name}`);
      info(`  - Status: ${integration.status}`);
      info(`  - Operação: ${integration.operation_id}`);
      
      if (integration.status !== 'active') {
        warning(`    ⚠️ Integração não está ativa (status: ${integration.status})`);
        results.warnings++;
      }
    }
    
    results.passed++;
  } catch (err) {
    error(`Erro ao verificar integrações Shopify: ${err.message}`);
    results.failed++;
  }
}

async function test2_CartPandaIntegrations() {
  section('2. Verificando Integrações CartPanda');
  
  try {
    const integrations = await pool.query(`
      SELECT id, operation_id, store_slug, status, created_at, updated_at
      FROM cartpanda_integrations
    `);
    
    if (integrations.rows.length === 0) {
      warning('Nenhuma integração CartPanda encontrada');
      results.warnings++;
      return;
    }
    
    success(`Encontradas ${integrations.rows.length} integração(ões) CartPanda`);
    
    for (const integration of integrations.rows) {
      info(`  - Store Slug: ${integration.store_slug}`);
      info(`  - Status: ${integration.status}`);
      info(`  - Operação: ${integration.operation_id}`);
      
      if (integration.status !== 'active') {
        warning(`    ⚠️ Integração não está ativa (status: ${integration.status})`);
        results.warnings++;
      }
    }
    
    results.passed++;
  } catch (err) {
    error(`Erro ao verificar integrações CartPanda: ${err.message}`);
    results.failed++;
  }
}

async function test3_WarehouseAccounts() {
  section('3. Verificando Contas de Warehouse Ativas');
  
  try {
    const accounts = await pool.query(`
      SELECT id, provider_key, status, user_id
      FROM user_warehouse_accounts
      WHERE status = 'active'
    `);
    
    if (accounts.rows.length === 0) {
      warning('Nenhuma conta de warehouse ativa encontrada');
      results.warnings++;
      return;
    }
    
    success(`Encontradas ${accounts.rows.length} conta(s) de warehouse ativa(s)`);
    
    for (const account of accounts.rows) {
      info(`  - Provider: ${account.provider_key}`);
      info(`  - User ID: ${account.user_id}`);
      
      // Verificar se tem operações vinculadas
      const linkedOps = await pool.query(`
        SELECT COUNT(*) as count
        FROM user_warehouse_account_operations
        WHERE account_id = $1
      `, [account.id]);
      
      const opsCount = parseInt(linkedOps.rows[0]?.count || '0');
      if (opsCount === 0) {
        warning(`    ⚠️ Conta não tem operações vinculadas`);
        results.warnings++;
      } else {
        info(`    ✅ ${opsCount} operação(ões) vinculada(s)`);
      }
    }
    
    results.passed++;
  } catch (err) {
    error(`Erro ao verificar contas de warehouse: ${err.message}`);
    results.failed++;
  }
}

async function test4_StagingOrders() {
  section('4. Verificando Pedidos na Staging Table');
  
  try {
    const totalEF = await pool.query(`
      SELECT COUNT(*) as count
      FROM european_fulfillment_orders
    `);
    
    const totalEFCount = parseInt(totalEF.rows[0]?.count || '0');
    
    const unprocessedEF = await pool.query(`
      SELECT COUNT(*) as count
      FROM european_fulfillment_orders
      WHERE processed_to_orders = false
        AND (raw_data->>'failedMatch')::boolean IS NOT TRUE
    `);
    
    const unprocessedEFCount = parseInt(unprocessedEF.rows[0]?.count || '0');
    
    info(`European Fulfillment: ${totalEFCount} total, ${unprocessedEFCount} não processados`);
    
    if (unprocessedEFCount > 0) {
      warning(`⚠️ Existem ${unprocessedEFCount} pedidos aguardando processamento na staging`);
      results.warnings++;
    } else if (totalEFCount > 0) {
      success(`Todos os ${totalEFCount} pedidos já foram processados`);
    } else {
      info('Nenhum pedido na staging table ainda');
    }
    
    results.passed++;
  } catch (err) {
    error(`Erro ao verificar staging orders: ${err.message}`);
    results.failed++;
  }
}

async function test5_LastOrders() {
  section('5. Verificando Últimos Pedidos Processados');
  
  try {
    const allOps = await pool.query(`
      SELECT id, name
      FROM operations
    `);
    
    if (allOps.rows.length === 0) {
      warning('Nenhuma operação encontrada');
      results.warnings++;
      return;
    }
    
    for (const op of allOps.rows) {
      const orderStats = await pool.query(`
        SELECT 
          MAX(created_at) as last_created,
          MAX(updated_at) as last_updated,
          COUNT(*) as total_orders
        FROM orders
        WHERE operation_id = $1
      `, [op.id]);
      
      const stats = orderStats.rows[0];
      const totalOrders = parseInt(stats?.total_orders || '0');
      
      if (totalOrders > 0) {
        success(`Operação: ${op.name} (${op.id})`);
        info(`  - Total de pedidos: ${totalOrders}`);
        info(`  - Último criado: ${stats.last_created || 'N/A'}`);
        info(`  - Última atualização: ${stats.last_updated || 'N/A'}`);
        
        const lastUpdate = stats.last_updated || stats.last_created;
        if (lastUpdate) {
          const minutesAgo = Math.floor((Date.now() - new Date(lastUpdate).getTime()) / 1000 / 60);
          if (minutesAgo > 30) {
            warning(`    ⚠️ Última atualização há ${minutesAgo} minutos (pode indicar que sync não está funcionando)`);
            results.warnings++;
          } else {
            info(`    ✅ Última atualização há ${minutesAgo} minutos`);
          }
        }
      } else {
        info(`Operação: ${op.name} (${op.id}) - Nenhum pedido ainda`);
      }
    }
    
    results.passed++;
  } catch (err) {
    error(`Erro ao verificar últimos pedidos: ${err.message}`);
    results.failed++;
  }
}

async function test6_WebhookEndpoints() {
  section('6. Testando Endpoints de Webhook');
  
  try {
    const domain = process.env.REPLIT_DEV_DOMAIN || process.env.PUBLIC_URL;
    
    if (!domain) {
      warning('REPLIT_DEV_DOMAIN ou PUBLIC_URL não configurado - webhooks precisam de URL pública');
      results.warnings++;
      return;
    }
    
    const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
    const shopifyWebhookUrl = `${baseUrl}/api/webhooks/shopify/orders`;
    const cartpandaWebhookUrl = `${baseUrl}/api/webhooks/cartpanda/orders`;
    
    info(`Shopify webhook URL: ${shopifyWebhookUrl}`);
    info(`CartPanda webhook URL: ${cartpandaWebhookUrl}`);
    
    // Teste básico de conectividade (sem autenticação necessária para webhooks)
    try {
      const shopifyResponse = await fetch(shopifyWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      });
      
      // Webhook deve retornar 401 (sem assinatura) ou 400 (dados inválidos), mas não 404
      if (shopifyResponse.status === 404) {
        error('Endpoint Shopify webhook não encontrado (404)');
        results.failed++;
      } else {
        success(`Endpoint Shopify webhook responde (status: ${shopifyResponse.status})`);
        results.passed++;
      }
    } catch (err) {
      if (err.message.includes('ECONNREFUSED') || err.message.includes('fetch failed')) {
        warning(`Não foi possível conectar ao endpoint (servidor pode não estar rodando ou URL não acessível)`);
        results.warnings++;
      } else {
        error(`Erro ao testar endpoint Shopify webhook: ${err.message}`);
        results.failed++;
      }
    }
    
    try {
      const cartpandaResponse = await fetch(cartpandaWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      });
      
      if (cartpandaResponse.status === 404) {
        error('Endpoint CartPanda webhook não encontrado (404)');
        results.failed++;
      } else {
        success(`Endpoint CartPanda webhook responde (status: ${cartpandaResponse.status})`);
        results.passed++;
      }
    } catch (err) {
      if (err.message.includes('ECONNREFUSED') || err.message.includes('fetch failed')) {
        warning(`Não foi possível conectar ao endpoint (servidor pode não estar rodando ou URL não acessível)`);
        results.warnings++;
      } else {
        error(`Erro ao testar endpoint CartPanda webhook: ${err.message}`);
        results.failed++;
      }
    }
  } catch (err) {
    error(`Erro ao testar endpoints de webhook: ${err.message}`);
    results.failed++;
  }
}

async function test7_DashboardLastUpdate() {
  section('7. Testando Endpoint de Last Update');
  
  try {
    // Buscar um usuário para gerar token de teste
    const testUsers = await pool.query(`
      SELECT id, email, role
      FROM users
      LIMIT 1
    `);
    
    if (testUsers.rows.length === 0) {
      warning('Nenhum usuário encontrado para gerar token de teste');
      results.warnings++;
      return;
    }
    
    const testUser = testUsers.rows[0];
    const token = jwt.sign(
      { id: testUser.id, email: testUser.email, role: testUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Buscar uma operação
    const testOps = await pool.query(`
      SELECT id
      FROM operations
      LIMIT 1
    `);
    
    if (testOps.rows.length === 0) {
      warning('Nenhuma operação encontrada para teste');
      results.warnings++;
      return;
    }
    
    const testOperation = testOps.rows[0];
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/dashboard/last-update?operationId=${testOperation.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (response.status === 404) {
        error('Endpoint /api/dashboard/last-update não encontrado');
        results.failed++;
        return;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        error(`Endpoint retornou erro: ${response.status} - ${errorText}`);
        results.failed++;
        return;
      }
      
      const data = await response.json();
      success(`Endpoint /api/dashboard/last-update responde corretamente`);
      info(`  - Operation ID: ${data.operationId}`);
      info(`  - Last Update: ${data.lastUpdate || 'Nenhuma atualização ainda'}`);
      
      results.passed++;
    } catch (err) {
      if (err.message.includes('ECONNREFUSED') || err.message.includes('fetch failed')) {
        warning(`Não foi possível conectar ao servidor em ${API_BASE_URL} (servidor pode não estar rodando)`);
        results.warnings++;
      } else {
        error(`Erro ao testar endpoint last-update: ${err.message}`);
        results.failed++;
      }
    }
  } catch (err) {
    error(`Erro ao testar endpoint last-update: ${err.message}`);
    results.failed++;
  }
}

async function test8_EnvironmentVariables() {
  section('8. Verificando Variáveis de Ambiente');
  
  const required = {
    'DATABASE_URL': process.env.DATABASE_URL,
    'JWT_SECRET': process.env.JWT_SECRET,
  };
  
  const optional = {
    'REPLIT_DEV_DOMAIN': process.env.REPLIT_DEV_DOMAIN,
    'PUBLIC_URL': process.env.PUBLIC_URL,
  };
  
  let allOk = true;
  
  for (const [key, value] of Object.entries(required)) {
    if (value) {
      success(`${key}: configurado`);
    } else {
      error(`${key}: NÃO CONFIGURADO (obrigatório)`);
      allOk = false;
      results.failed++;
    }
  }
  
  for (const [key, value] of Object.entries(optional)) {
    if (value) {
      success(`${key}: configurado`);
    } else {
      warning(`${key}: não configurado (opcional, necessário para webhooks)`);
      results.warnings++;
    }
  }
  
  if (allOk) {
    results.passed++;
  }
}

async function runAllTests() {
  console.log('\n');
  log('🧪 SISTEMA DE TESTE DE SINCRONIZAÇÃO AUTOMÁTICA', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  console.log('\n');
  
  await test8_EnvironmentVariables();
  await test1_ShopifyIntegrations();
  await test2_CartPandaIntegrations();
  await test3_WarehouseAccounts();
  await test4_StagingOrders();
  await test5_LastOrders();
  await test6_WebhookEndpoints();
  await test7_DashboardLastUpdate();
  
  // Resumo
  section('RESUMO DOS TESTES');
  
  success(`Testes passados: ${results.passed}`);
  if (results.warnings > 0) {
    warning(`Avisos: ${results.warnings}`);
  }
  if (results.failed > 0) {
    error(`Testes falhados: ${results.failed}`);
  }
  
  console.log('\n');
  
  if (results.failed === 0) {
    success('🎉 Todos os testes críticos passaram!');
    if (results.warnings > 0) {
      warning('⚠️  Mas há alguns avisos que devem ser verificados.');
    }
  } else {
    error('❌ Alguns testes falharam. Verifique os erros acima.');
  }
  
  console.log('\n');
}

// Executar testes
runAllTests()
  .then(async () => {
    await pool.end();
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch(async (err) => {
    console.error('Erro fatal:', err);
    await pool.end();
    process.exit(1);
  });

