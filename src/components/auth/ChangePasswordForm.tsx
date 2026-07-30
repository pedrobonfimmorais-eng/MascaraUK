"use client";

import { useActionState } from "react";
import { t } from "@/i18n";
import { updatePasswordWithRecoverySession, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

const initialState: AuthActionState = { error: null };

/** Same server action used by the recovery-link flow: it just calls
 * supabase.auth.updateUser({ password }) against whatever session cookie
 * is present, which works equally well for an already-logged-in customer. */
export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePasswordWithRecoverySession, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("auth.newPassword")}
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
        {t("auth.confirmPassword")}
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
      {state.success && <p className="text-sm text-emerald-700">{t("account.passwordUpdated")}</p>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {t("auth.submitResetPassword")}
      </Button>
    </form>
  );
}
