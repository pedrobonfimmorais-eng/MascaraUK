import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { formatCurrency } from "@/lib/utils";
import { getProductBySlug } from "@/lib/catalog";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await getProductBySlug(slug);
  if (!product) return { title: t("products.pageTitle") };
  return { title: product.name, description: product.description ?? undefined };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const { product, isDemo } = await getProductBySlug(slug);

  if (!product) notFound();

  const onSale = !!product.compareAtPrice && product.compareAtPrice > product.price;

  return (
    <Container className="flex flex-col gap-8 py-10">
      {isDemo && <DemoNotice />}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-400">
              {t("meta.siteName")}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {product.categoryName && <Badge tone="brand">{product.categoryName}</Badge>}
          <h1 className="text-2xl font-bold text-brand-secondary sm:text-3xl">{product.name}</h1>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold text-brand-secondary">
              {formatCurrency(product.price)}
            </span>
            {onSale && (
              <span className="text-lg text-gray-400 line-through">
                {formatCurrency(product.compareAtPrice!)}
              </span>
            )}
          </div>

          <p className="text-sm">
            {product.inStock === false ? (
              <Badge tone="danger">{t("product.outOfStock")}</Badge>
            ) : (
              <Badge tone="success">{t("product.inStock")}</Badge>
            )}
          </p>

          <Button size="lg" disabled={product.inStock === false} className="w-full sm:w-auto">
            {t("product.addToCart")}
          </Button>

          <p className="text-xs text-gray-500">{t("product.shippingNotice")}</p>

          {product.sku && (
            <p className="text-sm text-gray-500">
              {t("product.sku")}: {product.sku}
            </p>
          )}

          {product.description && (
            <div>
              <h2 className="font-semibold text-brand-secondary">{t("product.description")}</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-700">{product.description}</p>
            </div>
          )}
        </div>
      </div>

      <section className="border-t border-gray-200 pt-8">
        <h2 className="text-lg font-semibold text-brand-secondary">{t("product.reviews")}</h2>
        <p className="mt-2 text-sm text-gray-500">{t("product.noReviewsYet")}</p>
      </section>
    </Container>
  );
}
