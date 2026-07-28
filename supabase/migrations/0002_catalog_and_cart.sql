-- MascaraUK — extensões de catálogo, variações, avaliações, cupons e entrega
-- Complementa 0001_init.sql sem remover nenhuma estrutura existente.

-- =========================================================================
-- PRODUTOS: busca, badges (novidade/mais vendido), oferta relâmpago
-- =========================================================================
alter table public.products
  add column if not exists short_description text,
  add column if not exists keywords text[] not null default '{}',
  add column if not exists theme text,
  add column if not exists character_name text,
  add column if not exists material text,
  add column if not exists is_new boolean not null default false,
  add column if not exists flash_sale_price numeric(10, 2) check (flash_sale_price >= 0),
  add column if not exists flash_sale_ends_at timestamptz,
  add column if not exists dimensions text,
  add column if not exists package_contents text,
  add column if not exists safety_info text,
  add column if not exists delivery_estimate_days_min integer,
  add column if not exists delivery_estimate_days_max integer,
  add column if not exists sold_count integer not null default 0,
  add column if not exists avg_rating numeric(2, 1) not null default 0,
  add column if not exists rating_count integer not null default 0;

comment on column public.products.flash_sale_price is
  'Preço da oferta relâmpago. Só é válido enquanto flash_sale_ends_at estiver no futuro.';
comment on column public.products.avg_rating is
  'Média das avaliações aprovadas. Mantida automaticamente pelo trigger trg_reviews_update_product_rating.';

create index if not exists idx_products_keywords on public.products using gin (keywords);
create index if not exists idx_products_is_new on public.products (is_new);
create index if not exists idx_products_sold_count on public.products (sold_count);
create index if not exists idx_products_avg_rating on public.products (avg_rating);

-- =========================================================================
-- VARIAÇÕES: preço/estoque/imagem próprios, tamanho/cor/modelo, status
-- =========================================================================
alter table public.product_variants
  add column if not exists sale_price numeric(10, 2) check (sale_price >= 0),
  add column if not exists image_url text,
  add column if not exists size text,
  add column if not exists color text,
  add column if not exists model text,
  add column if not exists is_active boolean not null default true;

comment on column public.product_variants.sale_price is
  'Preço promocional próprio da variação; quando nulo, usa o preço promocional do produto (compare_at_price).';

-- =========================================================================
-- AVALIAÇÕES: nome do cliente (snapshot, não depende de RLS de profiles) e compra confirmada
-- =========================================================================
alter table public.reviews
  add column if not exists customer_name text,
  add column if not exists is_verified_purchase boolean not null default false;

comment on column public.reviews.customer_name is
  'Nome do cliente no momento da avaliação. Guardado aqui (e não lido via join em profiles) porque a RLS de profiles não permite leitura pública dos dados de outros usuários.';

-- Mantém products.avg_rating/rating_count sincronizados com as avaliações aprovadas.
create or replace function public.update_product_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_product_id uuid;
begin
  target_product_id := coalesce(new.product_id, old.product_id);

  update public.products p
  set
    avg_rating = coalesce((
      select round(avg(r.rating)::numeric, 1)
      from public.reviews r
      where r.product_id = target_product_id and r.is_approved
    ), 0),
    rating_count = (
      select count(*) from public.reviews r
      where r.product_id = target_product_id and r.is_approved
    )
  where p.id = target_product_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_reviews_update_product_rating on public.reviews;
create trigger trg_reviews_update_product_rating
  after insert or update or delete on public.reviews
  for each row execute function public.update_product_rating();

-- =========================================================================
-- CUPONS: frete grátis e restrição por produtos/categorias
-- =========================================================================
alter table public.coupons
  add column if not exists free_shipping boolean not null default false,
  add column if not exists allowed_product_ids uuid[] not null default '{}',
  add column if not exists allowed_category_ids uuid[] not null default '{}';

-- =========================================================================
-- CONFIGURAÇÕES DE ENTREGA (regras editáveis pelo admin, sem valores fixos no código)
-- =========================================================================
insert into public.store_settings (key, value) values
  ('shipping_rules', '{
    "free_shipping_threshold": 250,
    "default_rate": 19.90,
    "default_estimate_days_min": 5,
    "default_estimate_days_max": 10,
    "options": [
      { "id": "standard", "label": "Entrega padrão", "rate": 19.90, "estimate_days_min": 5, "estimate_days_max": 10 },
      { "id": "express", "label": "Entrega expressa", "rate": 34.90, "estimate_days_min": 2, "estimate_days_max": 4 }
    ]
  }')
on conflict (key) do nothing;

-- =========================================================================
-- BANNERS: texto do botão (o link já existia em link_url)
-- =========================================================================
alter table public.banners
  add column if not exists button_text text;

-- =========================================================================
-- CARRINHOS: cupom aplicado e dados de entrega selecionados
-- =========================================================================
alter table public.carts
  add column if not exists coupon_code text,
  add column if not exists shipping_zip_code text,
  add column if not exists shipping_option_id text;

