"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/track-client";

/** Logs a completed search (term + result count) — see /admin/analytics "pesquisas internas". */
export function SearchTracker({ term, resultsCount }: { term: string; resultsCount: number }) {
  useEffect(() => {
    trackEvent({ type: "search", searchTerm: term, resultsCount });
  }, [term, resultsCount]);

  return null;
}
