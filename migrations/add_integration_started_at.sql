-- Adicionar campo integration_started_at nas tabelas de integração
-- Este campo marca quando a integração foi ativada pela primeira vez
-- Usado para filtrar pedidos apenas a partir da data de integração

-- Shopify Integrations
ALTER TABLE shopify_integrations 
ADD COLUMN IF NOT EXISTS integration_started_at TIMESTAMP;

-- Popular com createdAt para integrações existentes que já estão ativas
UPDATE shopify_integrations 
SET integration_started_at = created_at 
WHERE integration_started_at IS NULL AND status = 'active';

-- Para integrações pendentes, deixar NULL (será preenchido quando ativarem)

-- CartPanda Integrations
ALTER TABLE cartpanda_integrations 
ADD COLUMN IF NOT EXISTS integration_started_at TIMESTAMP;

UPDATE cartpanda_integrations 
SET integration_started_at = created_at 
WHERE integration_started_at IS NULL AND status = 'active';

-- Digistore24 Integrations
ALTER TABLE digistore_integrations 
ADD COLUMN IF NOT EXISTS integration_started_at TIMESTAMP;

UPDATE digistore_integrations 
SET integration_started_at = created_at 
WHERE integration_started_at IS NULL AND status = 'active';

