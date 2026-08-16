import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductFilters } from "@/components/product/ProductFilters";
import { ProductSort } from "@/components/product/ProductSort";
import { Pagination } from "@/components/product/Pagination";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { getCategoryBySlug, getProducts } from "@/lib/catalog";
import { parseProductListParams, type RawSearchParams } from "@/lib/catalog-query";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { category } = await getCategoryBySlug(slug);
  return {
    title: category?.name ?? t("categories.pageTitle"),
    description: category?.description ?? undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const rawParams = await searchParams;

  const { category, isDemo: categoryIsDemo } = await getCategoryBySlug(slug);
  if (!category) notFound();

  const listParams = parseProductListParams(rawParams, { categorySlug: slug });
  const { items, isDemo: productsAreDemo, page, totalPages, total } = await getProducts(listParams);
  const isDemo = categoryIsDemo || productsAreDemo;
  const basePath = `/categoria/${slug}`;

  return (
    <Container className="flex flex-col gap-6 py-10">
      <Breadcrumbs
        items={[
          { label: t("breadcrumbs.home"), href: "/" },
          { label: t("breadcrumbs.categories"), href: "/categorias" },
          { label: category.name },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold text-brand-secondary sm:text-3xl">{category.name}</h1>
        {category.description && <p className="mt-1 text-gray-600">{category.description}</p>}
      </div>

      {isDemo && <DemoNotice />}

      <div className="flex flex-col gap-6 md:flex-row">
        <ProductFilters basePath={basePath} />

        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-500">{t("products.resultsCount", { count: total })}</p>
            <ProductSort basePath={basePath} />
          </div>

          {items.length === 0 ? (
            <p className="py-16 text-center text-gray-500">{t("products.noResults")}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              <div className="mt-8">
                <Pagination
                  basePath={basePath}
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
