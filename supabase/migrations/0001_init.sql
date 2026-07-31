-- MascaraUK — schema inicial
-- Loja virtual de máscaras de heróis, anime, quadrinhos e acessórios de cosplay.
-- Este arquivo cria toda a estrutura de base: tipos, tabelas, índices,
-- triggers e políticas de RLS (Row Level Security).

-- =========================================================================
-- EXTENSÕES
-- =========================================================================
create extension if not exists "pgcrypto";

-- =========================================================================
-- TIPOS (ENUMS)
-- =========================================================================
create type public.user_role as enum ('cliente', 'administrador');

create type public.order_status as enum (
  'aguardando_pagamento',
  'pagamento_confirmado',
  'em_preparacao',
  'enviado',
  'entregue',
  'cancelado',
  'reembolsado'
);

create type public.payment_status as enum (
  'pendente',
  'pago',
  'falhou',
  'reembolsado'
);

create type public.discount_type as enum ('percentual', 'valor_fixo');

-- =========================================================================
-- FUNÇÃO UTILITÁRIA: updated_at automático
-- =========================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================================
-- PERFIS DE USUÁRIO (estende auth.users)
-- =========================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role public.user_role not null default 'cliente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Dados de perfil e função (cliente/administrador) de cada usuário autenticado.';
comment on column public.profiles.role is
  'Nunca é definida pelo próprio usuário no cadastro público. Somente alterada diretamente no banco por um administrador.';

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria automaticamente um perfil "cliente" para todo novo usuário do Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', 'cliente');
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- ENDEREÇOS
-- =========================================================================
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text,
  recipient_name text not null,
  zip_code text not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state text not null,
  country text not null default 'BR',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_addresses_user_id on public.addresses (user_id);

create trigger trg_addresses_updated_at
  before update on public.addresses
  for each row execute function public.set_updated_at();

-- =========================================================================
-- CATEGORIAS E ABAS DO MENU
-- =========================================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  parent_id uuid references public.categories (id) on delete set null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_categories_slug on public.categories (slug);
create index idx_categories_parent_id on public.categories (parent_id);

create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create table public.menu_tabs (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  href text,
  category_id uuid references public.categories (id) on delete set null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.menu_tabs is
  'Abas configuráveis do menu principal, controladas pelo administrador.';

-- =========================================================================
-- PRODUTOS
-- =========================================================================
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  category_id uuid references public.categories (id) on delete set null,
  base_price numeric(10, 2) not null check (base_price >= 0),
  compare_at_price numeric(10, 2) check (compare_at_price >= 0),
  sku text unique,
  weight_grams integer,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.products is
  'Catálogo de produtos: principalmente máscaras de heróis, anime e quadrinhos, além de acessórios de cosplay e itens decorativos. Sem armas reais ou itens perigosos — apenas itens decorativos, colecionáveis e de cosplay.';

create index idx_products_slug on public.products (slug);
create index idx_products_category_id on public.products (category_id);
create index idx_products_is_active on public.products (is_active);

create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  alt_text text,
  display_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_product_images_product_id on public.product_images (product_id);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  value text not null,
  sku text unique,
  price_adjustment numeric(10, 2) not null default 0,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.product_variants is
  'Variações do produto, por exemplo Tamanho: P/M/G ou Cor: Vermelho/Azul.';

create index idx_product_variants_product_id on public.product_variants (product_id);

-- =========================================================================
-- ESTOQUE
-- =========================================================================
create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  updated_at timestamptz not null default now(),
  unique (product_id, variant_id)
);

comment on table public.inventory is
  'Controle de estoque por produto (e variação, quando houver). Atualizado pelo administrador.';

create trigger trg_inventory_updated_at
  before update on public.inventory
  for each row execute function public.set_updated_at();

-- =========================================================================
-- CARRINHOS
-- =========================================================================
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint carts_owner_check check (user_id is not null or session_id is not null)
);

create index idx_carts_user_id on public.carts (user_id);
create index idx_carts_session_id on public.carts (session_id);

