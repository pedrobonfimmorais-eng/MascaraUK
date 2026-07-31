import { t } from "@/i18n";

export interface FunnelStep {
  label: string;
  count: number;
}

/** Simple horizontal-bar funnel: count + pass-through % + drop-off % at each step. */
export function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  const first = steps[0]?.count ?? 0;

  return (
    <div className="flex flex-col gap-3">
      {steps.map((step, index) => {
        const widthPercent = first > 0 ? Math.max(4, (step.count / first) * 100) : 0;
        const previous = index > 0 ? steps[index - 1].count : null;
        const passThrough = previous != null && previous > 0 ? Math.round((step.count / previous) * 1000) / 10 : null;
        const dropOff = passThrough != null ? Math.round((100 - passThrough) * 10) / 10 : null;

        return (
          <div key={step.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-brand-secondary">{step.label}</span>
              <span className="text-gray-600">{step.count.toLocaleString("pt-BR")}</span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-100">
              <div className="h-3 rounded-full bg-brand-primary" style={{ width: `${widthPercent}%` }} />
            </div>
            {passThrough != null && (
              <p className="mt-1 text-xs text-gray-500">
                {t("analytics.funnel.passThrough", { value: passThrough })}
                {dropOff != null && dropOff > 0 ? ` · ${t("analytics.funnel.dropOff", { value: dropOff })}` : ""}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
