import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";
import { AccountNav } from "@/components/account/AccountNav";

export const metadata: Metadata = { title: t("account.securityPageTitle") };

export default async function AccountSecurityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/minha-conta/seguranca");

  return (
    <Container className="flex max-w-3xl flex-col gap-6 py-10">
      <h1 className="text-2xl font-bold text-brand-secondary">{t("account.securityPageTitle")}</h1>
      <AccountNav active="seguranca" />

      <section className="rounded-xl border border-gray-200 p-5">
        <h2 className="mb-1 font-semibold text-brand-secondary">{t("account.changePassword")}</h2>
        <p className="mb-4 text-sm text-gray-500">{t("account.changePasswordHint")}</p>
        <ChangePasswordForm />
      </section>

      <section className="rounded-xl border border-gray-200 p-5">
        <h2 className="mb-1 font-semibold text-brand-secondary">{t("account.activeSession")}</h2>
        <p className="mb-4 text-sm text-gray-500">
          {t("account.loggedInAs")}: <span className="font-medium text-brand-secondary">{user.email}</span>
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t("account.logout")}
          </button>
        </form>
      </section>
    </Container>
  );
}
