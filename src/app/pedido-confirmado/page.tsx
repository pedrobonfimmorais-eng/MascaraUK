import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: t("orderConfirmed.title") };

interface OrderConfirmedPageProps {
  searchParams: Promise<{ pedido?: string }>;
}

export default async function OrderConfirmedPage({ searchParams }: OrderConfirmedPageProps) {
  const { pedido } = await searchParams;

  return (
    <Container className="flex flex-col items-center gap-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckIcon />
      </div>
      <h1 className="text-2xl font-bold text-brand-secondary sm:text-3xl">
        {t("orderConfirmed.title")}
      </h1>
      <p className="max-w-md text-gray-600">{t("orderConfirmed.message")}</p>
      {pedido && (
        <p className="text-sm text-gray-500">
          {t("orderConfirmed.orderNumber")}: <span className="font-medium">{pedido}</span>
        </p>
      )}
      <div className="mt-4 flex gap-3">
        <Button href="/minha-conta/pedidos" variant="outline">
          {t("orderConfirmed.trackOrder")}
        </Button>
        <Button href="/">{t("orderConfirmed.backToStore")}</Button>
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
