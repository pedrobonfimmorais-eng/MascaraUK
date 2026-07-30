import { t } from "@/i18n";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-6xl font-bold text-brand-primary">404</p>
      <h1 className="text-2xl font-bold text-brand-secondary">{t("pages.notFound.title")}</h1>
      <p className="text-gray-600">{t("pages.notFound.message")}</p>
      <Button href="/">{t("pages.notFound.backHome")}</Button>
    </div>
  );
}
