import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ta } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MessageDetailPanel } from "@/components/admin/MessageDetailPanel";

export const metadata: Metadata = { title: ta("admin.messages.detailTitle") };

interface AdminMessageDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminMessageDetailPage({ params }: AdminMessageDetailPageProps) {
  const staff = await requirePermission("messages.manage");
  if (!staff) redirect("/acesso-negado");

  const { id } = await params;
  const admin = createAdminClient();
  const { data: message } = await admin.from("messages").select("*").eq("id", id).maybeSingle();

  if (!message) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/mensagens" className="text-sm text-brand-primary hover:underline">
        ← {ta("admin.messages.backToList")}
      </Link>

      <h1 className="text-2xl font-bold text-brand-secondary">{message.subject}</h1>

      <div className="rounded-xl border border-gray-200 p-4 text-sm">
        <p>
          <strong>{message.name}</strong> — <a href={`mailto:${message.email}`} className="text-brand-primary hover:underline">{message.email}</a>
        </p>
        {message.phone && <p className="text-gray-500">{message.phone}</p>}
        {message.order_number && (
          <p className="text-gray-500">
            {ta("admin.messages.orderNumber")}: {message.order_number}
          </p>
        )}
        <p className="mt-3 whitespace-pre-wrap">{message.message}</p>
        <p className="mt-3 text-xs text-gray-400">{new Date(message.created_at).toLocaleString("pt-BR")}</p>
      </div>

      <MessageDetailPanel messageId={message.id} initialStatus={message.status} initialNote={message.admin_note ?? ""} />
    </div>
  );
}
