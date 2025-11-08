#!/usr/bin/env node
// Script para verificar formatos de números de pedido

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

async function checkOrderFormats() {
  try {
    const operationId = 'cbcc35d7-e2d0-4836-a51d-72e763355031';
    const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
    
    // Verificar alguns pedidos da Shopify para ver o formato
    const shopifyOrders = await pool.query(`
      SELECT shopify_order_number, customer_email, customer_phone, status, created_at
      FROM orders
      WHERE operation_id = $1
      AND shopify_order_number IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 10
    `, [operationId]);
    
    console.log('📦 Pedidos da Shopify (últimos 10):');
    shopifyOrders.rows.forEach((o, i) => {
      console.log(`  ${i+1}. ${o.shopify_order_number || 'NULL'}: email=${o.customer_email || 'none'}, phone=${o.customer_phone || 'none'}, status=${o.status}`);
    });
    
    // Verificar alguns pedidos do European Fulfillment
    const efOrders = await pool.query(`
      SELECT order_number, status, recipient
      FROM european_fulfillment_orders
      WHERE account_id = $1
      AND processed_to_orders = false
      ORDER BY created_at DESC
      LIMIT 10
    `, [accountId]);
    
    console.log('\n📦 Pedidos do European Fulfillment não processados (últimos 10):');
    efOrders.rows.forEach((o, i) => {
      const recipient = o.recipient || {};
      console.log(`  ${i+1}. ${o.order_number}: email=${recipient.email || 'none'}, phone=${recipient.phone || 'none'}, status=${o.status}`);
    });
    
    // Verificar se há matches potenciais por email
    console.log('\n🔍 Verificando matches potenciais por email...');
    const potentialEmailMatches = await pool.query(`
      SELECT 
        o.shopify_order_number as shopify_order,
        o.customer_email as shopify_email,
        ef.order_number as ef_order,
        ef.recipient->>'email' as ef_email
      FROM orders o
      CROSS JOIN european_fulfillment_orders ef
      WHERE o.operation_id = $1
      AND ef.account_id = $2
      AND ef.processed_to_orders = false
      AND LOWER(TRIM(o.customer_email)) = LOWER(TRIM(ef.recipient->>'email'))
      AND o.customer_email IS NOT NULL
      AND ef.recipient->>'email' IS NOT NULL
      LIMIT 10
    `, [operationId, accountId]);
    
    console.log(`   ✅ Encontrados ${potentialEmailMatches.rows.length} matches potenciais por email:`);
    potentialEmailMatches.rows.forEach(m => {
      console.log(`      Shopify: ${m.shopify_order} ↔ EF: ${m.ef_order} (email: ${m.shopify_email})`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error);
    await pool.end();
  }
}

checkOrderFormats();

