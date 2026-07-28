# MascaraUK

Loja virtual especializada em máscaras de heróis, personagens, anime e
quadrinhos, além de acessórios de fantasia e itens de cosplay. Este é o
projeto **base**: estrutura de páginas, banco de dados, autenticação e
organização de arquivos prontos para os próximos incrementos.

Não é uma loja de dropshipping: o administrador cadastra os produtos,
controla o estoque, recebe os pedidos e organiza os envios pelo painel
`/admin`.

## Tecnologias

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4**
- **Supabase** (banco de dados PostgreSQL, autenticação e storage)
- **Stripe** (pagamentos)

## Como rodar localmente

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie o arquivo de variáveis de ambiente e preencha com os dados do seu
   projeto Supabase e Stripe:

   ```bash
   cp .env.example .env.local
   ```

   | Variável | Onde encontrar |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Painel Supabase → Project Settings → API |
   | `SUPABASE_SERVICE_ROLE_KEY` | Painel Supabase → Project Settings → API (chave privada, nunca exponha no navegador) |
   | `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Painel Stripe → Developers → API keys |
   | `STRIPE_WEBHOOK_SECRET` | Painel Stripe → Developers → Webhooks (ou `stripe listen`) |

   O site funciona mesmo sem essas variáveis configuradas: as páginas públicas
   mostram produtos e categorias de demonstração (claramente identificados
   como "(Exemplo)"), e as áreas que exigem login (`/minha-conta`, `/admin`)
   simplesmente redirecionam para o login.

3. Crie as tabelas no seu projeto Supabase executando o SQL de
   `supabase/migrations/0001_init.sql` (SQL Editor do painel Supabase, ou via
   Supabase CLI: `supabase db push`). Opcionalmente rode também
   `supabase/seed.sql` para ver produtos de exemplo reais no banco.

4. Rode o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

   Acesse [http://localhost:3000](http://localhost:3000).

5. Para testar o Stripe localmente, use a CLI do Stripe para encaminhar
   eventos do webhook:

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

## Como criar a primeira conta de administrador

Por segurança, **não existe** opção de "criar conta de administrador" no
cadastro público — toda conta criada em `/cadastro` nasce como `cliente`, e
isso é garantido tanto na interface quanto no banco de dados (o trigger
`handle_new_user` sempre insere `role = 'cliente'`, ignorando qualquer dado
enviado pelo cliente).

Para promover uma conta a administradora:

1. Crie uma conta normalmente pela loja (`/cadastro`).
2. No painel Supabase, abra **Table Editor → profiles**, encontre a linha do
   usuário e altere a coluna `role` para `administrador`.
3. Faça login novamente — a conta agora acessa `/admin`.

## Onde encontrar cada parte do projeto

| O quê | Onde |
| --- | --- |
| Páginas da loja pública | `src/app/` (ex.: `src/app/produtos/page.tsx`, `src/app/produto/[slug]/page.tsx`) |
| Painel administrativo | `src/app/admin/` (protegido por `src/app/admin/layout.tsx` + `src/proxy.ts`) |
| Componentes reutilizáveis | `src/components/` (`ui/`, `layout/`, `product/`, `admin/`, `auth/`, `contact/`) |
| Configuração do banco de dados | `supabase/migrations/0001_init.sql` (schema completo) e `supabase/seed.sql` (dados de exemplo) |
| Clientes Supabase | `src/lib/supabase/client.ts` (navegador), `server.ts` (Server Components/Actions), `admin.ts` (service role) |
| Autenticação | `src/lib/auth.ts` (usuário atual/role), `src/lib/actions/auth.ts` (login, cadastro, recuperação de senha), `src/proxy.ts` (proteção de rotas) |
| Integração com Stripe | `src/lib/stripe/` (clientes), `src/app/api/stripe/checkout/route.ts` (cria sessão de pagamento), `src/app/api/stripe/webhook/route.ts` (confirma pagamento) |
| Textos do site (i18n) | `src/i18n/pt.ts` (idioma atual), `src/i18n/en.ts` (preparado para o futuro), `src/i18n/index.ts` (função `t()`) |
| Configurações personalizáveis pelo admin | Tabela `store_settings` no banco, lidas por `src/lib/store-settings.ts` e editadas em `/admin/configuracoes` |
| Tipos do banco de dados | `src/types/database.ts` |

## Estrutura de contas

- **Cliente**: cadastro público em `/cadastro`, acessa `/minha-conta`.
- **Administrador**: só é promovido diretamente no banco de dados (ver acima),
  acessa `/admin`. Um cliente nunca alcança `/admin`, mesmo autenticado —
  isso é verificado tanto em `src/proxy.ts` quanto novamente em
  `src/app/admin/layout.tsx`.

## Internacionalização

Todos os textos visíveis ficam centralizados em `src/i18n/pt.ts`. Para
oferecer o site em outro idioma no futuro, crie o dicionário correspondente
(o arquivo `src/i18n/en.ts` já está preparado com a mesma estrutura) e troque
`defaultLocale` em `src/i18n/types.ts` — nenhuma página precisa ser alterada.

## Próximos passos (fora do escopo desta etapa)

Esta etapa entrega a base do projeto. Ainda não implementados: lógica
completa do carrinho (adicionar/remover itens), criação de pedidos a partir
do checkout, upload de imagens de produtos, e telas de cadastro/edição no
painel administrativo (produtos, categorias, cupons, banners).
