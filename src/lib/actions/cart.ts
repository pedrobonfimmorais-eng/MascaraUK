"use server";

import { revalidatePath } from "next/cache";
import { t } from "@/i18n";
import { createClient } from "@/lib/supabase/server";
import { ensureCart } from "@/lib/cart/cart-data";
import { getGuestSessionId, clearGuestSessionId } from "@/lib/cart/session";
import { computePricing } from "@/lib/pricing";
import { normalisePostcode } from "@/lib/uk-address";

export type CartActionResult = { ok: boolean; message: string };

const NOT_CONFIGURED_MESSAGE = t("cart.notConfigured");

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function refreshCartViews() {
  // Cart total shows in the header on every page, so revalidate the whole shell.
  revalidatePath("/", "layout");
}

export async function addToCart(
  productId: string,
  variantId: string | null,
  quantity: number
): Promise<CartActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: NOT_CONFIGURED_MESSAGE };
  }

  if (quantity < 1) {
    return { ok: false, message: t("cart.invalidQuantity") };
  }

  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, base_price, compare_at_price, flash_sale_price, flash_sale_ends_at, is_active")
    .eq("id", productId)
    .maybeSingle();

  if (!product || !product.is_active) {
    return { ok: false, message: t("cart.itemUnavailable") };
  }

  const { data: allVariants } = await supabase
    .from("product_variants")
    .select("id, price_adjustment, sale_price, is_active")
    .eq("product_id", productId);

  if ((allVariants?.length ?? 0) > 0 && !variantId) {
    return { ok: false, message: t("cart.selectVariantRequired") };
  }

  const variant = variantId ? allVariants?.find((v) => v.id === variantId) : null;
  if (variantId && (!variant || !variant.is_active)) {
    return { ok: false, message: t("cart.variantUnavailable") };
  }

  const inventoryQuery = supabase
    .from("inventory")
    .select("quantity, reserved_quantity")
    .eq("product_id", productId);
  const { data: inventoryRow } = await (variantId
    ? inventoryQuery.eq("variant_id", variantId)
    : inventoryQuery.is("variant_id", null)
  ).maybeSingle();

  const availableStock = inventoryRow
    ? Math.max(0, inventoryRow.quantity - inventoryRow.reserved_quantity)
    : 0;

  if (availableStock <= 0) {
    return { ok: false, message: t("product.outOfStock") };
  }

  const cart = await ensureCart();

  const existingItemQuery = supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cart.id)
    .eq("product_id", productId);
  const { data: existingItem } = await (variantId
    ? existingItemQuery.eq("variant_id", variantId)
    : existingItemQuery.is("variant_id", null)
  ).maybeSingle();

  const currentQuantityInCart = existingItem?.quantity ?? 0;
  const desiredQuantity = currentQuantityInCart + quantity;

  if (desiredQuantity > availableStock) {
    return {
      ok: false,
      message: t("cart.itemInsufficientStock", { count: availableStock }),
    };
  }

  const pricing = computePricing({
    basePrice: product.base_price,
    compareAtPrice: product.compare_at_price,
    flashSalePrice: product.flash_sale_price,
    flashSaleEndsAt: product.flash_sale_ends_at,
    variantPriceAdjustment: variant?.price_adjustment ?? 0,
    variantSalePrice: variant?.sale_price ?? null,
  });

  if (existingItem) {
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: desiredQuantity, unit_price: pricing.currentPrice })
      .eq("id", existingItem.id);

    if (error) return { ok: false, message: t("common.error") };
  } else {
    const { error } = await supabase.from("cart_items").insert({
      cart_id: cart.id,
      product_id: productId,
      variant_id: variantId,
      quantity,
      unit_price: pricing.currentPrice,
    });

    if (error) return { ok: false, message: t("common.error") };
  }

  refreshCartViews();
  return { ok: true, message: t("cart.itemAdded") };
}

export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number
): Promise<CartActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: NOT_CONFIGURED_MESSAGE };
  }

  const supabase = await createClient();

  if (quantity < 1) {
    return removeCartItem(cartItemId);
  }

  const { data: item } = await supabase
    .from("cart_items")
    .select("product_id, variant_id")
    .eq("id", cartItemId)
    .maybeSingle();

  if (!item) return { ok: false, message: t("cart.itemNotFound") };

  const stockQuery = supabase
    .from("inventory")
    .select("quantity, reserved_quantity")
    .eq("product_id", item.product_id);
  const { data: inventoryRow } = await (item.variant_id
    ? stockQuery.eq("variant_id", item.variant_id)
    : stockQuery.is("variant_id", null)
  ).maybeSingle();

  const availableStock = inventoryRow
    ? Math.max(0, inventoryRow.quantity - inventoryRow.reserved_quantity)
    : 0;

  if (quantity > availableStock) {
    return { ok: false, message: t("cart.itemInsufficientStock", { count: availableStock }) };
  }

  const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", cartItemId);
  if (error) return { ok: false, message: t("common.error") };

  refreshCartViews();
  return { ok: true, message: t("cart.quantityUpdated") };
}

