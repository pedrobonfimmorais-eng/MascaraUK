"use client";

import { useEffect, useState } from "react";
import { t } from "@/i18n";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":");
}

/**
 * Live countdown for an active flash sale. Renders nothing once the
 * deadline passes. Starts at `null` (renders nothing) on both the server
 * and the client's first paint — the server has no way to know "now" the
 * same instant the client will, so computing the initial value from
 * Date.now() would produce a hydration mismatch. The real value is filled
 * in after mount instead.
 */
export function FlashSaleTimer({ endsAt, className }: { endsAt: string; className?: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    function tick() {
      setRemaining(new Date(endsAt).getTime() - Date.now());
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (remaining === null || remaining <= 0) return null;

  return (
    <span className={className} role="timer" aria-live="off">
      {t("product.flashSaleEndsIn")}: {formatRemaining(remaining)}
    </span>
  );
}
