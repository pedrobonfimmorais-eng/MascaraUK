import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getGuestSessionId, getOrCreateGuestSessionId } from "@/lib/cart/session";
import { computePricing } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";
import type { Cart, DiscountType } from "@/types/database";

export interface ValidatedCartItem {
  id: string;
  productId: string;
  variantId: string | null;
  productSlug: string;
  name: string;
  variantLabel: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  previousUnitPrice: number | null;
  discountPercent: number | null;
  lineTotal: number;
  availableStock: number;
  issue: "unavailable" | "insufficient_stock" | null;
}

export interface AppliedCoupon {
  code: string;
  type: DiscountType;
  value: number;
  freeShipping: boolean;
}

export interface ShippingRuleOption {
  id: string;
  label: string;
  rate: number;
  estimate_days_min: number;
  estimate_days_max: number;
}

interface ShippingRules {
  free_shipping_threshold: number;
  default_rate: number;
  default_estimate_days_min: number;
  default_estimate_days_max: number;
  options: ShippingRuleOption[];
}

export interface ShippingEstimate {
  rate: number;
  estimateDaysMin: number;
  estimateDaysMax: number;
  isFree: boolean;
  freeShippingThreshold: number;
  options: ShippingRuleOption[];
}

export interface ValidatedCart {
  cartId: string | null;
  items: ValidatedCartItem[];
  itemCount: number;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  total: number;
  coupon: AppliedCoupon | null;
  couponError: string | null;
  shippingZipCode: string | null;
  shippingOptionId: string | null;
  shipping: ShippingEstimate;
  hasBlockingIssues: boolean;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

const FALLBACK_SHIPPING_RULES: ShippingRules = {
  free_shipping_threshold: 250,
  default_rate: 19.9,
  default_estimate_days_min: 5,
  default_estimate_days_max: 10,
  options: [
    { id: "standard", label: "Entrega padrão", rate: 19.9, estimate_days_min: 5, estimate_days_max: 10 },
    { id: "express", label: "Entrega expressa", rate: 34.9, estimate_days_min: 2, estimate_days_max: 4 },
  ],
};

async function getShippingRules(): Promise<ShippingRules> {
  if (!isSupabaseConfigured()) return FALLBACK_SHIPPING_RULES;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "shipping_rules")
      .maybeSingle();

    return (data?.value as ShippingRules) ?? FALLBACK_SHIPPING_RULES;
  } catch {
    return FALLBACK_SHIPPING_RULES;
  }
}

async function computeShipping(params: {
  subtotalAfterDiscount: number;
  optionId: string | null;
  freeShippingFromCoupon: boolean;
}): Promise<ShippingEstimate> {
  const rules = await getShippingRules();
  const option = rules.options.find((o) => o.id === params.optionId) ?? rules.options[0];
  const isFreeByThreshold = params.subtotalAfterDiscount >= rules.free_shipping_threshold;
  const isFree = params.freeShippingFromCoupon || isFreeByThreshold;

  return {
    rate: isFree ? 0 : option?.rate ?? rules.default_rate,
    estimateDaysMin: option?.estimate_days_min ?? rules.default_estimate_days_min,
    estimateDaysMax: option?.estimate_days_max ?? rules.default_estimate_days_max,
    isFree,
    freeShippingThreshold: rules.free_shipping_threshold,
    options: rules.options,
  };
}

function emptyValidatedCart(shipping: ShippingEstimate): ValidatedCart {
  return {
    cartId: null,
    items: [],
    itemCount: 0,
    subtotal: 0,
    discountTotal: 0,
    shippingTotal: 0,
    total: 0,
    coupon: null,
    couponError: null,
    shippingZipCode: null,
    shippingOptionId: null,
    shipping,
    hasBlockingIssues: false,
  };
}

/** Read-only lookup, safe from Server Components (never mutates cookies). */
async function findCart(): Promise<Cart | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const user = await getCurrentUser();

  if (user) {
    const { data } = await supabase.from("carts").select("*").eq("user_id", user.id).maybeSingle();
    return data ?? null;
  }

  const sessionId = await getGuestSessionId();
  if (!sessionId) return null;

  const { data } = await supabase.from("carts").select("*").eq("session_id", sessionId).maybeSingle();
  return data ?? null;
}

