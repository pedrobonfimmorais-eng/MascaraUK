import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";

export const metadata: Metadata = { title: t("account.pageTitle") };

export default async function AccountPage() {
  const user = await getCurrentUser();

  return (
    <Container className="flex max-w-2xl flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-bold text-brand-secondary">{t("account.pageTitle")}</h1>
        {user && (
          <p className="mt-1 text-gray-600">
            {t("account.greeting")}, {user.fullName ?? user.email}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AccountLink href="/minha-conta" label={t("account.myData")} />
        <AccountLink href="/minha-conta/pedidos" label={t("account.myOrders")} />
      </div>

      <form action={signOut}>
        <button
          type="submit"
          className="w-fit rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t("account.logout")}
        </button>
      </form>
    </Container>
  );
}

function AccountLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-gray-200 p-4 text-sm font-medium text-brand-secondary hover:border-brand-primary"
    >
      {label}
    </Link>
  );
}
