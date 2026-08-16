-- MascaraUK — analytics, custos, lucro estimado, alertas e relatórios
-- Complementa 0001/0002/0003 sem remover nenhuma estrutura existente.

-- =========================================================================
-- PRODUTOS: custo interno (para lucro estimado)
-- =========================================================================
alter table public.products
  add column if not exists cost_price numeric(10, 2) check (cost_price >= 0);

comment on column public.products.cost_price is
  'Custo interno do produto, cadastrado pelo administrador. Usado apenas para estimar lucro/margem em /admin/analytics — nunca inventado quando ausente ("Custo não informado").';

-- =========================================================================
-- PEDIDOS: separa ambiente de teste do ambiente de produção
-- =========================================================================
alter table public.orders
  add column if not exists is_test boolean not null default false;

comment on column public.orders.is_test is
  'Marca pedidos criados com chaves de teste do Stripe. Nunca aparecem nos relatórios reais a menos que o administrador ative "Incluir dados de teste".';

create index if not exists idx_orders_is_test on public.orders (is_test);
create index if not exists idx_orders_created_at on public.orders (created_at);
create index if not exists idx_orders_user_id_created_at on public.orders (user_id, created_at);

-- =========================================================================
-- CUSTOS ADICIONAIS CONFIGURÁVEIS (taxa de pagamento, embalagem, frete, etc.)
-- =========================================================================
create table public.additional_costs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cost_type text not null default 'outro' check (cost_type in ('taxa_pagamento', 'embalagem', 'frete_medio', 'operacional', 'outro')),
  amount_type text not null check (amount_type in ('percentual', 'valor_fixo')),
  value numeric(10, 2) not null check (value >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.additional_costs is
  'Custos configuráveis pelo administrador (taxa do meio de pagamento, embalagem, frete médio, custo operacional, outras despesas) usados no cálculo do lucro bruto estimado.';

create trigger trg_additional_costs_updated_at
  before update on public.additional_costs
  for each row execute function public.set_updated_at();

-- =========================================================================
-- ANALYTICS: colunas adicionais no analytics_events (criado em 0001_init.sql)
-- =========================================================================
alter table public.analytics_events
  add column if not exists variant_id uuid references public.product_variants (id) on delete set null,
  add column if not exists order_id uuid references public.orders (id) on delete set null,
  add column if not exists quantity integer,
  add column if not exists value numeric(10, 2),
  add column if not exists currency text,
  add column if not exists device_type text check (device_type in ('desktop', 'mobile', 'tablet', 'desconhecido')),
  add column if not exists referrer_type text check (
    referrer_type in ('direto', 'pesquisa', 'rede_social', 'link_externo', 'campanha', 'email', 'desconhecido')
  ),
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists path text,
  add column if not exists is_test boolean not null default false;

comment on table public.analytics_events is
  'Eventos internos de comportamento (page_view, product_view, search, add_to_cart, begin_checkout, purchase, refund, etc.) usados pelo painel /admin/analytics. Nunca guarda dados de pagamento ou informações pessoais sensíveis.';
comment on column public.analytics_events.session_id is
  'Identificador anônimo de sessão (cookie), não é possível descobrir a identidade real do visitante a partir dele.';

create index if not exists idx_analytics_events_product_id on public.analytics_events (product_id);
create index if not exists idx_analytics_events_user_id on public.analytics_events (user_id);
create index if not exists idx_analytics_events_order_id on public.analytics_events (order_id);
create index if not exists idx_analytics_events_session_id on public.analytics_events (session_id);
create index if not exists idx_analytics_events_utm_campaign on public.analytics_events (utm_campaign);
create index if not exists idx_analytics_events_type_created_at on public.analytics_events (event_type, created_at);

-- =========================================================================
-- PESQUISAS INTERNAS
-- =========================================================================
create table public.search_queries (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  results_count integer not null default 0,
  session_id text,
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.search_queries is
  'Termos pesquisados na loja, usados para "termos mais pesquisados" e "pesquisas sem resultado". Não deve ser usada para registrar dados sensíveis digitados por engano.';

create index idx_search_queries_created_at on public.search_queries (created_at);
create index idx_search_queries_term on public.search_queries (term);

-- =========================================================================
-- CENTRAL DE ALERTAS
-- =========================================================================
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null,
  title text not null,
  description text not null,
  priority text not null default 'media' check (priority in ('baixa', 'media', 'alta', 'critica')),
  status text not null default 'novo' check (status in ('novo', 'lido', 'resolvido', 'ignorado')),
  related_link text,
  dedupe_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.alerts is
  'Central de alertas administrativos (estoque baixo, aumento de cancelamentos/reembolsos, queda de faturamento, produto sem custo, etc.). dedupe_key evita repetir o mesmo alerta em aberto sem necessidade.';

create unique index idx_alerts_dedupe_open on public.alerts (dedupe_key) where status in ('novo', 'lido');
create index idx_alerts_status on public.alerts (status);
create index idx_alerts_priority on public.alerts (priority);

create trigger trg_alerts_updated_at
  before update on public.alerts
  for each row execute function public.set_updated_at();

-- =========================================================================
-- AGENDAMENTO DE RELATÓRIOS (estrutura preparada — envio real fica para depois)
-- =========================================================================
create table public.report_schedules (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,
  frequency text not null check (frequency in ('diario', 'semanal', 'mensal')),
  recipients text[] not null default '{}',
  format text not null default 'csv' check (format in ('csv', 'xlsx', 'pdf')),
  send_time time not null default '08:00',
  is_active boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.report_schedules is
  'Preferências de relatórios agendados (diário/semanal/mensal). Guardada apenas como configuração — nenhum envio automático acontece até essa estrutura ser conectada a um job agendado.';

create trigger trg_report_schedules_updated_at
  before update on public.report_schedules
  for each row execute function public.set_updated_at();

-- =========================================================================
-- CONFIGURAÇÕES DE ANALYTICS (limiares editáveis pelo admin — nunca fixos no código)
-- =========================================================================
insert into public.store_settings (key, value) values
  ('analytics_thresholds', '{
    "high_value_customer_total_spent": 500,
    "inactive_customer_days": 90,
    "abandoned_cart_hours": 24,
    "low_stock_quantity": 5,
    "excess_stock_quantity": 100,
    "stalled_product_days": 60
  }')
on conflict (key) do nothing;

insert into public.store_settings (key, value) values
  ('tracking_integrations', '{
    "google_analytics_id": "",
    "google_analytics_enabled": false,
    "google_tag_manager_id": "",
    "google_tag_manager_enabled": false,
    "meta_pixel_id": "",
    "meta_pixel_enabled": false,
    "tiktok_pixel_id": "",
    "tiktok_pixel_enabled": false
  }')
on conflict (key) do nothing;

-- =========================================================================
-- ROW LEVEL SECURITY — novas tabelas
-- =========================================================================
alter table public.additional_costs enable row level security;
alter table public.search_queries enable row level security;
alter table public.alerts enable row level security;
alter table public.report_schedules enable row level security;

create policy "Somente admin gerencia custos adicionais" on public.additional_costs
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Somente admin lê pesquisas internas" on public.search_queries
  for select using (public.is_admin());

create policy "Somente admin gerencia alertas" on public.alerts
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Somente admin gerencia agendamentos de relatório" on public.report_schedules
  for all using (public.is_admin()) with check (public.is_admin());
