import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Creates a Stripe Checkout Session for an existing order.
 *
 * Expects the order (and its order_items) to already exist in Supabase —
 * created via a server action once the cart/checkout flow is wired up.
 * This route only turns that order into a Stripe Checkout Session and
 * returns the redirect URL.
 */
export async function POST(request: Request) {
  const { orderId } = (await request.json()) as { orderId?: string };

  if (!orderId) {
    return NextResponse.json({ error: "orderId é obrigatório." }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, order_number, currency")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("product_name_snapshot, unit_price, quantity")
    .eq("order_id", order.id);

  if (itemsError || !items || items.length === 0) {
    return NextResponse.json({ error: "Pedido sem itens." }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: order.currency.toLowerCase(),
          unit_amount: Math.round(item.unit_price * 100),
          product_data: { name: item.product_name_snapshot },
        },
      })),
      success_url: `${siteUrl}/pedido-confirmado?pedido=${order.order_number}`,
      cancel_url: `${siteUrl}/carrinho`,
      metadata: { order_id: order.id },
    });

    await supabase.from("payments").insert({
      order_id: order.id,
      provider: "stripe",
      stripe_checkout_session_id: session.id,
      status: "pendente",
      amount: items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0),
      currency: order.currency,
    });

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível iniciar o pagamento. Verifique a configuração do Stripe." },
      { status: 500 }
    );
  }
}
