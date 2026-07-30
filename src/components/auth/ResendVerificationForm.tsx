"use client";

import { useActionState } from "react";
import { t } from "@/i18n";
import { resendVerificationEmail, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

const initialState: AuthActionState = { error: null };

export function ResendVerificationForm({ email }: { email: string }) {
  const [state, formAction, isPending] = useActionState(resendVerificationEmail, initialState);

  return (
    <form action={formAction} className="flex flex-col items-center gap-3">
      <input type="hidden" name="email" value={email} />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-700">{t("auth.verificationResent")}</p>}
      <Button type="submit" variant="outline" disabled={isPending || !email}>
        {t("auth.resendVerification")}
      </Button>
    </form>
  );
}
