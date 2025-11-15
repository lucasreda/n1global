import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  console.log('🔧 Criando trigger para proteger status de pedidos entregues da transportadora...\n');
  
  const sql = `
    -- Trigger para proteger status quando carrier_imported = true
    CREATE OR REPLACE FUNCTION protect_carrier_status()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Se o pedido já tem carrier_imported = true E o novo status não é 'delivered'
      -- E o status atual é 'delivered', manter 'delivered'
      IF OLD.carrier_imported = true 
         AND NEW.status != 'delivered' 
         AND OLD.status = 'delivered' THEN
        NEW.status := OLD.status;
        RAISE NOTICE 'Protected carrier status: keeping delivered status for order %', NEW.id;
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Remover trigger antigo se existir
    DROP TRIGGER IF EXISTS protect_carrier_status_trigger ON orders;

    -- Criar trigger
    CREATE TRIGGER protect_carrier_status_trigger
      BEFORE UPDATE ON orders
      FOR EACH ROW
      WHEN (OLD.carrier_imported = true AND OLD.status = 'delivered')
      EXECUTE FUNCTION protect_carrier_status();
  `;
  
  try {
    await pool.query(sql);
    console.log('✅ Trigger criado com sucesso!');
    console.log('🔒 O status "delivered" agora está protegido para pedidos com carrier_imported = true');
  } catch (error) {
    console.error('❌ Erro ao criar trigger:', error);
  }
  
  await pool.end();
})();

