# Checklist de Lançamento

Marque cada item antes de divulgar a loja para clientes reais. Itens
marcados "(manual)" dependem de uma decisão ou ação do dono da loja — não
podem ser verificados automaticamente pelo código.

## Checklist técnico

- [ ] `npm run build` roda sem erros.
- [ ] `npm run lint` roda sem erros.
- [ ] Migrações `0001` a `0006` rodadas no projeto Supabase de **produção**
      (não no de testes) — ver `CONFIGURACAO-SUPABASE.md`.
- [ ] Variáveis de ambiente de produção preenchidas no provedor de
      hospedagem (nunca em um arquivo `.env.local` enviado ao servidor).
- [ ] Chaves do Stripe trocadas de `sk_test_`/`pk_test_` para
      `sk_live_`/`pk_live_` (manual).
- [ ] Webhook do Stripe de produção configurado e testado (manual, ver
      `CONFIGURACAO-STRIPE.md`).
- [ ] `/admin/configuracoes` → aba "Pagamentos" mostra status "Funcionando"
      (não "Modo de teste" nem "Não configurado").
- [ ] `RESEND_API_KEY`/`EMAIL_PROVIDER_API_KEY` configurada — e-mails de
      pedido realmente chegam (manual: enviar um pedido de teste e conferir
      a caixa de entrada).
- [ ] `NEXT_PUBLIC_SITE_URL` aponta para o domínio final, com `https://`.
- [ ] Domínio configurado e DNS propagado (manual).
- [ ] Primeiro administrador principal criado via `npm run create-admin`
      apontando para o Supabase de produção (nunca com credenciais de
      teste).
- [ ] Nenhuma credencial, chave ou senha aparece em nenhum arquivo
      versionado no Git (`git grep` por `sk_live`, `service_role`, etc. não
      encontra nada fora de `.env.local`, que está no `.gitignore`).
- [ ] Modo de manutenção testado uma vez (ativar, confirmar que a loja
      pública fica bloqueada e que `/admin` continua acessível, desativar).
- [ ] Uma compra real de baixo valor foi concluída com sucesso em produção
      e depois cancelada/reembolsada (manual, ver `PUBLICACAO.md`).

## Checklist de conteúdo e configuração da loja

- [ ] Nome da loja, e-mail e telefone de contato reais preenchidos em
      `/admin/configuracoes` (aba "Informações da loja") — nunca os valores
      de exemplo do código.
- [ ] Logo e cores da marca configurados na aba "Aparência".
- [ ] Ao menos um produto real cadastrado, com preço, estoque, imagens e
      descrição reais (não produtos de exemplo do `seed.sql`).
- [ ] Regras de frete (frete grátis a partir de quanto, valores e prazos das
      opções de entrega) configuradas na aba "Entrega" com valores reais da
      sua transportadora.
- [ ] Classificação de propriedade intelectual de cada produto revisada
      (produto próprio / genérico inspirado / oficialmente licenciado /
      terceiro autorizado) — nunca marcado como "oficialmente licenciado"
      sem uma licença real por trás.
- [ ] Páginas institucionais e legais revisadas por um profissional
      (Política de Privacidade, Política de Cookies, Termos de Uso,
      Política de Entrega, Trocas e Devoluções) — o texto inicial gerado
      automaticamente **não é aconselhamento jurídico definitivo** (manual).
- [ ] Página "Sobre" com a história e missão reais da loja (não o texto
      genérico inicial, se você quiser personalizá-lo mais).

## Checklist de segurança

- [ ] Ver `SEGURANCA.md` por completo.
- [ ] Cada pessoa da equipe tem sua própria conta de administrador (nunca
      uma conta compartilhada) com o papel/permissões mínimos necessários
      para o trabalho dela.
- [ ] Senhas de todas as contas administrativas são únicas e fortes
      (manual).
- [ ] `ADMIN_SETUP_SECRET` foi definido com um valor forte antes de criar o
      primeiro admin, e não precisa mais ser mantido em segredo depois
      disso (ele só é usado uma vez).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` e `STRIPE_SECRET_KEY` existem **apenas**
      nas variáveis de ambiente do servidor, nunca em código ou no
      navegador.

## Checklist final do projeto

- [ ] Backup do banco de dados de produção testado com sucesso (ver
      `BACKUP-E-RESTAURACAO.md`).
- [ ] Ambiente de desenvolvimento/teste continua separado do de produção —
      nenhum teste futuro deve usar as chaves de produção.
- [ ] Equipe sabe onde encontrar cada guia: `GUIA-INICIANTE.md` (passo a
      passo geral), `CONFIGURACAO-STRIPE.md`, `CONFIGURACAO-SUPABASE.md`,
      `PUBLICACAO.md`, `SEGURANCA.md`, `BACKUP-E-RESTAURACAO.md`.
- [ ] `README.md` revisado e atualizado com qualquer customização feita
      além do que este projeto já entrega.

Só divulgue o link da loja publicamente depois de todos os itens acima
estarem marcados.
