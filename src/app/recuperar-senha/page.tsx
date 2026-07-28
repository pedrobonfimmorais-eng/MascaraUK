import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: t("auth.forgotPasswordTitle") };

export default function ForgotPasswordPage() {
  return (
    <Container className="flex max-w-md flex-col gap-6 py-16">
      <div>
        <h1 className="text-2xl font-bold text-brand-secondary">{t("auth.forgotPasswordTitle")}</h1>
        <p className="mt-1 text-gray-600">{t("auth.forgotPasswordSubtitle")}</p>
      </div>
      <ForgotPasswordForm />
    </Container>
  );
}
