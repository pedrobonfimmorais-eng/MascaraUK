import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnalyticsThresholds } from "@/lib/analytics/settings";
import type { Alert, AlertPriority } from "@/types/database";

async function upsertAlert(
  admin: ReturnType<typeof createAdminClient>,
  input: { alertType: string; title: string; description: string; priority: AlertPriority; relatedLink: string | null; dedupeKey: string }
) {
  // The partial unique index on (dedupe_key) where status in ('novo','lido') makes this insert a no-op
  // when the same problem already has an open alert — "não envie alertas repetidos sem necessidade".
  await admin.from("alerts").upsert(
    {
      alert_type: input.alertType,
      title: input.title,
      description: input.description,
      priority: input.priority,
      related_link: input.relatedLink,
      dedupe_key: input.dedupeKey,
      status: "novo",
    },
    { onConflict: "dedupe_key", ignoreDuplicates: true }
  );
}

/**
 * Scans current store conditions and opens new alerts for anything not
 * already flagged (open). Called when the admin opens /admin/analytics/alertas
 * — there's no background scheduler in this project yet, so this is the
 * practical way to keep the alert list current without a cron job.
 */
export async function computeAndSyncAlerts(): Promise<void> {
  const admin = createAdminClient();
  const thresholds = await getAnalyticsThresholds();

  const { data: inventoryRows } = await admin.from("inventory").select("product_id, variant_id, quantity, reserved_quantity");
  const productIds = [...new Set((inventoryRows ?? []).map((r) => r.product_id))];
  const { data: products } = productIds.length > 0 ? await admin.from("products").select("id, name, cost_price").in("id", productIds) : { data: [] };
  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  for (const inv of inventoryRows ?? []) {
    const available = Math.max(0, inv.quantity - inv.reserved_quantity);
    const product = productById.get(inv.product_id);
    if (!product) continue;

    if (available <= 0) {
      await upsertAlert(admin, {
        alertType: "estoque_zerado",
        title: `Produto sem estoque: ${product.name}`,
        description: "Este produto está com estoque zerado e não pode ser vendido até reposição.",
        priority: "alta",
        relatedLink: "/admin/produtos",
        dedupeKey: `estoque_zerado:${inv.product_id}:${inv.variant_id ?? "null"}`,
      });
    } else if (available <= thresholds.lowStockQuantity) {
      await upsertAlert(admin, {
        alertType: "estoque_baixo",
        title: `Estoque baixo: ${product.name}`,
        description: `Restam apenas ${available} unidade(s) em estoque.`,
        priority: "media",
        relatedLink: "/admin/produtos",
        dedupeKey: `estoque_baixo:${inv.product_id}:${inv.variant_id ?? "null"}`,
      });
    }
  }

  const since30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentPaidOrders } = await admin.from("orders").select("id").eq("payment_status", "pago").gte("paid_at", since30Days);
  const recentOrderIds = (recentPaidOrders ?? []).map((o) => o.id);
  if (recentOrderIds.length > 0) {
    const { data: items } = await admin.from("order_items").select("product_id").in("order_id", recentOrderIds);
    const soldProductIds = [...new Set((items ?? []).map((i) => i.product_id).filter((id): id is string => !!id))];
    for (const productId of soldProductIds) {
      const product = productById.get(productId);
      if (product && product.cost_price == null) {
        await upsertAlert(admin, {
          alertType: "produto_sem_custo",
          title: `Produto sem custo cadastrado: ${product.name}`,
          description: "Cadastre o custo deste produto para que o lucro estimado seja calculado corretamente.",
          priority: "baixa",
          relatedLink: "/admin/analytics/vendas",
          dedupeKey: `produto_sem_custo:${productId}`,
        });
      }
    }
  }

  const { data: flashSaleProducts } = await admin
    .from("products")
    .select("id, name, flash_sale_price, flash_sale_ends_at")
    .not("flash_sale_price", "is", null)
    .not("flash_sale_ends_at", "is", null)
    .lt("flash_sale_ends_at", new Date().toISOString());
  for (const product of flashSaleProducts ?? []) {
    await upsertAlert(admin, {
      alertType: "oferta_encerrada",
      title: `Oferta relâmpago encerrada: ${product.name}`,
      description: "A oferta relâmpago deste produto já encerrou. Remova o preço promocional se não for renovar.",
      priority: "baixa",
      relatedLink: "/admin/produtos",
      dedupeKey: `oferta_encerrada:${product.id}`,
    });
  }

  const { data: coupons } = await admin.from("coupons").select("id, code, expires_at, max_uses, used_count").eq("is_active", true);
  for (const coupon of coupons ?? []) {
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      await upsertAlert(admin, {
        alertType: "cupom_expirado",
        title: `Cupom expirado ainda ativo: ${coupon.code}`,
        description: "Este cupom já passou da data de encerramento mas continua marcado como ativo.",
        priority: "baixa",
        relatedLink: "/admin/cupons",
        dedupeKey: `cupom_expirado:${coupon.id}`,
      });
    }
    if (coupon.max_uses != null && coupon.used_count / coupon.max_uses >= 0.8 && coupon.used_count < coupon.max_uses) {
      await upsertAlert(admin, {
        alertType: "cupom_proximo_limite",
        title: `Cupom perto do limite de uso: ${coupon.code}`,
        description: `Já foram usados ${coupon.used_count} de ${coupon.max_uses} usos disponíveis.`,
        priority: "media",
        relatedLink: "/admin/cupons",
        dedupeKey: `cupom_proximo_limite:${coupon.id}`,
      });
    }
  }

  const { data: promotions } = await admin.from("promotions").select("id, name, expires_at").eq("is_active", true);
  const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  for (const promo of promotions ?? []) {
    if (promo.expires_at && new Date(promo.expires_at) < soon && new Date(promo.expires_at) > new Date()) {
      await upsertAlert(admin, {
        alertType: "promocao_proxima_fim",
        title: `Promoção perto de encerrar: ${promo.name}`,
        description: "Esta promoção encerra nos próximos dias.",
        priority: "baixa",
        relatedLink: "/admin/analytics/promocoes",
        dedupeKey: `promocao_proxima_fim:${promo.id}`,
      });
    }
  }

  const cutoff = new Date(Date.now() - thresholds.abandonedCartHours * 60 * 60 * 1000);
  const { data: carts } = await admin.from("carts").select("id, updated_at").lt("updated_at", cutoff.toISOString());
  if (carts && carts.length > 0) {
    const { data: cartItems } = await admin
      .from("cart_items")
      .select("cart_id, quantity, unit_price")
      .in(
        "cart_id",
        carts.map((c) => c.id)
      );
    const valueByCart = new Map<string, number>();
    for (const item of cartItems ?? []) {
      valueByCart.set(item.cart_id, (valueByCart.get(item.cart_id) ?? 0) + item.quantity * item.unit_price);
    }
    for (const cart of carts) {
      const value = valueByCart.get(cart.id) ?? 0;
      if (value >= thresholds.highValueCustomerTotalSpent) {
        await upsertAlert(admin, {
          alertType: "carrinho_alto_valor",
          title: "Carrinho de alto valor não finalizado",
          description: `Um carrinho de ${value.toFixed(2)} não foi finalizado.`,
          priority: "media",
          relatedLink: "/admin/analytics/carrinhos",
          dedupeKey: `carrinho_alto_valor:${cart.id}`,
        });
      }
    }
  }

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: refusedCount } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("payment_status", "recusado")
    .gte("updated_at", last24h);
  if ((refusedCount ?? 0) >= 3) {
    await upsertAlert(admin, {
      alertType: "pagamentos_recusados",
      title: "Vários pagamentos recusados nas últimas 24 horas",
      description: `${refusedCount} pagamentos foram recusados nas últimas 24 horas.`,
      priority: "alta",
      relatedLink: "/admin/pedidos?payment=recusado",
      dedupeKey: `pagamentos_recusados:${new Date().toISOString().slice(0, 10)}`,
    });
  }
}

export async function listAlerts(status?: Alert["status"]): Promise<Alert[]> {
  const admin = createAdminClient();
  let query = admin.from("alerts").select("*").order("priority", { ascending: false }).order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data } = await query.limit(200);
  return data ?? [];
}
