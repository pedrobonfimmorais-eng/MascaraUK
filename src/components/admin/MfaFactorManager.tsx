"use client";

import { useState, useTransition } from "react";
import { ta } from "@/i18n";
import { removeMyOwnFactor } from "@/lib/actions/mfa";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { TotpFactorSummary } from "@/lib/mfa";

export function MfaFactorManager({ factors }: { factors: TotpFactorSummary[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function remove(factorId: string) {
    if (!confirm(ta("auth.mfa.confirmRemoveFactor"))) return;
    startTransition(async () => {
      const result = await removeMyOwnFactor(factorId);
      setMessage(result.error);
      if (!result.error) window.location.reload();
    });
  }

  if (factors.length === 0) {
    return <p className="text-sm text-gray-500">{ta("auth.mfa.noFactors")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {factors.map((factor) => (
        <div key={factor.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm">
          <div className="flex items-center gap-2">
            <span>{factor.friendlyName ?? factor.id.slice(0, 8)}</span>
            <Badge tone={factor.status === "verified" ? "success" : "neutral"}>
              {factor.status === "verified" ? ta("auth.mfa.factorStatusVerified") : ta("auth.mfa.factorStatusUnverified")}
            </Badge>
          </div>
          <Button size="sm" variant="ghost" disabled={isPending} onClick={() => remove(factor.id)}>
            {ta("auth.mfa.removeFactor")}
          </Button>
        </div>
      ))}
      {message && <p className="text-sm text-red-600">{message}</p>}
    </div>
  );
}
