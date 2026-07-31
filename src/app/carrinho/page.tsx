import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { CartView } from "@/components/cart/CartView";
import { getValidatedCart } from "@/lib/cart/cart-data";

export const metadata: Metadata = { title: t("cart.pageTitle") };

export default async function CartPage() {
  const cart = await getValidatedCart();

  return (
    <Container className="py-10">
      <h1 className="mb-6 text-2xl font-bold text-brand-secondary sm:text-3xl">
        {t("cart.pageTitle")}
      </h1>
      <CartView cart={cart} />
    </Container>
  );
}
