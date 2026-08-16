# Publicação da loja

**Importante: este documento explica como publicar a loja — ele não afirma
que a loja já está publicada.** A publicação real depende de contas e
domínio que só o dono da loja pode criar (hospedagem, domínio, Supabase e
Stripe em modo de produção). Nenhuma dessas contas foi criada neste
repositório.

## 1. Escolher onde hospedar

Este projeto é um app Next.js padrão, então funciona em qualquer provedor
compatível (Vercel, Netlify, um servidor próprio com Node.js, etc.). O
exemplo abaixo usa a Vercel por ser a mais direta para projetos Next.js.

## 2. Preparar o ambiente de produção

1. Crie um **projeto Supabase separado** do que você usa em
   desenvolvimento (ver `CONFIGURACAO-SUPABASE.md`) — nunca reaproveite o
   projeto de testes para dados reais de clientes.
2. Rode todas as migrações (`supabase/migrations/0001` a `0006`) nesse
   projeto de produção.
3. Ative sua conta Stripe para produção e gere as chaves `sk_live_`/`pk_live_`
   (ver `CONFIGURACAO-STRIPE.md`).
4. Configure o webhook do Stripe apontando para o domínio final de produção.

## 3. Configurar as variáveis de ambiente no provedor de hospedagem

Cadastre todas as variáveis de `.env.example` diretamente no painel do seu
provedor de hospedagem (nunca envie um arquivo `.env.local` para o
servidor). Use os valores de **produção** (Supabase de produção, chaves
Stripe `_live_`, `NEXT_PUBLIC_SITE_URL` com o domínio final).

## 4. Publicar o código

```bash
git push origin main
```

Se estiver usando Vercel: conecte o repositório pelo painel da Vercel,
selecione a branch de produção e configure as variáveis de ambiente do
passo 3 lá. Cada push subsequente gera um novo deploy automaticamente.

## 5. Configurar o domínio

1. No painel do seu provedor de hospedagem, adicione o domínio (ex.:
   `www.sualoja.com.br`).
2. Siga as instruções do provedor para apontar o DNS do seu domínio para
   ele.
3. Atualize `NEXT_PUBLIC_SITE_URL` para o domínio final e refaça o deploy.

## 6. Criar o primeiro administrador em produção

Rode o script de criação do admin **apontando para o Supabase de produção**
(nunca para o de testes):

```bash
SUPABASE_URL=https://SEU-PROJETO-PRODUCAO.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=... \
ADMIN_SETUP_SECRET=... \
node scripts/create-admin.mjs
```

## 7. Testar uma compra real

Antes de divulgar a loja, faça **uma compra de verdade com valor baixo**
usando um cartão real (não um cartão de teste) para confirmar que todo o
fluxo — pagamento, e-mail de confirmação, aparecimento em `/admin/pedidos`
— funciona em produção. Cancele/reembolse esse pedido de teste depois.

## 8. Última conferência antes de divulgar

Percorra **todos os itens de `CHECKLIST-LANCAMENTO.md`** antes de anunciar a
loja publicamente — ele cobre desde as informações reais da loja até a
revisão jurídica das páginas legais.

## Status atual deste repositório

Nenhuma das contas de hospedagem/domínio/Supabase de produção/Stripe de
produção foi criada como parte deste trabalho — a publicação real depende
do dono da loja seguir os passos acima com suas próprias credenciais.
