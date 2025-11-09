#!/bin/bash
# Script para aplicar migração de plataformas no banco de dados

echo "🔄 Aplicando migração de campos de plataformas..."

# Executar SQL diretamente
psql $DATABASE_URL << 'EOF'
-- Adicionar campos de identificação de plataformas de e-commerce à tabela orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cartpanda_order_id TEXT,
ADD COLUMN IF NOT EXISTS digistore_order_id TEXT,
ADD COLUMN IF NOT EXISTS digistore_transaction_id TEXT;

-- Criar índices para melhorar performance de busca
CREATE INDEX IF NOT EXISTS idx_orders_cartpanda_order_id ON orders(cartpanda_order_id) WHERE cartpanda_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_digistore_order_id ON orders(digistore_order_id) WHERE digistore_order_id IS NOT NULL;

-- Verificar colunas criadas
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('cartpanda_order_id', 'digistore_order_id', 'digistore_transaction_id')
ORDER BY column_name;
EOF

echo "✅ Migração aplicada com sucesso!"

