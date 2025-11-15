#!/usr/bin/env node
// Script para verificar o estado dos pedidos entregados no banco de dados

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import dotenv from 'dotenv';

dotenv.config();

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrado no .env');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkDeliveredOrders() {
  try {
    console.log('🔍 Verificando estado dos pedidos entregados...\n');

    // 1. Verificar contas do European Fulfillment
    console.log('1️⃣ Verificando contas do European Fulfillment:');
    const accountsResult = await pool.query(`
      SELECT id, user_id, provider_key, display_name, status
      FROM user_warehouse_accounts
      WHERE provider_key = 'european_fulfillment'
    `);

    const accounts = accountsResult.rows;
    console.log(`   ✅ Encontradas ${accounts.length} conta(s) do European Fulfillment\n`);
    
    if (accounts.length === 0) {
      console.log('   ⚠️  Nenhuma conta encontrada! Verifique se a conta foi criada.\n');
      return;
    }

    for (const account of accounts) {
      console.log(`   📦 Conta: ${account.display_name} (${account.id})`);
      console.log(`      Status: ${account.status}`);
      console.log(`      User ID: ${account.user_id}\n`);

      // Verificar vinculações com operações
      const linksResult = await pool.query(`
        SELECT uwao.account_id, uwao.operation_id, o.name as operation_name
        FROM user_warehouse_account_operations uwao
        INNER JOIN operations o ON uwao.operation_id = o.id
        WHERE uwao.account_id = $1
      `, [account.id]);

      const links = linksResult.rows;
      console.log(`      🔗 Vinculações: ${links.length} operação(ões)`);
      for (const link of links) {
        console.log(`         - ${link.operation_name} (${link.operation_id})`);
      }
      console.log('');

      // Verificar pedidos na staging table
      const stagingResult = await pool.query(`
        SELECT 
          count(*) as total,
          count(*) FILTER (WHERE processed_to_orders = false) as unprocessed,
          count(*) FILTER (WHERE status = 'delivered' OR status = 'unpacked') as delivered
        FROM european_fulfillment_orders
        WHERE account_id = $1
      `, [account.id]);

      const staging = stagingResult.rows[0];
      console.log(`      📊 Pedidos na staging table:`);
      console.log(`         Total: ${staging.total}`);
      console.log(`         Não processados: ${staging.unprocessed}`);
      console.log(`         Com status delivered/unpacked: ${staging.delivered}\n`);
    }

    // 2. Verificar pedidos na tabela orders
    console.log('\n2️⃣ Verificando pedidos na tabela orders:');
    
    // Pegar uma operação qualquer para teste
    if (accounts.length > 0) {
      const accountId = accounts[0].id;
      const linksResult = await pool.query(`
        SELECT operation_id
        FROM user_warehouse_account_operations
        WHERE account_id = $1
        LIMIT 1
      `, [accountId]);

      if (linksResult.rows.length > 0) {
        const operationId = linksResult.rows[0].operation_id;
        
        const orderStatsResult = await pool.query(`
          SELECT 
            count(*) as total,
            count(*) FILTER (WHERE status = 'pending') as pending,
            count(*) FILTER (WHERE status = 'delivered') as delivered,
            count(*) FILTER (WHERE status = 'shipped') as shipped,
            count(*) FILTER (WHERE carrier_imported = true) as carrier_imported,
            count(*) FILTER (WHERE provider = 'european_fulfillment') as european_fulfillment
          FROM orders
          WHERE operation_id = $1
        `, [operationId]);

        const stats = orderStatsResult.rows[0];
        console.log(`   📊 Estatísticas para operação ${operationId}:`);
        console.log(`      Total de pedidos: ${stats.total}`);
        console.log(`      Pendentes: ${stats.pending}`);
        console.log(`      Entregados: ${stats.delivered}`);
        console.log(`      Enviados: ${stats.shipped}`);
        console.log(`      Importados da transportadora: ${stats.carrier_imported}`);
        console.log(`      Do European Fulfillment: ${stats.european_fulfillment}\n`);

        // Verificar alguns pedidos específicos para debugging
        const sampleResult = await pool.query(`
          SELECT id, shopify_order_number, status, carrier_imported, provider, carrier_order_id
          FROM orders
          WHERE operation_id = $1
          LIMIT 5
        `, [operationId]);

        console.log(`   📋 Amostra de pedidos (primeiros 5):`);
        for (const order of sampleResult.rows) {
          console.log(`      - ${order.shopify_order_number}: ${order.status} (carrier: ${order.carrier_imported}, provider: ${order.provider || 'none'})`);
        }
        console.log('');
      }
    }

    // 3. Verificar alguns pedidos não processados na staging table
    console.log('\n3️⃣ Verificando pedidos não processados na staging table:');
    
    const unprocessedResult = await pool.query(`
      SELECT order_number, status, account_id, processed_to_orders
      FROM european_fulfillment_orders
      WHERE processed_to_orders = false
      LIMIT 10
    `);

    console.log(`   📋 Encontrados ${unprocessedResult.rows.length} pedidos não processados (mostrando até 10):`);
    for (const staging of unprocessedResult.rows) {
      console.log(`      - ${staging.order_number}: status=${staging.status}, accountId=${staging.account_id}`);
    }
    console.log('');

    console.log('✅ Verificação concluída!\n');

  } catch (error) {
    console.error('❌ Erro ao verificar:', error);
  } finally {
    await pool.end();
  }
}

checkDeliveredOrders();

