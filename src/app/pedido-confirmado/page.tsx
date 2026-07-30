import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { OrderDetailView } from "@/components/orders/OrderDetailView";
import { getCurrentUser } from "@/lib/auth";
import { loadOrderDetailByNumber, isValidGuestToken } from "@/lib/orders/order-detail";

export const metadata: Metadata = { title: t("orderConfirmed.title") };

interface OrderConfirmedPageProps {
  searchParams: Promise<{ pedido?: string; token?: string }>;
}

/**
 * Never trusts the order number alone from the URL: the order is only
 * shown if it belongs to the signed-in customer, OR a valid (unexpired)
 * guest access token was provided alongside it.
 */
export default async function OrderConfirmedPage({ searchParams }: OrderConfirmedPageProps) {
  const { pedido, token } = await searchParams;
  const user = await getCurrentUser();

  const detail = pedido ? await loadOrderDetailByNumber(pedido) : null;

  let isAuthorized = false;
  if (detail) {
    if (user && detail.order.user_id === user.id) {
      isAuthorized = true;
    } else if (!detail.order.user_id && token) {
      isAuthorized = await isValidGuestToken(detail.order.id, token);
    }
  }

  if (!detail || !isAuthorized) {
    return (
      <Container className="flex flex-col items-center gap-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-brand-secondary">{t("orderConfirmed.title")}</h1>
        <p className="max-w-md text-gray-600">{t("errors.orderNotFound")}</p>
        <Button href="/">{t("orderConfirmed.backToStore")}</Button>
      </Container>
    );
  }

  const { order, items } = detail;

  return (
    <Container className="max-w-2xl py-16">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckIcon />
        </div>
        <h1 className="text-2xl font-bold text-brand-secondary sm:text-3xl">{t("orderConfirmed.title")}</h1>
        <p className="max-w-md text-gray-600">{t("orderConfirmed.message")}</p>
        <p className="text-sm text-gray-500">
          {t("orderConfirmed.orderNumber")}: <span className="font-medium">{order.order_number}</span>
        </p>
        <p className="text-sm text-gray-500">
          {t("account.email")}: <span className="font-medium">{order.customer_email}</span>
        </p>
      </div>

      <OrderDetailView order={order} items={items} />

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button href={user ? "/minha-conta/pedidos" : "/"} variant="outline">
          {t("orderConfirmed.trackOrder")}
        </Button>
        <Button href="/produtos">{t("orderConfirmed.backToStore")}</Button>
      </div>
    </Container>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
