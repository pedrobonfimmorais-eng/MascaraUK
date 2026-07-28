import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";

export function LegalPageLayout({ title, content }: { title: string; content: string }) {
  return (
    <Container className="max-w-3xl py-10">
      <h1 className="text-2xl font-bold text-brand-secondary sm:text-3xl">{title}</h1>
      <p className="mt-1 text-xs text-gray-400">
        {t("legal.lastUpdated")}: {new Date().toLocaleDateString("pt-BR")}
      </p>
      <div className="mt-6 whitespace-pre-line text-sm leading-relaxed text-gray-700">{content}</div>
    </Container>
  );
}
