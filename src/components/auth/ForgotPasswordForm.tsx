"use client";

import { useActionState } from "react";
import Link from "next/link";
import { t } from "@/i18n";
import { requestPasswordReset, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

const initialState: AuthActionState = { error: null };

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("auth.email")}
        <input
          required
          name="email"
          type="email"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-emerald-700">{t("auth.forgotPasswordSuccess")}</p>
      )}

      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {t("auth.submitForgotPassword")}
      </Button>

      <p className="text-center text-sm text-gray-600">
        <Link href="/login" className="font-medium text-brand-primary hover:underline">
          {t("auth.backToLogin")}
        </Link>
      </p>
    </form>
  );
}
