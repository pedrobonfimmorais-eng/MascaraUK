import type { Metadata } from "next";
import { t } from "@/i18n";
import { LegalPageLayout } from "@/components/layout/LegalPageLayout";
import { getCustomPage } from "@/lib/pages";

export const metadata: Metadata = { title: t("legal.returnsPolicyTitle") };

export default async function ReturnsPolicyPage() {
  const page = await getCustomPage("trocas-e-devolucoes", t("legal.returnsPolicyTitle"));
  return <LegalPageLayout title={page.title} content={page.content} />;
}
