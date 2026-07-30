import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { t } from "@/i18n";
import { OrderDetailView } from "@/components/orders/OrderDetailView";
import { AdminOrderActions } from "@/components/admin/AdminOrderActions";
import { loadOrderDetail } from "@/lib/orders/order-detail";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: t("admin.orders.detailTitle") };

interface AdminOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const { id } = await params;
  const detail = await loadOrderDetail(id);
  if (!detail) notFound();

  const { order, items, events, refunds } = detail;

  const admin = createAdminClient();
  const { data: payments } = await admin
    .from("payments")
    .select("stripe_checkout_session_id, stripe_payment_intent_id, status, amount, created_at")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false });

  const notes = events.filter((event) => event.event_type === "observacao_adicionada");
  const billing = order.billing_address_snapshot as Record<string, unknown> | null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-secondary">
          {t("admin.orders.detailTitle")} #{order.order_number}
        </h1>
      </div>

      <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-700">
        <h2 className="mb-2 font-semibold text-brand-secondary">{t("admin.orders.customer")}</h2>
        <p>{order.customer_name}</p>
        <p>{order.customer_email}</p>
        <p>{order.customer_phone}</p>
        {order.notes && (
          <p className="mt-2 text-gray-600">
            <strong>{t("admin.orders.customerNote")}:</strong> {order.notes}
          </p>
        )}
      </div>

      <OrderDetailView order={order} items={items} events={events} refunds={refunds} />

      {billing && (
        <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
          <h3 className="mb-2 font-semibold text-brand-secondary">{t("checkout.billingAddress")}</h3>
          <p>{String(billing.recipient_name ?? "")}</p>
          <p>
            {String(billing.street ?? "")}, {String(billing.number ?? "")}
            {billing.complement ? ` — ${billing.complement}` : ""}
          </p>
          <p>
            {String(billing.neighborhood ?? "")} — {String(billing.city ?? "")}/{String(billing.state ?? "")}
          </p>
          <p>CEP {String(billing.zip_code ?? "")}</p>
        </div>
      )}

      {payments && payments.length > 0 && (
        <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
          <h3 className="mb-2 font-semibold text-brand-secondary">{t("admin.orders.stripeData")}</h3>
          {payments.map((payment, index) => (
            <p key={index} className="break-all">
              Session: {payment.stripe_checkout_session_id ?? "—"} · PaymentIntent: {payment.stripe_payment_intent_id ?? "—"}
            </p>
          ))}
        </div>
      )}

      <AdminOrderActions order={order} notes={notes} />
    </div>
  );
}
