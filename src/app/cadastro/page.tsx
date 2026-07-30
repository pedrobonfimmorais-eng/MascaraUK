import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: t("auth.registerTitle") };

interface RegisterPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { redirect } = await searchParams;

  return (
    <Container className="flex max-w-md flex-col gap-6 py-16">
      <div>
        <h1 className="text-2xl font-bold text-brand-secondary">{t("auth.registerTitle")}</h1>
        <p className="mt-1 text-gray-600">{t("auth.registerSubtitle")}</p>
      </div>
      <RegisterForm redirectTo={redirect ?? "/minha-conta"} />
    </Container>
  );
}
