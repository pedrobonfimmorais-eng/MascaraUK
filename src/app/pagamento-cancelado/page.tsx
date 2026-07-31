import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { RetryPaymentButton } from "@/components/checkout/RetryPaymentButton";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: t("orderCancelled.title") };

interface PaymentCancelledPageProps {
  searchParams: Promise<{ pedido?: string }>;
}

export default async function PaymentCancelledPage({ searchParams }: PaymentCancelledPageProps) {
  const { pedido } = await searchParams;

  let orderId: string | null = null;
  if (pedido && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("orders")
      .select("id, payment_status, status")
      .eq("order_number", pedido)
      .maybeSingle();

    if (data && data.status !== "cancelado" && !["pago", "reembolsado", "reembolsado_parcial"].includes(data.payment_status)) {
      orderId = data.id;
    }
  }

  return (
    <Container className="flex flex-col items-center gap-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <WarningIcon />
      </div>
      <h1 className="text-2xl font-bold text-brand-secondary sm:text-3xl">{t("orderCancelled.title")}</h1>
      <p className="max-w-md text-gray-600">{t("orderCancelled.message")}</p>
      <p className="max-w-md text-sm text-gray-500">{t("orderCancelled.noChargeNotice")}</p>

      <div className="mt-4 flex flex-col items-center gap-3">
        {orderId && <RetryPaymentButton orderId={orderId} />}
        <Button href="/carrinho" variant="outline">
          {t("orderCancelled.backToCart")}
        </Button>
      </div>
    </Container>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A1 1 0 003 19.5h18a1 1 0 00.89-1.46L13.71 3.86a1 1 0 00-1.72 0z" />
    </svg>
  );
}