create trigger trg_carts_updated_at
  before update on public.carts
  for each row execute function public.set_updated_at();

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(10, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_cart_items_cart_id on public.cart_items (cart_id);

create trigger trg_cart_items_updated_at
  before update on public.cart_items
  for each row execute function public.set_updated_at();

-- =========================================================================
-- PEDIDOS
-- =========================================================================
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references public.profiles (id) on delete set null,
  status public.order_status not null default 'aguardando_pagamento',
  subtotal numeric(10, 2) not null default 0,
  discount_total numeric(10, 2) not null default 0,
  shipping_total numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  currency text not null default 'BRL',
  coupon_code text,
  shipping_address_snapshot jsonb,
  customer_email text not null,
  customer_name text not null,
  customer_phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_orders_user_id on public.orders (user_id);
create index idx_orders_status on public.orders (status);
create index idx_orders_order_number on public.orders (order_number);

create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name_snapshot text not null,
  variant_label_snapshot text,
  unit_price numeric(10, 2) not null,
  quantity integer not null check (quantity > 0),
  total numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create index idx_order_items_order_id on public.order_items (order_id);

-- =========================================================================
-- PAGAMENTOS (integração futura com Stripe)
-- =========================================================================
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null default 'stripe',
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  status public.payment_status not null default 'pendente',
  amount numeric(10, 2) not null,
  currency text not null default 'BRL',
  paid_at timestamptz,
  raw_response jsonb,
  created_at timestamptz not null default now()
);

create index idx_payments_order_id on public.payments (order_id);
create index idx_payments_stripe_checkout_session_id on public.payments (stripe_checkout_session_id);

-- =========================================================================
-- CUPONS E PROMOÇÕES
-- =========================================================================
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type public.discount_type not null,
  value numeric(10, 2) not null check (value >= 0),
  min_order_value numeric(10, 2),
  max_uses integer,
  used_count integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  type public.discount_type not null,
  value numeric(10, 2) not null check (value >= 0),
  category_id uuid references public.categories (id) on delete cascade,
  product_id uuid references public.products (id) on delete cascade,
  is_active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- AVALIAÇÕES
-- =========================================================================
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text,
  comment text,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index idx_reviews_product_id on public.reviews (product_id);

-- =========================================================================
-- CONFIGURAÇÕES DA LOJA (nome, logo, cores, fontes, redes sociais, etc.)
-- =========================================================================
create table public.store_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.store_settings is
  'Configurações editáveis pelo administrador: nome da loja, logo, favicon, cores, fontes, redes sociais, dados de contato, textos do rodapé e da home. Chave/valor em JSON para permitir personalização futura sem alterar o schema.';

create trigger trg_store_settings_updated_at
  before update on public.store_settings
  for each row execute function public.set_updated_at();

insert into public.store_settings (key, value) values
  ('store_name', '"MascaraUK"'),
  ('logo_url', 'null'),
  ('favicon_url', 'null'),
  ('primary_color', '"#7c3aed"'),
  ('secondary_color', '"#111827"'),
  ('font_family', '"Geist"'),
  ('contact_email', '"contato@mascarauk.example"'),
  ('contact_phone', '"+55 11 90000-0000"'),
  ('social_links', '{"instagram": "", "facebook": "", "tiktok": "", "youtube": ""}'),
  ('footer_text', '"Loja especializada em máscaras de heróis, anime e cosplay."'),
  ('home_hero_title', '"Vista o seu personagem favorito"'),
  ('home_hero_subtitle', '"Máscaras de heróis, anime, quadrinhos e desenhos, além de acessórios de cosplay."');

-- =========================================================================
-- BANNERS
-- =========================================================================
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text not null,
  link_url text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- PÁGINAS PERSONALIZADAS (ex.: políticas, termos, editáveis pelo admin)
-- =========================================================================
create table public.custom_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  content text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_custom_pages_updated_at
  before update on public.custom_pages
  for each row execute function public.set_updated_at();

insert into public.custom_pages (slug, title, content) values
  ('politica-de-privacidade', 'Política de Privacidade', 'Conteúdo de exemplo. Substitua pelo texto oficial da loja.'),
  ('politica-de-cookies', 'Política de Cookies', 'Conteúdo de exemplo. Substitua pelo texto oficial da loja.'),
  ('termos-de-uso', 'Termos de Uso', 'Conteúdo de exemplo. Substitua pelo texto oficial da loja.'),
  ('politica-de-entrega', 'Política de Entrega', 'Conteúdo de exemplo. Substitua pelo texto oficial da loja.'),
  ('trocas-e-devolucoes', 'Trocas e Devoluções', 'Conteúdo de exemplo. Substitua pelo texto oficial da loja.');

