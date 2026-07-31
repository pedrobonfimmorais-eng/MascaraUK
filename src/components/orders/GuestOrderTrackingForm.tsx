"use client";

import { useActionState } from "react";
import { t } from "@/i18n";
import { requestGuestOrderAccess, type GuestTrackingActionState } from "@/lib/actions/order-tracking";
import { Button } from "@/components/ui/Button";

const initialState: GuestTrackingActionState = { error: null };

export function GuestOrderTrackingForm() {
  const [state, formAction, isPending] = useActionState(requestGuestOrderAccess, initialState);

  if (state.success) {
    return <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">{t("orderTracking.linkSent")}</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("orderTracking.orderNumber")}
        <input
          required
          name="orderNumber"
          type="text"
          placeholder="ORD-000001"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("checkout.email")}
        <input
          required
          name="email"
          type="email"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={isPending}>
        {t("orderTracking.sendLink")}
      </Button>
    </form>
  );
}
