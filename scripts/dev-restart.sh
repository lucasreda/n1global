#!/bin/bash
# Script para reiniciar o servidor de desenvolvimento

echo "🔄 Reiniciando servidor de desenvolvimento..."
echo ""

# Parar processos existentes
echo "⏹️  Parando processos existentes..."
pkill -f "tsx.*server" 2>/dev/null
sleep 2

# Verificar se ainda há processos
if ps aux | grep -q "[t]sx.*server"; then
    echo "⚠️  Ainda há processos rodando. Forçando parada..."
    pkill -9 -f "tsx.*server" 2>/dev/null
    sleep 1
fi

# Limpar porta se necessário
if lsof -i :5001 > /dev/null 2>&1; then
    echo "🧹 Liberando porta 5001..."
    lsof -ti :5001 | xargs kill -9 2>/dev/null
    sleep 1
fi

echo "✅ Processos parados"
echo ""
echo "🚀 Iniciando servidor..."
echo ""

cd "$(dirname "$0")/.." || exit 1

# Iniciar servidor
npm run dev > /tmp/server.log 2>&1 &
DEV_PID=$!

echo "✅ Servidor iniciado (PID: $DEV_PID)"
echo "📍 URL: http://localhost:5001"
echo "📋 Logs: tail -f /tmp/server.log"
echo ""
echo "💡 Aguarde alguns segundos para o servidor iniciar completamente..."

