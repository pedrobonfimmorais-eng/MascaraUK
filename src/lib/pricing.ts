/**
 * Single source of truth for "what does this product cost right now".
 * Used by product cards, the product page, and cart validation so the
 * server always recomputes the same way it displays — the client-sent
 * price is never trusted for totals (see src/lib/cart/cart-data.ts).
 */
export interface PricingInput {
  basePrice: number;
  compareAtPrice: number | null;
  flashSalePrice: number | null;
  flashSaleEndsAt: string | null;
  variantPriceAdjustment?: number;
  variantSalePrice?: number | null;
}

export interface PricingResult {
  currentPrice: number;
  previousPrice: number | null;
  discountPercent: number | null;
  isFlashSale: boolean;
  flashSaleEndsAt: string | null;
  isOnSale: boolean;
}

export function isFlashSaleActive(flashSalePrice: number | null, flashSaleEndsAt: string | null): boolean {
  return (
    flashSalePrice != null && !!flashSaleEndsAt && new Date(flashSaleEndsAt).getTime() > Date.now()
  );
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computePricing(input: PricingInput): PricingResult {
  const adjustedBase = round2(input.basePrice + (input.variantPriceAdjustment ?? 0));

  if (isFlashSaleActive(input.flashSalePrice, input.flashSaleEndsAt)) {
    const flashPrice = input.flashSalePrice as number;
    const previousPrice =
      input.compareAtPrice && input.compareAtPrice > flashPrice ? input.compareAtPrice : adjustedBase;
    return {
      currentPrice: flashPrice,
      previousPrice: previousPrice > flashPrice ? previousPrice : null,
      discountPercent:
        previousPrice > flashPrice ? Math.round((1 - flashPrice / previousPrice) * 100) : null,
      isFlashSale: true,
      flashSaleEndsAt: input.flashSaleEndsAt,
      isOnSale: true,
    };
  }

  if (input.variantSalePrice != null && input.variantSalePrice < adjustedBase) {
    return {
      currentPrice: input.variantSalePrice,
      previousPrice: adjustedBase,
      discountPercent: Math.round((1 - input.variantSalePrice / adjustedBase) * 100),
      isFlashSale: false,
      flashSaleEndsAt: null,
      isOnSale: true,
    };
  }

  if (input.compareAtPrice && input.compareAtPrice > adjustedBase) {
    return {
      currentPrice: adjustedBase,
      previousPrice: input.compareAtPrice,
      discountPercent: Math.round((1 - adjustedBase / input.compareAtPrice) * 100),
      isFlashSale: false,
      flashSaleEndsAt: null,
      isOnSale: true,
    };
  }

  return {
    currentPrice: adjustedBase,
    previousPrice: null,
    discountPercent: null,
    isFlashSale: false,
    flashSaleEndsAt: null,
    isOnSale: false,
  };
}
