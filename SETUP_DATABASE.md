# Guia de Configuração do Banco de Dados

## Opção 1: Neon Database (Recomendado - Gratuito)

### Passo 1: Criar conta no Neon
1. Acesse https://neon.tech
2. Faça login com GitHub ou crie uma conta

### Passo 2: Criar um novo projeto
1. No dashboard, clique em "Create Project"
2. Escolha um nome (ex: "n1global")
3. Selecione uma região próxima (ex: AWS São Paulo)
4. Clique em "Create Project"

### Passo 3: Obter a URL de conexão
1. Após criar o projeto, o Neon mostrará a connection string
2. A URL terá o formato:
   ```
   postgresql://usuario:senha@host.neon.tech/database?sslmode=require
   ```
3. Copie essa URL completa

### Passo 4: Configurar no projeto
1. Abra o arquivo `.env` na raiz do projeto
2. Cole a URL copiada na variável `DATABASE_URL`:
   ```
   DATABASE_URL=postgresql://usuario:senha@host.neon.tech/database?sslmode=require
   ```

### Passo 5: Executar migrações
Execute o comando para criar as tabelas no banco:
```bash
npm run db:push
```

### Passo 6: Rodar o projeto
```bash
npm run dev
```

---

## Opção 2: PostgreSQL Local

Se você preferir usar um PostgreSQL local:

### Instalar PostgreSQL
```bash
# macOS (com Homebrew)
brew install postgresql@14
brew services start postgresql@14

# Ou baixe do site oficial: https://www.postgresql.org/download/
```

### Criar banco de dados
```bash
# Criar banco
createdb n1global

# Ou via psql
psql -U postgres
CREATE DATABASE n1global;
\q
```

### Configurar DATABASE_URL
No arquivo `.env`:
```
DATABASE_URL=postgresql://seu_usuario:suasenha@localhost:5432/n1global
```

### Executar migrações
```bash
npm run db:push
```

### Rodar o projeto
```bash
npm run dev
```

---

## Verificação

Após configurar, o projeto deve:
1. Conectar ao banco de dados sem erros
2. Criar as tabelas automaticamente (via `db:push`)
3. Popular dados iniciais (seed automático no primeiro run)

Se houver erros, verifique:
- Se a `DATABASE_URL` está correta no `.env`
- Se o banco está acessível (para Neon, verifique se o projeto está ativo)
- Se as migrações foram executadas (`npm run db:push`)

