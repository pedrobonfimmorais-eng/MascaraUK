"use client";

import { useTransition } from "react";
import { t, type TranslationKey } from "@/i18n";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { markAlertRead, markAlertResolved, ignoreAlert } from "@/lib/actions/alerts";
import type { Alert } from "@/types/database";

const PRIORITY_TONE: Record<Alert["priority"], "danger" | "warning" | "neutral" | "success"> = {
  critica: "danger",
  alta: "danger",
  media: "warning",
  baixa: "neutral",
};

export function AlertsList({ alerts }: { alerts: Alert[] }) {
  const [isPending, startTransition] = useTransition();

  if (alerts.length === 0) {
    return <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">{t("analytics.alerts.none")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {alerts.map((alert) => (
        <div key={alert.id} className="rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Badge tone={PRIORITY_TONE[alert.priority]}>{t(`analytics.alerts.priority.${alert.priority}` as TranslationKey)}</Badge>
                <Badge tone="neutral">{t(`analytics.alerts.status.${alert.status}` as TranslationKey)}</Badge>
              </div>
              <p className="font-medium text-brand-secondary">{alert.title}</p>
              <p className="text-sm text-gray-600">{alert.description}</p>
              <p className="mt-1 text-xs text-gray-400">{new Date(alert.created_at).toLocaleString("pt-BR")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {alert.related_link && (
                <Button size="sm" variant="outline" href={alert.related_link}>
                  {t("analytics.alerts.open")}
                </Button>
              )}
              {alert.status === "novo" && (
                <Button size="sm" variant="ghost" disabled={isPending} onClick={() => startTransition(() => markAlertRead(alert.id))}>
                  {t("analytics.alerts.markRead")}
                </Button>
              )}
              {alert.status !== "resolvido" && (
                <Button size="sm" variant="ghost" disabled={isPending} onClick={() => startTransition(() => markAlertResolved(alert.id))}>
                  {t("analytics.alerts.markResolved")}
                </Button>
              )}
              {alert.status !== "ignorado" && (
                <Button size="sm" variant="ghost" disabled={isPending} onClick={() => startTransition(() => ignoreAlert(alert.id))}>
                  {t("analytics.alerts.ignore")}
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
