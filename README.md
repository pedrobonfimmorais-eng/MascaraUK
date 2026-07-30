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
   | `RESEND_API_KEY` / `EMAIL_FROM` | Painel [Resend](https://resend.com) → API Keys. Sem a chave, os e-mails de pedido só são registrados no log do servidor (não são enviados de verdade) |
   | `ADMIN_NOTIFICATION_EMAIL` | E-mail interno que recebe o aviso de "novo pedido pago" |

   O site funciona mesmo sem essas variáveis configuradas: as páginas públicas
   mostram produtos e categorias de demonstração (claramente identificados
   como "(Exemplo)"), e as áreas que exigem login (`/minha-conta`, `/admin`)
   simplesmente redirecionam para o login.

3. Crie as tabelas no seu projeto Supabase executando, **em ordem**, o SQL de
   `supabase/migrations/0001_init.sql`, `0002_catalog_and_cart.sql` e
   `0003_orders_payments_stripe.sql` (SQL Editor do painel Supabase, ou via
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

## Login, checkout, pagamentos e pedidos (Prompt 4)

### Como testar o pagamento localmente

1. Preencha `STRIPE_SECRET_KEY` e `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` em
   `.env.local` com as chaves de **teste** do Stripe (painel Stripe →
   Developers → API keys, modo "Test").
2. Em outro terminal, encaminhe os webhooks para a sua máquina local:

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

   O comando imprime um `whsec_...` — copie para `STRIPE_WEBHOOK_SECRET` em
   `.env.local` e reinicie `npm run dev`.
3. Adicione produtos ao carrinho, vá até `/checkout` e conclua as etapas
   (identificação → endereço → entrega → revisão). Ao confirmar o pedido você
   é redirecionado para o Stripe Checkout.
4. Use os [cartões de teste do Stripe](https://stripe.com/docs/testing):
   - **Pagamento aprovado**: `4242 4242 4242 4242`, validade e CVC quaisquer no futuro.
   - **Pagamento recusado**: `4000 0000 0000 0002`.
   - **Sessão expirada**: feche a aba do Stripe sem pagar e aguarde o tempo
     configurado (40 min), ou use `stripe trigger checkout.session.expired`.
   - **Reembolso**: no painel Stripe (modo teste), abra o pagamento e clique em
     "Refund" — ou use o botão "Reembolsar" em `/admin/pedidos/[id]`.
5. Confira o terminal onde `stripe listen` está rodando: cada evento
   processado aparece ali. O pedido muda de status automaticamente assim que
   o webhook confirma o pagamento — a página de sucesso do Stripe **não**
   confirma o pedido sozinha.

### Como ver e gerenciar um pedido

- **Cliente**: `/minha-conta/pedidos` lista os próprios pedidos;
  `/minha-conta/pedidos/[id]` mostra itens, endereço, rastreio e histórico, com
  botões para solicitar cancelamento/devolução quando permitido.
- **Administrador**: `/admin/pedidos` lista todos os pedidos com filtros
  (status do pedido, status do pagamento, período, busca por cliente/número) e
  ordenação. `/admin/pedidos/[id]` traz todos os dados (incluindo endereço de
  cobrança e IDs do Stripe) e as ações: confirmar/avançar status, adicionar
  rastreio (dispara e-mail automaticamente), cancelar, reembolsar (total ou
  parcial), adicionar observação interna, reenviar e-mails, copiar endereço,
  imprimir e exportar.

### Pedidos de visitante

Quem compra sem criar conta recebe um link com token seguro por e-mail (não é
possível descobrir o pedido só pelo número). Para reenviar esse link depois,
use `/acompanhar-pedido` (número do pedido + e-mail da compra).

### Estoque e concorrência

A baixa de estoque só acontece depois da confirmação do pagamento pelo
webhook (nunca antes). Entre a criação do pedido e o pagamento, a quantidade
fica **reservada** (funções `reserve_stock`/`release_stock`/`confirm_stock_sale`
em `0003_orders_payments_stripe.sql`, com atualização atômica no banco) — isso
evita que duas pessoas comprem a última unidade ao mesmo tempo. Se a sessão
expirar ou o pagamento falhar, a reserva é liberada automaticamente.

## Arquivos criados/alterados no Prompt 4

| Área | Arquivos principais |
| --- | --- |
| Banco de dados | `supabase/migrations/0003_orders_payments_stripe.sql` (status separados de pagamento/pedido, snapshots do pedido, histórico, reembolsos, movimentação de estoque, idempotência do webhook, tokens de visitante, tentativas de login), `src/types/database.ts` |
| Autenticação | `src/lib/actions/auth.ts`, `src/components/auth/*`, `/verificar-email`, `/redefinir-senha`, `/sair`, `/api/auth/callback` |
| Conta do cliente | `/minha-conta/perfil`, `/minha-conta/enderecos`, `/minha-conta/seguranca`, `src/lib/actions/account.ts` |
| Checkout | `src/components/checkout/CheckoutWizard.tsx`, `src/lib/actions/checkout.ts` (cria o pedido, reserva estoque, cria a sessão do Stripe) |
| Stripe | `src/app/api/stripe/webhook/route.ts` (todos os eventos, idempotente), `src/lib/stripe/` |
| E-mails | `src/lib/email/` (envio via Resend + modelos em português) |
| Pedidos (cliente) | `/minha-conta/pedidos`, `/minha-conta/pedidos/[id]`, `/pedido-confirmado`, `/pagamento-cancelado`, `/acompanhar-pedido` |
| Pedidos (admin) | `/admin/pedidos`, `/admin/pedidos/[id]`, `src/lib/actions/admin-orders.ts`, `src/components/admin/AdminOrderActions.tsx` |
| Textos | `src/i18n/pt.ts` / `src/i18n/en.ts` (todas as novas telas) |

### Limitações conhecidas desta etapa

- As confirmações de cadastro/e-mail e de recuperação de senha são enviadas
  pelo próprio Supabase Auth — personalize o texto delas em **Supabase
  Dashboard → Authentication → Email Templates** (o conteúdo em português dos
  e-mails de pedido, por outro lado, fica em `src/lib/email/templates.ts`).
- Algumas mensagens de erro dos formulários ainda estão escritas diretamente
  em português nas Server Actions (não passam por `t()`); migrar isso para o
  dicionário central é um bom próximo passo antes de traduzir o site.
- Analytics completo fica para uma próxima etapa (fora do escopo deste
  prompt).
