"use client";

import { useState, useTransition } from "react";
import { t } from "@/i18n";
import { retryPayment } from "@/lib/actions/checkout";
import { Button } from "@/components/ui/Button";

export function RetryPaymentButton({ orderId }: { orderId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await retryPayment(orderId);
      if (result.url) {
        window.location.href = result.url;
      } else {
        setError(result.error ?? t("common.error"));
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button onClick={handleClick} disabled={isPending}>
        {isPending ? t("common.loading") : t("orderCancelled.tryAgain")}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
