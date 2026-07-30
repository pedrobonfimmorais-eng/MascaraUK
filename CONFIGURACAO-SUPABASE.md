# Configuração do Supabase

O Supabase fornece o banco de dados (PostgreSQL), a autenticação de usuários
e o armazenamento de imagens usados por toda a loja.

## 1. Criar o projeto

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita.
2. Clique em "New Project".
3. Escolha um nome (ex.: `mascarauk`), uma senha forte para o banco (guarde-a
   em um lugar seguro — você pode precisar dela para conexões diretas) e a
   região mais próxima dos seus clientes.
4. Aguarde alguns minutos até o projeto ficar pronto (status "Active").

## 2. Copiar as chaves da API

No painel do projeto, vá em **Project Settings → API**:

| Variável no `.env.local` | Onde encontrar |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Campo "Project URL" |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Campo "anon public" em "Project API keys" |
| `SUPABASE_SERVICE_ROLE_KEY` | Campo "service_role" (clique em "Reveal") |

A chave `service_role` ignora todas as regras de segurança do banco (RLS) —
**nunca** cole ela em código que roda no navegador, nem em nenhum arquivo que
vá para o Git. Ela só deve existir em `.env.local` (ou nas variáveis de
ambiente do seu provedor de hospedagem).

## 3. Rodar as migrações (criar as tabelas)

As migrações ficam em `supabase/migrations/`, numeradas na ordem em que
devem ser executadas. Você tem duas formas de rodá-las:

### Opção A — pelo painel (mais simples para quem não usa o Supabase CLI)

1. No painel do projeto, abra **SQL Editor**.
2. Abra o arquivo `supabase/migrations/0001_init.sql` no seu computador,
   copie todo o conteúdo, cole no SQL Editor e clique em "Run".
3. Repita o mesmo processo, **na ordem**, para:
   `0002_catalog_and_cart.sql`, `0003_orders_payments_stripe.sql`,
   `0004_analytics_reports.sql`, `0005_security_rbac.sql` e
   `0006_legal_content.sql`.
4. (Opcional) Rode também `supabase/seed.sql` para ver produtos de exemplo
   reais no banco, úteis só para testar — apague-os antes de lançar a loja
   de verdade.

### Opção B — pelo Supabase CLI

```bash
npx supabase login
npx supabase link --project-ref SEU-PROJECT-REF
npx supabase db push
```

O "Project ref" fica na URL do painel (`https://supabase.com/dashboard/project/SEU-PROJECT-REF`).

## 4. Confirmar que deu certo

No painel, abra **Table Editor** e confirme que aparecem tabelas como
`profiles`, `products`, `orders`, `store_settings`, `messages` e
`admin_logs`. Se alguma migração falhar com erro de "already exists", é
sinal de que ela já tinha sido rodada antes — pode seguir para a próxima.

## 5. Regenerar os tipos TypeScript (opcional, para quem for alterar o schema)

```bash
npx supabase gen types typescript --project-id SEU-PROJECT-REF > src/types/database.ts
```

Isso substitui o arquivo `src/types/database.ts` por uma versão gerada
automaticamente a partir do schema real do banco — útil depois de criar
migrações novas.

## Personalização de e-mails de autenticação

Os e-mails de "confirme seu cadastro" e "recuperar senha" são enviados
diretamente pelo Supabase Auth (não pelo Resend). Para personalizar o texto
deles: **Authentication → Email Templates**, no painel do projeto.

## Ambientes separados (desenvolvimento e produção)

Para nunca misturar dados de teste com pedidos reais, crie **dois projetos
Supabase separados** — um para desenvolvimento/teste e outro para produção —
cada um com seu próprio `.env.local`/variáveis de ambiente. Rode as mesmas
migrações nos dois.
