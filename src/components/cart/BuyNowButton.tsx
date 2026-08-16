"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/lib/actions/cart";
import { useToast } from "@/components/ui/Toast";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

export function BuyNowButton({
  productId,
  variantId,
  quantity = 1,
  disabled,
  className,
}: {
  productId: string;
  variantId: string | null;
  quantity?: number;
  disabled?: boolean;
  className?: string;
}) {
  const { showToast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await addToCart(productId, variantId, quantity);
      if (result.ok) {
        router.push("/carrinho");
      } else {
        showToast(result.message, "error");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isPending}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border border-brand-secondary px-4 py-2.5 text-sm font-medium text-brand-secondary transition-colors hover:bg-brand-secondary hover:text-white disabled:opacity-50 disabled:pointer-events-none",
        className
      )}
    >
      {isPending ? t("product.addingToCart") : t("product.buyNow")}
    </button>
  );
}
