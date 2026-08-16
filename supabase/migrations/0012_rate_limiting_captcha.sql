-- MascaraUK -- Prompt 10: infraestrutura de banco para limite de
-- tentativas (login, cadastro, recuperação de senha, contato, aceite de
-- convite administrativo). O CAPTCHA em si (Cloudflare Turnstile) é
-- verificado do lado do servidor Next.js (src/lib/turnstile.ts) contra a
-- API da Cloudflare -- nada relacionado a ele fica no banco.

create table public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  -- Nome curto do fluxo protegido: 'login' | 'signup' | 'password_reset' |
  -- 'contact' | 'admin_invite_accept' (ver src/lib/rate-limit.ts).
  action text not null,
  -- E-mail (sempre em minúsculas) ou outro identificador do alvo da
  -- tentativa. NUNCA uma senha, token de convite/redefinição ou token de
  -- CAPTCHA -- só o identificador de negócio.
  identifier text not null,
  -- IP de quem fez a requisição (pode ser nulo se não for possível
  -- determinar). Permite bloquear por IP independentemente do
  -- identificador, o que é o que impede alguém de travar permanentemente
  -- o e-mail de outra pessoa só repetindo tentativas contra ele.
  ip text,
  success boolean not null,
  created_at timestamptz not null default now()
);

comment on table public.rate_limit_events is
  'Tentativas em fluxos públicos sensíveis a bots/força-bruta (login, cadastro, recuperação de senha, contato, aceite de convite administrativo). Nunca contém senha, token ou segredo de CAPTCHA -- apenas identificador, IP e sucesso/falha. Sem policy de RLS: só o service role (servidor) lê/escreve.';

create index idx_rate_limit_events_action_identifier on public.rate_limit_events (action, identifier, created_at desc);
create index idx_rate_limit_events_action_ip on public.rate_limit_events (action, ip, created_at desc);
create index idx_rate_limit_events_created_at on public.rate_limit_events (created_at);

alter table public.rate_limit_events enable row level security;
-- De propósito, nenhuma policy é criada: com RLS habilitada e zero
-- policies, nem anon nem authenticated conseguem ler ou escrever nada
-- aqui -- só o service role (que ignora RLS) usado em
-- src/lib/rate-limit.ts.

-- =========================================================================
-- Retenção: apaga eventos com mais de 30 dias. Chamada automaticamente uma
-- fração das vezes a cada novo registro (ver src/lib/rate-limit.ts) para
-- que a limpeza não dependa só de uma extensão externa, e também agendada
-- via pg_cron quando essa extensão estiver disponível no projeto (o
-- Supabase permite habilitá-la pelo painel).
-- =========================================================================
create or replace function public.cleanup_old_rate_limit_events()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limit_events where created_at < now() - interval '30 days';
  delete from public.login_attempts where created_at < now() - interval '30 days';
$$;

comment on function public.cleanup_old_rate_limit_events() is
  'Retenção limitada: eventos de rate limit e tentativas de login têm no máximo 30 dias de histórico.';

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'cleanup_rate_limit_events_daily',
      '0 3 * * *',
      'select public.cleanup_old_rate_limit_events();'
    );
  end if;
end;
$$;
