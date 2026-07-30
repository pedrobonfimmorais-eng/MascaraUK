-- MascaraUK — pedidos, pagamentos, Stripe, estoque, rastreamento e reembolsos
-- Complementa 0001_init.sql e 0002_catalog_and_cart.sql sem remover estruturas existentes.
--
-- Esta migração:
--   1. Separa claramente status do PAGAMENTO e status do PEDIDO (envio).
--   2. Guarda uma cópia (snapshot) dos dados do produto dentro de cada item do pedido.
--   3. Adiciona histórico de pedido (não editável), movimentações de estoque,
--      eventos de webhook do Stripe (idempotência), reembolsos e tokens de
--      acompanhamento para pedidos de visitante.
--   4. Adiciona funções de banco para reservar/confirmar/devolver estoque de
--      forma atômica (evita a venda da última unidade duas vezes ao mesmo tempo).

-- =========================================================================
-- STATUS DO PAGAMENTO (recria o enum com a lista completa exigida)
-- =========================================================================
alter type public.payment_status rename to payment_status_old;

create type public.payment_status as enum (
  'aguardando_pagamento',
  'processando',
  'pago',
  'recusado',
  'expirado',
  'cancelado',
  'reembolsado_parcial',
  'reembolsado'
);

alter table public.payments
  alter column status drop default,
  alter column status type public.payment_status using (
    case status::text
      when 'pendente' then 'aguardando_pagamento'
      when 'pago' then 'pago'
      when 'falhou' then 'recusado'
      when 'reembolsado' then 'reembolsado'
      else 'aguardando_pagamento'
    end
  )::public.payment_status,
  alter column status set default 'aguardando_pagamento';

drop type public.payment_status_old;

-- =========================================================================
-- STATUS DO PEDIDO (envio/preparação — separado do pagamento)
-- =========================================================================
alter type public.order_status rename to order_status_old;

create type public.order_status as enum (
  'recebido',
  'em_preparacao',
  'pronto_para_envio',
  'enviado',
  'entregue',
  'cancelado',
  'devolucao_solicitada',
  'devolvido'
);

alter table public.orders
  alter column status drop default,
  alter column status type public.order_status using (
    case status::text
      when 'aguardando_pagamento' then 'recebido'
      when 'pagamento_confirmado' then 'recebido'
      when 'em_preparacao' then 'em_preparacao'
      when 'enviado' then 'enviado'
      when 'entregue' then 'entregue'
      when 'cancelado' then 'cancelado'
      when 'reembolsado' then 'cancelado'
      else 'recebido'
    end
  )::public.order_status,
  alter column status set default 'recebido';

drop type public.order_status_old;

comment on column public.orders.status is
  'Status de ENVIO/preparação do pedido. Nunca deve ser confundido com o status de pagamento (ver orders.payment_status e payments.status).';

-- =========================================================================
-- MOTIVOS DE MOVIMENTAÇÃO DE ESTOQUE
-- =========================================================================
create type public.stock_movement_reason as enum (
  'venda_confirmada',
  'cancelamento',
  'reembolso',
  'devolucao',
  'ajuste_manual'
);

-- =========================================================================
-- PERFIS: nome/sobrenome, consentimento de promoções, aceite de termos, nascimento opcional
-- =========================================================================
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists marketing_opt_in boolean not null default false,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists birth_date date;

comment on column public.profiles.marketing_opt_in is
  'Consentimento opcional para receber promoções por e-mail. Sempre nasce desmarcado (false) no cadastro público.';

-- Atualiza o trigger de novo usuário (criado em 0001_init.sql) para também
-- gravar nome/sobrenome, consentimento de marketing e aceite de termos —
-- todos lidos de auth.users.raw_user_meta_data, nunca de um campo de "role"
-- (a função continua fixando role = 'cliente' para toda conta pública).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, first_name, last_name, marketing_opt_in, terms_accepted_at, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    coalesce((new.raw_user_meta_data ->> 'marketing_opt_in')::boolean, false),
    case when (new.raw_user_meta_data ->> 'terms_accepted') = 'true' then now() else null end,
    'cliente'
  );
  return new;
end;
$$;

