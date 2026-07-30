import type { Metadata } from "next";
import { t } from "@/i18n";
import { AnalyticsNav } from "@/components/analytics/AnalyticsNav";
import { PeriodFilterBar } from "@/components/analytics/PeriodFilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { parseAnalyticsSearchParams, type AnalyticsSearchParams } from "@/lib/analytics/request-params";
import { getPromotionAnalytics, getFlashSaleAnalytics } from "@/lib/analytics/promotions";

export const metadata: Metadata = { title: t("analytics.nav.promotions") };

interface PromotionsAnalyticsPageProps {
  searchParams: Promise<AnalyticsSearchParams>;
}

export default async function PromotionsAnalyticsPage({ searchParams }: PromotionsAnalyticsPageProps) {
  const rawParams = await searchParams;
  const { period, includeTest } = parseAnalyticsSearchParams(rawParams);

  const [promotions, flashSales] = await Promise.all([
    getPromotionAnalytics(period.range, includeTest),
    getFlashSaleAnalytics(includeTest),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-brand-secondary">{t("analytics.nav.promotions")}</h1>
      <AnalyticsNav active="promocoes" />
      <PeriodFilterBar
        period={period.key}
        from={rawParams.de}
        to={rawParams.ate}
        compare={rawParams.comparar === "lastMonth" ? "lastMonth" : rawParams.comparar === "lastYear" ? "lastYear" : "previous"}
        includeTest={includeTest}
      />
      <p className="text-xs text-gray-500">{t("analytics.promotions.causationDisclaimer")}</p>

      <section>
        <h2 className="mb-3 font-semibold text-brand-secondary">{t("analytics.nav.promotions")}</h2>
        {promotions.length === 0 ? (
          <EmptyState title={t("analytics.insufficientData")} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">{t("analytics.promotions.name")}</th>
                  <th className="px-4 py-3">{t("analytics.products.columnViews")}</th>
                  <th className="px-4 py-3">{t("analytics.products.columnCartAdds")}</th>
                  <th className="px-4 py-3">{t("analytics.products.columnPurchases")}</th>
                  <th className="px-4 py-3">{t("admin.orders.columnTotal")}</th>
                  <th className="px-4 py-3">{t("cart.discount")}</th>
                  <th className="px-4 py-3">{t("analytics.products.columnConversion")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {promotions.map((promo) => (
                  <tr key={promo.id}>
                    <td className="px-4 py-3 font-medium text-brand-secondary">{promo.name}</td>
                    <td className="px-4 py-3">{promo.views}</td>
                    <td className="px-4 py-3">{promo.addToCart}</td>
                    <td className="px-4 py-3">{promo.purchases}</td>
                    <td className="px-4 py-3">{formatCurrency(promo.revenue)}</td>
                    <td className="px-4 py-3">{formatCurrency(promo.discountGiven)}</td>
                    <td className="px-4 py-3">{promo.conversionRate == null ? "—" : `${promo.conversionRate}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-brand-secondary">{t("badges.flashSale")}</h2>
        {flashSales.length === 0 ? (
          <EmptyState title={t("analytics.insufficientData")} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">{t("products.pageTitle")}</th>
                  <th className="px-4 py-3">{t("analytics.products.columnViews")}</th>
                  <th className="px-4 py-3">{t("analytics.products.columnCartAdds")}</th>
                  <th className="px-4 py-3">{t("analytics.products.columnPurchases")}</th>
                  <th className="px-4 py-3">{t("admin.orders.columnTotal")}</th>
                  <th className="px-4 py-3">{t("admin.sidebar.inventory")}</th>
                  <th className="px-4 py-3">{t("account.orderStatus")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {flashSales.map((flash) => {
                  const isEnded = flash.endsAt ? new Date(flash.endsAt) < new Date() : false;
                  return (
                    <tr key={flash.id}>
                      <td className="px-4 py-3 font-medium text-brand-secondary">{flash.name}</td>
                      <td className="px-4 py-3">{flash.views}</td>
                      <td className="px-4 py-3">{flash.addToCart}</td>
                      <td className="px-4 py-3">{flash.purchases}</td>
                      <td className="px-4 py-3">{formatCurrency(flash.revenue)}</td>
                      <td className="px-4 py-3">{flash.stockRemaining}</td>
                      <td className="px-4 py-3">
                        {isEnded ? <Badge tone="neutral">{t("product.flashSaleEnded")}</Badge> : <Badge tone="success">{t("common.yes")}</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
