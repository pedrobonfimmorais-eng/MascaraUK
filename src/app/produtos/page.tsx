import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductFilters } from "@/components/product/ProductFilters";
import { ProductSort } from "@/components/product/ProductSort";
import { Pagination } from "@/components/product/Pagination";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { getProducts } from "@/lib/catalog";
import { parseProductListParams, type RawSearchParams } from "@/lib/catalog-query";

export const metadata: Metadata = {
  title: t("products.pageTitle"),
  description: t("products.pageDescription"),
};

interface ProductsPageProps {
  searchParams: Promise<RawSearchParams>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const rawParams = await searchParams;
  const params = parseProductListParams(rawParams);
  const { items, isDemo, page, totalPages, total } = await getProducts(params);

  const isSearch = !!params.search;

  return (
    <Container className="flex flex-col gap-6 py-10">
      <Breadcrumbs
        items={[
          { label: t("breadcrumbs.home"), href: "/" },
          { label: t("breadcrumbs.products") },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold text-brand-secondary sm:text-3xl">
          {isSearch ? t("products.searchResultsTitle") : t("products.pageTitle")}
        </h1>
        <p className="mt-1 text-gray-600">
          {isSearch
            ? t("products.searchResultsDescription", { query: params.search ?? "" })
            : t("products.pageDescription")}
        </p>
      </div>

      {isDemo && <DemoNotice />}

      <div className="flex flex-col gap-6 md:flex-row">
        <ProductFilters basePath="/produtos" />

        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              {t(
                isSearch && total === 0 ? "products.noSearchResults" : "products.resultsCount",
                isSearch && total === 0 ? { query: params.search ?? "" } : { count: total }
              )}
            </p>
            <ProductSort basePath="/produtos" />
          </div>

          {items.length === 0 ? (
            <p className="py-16 text-center text-gray-500">
              {isSearch
                ? t("products.noSearchResults", { query: params.search ?? "" })
                : t("products.noResults")}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              <div className="mt-8">
                <Pagination
                  basePath="/produtos"
                  currentParams={rawParams as Record<string, string | undefined>}
                  page={page}
                  totalPages={totalPages}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </Container>
  );
}
