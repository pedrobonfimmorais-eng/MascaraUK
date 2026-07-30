import Link from "next/link";
import { t } from "@/i18n";
import { hasPermission, type Capability, type PermissionCheckable } from "@/lib/permissions";

const links: { href: string; label: string; requires?: Capability }[] = [
  { href: "/admin", label: t("admin.sidebar.dashboard") },
  { href: "/admin/produtos", label: t("admin.sidebar.products"), requires: "products.manage" },
  { href: "/admin/categorias", label: t("admin.sidebar.categories"), requires: "products.manage" },
  { href: "/admin/pedidos", label: t("admin.sidebar.orders"), requires: "orders.view" },
  { href: "/admin/cupons", label: t("admin.sidebar.coupons"), requires: "promotions.manage" },
  { href: "/admin/banners", label: t("admin.sidebar.banners"), requires: "promotions.manage" },
  { href: "/admin/mensagens", label: t("admin.sidebar.messages"), requires: "messages.manage" },
  { href: "/admin/analytics", label: t("admin.sidebar.analytics"), requires: "analytics.view" },
  { href: "/admin/relatorios", label: t("analytics.nav.reports"), requires: "reports.export" },
  { href: "/admin/atividades", label: t("admin.sidebar.activities"), requires: "activities.view" },
  { href: "/admin/administradores", label: t("admin.administrators.title"), requires: "admins.manage" },
  { href: "/admin/configuracoes", label: t("admin.sidebar.settings"), requires: "settings.manage" },
];

export function AdminSidebar({ user }: { user: PermissionCheckable }) {
  const visibleLinks = links.filter((link) => !link.requires || hasPermission(user, link.requires));

  return (
    <aside className="w-full shrink-0 border-b border-gray-200 bg-white lg:w-56 lg:border-b-0 lg:border-r">
      <nav className="flex gap-1 overflow-x-auto p-3 lg:flex-col lg:overflow-visible">
        {visibleLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
