# 🚀 Guia de Execução - N1Global

Este guia vai te ajudar a rodar a aplicação no Windows.

## 📋 Pré-requisitos

1. **Node.js instalado** (versão 18 ou superior)
   - Verifique com: `node --version`
   - Baixe em: https://nodejs.org/

2. **Banco de dados PostgreSQL**
   - Opção 1: Neon Database (recomendado - gratuito e online)
   - Opção 2: PostgreSQL local

## 🔧 Passo 1: Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

### Variáveis Obrigatórias:

```env
# URL de conexão do banco de dados (OBRIGATÓRIO)
DATABASE_URL=postgresql://usuario:senha@host.neon.tech/database?sslmode=require

# Secret para JWT (OBRIGATÓRIO - use uma string aleatória segura)
JWT_SECRET=sua-chave-secreta-aqui-mude-para-algo-seguro

# Porta do servidor (opcional - padrão: 5000)
PORT=5000
```

### Variáveis Opcionais (para funcionalidades específicas):

```env
# Para webhooks (opcional - use ngrok para desenvolvimento local)
PUBLIC_URL=https://seu-dominio.ngrok-free.app

# Para armazenamento de arquivos (opcional)
R2_ENDPOINT=https://seu-accountid.r2.cloudflarestorage.com
R2_ACCESS_KEY=sua-access-key
R2_SECRET_KEY=sua-secret-key
R2_BUCKET_PRIVATE=n1-private

# Para serviços de voz (opcional)
OPENAI_API_KEY=sua-openai-key
TELNYX_API_KEY=sua-telnyx-key
```

## 🗄️ Passo 2: Configurar Banco de Dados

### Opção A: Neon Database (Recomendado)

1. Acesse https://neon.tech e crie uma conta
2. Crie um novo projeto
3. Copie a connection string (formato: `postgresql://usuario:senha@host.neon.tech/database?sslmode=require`)
4. Cole no arquivo `.env` como `DATABASE_URL`

### Opção B: PostgreSQL Local

1. Instale o PostgreSQL
2. Crie um banco de dados:
   ```sql
   CREATE DATABASE n1global;
   ```
3. Configure no `.env`:
   ```
   DATABASE_URL=postgresql://seu_usuario:suasenha@localhost:5432/n1global
   ```

## 📦 Passo 3: Instalar Dependências (se necessário)

Se as dependências ainda não estiverem instaladas:

```powershell
npm install
```

## 🗃️ Passo 4: Executar Migrações do Banco

Execute o comando para criar as tabelas no banco de dados:

```powershell
npm run db:push
```

## ▶️ Passo 5: Rodar a Aplicação

Execute o comando de desenvolvimento:

```powershell
npm run dev
```

A aplicação estará disponível em: **http://localhost:5000**

## ✅ Verificação

Após iniciar, você deve ver:
- ✅ Mensagem: `serving on port 5000`
- ✅ Mensagens sobre workers sendo iniciados
- ✅ Sem erros de conexão com o banco

## 🔐 Credenciais de Acesso Padrão

Após o primeiro start, o sistema cria usuários admin automaticamente:

- **Admin Principal:**
  - Email: `admin@cod-dashboard.com`
  - Senha: `admin123`

- **Super Admin:**
  - Email: `super@admin.com`
  - Senha: `password123`

## 🐛 Solução de Problemas

### Erro: "DATABASE_URL must be set"
- Verifique se o arquivo `.env` existe na raiz do projeto
- Verifique se `DATABASE_URL` está configurada corretamente

### Erro: "Port already in use"
- A porta 5000 está em uso
- Altere a porta no `.env`: `PORT=5001`
- Ou pare o processo que está usando a porta

### Erro de conexão com banco
- Verifique se a `DATABASE_URL` está correta
- Para Neon: verifique se o projeto está ativo
- Para local: verifique se o PostgreSQL está rodando

### Dependências não encontradas
```powershell
npm install
```

## 📝 Comandos Úteis

- **Rodar em desenvolvimento:** `npm run dev`
- **Rodar migrações:** `npm run db:push`
- **Verificar tipos TypeScript:** `npm run check`
- **Build para produção:** `npm run build`
- **Rodar em produção:** `npm start`

## 📚 Documentação Adicional

- `SETUP_DATABASE.md` - Guia detalhado de configuração do banco
- `DEV_COMMANDS.md` - Comandos úteis para desenvolvimento
- `README-WEBHOOKS.md` - Configuração de webhooks
- `README-STORAGE.md` - Configuração de armazenamento










