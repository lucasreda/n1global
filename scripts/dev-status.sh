#!/bin/bash
# Script para verificar o status do desenvolvimento

echo "=== 🚀 STATUS DO PROJETO N1GLOBAL ==="
echo ""

# Verificar se o servidor está rodando
if ps aux | grep -q "[t]sx.*server"; then
    PID=$(ps aux | grep "[t]sx.*server" | grep -v grep | awk '{print $2}' | head -1)
    echo "✅ Servidor está RODANDO (PID: $PID)"
    
    # Verificar porta - tentar 5001 primeiro, depois ler do .env
    PORT="5001"
    if [ -f .env ] && grep -q "^PORT=" .env; then
        PORT=$(grep "^PORT=" .env | cut -d= -f2 | tr -d ' ')
    fi
    
    if lsof -i :$PORT > /dev/null 2>&1; then
        echo "✅ Porta $PORT está ativa"
        echo "📍 URL: http://localhost:$PORT"
        
        # Testar conexão
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT 2>/dev/null)
        if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
            echo "✅ Servidor respondendo (HTTP $HTTP_CODE)"
        else
            echo "⚠️  Servidor pode não estar respondendo corretamente (HTTP $HTTP_CODE)"
        fi
    else
        echo "⚠️  Porta $PORT não está em uso"
    fi
else
    echo "❌ Servidor NÃO está rodando"
fi

echo ""

# Verificar banco de dados
if [ -f .env ]; then
    if grep -q "DATABASE_URL" .env; then
        echo "✅ DATABASE_URL configurado no .env"
    else
        echo "❌ DATABASE_URL não encontrado no .env"
    fi
    
    if grep -q "OPENAI_API_KEY" .env; then
        echo "✅ OPENAI_API_KEY configurado no .env"
    else
        echo "⚠️  OPENAI_API_KEY não encontrado no .env"
    fi
else
    echo "❌ Arquivo .env não encontrado"
fi

echo ""

# Verificar logs recentes
if [ -f /tmp/server.log ]; then
    echo "📋 Últimas linhas dos logs:"
    tail -5 /tmp/server.log | sed 's/^/   /'
    echo ""
    echo "💡 Para ver logs em tempo real: tail -f /tmp/server.log"
else
    echo "⚠️  Arquivo de logs não encontrado em /tmp/server.log"
fi

echo ""
echo "=== ✅ Verificação completa ==="

