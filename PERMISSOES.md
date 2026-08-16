# Permissões administrativas

Este documento é o mapa oficial de quem pode fazer o quê no painel `/admin`.
A fonte de verdade em código é `src/lib/permissions.ts` — este arquivo
existe para dar visibilidade e um checklist de teste, não para redefinir a
regra (se os dois divergirem no futuro, o código manda).

## Como a verificação funciona (3 camadas)

1. **`src/proxy.ts`** — barra qualquer conta que não seja de equipe
   (`estoque`/`atendimento`/`gerente`/`administrador`/`administrador_principal`)
   antes mesmo da rota `/admin/*` carregar. Isso é o portão de entrada, não
   a permissão fina.
2. **Cada página `/admin/**/page.tsx`** — chama
   `requirePermission("capacidade")` ou `requirePrincipal()` e redireciona
   para `/acesso-negado` se a conta não tiver a capacidade exigida por
   aquela tela especificamente (uma conta "estoque" pode entrar em `/admin`,
   mas não em `/admin/analytics/vendas`).
3. **Cada Server Action em `src/lib/actions/*.ts`** — repete a mesma
   checagem antes de ler ou alterar qualquer dado. Nunca confia que a tela
   já filtrou o acesso (o usuário pode chamar a action diretamente).
4. **RLS no banco** (`supabase/migrations/0010_least_privilege_rls.sql`) —
   última camada: mesmo que alguém pule o servidor Next.js inteiro e chame
   a API do Supabase diretamente com a própria sessão, o banco também nega.

## Matriz de papéis × capacidades

Espelha exatamente `ROLE_MATRIX`/`PRINCIPAL_ONLY` em `src/lib/permissions.ts`.

| Capacidade | estoque | atendimento | gerente | administrador | administrador_principal |
| --- | :---: | :---: | :---: | :---: | :---: |
| `products.manage` (produtos/categorias/imagens/variações/banners) | ✅ | — | ✅ | configurável | ✅ |
| `inventory.manage` (estoque) | ✅ | — | ✅ | configurável | ✅ |
| `orders.view` | ✅ | ✅ | ✅ | configurável | ✅ |
| `orders.manage` | — | ✅ | ✅ | configurável | ✅ |
| `orders.refund` (reembolsos) | — | — | — | ❌ nunca | ✅ **exclusivo** |
| `customers.view` | — | ✅ | — | configurável | ✅ |
| `customers.manage` | — | ✅ | — | configurável | ✅ |
| `promotions.manage` (promoções/cupons) | — | — | ✅ | configurável | ✅ |
| `messages.manage` (mensagens de contato) | — | ✅ | ✅ | configurável | ✅ |
| `analytics.view` | — | — | ✅ | configurável | ✅ |
| `reports.export` | — | — | ✅ | configurável | ✅ |
| `settings.manage` (configurações da loja) | — | — | — | configurável | ✅ |
| `security.manage` | — | — | — | ❌ nunca | ✅ **exclusivo** |
| `admins.manage` (criar/editar administradores) | — | — | — | ❌ nunca | ✅ **exclusivo** |
| `activities.view` (log de auditoria) | — | — | ✅ | configurável | ✅ |
| `maintenance.manage` | — | — | — | configurável | ✅ |

- **"configurável"**: o papel `administrador` não tem nenhuma capacidade
  fixa — cada uma é concedida individualmente por um `administrador_principal`
  em `/admin/administradores`, gravada em `profiles.permissions` (jsonb).
- **"❌ nunca"**: mesmo que um `administrador_principal` tente conceder essa
  capacidade a uma conta `administrador` via `profiles.permissions`, tanto
  `hasPermission()` (servidor) quanto `has_permission()` (RLS, banco)
  ignoram essa concessão — `orders.refund`, `security.manage` e
  `admins.manage` só existem para quem é literalmente
  `administrador_principal`.

## Onde cada capacidade é exigida

