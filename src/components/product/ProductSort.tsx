"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@/i18n";
import { sortOptionToQuery } from "@/lib/catalog-query";
import type { SortOption } from "@/lib/catalog";

const sortOrder: SortOption[] = [
  "relevance",
  "newest",
  "bestselling",
  "price_asc",
  "price_desc",
  "discount",
  "rating",
];

const sortLabels: Record<SortOption, string> = {
  relevance: t("products.sortRelevance"),
  newest: t("products.sortNewest"),
  bestselling: t("products.sortBestSelling"),
  price_asc: t("products.sortPriceAsc"),
  price_desc: t("products.sortPriceDesc"),
  discount: t("products.sortBiggestDiscount"),
  rating: t("products.sortBestRated"),
};

export function ProductSort({ basePath }: { basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("ordenar") ?? "relevancia";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "relevancia") {
      params.delete("ordenar");
    } else {
      params.set("ordenar", value);
    }
    params.delete("pagina");
    router.push(`${basePath}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <span className="hidden sm:inline">{t("products.sortBy")}</span>
      <select
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
      >
        {sortOrder.map((option) => (
          <option key={option} value={sortOptionToQuery[option]}>
            {sortLabels[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
