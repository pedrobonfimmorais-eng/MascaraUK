"use client";

import { useMemo, useState } from "react";
import { t } from "@/i18n";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { FlashSaleTimer } from "@/components/product/FlashSaleTimer";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { BuyNowButton } from "@/components/cart/BuyNowButton";
import type { CatalogProduct } from "@/lib/catalog";

/**
 * Note: product_variants is a flat list (one row = one purchasable option
 * with its own price/stock), not a size×color combination matrix. When a
 * product has more than one variant "group" (e.g. both Tamanho and Cor
 * rows), only the first group is offered here — combining two independent
 * dimensions into a single SKU isn't modeled by the current schema.
 */
export function ProductPurchasePanel({ product }: { product: CatalogProduct }) {
  const variantGroupName = product.variants[0]?.name ?? null;
  const variantOptions = useMemo(
    () => product.variants.filter((v) => v.name === variantGroupName),
    [product.variants, variantGroupName]
  );

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = variantOptions.find((v) => v.id === selectedVariantId) ?? null;

  const hasVariants = product.hasVariants;
  const needsSelection = hasVariants && !selectedVariant;

  const price = selectedVariant ? selectedVariant.price : hasVariants ? Math.min(...variantOptions.map((v) => v.price)) : product.price;
  const previousPrice = selectedVariant ? selectedVariant.previousPrice : hasVariants ? null : product.previousPrice;
  const stock = selectedVariant ? selectedVariant.stock : hasVariants ? null : product.stock;
  const outOfStock = stock != null && stock <= 0;

  function handleVariantSelect(variantId: string) {
    setSelectedVariantId(variantId);
    setQuantity(1);
  }

  return (
    <div className="flex flex-col gap-4">
      {product.categoryName && <Badge tone="brand">{product.categoryName}</Badge>}
      <h1 className="text-2xl font-bold text-brand-secondary sm:text-3xl">{product.name}</h1>

      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-semibold text-brand-secondary">
          {hasVariants && !selectedVariant ? t("common.from") : ""} {formatCurrency(price)}
        </span>
        {previousPrice != null && (
          <span className="text-lg text-gray-400 line-through">{formatCurrency(previousPrice)}</span>
        )}
        {selectedVariant?.previousPrice == null && product.discountPercent != null && !hasVariants && (
          <Badge tone="brand">-{product.discountPercent}%</Badge>
        )}
      </div>

      {product.isFlashSale && product.flashSaleEndsAt && (
        <FlashSaleTimer endsAt={product.flashSaleEndsAt} className="text-sm font-medium text-red-600" />
      )}

      {hasVariants && (
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">
            {variantGroupName ?? t("product.selectVariant")}
          </p>
          <div className="flex flex-wrap gap-2">
            {variantOptions.map((variant) => {
              const isOut = variant.stock <= 0 || !variant.isActive;
              return (
                <button
                  key={variant.id}
                  type="button"
                  disabled={isOut}
                  aria-pressed={selectedVariantId === variant.id}
                  onClick={() => handleVariantSelect(variant.id)}
                  className={`rounded-lg border px-4 py-2 text-sm ${
                    selectedVariantId === variant.id
                      ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                      : "border-gray-300 text-gray-700"
                  } ${isOut ? "cursor-not-allowed opacity-40 line-through" : "hover:border-brand-primary"}`}
                >
                  {variant.value}
                </button>
              );
            })}
          </div>
          {needsSelection && <p className="mt-1 text-xs text-gray-500">{t("product.variantRequired")}</p>}
        </div>
      )}

      <p className="text-sm">
        {outOfStock ? (
          <Badge tone="danger">{t("product.outOfStock")}</Badge>
        ) : stock != null && stock <= 5 ? (
          <Badge tone="warning">{t("product.lowStock")}</Badge>
        ) : (
          <Badge tone="success">{t("product.inStock")}</Badge>
        )}
      </p>

      <div className="flex items-center gap-3">
        <label htmlFor="quantity" className="text-sm text-gray-700">
          {t("product.quantity")}
        </label>
        <div className="flex items-center rounded-lg border border-gray-300">
          <button
            type="button"
            aria-label="Diminuir quantidade"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="px-3 py-2 text-gray-600 hover:bg-gray-50"
          >
            −
          </button>
          <span id="quantity" className="w-10 text-center text-sm">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Aumentar quantidade"
            onClick={() => setQuantity((q) => (stock != null ? Math.min(stock, q + 1) : q + 1))}
            disabled={stock != null && quantity >= stock}
            className="px-3 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <AddToCartButton
          productId={product.id}
          variantId={selectedVariant?.id ?? null}
          quantity={quantity}
          disabled={needsSelection || outOfStock}
          className="flex-1"
        />
        <BuyNowButton
          productId={product.id}
          variantId={selectedVariant?.id ?? null}
          quantity={quantity}
          disabled={needsSelection || outOfStock}
          className="flex-1"
        />
      </div>

      <p className="text-xs text-gray-500">{t("product.shippingNotice")}</p>
    </div>
  );
}
