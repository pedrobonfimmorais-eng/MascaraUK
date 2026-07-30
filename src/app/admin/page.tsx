import type { Metadata } from "next";
import Link from "next/link";
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
        supabase.from("orders").select("total").eq("payment_status", "pago"),
      ]);

    const revenue = (paidOrders ?? []).reduce((sum, o) => sum + Number(o.total), 0);

    return { orders: orders ?? 0, revenue, products: products ?? 0, customers: customers ?? 0 };
  } catch {
    return { orders: 0, revenue: 0, products: 0, customers: 0 };
  }
}

interface AdminNotifications {
  newPaidOrders: number;
  refused: number;
  awaitingShipment: number;
  returnRequests: number;
  outOfStock: number;
  lowStock: number;
}

async function getNotifications(): Promise<AdminNotifications> {
  const empty: AdminNotifications = {
    newPaidOrders: 0,
    refused: 0,
    awaitingShipment: 0,
    returnRequests: 0,
    outOfStock: 0,
    lowStock: 0,
  };

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return empty;

  try {
    const supabase = await createClient();
    const [
      { count: newPaidOrders },
      { count: refused },
      { count: awaitingShipment },
      { count: returnRequests },
      { data: inventory },
    ] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "recebido").eq("payment_status", "pago"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "recusado"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pronto_para_envio"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "devolucao_solicitada"),
      supabase.from("inventory").select("quantity, reserved_quantity"),
    ]);

    let outOfStock = 0;
    let lowStock = 0;
    for (const row of inventory ?? []) {
      const available = row.quantity - row.reserved_quantity;
      if (available <= 0) outOfStock += 1;
      else if (available <= 5) lowStock += 1;
    }

    return {
      newPaidOrders: newPaidOrders ?? 0,
      refused: refused ?? 0,
      awaitingShipment: awaitingShipment ?? 0,
      returnRequests: returnRequests ?? 0,
      outOfStock,
      lowStock,
    };
  } catch {
    return empty;
  }
}

export default async function AdminDashboardPage() {
  const [counts, notifications] = await Promise.all([getCounts(), getNotifications()]);

  const alerts: { label: string; count: number; href: string }[] = [
    { label: t("admin.notifications.newPaidOrders"), count: notifications.newPaidOrders, href: "/admin/pedidos?status=recebido&payment=pago" },
    { label: t("admin.notifications.refusedPayments"), count: notifications.refused, href: "/admin/pedidos?payment=recusado" },
    { label: t("admin.notifications.awaitingShipment"), count: notifications.awaitingShipment, href: "/admin/pedidos?status=pronto_para_envio" },
    { label: t("admin.notifications.returnRequests"), count: notifications.returnRequests, href: "/admin/pedidos?status=devolucao_solicitada" },
    { label: t("admin.notifications.lowStock"), count: notifications.lowStock, href: "/admin/produtos" },
    { label: t("admin.notifications.outOfStock"), count: notifications.outOfStock, href: "/admin/produtos" },
  ].filter((alert) => alert.count > 0);

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

      {alerts.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-brand-secondary">{t("admin.notifications.title")}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.map((alert) => (
              <Link
                key={alert.label}
                href={alert.href}
                className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm hover:border-amber-300"
              >
                <span className="text-amber-800">{alert.label}</span>
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {alert.count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
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
