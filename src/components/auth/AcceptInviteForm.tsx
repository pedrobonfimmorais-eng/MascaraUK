"use client";

import { useActionState, useState } from "react";
import { ta } from "@/i18n";
import { acceptAdminInviteFormAction, type AcceptInviteFormState } from "@/lib/actions/accept-invite";
import { Button } from "@/components/ui/Button";
import { Turnstile } from "@/components/ui/Turnstile";

const initialState: AcceptInviteFormState = { error: null };
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(acceptAdminInviteFormAction, initialState);
  const [captchaToken, setCaptchaToken] = useState("");

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-center text-sm text-emerald-800">
        <p>{ta("adminInvite.successMessage")}</p>
        <Button href="/login">{ta("adminInvite.goToLogin")}</Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="captchaToken" value={captchaToken} />

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {ta("adminInvite.fullName")}
        <input required name="fullName" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
      </label>

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {ta("adminInvite.password")}
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
        {ta("adminInvite.confirmPassword")}
        <input
          required
          name="confirmPassword"
          type="password"
          minLength={8}
          autoComplete="new-password"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>

      {TURNSTILE_SITE_KEY && <Turnstile siteKey={TURNSTILE_SITE_KEY} onVerify={setCaptchaToken} />}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {ta("adminInvite.submit")}
      </Button>
    </form>
  );
}