| Tela / ação | Capacidade exigida | Arquivo |
| --- | --- | --- |
| `/admin/produtos`, `/admin/categorias`, `/admin/banners` | `products.manage` | `src/app/admin/{produtos,categorias,banners}/page.tsx` |
| `/admin/cupons`, `/admin/analytics/promocoes` (parte de cupons) | `promotions.manage` (tela) / `analytics.view` (analytics) | `src/app/admin/cupons/page.tsx` |
| `/admin/pedidos`, `/admin/pedidos/[id]` | `orders.view` | `src/app/admin/pedidos/**/page.tsx` |
| Ações de pedido (mudar status, adicionar rastreio, observações) | `orders.manage` | `src/lib/actions/admin-orders.ts` |
| Reembolso de pedido | `orders.refund` (só `administrador_principal`) | `src/lib/actions/admin-orders.ts` |
| `/admin/mensagens`, `/admin/mensagens/[id]` | `messages.manage` | `src/app/admin/mensagens/**/page.tsx` |
| `/admin/analytics/*` (visão geral, vendas, produtos, carrinhos, clientes, cupons, estoque, promoções, alertas) | `analytics.view` | `src/app/admin/analytics/**/page.tsx` |
| Edição de custo de produto (usada no cálculo de lucro) | `analytics.view` | `src/lib/actions/analytics-costs.ts` |
| `/admin/relatorios`, exportação de relatório | `reports.export` | `src/app/admin/relatorios/page.tsx`, `src/app/api/admin/reports/export/route.ts` |
| `/admin/configuracoes` (todas as abas) | `settings.manage` | `src/app/admin/configuracoes/page.tsx`, `src/lib/actions/admin-settings.ts` |
| `/admin/atividades` (log de auditoria) | `activities.view` | `src/app/admin/atividades/page.tsx` |
| `/admin/administradores`, convites, alteração de papel/permissões | somente `administrador_principal` | `src/app/admin/administradores/page.tsx`, `src/lib/actions/admins.ts` |
| Segurança/2FA de outra conta | somente `administrador_principal` | `src/lib/actions/admin-settings.ts` (`requirePrincipal`) |
| Painel do dashboard (`/admin`) | Cada bloco filtrado individualmente (pedidos/receita exige `orders.view`, produtos exige `products.manage`/`inventory.manage`, clientes exige `customers.view`) — a página em si é aberta a qualquer conta de equipe, mas só mostra o que a capacidade da conta permite | `src/app/admin/page.tsx` |

### Lacunas encontradas e corrigidas nesta revisão (Prompt 8)

Antes desta revisão, várias páginas de leitura só passavam pelo portão
genérico `requireAdmin()` (qualquer papel de equipe), sem checar a
capacidade específica da tela — ou seja, uma conta `atendimento` (que só
deveria acessar pedidos e mensagens) conseguia abrir `/admin/produtos`,
`/admin/analytics/vendas` etc. mesmo sem poder alterar nada ali. Corrigido
adicionando `requirePermission(...)` no topo de cada página listada acima
que estava sem a checagem (produtos, categorias, cupons, banners, pedidos,
pedidos/[id], relatórios e as 9 páginas de analytics), e filtrando os
cartões do dashboard por capacidade. `/admin/configuracoes` e as Server
Actions já estavam corretas.

## Checklist manual de tentativas de acesso proibidas

Sem suite de testes automatizados neste projeto (ver `README.md` —
"Comandos disponíveis"), então este é um checklist manual. Rode cada linha
logado com a conta indicada e confirme o resultado esperado.

| # | Conta de teste | Ação tentada | Resultado esperado |
| --- | --- | --- | --- |
| 1 | Visitante (sem login) | Acessar `/admin` | Redirecionado para `/login?redirect=/admin` |
| 2 | Cliente comum | Acessar `/admin` | Redirecionado para `/acesso-negado` (tem sessão, mas não é papel de equipe) |
| 3 | `estoque` | Acessar `/admin/analytics/vendas` | Redirecionado para `/acesso-negado` (falta `analytics.view`) |
| 4 | `estoque` | Acessar `/admin/pedidos` | Redirecionado para `/acesso-negado` (falta `orders.view`) — nota: por padrão `estoque` tem `orders.view` na matriz; se o teste falhar aqui, confirme o papel da conta de teste |
| 5 | `atendimento` | Acessar `/admin/produtos` | Redirecionado para `/acesso-negado` (falta `products.manage`) |
| 6 | `atendimento` | Chamar a Server Action de atualizar produto/estoque diretamente (via devtools ou script) | Ação retorna `null`/falha — `requirePermission("products.manage")` bloqueia antes de tocar o banco |
| 7 | `gerente` | Acessar `/admin/administradores` | Redirecionado (`requirePrincipal()` exige `administrador_principal`) |
| 8 | `gerente` | Tentar reembolsar um pedido | Bloqueado — `orders.refund` é exclusivo de `administrador_principal`, mesmo que `gerente` tenha `orders.manage` |
| 9 | `administrador` sem nenhuma permissão concedida | Acessar qualquer tela de `/admin` além do dashboard vazio | Redirecionado em todas — `hasPermission()` retorna `false` para capacidades não concedidas em `profiles.permissions` |
| 10 | `administrador` com `products.manage` concedido, tentando `orders.refund` | Chamar a action de reembolso | Bloqueado — `orders.refund` está em `PRINCIPAL_ONLY`, ignora qualquer concessão manual |
| 11 | `administrador_principal` | Todas as telas acima | Acesso permitido em todas |
| 12 | Qualquer papel de equipe | Alterar `admin_logs` (editar ou apagar um registro) | Sempre bloqueado, mesmo para `administrador_principal` — ver `supabase/migrations/0001_init.sql`/`0010_least_privilege_rls.sql` (nenhuma policy de update/delete existe para essa tabela) |

Para os cenários de RLS pura (sem passar pelo Next.js, direto no banco),
veja também `supabase/tests/rls_checks.sql`, que cobre o mesmo tipo de
tentativa a partir do lado do Postgres.
