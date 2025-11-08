#!/bin/bash
# Script para diagnosticar problemas de warehouse accounts

echo "=== 🔍 DIAGNÓSTICO DE WAREHOUSE ACCOUNTS ==="
echo ""

# Verificar se o servidor está rodando
if ! ps aux | grep -q "[t]sx.*server"; then
    echo "⚠️  Servidor não está rodando. Execute: npm run dev"
    exit 1
fi

echo "✅ Servidor está rodando"
echo ""

echo "📊 Para verificar o estado das contas e pedidos no banco de dados,"
echo "execute esta query SQL no seu cliente PostgreSQL ou no Neon dashboard:"
echo ""
echo "=========================================="
echo "1. Verificar contas do European Fulfillment:"
echo "=========================================="
echo "SELECT id, user_id, provider_key, display_name, status, created_at"
echo "FROM user_warehouse_accounts"
echo "WHERE provider_key = 'european_fulfillment';"
echo ""
echo "=========================================="
echo "2. Verificar vinculações com operações:"
echo "=========================================="
echo "SELECT uwa.id as account_id, uwa.display_name, uwao.operation_id, o.name as operation_name"
echo "FROM user_warehouse_accounts uwa"
echo "LEFT JOIN user_warehouse_account_operations uwao ON uwa.id = uwao.account_id"
echo "LEFT JOIN operations o ON uwao.operation_id = o.id"
echo "WHERE uwa.provider_key = 'european_fulfillment';"
echo ""
echo "=========================================="
echo "3. Verificar pedidos na staging table:"
echo "=========================================="
echo "SELECT COUNT(*) as total,"
echo "       COUNT(*) FILTER (WHERE processed_to_orders = false) as unprocessed"
echo "FROM european_fulfillment_orders;"
echo ""
echo "=========================================="
echo "4. Verificar pedidos processados:"
echo "=========================================="
echo "SELECT status, COUNT(*) as count"
echo "FROM orders"
echo "WHERE carrier_imported = true AND provider = 'european_fulfillment'"
echo "GROUP BY status;"
echo ""
echo "=========================================="
echo "5. Verificar pedidos da Shopify:"
echo "=========================================="
echo "SELECT status, COUNT(*) as count"
echo "FROM orders"
echo "WHERE shopify_order_number IS NOT NULL"
echo "GROUP BY status;"
echo ""
echo "💡 Use essas queries para diagnosticar o problema!"

