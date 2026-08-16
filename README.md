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
   | `ADMIN_SETUP_SECRET` | Defina você mesmo (qualquer texto longo) antes de rodar `npm run create-admin` — ver seção abaixo |

   Veja `.env.example` para a lista completa e comentada de todas as
   variáveis (incluindo as reservadas para uso futuro, como `CRON_SECRET`).

   O site funciona mesmo sem essas variáveis configuradas: as páginas públicas
   mostram produtos e categorias de demonstração (claramente identificados
   como "(Exemplo)"), e as áreas que exigem login (`/minha-conta`, `/admin`)
   simplesmente redirecionam para o login.

3. Crie as tabelas no seu projeto Supabase executando, **em ordem**, o SQL de
   todos os arquivos em `supabase/migrations/` (`0001_init.sql` até
   `0006_legal_content.sql`) — SQL Editor do painel Supabase, ou via Supabase
   CLI: `supabase db push`. Veja o passo a passo em
   `CONFIGURACAO-SUPABASE.md`. Opcionalmente rode também `supabase/seed.sql`
   para ver produtos de exemplo reais no banco.

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

## Comandos disponíveis

| Comando | O que faz |
| --- | --- |
| `npm install` | Instala as dependências (necessário antes de qualquer outro comando) |
| `npm run dev` | Sobe o servidor de desenvolvimento em `http://localhost:3000` |
| `npm run lint` | Roda o ESLint (`eslint.config.mjs`) sobre o projeto |
| `npm run build` | Gera o build de produção (`next build`), incluindo checagem de tipos TypeScript |
| `npm run start` | Serve o build de produção gerado por `npm run build` |
| `npm run create-admin` | Cria o primeiro administrador (`administrador_principal`), protegido por `ADMIN_SETUP_SECRET` — ver seção abaixo |

Não há suite de testes automatizados configurada neste projeto (sem
`npm test`/Jest/Vitest/Playwright) — a validação hoje é manual (checklist em
`CHECKLIST-LANCAMENTO.md`) mais lint e build.

**Estado verificado nesta revisão** (commit `fc66ad4`, branch
`claude/xeno-labs-ecommerce-audit-xz74xo`): `npm run lint` passa sem erros
nem avisos; `npm run build` completa com sucesso (58 rotas geradas), mesmo
sem `.env.local` configurado — a loja cai automaticamente no modo de dados
de demonstração descrito acima. Nenhum erro pré-existente foi encontrado
para registrar.

## Ponto de restauração desta etapa

Antes de novas mudanças serem aplicadas ao projeto, o estado atual do
código foi conferido e documentado como ponto seguro de restauração:

- **Commit:** `fc66ad49024ef57440b43d0236d4f5a36c4d44db`
- **Branch:** `claude/xeno-labs-ecommerce-audit-xz74xo`
- **Como voltar para este ponto**, caso uma mudança futura precise ser
  desfeita:
  ```bash
  git fetch origin
  git checkout claude/xeno-labs-ecommerce-audit-xz74xo
  git reset --hard fc66ad49024ef57440b43d0236d4f5a36c4d44db
  ```
  (use `git log` para localizar commits mais recentes se este ponto já
  não for o mais atual da branch).
- Para restaurar dados do banco/imagens (não apenas código), veja
  `BACKUP-E-RESTAURACAO.md`.
- Nenhuma credencial real está versionada neste repositório — apenas
  `.env.example`, sem valores preenchidos (confirmado nesta revisão via
  `git ls-files | grep env`).

## Como criar a primeira conta de administrador

Por segurança, **não existe** opção de "criar conta de administrador" no
cadastro público — toda conta criada em `/cadastro` nasce como `cliente`, e
isso é garantido tanto na interface quanto no banco de dados (o trigger
`handle_new_user` sempre insere `role = 'cliente'`, ignorando qualquer dado
enviado pelo cliente).

O primeiro administrador (`administrador_principal`, com acesso total) é
criado por um script de terminal, protegido pela variável
`ADMIN_SETUP_SECRET`:

