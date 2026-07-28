import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { ProductCard } from "@/components/product/ProductCard";
import { getAllProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: t("products.pageTitle"),
  description: t("products.pageDescription"),
};

export default async function ProductsPage() {
  const { items: products, isDemo } = await getAllProducts();

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-bold text-brand-secondary sm:text-3xl">
          {t("products.pageTitle")}
        </h1>
        <p className="mt-1 text-gray-600">{t("products.pageDescription")}</p>
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
