import "server-only";
import { formatCurrency } from "@/lib/utils";

/**
 * English (British) e-mail templates for every order-lifecycle
 * notification sent to customers. Each function returns { subject, html }
 * for use with sendEmail(). The public storefront is en-GB (Prompt 7), so
 * every customer-facing template lives here in English — "Dispatched" is
 * used consistently instead of mixing it with "Shipped".
 *
 * Admin-facing templates (new order, payment error, admin invite, low
 * stock) take an explicit `lang` parameter ("pt" | "en") so the store
 * owner can choose their language in store_settings.admin_email_language
 * — they default to "pt" since the admin panel itself stays in
 * Portuguese for the Brazilian store owner.
 *
 * Note: account e-mails (sign-up confirmation, e-mail verification,
 * password recovery) are sent directly by Supabase Auth, not by this
 * module — customise their copy in Supabase Dashboard → Authentication →
 * Email Templates (see README).
 */

export type AdminEmailLang = "pt" | "en";

export interface OrderEmailItem {
  name: string;
  variantLabel: string | null;
  quantity: number;
  unitPrice: number;
  imageUrl: string | null;
}

/** UK address format — see src/types/order-snapshots.ts (AddressSnapshot). */
export interface OrderEmailAddress {
  recipientName: string;
  companyName: string | null;
  addressLine1: string;
  addressLine2: string | null;
  townCity: string;
  county: string | null;
  postcode: string;
  country: string;
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

function layout(title: string, bodyHtml: string, lang: AdminEmailLang = "en"): string {
  const footer =
    lang === "pt"
      ? `Esta é uma mensagem automática do painel administrativo da ${STORE_NAME}.`
      : `This is an automated message about your order at ${STORE_NAME}. If you have any questions, reply to this email or contact us through our website.`;

  return `<!doctype html>
<html lang="${lang === "pt" ? "pt-BR" : "en-GB"}">
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
                ${footer}
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
            <span style="color:#6b7280;">Qty: ${item.quantity} × ${formatCurrency(item.unitPrice, currency)}</span>
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
      ${data.discountTotal > 0 ? `<tr><td style="padding:2px 0;color:#6b7280;">Discount</td><td style="padding:2px 0;text-align:right;">-${formatCurrency(data.discountTotal, data.currency)}</td></tr>` : ""}
      <tr><td style="padding:2px 0;color:#6b7280;">Delivery</td><td style="padding:2px 0;text-align:right;">${data.shippingTotal > 0 ? formatCurrency(data.shippingTotal, data.currency) : "Free"}</td></tr>
      <tr><td style="padding:8px 0 0;font-weight:bold;border-top:1px solid #e5e7eb;">Total</td><td style="padding:8px 0 0;font-weight:bold;text-align:right;border-top:1px solid #e5e7eb;">${formatCurrency(data.total, data.currency)}</td></tr>
    </table>`;
}

function addressBlock(address: OrderEmailAddress | null, label = "Delivery address"): string {
  if (!address) return "";
  return `
    <p style="font-size:14px;color:#374151;margin:16px 0 0;">
      <strong>${label}</strong><br/>
      ${address.recipientName}<br/>
      ${address.companyName ? `${address.companyName}<br/>` : ""}
      ${address.addressLine1}${address.addressLine2 ? `, ${address.addressLine2}` : ""}<br/>
      ${address.townCity}${address.county ? `, ${address.county}` : ""}<br/>
      ${address.postcode}<br/>
      ${address.country}
    </p>`;
}

function ctaButton(label: string, url: string): string {
  return `<p style="margin:24px 0 0;"><a href="${url}" style="background-color:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:bold;display:inline-block;">${label}</a></p>`;
}

export function orderReceivedEmail(data: OrderEmailData) {
  return {
    subject: `We've received your order #${data.orderNumber}`,
    html: layout(
      "We've received your order!",
      `<p style="font-size:14px;">Hi ${data.customerName}, we've received your order <strong>#${data.orderNumber}</strong> and are waiting for payment to be confirmed.</p>
       ${itemsTable(data.items, data.currency)}
       ${totalsTable(data)}
       ${addressBlock(data.address)}
       ${data.deliveryEstimate ? `<p style="font-size:14px;color:#374151;margin-top:12px;">Estimated delivery: ${data.deliveryEstimate}</p>` : ""}
       ${ctaButton("Track order", data.trackingUrl)}`
    ),
  };
}

export function paymentConfirmedEmail(data: OrderEmailData) {
  return {
    subject: `Payment confirmed — order #${data.orderNumber}`,
    html: layout(
      "Payment confirmed!",
      `<p style="font-size:14px;">Good news, ${data.customerName}! Payment for order <strong>#${data.orderNumber}</strong> has been confirmed and we're already preparing everything with care.</p>
       ${itemsTable(data.items, data.currency)}
       ${totalsTable(data)}
       ${addressBlock(data.address)}
       ${data.deliveryEstimate ? `<p style="font-size:14px;color:#374151;margin-top:12px;">Estimated delivery: ${data.deliveryEstimate}</p>` : ""}
       ${ctaButton("Track order", data.trackingUrl)}`
    ),
  };
}

export function paymentFailedEmail(orderNumber: string, customerName: string, trackingUrl: string) {
  return {
    subject: `Payment not approved — order #${orderNumber}`,
    html: layout(
      "We couldn't confirm your payment",
      `<p style="font-size:14px;">Hi ${customerName}, we couldn't confirm payment for order <strong>#${orderNumber}</strong>. No charge was made.</p>
       <p style="font-size:14px;">You can try again with a different card or payment method.</p>
       ${ctaButton("Try again", trackingUrl)}`
    ),
  };
}

export function paymentExpiredEmail(orderNumber: string, customerName: string, trackingUrl: string) {
  return {
    subject: `Payment session expired — order #${orderNumber}`,
    html: layout(
      "Your payment session has expired",
      `<p style="font-size:14px;">Hi ${customerName}, the time to complete payment for order <strong>#${orderNumber}</strong> has expired, and the stock reservation has been released.</p>
       <p style="font-size:14px;">If you'd still like to buy, please place the order again.</p>
       ${ctaButton("Back to store", trackingUrl)}`
    ),
  };
}

export function orderPreparingEmail(data: OrderEmailData) {
  return {
    subject: `Your order #${data.orderNumber} is being prepared`,
    html: layout(
      "Your order is being prepared",
      `<p style="font-size:14px;">Hi ${data.customerName}, your order <strong>#${data.orderNumber}</strong> is now being prepared for dispatch.</p>
       ${ctaButton("Track order", data.trackingUrl)}`
    ),
  };
}

export function orderShippedEmail(
  data: OrderEmailData,
  tracking: { carrier: string | null; code: string | null; url: string | null }
) {
  return {
    subject: `Your order #${data.orderNumber} has been dispatched`,
    html: layout(
      "Your order has been dispatched!",
      `<p style="font-size:14px;">Hi ${data.customerName}, your order <strong>#${data.orderNumber}</strong> has been dispatched.</p>
       ${
         tracking.code
           ? `<p style="font-size:14px;color:#374151;">
                ${tracking.carrier ? `<strong>Delivery company:</strong> ${tracking.carrier}<br/>` : ""}
                <strong>Tracking number:</strong> ${tracking.code}
              </p>`
           : ""
       }
       ${addressBlock(data.address)}
       ${ctaButton("Track delivery", tracking.url ?? data.trackingUrl)}`
    ),
  };
}

export function orderDeliveredEmail(data: OrderEmailData) {
  return {
    subject: `Your order #${data.orderNumber} has been delivered`,
    html: layout(
      "Your order has been delivered!",
      `<p style="font-size:14px;">Hi ${data.customerName}, our records show that order <strong>#${data.orderNumber}</strong> has been delivered. We hope you love it!</p>
       <p style="font-size:14px;">If there's any problem with your product, you can request a return in line with our Returns and Refunds Policy.</p>
       ${ctaButton("View order", data.trackingUrl)}`
    ),
  };
}

export function orderCancelledEmail(orderNumber: string, customerName: string, trackingUrl: string, reason?: string) {
  return {
    subject: `Order #${orderNumber} cancelled`,
    html: layout(
      "Your order has been cancelled",
      `<p style="font-size:14px;">Hi ${customerName}, order <strong>#${orderNumber}</strong> has been cancelled.${reason ? ` Reason: ${reason}.` : ""}</p>
       <p style="font-size:14px;">If payment had already been confirmed, a refund will be processed — you'll receive an email once it's complete.</p>
       ${ctaButton("View order", trackingUrl)}`
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
    subject: `${isPartial ? "Partial refund" : "Refund"} issued — order #${orderNumber}`,
    html: layout(
      `${isPartial ? "Partial refund" : "Refund"} issued`,
      `<p style="font-size:14px;">Hi ${customerName}, we've issued a ${isPartial ? "partial " : ""}refund of <strong>${formatCurrency(amount, currency)}</strong> for order <strong>#${orderNumber}</strong>.</p>
       <p style="font-size:14px;">It may take a few working days to appear on your statement, depending on your bank or card provider.</p>
       ${ctaButton("View order", trackingUrl)}`
    ),
  };
}

export function returnReceivedEmail(orderNumber: string, customerName: string, trackingUrl: string) {
  return {
    subject: `We've received your return for order #${orderNumber}`,
    html: layout(
      "Return received",
      `<p style="font-size:14px;">Hi ${customerName}, we've received the returned items for order <strong>#${orderNumber}</strong> and will process the refund where applicable.</p>
       ${ctaButton("View order", trackingUrl)}`
    ),
  };
}

export function passwordChangedEmail(customerName: string, changedAtLabel: string, supportUrl: string) {
  return {
    subject: "Your password has been changed",
    html: layout(
      "Password changed",
      `<p style="font-size:14px;">Hi ${customerName}, your password was changed on ${changedAtLabel}.</p>
       <p style="font-size:14px;color:#374151;">If this was you, no action is needed. If you don't recognise this change, please contact support immediately.</p>
       ${ctaButton("Contact support", supportUrl)}`
    ),
  };
}

export function contactMessageReceivedEmail(customerName: string, subject: string) {
  return {
    subject: "We've received your message",
    html: layout(
      "Message received",
      `<p style="font-size:14px;">Hi ${customerName}, we've received your message about "${subject}" and our team will get back to you shortly.</p>
       <p style="font-size:14px;color:#374151;">This is an automatic confirmation email — there's no need to reply to it.</p>`
    ),
  };
}

export function adminNewOrderEmail(
  data: {
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    address: OrderEmailAddress | null;
    items: OrderEmailItem[];
    total: number;
    currency: string;
    adminUrl: string;
  },
  lang: AdminEmailLang = "pt"
) {
  if (lang === "en") {
    return {
      subject: `New order received — #${data.orderNumber}`,
      html: layout(
        "New paid order",
        `<p style="font-size:14px;">A new order has been paid and needs to be prepared.</p>
         <p style="font-size:14px;color:#374151;">
           <strong>Order:</strong> #${data.orderNumber}<br/>
           <strong>Customer:</strong> ${data.customerName}<br/>
           <strong>Email:</strong> ${data.customerEmail}<br/>
           ${data.customerPhone ? `<strong>Phone:</strong> ${data.customerPhone}<br/>` : ""}
         </p>
         ${itemsTable(data.items, data.currency)}
         <p style="font-size:14px;font-weight:bold;">Total: ${formatCurrency(data.total, data.currency)}</p>
         ${addressBlock(data.address)}
         ${ctaButton("Open order in the panel", data.adminUrl)}`,
        "en"
      ),
    };
  }

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
       ${addressBlock(data.address, "Endereço de entrega")}
       ${ctaButton("Abrir pedido no painel", data.adminUrl)}`,
      "pt"
    ),
  };
}

export function adminPaymentErrorEmail(orderNumber: string, reason: string, adminUrl: string, lang: AdminEmailLang = "pt") {
  if (lang === "en") {
    return {
      subject: `Warning: payment issue on order #${orderNumber}`,
      html: layout(
        "Payment issue",
        `<p style="font-size:14px;">Order <strong>#${orderNumber}</strong> had a payment issue: ${reason}.</p>
         ${ctaButton("Open order in the panel", adminUrl)}`,
        "en"
      ),
    };
  }

