-- Adicionar campos de identificação de plataformas de e-commerce à tabela orders
-- Permite rastrear pedidos originados de CartPanda e Digistore24

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cartpanda_order_id TEXT,
ADD COLUMN IF NOT EXISTS digistore_order_id TEXT,
ADD COLUMN IF NOT EXISTS digistore_transaction_id TEXT;

-- Adicionar comentários para documentação
COMMENT ON COLUMN orders.cartpanda_order_id IS 'ID original do pedido no CartPanda';
COMMENT ON COLUMN orders.digistore_order_id IS 'delivery_id da Digistore24';
COMMENT ON COLUMN orders.digistore_transaction_id IS 'transaction_id (purchase_id) da Digistore24';

-- Criar índices para melhorar performance de busca
CREATE INDEX IF NOT EXISTS idx_orders_cartpanda_order_id ON orders(cartpanda_order_id) WHERE cartpanda_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_digistore_order_id ON orders(digistore_order_id) WHERE digistore_order_id IS NOT NULL;

