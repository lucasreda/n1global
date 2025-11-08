#!/usr/bin/env node
// Script para verificar se o rawData está sendo salvo corretamente

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

async function checkRawData() {
  try {
    const accountId = '932839f6-c7df-4cb5-956e-26090ad32d35';
    
    // Buscar um pedido com rawData para ver o que foi salvo
    const orders = await pool.query(`
      SELECT 
        order_number,
        status,
        recipient,
        raw_data,
        CASE 
          WHEN raw_data::text = '{}' THEN 'VAZIO'
          WHEN raw_data::text = 'null' THEN 'NULL'
          ELSE 'TEM DADOS'
        END as raw_data_status
      FROM european_fulfillment_orders
      WHERE account_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [accountId]);
    
    console.log(`📦 Verificando rawData de ${orders.rows.length} pedido(s)\n`);
    
    for (const order of orders.rows) {
      console.log('='.repeat(80));
      console.log(`📦 PEDIDO: ${order.order_number}`);
      console.log('='.repeat(80));
      console.log(`\n📊 Status do rawData: ${order.raw_data_status}`);
      
      if (order.raw_data && Object.keys(order.raw_data).length > 0) {
        console.log('\n✅ rawData TEM dados:');
        console.log(JSON.stringify(order.raw_data, null, 2));
        
        // Mostrar campos que podem ser usados para matching
        console.log('\n🔗 Campos disponíveis para matching:');
        const raw = order.raw_data;
        console.log(`   n_lead: ${raw.n_lead || 'N/A'}`);
        console.log(`   order_number: ${raw.order_number || 'N/A'}`);
        console.log(`   shopify_order: ${raw.shopify_order || 'N/A'}`);
        console.log(`   ref: ${raw.ref || 'N/A'}`);
        console.log(`   ref_s: ${raw.ref_s || raw.refs || 'N/A'}`);
        console.log(`   email: ${raw.email || 'N/A'}`);
        console.log(`   phone: ${raw.phone || 'N/A'}`);
        console.log(`   name: ${raw.name || 'N/A'}`);
        console.log(`   customer_email: ${raw.customer_email || 'N/A'}`);
        console.log(`   customer_phone: ${raw.customer_phone || 'N/A'}`);
        console.log(`   customer_name: ${raw.customer_name || 'N/A'}`);
      } else {
        console.log('\n❌ rawData está VAZIO ou NULL');
        console.log('   Isso significa que os dados completos da API não foram salvos.');
        console.log('   O matching só pode usar os dados do campo recipient.');
      }
      
      console.log('\n📋 Dados no recipient:');
      console.log(JSON.stringify(order.recipient, null, 2));
      console.log('\n');
    }
    
    // Verificar se há pedidos com rawData vazio
    const emptyRawData = await pool.query(`
      SELECT COUNT(*) as count
      FROM european_fulfillment_orders
      WHERE account_id = $1
      AND (raw_data::text = '{}' OR raw_data::text = 'null' OR raw_data IS NULL)
    `, [accountId]);
    
    console.log(`\n📊 Estatísticas:`);
    console.log(`   Pedidos com rawData vazio: ${emptyRawData.rows[0].count}`);
    
    const total = await pool.query(`
      SELECT COUNT(*) as count
      FROM european_fulfillment_orders
      WHERE account_id = $1
    `, [accountId]);
    
    console.log(`   Total de pedidos: ${total.rows[0].count}`);
    console.log(`\n💡 Se todos os rawData estão vazios, o problema é na hora de salvar os dados da API.\n`);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error);
    await pool.end();
  }
}

checkRawData();

