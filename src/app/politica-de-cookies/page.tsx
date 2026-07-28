import type { Metadata } from "next";
import { t } from "@/i18n";
import { LegalPageLayout } from "@/components/layout/LegalPageLayout";
import { getCustomPage } from "@/lib/pages";

export const metadata: Metadata = { title: t("legal.cookiePolicyTitle") };

export default async function CookiePolicyPage() {
  const page = await getCustomPage("politica-de-cookies", t("legal.cookiePolicyTitle"));
  return <LegalPageLayout title={page.title} content={page.content} />;
}
