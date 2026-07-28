import type { Metadata } from "next";
import { t } from "@/i18n";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t("admin.dashboard") };

async function getCounts() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { orders: 0, revenue: 0, products: 0, customers: 0 };
  }

  try {
    const supabase = await createClient();
    const [{ count: orders }, { count: products }, { count: customers }, { data: paidOrders }] =
      await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "cliente"),
        supabase.from("orders").select("total").neq("status", "aguardando_pagamento"),
      ]);

    const revenue = (paidOrders ?? []).reduce((sum, o) => sum + Number(o.total), 0);

    return { orders: orders ?? 0, revenue, products: products ?? 0, customers: customers ?? 0 };
  } catch {
    return { orders: 0, revenue: 0, products: 0, customers: 0 };
  }
}

export default async function AdminDashboardPage() {
  const counts = await getCounts();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-secondary">{t("admin.dashboardTitle")}</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("admin.stats.totalOrders")} value={counts.orders} />
        <StatCard
          label={t("admin.stats.totalRevenue")}
          value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
            counts.revenue
          )}
        />
        <StatCard label={t("admin.stats.totalProducts")} value={counts.products} />
        <StatCard label={t("admin.stats.totalCustomers")} value={counts.customers} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-brand-secondary">{value}</p>
    </div>
  );
}
