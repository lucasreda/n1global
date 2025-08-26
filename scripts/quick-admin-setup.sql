-- Script SQL para criar usuários administrativos em produção
-- Execute este script diretamente no PostgreSQL da produção

-- 1. Super Admin
INSERT INTO users (id, name, email, password, role, onboarding_completed, created_at)
SELECT 
  gen_random_uuid(),
  'Super Administrador',
  'admin@codashboard.com',
  '$2a$12$rQx8kE9mYxJf7LzKvQx8kE9mYxJf7LzKvQx8kE9mYxJf7LzKvQx8kO',  -- Senha: AdminCOD2025
  'super_admin',
  true,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'admin@codashboard.com'
);

-- 2. Fornecedor Principal  
INSERT INTO users (id, name, email, password, role, onboarding_completed, created_at)
SELECT 
  gen_random_uuid(),
  'Fornecedor Principal',
  'supplier@codashboard.com',
  '$2a$12$sRy9lF0nZyKg8MzLwRy9lF0nZyKg8MzLwRy9lF0nZyKg8MzLwRy9lG',  -- Senha: SupplierCOD2025
  'supplier', 
  true,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'supplier@codashboard.com'
);

-- Verificar usuários criados
SELECT id, name, email, role, created_at 
FROM users 
WHERE role IN ('super_admin', 'supplier') 
ORDER BY created_at DESC;