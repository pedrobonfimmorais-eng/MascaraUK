"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { t } from "@/i18n";

export interface ReviewActionState {
  error: string | null;
  success?: boolean;
}

export async function submitReview(
  _prevState: ReviewActionState,
  formData: FormData
): Promise<ReviewActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: t("product.reviewLoginRequired") };
  }

  const productId = String(formData.get("productId") ?? "");
  const productSlug = String(formData.get("productSlug") ?? "");
  const rating = Number(formData.get("rating") ?? 0);
  const comment = String(formData.get("comment") ?? "").trim();

  if (!productId || rating < 1 || rating > 5) {
    return { error: t("product.selectRatingRequired") };
  }

  const supabase = await createClient();

  const { data: userOrders } = await supabase.from("orders").select("id").eq("user_id", user.id);
  const orderIds = (userOrders ?? []).map((o) => o.id);

  let isVerifiedPurchase = false;
  if (orderIds.length > 0) {
    const { data: purchasedOrderItem } = await supabase
      .from("order_items")
      .select("id")
      .eq("product_id", productId)
      .in("order_id", orderIds)
      .maybeSingle();
    isVerifiedPurchase = !!purchasedOrderItem;
  }

  const { error } = await supabase.from("reviews").upsert(
    {
      product_id: productId,
      user_id: user.id,
      rating,
      comment: comment || null,
      customer_name: user.fullName ?? user.email ?? t("product.defaultCustomerName"),
      is_verified_purchase: isVerifiedPurchase,
      is_approved: false,
    },
    { onConflict: "product_id,user_id" }
  );

  if (error) {
    return { error: t("product.reviewSubmitFailed") };
  }

  revalidatePath(`/produto/${productSlug}`);
  return { error: null, success: true };
}
