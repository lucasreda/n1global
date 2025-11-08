# Como Testar a Sincronização do Zero

## Problema

Os workers automáticos já processam todos os pedidos, então quando você clica em "Sync Completo", não há mais pedidos para processar e o matching não é executado.

## Solução

Use o script `test-sync-reset.ts` para resetar alguns pedidos já processados, permitindo testar a sincronização do zero.

## Como Usar

### 1. Identificar seu User ID

No terminal do servidor, procure por logs como:
```
✅ JWT verified for user: lucasreda@gmail.com
🔍 Store context for user b206f1ca-b7ae-4bd8-842e-8a968b32c2b7
```

O User ID é `b206f1ca-b7ae-4bd8-842e-8a968b32c2b7`

### 2. Executar o Script de Reset

```bash
npm run test:reset-sync <userId> [limit]
```

**Exemplo:**
```bash
npm run test:reset-sync b206f1ca-b7ae-4bd8-842e-8a968b32c2b7 10
```

Isso vai resetar **10 pedidos** da transportadora que já foram processados.

### 3. Verificar os Logs

O script vai mostrar:
- ✅ Quantos pedidos foram resetados
- 📊 Estatísticas antes e depois do reset
- 💡 Instruções para testar

### 4. Testar a Sincronização

1. Acesse o dashboard em `http://localhost:5001`
2. Clique em **"Sync Completo"**
3. Observe o modal mostrar o progresso do matching
4. Verifique os logs no terminal para ver:
   - `📊 [countUnprocessedOrders]` - Quantos pedidos não processados existem
   - `🔄 [STAGING SYNC]` - Processamento iniciando
   - `✅ [EF MATCH]` - Pedidos sendo matchados com sucesso

## Exemplo de Saída do Script

```
🔄 Resetando até 10 pedidos da transportadora para user b206f1ca-b7ae-4bd8-842e-8a968b32c2b7...

✅ Conta encontrada: 932839f6-c7df-4cb5-956e-26090ad32d35

📊 Estatísticas ANTES do reset:
   Não processados: 0
   Processados: 343
   Total: 343

✅ European Fulfillment: 10 pedido(s) resetado(s)
   Pedidos: LI-479851, LI-492621, ...

📊 Estatísticas APÓS o reset:
   Não processados: 10
   Total: 343

✅ Pronto! Agora você pode testar a sincronização do zero.

💡 Execute "Sync Completo" no dashboard para processar esses 10 pedido(s).
```

## Troubleshooting

### Erro: "Nenhuma conta de warehouse ativa encontrada"

Verifique se você tem uma conta de European Fulfillment configurada no dashboard.

### Nenhum pedido foi resetado

Todos os pedidos podem ter `failedMatch = true`. O script também remove esse flag, mas você pode precisar resetar manualmente no banco.

## Limpar Todos os Pedidos (Atenção!)

Se quiser resetar TODOS os pedidos (não recomendado em produção):

```bash
npm run test:reset-sync b206f1ca-b7ae-4bd8-842e-8a968b32c2b7 1000
```
