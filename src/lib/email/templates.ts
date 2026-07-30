import "server-only";
import { formatCurrency } from "@/lib/utils";

/**
 * Portuguese e-mail templates for every order-lifecycle notification. Each
 * function returns { subject, html } for use with sendEmail(). Kept in one
 * file, in Portuguese, per the project's i18n rule ("mantenha os textos no
 * sistema central de tradução") — the *content structure* here is data-only
 * (order numbers, prices, addresses), so translating the store to English
 * later only requires swapping these copy strings, not the surrounding code.
 *
 * Note: account e-mails (confirmação de cadastro, verificação de e-mail,
 * recuperação de senha) are sent directly by Supabase Auth, not by this
 * module — customize their copy in Supabase Dashboard → Authentication →
 * Email Templates (see README).
 */

export interface OrderEmailItem {
  name: string;
  variantLabel: string | null;
  quantity: number;
  unitPrice: number;
  imageUrl: string | null;
}

export interface OrderEmailAddress {
  recipientName: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  items: OrderEmailItem[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  total: number;
  currency: string;
  address: OrderEmailAddress | null;
  deliveryEstimate: string | null;
  trackingUrl: string;
}

const STORE_NAME = "MascaraUK";

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
            <tr>
              <td style="background-color:#111827;padding:20px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:bold;">${STORE_NAME}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="font-size:20px;margin:0 0 16px;color:#111827;">${title}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#f9fafb;color:#6b7280;font-size:12px;">
                Esta é uma mensagem automática sobre o seu pedido na ${STORE_NAME}. Em caso de dúvidas, responda este e-mail ou entre em contato pelo nosso site.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function itemsTable(items: OrderEmailItem[], currency: string): string {
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:14px;">
            ${item.name}${item.variantLabel ? ` — ${item.variantLabel}` : ""}<br/>
            <span style="color:#6b7280;">Qtd: ${item.quantity} × ${formatCurrency(item.unitPrice, currency)}</span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:right;">
            ${formatCurrency(item.unitPrice * item.quantity, currency)}
          </td>
        </tr>`
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">${rows}</table>`;
}

function totalsTable(data: OrderEmailData): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
      <tr><td style="padding:2px 0;color:#6b7280;">Subtotal</td><td style="padding:2px 0;text-align:right;">${formatCurrency(data.subtotal, data.currency)}</td></tr>
      ${data.discountTotal > 0 ? `<tr><td style="padding:2px 0;color:#6b7280;">Desconto</td><td style="padding:2px 0;text-align:right;">-${formatCurrency(data.discountTotal, data.currency)}</td></tr>` : ""}
      <tr><td style="padding:2px 0;color:#6b7280;">Entrega</td><td style="padding:2px 0;text-align:right;">${data.shippingTotal > 0 ? formatCurrency(data.shippingTotal, data.currency) : "Grátis"}</td></tr>
      <tr><td style="padding:8px 0 0;font-weight:bold;border-top:1px solid #e5e7eb;">Total</td><td style="padding:8px 0 0;font-weight:bold;text-align:right;border-top:1px solid #e5e7eb;">${formatCurrency(data.total, data.currency)}</td></tr>
    </table>`;
}

function addressBlock(address: OrderEmailAddress | null): string {
  if (!address) return "";
  return `
    <p style="font-size:14px;color:#374151;margin:16px 0 0;">
      <strong>Endereço de entrega</strong><br/>
      ${address.recipientName}<br/>
      ${address.street}, ${address.number}${address.complement ? ` — ${address.complement}` : ""}<br/>
      ${address.neighborhood} — ${address.city}/${address.state}<br/>
      CEP ${address.zipCode}
    </p>`;
}

function ctaButton(label: string, url: string): string {
  return `<p style="margin:24px 0 0;"><a href="${url}" style="background-color:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:bold;display:inline-block;">${label}</a></p>`;
}

export function orderReceivedEmail(data: OrderEmailData) {
  return {
    subject: `Recebemos seu pedido #${data.orderNumber}`,
    html: layout(
      "Recebemos seu pedido!",
      `<p style="font-size:14px;">Olá, ${data.customerName}. Recebemos seu pedido <strong>#${data.orderNumber}</strong> e estamos aguardando a confirmação do pagamento.</p>
       ${itemsTable(data.items, data.currency)}
       ${totalsTable(data)}
       ${addressBlock(data.address)}
       ${data.deliveryEstimate ? `<p style="font-size:14px;color:#374151;margin-top:12px;">Prazo estimado de entrega: ${data.deliveryEstimate}</p>` : ""}
       ${ctaButton("Acompanhar pedido", data.trackingUrl)}`
    ),
  };
}

