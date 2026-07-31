-- Dados de demonstração — MascaraUK
-- Opcional: rode este arquivo apenas em ambiente de desenvolvimento para
-- visualizar a loja com produtos de exemplo. Todos os itens abaixo estão
-- marcados como "(Exemplo)" no nome para deixar claro que são dados fictícios
-- e devem ser substituídos pelo cadastro real do administrador.

insert into public.categories (name, slug, description, display_order) values
  ('Máscaras de Heróis', 'mascaras-de-herois', 'Máscaras inspiradas em super-heróis clássicos e modernos.', 1),
  ('Máscaras de Anime', 'mascaras-de-anime', 'Máscaras inspiradas em personagens de anime.', 2),
  ('Máscaras de Quadrinhos', 'mascaras-de-quadrinhos', 'Máscaras inspiradas em personagens de quadrinhos.', 3),
  ('Acessórios de Cosplay', 'acessorios-de-cosplay', 'Itens decorativos para completar sua fantasia.', 4)
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, base_price, sku, is_active, is_featured)
select
  '(Exemplo) Máscara de Herói Urbano',
  'exemplo-mascara-heroi-urbano',
  'Produto de demonstração. Substitua pelos produtos reais cadastrados no painel administrativo.',
  c.id,
  129.90,
  'DEMO-001',
  true,
  true
from public.categories c where c.slug = 'mascaras-de-herois'
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, base_price, sku, is_active, is_featured)
select
  '(Exemplo) Máscara Ninja Anime',
  'exemplo-mascara-ninja-anime',
  'Produto de demonstração. Substitua pelos produtos reais cadastrados no painel administrativo.',
  c.id,
  99.90,
  'DEMO-002',
  true,
  true
from public.categories c where c.slug = 'mascaras-de-anime'
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, base_price, sku, is_active, is_featured)
select
  '(Exemplo) Máscara Justiceiro Mascarado',
  'exemplo-mascara-justiceiro-mascarado',
  'Produto de demonstração. Substitua pelos produtos reais cadastrados no painel administrativo.',
  c.id,
  149.90,
  'DEMO-003',
  true,
  false
from public.categories c where c.slug = 'mascaras-de-quadrinhos'
on conflict (slug) do nothing;

insert into public.inventory (product_id, quantity)
select p.id, 25 from public.products p where p.sku like 'DEMO-%'
on conflict (product_id, variant_id) do nothing;
