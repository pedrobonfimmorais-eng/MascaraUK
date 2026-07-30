import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { CheckoutWizard } from "@/components/checkout/CheckoutWizard";
import { getValidatedCart } from "@/lib/cart/cart-data";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Address } from "@/types/database";

export const metadata: Metadata = { title: t("checkout.pageTitle") };

export default async function CheckoutPage() {
  const cart = await getValidatedCart();

  if (cart.items.length === 0) {
    redirect("/carrinho");
  }

  const user = await getCurrentUser();
  let addresses: Address[] = [];
  let profilePhone: string | null = null;

  if (user) {
    const supabase = await createClient();
    const [{ data: addressRows }, { data: profile }] = await Promise.all([
      supabase.from("addresses").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
      supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle(),
    ]);
    addresses = addressRows ?? [];
    profilePhone = profile?.phone ?? null;
  }

  if (cart.hasBlockingIssues) {
    return (
      <Container className="py-10">
        <h1 className="mb-4 text-2xl font-bold text-brand-secondary">{t("checkout.pageTitle")}</h1>
        <p className="mb-4 text-sm text-red-600">{t("cart.blockingIssuesNotice")}</p>
        <Button href="/carrinho">{t("cart.pageTitle")}</Button>
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <h1 className="mb-8 text-2xl font-bold text-brand-secondary sm:text-3xl">{t("checkout.pageTitle")}</h1>
      <CheckoutWizard
        cart={cart}
        currentUser={user ? { fullName: user.fullName, email: user.email, phone: profilePhone } : null}
        addresses={addresses}
      />
    </Container>
  );
}
