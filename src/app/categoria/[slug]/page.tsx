import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { ProductCard } from "@/components/product/ProductCard";
import { getAllProducts, getCategoryBySlug } from "@/lib/catalog";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { category } = await getCategoryBySlug(slug);
  return { title: category?.name ?? t("categories.pageTitle") };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const [{ category, isDemo: categoryIsDemo }, { items: allProducts, isDemo: productsAreDemo }] =
    await Promise.all([getCategoryBySlug(slug), getAllProducts()]);

  if (!category) notFound();

  const products = allProducts.filter((p) => p.categorySlug === slug);
  const isDemo = categoryIsDemo || productsAreDemo;

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-bold text-brand-secondary sm:text-3xl">{category.name}</h1>
        {category.description && <p className="mt-1 text-gray-600">{category.description}</p>}
      </div>

      {isDemo && <DemoNotice />}

      {products.length === 0 ? (
        <p className="py-16 text-center text-gray-500">{t("products.noResults")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </Container>
  );
}
