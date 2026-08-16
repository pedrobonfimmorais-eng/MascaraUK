-- MascaraUK -- Prompt 6: aperto de privilegio minimo nas politicas RLS.
-- Complementa 0001-0009 sem remover nenhuma estrutura existente.
--
-- Duas lacunas de privilegio minimo identificadas na revisao:
--
-- 1) As politicas de escrita de produtos/categorias/imagens/variacoes/
--    banners/estoque (criadas em 0001_init.sql) usam public.is_admin(),
--    que desde 0005_security_rbac.sql passou a ser verdadeiro para
--    QUALQUER papel de equipe (estoque, atendimento, gerente,
--    administrador, administrador_principal) -- inclusive papeis que nao
--    deveriam poder escrever no catalogo (ex.: "atendimento", que so tem a
--    capacidade "messages.manage"/"orders.manage" em src/lib/permissions.ts).
--    Este arquivo troca essas policies para exigir a capacidade granular
--    correta (products.manage / inventory.manage), espelhando em SQL a
--    mesma matriz ja aplicada no servidor por src/lib/permissions.ts.
--
-- 2) A policy de UPDATE de "profiles" permite que o proprio usuario altere
--    a propria linha (auth.uid() = id), mas RLS nao restringe QUAIS
--    colunas podem mudar -- nada impedia um cliente autenticado de chamar
--    supabase.from('profiles').update({ role: 'administrador_principal' })
--    sobre a propria linha e a policy aceitaria, pois so olha o dono da
--    linha, nao o conteudo da mudanca. Este arquivo adiciona um trigger
--    que bloqueia qualquer mudanca de role/permissions que nao venha do
--    administrador_principal nem do servidor (service role).

