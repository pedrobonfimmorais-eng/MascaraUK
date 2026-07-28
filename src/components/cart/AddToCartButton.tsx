"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/lib/actions/cart";
import { useToast } from "@/components/ui/Toast";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

interface AddToCartButtonProps {
  productId: string;
  variantId: string | null;
  quantity?: number;
  disabled?: boolean;
  className?: string;
  /** Set when nesting inside a <Link> (e.g. product cards) to stop the click from navigating. */
  insideLink?: boolean;
  label?: string;
}

export function AddToCartButton({
  productId,
  variantId,
  quantity = 1,
  disabled,
  className,
  insideLink,
  label,
}: AddToCartButtonProps) {
  const { showToast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (insideLink) {
      event.preventDefault();
      event.stopPropagation();
    }

    startTransition(async () => {
      const result = await addToCart(productId, variantId, quantity);
      showToast(result.message, result.ok ? "success" : "error");
      if (result.ok) router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isPending}
      aria-label={t("product.addToCart")}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none",
        className
      )}
    >
      {isPending ? t("product.addingToCart") : label ?? t("product.addToCart")}
    </button>
  );
}
