# Migration: Campos de Perfil do Usuário

## Aplicar Migration Manualmente

Execute os seguintes comandos SQL no seu banco de dados PostgreSQL:

```sql
-- Adicionar coluna phone
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Adicionar coluna avatar_url
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Adicionar coluna updated_at (se ainda não existir)
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
```

## Ou usar o script Node.js

Se você tiver as variáveis de ambiente configuradas (DATABASE_URL), pode executar:

```bash
node scripts/apply-user-profile-migration.js
```

## Verificar se as colunas foram adicionadas

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('phone', 'avatar_url', 'updated_at');
```


