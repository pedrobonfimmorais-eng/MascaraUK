import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { AccountNav } from "@/components/account/AccountNav";
import { AddressManager } from "@/components/account/AddressManager";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t("account.myAddresses") };

export default async function AddressesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/minha-conta/enderecos");

  const supabase = await createClient();
  const { data: addresses } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <Container className="flex max-w-2xl flex-col gap-6 py-10">
      <h1 className="text-2xl font-bold text-brand-secondary">{t("account.myAddresses")}</h1>
      <AccountNav active="enderecos" />
      <AddressManager addresses={addresses ?? []} />
    </Container>
  );
}
