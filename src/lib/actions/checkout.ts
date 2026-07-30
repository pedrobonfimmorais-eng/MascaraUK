"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { getValidatedCart } from "@/lib/cart/cart-data";
import { getStoreCurrency } from "@/lib/store-settings";
import { getStripeClient } from "@/lib/stripe/server";
import { sendTemplateEmail, orderReceivedEmail } from "@/lib/email";
import type { AddressSnapshot } from "@/types/order-snapshots";

export interface CheckoutActionState {
  error: string | null;
}

const CHECKOUT_SESSION_MINUTES = 40;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function readAddress(formData: FormData, prefix: string): AddressSnapshot {
  return {
    recipientName: String(formData.get(`${prefix}RecipientName`) ?? "").trim(),
    phone: String(formData.get(`${prefix}Phone`) ?? "").trim(),
    zipCode: digitsOnly(String(formData.get(`${prefix}ZipCode`) ?? "")),
    street: String(formData.get(`${prefix}Street`) ?? "").trim(),
    number: String(formData.get(`${prefix}Number`) ?? "").trim(),
    complement: String(formData.get(`${prefix}Complement`) ?? "").trim() || null,
    neighborhood: String(formData.get(`${prefix}Neighborhood`) ?? "").trim(),
    city: String(formData.get(`${prefix}City`) ?? "").trim(),
    state: String(formData.get(`${prefix}State`) ?? "").trim(),
    country: String(formData.get(`${prefix}Country`) ?? "BR").trim() || "BR",
    reference: String(formData.get(`${prefix}Reference`) ?? "").trim() || null,
  };
}

/** Never invents a missing address field — every required part must be present. */
function validateAddress(address: AddressSnapshot): string | null {
  if (
    !address.recipientName ||
    !address.phone ||
    !address.street ||
    !address.number ||
    !address.neighborhood ||
    !address.city ||
    !address.state
  ) {
    return "Preencha todos os campos obrigatórios do endereço.";
  }
  if (address.zipCode.length !== 8) {
    return "Digite um CEP válido com 8 dígitos.";
  }
  return null;
}

function formatAddressForDelivery(address: AddressSnapshot) {
  return {
    recipient_name: address.recipientName,
    phone: address.phone,
    zip_code: address.zipCode,
    street: address.street,
    number: address.number,
    complement: address.complement,
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state,
    country: address.country,
    reference: address.reference,
  };
}

async function logStockProblem(message: string, details: Record<string, unknown>) {
  console.error(`[checkout] ${message}`, details);
  try {
    const admin = createAdminClient();
    await admin.from("admin_logs").insert({
      action: "estoque_insuficiente_no_checkout",
      entity_type: "order",
      details: { message, ...details },
    });
  } catch {
    // Best-effort logging only.
  }
}

/**
 * Validates everything server-side (per "nunca confie nos valores enviados
 * pelo navegador"), atomically reserves stock for every item, creates a
 * pending order with a full product/price snapshot, then creates the Stripe
 * Checkout Session and redirects the customer to Stripe's secure payment
 * page. The order only becomes "paga" once the webhook confirms it — this
 * action never marks a payment as successful itself.
 */
