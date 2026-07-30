-- MascaraUK — Prompt 6: papéis de administração, 2FA, convites de admin,
-- mensagens de contato e classificação de propriedade intelectual dos produtos.
-- Complementa 0001-0004 sem remover estruturas existentes.

-- =========================================================================
-- PAPÉIS DE ADMINISTRAÇÃO (recria o enum com a lista completa de níveis)
-- =========================================================================
-- O único papel administrativo existente ("administrador") é promovido para
-- "administrador_principal" na migração, para que nenhuma conta perca acesso.
alter type public.user_role rename to user_role_old;

create type public.user_role as enum (
  'cliente',
  'estoque',
  'atendimento',
  'gerente',
  'administrador',
  'administrador_principal'
);

alter table public.profiles
  alter column role drop default,
  alter column role type public.user_role using (
    case role::text
      when 'administrador' then 'administrador_principal'
      when 'cliente' then 'cliente'
      else 'cliente'
    end
  )::public.user_role,
  alter column role set default 'cliente';

drop type public.user_role_old;

comment on column public.profiles.role is
  'Nível de acesso: cliente, estoque, atendimento, gerente, administrador (permissões concedidas em profiles.permissions) ou administrador_principal (acesso total, incl. segurança/pagamentos/criação de admins).';

-- Permissões extras concedidas a contas "administrador" (ex.: {"pedidos": true,
-- "produtos": true}). Ignorado para os demais papéis, cujas permissões são
-- fixas por papel (ver src/lib/permissions.ts). Nunca confiar em valores
-- vindos do cliente para preencher esta coluna — somente administrador_principal
-- pode alterá-la, e sempre via server action.
alter table public.profiles
  add column if not exists permissions jsonb not null default '{}'::jsonb;

-- =========================================================================
-- CONVITES DE ADMINISTRADOR (uso único, nunca uma tela pública de cadastro)
-- =========================================================================
create table if not exists public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role public.user_role not null,
  permissions jsonb not null default '{}'::jsonb,
  token text not null unique,
  invited_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_invites_token on public.admin_invites (token);

-- =========================================================================
-- AUTENTICAÇÃO EM DUAS ETAPAS (TOTP) PARA CONTAS ADMINISTRATIVAS
-- =========================================================================
create table if not exists public.admin_2fa (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  secret text not null,
  enabled boolean not null default false,
  recovery_codes text[] not null default '{}',
  recovery_codes_used_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- MENSAGENS DE CONTATO (formulário /contato -> painel /admin/mensagens)
-- =========================================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text not null,
  message text not null,
  order_number text,
  status text not null default 'nova'
    check (status in ('nova', 'em_atendimento', 'aguardando_cliente', 'resolvida', 'spam')),
  admin_note text,
  handled_by uuid references public.profiles(id) on delete set null,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_messages_status on public.messages (status);
create index if not exists idx_messages_created_at on public.messages (created_at desc);

-- =========================================================================
-- CLASSIFICAÇÃO DE PROPRIEDADE INTELECTUAL DO PRODUTO
-- =========================================================================
-- Nunca marcar como "oficialmente licenciado" por padrão — o valor inicial é
-- o mais conservador (genérico/inspirado) até que um administrador confirme
-- explicitamente a licença oficial.
create type public.ip_classification as enum (
  'produto_original_loja',
  'produto_generico_inspirado',
  'produto_oficialmente_licenciado',
  'produto_terceiro_autorizado'
);

alter table public.products
  add column if not exists ip_classification public.ip_classification not null default 'produto_generico_inspirado';

-- =========================================================================
-- FUNÇÃO AUXILIAR: qualquer conta da equipe (não só administrador_principal)
-- =========================================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('estoque', 'atendimento', 'gerente', 'administrador', 'administrador_principal')
  );
$$;

create or replace function public.is_admin_principal()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'administrador_principal'
  );
$$;

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================
alter table public.admin_invites enable row level security;
alter table public.admin_2fa enable row level security;
alter table public.messages enable row level security;

create policy "Somente admin_principal gerencia convites" on public.admin_invites
  for all using (public.is_admin_principal()) with check (public.is_admin_principal());

create policy "Cada admin vê/gerencia o próprio 2FA" on public.admin_2fa
  for all using (auth.uid() = user_id or public.is_admin_principal())
  with check (auth.uid() = user_id or public.is_admin_principal());

create policy "Qualquer pessoa pode enviar uma mensagem de contato" on public.messages
  for insert with check (true);

create policy "Somente equipe lê/gerencia mensagens" on public.messages
  for select using (public.is_admin());

create policy "Somente equipe atualiza mensagens" on public.messages
  for update using (public.is_admin());

-- Mensagens nunca podem ser apagadas pelo painel (histórico permanente) —
-- de propósito, nenhuma policy "for delete" é criada.
