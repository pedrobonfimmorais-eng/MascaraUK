import Image from "next/image";
import Link from "next/link";
import { t } from "@/i18n";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { FavoriteButton } from "@/components/product/FavoriteButton";
import { FlashSaleTimer } from "@/components/product/FlashSaleTimer";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import type { CatalogProduct } from "@/lib/catalog";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const outOfStock = product.stock <= 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-lg">
      <Link href={`/produto/${product.slug}`} className="contents">
        <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              loading="lazy"
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
              {t("meta.siteName")}
            </div>
          )}

          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {product.isFlashSale && <Badge tone="danger">{t("badges.flashSale")}</Badge>}
            {!product.isFlashSale && product.isOnSale && <Badge tone="brand">{t("badges.sale")}</Badge>}
            {product.isNew && <Badge tone="success">{t("badges.new")}</Badge>}
          </div>

          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Badge tone="danger">{t("product.outOfStock")}</Badge>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3">
          <h3 className="line-clamp-2 text-sm font-medium text-gray-900">{product.name}</h3>
          <div className="mt-auto flex items-baseline gap-2">
            <span className="text-base font-semibold text-brand-secondary">
              {formatCurrency(product.price)}
            </span>
            {product.previousPrice != null && (
              <span className="text-xs text-gray-400 line-through">
                {formatCurrency(product.previousPrice)}
              </span>
            )}
            {product.discountPercent != null && (
              <span className="text-xs font-medium text-emerald-600">-{product.discountPercent}%</span>
            )}
          </div>
          {product.isFlashSale && product.flashSaleEndsAt && (
            <FlashSaleTimer endsAt={product.flashSaleEndsAt} className="text-xs font-medium text-red-600" />
          )}
        </div>
      </Link>

      <FavoriteButton insideLink className="absolute right-2 top-2" />

      <div className="flex items-center gap-2 px-3 pb-3">
        {product.hasVariants ? (
          <Link
            href={`/produto/${product.slug}`}
            className="flex-1 rounded-lg border border-brand-primary px-3 py-2 text-center text-xs font-medium text-brand-primary hover:bg-brand-primary/5"
          >
            {t("product.selectVariant")}
          </Link>
        ) : (
          <AddToCartButton
            productId={product.id}
            variantId={null}
            disabled={outOfStock}
            className="flex-1 !py-2 text-xs"
          />
        )}
      </div>
    </div>
  );
}
