"use client";

import { useActionState, useState } from "react";
import { t } from "@/i18n";
import type { AdditionalCost } from "@/types/database";
import {
  createAdditionalCost,
  updateAdditionalCost,
  deleteAdditionalCost,
  type CostActionResult,
} from "@/lib/actions/analytics-costs";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";

const initialState: CostActionResult = { ok: true, message: "" };

const COST_TYPE_LABELS: Record<AdditionalCost["cost_type"], string> = {
  taxa_pagamento: "Taxa do meio de pagamento",
  embalagem: "Custo de embalagem",
  frete_medio: "Custo médio de envio",
  operacional: "Custo operacional",
  outro: "Outra despesa",
};

function CostForm({
  cost,
  action,
  onDone,
}: {
  cost?: AdditionalCost;
  action: (state: CostActionResult, formData: FormData) => Promise<CostActionResult>;
  onDone?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  if (state.ok && state.message && onDone) onDone();

  return (
    <form action={formAction} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("analytics.costs.name")}
        <input name="name" defaultValue={cost?.name} required className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("analytics.costs.type")}
        <select name="costType" defaultValue={cost?.cost_type ?? "outro"} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          {Object.entries(COST_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("analytics.costs.amountType")}
        <select name="amountType" defaultValue={cost?.amount_type ?? "valor_fixo"} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="valor_fixo">{t("analytics.costs.fixedPerOrder")}</option>
          <option value="percentual">{t("analytics.costs.percentOfRevenue")}</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("analytics.costs.value")}
        <input
          name="value"
          type="number"
          step="0.01"
          min="0"
          defaultValue={cost?.value}
          required
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("analytics.costs.startsAt")}
        <input name="startsAt" type="date" defaultValue={cost?.starts_at?.slice(0, 10)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("analytics.costs.endsAt")}
        <input name="endsAt" type="date" defaultValue={cost?.ends_at?.slice(0, 10)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
        <input type="checkbox" name="isActive" defaultChecked={cost?.is_active ?? true} />
        {t("analytics.costs.active")}
      </label>
      {state.message && !state.ok && <p className="text-sm text-red-600 sm:col-span-2">{state.message}</p>}
      <Button type="submit" disabled={isPending} className="w-fit sm:col-span-2">
        {t("common.save")}
      </Button>
    </form>
  );
}

export function AdditionalCostsManager({ costs }: { costs: AdditionalCost[] }) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {costs.length === 0 && !isCreating && <p className="text-sm text-gray-500">{t("analytics.costs.none")}</p>}

      {costs.map((cost) =>
        editingId === cost.id ? (
          <div key={cost.id} className="rounded-xl border border-brand-primary/40 p-4">
            <CostForm cost={cost} action={updateAdditionalCost.bind(null, cost.id)} onDone={() => setEditingId(null)} />
            <button type="button" onClick={() => setEditingId(null)} className="mt-2 text-sm text-gray-500 hover:underline">
              {t("common.cancel")}
            </button>
          </div>
        ) : (
          <div key={cost.id} className="flex items-center justify-between rounded-xl border border-gray-200 p-4 text-sm">
            <div>
              <p className="font-medium text-brand-secondary">
                {cost.name} {!cost.is_active && <Badge tone="neutral">{t("common.no")}</Badge>}
              </p>
              <p className="text-xs text-gray-500">
                {COST_TYPE_LABELS[cost.cost_type]} —{" "}
                {cost.amount_type === "percentual" ? `${cost.value}%` : formatCurrency(cost.value)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditingId(cost.id)}>
                {t("common.edit")}
              </Button>
              <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteAdditionalCost(cost.id)}>
                {t("common.delete")}
              </Button>
            </div>
          </div>
        )
      )}

      {isCreating ? (
        <div className="rounded-xl border border-brand-primary/40 p-4">
          <CostForm action={createAdditionalCost} onDone={() => setIsCreating(false)} />
          <button type="button" onClick={() => setIsCreating(false)} className="mt-2 text-sm text-gray-500 hover:underline">
            {t("common.cancel")}
          </button>
        </div>
      ) : (
        <Button variant="outline" className="w-fit" onClick={() => setIsCreating(true)}>
          {t("analytics.costs.add")}
        </Button>
      )}
    </div>
  );
}
