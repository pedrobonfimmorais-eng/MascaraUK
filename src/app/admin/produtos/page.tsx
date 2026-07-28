import type { Metadata } from "next";
import { t } from "@/i18n";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t("admin.sidebar.products") };

export default async function AdminProductsPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, base_price, sku, is_active")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-brand-secondary">{t("admin.sidebar.products")}</h1>

      {!products || products.length === 0 ? (
        <EmptyState title={t("admin.empty.products")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Preço</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-3 font-medium text-brand-secondary">{product.name}</td>
                  <td className="px-4 py-3 text-gray-500">{product.sku ?? "—"}</td>
                  <td className="px-4 py-3">{formatCurrency(product.base_price)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={product.is_active ? "success" : "neutral"}>
                      {product.is_active ? "Ativo" : "Inativo"}
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
