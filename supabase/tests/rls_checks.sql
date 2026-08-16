-- MascaraUK -- Consultas de verificacao de RLS (Prompt 6).
--
-- Como usar: rode cada bloco no SQL Editor do Supabase (ou via psql) DEPOIS
-- de aplicar todas as migracoes ate 0010_least_privilege_rls.sql, em um
-- projeto de teste (nao producao). Cada bloco simula uma sessao com
-- `set local role authenticated; set local request.jwt.claims = ...` para
-- testar as policies como o PostgREST/Supabase realmente as aplica.
-- Ajuste os UUIDs de exemplo para IDs reais do seu projeto de teste antes
-- de rodar (crie 2 clientes de teste e 1 conta "estoque" e 1 "atendimento"
-- via `npm run create-admin` + convite, ou insira diretamente via service
-- role em um projeto descartavel).
--
-- Resultado esperado de cada bloco esta comentado logo abaixo do SQL.

-- =========================================================================
-- 0) Papeis de teste esperados (crie antes de rodar os blocos abaixo)
-- =========================================================================
-- cliente_a  -> role 'cliente'
-- cliente_b  -> role 'cliente'
-- staff_estoque     -> role 'estoque'        (tem products.manage e inventory.manage)
-- staff_atendimento -> role 'atendimento'    (NAO tem products.manage nem inventory.manage)
-- admin_principal   -> role 'administrador_principal'

-- =========================================================================
-- 1) Visitante (sem sessao) le produtos e categorias ativos, mas nada mais
-- =========================================================================
set local role anon;

select id, name from public.products where is_active limit 5;
-- Esperado: retorna linhas (produtos ativos sao publicos).

select id, name from public.products where is_active = false limit 5;
-- Esperado: 0 linhas (RLS filtra produtos inativos para quem nao e admin).

-- =========================================================================
-- 2) Visitante NAO consegue editar produto
-- =========================================================================
set local role anon;

update public.products set name = 'Produto adulterado' where is_active limit 1;
-- Esperado: 0 linhas afetadas (UPDATE policy exige has_permission('products.manage'),
-- e anon nao tem sessao logo has_permission() retorna false). Sem erro visivel
-- ao PostgREST, mas nenhuma linha e alterada -- confirme com um SELECT logo
-- depois, fora da transacao de teste, que o nome nao mudou.

insert into public.products (name, slug, base_price)
values ('Produto forjado', 'produto-forjado-teste', 10.00);
-- Esperado: erro "new row violates row-level security policy for table products".

-- =========================================================================
-- 3) Cliente NAO consegue promover a propria conta
-- =========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub": "<uuid-do-cliente_a>", "role": "authenticated"}';

update public.profiles
set role = 'administrador_principal'
where id = '<uuid-do-cliente_a>';
-- Esperado: erro "Somente administrador_principal (ou o servidor) pode
-- alterar role ou permissions" (lancado pelo trigger
-- trg_profiles_prevent_self_role_escalation criado em 0010). Antes da
-- migracao 0010 esse UPDATE passava silenciosamente -- é exatamente a
-- lacuna que este prompt fechou.

update public.profiles set full_name = 'Nome Atualizado'
where id = '<uuid-do-cliente_a>';
-- Esperado: sucesso (1 linha) -- o cliente pode editar os proprios dados
-- que nao sejam role/permissions.

-- =========================================================================
-- 4) Cliente NAO consegue ler dados de outro cliente
-- =========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub": "<uuid-do-cliente_a>", "role": "authenticated"}';

select id, full_name, phone from public.profiles where id = '<uuid-do-cliente_b>';
-- Esperado: 0 linhas (policy de SELECT em profiles só permite auth.uid() = id ou admin).

select id, full_name from public.addresses where user_id = '<uuid-do-cliente_b>';
-- Esperado: 0 linhas (mesma logica em addresses).

select id, user_id from public.orders where user_id = '<uuid-do-cliente_b>';
-- Esperado: 0 linhas.

-- =========================================================================
-- 5) Equipe SEM a capacidade correta nao escreve no catalogo/estoque
-- (papel "atendimento" tem outras capacidades, mas nao products.manage
-- nem inventory.manage)
-- =========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub": "<uuid-do-staff_atendimento>", "role": "authenticated"}';

update public.products set name = 'Editado por atendimento' where is_active limit 1;
-- Esperado: 0 linhas afetadas -- has_permission('products.manage') e falso
-- para o papel 'atendimento'.

update public.inventory set quantity = 9999 where true limit 1;
-- Esperado: 0 linhas afetadas -- has_permission('inventory.manage') e falso
-- para 'atendimento'.

-- Mas a area que ele TEM permissao continua funcionando:
select id, status from public.messages limit 5;
-- Esperado: retorna linhas (has_permission cobre 'atendimento' -> messages.manage
-- via is_admin(), que ainda aceita qualquer papel de equipe para leitura).

-- =========================================================================
-- 6) Administrador autorizado (com products.manage) consegue editar catalogo
-- =========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub": "<uuid-do-staff_estoque>", "role": "authenticated"}';

update public.products set is_featured = true where is_active limit 1;
-- Esperado: 1 linha afetada -- papel 'estoque' tem products.manage.

update public.inventory set quantity = quantity + 1 where true limit 1;
-- Esperado: 1 linha afetada -- papel 'estoque' tem inventory.manage.

-- =========================================================================
-- 7) Usuario sem permissao recebe acesso negado ao gerenciar administradores
-- =========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub": "<uuid-do-staff_estoque>", "role": "authenticated"}';

insert into public.admin_invites (email, role, token, expires_at)
values ('novo@exemplo.com', 'gerente', 'token-teste-123', now() + interval '2 days');
-- Esperado: erro de RLS -- admin_invites so aceita is_admin_principal(),
-- e 'estoque' nao e administrador_principal.

-- =========================================================================
-- 8) admin_logs nunca pode ser alterado/apagado pelo painel, nem por admin_principal
-- =========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub": "<uuid-do-admin_principal>", "role": "authenticated"}';

update public.admin_logs set details = '{}'::jsonb where true limit 1;
-- Esperado: erro de RLS -- nenhuma policy "for update" existe em admin_logs
-- (nem para admin_principal), entao RLS nega por padrao.

delete from public.admin_logs where true limit 1;
-- Esperado: erro de RLS -- mesma razao (sem policy "for delete").

select count(*) from public.admin_logs;
-- Esperado: sucesso (has_permission de leitura via is_admin() -> qualquer
-- papel de equipe pode LER o historico, mas nenhum pode alterar/apagar).

-- =========================================================================
-- 9) service role (servidor) continua com acesso total, sem passar por RLS
-- =========================================================================
-- Nao testavel via SQL Editor comum (o SQL Editor conecta como
-- postgres/superuser, que ja ignora RLS). Para validar isso na aplicacao:
-- confirme que scripts/create-admin.mjs e as Server Actions em
-- src/lib/actions/admins.ts (que usam createAdminClient()) continuam
-- funcionando normalmente apos esta migracao -- elas usam
-- SUPABASE_SERVICE_ROLE_KEY, cujo JWT tem role 'service_role', e por isso
-- passam pela condicao `auth.role() <> 'service_role'` do trigger de
-- profiles sem serem bloqueadas.
