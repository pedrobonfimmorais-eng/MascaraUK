-- MascaraUK -- Prompt 9: MFA (TOTP) real via Supabase Auth, substituindo o
-- placeholder anterior. Complementa 0001-0010 sem quebrar dados existentes.
--
-- public.admin_2fa (criada em 0005_security_rbac.sql) guardava um "secret"
-- proprio e uma coluna booleana "enabled" que nunca era, de fato, usada
-- para bloquear nada -- exatamente o anti-padrao que este prompt pede para
-- eliminar ("nao considere um campo booleano no banco como prova de que o
-- 2FA foi realizado"). O estado real de MFA agora vem exclusivamente do
-- proprio Supabase Auth (schema auth, tabela auth.mfa_factors -- nao
-- gerenciada por nos), consultado em tempo real via
-- supabase.auth.mfa.getAuthenticatorAssuranceLevel() /
-- supabase.auth.admin.mfa.listFactors() (ver src/lib/mfa.ts). Nenhum
-- secret de TOTP jamais passa pelas nossas proprias tabelas.
drop table if exists public.admin_2fa;

-- =========================================================================
-- Políticas sensíveis passam a exigir aal2 (segundo fator OK nesta sessão),
-- não apenas o papel administrador_principal. auth.jwt() ->> 'aal' lê a
-- claim real do JWT da sessão, escrita pelo próprio GoTrue quando o desafio
-- de MFA é concluído -- não é um valor que esta aplicação define ou pode
-- forjar.
-- =========================================================================

-- admin_invites: criar um novo administrador é a ação administrativa mais
-- sensível do sistema (dá acesso privilegiado a uma conta nova).
drop policy if exists "Somente admin_principal gerencia convites" on public.admin_invites;
create policy "Somente admin_principal com aal2 gerencia convites" on public.admin_invites
  for all
  using (public.is_admin_principal() and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2')
  with check (public.is_admin_principal() and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2');

-- profiles: mudar role/permissions de qualquer conta agora também exige
-- aal2 na sessão de quem está fazendo a mudança (service role continua
-- isento -- usado por scripts/create-admin.mjs e pelas Server Actions de
-- convite/gestão, nunca por uma sessão de navegador).
create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.permissions is distinct from old.permissions)
     and auth.role() <> 'service_role'
     and (
       not public.is_admin_principal()
       or coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'
     ) then
    raise exception 'Somente administrador_principal com 2FA verificado nesta sessão (aal2) -- ou o servidor -- pode alterar role ou permissions';
  end if;
  return new;
end;
$$;

comment on function public.prevent_self_role_escalation() is
  'Bloqueia auto-promocao e qualquer mudanca de role/permissions feita sem aal2: nem o dono da linha, nem um administrador_principal cuja sessao atual nao completou o desafio de MFA, conseguem alterar essas colunas -- so o servidor (service role) ou uma sessao aal2 de administrador_principal.';
