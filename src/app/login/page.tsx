import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: t("auth.loginTitle") };

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect } = await searchParams;

  return (
    <Container className="flex max-w-md flex-col gap-6 py-16">
      <div>
        <h1 className="text-2xl font-bold text-brand-secondary">{t("auth.loginTitle")}</h1>
        <p className="mt-1 text-gray-600">{t("auth.loginSubtitle")}</p>
      </div>
      <LoginForm redirectTo={redirect ?? "/minha-conta"} />
    </Container>
  );
}
