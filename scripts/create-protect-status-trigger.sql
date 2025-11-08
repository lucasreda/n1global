-- Trigger para proteger status quando carrier_imported = true
-- Este trigger previne que o status seja sobrescrito quando o pedido foi importado da transportadora

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

