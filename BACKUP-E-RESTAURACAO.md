# Backup e Restauração

## O que precisa de backup

1. **Banco de dados** (produtos, pedidos, clientes, mensagens, configurações
   — tudo que está no Supabase/Postgres).
2. **Imagens** (produtos, categorias, banners, logo — armazenadas no
   Supabase Storage).
3. **Configurações/variáveis de ambiente** (a lista de variáveis em si, não
   os valores secretos — guarde os valores secretos em um gerenciador de
   senhas, nunca em texto simples).
4. **Código-fonte** — já versionado no Git; garanta que o repositório remoto
   (GitHub) está sempre atualizado com `git push`.

## Backup do banco de dados

O Supabase já mantém backups automáticos diários nos planos pagos (verifique
o plano do seu projeto em **Project Settings → Add-ons → Backups**). Para um
backup manual adicional:

```bash
npx supabase db dump --db-url "SUA_CONNECTION_STRING" -f backup-$(date +%Y%m%d).sql
```

A "connection string" fica em **Project Settings → Database → Connection
string** no painel Supabase. Guarde o arquivo `.sql` gerado em um local
seguro (fora do computador de trabalho — um serviço de armazenamento em
nuvem privado, por exemplo).

## Backup das imagens

No painel Supabase: **Storage**, baixe os buckets (`produtos`, `categorias`,
`banners`, `logos`, `paginas`) periodicamente, ou use a CLI:

```bash
npx supabase storage cp --recursive supabase://produtos ./backup-imagens/produtos
```

## Frequência recomendada

| Dado | Frequência mínima |
| --- | --- |
| Banco de dados | Diária (automática, se o plano Supabase incluir) |
| Imagens | Semanal, ou sempre que houver upload em massa |
| Confirmação de que o backup funciona | Mensal |

## Como restaurar um backup do banco

1. Crie um novo projeto Supabase (ou use um projeto de teste — **nunca
   restaure por cima do projeto de produção sem ter certeza**).
2. Rode o SQL do backup no **SQL Editor** do novo projeto, ou:
   ```bash
   psql "SUA_CONNECTION_STRING_DE_DESTINO" -f backup-20260101.sql
   ```
3. Confirme no **Table Editor** que as tabelas principais (`profiles`,
   `products`, `orders`) têm os dados esperados.

## Como testar um backup (sem arriscar os dados reais)

1. Crie um projeto Supabase **separado**, só para teste de restauração.
2. Restaure o backup mais recente nesse projeto de teste (passo acima).
3. Aponte um `.env.local` local para esse projeto de teste e rode
   `npm run dev` — confirme que a loja abre, produtos aparecem e o login
   funciona.
4. Apague o projeto de teste depois de confirmar.

Fazer esse teste periodicamente (recomendado: a cada backup mensal) é a
única forma de saber, com certeza, que um backup realmente serve para
recuperar a loja em uma emergência.

## Em caso de incidente

1. Não entre em pânico e não apague nada antes de entender o que aconteceu.
2. Ative o modo de manutenção (`/admin/configuracoes` → aba "Manutenção")
   para impedir novos pedidos enquanto investiga — os webhooks do Stripe
   continuam funcionando mesmo com a manutenção ativa, então pagamentos já
   iniciados não se perdem.
3. Restaure o backup mais recente seguindo os passos acima, em um projeto
   separado primeiro, para confirmar que os dados estão íntegros antes de
   apontar a loja de produção para ele.
