#!/usr/bin/env node

/**
 * Script administrativo para criar usuários especiais em produção
 * USO: node scripts/create-admin-users.js
 */

const { Pool } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

// Configuração do banco de dados
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// Usuários a serem criados
const ADMIN_USERS = [
  {
    name: 'Super Administrador',
    email: 'admin@codashboard.com',
    password: 'AdminCOD2025!@#',
    role: 'super_admin'
  },
  {
    name: 'Fornecedor Principal',
    email: 'supplier@codashboard.com', 
    password: 'SupplierCOD2025!@#',
    role: 'supplier'
  },
  {
    name: 'Admin Financeiro',
    email: 'finance@codashboard.com', 
    password: 'FinanceCOD2025!@#',
    role: 'admin_financeiro'
  }
];

async function createAdminUsers() {
  console.log('🚀 Iniciando criação de usuários administrativos...');
  
  try {
    // Verificar conexão com banco
    await pool.query('SELECT NOW()');
    console.log('✅ Conexão com banco estabelecida');

    for (const userData of ADMIN_USERS) {
      console.log(`\n👤 Processando usuário: ${userData.email}`);

      // Verificar se usuário já existe
      const existingUser = await pool.query(
        'SELECT id, email FROM users WHERE email = $1',
        [userData.email]
      );

      if (existingUser.rows.length > 0) {
        console.log(`⚠️  Usuário ${userData.email} já existe - pulando`);
        continue;
      }

      // Gerar hash da senha
      const passwordHash = await bcrypt.hash(userData.password, 12);
      const userId = randomUUID();

      // Criar usuário
      const result = await pool.query(`
        INSERT INTO users (id, name, email, password, role, onboarding_completed, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id, email, role
      `, [
        userId,
        userData.name,
        userData.email,
        passwordHash,
        userData.role,
        true
      ]);

      const createdUser = result.rows[0];
      console.log(`✅ Usuário criado com sucesso:`);
      console.log(`   - ID: ${createdUser.id}`);
      console.log(`   - Email: ${createdUser.email}`);
      console.log(`   - Role: ${createdUser.role}`);
      console.log(`   - Senha: ${userData.password}`);
    }

    console.log('\n🎉 Criação de usuários administrativos concluída!');
    
    // Exibir resumo
    console.log('\n📋 CREDENCIAIS DE ACESSO:');
    console.log('=' .repeat(50));
    ADMIN_USERS.forEach(user => {
      console.log(`${user.role.toUpperCase()}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Senha: ${user.password}`);
      console.log('');
    });
    console.log('⚠️  IMPORTANTE: Guarde estas credenciais em local seguro!');
    
  } catch (error) {
    console.error('❌ Erro durante criação de usuários:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Verificações de segurança
function runSecurityChecks() {
  console.log('🔒 Executando verificações de segurança...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não configurada');
    process.exit(1);
  }
  
  if (!process.env.DATABASE_URL.includes('prod') && !process.env.DATABASE_URL.includes('neon')) {
    console.warn('⚠️  Parece que não está executando em produção');
  }
  
  console.log('✅ Verificações de segurança aprovadas');
}

// Função principal
async function main() {
  console.log('🏭 Script de Criação de Usuários Administrativos');
  console.log('===============================================\n');
  
  runSecurityChecks();
  await createAdminUsers();
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createAdminUsers };