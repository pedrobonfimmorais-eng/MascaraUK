import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { t } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { EmptyState } from "@/components/ui/EmptyState";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: t("admin.activities.title") };

interface AdminActivitiesPageProps {
  searchParams: Promise<{ action?: string; from?: string; to?: string }>;
}

export default async function AdminActivitiesPage({ searchParams }: AdminActivitiesPageProps) {
  const staff = await requirePermission("activities.view");
  if (!staff) redirect("/acesso-negado");

  const { action, from, to } = await searchParams;
  const admin = createAdminClient();

  let query = admin.from("admin_logs").select("id, admin_id, action, entity_type, entity_id, details, created_at").order("created_at", { ascending: false });
  if (action) query = query.eq("action", action);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", `${to}T23:59:59`);

  const { data: logs } = await query.limit(300);

  const adminIds = Array.from(new Set((logs ?? []).map((l) => l.admin_id).filter(Boolean))) as string[];
  const { data: profiles } = adminIds.length
    ? await admin.from("profiles").select("id, full_name").in("id", adminIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const actions = Array.from(new Set((logs ?? []).map((l) => l.action))).sort();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-brand-secondary">{t("admin.activities.title")}</h1>
      <p className="text-xs text-gray-500">{t("admin.activities.readOnlyNote")}</p>

      <form className="flex flex-wrap gap-3 rounded-xl border border-gray-200 p-4 text-sm" method="get">
        <select name="action" defaultValue={action ?? ""} className="rounded-lg border border-gray-300 px-3 py-2">
          <option value="">{t("admin.activities.allActions")}</option>
          {actions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <input name="from" type="date" defaultValue={from} className="rounded-lg border border-gray-300 px-3 py-2" />
        <input name="to" type="date" defaultValue={to} className="rounded-lg border border-gray-300 px-3 py-2" />
        <button type="submit" className="rounded-lg bg-brand-primary px-4 py-2 font-medium text-white">
          {t("products.applyFilters")}
        </button>
      </form>

      {!logs || logs.length === 0 ? (
        <EmptyState title={t("admin.activities.empty")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{t("admin.activities.columnDate")}</th>
                <th className="px-4 py-3">{t("admin.activities.columnUser")}</th>
                <th className="px-4 py-3">{t("admin.activities.columnAction")}</th>
                <th className="px-4 py-3">{t("admin.activities.columnEntity")}</th>
                <th className="px-4 py-3">{t("admin.activities.columnDetails")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(log.created_at).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3">{log.admin_id ? nameById.get(log.admin_id) ?? log.admin_id : "—"}</td>
                  <td className="px-4 py-3">{log.action}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {log.entity_type}
                    {log.entity_id ? ` #${log.entity_id.slice(0, 8)}` : ""}
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate text-xs text-gray-500" title={log.details ? JSON.stringify(log.details) : ""}>
                    {log.details ? JSON.stringify(log.details) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