  return {
    subject: `Aviso: problema no pagamento do pedido #${orderNumber}`,
    html: layout(
      "Problema no pagamento",
      `<p style="font-size:14px;">O pedido <strong>#${orderNumber}</strong> teve um problema no pagamento: ${reason}.</p>
       ${ctaButton("Abrir pedido no painel", adminUrl)}`,
      "pt"
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
       <p style="font-size:12px;color:#9ca3af;margin-top:16px;">Se você não esperava este convite, ignore este e-mail.</p>`,
      "pt"
    ),
  };
}

export function lowStockAlertEmail(
  params: { productName: string; currentQuantity: number; threshold: number; adminUrl: string },
  lang: AdminEmailLang = "pt"
) {
  if (lang === "en") {
    return {
      subject: `Low stock: ${params.productName}`,
      html: layout(
        "Low stock alert",
        `<p style="font-size:14px;">Product <strong>${params.productName}</strong> has ${params.currentQuantity} unit(s) in stock, below the configured minimum (${params.threshold}).</p>
         ${ctaButton("View stock in the panel", params.adminUrl)}`,
        "en"
      ),
    };
  }

  return {
    subject: `Estoque baixo: ${params.productName}`,
    html: layout(
      "Alerta de estoque baixo",
      `<p style="font-size:14px;">O produto <strong>${params.productName}</strong> está com ${params.currentQuantity} unidade(s) em estoque, abaixo do mínimo configurado (${params.threshold}).</p>
       ${ctaButton("Ver estoque no painel", params.adminUrl)}`,
      "pt"
    ),
  };
}
