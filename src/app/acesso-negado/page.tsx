import type { Metadata } from "next";
import { t } from "@/i18n";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: t("pages.accessDenied.title") };

export default function AccessDeniedPage() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-brand-secondary">{t("pages.accessDenied.title")}</h1>
      <p className="text-gray-600">{t("pages.accessDenied.message")}</p>
      <Button href="/">{t("pages.accessDenied.backHome")}</Button>
    </div>
  );
}
