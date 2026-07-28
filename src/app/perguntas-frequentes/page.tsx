import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { DemoNotice } from "@/components/ui/DemoNotice";

export const metadata: Metadata = { title: t("faq.pageTitle") };

// Example questions — replace with the store's real FAQ content later
// (ideally moved into the `custom_pages` table so the admin can edit it).
const demoFaqs = [
  {
    question: "Os produtos são originais?",
    answer: "Sim, todos os itens são cadastrados e enviados diretamente pela nossa loja.",
  },
  {
    question: "Quais as formas de pagamento aceitas?",
    answer: "Aceitamos cartão de crédito e outros métodos disponíveis no checkout via Stripe.",
  },
  {
    question: "Qual o prazo de entrega?",
    answer: "O prazo varia conforme sua região e é informado no checkout antes da confirmação do pedido.",
  },
  {
    question: "Posso trocar ou devolver um produto?",
    answer: "Sim, consulte nossa página de Trocas e Devoluções para saber o passo a passo.",
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
