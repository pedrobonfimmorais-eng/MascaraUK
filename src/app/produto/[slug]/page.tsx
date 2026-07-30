import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductViewTracker } from "@/components/analytics/ProductViewTracker";
import { ProductPurchasePanel } from "@/components/product/ProductPurchasePanel";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { ReviewsSection } from "@/components/product/ReviewsSection";
import { ProductSection } from "@/components/home/ProductSection";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog";
import { siteConfig } from "@/config/site";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await getProductBySlug(slug);
  if (!product) return { title: t("products.pageTitle") };

  const description = product.shortDescription ?? product.description ?? undefined;

  return {
    title: product.name,
    description,
    alternates: { canonical: `${siteConfig.url}/produto/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      images: product.imageUrl ? [{ url: product.imageUrl }] : undefined,
      url: `${siteConfig.url}/produto/${product.slug}`,
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const { product, isDemo } = await getProductBySlug(slug);

  if (!product) notFound();

  const { items: related } = await getRelatedProducts(product);

  const galleryImages = product.images.length > 0 ? product.images : product.imageUrl ? [product.imageUrl] : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription ?? product.description ?? undefined,
    sku: product.sku ?? undefined,
    image: galleryImages.length > 0 ? galleryImages : undefined,
    category: product.categoryName ?? undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: product.price.toFixed(2),
      availability:
        product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${siteConfig.url}/produto/${product.slug}`,
    },
    ...(product.ratingCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.avgRating,
            reviewCount: product.ratingCount,
          },
        }
      : {}),
  };

  return (
    <Container className="flex flex-col gap-8 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {!isDemo && <ProductViewTracker productId={product.id} />}

      <Breadcrumbs
        items={[
          { label: t("breadcrumbs.home"), href: "/" },
          ...(product.categoryName && product.categorySlug
            ? [{ label: product.categoryName, href: `/categoria/${product.categorySlug}` }]
            : []),
          { label: product.name },
        ]}
      />

      {isDemo && <DemoNotice />}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ProductGallery images={galleryImages} alt={product.name} />
        <ProductPurchasePanel product={product} />
      </div>

      <section className="grid grid-cols-1 gap-8 border-t border-gray-200 pt-8 lg:grid-cols-2">
        {(product.description || product.shortDescription) && (
          <div>
            <h2 className="font-semibold text-brand-secondary">{t("product.description")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">
              {product.description ?? product.shortDescription}
            </p>
          </div>
        )}

        <div>
          <h2 className="font-semibold text-brand-secondary">{t("product.specifications")}</h2>
          <dl className="mt-2 flex flex-col gap-1 text-sm text-gray-700">
            {product.sku && <SpecRow label={t("product.sku")} value={product.sku} />}
            {product.categoryName && <SpecRow label={t("product.category")} value={product.categoryName} />}
            {product.material && <SpecRow label="Material" value={product.material} />}
            {product.theme && <SpecRow label="Tema" value={product.theme} />}
            {product.weightGrams != null && (
              <SpecRow label={t("product.weight")} value={`${product.weightGrams}g`} />
            )}
            {product.dimensions && <SpecRow label={t("product.dimensions")} value={product.dimensions} />}
            {product.packageContents && (
              <SpecRow label={t("product.packageContents")} value={product.packageContents} />
            )}
          </dl>

          {product.safetyInfo && (
            <p className="mt-3 text-xs text-gray-500">
              <strong>{t("product.safetyInfo")}:</strong> {product.safetyInfo}
            </p>
          )}

          {(product.deliveryEstimateDaysMin || product.deliveryEstimateDaysMax) && (
            <p className="mt-3 text-sm text-gray-700">
              <strong>{t("product.deliveryEstimate")}:</strong>{" "}
              {t("product.deliveryEstimateValue", {
                min: product.deliveryEstimateDaysMin ?? 5,
                max: product.deliveryEstimateDaysMax ?? 10,
              })}
            </p>
          )}

          <p className="mt-2 text-sm text-gray-700">{t("product.returnsPolicySummary")}</p>
        </div>
      </section>

      <RecentlyViewed
        current={{ slug: product.slug, name: product.name, imageUrl: product.imageUrl, price: product.price }}
      />

      <ProductSection title={t("product.relatedProducts")} products={related} />

      <ReviewsSection productId={product.id} productSlug={product.slug} />

      <section className="border-t border-gray-200 pt-8">
        <h2 className="text-lg font-semibold text-brand-secondary">{t("product.questionsTitle")}</h2>
        <div className="mt-3">
          <EmptyState title={t("product.noQuestionsYet")} />
        </div>
      </section>
    </Container>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-1.5">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-brand-secondary">{value}</dd>
    </div>
  );
}
