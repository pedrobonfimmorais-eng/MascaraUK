import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { ResendVerificationForm } from "@/components/auth/ResendVerificationForm";

export const metadata: Metadata = { title: t("auth.verifyEmailTitle") };

interface VerifyEmailPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { email } = await searchParams;

  return (
    <Container className="flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
        <MailIcon />
      </div>
      <h1 className="text-2xl font-bold text-brand-secondary">{t("auth.verifyEmailTitle")}</h1>
      <p className="text-gray-600">
        {t("auth.verifyEmailMessage")}
        {email && <span className="font-medium text-brand-secondary"> {email}</span>}.
      </p>
      <ResendVerificationForm email={email ?? ""} />
    </Container>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16v12H4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7l8 6 8-6" />
    </svg>
  );
}
