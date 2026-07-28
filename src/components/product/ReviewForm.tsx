"use client";

import { useActionState, useState } from "react";
import { t } from "@/i18n";
import { submitReview, type ReviewActionState } from "@/lib/actions/reviews";
import { Button } from "@/components/ui/Button";

const initialState: ReviewActionState = { error: null };

export function ReviewForm({ productId, productSlug }: { productId: string; productSlug: string }) {
  const [state, formAction, isPending] = useActionState(submitReview, initialState);
  const [rating, setRating] = useState(0);

  if (state.success) {
    return <p className="text-sm text-emerald-700">{t("product.reviewSubmitted")}</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="productSlug" value={productSlug} />
      <input type="hidden" name="rating" value={rating} />

      <div>
        <p className="mb-1 text-sm font-medium text-gray-700">{t("product.ratingLabel")}</p>
        <div className="flex gap-1" role="radiogroup" aria-label={t("product.ratingLabel")}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} de 5`}
              onClick={() => setRating(value)}
              className={`text-2xl ${value <= rating ? "text-amber-500" : "text-gray-300"}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("product.commentLabel")}
        <textarea
          name="comment"
          rows={3}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" disabled={isPending || rating === 0} className="w-fit">
        {t("product.submitReview")}
      </Button>
    </form>
  );
}
