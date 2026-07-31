"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { t } from "@/i18n";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { getValidatedCart } from "@/lib/cart/cart-data";
import { getStoreCurrency, getServedCountries } from "@/lib/store-settings";
import { getStripeClient } from "@/lib/stripe/server";
import { sendTemplateEmail, orderReceivedEmail } from "@/lib/email";
import { isValidUkPostcode, normalisePostcode } from "@/lib/uk-address";
import type { AddressSnapshot } from "@/types/order-snapshots";

export interface CheckoutActionState {
  error: string | null;
}

const CHECKOUT_SESSION_MINUTES = 40;

function readAddress(formData: FormData, prefix: string): AddressSnapshot {
  return {
    recipientName: String(formData.get(`${prefix}RecipientName`) ?? "").trim(),
    companyName: String(formData.get(`${prefix}CompanyName`) ?? "").trim() || null,
    phone: String(formData.get(`${prefix}Phone`) ?? "").trim(),
    addressLine1: String(formData.get(`${prefix}AddressLine1`) ?? "").trim(),
    addressLine2: String(formData.get(`${prefix}AddressLine2`) ?? "").trim() || null,
    townCity: String(formData.get(`${prefix}TownCity`) ?? "").trim(),
    county: String(formData.get(`${prefix}County`) ?? "").trim() || null,
    postcode: normalisePostcode(String(formData.get(`${prefix}Postcode`) ?? "")),
    country: String(formData.get(`${prefix}Country`) ?? "United Kingdom").trim() || "United Kingdom",
    deliveryInstructions: String(formData.get(`${prefix}DeliveryInstructions`) ?? "").trim() || null,
  };
}

/** Never invents a missing address field — every required part must be present. County is optional, postcode is required. */
function validateAddress(address: AddressSnapshot): string | null {
  if (!address.recipientName || !address.phone || !address.addressLine1 || !address.townCity || !address.country) {
    return t("checkout.addressRequired");
  }
  if (!isValidUkPostcode(address.postcode)) {
    return t("checkout.invalidZipCode");
  }
  return null;
}

function formatAddressForDelivery(address: AddressSnapshot) {
  return {
    recipient_name: address.recipientName,
    company_name: address.companyName,
    phone: address.phone,
    address_line1: address.addressLine1,
    address_line2: address.addressLine2,
    town_city: address.townCity,
    county: address.county,
    postcode: address.postcode,
    country: address.country,
    delivery_instructions: address.deliveryInstructions,
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
    return { error: t("cart.empty") };
  }
  if (cart.hasBlockingIssues) {
    return {
      error: t("cart.blockingIssuesNotice"),
    };
  }
  if (!cart.shippingOptionId) {
    return { error: t("checkout.shippingRequired") };
  }
  if (formData.get("acceptTerms") !== "on") {
    return { error: t("checkout.termsAcceptanceRequired") };
  }

  const user = await getCurrentUser();

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const submittedEmail = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const customerEmail = user?.email ?? submittedEmail;

  if (!firstName || !lastName || !customerEmail || !phone) {
    return { error: t("checkout.identificationRequired") };
  }

  const shippingAddress = readAddress(formData, "shipping");
  const shippingError = validateAddress(shippingAddress);
  if (shippingError) return { error: shippingError };

  const servedCountries = await getServedCountries();
  if (!servedCountries.includes(shippingAddress.country)) {
    return { error: t("checkout.countryNotServed") };
  }

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

      await logStockProblem("Stock reservation failed during checkout", {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        customerEmail,
      });

      return {
        error: t("checkout.itemOutOfStockDuringCheckout", { name: item.name }),
      };
    }

    reserved.push({ productId: item.productId, variantId: item.variantId, quantity: item.quantity });
  }

  const { data: orderNumberData } = await admin.rpc("generate_order_number");
  const orderNumber = orderNumberData ?? `ORD-${Date.now()}`;

  const deliveryEstimate =
    cart.shipping.estimateDaysMin && cart.shipping.estimateDaysMax
      ? t("checkout.deliveryEstimateRange", { min: cart.shipping.estimateDaysMin, max: cart.shipping.estimateDaysMax })
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
    return { error: t("common.error") };
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
    note: user ? null : "Order created as a guest.",
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
          product_data: { name: "Delivery" },
        },
      });
    }

    const discounts: { coupon: string }[] = [];
    if (cart.discountTotal > 0) {
      const stripeCoupon = await stripe.coupons.create({
        amount_off: Math.round(cart.discountTotal * 100),
        currency: currency.toLowerCase(),
        duration: "once",
        name: cart.coupon?.code ? `Discount code ${cart.coupon.code}` : "Discount",
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

    if (!session.url) throw new Error("Stripe did not return a payment URL.");
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
      error: t("checkout.paymentStartFailed"),
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
        companyName: shippingAddress.companyName,
        addressLine1: shippingAddress.addressLine1,
        addressLine2: shippingAddress.addressLine2,
        townCity: shippingAddress.townCity,
        county: shippingAddress.county,
        postcode: shippingAddress.postcode,
        country: shippingAddress.country,
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
  if (!order) return { url: null, error: t("errors.orderNotFound") };

  if (!["aguardando_pagamento", "recusado", "expirado"].includes(order.payment_status)) {
    return { url: null, error: t("checkout.orderNoLongerPayable") };
  }
  if (order.status === "cancelado") {
    return { url: null, error: t("checkout.orderCancelledNotice") };
  }

  const { data: items } = await admin
    .from("order_items")
    .select("product_id, variant_id, quantity, product_name_snapshot, variant_label_snapshot, unit_price, image_url_snapshot")
    .eq("order_id", order.id);

  if (!items || items.length === 0) return { url: null, error: t("checkout.orderHasNoItems") };

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
      return { url: null, error: t("checkout.itemsOutOfStock") };
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
    return { url: null, error: t("checkout.paymentStartFailed") };
  }
}
