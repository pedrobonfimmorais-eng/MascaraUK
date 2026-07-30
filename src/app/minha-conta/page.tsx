import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { t, type TranslationKey } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { AccountNav } from "@/components/account/AccountNav";
import { formatCurrency } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t("account.pageTitle") };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/minha-conta");

  const supabase = await createClient();

  const [{ data: recentOrders }, { data: mainAddress }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, status, payment_status, total, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase.from("addresses").select("*").eq("user_id", user.id).eq("is_default", true).maybeSingle(),
  ]);

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-bold text-brand-secondary">{t("account.pageTitle")}</h1>
        <p className="mt-1 text-gray-600">
          {t("account.greeting")}, {user.fullName ?? user.email}
        </p>
      </div>

      <AccountNav active="inicio" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-gray-200 p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-brand-secondary">{t("account.myOrders")}</h2>
            <Link href="/minha-conta/pedidos" className="text-sm text-brand-primary hover:underline">
              {t("common.seeAll")}
            </Link>
          </div>

          {!recentOrders || recentOrders.length === 0 ? (
            <p className="text-sm text-gray-500">{t("account.noOrders")}</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-200">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/minha-conta/pedidos/${order.id}`}
                  className="flex items-center justify-between gap-3 py-3 text-sm hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-brand-secondary">#{order.order_number}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Badge tone="brand">{t(`orderStatus.${order.status}` as TranslationKey)}</Badge>
                  <span className="font-medium text-brand-secondary">{formatCurrency(order.total)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-brand-secondary">{t("account.mainAddress")}</h2>
            <Link href="/minha-conta/enderecos" className="text-sm text-brand-primary hover:underline">
              {t("common.edit")}
            </Link>
          </div>

          {mainAddress ? (
            <p className="text-sm text-gray-600">
              {mainAddress.recipient_name}
              <br />
              {mainAddress.street}, {mainAddress.number}
              {mainAddress.complement ? ` — ${mainAddress.complement}` : ""}
              <br />
              {mainAddress.neighborhood} — {mainAddress.city}/{mainAddress.state}
              <br />
              CEP {mainAddress.zip_code}
            </p>
          ) : (
            <p className="text-sm text-gray-500">{t("account.noAddress")}</p>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AccountLink href="/minha-conta/perfil" label={t("account.editProfile")} />
        <AccountLink href="/minha-conta/pedidos" label={t("account.trackOrders")} />
        <AccountLink href="/minha-conta/seguranca" label={t("account.security")} />
      </div>
    </Container>
  );
}

function AccountLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-gray-200 p-4 text-sm font-medium text-brand-secondary hover:border-brand-primary"
    >
      {label}
    </Link>
  );
}
