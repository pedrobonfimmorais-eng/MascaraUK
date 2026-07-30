"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/track-client";

/** Fires a single product_view event per page load — skipped entirely for demo-data products (no real DB row to reference). */
export function ProductViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    trackEvent({ type: "product_view", productId });
  }, [productId]);

  return null;
}
