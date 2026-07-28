import Link from "next/link";
import { t } from "@/i18n";
import { ProductCard } from "@/components/product/ProductCard";
import type { CatalogProduct } from "@/lib/catalog";

export function ProductSection({
  title,
  href,
  products,
}: {
  title: string;
  href?: string;
  products: CatalogProduct[];
}) {
  if (products.length === 0) return null;

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-brand-secondary sm:text-2xl">{title}</h2>
        {href && (
          <Link href={href} className="text-sm font-medium text-brand-primary hover:underline">
            {t("common.seeAll")}
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
