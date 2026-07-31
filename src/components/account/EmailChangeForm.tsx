"use client";

import { useActionState } from "react";
import { t } from "@/i18n";
import { requestEmailChange, type AccountActionState } from "@/lib/actions/account";
import { Button } from "@/components/ui/Button";

const initialState: AccountActionState = { error: null };

export function EmailChangeForm({ currentEmail }: { currentEmail: string }) {
  const [state, formAction, isPending] = useActionState(requestEmailChange, initialState);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-gray-600">
        {t("account.currentEmail")}: <span className="font-medium text-brand-secondary">{currentEmail}</span>
      </p>
      <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm text-gray-700">
          {t("account.newEmail")}
          <input
            required
            name="newEmail"
            type="email"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
        </label>
        <Button type="submit" variant="outline" disabled={isPending}>
          {t("account.requestEmailChange")}
        </Button>
      </form>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-700">{t("account.emailChangeRequested")}</p>}
    </div>
  );
}
