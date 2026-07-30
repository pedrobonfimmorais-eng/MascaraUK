"use client";

import { useActionState } from "react";
import { t } from "@/i18n";
import { updateProfile, type AccountActionState } from "@/lib/actions/account";
import { Button } from "@/components/ui/Button";

const initialState: AccountActionState = { error: null };

export function ProfileForm({
  defaultFirstName,
  defaultLastName,
  defaultPhone,
  defaultBirthDate,
  defaultMarketingOptIn,
}: {
  defaultFirstName: string;
  defaultLastName: string;
  defaultPhone: string;
  defaultBirthDate: string;
  defaultMarketingOptIn: boolean;
}) {
  const [state, formAction, isPending] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {t("auth.firstName")}
          <input
            required
            name="firstName"
            type="text"
            defaultValue={defaultFirstName}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {t("auth.lastName")}
          <input
            required
            name="lastName"
            type="text"
            defaultValue={defaultLastName}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {t("checkout.phone")}
          <input
            name="phone"
            type="tel"
            defaultValue={defaultPhone}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {t("account.birthDate")} ({t("common.optional")})
          <input
            name="birthDate"
            type="date"
            defaultValue={defaultBirthDate}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
        </label>
      </div>

      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input name="marketingOptIn" type="checkbox" defaultChecked={defaultMarketingOptIn} className="mt-0.5" />
        <span>{t("auth.marketingOptIn")}</span>
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-700">{t("account.profileUpdated")}</p>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {t("common.save")}
      </Button>
    </form>
  );
}
