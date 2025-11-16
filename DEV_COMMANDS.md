# 🚀 Comandos de Desenvolvimento - N1Global

Este documento contém os comandos úteis para desenvolvimento e verificação do projeto.

## 📋 Scripts Rápidos

### Verificar Status do Servidor
```bash
./scripts/dev-status.sh
```
Mostra:
- ✅ Se o servidor está rodando
- 📍 Porta e URL de acesso
- ✅ Status da conexão HTTP
- ✅ Configurações do .env
- 📋 Últimos logs

### Ver Logs em Tempo Real
```bash
./scripts/dev-logs.sh
```
ou
```bash
tail -f /tmp/server.log
```

### Reiniciar Servidor
```bash
./scripts/dev-restart.sh
```
Para o servidor atual e reinicia automaticamente.

## 🛠️ Comandos Manuais

### Iniciar Servidor
```bash
npm run dev
```

### Iniciar Servidor em Background (com logs)
```bash
npm run dev > /tmp/server.log 2>&1 &
```

### Verificar se Servidor Está Rodando
```bash
ps aux | grep "[t]sx.*server"
```

### Verificar Porta
```bash
lsof -i :5001
```

### Parar Servidor
```bash
pkill -f "tsx.*server"
```

### Testar Conexão HTTP
```bash
curl http://localhost:5001
```

## 🔍 Verificações Rápidas

### Status Completo (tudo de uma vez)
```bash
./scripts/dev-status.sh
```

### Últimas Linhas de Log
```bash
tail -20 /tmp/server.log
```

### Logs de Erro
```bash
grep -i error /tmp/server.log | tail -20
```

### Logs de Acesso HTTP
```bash
grep "GET\|POST\|PUT\|DELETE" /tmp/server.log | tail -20
```

## 🔐 Credenciais de Acesso

### Admin Principal
- **Email:** `admin@cod-dashboard.com`
- **Senha:** `admin123`

### Super Admin
- **Email:** `super@admin.com`
- **Senha:** `password123`

## 📊 Informações do Projeto

- **Porta padrão:** 5001 (verificar no .env)
- **URL de acesso:** http://localhost:5001
- **Arquivo de logs:** /tmp/server.log
- **Configurações:** `.env` na raiz do projeto

## 🔧 Troubleshooting

### Servidor não inicia
1. Verificar se porta está livre: `lsof -i :5001`
2. Verificar .env: `cat .env | grep DATABASE_URL`
3. Ver logs: `tail -50 /tmp/server.log`

### Porta já em uso
```bash
lsof -ti :5001 | xargs kill -9
```

### Banco de dados não conecta
1. Verificar DATABASE_URL no .env
2. Testar conexão no Neon dashboard
3. Executar migrações: `npm run db:push`

