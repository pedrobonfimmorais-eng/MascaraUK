# Configuração do Stripe

O Stripe processa todos os pagamentos da loja. Esta loja nunca guarda o
número completo de um cartão — isso é feito inteiramente pelo Stripe.

## 1. Criar a conta

1. Acesse [stripe.com](https://stripe.com) e crie uma conta.
2. Você começa automaticamente em **modo de teste** (um interruptor "Test
   mode" no canto superior do painel) — use-o para todo o desenvolvimento.

## 2. Copiar as chaves de teste

No painel: **Developers → API keys**.

| Variável no `.env.local` | Onde encontrar |
| --- | --- |
| `STRIPE_SECRET_KEY` | "Secret key" (começa com `sk_test_` em modo de teste) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | "Publishable key" (começa com `pk_test_`) |

A chave secreta (`sk_...`) nunca deve aparecer no navegador nem em código de
cliente — ela só é usada em rotas de servidor. A chave pública (`pk_...`) é
segura para o navegador, por isso o prefixo `NEXT_PUBLIC_`.

## 3. Configurar o webhook (obrigatório)

O webhook é o que confirma um pagamento de verdade — a página de sucesso do
Stripe, sozinha, **não** confirma nada.

### Em desenvolvimento (sua máquina)

1. Instale a [Stripe CLI](https://stripe.com/docs/stripe-cli).
2. Rode:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
3. O comando imprime um valor `whsec_...` — copie para `STRIPE_WEBHOOK_SECRET`
   no `.env.local` e reinicie `npm run dev`.
4. Deixe este comando rodando enquanto testa compras localmente.

### Em produção

1. No painel Stripe (já com as chaves de **produção**, modo "Test mode"
   desligado): **Developers → Webhooks → Add endpoint**.
2. URL do endpoint: `https://SEU-DOMINIO/api/stripe/webhook`.
3. Eventos a assinar: pelo menos `checkout.session.completed`,
   `checkout.session.expired`, `payment_intent.payment_failed`,
   `charge.refunded` (ou selecione "receive all events" se preferir).
4. Depois de criado, clique no endpoint e copie o "Signing secret"
   (`whsec_...`) para `STRIPE_WEBHOOK_SECRET` nas variáveis de ambiente do
   seu provedor de hospedagem (nunca no `.env.local` que você comita).

## 4. Testar pagamentos (modo de teste)

Use os [cartões de teste do Stripe](https://stripe.com/docs/testing):

- **Aprovado**: `4242 4242 4242 4242`, validade futura qualquer, CVC qualquer.
- **Recusado**: `4000 0000 0000 0002`.
- **Requer autenticação extra**: `4000 0025 0000 3155`.

Todo pedido criado com uma chave `sk_test_...` é marcado internamente como
"pedido de teste" e fica fora dos relatórios de analytics por padrão.

## 5. Ir para produção

1. No painel Stripe, ative sua conta para produção (dados da empresa,
   conta bancária) em **Settings → Activate your account**.
2. Desligue o "Test mode" e copie as chaves de **produção**
   (`sk_live_.../pk_live_...`).
3. Configure o webhook de produção (passo 3 acima) e coloque as chaves e o
   `STRIPE_WEBHOOK_SECRET` de produção nas variáveis de ambiente do seu
   provedor de hospedagem — **nunca** misture chaves de teste e de produção
   no mesmo ambiente.
4. Em `/admin/configuracoes` (aba "Pagamentos"), confirme que o status
   mostra "Funcionando" (não "Modo de teste") antes de divulgar a loja.

## 6. Reembolsos

Reembolsos podem ser feitos pelo painel administrativo
(`/admin/pedidos/[id]` → "Reembolsar") ou diretamente no painel do Stripe.
De qualquer uma das duas formas, o status do pedido só muda quando o
webhook confirma o reembolso — nunca instantaneamente na tela.
