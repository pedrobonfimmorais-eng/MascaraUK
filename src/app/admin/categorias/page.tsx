import type { Metadata } from "next";
import { ta } from "@/i18n";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: ta("admin.sidebar.categories") };

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug, is_active")
    .order("display_order", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-brand-secondary">{ta("admin.sidebar.categories")}</h1>

      {!categories || categories.length === 0 ? (
        <EmptyState title={ta("admin.empty.categories")} />
      ) : (
        <div className="flex flex-col divide-y divide-gray-200 rounded-xl border border-gray-200">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <p className="font-medium text-brand-secondary">{category.name}</p>
                <p className="text-xs text-gray-500">/{category.slug}</p>
              </div>
              <Badge tone={category.is_active ? "success" : "neutral"}>
                {category.is_active ? "Ativa" : "Inativa"}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
