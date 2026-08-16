"use client";

import { useActionState } from "react";
import { t } from "@/i18n";
import { verifyMfaChallenge, type MfaActionState } from "@/lib/actions/mfa";
import { Button } from "@/components/ui/Button";

const initialState: MfaActionState = { error: null };

export function MfaChallengeForm({ factorId, redirectTo }: { factorId: string; redirectTo: string }) {
  const [state, formAction, isPending] = useActionState(verifyMfaChallenge, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="factorId" value={factorId} />
      <input type="hidden" name="redirect" value={redirectTo} />

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("auth.mfa.codeLabel")}
        <input
          required
          name="code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="one-time-code"
          autoFocus
          className="rounded-lg border border-gray-300 px-3 py-2 text-center text-lg tracking-[0.5em] focus:border-brand-primary focus:outline-none"
        />
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {t("auth.mfa.confirmCode")}
      </Button>
    </form>
  );
}
