"use client";

import { useActionState, useEffect, useState } from "react";
import { t } from "@/i18n";
import type { Address } from "@/types/database";
import type { AddressActionState } from "@/lib/actions/account";
import { Button } from "@/components/ui/Button";

const initialState: AddressActionState = { error: null };

export function AddressForm({
  address,
  action,
  onSuccess,
}: {
  address?: Address;
  action: (state: AddressActionState, formData: FormData) => Promise<AddressActionState>;
  onSuccess?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [postcode, setPostcode] = useState(address?.postcode ?? "");

  useEffect(() => {
    if (state.success && onSuccess) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("account.addressLabel")} ({t("common.optional")})
        <input
          name="label"
          type="text"
          defaultValue={address?.label ?? ""}
          placeholder={t("account.addressLabelPlaceholder")}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {t("checkout.fullName")}
          <input
            required
            name="recipientName"
            type="text"
            defaultValue={address?.recipient_name ?? ""}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {t("checkout.phone")}
          <input
            required
            name="phone"
            type="tel"
            defaultValue={address?.phone ?? ""}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("checkout.companyName")} ({t("common.optional")})
        <input
          name="companyName"
          type="text"
          defaultValue={address?.company_name ?? ""}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("checkout.addressLine1")}
        <input
          required
          name="addressLine1"
          type="text"
          defaultValue={address?.address_line1 ?? ""}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("checkout.addressLine2")} ({t("common.optional")})
        <input
          name="addressLine2"
          type="text"
          defaultValue={address?.address_line2 ?? ""}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {t("checkout.townCity")}
          <input
            required
            name="townCity"
            type="text"
            defaultValue={address?.town_city ?? ""}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {t("checkout.county")} ({t("common.optional")})
          <input
            name="county"
            type="text"
            defaultValue={address?.county ?? ""}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {t("checkout.postcode")}
          <input
            required
            name="postcode"
            type="text"
            maxLength={8}
            value={postcode}
            onChange={(event) => setPostcode(event.target.value)}
            placeholder="SW1A 1AA"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-brand-primary focus:outline-none"
          />
        </label>
      </div>

      <input type="hidden" name="country" value="United Kingdom" />

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("checkout.deliveryInstructions")} ({t("common.optional")})
        <input
          name="deliveryInstructions"
          type="text"
          defaultValue={address?.delivery_instructions ?? ""}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-700">{t("account.addressSaved")}</p>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {t("common.save")}
      </Button>
    </form>
  );
}
