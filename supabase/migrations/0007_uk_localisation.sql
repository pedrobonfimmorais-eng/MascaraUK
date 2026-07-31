-- MascaraUK -- Prompt 7: conversao da loja para o publico do Reino Unido.
-- Adiciona colunas de endereco no formato britanico (linha 1/2, cidade,
-- condado opcional, postcode, pais) SEM remover as colunas antigas em
-- portugues/formato brasileiro, para nao quebrar dados ja existentes.
-- Os formularios (checkout e conta do cliente) passam a gravar apenas nas
-- colunas novas a partir desta migracao.

alter table public.addresses
  add column if not exists company_name text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists town_city text,
  add column if not exists county text,
  add column if not exists postcode text,
  add column if not exists delivery_instructions text;

comment on column public.addresses.street is
  'Coluna legada (formato brasileiro). Novos enderecos usam address_line1/address_line2/town_city/county/postcode.';
comment on column public.addresses.zip_code is
  'Coluna legada (CEP brasileiro). Novos enderecos usam postcode (formato britanico, ex.: SW1A 1AA).';

alter table public.addresses alter column country set default 'United Kingdom';

-- =========================================================================
-- Classificacao de propriedade intelectual dos produtos (rotulos em ingles
-- ja adicionados na migracao 0005 via o enum ip_classification -- nenhuma
-- mudanca de schema necessaria aqui, apenas nos textos exibidos).
-- =========================================================================

-- =========================================================================
-- Paises/regioes atendidos pela loja, editavel no painel
-- (store_settings.served_countries) e regras de entrega por regiao
-- (store_settings.shipping_rules ja existe -- passa a incluir "regions").
-- Nenhuma alteracao de schema e necessaria: store_settings ja e uma tabela
-- chave/valor (jsonb) generica.
-- =========================================================================
