import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ta } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: ta("admin.sidebar.banners") };

export default async function AdminBannersPage() {
  const staff = await requirePermission("products.manage");
  if (!staff) redirect("/acesso-negado");

  const supabase = await createClient();
  const { data: banners } = await supabase
    .from("banners")
    .select("id, title, is_active")
    .order("display_order", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-brand-secondary">{ta("admin.sidebar.banners")}</h1>

      {!banners || banners.length === 0 ? (
        <EmptyState title={ta("admin.empty.banners")} />
      ) : (
        <div className="flex flex-col divide-y divide-gray-200 rounded-xl border border-gray-200">
          {banners.map((banner) => (
            <div key={banner.id} className="flex items-center justify-between p-4 text-sm">
              <p className="font-medium text-brand-secondary">{banner.title}</p>
              <Badge tone={banner.is_active ? "success" : "neutral"}>
                {banner.is_active ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
