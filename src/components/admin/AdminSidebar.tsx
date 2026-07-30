import Link from "next/link";
import { t } from "@/i18n";

const links = [
  { href: "/admin", label: t("admin.sidebar.dashboard") },
  { href: "/admin/produtos", label: t("admin.sidebar.products") },
  { href: "/admin/categorias", label: t("admin.sidebar.categories") },
  { href: "/admin/pedidos", label: t("admin.sidebar.orders") },
  { href: "/admin/cupons", label: t("admin.sidebar.coupons") },
  { href: "/admin/banners", label: t("admin.sidebar.banners") },
  { href: "/admin/analytics", label: t("admin.sidebar.analytics") },
  { href: "/admin/relatorios", label: t("analytics.nav.reports") },
  { href: "/admin/configuracoes", label: t("admin.sidebar.settings") },
];

export function AdminSidebar() {
  return (
    <aside className="w-full shrink-0 border-b border-gray-200 bg-white lg:w-56 lg:border-b-0 lg:border-r">
      <nav className="flex gap-1 overflow-x-auto p-3 lg:flex-col lg:overflow-visible">
        {links.map((link) => (
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
