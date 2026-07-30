import { redirect } from "next/navigation";
import { t } from "@/i18n";
import { requireAdmin } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { signOut } from "@/lib/actions/auth";

/**
 * Second layer of protection for /admin, on top of src/proxy.ts. Proxy
 * already blocks non-admins before the request reaches here, but a Server
 * Component check is kept as defense in depth (see Next.js guidance on not
 * relying on Proxy alone for authorization).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/login?redirect=/admin");
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <AdminSidebar user={admin} />
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">{t("admin.dashboard")}</p>
            <p className="text-sm text-gray-700">{admin.fullName ?? admin.email}</p>
          </div>
          <form action={signOut}>
            <button type="submit" className="text-sm font-medium text-gray-600 hover:text-brand-primary">
              {t("nav.logout")}
            </button>
          </form>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
