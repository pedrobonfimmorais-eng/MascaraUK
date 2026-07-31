import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = { title: t("about.pageTitle") };

export default function AboutPage() {
  return (
    <Container className="max-w-3xl py-10">
      <h1 className="text-2xl font-bold text-brand-secondary sm:text-3xl">{t("about.pageTitle")}</h1>
      <p className="mt-4 leading-relaxed text-gray-700">{t("about.intro")}</p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <h2 className="font-semibold text-brand-secondary">{t("about.missionTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">{t("about.missionText")}</p>
        </div>
      </div>
    </Container>
  );
}
