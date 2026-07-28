import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { t, type TranslationKey } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t("account.orderDetailTitle") };

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    notFound();
  }

  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, total, subtotal, shipping_total, discount_total, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("id, product_name_snapshot, variant_label_snapshot, unit_price, quantity, total")
    .eq("order_id", order.id);

  return (
    <Container className="max-w-2xl py-10">
      <h1 className="text-2xl font-bold text-brand-secondary">{t("account.orderDetailTitle")}</h1>

      <div className="mt-6 flex items-center justify-between rounded-xl border border-gray-200 p-4">
        <div>
          <p className="font-medium text-brand-secondary">#{order.order_number}</p>
          <p className="text-xs text-gray-500">
            {t("account.orderDate")}: {new Date(order.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <Badge tone="brand">{t(`orderStatus.${order.status}` as TranslationKey)}</Badge>
      </div>

      <h2 className="mt-8 mb-3 font-semibold text-brand-secondary">{t("account.orderItems")}</h2>
      <div className="flex flex-col divide-y divide-gray-200 rounded-xl border border-gray-200">
        {(items ?? []).map((item) => (
          <div key={item.id} className="flex items-center justify-between p-4 text-sm">
            <div>
              <p className="font-medium text-brand-secondary">{item.product_name_snapshot}</p>
              {item.variant_label_snapshot && (
                <p className="text-xs text-gray-500">{item.variant_label_snapshot}</p>
              )}
              <p className="text-xs text-gray-500">Qtd: {item.quantity}</p>
            </div>
            <span className="font-medium text-brand-secondary">{formatCurrency(item.total)}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-between border-t border-gray-200 pt-4 font-semibold text-brand-secondary">
        <span>{t("account.orderTotal")}</span>
        <span>{formatCurrency(order.total)}</span>
      </div>
    </Container>
  );
}
