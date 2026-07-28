import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: t("cart.pageTitle") };

/**
 * Cart page shell. The cart data model (carts/cart_items tables) and
 * Supabase access are already in place; wiring up add/remove/update
 * quantity interactions is left for a follow-up step.
 */
export default function CartPage() {
  return (
    <Container className="py-10">
      <h1 className="mb-6 text-2xl font-bold text-brand-secondary sm:text-3xl">
        {t("cart.pageTitle")}
      </h1>

      <EmptyState
        title={t("cart.empty")}
        action={<Button href="/produtos">{t("cart.emptyCta")}</Button>}
      />
    </Container>
  );
}
