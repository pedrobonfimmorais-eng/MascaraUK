import type { Metadata } from "next";
import { t } from "@/i18n";
import { LegalPageLayout } from "@/components/layout/LegalPageLayout";
import { getCustomPage } from "@/lib/pages";

export const metadata: Metadata = { title: t("legal.deliveryPolicyTitle") };

export default async function DeliveryPolicyPage() {
  const page = await getCustomPage("politica-de-entrega", t("legal.deliveryPolicyTitle"));
  return <LegalPageLayout title={page.title} content={page.content} />;
}
