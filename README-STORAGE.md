# Cloudflare R2 Storage Setup

Este projeto utiliza o Cloudflare R2 como storage S3-compatível para avatares, imagens do page builder, anexos de suporte e demais uploads. Configure as variáveis abaixo em **todos os ambientes** (Railway, `.env.local`, etc.).

## Variáveis Obrigatórias

| Variável              | Descrição                                                                 |
|-----------------------|---------------------------------------------------------------------------|
| `R2_ENDPOINT`         | Endpoint S3 do R2 (ex.: `https://<accountid>.r2.cloudflarestorage.com`)   |
| `R2_REGION`           | Região do bucket. Para R2 use `"auto"` (ou deixe ausente para usar `auto`)|
| `R2_ACCESS_KEY`       | Access Key ID gerada no painel do R2                                      |
| `R2_SECRET_KEY`       | Secret Access Key correspondente                                         |
| `R2_BUCKET_PRIVATE`   | Nome do bucket privado (ex.: `n1-private`)                                |

## Variáveis Opcionais

| Variável              | Descrição                                                                 |
|-----------------------|---------------------------------------------------------------------------|
| `R2_BUCKET_PUBLIC`    | Bucket público (ex.: `n1-public`) — usado para servir ativos públicos     |
| `R2_PUBLIC_BASE_URL`  | URL pública (custom domain) configurada no R2 (ex.: `https://cdn.seusite.com`) |

> ⚠️ As variáveis antigas `PUBLIC_OBJECT_SEARCH_PATHS` e `PRIVATE_OBJECT_DIR` foram removidas.

## Passo a Passo

1. **Crie os buckets** `n1-private` (privado) e opcionalmente `n1-public` no painel Cloudflare R2.
2. **Gere um API Token** com permissões de leitura/escrita para os buckets e copie `Access Key ID`/`Secret Access Key`.
3. (Opcional) Configure um domínio público para o bucket público e crie os registros DNS correspondentes.
4. Preencha as variáveis acima no Railway (prod/dev) e no `.env.local` se necessário.
5. Redeploy/restart para carregar as novas configurações.

## Funcionamento em Runtime

- Uploads diretos usam URLs assinadas (`PUT`) para o bucket privado.
- O backend converte as URLs do R2 em paths canônicos `"/objects/..."` e os serve por meio da rota `GET /objects/:path`.
- O front-end também converte automaticamente URLs antigas (Replit/GCS) para o novo formato, garantindo compatibilidade com dados já salvos.

Em caso de erro com storage, verifique primeiro se as variáveis estão corretas e se o token possui permissão para o bucket informado.***