export function paymentConfirmedEmail(data: OrderEmailData) {
  return {
    subject: `Pagamento confirmado — pedido #${data.orderNumber}`,
    html: layout(
      "Pagamento confirmado!",
      `<p style="font-size:14px;">Boas notícias, ${data.customerName}! O pagamento do pedido <strong>#${data.orderNumber}</strong> foi confirmado e já vamos preparar tudo com cuidado.</p>
       ${itemsTable(data.items, data.currency)}
       ${totalsTable(data)}
       ${addressBlock(data.address)}
       ${data.deliveryEstimate ? `<p style="font-size:14px;color:#374151;margin-top:12px;">Prazo estimado de entrega: ${data.deliveryEstimate}</p>` : ""}
       ${ctaButton("Acompanhar pedido", data.trackingUrl)}`
    ),
  };
}

export function paymentFailedEmail(orderNumber: string, customerName: string, trackingUrl: string) {
  return {
    subject: `Pagamento não aprovado — pedido #${orderNumber}`,
    html: layout(
      "Não conseguimos confirmar seu pagamento",
      `<p style="font-size:14px;">Olá, ${customerName}. Não foi possível confirmar o pagamento do pedido <strong>#${orderNumber}</strong>. Nenhum valor foi cobrado.</p>
       <p style="font-size:14px;">Você pode tentar novamente com outro cartão ou forma de pagamento.</p>
       ${ctaButton("Tentar novamente", trackingUrl)}`
    ),
  };
}

export function paymentExpiredEmail(orderNumber: string, customerName: string, trackingUrl: string) {
  return {
    subject: `Sessão de pagamento expirada — pedido #${orderNumber}`,
    html: layout(
      "Sua sessão de pagamento expirou",
      `<p style="font-size:14px;">Olá, ${customerName}. O tempo para concluir o pagamento do pedido <strong>#${orderNumber}</strong> expirou e a reserva dos produtos foi liberada.</p>
       <p style="font-size:14px;">Se ainda deseja comprar, monte o pedido novamente.</p>
       ${ctaButton("Voltar à loja", trackingUrl)}`
    ),
  };
}

export function orderPreparingEmail(data: OrderEmailData) {
  return {
    subject: `Seu pedido #${data.orderNumber} está em preparação`,
    html: layout(
      "Seu pedido está em preparação",
      `<p style="font-size:14px;">Olá, ${data.customerName}. Seu pedido <strong>#${data.orderNumber}</strong> já está sendo preparado para o envio.</p>
       ${ctaButton("Acompanhar pedido", data.trackingUrl)}`
    ),
  };
}

export function orderShippedEmail(
  data: OrderEmailData,
  tracking: { carrier: string | null; code: string | null; url: string | null }
) {
  return {
    subject: `Seu pedido #${data.orderNumber} foi enviado`,
    html: layout(
      "Seu pedido foi enviado!",
      `<p style="font-size:14px;">Olá, ${data.customerName}. Seu pedido <strong>#${data.orderNumber}</strong> foi enviado.</p>
       ${
         tracking.code
           ? `<p style="font-size:14px;color:#374151;">
                ${tracking.carrier ? `<strong>Transportadora:</strong> ${tracking.carrier}<br/>` : ""}
                <strong>Código de rastreio:</strong> ${tracking.code}
              </p>`
           : ""
       }
       ${addressBlock(data.address)}
       ${ctaButton("Acompanhar entrega", tracking.url ?? data.trackingUrl)}`
    ),
  };
}

export function orderDeliveredEmail(data: OrderEmailData) {
  return {
    subject: `Seu pedido #${data.orderNumber} foi entregue`,
    html: layout(
      "Seu pedido foi entregue!",
      `<p style="font-size:14px;">Olá, ${data.customerName}. Nosso registro mostra que o pedido <strong>#${data.orderNumber}</strong> foi entregue. Esperamos que você aproveite!</p>
       <p style="font-size:14px;">Qualquer problema com o produto, você pode solicitar troca ou devolução em até 7 dias.</p>
       ${ctaButton("Ver pedido", data.trackingUrl)}`
    ),
  };
}

export function orderCancelledEmail(orderNumber: string, customerName: string, trackingUrl: string, reason?: string) {
  return {
    subject: `Pedido #${orderNumber} cancelado`,
    html: layout(
      "Seu pedido foi cancelado",
      `<p style="font-size:14px;">Olá, ${customerName}. O pedido <strong>#${orderNumber}</strong> foi cancelado.${reason ? ` Motivo: ${reason}.` : ""}</p>
       <p style="font-size:14px;">Se o pagamento já havia sido confirmado, o reembolso será processado — você receberá um e-mail assim que ele for concluído.</p>
       ${ctaButton("Ver pedido", trackingUrl)}`
    ),
  };
}

export function refundEmail(
  orderNumber: string,
  customerName: string,
  amount: number,
  currency: string,
  isPartial: boolean,
  trackingUrl: string
) {
  return {
    subject: `Reembolso ${isPartial ? "parcial " : ""}realizado — pedido #${orderNumber}`,
    html: layout(
      `Reembolso ${isPartial ? "parcial" : "total"} realizado`,
      `<p style="font-size:14px;">Olá, ${customerName}. Realizamos um reembolso ${isPartial ? "parcial" : "total"} de <strong>${formatCurrency(amount, currency)}</strong> referente ao pedido <strong>#${orderNumber}</strong>.</p>
       <p style="font-size:14px;">O valor pode levar alguns dias úteis para aparecer no seu extrato, de acordo com o seu banco ou operadora do cartão.</p>
       ${ctaButton("Ver pedido", trackingUrl)}`
    ),
  };
}

