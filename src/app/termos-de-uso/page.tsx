import type { Metadata } from "next";
import { t } from "@/i18n";
import { LegalPageLayout } from "@/components/layout/LegalPageLayout";
import { getCustomPage } from "@/lib/pages";

export const metadata: Metadata = { title: t("legal.termsOfUseTitle") };

export default async function TermsOfUsePage() {
  const page = await getCustomPage("termos-de-uso", t("legal.termsOfUseTitle"));
  return <LegalPageLayout title={page.title} content={page.content} />;
}