-- =========================================================================
-- ENDEREÇOS: telefone, referência, endereço de entrega/cobrança padrão
-- =========================================================================
alter table public.addresses
  add column if not exists phone text,
  add column if not exists reference text,
  add column if not exists is_shipping_default boolean not null default false,
  add column if not exists is_billing_default boolean not null default false;

comment on column public.addresses.is_default is
  'Endereço principal exibido no painel da conta. Independente das marcações de entrega/cobrança abaixo.';

-- =========================================================================
-- CONFIGURAÇÃO DO NÚMERO PÚBLICO DO PEDIDO (ex.: PED-000001, configurável)
-- =========================================================================
create sequence if not exists public.order_number_seq start 1;

insert into public.store_settings (key, value) values
  ('order_number_format', '{"prefix": "PED-", "padding": 6}')
on conflict (key) do nothing;

-- Moeda da loja — lida por src/lib/store-settings.ts. Preparado para BRL,
-- mas nunca hardcoded diretamente no código de cobrança do Stripe.
insert into public.store_settings (key, value) values
  ('store_currency', '"BRL"')
on conflict (key) do nothing;

create or replace function public.generate_order_number()
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  fmt jsonb;
  prefix text := 'PED-';
  padding int := 6;
  next_value bigint;
begin
  select value into fmt from public.store_settings where key = 'order_number_format';

  if fmt is not null then
    prefix := coalesce(fmt ->> 'prefix', prefix);
    padding := coalesce((fmt ->> 'padding')::int, padding);
  end if;

  next_value := nextval('public.order_number_seq');
  return prefix || lpad(next_value::text, padding, '0');
end;
$$;

-- =========================================================================
-- PEDIDOS: status de pagamento separado, nomes, snapshots, rastreamento
-- =========================================================================
alter table public.orders
  add column if not exists payment_status public.payment_status not null default 'aguardando_pagamento',
  add column if not exists customer_first_name text,
  add column if not exists customer_last_name text,
  add column if not exists billing_address_snapshot jsonb,
  add column if not exists internal_notes text,
  add column if not exists tracking_carrier text,
  add column if not exists tracking_code text,
  add column if not exists tracking_url text,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists stock_confirmed boolean not null default false,
  add column if not exists is_guest_order boolean not null default false;

comment on column public.orders.notes is 'Observação do CLIENTE (visível para ele mesmo), preenchida no checkout.';
comment on column public.orders.internal_notes is 'Observações internas do administrador. Não é exibida ao cliente.';
comment on column public.orders.stock_confirmed is
  'Marca se o estoque já foi baixado (venda confirmada) para este pedido, evitando reduzir o estoque duas vezes com webhooks duplicados.';

create index if not exists idx_orders_payment_status on public.orders (payment_status);
create index if not exists idx_orders_expires_at on public.orders (expires_at);

-- =========================================================================
-- ITENS DO PEDIDO: snapshot completo do produto no momento da compra
-- =========================================================================
alter table public.order_items
  add column if not exists sku_snapshot text,
  add column if not exists image_url_snapshot text,
  add column if not exists previous_unit_price numeric(10, 2),
  add column if not exists discount_amount numeric(10, 2) not null default 0;

comment on column public.order_items.previous_unit_price is
  'Preço "de/por" no momento da compra, para exibir o desconto mesmo se o produto mudar de preço depois.';

-- =========================================================================
-- PAGAMENTOS: liga ao PaymentIntent, marca erro genérico para o cliente
-- =========================================================================
alter table public.payments
  add column if not exists failure_message text;

-- =========================================================================
-- REEMBOLSOS
-- =========================================================================
create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  payment_id uuid references public.payments (id) on delete set null,
  stripe_refund_id text,
  amount numeric(10, 2) not null check (amount > 0),
  currency text not null default 'BRL',
  reason text,
  internal_note text,
  status text not null default 'pendente' check (status in ('pendente', 'concluido', 'falhou')),
  restocked boolean not null default false,
  admin_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.refunds is
  'Registro de reembolsos totais/parciais. O valor é confirmado automaticamente após o webhook do Stripe (charge.refunded).';

create index idx_refunds_order_id on public.refunds (order_id);

