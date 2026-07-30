-- MascaraUK -- Prompt 7: moeda padrao da loja passa de BRL para GBP.
-- Ajusta os defaults de coluna (novas linhas passam a nascer em GBP) e a
-- configuracao ja salva em store_settings. NAO converte valores numericos
-- existentes (nenhuma regra de conversao de BRL->GBP foi definida) -- so
-- ajusta o codigo da moeda usado a partir de agora.

alter table public.orders alter column currency set default 'GBP';
alter table public.payments alter column currency set default 'GBP';
alter table public.refunds alter column currency set default 'GBP';

update public.store_settings set value = '"GBP"' where key = 'store_currency';

insert into public.store_settings (key, value)
values ('served_countries', '["United Kingdom"]')
on conflict (key) do nothing;
