#!/bin/bash

# Script para criar usuários administrativos via API
# Execute este comando no terminal da produção

echo "🔧 Criando usuários administrativos..."

# URL da sua aplicação em produção - substitua pela URL real
PROD_URL="https://seu-app.replit.app"

# Fazer a chamada para criar os usuários
curl -X POST "$PROD_URL/api/admin/create-system-users" \
  -H "Content-Type: application/json" \
  -d '{
    "securityKey": "CREATE_ADMIN_USERS_2025_SECURE"
  }' \
  | jq '.'

echo "✅ Script concluído! Verifique a resposta acima."