"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { t } from "@/i18n";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import {
  applyCouponAction,
  removeCartItem,
  removeCouponAction,
  selectShippingOption,
  updateCartItemQuantity,
  updateShippingZipCode,
} from "@/lib/actions/cart";
import type { ValidatedCart } from "@/lib/cart/cart-data";
import { trackEvent } from "@/lib/analytics/track-client";

export function CartView({ cart }: { cart: ValidatedCart }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [couponCode, setCouponCode] = useState("");
  const [zipCode, setZipCode] = useState(cart.shippingZipCode ?? "");

  useEffect(() => {
    if (cart.items.length > 0) {
      trackEvent({ type: "view_cart", value: cart.total, currency: cart.currencyCode });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function runAction(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      showToast(result.message, result.ok ? "success" : "error");
      router.refresh();
    });
  }

  if (cart.items.length === 0) {
    return (
      <EmptyState title={t("cart.empty")} action={<Button href="/produtos">{t("cart.emptyCta")}</Button>} />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        {cart.hasBlockingIssues && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t("cart.blockingIssuesNotice")}
          </div>
        )}

        <div className="flex flex-col divide-y divide-gray-200 rounded-xl border border-gray-200">
          {cart.items.map((item) => (
            <div key={item.id} className="flex gap-4 p-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {item.imageUrl && (
                  <Image src={item.imageUrl} alt={item.name} fill sizes="80px" className="object-cover" />
                )}
              </div>

              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/produto/${item.productSlug}`}
                      className="text-sm font-medium text-brand-secondary hover:underline"
                    >
                      {item.name}
                    </Link>
                    {item.variantLabel && <p className="text-xs text-gray-500">{item.variantLabel}</p>}
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      trackEvent({
                        type: "remove_from_cart",
                        productId: item.productId,
                        variantId: item.variantId ?? undefined,
                        quantity: item.quantity,
                      });
                      runAction(() => removeCartItem(item.id));
                    }}
                    className="text-xs font-medium text-gray-500 hover:text-red-600"
                  >
                    {t("cart.remove")}
                  </button>
                </div>

                {item.issue === "unavailable" && (
                  <p className="text-xs text-red-600">{t("cart.itemUnavailable")}</p>
                )}
                {item.issue === "insufficient_stock" && (
                  <p className="text-xs text-amber-700">
                    {t("cart.itemInsufficientStock", { count: item.availableStock })}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between gap-2">
                  <div className="flex items-center rounded-lg border border-gray-300">
                    <button
                      type="button"
                      disabled={isPending}
                      aria-label="Diminuir quantidade"
                      onClick={() => runAction(() => updateCartItemQuantity(item.id, item.quantity - 1))}
                      className="px-2 py-1 text-gray-600 hover:bg-gray-50"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <button
                      type="button"
                      disabled={isPending}
                      aria-label="Aumentar quantidade"
                      onClick={() => runAction(() => updateCartItemQuantity(item.id, item.quantity + 1))}
                      className="px-2 py-1 text-gray-600 hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-baseline gap-2">
                    {item.discountPercent != null && (
                      <Badge tone="brand">-{item.discountPercent}%</Badge>
                    )}
                    <span className="font-medium text-brand-secondary">{formatCurrency(item.lineTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button href="/produtos" variant="outline" className="w-fit">
          {t("cart.continueShopping")}
        </Button>
      </div>

      <aside className="flex h-fit flex-col gap-6 rounded-xl border border-gray-200 p-5">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-brand-secondary">{t("cart.couponPlaceholder")}</h2>
          {cart.coupon ? (
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <span>{t("cart.couponAppliedMessage", { code: cart.coupon.code })}</span>
              <button
                type="button"
                disabled={isPending}
                onClick={() => runAction(removeCouponAction)}
                className="font-medium hover:underline"
              >
                {t("cart.removeCoupon")}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder={t("cart.couponPlaceholder")}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
              <Button
                variant="outline"
                disabled={isPending || !couponCode.trim()}
                onClick={() =>
                  startTransition(async () => {
                    const result = await applyCouponAction(couponCode);
                    showToast(result.message, result.ok ? "success" : "error");
                    if (result.ok) trackEvent({ type: "coupon_applied" });
                    router.refresh();
                  })
                }
              >
                {t("cart.applyCoupon")}
              </Button>
            </div>
          )}
          {cart.couponError && <p className="mt-1 text-xs text-red-600">{cart.couponError}</p>}
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-brand-secondary">{t("cart.shippingTitle")}</h2>
          <div className="flex gap-2">
            <label htmlFor="cart-zip" className="sr-only">
              {t("cart.shippingZipCode")}
            </label>
            <input
              id="cart-zip"
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder={t("cart.shippingZipCodePlaceholder")}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
            />
            <Button
              variant="outline"
              disabled={isPending || !zipCode.trim()}
              onClick={() => runAction(() => updateShippingZipCode(zipCode))}
            >
              {t("cart.shippingCalculate")}
            </Button>
          </div>

          {cart.shipping.options.length > 1 && (
            <div className="mt-3 flex flex-col gap-2">
              {cart.shipping.options.map((option) => (
                <label key={option.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="shippingOption"
                    checked={(cart.shippingOptionId ?? cart.shipping.options[0].id) === option.id}
                    onChange={() => runAction(() => selectShippingOption(option.id))}
                    disabled={isPending}
                    className="text-brand-primary focus:ring-brand-primary"
                  />
                  {option.label} — {formatCurrency(option.rate)}
                </label>
              ))}
            </div>
          )}

          <p className="mt-2 text-xs text-gray-500">
            {cart.shipping.isFree
              ? t("cart.shippingFree")
              : t("cart.shippingFreeThreshold", { value: formatCurrency(cart.shipping.freeShippingThreshold) })}
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-200 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">{t("cart.subtotal")}</span>
            <span>{formatCurrency(cart.subtotal)}</span>
          </div>
          {cart.discountTotal > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>{t("cart.discount")}</span>
              <span>-{formatCurrency(cart.discountTotal)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">{t("cart.shippingEstimate")}</span>
            <span>{cart.shippingTotal > 0 ? formatCurrency(cart.shippingTotal) : t("cart.shippingFree")}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold text-brand-secondary">
            <span>{t("cart.total")}</span>
            <span>{formatCurrency(cart.total)}</span>
          </div>
        </div>

        {cart.hasBlockingIssues ? (
          <Button size="lg" className="w-full" disabled>
            {t("cart.goToCheckout")}
          </Button>
        ) : (
          <Button href="/checkout" size="lg" className="w-full">
            {t("cart.goToCheckout")}
          </Button>
        )}
      </aside>
    </div>
  );
}
