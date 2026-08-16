import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { ContactForm } from "@/components/contact/ContactForm";
import { getStoreSettings } from "@/lib/store-settings";

export const metadata: Metadata = { title: t("contact.pageTitle") };

export default async function ContactPage() {
  const settings = await getStoreSettings();

  return (
    <Container className="grid grid-cols-1 gap-10 py-10 lg:grid-cols-2">
      <div>
        <h1 className="text-2xl font-bold text-brand-secondary sm:text-3xl">
          {t("contact.pageTitle")}
        </h1>
        <p className="mt-1 text-gray-600">{t("contact.pageDescription")}</p>
        <ContactForm />
      </div>

      <div>
        <h2 className="font-semibold text-brand-secondary">{t("contact.otherWays")}</h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          <li>{settings.contactEmail}</li>
          <li>{settings.contactPhone}</li>
        </ul>
      </div>
    </Container>
  );
}
