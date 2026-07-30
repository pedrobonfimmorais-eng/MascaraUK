import Link from "next/link";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

type AnalyticsSection = "geral" | "vendas" | "produtos" | "clientes" | "carrinhos" | "cupons" | "promocoes" | "estoque" | "alertas" | "relatorios";

const items: { key: AnalyticsSection; href: string; label: () => string }[] = [
  { key: "geral", href: "/admin/analytics", label: () => t("analytics.nav.overview") },
  { key: "vendas", href: "/admin/analytics/vendas", label: () => t("analytics.nav.sales") },
  { key: "produtos", href: "/admin/analytics/produtos", label: () => t("analytics.nav.products") },
  { key: "clientes", href: "/admin/analytics/clientes", label: () => t("analytics.nav.customers") },
  { key: "carrinhos", href: "/admin/analytics/carrinhos", label: () => t("analytics.nav.carts") },
  { key: "cupons", href: "/admin/analytics/cupons", label: () => t("analytics.nav.coupons") },
  { key: "promocoes", href: "/admin/analytics/promocoes", label: () => t("analytics.nav.promotions") },
  { key: "estoque", href: "/admin/analytics/estoque", label: () => t("analytics.nav.stock") },
  { key: "alertas", href: "/admin/analytics/alertas", label: () => t("analytics.nav.alerts") },
  { key: "relatorios", href: "/admin/relatorios", label: () => t("analytics.nav.reports") },
];

export function AnalyticsNav({ active }: { active: AnalyticsSection }) {
  return (
    <nav className="-mx-1 mb-4 flex flex-wrap gap-1 border-b border-gray-200 pb-2">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium",
            active === item.key ? "bg-brand-primary/10 text-brand-primary" : "text-gray-600 hover:bg-gray-100"
          )}
        >
          {item.label()}
        </Link>
      ))}
    </nav>
  );
}
