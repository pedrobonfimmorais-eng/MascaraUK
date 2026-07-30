import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { t } from "@/i18n";
import { requirePrincipal } from "@/lib/auth";
import { getStaffOverview } from "@/lib/admin-directory";
import { AdminAccessManager } from "@/components/admin/AdminAccessManager";
import { AdminInviteForm } from "@/components/admin/AdminInviteForm";

export const metadata: Metadata = { title: t("admin.administrators.title") };

export default async function AdminAdministratorsPage() {
  const principal = await requirePrincipal();
  if (!principal) redirect("/acesso-negado");

  const { staff, pendingInvites } = await getStaffOverview();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-brand-secondary">{t("admin.administrators.title")}</h1>
      <AdminInviteForm />
      <AdminAccessManager staff={staff} pendingInvites={pendingInvites} currentUserId={principal.id} />
    </div>
  );
}
