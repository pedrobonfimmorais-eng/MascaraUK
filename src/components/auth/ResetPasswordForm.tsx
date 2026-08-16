"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { t } from "@/i18n";
import { updatePasswordWithRecoverySession, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

const initialState: AuthActionState = { error: null };

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePasswordWithRecoverySession, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      const timeout = setTimeout(() => router.push("/login"), 2500);
      return () => clearTimeout(timeout);
    }
  }, [state.success, router]);

  if (state.success) {
    return (
      <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">{t("auth.resetPasswordSuccess")}</p>
    );
  }

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

      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {t("auth.submitResetPassword")}
      </Button>
    </form>
  );
}