export async function submitCheckout(
  _prevState: CheckoutActionState,
  formData: FormData
): Promise<CheckoutActionState> {
  const cart = await getValidatedCart();

  if (cart.items.length === 0) {
    return { error: "Seu carrinho está vazio." };
  }
  if (cart.hasBlockingIssues) {
    return {
      error: "Há produtos indisponíveis ou sem estoque suficiente no seu carrinho. Volte ao carrinho para revisar.",
    };
  }
  if (!cart.shippingOptionId) {
    return { error: "Selecione uma forma de entrega." };
  }
  if (formData.get("acceptTerms") !== "on") {
    return { error: "É necessário confirmar que você leu e aceita os termos para concluir a compra." };
  }

  const user = await getCurrentUser();

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const submittedEmail = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const customerEmail = user?.email ?? submittedEmail;

  if (!firstName || !lastName || !customerEmail || !phone) {
    return { error: "Preencha nome, sobrenome, e-mail e telefone para continuar." };
  }

  const shippingAddress = readAddress(formData, "shipping");
  const shippingError = validateAddress(shippingAddress);
  if (shippingError) return { error: shippingError };

  const billingSameAsShipping = formData.get("billingSameAsShipping") === "on";
  const billingAddress = billingSameAsShipping ? shippingAddress : readAddress(formData, "billing");
  if (!billingSameAsShipping) {
    const billingError = validateAddress(billingAddress);
    if (billingError) return { error: billingError };
  }

  const customerNote = String(formData.get("customerNote") ?? "").trim() || null;
  const currency = await getStoreCurrency();

  const admin = createAdminClient();

  // Atomically reserve stock for every item — the first place that could
  // fail if two people buy the last unit at the same time. Roll back any
  // reservation already made for this attempt before reporting the error.
  const reserved: { productId: string; variantId: string | null; quantity: number }[] = [];

  for (const item of cart.items) {
    const { data: didReserve, error: reserveError } = await admin.rpc("reserve_stock", {
      p_product_id: item.productId,
      p_variant_id: item.variantId,
      p_qty: item.quantity,
    });

    if (reserveError || !didReserve) {
      for (const done of reserved) {
        await admin.rpc("release_stock", {
          p_product_id: done.productId,
          p_variant_id: done.variantId,
          p_qty: done.quantity,
        });
      }

      await logStockProblem("Reserva de estoque falhou durante o checkout", {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        customerEmail,
      });

      return {
        error: `O produto "${item.name}" ficou sem estoque suficiente enquanto você finalizava a compra. Ajuste a quantidade no carrinho e tente novamente.`,
      };
    }

    reserved.push({ productId: item.productId, variantId: item.variantId, quantity: item.quantity });
  }

  const { data: orderNumberData } = await admin.rpc("generate_order_number");
  const orderNumber = orderNumberData ?? `PED-${Date.now()}`;

  const deliveryEstimate =
    cart.shipping.estimateDaysMin && cart.shipping.estimateDaysMax
      ? `${cart.shipping.estimateDaysMin} a ${cart.shipping.estimateDaysMax} dias úteis`
      : null;

  const expiresAt = new Date(Date.now() + CHECKOUT_SESSION_MINUTES * 60 * 1000);

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      order_number: orderNumber,
      user_id: user?.id ?? null,
      is_guest_order: !user,
      status: "recebido",
      payment_status: "aguardando_pagamento",
      subtotal: cart.subtotal,
      discount_total: cart.discountTotal,
      shipping_total: cart.shippingTotal,
      total: cart.total,
      currency,
      coupon_code: cart.coupon?.code ?? null,
      shipping_address_snapshot: formatAddressForDelivery(shippingAddress),
      billing_address_snapshot: formatAddressForDelivery(billingAddress),
      customer_email: customerEmail,
      customer_name: `${firstName} ${lastName}`.trim(),
      customer_first_name: firstName,
      customer_last_name: lastName,
      customer_phone: phone,
      notes: customerNote,
      expires_at: expiresAt.toISOString(),
      is_test: (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_"),
    })
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    for (const done of reserved) {
      await admin.rpc("release_stock", {
        p_product_id: done.productId,
        p_variant_id: done.variantId,
        p_qty: done.quantity,
      });
    }
    return { error: "Não foi possível criar o pedido. Tente novamente." };
  }

  const orderItemsPayload = cart.items.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    variant_id: item.variantId,
    product_name_snapshot: item.name,
    variant_label_snapshot: item.variantLabel,
    sku_snapshot: item.sku,
    image_url_snapshot: item.imageUrl,
    unit_price: item.unitPrice,
    previous_unit_price: item.previousUnitPrice,
    discount_amount: item.previousUnitPrice ? (item.previousUnitPrice - item.unitPrice) * item.quantity : 0,
    quantity: item.quantity,
    total: item.lineTotal,
  }));

  await admin.from("order_items").insert(orderItemsPayload);

  await admin.from("order_events").insert({
    order_id: order.id,
    event_type: "pedido_criado",
    new_status: "recebido",
    note: user ? null : "Pedido criado como visitante.",
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  let stripeSessionUrl: string;
  try {
    const stripe = getStripeClient();

    const lineItems: Array<{
      quantity: number;
      price_data: {
        currency: string;
        unit_amount: number;
        product_data: { name: string; images?: string[] };
      };
    }> = cart.items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: currency.toLowerCase(),
        unit_amount: Math.round(item.unitPrice * 100),
        product_data: {
          name: item.variantLabel ? `${item.name} — ${item.variantLabel}` : item.name,
          images: item.imageUrl ? [item.imageUrl] : undefined,
        },
      },
    }));

    if (cart.shippingTotal > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: Math.round(cart.shippingTotal * 100),
          product_data: { name: "Entrega" },
        },
      });
    }

    const discounts: { coupon: string }[] = [];
    if (cart.discountTotal > 0) {
      const stripeCoupon = await stripe.coupons.create({
        amount_off: Math.round(cart.discountTotal * 100),
        currency: currency.toLowerCase(),
        duration: "once",
        name: cart.coupon?.code ? `Cupom ${cart.coupon.code}` : "Desconto",
      });
      discounts.push({ coupon: stripeCoupon.id });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customerEmail,
      line_items: lineItems,
      discounts: discounts.length > 0 ? discounts : undefined,
      success_url: `${siteUrl}/pedido-confirmado?pedido=${order.order_number}`,
      cancel_url: `${siteUrl}/pagamento-cancelado?pedido=${order.order_number}`,
      expires_at: Math.floor(expiresAt.getTime() / 1000),
      metadata: { order_id: order.id, order_number: order.order_number },
      payment_intent_data: { metadata: { order_id: order.id, order_number: order.order_number } },
    });

    if (!session.url) throw new Error("Stripe não retornou uma URL de pagamento.");
    stripeSessionUrl = session.url;

    await admin.from("payments").insert({
      order_id: order.id,
      provider: "stripe",
      stripe_checkout_session_id: session.id,
      status: "aguardando_pagamento",
      amount: cart.total,
      currency,
    });
  } catch (stripeError) {
    console.error("[checkout] Falha ao criar sessão do Stripe:", stripeError);

    for (const done of reserved) {
      await admin.rpc("release_stock", {
        p_product_id: done.productId,
        p_variant_id: done.variantId,
        p_qty: done.quantity,
      });
    }
    await admin
      .from("orders")
      .update({ payment_status: "cancelado", status: "cancelado", cancelled_at: new Date().toISOString() })
      .eq("id", order.id);

    return {
      error: "Não foi possível iniciar o pagamento no momento. Nenhum valor foi cobrado. Tente novamente.",
    };
  }

  // Guest orders get a secure token e-mailed for tracking (see /pedido-confirmado
  // and /acompanhar-pedido) instead of relying on the order number alone.
  let guestToken: string | null = null;
  if (!user) {
    guestToken = randomBytes(32).toString("hex");
    await admin.from("order_access_tokens").insert({
      order_id: order.id,
      token: guestToken,
      email: customerEmail,
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  const trackingUrl = user
    ? `${siteUrl}/minha-conta/pedidos`
    : `${siteUrl}/pedido-confirmado?pedido=${order.order_number}&token=${guestToken}`;

  await sendTemplateEmail(
    customerEmail,
    orderReceivedEmail({
      orderNumber: order.order_number,
      customerName: firstName,
      items: cart.items.map((item) => ({
        name: item.name,
        variantLabel: item.variantLabel,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        imageUrl: item.imageUrl,
      })),
      subtotal: cart.subtotal,
      discountTotal: cart.discountTotal,
      shippingTotal: cart.shippingTotal,
      total: cart.total,
      currency,
      address: {
        recipientName: shippingAddress.recipientName,
        street: shippingAddress.street,
        number: shippingAddress.number,
        complement: shippingAddress.complement,
        neighborhood: shippingAddress.neighborhood,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zipCode: shippingAddress.zipCode,
      },
      deliveryEstimate,
      trackingUrl,
    })
  );

  // The administrator is notified once the payment is actually confirmed
  // (see the checkout.session.completed handler in the Stripe webhook),
  // not here — an unpaid order shouldn't page the store owner.

  redirect(stripeSessionUrl);
}

/**
 * Re-creates a Stripe Checkout Session for an order whose payment failed or
 * expired, re-reserving stock first (the previous reservation was released
 * when the session expired/failed). Used by /pagamento-cancelado and the
 * payment-failed e-mail's "tentar novamente" link.
 */
export async function retryPayment(orderId: string): Promise<{ url: string | null; error: string | null }> {
  const admin = createAdminClient();

  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return { url: null, error: "Pedido não encontrado." };

  if (!["aguardando_pagamento", "recusado", "expirado"].includes(order.payment_status)) {
    return { url: null, error: "Este pedido não pode mais ser pago novamente." };
  }
  if (order.status === "cancelado") {
    return { url: null, error: "Este pedido foi cancelado." };
  }

  const { data: items } = await admin
    .from("order_items")
    .select("product_id, variant_id, quantity, product_name_snapshot, variant_label_snapshot, unit_price, image_url_snapshot")
    .eq("order_id", order.id);

  if (!items || items.length === 0) return { url: null, error: "Pedido sem itens." };

  const reserved: { productId: string; variantId: string | null; quantity: number }[] = [];
  for (const item of items) {
    if (!item.product_id) continue;
    const { data: didReserve } = await admin.rpc("reserve_stock", {
      p_product_id: item.product_id,
      p_variant_id: item.variant_id,
      p_qty: item.quantity,
    });

    if (!didReserve) {
      for (const done of reserved) {
        await admin.rpc("release_stock", {
          p_product_id: done.productId,
          p_variant_id: done.variantId,
          p_qty: done.quantity,
        });
      }
      return { url: null, error: "Um ou mais produtos deste pedido ficaram sem estoque." };
    }
    reserved.push({ productId: item.product_id, variantId: item.variant_id, quantity: item.quantity });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const expiresAt = new Date(Date.now() + CHECKOUT_SESSION_MINUTES * 60 * 1000);

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: order.customer_email,
      line_items: items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: order.currency.toLowerCase(),
          unit_amount: Math.round(item.unit_price * 100),
          product_data: {
            name: item.variant_label_snapshot
              ? `${item.product_name_snapshot} — ${item.variant_label_snapshot}`
              : item.product_name_snapshot,
          },
        },
      })),
      success_url: `${siteUrl}/pedido-confirmado?pedido=${order.order_number}`,
      cancel_url: `${siteUrl}/pagamento-cancelado?pedido=${order.order_number}`,
      expires_at: Math.floor(expiresAt.getTime() / 1000),
      metadata: { order_id: order.id, order_number: order.order_number },
      payment_intent_data: { metadata: { order_id: order.id, order_number: order.order_number } },
    });

    await admin.from("orders").update({ expires_at: expiresAt.toISOString(), payment_status: "aguardando_pagamento" }).eq("id", order.id);
    await admin.from("payments").insert({
      order_id: order.id,
      provider: "stripe",
      stripe_checkout_session_id: session.id,
      status: "aguardando_pagamento",
      amount: order.total,
      currency: order.currency,
    });

    return { url: session.url, error: null };
  } catch {
    for (const done of reserved) {
      await admin.rpc("release_stock", {
        p_product_id: done.productId,
        p_variant_id: done.variantId,
        p_qty: done.quantity,
      });
    }
    return { url: null, error: "Não foi possível iniciar o pagamento. Tente novamente." };
  }
}