/** Finds or creates the current visitor/customer cart. Server Action only — mutates cookies for guests. */
export async function ensureCart(): Promise<Cart> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (user) {
    const { data: existing } = await supabase
      .from("carts")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) return existing;

    const { data: created, error } = await supabase
      .from("carts")
      .insert({ user_id: user.id })
      .select("*")
      .single();
    if (error || !created) throw new Error("Não foi possível criar o carrinho.");
    return created;
  }

  const sessionId = await getOrCreateGuestSessionId();
  const { data: existing } = await supabase
    .from("carts")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("carts")
    .insert({ session_id: sessionId })
    .select("*")
    .single();
  if (error || !created) throw new Error("Não foi possível criar o carrinho.");
  return created;
}

interface CouponEvalResult {
  coupon: AppliedCoupon | null;
  discount: number;
  error: string | null;
}

async function evaluateCoupon(
  code: string,
  items: ValidatedCartItem[],
  subtotal: number
): Promise<CouponEvalResult> {
  const supabase = await createClient();
  const { data: coupon } = await supabase
    .from("coupons")
    .select("*")
    .ilike("code", code)
    .maybeSingle();

  if (!coupon || !coupon.is_active) {
    return { coupon: null, discount: 0, error: "Cupom inválido." };
  }

  const now = Date.now();
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) {
    return { coupon: null, discount: 0, error: "Cupom ainda não está disponível." };
  }
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < now) {
    return { coupon: null, discount: 0, error: "Cupom expirado." };
  }
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) {
    return { coupon: null, discount: 0, error: "Cupom esgotado." };
  }
  if (coupon.min_order_value != null && subtotal < coupon.min_order_value) {
    return {
      coupon: null,
      discount: 0,
      error: `Este cupom exige um pedido mínimo de ${formatCurrency(coupon.min_order_value)}.`,
    };
  }

  const hasRestriction = coupon.allowed_product_ids.length > 0 || coupon.allowed_category_ids.length > 0;
  let eligibleSubtotal = subtotal;

  if (hasRestriction) {
    eligibleSubtotal = items
      .filter((item) => coupon.allowed_product_ids.includes(item.productId))
      .reduce((sum, item) => sum + item.lineTotal, 0);

    if (eligibleSubtotal <= 0) {
      return { coupon: null, discount: 0, error: "Este cupom não se aplica aos produtos do carrinho." };
    }
  }

  const discount =
    coupon.type === "percentual"
      ? round2(eligibleSubtotal * (coupon.value / 100))
      : Math.min(round2(coupon.value), eligibleSubtotal);

  return {
    coupon: { code: coupon.code, type: coupon.type, value: coupon.value, freeShipping: coupon.free_shipping },
    discount,
    error: null,
  };
}

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  compare_at_price: number | null;
  flash_sale_price: number | null;
  flash_sale_ends_at: string | null;
  is_active: boolean;
};

type VariantRow = {
  id: string;
  product_id: string;
  name: string;
  value: string;
  price_adjustment: number;
  sale_price: number | null;
  image_url: string | null;
  is_active: boolean;
};

/**
 * Loads the current cart and recomputes every price and stock check from
 * live database rows — the client never dictates totals. Safe to call
 * from Server Components (read-only).
 */
