"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics/track-client";

/** Fires one page_view per route change — mounted once in the root layout. */
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    trackEvent({ type: "page_view", path: pathname });
  }, [pathname]);

  return null;
}