-- =========================================================================
-- REGISTROS ADMINISTRATIVOS (auditoria)
-- =========================================================================
create table public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index idx_admin_logs_admin_id on public.admin_logs (admin_id);

-- =========================================================================
-- ANALYTICS
-- =========================================================================
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  session_id text,
  user_id uuid references public.profiles (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_analytics_events_event_type on public.analytics_events (event_type);
create index idx_analytics_events_created_at on public.analytics_events (created_at);

-- =========================================================================
-- FUNÇÃO AUXILIAR: usuário atual é administrador?
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
    where id = auth.uid() and role = 'administrador'
  );
$$;

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.categories enable row level security;
alter table public.menu_tabs enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.coupons enable row level security;
alter table public.promotions enable row level security;
alter table public.reviews enable row level security;
alter table public.store_settings enable row level security;
alter table public.banners enable row level security;
alter table public.custom_pages enable row level security;
alter table public.admin_logs enable row level security;
alter table public.analytics_events enable row level security;

-- profiles
create policy "Usuário lê o próprio perfil" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "Usuário atualiza o próprio perfil" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

-- addresses
create policy "Usuário gerencia os próprios endereços" on public.addresses
  for all using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

-- categories (leitura pública, escrita só admin)
create policy "Categorias ativas são públicas" on public.categories
  for select using (is_active or public.is_admin());
create policy "Somente admin gerencia categorias" on public.categories
  for insert with check (public.is_admin());
create policy "Somente admin atualiza categorias" on public.categories
  for update using (public.is_admin());
create policy "Somente admin remove categorias" on public.categories
  for delete using (public.is_admin());

-- menu_tabs
create policy "Abas ativas são públicas" on public.menu_tabs
  for select using (is_active or public.is_admin());
create policy "Somente admin gerencia abas" on public.menu_tabs
  for insert with check (public.is_admin());
create policy "Somente admin atualiza abas" on public.menu_tabs
  for update using (public.is_admin());
create policy "Somente admin remove abas" on public.menu_tabs
  for delete using (public.is_admin());

-- products
create policy "Produtos ativos são públicos" on public.products
  for select using (is_active or public.is_admin());
create policy "Somente admin cadastra produtos" on public.products
  for insert with check (public.is_admin());
create policy "Somente admin atualiza produtos" on public.products
  for update using (public.is_admin());
create policy "Somente admin remove produtos" on public.products
  for delete using (public.is_admin());

-- product_images
create policy "Imagens de produtos ativos são públicas" on public.product_images
  for select using (
    public.is_admin() or exists (
      select 1 from public.products p
      where p.id = product_images.product_id and p.is_active
    )
  );
create policy "Somente admin gerencia imagens" on public.product_images
  for insert with check (public.is_admin());
create policy "Somente admin atualiza imagens" on public.product_images
  for update using (public.is_admin());
create policy "Somente admin remove imagens" on public.product_images
  for delete using (public.is_admin());

-- product_variants
create policy "Variações de produtos ativos são públicas" on public.product_variants
  for select using (
    public.is_admin() or exists (
      select 1 from public.products p
      where p.id = product_variants.product_id and p.is_active
    )
  );
create policy "Somente admin gerencia variações" on public.product_variants
  for insert with check (public.is_admin());
create policy "Somente admin atualiza variações" on public.product_variants
  for update using (public.is_admin());
create policy "Somente admin remove variações" on public.product_variants
  for delete using (public.is_admin());

-- inventory (leitura pública para exibir disponibilidade; escrita só admin)
create policy "Estoque é público para leitura" on public.inventory
  for select using (true);
create policy "Somente admin gerencia estoque" on public.inventory
  for insert with check (public.is_admin());
create policy "Somente admin atualiza estoque" on public.inventory
  for update using (public.is_admin());
create policy "Somente admin remove estoque" on public.inventory
  for delete using (public.is_admin());

