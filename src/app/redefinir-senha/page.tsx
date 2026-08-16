import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t("auth.resetPasswordTitle") };

/**
 * Landing page after clicking the recovery e-mail link. The actual session
 * exchange happens in /api/auth/callback (a Route Handler, which — unlike
 * this Server Component — is allowed to persist cookies); by the time the
 * customer reaches this page they either have a valid recovery session or
 * the link was invalid/expired.
 */
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Container className="flex max-w-md flex-col gap-6 py-16">
      <div>
        <h1 className="text-2xl font-bold text-brand-secondary">{t("auth.resetPasswordTitle")}</h1>
        <p className="mt-1 text-gray-600">{t("auth.resetPasswordSubtitle")}</p>
      </div>

      {user ? (
        <ResetPasswordForm />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-red-600">{t("auth.resetPasswordInvalidLink")}</p>
          <Button href="/recuperar-senha" variant="outline">
            {t("auth.forgotPasswordTitle")}
          </Button>
        </div>
      )}
    </Container>
  );
}
