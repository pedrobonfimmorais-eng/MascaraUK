import type { Metadata } from "next";
import { t } from "@/i18n";
import { getPendingInvite } from "@/lib/actions/accept-invite";
import { AcceptInviteForm } from "@/components/auth/AcceptInviteForm";

export const metadata: Metadata = { title: t("adminInvite.title") };

interface AcceptInvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function AcceptInvitePage({ params }: AcceptInvitePageProps) {
  const { token } = await params;
  const { invite, error } = await getPendingInvite(token);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-bold text-brand-secondary">{t("adminInvite.title")}</h1>
      {invite ? (
        <>
          <p className="text-sm text-gray-600">{invite.email}</p>
          <AcceptInviteForm token={token} />
        </>
      ) : (
        <p className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}
