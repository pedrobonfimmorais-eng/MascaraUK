"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { t } from "@/i18n";
import { signIn, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Turnstile } from "@/components/ui/Turnstile";

const initialState: AuthActionState = { error: null };
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, isPending] = useActionState(signIn, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="redirect" value={redirectTo} />
      <input type="hidden" name="captchaToken" value={captchaToken} />

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("auth.email")}
        <input
          required
          name="email"
          type="email"
          autoComplete="email"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("auth.password")}
        <span className="relative flex items-center">
          <input
            required
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-16 text-sm focus:border-brand-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-2 text-xs font-medium text-gray-500 hover:text-brand-primary"
          >
            {showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
          </button>
        </span>
      </label>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-gray-700">
          <input name="remember" type="checkbox" defaultChecked />
          {t("auth.rememberMe")}
        </label>
        <Link href="/recuperar-senha" className="text-brand-primary hover:underline">
          {t("auth.forgotPasswordLink")}
        </Link>
      </div>

      {TURNSTILE_SITE_KEY && <Turnstile siteKey={TURNSTILE_SITE_KEY} onVerify={setCaptchaToken} />}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {t("auth.submitLogin")}
      </Button>

      <p className="text-center text-sm text-gray-600">
        {t("auth.noAccount")}{" "}
        <Link href="/cadastro" className="font-medium text-brand-primary hover:underline">
          {t("auth.createAccount")}
        </Link>
      </p>
    </form>
  );
}