```bash
npm run create-admin
```

Veja o passo a passo completo em `GUIA-INICIANTE.md`. Depois do primeiro
administrador criado, os próximos são convidados de dentro do painel em
`/admin/administradores` (link de uso único, nunca uma tela pública).

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

Seis papéis de acesso (ver `SEGURANCA.md` para a tabela completa):
`cliente`, `estoque`, `atendimento`, `gerente`, `administrador` e
`administrador_principal`. Um `cliente` nunca alcança `/admin`, mesmo
autenticado — isso é verificado em `src/proxy.ts`, de novo em
`src/app/admin/layout.tsx`, e por `requirePermission()`/`requirePrincipal()`
(`src/lib/auth.ts`) em cada Server Action sensível. A capacidade de cada
papel está centralizada em `src/lib/permissions.ts`.

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

## Analytics, relatórios e desempenho da loja (Prompt 5)

### Como acessar o analytics

Entre como administrador e acesse `/admin/analytics` pelo menu lateral do
painel (`Analytics`). As páginas de vendas, produtos, clientes, carrinhos,
cupons, promoções, estoque e alertas ficam em `/admin/analytics/*`; os
relatórios exportáveis ficam em `/admin/relatorios`. Todas essas rotas
exigem uma conta `administrador` — um cliente comum nunca alcança essas
páginas, tanto pelo `src/proxy.ts` quanto pelo `requireAdmin()` do layout do
painel.

### Como selecionar um período

No topo de cada página de analytics há um filtro com os períodos pedidos
(hoje, ontem, últimos 7/30 dias, este mês, mês anterior, últimos 3/6 meses,
este ano, ano anterior e período personalizado) e um seletor de comparação
(período anterior equivalente, mesmo período do mês anterior, mesmo período
do ano anterior). Os cartões e gráficos mostram "sem dados do período
anterior" quando não há base de comparação suficiente.

### Como visualizar o desempenho de um produto

Em `/admin/analytics/produtos`, clique em um produto para abrir
`/admin/analytics/produtos/[id]`: funil (visualizou → carrinho → checkout →
compra), métricas detalhadas, desempenho por variação e alertas específicos
do produto (muito visto e pouco vendido, custo não cadastrado, oferta
relâmpago encerrada, etc.).

### Como cadastrar custos

- **Custo do produto**: abra a página de analytics do produto
  (`/admin/analytics/produtos/[id]`) e preencha "Custo do produto".
- **Custos adicionais** (taxa do meio de pagamento, embalagem, frete médio,
  custo operacional, outras despesas): cadastre em
  `/admin/analytics/vendas`, na seção "Custos adicionais" — cada um pode ser
  um valor fixo por pedido pago ou uma porcentagem do faturamento, com
  período de vigência e status ativo/inativo.

### Como visualizar o lucro estimado

Em `/admin/analytics/vendas`, a seção "Custos e lucro estimado" mostra
receita de produtos, custo estimado dos produtos vendidos, descontos,
reembolsos, lucro bruto estimado e margem bruta estimada — sempre marcado
como estimativa, com um aviso quando existem produtos vendidos sem custo
cadastrado.

### Como exportar um relatório

Em `/admin/relatorios`, escolha o tipo de relatório (pedidos, vendas,
produtos, estoque, clientes, cupons, promoções, ofertas relâmpago,
reembolsos, cancelamentos, analytics de produtos, movimentações de estoque
ou lucro estimado), o período e os filtros desejados, depois clique em
"Exportar CSV" ou "Exportar XLSX". Toda exportação é registrada no histórico
administrativo (`admin_logs`) com o tipo, os filtros e o administrador
responsável.

### Como separar dados de teste e dados reais

Todo pedido criado enquanto `STRIPE_SECRET_KEY` é uma chave de teste
(`sk_test_...`) é marcado com `is_test = true` e fica fora dos relatórios por
padrão. Para incluir esses dados temporariamente (ex.: enquanto testa o
checkout), marque a caixa "Incluir dados de teste" no filtro de período de
qualquer página de analytics.

