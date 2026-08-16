# Guia do Iniciante — MascaraUK

Este guia assume que você **nunca programou antes**. Siga os passos na ordem,
um de cada vez. Cada passo diz exatamente o comando a digitar, onde digitar,
o que esperar de resultado e o que fazer se der errado.

Você vai precisar de:
- Um computador (Windows, Mac ou Linux).
- Uma conta gratuita no [Supabase](https://supabase.com).
- Uma conta gratuita no [Stripe](https://stripe.com).
- Uma conta gratuita no [Resend](https://resend.com) (para enviar e-mails).

---

## Parte 1 — Preparar o computador

**Passo 1. Instalar o Node.js**
Onde: no seu computador, fora do terminal.
O que fazer: acesse [nodejs.org](https://nodejs.org) e baixe a versão "LTS". Instale normalmente (Avançar, Avançar, Concluir).
Resultado esperado: o instalador termina sem erro.
Se der erro: reinicie o computador e tente instalar de novo.

**Passo 2. Abrir o terminal**
Onde: no seu computador.
O que fazer: no Windows, abra o "PowerShell" (menu Iniciar → digite "PowerShell"). No Mac, abra o "Terminal" (Spotlight → digite "Terminal").
Resultado esperado: uma janela preta/escura com texto aparece.

**Passo 3. Confirmar que o Node.js foi instalado**
Onde: no terminal.
Comando:
```bash
node --version
```
Resultado esperado: aparece algo como `v20.x.x` ou `v22.x.x`.
Se der erro ("comando não encontrado"): feche o terminal, abra de novo (às vezes é preciso reiniciar o terminal depois de instalar o Node), e tente de novo.

**Passo 4. Baixar o projeto**
Onde: no terminal.
Comando (troque `SEU-USUARIO/MascaraUK` pelo endereço real do repositório que você recebeu):
```bash
git clone https://github.com/SEU-USUARIO/MascaraUK.git
```
Resultado esperado: uma pasta chamada `MascaraUK` aparece no seu computador.
Se der erro: confirme que digitou o endereço certo e que tem o Git instalado (baixe em [git-scm.com](https://git-scm.com) se necessário).

**Passo 5. Entrar na pasta do projeto**
Comando:
```bash
cd MascaraUK
```
Resultado esperado: o terminal muda para mostrar que você está dentro da pasta `MascaraUK`.

**Passo 6. Instalar as dependências do projeto**
Comando:
```bash
npm install
```
Resultado esperado: várias linhas de texto passam e, no final, aparece algo como `added XXX packages`. Pode demorar alguns minutos.
Se der erro: confirme que está dentro da pasta `MascaraUK` (passo 5) e tente `npm install` de novo.

---

## Parte 2 — Configurar o Supabase (banco de dados)

Siga o arquivo **`CONFIGURACAO-SUPABASE.md`** para os passos 7 a 14 (criar o
projeto, copiar as chaves, rodar as migrações). Volte para cá depois.

**Passo 15. Criar o arquivo de variáveis de ambiente**
Comando:
```bash
cp .env.example .env.local
```
Resultado esperado: um novo arquivo `.env.local` aparece na pasta.
Se der erro no Windows (comando `cp` não existe): use `copy .env.example .env.local` no lugar.

**Passo 16. Preencher o `.env.local` com os dados do Supabase**
Onde: abra o arquivo `.env.local` em um editor de texto simples (Bloco de Notas, TextEdit, ou VS Code).
O que fazer: cole os valores que você copiou do painel Supabase em `CONFIGURACAO-SUPABASE.md` nas linhas `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.
Resultado esperado: as três linhas ficam preenchidas, sem espaços extras.

---

## Parte 3 — Rodar a loja pela primeira vez

**Passo 17. Iniciar o servidor**
Comando:
```bash
npm run dev
```
Resultado esperado: aparece uma linha como `Local: http://localhost:3000`.
Se der erro: leia a mensagem de erro — geralmente ela diz qual variável do `.env.local` está faltando ou errada.

**Passo 18. Abrir a loja no navegador**
Onde: no navegador (Chrome, Firefox, etc.).
O que fazer: acesse `http://localhost:3000`.
Resultado esperado: a página inicial da loja aparece.

**Passo 19. Deixar o servidor rodando**
Não feche a janela do terminal enquanto estiver testando a loja — fechar o terminal desliga o servidor. Para parar o servidor de propósito, clique na janela do terminal e pressione `Ctrl + C`.

---

## Parte 4 — Criar o primeiro administrador

**Passo 20. Definir o segredo de configuração**
Onde: no arquivo `.env.local`.
O que fazer: na linha `ADMIN_SETUP_SECRET=`, digite qualquer texto longo e único (ex.: `configuracao-inicial-2026-xyz`). Salve o arquivo.

**Passo 21. Parar e reiniciar o servidor**
Comando (na janela do terminal onde `npm run dev` está rodando):
```
Ctrl + C
```
depois:
```bash
npm run dev
```
Resultado esperado: o servidor reinicia lendo o novo `.env.local`.

**Passo 22. Rodar o script de criação do administrador**
Onde: abra um **novo** terminal (deixe o outro rodando o `npm run dev`), entre na pasta do projeto (`cd MascaraUK`) e rode:
```bash
npm run create-admin
```
Resultado esperado: o script pergunta seu e-mail, nome completo e senha, um de cada vez.
Se der erro "ADMIN_SETUP_SECRET não definido": confirme que salvou o `.env.local` no passo 20 antes de rodar o comando.

**Passo 23. Preencher os dados pedidos**
Digite seu e-mail, aperte Enter. Digite seu nome completo, aperte Enter. Digite uma senha com pelo menos 8 caracteres, aperte Enter.
Resultado esperado: a mensagem `Administrador principal criado com sucesso.` aparece.

**Passo 24. Fazer login no painel**
Onde: no navegador.
O que fazer: acesse `http://localhost:3000/login` e entre com o e-mail e senha do passo 23.
Resultado esperado: você é redirecionado e consegue acessar `http://localhost:3000/admin`.

---

## Parte 5 — Configurar o Stripe (pagamentos)

Siga o arquivo **`CONFIGURACAO-STRIPE.md`** para os passos 25 a 30 (criar
conta, copiar chaves, configurar o webhook). Volte para cá depois.

**Passo 31. Preencher as chaves do Stripe no `.env.local`**
Onde: no arquivo `.env.local`.
O que fazer: preencha `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` e `STRIPE_WEBHOOK_SECRET` com os valores de teste.
Resultado esperado: as três linhas ficam preenchidas.

**Passo 32. Reiniciar o servidor**
Comando: `Ctrl + C` na janela do `npm run dev`, depois `npm run dev` de novo.

---

## Parte 6 — Configurar o envio de e-mails (opcional, mas recomendado)

**Passo 33. Criar uma conta no Resend**
Onde: no navegador, acesse [resend.com](https://resend.com) e crie uma conta gratuita.

**Passo 34. Copiar a chave de API**
Onde: painel Resend → "API Keys" → "Create API Key".
O que fazer: copie o valor gerado (começa com `re_`).

**Passo 35. Preencher a chave no `.env.local`**
Onde: no arquivo `.env.local`, na linha `RESEND_API_KEY=`.
Resultado esperado: e-mails de pedido, senha alterada, etc. passam a ser enviados de verdade (antes disso, eles só aparecem no terminal onde `npm run dev` está rodando, o que já é suficiente para testar sem enviar e-mail real).

---

## Parte 7 — Testar uma compra completa

**Passo 36. Iniciar o encaminhamento de webhooks do Stripe (se ainda não fez isso em `CONFIGURACAO-STRIPE.md`)**
Onde: em um terceiro terminal, na pasta do projeto.
Comando:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
Resultado esperado: aparece `Ready! You are using Stripe API Version...` e um código `whsec_...` — copie esse código para `STRIPE_WEBHOOK_SECRET` no `.env.local` se ainda não copiou, e reinicie o servidor (passo 32).

**Passo 37. Adicionar um produto ao carrinho**
Onde: no navegador, em `http://localhost:3000`.
O que fazer: navegue até um produto e clique em "Adicionar ao carrinho".
Resultado esperado: o contador do carrinho no topo da página aumenta.

**Passo 38. Finalizar a compra com um cartão de teste**
Onde: no navegador.
O que fazer: vá até `/checkout`, preencha os dados e, na tela de pagamento do Stripe, use o cartão de teste `4242 4242 4242 4242`, qualquer data futura e qualquer CVC.
Resultado esperado: você é redirecionado para a página de pedido confirmado.

**Passo 39. Conferir o pedido no painel**
Onde: no navegador, em `http://localhost:3000/admin/pedidos`.
Resultado esperado: o pedido de teste aparece na lista, com o pagamento confirmado.

---

## Parte 8 — Publicar a loja de verdade

**Passo 40. Seguir o guia de publicação**
Antes de divulgar a loja para clientes reais, siga **`PUBLICACAO.md`** e depois confira **todos os itens** de **`CHECKLIST-LANCAMENTO.md`** — eles cobrem trocar as chaves de teste por chaves reais, preencher as informações reais da loja, revisar as páginas legais com um profissional e configurar o domínio definitivo.

---

## O que fazer se algo der muito errado

- Leia a mensagem de erro exibida no terminal — na maioria das vezes ela diz exatamente qual variável de ambiente ou configuração está faltando.
- Confirme que `.env.local` está preenchido e que você reiniciou o servidor (`Ctrl + C` e `npm run dev` de novo) depois de qualquer alteração nele.
- Consulte `SEGURANCA.md`, `CONFIGURACAO-STRIPE.md` e `CONFIGURACAO-SUPABASE.md` para detalhes de cada integração.
- Nada aqui apaga dados por engano — os comandos deste guia apenas instalam, configuram e rodam o projeto.
