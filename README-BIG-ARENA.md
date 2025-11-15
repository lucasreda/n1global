# 🚚 Integração Big Arena

Este documento descreve como a integração com a transportadora **Big Arena** foi implementada e como utilizá-la durante o desenvolvimento e suporte.

## 🧩 Visão Geral

- A integração segue o mesmo padrão dos demais armazéns (FHB, European, eLogy).
- Configurações específicas são armazenadas nas tabelas `big_arena_warehouse_accounts`, com credenciais derivadas do cadastro do usuário.
- Novas tabelas de _staging_ foram criadas para armazenar snapshots vindos da API:
  - `big_arena_orders`
  - `big_arena_order_returns`
  - `big_arena_products`
  - `big_arena_product_variants`
  - `big_arena_shipments`
  - `big_arena_warehouses`
  - `big_arena_couriers`
  - `big_arena_courier_nomenclatures`
- O worker `big-arena-sync-worker` consulta periodicamente a API, normaliza os dados e faz _upsert_ nessas tabelas.
- O `staging-sync-service` agora processa pedidos da Big Arena para atualizar o status dos pedidos oficiais (`orders`).

## ⚙️ Configuração

1. Acesse **Configurações → Armazéns** e adicione uma conta Big Arena.
2. Informe:
   - `API Token` obrigatório (obtido com o suporte da Big Arena).
   - `Domínio` opcional (use apenas se sua conta possuir endpoint dedicado. Exemplo: `api.minhaempresa.bigarena.com`).
3. Após salvar, o worker automático começa a buscar dados em até 10 minutos.

## 🔄 Sincronização

- **Automática**: o worker `startBigArenaSyncWorker` roda a cada 10 minutos e persiste pedidos, retornos, produtos, variantes, remessas e metadados.
- **Manual**: via rota `POST /api/user/warehouse-accounts/:id/force-sync`. O retorno traz estatísticas de quantos registros foram sincronizados.
- **Staging → Orders**: `performStagingSync` e `startStagingSyncWorker` passaram a contemplar pedidos da Big Arena.

## 🧪 Testes

- Foram adicionados testes unitários em `server/services/__tests__/staging-sync-service.test.ts` para garantir o mapeamento de status Big Arena → interno.
- Execute testes com `npx jest server/services/__tests__/staging-sync-service.test.ts` (ou `npx jest` para toda a suíte).
- Para validar a sincronização manualmente:
  ```bash
  # Força sincronização para uma conta específica
  curl -X POST "http://localhost:5001/api/user/warehouse-accounts/<ACCOUNT_ID>/force-sync" \
    -H "Authorization: Bearer <TOKEN>"
  ```

## 📈 Observabilidade

- Logs do worker: procurar por `Big Arena sync` no console/CloudWatch.
- Tabelas de staging permitem auditoria completa antes de o dado ser vinculado ao pedido final.
- Campos `metadata` armazenam o último snapshot de contagens para facilitar debug.

## 🧭 Próximos Passos

- Incluir dashboard específico exibindo status Big Arena (baseado nas novas tabelas).
- Expandir mapeamento para `order_returns` e `shipments`, atualizando automaticamente o status de pedidos.
- Adicionar alertas quando uma execução retornar `stats.orders = 0` por tempo prolongado (verificar credenciais/token).

Se algo fugir do comportamento esperado, revise as tabelas de staging, execute o `force-sync` manual e consulte os logs. Entre em contato com o time de logística caso o token/domínio não estejam retornando dados.

