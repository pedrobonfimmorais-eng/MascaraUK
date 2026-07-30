import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { t, type TranslationKey } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { AccountNav } from "@/components/account/AccountNav";
import { formatCurrency } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t("account.ordersPageTitle") };

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/minha-conta/pedidos");

  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, payment_status, total, created_at, order_items(count)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <Container className="flex flex-col gap-6 py-10">
      <h1 className="text-2xl font-bold text-brand-secondary">{t("account.ordersPageTitle")}</h1>
      <AccountNav active="pedidos" />

      {!orders || orders.length === 0 ? (
        <EmptyState title={t("account.noOrders")} action={<Link href="/produtos">{t("common.seeAll")}</Link>} />
      ) : (
        <div className="flex flex-col divide-y divide-gray-200 rounded-xl border border-gray-200">
          {orders.map((order) => {
            const itemCount = Array.isArray(order.order_items)
              ? (order.order_items[0] as { count: number } | undefined)?.count ?? 0
              : 0;
            return (
              <Link
                key={order.id}
                href={`/minha-conta/pedidos/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-brand-secondary">#{order.order_number}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleDateString("pt-BR")} · {itemCount} {t("account.items")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge tone="brand">{t(`orderStatus.${order.status}` as TranslationKey)}</Badge>
                  <Badge tone="neutral">{t(`paymentStatus.${order.payment_status}` as TranslationKey)}</Badge>
                </div>
                <span className="font-medium text-brand-secondary">{formatCurrency(order.total)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </Container>
  );
}
