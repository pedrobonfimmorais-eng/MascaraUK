import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { DemoNotice } from "@/components/ui/DemoNotice";

export const metadata: Metadata = { title: t("faq.pageTitle") };

// Example questions — replace with the store's real FAQ content later
// (ideally moved into the `custom_pages` table so the admin can edit it).
const demoFaqs = [
  {
    question: "Are these official licensed products?",
    answer:
      "Each product page shows how it is classified — an original store design, a generic hero-inspired product, or an officially licensed product. We only describe an item as officially licensed when that licence has genuinely been obtained.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept card payments and any other methods shown at checkout, all processed securely through Stripe.",
  },
  {
    question: "How long does delivery take?",
    answer:
      "Delivery times depend on your postcode and the delivery option you choose, and are shown in your basket and at checkout before you pay.",
  },
  {
    question: "Can I return or exchange a product?",
    answer: "Yes — see our Returns and Refunds Policy page for the full step-by-step process.",
  },
  {
    question: "Are the masks and props safe to wear?",
    answer:
      "Each product page lists any safety information, recommended age and care instructions we hold for that item. Our masks and props are decorative costume and cosplay items, not toys and not functional weapons.",
  },
];

export default function FaqPage() {
  return (
    <Container className="max-w-3xl py-10">
      <h1 className="text-2xl font-bold text-brand-secondary sm:text-3xl">{t("faq.pageTitle")}</h1>
      <p className="mt-1 text-gray-600">{t("faq.pageDescription")}</p>

      <div className="mt-4">
        <DemoNotice />
      </div>

      <div className="mt-8 flex flex-col divide-y divide-gray-200">
        {demoFaqs.map((faq) => (
          <details key={faq.question} className="group py-4">
            <summary className="cursor-pointer list-none font-medium text-brand-secondary">
              {faq.question}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">{faq.answer}</p>
          </details>
        ))}
      </div>
    </Container>
  );
}
