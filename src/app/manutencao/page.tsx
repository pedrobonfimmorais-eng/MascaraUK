import type { Metadata } from "next";
import { t } from "@/i18n";
import { getStoreSettings } from "@/lib/store-settings";

export const metadata: Metadata = { title: t("pages.maintenance.title") };

export default async function MaintenancePage() {
  const settings = await getStoreSettings();

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-brand-secondary">{t("pages.maintenance.title")}</h1>
      <p className="text-gray-600">{settings.maintenanceMessage || t("pages.maintenance.defaultMessage")}</p>
      {settings.maintenanceEstimatedReturn && (
        <p className="text-sm text-gray-500">
          {t("pages.maintenance.estimatedReturn")}: {settings.maintenanceEstimatedReturn}
        </p>
      )}
    </div>
  );
}
