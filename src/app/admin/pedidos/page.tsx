import type { Metadata } from "next";
import Link from "next/link";
import { ta, type TranslationKey } from "@/i18n";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderStatus, PaymentStatus } from "@/types/database";

export const metadata: Metadata = { title: ta("admin.sidebar.orders") };

const ORDER_STATUSES: OrderStatus[] = [
  "recebido",
  "em_preparacao",
  "pronto_para_envio",
  "enviado",
  "entregue",
  "cancelado",
  "devolucao_solicitada",
  "devolvido",
];

const PAYMENT_STATUSES: PaymentStatus[] = [
  "aguardando_pagamento",
  "processando",
  "pago",
  "recusado",
  "expirado",
  "cancelado",
  "reembolsado_parcial",
  "reembolsado",
];

interface AdminOrdersPageProps {
  searchParams: Promise<{
    status?: string;
    payment?: string;
    from?: string;
    to?: string;
    q?: string;
    sort?: string;
  }>;
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const { status, payment, from, to, q, sort } = await searchParams;
  const admin = createAdminClient();

  let query = admin
    .from("orders")
    .select("id, order_number, customer_name, customer_email, status, payment_status, total, created_at, tracking_code");

  if (status) query = query.eq("status", status as OrderStatus);
  if (payment) query = query.eq("payment_status", payment as PaymentStatus);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", `${to}T23:59:59`);

  if (q) {
    const trimmed = q.trim();
    query = query.or(
      `order_number.ilike.%${trimmed}%,customer_name.ilike.%${trimmed}%,customer_email.ilike.%${trimmed}%`
    );
  }

  switch (sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "highest":
      query = query.order("total", { ascending: false });
      break;
    case "lowest":
      query = query.order("total", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data: orders } = await query.limit(200);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-brand-secondary">{ta("admin.sidebar.orders")}</h1>

      <form className="flex flex-wrap gap-3 rounded-xl border border-gray-200 p-4 text-sm" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder={ta("admin.orders.searchPlaceholder")}
          className="rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-primary focus:outline-none"
        />
        <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-gray-300 px-3 py-2">
          <option value="">{ta("admin.orders.allOrderStatuses")}</option>
          {ORDER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {ta(`orderStatus.${value}` as TranslationKey)}
            </option>
          ))}
        </select>
        <select name="payment" defaultValue={payment ?? ""} className="rounded-lg border border-gray-300 px-3 py-2">
          <option value="">{ta("admin.orders.allPaymentStatuses")}</option>
          {PAYMENT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {ta(`paymentStatus.${value}` as TranslationKey)}
            </option>
          ))}
        </select>
        <input name="from" type="date" defaultValue={from} className="rounded-lg border border-gray-300 px-3 py-2" />
        <input name="to" type="date" defaultValue={to} className="rounded-lg border border-gray-300 px-3 py-2" />
        <select name="sort" defaultValue={sort ?? "newest"} className="rounded-lg border border-gray-300 px-3 py-2">
          <option value="newest">{ta("admin.orders.sortNewest")}</option>
          <option value="oldest">{ta("admin.orders.sortOldest")}</option>
          <option value="highest">{ta("admin.orders.sortHighest")}</option>
          <option value="lowest">{ta("admin.orders.sortLowest")}</option>
        </select>
        <button type="submit" className="rounded-lg bg-brand-primary px-4 py-2 font-medium text-white">
          {ta("products.applyFilters")}
        </button>
        <Link href="/admin/pedidos" className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700">
          {ta("products.clearFilters")}
        </Link>
      </form>

      {!orders || orders.length === 0 ? (
        <EmptyState title={ta("admin.empty.orders")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{ta("admin.orders.columnOrder")}</th>
                <th className="px-4 py-3">{ta("admin.orders.columnCustomer")}</th>
                <th className="px-4 py-3">{ta("admin.orders.columnDate")}</th>
                <th className="px-4 py-3">{ta("account.orderStatus")}</th>
                <th className="px-4 py-3">{ta("admin.orders.columnPayment")}</th>
                <th className="px-4 py-3">{ta("admin.orders.columnTracking")}</th>
                <th className="px-4 py-3">{ta("admin.orders.columnTotal")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/pedidos/${order.id}`} className="font-medium text-brand-primary hover:underline">
                      #{order.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {order.customer_name}
                    <br />
                    <span className="text-xs text-gray-500">{order.customer_email}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(order.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="brand">{ta(`orderStatus.${order.status}` as TranslationKey)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="neutral">{ta(`paymentStatus.${order.payment_status}` as TranslationKey)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{order.tracking_code ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(order.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
