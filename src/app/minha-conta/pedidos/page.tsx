import type { Metadata } from "next";
import Link from "next/link";
import { t, type TranslationKey } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t("account.ordersPageTitle") };

export default async function OrdersPage() {
  const user = await getCurrentUser();
  let orders: { id: string; order_number: string; status: string; total: number; created_at: string }[] = [];

  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, status, total, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    orders = data ?? [];
  }

  return (
    <Container className="flex flex-col gap-6 py-10">
      <h1 className="text-2xl font-bold text-brand-secondary">{t("account.ordersPageTitle")}</h1>

      {orders.length === 0 ? (
        <EmptyState title={t("account.noOrders")} />
      ) : (
        <div className="flex flex-col divide-y divide-gray-200 rounded-xl border border-gray-200">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/minha-conta/pedidos/${order.id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50"
            >
              <div>
                <p className="font-medium text-brand-secondary">#{order.order_number}</p>
                <p className="text-xs text-gray-500">
                  {new Date(order.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <Badge tone="brand">{t(`orderStatus.${order.status}` as TranslationKey)}</Badge>
              <span className="font-medium text-brand-secondary">{formatCurrency(order.total)}</span>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
