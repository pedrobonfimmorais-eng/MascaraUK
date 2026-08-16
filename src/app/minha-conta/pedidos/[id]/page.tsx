import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { OrderDetailView } from "@/components/orders/OrderDetailView";
import { CustomerOrderActions } from "@/components/orders/CustomerOrderActions";
import { getCurrentUser } from "@/lib/auth";
import { loadOrderDetail } from "@/lib/orders/order-detail";

export const metadata: Metadata = { title: t("account.orderDetailTitle") };

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirect=/minha-conta/pedidos/${id}`);

  const detail = await loadOrderDetail(id);

  // A customer can only ever view their own orders — never trust the id
  // in the URL alone.
  if (!detail || detail.order.user_id !== user.id) {
    notFound();
  }

  return (
    <Container className="max-w-2xl py-10">
      <h1 className="mb-6 text-2xl font-bold text-brand-secondary">{t("account.orderDetailTitle")}</h1>
      <OrderDetailView order={detail.order} items={detail.items} events={detail.events} refunds={detail.refunds} />
      <div className="mt-6">
        <CustomerOrderActions order={detail.order} />
      </div>
    </Container>
  );
}
