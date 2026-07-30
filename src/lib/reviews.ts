import { createClient } from "@/lib/supabase/server";
import { t } from "@/i18n";

export interface ProductReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  customerName: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

export interface HomeReview extends ProductReview {
  productName: string;
  productSlug: string;
}

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Real, approved reviews only — never fabricated. Used on the homepage's
 * "what customers say" section, which is hidden entirely by the caller
 * when this returns an empty array.
 */
export async function getRecentApprovedReviews(limit = 6): Promise<HomeReview[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = await createClient();
    const { data: reviews, error } = await supabase
      .from("reviews")
      .select("id, product_id, rating, title, comment, customer_name, is_verified_purchase, created_at")
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !reviews || reviews.length === 0) return [];

    const productIds = [...new Set(reviews.map((r) => r.product_id))];
    const { data: products } = await supabase.from("products").select("id, name, slug").in("id", productIds);
    const productById = new Map((products ?? []).map((p) => [p.id, p]));

    return reviews.flatMap((review) => {
      const product = productById.get(review.product_id);
      if (!product) return [];
      return [
        {
          id: review.id,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          customerName: review.customer_name ?? t("product.defaultCustomerName"),
          isVerifiedPurchase: review.is_verified_purchase,
          createdAt: review.created_at,
          productName: product.name,
          productSlug: product.slug,
        },
      ];
    });
  } catch {
    return [];
  }
}

export async function getProductReviews(
  productId: string
): Promise<{ items: ProductReview[]; avgRating: number; ratingCount: number }> {
  if (!isSupabaseConfigured()) return { items: [], avgRating: 0, ratingCount: 0 };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reviews")
      .select("id, rating, title, comment, customer_name, is_verified_purchase, created_at")
      .eq("product_id", productId)
      .eq("is_approved", true)
      .order("created_at", { ascending: false });

    if (error || !data) return { items: [], avgRating: 0, ratingCount: 0 };

    const items: ProductReview[] = data.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      customerName: r.customer_name ?? t("product.defaultCustomerName"),
      isVerifiedPurchase: r.is_verified_purchase,
      createdAt: r.created_at,
    }));

    const avgRating = items.length > 0 ? items.reduce((sum, r) => sum + r.rating, 0) / items.length : 0;

    return { items, avgRating: Math.round(avgRating * 10) / 10, ratingCount: items.length };
  } catch {
    return { items: [], avgRating: 0, ratingCount: 0 };
  }
}