-- carts / cart_items (dono do carrinho, autenticado ou convidado por session_id)
create policy "Dono gerencia o próprio carrinho" on public.carts
  for all using (auth.uid() = user_id or public.is_admin() or (user_id is null and session_id is not null))
  with check (auth.uid() = user_id or public.is_admin() or (user_id is null and session_id is not null));

create policy "Dono gerencia os itens do próprio carrinho" on public.cart_items
  for all using (
    public.is_admin() or exists (
      select 1 from public.carts c
      where c.id = cart_items.cart_id
        and (c.user_id = auth.uid() or (c.user_id is null and c.session_id is not null))
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from public.carts c
      where c.id = cart_items.cart_id
        and (c.user_id = auth.uid() or (c.user_id is null and c.session_id is not null))
    )
  );

-- orders / order_items (cliente vê os próprios; criação só via servidor com service role)
create policy "Cliente vê os próprios pedidos" on public.orders
  for select using (auth.uid() = user_id or public.is_admin());
create policy "Somente admin atualiza pedidos" on public.orders
  for update using (public.is_admin());

create policy "Cliente vê os itens dos próprios pedidos" on public.order_items
  for select using (
    public.is_admin() or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

-- payments (somente o dono do pedido e o admin podem ver; escrita via service role)
create policy "Cliente vê os pagamentos dos próprios pedidos" on public.payments
  for select using (
    public.is_admin() or exists (
      select 1 from public.orders o
      where o.id = payments.order_id and o.user_id = auth.uid()
    )
  );

-- coupons (leitura pública somente de cupons ativos; escrita só admin)
create policy "Cupons ativos são públicos" on public.coupons
  for select using (is_active or public.is_admin());
create policy "Somente admin gerencia cupons" on public.coupons
  for insert with check (public.is_admin());
create policy "Somente admin atualiza cupons" on public.coupons
  for update using (public.is_admin());
create policy "Somente admin remove cupons" on public.coupons
  for delete using (public.is_admin());

-- promotions
create policy "Promoções ativas são públicas" on public.promotions
  for select using (is_active or public.is_admin());
create policy "Somente admin gerencia promoções" on public.promotions
  for insert with check (public.is_admin());
create policy "Somente admin atualiza promoções" on public.promotions
  for update using (public.is_admin());
create policy "Somente admin remove promoções" on public.promotions
  for delete using (public.is_admin());

-- reviews
create policy "Avaliações aprovadas são públicas" on public.reviews
  for select using (is_approved or auth.uid() = user_id or public.is_admin());
create policy "Cliente autenticado cria avaliação" on public.reviews
  for insert with check (auth.uid() = user_id);
create policy "Dono ou admin atualiza avaliação" on public.reviews
  for update using (auth.uid() = user_id or public.is_admin());
create policy "Dono ou admin remove avaliação" on public.reviews
  for delete using (auth.uid() = user_id or public.is_admin());

-- store_settings (leitura pública, escrita só admin)
create policy "Configurações da loja são públicas para leitura" on public.store_settings
  for select using (true);
create policy "Somente admin atualiza configurações" on public.store_settings
  for insert with check (public.is_admin());
create policy "Somente admin edita configurações" on public.store_settings
  for update using (public.is_admin());

-- banners
create policy "Banners ativos são públicos" on public.banners
  for select using (is_active or public.is_admin());
create policy "Somente admin gerencia banners" on public.banners
  for insert with check (public.is_admin());
create policy "Somente admin atualiza banners" on public.banners
  for update using (public.is_admin());
create policy "Somente admin remove banners" on public.banners
  for delete using (public.is_admin());

-- custom_pages
create policy "Páginas publicadas são públicas" on public.custom_pages
  for select using (is_published or public.is_admin());
create policy "Somente admin gerencia páginas" on public.custom_pages
  for insert with check (public.is_admin());
create policy "Somente admin atualiza páginas" on public.custom_pages
  for update using (public.is_admin());
create policy "Somente admin remove páginas" on public.custom_pages
  for delete using (public.is_admin());

-- admin_logs (somente admin)
create policy "Somente admin lê os registros administrativos" on public.admin_logs
  for select using (public.is_admin());

-- analytics_events (somente admin lê; inserção via service role)
create policy "Somente admin lê analytics" on public.analytics_events
  for select using (public.is_admin());
