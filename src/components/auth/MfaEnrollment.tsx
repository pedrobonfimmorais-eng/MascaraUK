"use client";

import { useActionState, useEffect, useState } from "react";
import { t } from "@/i18n";
import { startMfaEnrollment, confirmMfaEnrollment, type MfaActionState } from "@/lib/actions/mfa";
import { Button } from "@/components/ui/Button";

const initialState: MfaActionState = { error: null };

export function MfaEnrollment({ redirectTo }: { redirectTo: string }) {
  const [enrollment, setEnrollment] = useState<{ factorId: string; qrCodeSvg: string; secret: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(confirmMfaEnrollment, initialState);

  useEffect(() => {
    let cancelled = false;
    startMfaEnrollment().then((result) => {
      if (cancelled) return;
      if (result.error || !result.data) {
        setLoadError(result.error ?? t("auth.mfa.errorStartingEnrollment"));
        return;
      }
      setEnrollment(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return <p className="text-sm text-red-600">{loadError}</p>;
  }

  if (!enrollment) {
    return <p className="text-sm text-gray-500">{t("auth.mfa.loadingQrCode")}</p>;
  }

  const qrImageSrc = `data:image/svg+xml;utf8,${encodeURIComponent(enrollment.qrCodeSvg)}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-700">{t("auth.mfa.scanQrCode")}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrImageSrc} alt={t("auth.mfa.scanQrCode")} width={200} height={200} className="h-48 w-48" />
        <p className="text-xs text-gray-500">{t("auth.mfa.manualEntry")}</p>
        <code className="rounded bg-gray-100 px-2 py-1 text-xs tracking-wider">{enrollment.secret}</code>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="factorId" value={enrollment.factorId} />
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
            className="rounded-lg border border-gray-300 px-3 py-2 text-center text-lg tracking-[0.5em] focus:border-brand-primary focus:outline-none"
          />
        </label>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <Button type="submit" size="lg" disabled={isPending} className="w-full">
          {t("auth.mfa.confirmActivation")}
        </Button>
      </form>
    </div>
  );
}
