import { t } from "@/i18n";

export function DemoNotice() {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      {t("common.demoDataNotice")}
    </div>
  );
}
