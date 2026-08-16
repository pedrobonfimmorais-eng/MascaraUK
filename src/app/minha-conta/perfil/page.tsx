import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { AccountNav } from "@/components/account/AccountNav";
import { ProfileForm } from "@/components/account/ProfileForm";
import { EmailChangeForm } from "@/components/account/EmailChangeForm";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t("account.myData") };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/minha-conta/perfil");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone, birth_date, marketing_opt_in")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <Container className="flex max-w-2xl flex-col gap-6 py-10">
      <h1 className="text-2xl font-bold text-brand-secondary">{t("account.myData")}</h1>
      <AccountNav active="perfil" />

      <section className="rounded-xl border border-gray-200 p-5">
        <h2 className="mb-4 font-semibold text-brand-secondary">{t("account.personalData")}</h2>
        <ProfileForm
          defaultFirstName={profile?.first_name ?? ""}
          defaultLastName={profile?.last_name ?? ""}
          defaultPhone={profile?.phone ?? ""}
          defaultBirthDate={profile?.birth_date ?? ""}
          defaultMarketingOptIn={profile?.marketing_opt_in ?? false}
        />
      </section>

      <section className="rounded-xl border border-gray-200 p-5">
        <h2 className="mb-1 font-semibold text-brand-secondary">{t("account.email")}</h2>
        <p className="mb-4 text-sm text-gray-500">{t("account.emailChangeHint")}</p>
        <EmailChangeForm currentEmail={user.email ?? ""} />
      </section>
    </Container>
  );
}
