#!/bin/bash
# Script para corrigir vinculação de warehouse accounts

echo "=== 🔧 CORREÇÃO DE WAREHOUSE ACCOUNTS ==="
echo ""
echo "Este script ajuda a diagnosticar e corrigir problemas de vinculação"
echo ""

# Verificar se o servidor está rodando
if ! ps aux | grep -q "[t]sx.*server"; then
    echo "⚠️  Servidor não está rodando"
    exit 1
fi

echo "✅ Servidor está rodando"
echo ""
echo "📋 Para corrigir o problema:"
echo ""
echo "1. Verifique se a conta foi criada na tabela user_warehouse_accounts"
echo "2. Verifique se está vinculada às operações na tabela user_warehouse_account_operations"
echo "3. Verifique se o status está como 'active'"
echo ""
echo "Execute estas queries SQL no Neon dashboard:"
echo ""
echo "=========================================="
echo "Verificar conta criada:"
echo "=========================================="
echo "SELECT id, user_id, provider_key, display_name, status"
echo "FROM user_warehouse_accounts"
echo "WHERE provider_key = 'european_fulfillment'"
echo "ORDER BY created_at DESC"
echo "LIMIT 5;"
echo ""
echo "=========================================="
echo "Verificar vinculações:"
echo "=========================================="
echo "SELECT uwa.id, uwa.display_name, uwa.status,"
echo "       uwao.operation_id, o.name as operation_name"
echo "FROM user_warehouse_accounts uwa"
echo "LEFT JOIN user_warehouse_account_operations uwao ON uwa.id = uwao.account_id"
echo "LEFT JOIN operations o ON uwao.operation_id = o.id"
echo "WHERE uwa.provider_key = 'european_fulfillment'"
echo "ORDER BY uwa.created_at DESC;"
echo ""
echo "=========================================="
echo "Se a conta não está vinculada, você pode:"
echo "=========================================="
echo "1. Editar o usuário novamente e adicionar/editar a conta do warehouse"
echo "2. Ou executar manualmente via API ou SQL"
echo ""