-- =========================================================================
-- HISTÓRICO DO PEDIDO (não editável — somente inserção)
-- =========================================================================
create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  event_type text not null,
  previous_status text,
  new_status text,
  note text,
  admin_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.order_events is
  'Histórico completo e não editável do pedido: criação, pagamento, mudanças de status, rastreio, cancelamento, reembolso e observações internas.';

create index idx_order_events_order_id on public.order_events (order_id, created_at);

-- =========================================================================
-- MOVIMENTAÇÕES DE ESTOQUE
-- =========================================================================
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  order_number text,
  previous_quantity integer not null,
  changed_quantity integer not null,
  new_quantity integer not null,
  reason public.stock_movement_reason not null,
  created_at timestamptz not null default now()
);

comment on table public.stock_movements is
  'Histórico de todas as reduções/devoluções de estoque, sempre vinculado ao pedido e ao motivo.';

create index idx_stock_movements_product_id on public.stock_movements (product_id, variant_id);
create index idx_stock_movements_order_id on public.stock_movements (order_id);

-- =========================================================================
-- EVENTOS DE WEBHOOK DO STRIPE (idempotência — nunca processa 2x)
-- =========================================================================
create table public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.stripe_webhook_events is
  'Guarda o ID de cada evento do Stripe já processado (event.id). Uma inserção com o mesmo ID falha por conflito de chave primária, o que impede processar o mesmo webhook duas vezes.';

