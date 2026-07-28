import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: t("checkout.pageTitle") };

/**
 * Checkout page shell: contact/shipping/payment sections and order summary.
 * Submission will call a Route Handler that creates the order in Supabase
 * and a Stripe Checkout Session (see src/lib/stripe and src/app/api/checkout).
 */
export default function CheckoutPage() {
  return (
    <Container className="py-10">
      <h1 className="mb-8 text-2xl font-bold text-brand-secondary sm:text-3xl">
        {t("checkout.pageTitle")}
      </h1>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          <section>
            <h2 className="mb-3 font-semibold text-brand-secondary">{t("checkout.contactInfo")}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t("checkout.fullName")} />
              <Field label={t("checkout.email")} type="email" />
              <Field label={t("checkout.phone")} type="tel" />
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-semibold text-brand-secondary">{t("checkout.shippingAddress")}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t("checkout.zipCode")} />
              <Field label={t("checkout.street")} />
              <Field label={t("checkout.number")} />
              <Field label={`${t("checkout.complement")} (${t("common.optional")})`} />
              <Field label={t("checkout.neighborhood")} />
              <Field label={t("checkout.city")} />
              <Field label={t("checkout.state")} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-semibold text-brand-secondary">{t("checkout.paymentMethod")}</h2>
            <p className="rounded-lg border border-gray-200 p-4 text-sm text-gray-600">
              {t("checkout.securePayment")}
            </p>
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-gray-200 p-5">
          <h2 className="mb-4 font-semibold text-brand-secondary">{t("checkout.orderSummary")}</h2>
          <div className="flex justify-between text-sm text-gray-600">
            <span>{t("cart.subtotal")}</span>
            <span>R$ 0,00</span>
          </div>
          <div className="mt-2 flex justify-between text-sm text-gray-600">
            <span>{t("cart.shippingEstimate")}</span>
            <span>{t("cart.calculatedAtCheckout")}</span>
          </div>
          <div className="mt-4 flex justify-between border-t border-gray-200 pt-4 font-semibold text-brand-secondary">
            <span>{t("cart.total")}</span>
            <span>R$ 0,00</span>
          </div>
          <Button className="mt-6 w-full" size="lg">
            {t("checkout.placeOrder")}
          </Button>
        </aside>
      </div>
    </Container>
  );
}

function Field({ label, type = "text" }: { label: string; type?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-gray-700">
      {label}
      <input
        type={type}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
      />
    </label>
  );
}
