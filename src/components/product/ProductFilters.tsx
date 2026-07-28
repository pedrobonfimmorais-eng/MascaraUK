"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@/i18n";
import { Button } from "@/components/ui/Button";
import { colorOptions, materialOptions, sizeOptions, themeOptions } from "@/config/catalog-facets";

export function ProductFilters({ basePath }: { basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("pagina");
    router.push(`${basePath}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function toggleParam(key: string) {
    updateParam(key, searchParams.get(key) === "1" ? null : "1");
  }

  function clearFilters() {
    router.push(basePath);
    setIsMobileOpen(false);
  }

  const hasActiveFilters = [
    "precoMin",
    "precoMax",
    "estoque",
    "tamanho",
    "cor",
    "material",
    "tema",
    "promocao",
    "relampago",
  ].some((key) => searchParams.get(key));

  const controls = (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-brand-secondary">
          {t("products.filterPrice")}
        </legend>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="precoMin">
            {t("products.filterPriceMin")}
          </label>
          <input
            id="precoMin"
            type="number"
            min={0}
            placeholder={t("products.filterPriceMin")}
            defaultValue={searchParams.get("precoMin") ?? ""}
            onBlur={(e) => updateParam("precoMin", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
          <span className="text-gray-400">–</span>
          <label className="sr-only" htmlFor="precoMax">
            {t("products.filterPriceMax")}
          </label>
          <input
            id="precoMax"
            type="number"
            min={0}
            placeholder={t("products.filterPriceMax")}
            defaultValue={searchParams.get("precoMax") ?? ""}
            onBlur={(e) => updateParam("precoMax", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-brand-secondary">
          {t("products.filterAvailability")}
        </legend>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={searchParams.get("estoque") === "1"}
            onChange={() => toggleParam("estoque")}
            className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
          />
          {t("products.inStockOnly")}
        </label>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-brand-secondary">
          {t("products.filterSize")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {sizeOptions.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => updateParam("tamanho", searchParams.get("tamanho") === size ? null : size)}
              aria-pressed={searchParams.get("tamanho") === size}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                searchParams.get("tamanho") === size
                  ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                  : "border-gray-300 text-gray-700"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-brand-secondary">
          {t("products.filterColor")}
        </legend>
        <select
          value={searchParams.get("cor") ?? ""}
          onChange={(e) => updateParam("cor", e.target.value || null)}
          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="">{t("common.seeAll")}</option>
          {colorOptions.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-brand-secondary">
          {t("products.filterMaterial")}
        </legend>
        <select
          value={searchParams.get("material") ?? ""}
          onChange={(e) => updateParam("material", e.target.value || null)}
          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="">{t("common.seeAll")}</option>
          {materialOptions.map((material) => (
            <option key={material} value={material}>
              {material}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-brand-secondary">
          {t("products.filterTheme")}
        </legend>
        <select
          value={searchParams.get("tema") ?? ""}
          onChange={(e) => updateParam("tema", e.target.value || null)}
          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="">{t("common.seeAll")}</option>
          {themeOptions.map((theme) => (
            <option key={theme} value={theme}>
              {theme}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={searchParams.get("promocao") === "1"}
            onChange={() => toggleParam("promocao")}
            className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
          />
          {t("products.filterOnSale")}
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={searchParams.get("relampago") === "1"}
            onChange={() => toggleParam("relampago")}
            className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
          />
          {t("products.filterFlashSale")}
        </label>
      </fieldset>

      {hasActiveFilters && (
        <Button variant="outline" onClick={clearFilters} className="w-full">
          {t("products.clearFilters")}
        </Button>
      )}
    </div>
  );

  return (
    <>
      <div className="md:hidden">
        <Button variant="outline" onClick={() => setIsMobileOpen(true)} className="w-full">
          {t("products.openFilters")}
        </Button>

        {isMobileOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setIsMobileOpen(false)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t("products.filters")}
              className="relative ml-auto flex h-full w-full max-w-xs flex-col gap-4 overflow-y-auto bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-brand-secondary">{t("products.filters")}</h2>
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  aria-label={t("products.closeFilters")}
                  className="rounded-lg p-2 hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>
              {controls}
              <Button onClick={() => setIsMobileOpen(false)} className="mt-2 w-full">
                {t("products.applyFilters")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <aside className="hidden w-64 shrink-0 md:block">
        <h2 className="mb-4 text-base font-semibold text-brand-secondary">{t("products.filters")}</h2>
        {controls}
      </aside>
    </>
  );
}