export function returnReceivedEmail(orderNumber: string, customerName: string, trackingUrl: string) {
  return {
    subject: `Recebemos a devolução do pedido #${orderNumber}`,
    html: layout(
      "Devolução recebida",
      `<p style="font-size:14px;">Olá, ${customerName}. Recebemos os produtos devolvidos do pedido <strong>#${orderNumber}</strong> e vamos processar o reembolso, quando aplicável.</p>
       ${ctaButton("Ver pedido", trackingUrl)}`
    ),
  };
}

export function adminNewOrderEmail(data: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  address: OrderEmailAddress | null;
  items: OrderEmailItem[];
  total: number;
  currency: string;
  adminUrl: string;
}) {
  return {
    subject: `Novo pedido recebido — #${data.orderNumber}`,
    html: layout(
      "Novo pedido pago",
      `<p style="font-size:14px;">Um novo pedido foi pago e precisa ser preparado.</p>
       <p style="font-size:14px;color:#374151;">
         <strong>Pedido:</strong> #${data.orderNumber}<br/>
         <strong>Cliente:</strong> ${data.customerName}<br/>
         <strong>E-mail:</strong> ${data.customerEmail}<br/>
         ${data.customerPhone ? `<strong>Telefone:</strong> ${data.customerPhone}<br/>` : ""}
       </p>
       ${itemsTable(data.items, data.currency)}
       <p style="font-size:14px;font-weight:bold;">Total: ${formatCurrency(data.total, data.currency)}</p>
       ${addressBlock(data.address)}
       ${ctaButton("Abrir pedido no painel", data.adminUrl)}`
    ),
  };
}

export function adminPaymentErrorEmail(orderNumber: string, reason: string, adminUrl: string) {
  return {
    subject: `Aviso: problema no pagamento do pedido #${orderNumber}`,
    html: layout(
      "Problema no pagamento",
      `<p style="font-size:14px;">O pedido <strong>#${orderNumber}</strong> teve um problema no pagamento: ${reason}.</p>
       ${ctaButton("Abrir pedido no painel", adminUrl)}`
    ),
  };
}

export function passwordChangedEmail(customerName: string, changedAtLabel: string, supportUrl: string) {
  return {
    subject: "Sua senha foi alterada",
    html: layout(
      "Senha alterada",
      `<p style="font-size:14px;">Olá, ${customerName}. Sua senha foi alterada em ${changedAtLabel}.</p>
       <p style="font-size:14px;color:#374151;">Se foi você, nenhuma ação é necessária. Se não reconhece esta alteração, entre em contato com o suporte imediatamente.</p>
       ${ctaButton("Falar com o suporte", supportUrl)}`
    ),
  };
}

export function adminInviteEmail(params: {
  inviterName: string;
  roleLabel: string;
  acceptUrl: string;
  expiresAtLabel: string;
}) {
  return {
    subject: "Convite para administrar a loja",
    html: layout(
      "Convite de administrador",
      `<p style="font-size:14px;">${params.inviterName} convidou você para acessar o painel administrativo da loja com o papel de <strong>${params.roleLabel}</strong>.</p>
       <p style="font-size:14px;color:#374151;">Este convite expira em ${params.expiresAtLabel} e só pode ser usado uma vez.</p>
       ${ctaButton("Aceitar convite e criar senha", params.acceptUrl)}
       <p style="font-size:12px;color:#9ca3af;margin-top:16px;">Se você não esperava este convite, ignore este e-mail.</p>`
    ),
  };
}

export function contactMessageReceivedEmail(customerName: string, subject: string) {
  return {
    subject: "Recebemos sua mensagem",
    html: layout(
      "Mensagem recebida",
      `<p style="font-size:14px;">Olá, ${customerName}. Recebemos sua mensagem sobre "${subject}" e nossa equipe vai responder em breve.</p>
       <p style="font-size:14px;color:#374151;">Este é um e-mail automático de confirmação — não é necessário responder a ele.</p>`
    ),
  };
}

export function lowStockAlertEmail(params: { productName: string; currentQuantity: number; threshold: number; adminUrl: string }) {
  return {
    subject: `Estoque baixo: ${params.productName}`,
    html: layout(
      "Alerta de estoque baixo",
      `<p style="font-size:14px;">O produto <strong>${params.productName}</strong> está com ${params.currentQuantity} unidade(s) em estoque, abaixo do mínimo configurado (${params.threshold}).</p>
       ${ctaButton("Ver estoque no painel", params.adminUrl)}`
    ),
  };
}