## Arquivos criados/alterados no Prompt 5

| Área | Arquivos principais |
| --- | --- |
| Banco de dados | `supabase/migrations/0004_analytics_reports.sql` (custo do produto, `is_test`, custos adicionais, colunas extras em `analytics_events`, pesquisas internas, alertas, agendamento de relatórios, limiares configuráveis) |
| Consentimento de cookies | `src/lib/consent.ts`, `src/components/consent/CookieConsentBanner.tsx` |
| Registro de eventos | `src/lib/analytics/track-client.ts`, `src/app/api/analytics/track/route.ts`, trackers em produto/busca/carrinho/checkout, eventos de compra/reembolso gravados no webhook do Stripe |
| Motor de analytics | `src/lib/analytics/{period,queries,costs,profit,products,customers,carts,coupons,promotions,stock,alerts,settings,request-params}.ts` |
| Painéis | `src/app/admin/analytics/**` (geral, vendas, produtos, clientes, carrinhos, cupons, promoções, estoque, alertas) |
| Relatórios | `src/lib/reports/{types,build,export}.ts`, `src/app/api/admin/reports/export/route.ts`, `/admin/relatorios` |
| Textos | `src/i18n/pt.ts` / `src/i18n/en.ts` (namespaces `analytics` e `consent`) |

### Limitações conhecidas desta etapa

- Não há tabelas de resumo diário pré-agregadas: os relatórios calculam a
  partir dos dados brutos a cada carregamento. Para um volume muito grande de
  pedidos/eventos, considere criar resumos diários no futuro.
- "Carrinho convertido" é aproximado por pedidos pagos no período (não existe
  um vínculo direto carrinho→pedido, já que o carrinho é limpo após o
  pagamento confirmado).
- Analytics de promoções/ofertas relâmpago mostra o desempenho dos produtos
  durante a janela ativa da promoção, mas não isola tecnicamente se a venda
  ocorreu "por causa" da promoção — por isso o aviso na tela.
- A exportação em PDF ainda não está implementada (apenas preparada na
  interface); CSV e XLSX funcionam.
- O agendamento de relatórios salva a preferência (tipo, frequência,
  destinatários, formato, horário), mas o envio automático real depende de
  conectar essa estrutura a um job agendado — nada é enviado sozinho.
- Integrações com Google Analytics/GTM/Meta Pixel/TikTok Pixel têm campos
  preparados em `store_settings.tracking_integrations`, mas o carregamento
  condicional dos scripts em si ainda não foi implementado.

## Revisão final, segurança, documentação e publicação (Prompt 6)

### O que mudou

- **Permissões (RBAC)**: seis papéis de acesso substituem o antigo
  `cliente`/`administrador` único — ver `SEGURANCA.md` e
  `src/lib/permissions.ts`.
- **Criação de administradores**: script de terminal protegido
  (`npm run create-admin`) para o primeiro admin, convites de uso único
  pelo painel (`/admin/administradores`) para os seguintes — nunca uma
  tela pública.
- **`/admin/configuracoes`** ganhou abas: Informações da loja, Aparência,
  Vendas, Entrega, Pagamentos (status apenas, nunca a chave secreta),
  E-mails, Segurança (somente leitura) e Manutenção.
- **Modo de manutenção** bloqueia a loja pública sem nunca bloquear
  `/admin` nem os webhooks do Stripe.
- **`/admin/atividades`** mostra o histórico de ações administrativas
  sensíveis (quem fez o quê, quando, com que detalhes).
- **`/admin/mensagens`** recebe as mensagens do formulário de contato
  (agora com persistência real, proteção contra spam por honeypot e
  status: Nova, Em atendimento, Aguardando cliente, Resolvida, Spam).
