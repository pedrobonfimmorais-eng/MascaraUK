import Link from "next/link";
import { t } from "@/i18n";
import type { HomeReview } from "@/lib/reviews";

export function HomeReviews({ reviews }: { reviews: HomeReview[] }) {
  if (reviews.length === 0) return null;

  return (
    <section>
      <h2 className="mb-6 text-xl font-semibold text-brand-secondary sm:text-2xl">
        {t("home.realReviewsTitle")}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-1 text-amber-500" aria-label={`${review.rating} de 5`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} aria-hidden="true">
                  {i < review.rating ? "★" : "☆"}
                </span>
              ))}
            </div>
            {review.comment && <p className="mt-2 text-sm text-gray-700">{review.comment}</p>}
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span>
                {review.customerName}
                {review.isVerifiedPurchase && ` · ${t("product.verifiedPurchase")}`}
              </span>
              <Link href={`/produto/${review.productSlug}`} className="font-medium text-brand-primary hover:underline">
                {review.productName}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
