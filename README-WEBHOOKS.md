# 🔔 Guia de Webhooks e Sincronização Automática

## 📋 Visão Geral

O sistema de sincronização automática usa uma abordagem híbrida:

1. **Webhooks** (tempo real) - quando há URL pública disponível
2. **Polling Inteligente** (fallback automático) - quando não há URL pública

## 🚀 Para Desenvolvimento Local

### Opção 1: Usar ngrok (Recomendado para testar webhooks)

1. **Instalar ngrok:**
   ```bash
   # macOS
   brew install ngrok
   
   # Ou baixar de https://ngrok.com/download
   ```

2. **Iniciar ngrok em um terminal separado:**
   ```bash
   ngrok http 5001
   ```

3. **Copiar a URL HTTPS** do ngrok (ex: `https://abc123.ngrok-free.app`)

4. **Configurar no `.env`:**
   ```bash
   PUBLIC_URL=https://abc123.ngrok-free.app
   ```

5. **Reiniciar o servidor:**
   ```bash
   npm run dev
   ```

6. **Verificar nos logs:**
   - Deve aparecer: `✅ Webhooks Shopify configurados automaticamente`
   - Deve aparecer: `✅ Webhook CartPanda configurado automaticamente`

### Opção 2: Usar apenas Polling (Padrão em desenvolvimento)

Se você **não** configurar `PUBLIC_URL` ou `REPLIT_DEV_DOMAIN`, o sistema automaticamente:

- ⚠️ Desabilita webhooks
- ✅ Usa polling inteligente como fallback
- ℹ️ Mostra mensagem: `Webhooks não configurados - usando polling inteligente como fallback`

**Frequência do polling:**
- **5 minutos** durante horário comercial (8h-20h UTC)
- **15 minutos** fora do horário comercial

## 🏭 Para Produção

Configure a variável de ambiente apropriada:

```bash
# Se usando Replit
REPLIT_DEV_DOMAIN=seu-projeto.replit.dev

# Ou use PUBLIC_URL
PUBLIC_URL=https://seu-dominio.com
```

## 🧪 Testando

### 1. Verificar se webhooks foram configurados:

Execute o script de teste:
```bash
node scripts/test-sync-system.js
```

### 2. Testar webhook manualmente:

**Com ngrok configurado:**

1. Crie um pedido de teste na Shopify
2. Verifique os logs do servidor:
   ```
   📦 [WEBHOOK] orders/create de sua-loja.myshopify.com
   ✅ Pedido processado via webhook: #XXXX
   ```

### 3. Verificar polling:

Aguarde 5-15 minutos (dependendo do horário) e verifique os logs:

```
🔍 [SHOPIFY POLLING] Buscando novos pedidos para operação...
📦 [SHOPIFY POLLING] Encontrados X pedidos novos/modificados...
✅ [SHOPIFY POLLING] Processados X pedidos para operação...
```

## 📊 Fluxo Completo

### Com Webhooks Configurados:
1. Novo pedido criado na Shopify → Webhook dispara → Processa imediatamente → Staging sync automático → Dashboard atualizado

### Sem Webhooks (Apenas Polling):
1. Novo pedido criado na Shopify → Polling detecta (5-15 min) → Processa → Staging sync automático → Dashboard atualizado

## ⚙️ Workers Automáticos

O sistema possui 3 workers rodando automaticamente:

1. **Shopify Polling Worker** - Verifica novos pedidos (5-15 min)
2. **CartPanda Polling Worker** - Verifica novos pedidos (5-15 min)
3. **Staging Sync Worker** - Processa staging tables (a cada 3 minutos)

Todos são iniciados automaticamente quando o servidor inicia.

## 🔧 Troubleshooting

### Webhooks não estão funcionando:
- ✅ Verifique se `PUBLIC_URL` ou `REPLIT_DEV_DOMAIN` está configurado
- ✅ Verifique se a URL é acessível publicamente (não localhost)
- ✅ Verifique se ngrok está rodando (se usando ngrok)
- ℹ️ O sistema usará polling como fallback se webhooks falharem

### Polling não está funcionando:
- ✅ Verifique se há integrações Shopify/CartPanda ativas
- ✅ Verifique os logs para erros de API
- ✅ Verifique se os workers iniciaram (procure nos logs ao iniciar servidor)

## 📝 Notas Importantes

- **Webhooks são opcionais** - o sistema funciona apenas com polling
- **Polling é automático** - sempre ativo como fallback
- **Em produção**, configure URL pública para usar webhooks (tempo real)
- **Em desenvolvimento**, polling funciona perfeitamente sem configuração adicional

