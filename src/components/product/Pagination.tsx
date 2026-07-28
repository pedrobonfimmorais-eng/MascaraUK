import Link from "next/link";
import { t } from "@/i18n";

export function Pagination({
  basePath,
  currentParams,
  page,
  totalPages,
}: {
  basePath: string;
  currentParams: Record<string, string | undefined>;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  function hrefForPage(target: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(currentParams)) {
      if (value && key !== "pagina") params.set(key, value);
    }
    if (target > 1) params.set("pagina", String(target));
    const query = params.toString();
    return `${basePath}${query ? `?${query}` : ""}`;
  }

  return (
    <nav aria-label={t("products.page", { current: page, total: totalPages })} className="flex items-center justify-center gap-2">
      <Link
        href={hrefForPage(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={`rounded-lg border border-gray-300 px-3 py-2 text-sm ${
          page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-gray-50"
        }`}
      >
        {t("products.previousPage")}
      </Link>

      <span className="text-sm text-gray-600">{t("products.page", { current: page, total: totalPages })}</span>

      <Link
        href={hrefForPage(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={`rounded-lg border border-gray-300 px-3 py-2 text-sm ${
          page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-gray-50"
        }`}
      >
        {t("products.nextPage")}
      </Link>
    </nav>
  );
}
