import type { Metadata } from "next";
import { t } from "@/i18n";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t("admin.sidebar.coupons") };

export default async function AdminCouponsPage() {
  const supabase = await createClient();
  const { data: coupons } = await supabase
    .from("coupons")
    .select("id, code, type, value, is_active")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-brand-secondary">{t("admin.sidebar.coupons")}</h1>

      {!coupons || coupons.length === 0 ? (
        <EmptyState title={t("admin.empty.coupons")} />
      ) : (
        <div className="flex flex-col divide-y divide-gray-200 rounded-xl border border-gray-200">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="flex items-center justify-between p-4 text-sm">
              <p className="font-medium text-brand-secondary">{coupon.code}</p>
              <p className="text-gray-500">
                {coupon.type === "percentual" ? `${coupon.value}%` : `R$ ${coupon.value}`}
              </p>
              <Badge tone={coupon.is_active ? "success" : "neutral"}>
                {coupon.is_active ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