- **Páginas legais** (`politica-de-privacidade`, `politica-de-cookies`,
  `termos-de-uso`, `politica-de-entrega`, `trocas-e-devolucoes`) agora têm
  conteúdo inicial real (não mais "conteúdo de exemplo") — ainda assim,
  não é aconselhamento jurídico definitivo, ver aviso no topo de cada uma.
- **Cabeçalhos de segurança** (CSP, X-Frame-Options, etc.) em
  `next.config.ts`; páginas de erro/404 dedicadas
  (`src/app/error.tsx`, `src/app/not-found.tsx`) que nunca expõem detalhes
  internos.
- **Consentimento de cookies** agora tem os três botões exigidos (Aceitar
  todos / Recusar opcionais / Gerenciar preferências) e uma categoria
  "Preferências" separada de Analytics/Marketing.
- **Classificação de propriedade intelectual** por produto
  (`products.ip_classification`), nunca padrão "oficialmente licenciado".
- Documentação nova: `GUIA-INICIANTE.md`, `CONFIGURACAO-STRIPE.md`,
  `CONFIGURACAO-SUPABASE.md`, `PUBLICACAO.md`, `BACKUP-E-RESTAURACAO.md`,
  `SEGURANCA.md`, `CHECKLIST-LANCAMENTO.md`.

## Arquivos criados/alterados no Prompt 6

| Área | Arquivos principais |
| --- | --- |
| Banco de dados | `supabase/migrations/0005_security_rbac.sql` (papéis, convites, 2FA, mensagens, classificação de IP), `0006_legal_content.sql` |
| Permissões | `src/lib/permissions.ts`, `src/lib/auth.ts` (`requirePermission`/`requirePrincipal`), `src/proxy.ts` |
| Administradores | `src/lib/actions/admins.ts`, `src/lib/actions/accept-invite.ts`, `src/lib/admin-directory.ts`, `/admin/administradores`, `/convite-admin/[token]`, `scripts/create-admin.mjs` |
| Configurações | `src/lib/actions/admin-settings.ts`, `src/components/admin/settings/SettingsTabs.tsx`, `/admin/configuracoes`, `src/lib/integration-status.ts` |
| Atividades | `src/lib/actions/activity-log.ts`, `/admin/atividades` |
| Mensagens | `src/lib/actions/contact.ts`, `src/lib/actions/messages.ts`, `/admin/mensagens` |
| Segurança/erros | `next.config.ts`, `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx`, `src/app/acesso-negado`, `src/app/manutencao`, `src/lib/logger.ts` |
| Conteúdo legal | `src/lib/legal-content.ts`, `src/lib/pages.ts` |
| E-mails novos | `passwordChangedEmail`, `adminInviteEmail`, `contactMessageReceivedEmail`, `lowStockAlertEmail` em `src/lib/email/templates.ts` |

### Limitações conhecidas desta etapa

- **CRUD de produtos/categorias/cupons/banners**: as telas
  `/admin/produtos`, `/admin/categorias`, `/admin/cupons` e
  `/admin/banners` ainda são somente leitura (listagem) — cadastrar/editar
  esses itens ainda depende do Table Editor do Supabase ou de uma etapa
  futura de desenvolvimento. Isso já era assim antes do Prompt 6 e está
  fora do escopo de uma revisão de segurança/polimento; a proteção de
  acesso (RLS + papéis) já cobre essas tabelas mesmo sem a tela de edição.
- **Editor de páginas institucionais**: não existe uma tela admin para
  editar `custom_pages` (só a semente de conteúdo em SQL) — editar o
  texto das páginas legais/institucionais depois do lançamento ainda
  exige o Table Editor do Supabase.
- **Envio automático de relatórios agendados**: a tela de agendamento salva
  a preferência, mas nenhum cron real dispara o envio (ver `CRON_SECRET`
  em `.env.example`).
- **Rate limiting geral de API**: existe bloqueio específico por tentativas
  de login (`login_attempts`), mas não um limitador de taxa genérico para
  todas as rotas de API.
