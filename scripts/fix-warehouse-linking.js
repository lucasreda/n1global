#!/usr/bin/env node
// Script para vincular automaticamente a conta do warehouse às operações do usuário

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

async function fixWarehouseLinking() {
  try {
    console.log('🔧 Corrigindo vinculações de warehouse accounts...\n');

    // 1. Encontrar contas sem vinculações
    const accountsWithoutLinks = await pool.query(`
      SELECT uwa.id, uwa.user_id, uwa.provider_key, uwa.display_name, uwa.status
      FROM user_warehouse_accounts uwa
      WHERE uwa.provider_key = 'european_fulfillment'
      AND NOT EXISTS (
        SELECT 1 FROM user_warehouse_account_operations uwao
        WHERE uwao.account_id = uwa.id
      )
    `);

    console.log(`📦 Encontradas ${accountsWithoutLinks.rows.length} conta(s) sem vinculações\n`);

    for (const account of accountsWithoutLinks.rows) {
      console.log(`   📋 Processando conta: ${account.display_name} (${account.id})`);
      console.log(`      User ID: ${account.user_id}`);
      console.log(`      Status atual: ${account.status}\n`);

      // 2. Encontrar operações do usuário
      const userOperations = await pool.query(`
        SELECT DISTINCT o.id, o.name
        FROM operations o
        INNER JOIN user_operation_access uoa ON o.id = uoa.operation_id
        WHERE uoa.user_id = $1
        ORDER BY o.name
      `, [account.user_id]);

      console.log(`      🔍 Encontradas ${userOperations.rows.length} operação(ões) do usuário:`);
      for (const op of userOperations.rows) {
        console.log(`         - ${op.name} (${op.id})`);
      }
      console.log('');

      if (userOperations.rows.length === 0) {
        console.log(`      ⚠️  Usuário não tem operações! Pulando...\n`);
        continue;
      }

      // 3. Vincular conta a todas as operações do usuário
      console.log(`      🔗 Vinculando conta às operações...`);
      
      for (const operation of userOperations.rows) {
        try {
          // Verificar se já existe
          const existing = await pool.query(`
            SELECT id FROM user_warehouse_account_operations
            WHERE account_id = $1 AND operation_id = $2
          `, [account.id, operation.id]);

          if (existing.rows.length > 0) {
            console.log(`         ✅ Já vinculada à operação ${operation.name}`);
          } else {
            await pool.query(`
              INSERT INTO user_warehouse_account_operations (account_id, operation_id, is_default)
              VALUES ($1, $2, $3)
            `, [
              account.id, 
              operation.id, 
              userOperations.rows.length === 1 // isDefault = true se só tem uma operação
            ]);
            console.log(`         ✅ Vinculada à operação ${operation.name}`);
          }
        } catch (error) {
          console.error(`         ❌ Erro ao vincular à operação ${operation.name}:`, error.message);
        }
      }

      // 4. Atualizar status da conta para 'active' se estava 'pending'
      if (account.status === 'pending') {
        console.log(`      🔄 Atualizando status de 'pending' para 'active'...`);
        await pool.query(`
          UPDATE user_warehouse_accounts
          SET status = 'active', updated_at = NOW()
          WHERE id = $1
        `, [account.id]);
        console.log(`      ✅ Status atualizado para 'active'\n`);
      } else {
        console.log('');
      }
    }

    console.log('✅ Correção concluída!\n');
    console.log('🔄 Agora você pode executar o sync completo novamente para processar os pedidos.\n');

  } catch (error) {
    console.error('❌ Erro ao corrigir vinculações:', error);
  } finally {
    await pool.end();
  }
}

fixWarehouseLinking();

