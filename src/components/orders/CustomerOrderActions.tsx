"use client";

import { useState, useTransition } from "react";
import { t } from "@/i18n";
import { requestOrderCancellation, requestOrderReturn } from "@/lib/actions/customer-order-actions";
import { Button } from "@/components/ui/Button";
import type { Order } from "@/types/database";

const CANCELLABLE_STATUSES: Order["status"][] = ["recebido", "em_preparacao", "pronto_para_envio"];

export function CustomerOrderActions({ order }: { order: Order }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canCancel = CANCELLABLE_STATUSES.includes(order.status);
  const canRequestReturn = order.status === "entregue";

  function handleCancel() {
    if (!confirm(t("account.confirmCancelOrder"))) return;
    startTransition(async () => {
      const result = await requestOrderCancellation(order.id);
      setMessage(result.message);
    });
  }

  function handleReturn() {
    if (!confirm(t("account.confirmRequestReturn"))) return;
    startTransition(async () => {
      const result = await requestOrderReturn(order.id);
      setMessage(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button href="/contato" variant="outline" size="sm">
          {t("account.requestHelp")}
        </Button>
        {canCancel && (
          <Button variant="outline" size="sm" disabled={isPending} onClick={handleCancel}>
            {t("account.requestCancellation")}
          </Button>
        )}
        {canRequestReturn && (
          <Button variant="outline" size="sm" disabled={isPending} onClick={handleReturn}>
            {t("account.requestReturn")}
          </Button>
        )}
      </div>
      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </div>
  );
}
