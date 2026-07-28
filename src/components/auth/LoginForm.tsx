"use client";

import { useActionState } from "react";
import Link from "next/link";
import { t } from "@/i18n";
import { signIn, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

const initialState: AuthActionState = { error: null };

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, isPending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="redirect" value={redirectTo} />

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("auth.email")}
        <input
          required
          name="email"
          type="email"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("auth.password")}
        <input
          required
          name="password"
          type="password"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>

      <div className="flex justify-end text-sm">
        <Link href="/recuperar-senha" className="text-brand-primary hover:underline">
          {t("auth.forgotPasswordLink")}
        </Link>
      </div>

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
