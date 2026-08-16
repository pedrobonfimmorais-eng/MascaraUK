"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { t } from "@/i18n";
import { requestPasswordReset, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Turnstile } from "@/components/ui/Turnstile";

const initialState: AuthActionState = { error: null };
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState);
  const [captchaToken, setCaptchaToken] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="captchaToken" value={captchaToken} />
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("auth.email")}
        <input
          required
          name="email"
          type="email"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>

      {TURNSTILE_SITE_KEY && <Turnstile siteKey={TURNSTILE_SITE_KEY} onVerify={setCaptchaToken} />}

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
