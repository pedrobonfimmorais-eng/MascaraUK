import type { Metadata } from "next";
import { t } from "@/i18n";
import { getStoreSettings } from "@/lib/store-settings";
import { AdminSettingsForm } from "@/components/admin/AdminSettingsForm";

export const metadata: Metadata = { title: t("admin.sidebar.settings") };

export default async function AdminSettingsPage() {
  const settings = await getStoreSettings();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-brand-secondary">{t("admin.sidebar.settings")}</h1>
      <AdminSettingsForm settings={settings} />
    </div>
  );
}
