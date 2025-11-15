#!/usr/bin/env node
// Script para mostrar todos os dados de um pedido do European Fulfillment

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

async function showEuropeanFulfillmentOrder() {
  try {
    const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
    
    // Buscar alguns pedidos do European Fulfillment
    const orders = await pool.query(`
      SELECT *
      FROM european_fulfillment_orders
      WHERE account_id = $1
      ORDER BY created_at DESC
      LIMIT 3
    `, [accountId]);
    
    if (orders.rows.length === 0) {
      console.log('❌ Nenhum pedido encontrado');
      await pool.end();
      return;
    }
    
    console.log(`📦 Encontrados ${orders.rows.length} pedido(s)\n`);
    
    for (const order of orders.rows) {
      console.log('='.repeat(80));
      console.log(`📦 PEDIDO: ${order.order_number}`);
      console.log('='.repeat(80));
      
      console.log('\n📋 DADOS BÁSICOS:');
      console.log(`   ID: ${order.id}`);
      console.log(`   European Order ID: ${order.european_order_id}`);
      console.log(`   Order Number: ${order.order_number}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Tracking: ${order.tracking || 'N/A'}`);
      console.log(`   Value: ${order.value || '0'}`);
      console.log(`   Account ID: ${order.account_id}`);
      console.log(`   Processed: ${order.processed_to_orders}`);
      console.log(`   Linked Order ID: ${order.linked_order_id || 'N/A'}`);
      
      console.log('\n👤 DADOS DO RECIPIENTE (recipient):');
      const recipient = order.recipient || {};
      console.log(JSON.stringify(recipient, null, 2));
      
      console.log('\n📦 ITEMS (items):');
      const items = order.items || [];
      console.log(JSON.stringify(items, null, 2));
      
      console.log('\n🔍 DADOS COMPLETOS DA API (rawData):');
      const rawData = order.rawData || {};
      console.log(JSON.stringify(rawData, null, 2));
      
      // Mostrar campos específicos que podem ser usados para matching
      console.log('\n🔗 CAMPOS PARA MATCHING:');
      console.log(`   Order Number: ${order.order_number}`);
      console.log(`   Recipient Email: ${recipient.email || 'N/A'}`);
      console.log(`   Recipient Phone: ${recipient.phone || 'N/A'}`);
      
      // Verificar se há outros campos no rawData que possam ajudar
      if (rawData) {
        console.log('\n📊 CAMPOS ADICIONAIS NO rawData:');
        console.log(`   n_lead: ${rawData.n_lead || 'N/A'}`);
        console.log(`   order_number: ${rawData.order_number || 'N/A'}`);
        console.log(`   shopify_order: ${rawData.shopify_order || 'N/A'}`);
        console.log(`   ref: ${rawData.ref || 'N/A'}`);
        console.log(`   ref_s: ${rawData.ref_s || 'N/A'}`);
        console.log(`   email: ${rawData.email || 'N/A'}`);
        console.log(`   phone: ${rawData.phone || 'N/A'}`);
        console.log(`   name: ${rawData.name || 'N/A'}`);
        console.log(`   customer_email: ${rawData.customer_email || 'N/A'}`);
        console.log(`   customer_phone: ${rawData.customer_phone || 'N/A'}`);
        console.log(`   customer_name: ${rawData.customer_name || 'N/A'}`);
      }
      
      console.log('\n');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error);
    await pool.end();
  }
}

showEuropeanFulfillmentOrder();