export async function getValidatedCart(): Promise<ValidatedCart> {
  const cart = await findCart();
  const shippingFallback = await computeShipping({
    subtotalAfterDiscount: 0,
    optionId: cart?.shipping_option_id ?? null,
    freeShippingFromCoupon: false,
  });

  if (!cart) return emptyValidatedCart(shippingFallback);

  const supabase = await createClient();
  const { data: cartItems } = await supabase
    .from("cart_items")
    .select("id, product_id, variant_id, quantity")
    .eq("cart_id", cart.id)
    .order("created_at", { ascending: true });

  if (!cartItems || cartItems.length === 0) {
    return { ...emptyValidatedCart(shippingFallback), cartId: cart.id, shippingZipCode: cart.shipping_zip_code };
  }

  const productIds = [...new Set(cartItems.map((i) => i.product_id))];
  const variantIds = [...new Set(cartItems.map((i) => i.variant_id).filter((v): v is string => !!v))];

  const [{ data: products }, variantsResult, { data: images }, { data: inventoryRows }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, slug, base_price, compare_at_price, flash_sale_price, flash_sale_ends_at, is_active")
      .in("id", productIds),
    variantIds.length > 0
      ? supabase
          .from("product_variants")
          .select("id, product_id, name, value, price_adjustment, sale_price, image_url, is_active")
          .in("id", variantIds)
      : Promise.resolve({ data: [] as VariantRow[] }),
    supabase.from("product_images").select("product_id, url, is_primary").in("product_id", productIds),
    supabase
      .from("inventory")
      .select("product_id, variant_id, quantity, reserved_quantity")
      .in("product_id", productIds),
  ]);

  const productById = new Map<string, ProductRow>((products ?? []).map((p) => [p.id, p]));
  const variantById = new Map<string, VariantRow>(((variantsResult.data ?? []) as VariantRow[]).map((v) => [v.id, v]));

  const imagesByProduct = new Map<string, { url: string; is_primary: boolean }[]>();
  for (const img of images ?? []) {
    const list = imagesByProduct.get(img.product_id) ?? [];
    list.push(img);
    imagesByProduct.set(img.product_id, list);
  }

  const stockByKey = new Map<string, number>();
  for (const inv of inventoryRows ?? []) {
    const key = `${inv.product_id}:${inv.variant_id ?? "null"}`;
    stockByKey.set(key, Math.max(0, inv.quantity - inv.reserved_quantity));
  }

  let subtotal = 0;
  let hasBlockingIssues = false;

  const items: ValidatedCartItem[] = cartItems.map((row) => {
    const product = productById.get(row.product_id);
    const variant = row.variant_id ? variantById.get(row.variant_id) : null;
    const variantLabel = variant ? `${variant.name}: ${variant.value}` : null;

    if (!product || !product.is_active || (row.variant_id && !variant?.is_active)) {
      hasBlockingIssues = true;
      return {
        id: row.id,
        productId: row.product_id,
        variantId: row.variant_id,
        productSlug: product?.slug ?? "",
        name: product?.name ?? "Produto indisponível",
        variantLabel,
        imageUrl: null,
        quantity: row.quantity,
        unitPrice: 0,
        previousUnitPrice: null,
        discountPercent: null,
        lineTotal: 0,
        availableStock: 0,
        issue: "unavailable",
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

    const stockKey = `${row.product_id}:${row.variant_id ?? "null"}`;
    const availableStock = stockByKey.get(stockKey) ?? 0;
    const issue: ValidatedCartItem["issue"] =
      availableStock <= 0 ? "unavailable" : availableStock < row.quantity ? "insufficient_stock" : null;
    if (issue) hasBlockingIssues = true;

    const productImages = imagesByProduct.get(row.product_id) ?? [];
    const primaryImage = productImages.find((i) => i.is_primary) ?? productImages[0] ?? null;
    const lineTotal = round2(pricing.currentPrice * row.quantity);
    subtotal += lineTotal;

    return {
      id: row.id,
      productId: row.product_id,
      variantId: row.variant_id,
      productSlug: product.slug,
      name: product.name,
      variantLabel,
      imageUrl: variant?.image_url ?? primaryImage?.url ?? null,
      quantity: row.quantity,
      unitPrice: pricing.currentPrice,
      previousUnitPrice: pricing.previousPrice,
      discountPercent: pricing.discountPercent,
      lineTotal,
      availableStock,
      issue,
    };
  });

  subtotal = round2(subtotal);

  let coupon: AppliedCoupon | null = null;
  let couponError: string | null = null;
  let discountTotal = 0;

  if (cart.coupon_code) {
    const result = await evaluateCoupon(cart.coupon_code, items, subtotal);
    coupon = result.coupon;
    couponError = result.error;
    discountTotal = result.discount;
  }

  const shipping = await computeShipping({
    subtotalAfterDiscount: Math.max(0, subtotal - discountTotal),
    optionId: cart.shipping_option_id,
    freeShippingFromCoupon: coupon?.freeShipping ?? false,
  });

  const total = round2(Math.max(0, subtotal - discountTotal) + shipping.rate);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    cartId: cart.id,
    items,
    itemCount,
    subtotal,
    discountTotal,
    shippingTotal: shipping.rate,
    total,
    coupon,
    couponError,
    shippingZipCode: cart.shipping_zip_code,
    shippingOptionId: cart.shipping_option_id,
    shipping,
    hasBlockingIssues,
  };
}

/** Lightweight count for the header badge — avoids recomputing full pricing. */
export async function getCartItemCount(): Promise<number> {
  const cart = await findCart();
  if (!cart) return 0;

  const supabase = await createClient();
  const { data } = await supabase.from("cart_items").select("quantity").eq("cart_id", cart.id);
  return (data ?? []).reduce((sum, row) => sum + row.quantity, 0);
}
