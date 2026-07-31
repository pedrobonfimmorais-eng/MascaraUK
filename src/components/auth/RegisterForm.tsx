"use client";

import { useActionState } from "react";
import Link from "next/link";
import { t } from "@/i18n";
import { signUp, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

const initialState: AuthActionState = { error: null };

export function RegisterForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, isPending] = useActionState(signUp, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="redirect" value={redirectTo} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {t("auth.firstName")}
          <input
            required
            name="firstName"
            type="text"
            autoComplete="given-name"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {t("auth.lastName")}
          <input
            required
            name="lastName"
            type="text"
            autoComplete="family-name"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
        </label>
      </div>

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

      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input required name="acceptTerms" type="checkbox" className="mt-0.5" />
        <span>
          {t("auth.acceptTermsPrefix")}{" "}
          <Link href="/termos-de-uso" className="text-brand-primary hover:underline" target="_blank">
            {t("auth.termsOfUseLink")}
          </Link>
          {t("auth.acceptTermsJoin")}{" "}
          <Link href="/politica-de-privacidade" className="text-brand-primary hover:underline" target="_blank">
            {t("auth.privacyPolicyLink")}
          </Link>
          .
        </span>
      </label>

      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input name="marketingOptIn" type="checkbox" className="mt-0.5" />
        <span>{t("auth.marketingOptIn")}</span>
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
