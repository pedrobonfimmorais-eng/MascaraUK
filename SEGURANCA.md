# Segurança — MascaraUK

Este documento resume as proteções implementadas, como usá-las, e o que
ainda depende de configuração ou de trabalho futuro. Leia também
`CHECKLIST-LANCAMENTO.md` antes de publicar a loja.

## Contas e permissões (RBAC)

A loja tem seis papéis de acesso (`src/lib/permissions.ts`,
`supabase/migrations/0005_security_rbac.sql`):

| Papel | Acesso |
| --- | --- |
| `cliente` | Própria conta, endereços, pedidos, carrinho e checkout. |
| `estoque` | Produtos, estoque, movimentações, preparação de pedidos. |
| `atendimento` | Clientes, pedidos, mensagens, notas, rastreamento. |
| `gerente` | Produtos, pedidos, promoções, analytics, relatórios. |
| `administrador` | Conforme permissões concedidas individualmente. |
| `administrador_principal` | Acesso total, incl. criação de admins, segurança, pagamentos e reembolsos. |

Toda verificação de permissão acontece **no servidor** — em
`src/lib/auth.ts` (`requireAdmin`, `requirePermission`, `requirePrincipal`)
e em cada Server Action/rota, nunca só escondendo um botão na tela. O
`src/proxy.ts` bloqueia o acesso a `/admin/*` antes mesmo de a página
carregar para quem não é da equipe.

Reembolsos, criação de administradores e alteração de configurações de
segurança são reservados a `administrador_principal`, mesmo que uma conta
`administrador` tenha outras permissões concedidas.

## Criação de administradores

Não existe tela pública de cadastro de administrador. O primeiro admin é
criado via terminal (`npm run create-admin`, protegido por
`ADMIN_SETUP_SECRET`) — ver `GUIA-INICIANTE.md`. Os administradores
seguintes são convidados de dentro do painel (`/admin/administradores`),
por um link de uso único que expira em 3 dias.

## Autenticação em duas etapas (2FA) — status atual

**O que existe:** a aba "Segurança" de `/admin/configuracoes` mostra, em
modo somente leitura, quantas contas têm 2FA ativado, tentativas de login
recentes e falhas nas últimas 24h. A tabela `admin_2fa` já existe no banco
para guardar o estado de ativação e códigos de recuperação.

**O que falta:** a tela de ativação do 2FA (gerar o QR code/segredo TOTP,
confirmar o primeiro código, gerar códigos de recuperação) e o bloqueio de
login exigindo o código quando o 2FA estiver ativo **não foram
implementados nesta etapa**.

- Por que falta: essa é uma mudança de fluxo de login que precisa ser
  testada contra uma sessão real do Supabase Auth (o Supabase já tem
  suporte nativo a MFA/TOTP via `supabase.auth.mfa`) — implementar e não
  conseguir validar contra um projeto Supabase real teria risco real de
  travar o acesso de administradores.
- Onde configurar: quando for implementado, a integração deve usar
  `supabase.auth.mfa.enroll/challenge/verify` (ver documentação do Supabase
  Auth sobre MFA) em vez de reinventar TOTP do zero, e checar o nível de
  garantia da sessão (AAL) em `src/proxy.ts` antes de liberar `/admin`.
- Como testar depois: crie um fator TOTP de teste com um app autenticador
  (Google Authenticator, Authy), confirme que o login exige o código
  quando o fator está ativo, e que os códigos de recuperação funcionam uma
  única vez cada.

Até lá, o 2FA continua **opcional e não é imposto** — trate senhas fortes e
únicas para cada administrador como a proteção principal nesta etapa.

## Senhas e sessões

- Senhas são armazenadas e verificadas inteiramente pelo Supabase Auth
  (hashing seguro, nunca em texto simples).
- Mínimo de 8 caracteres exigido em cadastro, redefinição e troca de senha.
- Ao trocar a senha, um e-mail de confirmação é enviado ao titular da conta
  (`passwordChangedEmail`), para alertar sobre alterações não reconhecidas.
- Cookies de sessão são gerenciados pelo `@supabase/ssr` (HttpOnly, com
  `Secure` habilitado automaticamente atrás de HTTPS em produção).
- Bloqueio por tentativas: 5 tentativas de login falhas em 15 minutos para
  o mesmo e-mail bloqueiam novas tentativas temporariamente
  (`src/lib/actions/auth.ts`, tabela `login_attempts`).

## Proteções de aplicação

- **Cabeçalhos de segurança** (`next.config.ts`): Content-Security-Policy,
  X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy e HSTS em produção.
- **CSRF**: Server Actions do Next.js já verificam a origem da requisição
  por padrão; formulários usam exclusivamente Server Actions, nunca
  endpoints que aceitem POST de qualquer origem sem verificação.
- **SQL injection**: todo acesso ao banco passa pelo cliente Supabase
  (consultas parametrizadas), nunca por SQL concatenado manualmente.
- **Preços e estoque nunca vêm do cliente**: o total do pedido é sempre
  recalculado no servidor a partir dos preços atuais no banco
  (`src/lib/pricing.ts`, `src/lib/actions/checkout.ts`) — o navegador nunca
  envia o valor final do pedido.
- **Webhooks duplicados/falsos**: cada evento do Stripe é validado por
  assinatura (`STRIPE_WEBHOOK_SECRET`) e deduplicado pela tabela
  `stripe_webhook_events` antes de processar.
- **Acesso entre clientes**: Row Level Security (RLS) no Postgres garante
  que um cliente só lê/edita os próprios pedidos e endereços, mesmo que
  tente adivinhar um ID de outro pedido pela URL.
- **Uploads**: imagens são restritas a PNG/JPG/JPEG/WEBP (validação de
  extensão/MIME), nunca executadas como código, e organizadas em pastas
  separadas por tipo no Supabase Storage (`produtos`, `categorias`,
  `banners`, `logos`, `paginas`).
- **Enumeração de usuários**: recuperação de senha e reenvio de link de
  pedido de visitante sempre respondem com a mesma mensagem de sucesso,
  independente de o e-mail existir ou não.
- **Erros internos nunca expostos**: `src/app/error.tsx` e
  `src/app/not-found.tsx` mostram apenas uma mensagem genérica e um código
  de erro (`ERR-...`) que o cliente pode informar ao suporte — nunca stack
  trace, SQL ou caminho interno de arquivo.

## Registro de atividades (`/admin/atividades`)

Ações administrativas sensíveis (mudança de status de pedido, rastreio,
cancelamento, reembolso, convite/alteração/remoção de administrador,
alteração de status de mensagem, mudança de configurações) ficam
registradas com responsável, data, ação e detalhes — nunca senhas, chaves
privadas ou dados completos de cartão. O registro não pode ser editado nem
apagado pelo painel (não existe policy de update/delete em `admin_logs`).

## Modo de manutenção

`/admin/configuracoes` → aba "Manutenção" (somente
`administrador_principal`). Bloqueia a loja pública para clientes, mas
nunca bloqueia `/admin`, `/api/*` (incluindo o webhook do Stripe) nem a
própria página de manutenção — pagamentos em andamento nunca são
perdidos por causa da manutenção.

## O que ainda depende de configuração do dono da loja

- Preencher os dados reais da loja (nome, e-mail, telefone, CNPJ/CPF) em
  `/admin/configuracoes`.
- Trocar as chaves de teste do Stripe pelas de produção antes do
  lançamento.
- Pedir revisão profissional das páginas legais (ver aviso no topo de cada
  uma) antes de publicar.
- Ativar 2FA quando essa funcionalidade for implementada (ver seção acima).