-- =========================================================================
-- TOKENS DE ACOMPANHAMENTO PARA PEDIDOS DE VISITANTE
-- =========================================================================
create table public.order_access_tokens (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  token text not null unique,
  email text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.order_access_tokens is
  'Token seguro enviado por e-mail para o visitante acompanhar o pedido sem conta, evitando que alguém descubra pedidos apenas testando números sequenciais.';

create index idx_order_access_tokens_order_id on public.order_access_tokens (order_id);

-- =========================================================================
-- FUNÇÕES: reserva/confirmação/devolução de estoque (atômicas)
-- =========================================================================

-- Reserva estoque de forma atômica: só reserva se houver saldo disponível
-- (quantity - reserved_quantity >= p_qty). A cláusula WHERE dentro do UPDATE
-- é avaliada com bloqueio de linha pelo Postgres, então duas compras
-- simultâneas da última unidade nunca conseguem reservar a mesma peça.
create or replace function public.reserve_stock(
  p_product_id uuid,
  p_variant_id uuid,
  p_qty integer
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  updated_id uuid;
begin
  if p_variant_id is null then
    update public.inventory
    set reserved_quantity = reserved_quantity + p_qty
    where product_id = p_product_id
      and variant_id is null
      and (quantity - reserved_quantity) >= p_qty
    returning id into updated_id;
  else
    update public.inventory
    set reserved_quantity = reserved_quantity + p_qty
    where product_id = p_product_id
      and variant_id = p_variant_id
      and (quantity - reserved_quantity) >= p_qty
    returning id into updated_id;
  end if;

  return updated_id is not null;
end;
$$;

-- Libera uma reserva (pagamento expirado/cancelado antes de confirmar).
create or replace function public.release_stock(
  p_product_id uuid,
  p_variant_id uuid,
  p_qty integer
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_variant_id is null then
    update public.inventory
    set reserved_quantity = greatest(0, reserved_quantity - p_qty)
    where product_id = p_product_id and variant_id is null;
  else
    update public.inventory
    set reserved_quantity = greatest(0, reserved_quantity - p_qty)
    where product_id = p_product_id and variant_id = p_variant_id;
  end if;
end;
$$;

-- Confirma a venda: baixa a reserva E a quantidade real, e registra o
-- histórico de estoque. Chamada uma única vez por item (o chamador garante
-- isso checando orders.stock_confirmed antes de chamar).
create or replace function public.confirm_stock_sale(
  p_product_id uuid,
  p_variant_id uuid,
  p_qty integer,
  p_order_id uuid,
  p_order_number text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  prev_qty integer;
  final_qty integer;
begin
  if p_variant_id is null then
    update public.inventory
    set quantity = greatest(0, quantity - p_qty),
        reserved_quantity = greatest(0, reserved_quantity - p_qty)
    where product_id = p_product_id and variant_id is null
    returning quantity + p_qty, quantity into prev_qty, final_qty;
  else
    update public.inventory
    set quantity = greatest(0, quantity - p_qty),
        reserved_quantity = greatest(0, reserved_quantity - p_qty)
    where product_id = p_product_id and variant_id = p_variant_id
    returning quantity + p_qty, quantity into prev_qty, final_qty;
  end if;

  if prev_qty is not null then
    insert into public.stock_movements
      (product_id, variant_id, order_id, order_number, previous_quantity, changed_quantity, new_quantity, reason)
    values
      (p_product_id, p_variant_id, p_order_id, p_order_number, prev_qty, -p_qty, final_qty, 'venda_confirmada');
  end if;
end;
$$;

-- Devolve estoque ao cancelar/reembolsar (quando o produto pode voltar a
-- ser vendido). Não usa 'reserved_quantity' pois a venda já havia sido
-- confirmada antes do cancelamento.
create or replace function public.return_stock_to_inventory(
  p_product_id uuid,
  p_variant_id uuid,
  p_qty integer,
  p_order_id uuid,
  p_order_number text,
  p_reason public.stock_movement_reason
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  prev_qty integer;
  final_qty integer;
begin
  if p_variant_id is null then
    update public.inventory
    set quantity = quantity + p_qty
    where product_id = p_product_id and variant_id is null
    returning quantity - p_qty, quantity into prev_qty, final_qty;
  else
    update public.inventory
    set quantity = quantity + p_qty
    where product_id = p_product_id and variant_id = p_variant_id
    returning quantity - p_qty, quantity into prev_qty, final_qty;
  end if;

  if prev_qty is not null then
    insert into public.stock_movements
      (product_id, variant_id, order_id, order_number, previous_quantity, changed_quantity, new_quantity, reason)
    values
      (p_product_id, p_variant_id, p_order_id, p_order_number, prev_qty, p_qty, final_qty, p_reason);
  end if;
end;
$$;

-- =========================================================================
-- TENTATIVAS DE LOGIN (proteção contra força bruta)
-- =========================================================================
create table public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  success boolean not null,
  created_at timestamptz not null default now()
);

comment on table public.login_attempts is
  'Registro de tentativas de login usado para bloquear temporariamente um e-mail após várias falhas seguidas (ver src/lib/actions/auth.ts). Acessado somente pelo service role.';

create index idx_login_attempts_email_created_at on public.login_attempts (email, created_at desc);

alter table public.login_attempts enable row level security;
-- Nenhuma política pública: somente o service role (que ignora RLS) acessa esta tabela.

-- =========================================================================
-- ROW LEVEL SECURITY — novas tabelas
-- =========================================================================
alter table public.refunds enable row level security;
alter table public.order_events enable row level security;
alter table public.stock_movements enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.order_access_tokens enable row level security;

-- refunds: cliente vê os reembolsos dos próprios pedidos; admin vê tudo.
-- Escrita somente via service role (webhook/ações administrativas).
create policy "Cliente vê os reembolsos dos próprios pedidos" on public.refunds
  for select using (
    public.is_admin() or exists (
      select 1 from public.orders o where o.id = refunds.order_id and o.user_id = auth.uid()
    )
  );

-- order_events: cliente vê o histórico dos próprios pedidos; admin vê tudo.
create policy "Cliente vê o histórico dos próprios pedidos" on public.order_events
  for select using (
    public.is_admin() or exists (
      select 1 from public.orders o where o.id = order_events.order_id and o.user_id = auth.uid()
    )
  );

-- stock_movements: somente admin.
create policy "Somente admin lê movimentações de estoque" on public.stock_movements
  for select using (public.is_admin());

-- stripe_webhook_events / order_access_tokens: nenhuma política de leitura
-- pública — somente o service role (que ignora RLS) acessa estas tabelas.

-- =========================================================================
-- orders / order_items: garantir que RLS também cobre payment_status
-- =========================================================================
comment on column public.orders.payment_status is
  'Status do PAGAMENTO (separado do status de envio). Só muda via webhook do Stripe ou ação administrativa autenticada.';