-- =========================================================================
-- FUNCAO: replica em SQL a matriz de capacidades de src/lib/permissions.ts
-- =========================================================================
create or replace function public.has_permission(capability text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  current_role public.user_role;
  current_permissions jsonb;
begin
  select role, permissions into current_role, current_permissions
  from public.profiles
  where id = auth.uid();

  if current_role is null then
    return false;
  end if;

  if current_role = 'administrador_principal' then
    return true;
  end if;

  -- Capacidades exclusivas do administrador_principal, mesmo que concedidas
  -- manualmente a uma conta "administrador" (espelha PRINCIPAL_ONLY em
  -- src/lib/permissions.ts).
  if capability in ('orders.refund', 'security.manage', 'admins.manage') then
    return false;
  end if;

  if current_role = 'administrador' then
    return coalesce((current_permissions ->> capability)::boolean, false);
  end if;

  return case current_role
    when 'estoque' then
      capability in ('products.manage', 'inventory.manage', 'orders.view')
    when 'atendimento' then
      capability in ('orders.view', 'orders.manage', 'customers.view', 'customers.manage', 'messages.manage')
    when 'gerente' then
      capability in (
        'products.manage', 'inventory.manage', 'orders.view', 'orders.manage',
        'promotions.manage', 'analytics.view', 'reports.export', 'messages.manage', 'activities.view'
      )
    else
      false
  end;
end;
$$;

comment on function public.has_permission(text) is
  'Espelha hasPermission() de src/lib/permissions.ts em SQL, para que a mesma regra de menor privilegio valha tanto no servidor Next.js quanto no banco (RLS) -- nunca confiar apenas na tela /admin.';

-- =========================================================================
-- PRODUTOS: escrita exige products.manage, nao qualquer papel de equipe
-- =========================================================================
drop policy if exists "Somente admin cadastra produtos" on public.products;
drop policy if exists "Somente admin atualiza produtos" on public.products;
drop policy if exists "Somente admin remove produtos" on public.products;

create policy "Somente quem gerencia produtos cadastra produtos" on public.products
  for insert with check (public.has_permission('products.manage'));
create policy "Somente quem gerencia produtos atualiza produtos" on public.products
  for update using (public.has_permission('products.manage'));
create policy "Somente quem gerencia produtos remove produtos" on public.products
  for delete using (public.has_permission('products.manage'));

-- =========================================================================
-- CATEGORIAS: mesma capacidade de catalogo (products.manage)
-- =========================================================================
drop policy if exists "Somente admin gerencia categorias" on public.categories;
drop policy if exists "Somente admin atualiza categorias" on public.categories;
drop policy if exists "Somente admin remove categorias" on public.categories;

create policy "Somente quem gerencia produtos cadastra categorias" on public.categories
  for insert with check (public.has_permission('products.manage'));
create policy "Somente quem gerencia produtos atualiza categorias" on public.categories
  for update using (public.has_permission('products.manage'));
create policy "Somente quem gerencia produtos remove categorias" on public.categories
  for delete using (public.has_permission('products.manage'));

-- =========================================================================
-- IMAGENS DE PRODUTO
-- =========================================================================
drop policy if exists "Somente admin gerencia imagens" on public.product_images;
drop policy if exists "Somente admin atualiza imagens" on public.product_images;
drop policy if exists "Somente admin remove imagens" on public.product_images;

create policy "Somente quem gerencia produtos cadastra imagens" on public.product_images
  for insert with check (public.has_permission('products.manage'));
create policy "Somente quem gerencia produtos atualiza imagens" on public.product_images
  for update using (public.has_permission('products.manage'));
create policy "Somente quem gerencia produtos remove imagens" on public.product_images
  for delete using (public.has_permission('products.manage'));

-- =========================================================================
-- VARIACOES DE PRODUTO
-- =========================================================================
drop policy if exists "Somente admin gerencia variações" on public.product_variants;
drop policy if exists "Somente admin atualiza variações" on public.product_variants;
drop policy if exists "Somente admin remove variações" on public.product_variants;

create policy "Somente quem gerencia produtos cadastra variacoes" on public.product_variants
  for insert with check (public.has_permission('products.manage'));
create policy "Somente quem gerencia produtos atualiza variacoes" on public.product_variants
  for update using (public.has_permission('products.manage'));
create policy "Somente quem gerencia produtos remove variacoes" on public.product_variants
  for delete using (public.has_permission('products.manage'));

-- =========================================================================
-- BANNERS
-- =========================================================================
drop policy if exists "Somente admin gerencia banners" on public.banners;
drop policy if exists "Somente admin atualiza banners" on public.banners;
drop policy if exists "Somente admin remove banners" on public.banners;

create policy "Somente quem gerencia produtos cadastra banners" on public.banners
  for insert with check (public.has_permission('products.manage'));
create policy "Somente quem gerencia produtos atualiza banners" on public.banners
  for update using (public.has_permission('products.manage'));
create policy "Somente quem gerencia produtos remove banners" on public.banners
  for delete using (public.has_permission('products.manage'));

-- =========================================================================
-- ESTOQUE: escrita exige inventory.manage
-- Leitura publica (using (true)) e mantida de proposito: catalog.ts,
-- cart-data.ts e actions/cart.ts calculam disponibilidade em tempo real
-- (quantity - reserved_quantity) a partir do cliente Supabase de sessao
-- (nao service role) -- restringir a leitura quebraria a vitrine e o
-- carrinho. Nenhum outro dado sensivel existe nesta tabela.
-- =========================================================================
drop policy if exists "Somente admin gerencia estoque" on public.inventory;
drop policy if exists "Somente admin atualiza estoque" on public.inventory;
drop policy if exists "Somente admin remove estoque" on public.inventory;

create policy "Somente quem gerencia estoque cadastra estoque" on public.inventory
  for insert with check (public.has_permission('inventory.manage'));
create policy "Somente quem gerencia estoque atualiza estoque" on public.inventory
  for update using (public.has_permission('inventory.manage'));
create policy "Somente quem gerencia estoque remove estoque" on public.inventory
  for delete using (public.has_permission('inventory.manage'));

-- =========================================================================
-- PROFILES: impede que o proprio cliente (ou qualquer papel nao autorizado)
-- se promova alterando role/permissions na propria linha. A policy de
-- UPDATE existente permite que o usuario edite a propria linha (nome,
-- telefone) -- este trigger e a camada que garante que role/permissions
-- so mudam pela mao do administrador_principal ou do servidor (service
-- role, usado por scripts/create-admin.mjs e pelas server actions de
-- convite/gestao de administradores).
-- =========================================================================
create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.permissions is distinct from old.permissions)
     and auth.role() <> 'service_role'
     and not public.is_admin_principal() then
    raise exception 'Somente administrador_principal (ou o servidor) pode alterar role ou permissions';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_prevent_self_role_escalation on public.profiles;
create trigger trg_profiles_prevent_self_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_self_role_escalation();

comment on function public.prevent_self_role_escalation() is
  'Bloqueia auto-promocao: nenhum usuario, mesmo dono da propria linha em profiles, pode mudar role/permissions sem ser administrador_principal ou o servidor (service role).';

-- =========================================================================
-- admin_logs: confirmando (sem alterar) que o painel nunca pode
-- alterar/apagar registros -- so existe policy de SELECT desde 0001_init.sql
-- (nenhuma policy "for update"/"for delete" foi criada de proposito), entao
-- RLS nega por padrao qualquer UPDATE/DELETE feito com a chave anon/de
-- sessao. Apenas o service role (que ignora RLS) grava novos registros,
-- feito pelas proprias server actions administrativas.
-- =========================================================================
