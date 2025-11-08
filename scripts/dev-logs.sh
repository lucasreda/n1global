#!/bin/bash
# Script para visualizar logs do servidor em tempo real

# Tentar encontrar o arquivo de log automaticamente
if [ -f "/tmp/n1global-server.log" ]; then
    LOG_FILE="/tmp/n1global-server.log"
elif [ -f "/tmp/server.log" ]; then
    LOG_FILE="/tmp/server.log"
else
    LOG_FILE="${1:-/tmp/n1global-server.log}"
fi

echo "📋 Visualizando logs do servidor em tempo real"
echo "📁 Arquivo: $LOG_FILE"
echo "💡 Para sair, pressione Ctrl+C"
echo ""

if [ -f "$LOG_FILE" ]; then
    tail -f "$LOG_FILE"
else
    echo "❌ Arquivo de log não encontrado: $LOG_FILE"
    echo ""
    echo "🔍 Verificando processos do servidor..."
    ps aux | grep -E "tsx|npm run dev" | grep -v grep || echo "   Nenhum processo encontrado"
    echo ""
    echo "💡 Inicie o servidor com: npm run dev"
    exit 1
fi
