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

## Autenticação em duas etapas (2FA/MFA TOTP) — obrigatória para toda conta administrativa

O 2FA usa exclusivamente o MFA nativo do Supabase Auth
(`supabase.auth.mfa.*`/`supabase.auth.admin.mfa.*`) — o segredo TOTP é
gerado, guardado e verificado inteiramente pelo Supabase (schema `auth`,
nunca por uma tabela nossa). Não existe (e nunca existiu de forma confiável)
um campo booleano "2FA ativo" em `profiles`/`admin_2fa` sendo usado como
prova disso; a única fonte de verdade é o *Authenticator Assurance Level*
(AAL) da sessão atual, relido a cada requisição.

- **Ativação**: qualquer conta de equipe acessa `/admin/2fa` (link sempre
  visível no menu, independente do papel) para escanear um QR code e
  confirmar o primeiro código de 6 dígitos
  (`src/components/auth/MfaEnrollment.tsx`, `src/lib/actions/mfa.ts`).
- **Login com 2FA**: após e-mail/senha, uma conta de equipe sem nenhum
  fator verificado é obrigatoriamente enviada para `/login/ativar-2fa`
  (não existe forma de acessar `/admin` só com senha). Uma conta que já
  tem um fator, mas cuja sessão atual ainda não completou o desafio, vai
  para `/login/verificar-codigo`.
- **Imposição em `/admin`**: `src/proxy.ts` chama
  `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` a cada requisição a
  `/admin/**` e só libera quando `currentLevel === 'aal2'`. As mesmas
  checagens são repetidas no servidor em `requireAdmin()`/
  `requirePermission()`/`requirePrincipal()` (`src/lib/auth.ts`), como
  defesa em profundidade caso alguém chame uma Server Action diretamente.
- **Políticas de banco sensíveis também exigem aal2**: criar um convite de
  administrador (`admin_invites`) e alterar `role`/`permissions` de
  qualquer conta em `profiles` exigem `auth.jwt() ->> 'aal' = 'aal2'` na
  própria política de RLS (`supabase/migrations/0011_real_totp_mfa.sql`),
  não apenas o papel do usuário.
- **Gestão de fatores**: `/admin/2fa` lista os fatores cadastrados e
  permite removê-los (exige que a sessão atual já esteja em aal2, ou seja,
  o dispositivo ainda funciona).
- **Dispositivo perdido**: só o `administrador_principal`, com a própria
  sessão em aal2, pode forçar a remoção do fator de outra conta de equipe
  (botão "Remover 2FA (dispositivo perdido)" em `/admin/administradores`,
  usando `supabase.auth.admin.mfa.deleteFactor` — a conta trancada não
  precisa nem consegue se autodesbloquear). A conta afetada volta a cair em
  `/login/ativar-2fa` no próximo acesso e precisa cadastrar um fator novo.
- **Auditoria**: ativação, remoção (própria ou forçada) e falhas de desafio
  geram registros em `admin_logs` (`2fa_ativado`, `2fa_removido`,
  `2fa_removido_recuperacao_dispositivo_perdido`, `2fa_desafio_falhou`,
  `2fa_desafio_confirmado`), tabela que nenhuma política de RLS permite
  alterar ou apagar pelo painel.

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
