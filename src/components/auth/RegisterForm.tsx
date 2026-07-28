"use client";

import { useActionState } from "react";
import Link from "next/link";
import { t } from "@/i18n";
import { signUp, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

const initialState: AuthActionState = { error: null };

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(signUp, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("auth.fullName")}
        <input
          required
          name="fullName"
          type="text"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>

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
          minLength={8}
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
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {t("auth.submitRegister")}
      </Button>

      <p className="text-center text-sm text-gray-600">
        {t("auth.hasAccount")}{" "}
        <Link href="/login" className="font-medium text-brand-primary hover:underline">
          {t("auth.signIn")}
        </Link>
      </p>
    </form>
  );
}
