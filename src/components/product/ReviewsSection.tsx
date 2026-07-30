import Link from "next/link";
import { t } from "@/i18n";
import { getProductReviews } from "@/lib/reviews";
import { getCurrentUser } from "@/lib/auth";
import { ReviewForm } from "@/components/product/ReviewForm";
import { formatPublicDate } from "@/lib/format-date";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1 text-amber-500" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} aria-hidden="true">
          {i < Math.round(rating) ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}

export async function ReviewsSection({ productId, productSlug }: { productId: string; productSlug: string }) {
  const [{ items, avgRating, ratingCount }, user] = await Promise.all([
    getProductReviews(productId),
    getCurrentUser(),
  ]);

  return (
    <section className="border-t border-gray-200 pt-8">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold text-brand-secondary">{t("product.reviews")}</h2>
        {ratingCount > 0 && (
          <>
            <Stars rating={avgRating} />
            <span className="text-sm text-gray-500">
              {avgRating.toFixed(1)} ({ratingCount})
            </span>
          </>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mb-6 text-sm text-gray-500">{t("product.noReviewsYet")}</p>
      ) : (
        <div className="mb-6 flex flex-col gap-4">
          {items.map((review) => (
            <div key={review.id} className="rounded-xl border border-gray-200 p-4">
              <Stars rating={review.rating} />
              {review.comment && <p className="mt-2 text-sm text-gray-700">{review.comment}</p>}
              <p className="mt-2 text-xs text-gray-500">
                {review.customerName}
                {review.isVerifiedPurchase && ` · ${t("product.verifiedPurchase")}`} ·{" "}
                {formatPublicDate(review.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      {user ? (
        <ReviewForm productId={productId} productSlug={productSlug} />
      ) : (
        <p className="text-sm text-gray-600">
          <Link href="/login" className="font-medium text-brand-primary hover:underline">
            {t("product.reviewLoginRequired")}
          </Link>
        </p>
      )}
    </section>
  );
}
