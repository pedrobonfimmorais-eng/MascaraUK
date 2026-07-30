import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { t } from "@/i18n";
import { AnalyticsNav } from "@/components/analytics/AnalyticsNav";
import { PeriodFilterBar } from "@/components/analytics/PeriodFilterBar";
import { FunnelChart } from "@/components/analytics/FunnelChart";
import { ProductCostEditor } from "@/components/analytics/ProductCostEditor";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { parseAnalyticsSearchParams, type AnalyticsSearchParams } from "@/lib/analytics/request-params";
import { getProductFunnel, getVariantPerformance } from "@/lib/analytics/products";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: t("analytics.nav.products") };

interface ProductAnalyticsDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<AnalyticsSearchParams>;
}

export default async function ProductAnalyticsDetailPage({ params, searchParams }: ProductAnalyticsDetailPageProps) {
  const { id } = await params;
  const rawParams = await searchParams;
  const { period, includeTest } = parseAnalyticsSearchParams(rawParams);

  const admin = createAdminClient();
  const { data: product } = await admin
    .from("products")
    .select("id, name, base_price, is_active, cost_price, flash_sale_price, flash_sale_ends_at, compare_at_price, categories(name), product_images(url, is_primary)")
    .eq("id", id)
    .maybeSingle();

  if (!product) notFound();

  const { data: inventoryRows } = await admin.from("inventory").select("quantity, reserved_quantity").eq("product_id", id).is("variant_id", null);
  const stock = (inventoryRows ?? []).reduce((sum, r) => sum + Math.max(0, r.quantity - r.reserved_quantity), 0);

  const [funnel, variants] = await Promise.all([
    getProductFunnel(id, period.range, includeTest),
    getVariantPerformance(id, period.range, includeTest),
  ]);

  const images = (product as unknown as { product_images?: { url: string; is_primary: boolean }[] }).product_images ?? [];
  const primaryImage = images.find((i) => i.is_primary) ?? images[0];
  const categories = (product as unknown as { categories?: { name: string } | { name: string }[] | null }).categories;
  const categoryName = Array.isArray(categories) ? categories[0]?.name : categories?.name;

  const problems: string[] = [];
  if (funnel.views >= 50 && (funnel.conversionRate ?? 0) < 1) problems.push(t("analytics.problems.highViewsLowSales"));
  if (funnel.addToCart >= 20 && funnel.quantitySold === 0) problems.push(t("analytics.problems.highCartLowSales"));
  if (product.cost_price == null) problems.push(t("analytics.problems.noCost"));
  if (product.flash_sale_ends_at && new Date(product.flash_sale_ends_at) < new Date() && product.flash_sale_price != null) {
    problems.push(t("analytics.problems.expiredFlashSale"));
  }
  if (funnel.refundedAmount > 0 && funnel.revenue > 0 && funnel.refundedAmount / funnel.revenue > 0.2) {
    problems.push(t("analytics.problems.highRefunds"));
  }

  const bestViewedVariant = [...variants].sort((a, b) => b.views - a.views)[0];
  const bestCartVariant = [...variants].sort((a, b) => b.addToCart - a.addToCart)[0];
  const bestSellingVariant = [...variants].sort((a, b) => b.quantitySold - a.quantitySold)[0];

  return (
    <div className="flex flex-col gap-6">
      <AnalyticsNav active="produtos" />
      <div className="flex items-center gap-4 rounded-xl border border-gray-200 p-4">
        {primaryImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={primaryImage.url} alt={product.name} className="h-20 w-20 rounded-lg object-cover" />
        ) : (
          <div className="h-20 w-20 rounded-lg bg-gray-100" />
        )}
        <div>
          <h1 className="text-xl font-bold text-brand-secondary">{product.name}</h1>
          <p className="text-sm text-gray-500">{categoryName}</p>
          <p className="text-sm text-gray-700">{formatCurrency(product.base_price)}</p>
          <div className="mt-1 flex gap-2">
            <Badge tone={product.is_active ? "success" : "neutral"}>{product.is_active ? t("common.yes") : t("common.no")}</Badge>
            <Badge tone={stock <= 0 ? "danger" : "neutral"}>
              {t("account.tracking")}: {stock}
            </Badge>
          </div>
        </div>
      </div>

      <PeriodFilterBar
        period={period.key}
        from={rawParams.de}
        to={rawParams.ate}
        compare={rawParams.comparar === "lastMonth" ? "lastMonth" : rawParams.comparar === "lastYear" ? "lastYear" : "previous"}
        includeTest={includeTest}
      />

      {problems.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="mb-1 font-medium">{t("analytics.problems.title")}</p>
          <ul className="list-inside list-disc">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="rounded-xl border border-gray-200 p-4">
        <h2 className="mb-3 font-semibold text-brand-secondary">{t("analytics.products.funnelTitle")}</h2>
        <FunnelChart
          steps={[
            { label: t("analytics.funnel.viewed"), count: funnel.views },
            { label: t("analytics.funnel.addedToCart"), count: funnel.addToCart },
            { label: t("analytics.funnel.beganCheckout"), count: funnel.beginCheckout },
            { label: t("analytics.funnel.purchased"), count: funnel.purchases },
          ]}
        />
      </section>

      <section className="rounded-xl border border-gray-200 p-4">
        <h2 className="mb-3 font-semibold text-brand-secondary">{t("analytics.products.metricsTitle")}</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Item label={t("analytics.products.uniqueVisitors")} value={String(funnel.uniqueVisitors)} />
          <Item label={t("analytics.metrics.itemsSold")} value={String(funnel.quantitySold)} />
          <Item label={t("admin.orders.columnTotal")} value={formatCurrency(funnel.revenue)} />
          <Item label={t("cart.discount")} value={formatCurrency(funnel.discountGiven)} />
          <Item label={t("analytics.sales.refunds")} value={formatCurrency(funnel.refundedAmount)} />
          <Item label={t("analytics.products.addToCartRate")} value={funnel.addToCartRate == null ? "—" : `${funnel.addToCartRate}%`} />
          <Item label={t("analytics.products.checkoutRate")} value={funnel.beginCheckoutRate == null ? "—" : `${funnel.beginCheckoutRate}%`} />
          <Item label={t("analytics.products.columnConversion")} value={funnel.conversionRate == null ? "—" : `${funnel.conversionRate}%`} />
          <Item label={t("analytics.products.abandonmentRate")} value={funnel.abandonmentRate == null ? "—" : `${funnel.abandonmentRate}%`} />
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 p-4">
        <h2 className="mb-3 font-semibold text-brand-secondary">{t("analytics.profit.productCost")}</h2>
        <ProductCostEditor productId={product.id} currentCost={product.cost_price} />
      </section>

      {variants.length > 0 && (
        <section className="rounded-xl border border-gray-200 p-4">
          <h2 className="mb-3 font-semibold text-brand-secondary">{t("analytics.products.variantsTitle")}</h2>
          <div className="mb-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            {bestViewedVariant && <Item label={t("analytics.products.mostViewedVariant")} value={bestViewedVariant.label} />}
            {bestCartVariant && <Item label={t("analytics.products.mostCartedVariant")} value={bestCartVariant.label} />}
            {bestSellingVariant && <Item label={t("analytics.products.bestSellingVariant")} value={bestSellingVariant.label} />}
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">{t("product.selectVariant")}</th>
                  <th className="px-3 py-2">{t("analytics.products.columnViews")}</th>
                  <th className="px-3 py-2">{t("analytics.products.columnCartAdds")}</th>
                  <th className="px-3 py-2">{t("analytics.metrics.itemsSold")}</th>
                  <th className="px-3 py-2">{t("admin.sidebar.inventory")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {variants.map((variant) => (
                  <tr key={variant.id}>
                    <td className="px-3 py-2">{variant.label}</td>
                    <td className="px-3 py-2">{variant.views}</td>
                    <td className="px-3 py-2">{variant.addToCart}</td>
                    <td className="px-3 py-2">{variant.quantitySold}</td>
                    <td className="px-3 py-2">
                      {variant.stock <= 0 ? <Badge tone="danger">{t("product.outOfStock")}</Badge> : variant.stock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="font-medium text-brand-secondary">{value}</dd>
    </div>
  );
}
