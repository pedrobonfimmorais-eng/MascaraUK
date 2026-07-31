import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { GuestOrderTrackingForm } from "@/components/orders/GuestOrderTrackingForm";

export const metadata: Metadata = { title: t("orderTracking.pageTitle") };

export default function GuestOrderTrackingPage() {
  return (
    <Container className="flex max-w-md flex-col gap-6 py-16">
      <div>
        <h1 className="text-2xl font-bold text-brand-secondary">{t("orderTracking.pageTitle")}</h1>
        <p className="mt-1 text-gray-600">{t("orderTracking.pageSubtitle")}</p>
      </div>
      <GuestOrderTrackingForm />
    </Container>
  );
}
