import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ta, type TranslationKey } from "@/i18n";
import { requireAdmin } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getStoreSettings, getStoreCurrency, getServedCountries } from "@/lib/store-settings";
import { getShippingRules } from "@/lib/cart/cart-data";
import { getAnalyticsThresholds } from "@/lib/analytics/settings";
import { getPaymentIntegrationStatus, getEmailIntegrationStatus } from "@/lib/integration-status";
import { getSecurityOverview } from "@/lib/admin-directory";
import { cn } from "@/lib/utils";
import {
  StoreInfoTab,
  AppearanceTab,
  SalesTab,
  DeliveryTab,
  PaymentsTab,
  EmailsTab,
  SecurityTab,
  MaintenanceTab,
} from "@/components/admin/settings/SettingsTabs";

export const metadata: Metadata = { title: ta("admin.sidebar.settings") };

const TABS = [
  "informacoes",
  "aparencia",
  "vendas",
  "entrega",
  "pagamentos",
  "emails",
  "seguranca",
  "manutencao",
] as const;

type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, TranslationKey> = {
  informacoes: "admin.settings.tabs.storeInfo",
  aparencia: "admin.settings.tabs.appearance",
  vendas: "admin.settings.tabs.sales",
  entrega: "admin.settings.tabs.delivery",
  pagamentos: "admin.settings.tabs.payments",
  emails: "admin.settings.tabs.emails",
  seguranca: "admin.settings.tabs.security",
  manutencao: "admin.settings.tabs.maintenance",
};

interface AdminSettingsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminSettingsPage({ searchParams }: AdminSettingsPageProps) {
  const admin = await requireAdmin();
  if (!admin) redirect("/acesso-negado");
  if (!hasPermission(admin, "settings.manage")) redirect("/acesso-negado");

  const { tab: rawTab } = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(rawTab ?? "") ? (rawTab as Tab) : "informacoes";

  const settings = await getStoreSettings();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-brand-secondary">{ta("admin.sidebar.settings")}</h1>

      <nav className="flex flex-wrap gap-1 border-b border-gray-200">
        {TABS.map((value) => (
          <Link
            key={value}
            href={`/admin/configuracoes?tab=${value}`}
            className={cn(
              "rounded-t-lg px-3 py-2 text-sm font-medium",
              value === tab ? "border-b-2 border-brand-primary text-brand-primary" : "text-gray-600 hover:text-brand-primary"
            )}
          >
            {ta(TAB_LABELS[value])}
          </Link>
        ))}
      </nav>

      <TabContent tab={tab} settings={settings} isPrincipal={admin.role === "administrador_principal"} />
    </div>
  );
}

async function TabContent({
  tab,
  settings,
  isPrincipal,
}: {
  tab: Tab;
  settings: Awaited<ReturnType<typeof getStoreSettings>>;
  isPrincipal: boolean;
}) {
  switch (tab) {
    case "informacoes":
      return <StoreInfoTab settings={settings} />;
    case "aparencia":
      return <AppearanceTab settings={settings} />;
    case "vendas": {
      const [currency, thresholds] = await Promise.all([getStoreCurrency(), getAnalyticsThresholds()]);
      return <SalesTab settings={settings} currency={currency} lowStockQuantity={thresholds.lowStockQuantity} />;
    }
    case "entrega": {
      const [rules, servedCountries] = await Promise.all([getShippingRules(), getServedCountries()]);
      return <DeliveryTab shippingRules={rules} servedCountries={servedCountries} />;
    }
    case "pagamentos":
      return <PaymentsTab status={getPaymentIntegrationStatus()} />;
    case "emails":
      return <EmailsTab settings={settings} providerState={getEmailIntegrationStatus().state} />;
    case "seguranca": {
      const overview = isPrincipal ? await getSecurityOverview() : null;
      return <SecurityTab overview={overview} />;
    }
    case "manutencao":
      return <MaintenanceTab settings={settings} isPrincipal={isPrincipal} />;
  }
}