export async function removeCartItem(cartItemId: string): Promise<CartActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: NOT_CONFIGURED_MESSAGE };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("cart_items").delete().eq("id", cartItemId);
  if (error) return { ok: false, message: t("common.error") };

  refreshCartViews();
  return { ok: true, message: t("cart.itemRemoved") };
}

export async function applyCouponAction(code: string): Promise<CartActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: NOT_CONFIGURED_MESSAGE };
  }

  const trimmed = code.trim();
  if (!trimmed) return { ok: false, message: t("cart.discountCodeRequired") };

  const cart = await ensureCart();
  const supabase = await createClient();

  const { error } = await supabase
    .from("carts")
    .update({ coupon_code: trimmed.toUpperCase() })
    .eq("id", cart.id);

  if (error) return { ok: false, message: t("common.error") };

  refreshCartViews();
  return { ok: true, message: t("cart.couponApplied") };
}

export async function removeCouponAction(): Promise<CartActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: NOT_CONFIGURED_MESSAGE };
  }

  const cart = await ensureCart();
  const supabase = await createClient();

  const { error } = await supabase.from("carts").update({ coupon_code: null }).eq("id", cart.id);
  if (error) return { ok: false, message: t("common.error") };

  refreshCartViews();
  return { ok: true, message: t("cart.couponRemoved") };
}

export async function updateShippingZipCode(postcode: string): Promise<CartActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: NOT_CONFIGURED_MESSAGE };
  }

  const cart = await ensureCart();
  const supabase = await createClient();

  const { error } = await supabase
    .from("carts")
    .update({ shipping_zip_code: normalisePostcode(postcode) })
    .eq("id", cart.id);

  if (error) return { ok: false, message: t("common.error") };

  refreshCartViews();
  return { ok: true, message: t("cart.postcodeUpdated") };
}

export async function selectShippingOption(optionId: string): Promise<CartActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: NOT_CONFIGURED_MESSAGE };
  }

  const cart = await ensureCart();
  const supabase = await createClient();

  const { error } = await supabase
    .from("carts")
    .update({ shipping_option_id: optionId })
    .eq("id", cart.id);

  if (error) return { ok: false, message: t("common.error") };

  refreshCartViews();
  return { ok: true, message: t("cart.deliveryOptionUpdated") };
}

/**
 * Folds a guest cart into the account's cart right after login/sign-up,
 * merging quantities of matching product+variant instead of duplicating
 * rows, then clears the guest cookie. Safe no-op when there's nothing to
 * merge.
 */
export async function mergeGuestCartIntoUser(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const sessionId = await getGuestSessionId();
  if (!sessionId) return;

  const supabase = await createClient();

  const { data: guestCart } = await supabase
    .from("carts")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!guestCart) {
    await clearGuestSessionId();
    return;
  }

  const { data: guestItems } = await supabase
    .from("cart_items")
    .select("product_id, variant_id, quantity, unit_price")
    .eq("cart_id", guestCart.id);

  if (guestItems && guestItems.length > 0) {
    let { data: userCart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!userCart) {
      const { data: created } = await supabase
        .from("carts")
        .insert({ user_id: userId })
        .select("id")
        .single();
      userCart = created;
    }

    if (userCart) {
      const { data: existingUserItems } = await supabase
        .from("cart_items")
        .select("id, product_id, variant_id, quantity")
        .eq("cart_id", userCart.id);

      for (const guestItem of guestItems) {
        const match = existingUserItems?.find(
          (i) => i.product_id === guestItem.product_id && i.variant_id === guestItem.variant_id
        );

        if (match) {
          await supabase
            .from("cart_items")
            .update({ quantity: match.quantity + guestItem.quantity })
            .eq("id", match.id);
        } else {
          await supabase.from("cart_items").insert({
            cart_id: userCart.id,
            product_id: guestItem.product_id,
            variant_id: guestItem.variant_id,
            quantity: guestItem.quantity,
            unit_price: guestItem.unit_price,
          });
        }
      }
    }
  }

  await supabase.from("carts").delete().eq("id", guestCart.id);
  await clearGuestSessionId();
}
