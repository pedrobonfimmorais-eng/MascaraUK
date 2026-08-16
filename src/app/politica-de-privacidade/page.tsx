import type { Metadata } from "next";
import { t } from "@/i18n";
import { LegalPageLayout } from "@/components/layout/LegalPageLayout";
import { getCustomPage } from "@/lib/pages";

export const metadata: Metadata = { title: t("legal.privacyPolicyTitle") };

export default async function PrivacyPolicyPage() {
  const page = await getCustomPage("politica-de-privacidade", t("legal.privacyPolicyTitle"));
  return <LegalPageLayout title={page.title} content={page.content} />;
}
