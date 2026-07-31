import type { Metadata } from "next";
import Link from "next/link";
import { ta } from "@/i18n";
import { AnalyticsNav } from "@/components/analytics/AnalyticsNav";
import { PeriodFilterBar } from "@/components/analytics/PeriodFilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { parseAnalyticsSearchParams, type AnalyticsSearchParams } from "@/lib/analytics/request-params";
import { getProductPerformance, sortProductPerformance, type ProductSortKey } from "@/lib/analytics/products";

export const metadata: Metadata = { title: ta("analytics.nav.products") };

interface ProductsAnalyticsPageProps {
  searchParams: Promise<AnalyticsSearchParams & { ordenar?: string; q?: string }>;
}

const SORT_OPTIONS: { value: ProductSortKey; label: string }[] = [
  { value: "mostViewed", label: "Mais visualizados" },
  { value: "mostAddedToCart", label: "Mais adicionados ao carrinho" },
  { value: "bestSelling", label: "Mais vendidos" },
  { value: "highestRevenue", label: "Maior faturamento" },
  { value: "highestConversion", label: "Maior conversão" },
  { value: "lowestConversion", label: "Menor conversão" },
  { value: "mostAbandoned", label: "Mais abandonados" },
  { value: "mostRefunded", label: "Mais reembolsados" },
];

export default async function ProductsAnalyticsPage({ searchParams }: ProductsAnalyticsPageProps) {
  const rawParams = await searchParams;
  const { period, includeTest } = parseAnalyticsSearchParams(rawParams);
  const sort = (SORT_OPTIONS.find((o) => o.value === rawParams.ordenar)?.value ?? "mostViewed") as ProductSortKey;
  const search = (rawParams.q ?? "").trim().toLowerCase();

  const rows = await getProductPerformance(period.range, includeTest);
  const filtered = search ? rows.filter((r) => r.name.toLowerCase().includes(search)) : rows;
  const sorted = sortProductPerformance(filtered, sort);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-brand-secondary">{ta("analytics.nav.products")}</h1>
      <AnalyticsNav active="produtos" />
      <PeriodFilterBar
        period={period.key}
        from={rawParams.de}
        to={rawParams.ate}
        compare={rawParams.comparar === "lastMonth" ? "lastMonth" : rawParams.comparar === "lastYear" ? "lastYear" : "previous"}
        includeTest={includeTest}
      />

      <form method="get" className="flex flex-wrap gap-3 text-sm">
        <input type="hidden" name="periodo" value={rawParams.periodo ?? period.key} />
        <input
          name="q"
          defaultValue={rawParams.q}
          placeholder={ta("analytics.products.searchPlaceholder")}
          className="rounded-lg border border-gray-300 px-3 py-2"
        />
        <select name="ordenar" defaultValue={sort} className="rounded-lg border border-gray-300 px-3 py-2">
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-brand-primary px-4 py-2 font-medium text-white">
          {ta("products.applyFilters")}
        </button>
      </form>

      {sorted.length === 0 ? (
        <EmptyState title={ta("analytics.insufficientData")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{ta("products.pageTitle")}</th>
                <th className="px-4 py-3">{ta("analytics.products.columnViews")}</th>
                <th className="px-4 py-3">{ta("analytics.products.columnCartAdds")}</th>
                <th className="px-4 py-3">{ta("analytics.products.columnCheckouts")}</th>
                <th className="px-4 py-3">{ta("analytics.products.columnPurchases")}</th>
                <th className="px-4 py-3">{ta("analytics.metrics.itemsSold")}</th>
                <th className="px-4 py-3">{ta("admin.orders.columnTotal")}</th>
                <th className="px-4 py-3">{ta("analytics.products.columnConversion")}</th>
                <th className="px-4 py-3">{ta("admin.sidebar.inventory")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sorted.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/analytics/produtos/${product.id}`} className="flex items-center gap-2 font-medium text-brand-primary hover:underline">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.imageUrl} alt={product.name} className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <span className="h-8 w-8 rounded bg-gray-100" />
                      )}
                      {product.name}
                    </Link>
                    {product.categoryName && <p className="pl-10 text-xs text-gray-400">{product.categoryName}</p>}
                  </td>
                  <td className="px-4 py-3">{product.views}</td>
                  <td className="px-4 py-3">{product.addToCart}</td>
                  <td className="px-4 py-3">{product.beginCheckout}</td>
                  <td className="px-4 py-3">{product.purchases}</td>
                  <td className="px-4 py-3">{product.quantitySold}</td>
                  <td className="px-4 py-3">{formatCurrency(product.revenue)}</td>
                  <td className="px-4 py-3">{product.conversionRate == null ? "—" : `${product.conversionRate}%`}</td>
                  <td className="px-4 py-3">
                    {product.stock <= 0 ? <Badge tone="danger">{ta("product.outOfStock")}</Badge> : product.stock}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
