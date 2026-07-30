"use client";

import { useActionState, useEffect, useState } from "react";
import { t } from "@/i18n";
import type { Address } from "@/types/database";
import type { AddressActionState } from "@/lib/actions/account";
import { Button } from "@/components/ui/Button";

const initialState: AddressActionState = { error: null };

const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

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
  const [zip, setZip] = useState(address?.zip_code ?? "");

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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {t("checkout.zipCode")}
          <input
            required
            name="zipCode"
            type="text"
            inputMode="numeric"
            maxLength={9}
            value={zip}
            onChange={(event) => setZip(event.target.value)}
            placeholder="00000-000"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700 sm:col-span-2">
          {t("checkout.street")}
          <input
            required
            name="street"
            type="text"
            defaultValue={address?.street ?? ""}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {t("checkout.number")}
          <input
            required
            name="number"
            type="text"
            defaultValue={address?.number ?? ""}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {t("checkout.complement")} ({t("common.optional")})
          <input
            name="complement"
            type="text"
            defaultValue={address?.complement ?? ""}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {t("checkout.neighborhood")}
          <input
            required
            name="neighborhood"
            type="text"
            defaultValue={address?.neighborhood ?? ""}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {t("checkout.city")}
          <input
            required
            name="city"
            type="text"
            defaultValue={address?.city ?? ""}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {t("checkout.state")}
          <select
            required
            name="state"
            defaultValue={address?.state ?? ""}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          >
            <option value="" disabled>
              {t("account.selectState")}
            </option>
            {BRAZILIAN_STATES.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </label>
      </div>

      <input type="hidden" name="country" value="BR" />

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("account.addressReference")} ({t("common.optional")})
        <input
          name="reference"
          type="text"
          defaultValue={address?.reference ?? ""}
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
