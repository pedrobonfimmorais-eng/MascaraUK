import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { t, type TranslationKey } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MessageStatus } from "@/types/database";

export const metadata: Metadata = { title: t("admin.messages.title") };

const STATUSES: MessageStatus[] = ["nova", "em_atendimento", "aguardando_cliente", "resolvida", "spam"];

interface AdminMessagesPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminMessagesPage({ searchParams }: AdminMessagesPageProps) {
  const staff = await requirePermission("messages.manage");
  if (!staff) redirect("/acesso-negado");

  const { status } = await searchParams;
  const admin = createAdminClient();

  let query = admin.from("messages").select("id, name, email, subject, status, created_at").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status as MessageStatus);

  const { data: messages } = await query.limit(200);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-brand-secondary">{t("admin.messages.title")}</h1>

      <form className="flex flex-wrap gap-3 rounded-xl border border-gray-200 p-4 text-sm" method="get">
        <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-gray-300 px-3 py-2">
          <option value="">{t("admin.messages.allStatuses")}</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(`admin.messages.status.${value}` as TranslationKey)}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-brand-primary px-4 py-2 font-medium text-white">
          {t("products.applyFilters")}
        </button>
        <Link href="/admin/mensagens" className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700">
          {t("products.clearFilters")}
        </Link>
      </form>

      {!messages || messages.length === 0 ? (
        <EmptyState title={t("admin.messages.empty")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{t("admin.messages.columnFrom")}</th>
                <th className="px-4 py-3">{t("admin.messages.columnSubject")}</th>
                <th className="px-4 py-3">{t("admin.messages.columnDate")}</th>
                <th className="px-4 py-3">{t("admin.messages.columnStatus")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {messages.map((message) => (
                <tr key={message.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/mensagens/${message.id}`} className="font-medium text-brand-primary hover:underline">
                      {message.name}
                    </Link>
                    <br />
                    <span className="text-xs text-gray-500">{message.email}</span>
                  </td>
                  <td className="px-4 py-3">{message.subject}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(message.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">
                    <Badge tone={message.status === "nova" ? "brand" : message.status === "spam" ? "danger" : "neutral"}>
                      {t(`admin.messages.status.${message.status}` as TranslationKey)}
                    </Badge>
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
