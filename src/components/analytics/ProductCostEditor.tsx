"use client";

import { useState, useTransition } from "react";
import { t } from "@/i18n";
import { updateProductCostPrice } from "@/lib/actions/analytics-costs";
import { Button } from "@/components/ui/Button";

export function ProductCostEditor({ productId, currentCost }: { productId: string; currentCost: number | null }) {
  const [value, setValue] = useState(currentCost != null ? String(currentCost) : "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const parsed = value.trim() === "" ? null : parseFloat(value);
    startTransition(async () => {
      const result = await updateProductCostPrice(productId, parsed);
      setMessage(result.message);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("analytics.profit.productCost")}
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("analytics.profit.costNotInformed")}
          className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
      <Button size="sm" disabled={isPending} onClick={handleSave}>
        {t("common.save")}
      </Button>
      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </div>
  );
}
