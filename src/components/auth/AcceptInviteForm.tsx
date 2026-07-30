"use client";

import { useActionState } from "react";
import { t } from "@/i18n";
import { acceptAdminInviteFormAction, type AcceptInviteFormState } from "@/lib/actions/accept-invite";
import { Button } from "@/components/ui/Button";

const initialState: AcceptInviteFormState = { error: null };

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(acceptAdminInviteFormAction, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-center text-sm text-emerald-800">
        <p>{t("adminInvite.successMessage")}</p>
        <Button href="/login">{t("adminInvite.goToLogin")}</Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("adminInvite.fullName")}
        <input required name="fullName" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
      </label>

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("adminInvite.password")}
        <input
          required
          name="password"
          type="password"
          minLength={8}
          autoComplete="new-password"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("adminInvite.confirmPassword")}
        <input
          required
          name="confirmPassword"
          type="password"
          minLength={8}
          autoComplete="new-password"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {t("adminInvite.submit")}
      </Button>
    </form>
  );
}
